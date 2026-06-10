export interface GeocodeResult {
  latitude: number | null;
  longitude: number | null;
  displayName?: string;
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
