# Shutter Plan AI - Incident Runbook

## Critical Incident Procedures

### Issue: Share Links Not Expiring (Expired Exports Persisting)

**Severity**: Medium (data retention issue, no user-facing impact)

**Symptoms**:
- Planner analytics showing unusually high number of active share links
- Users report being able to access revoked share links
- Database `planner_exports` table growing unbounded

**Root Causes**:
1. Cron job `GET /api/cron/planner-exports-cleanup` not triggering
2. `PLANNER_EXPORT_CLEANUP_SECRET` missing or incorrect in production environment
3. Supabase `cleanup_expired_exports()` RPC not callable or failing silently
4. Network connectivity issue preventing cron trigger from reaching API

**Detection**:
- Monitor: Query `SELECT COUNT(*) FROM planner_exports WHERE expires_at < NOW()` should return 0
- Alert threshold: If count > 100, alert ops team
- Monitoring interval: Daily

---

## Step-by-Step Resolution

### **Tier 1: Quick Checks (5 min)**

1. **Verify Cron Trigger Status**
   ```bash
   # Check if cron job is scheduled (Netlify/external cron provider)
   # Netlify: verify env var in Site configuration > Environment variables
   # Status should show "active" or "enabled"
   ```
   
2. **Verify Environment Variable is Set**
   ```bash
   # SSH into production or check via provider dashboard
   echo $PLANNER_EXPORT_CLEANUP_SECRET  # Should be non-empty
   # Expected: 32+ character random string (e.g., "sk_live_abc123xyz456...")
   ```
   
3. **Check Recent Cron Execution Logs**
   - Go to: Netlify Function Logs / cron provider logs / CloudWatch / Datadog
   - Filter: `/api/cron/planner-exports-cleanup` endpoint
   - Look for: Recent successful executions (200 status) within last 24 hours
   - If no logs: **Escalate to Tier 2**

### **Tier 2: API Endpoint Verification (10 min)**

4. **Manually Trigger Cleanup Job**
   ```bash
   # From a secure/authenticated context (never expose secret in logs/chat)
   curl -X GET https://<your-netlify-site>.netlify.app/api/cron/planner-exports-cleanup \
     -H "x-cron-secret: $PLANNER_EXPORT_CLEANUP_SECRET" \
     -H "Accept: application/json"
   
   # Expected response:
   # {"success":true} (with 200 status + x-request-id header)
   ```
   
   - **If 401 Unauthorized**: Secret mismatch → go to **Fix #1**
   - **If 500 with "Cleanup failed"**: RPC failure → go to **Tier 3**
   - **If 200 with success**: Job working, check why cron not triggering → go to **Fix #2**

5. **Validate API Route is Deployed**
   ```bash
   # Confirm route exists in production build
   # Check: https://<your-netlify-site>.netlify.app should load
   # Or: verify latest published deploy in Netlify dashboard
   ```

### **Tier 3: Supabase RPC Verification (15 min)**

6. **Test RPC Directly in Supabase Console**
   ```sql
   -- Login to Supabase dashboard → your-project → SQL Editor
   
   -- First, check for expired exports
   SELECT COUNT(*) as expired_count FROM planner_exports 
   WHERE expires_at < NOW();
   
   -- Then execute the cleanup RPC
   SELECT cleanup_expired_exports();
   
   -- Verify cleanup worked
   SELECT COUNT(*) as expired_after_cleanup FROM planner_exports 
   WHERE expires_at < NOW();
   -- Expected: 0 (or significantly lower)
   ```
   
   - **If RPC errors**: Check Supabase function definition → **Fix #3**
   - **If cleanup works**: Issue is with cron trigger mechanism → **Fix #2**

7. **Verify RPC Permissions**
   ```sql
   -- Check function ownership and security definer
   SELECT 
     proname,
     prosecdef,
     proowner
   FROM pg_proc 
   WHERE proname = 'cleanup_expired_exports';
   
   -- Expected: prosecdef = true (security definer), owner = postgres or service role
   ```

---

## Fixes

### **Fix #1: Secret Mismatch**

**Problem**: `PLANNER_EXPORT_CLEANUP_SECRET` doesn't match what cron job is sending

**Resolution**:
1. Generate new secret:
   ```bash
   # On macOS/Linux
   openssl rand -hex 16  # Produces 32-char string
   ```

2. Update production environment:
   - **Netlify**: Site configuration → Environment variables → Update `PLANNER_EXPORT_CLEANUP_SECRET`
   - **Other platforms**: Update your secret manager / `.env.production`
   
3. Redeploy production:
   ```bash
   git push origin main  # Triggers deployment on Netlify (if auto-deploy enabled)
   ```

4. Verify with manual trigger (step 4 above)

5. **Update rotation schedule**: Add to security calendar
   - Rotate secret quarterly (every 3 months)
   - Before each rotation, update cron configuration

### **Fix #2: Cron Trigger Not Firing**

