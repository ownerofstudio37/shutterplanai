import { beforeEach, describe, expect, it, vi } from 'vitest';

const requireAuthMock = vi.fn();
const activateTestProPlanMock = vi.fn();

vi.mock('@/lib/auth/serverAuth', () => ({
  requireAuth: (...args: unknown[]) => requireAuthMock(...args),
}));

vi.mock('@/lib/billing/serverUsage', () => ({
  activateTestProPlan: (...args: unknown[]) => activateTestProPlanMock(...args),
}));

describe('billing checkout route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    requireAuthMock.mockResolvedValue({ success: true, userId: 'user-1' });
  });

  it('activates test pro plan when hosted checkout is not configured', async () => {
    vi.stubEnv('BILLING_CHECKOUT_URL', '');
    activateTestProPlanMock.mockResolvedValue({
      tier: 'pro',
      status: 'active',
      customerId: 'test_customer_user-1',
      currentPeriodEnd: '2026-08-26T00:00:00.000Z',
      checkoutUrl: null,
      portalUrl: null,
      testMode: true,
    });

    const { POST } = await import('./route');
    const response = await POST(new Request('http://localhost/api/billing/checkout', { method: 'POST' }) as never);
    const body = (await response.json()) as { success?: boolean; data?: { planStatus?: { tier?: string } } };

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data?.planStatus?.tier).toBe('pro');
    expect(activateTestProPlanMock).toHaveBeenCalledWith('user-1');
  });

  it('returns hosted checkout url when configured', async () => {
    vi.stubEnv('BILLING_CHECKOUT_URL', 'https://billing.example/checkout');

    const { POST } = await import('./route');
    const response = await POST(new Request('http://localhost/api/billing/checkout', { method: 'POST' }) as never);
    const body = (await response.json()) as { data?: { checkoutUrl?: string } };

    expect(response.status).toBe(200);
    expect(body.data?.checkoutUrl).toBe('https://billing.example/checkout');
    expect(activateTestProPlanMock).not.toHaveBeenCalled();
  });
});
