import { Router } from 'express';
import prisma from '../db.js';

const router = Router();

// Save assessment submission
router.post('/submit', async (req, res) => {
  try {
    const { 
      name, 
      company, 
      workTooMuch, 
      assignTasks, 
      wantMoreClients, 
      revenueGrowthPercent, 
      totalVolume, 
      bdSpend,
      score,
      insights
    } = req.body;

    if (!name || !company || !workTooMuch || !assignTasks || !wantMoreClients) {
      return res.status(400).json({ error: 'Name, company, and all assessment questions are required' });
    }

    // Create assessment record
    const assessment = await prisma.assessment.create({
      data: {
        name,
        company,
        workTooMuch,
        assignTasks,
        wantMoreClients,
        revenueGrowthPercent: revenueGrowthPercent ? parseInt(revenueGrowthPercent) : null,
        totalVolume: totalVolume ? parseFloat(totalVolume) : null,
        bdSpend: bdSpend ? parseFloat(bdSpend) : null,
        score: score || 0,
        insights: insights ? JSON.stringify(insights) : null
      }
    });

    console.log('✅ Assessment submitted:', assessment.id);
    res.json({ 
      success: true, 
      assessmentId: assessment.id,
      message: 'Assessment submitted successfully' 
    });

  } catch (error) {
    console.error('❌ Assessment submission failed:', error);
    res.status(500).json({ error: 'Failed to submit assessment' });
  }
});

// Get all assessments (for admin/reporting)
router.get('/', async (req, res) => {
  try {
    const assessments = await prisma.assessment.findMany({
      orderBy: { createdAt: 'desc' }
    });

    res.json(assessments);
  } catch (error) {
    console.error('❌ Failed to fetch assessments:', error);
    res.status(500).json({ error: 'Failed to fetch assessments' });
  }
});

// Get assessment by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const assessment = await prisma.assessment.findUnique({
      where: { id }
    });

    if (!assessment) {
      return res.status(404).json({ error: 'Assessment not found' });
    }

    res.json(assessment);
  } catch (error) {
    console.error('❌ Failed to fetch assessment:', error);
    res.status(500).json({ error: 'Failed to fetch assessment' });
  }
});

export default router;
