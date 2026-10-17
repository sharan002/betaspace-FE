// BetaSpace co-working sales pipeline — single source of truth for the stage
// names used by the lead form, filters and stage-specific actions.
export const PIPELINE_STAGES = [
  'New Lead',
  'Contacted',
  'Site Visit',
  'Proposal Shared',
  'Negotiation',
  'Advance Payment',
  'Converted',
  'Not Interested',
  'On Hold',
  'Not Reachable',
] as const;

export const DEFAULT_PIPELINE_STAGE = 'New Lead';

// "Enrolled" is the legacy (education-era) name for Converted; leads created
// before the switch may still carry it until they are migrated.
export const isConvertedStage = (stage?: string | null) => /^(converted|enrolled)$/i.test(stage || '');

// Stages that trigger a Meta Conversions API lead event.
export const isQualifiedStage = (stage?: string | null) => /^(site visit|pre-enrollment)$/i.test(stage || '');
