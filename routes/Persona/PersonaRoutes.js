import express from 'express';
import prisma from '../../db.js';
import { verifyFirebaseToken } from '../../middleware/firebaseMiddleware.js';

const router = express.Router();

/**
 * GET /api/personas
 * List personas scoped to CompanyHQ (tenant)
 */
router.get('/', verifyFirebaseToken, async (req, res) => {
  try {
    const { companyHQId, productId } = req.query;

    if (!companyHQId) {
      return res.status(400).json({
        success: false,
        error: 'companyHQId is required',
      });
    }

    const personas = await prisma.persona.findMany({
      where: {
        companyHQId,
        ...(productId ? { productId } : {}),
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            valueProp: true,
          },
        },
      },
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
 * Fetch a persona by id (optional tenant validation)
 */
router.get('/:personaId', verifyFirebaseToken, async (req, res) => {
  try {
    const { personaId } = req.params;
    const { companyHQId } = req.query;

    if (!personaId) {
      return res.status(400).json({
        success: false,
        error: 'personaId is required',
      });
    }

    const persona = await prisma.persona.findUnique({
      where: { id: personaId },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            valueProp: true,
          },
        },
        companyHQ: {
          select: {
            id: true,
            companyName: true,
          },
        },
      },
    });

    if (!persona) {
      return res.status(404).json({
        success: false,
        error: 'Persona not found',
      });
    }

    if (companyHQId && persona.companyHQId !== companyHQId) {
      return res.status(403).json({
        success: false,
        error: 'Persona does not belong to this tenant',
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
    const {
      id,
      companyHQId,
      name,
      role,
      title,
      industry,
      goals,
      painPoints,
      desiredOutcome,
      valuePropToPersona,
      alignmentScore,
      productId,
    } = req.body || {};

    if (!companyHQId) {
      return res.status(400).json({
        success: false,
        error: 'companyHQId is required',
      });
    }

    if (!name) {
      return res.status(400).json({
        success: false,
        error: 'name is required',
      });
    }

    const companyHQ = await prisma.companyHQ.findUnique({
      where: { id: companyHQId },
      select: { id: true },
    });

    if (!companyHQ) {
      return res.status(404).json({
        success: false,
        error: 'CompanyHQ not found',
      });
    }

    let productIdToUse = null;
    if (productId) {
      const product = await prisma.product.findUnique({
        where: { id: productId },
        select: { id: true, companyHQId: true },
      });

      if (!product) {
        return res.status(404).json({
          success: false,
          error: 'Product not found',
        });
      }

      if (product.companyHQId !== companyHQId) {
        return res.status(403).json({
          success: false,
          error: 'Product does not belong to this tenant',
        });
      }

      productIdToUse = product.id;
    }

    let alignmentScoreToUse = null;
    if (alignmentScore !== undefined && alignmentScore !== null && alignmentScore !== '') {
      const parsed = Number(alignmentScore);
      if (!Number.isFinite(parsed) || parsed < 0 || parsed > 100) {
        return res.status(400).json({
          success: false,
          error: 'alignmentScore must be between 0 and 100',
        });
      }
      alignmentScoreToUse = Math.round(parsed);
    }

    const personaData = {
      companyHQId,
      name,
      role: role ?? null,
      title: title ?? null,
      industry: industry ?? null,
      goals: goals ?? null,
      painPoints: painPoints ?? null,
      desiredOutcome: desiredOutcome ?? null,
      valuePropToPersona: valuePropToPersona ?? null,
      alignmentScore: alignmentScoreToUse,
      productId: productIdToUse,
    };

    let persona;
    if (id) {
      persona = await prisma.persona.update({
        where: { id },
        data: personaData,
        include: {
          product: {
            select: {
              id: true,
              name: true,
              valueProp: true,
            },
          },
        },
      });
    } else {
      persona = await prisma.persona.create({
        data: personaData,
        include: {
          product: {
            select: {
              id: true,
              name: true,
              valueProp: true,
            },
          },
        },
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

