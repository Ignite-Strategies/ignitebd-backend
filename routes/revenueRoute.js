import express from 'express';
import prisma from '../db.js';
import RevenueCalculationService from '../services/RevenueCalculationService.js';

const router = express.Router();

/**
 * POST /revenue/calculate
 * Calculate revenue metrics without saving to database
 */
router.post('/calculate', async (req, res) => {
  try {
    const { productName, avgGrossPerUnit, avgOrdersPerMonthPerCustomer, totalCustomers } = req.body;

    // Validate required fields
    if (!productName || !avgGrossPerUnit || !avgOrdersPerMonthPerCustomer || !totalCustomers) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: productName, avgGrossPerUnit, avgOrdersPerMonthPerCustomer, totalCustomers'
      });
    }

    // Calculate revenue metrics
    const revenueData = RevenueCalculationService.calculateRevenue({
      productName,
      avgGrossPerUnit,
      avgOrdersPerMonthPerCustomer,
      totalCustomers
    });

    // Generate additional insights
    const insights = RevenueCalculationService.generateRevenueInsights(revenueData);
    const unitEconomics = RevenueCalculationService.calculateUnitEconomicsInsights(revenueData);

    res.json({
      success: true,
      data: {
        revenue: revenueData,
        insights,
        unitEconomics
      }
    });

  } catch (error) {
    console.error('Error calculating revenue:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to calculate revenue metrics'
    });
  }
});

/**
 * POST /revenue/save
 * Save revenue stack data to database
 */
router.post('/save', async (req, res) => {
  try {
    const { 
      companyId, 
      productName, 
      avgGrossPerUnit, 
      avgOrdersPerMonthPerCustomer, 
      totalCustomers 
    } = req.body;

    // Validate required fields
    if (!companyId || !productName || !avgGrossPerUnit || !avgOrdersPerMonthPerCustomer || !totalCustomers) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: companyId, productName, avgGrossPerUnit, avgOrdersPerMonthPerCustomer, totalCustomers'
      });
    }

    // Calculate revenue metrics
    const revenueData = RevenueCalculationService.calculateRevenue({
      productName,
      avgGrossPerUnit,
      avgOrdersPerMonthPerCustomer,
      totalCustomers
    });

    // Save to database
    const revenueStack = await prisma.revenueStack.create({
      data: {
        companyId,
        productName: revenueData.productName,
        avgGrossPerUnit: revenueData.avgGrossPerUnit,
        avgOrdersPerMonthPerCustomer: revenueData.avgOrdersPerMonthPerCustomer,
        totalCustomers: revenueData.totalCustomers,
        totalUnitsPerMonth: revenueData.totalUnitsPerMonth,
        monthlyRevenue: revenueData.monthlyRevenue,
        annualRevenue: revenueData.annualRevenue
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
    const insights = RevenueCalculationService.generateRevenueInsights(revenueData);
    const unitEconomics = RevenueCalculationService.calculateUnitEconomicsInsights(revenueData);

    res.json({
      success: true,
      data: {
        revenueStack,
        insights,
        unitEconomics
      }
    });

  } catch (error) {
    console.error('Error saving revenue stack:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to save revenue stack'
    });
  }
});

/**
 * GET /revenue/:companyId
 * Get all revenue stacks for a company
 */
router.get('/:companyId', async (req, res) => {
  try {
    const { companyId } = req.params;

    const revenueStacks = await prisma.revenueStack.findMany({
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
      data: revenueStacks
    });

  } catch (error) {
    console.error('Error fetching revenue stacks:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch revenue stacks'
    });
  }
});

/**
 * GET /revenue/:companyId/latest
 * Get the latest revenue stack for a company
 */
router.get('/:companyId/latest', async (req, res) => {
  try {
    const { companyId } = req.params;

    const latestRevenueStack = await prisma.revenueStack.findFirst({
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

    if (!latestRevenueStack) {
      return res.status(404).json({
        success: false,
        error: 'No revenue stack found for this company'
      });
    }

    // Generate insights for the latest data
    const insights = RevenueCalculationService.generateRevenueInsights(latestRevenueStack);
    const unitEconomics = RevenueCalculationService.calculateUnitEconomicsInsights(latestRevenueStack);

    res.json({
      success: true,
      data: {
        revenueStack: latestRevenueStack,
        insights,
        unitEconomics
      }
    });

  } catch (error) {
    console.error('Error fetching latest revenue stack:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch latest revenue stack'
    });
  }
});

/**
 * PUT /revenue/:id
 * Update an existing revenue stack
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      productName, 
      avgGrossPerUnit, 
      avgOrdersPerMonthPerCustomer, 
      totalCustomers 
    } = req.body;

    // Validate required fields
    if (!productName || !avgGrossPerUnit || !avgOrdersPerMonthPerCustomer || !totalCustomers) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: productName, avgGrossPerUnit, avgOrdersPerMonthPerCustomer, totalCustomers'
      });
    }

    // Calculate updated revenue metrics
    const revenueData = RevenueCalculationService.calculateRevenue({
      productName,
      avgGrossPerUnit,
      avgOrdersPerMonthPerCustomer,
      totalCustomers
    });

    // Update in database
    const updatedRevenueStack = await prisma.revenueStack.update({
      where: { id },
      data: {
        productName: revenueData.productName,
        avgGrossPerUnit: revenueData.avgGrossPerUnit,
        avgOrdersPerMonthPerCustomer: revenueData.avgOrdersPerMonthPerCustomer,
        totalCustomers: revenueData.totalCustomers,
        totalUnitsPerMonth: revenueData.totalUnitsPerMonth,
        monthlyRevenue: revenueData.monthlyRevenue,
        annualRevenue: revenueData.annualRevenue
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
    const insights = RevenueCalculationService.generateRevenueInsights(revenueData);
    const unitEconomics = RevenueCalculationService.calculateUnitEconomicsInsights(revenueData);

    res.json({
      success: true,
      data: {
        revenueStack: updatedRevenueStack,
        insights,
        unitEconomics
      }
    });

  } catch (error) {
    console.error('Error updating revenue stack:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to update revenue stack'
    });
  }
});

/**
 * DELETE /revenue/:id
 * Delete a revenue stack
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.revenueStack.delete({
      where: { id }
    });

    res.json({
      success: true,
      message: 'Revenue stack deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting revenue stack:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to delete revenue stack'
    });
  }
});

/**
 * POST /revenue/:companyId/projections
 * Generate growth projections for a company's revenue
 */
router.post('/:companyId/projections', async (req, res) => {
  try {
    const { companyId } = req.params;
    const { growthRate = 0.25, years = 5 } = req.body;

    // Get latest revenue stack
    const latestRevenueStack = await prisma.revenueStack.findFirst({
      where: { companyId },
      orderBy: { createdAt: 'desc' }
    });

    if (!latestRevenueStack) {
      return res.status(404).json({
        success: false,
        error: 'No revenue stack found for this company'
      });
    }

    // Generate projections
    const projections = RevenueCalculationService.calculateGrowthProjections(
      latestRevenueStack, 
      growthRate, 
      years
    );

    res.json({
      success: true,
      data: projections
    });

  } catch (error) {
    console.error('Error generating projections:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate revenue projections'
    });
  }
});

export default router;
