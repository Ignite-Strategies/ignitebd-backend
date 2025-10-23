import express from 'express';
import prisma from '../db.js';
import TargetAcquisitionCalculationService from '../services/TargetAcquisitionCalculationService.js';

const router = express.Router();

/**
 * POST /target-acquisition/calculate
 * Calculate target acquisition metrics without saving to database
 */
router.post('/calculate', async (req, res) => {
  try {
    const { 
      previousRevenue, 
      targetRevenue, 
      avgUnitValue, 
      avgUnitsPerCustomer, 
      timeHorizon = 12 
    } = req.body;

    // Validate required fields
    if (!previousRevenue || !targetRevenue || !avgUnitValue || !avgUnitsPerCustomer) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: previousRevenue, targetRevenue, avgUnitValue, avgUnitsPerCustomer'
      });
    }

    // Calculate target acquisition metrics
    const targetData = TargetAcquisitionCalculationService.calculateTargetAcquisition({
      previousRevenue,
      targetRevenue,
      avgUnitValue,
      avgUnitsPerCustomer,
      timeHorizon
    });

    // Generate additional insights
    const insights = TargetAcquisitionCalculationService.generateAcquisitionInsights(targetData);
    const velocity = TargetAcquisitionCalculationService.calculateAcquisitionVelocity(targetData);
    const scenarios = TargetAcquisitionCalculationService.calculateGrowthScenarios(targetData);
    const milestones = TargetAcquisitionCalculationService.calculateMilestoneTracking(targetData);

    res.json({
      success: true,
      data: {
        targetAcquisition: targetData,
        insights,
        velocity,
        scenarios,
        milestones
      }
    });

  } catch (error) {
    console.error('Error calculating target acquisition:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to calculate target acquisition metrics'
    });
  }
});

/**
 * POST /target-acquisition/save
 * Save target acquisition data to database
 */
router.post('/save', async (req, res) => {
  try {
    const { 
      companyId,
      previousRevenue, 
      targetRevenue, 
      avgUnitValue, 
      avgUnitsPerCustomer, 
      timeHorizon = 12 
    } = req.body;

    // Validate required fields
    if (!companyId || !previousRevenue || !targetRevenue || !avgUnitValue || !avgUnitsPerCustomer) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: companyId, previousRevenue, targetRevenue, avgUnitValue, avgUnitsPerCustomer'
      });
    }

    // Calculate target acquisition metrics
    const targetData = TargetAcquisitionCalculationService.calculateTargetAcquisition({
      previousRevenue,
      targetRevenue,
      avgUnitValue,
      avgUnitsPerCustomer,
      timeHorizon
    });

    // Save to database
    const targetAcquisitionStack = await prisma.targetAcquisitionStack.create({
      data: {
        companyId,
        previousRevenue: targetData.previousRevenue,
        currentMonthlyRevenue: targetData.previousRevenue / 12, // Approximate
        targetRevenue: targetData.targetRevenue,
        timeHorizon: targetData.timeHorizon,
        increaseNeeded: targetData.increaseNeeded,
        growthPercent: targetData.growthPercent,
        avgUnitValue: targetData.avgUnitValue,
        avgUnitsPerCustomer: targetData.avgUnitsPerCustomer,
        newUnitsNeeded: targetData.newUnitsNeeded,
        newCustomersNeeded: targetData.newCustomersNeeded
      },
      include: {
        company: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    // Generate insights for response
    const insights = TargetAcquisitionCalculationService.generateAcquisitionInsights(targetData);
    const velocity = TargetAcquisitionCalculationService.calculateAcquisitionVelocity(targetData);
    const scenarios = TargetAcquisitionCalculationService.calculateGrowthScenarios(targetData);

    res.json({
      success: true,
      data: {
        targetAcquisitionStack,
        insights,
        velocity,
        scenarios
      }
    });

  } catch (error) {
    console.error('Error saving target acquisition stack:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to save target acquisition stack'
    });
  }
});

/**
 * GET /target-acquisition/:companyId
 * Get all target acquisition stacks for a company
 */
