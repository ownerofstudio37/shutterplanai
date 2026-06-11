// Weather and sun intelligence calculations
export interface WeatherData {
  goldenHourStart: string;
  goldenHourEnd: string;
  sunsetTime: string;
  sunriseTime: string;
  cloudCover: number;
  uvIndex: number;
  windSpeed: number;
  windGustSpeed: number;
  precipitationProbability: number;
  recommendations: string[];
  provider: 'open-meteo' | 'fallback';
}

export interface WeatherWindowConfidence {
  label: string;
  startsAt: string;
  endsAt: string;
  confidence: number;
  summary: string;
}

export interface ForecastIntelligence {
  weather: WeatherData;
  confidence: {
    overall: number;
    windows: WeatherWindowConfidence[];
  };
}

export interface LogisticsScore {
  parkingDifficulty: number; // 1-10, higher = harder
  restroomAccessibility: number; // 1-10
  permitLikelihood: number; // 1-10, higher = more likely needed
  crowdRisk: number; // 1-10, higher = more crowded
  accessibility: number; // 1-10
  overallRisk: number; // 1-10
  warnings: string[];
}

export interface OptimizedRoute {
  stops: Array<{
    index: number;
    name: string;
    lat: number;
    lng: number;
    driveMins: number;
  }>;
  totalDriveMins: number;
  transitionBurden: number; // 1-10
  recommendations: string[];
}

/**
 * Calculate golden hour times based on date and coordinates
 * Uses simplified algorithm; for production, consider external API
 */
export function calculateGoldenHours(latitude: number, longitude: number, date: Date): {
  sunrise: Date;
  sunset: Date;
  goldenHourStart: Date;
  goldenHourEnd: Date;
} {
  // Simplified calculation - in production use suncalc or similar library
  
  
  // Sunrise/sunset approximation (±6 hours from solar noon, simplified)
  const sunriseOffset = 6 * 60 * 60 * 1000;
  const sunsetOffset = 6 * 60 * 60 * 1000;
  
  const sunrise = new Date(date.getTime() - sunriseOffset);
  const sunset = new Date(date.getTime() + sunsetOffset);
  
  // Golden hour is ~60 min before sunset and ~60 min after sunrise
  const goldenHourStart = new Date(sunset.getTime() - 60 * 60 * 1000);
  const goldenHourEnd = new Date(sunset.getTime());
  
  return { sunrise, sunset, goldenHourStart, goldenHourEnd };
}

