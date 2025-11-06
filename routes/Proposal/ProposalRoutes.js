import express from 'express';
import prisma from '../../db.js';
import { verifyFirebaseToken } from '../../middleware/firebaseMiddleware.js';

const router = express.Router();

/**
 * POST /api/proposals
 * Creates a new proposal
 * 
 * Body:
 * - companyHQId (required) - Multi-tenancy scope
 * - clientName (required)
 * - clientCompany (required)
 * - companyId (optional) - Link to Company model
 * - purpose (optional)
 * - status (optional, default: "draft")
 * - serviceInstances (optional, JSON array)
 * - phases (optional, JSON array)
 * - totalPrice (optional, calculated from serviceInstances if not provided)
 * 
 * Returns:
 * - success: true
 * - proposal: Proposal object
 */
router.post('/', verifyFirebaseToken, async (req, res) => {
  try {
    const {
      companyHQId,
      clientName,
      clientCompany,
      companyId,
      purpose,
      status = 'draft',
      serviceInstances,
      phases,
      milestones,
      compensation,
      totalPrice,
      preparedBy
    } = req.body;

    // Validate required fields
    if (!companyHQId) {
      return res.status(400).json({
        success: false,
        error: 'CompanyHQId is required'
      });
    }

    if (!clientName || !clientCompany) {
      return res.status(400).json({
        success: false,
        error: 'Client name and company are required'
      });
    }

    // Verify CompanyHQ exists
    const companyHQ = await prisma.companyHQ.findUnique({
      where: { id: companyHQId }
    });

    if (!companyHQ) {
      return res.status(404).json({
        success: false,
        error: 'CompanyHQ not found'
      });
    }

    // Calculate totalPrice from serviceInstances or compensation if not provided
    let calculatedPrice = totalPrice;
    if (!calculatedPrice && compensation && compensation.total) {
      calculatedPrice = compensation.total;
    } else if (!calculatedPrice && serviceInstances && Array.isArray(serviceInstances)) {
      calculatedPrice = serviceInstances.reduce((sum, service) => {
        return sum + (service.price || 0);
      }, 0);
    }

    // Create proposal
    const proposal = await prisma.proposal.create({
      data: {
        companyHQId,
        clientName,
        clientCompany,
        companyId: companyId || null,
        purpose: purpose || null,
        status,
        serviceInstances: serviceInstances ? JSON.parse(JSON.stringify(serviceInstances)) : null,
        phases: phases ? JSON.parse(JSON.stringify(phases)) : null,
        milestones: milestones ? JSON.parse(JSON.stringify(milestones)) : null,
        compensation: compensation ? JSON.parse(JSON.stringify(compensation)) : null,
        totalPrice: calculatedPrice || null,
        preparedBy: preparedBy || null,
        dateIssued: new Date()
      },
      include: {
        companyHQ: true,
        company: true
      }
    });

    // If companyId is provided, update Company.proposalId to link the proposal
    if (companyId) {
      await prisma.company.update({
        where: { id: companyId },
        data: { proposalId: proposal.id }
      });
    }

    console.log('✅ Proposal created:', proposal.id);

    return res.json({
      success: true,
      proposal
    });

  } catch (error) {
    console.error('❌ CreateProposal error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to create proposal',
      details: error.message
    });
  }
});

/**
 * GET /api/proposals?companyHQId=xxx
 * Lists all proposals for a CompanyHQ (multi-tenancy)
 * 
 * Query params:
 * - companyHQId (required) - Filter by CompanyHQ
 * - status (optional) - Filter by status
 * 
 * Returns:
 * - success: true
 * - proposals: Array of Proposal objects
 */
