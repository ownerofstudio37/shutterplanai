export interface GeocodeResult {
  latitude: number | null;
  longitude: number | null;
  displayName?: string;
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function geocodePlace(input: {
  place: string;
  city?: string;
}): Promise<GeocodeResult> {
  const place = input.place?.trim();
  if (!place) {
    return { latitude: null, longitude: null };
  }

  const query = [place, input.city?.trim()].filter(Boolean).join(', ');
  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(query)}`;

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

    const first = results?.[0];
    if (!first?.lat || !first?.lon) {
      return { latitude: null, longitude: null };
    }

    const latitude = Number(first.lat);
    const longitude = Number(first.lon);

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return { latitude: null, longitude: null };
    }

    return {
      latitude,
      longitude,
      displayName: first.display_name,
    };
  } catch {
    return { latitude: null, longitude: null };
  }
}

export async function geocodeLocations<T extends { name: string }>(
  locations: T[],
  city?: string
): Promise<Array<T & GeocodeResult>> {
  const enriched: Array<T & GeocodeResult> = [];

  for (let index = 0; index < locations.length; index += 1) {
    const location = locations[index];
    const geo = await geocodePlace({ place: location.name, city });
    enriched.push({ ...location, ...geo });

    if (index < locations.length - 1) {
      await sleep(250);
    }
  }

  return enriched;
}
