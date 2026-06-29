import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/serverAuth';
import { createSupabaseAdminClient } from '@/lib/supabase/server';
import { checkRateLimit, rateLimitResponse } from '@/lib/security/rateLimit';
import { logSecurityEvent } from '@/lib/security/auditLog';

export const maxDuration = 60;

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

const WEBSITE_FETCH_TIMEOUT_MS = 8_000;
const WEBSITE_FETCH_MAX_BYTES = 512_000;
const AI_INSIGHTS_TIMEOUT_MS = 25_000;
const AI_INSIGHTS_MAX_RETRIES = 2;

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
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), WEBSITE_FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'ShutterPlanAI/1.0',
        Accept: 'text/html,application/xhtml+xml',
      },
      cache: 'no-store',
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Website fetch failed (${response.status})`);
    }

    const contentType = response.headers.get('content-type') ?? '';
    if (contentType && !/text\/html|application\/xhtml\+xml/i.test(contentType)) {
      throw new Error('Website must return an HTML page');
    }

    const contentLength = Number(response.headers.get('content-length'));
    if (Number.isFinite(contentLength) && contentLength > WEBSITE_FETCH_MAX_BYTES) {
      throw new Error('Website page is too large to analyze');
    }

    const html = await readResponseBodyWithLimit(response, WEBSITE_FETCH_MAX_BYTES);
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
  } finally {
    clearTimeout(timeout);
  }
}

async function readResponseBodyWithLimit(response: Response, maxBytes: number) {
  if (!response.body) {
    const text = await response.text();
    if (new TextEncoder().encode(text).length > maxBytes) {
      throw new Error('Website page is too large to analyze');
    }
    return text;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let bytesRead = 0;
  let html = '';

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    bytesRead += value.byteLength;
    if (bytesRead > maxBytes) {
      await reader.cancel();
      throw new Error('Website page is too large to analyze');
    }
    html += decoder.decode(value, { stream: true });
  }

  return html + decoder.decode();
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

function isRetryableStatus(status: number) {
  return status === 408 || status === 429 || status >= 500;
}

function isAbortError(error: unknown) {
  return error instanceof DOMException
    ? error.name === 'AbortError'
    : error instanceof Error && error.name === 'AbortError';
}

async function fetchAiInsights(url: string, body: unknown) {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < AI_INSIGHTS_MAX_RETRIES; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), AI_INSIGHTS_TIMEOUT_MS);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!response.ok && isRetryableStatus(response.status) && attempt < AI_INSIGHTS_MAX_RETRIES - 1) {
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
        continue;
      }

      return response;
    } catch (error) {
      lastError = isAbortError(error)
        ? new Error('AI website analysis timed out')
        : error instanceof Error
          ? error
          : new Error(String(error));
      if (attempt < AI_INSIGHTS_MAX_RETRIES - 1) {
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
    } finally {
      clearTimeout(timeout);
    }
  }

  throw lastError ?? new Error('AI website analysis failed');
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

  const response = await fetchAiInsights(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.2,
        responseMimeType: 'application/json',
      },
    }
  ).catch(() => null);

  if (!response) return null;

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
    logSecurityEvent({ route: '/api/account/business-profile/analyze-website', event: 'auth_failed', status: auth.status });
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  const rateLimit = checkRateLimit({
    key: `website-analysis:${auth.userId}`,
    limit: 10,
    windowMs: 60 * 60 * 1000,
  });
  if (!rateLimit.success) {
    logSecurityEvent({ route: '/api/account/business-profile/analyze-website', event: 'rate_limited', userId: auth.userId, status: 429 });
    return rateLimitResponse(rateLimit);
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
    logSecurityEvent({
      route: '/api/account/business-profile/analyze-website',
      event: 'provider_or_route_failed',
      userId: auth.userId,
      status: 500,
      detail: error instanceof Error ? error.name : 'unknown',
    });
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to analyze website',
      },
      { status: 500 }
    );
  }
}
