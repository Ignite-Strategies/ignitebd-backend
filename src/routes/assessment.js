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
      title: "Systematize Founder-Dependent Tasks",
      description: "Identify and delegate repetitive tasks to free up founder time for strategic growth.",
      category: "Human Capital",
      impact: "high"
    });
    recommendations.push({
      title: "Review Operational Spend for ROI",
      description: "Analyze current expenditures to ensure each dollar directly contributes to measurable outcomes.",
      category: "Cost Efficiency",
      impact: "medium"
    });
  } else if (roundedScore >= 50 && roundedScore < 75) {
    recommendations.push({
      title: "Targeted Investment in Growth Channels",
      description: "Allocate resources to high-potential business development activities to accelerate pipeline velocity.",
      category: "BD Momentum",
      impact: "high"
    });
    recommendations.push({
      title: "Enhance Team Autonomy & Training",
      description: "Empower your team with clear processes and continuous learning to foster self-driven execution.",
      category: "Human Capital",
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
