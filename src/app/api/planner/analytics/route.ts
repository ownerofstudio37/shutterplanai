import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/serverAuth';
import { createSupabaseAdminClient } from '@/lib/supabase/server';
import { apiFailure, apiSuccess, jsonWithApiMeta, startApiRequest } from '@/lib/utils/apiObservability';

export interface PlannerAnalyticsSummary {
  generate: { total: number; success: number; failed: number; successRate: number };
  refine: { total: number; success: number; failed: number };
  apply: { total: number; success: number; failed: number };
  shareLinksCreated: number;
  draftsResumed: number;
  routesOptimized: number;
}

export async function GET(request: NextRequest) {
  const requestContext = startApiRequest('/api/planner/analytics', 'GET');
  const authResult = await requireAuth(request);
  if (!authResult.success) {
    apiFailure(requestContext, authResult.status, authResult.error, { stage: 'auth' });
    return jsonWithApiMeta(requestContext, { success: false, error: authResult.error }, { status: authResult.status });
  }

  try {
    const admin = createSupabaseAdminClient();
    const { data, error } = await admin
      .from('planner_analytics')
      .select('event_name')
      .eq('user_id', authResult.userId);

    if (error) {
      apiFailure(requestContext, 500, error, { stage: 'query_analytics' });
      return jsonWithApiMeta(requestContext, { success: false, error: 'Failed to load analytics' }, { status: 500 });
    }

    const counts: Record<string, number> = {};
    for (const row of data ?? []) {
      counts[row.event_name] = (counts[row.event_name] ?? 0) + 1;
    }

    const generateSuccess = counts['planner_generate_success'] ?? 0;
    const generateFailed = counts['planner_generate_failed'] ?? 0;
    const generateTotal = generateSuccess + generateFailed;

    const refineSuccess = counts['planner_refine_success'] ?? 0;
    const refineFailed = counts['planner_refine_failed'] ?? 0;

    const applySuccess = counts['planner_apply_success'] ?? 0;
    const applyFailed = counts['planner_apply_failed'] ?? 0;

    const summary: PlannerAnalyticsSummary = {
      generate: {
        total: generateTotal,
        success: generateSuccess,
        failed: generateFailed,
        successRate: generateTotal === 0 ? 0 : Math.round((generateSuccess / generateTotal) * 100),
      },
      refine: {
        total: refineSuccess + refineFailed,
        success: refineSuccess,
        failed: refineFailed,
      },
      apply: {
        total: applySuccess + applyFailed,
        success: applySuccess,
        failed: applyFailed,
      },
      shareLinksCreated: counts['planner_share_link_created'] ?? 0,
      draftsResumed: counts['planner_draft_resumed'] ?? 0,
      routesOptimized: counts['planner_route_optimized'] ?? 0,
    };

    apiSuccess(requestContext, 200, { eventCount: data?.length ?? 0 });
    return jsonWithApiMeta(requestContext, { success: true, data: summary });
  } catch (error) {
    apiFailure(requestContext, 500, error, { stage: 'unhandled' });
    return jsonWithApiMeta(requestContext, { success: false, error: 'Failed to load analytics' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const requestContext = startApiRequest('/api/planner/analytics', 'POST');
  const authResult = await requireAuth(request);
  if (!authResult.success) {
    apiFailure(requestContext, authResult.status, authResult.error, { stage: 'auth' });
    return jsonWithApiMeta(requestContext, { success: false, error: authResult.error }, { status: authResult.status });
  }

  try {
    const body = (await request.json()) as {
      eventName?: string;
      payload?: Record<string, unknown>;
    };

    if (!body.eventName) {
      apiFailure(requestContext, 400, 'eventName is required', { stage: 'validation' });
      return jsonWithApiMeta(requestContext, { success: false, error: 'eventName is required' }, { status: 400 });
    }

    const admin = createSupabaseAdminClient();
    const { error } = await admin.from('planner_analytics').insert({
      user_id: authResult.userId,
      event_name: body.eventName,
      event_payload: body.payload || {},
    });

    if (error) {
      apiFailure(requestContext, 500, error, { stage: 'insert_analytics', eventName: body.eventName });
      return jsonWithApiMeta(requestContext, { success: false, error: 'Failed to store analytics event' }, { status: 500 });
    }

    apiSuccess(requestContext, 200, { eventName: body.eventName });
    return jsonWithApiMeta(requestContext, { success: true });
  } catch (error) {
    apiFailure(requestContext, 500, error, { stage: 'unhandled' });
    return jsonWithApiMeta(requestContext, { success: false, error: 'Failed to store analytics event' }, { status: 500 });
  }
}
