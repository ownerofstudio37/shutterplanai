import { NextResponse } from 'next/server';
import { getForecastIntelligence, scoreLocationLogistics, optimizeRouteOrder } from '@/lib/planner/intelligence';
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
  latitude?: number;
  longitude?: number;
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

    // Weather + golden hours from provider-backed forecast
    const forecast = await getForecastIntelligence({
      latitude: Number(latitude || 0),
      longitude: Number(longitude || 0),
      date: new Date(date),
      durationMinutes: Number(durationMinutes || 90),
    });

    // Logistics scoring for all locations
    const logisticsScores = locations.map(loc =>
      scoreLocationLogistics(loc, sessionCategory)
    );

    // Route optimization
    const optimizedIndices = optimizeRouteOrder(
      locations.map((loc: any, i: number) => ({
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
