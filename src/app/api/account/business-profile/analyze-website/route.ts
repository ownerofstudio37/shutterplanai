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
  preferredLocationTypes?: string;
  avoidLocationTypes?: string;
  poseDirectionStyle?: string;
  prepGuideNotes?: string;
  updatedAt?: string;
}

function trimOrUndefined(value: unknown, maxLength = 320): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return trimmed.slice(0, maxLength);
}

function normalizeWebsiteUrl(value?: string) {
  const base = trimOrUndefined(value, 300);
  if (!base) return undefined;

  const withProtocol = /^https?:\/\//i.test(base) ? base : `https://${base}`;
  try {
    const parsed = new URL(withProtocol);
    if (!['http:', 'https:'].includes(parsed.protocol)) return undefined;
    return parsed.toString();
  } catch {
    return undefined;
  }
}

function htmlToText(html: string) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

async function fetchWebsiteContext(url: string) {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'ShutterPlanAI/1.0',
      Accept: 'text/html,application/xhtml+xml',
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`Website fetch failed (${response.status})`);
  }

  const html = await response.text();
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const descriptionMatch = html.match(/<meta\s+name=["']description["']\s+content=["']([\s\S]*?)["'][^>]*>/i);

  const title = titleMatch?.[1]?.replace(/\s+/g, ' ').trim();
  const description = descriptionMatch?.[1]?.replace(/\s+/g, ' ').trim();
  const text = htmlToText(html);

  const summary = [title, description].filter(Boolean).join(' — ').trim();

  return {
    summary: summary.slice(0, 320),
    textSnippet: text.slice(0, 6000),
  };
}

type WebsiteInsights = {
  brandTone?: string;
  preferredLocationTypes?: string;
  avoidLocationTypes?: string;
  poseDirectionStyle?: string;
  prepGuideNotes?: string;
};

function heuristicInsights(text: string): WebsiteInsights {
  const normalized = text.toLowerCase();
  const hasFamily = /(family|newborn|maternity|children|kids)/.test(normalized);
  const hasWedding = /(wedding|engagement|couple|elopement)/.test(normalized);
  const hasEditorial = /(editorial|luxury|modern|bold|fashion)/.test(normalized);

  const tone = hasEditorial
    ? 'polished, editorial, modern'
    : hasFamily
      ? 'warm, candid, connection-focused'
      : hasWedding
        ? 'romantic, timeless, documentary'
        : 'clean, natural, story-driven';

  const preferred = hasFamily
    ? 'park, botanical garden, shaded trail, quiet town square'
    : hasWedding
      ? 'historic district, waterfront promenade, scenic overlook, downtown plaza'
      : 'architectural district, open shade park, textured walls';

  return {
    brandTone: tone,
    preferredLocationTypes: preferred,
    avoidLocationTypes: 'industrial zones, hospital grounds, school campuses during hours',
    poseDirectionStyle: 'Start with movement prompts, then transition to clean hero compositions.',
    prepGuideNotes: hasFamily
      ? 'Recommend neutral outfits, snacks for kids, and arrive 10 minutes early.'
      : 'Recommend coordinated outfits, comfortable shoes, and arrive 10 minutes early.',
  };
}

function extractJsonObject<T>(text: string): T {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start < 0 || end < 0 || end <= start) {
    throw new Error('No JSON object found in model response');
  }
  return JSON.parse(text.slice(start, end + 1)) as T;
}

async function aiInsights(textSnippet: string, summary: string): Promise<WebsiteInsights | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL || 'gemini-3.1-pro-preview';

  if (!apiKey) return null;

  const prompt = `You are extracting photography brand planning signals from a business website.

Return JSON only with this schema:
{
  "brandTone": "string",
  "preferredLocationTypes": "comma-separated string",
  "avoidLocationTypes": "comma-separated string",
  "poseDirectionStyle": "string",
  "prepGuideNotes": "string"
}

Rules:
- Keep each field concise.
- Focus on actionable shoot-planning guidance.
- Do not invent niche claims not supported by text.

Website summary:
${summary || 'None'}

Website text snippet:
${textSnippet}`;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.2,
          responseMimeType: 'application/json',
        },
      }),
    }
  );

  if (!response.ok) return null;

  const payload = (await response.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };

  const text = payload.candidates?.[0]?.content?.parts?.map(part => part.text ?? '').join('') ?? '';
  if (!text) return null;

  try {
    return extractJsonObject<WebsiteInsights>(text);
  } catch {
    return null;
  }
}

function mergeAndClampInsights(insights: WebsiteInsights): WebsiteInsights {
  return {
    brandTone: trimOrUndefined(insights.brandTone, 220),
    preferredLocationTypes: trimOrUndefined(insights.preferredLocationTypes, 260),
    avoidLocationTypes: trimOrUndefined(insights.avoidLocationTypes, 260),
    poseDirectionStyle: trimOrUndefined(insights.poseDirectionStyle, 260),
    prepGuideNotes: trimOrUndefined(insights.prepGuideNotes, 320),
  };
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.success) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  const payload = await request.json();
  const requestedUrl = trimOrUndefined(payload?.websiteUrl, 300);

  const admin = createSupabaseAdminClient();
  const { data: userData } = await admin.auth.admin.getUserById(auth.userId);
  const existingProfile = (userData?.user?.user_metadata?.businessProfile ?? {}) as BusinessProfile;

  const websiteUrl = normalizeWebsiteUrl(requestedUrl || existingProfile.websiteUrl);
  if (!websiteUrl) {
    return NextResponse.json({ success: false, error: 'Valid website URL is required' }, { status: 400 });
  }

  try {
    const website = await fetchWebsiteContext(websiteUrl);
    const ai = await aiInsights(website.textSnippet, website.summary);
    const insights = mergeAndClampInsights(ai ?? heuristicInsights(website.textSnippet));

    const businessProfile: BusinessProfile = {
      ...existingProfile,
      websiteUrl,
      websiteSummary: website.summary || existingProfile.websiteSummary,
      brandTone: insights.brandTone ?? existingProfile.brandTone,
      preferredLocationTypes: insights.preferredLocationTypes ?? existingProfile.preferredLocationTypes,
      avoidLocationTypes: insights.avoidLocationTypes ?? existingProfile.avoidLocationTypes,
      poseDirectionStyle: insights.poseDirectionStyle ?? existingProfile.poseDirectionStyle,
      prepGuideNotes: insights.prepGuideNotes ?? existingProfile.prepGuideNotes,
      updatedAt: new Date().toISOString(),
    };

    const { error } = await admin.auth.admin.updateUserById(auth.userId, {
      user_metadata: {
        ...(userData?.user?.user_metadata ?? {}),
        businessProfile,
      },
    });

    if (error) {
      return NextResponse.json({ success: false, error: 'Failed to save analyzed website context' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: businessProfile,
      message: ai ? 'Website analyzed with AI and profile updated.' : 'Website analyzed with fallback parser and profile updated.',
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to analyze website',
      },
      { status: 500 }
    );
  }
}
