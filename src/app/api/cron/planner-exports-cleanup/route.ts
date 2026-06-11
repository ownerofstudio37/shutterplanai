import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/server';

function isAuthorized(request: NextRequest) {
  const secret = process.env.PLANNER_EXPORT_CLEANUP_SECRET;
  if (!secret) return true;

  const bearer = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  const headerSecret = request.headers.get('x-cron-secret');
  return bearer === secret || headerSecret === secret;
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const admin = createSupabaseAdminClient();
    const { error } = await admin.rpc('cleanup_expired_exports');

    if (error) {
      return NextResponse.json({ success: false, error: 'Cleanup failed' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false, error: 'Cleanup failed' }, { status: 500 });
  }
}
