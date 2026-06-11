import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/serverAuth';
import { createSupabaseAdminClient } from '@/lib/supabase/server';

interface DraftPlan {
  id: string;
  planState: {
    shootType: string;
    city: string;
    duration: string;
    mood: string;
    subjectDetails: string;
    mustHaveShots: string;
    constraints: string;
    locationMode: 'find-locations' | 'use-provided';
    providedLocations: string;
    familyPacing?: string;
    engagementStory?: string;
    brandingGoals?: string;
    eventPriorities?: string;
    shootDate?: string;
  };
  createdAt: string;
  updatedAt: string;
  status: 'intake' | 'review' | 'applying';
}

export async function POST(request: NextRequest) {
  const authResult = await requireAuth(request);
  if (!authResult.success) {
    return NextResponse.json({ success: false, error: authResult.error }, { status: authResult.status });
  }

  try {
    const body = (await request.json()) as { draftPlan: DraftPlan };
    const admin = createSupabaseAdminClient();

    // Upsert draft (save or update)
    const { error } = await admin
      .from('planner_drafts')
      .upsert(
        {
          id: body.draftPlan.id,
          user_id: authResult.userId,
          plan_state: body.draftPlan.planState,
          status: body.draftPlan.status,
          created_at: body.draftPlan.createdAt,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id,user_id' }
      );

    if (error) {
      console.error('Draft save error:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to save draft' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { success: true, data: { draftId: body.draftPlan.id } },
      { status: 200 }
    );
  } catch (error) {
    console.error('Draft endpoint error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to save draft' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const authResult = await requireAuth(request);
  if (!authResult.success) {
    return NextResponse.json({ success: false, error: authResult.error }, { status: authResult.status });
  }

  try {
    const admin = createSupabaseAdminClient();

    // Get all drafts for user
    const { data, error } = await admin
      .from('planner_drafts')
      .select('*')
      .eq('user_id', authResult.userId)
      .order('updated_at', { ascending: false })
      .limit(10);

    if (error) {
      console.error('Draft retrieval error:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch drafts' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { success: true, data: data || [] },
      { status: 200 }
    );
  } catch (error) {
    console.error('Draft GET error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch drafts' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const authResult = await requireAuth(request);
  if (!authResult.success) {
    return NextResponse.json({ success: false, error: authResult.error }, { status: authResult.status });
  }

  try {
    const { searchParams } = new URL(request.url);
    const draftId = searchParams.get('id');

    if (!draftId) {
      return NextResponse.json({ success: false, error: 'Draft ID required' }, { status: 400 });
    }

    const admin = createSupabaseAdminClient();

    const { error } = await admin
      .from('planner_drafts')
      .delete()
      .eq('id', draftId)
      .eq('user_id', authResult.userId);

    if (error) {
      return NextResponse.json(
        { success: false, error: 'Failed to delete draft' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Draft delete error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete draft' },
      { status: 500 }
    );
  }
}
