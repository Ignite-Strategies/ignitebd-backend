import { Router } from 'express';
import OpenAI from 'openai';
import prisma from '../db.js';

const router = Router();

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Generate assessment results with OpenAI
router.post('/analyze/:assessmentId', async (req, res) => {
  try {
    const { assessmentId } = req.params;
    
    // Get assessment data
    const assessment = await prisma.assessment.findUnique({
      where: { id: assessmentId }
    });

    if (!assessment) {
      return res.status(404).json({ error: 'Assessment not found' });
    }

    // Create OpenAI prompt
    const prompt = `
    Analyze this business assessment and provide insights:

    Company: ${assessment.company}
    Name: ${assessment.name}
    
    Assessment Responses:
    - Works too much on tasks: ${assessment.workTooMuch}
    - Adequately assigns to others: ${assessment.assignTasks}
    - Wants more clients: ${assessment.wantMoreClients}
    - Revenue growth target: ${assessment.revenueGrowthPercent}%
    - Total volume target: $${assessment.totalVolume}
    - Current BD spend: $${assessment.bdSpend}
    
    Current score: ${assessment.score}/100

    Please provide:
    1. A brief analysis of their current situation
    2. Key growth opportunities
    3. 3 specific recommendations
    4. A personalized message for their business

    Keep it professional but engaging, focused on growth and efficiency.
    `;

    // Generate analysis with OpenAI
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are a business growth consultant analyzing assessment data. Provide actionable insights and recommendations."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      max_tokens: 500
    });

    const analysis = completion.choices[0].message.content;

    res.json({
      success: true,
      assessment: assessment,
      analysis: analysis,
      score: assessment.score
    });

  } catch (error) {
    console.error('❌ Assessment analysis failed:', error);
    
    // Fallback analysis if OpenAI fails
    const assessment = await prisma.assessment.findUnique({
      where: { id: req.params.assessmentId }
    });

    if (!assessment) {
      return res.status(404).json({ error: 'Assessment not found' });
    }

    // Simple fallback analysis
    const fallbackAnalysis = `
    Based on your assessment, ${assessment.company} shows strong growth potential.

    Key Opportunities:
    - Optimize delegation processes to free up founder time
    - Scale business development efforts for client acquisition
    - Implement systems for sustainable growth

    Recommendations:
    1. Systematize routine tasks and delegate effectively
    2. Invest in proven business development strategies
    3. Build scalable processes for long-term growth

    Your score of ${assessment.score}/100 indicates significant opportunity for improvement and growth.
    `;

    res.json({
      success: true,
      assessment: assessment,
      analysis: fallbackAnalysis,
      score: assessment.score
    });
  }
});

export default router;
