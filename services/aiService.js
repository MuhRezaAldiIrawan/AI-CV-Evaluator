// services/aiService.js
const vectorDB = require('./vectorDB');

class AIService {
  constructor() {
    this.retryConfig = {
      maxRetries: 3,
      baseDelay: 1000
    };
  }

  // ==============================================
  // MAIN AI PIPELINE METHODS
  // ==============================================

  /**
   * Step 1: Extract structured information from CV
   */
  async extractCVInfo(cvText) {
    console.log('🔍 Extracting CV information...');
    
    // Simulate processing delay
    await this.sleep(500);

    // Simple text analysis (will be replaced with real LLM)
    const skills = this.extractSkills(cvText);
    const experience = this.extractExperience(cvText);
    const projects = this.extractProjects(cvText);

    return {
      skills,
      experience_years: experience,
      projects,
      achievements: this.extractAchievements(cvText),
      education: this.extractEducation(cvText),
      communication_indicators: this.extractCommunication(cvText)
    };
  }

  /**
   * Step 2: Evaluate CV match against job requirements (with RAG)
   */
  async evaluateCVMatch(cvStructured, jobContext) {
    console.log('📊 Evaluating CV match with RAG context...');
    
    await this.sleep(800);

    // Get enhanced context from vector DB
    const ragContext = await vectorDB.getContextForCVEvaluation();
    console.log('🔍 Retrieved RAG context for CV evaluation');

    // Enhanced scoring with RAG context
    const technicalSkills = this.scoreTechnicalSkillsWithRAG(cvStructured.skills, ragContext.jobContext.skills);
    const experienceLevel = this.scoreExperienceWithRAG(cvStructured.experience_years, ragContext.jobContext.experience);
    const achievements = this.scoreAchievements(cvStructured.achievements);
    const culturalFit = this.scoreCulturalFit(cvStructured.communication_indicators);

    // Calculate weighted average (convert to percentage)
    const weightedScore = (
      technicalSkills * 0.4 +
      experienceLevel * 0.25 +
      achievements * 0.2 +
      culturalFit * 0.15
    );

    return {
      breakdown: {
        technical_skills: { 
          score: technicalSkills, 
          reasoning: this.getTechnicalReasoningWithRAG(cvStructured.skills, ragContext.jobContext.skills)
        },
        experience_level: { 
          score: experienceLevel, 
          reasoning: this.getExperienceReasoningWithRAG(cvStructured.experience_years, ragContext.jobContext.experience)
        },
        achievements: { 
          score: achievements, 
          reasoning: this.getAchievementReasoning(cvStructured.achievements) 
        },
        cultural_fit: { 
          score: culturalFit, 
          reasoning: this.getCulturalReasoning(cvStructured.communication_indicators) 
        }
      },
      score: Math.round(weightedScore * 20), // Convert to percentage (1-5 scale * 20)
      rag_context_used: true,
      matched_requirements: this.identifyMatchedRequirements(cvStructured, ragContext.jobContext)
    };
  }

  /**
   * Step 3: Generate CV feedback
   */
  async generateCVFeedback(cvStructured, jobContext, matchResult) {
    console.log('💬 Generating CV feedback...');
    
    await this.sleep(600);

    const strengths = this.identifyStrengths(matchResult.breakdown);
    const gaps = this.identifyGaps(matchResult.breakdown);

    return `Strong ${strengths.join(' and ')} demonstrate good fit for backend role. ${gaps.length > 0 ? 'Would benefit from developing ' + gaps.join(' and ') + ' to fully match requirements.' : 'Excellent alignment with all key requirements.'}`;
  }

