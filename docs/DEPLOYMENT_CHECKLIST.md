# Production Deployment Checklist: Phase 2 Release

## Pre-Deployment Verification (Dev/Staging)

### Code Quality & Testing
- [ ] All tests passing locally: `npm run test` → ✅ 15/15 tests passing
- [ ] Build successful: `npm run build` → ✅ Production build clean
- [ ] No TypeScript errors: `npx tsc --noEmit` → ✅ 0 errors
- [ ] No lint warnings: `npm run lint` → Check output for issues
- [ ] Latest main branch pulled: `git log --oneline -5` shows recent commits
- [ ] All observability instrumentation in place: Verify apiObservability usage in 5 routes

### Environment Validation (Staging/Test)
- [ ] Supabase staging environment online and accessible
- [ ] All migrations applied: Check `information_schema.routines` for `cleanup_expired_exports` RPC
- [ ] RLS policies enforced: Test that non-owner cannot access other users' exports
- [ ] Cron secret configured: `PLANNER_EXPORT_CLEANUP_SECRET` set in staging environment
- [ ] Manual cron test successful: `curl -H "x-cron-secret: ..." /api/cron/planner-exports-cleanup` → 200

### Documentation & Runbooks
- [ ] Incident runbook complete: [INCIDENT_RUNBOOK.md](./INCIDENT_RUNBOOK.md)
- [ ] Cron setup guide complete: [CRON_SETUP.md](./CRON_SETUP.md)
- [ ] Security ops guide complete: [SECURITY_OPS.md](./SECURITY_OPS.md)
- [ ] Team briefed on new features and procedures
- [ ] On-call engineer has access to all runbooks

---

## Deployment Steps

### 1. Deploy to Production (5-10 minutes)

**Option A: Netlify (Current Production Platform)**
```bash
# Automatic deployment on main push
git push origin main
```

**Option B: Manual Docker/Kubernetes**
```bash
# Build and push image
docker build -t shutterplanai:$(git rev-parse --short HEAD) .
docker push your-registry/shutterplanai:latest

# Deploy new version
kubectl rollout restart deployment/shutter-plan-ai
```

**Verify deployment succeeded**:
- [ ] Netlify dashboard shows "Published" status
- [ ] No error notifications in deployment logs
- [ ] API responds: `curl https://<your-netlify-site>.netlify.app/api/health` → 200 (if health check exists)

### 2. Environment Variable Verification (2 minutes)

**Verify production environment is configured**:
```bash
# SSH into production or check via provider dashboard
# Confirm these are set:
# - PLANNER_EXPORT_CLEANUP_SECRET (32+ char random)
# - SUPABASE_URL (valid Supabase project URL)
# - SUPABASE_SERVICE_ROLE_KEY (secret key)
# - SUPABASE_ANON_KEY (anonymous key)
```

---

## Post-Deployment Smoke Tests (20-30 minutes)

### 3. Core Functionality Tests

**Test Authentication Flow**:
```bash
# 1. Signup page loads
curl -I https://<your-netlify-site>.netlify.app/auth/signup
# Expected: 200

# 2. Create test account
# Navigate to: https://<your-netlify-site>.netlify.app/auth/signup
# Fill form: email (test@example.com), password
# Submit and verify success message

# 3. Login page loads
curl -I https://<your-netlify-site>.netlify.app/auth/login
# Expected: 200

# 4. Login with test account
# Navigate to: https://<your-netlify-site>.netlify.app/auth/login
# Use test@example.com credentials
# Should redirect to dashboard

# 5. Dashboard loads
curl -I https://<your-netlify-site>.netlify.app/dashboard
# Expected: 200 (when authenticated)
```

**Test Planner Core Flows** (Requires auth session):

1. **Generate Plan**:
   - [ ] Navigate to Planner page
   - [ ] Add 2-3 test locations (e.g., Central Park, Times Square, Empire State)
   - [ ] Set shoot date/time (next week, morning)
   - [ ] Click "Generate Plan"
   - [ ] Verify: Route optimized, times calculated, map showing locations
   - [ ] Check console for API request logs with request ID + timing

2. **Refine Plan**:
   - [ ] Adjust one location's preferred time window (e.g., "golden hour")
   - [ ] Click "Refine"
   - [ ] Verify: Route re-optimized, timing updated
   - [ ] Check: No duplicate requests in logs

