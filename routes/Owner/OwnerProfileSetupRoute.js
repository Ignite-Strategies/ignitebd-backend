import express from 'express';
import prisma from '../../db.js';

const router = express.Router();

/**
 * PUT /api/owner/:id/profile
 * Update owner profile with additional information
 * 
 * Body: {
 *   firstName?: string
 *   lastName?: string
 *   email?: string
 *   phone?: string
 *   role?: string
 *   goals?: string
 * }
 */
router.put('/:id/profile', async (req, res) => {
  try {
    const { id } = req.params;
    const { firstName, lastName, email, phone, role, goals } = req.body;

    // Build name from firstName/lastName if provided
    const name = firstName && lastName 
      ? `${firstName} ${lastName}`.trim()
      : undefined;

    // Update owner with profile data
    const owner = await prisma.owner.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(email !== undefined && { email }),
        // Note: phone, role, goals would need to be added to Owner model if needed
        // For now, just updating name and email
      }
    });

    console.log('✅ Owner profile updated:', owner.id);

    return res.json({
      success: true,
      owner
    });

  } catch (error) {
    console.error('❌ OwnerProfileSetup error:', error);
    return res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

export default router;

