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
  preferredTerms?: string[];
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

function getVenueBucket(input: { displayName: string; className?: string; placeType?: string }) {
  const haystack = `${input.displayName} ${input.className ?? ''} ${input.placeType ?? ''}`.toLowerCase();
  if (/(depot|station|historic|district|square|plaza|downtown|old town)/.test(haystack)) return 'urban-historic';
  if (/(waterfront|lake|river|creek|beach|marina|pier)/.test(haystack)) return 'waterfront';
  if (/(farm|ranch|barn|venue|gatherings|wedding|estate)/.test(haystack)) return 'private-venue';
  if (/(forest|trail|preserve|garden|arboretum|nature|park)/.test(haystack)) return 'nature-park';
  return 'other';
}

function getCityHotspotOverrides(city: string): string[] {
  const normalized = normalizeText(city);

  const configured = process.env.LOCATION_HOTSPOT_SEEDS_JSON;
  if (configured) {
    try {
      const parsed = JSON.parse(configured) as Record<string, string[]>;
      const fromConfig = parsed[normalized];
      if (Array.isArray(fromConfig) && fromConfig.length > 0) {
        return fromConfig.slice(0, 20);
      }
    } catch {
      // ignore malformed env config
    }
  }

  // Local hotspot pack: Magnolia, Texas
  if (/\bmagnolia\b/.test(normalized) && /\b(tx|texas)\b/.test(normalized)) {
    return [
      'Unity Park',
      'The Stroll at Magnolia',
      'Magnolia Depot',
      'Magnolia Acres',
      'Life in Rose Farm',
      'Dry Creek Gatherings',
      'Magnolia Bells',
      'Amber Springs',
      'Lake Windcrest',
    ];
  }

  return [];
}

function buildVenueSeedCandidates(rawText: string, city: string): string[] {
  const text = rawText.replace(/\s+/g, ' ').trim();
  if (!text) return [];

  const cityToken = normalizeText(city).split(' ')[0] || '';
  const stopWords = new Set([
    'best',
    'top',
    'near',
    'with',
    'from',
    'this',
    'that',
    'your',
    'guide',
    'ideas',
    'photo',
    'photos',
    'photoshoot',
    'photography',
    'reddit',
    'blog',
    'session',
    'locations',
  ]);

  const venueHint = /(park|garden|trail|square|plaza|waterfront|district|depot|farm|forest|lake|creek|beach|promenade|overlook|arboretum|museum|downtown|old town|historic)/i;
  const phrases = text.match(/\b[A-Z][a-zA-Z'&.-]*(?:\s+[A-Z][a-zA-Z'&.-]*){1,5}\b/g) ?? [];

  const cleaned = phrases
    .map(phrase => phrase.replace(/[|:;,]+$/g, '').trim())
    .filter(Boolean)
    .filter(phrase => phrase.length >= 5 && phrase.length <= 80)
    .filter(phrase => {
      const lower = normalizeText(phrase);
      if (!lower) return false;
      if (Array.from(stopWords).some(word => lower === word || lower.startsWith(`${word} `))) return false;
      if (cityToken && lower === cityToken) return false;
      return venueHint.test(phrase) || (cityToken && lower.includes(cityToken));
    });

  return Array.from(new Set(cleaned)).slice(0, 18);
}

