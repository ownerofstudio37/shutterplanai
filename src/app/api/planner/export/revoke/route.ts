import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth/serverAuth';
import { createSupabaseAdminClient } from '@/lib/supabase/server';
import { apiFailure, apiSuccess, jsonWithApiMeta, startApiRequest } from '@/lib/utils/apiObservability';

export async function POST(request: NextRequest) {
  const requestContext = startApiRequest('/api/planner/export/revoke', 'POST');
  const authResult = await requireAuth(request);
  if (!authResult.success) {
    apiFailure(requestContext, authResult.status, authResult.error, { stage: 'auth' });
    return jsonWithApiMeta(requestContext, { success: false, error: authResult.error }, { status: authResult.status });
  }

  try {
    const body = (await request.json()) as { shareToken?: string };
    const shareToken = body.shareToken?.trim();

    if (!shareToken) {
      apiFailure(requestContext, 400, 'shareToken is required', { stage: 'validation' });
      return jsonWithApiMeta(requestContext, { success: false, error: 'shareToken is required' }, { status: 400 });
    }

    const admin = createSupabaseAdminClient();
    const { data, error } = await admin
      .from('planner_exports')
      .update({
        revoked_at: new Date().toISOString(),
        revoked_by: authResult.userId,
        updated_at: new Date().toISOString(),
      })
      .eq('share_token', shareToken)
      .eq('user_id', authResult.userId)
      .is('revoked_at', null)
      .select('id');

    if (error) {
      apiFailure(requestContext, 500, error, { stage: 'revoke_update' });
      return jsonWithApiMeta(requestContext, { success: false, error: 'Failed to revoke share link' }, { status: 500 });
    }

    if (!data || data.length === 0) {
      apiFailure(requestContext, 404, 'Share link not found', { stage: 'revoke_lookup' });
      return jsonWithApiMeta(requestContext, { success: false, error: 'Share link not found' }, { status: 404 });
    }

    apiSuccess(requestContext, 200);
    return jsonWithApiMeta(requestContext, { success: true });
  } catch (error) {
    apiFailure(requestContext, 500, error, { stage: 'unhandled' });
    return jsonWithApiMeta(requestContext, { success: false, error: 'Failed to revoke share link' }, { status: 500 });
  }
}