3. **Apply to Project**:
   - [ ] Create or select existing project
   - [ ] Click "Apply Plan"
   - [ ] Verify: Success notification, plan saved
   - [ ] Refresh page: Plan persists

4. **Export/Share**:
   - [ ] Click "Share"
   - [ ] Create share link (with optional password)
   - [ ] Copy link to clipboard
   - [ ] Open link in incognito window (new session)
   - [ ] Verify: Can view shared plan without authentication
   - [ ] If password protected: Enter password, verify access
   - [ ] Revoke share link
   - [ ] Verify: Revoked link no longer accessible (404 or "expired")

### 4. API Monitoring Tests

**Verify Observability Instrumentation**:

```bash
# Test each instrumented endpoint with observability headers

# 1. Analytics endpoint
curl -X POST https://<your-netlify-site>.netlify.app/api/planner/analytics \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"eventName":"generate","success":true}'
# Expected response includes: x-request-id, x-response-time-ms headers

# 2. Export (create share)
curl -X POST https://<your-netlify-site>.netlify.app/api/planner/export \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"planId":"test","password":"testpass123"}'
# Expected: 200 with shareUrl, headers include timing

# 3. Export (revoke share)
curl -X POST https://<your-netlify-site>.netlify.app/api/planner/export/revoke \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"shareToken":"token_here"}'
# Expected: 200, header x-response-time-ms should be < 1000ms

# 4. Intelligence (route optimization)
curl -X POST https://<your-netlify-site>.netlify.app/api/planner/intelligence \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"latitude":40.7128,"longitude":-74.0060,"date":"2026-06-15","durationMinutes":120,"locations":[...]}'
# Expected: 200 with optimized route, confidence scores

# Check browser console for structured JSON logs:
# {"level":"info","event":"api.request.succeeded","requestId":"...","durationMs":...}
```

**Verify Response Headers**:
```bash
# Every API response should have:
# ✓ x-request-id: [UUID] (unique per request)
# ✓ x-response-time-ms: [milliseconds]
# ✓ Content-Type: application/json
# ✓ Cache-Control: private, no-store (for auth endpoints)

curl -I https://<your-netlify-site>.netlify.app/api/planner/analytics \
  -H "Authorization: Bearer $TOKEN"

# Look for headers in response
```

### 5. Error Handling Tests

**Verify Error Cases Return Expected Responses**:

```bash
# 1. Missing authentication
curl https://<your-netlify-site>.netlify.app/api/planner/analytics
# Expected: 401 Unauthorized

# 2. Invalid request body
curl -X POST https://<your-netlify-site>.netlify.app/api/planner/export \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"invalid":"data"}'
# Expected: 400 Bad Request

# 3. Non-existent resource
curl https://<your-netlify-site>.netlify.app/api/planner/export?token=invalid \
  -H "Authorization: Bearer $TOKEN"
# Expected: 404 Not Found

# 4. Cron without secret (should fail)
curl https://<your-netlify-site>.netlify.app/api/cron/planner-exports-cleanup
# Expected: 401 Unauthorized
```

---

## Monitoring & Validation (First 24 hours post-deploy)

### 6. Metrics & Alerts Setup

**Enable Monitoring Dashboard**:

1. **Configure alerts** (Netlify, Datadog, New Relic, CloudWatch):
   - [ ] Error rate > 5% alert
   - [ ] Response time p99 > 500ms alert
   - [ ] 404 rate > 10% alert
   - [ ] Cron job failure alert

2. **Check baseline metrics** (first hour):
   ```
   - Auth endpoint avg response: < 200ms
   - Plan generation avg response: < 2s
   - Route optimization avg response: < 5s
   - Share creation avg response: < 500ms
   - Cleanup cron success rate: 100%
   ```

3. **Set up daily reports**:
   - [ ] Error count by endpoint
   - [ ] Slowest endpoints (p99 latency)
   - [ ] Cron execution status
   - [ ] Failed share link accesses

### 7. User Testing (First 24 hours)

**Internal Testing by Team**:
- [ ] Generate 5 test plans with different locations/times
- [ ] Test share link creation and access (with/without password)
- [ ] Test plan revocation and re-access (should fail)
- [ ] Verify all UI interactions work smoothly
- [ ] Check mobile responsiveness (planners on small screens)