router.get('/', verifyFirebaseToken, async (req, res) => {
  try {
    const { companyHQId, status } = req.query;

    if (!companyHQId) {
      return res.status(400).json({
        success: false,
        error: 'CompanyHQId is required'
      });
    }

    // Build where clause
    const where = {
      companyHQId
    };

    if (status) {
      where.status = status;
    }

    const proposals = await prisma.proposal.findMany({
      where,
      include: {
        companyHQ: true,
        company: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return res.json({
      success: true,
      proposals
    });

  } catch (error) {
    console.error('❌ ListProposals error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to list proposals',
      details: error.message
    });
  }
});

/**
 * GET /api/proposals/:proposalId
 * Gets a single proposal by ID
 * 
 * Returns:
 * - success: true
 * - proposal: Proposal object
 */
router.get('/:proposalId', verifyFirebaseToken, async (req, res) => {
  try {
    const { proposalId } = req.params;

    const proposal = await prisma.proposal.findUnique({
      where: { id: proposalId },
      include: {
        companyHQ: true,
        company: true
      }
    });

    if (!proposal) {
      return res.status(404).json({
        success: false,
        error: 'Proposal not found'
      });
    }

    return res.json({
      success: true,
      proposal
    });

  } catch (error) {
    console.error('❌ GetProposal error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get proposal',
      details: error.message
    });
  }
});

/**
 * PUT /api/proposals/:proposalId
 * Updates a proposal
 * 
 * Body:
 * - clientName (optional)
 * - clientCompany (optional)
 * - companyId (optional)
 * - purpose (optional)
 * - status (optional)
 * - serviceInstances (optional)
 * - phases (optional)
 * - totalPrice (optional)
 * 
 * Returns:
 * - success: true
 * - proposal: Updated Proposal object
 */
router.put('/:proposalId', verifyFirebaseToken, async (req, res) => {
  try {
    const { proposalId } = req.params;
    const {
      clientName,
      clientCompany,
      companyId,
      purpose,
      status,
      serviceInstances,
      phases,
      milestones,
      compensation,
      totalPrice,
      preparedBy
    } = req.body;

    // Check if proposal exists
    const existingProposal = await prisma.proposal.findUnique({
      where: { id: proposalId }
    });

    if (!existingProposal) {
      return res.status(404).json({
        success: false,
        error: 'Proposal not found'
      });
    }

    // Build update data
    const updateData = {};
    if (clientName !== undefined) updateData.clientName = clientName;
    if (clientCompany !== undefined) updateData.clientCompany = clientCompany;
    if (companyId !== undefined) updateData.companyId = companyId || null;
    if (purpose !== undefined) updateData.purpose = purpose || null;
    if (status !== undefined) updateData.status = status;
    if (serviceInstances !== undefined) {
      updateData.serviceInstances = serviceInstances ? JSON.parse(JSON.stringify(serviceInstances)) : null;
    }
    if (phases !== undefined) {
      updateData.phases = phases ? JSON.parse(JSON.stringify(phases)) : null;
    }
    if (milestones !== undefined) {
      updateData.milestones = milestones ? JSON.parse(JSON.stringify(milestones)) : null;
    }
    if (compensation !== undefined) {
      updateData.compensation = compensation ? JSON.parse(JSON.stringify(compensation)) : null;
    }
    if (preparedBy !== undefined) {
      updateData.preparedBy = preparedBy || null;
    }

    // Calculate totalPrice if serviceInstances or compensation changed
    if (compensation !== undefined && compensation && compensation.total) {
      updateData.totalPrice = compensation.total;
    } else if (serviceInstances !== undefined && Array.isArray(serviceInstances)) {
      updateData.totalPrice = serviceInstances.reduce((sum, service) => {
        return sum + (service.price || 0);
      }, 0);
    } else if (totalPrice !== undefined) {
      updateData.totalPrice = totalPrice;
    }

    // Update proposal
    const proposal = await prisma.proposal.update({
      where: { id: proposalId },
      data: updateData,
      include: {
        companyHQ: true,
        company: true
      }
    });

    // Update Company.proposalId if companyId changed
    if (companyId !== undefined && companyId) {
      await prisma.company.update({
        where: { id: companyId },
        data: { proposalId: proposal.id }
      });
    }

    console.log('✅ Proposal updated:', proposal.id);

    return res.json({
      success: true,
      proposal
    });

  } catch (error) {
    console.error('❌ UpdateProposal error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to update proposal',
      details: error.message
    });
  }
});

/**
 * DELETE /api/proposals/:proposalId
 * Deletes a proposal
 * 
 * Returns:
 * - success: true
 * - message: "Proposal deleted"
 */
router.delete('/:proposalId', verifyFirebaseToken, async (req, res) => {
  try {
    const { proposalId } = req.params;

    // Check if proposal exists
    const proposal = await prisma.proposal.findUnique({
      where: { id: proposalId }
    });

    if (!proposal) {
      return res.status(404).json({
        success: false,
        error: 'Proposal not found'
      });
    }

    // If proposal is linked to a company, remove the proposalId reference
    if (proposal.companyId) {
      await prisma.company.update({
        where: { id: proposal.companyId },
        data: { proposalId: null }
      });
    }

    // Delete proposal
    await prisma.proposal.delete({
      where: { id: proposalId }
    });

    console.log('✅ Proposal deleted:', proposalId);

    return res.json({
      success: true,
      message: 'Proposal deleted'
    });

  } catch (error) {
    console.error('❌ DeleteProposal error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to delete proposal',
      details: error.message
    });
  }
});

export default router;

