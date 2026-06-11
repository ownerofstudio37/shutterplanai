# Production Configuration: Planner Export Cleanup Cron

## Overview
This guide configures the automated cleanup job for expired planner share links in production.

**What it does**: Runs `GET /api/cron/planner-exports-cleanup` on a daily schedule to delete expired and revoked share links from the database.

**Why it matters**: Prevents unbounded growth of the `planner_exports` table and ensures revoked links are immediately inaccessible.

---

## Configuration Steps

### Step 1: Generate Cron Secret

Generate a secure random token for cron authentication:

```bash
# On macOS/Linux
openssl rand -hex 16

# Output example: a7f2c9e1b4d6f8a3c5e7b9d1f3a5c7e9
# Copy this value for use in Step 2
```

**Security Requirements**:
- Minimum 32 characters (hex)
- Store in secure location (password manager, CI/CD secrets)
- Rotate quarterly
- Never commit to git or logs

---

### Step 2: Set Environment Variable in Production

Choose your deployment platform below (Netlify first):

#### **Netlify (Current Production Platform)**
1. Go to Site configuration → Environment variables
2. Create new variable:
   - **Name**: `PLANNER_EXPORT_CLEANUP_SECRET`
   - **Value**: [Paste from Step 1]
3. Save and trigger redeploy:
   ```bash
   git push origin main
   ```

#### **GitHub Actions Secrets**
1. Go to Repository Settings → Secrets and variables → Actions
2. Create new repository secret:
   - **Name**: `PLANNER_EXPORT_CLEANUP_SECRET`
   - **Value**: [Paste from Step 1]
3. Reference in deployment workflow:
   ```yaml
   env:
     PLANNER_EXPORT_CLEANUP_SECRET: ${{ secrets.PLANNER_EXPORT_CLEANUP_SECRET }}
   ```

#### **Docker / Self-Hosted**
1. Add to `.env.production`:
   ```
   PLANNER_EXPORT_CLEANUP_SECRET=a7f2c9e1b4d6f8a3c5e7b9d1f3a5c7e9
   ```
2. Restart application server

---

### Step 3: Configure Cron Trigger

Choose one approach:

#### **Option A: External Cron Service (EasyCron / Cron-job.org) - Recommended for Netlify**

Use an external scheduler to call your deployed endpoint daily.

