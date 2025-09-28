// __tests__/api.test.js
const request = require('supertest');
const fs = require('fs');
const path = require('path');

// Import the app
const app = require('../server');

describe('AI CV Evaluator API', () => {
    let server;
    let uploadId;
    let evaluationId;

    // Test data
    const testCVContent = `
    John Doe - Senior Backend Developer
    
    Experience: 5 years of Node.js development
    Built scalable REST APIs with Express.js
    Worked extensively with PostgreSQL and MongoDB
    AWS cloud deployment and Docker containerization
    Led team of 4 developers on microservices project
    
    Skills: Node.js, JavaScript, Python, Express.js, PostgreSQL, MongoDB, 
           AWS, Docker, REST APIs, microservices, AI, LLM integration
    
    Projects:
    - E-commerce Platform: Built backend serving 50k+ users
    - Performance optimization: Improved API response time by 60%
    - AI Chatbot: Integrated OpenAI API for customer support
    
    Education: Computer Science degree
    Open source contributor with 2000+ GitHub stars
  `;

    const testProjectContent = `
    AI CV Evaluator Project Implementation
    
    Built comprehensive Express.js backend service with advanced features:
    
    Technical Implementation:
    - LLM chaining for multi-step evaluation pipeline
    - Retrieval-Augmented Generation (RAG) with vector database
    - Async job processing with real-time status updates
    - File upload handling for PDF, DOCX, and TXT files
    
    Code Quality & Architecture:
    - Modular service-oriented architecture
    - Comprehensive error handling with retry mechanisms
    - Extensive logging and monitoring capabilities
    - RESTful API design with clear endpoint structure
    
    Resilience & Error Handling:
    - Exponential backoff for failed API calls
    - Timeout handling for long-running operations
    - Graceful failure recovery with meaningful error messages
    - Circuit breaker patterns for external service calls
    
    Testing & Documentation:
    - Jest test suite with 90% coverage
    - Integration tests for all API endpoints
    - Complete API documentation with examples
    - Detailed README with setup instructions
    
    RAG Implementation:
    - Vector embeddings for job requirements
    - Semantic search for relevant context retrieval
    - Context injection into AI prompts for enhanced accuracy
    - Dynamic scoring based on retrieved criteria
    
    Performance & Scalability:
    - Async processing pipeline for non-blocking operations
    - In-memory caching for frequently accessed data
    - Optimized file handling with stream processing
    - Ready for horizontal scaling with Redis integration
  `;

    beforeAll(async () => {
        // Create test files
        fs.writeFileSync('test-cv.txt', testCVContent);
        fs.writeFileSync('test-project.txt', testProjectContent);

        // Start server on different port for testing
        server = app.listen(0); // Use random available port

        // Wait a bit for Vector DB initialization
        await new Promise(resolve => setTimeout(resolve, 2000));
    });

    afterAll(async () => {
        // Cleanup test files
        if (fs.existsSync('test-cv.txt')) fs.unlinkSync('test-cv.txt');
        if (fs.existsSync('test-project.txt')) fs.unlinkSync('test-project.txt');

        // Close server
        if (server) {
            server.close();
        }
    });

    describe('API Information & Health', () => {
        test('GET / should return API information', async () => {
            const response = await request(app)
                .get('/')
                .expect(200);

            expect(response.body).toHaveProperty('message');
            expect(response.body).toHaveProperty('version');
            expect(response.body).toHaveProperty('endpoints');
            expect(response.body.endpoints).toHaveProperty('upload');
            expect(response.body.endpoints).toHaveProperty('evaluate');
            expect(response.body.endpoints).toHaveProperty('result');
        });

        test('GET /health should return system health', async () => {
            const response = await request(app)
                .get('/health')
                .expect(200);

            expect(response.body).toHaveProperty('status', 'healthy');
            expect(response.body).toHaveProperty('uptime');
            expect(response.body).toHaveProperty('vectorDB');
            expect(response.body.vectorDB).toHaveProperty('initialized');
        });
    });

    describe('Vector Database', () => {
        test('GET /vectordb/status should return Vector DB status', async () => {
            const response = await request(app)
                .get('/vectordb/status')
                .expect(200);

            expect(response.body).toHaveProperty('initialized');
            expect(response.body).toHaveProperty('documentCount');
            expect(response.body).toHaveProperty('categories');
        });

        test('GET /vectordb/search should search documents', async () => {
            const response = await request(app)
                .get('/vectordb/search?q=backend%20skills')
                .expect(200);

            expect(response.body).toHaveProperty('query');
            expect(response.body).toHaveProperty('results');
            expect(Array.isArray(response.body.results)).toBe(true);
        });

        test('GET /vectordb/search without query should return error', async () => {
            const response = await request(app)
                .get('/vectordb/search')
                .expect(400);

            expect(response.body).toHaveProperty('error');
            expect(response.body.error).toContain('required');
        });
    });

    describe('File Upload', () => {
        test('POST /upload should upload files successfully', async () => {
            const response = await request(app)
                .post('/upload')
                .attach('cv', 'test-cv.txt')
                .attach('project', 'test-project.txt')
                .expect(200);

            expect(response.body).toHaveProperty('uploadId');
            expect(response.body).toHaveProperty('files');
            expect(response.body.files).toHaveProperty('cv', 'test-cv.txt');
            expect(response.body.files).toHaveProperty('project', 'test-project.txt');
            expect(response.body).toHaveProperty('next_step');

            uploadId = response.body.uploadId;
        });

        test('POST /upload with missing CV should fail', async () => {
            const response = await request(app)
                .post('/upload')
                .attach('project', 'test-project.txt')
                .expect(400);

            expect(response.body).toHaveProperty('error');
            expect(response.body.error).toContain('required');
        });

        test('POST /upload with missing project should fail', async () => {
            const response = await request(app)
                .post('/upload')
                .attach('cv', 'test-cv.txt')
                .expect(400);

            expect(response.body).toHaveProperty('error');
            expect(response.body.error).toContain('required');
        });

        test('GET /upload/:id should return upload information', async () => {
            const response = await request(app)
                .get(`/upload/${uploadId}`)
                .expect(200);

            expect(response.body).toHaveProperty('uploadId', uploadId);
            expect(response.body).toHaveProperty('files');
            expect(response.body).toHaveProperty('status', 'ready for evaluation');
        });

        test('GET /upload/invalid-id should return 404', async () => {
            const response = await request(app)
                .get('/upload/invalid-id')
                .expect(404);

            expect(response.body).toHaveProperty('error');
        });
    });

    describe('Evaluation Pipeline', () => {
        test('POST /evaluate should start evaluation', async () => {
            const response = await request(app)
                .post('/evaluate')
                .send({ uploadId })
                .expect(200);

            expect(response.body).toHaveProperty('id');
            expect(response.body).toHaveProperty('status', 'queued');
            expect(response.body).toHaveProperty('check_result');
            expect(response.body).toHaveProperty('estimated_time');

            evaluationId = response.body.id;
        });

        test('POST /evaluate with invalid uploadId should fail', async () => {
            const response = await request(app)
                .post('/evaluate')
                .send({ uploadId: 'invalid-id' })
                .expect(400);

            expect(response.body).toHaveProperty('error');
            expect(response.body.error).toContain('Invalid upload ID');
        });

        test('POST /evaluate without uploadId should fail', async () => {
            const response = await request(app)
                .post('/evaluate')
                .send({})
                .expect(400);

            expect(response.body).toHaveProperty('error');
        });

        test('GET /result/:id should return processing status initially', async () => {
            const response = await request(app)
                .get(`/result/${evaluationId}`)
                .expect(200);

            expect(response.body).toHaveProperty('id', evaluationId);
            expect(['queued', 'processing']).toContain(response.body.status);
        });


        test('GET /result/:id should eventually return completed result', async () => {
            const maxWait = 20000; // 20 seconds
            const interval = 2000; // 2 seconds
            let elapsed = 0;

            while (elapsed < maxWait) {
                const response = await request(app)
                    .get(`/result/${evaluationId}`)
                    .expect(200);

                if (response.body.status === 'completed') {
                    // Validate completed result structure
                    expect(response.body).toHaveProperty('result');
                    expect(response.body.result).toHaveProperty('cv_match_rate');
                    expect(response.body.result).toHaveProperty('cv_feedback');
                    expect(response.body.result).toHaveProperty('project_score');
                    expect(response.body.result).toHaveProperty('project_feedback');
                    expect(response.body.result).toHaveProperty('overall_summary');
                    expect(response.body.result).toHaveProperty('detailed_scores');
                    expect(response.body.result).toHaveProperty('ai_analysis');
                    expect(response.body.result).toHaveProperty('metadata');

                    // Validate AI analysis structure
                    expect(response.body.result.ai_analysis).toHaveProperty('cv_structured');
                    expect(response.body.result.ai_analysis).toHaveProperty('processing_stages');
                    expect(response.body.result.ai_analysis).toHaveProperty('rag_features');

                    // Validate RAG features
                    expect(response.body.result.ai_analysis.rag_features).toHaveProperty('job_context_retrieved');
                    expect(response.body.result.ai_analysis.rag_features).toHaveProperty('project_context_retrieved');

                    // Validate data types
                    expect(typeof response.body.result.cv_match_rate).toBe('number');
                    expect(typeof response.body.result.project_score).toBe('number');
                    expect(typeof response.body.result.cv_feedback).toBe('string');
                    expect(typeof response.body.result.project_feedback).toBe('string');
                    expect(typeof response.body.result.overall_summary).toBe('string');

                    // Validate score ranges
                    expect(response.body.result.cv_match_rate).toBeGreaterThanOrEqual(0);
                    expect(response.body.result.cv_match_rate).toBeLessThanOrEqual(1);
                    expect(response.body.result.project_score).toBeGreaterThanOrEqual(1);
                    expect(response.body.result.project_score).toBeLessThanOrEqual(5);

                    return; // Test passes
                } else if (response.body.status === 'failed') {
                    throw new Error(`Evaluation failed: ${response.body.error}`);
                }

                await new Promise(resolve => setTimeout(resolve, interval));
                elapsed += interval;
            }

            throw new Error('Evaluation did not complete within timeout');
        }, 25000);


        test('GET /result/invalid-id should return 404', async () => {
            const response = await request(app)
                .get('/result/invalid-id')
                .expect(404);

            expect(response.body).toHaveProperty('error');
        });
    });

    describe('Error Handling', () => {
        test('Should handle non-existent routes', async () => {
            const response = await request(app)
                .get('/non-existent-route')
                .expect(404);

            expect(response.body).toHaveProperty('error', 'Route not found');
            expect(response.body).toHaveProperty('available_endpoints');
        });

        test('Should handle invalid HTTP methods', async () => {
            const response = await request(app)
                .put('/upload')
                .expect(404);

            expect(response.body).toHaveProperty('error');
        });
    });

    describe('Performance & Load Testing', () => {
        test('Multiple concurrent uploads should work', async () => {
            const promises = [];

            for (let i = 0; i < 3; i++) {
                promises.push(
                    request(app)
                        .post('/upload')
                        .attach('cv', 'test-cv.txt')
                        .attach('project', 'test-project.txt')
                );
            }

            const responses = await Promise.all(promises);

            responses.forEach(response => {
                expect(response.status).toBe(200);
                expect(response.body).toHaveProperty('uploadId');
            });
        });

        test('Health endpoint should respond quickly', async () => {
            const start = Date.now();

            await request(app)
                .get('/health')
                .expect(200);

            const duration = Date.now() - start;
            expect(duration).toBeLessThan(1000); // Should respond within 1 second
        });
    });

    describe('Data Validation & Edge Cases', () => {
        test('Should handle empty files gracefully', async () => {
            fs.writeFileSync('empty-cv.txt', '');
            fs.writeFileSync('empty-project.txt', '');

            const response = await request(app)
                .post('/upload')
                .attach('cv', 'empty-cv.txt')
                .attach('project', 'empty-project.txt')
                .expect(200);

            expect(response.body).toHaveProperty('uploadId');

            // Cleanup
            fs.unlinkSync('empty-cv.txt');
            fs.unlinkSync('empty-project.txt');
        });

        test('Should handle very large text content', async () => {
            const largeContent = 'Large content test. '.repeat(1000);
            fs.writeFileSync('large-cv.txt', largeContent);
            fs.writeFileSync('large-project.txt', largeContent);

            const response = await request(app)
                .post('/upload')
                .attach('cv', 'large-cv.txt')
                .attach('project', 'large-project.txt')
                .expect(200);

            expect(response.body).toHaveProperty('uploadId');
            expect(response.body.sizes.cv).toContain('KB');

            // Cleanup
            fs.unlinkSync('large-cv.txt');
            fs.unlinkSync('large-project.txt');
        });
    });
});