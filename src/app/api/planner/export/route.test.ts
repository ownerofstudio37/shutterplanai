import { beforeEach, describe, expect, it, vi } from 'vitest';

const insertMock = vi.fn();
const selectMock = vi.fn();
const eqMock = vi.fn();
const gtMock = vi.fn();
const singleMock = vi.fn();

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    from: () => ({
      insert: insertMock,
      select: selectMock,
      eq: eqMock,
      gt: gtMock,
      single: singleMock,
    }),
  }),
}));

describe('planner export route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000';
  });

  it('rejects POST without authorization token', async () => {
    const { POST } = await import('./route');

    const request = new Request('http://localhost/api/planner/export', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan: {}, planMetadata: {} }),
    });

    const response = await POST(request);
    const body = (await response.json()) as { error?: string };

    expect(response.status).toBe(401);
    expect(body.error).toBe('Unauthorized');
  });

  it('returns 400 when GET token is missing', async () => {
    const { GET } = await import('./route');

    const request = new Request('http://localhost/api/planner/export', {
      method: 'GET',
    });

    const response = await GET(request);
    const body = (await response.json()) as { error?: string };

    expect(response.status).toBe(400);
    expect(body.error).toBe('Missing token');
  });
});