1. Go to [easycron.com](https://www.easycron.com/) (or your preferred scheduler)
2. Create a new cron job:
   - **URL**: `https://<your-netlify-site>.netlify.app/api/cron/planner-exports-cleanup`
   - **Cron Expression**: `0 2 * * *` (Daily at 2 AM UTC)
   - **Method**: `GET`
   - **Headers**:
     - `x-cron-secret: <PLANNER_EXPORT_CLEANUP_SECRET>`
     - `Accept: application/json`
3. Save and run a test job
4. Confirm response is `200` with `{ "success": true }`

#### **Option B: Netlify Scheduled Function (Optional)**

If you choose Netlify Scheduled Functions, create a scheduled function that internally calls `cleanup_expired_exports` (or calls this API route). This keeps scheduling inside Netlify but requires additional function setup.

#### **Option C: AWS EventBridge + Lambda**

1. Go to [easycron.com](https://www.easycron.com/)
2. Login or create account
3. Click "Add a Cron Job"
4. Configure:
  - **URL**: `https://<your-netlify-site>.netlify.app/api/cron/planner-exports-cleanup`
   - **Cron Expression**: `0 2 * * *` (Daily at 2 AM UTC)
   - **Request Method**: GET
   - **Custom Headers**:
     ```
     x-cron-secret: [Your secret from Step 1]
     Accept: application/json
     ```
5. Click "Create"
6. Click "Test" to verify (should get 200 response)

#### **Option D: AWS EventBridge + Lambda**

1. Create Lambda function that calls the endpoint:
   ```python
   import requests
   import os
   
   def lambda_handler(event, context):
      url = "https://<your-netlify-site>.netlify.app/api/cron/planner-exports-cleanup"
       headers = {
           "x-cron-secret": os.environ['PLANNER_EXPORT_CLEANUP_SECRET'],
           "Accept": "application/json"
       }
       response = requests.get(url, headers=headers, timeout=30)
       return {"statusCode": response.status_code, "body": response.text}
   ```

2. Create EventBridge Rule:
   - **Schedule**: `cron(0 2 * * ? *)` (Daily at 2 AM UTC)
   - **Target**: Lambda function from step 1

3. Test trigger manually in AWS console

#### **Option E: GitHub Actions Workflow**

Create `.github/workflows/cleanup-exports.yml`:

```yaml
name: Cleanup Expired Exports

on:
  schedule:
    - cron: '0 2 * * *'  # Daily at 2 AM UTC

jobs:
  cleanup:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger cleanup endpoint
        run: |
          curl -X GET https://<your-netlify-site>.netlify.app/api/cron/planner-exports-cleanup \
            -H "x-cron-secret: ${{ secrets.PLANNER_EXPORT_CLEANUP_SECRET }}" \
            -H "Accept: application/json" \
            -w "\nStatus: %{http_code}\n"
        env:
          PLANNER_EXPORT_CLEANUP_SECRET: ${{ secrets.PLANNER_EXPORT_CLEANUP_SECRET }}
```

Push to repository:
```bash
git add .github/workflows/cleanup-exports.yml
git commit -m "chore: add cleanup exports scheduled job"
git push origin main
```

---

### Step 4: Verify Configuration

#### **Manual Test**
```bash
# Trigger cleanup manually with correct secret
curl -X GET https://<your-netlify-site>.netlify.app/api/cron/planner-exports-cleanup \
  -H "x-cron-secret: a7f2c9e1b4d6f8a3c5e7b9d1f3a5c7e9" \
  -H "Accept: application/json"

# Expected response (200 OK):
# {"success":true}
# 
# Response headers should include:
# x-request-id: [UUID]
# x-response-time-ms: [milliseconds]
```

#### **Check Cron Execution Logs**
- **Netlify**: Site → Functions / Logs → filter for planner-exports-cleanup
- **EasyCron**: Cron Jobs list → Click job → View execution history
- **GitHub Actions**: Workflows → cleanup-exports → Recent runs

#### **Monitor Database**
```sql
-- Query after cron should have executed
SELECT COUNT(*) as expired_exports_remaining
FROM planner_exports
WHERE expires_at < NOW()
  AND revoked_at IS NULL;

-- Expected: 0 (or very small number if new exports added after cleanup)
```

---

## Monitoring & Alerts

### **Set Up Alerting** (Recommended)

Add to your monitoring dashboard (Datadog, New Relic, etc.):

```javascript
// Pseudocode: Check that cleanup is running
async function monitorCleanupHealth() {
  // Query 1: Check for excessive expired exports
  const expiredCount = await queryDatabase(
    "SELECT COUNT(*) FROM planner_exports WHERE expires_at < NOW()"
  );
  if (expiredCount > 100) {
    alert('Cleanup not running: ' + expiredCount + ' expired exports');
  }
  
  // Query 2: Check recent cron logs
  const recentLogs = await getCronLogs({ hours: 24 });
  if (recentLogs.length === 0) {
    alert('Cleanup cron did not execute in last 24 hours');
  }
  
  // Query 3: Check error rate
  const errorCount = recentLogs.filter(l => l.status !== 200).length;
  if (errorCount > recentLogs.length * 0.05) { // >5% error rate
    alert('Cleanup cron failing: ' + errorCount + ' errors out of ' + recentLogs.length);
  }
}
```

### **Alert Thresholds**

| Metric | Threshold | Action |
|--------|-----------|--------|
| Expired exports in DB | > 100 | Alert immediately |
| Cleanup cron failures | > 1 failure in 7 days | Alert + investigate |
| Cleanup execution delay | > 2 hours late | Alert |
| Response time | > 5 seconds | Monitor, alert if > 10s |

---

## Rotation Schedule

### **Quarterly Secret Rotation**

**When**: Every 3 months (Jan 1, Apr 1, Jul 1, Oct 1)

**Process**:
1. Generate new secret (Step 1)
2. Update all cron configurations with new secret
3. Update `PLANNER_EXPORT_CLEANUP_SECRET` in production environment
4. Verify cron executes successfully with new secret
5. Archive old secret in secure location
6. Document rotation in change log

**Example Rotation Log**:
```
2026-06-11: Initial setup (secret: a7f2c9e1...)
2026-09-11: Q3 rotation (secret: f4b8d2c6...)
2026-12-11: Q4 rotation (secret: 7e3a9c1f...)
```

---

## Troubleshooting

**Cron not executing?**
- See [INCIDENT_RUNBOOK.md](./INCIDENT_RUNBOOK.md) → Tier 1 checks

**Cleanup job returning 401 Unauthorized?**
- Verify `PLANNER_EXPORT_CLEANUP_SECRET` matches across all systems
- Check environment variable is set in production

**Database still has expired exports after cleanup?**
- Check RPC permissions in Supabase
- Manually test RPC: `SELECT cleanup_expired_exports();`

**Need immediate cleanup?**
- Run manual SQL in Supabase console (see INCIDENT_RUNBOOK.md appendix)
- Do NOT use for regular operations—cron should handle it

---

## Reference

- **Cron job endpoint**: `/api/cron/planner-exports-cleanup`
- **Cron RPC function**: `cleanup_expired_exports()`
- **Cleanup query**: Deletes rows where `expires_at < NOW()` OR `revoked_at IS NOT NULL`
- **Expected run time**: < 5 seconds for typical DB size
- **Recommended frequency**: Daily (prevents unbounded table growth)

**Setup Date**: 2026-06-11
**Last Updated**: 2026-06-11
**Next Review**: 2026-09-11 (quarterly rotation)