type OpenMeteoResponse = {
  daily?: {
    sunrise?: string[];
    sunset?: string[];
  };
  hourly?: {
    time?: string[];
    cloud_cover?: number[];
    uv_index?: number[];
    wind_speed_10m?: number[];
    wind_gusts_10m?: number[];
    precipitation_probability?: number[];
  };
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function summarizeConfidence(score: number) {
  if (score >= 85) return 'Excellent conditions';
  if (score >= 70) return 'Good conditions';
  if (score >= 55) return 'Usable with care';
  return 'High weather risk';
}

function calculateConfidenceScore(metrics: {
  precipitationProbability: number;
  cloudCover: number;
  windSpeed: number;
  windGustSpeed: number;
  uvIndex: number;
}) {
  let score = 100;

  score -= clamp(metrics.precipitationProbability, 0, 100) * 0.5;
  score -= Math.abs(clamp(metrics.cloudCover, 0, 100) - 35) * 0.3;
  score -= Math.max(0, metrics.windSpeed - 8) * 2;
  score -= Math.max(0, metrics.windGustSpeed - 14) * 1.5;
  score -= Math.max(0, metrics.uvIndex - 8) * 3;

  return Math.round(clamp(score, 5, 100));
}

function getWindowAverages(
  hourly: OpenMeteoResponse['hourly'],
  startsAt: Date,
  endsAt: Date
) {
  const times = hourly?.time ?? [];
  if (!times.length) return null;

  const collect = (values?: number[]) => {
    if (!values || values.length !== times.length) return [] as number[];
    return values.filter((_value, index) => {
      const timestamp = new Date(times[index]);
      return timestamp >= startsAt && timestamp <= endsAt;
    });
  };

  const avg = (values: number[], fallback = 0) => {
    if (!values.length) return fallback;
    return values.reduce((sum, value) => sum + value, 0) / values.length;
  };

  const cloudCover = avg(collect(hourly?.cloud_cover), 50);
  const uvIndex = avg(collect(hourly?.uv_index), 4);
  const windSpeed = avg(collect(hourly?.wind_speed_10m), 10);
  const windGustSpeed = avg(collect(hourly?.wind_gusts_10m), 14);
  const precipitationProbability = avg(collect(hourly?.precipitation_probability), 20);

  return {
    cloudCover,
    uvIndex,
    windSpeed,
    windGustSpeed,
    precipitationProbability,
  };
}

function createFallbackForecast(date: Date): ForecastIntelligence {
  const estimated = calculateGoldenHours(0, 0, date);
  const baseMetrics = {
    cloudCover: 50,
    uvIndex: 4,
    windSpeed: 10,
    windGustSpeed: 14,
    precipitationProbability: 20,
  };

  const confidence = calculateConfidenceScore(baseMetrics);
  const window: WeatherWindowConfidence = {
    label: 'Planned shoot window',
    startsAt: date.toISOString(),
    endsAt: new Date(date.getTime() + 60 * 60 * 1000).toISOString(),
    confidence,
    summary: `${summarizeConfidence(confidence)} (fallback estimate)`,
  };

  return {
    weather: {
      goldenHourStart: estimated.goldenHourStart.toISOString(),
      goldenHourEnd: estimated.goldenHourEnd.toISOString(),
      sunsetTime: estimated.sunset.toISOString(),
      sunriseTime: estimated.sunrise.toISOString(),
      cloudCover: baseMetrics.cloudCover,
      uvIndex: baseMetrics.uvIndex,
      windSpeed: baseMetrics.windSpeed,
      windGustSpeed: baseMetrics.windGustSpeed,
      precipitationProbability: baseMetrics.precipitationProbability,
      recommendations: ['Forecast provider unavailable. Using conservative fallback estimate.'],
      provider: 'fallback',
    },
    confidence: {
      overall: confidence,
      windows: [window],
    },
  };
}

export async function getForecastIntelligence(
  params: { latitude: number; longitude: number; date: Date; durationMinutes?: number },
  fetcher: typeof fetch = fetch
): Promise<ForecastIntelligence> {
  const { latitude, longitude, date } = params;
  const durationMinutes = Math.max(20, Math.min(240, params.durationMinutes ?? 90));

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return createFallbackForecast(date);
  }

  try {
    const endpoint = new URL('https://api.open-meteo.com/v1/forecast');
    endpoint.searchParams.set('latitude', String(latitude));
    endpoint.searchParams.set('longitude', String(longitude));
    endpoint.searchParams.set('timezone', 'auto');
    endpoint.searchParams.set('forecast_days', '2');
    endpoint.searchParams.set('daily', 'sunrise,sunset');
    endpoint.searchParams.set(
      'hourly',
      'cloud_cover,uv_index,wind_speed_10m,wind_gusts_10m,precipitation_probability'
    );

    const response = await fetcher(endpoint.toString(), {
      method: 'GET',
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    });

    if (!response.ok) {
      return createFallbackForecast(date);
    }

    const data = (await response.json()) as OpenMeteoResponse;
    const sunrise = data.daily?.sunrise?.[0] ? new Date(data.daily.sunrise[0]) : null;
    const sunset = data.daily?.sunset?.[0] ? new Date(data.daily.sunset[0]) : null;

    if (!sunrise || !sunset || Number.isNaN(sunrise.getTime()) || Number.isNaN(sunset.getTime())) {
      return createFallbackForecast(date);
    }

    const shootStart = new Date(date);
    const shootEnd = new Date(shootStart.getTime() + durationMinutes * 60 * 1000);
    const eveningGoldenStart = new Date(sunset.getTime() - 60 * 60 * 1000);
    const eveningGoldenEnd = sunset;

    const plannedWindowMetrics = getWindowAverages(data.hourly, shootStart, shootEnd);
    const goldenWindowMetrics = getWindowAverages(data.hourly, eveningGoldenStart, eveningGoldenEnd);
    const baselineMetrics = {
      cloudCover: plannedWindowMetrics?.cloudCover ?? 45,
      uvIndex: plannedWindowMetrics?.uvIndex ?? 4,
      windSpeed: plannedWindowMetrics?.windSpeed ?? 8,
      windGustSpeed: plannedWindowMetrics?.windGustSpeed ?? 12,
      precipitationProbability: plannedWindowMetrics?.precipitationProbability ?? 15,
    };

    const plannedConfidence = calculateConfidenceScore(baselineMetrics);
    const goldenConfidence = calculateConfidenceScore(
      goldenWindowMetrics ?? {
        ...baselineMetrics,
        cloudCover: clamp(baselineMetrics.cloudCover - 5, 0, 100),
      }
    );

    const windows: WeatherWindowConfidence[] = [
      {
        label: 'Planned shoot window',
        startsAt: shootStart.toISOString(),
        endsAt: shootEnd.toISOString(),
        confidence: plannedConfidence,
        summary: summarizeConfidence(plannedConfidence),
      },
      {
        label: 'Golden hour window',
        startsAt: eveningGoldenStart.toISOString(),
        endsAt: eveningGoldenEnd.toISOString(),
        confidence: goldenConfidence,
        summary: summarizeConfidence(goldenConfidence),
      },
    ];

    const overall = Math.round((plannedConfidence * 0.65 + goldenConfidence * 0.35));
    const recommendations: string[] = [];
    if (baselineMetrics.precipitationProbability >= 45) {
      recommendations.push('High precipitation risk. Prepare weather backup options.');
    }
    if (baselineMetrics.windGustSpeed >= 20) {
      recommendations.push('Strong gusts expected. Plan stable posing and hair/wrap control.');
    }
    if (baselineMetrics.uvIndex >= 8) {
      recommendations.push('UV risk is high. Favor shade and short direct-sun intervals.');
    }
    if (recommendations.length === 0) {
      recommendations.push('Weather and light profile look stable for this session window.');
    }

    return {
      weather: {
        goldenHourStart: eveningGoldenStart.toISOString(),
        goldenHourEnd: eveningGoldenEnd.toISOString(),
        sunsetTime: sunset.toISOString(),
        sunriseTime: sunrise.toISOString(),
        cloudCover: Math.round(baselineMetrics.cloudCover),
        uvIndex: Number(baselineMetrics.uvIndex.toFixed(1)),
        windSpeed: Number(baselineMetrics.windSpeed.toFixed(1)),
        windGustSpeed: Number(baselineMetrics.windGustSpeed.toFixed(1)),
        precipitationProbability: Math.round(baselineMetrics.precipitationProbability),
        recommendations,
        provider: 'open-meteo',
      },
      confidence: {
        overall,
        windows,
      },
    };
  } catch {
    return createFallbackForecast(date);
  }
}

