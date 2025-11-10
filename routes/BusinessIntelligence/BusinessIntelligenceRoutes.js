import express from 'express';
import prisma from '../../db.js';
import { verifyFirebaseToken } from '../../middleware/firebaseMiddleware.js';
import {
  calculateFitScore,
  findMatchingPersona,
} from '../../services/BusinessIntelligenceScoringService.js';

const router = express.Router();

/**
 * POST /api/business-intelligence/fit-score
 * Calculate fit score between a contact and a product (offer)
 * 
 * Body:
 * - contactId (required) - Contact ID
 * - productId (required) - Product ID (the offer)
 * - personaId (optional) - Persona ID (if not provided, will try to find best match)
 * 
 * Returns:
 * - success: true
 * - scores: { pointOfNeed, painAlignment, willingnessToPay, impactPotential, contextFit, totalScore }
 * - summary: Text summary of the fit
 * - personaId: Persona ID used (if any)
 */
router.post('/fit-score', verifyFirebaseToken, async (req, res) => {
  try {
    const { contactId, productId, personaId } = req.body;

    // Validate required fields
    if (!contactId) {
      return res.status(400).json({
        success: false,
        error: 'contactId is required',
      });
    }

    if (!productId) {
      return res.status(400).json({
        success: false,
        error: 'productId is required',
      });
    }

    // Verify contact exists and belongs to user's tenant
    const contact = await prisma.contact.findUnique({
      where: { id: contactId },
      select: { crmId: true },
    });

    if (!contact) {
      return res.status(404).json({
        success: false,
        error: 'Contact not found',
      });
    }

    // Verify product exists and belongs to user's tenant
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { companyHQId: true },
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'Product not found',
      });
    }

    // Ensure contact and product belong to same tenant
    if (contact.crmId !== product.companyHQId) {
      return res.status(403).json({
        success: false,
        error: 'Contact and Product must belong to the same tenant',
      });
    }

    // If personaId not provided, try to find best match
    let finalPersonaId = personaId;
    if (!finalPersonaId) {
      finalPersonaId = await findMatchingPersona(contactId, contact.crmId);
      if (finalPersonaId) {
        console.log(
          `✅ Auto-matched persona ${finalPersonaId} for contact ${contactId}`,
        );
      }
    } else {
      // Verify persona exists and belongs to same tenant
      const persona = await prisma.persona.findUnique({
        where: { id: finalPersonaId },
        select: { companyHQId: true },
      });

      if (!persona) {
        return res.status(404).json({
          success: false,
          error: 'Persona not found',
        });
      }

      if (persona.companyHQId !== contact.crmId) {
        return res.status(403).json({
          success: false,
          error: 'Persona must belong to the same tenant',
        });
      }
    }

    // Calculate fit score
    const result = await calculateFitScore(
      contactId,
      productId,
      finalPersonaId,
    );

    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: result.error || 'Failed to calculate fit score',
      });
    }

    return res.json({
      success: true,
      contactId,
      productId,
      personaId: finalPersonaId,
      scores: result.scores,
      summary: result.summary,
    });
  } catch (error) {
    console.error('❌ Fit score calculation error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to calculate fit score',
      details: error.message,
    });
  }
});

/**
 * GET /api/business-intelligence/fit-score
 * Calculate fit score for a contact-product pair
 * 
 * Query params:
 * - contactId (required)
 * - productId (required)
 * 
 * Note: This endpoint calculates on demand (calls OpenAI)
 * Uses verifyFirebaseToken since it performs computation (not just reading data)
 */
router.get('/fit-score', verifyFirebaseToken, async (req, res) => {
  try {
    const { contactId, productId } = req.query;

    if (!contactId || !productId) {
      return res.status(400).json({
        success: false,
        error: 'contactId and productId are required',
      });
    }

    // Find matching persona
    const contact = await prisma.contact.findUnique({
      where: { id: contactId },
      select: { crmId: true },
    });

    if (!contact) {
      return res.status(404).json({
        success: false,
        error: 'Contact not found',
      });
    }

    const personaId = await findMatchingPersona(contactId, contact.crmId);

    // Calculate fit score
    const result = await calculateFitScore(contactId, productId, personaId);

    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: result.error || 'Failed to calculate fit score',
      });
    }

    return res.json({
      success: true,
      contactId,
      productId,
      personaId,
      scores: result.scores,
      summary: result.summary,
    });
  } catch (error) {
    console.error('❌ Fit score GET error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to calculate fit score',
      details: error.message,
    });
  }
});

export default router;

