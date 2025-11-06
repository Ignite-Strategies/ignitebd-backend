/**
 * PIPELINE CONFIGURATION FOR IGNITEBD
 * Single source of truth for Contact pipelines and stages
 * Based on Contact-First Architecture with Pipeline model
 * 
 * Pipeline Types: prospect, client, collaborator, institution
 * Each pipeline has its own stages
 */

// OFFICIAL PIPELINE TYPES
export const OFFICIAL_PIPELINES = [
  'prospect',
  'client',
  'collaborator',
  'institution'
];

// ALL POSSIBLE STAGES
export const ALL_STAGES = [
  // Prospect stages
  'interest',
  'meeting',
  'proposal',
  'negotiation',
  'qualified',
  // Client stages
  'onboarding',
  'active',
  'renewal',
  'upsell',
  // Collaborator stages
  'initial',
  'active',
  'partnership',
  // Institution stages
  'awareness',
  'engagement',
  'partnership'
];

// PIPELINE-SPECIFIC STAGES
// Each pipeline type has its own stages
export const PIPELINE_STAGES = {
  'prospect': [
    'interest',        // Initial interest expressed
    'meeting',         // Meeting scheduled/held
    'proposal',        // Proposal sent
    'negotiation',     // Negotiating terms
    'qualified'        // Qualified lead
  ],
  'client': [
    'onboarding',      // New client onboarding
    'active',          // Active client
    'renewal',         // Renewal period
    'upsell'           // Upsell opportunity
  ],
  'collaborator': [
    'initial',         // Initial contact
    'active',          // Active collaboration
    'partnership'      // Formal partnership
  ],
  'institution': [
    'awareness',       // Awareness stage
    'engagement',      // Engagement stage
    'partnership'      // Partnership stage
  ]
};

// Validate pipeline type
export const isValidPipeline = (pipeline) => {
  return OFFICIAL_PIPELINES.includes(pipeline);
};

// Get stages for specific pipeline
export const getStagesForPipeline = (pipeline) => {
  return PIPELINE_STAGES[pipeline] || [];
};

// Validate stage for pipeline
export const isValidStageForPipeline = (stage, pipeline) => {
  const pipelineStages = getStagesForPipeline(pipeline);
  return pipelineStages.includes(stage);
};

// Get pipeline config for API response
export const getPipelineConfig = () => {
  return {
    pipelines: PIPELINE_STAGES,
    officialPipelines: OFFICIAL_PIPELINES,
    allStages: ALL_STAGES
  };
};

