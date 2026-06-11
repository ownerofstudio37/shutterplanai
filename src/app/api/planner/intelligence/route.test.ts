import { describe, expect, it } from 'vitest';
import { POST } from './route';

describe('planner intelligence route', () => {
  it('returns golden hour, logistics, and optimized route', async () => {
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
      logistics?: Array<{ overallRisk: number }>;
      optimizedRoute?: number[];
    };

    expect(response.status).toBe(200);
    expect(body.goldenHours).toBeTruthy();
    expect(body.logistics?.length).toBe(2);
    expect(body.optimizedRoute?.length).toBe(2);
  });
});
