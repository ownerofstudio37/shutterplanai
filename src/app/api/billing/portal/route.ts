import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth/serverAuth';
import { getBillingPlanStatusForUser } from '@/lib/billing/serverUsage';
import { apiFailure, apiSuccess, jsonWithApiMeta, startApiRequest } from '@/lib/utils/apiObservability';

export async function POST(request: NextRequest) {
  const requestContext = startApiRequest('/api/billing/portal', 'POST');
  const auth = await requireAuth(request);
  if (!auth.success) {
    apiFailure(requestContext, auth.status, auth.error, { stage: 'auth' });
    return jsonWithApiMeta(requestContext, { success: false, error: auth.error }, { status: auth.status });
  }

  try {
    const planStatus = await getBillingPlanStatusForUser(auth.userId);
    if (!planStatus.portalUrl) {
      apiSuccess(requestContext, 200, { mode: 'test-portal', tier: planStatus.tier });
      return jsonWithApiMeta(requestContext, {
        success: true,
        data: {
          portalUrl: null,
          planStatus,
          message: 'Billing portal is in test mode. Configure BILLING_PORTAL_URL before launch.',
        },
      });
    }

    apiSuccess(requestContext, 200, { mode: 'hosted-portal' });
    return jsonWithApiMeta(requestContext, { success: true, data: { portalUrl: planStatus.portalUrl, planStatus } });
  } catch (error) {
    apiFailure(requestContext, 500, error, { stage: 'portal' });
    return jsonWithApiMeta(requestContext, { success: false, error: 'Failed to open billing portal' }, { status: 500 });
  }
}
