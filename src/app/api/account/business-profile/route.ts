import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/serverAuth';
import { createSupabaseAdminClient } from '@/lib/supabase/server';

interface BusinessProfile {
  businessName?: string;
  businessType?: string;
  address?: string;
  zipCode?: string;
  baseLocation?: string;
  websiteUrl?: string;
  websiteSummary?: string;
  brandTone?: string;
  guideLogoUrl?: string;
  guidePrimaryColor?: string;
  guideAccentColor?: string;
  preferredLocationTypes?: string;
  avoidLocationTypes?: string;
  poseDirectionStyle?: string;
  prepGuideNotes?: string;
  updatedAt?: string;
}

function toOptionalTrimmed(value: unknown, maxLength = 300): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return trimmed.slice(0, maxLength);
}

function normalizeWebsiteUrl(value?: string): string | undefined {
  if (!value) return undefined;
  const input = value.trim();
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

function normalizeHexColor(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return /^#[0-9a-f]{6}$/i.test(trimmed) ? trimmed : undefined;
}

async function getWebsiteSummary(websiteUrl?: string): Promise<string | undefined> {
  if (!websiteUrl) return undefined;

  try {
    const response = await fetch(websiteUrl, {
      headers: {
        'User-Agent': 'ShutterPlanAI/1.0',
      },
      cache: 'no-store',
    });

    if (!response.ok) return undefined;

    const html = await response.text();
    const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    const descMatch = html.match(/<meta\s+name=["']description["']\s+content=["']([\s\S]*?)["'][^>]*>/i);

    const title = titleMatch?.[1]?.replace(/\s+/g, ' ').trim();
    const description = descMatch?.[1]?.replace(/\s+/g, ' ').trim();

    const summary = [title, description].filter(Boolean).join(' — ').trim();
    return summary ? summary.slice(0, 320) : undefined;
  } catch {
    return undefined;
  }
}

async function getBusinessProfile(userId: string): Promise<BusinessProfile | null> {
  const admin = createSupabaseAdminClient();
  const { data } = await admin.auth.admin.getUserById(userId);

  const profile = data?.user?.user_metadata?.businessProfile;
  if (!profile || typeof profile !== 'object') return null;

  return profile as BusinessProfile;
}

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.success) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  const profile = await getBusinessProfile(auth.userId);
  return NextResponse.json({ success: true, data: profile ?? {} }, { status: 200 });
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.success) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  const payload = await request.json();

  const websiteUrl = normalizeWebsiteUrl(toOptionalTrimmed(payload?.websiteUrl, 300));
  const websiteSummary = await getWebsiteSummary(websiteUrl);

  const businessProfile: BusinessProfile = {
    businessName: toOptionalTrimmed(payload?.businessName, 120),
    businessType: toOptionalTrimmed(payload?.businessType, 120),
    address: toOptionalTrimmed(payload?.address, 220),
    zipCode: toOptionalTrimmed(payload?.zipCode, 20),
    baseLocation: toOptionalTrimmed(payload?.baseLocation, 120),
    websiteUrl,
    websiteSummary,
    brandTone: toOptionalTrimmed(payload?.brandTone, 220),
    guideLogoUrl: normalizeWebsiteUrl(toOptionalTrimmed(payload?.guideLogoUrl, 300)),
    guidePrimaryColor: normalizeHexColor(payload?.guidePrimaryColor),
    guideAccentColor: normalizeHexColor(payload?.guideAccentColor),
    preferredLocationTypes: toOptionalTrimmed(payload?.preferredLocationTypes, 260),
    avoidLocationTypes: toOptionalTrimmed(payload?.avoidLocationTypes, 260),
    poseDirectionStyle: toOptionalTrimmed(payload?.poseDirectionStyle, 260),
    prepGuideNotes: toOptionalTrimmed(payload?.prepGuideNotes, 320),
    updatedAt: new Date().toISOString(),
  };

  const admin = createSupabaseAdminClient();
  const { data: existingData } = await admin.auth.admin.getUserById(auth.userId);

  const existingMetadata = existingData?.user?.user_metadata ?? {};
  const { error } = await admin.auth.admin.updateUserById(auth.userId, {
    user_metadata: {
      ...existingMetadata,
      businessProfile,
    },
  });

  if (error) {
    return NextResponse.json({ success: false, error: 'Failed to save business profile' }, { status: 500 });
  }

  return NextResponse.json({ success: true, data: businessProfile }, { status: 200 });
}
