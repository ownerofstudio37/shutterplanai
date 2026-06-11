import { getForecastIntelligence, scoreLocationLogistics, optimizeRouteOrder } from '@/lib/planner/intelligence';
import { sanitizeCoordinates } from '@/lib/planner/plannerUtils';
import { apiFailure, apiSuccess, jsonWithApiMeta, startApiRequest } from '@/lib/utils/apiObservability';

type IntelligenceLocation = {
  name: string;
  latitude: number | null;
  longitude: number | null;
  venueBucket?: string;
  preferredTimeWindow?: string | null;
  logistics?: {
    parking?: string;
    restroom?: string;
  };
};

type IntelligenceRequestBody = {
  latitude?: number | null;
  longitude?: number | null;
  date: string;
  durationMinutes?: number;
  locations: IntelligenceLocation[];
  sessionCategory?: string;
};

export async function POST(request: Request) {
  const requestContext = startApiRequest('/api/planner/intelligence', 'POST');
  try {
    const { latitude, longitude, date, durationMinutes, locations, sessionCategory } =
      (await request.json()) as IntelligenceRequestBody;
    const coordinates = sanitizeCoordinates(latitude, longitude);

    // Weather + golden hours from provider-backed forecast
    const forecast = await getForecastIntelligence({
      latitude: coordinates.latitude ?? 0,
      longitude: coordinates.longitude ?? 0,
      date: new Date(date),
      durationMinutes: Number(durationMinutes || 90),
    });

    // Logistics scoring for all locations
    const logisticsScores = locations.map(loc =>
      scoreLocationLogistics(loc, sessionCategory)
    );

    // Route optimization
    const optimizedIndices = optimizeRouteOrder(
      locations.map((loc, i) => ({
        ...loc,
        index: i,
      })),
      {
        shootStartIso: date,
        durationMinutes: Number(durationMinutes || 90),
      }
    );

    apiSuccess(requestContext, 200, { locationCount: locations.length });
    return jsonWithApiMeta(requestContext, {
      goldenHours: {
        sunrise: forecast.weather.sunriseTime,
        sunset: forecast.weather.sunsetTime,
        goldenHourStart: forecast.weather.goldenHourStart,
        goldenHourEnd: forecast.weather.goldenHourEnd,
      },
      weather: forecast.weather,
      confidence: forecast.confidence,
      logistics: logisticsScores,
      optimizedRoute: optimizedIndices,
    });
  } catch (error) {
    apiFailure(requestContext, 500, error, { stage: 'calculate_intelligence' });
    return jsonWithApiMeta(
      requestContext,
      { error: 'Failed to calculate intelligence' },
      { status: 500 }
    );
  }
}
