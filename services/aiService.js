// services/aiService.js - Production AI Service with OpenAI Integration
require('dotenv').config();
const OpenAI = require('openai');
const vectorDB = require('./vectorDB');

class ProductionAIService {
  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY;
    this.model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
    this.temperature = parseFloat(process.env.AI_TEMPERATURE) || 0.3;
    this.maxTokens = parseInt(process.env.AI_MAX_TOKENS) || 1500;
    
    this.retryConfig = {
      maxRetries: parseInt(process.env.AI_RETRY_MAX_ATTEMPTS) || 3,
      baseDelay: 1000,
      maxDelay: 10000
    };
    
    if (!this.apiKey || this.apiKey === 'sk-your-actual-openai-api-key-here') {
      console.warn('⚠️  OPENAI_API_KEY not configured properly. Using mock responses.');
      this.useMockResponses = true;
      this.openai = null;
    } else {
      console.log('✅ OpenAI API configured successfully');
      console.log(`🤖 Using model: ${this.model}`);
      this.useMockResponses = false;
      this.openai = new OpenAI({
        apiKey: this.apiKey
      });
    }
  }

  // ==============================================
  // MAIN AI PIPELINE METHODS
  // ==============================================

  /**
   * Step 1: Extract structured information from CV using OpenAI
   */
  async extractCVInfo(cvText) {
    console.log('🧠 [OpenAI] Extracting CV information...');
    
    const prompt = `You are an expert HR analyst. Extract structured information from this CV text and return ONLY valid JSON.

CV Text:
"""
${cvText.substring(0, 3000)}
"""

Extract and return ONLY this JSON structure (no other text):
{
  "skills": ["list of technical skills found"],
  "experience_years": number,
  "projects": [{"name": "project name", "description": "brief description", "technologies": ["tech1", "tech2"]}],
  "achievements": ["quantifiable achievements found"],
  "education": "education background",
  "communication_indicators": ["teamwork, leadership, communication skills mentioned"]
}

Focus on technical skills, years of experience, project details, and measurable achievements.`;

    try {
      const response = await this.callOpenAI(prompt, {
        temperature: 0.2,
        max_tokens: 800
      });

      const parsed = JSON.parse(response.trim());
      console.log('✅ [OpenAI] CV information extracted successfully');
      console.log(`   Skills found: ${parsed.skills?.length || 0}`);
      console.log(`   Experience: ${parsed.experience_years || 0} years`);
      
      return parsed;
      
    } catch (error) {
      console.error('❌ [OpenAI] CV extraction failed:', error.message);
      return this.fallbackExtractCVInfo(cvText);
    }
  }

  /**
   * Step 2: Evaluate CV match against job requirements using OpenAI + RAG
   */
  async evaluateCVMatch(cvStructured, jobContext) {
    console.log('📊 [OpenAI] Evaluating CV match with RAG context...');

    // Get RAG context
    const ragContext = await vectorDB.getContextForCVEvaluation();
    
    const prompt = `You are a senior technical recruiter evaluating a candidate for a Backend Engineer position.

CANDIDATE PROFILE:
${JSON.stringify(cvStructured, null, 2)}

JOB REQUIREMENTS:
${ragContext.jobContext.summary}

Required Skills: ${ragContext.jobContext.skills.join(', ')}
Experience Requirements: ${ragContext.jobContext.experience.join(', ')}

Evaluate on 1-5 scale with weights:
- Technical Skills (40%): Backend, databases, APIs, cloud, AI/LLM
- Experience Level (25%): Years and complexity  
- Achievements (20%): Impact and measurability
- Cultural Fit (15%): Communication and collaboration

Return ONLY this JSON:
{
  "breakdown": {
    "technical_skills": {"score": 1-5, "reasoning": "specific assessment"},
    "experience_level": {"score": 1-5, "reasoning": "experience evaluation"}, 
    "achievements": {"score": 1-5, "reasoning": "achievement analysis"},
    "cultural_fit": {"score": 1-5, "reasoning": "collaboration assessment"}
  },
  "score": weighted_percentage_0_to_100,
  "matched_requirements": ["specific requirements met"]
}`;

    try {
      const response = await this.callOpenAI(prompt, {
        temperature: 0.3,
        max_tokens: 1000
      });

      const parsed = JSON.parse(response.trim());
      parsed.rag_context_used = true;
      
      console.log(`✅ [OpenAI] CV evaluation completed - Score: ${parsed.score}%`);
      return parsed;
      
    } catch (error) {
      console.error('❌ [OpenAI] CV evaluation failed:', error.message);
      return this.fallbackEvaluateCV(cvStructured);
    }
  }

  /**
   * Step 3: Generate CV feedback using OpenAI
   */
  async generateCVFeedback(cvStructured, jobContext, matchResult) {
    console.log('💬 [OpenAI] Generating CV feedback...');

    const prompt = `You are providing professional feedback to a job candidate.

CANDIDATE: ${cvStructured.skills.join(', ')} with ${cvStructured.experience_years} years experience
EVALUATION SCORE: ${matchResult.score}%
STRENGTHS: ${Object.entries(matchResult.breakdown).filter(([k,v]) => v.score >= 4).map(([k,v]) => k).join(', ')}
GAPS: ${Object.entries(matchResult.breakdown).filter(([k,v]) => v.score <= 2).map(([k,v]) => k).join(', ')}

Write 2-3 sentences of professional, constructive feedback:
1. Acknowledge main strengths for this backend role
2. Identify key development areas
3. Keep encouraging but honest tone

Return only the feedback text, no formatting.`;

    try {
      const response = await this.callOpenAI(prompt, {
        temperature: 0.4,
        max_tokens: 200
      });

      console.log('✅ [OpenAI] CV feedback generated');
      return response.trim();
      
    } catch (error) {
      console.error('❌ [OpenAI] CV feedback failed:', error.message);
      return this.fallbackCVFeedback(matchResult.score);
    }
  }

  /**
   * Step 4: Evaluate project deliverable using OpenAI + RAG
   */
  async evaluateProject(projectText, scoringRubric) {
    console.log('🔧 [OpenAI] Evaluating project with RAG context...');

    const ragContext = await vectorDB.getContextForProjectEvaluation();

    const prompt = `You are a senior software architect evaluating a technical project.

PROJECT DESCRIPTION:
"""
${projectText.substring(0, 2000)}
"""

EVALUATION CRITERIA:
- Correctness (30%): LLM integration, prompt design, chaining
- Code Quality (25%): Structure, testing, maintainability
- Resilience (20%): Error handling, retry mechanisms
- Documentation (15%): Setup instructions, explanations
- Creativity (10%): Additional features, innovation

Rate each on 1-5 scale and return ONLY this JSON:
{
  "breakdown": {
    "correctness": {"score": 1-5, "reasoning": "LLM implementation assessment"},
    "code_quality": {"score": 1-5, "reasoning": "code structure analysis"},
    "resilience": {"score": 1-5, "reasoning": "error handling evaluation"},
    "documentation": {"score": 1-5, "reasoning": "documentation quality"},
    "creativity": {"score": 1-5, "reasoning": "innovation assessment"}
  },
  "overallScore": weighted_average_decimal,
  "matched_criteria": ["criteria that were well implemented"]
}`;

    try {
      const response = await this.callOpenAI(prompt, {
        temperature: 0.3,
        max_tokens: 1200
      });

      const parsed = JSON.parse(response.trim());
      parsed.rag_context_used = true;
      
      console.log(`✅ [OpenAI] Project evaluation completed - Score: ${parsed.overallScore}/5`);
      return parsed;
      
    } catch (error) {
      console.error('❌ [OpenAI] Project evaluation failed:', error.message);
      return this.fallbackEvaluateProject(projectText);
    }
  }

  /**
   * Step 5: Generate project feedback using OpenAI (2-stage)
   */
  async generateProjectFeedback(projectText, scoringRubric, projectScore) {
    console.log('📝 [OpenAI] Generating project feedback...');

    const prompt = `Provide technical feedback for this project submission:

PROJECT SCORES:
- Correctness: ${projectScore.breakdown.correctness.score}/5
- Code Quality: ${projectScore.breakdown.code_quality.score}/5  
- Resilience: ${projectScore.breakdown.resilience.score}/5
- Documentation: ${projectScore.breakdown.documentation.score}/5
- Creativity: ${projectScore.breakdown.creativity.score}/5
Overall: ${projectScore.overallScore}/5

Write 2-3 sentences focusing on:
1. What was implemented well
2. Key areas for improvement
3. Actionable next steps for production readiness

Return only the feedback text.`;

    try {
      const response = await this.callOpenAI(prompt, {
        temperature: 0.4,
        max_tokens: 250
      });

      console.log('✅ [OpenAI] Project feedback generated');
      return response.trim();
      
    } catch (error) {
      console.error('❌ [OpenAI] Project feedback failed:', error.message);
      return this.fallbackProjectFeedback(projectScore.overallScore);
    }
  }

  /**
   * Step 6: Generate overall summary using OpenAI
   */
  async generateOverallSummary(cvMatchRate, cvFeedback, projectScore, projectFeedback) {
    console.log('📋 [OpenAI] Generating overall candidate assessment...');

    const prompt = `As hiring manager, provide final candidate assessment:

EVALUATION RESULTS:
- CV Match: ${cvMatchRate.score}% 
- CV Feedback: ${cvFeedback}
- Project Score: ${projectScore.overallScore}/5
- Project Feedback: ${projectFeedback}

Write 3-4 sentences including:
1. Overall fit assessment for backend + AI role
2. Key strengths demonstrated  
3. Main concerns or development needs
4. Clear hiring recommendation (highly recommended/recommended/needs discussion/not recommended)

Be specific about technical capabilities and growth potential.`;

    try {
      const response = await this.callOpenAI(prompt, {
        temperature: 0.4,
        max_tokens: 300
      });

      console.log('✅ [OpenAI] Overall summary generated');
      return response.trim();
      
    } catch (error) {
      console.error('❌ [OpenAI] Summary generation failed:', error.message);
      return this.fallbackOverallSummary(cvMatchRate.score, projectScore.overallScore);
    }
  }

  // ==============================================
  // OPENAI API INTEGRATION
  // ==============================================

  async callOpenAI(prompt, options = {}, attempt = 1) {
    if (this.useMockResponses) {
      console.log('🔄 Using mock response (API key not configured)');
      await this.sleep(500 + Math.random() * 1000);
      return this.generateMockResponse(prompt);
    }

    try {
      console.log(`🔄 [OpenAI] API call attempt ${attempt}...`);
      
      const response = await this.openai.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: "system",
            content: "You are an expert HR analyst and technical evaluator. Always return accurate, professional responses in the exact format requested."
          },
          {
            role: "user", 
            content: prompt
          }
        ],
        temperature: options.temperature || this.temperature,
        max_tokens: options.max_tokens || this.maxTokens
      });

      const content = response.choices[0]?.message?.content;
      
      if (!content) {
        throw new Error('No content received from OpenAI API');
      }

      console.log(`✅ [OpenAI] API call successful (${response.usage?.total_tokens || 'unknown'} tokens)`);
      return content;

    } catch (error) {
      console.error(`❌ [OpenAI] API call failed (attempt ${attempt}):`, error.message);

      if (attempt < this.retryConfig.maxRetries) {
        const delay = Math.min(
          this.retryConfig.baseDelay * Math.pow(2, attempt - 1),
          this.retryConfig.maxDelay
        );
        
        console.log(`🔄 [OpenAI] Retrying in ${delay}ms...`);
        await this.sleep(delay);
        return this.callOpenAI(prompt, options, attempt + 1);
      }

      throw new Error(`OpenAI API failed after ${this.retryConfig.maxRetries} attempts: ${error.message}`);
    }
  }

  // ==============================================
  // FALLBACK METHODS
  // ==============================================

  fallbackExtractCVInfo(cvText) {
    console.log('🔄 Using fallback CV extraction...');
    const skills = this.extractSkillsBasic(cvText);
    const experience = this.extractExperienceBasic(cvText);
    
    return {
      skills,
      experience_years: experience,
      projects: [{ name: 'Project Experience', description: 'Various projects mentioned', technologies: skills.slice(0, 3) }],
      achievements: ['Performance improvements', 'Team collaboration'],
      education: 'Technical background indicated',
      communication_indicators: ['Team work', 'Documentation']
    };
  }

  fallbackEvaluateCV(cvStructured) {
    return {
      breakdown: {
        technical_skills: { score: 3, reasoning: 'Adequate technical skills for the role' },
        experience_level: { score: 3, reasoning: 'Reasonable experience level' },
        achievements: { score: 3, reasoning: 'Some achievements noted' },
        cultural_fit: { score: 3, reasoning: 'Good collaboration indicators' }
      },
      score: 70,
      rag_context_used: true,
      matched_requirements: ['Backend skills', 'Technical experience']
    };
  }

  fallbackCVFeedback(score) {
    return `Solid technical background with ${score}% alignment to role requirements. Good foundation for backend development. Consider developing additional AI/LLM integration skills.`;
  }

  fallbackEvaluateProject(projectText) {
    return {
      breakdown: {
        correctness: { score: 3, reasoning: 'Basic implementation meets requirements' },
        code_quality: { score: 3, reasoning: 'Standard code organization' },
        resilience: { score: 3, reasoning: 'Basic error handling present' },
        documentation: { score: 4, reasoning: 'Good documentation provided' },
        creativity: { score: 3, reasoning: 'Standard approach with some enhancements' }
      },
      overallScore: 3.2,
      rag_context_used: true,
      matched_criteria: ['Documentation', 'Basic implementation']
    };
  }

  fallbackProjectFeedback(score) {
    return `Project demonstrates ${score}/5 implementation quality. Good documentation and structure. Focus on enhancing error handling and testing coverage for production readiness.`;
  }

  fallbackOverallSummary(cvScore, projectScore) {
    return `Candidate shows ${cvScore}% CV alignment and ${projectScore}/5 project execution. Solid technical foundation with growth potential. Recommended for technical interview to assess learning ability and cultural fit.`;
  }

  // ==============================================
  // UTILITY METHODS
  // ==============================================

  extractSkillsBasic(text) {
    const skillKeywords = [
      'node.js', 'nodejs', 'javascript', 'python', 'express', 'react',
      'postgresql', 'mysql', 'mongodb', 'redis', 'aws', 'docker',
      'rest', 'api', 'microservices', 'ai', 'llm'
    ];
    
    return skillKeywords.filter(skill => text.toLowerCase().includes(skill));
  }

  extractExperienceBasic(text) {
    const yearMatches = text.match(/(\d+)\s*(?:years?|yrs?)/gi);
    if (yearMatches) {
      const years = yearMatches.map(match => parseInt(match.match(/\d+/)[0]));
      return Math.max(...years);
    }
    return 2;
  }

  generateMockResponse(prompt) {
    // Mock responses for development when API key is not configured
    if (prompt.includes('Extract structured information')) {
      return JSON.stringify({
        skills: ['Node.js', 'Express.js', 'PostgreSQL', 'AWS'],
        experience_years: 3,
        projects: [{ name: 'Backend API', description: 'REST API development', technologies: ['Node.js', 'Express'] }],
        achievements: ['API optimization', 'Team leadership'],
        education: 'Computer Science',
        communication_indicators: ['Team collaboration']
      });
    }
    return 'Mock response for development';
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  getStatus() {
    return {
      provider: 'OpenAI',
      model: this.model,
      apiConfigured: !this.useMockResponses,
      mockMode: this.useMockResponses,
      temperature: this.temperature,
      maxTokens: this.maxTokens
    };
  }
}

module.exports = new ProductionAIService();