**Beta User Testing** (If applicable):
- [ ] Invite 10-20 beta users
- [ ] Send testing instructions and feature walkthrough
- [ ] Monitor for error reports
- [ ] Collect feedback on UX
- [ ] Check analytics for drop-off points

### 8. Database Health Check

**Verify Database State** (After 24 hours):

```sql
-- Check table sizes (should be stable)
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Verify cleanup job ran
SELECT COUNT(*) as expired_exports_remaining
FROM planner_exports
WHERE expires_at < NOW()
AND revoked_at IS NULL;
-- Expected: 0 (or very small number if new exports created after cleanup)

-- Check for errors in logs
SELECT 
  DATE_TRUNC('hour', created_at) as hour,
  COUNT(*) as error_count,
  error_message
FROM api_logs
WHERE status >= 400
GROUP BY hour, error_message
ORDER BY hour DESC
LIMIT 10;
```

---

## Rollback Plan

**If critical issues detected** (error rate > 20%, major features broken):

### Option A: Revert to Previous Version (Netlify)
```bash
# Go to Netlify dashboard → Deploys
# Find most recent stable deployment
# Click "Rollback" button
# Verify deployment reverted

# Or manually:
git revert HEAD --no-edit
git push origin main
```

### Option B: Revert to Previous Main Commit
```bash
git log --oneline -5
# Find commit before current deployment
git reset --hard <commit_hash>
git push -f origin main  # ⚠️ Only if no other commits pushed

# Or create revert commit (safer):
git revert <commit_hash>
git push origin main
```

### Option C: Database Rollback (If needed)
```bash
# In Supabase console:
# 1. Go to: Backups tab
# 2. Restore from backup taken before deployment
# 3. Verify data integrity post-restore
```

**Communicate Rollback**:
- [ ] Notify users of the issue
- [ ] Explain rollback and ETA for fix
- [ ] Post incident timeline in status page
- [ ] Schedule post-mortem meeting

---

## Post-Deployment Success Criteria

✅ **Deployment is successful when:**
- [ ] All smoke tests pass (auth, plan generation, refinement, share, revoke)
- [ ] No critical errors in production logs (error rate < 2%)
- [ ] Response times within baseline (auth < 200ms, generation < 2s)
- [ ] Cron job executed successfully in first 24 hours
- [ ] Database shows 0 orphaned expired exports
- [ ] Observability headers present on all responses
- [ ] Team confirms no issues on internal testing
- [ ] No user-reported bugs in first 48 hours

---

## Sign-Off Checklist

**Deploy Lead** (who executed deployment):
- [ ] Deployment completed successfully
- [ ] All smoke tests passed
- [ ] No rollback needed
- [ ] Signature: _______________ Date: ___________

**QA/Tester**:
- [ ] All test scenarios verified
- [ ] No critical bugs found
- [ ] User flows working as expected
- [ ] Signature: _______________ Date: ___________

**Operations**:
- [ ] Monitoring configured and alerting
- [ ] Database backup verified
- [ ] Incident runbook accessible
- [ ] Cron scheduled in production
- [ ] Signature: _______________ Date: ___________

**Product Manager** (acceptance):
- [ ] Features ready for users
- [ ] Analytics configured
- [ ] Documentation complete
- [ ] Go/No-Go decision: **GO**
- [ ] Signature: _______________ Date: ___________

---

## Reference

- **Current Build**: Commit 02340b3 (observability + docs)
- **Phase 2 Commits**: 89d7e0b (weather), 657be34 (route opt), 645304e (perf), 5297c5f (observability), 02340b3 (docs)
- **Test Results**: 15/15 tests passing
- **Build Status**: ✅ Production build clean
- **Deployment Date**: 2026-06-11
- **Estimated Duration**: 30-45 minutes (deployment + smoke tests)

**Next Steps After Successful Deployment**:
1. Monitor metrics for 24 hours
2. Collect user feedback
3. Review analytics funnel (UX iteration cycle)
4. Plan V2 features based on learnings

---

**Created**: 2026-06-11
**Owner**: DevOps / Deployment Lead
**Last Updated**: 2026-06-11
