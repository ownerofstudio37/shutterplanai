import { beforeEach, describe, expect, it, vi } from 'vitest';

const requireAuthMock = vi.fn();

vi.mock('@/lib/auth/serverAuth', () => ({
  requireAuth: (...args: unknown[]) => requireAuthMock(...args),
}));

vi.mock('@/lib/ai/gemini', async importOriginal => {
  const actual = await importOriginal<typeof import('@/lib/ai/gemini')>();
  return {
    ...actual,
    hydrateSessionPlanOutputs: ({ plan }: { plan: unknown }) => plan,
  };
});

function buildPlan() {
  return {
    projectTitle: 'Family Session Plan',
    creativeDirection: 'Warm family session.',
    timeline: [{ timeBlock: '0-10 min', focus: 'Arrival', notes: 'Start easy.' }],
    locationSuggestions: [
      {
        name: 'Lake Park',
        whyItWorks: 'Easy and scenic.',
        microLocations: ['Arrival zone', 'Open shade'],
        logistics: {
          parking: 'Park nearby.',
          restroom: 'Restroom nearby.',
          walkingDistance: 'Short walk.',
        },
      },
      {
        name: 'Garden Path',
        whyItWorks: 'Extra variety.',
        microLocations: ['Path'],
        logistics: {
          parking: 'Street parking.',
          restroom: 'Check ahead.',
          walkingDistance: 'Moderate walk.',
        },
      },
    ],
    shotList: [
      {
        title: 'Family hero',
        description: 'Whole family portrait.',
        location: 'Lake Park',
        microSpot: 'Open shade',
        poseSuggestion: 'Stand close together.',
        compositionSuggestion: 'Clean group frame.',
        timingHint: 'Start',
        notes: 'Must have.',
      },
    ],
    clientPrepChecklist: ['Arrive early.'],
    contingencyPlans: ['Use shade if sunny.'],
  };
}

describe('planner brain route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('GEMINI_API_KEY', '');
    requireAuthMock.mockResolvedValue({ success: true, userId: 'user-1' });
  });

  it('requires a current plan', async () => {
    const { POST } = await import('./route');
    const response = await POST(new Request('http://localhost/api/planner/brain', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Make this easier for toddlers' }),
    }) as never);
    const body = await response.json() as { success?: boolean; error?: string };

    expect(response.status).toBe(400);
    expect(body.success).toBe(false);
    expect(body.error).toMatch(/current plan/i);
  });

  it('updates the structured plan with deterministic fallback when AI is unavailable', async () => {
    const { POST } = await import('./route');
    const response = await POST(new Request('http://localhost/api/planner/brain', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        currentPlan: buildPlan(),
        message: 'Build this around only one spot and make it easier for toddlers',
        sessionInputs: { shootType: 'Family Session' },
      }),
    }) as never);
    const body = await response.json() as {
      success?: boolean;
      data?: {
        plan?: ReturnType<typeof buildPlan>;
        changedSections?: string[];
        source?: string;
      };
    };

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data?.source).toBe('fallback');
    expect(body.data?.plan?.locationSuggestions).toHaveLength(1);
    expect(body.data?.changedSections).toContain('shot list');
  });
});
