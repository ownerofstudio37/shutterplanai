import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/serverAuth';
import { generateSessionPlan, SessionPlan } from '@/lib/ai/gemini';
import { geocodeLocations } from '@/lib/geo/geocode';

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

    const plan: SessionPlan = await generateSessionPlan({
      shootType: payload.shootType,
      subjectDetails: typeof payload.subjectDetails === 'string' ? payload.subjectDetails : '',
      city: typeof payload.city === 'string' ? payload.city : '',
      shootDate: typeof payload.shootDate === 'string' ? payload.shootDate : undefined,
      mood: typeof payload.mood === 'string' ? payload.mood : 'natural',
      mustHaveShots: typeof payload.mustHaveShots === 'string' ? payload.mustHaveShots : undefined,
      constraints: typeof payload.constraints === 'string' ? payload.constraints : undefined,
    });

    const enrichedLocations = await geocodeLocations(
      plan.locationSuggestions ?? [],
      typeof payload.city === 'string' ? payload.city : undefined
    );

    const locationByName = new Map(
      enrichedLocations.map(location => [location.name.toLowerCase(), location])
    );

    const enrichedShotList = (plan.shotList ?? []).map(shot => {
      const match = locationByName.get((shot.location ?? '').toLowerCase());
      return {
        ...shot,
        latitude: match?.latitude ?? null,
        longitude: match?.longitude ?? null,
        geocodedLocationName: match?.displayName ?? null,
      };
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          ...plan,
          locationSuggestions: enrichedLocations,
          shotList: enrichedShotList,
        },
      },
      { status: 200 }
    );
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
