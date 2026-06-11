import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { requireAuth } from '@/lib/auth/serverAuth';
import { createSupabaseAdminClient } from '@/lib/supabase/server';

const supabase = createSupabaseAdminClient();

function hashSharePassword(password: string, salt: string) {
  return crypto.scryptSync(password, salt, 64).toString('hex');
}

function verifySharePassword(password: string, salt: string, expectedHash: string) {
  const actual = hashSharePassword(password, salt);
  const actualBuffer = Buffer.from(actual, 'hex');
  const expectedBuffer = Buffer.from(expectedHash, 'hex');

  if (actualBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(actualBuffer, expectedBuffer);
}

export async function POST(request: NextRequest) {
  const authResult = await requireAuth(request);
  if (!authResult.success) {
    return NextResponse.json({ success: false, error: authResult.error }, { status: authResult.status });
  }

  try {
    const body = await request.json();
    const { plan, planMetadata, sharePassword, expiresInDays } = body as {
      plan: Record<string, unknown>;
      planMetadata: Record<string, unknown>;
      sharePassword?: string;
      expiresInDays?: number;
    };

    if (!plan || typeof plan !== 'object') {
      return NextResponse.json({ success: false, error: 'plan is required' }, { status: 400 });
    }

    const normalizedDays = Number.isFinite(expiresInDays)
      ? Math.min(90, Math.max(1, Math.round(expiresInDays as number)))
      : 30;

    const normalizedPassword = typeof sharePassword === 'string' ? sharePassword.trim() : '';
    if (normalizedPassword && normalizedPassword.length < 6) {
      return NextResponse.json(
        { success: false, error: 'Share password must be at least 6 characters' },
        { status: 400 }
      );
    }

    const shareToken = crypto.randomBytes(12).toString('hex');
    const expiresAt = new Date(Date.now() + normalizedDays * 24 * 60 * 60 * 1000);
    const passwordSalt = normalizedPassword ? crypto.randomBytes(16).toString('hex') : null;
    const passwordHash = normalizedPassword && passwordSalt ? hashSharePassword(normalizedPassword, passwordSalt) : null;

    const { error } = await supabase.from('planner_exports').insert({
      user_id: authResult.userId,
      share_token: shareToken,
      plan_data: plan,
      metadata: planMetadata,
      password_salt: passwordSalt,
      password_hash: passwordHash,
      expires_at: expiresAt.toISOString(),
      created_at: new Date().toISOString(),
    });

    if (error) throw error;

    const shareUrl = `${process.env.NEXT_PUBLIC_APP_URL}/plans/${shareToken}`;

    return NextResponse.json({
      success: true,
      shareUrl,
      shareToken,
      expiresAt: expiresAt.toISOString(),
      passwordProtected: !!normalizedPassword,
    });
  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json({ success: false, error: 'Failed to create share link' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');
    const password = searchParams.get('password')?.trim() || '';

    if (!token) {
      return NextResponse.json({ error: 'Missing token' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('planner_exports')
      .select('plan_data, metadata, expires_at, revoked_at, password_hash, password_salt')
      .eq('share_token', token)
      .single();

    if (error || !data || !data.expires_at) {
      return NextResponse.json({ error: 'Plan not found or expired' }, { status: 404 });
    }

    if (data.revoked_at) {
      return NextResponse.json({ error: 'Share link has been revoked' }, { status: 410 });
    }

    if (new Date(data.expires_at).getTime() <= Date.now()) {
      return NextResponse.json({ error: 'Plan not found or expired' }, { status: 404 });
    }

    if (data.password_hash) {
      if (!password) {
        return NextResponse.json({ error: 'Password required', requiresPassword: true }, { status: 401 });
      }

      if (!data.password_salt || !verifySharePassword(password, data.password_salt, data.password_hash)) {
        return NextResponse.json({ error: 'Invalid password', requiresPassword: true }, { status: 401 });
      }
    }

    return NextResponse.json({
      plan_data: data.plan_data,
      metadata: data.metadata,
    });
  } catch (error) {
    console.error('Share fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch plan' }, { status: 500 });
  }
}
