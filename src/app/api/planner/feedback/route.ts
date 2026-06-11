import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/serverAuth';
import { createSupabaseAdminClient } from '@/lib/supabase/server';

type LocationVote = 'up' | 'down';

interface PlannerFeedbackRequest {
  planId?: string;
  sessionId?: string;
  locationVotes: Record<string, LocationVote>;
  preferredVenueBucket?: string;
  excludedVenueBuckets: string[];
  applied: boolean;
  planMetadata?: {
    sessionCategory?: string;
    city?: string;
    duration?: string;
    shootType?: string;
  };
}

interface StoredLocationFeedback {
  location_name: string;
  vote: LocationVote;
  venue_bucket?: string;
  confidence_score?: number;
}

export async function POST(request: NextRequest) {
  const authResult = await requireAuth(request);
  if (!authResult.success) {
    return NextResponse.json({ success: false, error: authResult.error }, { status: authResult.status });
  }

  const userId = authResult.userId;

  try {
    const body = (await request.json()) as PlannerFeedbackRequest;

    const admin = createSupabaseAdminClient();

    // Generate plan ID if not provided (fallback to session ID + timestamp)
    const planId = body.planId || `plan-${body.sessionId || 'temp'}-${Date.now()}`;

    // Store location votes
    if (Object.keys(body.locationVotes).length > 0) {
      const locationFeedback: StoredLocationFeedback[] = Object.entries(body.locationVotes).map(
        ([locationName, vote]) => ({
          location_name: locationName,
          vote,
          venue_bucket: body.preferredVenueBucket,
        })
      );

      // Insert feedback into feedback table (will create if doesn't exist)
      // Using upsert with plan_id + user_id + location_name as key
      for (const feedback of locationFeedback) {
        await admin
          .from('planner_location_feedback')
          .upsert(
            {
              user_id: userId,
              plan_id: planId,
              location_name: feedback.location_name,
              venue_bucket: feedback.venue_bucket,
              vote: feedback.vote,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'user_id,plan_id,location_name' }
          );
      }
    }

    // Store excluded venue buckets
    if (body.excludedVenueBuckets.length > 0) {
      const excludedFeedback = body.excludedVenueBuckets.map((bucket: string) => ({
        user_id: userId,
        plan_id: planId,
        venue_bucket: bucket,
        vote: 'down' as const,
        location_name: `[bucket-exclude] ${bucket}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }));

      for (const feedback of excludedFeedback) {
        await admin
          .from('planner_location_feedback')
          .upsert(feedback, { onConflict: 'user_id,plan_id,location_name' });
      }
    }

    // Store plan application outcome
    if (body.applied) {
      await admin
        .from('planner_applications')
        .insert({
          user_id: userId,
          plan_id: planId,
          session_category: body.planMetadata?.sessionCategory,
          city: body.planMetadata?.city,
          duration: body.planMetadata?.duration,
          shoot_type: body.planMetadata?.shootType,
          location_vote_count: Object.keys(body.locationVotes).length,
          excluded_bucket_count: body.excludedVenueBuckets.length,
          created_at: new Date().toISOString(),
        });
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          planId,
          feedbackStored: true,
          votesCount: Object.keys(body.locationVotes).length,
          excludedBucketsCount: body.excludedVenueBuckets.length,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Planner feedback error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to store feedback',
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const authResult = await requireAuth(request);
  if (!authResult.success) {
    return NextResponse.json({ success: false, error: authResult.error }, { status: authResult.status });
  }

  const userId = authResult.userId;

  try {
    const admin = createSupabaseAdminClient();

    // Get recent feedback for analytics/improvement
    const { data: recentFeedback } = await admin
      .from('planner_location_feedback')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(100);

    const { data: recentApplications } = await admin
      .from('planner_applications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20);

    return NextResponse.json(
      {
        success: true,
        data: {
          recentFeedback: recentFeedback || [],
          recentApplications: recentApplications || [],
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Planner feedback retrieval error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to retrieve feedback',
      },
      { status: 500 }
    );
  }
}
