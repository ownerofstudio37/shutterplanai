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

// ------ Shared chain builder ------
function makeSelectChain(response: { data: unknown; error: unknown }) {
  const chain = {
    select: vi.fn(),
    eq: vi.fn(),
    order: vi.fn(),
    limit: vi.fn(),
  };
  chain.select.mockReturnValue(chain);
  chain.eq.mockReturnValue(chain);
  chain.order.mockReturnValue(chain);
  chain.limit.mockResolvedValue(response);
  return chain;
}

function makeInsertChain(response: { data: unknown; error: unknown }) {
  const singleMock = vi.fn().mockResolvedValue(response);
  const selectChain = { single: singleMock };
  const insertChain = { select: vi.fn().mockReturnValue(selectChain) };
  return { insertChain, singleMock };
}

// ------ GET tests ------
describe('planner templates route > GET', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('returns 401 when not authenticated', async () => {
    requireAuthMock.mockResolvedValue({ success: false, error: 'Unauthorized', status: 401 });
    fromMock.mockReturnValue(makeSelectChain({ data: null, error: null }));

    const { GET } = await import('./route');
    const request = new Request('http://localhost/api/planner/templates') as never;
    const response = await GET(request);
    const body = (await response.json()) as { success: boolean; error: string };

    expect(response.status).toBe(401);
    expect(body.success).toBe(false);
    expect(body.error).toBe('Unauthorized');
  });

  it('returns empty list when user has no templates', async () => {
    requireAuthMock.mockResolvedValue({ success: true, userId: 'user-1' });
    fromMock.mockReturnValue(makeSelectChain({ data: [], error: null }));

    const { GET } = await import('./route');
    const request = new Request('http://localhost/api/planner/templates') as never;
    const response = await GET(request);
    const body = (await response.json()) as { success: boolean; data: unknown[] };

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data).toEqual([]);
  });

  it('returns templates list when user has templates', async () => {
    requireAuthMock.mockResolvedValue({ success: true, userId: 'user-1' });
    const mockTemplates = [
      {
        id: 'tmpl-1',
        name: 'Golden Hour Family',
        template_payload: { sessionCategory: 'family', constraints: { durationMinutes: 90 } },
        created_at: '2026-06-01T00:00:00Z',
        updated_at: '2026-06-01T00:00:00Z',
      },
    ];
    fromMock.mockReturnValue(makeSelectChain({ data: mockTemplates, error: null }));

    const { GET } = await import('./route');
    const request = new Request('http://localhost/api/planner/templates') as never;
    const response = await GET(request);
    const body = (await response.json()) as { success: boolean; data: typeof mockTemplates };

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data).toHaveLength(1);
    expect(body.data[0].name).toBe('Golden Hour Family');
  });

  it('returns 500 on database error', async () => {
    requireAuthMock.mockResolvedValue({ success: true, userId: 'user-1' });
    fromMock.mockReturnValue(makeSelectChain({ data: null, error: { message: 'DB error' } }));

    const { GET } = await import('./route');
    const request = new Request('http://localhost/api/planner/templates') as never;
    const response = await GET(request);
    const body = (await response.json()) as { success: boolean; error: string };

    expect(response.status).toBe(500);
    expect(body.success).toBe(false);
    expect(body.error).toBe('Failed to load session templates');
  });
});

