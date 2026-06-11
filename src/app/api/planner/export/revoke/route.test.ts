import { beforeEach, describe, expect, it, vi } from 'vitest';

const requireAuthMock = vi.fn();
const isMock = vi.fn();
const eqMock = vi.fn();
const selectMock = vi.fn();
const updateMock = vi.fn();

vi.mock('@/lib/auth/serverAuth', () => ({
  requireAuth: (...args: unknown[]) => requireAuthMock(...args),
}));

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseAdminClient: () => ({
    from: () => ({
      update: updateMock,
    }),
  }),
}));

describe('planner export revoke route', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    const chain = {
      eq: eqMock,
      is: isMock,
      select: selectMock,
    };

    updateMock.mockReturnValue(chain);
    eqMock.mockReturnValue(chain);
    isMock.mockReturnValue(chain);
    selectMock.mockResolvedValue({ data: [{ id: 'row-1' }], error: null });
  });

  it('returns auth error when unauthorized', async () => {
    requireAuthMock.mockResolvedValue({ success: false, error: 'Unauthorized', status: 401 });

    const { POST } = await import('./route');
    const request = new Request('http://localhost/api/planner/export/revoke', { method: 'POST' }) as never;

    const response = await POST(request);
    const body = (await response.json()) as { success?: boolean; error?: string };

    expect(response.status).toBe(401);
    expect(body.success).toBe(false);
    expect(body.error).toBe('Unauthorized');
  });

  it('requires shareToken in payload', async () => {
    requireAuthMock.mockResolvedValue({ success: true, userId: 'user-1' });

    const { POST } = await import('./route');
    const request = new Request('http://localhost/api/planner/export/revoke', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    }) as never;

    const response = await POST(request);
    const body = (await response.json()) as { success?: boolean; error?: string };

    expect(response.status).toBe(400);
    expect(body.error).toBe('shareToken is required');
  });
});