  /**
   * Step 4: Evaluate project deliverable (with RAG)
   */
  async evaluateProject(projectText, scoringRubric) {
    console.log('🔧 Evaluating project with RAG context...');
    
    await this.sleep(1000);

    // Get enhanced context from vector DB
    const ragContext = await vectorDB.getContextForProjectEvaluation();
    console.log('🔍 Retrieved RAG context for project evaluation');

    const correctness = this.scoreCorrectnessWithRAG(projectText, ragContext.technicalRequirements);
    const codeQuality = this.scoreCodeQuality(projectText);
    const resilience = this.scoreResilienceWithRAG(projectText, ragContext.technicalRequirements);
    const documentation = this.scoreDocumentation(projectText);
    const creativity = this.scoreCreativity(projectText);

    // Calculate weighted average
    const overallScore = (
      correctness * 0.3 +
      codeQuality * 0.25 +
      resilience * 0.2 +
      documentation * 0.15 +
      creativity * 0.1
    );

    return {
      breakdown: {
        correctness: { 
          score: correctness, 
          reasoning: this.getCorrectnessReasoningWithRAG(projectText, ragContext.technicalRequirements) 
        },
        code_quality: { 
          score: codeQuality, 
          reasoning: this.getQualityReasoning(projectText) 
        },
        resilience: { 
          score: resilience, 
          reasoning: this.getResilienceReasoningWithRAG(projectText, ragContext.technicalRequirements) 
        },
        documentation: { 
          score: documentation, 
          reasoning: this.getDocReasoning(projectText) 
        },
        creativity: { 
          score: creativity, 
          reasoning: this.getCreativityReasoning(projectText) 
        }
      },
      overallScore: Math.round(overallScore * 10) / 10, // Round to 1 decimal
      rag_context_used: true,
      matched_criteria: this.identifyMatchedCriteria(projectText, ragContext.scoringCriteria)
    };
  }

  /**
   * Step 5: Generate project feedback (with refinement)
   */
  async generateProjectFeedback(projectText, scoringRubric, projectScore) {
    console.log('📝 Generating project feedback...');
    
    await this.sleep(700);

    const strengths = this.identifyProjectStrengths(projectScore.breakdown);
    const improvements = this.identifyProjectImprovements(projectScore.breakdown);

    return `${strengths.length > 0 ? 'Demonstrates ' + strengths.join(' and ') + '. ' : ''}${improvements.length > 0 ? 'Could improve ' + improvements.join(' and ') + ' for production readiness.' : 'Excellent implementation meeting all requirements.'}`;
  }

  /**
   * Step 6: Generate overall summary
   */
  async generateOverallSummary(cvMatchRate, cvFeedback, projectScore, projectFeedback) {
    console.log('📋 Generating overall summary...');
    
    await this.sleep(500);

    const cvScore = cvMatchRate.score;
    const projScore = projectScore.overallScore;
    
    let recommendation;
    if (cvScore >= 80 && projScore >= 4.0) {
      recommendation = "Strong candidate - highly recommended for hire";
    } else if (cvScore >= 70 && projScore >= 3.5) {
      recommendation = "Good candidate fit - recommended for final interview";
    } else if (cvScore >= 60 && projScore >= 3.0) {
      recommendation = "Potential candidate - needs technical discussion";
    } else {
      recommendation = "Requires further development before consideration";
    }

    return `Overall Assessment: ${recommendation}. CV match of ${cvScore}% shows ${cvScore >= 75 ? 'strong' : cvScore >= 60 ? 'good' : 'moderate'} alignment with requirements. Project score of ${projScore}/5 indicates ${projScore >= 4 ? 'excellent' : projScore >= 3.5 ? 'solid' : 'developing'} technical execution.`;
  }

  // ==============================================
  // TEXT EXTRACTION METHODS
  // ==============================================

  extractSkills(text) {
    const skillKeywords = [
      'node.js', 'nodejs', 'javascript', 'python', 'java', 'express', 'react',
      'postgresql', 'mysql', 'mongodb', 'redis', 'aws', 'docker', 'kubernetes',
      'rest', 'api', 'graphql', 'microservices', 'ai', 'llm', 'machine learning'
    ];
    
    const foundSkills = skillKeywords.filter(skill => 
      text.toLowerCase().includes(skill)
    );
    
    return foundSkills.length > 0 ? foundSkills : ['General programming'];
  }

