import { Router } from 'express';

const router = Router();

// Calculate Ignite Coefficient
router.post('/coefficient', (req, res) => {
  const { revenue, prevRevenue, reinvestmentPct, utilizationPct = 0.7 } = req.body;
  
  // Validate inputs
  if (typeof revenue !== 'number' || typeof prevRevenue !== 'number' || typeof reinvestmentPct !== 'number') {
    return res.status(400).json({ message: 'Invalid input: revenue, prevRevenue, and reinvestmentPct must be numbers' });
  }
  
  // Calculate growth percentage
  const growthPct = prevRevenue > 0 ? (revenue - prevRevenue) / prevRevenue : 0;
  
  // Clamp values to reasonable ranges
  const clampedGrowth = Math.max(0, Math.min(2, growthPct)); // 0-200% growth
  const clampedReinvestment = Math.max(0, Math.min(1, reinvestmentPct)); // 0-100%
  const clampedUtilization = Math.max(0, Math.min(1, utilizationPct)); // 0-100%
  
  // Calculate coefficient
  const coefficient = clampedGrowth * clampedReinvestment * clampedUtilization;
  
  // Generate recommendations based on inputs
  const recommendations = [];
  
  if (reinvestmentPct < 0.15) {
    recommendations.push('Increase reinvestment by +5% to accelerate pipeline growth');
  }
  
  if (utilizationPct < 0.8) {
    recommendations.push('Add contractor capacity or reduce cycle time to improve utilization');
  }
  
  if (growthPct < 0.1) {
    recommendations.push('Run a BD sprint: focus on events, ads, and referrals to boost growth');
  }
  
  // Add general recommendations if none were generated
  if (recommendations.length === 0) {
    recommendations.push('Your metrics look strong! Consider scaling successful strategies');
    recommendations.push('Monitor these KPIs monthly to maintain momentum');
  }
  
  res.json({
    growthPct: Math.round(growthPct * 100) / 100,
    reinvestmentPct: Math.round(reinvestmentPct * 100) / 100,
    utilizationPct: Math.round(utilizationPct * 100) / 100,
    coefficient: Math.round(coefficient * 100) / 100,
    recommendations
  });
});

export default router;