async function discoverWebHotspotSeeds(
  city: string,
  sessionCategory: SearchCandidateInput['sessionCategory']
): Promise<string[]> {
  const serpApiKey = process.env.SERPAPI_API_KEY;
  const braveApiKey = process.env.BRAVE_SEARCH_API_KEY;
  const baseQuery = `${city} best photoshoot locations photographer`;
  const categoryHint =
    sessionCategory === 'family'
      ? 'family portraits'
      : sessionCategory === 'engagement'
        ? 'engagement photos'
        : sessionCategory === 'event'
          ? 'event portraits'
          : 'portrait photography';

  const queries = [
    `${baseQuery} ${categoryHint}`,
    `${city} site:reddit.com photoshoot locations`,
    `${city} photographer blog location guide`,
  ];

  const harvestedText: string[] = [];

  if (serpApiKey) {
    for (const q of queries) {
      const url = `https://serpapi.com/search.json?engine=google&q=${encodeURIComponent(q)}&num=8&api_key=${encodeURIComponent(serpApiKey)}`;
      try {
        const response = await fetch(url, {
          headers: { Accept: 'application/json', 'User-Agent': 'ShutterPlanAI/1.0' },
          cache: 'no-store',
        });
        if (!response.ok) continue;

        const payload = (await response.json()) as {
          organic_results?: Array<{ title?: string; snippet?: string }>;
        };

        (payload.organic_results ?? []).forEach(item => {
          harvestedText.push([item.title ?? '', item.snippet ?? ''].join(' '));
        });
      } catch {
        // ignore search provider errors
      }

      await sleep(180);
    }
  } else if (braveApiKey) {
    for (const q of queries) {
      const url = `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(q)}&count=8`;
      try {
        const response = await fetch(url, {
          headers: {
            Accept: 'application/json',
            'User-Agent': 'ShutterPlanAI/1.0',
            'X-Subscription-Token': braveApiKey,
          },
          cache: 'no-store',
        });
        if (!response.ok) continue;

        const payload = (await response.json()) as {
          web?: { results?: Array<{ title?: string; description?: string }> };
        };

        (payload.web?.results ?? []).forEach(item => {
          harvestedText.push([item.title ?? '', item.description ?? ''].join(' '));
        });
      } catch {
        // ignore search provider errors
      }

      await sleep(180);
    }
  }

  if (harvestedText.length === 0) return [];

  return buildVenueSeedCandidates(harvestedText.join(' '), city);
}

function getOverpassTagFilters(sessionCategory: SearchCandidateInput['sessionCategory']) {
  const common = [
    { key: 'leisure', value: 'park|garden|nature_reserve', relevanceScore: 12 },
    { key: 'tourism', value: 'viewpoint|attraction|picnic_site', relevanceScore: 11 },
    { key: 'historic', value: '.*', relevanceScore: 10 },
  ];

  if (sessionCategory === 'family') {
    return [
      ...common,
      { key: 'leisure', value: 'playground', relevanceScore: 9 },
      { key: 'natural', value: 'wood|water|beach', relevanceScore: 9 },
    ];
  }

  if (sessionCategory === 'engagement') {
    return [
      ...common,
      { key: 'tourism', value: 'artwork|museum', relevanceScore: 10 },
      { key: 'amenity', value: 'arts_centre', relevanceScore: 9 },
      { key: 'natural', value: 'peak|water', relevanceScore: 9 },
    ];
  }

  if (sessionCategory === 'event') {
    return [
      ...common,
      { key: 'amenity', value: 'conference_centre|events_venue', relevanceScore: 10 },
      { key: 'building', value: 'civic|public|museum', relevanceScore: 9 },
    ];
  }

  return [
    ...common,
    { key: 'tourism', value: 'museum|gallery', relevanceScore: 10 },
    { key: 'natural', value: 'wood|water|peak|beach', relevanceScore: 9 },
  ];
}

