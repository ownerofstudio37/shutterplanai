import { NextResponse } from 'next/server';
import { getForecastIntelligence, scoreLocationLogistics, optimizeRouteOrder } from '@/lib/planner/intelligence';

export async function POST(request: Request) {
  try {
    const { latitude, longitude, date, durationMinutes, locations, sessionCategory } = await request.json();

    // Weather + golden hours from provider-backed forecast
    const forecast = await getForecastIntelligence({
      latitude: Number(latitude || 0),
      longitude: Number(longitude || 0),
      date: new Date(date),
      durationMinutes: Number(durationMinutes || 90),
    });

    // Logistics scoring for all locations
    const logisticsScores = locations.map((loc: any) =>
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

    return NextResponse.json({
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
    console.error('Intelligence calculation error:', error);
    return NextResponse.json(
      { error: 'Failed to calculate intelligence' },
      { status: 500 }
    );
  }
}
