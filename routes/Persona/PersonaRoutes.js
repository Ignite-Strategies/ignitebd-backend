import express from 'express';
import prisma from '../../db.js';
import { verifyFirebaseToken } from '../../middleware/firebaseMiddleware.js';

const router = express.Router();

/**
 * GET /api/personas/:personaId
 * Fetch a persona by id
 */
router.get('/:personaId', verifyFirebaseToken, async (req, res) => {
  try {
    const { personaId } = req.params;

    if (!personaId) {
      return res.status(400).json({
        success: false,
        error: 'personaId is required',
      });
    }

    const persona = await prisma.persona.findUnique({
      where: { id: personaId },
      include: { companyHQ: true },
    });

    if (!persona) {
      return res.status(404).json({
        success: false,
        error: 'Persona not found',
      });
    }

    return res.json({
      success: true,
      persona,
    });
  } catch (error) {
    console.error('❌ Persona GET error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch persona',
      details: error.message,
    });
  }
});

/**
 * POST /api/personas/upsert
 * Create or update a persona
 */
router.post('/upsert', verifyFirebaseToken, async (req, res) => {
  try {
    const { id, companyHQId, personaName, role, painPoints, goals, tagline, callToAction } = req.body || {};

    if (!companyHQId) {
      return res.status(400).json({
        success: false,
        error: 'companyHQId is required',
      });
    }

    if (!personaName) {
      return res.status(400).json({
        success: false,
        error: 'personaName is required',
      });
    }

    // Ensure CompanyHQ exists
    const companyHQ = await prisma.companyHQ.findUnique({
      where: { id: companyHQId },
    });

    if (!companyHQ) {
      return res.status(404).json({
        success: false,
        error: 'CompanyHQ not found',
      });
    }

    const personaData = {
      companyHQId,
      personaName,
      role: role ?? null,
      painPoints: painPoints ?? null,
      goals: goals ?? null,
      tagline: tagline ?? null,
      callToAction: callToAction ?? null,
    };

    let persona;
    if (id) {
      persona = await prisma.persona.update({
        where: { id },
        data: personaData,
      });
    } else {
      persona = await prisma.persona.create({
        data: personaData,
      });
    }

    return res.json({
      success: true,
      persona,
    });
  } catch (error) {
    console.error('❌ Persona upsert error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to upsert persona',
      details: error.message,
    });
  }
});

export default router;

