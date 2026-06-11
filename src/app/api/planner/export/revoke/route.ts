import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/serverAuth';
import { createSupabaseAdminClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  const authResult = await requireAuth(request);
  if (!authResult.success) {
    return NextResponse.json({ success: false, error: authResult.error }, { status: authResult.status });
  }

  try {
    const body = (await request.json()) as { shareToken?: string };
    const shareToken = body.shareToken?.trim();

    if (!shareToken) {
      return NextResponse.json({ success: false, error: 'shareToken is required' }, { status: 400 });
    }

    const admin = createSupabaseAdminClient();
    const { data, error } = await admin
      .from('planner_exports')
      .update({
        revoked_at: new Date().toISOString(),
        revoked_by: authResult.userId,
        updated_at: new Date().toISOString(),
      })
      .eq('share_token', shareToken)
      .eq('user_id', authResult.userId)
      .is('revoked_at', null)
      .select('id');

    if (error) {
      return NextResponse.json({ success: false, error: 'Failed to revoke share link' }, { status: 500 });
    }

    if (!data || data.length === 0) {
      return NextResponse.json({ success: false, error: 'Share link not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false, error: 'Failed to revoke share link' }, { status: 500 });
  }
}
