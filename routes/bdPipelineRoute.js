import { Router } from 'express';
import prisma from '../db.js';

const router = Router();

// Get pipeline data for a company
router.get('/:companyId', async (req, res) => {
  try {
    const { companyId } = req.params;

    // Get all pipeline entries for the company
    const pipelineEntries = await prisma.bDPipelineEntry.findMany({
      where: { companyId },
      include: {
        client: true,
        prospect: true,
        assignedUser: true
      }
    });

    // Group by stage
    const stages = {
      'aware': { label: 'Aware', emoji: '👀', entries: [] },
      'interested': { label: 'Interested', emoji: '🤔', entries: [] },
      'qualified': { label: 'Qualified', emoji: '✅', entries: [] },
      'proposal': { label: 'Proposal', emoji: '📋', entries: [] },
      'negotiation': { label: 'Negotiation', emoji: '🤝', entries: [] },
      'closed_won': { label: 'Closed Won', emoji: '🎉', entries: [] },
      'closed_lost': { label: 'Closed Lost', emoji: '❌', entries: [] }
    };

    // Group entries by stage
    pipelineEntries.forEach(entry => {
      if (stages[entry.stage]) {
        stages[entry.stage].entries.push(entry);
      }
    });

    res.json({ stages, totalEntries: pipelineEntries.length });

  } catch (error) {
    console.error('❌ Failed to fetch pipeline data:', error);
    res.status(500).json({ error: 'Failed to fetch pipeline data' });
  }
});

// Create new pipeline entry
router.post('/', async (req, res) => {
  try {
    const { companyId, clientId, prospectId, stage, status, value, probability, notes, assignedTo } = req.body;

    if (!companyId || !stage) {
      return res.status(400).json({ error: 'Company ID and stage are required' });
    }

        // Validate that either clientId or prospectId is provided, but not both  
    if ((!clientId && !prospectId) || (clientId && prospectId)) {
      return res.status(400).json({ error: 'Either clientId or prospectId must be provided, but not both' });
    }

    const pipelineEntry = await prisma.bDPipelineEntry.create({
      data: {
        companyId,
        clientId,
        prospectId,
        stage,
        status: status || 'active',
        value,
        probability,
        notes,
        assignedTo
      },
      include: {
        client: true,
        prospect: true,
        assignedUser: true
      }
    });

    console.log('✅ Pipeline entry created:', pipelineEntry.id);
    res.json(pipelineEntry);

  } catch (error) {
    console.error('❌ Pipeline entry creation failed:', error);
    res.status(500).json({ error: 'Failed to create pipeline entry' });
  }
});

// Update pipeline entry
router.put('/:entryId', async (req, res) => {
  try {
    const { entryId } = req.params;
    const { stage, status, value, probability, notes, assignedTo } = req.body;

    const pipelineEntry = await prisma.bDPipelineEntry.update({
      where: { id: entryId },
      data: {
        stage,
        status,
        value,
        probability,
        notes,
        assignedTo
      },
      include: {
        client: true,
        prospect: true,
        assignedUser: true
      }
    });

    console.log('✅ Pipeline entry updated:', pipelineEntry.id);
    res.json(pipelineEntry);

  } catch (error) {
    console.error('❌ Pipeline entry update failed:', error);
    res.status(500).json({ error: 'Failed to update pipeline entry' });
  }
});

// Delete pipeline entry
router.delete('/:entryId', async (req, res) => {
  try {
    const { entryId } = req.params;

    await prisma.bDPipelineEntry.delete({
      where: { id: entryId }
    });

    console.log('✅ Pipeline entry deleted:', entryId);
    res.json({ message: 'Pipeline entry deleted successfully' });

  } catch (error) {
    console.error('❌ Pipeline entry deletion failed:', error);
    res.status(500).json({ error: 'Failed to delete pipeline entry' });
  }
});

// Move entry between stages (bulk update)
router.put('/move/:entryId', async (req, res) => {
  try {
    const { entryId } = req.params;
    const { newStage, newStatus } = req.body;

    if (!newStage) {
      return res.status(400).json({ error: 'New stage is required' });
    }

    const pipelineEntry = await prisma.bDPipelineEntry.update({
      where: { id: entryId },
      data: {
        stage: newStage,
        status: newStatus || 'active'
      },
      include: {
        client: true,
        prospect: true,
        assignedUser: true
      }
    });

    console.log('✅ Pipeline entry moved to stage:', newStage);
    res.json(pipelineEntry);

  } catch (error) {
    console.error('❌ Pipeline entry move failed:', error);
    res.status(500).json({ error: 'Failed to move pipeline entry' });
  }
});

export default router;
