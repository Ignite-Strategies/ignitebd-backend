import { Router } from 'express';
import prisma from '../db.js';

const router = Router();

// Find or create admin user
router.post('/findOrCreate', async (req, res) => {
  try {
    const { firebaseId, email, firstName, lastName, photoURL } = req.body;

    if (!firebaseId || !email) {
      return res.status(400).json({ error: 'Firebase ID and email are required' });
    }

    // Try to find existing user
    let admin = await prisma.user.findUnique({
      where: { firebaseId }
    });

    if (admin) {
      console.log('✅ Found existing admin:', admin.id);
      return res.json(admin);
    }

    // Create new user
    admin = await prisma.user.create({
      data: {
        firebaseId,
        email,
        name: `${firstName} ${lastName}`.trim(),
        photoURL
      }
    });

    console.log('✅ Created new admin:', admin.id);
    res.json(admin);

  } catch (error) {
    console.error('❌ Admin user creation failed:', error);
    res.status(500).json({ error: 'Failed to create admin user' });
  }
});

// Get admin by ID
router.get('/:adminId', async (req, res) => {
  try {
    const { adminId } = req.params;

    const admin = await prisma.user.findUnique({
      where: { id: adminId },
      include: {
        companies: true
      }
    });

    if (!admin) {
      return res.status(404).json({ error: 'Admin not found' });
    }

    res.json(admin);
  } catch (error) {
    console.error('❌ Failed to fetch admin:', error);
    res.status(500).json({ error: 'Failed to fetch admin' });
  }
});

export default router;