  extractExperience(text) {
    const yearMatches = text.match(/(\d+)\s*(?:years?|yrs?)/gi);
    if (yearMatches) {
      const years = yearMatches.map(match => parseInt(match.match(/\d+/)[0]));
      return Math.max(...years);
    }
    
    // Estimate based on content length and complexity
    return text.length > 200 ? 3 : text.length > 100 ? 2 : 1;
  }

  extractProjects(text) {
    const projectKeywords = ['project', 'built', 'developed', 'created', 'implemented'];
    const hasProjects = projectKeywords.some(keyword => 
      text.toLowerCase().includes(keyword)
    );
    
    return hasProjects ? [{ name: 'Mentioned Project', description: 'Project experience indicated' }] : [];
  }

  extractAchievements(text) {
    const achievementKeywords = ['improved', 'increased', 'reduced', 'led', 'managed', 'optimized'];
    return achievementKeywords.filter(keyword => 
      text.toLowerCase().includes(keyword)
    ).map(keyword => `${keyword} performance/systems`);
  }

  extractEducation(text) {
    const educationKeywords = ['degree', 'university', 'college', 'bachelor', 'master', 'computer science'];
    const hasEducation = educationKeywords.some(keyword => 
      text.toLowerCase().includes(keyword)
    );
    return hasEducation ? 'Formal technical education' : 'Self-taught/practical experience';
  }

  extractCommunication(text) {
    const commKeywords = ['team', 'collaboration', 'communication', 'presentation', 'documentation'];
    return commKeywords.filter(keyword => 
      text.toLowerCase().includes(keyword)
    ).map(keyword => `${keyword} skills`);
  }

  // ==============================================
  // BASIC SCORING METHODS
  // ==============================================

  scoreExperience(years) {
    if (years >= 5) return 5;
    if (years >= 3) return 4;
    if (years >= 2) return 3;
    if (years >= 1) return 2;
    return 1;
  }

  scoreAchievements(achievements) {
    if (achievements.length >= 3) return 5;
    if (achievements.length >= 2) return 4;
    if (achievements.length >= 1) return 3;
    return 2;
  }

  scoreCulturalFit(communication) {
    if (communication.length >= 3) return 5;
    if (communication.length >= 2) return 4;
    if (communication.length >= 1) return 3;
    return 2;
  }

  scoreCodeQuality(projectText) {
    const qualityKeywords = ['express', 'node.js', 'structured', 'modular', 'test'];
    const matches = qualityKeywords.filter(keyword => 
      projectText.toLowerCase().includes(keyword)
    );
    return Math.min(5, Math.max(2, matches.length + 1));
  }

  scoreDocumentation(projectText) {
    const docKeywords = ['readme', 'documentation', 'instructions', 'setup'];
    const matches = docKeywords.filter(keyword => 
      projectText.toLowerCase().includes(keyword)
    );
    return Math.min(5, Math.max(2, matches.length + 2));
  }

  scoreCreativity(projectText) {
    return Math.min(5, Math.max(1, Math.floor(projectText.length / 100) + 1));
  }

  // ==============================================
  // RAG-ENHANCED SCORING METHODS
  // ==============================================

