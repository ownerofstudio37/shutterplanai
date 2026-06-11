import { NextResponse } from 'next/server';
import { calculateGoldenHours, scoreLocationLogistics, optimizeRouteOrder } from '@/lib/planner/intelligence';

export async function POST(request: Request) {
  try {
    const { latitude, longitude, date, locations, sessionCategory } = await request.json();

    // Golden hours calculation
    const goldenHours = calculateGoldenHours(latitude || 0, longitude || 0, new Date(date));

    // Logistics scoring for all locations
    const logisticsScores = locations.map((loc: any) =>
      scoreLocationLogistics(loc, sessionCategory)
    );

    // Route optimization
    const optimizedIndices = optimizeRouteOrder(
      locations.map((loc: any, i: number) => ({
        ...loc,
        index: i,
      }))
    );

    return NextResponse.json({
      goldenHours: {
        sunrise: goldenHours.sunrise.toISOString(),
        sunset: goldenHours.sunset.toISOString(),
        goldenHourStart: goldenHours.goldenHourStart.toISOString(),
        goldenHourEnd: goldenHours.goldenHourEnd.toISOString(),
      },
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
