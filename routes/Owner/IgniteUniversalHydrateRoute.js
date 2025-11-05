// Ignite Universal Hydrate Route
// Pattern B: Entity Hydration - Load full Owner data by Firebase ID from verified token
// Following FIREBASE-AUTH-AND-USER-MANAGEMENT.md pattern

import express from 'express';
import { verifyFirebaseToken } from '../../middleware/firebaseMiddleware.js';
import prisma from '../../db.js';

const router = express.Router();

/**
 * GET /api/owner/hydrate
 * Hydrate Owner's full account by Firebase ID (from verified token)
 * Requires Firebase token verification middleware
 * 
 * Headers: Authorization: Bearer <firebase-token>
 * 
 * Returns:
 * {
 *   success: true,
 *   owner: {
 *     id, firebaseId, name, email, photoURL,
 *     ownedCompanies: [CompanyHQ objects],
 *     managedCompanies: [CompanyHQ objects]
 *   }
 * }
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
    
    console.log('🚀 OWNER HYDRATE: Finding Owner by Firebase ID:', firebaseId);
    
    // Find Owner by firebaseId with all relations
    const owner = await prisma.owner.findUnique({
      where: { firebaseId },
      include: {
        ownedCompanies: {
          include: {
            owner: true,
            manager: true,
            contacts: {
              take: 5, // Limit for performance
              orderBy: { createdAt: 'desc' }
            },
            contactLists: {
              take: 5
            }
          }
        },
        managedCompanies: {
          include: {
            owner: true,
            manager: true
          }
        }
      }
    });
    
    if (!owner) {
      console.log('❌ OWNER HYDRATE: No Owner found for Firebase ID:', firebaseId);
      return res.status(404).json({
        success: false,
        error: 'Owner not found',
        message: 'No Owner found for this Firebase ID. Please sign up first.',
        code: 'OWNER_NOT_FOUND'
      });
    }
    
    console.log('✅ OWNER HYDRATE: Found Owner:', owner.id, owner.email);
    
    // Get primary CompanyHQ (first owned company, if exists)
    const primaryCompanyHQ = owner.ownedCompanies?.[0] || null;
    
    // Format hydrated Owner data
    const hydratedOwner = {
      id: owner.id,
      firebaseId: owner.firebaseId,
      name: owner.name,
      email: owner.email,
      photoURL: owner.photoURL,
      // profileCompleted removed - profile setup is optional, users can add more in Settings
      // Primary CompanyHQ (for easy access)
      companyHQId: primaryCompanyHQ?.id || null,
      companyHQ: primaryCompanyHQ || null,
      // All CompanyHQs
      ownedCompanies: owner.ownedCompanies || [],
      managedCompanies: owner.managedCompanies || [],
      createdAt: owner.createdAt,
      updatedAt: owner.updatedAt
    };
    
    res.json({
      success: true,
      message: 'Owner hydrated successfully',
      owner: hydratedOwner,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ OWNER HYDRATE: Error:', error);
    res.status(500).json({
      success: false,
      error: 'Database error',
      message: error.message
    });
  }
});

export default router;