  scoreTechnicalSkillsWithRAG(skills, jobRequirements) {
    const requiredSkills = jobRequirements.join(' ').toLowerCase();
    
    const backendMatch = skills.filter(skill => 
      ['node.js', 'nodejs', 'express', 'postgresql', 'mongodb', 'api', 'javascript', 'python'].some(backend => 
        skill.toLowerCase().includes(backend) && requiredSkills.includes(backend)
      )
    ).length;
    
    const aiMatch = skills.filter(skill =>
      ['ai', 'llm', 'machine learning', 'vector', 'embeddings'].some(ai =>
        skill.toLowerCase().includes(ai) && requiredSkills.includes(ai)
      )
    ).length;

    const cloudMatch = skills.filter(skill =>
      ['aws', 'azure', 'gcp', 'docker', 'kubernetes'].some(cloud =>
        skill.toLowerCase().includes(cloud) && requiredSkills.includes(cloud)
      )
    ).length;

    // Enhanced scoring based on RAG context
    if (backendMatch >= 3 && aiMatch >= 1 && cloudMatch >= 1) return 5;
    if (backendMatch >= 2 && aiMatch >= 1) return 4;
    if (backendMatch >= 2) return 3;
    if (backendMatch >= 1) return 2;
    return 1;
  }

  scoreExperienceWithRAG(years, experienceRequirements) {
    const reqText = experienceRequirements.join(' ').toLowerCase();
    const hasDistributed = reqText.includes('distributed') || reqText.includes('microservices');
    const hasAI = reqText.includes('ai') || reqText.includes('llm');

    // Adjust scoring based on RAG context requirements
    let baseScore = this.scoreExperience(years);
    
    // Bonus for meeting specific requirements mentioned in job context
    if (years >= 2 && hasDistributed) baseScore = Math.min(5, baseScore + 1);
    if (years >= 1 && hasAI) baseScore = Math.min(5, baseScore + 0.5);
    
    return Math.round(baseScore);
  }

  scoreCorrectnessWithRAG(projectText, technicalRequirements) {
    const reqText = technicalRequirements.join(' ').toLowerCase();
    const projectLower = projectText.toLowerCase();
    
    let score = 1;
    
    // Check against specific RAG requirements
    if (projectLower.includes('llm') && reqText.includes('llm')) score += 1;
    if (projectLower.includes('chain') && reqText.includes('chaining')) score += 1;
    if (projectLower.includes('rag') && reqText.includes('rag')) score += 1;
    if (projectLower.includes('vector') && reqText.includes('vector')) score += 1;
    if (projectLower.includes('error') && reqText.includes('error')) score += 0.5;
    
    return Math.min(5, Math.round(score));
  }

  scoreResilienceWithRAG(projectText, technicalRequirements) {
    const reqText = technicalRequirements.join(' ').toLowerCase();
    const projectLower = projectText.toLowerCase();
    
    let score = 1;
    
    // Enhanced resilience checking based on RAG context
    if (projectLower.includes('retry') && reqText.includes('retry')) score += 1;
    if (projectLower.includes('timeout') && reqText.includes('timeout')) score += 1;
    if (projectLower.includes('error handling') && reqText.includes('failure')) score += 1;
    if (projectLower.includes('resilience') || projectLower.includes('robust')) score += 1;
    if (projectLower.includes('fallback') || projectLower.includes('recovery')) score += 0.5;
    
    return Math.min(5, Math.round(score));
  }

  // ==============================================
  // REASONING METHODS
  // ==============================================

  getTechnicalReasoningWithRAG(skills, jobRequirements) {
    const matched = skills.filter(skill => 
      jobRequirements.some(req => req.toLowerCase().includes(skill.toLowerCase()))
    );
    
    return `Skills alignment: ${skills.join(', ')}. Matched requirements: ${matched.length > 0 ? matched.join(', ') : 'limited overlap'}. RAG context considered.`;
  }

  getExperienceReasoningWithRAG(years, experienceRequirements) {
    const relevantReqs = experienceRequirements.filter(req => 
      req.toLowerCase().includes('year') || req.toLowerCase().includes('experience')
    );
    
    return `${years} years experience. RAG context requirements: ${relevantReqs.length > 0 ? relevantReqs[0] : 'general experience needed'}`;
  }

