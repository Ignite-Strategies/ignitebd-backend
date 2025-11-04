// Company Route
// Handles company CRUD operations
// All operations require companyId and proper authorization

import express from 'express';
import { verifyFirebaseToken } from '../../middleware/firebaseMiddleware.js';
import prisma from '../../db.js';

const router = express.Router();

/**
 * POST /company
 * Create new company
 * Body: { name: string, address?: string, annualRev?: number, adminId?: string }
 * Headers: Authorization: Bearer <firebase-token>
 * 
 * Note: If adminId is not provided, the authenticated user becomes both owner and admin.
 * If adminId is provided, it must match the authenticated user (owner and admin are the same).
 * Later, admin can be delegated separately from owner.
 */
router.post('/', verifyFirebaseToken, async (req, res) => {
  try {
    const { uid } = req.user;
    const { name, address, annualRev, adminId } = req.body;

    if (!name) {
      return res.status(400).json({ 
        error: 'Company name is required' 
      });
    }

    // Get the authenticated user
    const user = await prisma.user.findUnique({
      where: { firebaseId: uid }
    });

    if (!user) {
      return res.status(404).json({ 
        error: 'User not found' 
      });
    }

    // If adminId is provided, verify it matches the authenticated user
    // Otherwise, use authenticated user as both owner and admin
    const finalAdminId = adminId || user.id;
    
    if (adminId && user.id !== adminId) {
      return res.status(403).json({ 
        error: 'You can only create companies where you are the admin' 
      });
    }

    // Create company - owner is always the authenticated user, admin can be delegated
    const company = await prisma.company.create({
      data: {
        name,
        address,
        annualRev,
        ownerId: user.id,  // Owner is always the creator
        adminId: finalAdminId  // Admin defaults to owner, but can be delegated later
      },
      include: {
        owner: true,
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

    // Check if user is owner, admin, or staff of this company
    const company = await prisma.company.findFirst({
      where: {
        id: companyId,
        OR: [
          { ownerId: user.id },
          { adminId: user.id },
          { staff: { some: { id: user.id } } }
        ]
      },
      include: {
        owner: true,
        admin: true,
        staff: true,
        clients: true,
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

    // Check if user is owner or admin of this company
    const existingCompany = await prisma.company.findFirst({
      where: {
        id: companyId,
        OR: [
          { ownerId: user.id },
          { adminId: user.id }
        ]
      }
    });

    if (!existingCompany) {
      return res.status(403).json({ 
        error: 'Only company owner or admin can update company details' 
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
        owner: true,
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

    // Verify user is owner or admin of this company
    const user = await prisma.user.findUnique({
      where: { firebaseId: uid }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const company = await prisma.company.findFirst({
      where: {
        id: companyId,
        OR: [
          { ownerId: user.id },
          { adminId: user.id }
        ]
      }
    });

    if (!company) {
      return res.status(403).json({ 
        error: 'Only company owner or admin can add staff members' 
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
        owner: true,
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

    // Verify user is owner or admin of this company
    const user = await prisma.user.findUnique({
      where: { firebaseId: uid }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const company = await prisma.company.findFirst({
      where: {
        id: companyId,
        OR: [
          { ownerId: user.id },
          { adminId: user.id }
        ]
      }
    });

    if (!company) {
      return res.status(403).json({ 
        error: 'Only company owner or admin can remove staff members' 
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
        owner: true,
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

/**
 * PUT /company/:companyId/delegate-admin
 * Delegate admin rights to another user (owner only)
 * Body: { adminId: string }
 * Headers: Authorization: Bearer <firebase-token>
 */
router.put('/:companyId/delegate-admin', verifyFirebaseToken, async (req, res) => {
  try {
    const { uid } = req.user;
    const { companyId } = req.params;
    const { adminId } = req.body;

    if (!adminId) {
      return res.status(400).json({ error: 'adminId is required' });
    }

    // Verify user is owner of this company (only owner can delegate admin)
    const user = await prisma.user.findUnique({
      where: { firebaseId: uid }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const company = await prisma.company.findFirst({
      where: {
        id: companyId,
        ownerId: user.id  // Only owner can delegate admin
      }
    });

    if (!company) {
      return res.status(403).json({ 
        error: 'Only company owner can delegate admin rights' 
      });
    }

    // Verify the new admin user exists
    const newAdmin = await prisma.user.findUnique({
      where: { id: adminId }
    });

    if (!newAdmin) {
      return res.status(404).json({ error: 'New admin user not found' });
    }

    // Update admin
    const updatedCompany = await prisma.company.update({
      where: { id: companyId },
      data: {
        adminId: adminId
      },
      include: {
        owner: true,
        admin: true,
        staff: true
      }
    });

    console.log('✅ Admin delegated for company:', companyId);
    res.json({
      success: true,
      data: updatedCompany
    });

  } catch (error) {
    console.error('❌ Failed to delegate admin:', error);
    res.status(500).json({ error: 'Failed to delegate admin rights' });
  }
});

export default router;

