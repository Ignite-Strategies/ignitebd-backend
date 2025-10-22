import { Router } from 'express';
import AssessmentCalculationService from '../services/AssessmentCalculationService.js';

const router = Router();

router.post('/coefficient', async (req, res) => {
  try {
    console.log('🔥 Assessment coefficient request received:', req.body);
    
    // Call the AssessmentCalculationService with OpenAI integration
    const result = await AssessmentCalculationService.generateAssessmentInsights(req.body);
    
    if (result.success) {
      res.json({
        score: result.score,
        insights: result.insights
      });
    } else {
      console.error('❌ AssessmentCalculationService failed:', result.error);
      res.status(500).json({
        error: 'Assessment calculation failed',
        message: result.error
      });
    }
  } catch (error) {
    console.error('❌ Assessment route error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

// Helper function for result text
const getResultText = (score) => {
  if (score < 50) {
    return {
      title: "You're efficient, but stuck in Founder Mode.",
      message: "Time to delegate and systematize to unlock true scale. Your business has potential, but current structures limit its independent growth.",
      color: "red"
    };
  } else if (score >= 50 && score < 75) {
    return {
      title: "You're gaining momentum.",
      message: "With targeted investment and strategic adjustments, your growth can compound significantly. You're on the right track!",
      color: "yellow"
    };
  } else {
    return {
      title: "Your business is igniting!",
      message: "Keep balancing leverage with focus. You have a strong foundation for sustained, exponential growth.",
      color: "green"
    };
  }
};

export default router;
