import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/serverAuth';
import { refineSessionPlan, SessionPlan } from '@/lib/ai/gemini';
import { getBillingUsageForUser } from '@/lib/billing/serverUsage';
import { hasReachedLimit } from '@/lib/billing/planLimits';
import { checkRateLimit, rateLimitResponse } from '@/lib/security/rateLimit';
import { logSecurityEvent } from '@/lib/security/auditLog';

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (!auth.success) {
      logSecurityEvent({ route: '/api/ai/session-plan/refine', event: 'auth_failed', status: auth.status });
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const rateLimit = checkRateLimit({
      key: `session-refine:${auth.userId}`,
      limit: 30,
      windowMs: 10 * 60 * 1000,
    });
    if (!rateLimit.success) {
      logSecurityEvent({ route: '/api/ai/session-plan/refine', event: 'rate_limited', userId: auth.userId, status: 429 });
      return rateLimitResponse(rateLimit);
    }

    const billingUsage = await getBillingUsageForUser(auth.userId);
    if (hasReachedLimit(billingUsage.usage.plannerGenerations, billingUsage.limits.plannerGenerations)) {
      return NextResponse.json(
        {
          success: false,
          code: 'PLAN_LIMIT_REACHED',
          error: 'You have used all 3 free AI plans. Upgrade to Pro for unlimited shoot planning and refinements.',
          usage: billingUsage,
        },
        { status: 402 }
      );
    }

    const payload = await request.json();
    const plan = payload?.plan as SessionPlan | undefined;

    if (!plan || !Array.isArray(plan.locationSuggestions) || !Array.isArray(plan.shotList)) {
      return NextResponse.json(
        { success: false, error: 'Valid plan payload is required for refinement' },
        { status: 400 }
      );
    }

    const refinement = await refineSessionPlan({
      plan,
      subjectDetails: typeof payload.subjectDetails === 'string' ? payload.subjectDetails : undefined,
      mood: typeof payload.mood === 'string' ? payload.mood : undefined,
      constraints: typeof payload.constraints === 'string' ? payload.constraints : undefined,
    });

    return NextResponse.json({ success: true, data: refinement }, { status: 200 });
  } catch (error) {
    logSecurityEvent({
      route: '/api/ai/session-plan/refine',
      event: 'provider_or_route_failed',
      status: 500,
      detail: error instanceof Error ? error.name : 'unknown',
    });
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to refine session plan',
      },
      { status: 500 }
    );
  }
}
