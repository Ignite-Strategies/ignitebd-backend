import express from 'express';
import prisma from '../../db.js';

const router = express.Router();

/**
 * POST /api/owner/create
 * Upsert an Owner by firebaseId
 * 
 * Body: {
 *   firebaseId: string (required)
 *   name?: string
 *   email?: string
 *   photoURL?: string
 * }
 * 
 * If owner with firebaseId exists: updates and returns
 * If owner doesn't exist: creates new owner and returns
 */
router.post('/create', async (req, res) => {
  try {
    const { firebaseId, name, email, photoURL } = req.body;

    // Validate firebaseId is provided
    if (!firebaseId) {
      return res.status(400).json({ 
        error: 'firebaseId is required' 
      });
    }

    // Upsert owner: find by firebaseId, update if exists, create if not
    const owner = await prisma.owner.upsert({
      where: {
        firebaseId: firebaseId
      },
      update: {
        // Update fields if provided
        ...(name !== undefined && { name }),
        ...(email !== undefined && { email }),
        ...(photoURL !== undefined && { photoURL })
      },
      create: {
        firebaseId,
        name: name || null,
        email: email || null,
        photoURL: photoURL || null
      }
    });

    return res.status(200).json({
      success: true,
      owner
    });

  } catch (error) {
    console.error('Error creating/updating owner:', error);
    return res.status(500).json({ 
      error: 'Failed to create/update owner',
      message: error.message 
    });
  }
});

export default router;
