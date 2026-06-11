import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth/serverAuth';
import { getBillingUsageForUser } from '@/lib/billing/serverUsage';
import { apiFailure, apiSuccess, jsonWithApiMeta, startApiRequest } from '@/lib/utils/apiObservability';

export async function GET(request: NextRequest) {
  const requestContext = startApiRequest('/api/account/usage', 'GET');
  const auth = await requireAuth(request);
  if (!auth.success) {
    apiFailure(requestContext, auth.status, auth.error, { stage: 'auth' });
    return jsonWithApiMeta(requestContext, { success: false, error: auth.error }, { status: auth.status });
  }

  try {
    const usage = await getBillingUsageForUser(auth.userId);
    apiSuccess(requestContext, 200, { tier: usage.tier });
    return jsonWithApiMeta(requestContext, { success: true, data: usage });
  } catch (error) {
    apiFailure(requestContext, 500, error, { stage: 'usage' });
    return jsonWithApiMeta(requestContext, { success: false, error: 'Failed to load usage' }, { status: 500 });
  }
}
