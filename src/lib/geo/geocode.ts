export interface GeocodeResult {
  latitude: number | null;
  longitude: number | null;
  displayName?: string;
}

export interface LocationCandidate extends GeocodeResult {
  name: string;
  sourceQuery: string;
  relevanceScore: number;
  distanceKm?: number | null;
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

function isLikelyUsZip(value?: string) {
  if (!value) return false;
  return /^\d{5}(?:-\d{4})?$/.test(value.trim());
}

function isLikelyUsLocation(value?: string) {
  if (!value) return false;

  const normalized = value.trim().toLowerCase();
  if (!normalized) return false;
  if (/(\busa\b|\bu\.s\.a\b|\bunited states\b|\bus\b)/i.test(normalized)) return true;

  // Detect "City, TX" / "Austin TX" style input.
  const stateAbbrev = '(al|ak|az|ar|ca|co|ct|de|fl|ga|hi|ia|id|il|in|ks|ky|la|ma|md|me|mi|mn|mo|ms|mt|nc|nd|ne|nh|nj|nm|nv|ny|oh|ok|or|pa|ri|sc|sd|tn|tx|ut|va|vt|wa|wi|wv|wy|dc)';
  const usStatePattern = new RegExp(`(?:,|\\s)${stateAbbrev}(?:\\b|\\s|$)`, 'i');
  return usStatePattern.test(normalized);
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

  const shouldBiasUs =
    isLikelyUsZip(place) ||
    isLikelyUsZip(input.city) ||
    isLikelyUsLocation(place) ||
    isLikelyUsLocation(input.city);

  const query = [place, input.city?.trim(), shouldBiasUs && isLikelyUsZip(place) ? 'United States' : null]
    .filter(Boolean)
    .join(', ');

  const params = new URLSearchParams({
    format: 'jsonv2',
    limit: '5',
    q: query,
  });

  if (shouldBiasUs) {
    params.set('countrycodes', 'us');
  }

  const url = `https://nominatim.openstreetmap.org/search?${params.toString()}`;

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
  const blocked = (input.bannedTerms ?? []).map(t => t.toLowerCase()).filter(Boolean);
  const city = input.city.trim();
  const limit = input.limit ?? 8;

  // Resolve city center: prefer provided coordinates, otherwise geocode the city name
  const cityCenter =
    input.near?.latitude != null && input.near?.longitude != null
      ? { latitude: input.near.latitude, longitude: input.near.longitude }
      : await geocodePlace({ place: city });

  const hasCenter = cityCenter.latitude != null && cityCenter.longitude != null;
  const cLat = cityCenter.latitude as number;
  const cLon = cityCenter.longitude as number;

  const toRadians = (v: number) => (v * Math.PI) / 180;
  const haversineKm = (aLat: number, aLon: number, bLat: number, bLon: number) => {
    const R = 6371;
    const dLat = toRadians(bLat - aLat);
    const dLon = toRadians(bLon - aLon);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRadians(aLat)) * Math.cos(toRadians(bLat)) * Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(a));
  };

  // Build Nominatim viewbox string: left,top,right,bottom = minLon,maxLat,maxLon,minLat
  function buildViewbox(lat: number, lon: number, radiusKm: number): string {
    const dLat = radiusKm / 111;
    const dLon = radiusKm / (111 * Math.cos(toRadians(lat)));
    return `${lon - dLon},${lat + dLat},${lon + dLon},${lat - dLat}`;
  }

  type RawCandidate = LocationCandidate & { distanceKm: number | null };
  const collected: RawCandidate[] = [];
  const seenKeys = new Set<string>();
  // Track which query types have already found at least one result so we don't
  // re-run them at a wider radius — only expand the ones that came up empty.
  const satisfiedQueries = new Set<string>();

  // Cascade: 25 km → 50 km → 80 km.
  // For a big city, the first tier finds everything. For a small town, later
  // tiers reach into the surrounding metro area.
  const radiusTiers = [25, 50, 80];
  const minTarget = Math.max(3, Math.ceil(limit / 2));

  for (const radiusKm of radiusTiers) {
    if (collected.length >= minTarget) break;

    const viewbox = hasCenter ? buildViewbox(cLat, cLon, radiusKm) : null;

    for (const entry of queries) {
      // Skip queries that already found candidates — no need to widen for them.
      if (satisfiedQueries.has(entry.query)) continue;

      // Geographic bounding-box search: finds anything of this type within the
      // box regardless of which city it officially belongs to. Falls back to
      // a plain text query when we have no coordinates.
      const url = viewbox
        ? `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&viewbox=${viewbox}&bounded=1&q=${encodeURIComponent(entry.query)}`
        : `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&q=${encodeURIComponent(`${entry.query}, ${city}`)}`;

      try {
        const response = await fetch(url, {
          headers: { Accept: 'application/json', 'User-Agent': 'ShutterPlanAI/1.0' },
          cache: 'no-store',
        });

        if (response.ok) {
          const results = (await response.json()) as Array<{ lat?: string; lon?: string; display_name?: string }>;
          let foundThisQuery = 0;

          for (const result of results) {
            const lat = Number(result.lat);
            const lon = Number(result.lon);
            const displayName = result.display_name ?? '';
            if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;

            const lower = normalizeText(displayName);
            if (blocked.some(t => lower.includes(t))) continue;

            const key = normalizeText(displayName || `${lat.toFixed(4)},${lon.toFixed(4)}`);
            if (seenKeys.has(key)) continue;
            seenKeys.add(key);

            let distanceKm: number | null = null;
            if (hasCenter) {
              distanceKm = haversineKm(cLat, cLon, lat, lon);
              if (distanceKm > radiusKm) continue;
            }

            collected.push({
              name: displayName.split(',')[0]?.trim() || displayName,
              latitude: lat,
              longitude: lon,
              displayName,
              sourceQuery: entry.query,
              relevanceScore: entry.relevanceScore,
              distanceKm,
            });
            foundThisQuery++;
          }

          if (foundThisQuery > 0) satisfiedQueries.add(entry.query);
        }
      } catch {
        // ignore and continue to next query
      }

      await sleep(200); // Nominatim rate limit: ≤ 1 req/sec
      if (collected.length >= limit * 2) break;
    }
  }

  return collected
    .sort((a, b) => {
      if (a.relevanceScore !== b.relevanceScore) return b.relevanceScore - a.relevanceScore;
      if (a.distanceKm == null && b.distanceKm == null) return 0;
      if (a.distanceKm == null) return 1;
      if (b.distanceKm == null) return -1;
      return a.distanceKm - b.distanceKm;
    })
    .slice(0, limit);
}
