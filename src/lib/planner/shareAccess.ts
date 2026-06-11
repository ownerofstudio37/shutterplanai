import crypto from 'crypto';
import type { createSupabaseAdminClient } from '@/lib/supabase/server';

type SupabaseAdminClient = ReturnType<typeof createSupabaseAdminClient>;

export type SharedGuideRow = {
  plan_data: unknown;
  metadata: unknown;
  expires_at: string | null;
  revoked_at: string | null;
  password_hash: string | null;
  password_salt: string | null;
  user_id: string | null;
  share_token: string;
};

export type SharedGuideAccessResult =
  | {
      success: true;
      data: {
        plan_data: unknown;
        metadata: unknown;
      };
      passwordProtected: boolean;
    }
  | {
      success: false;
      status: number;
      error: string;
      requiresPassword?: boolean;
      stage: string;
      cause?: unknown;
    };

export function hashSharePassword(password: string, salt: string) {
  return crypto.scryptSync(password, salt, 64).toString('hex');
}

export function verifySharePassword(password: string, salt: string, expectedHash: string) {
  const actual = hashSharePassword(password, salt);
  const actualBuffer = Buffer.from(actual, 'hex');
  const expectedBuffer = Buffer.from(expectedHash, 'hex');

  if (actualBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(actualBuffer, expectedBuffer);
}

export async function getSharedGuidePlan(input: {
  supabase: SupabaseAdminClient;
  token: string;
  password?: string;
  allowPasswordCheck: boolean;
}): Promise<SharedGuideAccessResult> {
  const { data: row, error } = await input.supabase
    .from('planner_exports')
    .select('plan_data, metadata, expires_at, revoked_at, password_hash, password_salt, user_id, share_token')
    .eq('share_token', input.token)
    .single();
  const data = row as SharedGuideRow | null;

  if (error || !data || !data.expires_at) {
    return {
      success: false,
      status: 404,
      error: 'Plan not found or expired',
      stage: 'fetch_export',
      cause: error,
    };
  }

  if (data.revoked_at) {
    return {
      success: false,
      status: 410,
      error: 'Share link has been revoked',
      stage: 'revoked',
    };
  }

  if (new Date(data.expires_at).getTime() <= Date.now()) {
    return {
      success: false,
      status: 404,
      error: 'Plan not found or expired',
      stage: 'expired',
    };
  }

  if (data.password_hash) {
    if (!input.allowPasswordCheck || !input.password) {
      return {
        success: false,
        status: 401,
        error: 'Password required',
        requiresPassword: true,
        stage: 'password_required',
      };
    }

    if (!data.password_salt || !verifySharePassword(input.password, data.password_salt, data.password_hash)) {
      return {
        success: false,
        status: 401,
        error: 'Invalid password',
        requiresPassword: true,
        stage: 'password_invalid',
      };
    }
  }

  if (data.user_id) {
    await input.supabase.from('planner_analytics').insert({
      user_id: data.user_id,
      event_name: 'planner_guide_viewed',
      event_payload: {
        shareToken: data.share_token,
        passwordProtected: !!data.password_hash,
      },
    });
  }

  return {
    success: true,
    passwordProtected: !!data.password_hash,
    data: {
      plan_data: data.plan_data,
      metadata: data.metadata,
    },
  };
}
