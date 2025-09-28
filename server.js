// server.js
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');

// Import services
const aiService = require('./services/aiService');
const vectorDB = require('./services/vectorDB');

const app = express();
const PORT = process.env.PORT || 3000;

// ==============================================
// MIDDLEWARE SETUP
// ==============================================

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configure multer for file uploads
const upload = multer({
    dest: 'uploads/',
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = [
            'text/plain',
            'application/pdf',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        ];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only PDF, DOCX, and TXT files are allowed.'));
        }
    }
});

// Create uploads directory if it doesn't exist
if (!fs.existsSync('uploads')) {
    fs.mkdirSync('uploads');
    console.log('📁 Created uploads directory');
}

// ==============================================
// IN-MEMORY STORAGE (Demo purposes)
// ==============================================

const uploadedFiles = new Map();
const evaluationJobs = new Map();

// ==============================================
// API ENDPOINTS
// ==============================================

/**
 * Root endpoint - API information
 */
app.get('/', (req, res) => {
    res.json({
        message: 'AI CV Evaluator API is running!',
        version: '1.0.0',
        features: [
            'File upload (CV + Project)',
            'AI-powered evaluation with LLM chaining',
            'RAG-enhanced context retrieval',
            'Async processing pipeline',
            'Comprehensive scoring system'
        ],
        endpoints: {
            upload: 'POST /upload - Upload CV and project files',
            evaluate: 'POST /evaluate - Start AI evaluation',
            result: 'GET /result/:id - Get evaluation results',
            health: 'GET /health - System health check',
            vectordb_status: 'GET /vectordb/status - Vector DB status',
            vectordb_search: 'GET /vectordb/search?q=query - Search RAG documents'
        },
        timestamp: new Date().toISOString()
    });
});

/**
 * POST /upload - Upload CV and Project Report
 */
app.post('/upload', upload.fields([
    { name: 'cv', maxCount: 1 },
    { name: 'project', maxCount: 1 }
]), async (req, res) => {
    try {
        console.log('📁 Upload request received');

        // Validate required files
        if (!req.files || !req.files.cv || !req.files.project) {
            return res.status(400).json({
                error: 'Both CV and project report files are required',
                received: {
                    cv: req.files?.cv ? 'yes' : 'no',
                    project: req.files?.project ? 'yes' : 'no'
                },
                help: 'Please upload both files using form fields: cv and project'
            });
        }

        const uploadId = uuidv4();
        const cvFile = req.files.cv[0];
        const projectFile = req.files.project[0];

        // Store file information
        const uploadData = {
            id: uploadId,
            cv: {
                filename: cvFile.filename,
                originalName: cvFile.originalname,
                path: cvFile.path,
                mimetype: cvFile.mimetype,
                size: cvFile.size
            },
            project: {
                filename: projectFile.filename,
                originalName: projectFile.originalname,
                path: projectFile.path,
                mimetype: projectFile.mimetype,
                size: projectFile.size
            },
            uploadedAt: new Date(),
            status: 'uploaded'
        };

        uploadedFiles.set(uploadId, uploadData);

        console.log(`✅ Files uploaded successfully: ${uploadId}`);
        console.log(`   CV: ${cvFile.originalname} (${(cvFile.size / 1024).toFixed(2)} KB)`);
        console.log(`   Project: ${projectFile.originalname} (${(projectFile.size / 1024).toFixed(2)} KB)`);

        res.json({
            message: 'Files uploaded successfully',
            uploadId: uploadId,
            files: {
                cv: cvFile.originalname,
                project: projectFile.originalname
            },
            sizes: {
                cv: `${(cvFile.size / 1024).toFixed(2)} KB`,
                project: `${(projectFile.size / 1024).toFixed(2)} KB`
            },
            next_step: `Use uploadId "${uploadId}" to start evaluation via POST /evaluate`
        });

    } catch (error) {
        console.error('❌ Upload error:', error);
        res.status(500).json({
            error: 'File upload failed',
            message: error.message
        });
    }
});

/**
 * GET /upload/:id - Get upload information
 */
