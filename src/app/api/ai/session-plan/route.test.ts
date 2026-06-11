import { beforeEach, describe, expect, it, vi } from 'vitest';

const requireAuthMock = vi.fn();
const getBillingUsageForUserMock = vi.fn();

vi.mock('@/lib/auth/serverAuth', () => ({
  requireAuth: (...args: unknown[]) => requireAuthMock(...args),
}));

vi.mock('@/lib/billing/serverUsage', () => ({
  getBillingUsageForUser: (...args: unknown[]) => getBillingUsageForUserMock(...args),
}));

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseAdminClient: () => ({
    auth: {
      admin: {
        getUserById: vi.fn(),
      },
    },
  }),
}));

vi.mock('@/lib/geo/geocode', () => ({
  geocodeLocations: vi.fn(),
  geocodePlace: vi.fn(),
  searchLocationCandidates: vi.fn(),
}));

vi.mock('@/lib/ai/gemini', () => ({
  generateSessionPlan: vi.fn(),
}));

function billingUsage(input: {
  plannerGenerations?: number;
  plannerLimit?: number | null;
  multiDayPlanning?: boolean;
}) {
  return {
    tier: 'free',
    limits: {
      plannerGenerations: input.plannerLimit ?? 3,
      shareLinks: 1,
      passwordProtectedLinks: false,
      maxShareExpiryDays: 7,
      multiDayPlanning: input.multiDayPlanning ?? false,
    },
    usage: {
      plannerGenerations: input.plannerGenerations ?? 0,
      shareLinks: 0,
    },
    remaining: {
      plannerGenerations: 0,
      shareLinks: 1,
    },
    upgradeValueProps: [],
  };
}

describe('AI session-plan route billing gates', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    requireAuthMock.mockResolvedValue({ success: true, userId: 'user-1' });
  });

  it('blocks free accounts after the planner generation limit', async () => {
    getBillingUsageForUserMock.mockResolvedValue(billingUsage({ plannerGenerations: 3 }));

    const { POST } = await import('./route');
    const request = new Request('http://localhost/api/ai/session-plan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ shootType: 'Family session' }),
    }) as never;

    const response = await POST(request as never);
    const body = (await response.json()) as { code?: string; success?: boolean };

    expect(response.status).toBe(402);
    expect(body.success).toBe(false);
    expect(body.code).toBe('PLAN_LIMIT_REACHED');
  });

  it('blocks multi-day planning for free accounts', async () => {
    getBillingUsageForUserMock.mockResolvedValue(billingUsage({ plannerGenerations: 1, multiDayPlanning: false }));

    const { POST } = await import('./route');
    const request = new Request('http://localhost/api/ai/session-plan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ shootType: 'Wedding', multiDay: true }),
    }) as never;

    const response = await POST(request as never);
    const body = (await response.json()) as { code?: string; success?: boolean };

    expect(response.status).toBe(402);
    expect(body.success).toBe(false);
    expect(body.code).toBe('PREMIUM_FEATURE_REQUIRED');
  });
});
