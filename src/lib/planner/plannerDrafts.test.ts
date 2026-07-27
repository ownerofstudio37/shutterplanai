import { describe, expect, it, vi } from 'vitest';
import { CHAT_QUESTIONS, getSessionCategory } from './plannerConfig';
import {
  buildPlannerDraft,
  createPlannerDraftId,
  getDraftResumeQuestionCount,
  mapServerPlannerDraft,
} from './plannerDrafts';

describe('planner draft helpers', () => {
  it('creates stable draft payloads for autosave', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-11T12:00:00.000Z'));

    const draft = buildPlannerDraft({
      id: 'draft-1',
      workflowStage: 'review',
      state: {
        shootType: 'Family Session',
        city: 'Dallas, TX',
        duration: '90 minutes',
        mood: 'warm',
        subjectDetails: '5 people',
        mustHaveShots: 'group portrait',
        constraints: 'short walk',
        locationMode: 'find-locations',
        providedLocations: '',
        familyPacing: '',
        engagementStory: '',
        brandingGoals: '',
        eventPriorities: '',
        shootDate: '2026-06-20',
        multiDay: false,
        sessionDates: [],
      },
      workspaceState: {
        plan: {
          projectTitle: 'Family Plan',
          creativeDirection: 'Warm and candid.',
          timeline: [],
          locationSuggestions: [],
          shotList: [],
          clientPrepChecklist: [],
          contingencyPlans: [],
        },
        plannerBrainMessages: [{ role: 'assistant', content: 'Ready.' }],
        plannerPlanVersions: [],
        lastPlannerBrainChanges: ['brief'],
        isRouteConfirmed: true,
      },
    });

    expect(draft).toMatchObject({
      id: 'draft-1',
      status: 'review',
      createdAt: '2026-06-11T12:00:00.000Z',
      updatedAt: '2026-06-11T12:00:00.000Z',
      planState: {
        shootType: 'Family Session',
        locationMode: 'find-locations',
        multiDay: undefined,
        sessionDates: undefined,
      },
      workspaceState: {
        plannerBrainMessages: [{ role: 'assistant', content: 'Ready.' }],
        lastPlannerBrainChanges: ['brief'],
        isRouteConfirmed: true,
      },
    });

    vi.useRealTimers();
  });

  it('maps server draft rows into resumable drafts', () => {
    const draft = mapServerPlannerDraft({
      id: 'draft-2',
      status: 'applying',
      plan_state: {
        shootType: 'Engagement Session',
        locationMode: 'use-provided',
      },
      workspace_state: {
        plannerBrainMessages: [{ role: 'user', content: 'Use one spot.' }],
        lastPlannerBrainChanges: ['shot list'],
      },
      created_at: '2026-06-10T00:00:00.000Z',
      updated_at: '2026-06-11T00:00:00.000Z',
    });

    expect(draft).toMatchObject({
      id: 'draft-2',
      status: 'applying',
      createdAt: '2026-06-10T00:00:00.000Z',
      updatedAt: '2026-06-11T00:00:00.000Z',
      planState: {
        shootType: 'Engagement Session',
        locationMode: 'use-provided',
      },
      workspaceState: {
        plannerBrainMessages: [{ role: 'user', content: 'Use one spot.' }],
        lastPlannerBrainChanges: ['shot list'],
      },
    });
  });

  it('rejects malformed server draft rows', () => {
    expect(mapServerPlannerDraft({ id: 'draft-without-state' })).toBeNull();
    expect(mapServerPlannerDraft({ plan_state: { shootType: 'Family' } })).toBeNull();
  });

  it('calculates resume completion based on conditional chat questions', () => {
    const mode = 'find-locations';
    const category = getSessionCategory('Family Session');
    const findLocationsCount = getDraftResumeQuestionCount({
      shootType: 'Family Session',
      locationMode: mode,
    });
    const expectedCount = CHAT_QUESTIONS.filter(question => !question.showWhen || question.showWhen(mode, category)).length;

    expect(findLocationsCount).toBeGreaterThan(0);
    expect(findLocationsCount).toBe(expectedCount);
  });

  it('creates draft ids with the expected prefix', () => {
    expect(createPlannerDraftId()).toMatch(/^draft-/);
  });
});
