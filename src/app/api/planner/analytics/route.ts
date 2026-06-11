import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/serverAuth';
import { createSupabaseAdminClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  const authResult = await requireAuth(request);
  if (!authResult.success) {
    return NextResponse.json({ success: false, error: authResult.error }, { status: authResult.status });
  }

  try {
    const body = (await request.json()) as {
      eventName?: string;
      payload?: Record<string, unknown>;
    };

    if (!body.eventName) {
      return NextResponse.json({ success: false, error: 'eventName is required' }, { status: 400 });
    }

    const admin = createSupabaseAdminClient();
    const { error } = await admin.from('planner_analytics').insert({
      user_id: authResult.userId,
      event_name: body.eventName,
      event_payload: body.payload || {},
    });

    if (error) {
      return NextResponse.json({ success: false, error: 'Failed to store analytics event' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false, error: 'Failed to store analytics event' }, { status: 500 });
  }
}
