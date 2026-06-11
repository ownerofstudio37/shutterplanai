import { describe, expect, it } from 'vitest';
import { getForecastIntelligence, optimizeRouteOrder, scoreLocationLogistics } from './intelligence';

describe('planner intelligence utilities', () => {
  it('optimizes route order and keeps all location indexes', () => {
    const route = optimizeRouteOrder([
      { name: 'A', latitude: 32.78, longitude: -96.8, index: 0 },
      { name: 'B', latitude: 32.8, longitude: -96.82, index: 1 },
      { name: 'C', latitude: 32.79, longitude: -96.81, index: 2 },
    ]);

    expect(route).toHaveLength(3);
    expect(new Set(route)).toEqual(new Set([0, 1, 2]));
  });

  it('falls back to original order when coordinates are sparse', () => {
    const route = optimizeRouteOrder([
      { name: 'A', latitude: 32.78, longitude: -96.8, index: 0 },
      { name: 'B', latitude: null, longitude: null, index: 1 },
      { name: 'C', latitude: null, longitude: null, index: 2 },
      { name: 'D', latitude: null, longitude: null, index: 3 },
    ]);

    expect(route).toEqual([0, 1, 2, 3]);
  });

  it('favors locations matching the current shoot time window', () => {
    const route = optimizeRouteOrder(
      [
        { name: 'Morning Spot', latitude: 32.80, longitude: -96.82, index: 0, preferredTimeWindow: 'morning' },
        { name: 'Golden Spot', latitude: 32.79, longitude: -96.81, index: 1, preferredTimeWindow: 'golden hour' },
        { name: 'Anytime Spot', latitude: 32.78, longitude: -96.8, index: 2 },
      ],
      {
        shootStartIso: '2026-06-11T18:00:00.000Z',
        durationMinutes: 90,
      }
    );

    expect(route.indexOf(1)).toBeLessThan(route.indexOf(0));
    expect(new Set(route)).toEqual(new Set([0, 1, 2]));
  });

  it('returns elevated logistics risk for difficult parking/no restroom', () => {
    const scored = scoreLocationLogistics(
      {
        name: 'Busy Downtown Spot',
        venueBucket: 'urban-historic',
        logistics: {
          parking: 'difficult street parking',
          restroom: 'no nearby restroom',
        },
      },
      'family'
    );

    expect(scored.overallRisk).toBeGreaterThanOrEqual(6);
    expect(scored.warnings.length).toBeGreaterThan(0);
  });

  it('uses provider forecast and returns shoot-window confidence', async () => {
    const forecast = await getForecastIntelligence(
      {
        latitude: 32.7767,
        longitude: -96.797,
        date: new Date('2026-06-11T18:00:00.000Z'),
        durationMinutes: 90,
      },
      async () =>
        new Response(
          JSON.stringify({
            daily: {
              sunrise: ['2026-06-11T11:30:00Z'],
              sunset: ['2026-06-11T01:30:00Z'],
            },
            hourly: {
              time: ['2026-06-11T18:00:00Z', '2026-06-11T19:00:00Z', '2026-06-11T20:00:00Z'],
              cloud_cover: [25, 35, 40],
              uv_index: [3, 2, 1],
              wind_speed_10m: [6, 7, 8],
              wind_gusts_10m: [10, 11, 12],
              precipitation_probability: [5, 10, 10],
            },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
    );

    expect(forecast.weather.provider).toBe('open-meteo');
    expect(forecast.confidence.windows.length).toBeGreaterThan(0);
    expect(forecast.confidence.overall).toBeGreaterThan(50);
  });

  it('falls back when provider fails', async () => {
    const forecast = await getForecastIntelligence(
      {
        latitude: 32.7767,
        longitude: -96.797,
        date: new Date('2026-06-11T18:00:00.000Z'),
      },
      async () => new Response('error', { status: 500 })
    );

    expect(forecast.weather.provider).toBe('fallback');
    expect(forecast.confidence.windows.length).toBe(1);
  });
});
