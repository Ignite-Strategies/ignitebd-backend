import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import AssessmentCalculationService from '../services/AssessmentCalculationService.js';

const router = Router();
const prisma = new PrismaClient();

// Save initial assessment data (without contact info)
router.post('/save-assessment', async (req, res) => {
  try {
    console.log('🔥 Platform prospect save assessment request:', req.body);
    
    const {
      industry,
      workTooMuch,
      assignTasks,
      wantMoreClients,
      revenueGrowthPercent,
      totalVolume,
      bdSpend
    } = req.body;

    // Save to database without contact info
    const platformProspect = await prisma.platformProspect.create({
      data: {
        name: '', // Will be filled later
        email: '', // Will be filled later
        company: '', // Will be filled later
        industry,
        workTooMuch,
        assignTasks,
        wantMoreClients,
        revenueGrowthPercent: parseInt(revenueGrowthPercent),
        totalVolume: parseFloat(totalVolume),
        bdSpend: parseFloat(bdSpend),
        score: 0, // Will be calculated later
        insights: '', // Will be calculated later
        leadStatus: 'new'
      }
    });

    console.log('✅ Platform prospect assessment saved:', platformProspect.id);

    res.json({
      success: true,
      id: platformProspect.id
    });

  } catch (error) {
    console.error('❌ Platform prospect save assessment error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

// Complete assessment with contact info and compute results
router.post('/complete-assessment', async (req, res) => {
  try {
    console.log('🔥 Platform prospect complete assessment request:', req.body);
    
    const {
      assessmentId,
      name,
      email,
      company
    } = req.body;

    // Get the existing assessment data
    const existingProspect = await prisma.platformProspect.findUnique({
      where: { id: assessmentId }
    });

    if (!existingProspect) {
      return res.status(404).json({
        error: 'Assessment not found'
      });
    }

    // Build assessment data for computation
    const assessmentData = {
      name,
      company,
      industry: existingProspect.industry,
      workTooMuch: existingProspect.workTooMuch,
      assignTasks: existingProspect.assignTasks,
      wantMoreClients: existingProspect.wantMoreClients,
      revenueGrowthPercent: existingProspect.revenueGrowthPercent,
      totalVolume: existingProspect.totalVolume,
      bdSpend: existingProspect.bdSpend
    };

    // Generate assessment insights
    const result = await AssessmentCalculationService.generateAssessmentInsights(assessmentData);
    
    if (!result.success) {
      return res.status(500).json({
        error: 'Assessment calculation failed',
        message: result.error
      });
    }

    // Update the prospect with contact info and results
    const updatedProspect = await prisma.platformProspect.update({
      where: { id: assessmentId },
      data: {
        name,
        email,
        company,
        score: result.score,
        insights: JSON.stringify(result.insights)
      }
    });

    console.log('✅ Platform prospect completed:', updatedProspect.id);

    res.json({
      success: true,
      id: updatedProspect.id,
      score: result.score,
      insights: result.insights
    });

  } catch (error) {
    console.error('❌ Platform prospect complete assessment error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

// Get platform prospect by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const platformProspect = await prisma.platformProspect.findUnique({
      where: { id }
    });

    if (!platformProspect) {
      return res.status(404).json({
        error: 'Platform prospect not found'
      });
    }

    res.json({
      success: true,
      prospect: platformProspect
    });

  } catch (error) {
    console.error('❌ Platform prospect get error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

export default router;
