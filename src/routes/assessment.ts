import { Router, Request, Response } from 'express';

const router = Router();

// Compute Ignite Coefficient for Joel's assessment
router.post('/coefficient', (req: Request, res: Response) => {
  const { costEfficiency, teamAlignment, bdVelocity } = req.body;

  // Validate inputs
  if (typeof costEfficiency !== 'number' || typeof teamAlignment !== 'number' || typeof bdVelocity !== 'number') {
    return res.status(400).json({ error: 'Missing or invalid assessment values' });
  }

  // Weighted calculation (same as frontend)
  const weights = { costEfficiency: 0.3, teamAlignment: 0.4, bdVelocity: 0.3 };
  const score = Math.round(
    (costEfficiency * weights.costEfficiency) + 
    (teamAlignment * weights.teamAlignment) + 
    (bdVelocity * weights.bdVelocity)
  );

  // Generate personalized insights for Joel/BusinessPoint Law
  const insights = generateInsights(score, { costEfficiency, teamAlignment, bdVelocity });
  
  res.json({
    score,
    breakdown: {
      costEfficiency,
      teamAlignment,
      bdVelocity
    },
    insights,
    recommendations: generateRecommendations(score, { costEfficiency, teamAlignment, bdVelocity })
  });
});

function generateInsights(score: number, breakdown: any) {
  if (score < 50) {
    return {
      title: "You're efficient, but stuck in Founder Mode",
      message: "Time to delegate and systematize. Your firm needs systems that work without you.",
      color: "red",
      priority: "high"
    };
  } else if (score < 75) {
    return {
      title: "You're gaining momentum",
      message: "With targeted investment, your growth can compound. Focus on the highest-leverage activities.",
      color: "yellow",
      priority: "medium"
    };
  } else {
    return {
      title: "Your business is igniting",
      message: "Keep balancing leverage with focus. You're on the path to true business freedom.",
      color: "green",
      priority: "low"
    };
  }
}

function generateRecommendations(score: number, breakdown: any) {
  const recommendations = [];
  
  // Cost efficiency recommendations
  if (breakdown.costEfficiency < 60) {
    recommendations.push({
      category: "Cost Efficiency",
      title: "Track Marketing ROI",
      description: "Implement client acquisition cost tracking to identify your most profitable marketing channels.",
      impact: "high"
    });
  }
  
  // Team alignment recommendations
  if (breakdown.teamAlignment < 70) {
    recommendations.push({
      category: "Team Alignment", 
      title: "Build Systems & Delegation",
      description: "Create standard operating procedures so your team can handle routine matters without your input.",
      impact: "high"
    });
  }
  
  // BD velocity recommendations
  if (breakdown.bdVelocity < 65) {
    recommendations.push({
      category: "Business Development",
      title: "Streamline Client Onboarding",
      description: "Reduce friction from initial contact to signed retainer with automated follow-up sequences.",
      impact: "medium"
    });
  }
  
  // General recommendations based on overall score
  if (score < 50) {
    recommendations.push({
      category: "Strategic",
      title: "Focus on One Growth Lever",
      description: "Pick either team building OR marketing optimization - don't try to fix everything at once.",
      impact: "high"
    });
  }
  
  return recommendations.slice(0, 3); // Return top 3
}

export default router;
