export type SubscriptionTier = 'free' | 'pro';

export type BillingUsageSummary = {
  tier: SubscriptionTier;
  limits: {
    plannerGenerations: number | null;
    shareLinks: number | null;
    passwordProtectedLinks: boolean;
    maxShareExpiryDays: number | null;
    multiDayPlanning: boolean;
  };
  usage: {
    plannerGenerations: number;
    shareLinks: number;
  };
  remaining: {
    plannerGenerations: number | null;
    shareLinks: number | null;
  };
  upgradeValueProps: string[];
};

export const FREE_PLAN_LIMITS = {
  plannerGenerations: 3,
  shareLinks: 1,
  passwordProtectedLinks: false,
  maxShareExpiryDays: 7,
  multiDayPlanning: false,
} as const;

export const PRO_PLAN_LIMITS = {
  plannerGenerations: null,
  shareLinks: null,
  passwordProtectedLinks: true,
  maxShareExpiryDays: 90,
  multiDayPlanning: true,
} as const;

export const UPGRADE_VALUE_PROPS = [
  'Unlimited AI shoot plans and refinements',
  'Unlimited client guide links with password protection',
  'Premium exports, longer guide expiration, and multi-day planning',
];

export function normalizeSubscriptionTier(value: unknown): SubscriptionTier {
  return value === 'pro' ? 'pro' : 'free';
}

export function getPlanLimits(tier: SubscriptionTier) {
  return tier === 'pro' ? PRO_PLAN_LIMITS : FREE_PLAN_LIMITS;
}

export function getRemaining(used: number, limit: number | null) {
  if (limit == null) return null;
  return Math.max(0, limit - used);
}

export function hasReachedLimit(used: number, limit: number | null) {
  return limit != null && used >= limit;
}

export function buildBillingUsageSummary(input: {
  tier: SubscriptionTier;
  plannerGenerations: number;
  shareLinks: number;
}): BillingUsageSummary {
  const limits = getPlanLimits(input.tier);

  return {
    tier: input.tier,
    limits,
    usage: {
      plannerGenerations: input.plannerGenerations,
      shareLinks: input.shareLinks,
    },
    remaining: {
      plannerGenerations: getRemaining(input.plannerGenerations, limits.plannerGenerations),
      shareLinks: getRemaining(input.shareLinks, limits.shareLinks),
    },
    upgradeValueProps: UPGRADE_VALUE_PROPS,
  };
}
