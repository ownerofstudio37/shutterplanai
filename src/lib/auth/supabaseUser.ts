import type { User as SupabaseAuthUser } from '@supabase/supabase-js';
import type { User } from '@/types';
import { createSupabaseAdminClient } from '@/lib/supabase/server';

interface UserProfileRow {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'user' | 'guest';
  created_at: string;
  updated_at: string;
}

function getNameFromAuthUser(authUser: SupabaseAuthUser): string {
  const metadataName = authUser.user_metadata?.name;

  if (typeof metadataName === 'string' && metadataName.trim().length > 0) {
    return metadataName;
  }

  return authUser.email?.split('@')[0] ?? 'User';
}

export function toAppUser(authUser: SupabaseAuthUser, profile?: UserProfileRow | null): User {
  const role = profile?.role ?? 'user';

  return {
    id: authUser.id,
    email: authUser.email ?? profile?.email ?? '',
    name: profile?.name ?? getNameFromAuthUser(authUser),
    role,
    createdAt: new Date(profile?.created_at ?? authUser.created_at ?? Date.now()),
    updatedAt: new Date(profile?.updated_at ?? Date.now()),
  };
}

export async function ensureUserProfile(authUser: SupabaseAuthUser): Promise<UserProfileRow | null> {
  const admin = createSupabaseAdminClient();

  const payload = {
    id: authUser.id,
    email: authUser.email ?? '',
    name: getNameFromAuthUser(authUser),
    role: 'user' as const,
  };

  const { error } = await admin.from('users').upsert(payload, { onConflict: 'id' });

  if (error) {
    return null;
  }

  const { data: profile } = await admin
    .from('users')
    .select('id, email, name, role, created_at, updated_at')
    .eq('id', authUser.id)
    .single<UserProfileRow>();

  return profile ?? null;
}
