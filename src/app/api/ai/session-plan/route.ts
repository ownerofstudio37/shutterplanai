import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/serverAuth';
import { createSupabaseAdminClient } from '@/lib/supabase/server';
import { BusinessContext, generateSessionPlan, SessionPlan, SessionPlanLocation } from '@/lib/ai/gemini';
import { geocodeLocations, geocodePlace, searchLocationCandidates } from '@/lib/geo/geocode';

function toTrimmedOrUndefined(value: unknown) {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

async function getBusinessContextForUser(userId: string): Promise<BusinessContext | undefined> {
  const admin = createSupabaseAdminClient();
  const { data } = await admin.auth.admin.getUserById(userId);
  const raw = data?.user?.user_metadata?.businessProfile;

  if (!raw || typeof raw !== 'object') return undefined;

  const profile = raw as Record<string, unknown>;
  const context: BusinessContext = {
    businessName: toTrimmedOrUndefined(profile.businessName),
    businessType: toTrimmedOrUndefined(profile.businessType),
    address: toTrimmedOrUndefined(profile.address),
    zipCode: toTrimmedOrUndefined(profile.zipCode),
    baseLocation: toTrimmedOrUndefined(profile.baseLocation),
    websiteUrl: toTrimmedOrUndefined(profile.websiteUrl),
    websiteSummary: toTrimmedOrUndefined(profile.websiteSummary),
    brandTone: toTrimmedOrUndefined(profile.brandTone),
    preferredLocationTypes: toTrimmedOrUndefined(profile.preferredLocationTypes),
    avoidLocationTypes: toTrimmedOrUndefined(profile.avoidLocationTypes),
    poseDirectionStyle: toTrimmedOrUndefined(profile.poseDirectionStyle),
    prepGuideNotes: toTrimmedOrUndefined(profile.prepGuideNotes),
  };

  return Object.values(context).some(Boolean) ? context : undefined;
}

function normalizeLocationName(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function simplifyLocationName(value: string) {
  const primary = value.split('/')[0]?.split('(')[0]?.trim() || value.trim();
  return primary
    .replace(/\b(open green space|urban edge|district|area|waterfront)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function isGenericAiLabel(value: string) {
  return /(open green space|urban edge|district|waterfront|\s\/\s)/i.test(value);
}

function getGoogleMapsUrl(input: { latitude?: number | null; longitude?: number | null; query: string }) {
  if (input.latitude != null && input.longitude != null) {
    return `https://maps.google.com/?q=${input.latitude},${input.longitude}`;
  }

  return `https://maps.google.com/?q=${encodeURIComponent(input.query)}`;
}

function getSessionCategory(shootType: string) {
  const value = shootType.toLowerCase();
  if (/family|newborn|maternity|kids|children/.test(value)) return 'family' as const;
  if (/engagement|proposal|couple|anniversary/.test(value)) return 'engagement' as const;
  if (/event|wedding|party|corporate/.test(value)) return 'event' as const;
  return 'portrait' as const;
}

function isGenericLocationLabel(value: string) {
  return /(open green space|urban edge|district|waterfront|park \/ open green space|city center)/i.test(value);
}

function buildLocationSuggestionFromCandidate(
  candidate: {
    name: string;
    displayName?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    featureSignals?: string[];
    confidenceScore?: number;
    venueBucket?: string;
  },
  sessionCategory: 'family' | 'engagement' | 'event' | 'portrait'
): SessionPlanLocation {
  const display = candidate.displayName?.split(',').slice(0, 2).join(',').trim() || candidate.name;
  const isFamily = sessionCategory === 'family';
  const isEngagement = sessionCategory === 'engagement';
  const signals = Array.isArray(candidate.featureSignals) ? candidate.featureSignals : [];
  const confidenceLabel =
    typeof candidate.confidenceScore === 'number'
      ? candidate.confidenceScore >= 8
        ? 'high-confidence pick'
        : candidate.confidenceScore >= 6
          ? 'medium-confidence pick'
          : 'experimental pick'
      : 'grounded pick';

  const signalLine = signals.length > 0 ? `${signals.slice(0, 3).join(', ')}.` : '';

  return {
    name: display,
    displayName: candidate.displayName || candidate.name,
    googleMapsUrl: getGoogleMapsUrl({
      latitude: candidate.latitude,
      longitude: candidate.longitude,
      query: candidate.displayName || candidate.name,
    }),
    latitude: candidate.latitude ?? null,
    longitude: candidate.longitude ?? null,
    whyItWorks: isFamily
      ? `Easy parking, low walking burden, and flexible background options for a family session (${confidenceLabel}). ${signalLine}`.trim()
      : isEngagement
        ? `Strong scenic variety and comfortable pacing for an engagement session (${confidenceLabel}). ${signalLine}`.trim()
        : `Photogenic setting with good composition potential and minimal transition time (${confidenceLabel}). ${signalLine}`.trim(),
    microLocations: isFamily
      ? ['Open shade area', 'Tree-lined path', 'Quiet backdrop']
      : isEngagement
        ? ['Scenic overlook', 'Clean backdrop wall', 'Pathway curve']
        : ['Leading line area', 'Texture wall', 'Open background'],
    logistics: {
      parking: 'Confirm parking closest to the main entrance before arrival.',
      restroom: 'Check nearby public restroom access before the session.',
      walkingDistance: candidate.latitude != null && candidate.longitude != null
        ? 'Keep transitions short and under 5 minutes when possible.'
        : 'Keep transitions short and check access in advance.',
    },
  };
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (!auth.success) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const payload = await request.json();
    const shootType = typeof payload.shootType === 'string' ? payload.shootType : '';
    const isFamilySession = /family|newborn|maternity|kids|children/i.test(shootType);
    const sessionCategory = getSessionCategory(shootType);
    const businessContext = await getBusinessContextForUser(auth.userId);

    if (!payload?.shootType || typeof payload.shootType !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Shoot type is required' },
        { status: 400 }
      );
    }

    const cityInput = toTrimmedOrUndefined(payload.city);
    const city = cityInput || businessContext?.baseLocation || businessContext?.zipCode;

    const dynamicAvoidTerms = (businessContext?.avoidLocationTypes ?? '')
      .split(',')
      .map(term => term.trim().toLowerCase())
      .filter(Boolean)
      .slice(0, 12);

    const preferredLocationTerms = (businessContext?.preferredLocationTypes ?? '')
      .split(',')
      .map(term => term.trim().toLowerCase())
      .filter(Boolean)
      .slice(0, 12);

    const bannedTerms = [
      'high school',
      'jail',
      'prison',
      'cemetery',
      'hospital',
      'industrial',
      'warehouse',
      ...dynamicAvoidTerms,
    ];

    const cityFallbackGeo = city ? await geocodePlace({ place: city }) : { latitude: null, longitude: null };
    const nearCity =
      cityFallbackGeo.latitude != null && cityFallbackGeo.longitude != null
        ? {
            latitude: cityFallbackGeo.latitude,
            longitude: cityFallbackGeo.longitude,
            maxDistanceKm: 80, // match the widest cascade tier in searchLocationCandidates
          }
        : undefined;

    const locationCandidates = city
      ? await searchLocationCandidates({
          city,
          sessionCategory,
          // No radius cap here — the cascade inside searchLocationCandidates
          // starts at 25 km and expands to 50/80 km for small cities.
          bannedTerms,
          limit: 8,
          preferredTerms: preferredLocationTerms,
        })
      : [];

    const plan: SessionPlan = await generateSessionPlan({
      shootType: payload.shootType,
      subjectDetails: typeof payload.subjectDetails === 'string' ? payload.subjectDetails : '',
      city: city || '',
      shootDate: typeof payload.shootDate === 'string' ? payload.shootDate : undefined,
      duration: typeof payload.duration === 'string' ? payload.duration : undefined,
      mood: typeof payload.mood === 'string' ? payload.mood : 'natural',
      mustHaveShots: typeof payload.mustHaveShots === 'string' ? payload.mustHaveShots : undefined,
      constraints: typeof payload.constraints === 'string' ? payload.constraints : undefined,
      locationCandidates,
      businessContext,
    });

    const initialLocations = await geocodeLocations(
      plan.locationSuggestions ?? [],
      city,
      {
        near: nearCity,
        bannedTerms,
      }
    );

    const enrichedLocations = await Promise.all(
      initialLocations.map(async location => {
        if (location.latitude != null && location.longitude != null) {
          return location;
        }

        const simplified = simplifyLocationName(location.name);
        const retryGeo = await geocodePlace({
          place: simplified || location.name,
          city,
          near: nearCity,
          bannedTerms,
        });

        if (retryGeo.latitude != null && retryGeo.longitude != null) {
          return {
            ...location,
            latitude: retryGeo.latitude,
            longitude: retryGeo.longitude,
            displayName: retryGeo.displayName ?? location.displayName,
          };
        }

        if (cityFallbackGeo.latitude != null && cityFallbackGeo.longitude != null) {
          return {
            ...location,
            latitude: cityFallbackGeo.latitude,
            longitude: cityFallbackGeo.longitude,
            displayName: cityFallbackGeo.displayName ?? location.displayName,
          };
        }

        return location;
      })
    );

    const finalizedLocations = enrichedLocations.map(location => {
      const hasDisplayName = typeof location.displayName === 'string' && location.displayName.trim().length > 0;
      const fallbackCandidate = locationCandidates.find(candidate => {
        const candidateName = candidate.name.toLowerCase();
        const displayName = (candidate.displayName || '').toLowerCase();
        const locationName = location.name.toLowerCase();
        return candidateName.includes(locationName) || locationName.includes(candidateName) || displayName.includes(locationName);
      });
      const finalName = fallbackCandidate?.displayName?.split(',').slice(0, 3).join(',').trim() ||
        (hasDisplayName && isGenericAiLabel(location.name)
          ? location.displayName!.split(',').slice(0, 3).join(',').trim()
          : location.name);
      const finalLatitude = fallbackCandidate?.latitude ?? location.latitude;
      const finalLongitude = fallbackCandidate?.longitude ?? location.longitude;
      const finalDisplayName = fallbackCandidate?.displayName ?? location.displayName;

      return {
        ...location,
        name: finalName,
        latitude: finalLatitude,
        longitude: finalLongitude,
        displayName: finalDisplayName,
        googleMapsUrl: getGoogleMapsUrl({
          latitude: finalLatitude,
          longitude: finalLongitude,
          query: finalDisplayName || finalName,
        }),
      };
    });

    const groundedLocations = locationCandidates.length > 0
      ? locationCandidates.slice(0, 6).map(candidate => buildLocationSuggestionFromCandidate(candidate, sessionCategory))
      : finalizedLocations;

    const locationSource =
      locationCandidates.length > 0
        ? 'grounded-candidates'
        : groundedLocations.some(location => location.latitude != null && location.longitude != null)
          ? 'fallback-geocode'
          : 'city-fallback';

    const candidateNames = new Set(
      groundedLocations.map(candidate => normalizeLocationName(candidate.displayName || candidate.name))
    );

    const locationByName = new Map(
      groundedLocations.flatMap(location => {
        const aliases = [location.name, location.displayName, simplifyLocationName(location.name)].filter(Boolean) as string[];
        return aliases.map(alias => [normalizeLocationName(alias), location] as const);
      })
    );

    const enrichedShotList = (plan.shotList ?? []).map(shot => {
      const shotLocation = normalizeLocationName(shot.location ?? '');
      const exactMatch = locationByName.get(shotLocation);
      const fuzzyMatch =
        exactMatch ??
        groundedLocations.find(location => {
          const normalized = normalizeLocationName(location.name);
          return normalized.includes(shotLocation) || shotLocation.includes(normalized);
        });

      const match = fuzzyMatch ?? null;
      const fallbackLocation = groundedLocations[0]?.name || city || shot.location || 'Primary location';
      const needsReplacement = !shotLocation || isGenericLocationLabel(shot.location ?? '') || (!match && candidateNames.size > 0);

      return {
        ...shot,
        location: needsReplacement ? fallbackLocation : shot.location,
        latitude: match?.latitude ?? null,
        longitude: match?.longitude ?? null,
        geocodedLocationName: match?.displayName ?? fallbackLocation,
      };
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          ...plan,
          locationSuggestions: groundedLocations,
          shotList: enrichedShotList,
          planningDiagnostics: {
            locationCandidateCount: locationCandidates.length,
            locationSource,
            resolvedCity: city || '',
            usedAccountFallbackCity: !cityInput && !!(businessContext?.baseLocation || businessContext?.zipCode),
          },
        },
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate session plan',
      },
      { status: 500 }
    );
  }
}
