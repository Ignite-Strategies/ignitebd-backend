// Company Route
// Handles company CRUD operations
// All operations require companyId and proper authorization

import express from 'express';
import { verifyFirebaseToken } from '../../middleware/authMiddleware.js';
import prisma from '../../db.js';

const router = express.Router();

/**
 * POST /company
 * Create new company
 * Body: { name: string, address?: string, annualRev?: number, adminId: string }
 * Headers: Authorization: Bearer <firebase-token>
 */
router.post('/', verifyFirebaseToken, async (req, res) => {
  try {
    const { uid } = req.user;
    const { name, address, annualRev, adminId } = req.body;

    if (!name || !adminId) {
      return res.status(400).json({ 
        error: 'Company name and adminId are required' 
      });
    }

    // Verify the adminId matches the authenticated user
    const user = await prisma.user.findUnique({
      where: { firebaseId: uid }
    });

    if (!user || user.id !== adminId) {
      return res.status(403).json({ 
        error: 'You can only create companies for yourself' 
      });
    }

    // Create company
    const company = await prisma.company.create({
      data: {
        name,
        address,
        annualRev,
        adminId
      },
      include: {
        admin: true,
        staff: true
      }
    });

    console.log('✅ Company created:', company.id);
    res.status(201).json({
      success: true,
      data: company
    });

  } catch (error) {
    console.error('❌ Company creation failed:', error);
    res.status(500).json({ error: 'Failed to create company' });
  }
});

/**
 * GET /company/:companyId
 * Get company by ID
 * Headers: Authorization: Bearer <firebase-token>
 */
router.get('/:companyId', verifyFirebaseToken, async (req, res) => {
  try {
    const { uid } = req.user;
    const { companyId } = req.params;

    // Verify user has access to this company
    const user = await prisma.user.findUnique({
      where: { firebaseId: uid }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if user is admin or staff of this company
    const company = await prisma.company.findFirst({
      where: {
        id: companyId,
        OR: [
          { adminId: user.id },
          { staff: { some: { id: user.id } } }
        ]
      },
      include: {
        admin: true,
        staff: true,
        customers: true,
        prospects: true,
        pipelineEntries: true
      }
    });

    if (!company) {
      return res.status(404).json({ error: 'Company not found or access denied' });
    }

    res.json({
      success: true,
      data: company
    });

  } catch (error) {
    console.error('❌ Failed to fetch company:', error);
    res.status(500).json({ error: 'Failed to fetch company' });
  }
});

/**
 * PUT /company/:companyId
 * Update company
 * Body: { name?: string, address?: string, annualRev?: number }
 * Headers: Authorization: Bearer <firebase-token>
 */
router.put('/:companyId', verifyFirebaseToken, async (req, res) => {
  try {
    const { uid } = req.user;
    const { companyId } = req.params;
    const { name, address, annualRev } = req.body;

    // Verify user has access to this company (must be admin)
    const user = await prisma.user.findUnique({
      where: { firebaseId: uid }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if user is admin of this company
    const existingCompany = await prisma.company.findFirst({
      where: {
        id: companyId,
        adminId: user.id
      }
    });

    if (!existingCompany) {
      return res.status(403).json({ 
        error: 'Only company admin can update company details' 
      });
    }

    // Update company
    const company = await prisma.company.update({
      where: { id: companyId },
      data: {
        name,
        address,
        annualRev
      },
      include: {
        admin: true,
        staff: true
      }
    });

    console.log('✅ Company updated:', company.id);
    res.json({
      success: true,
      data: company
    });

  } catch (error) {
    console.error('❌ Company update failed:', error);
    res.status(500).json({ error: 'Failed to update company' });
  }
});

/**
 * POST /company/:companyId/add-staff
 * Add staff member to company (admin only)
 * Body: { userId: string }
 * Headers: Authorization: Bearer <firebase-token>
 */
router.post('/:companyId/add-staff', verifyFirebaseToken, async (req, res) => {
  try {
    const { uid } = req.user;
    const { companyId } = req.params;
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    // Verify user is admin of this company
    const user = await prisma.user.findUnique({
      where: { firebaseId: uid }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const company = await prisma.company.findFirst({
      where: {
        id: companyId,
        adminId: user.id
      }
    });

    if (!company) {
      return res.status(403).json({ 
        error: 'Only company admin can add staff members' 
      });
    }

    // Verify the user to be added exists
    const staffUser = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!staffUser) {
      return res.status(404).json({ error: 'User to add not found' });
    }

    // Add staff to company
    const updatedCompany = await prisma.company.update({
      where: { id: companyId },
      data: {
        staff: {
          connect: { id: userId }
        }
      },
      include: {
        admin: true,
        staff: true
      }
    });

    console.log('✅ Staff added to company:', companyId);
    res.json({
      success: true,
      data: updatedCompany
    });

  } catch (error) {
    console.error('❌ Failed to add staff:', error);
    res.status(500).json({ error: 'Failed to add staff member' });
  }
});

/**
 * DELETE /company/:companyId/remove-staff/:userId
 * Remove staff member from company (admin only)
 * Headers: Authorization: Bearer <firebase-token>
 */
router.delete('/:companyId/remove-staff/:userId', verifyFirebaseToken, async (req, res) => {
  try {
    const { uid } = req.user;
    const { companyId, userId } = req.params;

    // Verify user is admin of this company
    const user = await prisma.user.findUnique({
      where: { firebaseId: uid }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const company = await prisma.company.findFirst({
      where: {
        id: companyId,
        adminId: user.id
      }
    });

    if (!company) {
      return res.status(403).json({ 
        error: 'Only company admin can remove staff members' 
      });
    }

    // Remove staff from company
    const updatedCompany = await prisma.company.update({
      where: { id: companyId },
      data: {
        staff: {
          disconnect: { id: userId }
        }
      },
      include: {
        admin: true,
        staff: true
      }
    });

    console.log('✅ Staff removed from company:', companyId);
    res.json({
      success: true,
      data: updatedCompany
    });

  } catch (error) {
    console.error('❌ Failed to remove staff:', error);
    res.status(500).json({ error: 'Failed to remove staff member' });
  }
});

export default router;

