// services/vectorDB.js
class VectorDB {
    constructor() {
        this.documents = [];
        this.embeddings = new Map();
        this.initialized = false;
    }

    async initialize() {
        try {
            console.log('🗄️ Initializing Vector Database...');

            // Load job requirements and scoring rubric
            await this.loadJobRequirements();
            await this.loadScoringRubric();

            this.initialized = true;
            console.log('✅ Vector DB initialized with job data');
        } catch (error) {
            console.error('❌ Vector DB initialization failed:', error);
            throw error;
        }
    }

    async loadJobRequirements() {
        const jobDescription = `
    Product Engineer (Backend) 2025 - Rakamin Position Requirements

    We're seeking a backend engineer to build AI-powered systems and scalable solutions.
    
    Core Responsibilities:
    - Building robust backend solutions with high performance and throughput
    - Designing and fine-tuning AI prompts aligned with product requirements  
    - Building LLM chaining flows where model outputs are reliably passed between models
    - Implementing Retrieval-Augmented Generation (RAG) with vector databases
    - Handling long-running AI processes with job orchestration and retry mechanisms
    - Managing failure cases from 3rd party APIs and LLM nondeterminism
    - Writing reusable, testable, and efficient code
    - Strengthening test coverage for robust web applications
    
    Required Technical Skills:
    - Backend frameworks: Node.js, Django, Rails, Express.js
    - Databases: PostgreSQL, MySQL, MongoDB, Redis
    - APIs: RESTful services, GraphQL, microservices architecture
    - Cloud platforms: AWS, Google Cloud, Azure
    - Programming languages: JavaScript, Python, Java, Ruby
    - AI/ML: LLM APIs, embeddings, vector databases, prompt engineering
    - DevOps: Docker, Kubernetes, CI/CD pipelines
    - Testing: Automated testing, unit tests, integration tests
    - Security: Authentication, authorization, data protection
    
    Experience Requirements:
    - 2+ years backend development experience
    - Experience with microservices and distributed systems
    - Exposure to AI/LLM development or strong desire to learn
    - Track record of building scalable applications
    - Experience with performance optimization and monitoring
    
    Desired Qualities:
    - Strong problem-solving and analytical skills
    - Excellent communication and collaboration abilities
    - Self-motivated with ability to work independently
    - Continuous learning mindset
    - Experience mentoring junior developers
    - Contribution to open source projects
    `;

        await this.storeDocument('job-requirements', jobDescription, 'job-description');
    }

    async loadScoringRubric() {
        const scoringRubric = `
    Comprehensive Scoring Rubric for CV and Project Evaluation

    === CV EVALUATION SCORING (1-5 scale) ===
    
    1. Technical Skills Match (Weight: 40%)
    SCORE 5 (Excellent): 
    - Strong backend expertise (Node.js, Python, databases)
    - Demonstrated AI/LLM integration experience
    - Cloud platform proficiency (AWS/GCP/Azure)
    - Modern development practices (Docker, microservices, testing)
    
    SCORE 4 (Strong): 
    - Solid backend foundation with 2+ relevant technologies
    - Some AI/LLM exposure or strong interest indicated
    - Basic cloud platform experience
    - Good understanding of software engineering practices
    
    SCORE 3 (Partial): 
    - Basic backend skills with 1-2 relevant technologies
    - Limited or no AI experience but willingness to learn
    - Minimal cloud exposure
    - Standard development practices
    
    SCORE 2 (Minimal):
    - Few overlapping technical skills
    - No AI/LLM background
    - Limited modern development experience
    
    SCORE 1 (Poor):
    - Irrelevant or outdated technical skills
    - No alignment with job requirements
    
    2. Experience Level (Weight: 25%)
    SCORE 5: 5+ years with high-impact, complex projects
    SCORE 4: 3-4 years with solid track record and meaningful projects  
    SCORE 3: 2-3 years with mid-scale projects and growth trajectory
    SCORE 2: 1-2 years with basic projects and limited scope
    SCORE 1: <1 year or only trivial projects
    
    3. Relevant Achievements (Weight: 20%)
    SCORE 5: Multiple quantifiable achievements with major business impact
    SCORE 4: Clear performance improvements and measurable outcomes
    SCORE 3: Some documented achievements with moderate impact
    SCORE 2: Minimal quantifiable improvements shown
    SCORE 1: No clear measurable achievements demonstrated
    
    4. Cultural/Collaboration Fit (Weight: 15%)
    SCORE 5: Strong leadership, mentoring, excellent communication skills
    SCORE 4: Good teamwork, clear communication, collaboration experience
    SCORE 3: Average communication with some team interaction indicated
    SCORE 2: Basic collaboration skills with minimal demonstration
    SCORE 1: Poor communication or no teamwork evidence

    === PROJECT EVALUATION SCORING (1-5 scale) ===
    
    1. Correctness - Prompt & Chaining (Weight: 30%)
    SCORE 5: Excellent prompt design with sophisticated chaining logic
    SCORE 4: Correct LLM integration with good prompt engineering
    SCORE 3: Basic working implementation with adequate prompts
    SCORE 2: Minimal LLM integration with poor prompt design
    SCORE 1: No proper LLM integration or missing prompt functionality
    
    2. Code Quality & Structure (Weight: 25%)
    SCORE 5: Exceptional code organization, comprehensive testing, best practices
    SCORE 4: Good structure with solid testing and clean architecture
    SCORE 3: Decent organization with basic testing coverage
    SCORE 2: Some structure but limited testing and documentation
    SCORE 1: Poor code organization, no tests, difficult to understand
    
    3. Resilience & Error Handling (Weight: 20%)
    SCORE 5: Production-ready resilience with comprehensive error handling
    SCORE 4: Solid error handling with retry mechanisms and timeouts
    SCORE 3: Basic error handling for common failure scenarios
    SCORE 2: Minimal error handling with limited failure recovery
    SCORE 1: No error handling or resilience considerations
    
    4. Documentation & Explanation (Weight: 15%)
    SCORE 5: Outstanding documentation with design insights and trade-offs
    SCORE 4: Clear, comprehensive documentation with good explanations
    SCORE 3: Adequate documentation covering setup and basic usage
    SCORE 2: Minimal documentation with basic setup instructions
    SCORE 1: Poor or missing documentation
    
    5. Creativity & Bonus Features (Weight: 10%)
    SCORE 5: Outstanding innovative features beyond requirements
    SCORE 4: Strong additional functionality with thoughtful enhancements
    SCORE 3: Some useful extra features or improvements
    SCORE 2: Basic additional features with limited value
    SCORE 1: No additional features beyond minimum requirements
    `;

        await this.storeDocument('scoring-rubric', scoringRubric, 'evaluation-criteria');
    }

