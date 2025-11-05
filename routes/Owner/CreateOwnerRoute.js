import express from 'express';
import prisma from '../../db.js';

const router = express.Router();

/**
 * POST /api/owner/create
 * Upsert Owner by firebaseId
 * 
 * Body: {
 *   firebaseId: string (required)
 *   email?: string
 *   firstName?: string
 *   lastName?: string
 *   photoURL?: string
 * }
 */
router.post('/create', async (req, res) => {
  try {
    const { firebaseId, email, firstName, lastName, photoURL } = req.body;

    // Validate firebaseId is provided
    if (!firebaseId) {
      return res.status(400).json({ 
        success: false,
        error: 'firebaseId is required' 
      });
    }

    // Check if owner with firebaseId already exists
    let owner = await prisma.owner.findUnique({
      where: { firebaseId }
    });

    if (owner) {
      // Owner exists - return it
      console.log('✅ Found existing owner:', owner.id);
    } else {
      // Create new owner with firebaseId
      const name = firstName && lastName 
        ? `${firstName} ${lastName}`.trim()
        : firstName || email?.split('@')[0] || null;

      owner = await prisma.owner.create({
        data: {
          firebaseId,
          name: name || null,
          email: email || null,
          photoURL: photoURL || null
        }
      });
      console.log('✅ Created new owner:', owner.id);
    }

    return res.status(200).json({
      success: true,
      owner
    });

  } catch (error) {
    console.error('❌ OwnerCreate error:', error);
    return res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

export default router;
