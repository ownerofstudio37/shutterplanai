import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/serverAuth';
import { generateSessionPlan, SessionPlan } from '@/lib/ai/gemini';
import { geocodeLocations, geocodePlace } from '@/lib/geo/geocode';

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

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (!auth.success) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const payload = await request.json();
    const shootType = typeof payload.shootType === 'string' ? payload.shootType : '';
    const isFamilySession = /family|newborn|maternity|kids|children/i.test(shootType);

    if (!payload?.shootType || typeof payload.shootType !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Shoot type is required' },
        { status: 400 }
      );
    }

    const plan: SessionPlan = await generateSessionPlan({
      shootType: payload.shootType,
      subjectDetails: typeof payload.subjectDetails === 'string' ? payload.subjectDetails : '',
      city: typeof payload.city === 'string' ? payload.city : '',
      shootDate: typeof payload.shootDate === 'string' ? payload.shootDate : undefined,
      mood: typeof payload.mood === 'string' ? payload.mood : 'natural',
      mustHaveShots: typeof payload.mustHaveShots === 'string' ? payload.mustHaveShots : undefined,
      constraints: typeof payload.constraints === 'string' ? payload.constraints : undefined,
    });

    const city = typeof payload.city === 'string' ? payload.city : undefined;
    const bannedTerms = isFamilySession
      ? ['high school', 'jail', 'prison', 'cemetery', 'hospital', 'industrial', 'warehouse']
      : [];

    const cityFallbackGeo = city ? await geocodePlace({ place: city }) : { latitude: null, longitude: null };
    const nearCity =
      cityFallbackGeo.latitude != null && cityFallbackGeo.longitude != null
        ? {
            latitude: cityFallbackGeo.latitude,
            longitude: cityFallbackGeo.longitude,
            maxDistanceKm: 45,
          }
        : undefined;

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
      const finalName = hasDisplayName && isGenericAiLabel(location.name)
        ? location.displayName!.split(',').slice(0, 3).join(',').trim()
        : location.name;

      return {
        ...location,
        name: finalName,
        googleMapsUrl: getGoogleMapsUrl({
          latitude: location.latitude,
          longitude: location.longitude,
          query: location.displayName || location.name,
        }),
      };
    });

    const locationByName = new Map(
      finalizedLocations.flatMap(location => {
        const aliases = [location.name, location.displayName, simplifyLocationName(location.name)].filter(Boolean) as string[];
        return aliases.map(alias => [normalizeLocationName(alias), location] as const);
      })
    );

    const enrichedShotList = (plan.shotList ?? []).map(shot => {
      const shotLocation = normalizeLocationName(shot.location ?? '');
      const exactMatch = locationByName.get(shotLocation);
      const fuzzyMatch =
        exactMatch ??
        finalizedLocations.find(location => {
          const normalized = normalizeLocationName(location.name);
          return normalized.includes(shotLocation) || shotLocation.includes(normalized);
        });

      const match = fuzzyMatch ?? null;

      return {
        ...shot,
        latitude: match?.latitude ?? null,
        longitude: match?.longitude ?? null,
        geocodedLocationName: match?.displayName ?? null,
      };
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          ...plan,
          locationSuggestions: finalizedLocations,
          shotList: enrichedShotList,
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
