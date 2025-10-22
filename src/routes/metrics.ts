import { Router, Request, Response } from 'express';

const router = Router();

// Helper to clamp values
const clamp = (val: number, min: number, max: number) => 
  Math.min(Math.max(val, min), max);

// Calculate Ignite Coefficient
router.post('/coefficient', (req: Request, res: Response) => {
  const { 
    revenue, 
    prevRevenue, 
    reinvestmentPct, 
    utilizationPct = 0.7 
  } = req.body;

  // Validate inputs
  if (typeof revenue !== 'number' || typeof prevRevenue !== 'number' || typeof reinvestmentPct !== 'number') {
    return res.status(400).json({ error: 'Missing or invalid required fields' });
  }

  // Calculate growth percentage
  const growthPct = (revenue - prevRevenue) / Math.max(prevRevenue, 1);
  
  // Calculate coefficient with clamping
  const coefficient = 
    clamp(growthPct, 0, 2) * 
    clamp(reinvestmentPct, 0, 1) * 
    clamp(utilizationPct, 0, 1);

  // Generate recommendations based on inputs
  const recommendations: string[] = [];
  
  if (reinvestmentPct < 0.15) {
    recommendations.push('💡 Increase reinvestment by +5% to accelerate pipeline growth');
  }
  
  if (utilizationPct < 0.8) {
    recommendations.push('⚡ Add contractor capacity or reduce cycle time to boost utilization');
  }
  
  if (growthPct < 0.1) {
    recommendations.push('🚀 Run a BD sprint: combine events + ads + referrals for momentum');
  }
  
  if (coefficient > 0.5) {
    recommendations.push('🔥 Strong activation momentum! Consider scaling winning channels');
  }
  
  if (recommendations.length === 0) {
    recommendations.push('📊 Solid fundamentals. Track weekly and adjust as needed');
  }

  res.json({
    growthPct: Math.round(growthPct * 1000) / 10, // as percentage with 1 decimal
    coefficient: Math.round(coefficient * 1000) / 1000, // 3 decimals
    reinvestmentPct: Math.round(reinvestmentPct * 1000) / 10,
    utilizationPct: Math.round(utilizationPct * 1000) / 10,
    recommendations: recommendations.slice(0, 3)
  });
});

export default router;

