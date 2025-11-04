// User Create Route (Pattern A)
// Find or create user by Firebase ID
// Called after Firebase authentication - NO middleware required

import express from 'express';
import prisma from '../../db.js';

const router = express.Router();

/**
 * POST /api/user/create
 * Find or create user by Firebase ID
 * Called after Firebase authentication (frontend sends firebaseId + user data)
 * 
 * Body:
 * {
 *   firebaseId: "firebase-uid-here",
 *   email: "user@example.com",
 *   firstName: "John",
 *   lastName: "Doe",
 *   photoURL: "https://..."
 * }
 */
router.post('/create', async (req, res) => {
  try {
    const { firebaseId, email, firstName, lastName, photoURL } = req.body;
    
    if (!firebaseId || !email) {
      return res.status(400).json({ 
        success: false,
        error: 'firebaseId and email are required' 
      });
    }
    
    console.log('🔐 USER CREATE: FindOrCreate for firebaseId:', firebaseId);
    
    // 1. Find existing user by firebaseId first
    let user = await prisma.user.findUnique({
      where: { firebaseId },
      include: {
        adminOf: true,
        staffOf: true
      }
    });
    
    if (user) {
      console.log('✅ USER CREATE: Found existing user:', user.id);
      return res.json({
        success: true,
        user: {
          id: user.id,
          firebaseId: user.firebaseId,
          email: user.email,
          name: user.name,
          photoURL: user.photoURL,
          companies: [...user.adminOf, ...user.staffOf]
        }
      });
    }
    
    // 2. Find existing user by email (might have been pre-created)
    user = await prisma.user.findFirst({
      where: { email }
    });
    
    if (user) {
      console.log('✅ USER CREATE: Found user by email - linking firebaseId:', user.id);
      // Link firebaseId to existing user
      user = await prisma.user.update({
        where: { id: user.id },
        data: { firebaseId },
        include: {
          adminOf: true,
          staffOf: true
        }
      });
      
      return res.json({
        success: true,
        user: {
          id: user.id,
          firebaseId: user.firebaseId,
          email: user.email,
          name: user.name,
          photoURL: user.photoURL,
          companies: [...user.adminOf, ...user.staffOf]
        }
      });
    }
    
    // 3. Create new user
    console.log('📝 USER CREATE: Creating new user for:', email);
    
    user = await prisma.user.create({
      data: {
        firebaseId,
        email,
        name: firstName ? `${firstName} ${lastName || ''}`.trim() : email.split('@')[0],
        photoURL: photoURL || null
      },
      include: {
        adminOf: true,
        staffOf: true
      }
    });
    
    console.log('✅ USER CREATE: New user created:', user.id);
    
    res.status(201).json({
      success: true,
      user: {
        id: user.id,
        firebaseId: user.firebaseId,
        email: user.email,
        name: user.name,
        photoURL: user.photoURL,
        companies: []
      }
    });
    
  } catch (error) {
    console.error('❌ USER CREATE: Error:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

export default router;

