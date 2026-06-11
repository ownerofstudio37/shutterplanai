import { beforeEach, describe, expect, it, vi } from 'vitest';

const requireAuthMock = vi.fn();
const getBillingUsageForUserMock = vi.fn();
const refineSessionPlanMock = vi.fn();

vi.mock('@/lib/auth/serverAuth', () => ({
  requireAuth: (...args: unknown[]) => requireAuthMock(...args),
}));

vi.mock('@/lib/billing/serverUsage', () => ({
  getBillingUsageForUser: (...args: unknown[]) => getBillingUsageForUserMock(...args),
}));

vi.mock('@/lib/ai/gemini', () => ({
  refineSessionPlan: (...args: unknown[]) => refineSessionPlanMock(...args),
}));

describe('AI session-plan refine route billing gates', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    requireAuthMock.mockResolvedValue({ success: true, userId: 'user-1' });
  });

  it('blocks refinements after the free planner generation limit', async () => {
    getBillingUsageForUserMock.mockResolvedValue({
      tier: 'free',
      limits: {
        plannerGenerations: 3,
        shareLinks: 1,
        passwordProtectedLinks: false,
        maxShareExpiryDays: 7,
        multiDayPlanning: false,
      },
      usage: {
        plannerGenerations: 3,
        shareLinks: 0,
      },
      remaining: {
        plannerGenerations: 0,
        shareLinks: 1,
      },
      upgradeValueProps: [],
    });

    const { POST } = await import('./route');
    const request = new Request('http://localhost/api/ai/session-plan/refine', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        plan: {
          locationSuggestions: [],
          shotList: [],
        },
      }),
    }) as never;

    const response = await POST(request as never);
    const body = (await response.json()) as { code?: string; success?: boolean };

    expect(response.status).toBe(402);
    expect(body.success).toBe(false);
    expect(body.code).toBe('PLAN_LIMIT_REACHED');
    expect(refineSessionPlanMock).not.toHaveBeenCalled();
  });
});
