// ─── Planner error classification ────────────────────────────────────────────
//
// Maps raw API error strings and codes to user-facing, actionable messages.
// All error display in the planner should go through classifyPlannerError().

export type PlannerErrorInfo = {
  title: string;
  message: string;
  /** Short label for the CTA button, e.g. "Edit location" */
  action?: string;
  /** If true, render as a warning (amber) rather than error (red) */
  isWarning?: boolean;
};

const PATTERNS: Array<{
  match: RegExp;
  info: PlannerErrorInfo;
}> = [
  // Validation / missing input
  {
    match: /incomplete|missing.*location|at least.*location|no location|empty.*list/i,
    info: {
      title: 'Incomplete plan details',
      message: 'Please add at least one location or city before generating.',
      action: 'Back to planning',
    },
  },
  // City not recognised / geocode failed
  {
    match: /city.*not found|location.*not found|geocod|unrecognized.*city|couldn.t.*find.*city/i,
    info: {
      title: 'Location not recognised',
      message: 'The city or area you entered couldn\'t be found. Try a format like "Austin, TX" or a ZIP code.',
      action: 'Edit city',
    },
  },
  // Provided locations not found
  {
    match: /provided.*location.*not found|couldn.t.*resolve.*location|no.*valid.*location/i,
    info: {
      title: 'Location not found',
      message: "One or more of your locations couldn't be placed on the map. Try being more specific (e.g. include the city name).",
      action: 'Edit locations',
    },
  },
  // Timeout / slow
  {
    match: /timeout|timed out|took too long/i,
    info: {
      title: 'Taking longer than usual',
      message: 'Route optimisation is complex with many locations. Try reducing to 3–4 key locations.',
      action: 'Edit locations',
      isWarning: true,
    },
  },
  // Rate limit
  {
    match: /rate.?limit|too many request/i,
    info: {
      title: 'Too many requests',
      message: 'You\'ve hit the request limit. Please wait a moment and try again.',
      action: 'Retry',
      isWarning: true,
    },
  },
  // Auth / permission
  {
    match: /unauthorized|permission|not.*authorized|sign.*in/i,
    info: {
      title: 'Session expired',
      message: 'Your session has expired. Please sign in again.',
      action: 'Sign in',
    },
  },
  // Network / connectivity
  {
    match: /network|fetch.*fail|failed.*fetch|connection|offline/i,
    info: {
      title: 'Connection issue',
      message: 'Check your internet connection and try again.',
      action: 'Retry',
    },
  },
  // Plan generation partial failure (shots)
  {
    match: /\d+.*shot.*fail|shot.*fail|partial.*apply/i,
    info: {
      title: 'Plan partially saved',
      message: 'Your project was created but some shots failed to save. Open the project to review.',
      action: 'View project',
      isWarning: true,
    },
  },
  // Regeneration failure
  {
    match: /regenerat/i,
    info: {
      title: 'Regeneration failed',
      message: 'Couldn\'t regenerate that section. Your existing plan is unchanged — try again.',
      action: 'Retry',
    },
  },
  // Refinement failure
  {
    match: /refin/i,
    info: {
      title: 'Refinement failed',
      message: 'Couldn\'t load location insights right now. Try again in a moment.',
      action: 'Retry',
    },
  },
];

const FALLBACK: PlannerErrorInfo = {
  title: 'Something went wrong',
  message: 'Plan generation failed. Check your inputs and try again.',
  action: 'Retry',
};

/**
 * Classify a raw error string into a user-friendly PlannerErrorInfo.
 * Falls back to a generic message if no pattern matches.
 */
export function classifyPlannerError(raw: string | null | undefined): PlannerErrorInfo {
  if (!raw) return FALLBACK;
  const found = PATTERNS.find(p => p.match.test(raw));
  if (found) return found.info;
  // Include the raw message as a detail if it's short enough to be useful
  if (raw.length <= 120) {
    return { ...FALLBACK, message: raw };
  }
  return FALLBACK;
}
