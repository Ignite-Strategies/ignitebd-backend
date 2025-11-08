import express from 'express';
import prisma from '../../db.js';
import { verifyFirebaseToken } from '../../middleware/firebaseMiddleware.js';

const router = express.Router();

/**
 * GET /api/personas
 * List personas scoped to Company (prospect/client)
 */
router.get('/', verifyFirebaseToken, async (req, res) => {
  try {
    const { companyId } = req.query;

    if (!companyId) {
      return res.status(400).json({
        success: false,
        error: 'companyId is required',
      });
    }

    const personas = await prisma.persona.findMany({
      where: { companyId },
      orderBy: { updatedAt: 'desc' },
    });

    return res.json({
      success: true,
      personas,
    });
  } catch (error) {
    console.error('❌ Persona list error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch personas',
      details: error.message,
    });
  }
});

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
      include: { company: true },
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
    const { id, companyId, personaName, role, painPoints, goals, whatTheyWant } = req.body || {};

    if (!companyId) {
      return res.status(400).json({
        success: false,
        error: 'companyId is required',
      });
    }

    if (!personaName) {
      return res.status(400).json({
        success: false,
        error: 'personaName is required',
      });
    }

    const company = await prisma.company.findUnique({
      where: { id: companyId },
    });

    if (!company) {
      return res.status(404).json({
        success: false,
        error: 'Company not found',
      });
    }

    const personaData = {
      companyId,
      personaName,
      role: role ?? null,
      painPoints: painPoints ?? null,
      goals: goals ?? null,
      whatTheyWant: whatTheyWant ?? null,
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