function getSearchQueries(
  sessionCategory: SearchCandidateInput['sessionCategory'],
  preferredTerms: string[] = []
) {
  const preferred = preferredTerms
    .map(term => normalizeText(term))
    .filter(Boolean)
    .slice(0, 8)
    .map(query => ({ query, relevanceScore: 12 }));

  const common = [
    { query: 'city park', relevanceScore: 9 },
    { query: 'state park', relevanceScore: 9 },
    { query: 'nature preserve', relevanceScore: 9 },
    { query: 'greenway trail', relevanceScore: 8 },
    { query: 'town square', relevanceScore: 8 },
    { query: 'lakefront park', relevanceScore: 8 },
    { query: 'riverwalk', relevanceScore: 8 },
    { query: 'historic courthouse square', relevanceScore: 8 },
    { query: 'botanical garden', relevanceScore: 10 },
  ];

  if (sessionCategory === 'family') {
    return [
      ...preferred,
      { query: 'botanical garden', relevanceScore: 10 },
      { query: 'community park', relevanceScore: 10 },
      { query: 'garden', relevanceScore: 9 },
      { query: 'nature trail', relevanceScore: 9 },
      { query: 'riverwalk', relevanceScore: 8 },
      { query: 'historic town square', relevanceScore: 8 },
      { query: 'arboretum', relevanceScore: 8 },
      { query: 'waterfront promenade', relevanceScore: 7 },
      ...common,
    ];
  }

  if (sessionCategory === 'engagement') {
    return [
      ...preferred,
      { query: 'botanical garden', relevanceScore: 10 },
      { query: 'downtown plaza', relevanceScore: 10 },
      { query: 'historic district', relevanceScore: 10 },
      { query: 'riverwalk', relevanceScore: 9 },
      { query: 'waterfront promenade', relevanceScore: 9 },
      { query: 'arts district', relevanceScore: 9 },
      { query: 'scenic overlook', relevanceScore: 8 },
      { query: 'park', relevanceScore: 7 },
      ...common,
    ];
  }

  if (sessionCategory === 'event') {
    return [
      ...preferred,
      { query: 'downtown plaza', relevanceScore: 10 },
      { query: 'hotel lobby', relevanceScore: 10 },
      { query: 'conference center', relevanceScore: 9 },
      { query: 'museum exterior', relevanceScore: 9 },
      { query: 'waterfront', relevanceScore: 8 },
      { query: 'garden', relevanceScore: 8 },
      { query: 'architectural plaza', relevanceScore: 8 },
      ...common,
    ];
  }

  return [
    ...preferred,
    { query: 'downtown arts district', relevanceScore: 10 },
    { query: 'architectural plaza', relevanceScore: 10 },
    { query: 'museum exterior', relevanceScore: 9 },
    { query: 'waterfront', relevanceScore: 9 },
    { query: 'historic district', relevanceScore: 9 },
    { query: 'garden', relevanceScore: 8 },
    { query: 'riverwalk', relevanceScore: 8 },
    ...common,
  ];
}

