import { NextRequest } from 'next/server';
import crypto from 'crypto';
import { requireAuth } from '@/lib/auth/serverAuth';
import { createSupabaseAdminClient } from '@/lib/supabase/server';
import { apiFailure, apiSuccess, jsonWithApiMeta, startApiRequest } from '@/lib/utils/apiObservability';
import { getBillingUsageForUser } from '@/lib/billing/serverUsage';
import { hasReachedLimit } from '@/lib/billing/planLimits';
import { getSharedGuidePlan, hashSharePassword } from '@/lib/planner/shareAccess';

const supabase = createSupabaseAdminClient();

type GuideBranding = {
  studioName?: string;
  logoUrl?: string;
  primaryColor?: string;
  accentColor?: string;
  websiteUrl?: string;
};

function normalizeHexColor(value: unknown) {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return /^#[0-9a-f]{6}$/i.test(trimmed) ? trimmed : undefined;
}

function toTrimmedString(value: unknown, maxLength = 300) {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, maxLength) : undefined;
}

function normalizeUrl(value: unknown) {
  const input = toTrimmedString(value, 300);
  if (!input) return undefined;
  const withProtocol = /^https?:\/\//i.test(input) ? input : `https://${input}`;

  try {
    const url = new URL(withProtocol);
    if (!['http:', 'https:'].includes(url.protocol)) return undefined;
    return url.toString();
  } catch {
    return undefined;
  }
}

async function getGuideBrandingForUser(userId: string): Promise<GuideBranding> {
  const { data } = await supabase.auth.admin.getUserById(userId);
  const profile = (data?.user?.user_metadata?.businessProfile ?? {}) as Record<string, unknown>;

  return {
    studioName: toTrimmedString(profile.businessName, 120),
    logoUrl: normalizeUrl(profile.guideLogoUrl),
    primaryColor: normalizeHexColor(profile.guidePrimaryColor) || '#1f2933',
    accentColor: normalizeHexColor(profile.guideAccentColor) || '#d8d2c8',
    websiteUrl: normalizeUrl(profile.websiteUrl),
  };
}

export async function POST(request: NextRequest) {
  const requestContext = startApiRequest('/api/planner/export', 'POST');
  const authResult = await requireAuth(request);
  if (!authResult.success) {
    apiFailure(requestContext, authResult.status, authResult.error, { stage: 'auth' });
    return jsonWithApiMeta(requestContext, { success: false, error: authResult.error }, { status: authResult.status });
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
      apiFailure(requestContext, 400, 'plan is required', { stage: 'validation' });
      return jsonWithApiMeta(requestContext, { success: false, error: 'plan is required' }, { status: 400 });
    }

    const billingUsage = await getBillingUsageForUser(authResult.userId);
    if (hasReachedLimit(billingUsage.usage.shareLinks, billingUsage.limits.shareLinks)) {
      apiFailure(requestContext, 402, 'Share link limit reached', { stage: 'billing_gate' });
      return jsonWithApiMeta(
        requestContext,
        {
          success: false,
          code: 'PLAN_LIMIT_REACHED',
          error: 'You have used your free client guide link. Upgrade to Pro for unlimited client exports.',
          usage: billingUsage,
        },
        { status: 402 }
      );
    }

    const maxExpiryDays = billingUsage.limits.maxShareExpiryDays ?? 90;
    const normalizedDays = Number.isFinite(expiresInDays)
      ? Math.min(maxExpiryDays, Math.max(1, Math.round(expiresInDays as number)))
      : Math.min(30, maxExpiryDays);

    const normalizedPassword = typeof sharePassword === 'string' ? sharePassword.trim() : '';
    if (normalizedPassword && !billingUsage.limits.passwordProtectedLinks) {
      apiFailure(requestContext, 402, 'Password-protected exports require Pro', { stage: 'billing_gate' });
      return jsonWithApiMeta(
        requestContext,
        {
          success: false,
          code: 'PREMIUM_FEATURE_REQUIRED',
          error: 'Password-protected client links are included with Pro.',
          usage: billingUsage,
        },
        { status: 402 }
      );
    }

    if (normalizedPassword && normalizedPassword.length < 6) {
      apiFailure(requestContext, 400, 'Share password must be at least 6 characters', { stage: 'validation' });
      return jsonWithApiMeta(
        requestContext,
        { success: false, error: 'Share password must be at least 6 characters' },
        { status: 400 }
      );
    }

    const shareToken = crypto.randomBytes(12).toString('hex');
    const expiresAt = new Date(Date.now() + normalizedDays * 24 * 60 * 60 * 1000);
    const passwordSalt = normalizedPassword ? crypto.randomBytes(16).toString('hex') : null;
    const passwordHash = normalizedPassword && passwordSalt ? hashSharePassword(normalizedPassword, passwordSalt) : null;
    const guideBranding = await getGuideBrandingForUser(authResult.userId);

    const { error } = await supabase.from('planner_exports').insert({
      user_id: authResult.userId,
      share_token: shareToken,
      plan_data: plan,
      metadata: {
        ...planMetadata,
        guideBranding,
      },
      password_salt: passwordSalt,
      password_hash: passwordHash,
      expires_at: expiresAt.toISOString(),
      created_at: new Date().toISOString(),
    });

    if (error) throw error;

    const shareUrl = `${process.env.NEXT_PUBLIC_APP_URL}/plans/${shareToken}`;
    apiSuccess(requestContext, 200, { expiresInDays: normalizedDays, passwordProtected: !!normalizedPassword });

    return jsonWithApiMeta(requestContext, {
      success: true,
      shareUrl,
      shareToken,
      expiresAt: expiresAt.toISOString(),
      passwordProtected: !!normalizedPassword,
    });
  } catch (error) {
    apiFailure(requestContext, 500, error, { stage: 'create_export' });
    return jsonWithApiMeta(requestContext, { success: false, error: 'Failed to create share link' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const requestContext = startApiRequest('/api/planner/export', 'GET');
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      apiFailure(requestContext, 400, 'Missing token', { stage: 'validation' });
      return jsonWithApiMeta(requestContext, { error: 'Missing token' }, { status: 400 });
    }

    const result = await getSharedGuidePlan({
      supabase,
      token,
      allowPasswordCheck: false,
    });

    if (!result.success) {
      apiFailure(requestContext, result.status, result.cause || result.error, { stage: result.stage });
      return jsonWithApiMeta(
        requestContext,
        { error: result.error, requiresPassword: result.requiresPassword },
        { status: result.status }
      );
    }

    apiSuccess(requestContext, 200, { passwordProtected: result.passwordProtected });
    return jsonWithApiMeta(requestContext, result.data);
  } catch (error) {
    apiFailure(requestContext, 500, error, { stage: 'fetch_shared_plan' });
    return jsonWithApiMeta(requestContext, { error: 'Failed to fetch plan' }, { status: 500 });
  }
}
