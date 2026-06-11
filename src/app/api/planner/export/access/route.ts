import { NextRequest } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/server';
import { getSharedGuidePlan } from '@/lib/planner/shareAccess';
import { getClientIp, checkRateLimit, rateLimitHeaders } from '@/lib/security/rateLimit';
import { apiFailure, apiSuccess, jsonWithApiMeta, startApiRequest } from '@/lib/utils/apiObservability';

const supabase = createSupabaseAdminClient();

export async function POST(request: NextRequest) {
  const requestContext = startApiRequest('/api/planner/export/access', 'POST');

  try {
    const body = (await request.json()) as { token?: unknown; password?: unknown };
    const token = typeof body.token === 'string' ? body.token.trim() : '';
    const password = typeof body.password === 'string' ? body.password.trim() : '';

    if (!token) {
      apiFailure(requestContext, 400, 'Missing token', { stage: 'validation' });
      return jsonWithApiMeta(requestContext, { error: 'Missing token' }, { status: 400 });
    }

    const rateLimit = checkRateLimit({
      key: `guide-password:${token}:${getClientIp(request)}`,
      limit: 10,
      windowMs: 15 * 60 * 1000,
    });

    if (!rateLimit.success) {
      apiFailure(requestContext, 429, 'Guide password check rate limited', { stage: 'rate_limit' });
      return jsonWithApiMeta(
        requestContext,
        { success: false, error: 'Too many password attempts. Please wait and try again.' },
        { status: 429, headers: rateLimitHeaders(rateLimit) }
      );
    }

    const result = await getSharedGuidePlan({
      supabase,
      token,
      password,
      allowPasswordCheck: true,
    });

    if (!result.success) {
      apiFailure(requestContext, result.status, result.cause || result.error, { stage: result.stage });
      return jsonWithApiMeta(
        requestContext,
        { error: result.error, requiresPassword: result.requiresPassword },
        { status: result.status }
      );
    }

    apiSuccess(requestContext, 200, { passwordProtected: result.passwordProtected });
    return jsonWithApiMeta(requestContext, result.data);
  } catch (error) {
    apiFailure(requestContext, 500, error, { stage: 'unlock_shared_plan' });
    return jsonWithApiMeta(requestContext, { error: 'Failed to unlock plan' }, { status: 500 });
  }
}
