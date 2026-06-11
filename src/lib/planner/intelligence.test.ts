import { describe, expect, it } from 'vitest';
import { optimizeRouteOrder, scoreLocationLogistics } from './intelligence';

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
});
