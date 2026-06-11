type SecurityEventPayload = {
  route: string;
  event: string;
  userId?: string;
  status?: number;
  detail?: string;
};

export function logSecurityEvent(payload: SecurityEventPayload) {
  console.warn(
    JSON.stringify({
      level: 'warn',
      type: 'security_event',
      route: payload.route,
      event: payload.event,
      userId: payload.userId,
      status: payload.status,
      detail: payload.detail,
      at: new Date().toISOString(),
    })
  );
}
