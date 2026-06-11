import { beforeEach, describe, expect, it, vi } from 'vitest';

const requireAuthMock = vi.fn();
const fromMock = vi.fn();

vi.mock('@/lib/auth/serverAuth', () => ({
  requireAuth: (...args: unknown[]) => requireAuthMock(...args),
}));

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseAdminClient: () => ({
    from: fromMock,
  }),
}));

// ------ Chain builder ------
function makeDeleteChain(response: { error: unknown }) {
  const eqMock = vi.fn();
  const deleteChain = { eq: eqMock };
  eqMock.mockReturnValueOnce(deleteChain); // first .eq('id', id)
  eqMock.mockResolvedValue(response);      // second .eq('user_id', userId) — terminal
  return { delete: vi.fn().mockReturnValue(deleteChain) };
}

function makeContext(id: string) {
  return { params: Promise.resolve({ id }) };
}

// ------ DELETE tests ------
describe('planner templates [id] route > DELETE', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('returns 401 when not authenticated', async () => {
    requireAuthMock.mockResolvedValue({ success: false, error: 'Unauthorized', status: 401 });
    fromMock.mockReturnValue(makeDeleteChain({ error: null }));

    const { DELETE } = await import('./route');
    const request = new Request('http://localhost/api/planner/templates/tmpl-1', {
      method: 'DELETE',
    }) as never;
    const response = await DELETE(request, makeContext('tmpl-1'));
    const body = (await response.json()) as { success: boolean; error: string };

    expect(response.status).toBe(401);
    expect(body.success).toBe(false);
    expect(body.error).toBe('Unauthorized');
  });

  it('returns 200 and deletes the template successfully', async () => {
    requireAuthMock.mockResolvedValue({ success: true, userId: 'user-1' });
    fromMock.mockReturnValue(makeDeleteChain({ error: null }));

    const { DELETE } = await import('./route');
    const request = new Request('http://localhost/api/planner/templates/tmpl-abc', {
      method: 'DELETE',
      headers: { Authorization: 'Bearer token' },
    }) as never;
    const response = await DELETE(request, makeContext('tmpl-abc'));
    const body = (await response.json()) as { success: boolean };

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
  });

  it('returns 400 when id is an empty string', async () => {
    requireAuthMock.mockResolvedValue({ success: true, userId: 'user-1' });

    const { DELETE } = await import('./route');
    const request = new Request('http://localhost/api/planner/templates/', {
      method: 'DELETE',
    }) as never;
    const response = await DELETE(request, makeContext(''));
    const body = (await response.json()) as { success: boolean; error: string };

    expect(response.status).toBe(400);
    expect(body.success).toBe(false);
    expect(body.error).toBe('Template ID is required');
  });

  it('returns 500 on database error', async () => {
    requireAuthMock.mockResolvedValue({ success: true, userId: 'user-1' });
    fromMock.mockReturnValue(makeDeleteChain({ error: { message: 'DB write error' } }));

    const { DELETE } = await import('./route');
    const request = new Request('http://localhost/api/planner/templates/tmpl-bad', {
      method: 'DELETE',
    }) as never;
    const response = await DELETE(request, makeContext('tmpl-bad'));
    const body = (await response.json()) as { success: boolean; error: string };

    expect(response.status).toBe(500);
    expect(body.success).toBe(false);
    expect(body.error).toBe('Failed to delete session template');
  });
});
