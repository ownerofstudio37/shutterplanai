import { NextResponse } from 'next/server';

type ApiLogLevel = 'info' | 'error';

type ApiRequestContext = {
  requestId: string;
  route: string;
  method: string;
  startedAt: number;
  userId?: string;
};

function emit(level: ApiLogLevel, event: string, context: ApiRequestContext, meta: Record<string, unknown> = {}) {
  const payload = {
    level,
    event,
    requestId: context.requestId,
    route: context.route,
    method: context.method,
    userId: context.userId,
    durationMs: Date.now() - context.startedAt,
    timestamp: new Date().toISOString(),
    ...meta,
  };

  const serialized = JSON.stringify(payload);
  if (level === 'error') {
    console.error(serialized);
    return;
  }

  console.info(serialized);
}

export function startApiRequest(route: string, method: string, userId?: string): ApiRequestContext {
  const context: ApiRequestContext = {
    requestId: globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`,
    route,
    method,
    startedAt: Date.now(),
    userId,
  };

  emit('info', 'api.request.started', context);
  return context;
}

export function apiSuccess(context: ApiRequestContext, status: number, meta: Record<string, unknown> = {}) {
  emit('info', 'api.request.succeeded', context, { status, ...meta });
}

export function apiFailure(
  context: ApiRequestContext,
  status: number,
  error: unknown,
  meta: Record<string, unknown> = {}
) {
  const message = error instanceof Error ? error.message : String(error);
  emit('error', 'api.request.failed', context, { status, error: message, ...meta });
}

export function jsonWithApiMeta(
  context: ApiRequestContext,
  body: unknown,
  init?: ResponseInit
) {
  const response = NextResponse.json(body, init);
  response.headers.set('x-request-id', context.requestId);
  response.headers.set('x-response-time-ms', String(Date.now() - context.startedAt));
  return response;
}