app.get('/upload/:id', (req, res) => {
    try {
        const uploadId = req.params.id;
        const uploadData = uploadedFiles.get(uploadId);

        if (!uploadData) {
            return res.status(404).json({
                error: 'Upload not found',
                message: 'Please check your upload ID'
            });
        }

        res.json({
            uploadId: uploadId,
            files: {
                cv: {
                    name: uploadData.cv.originalName,
                    size: `${(uploadData.cv.size / 1024).toFixed(2)} KB`,
                    type: uploadData.cv.mimetype
                },
                project: {
                    name: uploadData.project.originalName,
                    size: `${(uploadData.project.size / 1024).toFixed(2)} KB`,
                    type: uploadData.project.mimetype
                }
            },
            uploadedAt: uploadData.uploadedAt,
            status: 'ready for evaluation'
        });

    } catch (error) {
        console.error('❌ Upload info error:', error);
        res.status(500).json({
            error: 'Failed to get upload information',
            message: error.message
        });
    }
});

/**
 * POST /evaluate - Start evaluation pipeline
 */
app.post('/evaluate', async (req, res) => {
    try {
        const { uploadId } = req.body;
        console.log(`🔄 Evaluation request for: ${uploadId}`);

        // Validate upload ID
        if (!uploadId || !uploadedFiles.has(uploadId)) {
            return res.status(400).json({
                error: 'Invalid upload ID',
                message: 'Please provide a valid uploadId from previous upload',
                help: 'First upload files using POST /upload, then use the returned uploadId'
            });
        }

        const evaluationId = uuidv4();

        // Initialize evaluation job
        evaluationJobs.set(evaluationId, {
            id: evaluationId,
            uploadId: uploadId,
            status: 'queued',
            createdAt: new Date(),
            message: 'Evaluation queued for processing'
        });

        console.log(`✅ Evaluation queued: ${evaluationId}`);

        // Start async processing (non-blocking)
        processEvaluation(evaluationId, uploadId);

        res.json({
            id: evaluationId,
            status: 'queued',
            message: 'AI evaluation started successfully',
            check_result: `GET /result/${evaluationId}`,
            estimated_time: '5-15 seconds'
        });

    } catch (error) {
        console.error('❌ Evaluation start error:', error);
        res.status(500).json({
            error: 'Failed to start evaluation',
            message: error.message
        });
    }
});

/**
 * GET /result/:id - Get evaluation result
 */
app.get('/result/:id', (req, res) => {
    try {
        const evaluationId = req.params.id;
        console.log(`📊 Result request for: ${evaluationId}`);

        if (!evaluationJobs.has(evaluationId)) {
            return res.status(404).json({
                error: 'Evaluation not found',
                message: 'Please check your evaluation ID',
                help: 'Start evaluation first using POST /evaluate'
            });
        }

        const job = evaluationJobs.get(evaluationId);

        if (job.status === 'completed') {
            res.json({
                id: evaluationId,
                status: 'completed',
                result: job.result,
                processing_time: job.completedAt ?
                    `${((job.completedAt - job.createdAt) / 1000).toFixed(1)}s` : null,
                processedAt: job.completedAt
            });
        } else if (job.status === 'failed') {
            res.json({
                id: evaluationId,
                status: 'failed',
                error: job.error,
                message: job.message,
                failedAt: job.failedAt
            });
        } else {
            res.json({
                id: evaluationId,
                status: job.status,
                message: job.message,
                createdAt: job.createdAt,
                elapsed_time: `${((new Date() - job.createdAt) / 1000).toFixed(1)}s`
            });
        }

    } catch (error) {
        console.error('❌ Result fetch error:', error);
        res.status(500).json({
            error: 'Failed to fetch result',
            message: error.message
        });
    }
});

/**
 * GET /health - System health check
 */
