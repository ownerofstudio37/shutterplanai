import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/serverAuth';
import { generateSessionPlan } from '@/lib/ai/gemini';

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (!auth.success) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const payload = await request.json();

    if (!payload?.shootType || typeof payload.shootType !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Shoot type is required' },
        { status: 400 }
      );
    }

    const plan = await generateSessionPlan({
      shootType: payload.shootType,
      subjectDetails: typeof payload.subjectDetails === 'string' ? payload.subjectDetails : '',
      city: typeof payload.city === 'string' ? payload.city : '',
      shootDate: typeof payload.shootDate === 'string' ? payload.shootDate : undefined,
      mood: typeof payload.mood === 'string' ? payload.mood : 'natural',
      mustHaveShots: typeof payload.mustHaveShots === 'string' ? payload.mustHaveShots : undefined,
      constraints: typeof payload.constraints === 'string' ? payload.constraints : undefined,
    });

    return NextResponse.json({ success: true, data: plan }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate session plan',
      },
      { status: 500 }
    );
  }
}
