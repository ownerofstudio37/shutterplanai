import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/serverAuth';
import { generateSessionPlan, SessionPlanLocation, SessionPlanShot } from '@/lib/ai/gemini';

type RegenerationType = 'shot-list' | 'timeline';

interface RegenerateRequest {
  type: RegenerationType;
  currentPlan: {
    locationSuggestions: SessionPlanLocation[];
    shotList: SessionPlanShot[];
    timeline: Array<{ timeBlock: string; focus: string; notes: string }>;
  };
  sessionInputs: {
    shootType: string;
    subjectDetails: string;
    city: string;
    duration: string;
    mood: string;
    mustHaveShots?: string;
    constraints?: string;
  };
}

interface RegenerateResponse {
  success: boolean;
  data?: {
    shotList?: SessionPlanShot[];
    timeline?: Array<{ timeBlock: string; focus: string; notes: string }>;
  };
  error?: string;
}

export async function POST(request: NextRequest): Promise<NextResponse<RegenerateResponse>> {
  const authResult = await requireAuth(request);
  if (!authResult.success) {
    return NextResponse.json(
      { success: false, error: authResult.error },
      { status: authResult.status }
    );
  }

  try {
    const body = (await request.json()) as RegenerateRequest;

    if (!body.type || !['shot-list', 'timeline'].includes(body.type)) {
      return NextResponse.json(
        { success: false, error: 'Invalid regeneration type. Supported: shot-list, timeline' },
        { status: 400 }
      );
    }

    // For shot-list and timeline regeneration: re-generate with same locations
    try {
      // Note: We DON'T pass locationCandidates, so the plan will be regenerated fresh,
      // but we only use the shot list or timeline from it
      const newPlan = await generateSessionPlan({
        shootType: body.sessionInputs.shootType,
        subjectDetails: body.sessionInputs.subjectDetails,
        city: body.sessionInputs.city,
        duration: body.sessionInputs.duration,
        mood: body.sessionInputs.mood,
        mustHaveShots: body.sessionInputs.mustHaveShots,
        constraints: body.sessionInputs.constraints,
      });

      // Return only what was requested
      const responseData: { shotList?: SessionPlanShot[]; timeline?: Array<{ timeBlock: string; focus: string; notes: string }> } = {};
      
      if (body.type === 'shot-list') {
        responseData.shotList = newPlan.shotList;
      } else if (body.type === 'timeline') {
        responseData.timeline = newPlan.timeline;
      }

      return NextResponse.json(
        {
          success: true,
          data: responseData,
        },
        { status: 200 }
      );
    } catch (error) {
      console.error(`${body.type} regeneration error:`, error);
      return NextResponse.json(
        { success: false, error: `Failed to regenerate ${body.type}` },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Section regeneration error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to regenerate section',
      },
      { status: 500 }
    );
  }
}