export async function searchLocationCandidates(input: SearchCandidateInput): Promise<LocationCandidate[]> {
  const city = input.city.trim();
  const localOverrides = getCityHotspotOverrides(city);
  const webSeeds = await discoverWebHotspotSeeds(city, input.sessionCategory);
  const mergedPreferred = [...(input.preferredTerms ?? []), ...localOverrides, ...webSeeds];
  const queries = getSearchQueries(input.sessionCategory, mergedPreferred);
  const blocked = (input.bannedTerms ?? []).map(t => t.toLowerCase()).filter(Boolean);
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

  type RawCandidate = LocationCandidate & {
    distanceKm: number | null;
    className?: string;
    placeType?: string;
    importance: number;
    score: number;
  };
  const collected: RawCandidate[] = [];
  const seenKeys = new Set<string>();

  const addResults = (
    results: Array<{
      lat?: string;
      lon?: string;
      display_name?: string;
      class?: string;
      type?: string;
      importance?: number;
    }>,
    entry: { query: string; relevanceScore: number },
    radiusKm: number
  ) => {
    let added = 0;

    for (const result of results) {
      const lat = Number(result.lat);
      const lon = Number(result.lon);
      const displayName = result.display_name ?? '';
      const className = result.class ?? '';
      const placeType = result.type ?? '';
      const importance = Number(result.importance ?? 0);
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;

      const lower = normalizeText(displayName);
      if (blocked.some(t => lower.includes(t))) continue;

      const isAdministrativeOnly =
        className === 'boundary' ||
        (className === 'place' && /(city|town|village|hamlet|county|state|region|country)/i.test(placeType));
      if (isAdministrativeOnly) continue;

      const key = normalizeText(displayName || `${lat.toFixed(4)},${lon.toFixed(4)}`);
      if (seenKeys.has(key)) continue;
      seenKeys.add(key);

      let distanceKm: number | null = null;
      if (hasCenter) {
        distanceKm = haversineKm(cLat, cLon, lat, lon);
        if (distanceKm > radiusKm) continue;
      }

      const poiBoost = /(park|garden|trail|promenade|plaza|square|waterfront|arboretum|district|overlook|farm|depot|lake|creek)/i.test(lower)
        ? 6
        : 0;
      const lowValuePenalty = /(tot park|tot lot|playground|dog park|skate park|sports complex|ball field)/i.test(lower)
        ? 12
        : 0;
      const distancePenalty = distanceKm == null ? 0 : distanceKm * 0.12;
      const score = entry.relevanceScore * 10 + importance * 8 + poiBoost - lowValuePenalty - distancePenalty;

      collected.push({
        name: displayName.split(',')[0]?.trim() || displayName,
        latitude: lat,
        longitude: lon,
        displayName,
        sourceQuery: entry.query,
        relevanceScore: entry.relevanceScore,
        distanceKm,
        className,
        placeType,
        importance: Number.isFinite(importance) ? importance : 0,
        score,
      });
      added++;
    }

    return added;
  };

  const addOverpassResults = async (radiusKm: number) => {
    if (!hasCenter) return;

    const radiusMeters = Math.round(radiusKm * 1000);
    const filters = getOverpassTagFilters(input.sessionCategory);
    const block = filters
      .map(filter => `nwr(around:${radiusMeters},${cLat},${cLon})["${filter.key}"~"${filter.value}"]["name"];`)
      .join('\n');

    const query = `[out:json][timeout:20];\n(\n${block}\n);\nout center 120;`;
    const url = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`;

    try {
      const response = await fetch(url, {
        headers: {
          Accept: 'application/json',
          'User-Agent': 'ShutterPlanAI/1.0',
        },
        cache: 'no-store',
      });

      if (!response.ok) return;

      const payload = (await response.json()) as {
        elements?: Array<{
          lat?: number;
          lon?: number;
          center?: { lat?: number; lon?: number };
          tags?: Record<string, string>;
        }>;
      };

      const elements = Array.isArray(payload.elements) ? payload.elements : [];
      const mapped = elements
        .map(element => {
          const lat = Number(element.lat ?? element.center?.lat);
          const lon = Number(element.lon ?? element.center?.lon);
          if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;

          const tags = element.tags ?? {};
          const name = (tags.name || '').trim();
          if (!name) return null;

          const lowerName = normalizeText(name);
          if (blocked.some(term => lowerName.includes(term))) return null;

          const cityPart = tags['addr:city'] || city;
          const displayName = cityPart ? `${name}, ${cityPart}` : name;
          const primaryTag =
            tags.leisure || tags.tourism || tags.historic || tags.amenity || tags.natural || tags.building || 'poi';

          const filterMatch = filters.find(filter => {
            const value = tags[filter.key];
            if (!value) return false;
            return new RegExp(`^(${filter.value})$`, 'i').test(value);
          });

          return {
            lat: String(lat),
            lon: String(lon),
            display_name: displayName,
            class: 'poi',
            type: primaryTag,
            importance: (filterMatch?.relevanceScore ?? 9) / 12,
          };
        })
        .filter(
          (
            candidate
          ): candidate is {
            lat: string;
            lon: string;
            display_name: string;
            class: string;
            type: string;
            importance: number;
          } => candidate !== null
        );

      addResults(mapped, { query: `overpass:${input.sessionCategory}`, relevanceScore: 13 }, radiusKm);
    } catch {
      // ignore and continue
    }
  };

  // Pass 0: global POI source (Overpass) so we can surface local named hotspots
  // around the world without hardcoded city-specific query strings.
  if (hasCenter) {
    for (const radiusKm of [18, 35, 60]) {
      if (collected.length >= Math.max(4, Math.ceil(limit / 2))) break;
      await addOverpassResults(radiusKm);
      await sleep(250);
    }
  }

  // Pass 1: exact-name searches for local hotspots + preferred terms.
  // This catches "known good" places that generic category queries can miss.
  const exactNameSeeds = Array.from(
    new Set(
      mergedPreferred
        .map(term => term.trim())
        .filter(Boolean)
        .filter(term => term.split(/\s+/).length >= 2)
    )
  ).slice(0, 12);

  if (exactNameSeeds.length > 0) {
    const maxExactDistanceKm = Math.max(input.near?.maxDistanceKm ?? 80, 95);

    for (const seed of exactNameSeeds) {
      const params = new URLSearchParams({
        format: 'jsonv2',
        limit: '4',
        q: `${seed}, ${city}`,
      });

      if (isLikelyUsLocation(city) || isLikelyUsZip(city)) {
        params.set('countrycodes', 'us');
      }

      const url = `https://nominatim.openstreetmap.org/search?${params.toString()}`;

      try {
        const response = await fetch(url, {
          headers: { Accept: 'application/json', 'User-Agent': 'ShutterPlanAI/1.0' },
          cache: 'no-store',
        });

        if (!response.ok) continue;
        const results = (await response.json()) as Array<{
          lat?: string;
          lon?: string;
          display_name?: string;
          class?: string;
          type?: string;
          importance?: number;
        }>;

        addResults(results, { query: seed, relevanceScore: 14 }, maxExactDistanceKm);
      } catch {
        // ignore and continue
      }

      await sleep(200);
      if (collected.length >= limit * 2) break;
    }
  }
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
          const results = (await response.json()) as Array<{
            lat?: string;
            lon?: string;
            display_name?: string;
            class?: string;
            type?: string;
            importance?: number;
          }>;
          const foundThisQuery = addResults(results, entry, radiusKm);

          if (foundThisQuery > 0) satisfiedQueries.add(entry.query);
        }
      } catch {
        // ignore and continue to next query
      }

      await sleep(200); // Nominatim rate limit: ≤ 1 req/sec
      if (collected.length >= limit * 2) break;
    }
  }

  const ranked = collected.sort((a, b) => {
      if (a.score !== b.score) return b.score - a.score;
      if (a.relevanceScore !== b.relevanceScore) return b.relevanceScore - a.relevanceScore;
      if (a.distanceKm == null && b.distanceKm == null) return 0;
      if (a.distanceKm == null) return 1;
      if (b.distanceKm == null) return -1;
      return a.distanceKm - b.distanceKm;
    });

  // Diversity pass: avoid returning mostly parks when other strong venue types exist.
  const cappedByBucket: RawCandidate[] = [];
  const bucketCounts = new Map<string, number>();
  const maxPerBucket = 2;

  for (const candidate of ranked) {
    const bucket = getVenueBucket({
      displayName: candidate.displayName || candidate.name,
      className: candidate.className,
      placeType: candidate.placeType,
    });
    const current = bucketCounts.get(bucket) ?? 0;
    if (current >= maxPerBucket) continue;
    bucketCounts.set(bucket, current + 1);
    cappedByBucket.push(candidate);
    if (cappedByBucket.length >= limit) break;
  }

  // Fill remaining slots with next-best ranked candidates if diversity cap leaves gaps.
  if (cappedByBucket.length < limit) {
    for (const candidate of ranked) {
      const exists = cappedByBucket.some(item =>
        normalizeText(item.displayName || item.name) === normalizeText(candidate.displayName || candidate.name)
      );
      if (exists) continue;
      cappedByBucket.push(candidate);
      if (cappedByBucket.length >= limit) break;
    }
  }

  return cappedByBucket.slice(0, limit);
}
