# Security Operations Guide: Planner Exports

## Overview
This document covers security procedures, secret management, and risk mitigation for planner share links and exports.

---

## Authentication & Authorization

### **Cron Job Authentication**

The cleanup cron job uses header-based secret authentication:

```typescript
// Accepted methods:
// 1. Bearer token: Authorization: Bearer <secret>
// 2. Custom header: x-cron-secret: <secret>

function isAuthorized(request: NextRequest) {
  const secret = process.env.PLANNER_EXPORT_CLEANUP_SECRET;
  if (!secret) return true; // Fallback: allow if secret not set (dev only)

  const bearer = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  const headerSecret = request.headers.get('x-cron-secret');
  return bearer === secret || headerSecret === secret;
}
```

**Why not JWT/OAuth?**
- Cron jobs are scheduled from external services (EasyCron, Vercel, etc.)
- JWT adds complexity without additional security benefit
- Shared secret rotated quarterly is sufficient for this use case
- Always use HTTPS (required for both EasyCron and Vercel)

---

## Share Link Security

### **Password Protection**

Share links can optionally be protected with a password. Implementation:

```typescript
// 1. User provides password (6+ characters)
const password = 'myPhotographySession2024'; // Min 6 chars

// 2. Password is hashed with scrypt + random salt before storage
const salt = crypto.randomBytes(16);
const hash = crypto.scryptSync(password, salt, 32);
// Store: password_salt + password_hash in database

// 3. On access, verify password using timing-safe comparison
const providedHash = crypto.scryptSync(providedPassword, storedSalt, 32);
const matches = crypto.timingSafeEqual(providedHash, storedHash);
// Prevents timing-based password guessing attacks
```

**Password Requirements**:
- Minimum 6 characters (user-facing)
- No complexity rules enforced (allows natural passphrases)
- Not stored in plaintext (hashed with scrypt)

**Timing Attack Prevention**:
- Uses `crypto.timingSafeEqual()` for comparison
- Prevents attackers from guessing passwords by measuring response time

### **Token Generation**

Share link tokens are cryptographically secure:

```typescript
const shareToken = crypto.randomBytes(32).toString('hex');
// Produces: 64 character hex string (256 bits of entropy)
// Example: a7f2c9e1b4d6f8a3c5e7b9d1f3a5c7e9a1b2c3d4e5f6a7b8c9d0e1f2a3b4c
```

**Token Distribution**:
- User generates share link in browser
- Link format: `shutterplanai.app/plans/{shareToken}?password=optional`
- Token is **not** sent to server during creation (only hash stored)
- Prevents server-side token leakage

---

## Access Control

### **Row-Level Security (RLS)**

Supabase RLS enforces data access at the database level:

```sql
-- Users can only see/modify their own exports
ALTER TABLE planner_exports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can see own exports"
  ON planner_exports FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create exports"
  ON planner_exports FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can revoke own exports"
  ON planner_exports FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
```

**Benefits**:
- Even compromised application code cannot access other users' data
- Database enforces access rules independently
- Protects against authorization bypass vulnerabilities

### **Cleanup Job Authorization**

Cleanup job has elevated privileges via admin client:

```typescript
// Admin client bypasses RLS (necessary for cleanup)
const admin = createSupabaseAdminClient();

// Cleanup can delete any expired export (not just user's own)
const { error } = await admin.rpc('cleanup_expired_exports');

// RPC itself is also protected (see below)
```

**Protection**: RPC security definer prevents unauthorized calls:

```sql
CREATE OR REPLACE FUNCTION cleanup_expired_exports()
RETURNS void AS $$
BEGIN
  DELETE FROM planner_exports
  WHERE expires_at < NOW() OR revoked_at IS NOT NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Only admin/service role can execute
GRANT EXECUTE ON FUNCTION cleanup_expired_exports() TO service_role;
REVOKE EXECUTE ON FUNCTION cleanup_expired_exports() FROM authenticated;
```

---

## Expiration & Revocation

### **Automatic Expiration**

Share links auto-expire after configured period:

```typescript
// When creating export:
const expiresAt = new Date();
expiresAt.setDate(expiresAt.getDate() + 30); // Default: 30 days

// Can be customized per share:
expiresAt.setDate(expiresAt.getDate() + 90); // Max: 90 days (could be config)
```

**Expiration Check on Access**:
```typescript
// When someone tries to access shared plan:
const isExpired = shareExport.expires_at < new Date();
if (isExpired) {
  return { status: 404, error: 'Share link expired' };
}
```

### **Manual Revocation**

Users can immediately revoke share links:

```typescript
// User calls: POST /api/planner/export/revoke
const { shareToken } = request.body;

// Update record with revocation timestamp
await admin
  .from('planner_exports')
  .update({
    revoked_at: new Date(),
    revoked_by: userId,
    updated_at: new Date()
  })
  .eq('share_token', shareToken);

// Cleanup job deletes revoked exports after 24 hours (configurable)
```

**Timeline**:
- Revoked link: immediately inaccessible (checked at access time)
- Cleanup job: physically deleted 24-48 hours after revocation
- Prevents accidental reactivation of revoked links

---

## Threat Model & Mitigations

| Threat | Impact | Mitigation |
|--------|--------|-----------|
| **Token Guessing** | Attacker guesses 64-char hex token | Cryptographically random (2^256 possible values) |
| **Password Guessing** | Attacker brute-forces password | Rate limiting (per IP), timing-safe comparison, scrypt hash (slow) |
| **Timing Attacks** | Attacker guesses password via response time | `crypto.timingSafeEqual()` for constant-time comparison |
| **Token Leakage** | Server logs expose tokens | Structured logs only include requestId, not tokens |
| **Unauthorized Cleanup** | Attacker triggers cleanup without auth | Bearer token / header secret required (shared with cron provider) |
| **RLS Bypass** | App bug exposes other users' exports | Database-enforced RLS prevents this |
| **Expired Link Access** | User accesses revoked link after cleanup fail | Both expiration + revocation checked at access time |
| **Data Retention** | Unbounded table growth | Daily cleanup cron deletes expired + revoked exports |

