import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/serverAuth';
import { createSupabaseAdminClient } from '@/lib/supabase/server';
import { generateShotSuggestions } from '@/lib/ai/gemini';
import { getBillingUsageForUser } from '@/lib/billing/serverUsage';
import { hasReachedLimit } from '@/lib/billing/planLimits';
import { checkRateLimit, rateLimitResponse } from '@/lib/security/rateLimit';
import { logSecurityEvent } from '@/lib/security/auditLog';

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (!auth.success) {
      logSecurityEvent({ route: '/api/ai/shot-suggestions', event: 'auth_failed', status: auth.status });
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const rateLimit = checkRateLimit({
      key: `shot-suggestions:${auth.userId}`,
      limit: 30,
      windowMs: 10 * 60 * 1000,
    });
    if (!rateLimit.success) {
      logSecurityEvent({ route: '/api/ai/shot-suggestions', event: 'rate_limited', userId: auth.userId, status: 429 });
      return rateLimitResponse(rateLimit);
    }

    const billingUsage = await getBillingUsageForUser(auth.userId);
    if (hasReachedLimit(billingUsage.usage.plannerGenerations, billingUsage.limits.plannerGenerations)) {
      return NextResponse.json(
        {
          success: false,
          code: 'PLAN_LIMIT_REACHED',
          error: 'You have used all 3 free AI plans. Upgrade to Pro for unlimited AI shot suggestions.',
          usage: billingUsage,
        },
        { status: 402 }
      );
    }

    const { projectId, creativeBrief } = await request.json();

    if (!projectId || typeof projectId !== 'string') {
      return NextResponse.json({ success: false, error: 'Project id is required' }, { status: 400 });
    }

    const admin = createSupabaseAdminClient();
    const { data: project, error: projectError } = await admin
      .from('projects')
      .select('id, title, description, status')
      .eq('id', projectId)
      .eq('user_id', auth.userId)
      .single();

    if (projectError || !project) {
      return NextResponse.json({ success: false, error: 'Project not found' }, { status: 404 });
    }

    const { data: existingShots, error: shotsError } = await admin
      .from('shots')
      .select('title, description, location, status')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
      .limit(20);

    if (shotsError) {
      return NextResponse.json({ success: false, error: shotsError.message }, { status: 400 });
    }

    const suggestions = await generateShotSuggestions({
      project,
      existingShots: existingShots ?? [],
      creativeBrief: typeof creativeBrief === 'string' ? creativeBrief : undefined,
    });

    return NextResponse.json(
      {
        success: true,
        data: suggestions,
        isUsingFallback: suggestions.length > 0 && !process.env.GEMINI_API_KEY,
      },
      { status: 200 }
    );
  } catch (error) {
    logSecurityEvent({
      route: '/api/ai/shot-suggestions',
      event: 'provider_or_route_failed',
      status: 500,
      detail: error instanceof Error ? error.name : 'unknown',
    });
    const message = error instanceof Error ? error.message : 'Failed to generate shot suggestions';
    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 500 }
    );
  }
}
