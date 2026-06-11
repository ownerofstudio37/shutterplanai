import { beforeEach, describe, expect, it, vi } from 'vitest';

const requireAuthMock = vi.fn();
const insertMock = vi.fn();
const selectMock = vi.fn();
const eqMock = vi.fn();
const singleMock = vi.fn();

vi.mock('@/lib/auth/serverAuth', () => ({
  requireAuth: (...args: unknown[]) => requireAuthMock(...args),
}));

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseAdminClient: () => ({
    from: () => ({
      insert: insertMock,
      select: selectMock,
      eq: eqMock,
      single: singleMock,
    }),
  }),
}));

describe('planner export route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000';

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
});
