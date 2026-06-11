import { describe, expect, it } from 'vitest';
import {
  buildRunningLateSuggestion,
  getVarianceMinutes,
  groupShotsByLocation,
  mergeFieldNote,
} from './fieldExecution';

describe('field execution helpers', () => {
  it('groups shots by location and sorts by planned start', () => {
    const groups = groupShotsByLocation([
      { id: '2', title: 'Second', location: 'Garden', planned_time: '2026-06-11T18:30:00.000Z' },
      { id: '1', title: 'First', location: 'Atrium', planned_time: '2026-06-11T18:00:00.000Z' },
      { id: '3', title: 'Third', location: 'Garden', planned_time: '2026-06-11T18:45:00.000Z' },
    ]);

    expect(groups).toHaveLength(2);
    expect(groups[0].location).toBe('Atrium');
    expect(groups[1].shots.map(shot => shot.id)).toEqual(['2', '3']);
  });

  it('calculates planned vs actual variance in minutes', () => {
    expect(getVarianceMinutes('2026-06-11T18:00:00.000Z', '2026-06-11T18:12:00.000Z')).toBe(12);
    expect(getVarianceMinutes('bad', '2026-06-11T18:12:00.000Z')).toBeNull();
  });

  it('suggests catch-up actions when running late', () => {
    const suggestion = buildRunningLateSuggestion({
      plannedStart: '2026-06-11T18:00:00.000Z',
      completedShots: 1,
      totalShots: 5,
      now: new Date('2026-06-11T18:20:00.000Z'),
    });

    expect(suggestion).toContain('Running 20 minutes behind');
    expect(suggestion).toContain('one wide');
  });

  it('merges field notes without duplicating the same note', () => {
    const merged = mergeFieldNote('Original notes', 'Client loved the brick wall');
    expect(merged).toBe('Original notes\nField note: Client loved the brick wall');
    expect(mergeFieldNote(merged, 'Client loved the brick wall')).toBe(merged);
  });
});
