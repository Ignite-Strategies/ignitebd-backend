import { Router } from 'express';
import { verifyFirebaseToken, getUserByUID, createCustomToken } from './authMiddleware.js';
import prisma from '../db.js';

const router = Router();

// Verify Firebase token and get/set user session
router.post('/verify', verifyFirebaseToken, async (req, res) => {
  try {
    const { uid, email, name, picture } = req.user;
    
    // Check if user exists in our database
    let user = await prisma.user.findUnique({
      where: { firebaseId: uid },
      include: {
        companies: true,
        company: true
      }
    });

    // If user doesn't exist, create them
    if (!user) {
      user = await prisma.user.create({
        data: {
          firebaseId: uid,
          email: email,
          name: name || email.split('@')[0],
          photoURL: picture
        },
        include: {
          companies: true,
          company: true
        }
      });
    }

    // Update user info if it changed
    if (user.email !== email || user.name !== name || user.photoURL !== picture) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          email: email,
          name: name || user.name,
          photoURL: picture || user.photoURL
        },
        include: {
          companies: true,
          company: true
        }
      });
    }

    // Set session
    req.session.userId = user.id;
    req.session.firebaseId = uid;
    req.session.email = email;

    res.json({
      success: true,
      user: {
        id: user.id,
        firebaseId: user.firebaseId,
        email: user.email,
        name: user.name,
        photoURL: user.photoURL,
        companies: user.companies,
        primaryCompany: user.company
      }
    });

  } catch (error) {
    console.error('❌ Auth verification failed:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
});

// Get current user info
router.get('/me', verifyFirebaseToken, async (req, res) => {
  try {
    const { uid } = req.user;
    
    const user = await prisma.user.findUnique({
      where: { firebaseId: uid },
      include: {
        companies: true,
        company: true
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      success: true,
      user: {
        id: user.id,
        firebaseId: user.firebaseId,
        email: user.email,
        name: user.name,
        photoURL: user.photoURL,
        companies: user.companies,
        primaryCompany: user.company
      }
    });

  } catch (error) {
    console.error('❌ Failed to get user info:', error);
    res.status(500).json({ error: 'Failed to get user info' });
  }
});

// Refresh token (if needed)
router.post('/refresh', verifyFirebaseToken, async (req, res) => {
  try {
    const { uid } = req.user;
    
    // Create a new custom token if needed
    const customToken = await createCustomToken(uid);
    
    res.json({
      success: true,
      customToken
    });

  } catch (error) {
    console.error('❌ Token refresh failed:', error);
    res.status(500).json({ error: 'Token refresh failed' });
  }
});

// Sign out (clear session)
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

// Get user's companies
router.get('/companies', verifyFirebaseToken, async (req, res) => {
  try {
    const { uid } = req.user;
    
    const user = await prisma.user.findUnique({
      where: { firebaseId: uid },
      include: {
        companies: {
          include: {
            admin: true,
            members: true
          }
        }
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      success: true,
      companies: user.companies
    });

  } catch (error) {
    console.error('❌ Failed to get user companies:', error);
    res.status(500).json({ error: 'Failed to get companies' });
  }
});

// Set primary company
router.post('/set-primary-company/:companyId', verifyFirebaseToken, async (req, res) => {
  try {
    const { uid } = req.user;
    const { companyId } = req.params;
    
    const user = await prisma.user.findUnique({
      where: { firebaseId: uid }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Verify user has access to this company
    const company = await prisma.company.findFirst({
      where: {
        id: companyId,
        OR: [
          { adminId: user.id },
          { members: { some: { id: user.id } } }
        ]
      }
    });

    if (!company) {
      return res.status(403).json({ error: 'Access denied to this company' });
    }

    // Update user's primary company
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: { containerId: companyId },
      include: {
        companies: true,
        company: true
      }
    });

    res.json({
      success: true,
      user: {
        id: updatedUser.id,
        firebaseId: updatedUser.firebaseId,
        email: updatedUser.email,
        name: updatedUser.name,
        photoURL: updatedUser.photoURL,
        companies: updatedUser.companies,
        primaryCompany: updatedUser.company
      }
    });

  } catch (error) {
    console.error('❌ Failed to set primary company:', error);
    res.status(500).json({ error: 'Failed to set primary company' });
  }
});

export default router;
