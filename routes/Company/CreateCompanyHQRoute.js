import express from 'express';
import prisma from '../../db.js';
import { verifyFirebaseToken } from '../../middleware/firebaseMiddleware.js';

const router = express.Router();

/**
 * POST /api/companyhq/create
 * Creates a new CompanyHQ (tenant container) for an Owner
 * 
 * Body:
 * - companyName (required)
 * - whatYouDo (optional)
 * - companyStreet (optional)
 * - companyCity (optional)
 * - companyState (optional)
 * - companyWebsite (optional)
 * - companyIndustry (optional)
 * - companyAnnualRev (optional, Float)
 * - yearsInBusiness (optional, Int)
 * - teamSize (optional, String)
 * - ownerId (required)
 * 
 * Returns:
 * - success: true
 * - companyHQ: CompanyHQ object
 */
router.post('/create', verifyFirebaseToken, async (req, res) => {
  try {
    const {
      companyName,
      whatYouDo,
      companyStreet,
      companyCity,
      companyState,
      companyWebsite,
      companyIndustry,
      companyAnnualRev,
      yearsInBusiness,
      teamSize,
      ownerId
    } = req.body;

    // Validate required fields
    if (!companyName) {
      return res.status(400).json({
        success: false,
        error: 'Company name is required'
      });
    }

    if (!ownerId) {
      return res.status(400).json({
        success: false,
        error: 'Owner ID is required'
      });
    }

    // Verify owner exists
    const owner = await prisma.owner.findUnique({
      where: { id: ownerId }
    });

    if (!owner) {
      return res.status(404).json({
        success: false,
        error: 'Owner not found'
      });
    }

    // Create CompanyHQ
    const companyHQ = await prisma.companyHQ.create({
      data: {
        companyName,
        whatYouDo: whatYouDo || null,
        companyStreet: companyStreet || null,
        companyCity: companyCity || null,
        companyState: companyState || null,
        companyWebsite: companyWebsite || null,
        companyIndustry: companyIndustry || null,
        companyAnnualRev: companyAnnualRev || null,  // Store as range string (e.g., "0-100k", "100k-500k")
        yearsInBusiness: yearsInBusiness || null,  // Store as range string (e.g., "0-1", "2-5")
        teamSize: teamSize || null,
        ownerId: ownerId
      },
      include: {
        owner: true,
        manager: true
      }
    });

    console.log('✅ CompanyHQ created:', companyHQ.id);

    return res.json({
      success: true,
      companyHQ
    });

  } catch (error) {
    console.error('❌ CreateCompanyHQ error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to create company',
      details: error.message
    });
  }
});

export default router;

