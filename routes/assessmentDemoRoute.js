import { Router } from 'express';
import assessmentDemoService from '../services/AssessmentDemoService.js';
// Force redeploy

const router = Router();

// Simple assessment demo - no auth required, just like TripWell
router.post('/generate', async (req, res) => {
  try {
    const { name, company, industry, workTooMuch, assignTasks, wantMoreClients, revenueGrowthPercent, totalVolume, bdSpend } = req.body;

    // Validate required fields
    if (!name || !company || !industry) {
      return res.status(400).json({ 
        error: "Missing required fields: name, company, industry" 
      });
    }

    console.log("🎯 Generating assessment demo for:", { name, company, industry });

    // Call simple demo service - no database saves, just OpenAI call
    const result = await assessmentDemoService({
      name,
      company,
      industry,
      workTooMuch: workTooMuch || 'sometimes',
      assignTasks: assignTasks || 'sometimes', 
      wantMoreClients: wantMoreClients || 'yes',
      revenueGrowthPercent: revenueGrowthPercent || 25,
      totalVolume: totalVolume || 500000,
      bdSpend: bdSpend || 10000
    });

    console.log("✅ Assessment demo generated successfully");

    res.json({ 
      success: true,
      assessmentDemo: result.assessmentDemo
    });

  } catch (error) {
    console.error("❌ Error in assessment demo generation:", error);
    res.status(500).json({ 
      success: false,
      error: "Failed to generate assessment demo" 
    });
  }
});

export default router;
