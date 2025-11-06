/**
 * PIPELINE CONFIG ROUTE
 * Returns pipeline configuration for frontend
 * GET /api/pipelines/config
 */

import express from 'express';
import { getPipelineConfig } from '../config/pipelineConfig.js';

const router = express.Router();

router.get('/config', (req, res) => {
  try {
    const config = getPipelineConfig();
    
    res.json({
      success: true,
      pipelines: config.pipelines,
      officialPipelines: config.officialPipelines,
      allStages: config.allStages
    });
  } catch (error) {
    console.error('Error getting pipeline config:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get pipeline configuration'
    });
  }
});

export default router;

