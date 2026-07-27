import { beforeEach, describe, expect, it, vi } from 'vitest';

const requireAuthMock = vi.fn();
const getBillingUsageForUserMock = vi.fn();

vi.mock('@/lib/auth/serverAuth', () => ({
  requireAuth: (...args: unknown[]) => requireAuthMock(...args),
}));

vi.mock('@/lib/billing/serverUsage', () => ({
  getBillingUsageForUser: (...args: unknown[]) => getBillingUsageForUserMock(...args),
}));

describe('billing status route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    requireAuthMock.mockResolvedValue({ success: true, userId: 'user-1' });
  });

  it('returns authenticated billing usage', async () => {
    getBillingUsageForUserMock.mockResolvedValue({
      tier: 'free',
      usage: { plannerGenerations: 1, shareLinks: 0 },
      remaining: { plannerGenerations: 2, shareLinks: 1 },
      upgradeValueProps: [],
    });

    const { GET } = await import('./route');
    const response = await GET(new Request('http://localhost/api/billing/status') as never);
    const body = (await response.json()) as { success?: boolean; data?: { tier?: string } };

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data?.tier).toBe('free');
  });
});