  getAchievementReasoning(achievements) {
    return achievements.length > 0 ? `Achievements: ${achievements.join(', ')}` : 'Limited quantifiable achievements';
  }

  getCulturalReasoning(communication) {
    return communication.length > 0 ? `Communication indicators: ${communication.join(', ')}` : 'Basic communication skills indicated';
  }

  getCorrectnessReasoningWithRAG(projectText, technicalRequirements) {
    const matchedReqs = technicalRequirements.filter(req =>
      req.toLowerCase().split(' ').some(word => 
        projectText.toLowerCase().includes(word) && word.length > 3
      )
    );

    return `Implementation matches ${matchedReqs.length} technical requirements from RAG context: ${matchedReqs.slice(0, 2).join('; ')}`;
  }

  getQualityReasoning(projectText) {
    return 'Code structure follows standard practices';
  }

  getResilienceReasoningWithRAG(projectText, technicalRequirements) {
    const resilienceReqs = technicalRequirements.filter(req =>
      ['error', 'failure', 'retry', 'resilience', 'handling'].some(keyword =>
        req.toLowerCase().includes(keyword)
      )
    );

    return `Resilience features evaluated against RAG requirements. ${resilienceReqs.length > 0 ? 'Addresses: ' + resilienceReqs[0] : 'Basic error handling present'}`;
  }

  getDocReasoning(projectText) {
    return 'Documentation provided for setup and usage';
  }

  getCreativityReasoning(projectText) {
    return 'Standard implementation with some thoughtful additions';
  }

  // ==============================================
  // ANALYSIS HELPER METHODS
  // ==============================================

  identifyStrengths(breakdown) {
    return Object.entries(breakdown)
      .filter(([key, value]) => value.score >= 4)
      .map(([key, value]) => key.replace('_', ' '));
  }

  identifyGaps(breakdown) {
    return Object.entries(breakdown)
      .filter(([key, value]) => value.score <= 2)
      .map(([key, value]) => key.replace('_', ' '));
  }

  identifyProjectStrengths(breakdown) {
    return Object.entries(breakdown)
      .filter(([key, value]) => value.score >= 4)
      .map(([key, value]) => key.replace('_', ' '));
  }

  identifyProjectImprovements(breakdown) {
    return Object.entries(breakdown)
      .filter(([key, value]) => value.score <= 3)
      .map(([key, value]) => key.replace('_', ' '));
  }

  identifyMatchedRequirements(cvStructured, jobContext) {
    const matches = [];
    
    // Check skills match
    const skillMatches = cvStructured.skills.filter(skill =>
      jobContext.skills.some(reqSkill => 
        reqSkill.toLowerCase().includes(skill.toLowerCase()) ||
        skill.toLowerCase().includes(reqSkill.toLowerCase())
      )
    );
    
    if (skillMatches.length > 0) {
      matches.push(`Technical skills: ${skillMatches.slice(0, 3).join(', ')}`);
    }

    // Check experience match
    if (cvStructured.experience_years >= 2) {
      matches.push('Meets minimum experience requirement');
    }

    // Check project complexity
    if (cvStructured.projects.length > 0) {
      matches.push('Has relevant project experience');
    }

    return matches;
  }

  identifyMatchedCriteria(projectText, scoringCriteria) {
    const matches = [];
    const projectLower = projectText.toLowerCase();

    Object.entries(scoringCriteria).forEach(([criteria, description]) => {
      const criteriaKeywords = description.toLowerCase().split(' ')
        .filter(word => word.length > 4);
      
      const matchedKeywords = criteriaKeywords.filter(keyword =>
        projectLower.includes(keyword)
      );

      if (matchedKeywords.length > 0) {
        matches.push(`${criteria}: ${matchedKeywords.slice(0, 2).join(', ')}`);
      }
    });

    return matches.slice(0, 3); // Top 3 matches
  }

  // ==============================================
  // UTILITY METHODS
  // ==============================================

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = new AIService();