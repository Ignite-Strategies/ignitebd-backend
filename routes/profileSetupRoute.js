import { Router } from 'express';
import prisma from '../db.js';

const router = Router();

// Update admin profile
router.put('/:adminId', async (req, res) => {
  try {
    const { adminId } = req.params;
    const { firstName, lastName, email, phone, role, goals } = req.body;

    if (!adminId) {
      return res.status(400).json({ error: 'Admin ID is required' });
    }

    // Update admin profile
    const updatedAdmin = await prisma.user.update({
      where: { id: adminId },
      data: {
        name: `${firstName} ${lastName}`.trim(),
        email: email,
        phone: phone,
        role: role,
        goals: goals
      }
    });

    console.log('✅ Profile updated:', updatedAdmin.id);
    res.json(updatedAdmin);

  } catch (error) {
    console.error('❌ Profile update failed:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Get admin profile
router.get('/:adminId', async (req, res) => {
  try {
    const { adminId } = req.params;

    const admin = await prisma.user.findUnique({
      where: { id: adminId }
    });

    if (!admin) {
      return res.status(404).json({ error: 'Admin not found' });
    }

    res.json(admin);
  } catch (error) {
    console.error('❌ Failed to fetch profile:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

export default router;
