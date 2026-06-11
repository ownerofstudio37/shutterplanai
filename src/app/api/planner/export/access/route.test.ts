import { beforeEach, describe, expect, it, vi } from 'vitest';
import { hashSharePassword } from '@/lib/planner/shareAccess';

const insertMock = vi.fn();
const selectMock = vi.fn();
const eqMock = vi.fn();
const singleMock = vi.fn();

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

describe('planner export access route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();

    const eqChain = {
      eq: eqMock,
      single: singleMock,
    };
    eqMock.mockReturnValue(eqChain);
    selectMock.mockReturnValue(eqChain);
    insertMock.mockResolvedValue({ error: null });
  });

  it('unlocks a protected guide with POST body credentials', async () => {
    const salt = 'test-salt';
    singleMock.mockResolvedValueOnce({
      data: {
        plan_data: { projectTitle: 'Protected Plan' },
        metadata: {},
        expires_at: new Date(Date.now() + 86_400_000).toISOString(),
        revoked_at: null,
        password_hash: hashSharePassword('secret123', salt),
        password_salt: salt,
        user_id: 'user-1',
        share_token: 'protected',
      },
      error: null,
    });

    const { POST } = await import('./route');
    const request = new Request('http://localhost/api/planner/export/access', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: 'protected', password: 'secret123' }),
    }) as never;

    const response = await POST(request as never);
    const body = (await response.json()) as { plan_data?: { projectTitle?: string } };

    expect(response.status).toBe(200);
    expect(body.plan_data?.projectTitle).toBe('Protected Plan');
    expect(insertMock).toHaveBeenCalledWith(expect.objectContaining({ event_name: 'planner_guide_viewed' }));
  });

  it('rejects invalid protected guide passwords', async () => {
    const salt = 'test-salt';
    singleMock.mockResolvedValueOnce({
      data: {
        plan_data: { projectTitle: 'Protected Plan' },
        metadata: {},
        expires_at: new Date(Date.now() + 86_400_000).toISOString(),
        revoked_at: null,
        password_hash: hashSharePassword('secret123', salt),
        password_salt: salt,
        user_id: 'user-1',
        share_token: 'protected',
      },
      error: null,
    });

    const { POST } = await import('./route');
    const request = new Request('http://localhost/api/planner/export/access', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: 'protected', password: 'wrong-password' }),
    }) as never;

    const response = await POST(request as never);
    const body = (await response.json()) as { error?: string; requiresPassword?: boolean };

    expect(response.status).toBe(401);
    expect(body.error).toBe('Invalid password');
    expect(body.requiresPassword).toBe(true);
  });
});