// ------ POST tests ------
describe('planner templates route > POST', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('returns 401 when not authenticated', async () => {
    requireAuthMock.mockResolvedValue({ success: false, error: 'Unauthorized', status: 401 });

    const { POST } = await import('./route');
    const request = new Request('http://localhost/api/planner/templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'My Template' }),
    }) as never;
    const response = await POST(request);
    const body = (await response.json()) as { success: boolean; error: string };

    expect(response.status).toBe(401);
    expect(body.success).toBe(false);
  });

  it('returns 400 when name is missing', async () => {
    requireAuthMock.mockResolvedValue({ success: true, userId: 'user-1' });

    const { POST } = await import('./route');
    const request = new Request('http://localhost/api/planner/templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ templatePayload: {} }),
    }) as never;
    const response = await POST(request);
    const body = (await response.json()) as { success: boolean; error: string };

    expect(response.status).toBe(400);
    expect(body.error).toBe('Template name is required');
  });

  it('returns 400 when name is blank whitespace', async () => {
    requireAuthMock.mockResolvedValue({ success: true, userId: 'user-1' });

    const { POST } = await import('./route');
    const request = new Request('http://localhost/api/planner/templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: '   ' }),
    }) as never;
    const response = await POST(request);
    const body = (await response.json()) as { success: boolean; error: string };

    expect(response.status).toBe(400);
    expect(body.error).toBe('Template name is required');
  });

  it('returns 400 when name exceeds 120 characters', async () => {
    requireAuthMock.mockResolvedValue({ success: true, userId: 'user-1' });

    const { POST } = await import('./route');
    const longName = 'A'.repeat(121);
    const request = new Request('http://localhost/api/planner/templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: longName }),
    }) as never;
    const response = await POST(request);
    const body = (await response.json()) as { success: boolean; error: string };

    expect(response.status).toBe(400);
    expect(body.error).toBe('Template name must be 120 characters or less');
  });

  it('creates template and returns 201 with template data', async () => {
    requireAuthMock.mockResolvedValue({ success: true, userId: 'user-1' });

    const created = {
      id: 'tmpl-new',
      name: 'Golden Hour Engagement',
      template_payload: { sessionCategory: 'engagement', constraints: { durationMinutes: 60 } },
      created_at: '2026-06-11T00:00:00Z',
      updated_at: '2026-06-11T00:00:00Z',
    };
    const { insertChain } = makeInsertChain({ data: created, error: null });
    fromMock.mockReturnValue({ insert: vi.fn().mockReturnValue(insertChain) });

    const { POST } = await import('./route');
    const request = new Request('http://localhost/api/planner/templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Golden Hour Engagement',
        templatePayload: { sessionCategory: 'engagement', constraints: { durationMinutes: 60 } },
      }),
    }) as never;
    const response = await POST(request);
    const body = (await response.json()) as { success: boolean; data: typeof created };

    expect(response.status).toBe(201);
    expect(body.success).toBe(true);
    expect(body.data.id).toBe('tmpl-new');
    expect(body.data.name).toBe('Golden Hour Engagement');
  });

  it('creates template with empty payload when templatePayload omitted', async () => {
    requireAuthMock.mockResolvedValue({ success: true, userId: 'user-1' });

    const created = {
      id: 'tmpl-bare',
      name: 'Bare Template',
      template_payload: {},
      created_at: '2026-06-11T00:00:00Z',
      updated_at: '2026-06-11T00:00:00Z',
    };
    const { insertChain } = makeInsertChain({ data: created, error: null });
    fromMock.mockReturnValue({ insert: vi.fn().mockReturnValue(insertChain) });

    const { POST } = await import('./route');
    const request = new Request('http://localhost/api/planner/templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Bare Template' }),
    }) as never;
    const response = await POST(request);
    const body = (await response.json()) as { success: boolean; data: { template_payload: unknown } };

    expect(response.status).toBe(201);
    expect(body.success).toBe(true);
    expect(body.data.template_payload).toEqual({});
  });

  it('returns 500 on database error during create', async () => {
    requireAuthMock.mockResolvedValue({ success: true, userId: 'user-1' });

    const { insertChain } = makeInsertChain({ data: null, error: { message: 'DB write error' } });
    fromMock.mockReturnValue({ insert: vi.fn().mockReturnValue(insertChain) });

    const { POST } = await import('./route');
    const request = new Request('http://localhost/api/planner/templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'My Template' }),
    }) as never;
    const response = await POST(request);
    const body = (await response.json()) as { success: boolean; error: string };

    expect(response.status).toBe(500);
    expect(body.success).toBe(false);
    expect(body.error).toBe('Failed to create session template');
  });
});
