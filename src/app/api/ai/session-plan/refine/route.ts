import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/serverAuth';
import { refineSessionPlan, SessionPlan } from '@/lib/ai/gemini';

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (!auth.success) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
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
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to refine session plan',
      },
      { status: 500 }
    );
  }
}
