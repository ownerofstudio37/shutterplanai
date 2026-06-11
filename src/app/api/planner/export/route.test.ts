import { beforeEach, describe, expect, it, vi } from 'vitest';

const requireAuthMock = vi.fn();
const insertMock = vi.fn();
const selectMock = vi.fn();
const eqMock = vi.fn();
const singleMock = vi.fn();
const getUserByIdMock = vi.fn();
const getBillingUsageForUserMock = vi.fn();

vi.mock('@/lib/auth/serverAuth', () => ({
  requireAuth: (...args: unknown[]) => requireAuthMock(...args),
}));

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseAdminClient: () => ({
    auth: {
      admin: {
        getUserById: getUserByIdMock,
      },
    },
    from: () => ({
      insert: insertMock,
      select: selectMock,
      eq: eqMock,
      single: singleMock,
    }),
  }),
}));

vi.mock('@/lib/billing/serverUsage', () => ({
  getBillingUsageForUser: (...args: unknown[]) => getBillingUsageForUserMock(...args),
}));

function billingUsage(input: {
  tier?: 'free' | 'pro';
  plannerGenerations?: number;
  shareLinks?: number;
  passwordProtectedLinks?: boolean;
  shareLimit?: number | null;
}) {
  return {
    tier: input.tier ?? 'free',
    limits: {
      plannerGenerations: 3,
      shareLinks: input.shareLimit ?? 1,
      passwordProtectedLinks: input.passwordProtectedLinks ?? false,
      maxShareExpiryDays: 7,
      multiDayPlanning: false,
    },
    usage: {
      plannerGenerations: input.plannerGenerations ?? 0,
      shareLinks: input.shareLinks ?? 0,
    },
    remaining: {
      plannerGenerations: 3,
      shareLinks: 1,
    },
    upgradeValueProps: [],
  };
}

describe('planner export route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000';

    getBillingUsageForUserMock.mockResolvedValue(billingUsage({}));
    getUserByIdMock.mockResolvedValue({ data: { user: { user_metadata: {} } } });
    insertMock.mockResolvedValue({ error: null });
    singleMock.mockResolvedValue({
      data: {
        plan_data: { projectTitle: 'Test Plan' },
        metadata: {},
        expires_at: new Date(Date.now() + 86_400_000).toISOString(),
        revoked_at: null,
        password_hash: null,
        password_salt: null,
      },
      error: null,
    });

    const eqChain = {
      eq: eqMock,
      single: singleMock,
    };
    eqMock.mockReturnValue(eqChain);
    selectMock.mockReturnValue(eqChain);
  });

  it('rejects POST when unauthorized', async () => {
    requireAuthMock.mockResolvedValue({ success: false, error: 'Unauthorized', status: 401 });

    const { POST } = await import('./route');

    const request = new Request('http://localhost/api/planner/export', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan: {}, planMetadata: {} }),
    }) as never;

    const response = await POST(request as never);
    const body = (await response.json()) as { success?: boolean; error?: string };

    expect(response.status).toBe(401);
    expect(body.success).toBe(false);
    expect(body.error).toBe('Unauthorized');
  });

  it('returns 400 when GET token is missing', async () => {
    const { GET } = await import('./route');

    const request = new Request('http://localhost/api/planner/export', {
      method: 'GET',
    }) as never;

    const response = await GET(request as never);
    const body = (await response.json()) as { error?: string };

    expect(response.status).toBe(400);
    expect(body.error).toBe('Missing token');
  });

  it('requires password for protected links', async () => {
    singleMock.mockResolvedValueOnce({
      data: {
        plan_data: { projectTitle: 'Protected Plan' },
        metadata: {},
        expires_at: new Date(Date.now() + 86_400_000).toISOString(),
        revoked_at: null,
        password_hash: 'abc123',
        password_salt: 'salt',
      },
      error: null,
    });

    const { GET } = await import('./route');
    const request = new Request('http://localhost/api/planner/export?token=protected') as never;

    const response = await GET(request as never);
    const body = (await response.json()) as { error?: string; requiresPassword?: boolean };

    expect(response.status).toBe(401);
    expect(body.error).toBe('Password required');
    expect(body.requiresPassword).toBe(true);
  });

  it('does not accept public guide passwords through the GET query string', async () => {
    singleMock.mockResolvedValueOnce({
      data: {
        plan_data: { projectTitle: 'Protected Plan' },
        metadata: {},
        expires_at: new Date(Date.now() + 86_400_000).toISOString(),
        revoked_at: null,
        password_hash: 'abc123',
        password_salt: 'salt',
      },
      error: null,
    });

    const { GET } = await import('./route');
    const request = new Request('http://localhost/api/planner/export?token=protected&password=secret') as never;

    const response = await GET(request as never);
    const body = (await response.json()) as { error?: string; requiresPassword?: boolean };

    expect(response.status).toBe(401);
    expect(body.error).toBe('Password required');
    expect(body.requiresPassword).toBe(true);
  });

  it('blocks share link creation when the free limit is reached', async () => {
    requireAuthMock.mockResolvedValue({ success: true, userId: 'user-1' });
    getBillingUsageForUserMock.mockResolvedValue(billingUsage({ shareLinks: 1 }));

    const { POST } = await import('./route');
    const request = new Request('http://localhost/api/planner/export', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan: { projectTitle: 'Plan' }, planMetadata: {} }),
    }) as never;

    const response = await POST(request as never);
    const body = (await response.json()) as { code?: string; success?: boolean };

    expect(response.status).toBe(402);
    expect(body.success).toBe(false);
    expect(body.code).toBe('PLAN_LIMIT_REACHED');
  });

  it('blocks password-protected exports for free accounts', async () => {
    requireAuthMock.mockResolvedValue({ success: true, userId: 'user-1' });
    getBillingUsageForUserMock.mockResolvedValue(billingUsage({ shareLinks: 0, passwordProtectedLinks: false }));

    const { POST } = await import('./route');
    const request = new Request('http://localhost/api/planner/export', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan: { projectTitle: 'Plan' }, planMetadata: {}, sharePassword: 'secret123' }),
    }) as never;

    const response = await POST(request as never);
    const body = (await response.json()) as { code?: string; success?: boolean };

    expect(response.status).toBe(402);
    expect(body.success).toBe(false);
    expect(body.code).toBe('PREMIUM_FEATURE_REQUIRED');
  });
});
