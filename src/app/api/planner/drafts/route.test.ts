import { beforeEach, describe, expect, it, vi } from 'vitest';

const requireAuthMock = vi.fn();
const deleteEqMock = vi.fn();
const deleteMock = vi.fn(() => ({ eq: deleteEqMock }));
const fromMock = vi.fn(() => ({ delete: deleteMock }));
const createAdminMock = vi.fn(() => ({ from: fromMock }));

vi.mock('@/lib/auth/serverAuth', () => ({
  requireAuth: (...args: unknown[]) => requireAuthMock(...args),
}));

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseAdminClient: () => createAdminMock(),
}));

describe('planner drafts route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns auth error when unauthorized', async () => {
    requireAuthMock.mockResolvedValue({ success: false, error: 'Unauthorized', status: 401 });

    const { GET } = await import('./route');
    const request = new Request('http://localhost/api/planner/drafts') as never;
    const response = await GET(request);
    const body = (await response.json()) as { success?: boolean; error?: string };

    expect(response.status).toBe(401);
    expect(body.success).toBe(false);
    expect(body.error).toBe('Unauthorized');
  });

  it('requires draft id on delete', async () => {
    requireAuthMock.mockResolvedValue({ success: true, userId: 'user-1' });

    const { DELETE } = await import('./route');
    const request = new Request('http://localhost/api/planner/drafts', { method: 'DELETE' }) as never;
    const response = await DELETE(request);
    const body = (await response.json()) as { success?: boolean; error?: string };

    expect(response.status).toBe(400);
    expect(body.error).toBe('Draft ID required');
  });
});
