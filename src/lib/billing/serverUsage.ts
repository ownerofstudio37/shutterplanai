import { createSupabaseAdminClient } from '@/lib/supabase/server';
import {
  type BillingPlanStatus,
  buildBillingUsageSummary,
  normalizeBillingStatus,
  normalizeSubscriptionTier,
  type BillingUsageSummary,
  type SubscriptionTier,
} from './planLimits';

const BILLING_TEST_MODE = process.env.BILLING_TEST_MODE !== 'false';

type BillingMetadata = {
  subscriptionTier?: unknown;
  subscriptionPlan?: unknown;
  billingPlan?: unknown;
  billingStatus?: unknown;
  billingCustomerId?: unknown;
  billingCurrentPeriodEnd?: unknown;
};

export async function getSubscriptionTierForUser(userId: string): Promise<SubscriptionTier> {
  const admin = createSupabaseAdminClient();
  const { data } = await admin.auth.admin.getUserById(userId);
  const metadata = (data?.user?.user_metadata ?? {}) as BillingMetadata;
  const tier = metadata.subscriptionTier ?? metadata.subscriptionPlan ?? metadata.billingPlan;
  return normalizeSubscriptionTier(tier);
}

export async function getBillingPlanStatusForUser(userId: string): Promise<BillingPlanStatus> {
  const admin = createSupabaseAdminClient();
  const { data } = await admin.auth.admin.getUserById(userId);
  const metadata = (data?.user?.user_metadata ?? {}) as BillingMetadata;
  const tier = normalizeSubscriptionTier(metadata.subscriptionTier ?? metadata.subscriptionPlan ?? metadata.billingPlan);
  const status = normalizeBillingStatus(metadata.billingStatus);

  return {
    tier,
    status: tier === 'pro' && status === 'free' ? 'active' : status,
    customerId: typeof metadata.billingCustomerId === 'string' ? metadata.billingCustomerId : null,
    currentPeriodEnd: typeof metadata.billingCurrentPeriodEnd === 'string' ? metadata.billingCurrentPeriodEnd : null,
    checkoutUrl: process.env.BILLING_CHECKOUT_URL ?? null,
    portalUrl: process.env.BILLING_PORTAL_URL ?? null,
    testMode: BILLING_TEST_MODE,
  };
}

export async function activateTestProPlan(userId: string): Promise<BillingPlanStatus> {
  if (!BILLING_TEST_MODE) {
    throw new Error('Billing test mode is disabled');
  }

  const admin = createSupabaseAdminClient();
  const currentPeriodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  const { data } = await admin.auth.admin.getUserById(userId);
  const existingMetadata = data?.user?.user_metadata ?? {};
  const { error } = await admin.auth.admin.updateUserById(userId, {
    user_metadata: {
      ...existingMetadata,
      subscriptionTier: 'pro',
      billingStatus: 'active',
      billingCustomerId: `test_customer_${userId}`,
      billingCurrentPeriodEnd: currentPeriodEnd,
    },
  });

  if (error) {
    throw error;
  }

  return getBillingPlanStatusForUser(userId);
}

export async function getBillingUsageForUser(userId: string): Promise<BillingUsageSummary> {
  const admin = createSupabaseAdminClient();
  const [planStatus, analytics, exports] = await Promise.all([
    getBillingPlanStatusForUser(userId),
    admin
      .from('planner_analytics')
      .select('event_name')
      .eq('user_id', userId)
      .eq('event_name', 'planner_generate_success'),
    admin
      .from('planner_exports')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId),
  ]);

  if (analytics.error) {
    throw analytics.error;
  }
  if (exports.error) {
    throw exports.error;
  }

  return {
    ...buildBillingUsageSummary({
      tier: planStatus.tier,
      plannerGenerations: analytics.data?.length ?? 0,
      shareLinks: exports.count ?? 0,
    }),
    planStatus,
  };
}
