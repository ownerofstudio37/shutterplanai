import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/server';
import { ensureUserProfile, toAppUser } from '@/lib/auth/supabaseUser';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Missing auth token' },
        { status: 401 }
      );
    }

    const admin = createSupabaseAdminClient();
    const { data, error } = await admin.auth.getUser(token);

    if (error || !data.user) {
      return NextResponse.json(
        { success: false, error: 'Invalid or expired session' },
        { status: 401 }
      );
    }

    const profile = await ensureUserProfile(data.user);
    return NextResponse.json({ success: true, data: toAppUser(data.user, profile) }, { status: 200 });
  } catch {
    return NextResponse.json(
      { success: false, error: 'Session check failed' },
      { status: 500 }
    );
  }
}