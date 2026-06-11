import { NextRequest } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/server';
import { apiFailure, apiSuccess, jsonWithApiMeta, startApiRequest } from '@/lib/utils/apiObservability';

const supabase = createSupabaseAdminClient();

const ALLOWED_EVENTS = new Set([
  'planner_guide_map_opened',
  'planner_guide_dashboard_clicked',
]);

export async function POST(request: NextRequest) {
  const requestContext = startApiRequest('/api/planner/export/engagement', 'POST');

  try {
    const body = (await request.json()) as {
      shareToken?: string;
      eventName?: string;
      payload?: Record<string, unknown>;
    };

    const shareToken = typeof body.shareToken === 'string' ? body.shareToken.trim() : '';
    const eventName = typeof body.eventName === 'string' ? body.eventName.trim() : '';

    if (!shareToken || !ALLOWED_EVENTS.has(eventName)) {
      apiFailure(requestContext, 400, 'Invalid engagement event', { stage: 'validation' });
      return jsonWithApiMeta(requestContext, { success: false, error: 'Invalid engagement event' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('planner_exports')
      .select('user_id, share_token, revoked_at, expires_at')
      .eq('share_token', shareToken)
      .single();

    if (error || !data?.user_id || data.revoked_at || new Date(data.expires_at).getTime() <= Date.now()) {
      apiFailure(requestContext, 404, error || 'Share link unavailable', { stage: 'fetch_export' });
      return jsonWithApiMeta(requestContext, { success: false, error: 'Share link unavailable' }, { status: 404 });
    }

    const { error: insertError } = await supabase.from('planner_analytics').insert({
      user_id: data.user_id,
      event_name: eventName,
      event_payload: {
        shareToken: data.share_token,
        ...(body.payload ?? {}),
      },
    });

    if (insertError) {
      apiFailure(requestContext, 500, insertError, { stage: 'insert_analytics' });
      return jsonWithApiMeta(requestContext, { success: false, error: 'Failed to track engagement' }, { status: 500 });
    }

    apiSuccess(requestContext, 200, { eventName });
    return jsonWithApiMeta(requestContext, { success: true });
  } catch (error) {
    apiFailure(requestContext, 500, error, { stage: 'unhandled' });
    return jsonWithApiMeta(requestContext, { success: false, error: 'Failed to track engagement' }, { status: 500 });
  }
}
