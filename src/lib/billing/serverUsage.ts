import { createSupabaseAdminClient } from '@/lib/supabase/server';
import {
  buildBillingUsageSummary,
  normalizeSubscriptionTier,
  type BillingUsageSummary,
  type SubscriptionTier,
} from './planLimits';

export async function getSubscriptionTierForUser(userId: string): Promise<SubscriptionTier> {
  const admin = createSupabaseAdminClient();
  const { data } = await admin.auth.admin.getUserById(userId);
  const metadata = data?.user?.user_metadata ?? {};
  const tier = metadata.subscriptionTier ?? metadata.subscriptionPlan ?? metadata.billingPlan;
  return normalizeSubscriptionTier(tier);
}

export async function getBillingUsageForUser(userId: string): Promise<BillingUsageSummary> {
  const admin = createSupabaseAdminClient();
  const [tier, analytics, exports] = await Promise.all([
    getSubscriptionTierForUser(userId),
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

  return buildBillingUsageSummary({
    tier,
    plannerGenerations: analytics.data?.length ?? 0,
    shareLinks: exports.count ?? 0,
  });
}
