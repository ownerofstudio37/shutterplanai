import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/server';
import { apiFailure, apiSuccess, jsonWithApiMeta, startApiRequest } from '@/lib/utils/apiObservability';

function isAuthorized(request: NextRequest) {
  const secret = process.env.PLANNER_EXPORT_CLEANUP_SECRET;
  if (!secret) return true;

  const bearer = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  const headerSecret = request.headers.get('x-cron-secret');
  return bearer === secret || headerSecret === secret;
}

export async function GET(request: NextRequest) {
  const requestContext = startApiRequest('/api/cron/planner-exports-cleanup', 'GET');
  if (!isAuthorized(request)) {
    apiFailure(requestContext, 401, 'Unauthorized', { stage: 'auth' });
    return jsonWithApiMeta(requestContext, { success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const admin = createSupabaseAdminClient();
    const { error } = await admin.rpc('cleanup_expired_exports');

    if (error) {
      apiFailure(requestContext, 500, error, { stage: 'cleanup_rpc' });
      return jsonWithApiMeta(requestContext, { success: false, error: 'Cleanup failed' }, { status: 500 });
    }

    apiSuccess(requestContext, 200);
    return jsonWithApiMeta(requestContext, { success: true });
  } catch (error) {
    apiFailure(requestContext, 500, error, { stage: 'unhandled' });
    return jsonWithApiMeta(requestContext, { success: false, error: 'Cleanup failed' }, { status: 500 });
  }
}