    async storeDocument(id, content, category) {
        const document = {
            id,
            content,
            category,
            chunks: this.chunkDocument(content),
            keywords: this.extractKeywords(content),
            createdAt: new Date()
        };

        this.documents.push(document);
        console.log(`📚 Stored document: ${id} (${document.chunks.length} chunks)`);
    }

    chunkDocument(content) {
        // Split by sections and paragraphs for better retrieval
        const sections = content.split(/\n\s*\n/);
        return sections
            .filter(chunk => chunk.trim().length > 50)
            .map(chunk => chunk.trim());
    }

    extractKeywords(text) {
        const keywords = text.toLowerCase()
            .match(/\b\w{3,}\b/g) // Words with 3+ characters
            ?.filter(word =>
                !['the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had', 'her', 'was', 'one', 'our', 'out', 'day', 'get', 'has', 'him', 'his', 'how', 'man', 'new', 'now', 'old', 'see', 'two', 'way', 'who', 'boy', 'did', 'its', 'let', 'put', 'say', 'she', 'too', 'use'].includes(word)
            ) || [];

        // Count frequency and return most common
        const wordCount = {};
        keywords.forEach(word => {
            wordCount[word] = (wordCount[word] || 0) + 1;
        });

        return Object.entries(wordCount)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 20)
            .map(([word]) => word);
    }

    // RAG retrieval methods
    async getJobRequirements(query = null) {
        const jobDoc = this.documents.find(doc => doc.id === 'job-requirements');

        if (!jobDoc) {
            throw new Error('Job requirements not loaded');
        }

        if (!query) {
            return jobDoc.content;
        }

        // Find relevant chunks based on query
        const relevantChunks = this.findRelevantChunks(jobDoc.chunks, query);
        return relevantChunks.join('\n\n');
    }

    async getScoringRubric(evaluationType = null) {
        const rubricDoc = this.documents.find(doc => doc.id === 'scoring-rubric');

        if (!rubricDoc) {
            throw new Error('Scoring rubric not loaded');
        }

        if (!evaluationType) {
            return rubricDoc.content;
        }

        // Filter rubric by evaluation type
        const relevantChunks = this.findRelevantChunks(rubricDoc.chunks, evaluationType);
        return relevantChunks.join('\n\n');
    }

    findRelevantChunks(chunks, query) {
        const queryWords = query.toLowerCase().split(/\s+/);

        const scoredChunks = chunks
            .map(chunk => ({
                chunk,
                score: this.calculateRelevanceScore(chunk, queryWords)
            }))
            .filter(item => item.score > 0)
            .sort((a, b) => b.score - a.score);

        // Return top 3 most relevant chunks
        return scoredChunks
            .slice(0, 3)
            .map(item => item.chunk);
    }

    calculateRelevanceScore(chunk, queryWords) {
        const chunkWords = chunk.toLowerCase().split(/\s+/);
        let score = 0;

        queryWords.forEach(queryWord => {
            chunkWords.forEach(chunkWord => {
                if (chunkWord.includes(queryWord) || queryWord.includes(chunkWord)) {
                    score += queryWord.length > 3 ? 2 : 1; // Longer words get higher weight
                }
            });
        });

        // Bonus for exact matches
        if (queryWords.some(word => chunk.toLowerCase().includes(word))) {
            score += 3;
        }

        return score;
    }

    // Context injection helpers for AI prompts
    async getContextForCVEvaluation() {
        const jobRequirements = await this.getJobRequirements('technical skills experience backend requirements');
        const cvRubric = await this.getScoringRubric('CV evaluation technical skills experience');

        return {
            jobContext: this.extractJobContext(jobRequirements),
            evaluationGuidelines: this.extractCVGuidelines(cvRubric)
        };
    }

    async getContextForProjectEvaluation() {
        const projectRubric = await this.getScoringRubric('project evaluation correctness code quality resilience');
        const technicalReqs = await this.getJobRequirements('LLM chaining RAG implementation error handling');

        return {
            scoringCriteria: this.extractProjectCriteria(projectRubric),
            technicalRequirements: this.extractTechnicalRequirements(technicalReqs)
        };
    }

    extractJobContext(requirements) {
        // Extract key job requirements for CV matching
        const lines = requirements.split('\n').filter(line => line.trim());
        const skillsSection = lines.find(line => line.includes('Required Technical Skills'));
        const expSection = lines.find(line => line.includes('Experience Requirements'));

        return {
            skills: this.extractBulletPoints(requirements, 'Required Technical Skills'),
            experience: this.extractBulletPoints(requirements, 'Experience Requirements'),
            summary: 'Backend engineer role focusing on AI-powered systems, LLM integration, and scalable architecture'
        };
    }

    extractCVGuidelines(rubric) {
        return {
            technical_skills: this.extractScoringDetails(rubric, 'Technical Skills Match'),
            experience_level: this.extractScoringDetails(rubric, 'Experience Level'),
            achievements: this.extractScoringDetails(rubric, 'Relevant Achievements'),
            cultural_fit: this.extractScoringDetails(rubric, 'Cultural/Collaboration Fit')
        };
    }

    extractProjectCriteria(rubric) {
        return {
            correctness: this.extractScoringDetails(rubric, 'Correctness - Prompt & Chaining'),
            code_quality: this.extractScoringDetails(rubric, 'Code Quality & Structure'),
            resilience: this.extractScoringDetails(rubric, 'Resilience & Error Handling'),
            documentation: this.extractScoringDetails(rubric, 'Documentation & Explanation'),
            creativity: this.extractScoringDetails(rubric, 'Creativity & Bonus Features')
        };
    }

    extractTechnicalRequirements(requirements) {
        return this.extractBulletPoints(requirements, 'Core Responsibilities');
    }

    extractBulletPoints(text, sectionName) {
        const lines = text.split('\n');
        const sectionStart = lines.findIndex(line => line.includes(sectionName));

        if (sectionStart === -1) return [];

        const bulletPoints = [];
        for (let i = sectionStart + 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line.startsWith('-') || line.startsWith('•')) {
                bulletPoints.push(line.substring(1).trim());
            } else if (line && !line.startsWith(' ') && bulletPoints.length > 0) {
                break; // End of section
            }
        }

        return bulletPoints;
    }

    extractScoringDetails(rubric, criteriaName) {
        const lines = rubric.split('\n');
        const startIndex = lines.findIndex(line => line.includes(criteriaName));

        if (startIndex === -1) return 'Standard evaluation criteria apply';

        const details = [];
        for (let i = startIndex; i < lines.length && i < startIndex + 10; i++) {
            const line = lines[i].trim();
            if (line.startsWith('SCORE') || line.includes('Weight:')) {
                details.push(line);
            }
        }

        return details.join(' ');
    }

    // Status and utility methods
    getStatus() {
        return {
            initialized: this.initialized,
            documentCount: this.documents.length,
            categories: [...new Set(this.documents.map(doc => doc.category))],
            totalChunks: this.documents.reduce((sum, doc) => sum + doc.chunks.length, 0)
        };
    }

    searchDocuments(query, limit = 5) {
        const queryWords = query.toLowerCase().split(/\s+/);

        const results = this.documents.map(doc => ({
            id: doc.id,
            category: doc.category,
            relevantChunks: this.findRelevantChunks(doc.chunks, query),
            totalRelevance: this.findRelevantChunks(doc.chunks, query).length
        }))
            .filter(result => result.totalRelevance > 0)
            .sort((a, b) => b.totalRelevance - a.totalRelevance)
            .slice(0, limit);

        return results;
    }
}

module.exports = new VectorDB();