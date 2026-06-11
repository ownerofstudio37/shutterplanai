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
  recommendations: string[];
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
