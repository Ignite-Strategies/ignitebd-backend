// User Hydrate Route (Pattern B)
// Find user's full account by Firebase ID (from verified token)
// Requires Firebase token verification middleware

import express from 'express';
import { verifyFirebaseToken } from '../../middleware/firebaseMiddleware.js';
import prisma from '../../db.js';

const router = express.Router();

/**
 * GET /api/user/hydrate
 * Find user's full account by Firebase ID (from verified token)
 * Requires Firebase token verification middleware
 * 
 * Headers: Authorization: Bearer <firebase-token>
 */
router.get('/hydrate', verifyFirebaseToken, async (req, res) => {
  try {
    // Get firebaseId from verified token (set by middleware)
    const firebaseId = req.user?.uid;
    
    if (!firebaseId) {
      return res.status(401).json({
        success: false,
        error: 'Firebase authentication required'
      });
    }
    
    console.log('🚀 USER HYDRATE: Finding user by Firebase ID:', firebaseId);
    
    // Find user by firebaseId with all relations
    const user = await prisma.user.findUnique({
      where: { firebaseId },
      include: {
        adminOf: {
          include: {
            admin: true,
            staff: true
          }
        },
        staffOf: {
          include: {
            admin: true,
            staff: true
          }
        }
      }
    });
    
    if (!user) {
      console.log('❌ USER HYDRATE: No user found for Firebase ID:', firebaseId);
      return res.status(404).json({
        success: false,
        error: 'User not found',
        message: 'No user found for this Firebase ID',
        code: 'USER_NOT_FOUND'
      });
    }
    
    console.log('✅ USER HYDRATE: Found user:', user.id, user.email);
    
    // Format hydrated user data
    const hydratedUser = {
      id: user.id,
      firebaseId: user.firebaseId,
      email: user.email,
      name: user.name,
      photoURL: user.photoURL,
      companies: [...user.adminOf, ...user.staffOf],
      adminOf: user.adminOf,
      staffOf: user.staffOf,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };
    
    res.json({
      success: true,
      message: 'User hydrated successfully',
      user: hydratedUser,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ USER HYDRATE: Error:', error);
    res.status(500).json({
      success: false,
      error: 'Database error',
      message: error.message
    });
  }
});

/**
 * GET /api/user/me
 * Alias for /hydrate - Get current user info
 * Headers: Authorization: Bearer <firebase-token>
 */
router.get('/me', verifyFirebaseToken, async (req, res) => {
  // Use same logic as hydrate
  const firebaseId = req.user?.uid;
  if (!firebaseId) {
    return res.status(401).json({ success: false, error: 'Firebase authentication required' });
  }
  
  const user = await prisma.user.findUnique({
    where: { firebaseId },
    include: {
      adminOf: { include: { admin: true, staff: true } },
      staffOf: { include: { admin: true, staff: true } }
    }
  });
  
  if (!user) {
    return res.status(404).json({ success: false, error: 'User not found' });
  }
  
  res.json({
    success: true,
    user: {
      id: user.id,
      firebaseId: user.firebaseId,
      email: user.email,
      name: user.name,
      photoURL: user.photoURL,
      companies: [...user.adminOf, ...user.staffOf],
      adminOf: user.adminOf,
      staffOf: user.staffOf
    }
  });
});

/**
 * GET /api/user/companies
 * Get user's companies (both adminOf and staffOf)
 * Headers: Authorization: Bearer <firebase-token>
 */
router.get('/companies', verifyFirebaseToken, async (req, res) => {
  try {
    const firebaseId = req.user?.uid;
    if (!firebaseId) {
      return res.status(401).json({ success: false, error: 'Firebase authentication required' });
    }
    
    const user = await prisma.user.findUnique({
      where: { firebaseId },
      include: {
        adminOf: { include: { admin: true, staff: true } },
        staffOf: { include: { admin: true, staff: true } }
      }
    });
    
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    
    res.json({
      success: true,
      companies: [...user.adminOf, ...user.staffOf],
      adminOf: user.adminOf,
      staffOf: user.staffOf
    });
  } catch (error) {
    console.error('❌ USER COMPANIES: Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;