router.get('/:companyId', async (req, res) => {
  try {
    const { companyId } = req.params;

    const targetAcquisitionStacks = await prisma.targetAcquisitionStack.findMany({
      where: { companyId },
      orderBy: { createdAt: 'desc' },
      include: {
        company: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    res.json({
      success: true,
      data: targetAcquisitionStacks
    });

  } catch (error) {
    console.error('Error fetching target acquisition stacks:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch target acquisition stacks'
    });
  }
});

/**
 * GET /target-acquisition/:companyId/latest
 * Get the latest target acquisition stack for a company
 */
router.get('/:companyId/latest', async (req, res) => {
  try {
    const { companyId } = req.params;

    const latestTargetAcquisitionStack = await prisma.targetAcquisitionStack.findFirst({
      where: { companyId },
      orderBy: { createdAt: 'desc' },
      include: {
        company: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    if (!latestTargetAcquisitionStack) {
      return res.status(404).json({
        success: false,
        error: 'No target acquisition stack found for this company'
      });
    }

    // Generate insights for the latest data
    const insights = TargetAcquisitionCalculationService.generateAcquisitionInsights(latestTargetAcquisitionStack);
    const velocity = TargetAcquisitionCalculationService.calculateAcquisitionVelocity(latestTargetAcquisitionStack);
    const scenarios = TargetAcquisitionCalculationService.calculateGrowthScenarios(latestTargetAcquisitionStack);

    res.json({
      success: true,
      data: {
        targetAcquisitionStack: latestTargetAcquisitionStack,
        insights,
        velocity,
        scenarios
      }
    });

  } catch (error) {
    console.error('Error fetching latest target acquisition stack:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch latest target acquisition stack'
    });
  }
});

/**
 * PUT /target-acquisition/:id
 * Update an existing target acquisition stack
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      previousRevenue, 
      targetRevenue, 
      avgUnitValue, 
      avgUnitsPerCustomer, 
      timeHorizon = 12 
    } = req.body;

    // Validate required fields
    if (!previousRevenue || !targetRevenue || !avgUnitValue || !avgUnitsPerCustomer) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: previousRevenue, targetRevenue, avgUnitValue, avgUnitsPerCustomer'
      });
    }

    // Calculate updated target acquisition metrics
    const targetData = TargetAcquisitionCalculationService.calculateTargetAcquisition({
      previousRevenue,
      targetRevenue,
      avgUnitValue,
      avgUnitsPerCustomer,
      timeHorizon
    });

    // Update in database
    const updatedTargetAcquisitionStack = await prisma.targetAcquisitionStack.update({
      where: { id },
      data: {
        previousRevenue: targetData.previousRevenue,
        targetRevenue: targetData.targetRevenue,
        timeHorizon: targetData.timeHorizon,
        increaseNeeded: targetData.increaseNeeded,
        growthPercent: targetData.growthPercent,
        avgUnitValue: targetData.avgUnitValue,
        avgUnitsPerCustomer: targetData.avgUnitsPerCustomer,
        newUnitsNeeded: targetData.newUnitsNeeded,
        newCustomersNeeded: targetData.newCustomersNeeded
      },
      include: {
        company: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    // Generate insights for response
    const insights = TargetAcquisitionCalculationService.generateAcquisitionInsights(targetData);
    const velocity = TargetAcquisitionCalculationService.calculateAcquisitionVelocity(targetData);
    const scenarios = TargetAcquisitionCalculationService.calculateGrowthScenarios(targetData);

    res.json({
      success: true,
      data: {
        targetAcquisitionStack: updatedTargetAcquisitionStack,
        insights,
        velocity,
        scenarios
      }
    });

  } catch (error) {
    console.error('Error updating target acquisition stack:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to update target acquisition stack'
    });
  }
});

/**
 * DELETE /target-acquisition/:id
 * Delete a target acquisition stack
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.targetAcquisitionStack.delete({
      where: { id }
    });

    res.json({
      success: true,
      message: 'Target acquisition stack deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting target acquisition stack:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to delete target acquisition stack'
    });
  }
});

/**
 * POST /target-acquisition/:companyId/feasibility
 * Calculate acquisition feasibility with human capital data
 */
router.post('/:companyId/feasibility', async (req, res) => {
  try {
    const { companyId } = req.params;
    const { humanCapitalData } = req.body;

    // Get latest target acquisition stack
    const latestTargetAcquisitionStack = await prisma.targetAcquisitionStack.findFirst({
      where: { companyId },
      orderBy: { createdAt: 'desc' }
    });

    if (!latestTargetAcquisitionStack) {
      return res.status(404).json({
        success: false,
        error: 'No target acquisition stack found for this company'
      });
    }

    // Calculate feasibility
    const feasibility = TargetAcquisitionCalculationService.calculateAcquisitionFeasibility(
      latestTargetAcquisitionStack,
      humanCapitalData
    );

    res.json({
      success: true,
      data: feasibility
    });

  } catch (error) {
    console.error('Error calculating feasibility:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to calculate acquisition feasibility'
    });
  }
});

export default router;