app.get('/health', (req, res) => {
    try {
        const vectorDBStatus = vectorDB.getStatus();

        res.json({
            status: 'healthy',
            uptime: `${Math.floor(process.uptime())}s`,
            memory: {
                used: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)} MB`,
                total: `${Math.round(process.memoryUsage().heapTotal / 1024 / 1024)} MB`
            },
            storage: {
                uploads: uploadedFiles.size,
                evaluations: evaluationJobs.size
            },
            vectorDB: {
                initialized: vectorDBStatus.initialized,
                documents: vectorDBStatus.documentCount,
                categories: vectorDBStatus.categories,
                chunks: vectorDBStatus.totalChunks
            },
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({
            status: 'unhealthy',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * GET /vectordb/status - Vector Database status
 */
app.get('/vectordb/status', (req, res) => {
    try {
        const status = vectorDB.getStatus();
        res.json({
            ...status,
            message: status.initialized ? 'Vector DB operational' : 'Vector DB not initialized',
            features: [
                'Job requirements storage',
                'Scoring rubric retrieval',
                'RAG context injection',
                'Semantic search capabilities'
            ]
        });
    } catch (error) {
        res.status(500).json({
            error: 'Failed to get Vector DB status',
            message: error.message
        });
    }
});

/**
 * GET /vectordb/search - Search RAG documents
 */
app.get('/vectordb/search', (req, res) => {
    try {
        const { q: query, limit = 3 } = req.query;

        if (!query) {
            return res.status(400).json({
                error: 'Query parameter "q" is required',
                example: '/vectordb/search?q=backend%20skills&limit=2'
            });
        }

        const results = vectorDB.searchDocuments(query, parseInt(limit));
        res.json({
            query,
            results,
            total: results.length,
            message: `Found ${results.length} relevant document sections`
        });
    } catch (error) {
        res.status(500).json({
            error: 'Search failed',
            message: error.message
        });
    }
});

// ==============================================
// EVALUATION PROCESSING LOGIC
// ==============================================

/**
 * Async evaluation processing function
 */
async function processEvaluation(evaluationId, uploadId) {
    try {
        console.log(`[${evaluationId}] 🚀 Starting AI-powered evaluation pipeline...`);

        // Update status to processing
        const job = evaluationJobs.get(evaluationId);
        job.status = 'processing';
        job.message = 'Running AI analysis pipeline...';
        job.startedAt = new Date();
        evaluationJobs.set(evaluationId, job);

        const uploadData = uploadedFiles.get(uploadId);

        // Step 1: Extract file content
        console.log(`[${evaluationId}] 📄 Extracting file content...`);
        job.message = 'Extracting text from uploaded files...';
        evaluationJobs.set(evaluationId, job);

        const cvText = await extractFileContent(uploadData.cv);
        const projectText = await extractFileContent(uploadData.project);

        // Step 2: AI Pipeline - CV Analysis with RAG
        console.log(`[${evaluationId}] 🧠 Running CV analysis with RAG context...`);
        job.message = 'Analyzing CV with AI and retrieving job context...';
        evaluationJobs.set(evaluationId, job);

        const cvStructured = await aiService.extractCVInfo(cvText);
        const jobContext = "Backend developer role requiring Node.js, databases, APIs, and AI/LLM experience";
        const cvMatchRate = await aiService.evaluateCVMatch(cvStructured, jobContext);
        const cvFeedback = await aiService.generateCVFeedback(cvStructured, jobContext, cvMatchRate);

        // Step 3: AI Pipeline - Project Analysis with RAG
        console.log(`[${evaluationId}] 🔧 Running project analysis with RAG context...`);
        job.message = 'Evaluating project deliverable with enhanced scoring...';
        evaluationJobs.set(evaluationId, job);

        const scoringRubric = "Evaluate based on correctness, code quality, resilience, documentation, and creativity";
        const projectScore = await aiService.evaluateProject(projectText, scoringRubric);
        const projectFeedback = await aiService.generateProjectFeedback(projectText, scoringRubric, projectScore);

        // Step 4: Overall Summary
        console.log(`[${evaluationId}] 📋 Generating comprehensive summary...`);
        job.message = 'Compiling final evaluation results...';
        evaluationJobs.set(evaluationId, job);

        const overallSummary = await aiService.generateOverallSummary(cvMatchRate, cvFeedback, projectScore, projectFeedback);

        // Step 5: Compile final result
        const result = {
            cv_match_rate: cvMatchRate.score / 100, // Convert to decimal (0-1)
            cv_feedback: cvFeedback,
            project_score: projectScore.overallScore,
            project_feedback: projectFeedback,
            overall_summary: overallSummary,
            detailed_scores: {
                cv_breakdown: cvMatchRate.breakdown,
                project_breakdown: projectScore.breakdown
            },
            ai_analysis: {
                cv_structured: cvStructured,
                processing_stages: [
                    'File content extraction',
                    'CV information structuring',
                    'RAG context retrieval for job matching',
                    'CV evaluation with enhanced context',
                    'CV feedback generation',
                    'RAG context retrieval for project scoring',
                    'Project evaluation with enhanced criteria',
                    'Project feedback refinement',
                    'Overall summary compilation'
                ],
                rag_features: {
                    job_context_retrieved: cvMatchRate.rag_context_used || false,
                    project_context_retrieved: projectScore.rag_context_used || false,
                    matched_requirements: cvMatchRate.matched_requirements || [],
                    matched_criteria: projectScore.matched_criteria || []
                }
            },
            metadata: {
                evaluation_id: evaluationId,
                upload_id: uploadId,
                files: {
                    cv: uploadData.cv.originalName,
                    project: uploadData.project.originalName
                },
                processing_time: ((new Date() - job.startedAt) / 1000).toFixed(1) + 's'
            },
            processed_at: new Date()
        };

        // Update job with completed result
        job.status = 'completed';
        job.result = result;
        job.completedAt = new Date();
        job.message = 'AI evaluation completed successfully';
        evaluationJobs.set(evaluationId, job);

        console.log(`[${evaluationId}] ✅ AI evaluation completed successfully`);
        console.log(`[${evaluationId}] 📊 CV Score: ${(result.cv_match_rate * 100).toFixed(0)}%, Project Score: ${result.project_score}/5`);

    } catch (error) {
        console.error(`[${evaluationId}] ❌ AI evaluation failed:`, error);

        // Update job with error status
        const job = evaluationJobs.get(evaluationId);
        job.status = 'failed';
        job.error = error.message;
        job.message = 'AI evaluation failed - please try again';
        job.failedAt = new Date();
        evaluationJobs.set(evaluationId, job);
    }
}

/**
 * Extract text content from uploaded files
 */
async function extractFileContent(fileInfo) {
    try {
        console.log(`📄 Extracting content from: ${fileInfo.originalName}`);

        if (fileInfo.mimetype === 'text/plain') {
            const content = fs.readFileSync(fileInfo.path, 'utf8');
            console.log(`✅ Extracted ${content.length} characters from text file`);
            return content;
        }

        // For PDF/DOCX files - in production, use proper libraries like:
        // - pdf-parse for PDF files
        // - mammoth for DOCX files
        const mockContent = `
    Mock extracted content from ${fileInfo.originalName}
    File size: ${fileInfo.size} bytes
    File type: ${fileInfo.mimetype}
    
    [In production, this would contain the actual extracted text from PDF/DOCX files]
    This mock demonstrates text extraction functionality for non-text files.
    `;

        console.log(`⚠️  Using mock extraction for ${fileInfo.mimetype}`);
        return mockContent;

    } catch (error) {
        console.error(`❌ File extraction error for ${fileInfo.originalName}:`, error);
        return `Unable to extract content from ${fileInfo.originalName}: ${error.message}`;
    }
}

// ==============================================
// ERROR HANDLING MIDDLEWARE
// ==============================================

app.use((error, req, res, next) => {
    console.error('🚨 Unhandled error:', error);

    if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
                error: 'File too large',
                message: 'File size must be less than 10MB',
                code: error.code
            });
        }
        if (error.code === 'LIMIT_UNEXPECTED_FILE') {
            return res.status(400).json({
                error: 'Unexpected file field',
                message: 'Please use "cv" and "project" as field names',
                code: error.code
            });
        }
    }

    res.status(500).json({
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong',
        timestamp: new Date().toISOString()
    });
});

// Handle 404 routes
app.use('*', (req, res) => {
    res.status(404).json({
        error: 'Route not found',
        message: `Cannot ${req.method} ${req.originalUrl}`,
        available_endpoints: {
            root: 'GET /',
            upload: 'POST /upload',
            evaluate: 'POST /evaluate',
            result: 'GET /result/:id',
            health: 'GET /health',
            vectordb: 'GET /vectordb/status'
        }
    });
});

// ==============================================
// SERVER STARTUP
// ==============================================

app.listen(PORT, async () => {
    console.log('\n🚀 =====================================');
    console.log('   AI CV Evaluator Server Started');
    console.log('=====================================');
    console.log(`📍 Server: http://localhost:${PORT}`);
    console.log(`📊 Health: http://localhost:${PORT}/health`);
    console.log(`📚 API Info: http://localhost:${PORT}/`);
    console.log('=====================================\n');

    try {
        console.log('🗄️ Initializing Vector Database...');
        await vectorDB.initialize();
        console.log('✅ Vector Database initialized successfully');
        console.log('🔍 RAG context ready for AI evaluations');
    } catch (error) {
        console.error('❌ Vector DB initialization failed:', error.message);
        console.log('⚠️  Server will continue without RAG features');
    }

    console.log('\n✅ System ready to process CV evaluations!');
    console.log('📋 Upload files → Start evaluation → Check results');
    console.log('=====================================\n');
});

// Graceful shutdown handling
process.on('SIGTERM', () => {
    console.log('🛑 Received SIGTERM, shutting down gracefully...');
    // Cleanup code here if needed
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('\n🛑 Received SIGINT, shutting down gracefully...');
    // Cleanup code here if needed
    process.exit(0);
});

module.exports = app;