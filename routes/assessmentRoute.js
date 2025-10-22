import { Router } from 'express';

const router = Router();

router.post('/coefficient', (req, res) => {
  const { costEfficiency, teamAlignment, bdVelocity } = req.body;

  // Basic validation
  if (typeof costEfficiency !== 'number' || typeof teamAlignment !== 'number' || typeof bdVelocity !== 'number') {
    return res.status(400).json({ message: 'Invalid input: all assessment values must be numbers.' });
  }

  // Compute Ignite Coefficient
  const weights = { costEfficiency: 0.3, teamAlignment: 0.4, bdVelocity: 0.3 };
  const score = (costEfficiency * weights.costEfficiency) +
                (teamAlignment * weights.teamAlignment) +
                (bdVelocity * weights.bdVelocity);

  const roundedScore = Math.round(score);

  // Generate recommendations based on score and individual dimensions
  const recommendations = [];

  if (roundedScore < 50) {
    recommendations.push({
      title: "Systematize Legal Practice Management",
      description: "Create standardized processes for case intake, client communication, and billing to multiply your time without multiplying your workload.",
      category: "Human Capital",
      impact: "high"
    });
    recommendations.push({
      title: "Optimize Marketing ROI for Law Firms",
      description: "Focus your marketing budget on high-converting channels like referral programs and content marketing that builds trust with potential clients.",
      category: "Cost Efficiency",
      impact: "medium"
    });
    recommendations.push({
      title: "Streamline Client Onboarding Process",
      description: "Reduce the time from initial consultation to signed retainer with automated intake forms and clear fee structures.",
      category: "BD Momentum",
      impact: "high"
    });
  } else if (roundedScore >= 50 && roundedScore < 75) {
    recommendations.push({
      title: "Expand High-Value Practice Areas",
      description: "Identify and develop expertise in practice areas with higher billing rates and recurring client needs to increase revenue per client.",
      category: "BD Momentum",
      impact: "high"
    });
    recommendations.push({
      title: "Implement Associate Training Programs",
      description: "Create structured training that enables associates to handle more complex matters independently, freeing you for business development.",
      category: "Human Capital",
      impact: "medium"
    });
    recommendations.push({
      title: "Invest in Client Retention Systems",
      description: "Build systematic follow-up processes and value-added services to increase client lifetime value and generate referrals.",
      category: "BD Momentum",
      impact: "medium"
    });
  } else { // score >= 75
    recommendations.push({
      title: "Explore New Market Opportunities",
      description: "Leverage your strong foundation to expand into new segments or service offerings.",
      category: "BD Momentum",
      impact: "high"
    });
    recommendations.push({
      title: "Refine Scalable Systems",
      description: "Continuously optimize your operational systems to support compounding growth without increasing drag.",
      category: "Cost Efficiency",
      impact: "medium"
    });
  }

  res.json({
    score: roundedScore,
    breakdown: { costEfficiency, teamAlignment, bdVelocity },
    insights: getResultText(roundedScore),
    recommendations
  });
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