---

## Secret Management

### **Secrets Inventory**

| Secret | Rotation | Storage | Used By |
|--------|----------|---------|---------|
| `PLANNER_EXPORT_CLEANUP_SECRET` | Quarterly | Vercel Secrets / GitHub Secrets | Cron job + Vercel |
| Supabase API Key (public) | As-needed | Next.js .env (public) | Client + server auth |
| Supabase Service Role Key | Annually | GitHub Secrets / Vercel Secrets | Admin operations |
| Database Passwords | Annually | Supabase console | Connection strings |

### **Rotation Procedure**

**Quarterly Rotation (PLANNER_EXPORT_CLEANUP_SECRET)**:

1. Generate new secret:
   ```bash
   openssl rand -hex 16
   ```

2. Update all instances:
   - [ ] Vercel environment variables
   - [ ] GitHub Actions secrets
   - [ ] EasyCron/cron provider configuration
   - [ ] Any monitoring/alerting systems that call endpoint

3. Verify with manual test:
   ```bash
   curl -H "x-cron-secret: $NEW_SECRET" \
     https://shutterplanai.vercel.app/api/cron/planner-exports-cleanup
   ```

4. Document rotation:
   - Add entry to `docs/SECRET_ROTATION_LOG.md`
   - Include: date, old secret hash, new secret hash, who rotated, verification result

5. Archive old secret:
   - Store in secure location (password manager)
   - Label with rotation date + expiration (keep 1 year for rollback)

---

## Incident Response

### **Scenario 1: Suspected Token Compromise**

**If a share token may have been exposed:**

1. Check logs for unusual access to that token:
   ```sql
   SELECT * FROM logs 
   WHERE share_token = 'compromised_token'
   AND accessed_at > NOW() - INTERVAL '7 days';
   ```

2. If unauthorized access detected:
   - [ ] Contact affected user immediately
   - [ ] Revoke the share link
   - [ ] Advise user to review their uploaded plans

3. If no unauthorized access:
   - [ ] Revoke share link as precaution
   - [ ] No further action needed (token already 64-char random)

### **Scenario 2: Suspected Secret Compromise**

**If `PLANNER_EXPORT_CLEANUP_SECRET` may have been exposed:**

1. Immediately rotate the secret (follow procedure above)

2. Check logs for unauthorized cleanup attempts:
   ```typescript
   // Review API logs for 401 Unauthorized from unexpected IPs
   grep "cleanup_expired_exports" logs | grep "401"
   ```

3. If unauthorized attempts detected:
   - [ ] Alert security team
   - [ ] Review database audit logs for unauthorized deletions
   - [ ] Restore from backup if needed

4. Communicate rotation:
   - [ ] Notify cron service providers
   - [ ] Update all team member documentation

### **Scenario 3: Cleanup Job Failing**

**If cleanup job not executing (see INCIDENT_RUNBOOK.md for details)**:

1. [ ] Verify cron is scheduled
2. [ ] Check for recent error logs
3. [ ] Manually test RPC in Supabase
4. [ ] If RPC broken: Deploy migration fix, verify in staging first
5. [ ] If cron provider down: Switch to alternate provider (EasyCron → GitHub Actions)

---

## Compliance & Auditing

### **Data Retention Policy**

- **Shared plans**: Retained until expiration date (default: 30 days)
- **Revoked plans**: Deleted within 24-48 hours of revocation
- **Cleanup logs**: Retained for 90 days (sufficient for incident investigation)

### **Audit Trail**

Track who accessed/modified exports:

```sql
-- View all exports created by user
SELECT 
  id,
  created_at,
  expires_at,
  user_id,
  is_password_protected
FROM planner_exports
WHERE user_id = 'user_id_here'
ORDER BY created_at DESC;

-- View all revocations in last 30 days
SELECT 
  id,
  revoked_at,
  revoked_by,
  user_id
FROM planner_exports
WHERE revoked_at > NOW() - INTERVAL '30 days'
ORDER BY revoked_at DESC;
```

### **Access Logging**

API observability logs capture:
- Request ID (UUID, traceable across all requests)
- Timestamp + duration (audit trail)
- HTTP method + endpoint
- Auth user ID
- Response status (200, 401, 404, 500)
- Error stage (auth, validation, query, unhandled)

**Example log entry**:
```json
{
  "level": "info",
  "event": "api.request.succeeded",
  "requestId": "3d95dd78-0702-4d8c-89f2-94b8718b39a4",
  "route": "/api/planner/export",
  "method": "POST",
  "userId": "user_12345",
  "durationMs": 145,
  "status": 200
}
```

---

## Best Practices Checklist

- [ ] Rotation: Quarterly secret rotation scheduled
- [ ] Alerts: Database monitoring for expired exports > 100
- [ ] Logs: Structured API logs retained for 90 days
- [ ] Backup: Daily database backups with 30-day retention
- [ ] Testing: Cron manually tested after each rotation
- [ ] Documentation: Incident runbook accessible to team
- [ ] Access: Only admins have database direct access
- [ ] Updates: Security patches applied within 48 hours

---

**Last Updated**: 2026-06-11
**Next Review**: 2026-09-11 (quarterly with secret rotation)
**Owner**: DevOps / Security Team