/**
 * Score logistics and risks for a location
 */
export function scoreLocationLogistics(
  location: { name: string; venueBucket?: string; logistics?: { parking?: string; restroom?: string } },
  sessionCategory?: string
): LogisticsScore {
  const scores = {
    parkingDifficulty: 5,
    restroomAccessibility: 5,
    permitLikelihood: 3,
    crowdRisk: 5,
    accessibility: 7,
  };

  const warnings: string[] = [];

  // Parking scoring
  if (location.logistics?.parking?.toLowerCase().includes('difficult')) {
    scores.parkingDifficulty = 8;
    warnings.push('Parking is difficult - plan extra time');
  } else if (location.logistics?.parking?.toLowerCase().includes('easy')) {
    scores.parkingDifficulty = 2;
  }

  // Restroom scoring
  if (!location.logistics?.restroom || location.logistics.restroom.toLowerCase().includes('no')) {
    scores.restroomAccessibility = 2;
    warnings.push('No restroom access - plan accordingly');
  }

  // Venue bucket-based scoring
  if (location.venueBucket === 'urban-historic') {
    scores.permitLikelihood = 6;
    scores.crowdRisk = 7;
  } else if (location.venueBucket === 'nature-park') {
    scores.crowdRisk = 6;
    scores.accessibility = 5;
  } else if (location.venueBucket === 'private-venue') {
    scores.permitLikelihood = 2;
    scores.crowdRisk = 2;
  }

  // Session-specific adjustments
  if (sessionCategory === 'family') {
    if (scores.restroomAccessibility < 5) {
      warnings.push('Poor restroom access - may not be ideal for families');
    }
    scores.accessibility = Math.max(scores.accessibility - 2, 1);
  }

  const overallRisk = Math.round(
    (scores.parkingDifficulty + scores.permitLikelihood + scores.crowdRisk) / 3
  );

  return {
    parkingDifficulty: scores.parkingDifficulty,
    restroomAccessibility: scores.restroomAccessibility,
    permitLikelihood: scores.permitLikelihood,
    crowdRisk: scores.crowdRisk,
    accessibility: scores.accessibility,
    overallRisk,
    warnings,
  };
}

/**
 * Optimize route order using greedy nearest-neighbor TSP approximation
 */
export function optimizeRouteOrder(
  locations: Array<{ name: string; latitude: number | null; longitude: number | null; index: number }>
): number[] {
  const valid = locations.filter(loc => loc.latitude != null && loc.longitude != null);
  if (valid.length <= 2) {
    return locations.map(l => l.index);
  }

  // Haversine distance
  const distance = (lat1: number, lng1: number, lat2: number, lng2: number) => {
    const R = 3959; // miles
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(a));
  };

  // Greedy nearest neighbor starting from first
  const visited = new Set<number>();
  const route = [valid[0].index];
  visited.add(0);

  while (visited.size < valid.length) {
    const current = valid[route[route.length - 1]];
    let nearest = -1;
    let minDist = Infinity;

    for (let i = 0; i < valid.length; i++) {
      if (!visited.has(i)) {
        const d = distance(current.latitude!, current.longitude!, valid[i].latitude!, valid[i].longitude!);
        if (d < minDist) {
          minDist = d;
          nearest = i;
        }
      }
    }

    if (nearest !== -1) {
      route.push(valid[nearest].index);
      visited.add(nearest);
    }
  }

  return route;
}
