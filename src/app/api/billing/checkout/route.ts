import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth/serverAuth';
import { activateTestProPlan } from '@/lib/billing/serverUsage';
import { apiFailure, apiSuccess, jsonWithApiMeta, startApiRequest } from '@/lib/utils/apiObservability';

export async function POST(request: NextRequest) {
  const requestContext = startApiRequest('/api/billing/checkout', 'POST');
  const auth = await requireAuth(request);
  if (!auth.success) {
    apiFailure(requestContext, auth.status, auth.error, { stage: 'auth' });
    return jsonWithApiMeta(requestContext, { success: false, error: auth.error }, { status: auth.status });
  }

  const configuredCheckoutUrl = process.env.BILLING_CHECKOUT_URL;
  if (configuredCheckoutUrl) {
    apiSuccess(requestContext, 200, { mode: 'hosted-checkout' });
    return jsonWithApiMeta(requestContext, { success: true, data: { checkoutUrl: configuredCheckoutUrl } });
  }

  try {
    const planStatus = await activateTestProPlan(auth.userId);
    apiSuccess(requestContext, 200, { mode: 'test-upgrade', tier: planStatus.tier });
    return jsonWithApiMeta(requestContext, {
      success: true,
      data: {
        checkoutUrl: null,
        planStatus,
        message: 'Test checkout complete. Pro features are active for this account.',
      },
    });
  } catch (error) {
    apiFailure(requestContext, 500, error, { stage: 'checkout' });
    return jsonWithApiMeta(requestContext, { success: false, error: 'Failed to start checkout' }, { status: 500 });
  }
}
