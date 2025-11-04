// Firebase Auth Route
// Handles Firebase authentication, user verification, and session management

import express from 'express';
import { verifyFirebaseToken } from '../../middleware/firebaseMiddleware.js';
import prisma from '../../db.js';

const router = express.Router();

/**
 * POST /auth/verify
 * Verify Firebase token and get/set user session
 * Headers: Authorization: Bearer <firebase-token>
 */
router.post('/verify', verifyFirebaseToken, async (req, res) => {
  try {
    const { uid, email, name, picture } = req.user;
    
    // Check if user exists in our database
    let user = await prisma.user.findUnique({
      where: { firebaseId: uid },
      include: {
        adminOf: true,
        staffOf: true
      }
    });

    // If user doesn't exist, create them
    if (!user) {
      user = await prisma.user.create({
        data: {
          firebaseId: uid,
          email: email,
          name: name || email.split('@')[0]
        },
        include: {
          adminOf: true,
          staffOf: true
        }
      });
    }

    // Update user info if it changed
    if (user.email !== email || user.name !== name) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          email: email,
          name: name || user.name
        },
        include: {
          adminOf: true,
          staffOf: true
        }
      });
    }

    // Set session
    req.session.userId = user.id;
    req.session.firebaseId = uid;
    req.session.email = email;

    // Get all companies user is associated with
    const allCompanies = [...user.adminOf, ...user.staffOf];

    res.json({
      success: true,
      user: {
        id: user.id,
        firebaseId: user.firebaseId,
        email: user.email,
        name: user.name,
        companies: allCompanies,
        adminOf: user.adminOf,
        staffOf: user.staffOf
      }
    });

  } catch (error) {
    console.error('❌ Auth verification failed:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
});

/**
 * GET /auth/me
 * Get current user info from session
 * Headers: Authorization: Bearer <firebase-token>
 */
router.get('/me', verifyFirebaseToken, async (req, res) => {
  try {
    const { uid } = req.user;
    
    const user = await prisma.user.findUnique({
      where: { firebaseId: uid },
      include: {
        adminOf: true,
        staffOf: true
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get all companies user is associated with
    const allCompanies = [...user.adminOf, ...user.staffOf];

    res.json({
      success: true,
      user: {
        id: user.id,
        firebaseId: user.firebaseId,
        email: user.email,
        name: user.name,
        companies: allCompanies,
        adminOf: user.adminOf,
        staffOf: user.staffOf
      }
    });

  } catch (error) {
    console.error('❌ Failed to get user info:', error);
    res.status(500).json({ error: 'Failed to get user info' });
  }
});

/**
 * POST /auth/signout
 * Sign out (clear session)
 * Headers: Authorization: Bearer <firebase-token>
 */
router.post('/signout', verifyFirebaseToken, async (req, res) => {
  try {
    // Clear session
    req.session = null;
    
    res.json({
      success: true,
      message: 'Signed out successfully'
    });

  } catch (error) {
    console.error('❌ Sign out failed:', error);
    res.status(500).json({ error: 'Sign out failed' });
  }
});

/**
 * GET /auth/companies
 * Get user's companies (both adminOf and staffOf)
 * Headers: Authorization: Bearer <firebase-token>
 */
router.get('/companies', verifyFirebaseToken, async (req, res) => {
  try {
    const { uid } = req.user;
    
    const user = await prisma.user.findUnique({
      where: { firebaseId: uid },
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
      return res.status(404).json({ error: 'User not found' });
    }

    // Combine all companies
    const allCompanies = [...user.adminOf, ...user.staffOf];

    res.json({
      success: true,
      companies: allCompanies,
      adminOf: user.adminOf,
      staffOf: user.staffOf
    });

  } catch (error) {
    console.error('❌ Failed to get user companies:', error);
    res.status(500).json({ error: 'Failed to get companies' });
  }
});

export default router;

