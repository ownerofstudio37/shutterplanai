import { beforeEach, describe, expect, it, vi } from 'vitest';
import { POST } from './route';

describe('planner intelligence route', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('returns golden hour, logistics, and optimized route', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            daily: {
              sunrise: ['2026-06-11T11:30:00Z'],
              sunset: ['2026-06-11T01:30:00Z'],
            },
            hourly: {
              time: ['2026-06-11T18:00:00Z', '2026-06-11T19:00:00Z'],
              cloud_cover: [35, 40],
              uv_index: [4, 3],
              wind_speed_10m: [8, 9],
              wind_gusts_10m: [12, 13],
              precipitation_probability: [15, 10],
            },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      )
    );

    const request = new Request('http://localhost/api/planner/intelligence', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        latitude: 32.7767,
        longitude: -96.797,
        date: '2026-06-11T18:00:00.000Z',
        sessionCategory: 'family',
        locations: [
          { name: 'A', latitude: 32.78, longitude: -96.8, logistics: { parking: 'easy', restroom: 'yes' } },
          { name: 'B', latitude: 32.79, longitude: -96.81, logistics: { parking: 'difficult', restroom: 'no' } },
        ],
      }),
    });

    const response = await POST(request);
    const body = (await response.json()) as {
      goldenHours?: Record<string, string>;
      confidence?: { overall?: number; windows?: unknown[] };
      logistics?: Array<{ overallRisk: number }>;
      optimizedRoute?: number[];
    };

    expect(response.status).toBe(200);
    expect(body.goldenHours).toBeTruthy();
    expect(typeof body.confidence?.overall).toBe('number');
    expect((body.confidence?.windows ?? []).length).toBeGreaterThan(0);
    expect(body.logistics?.length).toBe(2);
    expect(body.optimizedRoute?.length).toBe(2);
  });
});
