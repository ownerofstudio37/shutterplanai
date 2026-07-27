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
  date?: string | null;
  durationMinutes?: number;
  locations?: IntelligenceLocation[] | null;
  sessionCategory?: string;
};

export async function POST(request: Request) {
  const requestContext = startApiRequest('/api/planner/intelligence', 'POST');
  try {
    const { latitude, longitude, date, durationMinutes, locations, sessionCategory } =
      (await request.json()) as IntelligenceRequestBody;
    const coordinates = sanitizeCoordinates(latitude, longitude);
    const parsedDate = date ? new Date(date) : new Date();
    const safeDate = Number.isNaN(parsedDate.getTime()) ? new Date() : parsedDate;
    const safeLocations = Array.isArray(locations) ? locations : [];
    const safeDurationMinutes = Number.isFinite(Number(durationMinutes))
      ? Number(durationMinutes)
      : 90;

    // Weather + golden hours from provider-backed forecast
    const forecast = await getForecastIntelligence({
      latitude: coordinates.latitude ?? 0,
      longitude: coordinates.longitude ?? 0,
      date: safeDate,
      durationMinutes: safeDurationMinutes,
    });

    // Logistics scoring for all locations
    const logisticsScores = safeLocations.map(loc =>
      scoreLocationLogistics(loc, sessionCategory)
    );

    // Route optimization
    const optimizedIndices = optimizeRouteOrder(
      safeLocations.map((loc, i) => ({
        ...loc,
        index: i,
      })),
      {
        shootStartIso: safeDate.toISOString(),
        durationMinutes: safeDurationMinutes,
      }
    );

    apiSuccess(requestContext, 200, { locationCount: safeLocations.length });
    return jsonWithApiMeta(requestContext, {
      success: true,
      goldenHours: {
        sunrise: forecast.weather.sunriseTime,
        sunset: forecast.weather.sunsetTime,
        goldenHourStart: forecast.weather.goldenHourStart,
        goldenHourEnd: forecast.weather.goldenHourEnd,
        morningGoldenHourStart: forecast.weather.morningGoldenHourStart,
        morningGoldenHourEnd: forecast.weather.morningGoldenHourEnd,
        morningBlueHourStart: forecast.weather.morningBlueHourStart,
        morningBlueHourEnd: forecast.weather.morningBlueHourEnd,
        eveningBlueHourStart: forecast.weather.eveningBlueHourStart,
        eveningBlueHourEnd: forecast.weather.eveningBlueHourEnd,
      },
      weather: forecast.weather,
      confidence: forecast.confidence,
      sunWindows: forecast.sunWindows,
      logistics: logisticsScores,
      optimizedRoute: optimizedIndices,
    });
  } catch (error) {
    apiFailure(requestContext, 500, error, { stage: 'calculate_intelligence' });
    return jsonWithApiMeta(
      requestContext,
      { success: false, error: 'Failed to calculate intelligence' },
      { status: 500 }
    );
  }
}