**Problem**: Environment variable is correct, RPC works, but cron job never executes

**Resolution**:

**A. If using external cron service (e.g., EasyCron, Cron-job.org):**
1. Login to service dashboard
2. Find "planner-exports-cleanup" job
3. Verify URL is correct:
   ```
   https://<your-netlify-site>.netlify.app/api/cron/planner-exports-cleanup
   ```
4. Verify cron schedule (e.g., "0 2 * * *" = daily at 2 AM UTC)
5. Click "Test" → should see 200 response with `{"success": true}`
6. If test fails: Check logs in service dashboard

**B. Add monitoring alert:**
```typescript
// Create monitoring check (pseudocode)
// If cleanup has not run in 24 hours, trigger alert
const lastRun = await getLastCronExecution();
if (Date.now() - lastRun > 24 * 60 * 60 * 1000) {
  sendAlert('Cleanup cron not triggered in 24 hours');
}
```

### **Fix #3: RPC Function Not Found or Failing**

**Problem**: RPC exists but returns error or is missing

**Resolution**:

1. **Verify function exists:**
   ```sql
   -- In Supabase SQL Editor
   SELECT * FROM information_schema.routines 
   WHERE routine_name = 'cleanup_expired_exports';
   ```
   - If no results: Function wasn't created → redeploy migrations

2. **Redeploy migration if needed:**
   ```bash
   # On your local machine
   cd supabase
   
   # Push all migrations to production
   supabase link --project-id $SUPABASE_PROJECT_ID
   supabase db push
   
   # Or push specific migration:
   supabase migration repair 20260611_planner_export_access_controls.sql
   ```

3. **Verify permissions after deployment:**
   ```sql
   -- Grant execute permission to authenticated users
   GRANT EXECUTE ON FUNCTION cleanup_expired_exports() TO authenticated;
   GRANT EXECUTE ON FUNCTION cleanup_expired_exports() TO service_role;
   ```

4. **Test again:**
   ```sql
   SELECT cleanup_expired_exports();
   ```

---

## Escalation Path

**Level 1 (Your Team)**: Steps 1-7 above, all fixes

**Level 2 (Supabase Support)**: 
- If RPC still errors after Fix #3
- Email: support@supabase.io with project ID + error message
- Include: SQL error logs, migration deployment order

**Level 3 (Platform Provider)**:
- If cron trigger unavailable (cron provider outage, Netlify outage)
- Check status page: Netlify Status / EasyCron Status
- Switch to alternative provider (e.g., AWS EventBridge) if primary is down

---

## Prevention & Monitoring

### **Daily Health Check (Automated)**
```javascript
// Add to monitoring dashboard / scheduled lambda
async function validateCleanupHealth() {
  const expiredCount = await supabase
    .from('planner_exports')
    .select('count', { count: 'exact' })
    .lt('expires_at', new Date());
  
  if (expiredCount.count > 100) {
    console.error(`ALERT: ${expiredCount.count} expired exports not cleaned up`);
    // Send to monitoring service (Datadog, NewRelic, etc.)
  }
}
```

### **Monthly Review Checklist**
- [ ] Verify cron executed at least 4 times in last 30 days
- [ ] Check `planner_exports` table size growth (should stay stable)
- [ ] Review error logs for "cleanup_rpc" stage failures
- [ ] Confirm `PLANNER_EXPORT_CLEANUP_SECRET` rotation schedule

### **Security Rotation Schedule**
- **Quarterly** (every 3 months): Rotate `PLANNER_EXPORT_CLEANUP_SECRET`
  - Date: [Pick a specific date, e.g., 1st of Jan/Apr/Jul/Oct]
  - Process: Generate new secret → update all cron configs → redeploy → verify

### **Contact & Escalation**
- **On-call engineer**: [Add name/contact]
- **Supabase POC**: [Add contact]
- **Incident channel**: #incidents (Slack / Teams)

---

## Appendix: Reference Commands

### **View Cleanup Job Status** (Last 7 days)
```sql
SELECT 
  created_at::date as date,
  COUNT(*) as expired_exports_deleted
FROM planner_exports
WHERE deleted_at >= NOW() - INTERVAL '7 days'
GROUP BY created_at::date
ORDER BY created_at DESC;
```

### **Manual Database Cleanup** (Emergency only)
```sql
-- WARNING: Only run if RPC is broken and needs immediate fix
DELETE FROM planner_exports
WHERE expires_at < NOW()
   OR revoked_at IS NOT NULL;

-- Verify cleanup
SELECT COUNT(*) FROM planner_exports WHERE expires_at < NOW();
```

### **Check Cron Execution History** (Netlify)
```bash
# Use Netlify site logs or your cron provider execution history
# netlify logs:function planner-exports-cleanup --site <site-id>
```

---

**Last Updated**: 2026-06-11
**Next Review**: 2026-09-11 (quarterly)
