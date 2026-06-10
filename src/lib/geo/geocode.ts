export interface GeocodeResult {
  latitude: number | null;
  longitude: number | null;
  displayName?: string;
}

export interface LocationCandidate extends GeocodeResult {
  name: string;
  sourceQuery: string;
  relevanceScore: number;
}

interface GeocodeInput {
  place: string;
  city?: string;
  near?: {
    latitude: number;
    longitude: number;
    maxDistanceKm?: number;
  };
  bannedTerms?: string[];
}

interface SearchCandidateInput {
  city: string;
  sessionCategory: 'family' | 'engagement' | 'portrait' | 'event';
  near?: {
    latitude: number;
    longitude: number;
    maxDistanceKm?: number;
  };
  bannedTerms?: string[];
  limit?: number;
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function geocodePlace(input: {
  place: string;
  city?: string;
  near?: {
    latitude: number;
    longitude: number;
    maxDistanceKm?: number;
  };
  bannedTerms?: string[];
}): Promise<GeocodeResult> {
  const place = input.place?.trim();
  if (!place) {
    return { latitude: null, longitude: null };
  }

  const query = [place, input.city?.trim()].filter(Boolean).join(', ');
  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&q=${encodeURIComponent(query)}`;

  const toRadians = (value: number) => (value * Math.PI) / 180;
  const haversineKm = (aLat: number, aLon: number, bLat: number, bLon: number) => {
    const earthRadiusKm = 6371;
    const dLat = toRadians(bLat - aLat);
    const dLon = toRadians(bLon - aLon);
    const lat1 = toRadians(aLat);
    const lat2 = toRadians(bLat);
    const h =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return 2 * earthRadiusKm * Math.asin(Math.sqrt(h));
  };

  try {
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'ShutterPlanAI/1.0',
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      return { latitude: null, longitude: null };
    }

    const results = (await response.json()) as Array<{
      lat?: string;
      lon?: string;
      display_name?: string;
    }>;

    if (!Array.isArray(results) || results.length === 0) {
      return { latitude: null, longitude: null };
    }

    const blocked = (input.bannedTerms ?? []).map(term => term.toLowerCase()).filter(Boolean);

    const normalized = results
      .map(result => {
        const latitude = Number(result.lat);
        const longitude = Number(result.lon);
        const displayName = result.display_name ?? '';

        if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
          return null;
        }

        const lowerName = displayName.toLowerCase();
        const isBlocked = blocked.some(term => lowerName.includes(term));
        if (isBlocked) {
          return null;
        }

        let distanceKm: number | null = null;
        if (input.near) {
          distanceKm = haversineKm(input.near.latitude, input.near.longitude, latitude, longitude);
          const maxDistanceKm = input.near.maxDistanceKm ?? 50;
          if (distanceKm > maxDistanceKm) {
            return null;
          }
        }

        return {
          latitude,
          longitude,
          displayName,
          distanceKm,
        };
      })
      .filter((candidate): candidate is { latitude: number; longitude: number; displayName: string; distanceKm: number | null } =>
        candidate !== null
      );

    const best =
      normalized.sort((a, b) => {
        if (a.distanceKm == null && b.distanceKm == null) return 0;
        if (a.distanceKm == null) return 1;
        if (b.distanceKm == null) return -1;
        return a.distanceKm - b.distanceKm;
      })[0] ?? null;

    if (!best) {
      return { latitude: null, longitude: null };
    }

    return {
      latitude: best.latitude,
      longitude: best.longitude,
      displayName: best.displayName,
    };
  } catch {
    return { latitude: null, longitude: null };
  }
}

export async function geocodeLocations<T extends { name: string }>(
  locations: T[],
  city?: string,
  options?: Pick<GeocodeInput, 'near' | 'bannedTerms'>
): Promise<Array<T & GeocodeResult>> {
  const enriched: Array<T & GeocodeResult> = [];

  for (let index = 0; index < locations.length; index += 1) {
    const location = locations[index];
    const geo = await geocodePlace({ place: location.name, city, near: options?.near, bannedTerms: options?.bannedTerms });
    enriched.push({ ...location, ...geo });

    if (index < locations.length - 1) {
      await sleep(250);
    }
  }

  return enriched;
}

function normalizeText(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

function getSearchQueries(sessionCategory: SearchCandidateInput['sessionCategory']) {
  if (sessionCategory === 'family') {
    return [
      { query: 'botanical garden', relevanceScore: 10 },
      { query: 'community park', relevanceScore: 10 },
      { query: 'garden', relevanceScore: 9 },
      { query: 'nature trail', relevanceScore: 9 },
      { query: 'riverwalk', relevanceScore: 8 },
      { query: 'historic town square', relevanceScore: 8 },
      { query: 'arboretum', relevanceScore: 8 },
      { query: 'waterfront promenade', relevanceScore: 7 },
    ];
  }

  if (sessionCategory === 'engagement') {
    return [
      { query: 'botanical garden', relevanceScore: 10 },
      { query: 'downtown plaza', relevanceScore: 10 },
      { query: 'historic district', relevanceScore: 10 },
      { query: 'riverwalk', relevanceScore: 9 },
      { query: 'waterfront promenade', relevanceScore: 9 },
      { query: 'arts district', relevanceScore: 9 },
      { query: 'scenic overlook', relevanceScore: 8 },
      { query: 'park', relevanceScore: 7 },
    ];
  }

  if (sessionCategory === 'event') {
    return [
      { query: 'downtown plaza', relevanceScore: 10 },
      { query: 'hotel lobby', relevanceScore: 10 },
      { query: 'conference center', relevanceScore: 9 },
      { query: 'museum exterior', relevanceScore: 9 },
      { query: 'waterfront', relevanceScore: 8 },
      { query: 'garden', relevanceScore: 8 },
      { query: 'architectural plaza', relevanceScore: 8 },
    ];
  }

  return [
    { query: 'downtown arts district', relevanceScore: 10 },
    { query: 'architectural plaza', relevanceScore: 10 },
    { query: 'museum exterior', relevanceScore: 9 },
    { query: 'waterfront', relevanceScore: 9 },
    { query: 'historic district', relevanceScore: 9 },
    { query: 'garden', relevanceScore: 8 },
    { query: 'riverwalk', relevanceScore: 8 },
  ];
}

export async function searchLocationCandidates(input: SearchCandidateInput): Promise<LocationCandidate[]> {
  const queries = getSearchQueries(input.sessionCategory);
  const blocked = (input.bannedTerms ?? []).map(term => term.toLowerCase()).filter(Boolean);
  const city = input.city.trim();
  const limit = input.limit ?? 8;
  const cityGeo = await geocodePlace({ place: city });

  const toRadians = (value: number) => (value * Math.PI) / 180;
  const haversineKm = (aLat: number, aLon: number, bLat: number, bLon: number) => {
    const earthRadiusKm = 6371;
    const dLat = toRadians(bLat - aLat);
    const dLon = toRadians(bLon - aLon);
    const lat1 = toRadians(aLat);
    const lat2 = toRadians(bLat);
    const h =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return 2 * earthRadiusKm * Math.asin(Math.sqrt(h));
  };

  const candidates: Array<LocationCandidate & { distanceKm: number | null }> = [];

  for (const entry of queries) {
    const query = `${entry.query}, ${city}`;
    const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=4&q=${encodeURIComponent(query)}`;

    try {
      const response = await fetch(url, {
        headers: {
          Accept: 'application/json',
          'User-Agent': 'ShutterPlanAI/1.0',
        },
        cache: 'no-store',
      });

      if (!response.ok) continue;

      const results = (await response.json()) as Array<{
        lat?: string;
        lon?: string;
        display_name?: string;
      }>;

      for (const result of results) {
        const latitude = Number(result.lat);
        const longitude = Number(result.lon);
        const displayName = result.display_name ?? '';
        if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) continue;

        const lower = normalizeText(displayName);
        if (blocked.some(term => lower.includes(term))) continue;

        let distanceKm: number | null = null;
        if (cityGeo.latitude != null && cityGeo.longitude != null) {
          distanceKm = haversineKm(cityGeo.latitude, cityGeo.longitude, latitude, longitude);
          const maxDistanceKm = input.near?.maxDistanceKm ?? 65;
          if (distanceKm > maxDistanceKm) continue;
        }

        const candidateName = displayName.split(',')[0]?.trim() || displayName;
        candidates.push({
          name: candidateName,
          latitude,
          longitude,
          displayName,
          sourceQuery: query,
          relevanceScore: entry.relevanceScore,
          distanceKm,
        });
      }

      if (candidates.length >= limit * 2) break;
    } catch {
      // ignore and continue to next query
    }
  }

  const seen = new Set<string>();
  return candidates
    .sort((a, b) => {
      if (a.relevanceScore !== b.relevanceScore) return b.relevanceScore - a.relevanceScore;
      if (a.distanceKm == null && b.distanceKm == null) return 0;
      if (a.distanceKm == null) return 1;
      if (b.distanceKm == null) return -1;
      return a.distanceKm - b.distanceKm;
    })
    .filter(candidate => {
      const key = normalizeText(candidate.displayName || candidate.name);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, limit);
}
