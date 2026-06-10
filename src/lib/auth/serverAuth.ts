import { NextRequest } from 'next/server';
import { ensureUserProfile, toAppUser } from '@/lib/auth/supabaseUser';
import { createSupabaseAdminClient } from '@/lib/supabase/server';

type AuthSuccess = {
  success: true;
  token: string;
  userId: string;
};

type AuthFailure = {
  success: false;
  status: number;
  error: string;
};

export async function requireAuth(request: NextRequest): Promise<AuthSuccess | AuthFailure> {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return { success: false, status: 401, error: 'Missing auth token' };
  }

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.auth.getUser(token);

  if (error || !data.user) {
    return { success: false, status: 401, error: 'Invalid or expired session' };
  }

  await ensureUserProfile(data.user);
  const user = toAppUser(data.user);

  return { success: true, token, userId: user.id };
}
