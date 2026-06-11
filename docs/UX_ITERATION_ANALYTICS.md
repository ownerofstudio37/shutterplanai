# UX Iteration: Analytics Funnel Analysis

## Overview
This guide helps identify and prioritize UX improvements based on real user behavior and analytics data.

**Metrics Focus**: Planner funnel (Generate → Refine → Apply → Share)

---

## Phase 3: Gathering Analytics

### Step 1: Query Planner Events

Connect to production database and run these queries to understand user behavior:

#### **1A: Funnel Completions (Last 7 Days)**
```sql
SELECT 
  DATE_TRUNC('day', created_at) as day,
  COUNT(DISTINCT user_id) FILTER (WHERE event_name = 'generate') as users_generated,
  COUNT(DISTINCT user_id) FILTER (WHERE event_name = 'refine') as users_refined,
  COUNT(DISTINCT user_id) FILTER (WHERE event_name = 'apply') as users_applied,
  COUNT(DISTINCT user_id) FILTER (WHERE event_name = 'share') as users_shared,
  ROUND(
    COUNT(DISTINCT user_id) FILTER (WHERE event_name = 'refine')::numeric / 
    NULLIF(COUNT(DISTINCT user_id) FILTER (WHERE event_name = 'generate'), 0) * 100, 
    1
  ) as refine_rate_pct,
  ROUND(
    COUNT(DISTINCT user_id) FILTER (WHERE event_name = 'apply')::numeric / 
    NULLIF(COUNT(DISTINCT user_id) FILTER (WHERE event_name = 'generate'), 0) * 100, 
    1
  ) as apply_rate_pct
FROM planner_analytics
WHERE created_at >= NOW() - INTERVAL '7 days'
GROUP BY day
ORDER BY day DESC;
```

**Expected Results** (Healthy Funnel):
- Generate → Refine: 60-80% (baseline: ~70% users continue to refine)
- Generate → Apply: 40-60% (baseline: ~50% users apply to project)
- Generate → Share: 10-20% (baseline: ~15% users share with collaborators)

#### **1B: Success vs Failure Rates**
```sql
SELECT 
  event_name,
  success,
  COUNT(*) as count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (PARTITION BY event_name), 1) as success_pct
FROM planner_analytics
WHERE created_at >= NOW() - INTERVAL '7 days'
  AND event_name IN ('generate', 'refine', 'apply', 'share')
GROUP BY event_name, success
ORDER BY event_name, success DESC;
```

**Target Metrics**:
- Generate success rate: > 95% (should be nearly 100%)
- Refine success rate: > 90% (some users abandon if refinements take too long)
- Apply success rate: > 95% (few reasons to fail after refining)
- Share success rate: > 98% (technically simple)

#### **1C: Drop-off Reasons (Failed Events)**
```sql
SELECT 
  event_name,
  event_payload->>'failed_reason' as failure_reason,
  COUNT(*) as count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (PARTITION BY event_name WHERE success = false), 1) as pct_of_failures
FROM planner_analytics
WHERE created_at >= NOW() - INTERVAL '14 days'
  AND success = false
  AND event_name IN ('generate', 'refine', 'apply')
GROUP BY event_name, failure_reason
ORDER BY event_name, count DESC;
```

**Common Failure Reasons to Watch For**:
- `validation_error`: Missing/invalid input
- `timeout`: Route optimization took > 10s
- `location_not_found`: Geocoding failed
- `no_locations`: User submitted empty list
- `network_error`: API unreachable
- `permission_denied`: User not authorized
- `insufficient_data`: Weather API unavailable

#### **1D: Refinement Behavior (What Users Change Most)**
```sql
SELECT 
  event_payload->>'field_changed' as changed_field,
  COUNT(*) as refine_count,
  COUNT(DISTINCT user_id) as unique_users,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 1) as pct_of_refinements
FROM planner_analytics
WHERE created_at >= NOW() - INTERVAL '14 days'
  AND event_name = 'refine'
GROUP BY changed_field
ORDER BY refine_count DESC
LIMIT 10;
```

**Insights This Reveals**:
- High `time_window` changes: Route optimization needs improvement
- High `location_removed`: Users adding wrong locations initially
- High `order_swapped`: Default order not matching user expectations
- High `duration_changed`: Users underestimating/overestimating shoot time

#### **1E: Time-on-Page Analysis**
```sql
SELECT 
  'generate' as step,
  ROUND(AVG(EXTRACT(EPOCH FROM (ended_at - started_at))), 1) as avg_seconds,
  ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (ended_at - started_at))), 1) as median_seconds,
  ROUND(PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (ended_at - started_at))), 1) as p95_seconds
FROM planner_analytics
WHERE created_at >= NOW() - INTERVAL '7 days'
  AND event_name = 'generate'
UNION ALL
SELECT 'refine', ROUND(AVG(...), 1), ... FROM planner_analytics WHERE event_name = 'refine'
UNION ALL
SELECT 'apply', ROUND(AVG(...), 1), ... FROM planner_analytics WHERE event_name = 'apply';
```

**Target Times**:
- Generate (initial load + inputs + first generation): 20-40 seconds
- Refine (adjustments + regeneration): 10-20 seconds per refinement
- Apply (final confirmation): 5-10 seconds

---

## Phase 4: Identify Top 3 Issues

Based on query results, prioritize issues using this matrix:

| Priority | Criteria |
|----------|----------|
| **CRITICAL** | Failure rate > 10% on any step; Generate/Apply/Share success < 90% |
| **HIGH** | 20%+ drop-off between steps; p95 time > 60s; Users abandoning after 1 refinement |
| **MEDIUM** | 10-20% drop-off; High specific failure reason (e.g., 30% of failures are timeouts) |
| **LOW** | < 10% drop-off; Isolated user complaints; Improvements would benefit < 20% of users |

### Example Issues Discovered:

**Issue #1: High Generate Failure Rate (12%)**
- Likely cause: Location geocoding failing for ambiguous addresses
- Quick fix: Show "Location not found" message with alternate search (e.g., suggest "Manhattan" instead of "Manhattan Bridge")
- Effort: 2-3 hours
- Expected impact: Reduce failures from 12% → 5%

**Issue #2: 50% Drop-off After Generate → Users Don't Refine**
- Likely cause: Default route shown is "good enough"; no incentive to refine
- Quick fix: Show "Tip: Refine to get weather insights or adjust timing"
- Effort: 1 hour (UI message)
- Expected impact: Increase refine rate from 50% → 60-65%

**Issue #3: Apply Takes 30+ Seconds (p95)**
- Likely cause: Large plans taking too long to save + UI not showing progress
- Quick fix: Show loading state with estimated time remaining
- Effort: 3-4 hours
- Expected impact: Reduce perceived wait time + lower abandonment

---

## Phase 5: Quick-Win UX Fixes (Next Sprint)

### Fix #1: Improve Location Input Validation
```typescript
// Current: Silent failure if geocoding fails
// New: Show helpful error message with suggestions

async function validateLocation(address: string) {
  const geocoded = await geocodeAddress(address);
  
  if (!geocoded) {
    // Instead of silently failing:
    return {
      success: false,
      error: `"${address}" not found. Did you mean:`,
      suggestions: [
        { name: 'Manhattan, NY', lat: 40.7831, lng: -73.9712 },
        { name: 'Brooklyn, NY', lat: 40.6501, lng: -73.9496 }
      ]
    };
  }
  
  return { success: true, ...geocoded };
}
```
- **Where**: [src/app/dashboard/planner/page.tsx](src/app/dashboard/planner/page.tsx) → location input validation
- **Effort**: 2-3 hours
- **Metrics**: Reduce generate failure rate by ~50%

### Fix #2: Show Refinement Incentive
```typescript
// Current: User generates plan, no next step shown
// New: Teaser shows what refining reveals

function GenerateSuccess() {
  return (
    <div>
      <h2>✓ Plan Generated!</h2>
      <div className="plan-preview">
        {/* Show 3-location route */}
      </div>
      
      {/* NEW: Incentive message */}
      <div className="refinement-teaser">
        <h3>💡 Tip: Refine for more insights</h3>
        <ul>
          <li>⛅ See golden hour timing</li>
          <li>🚗 Check parking difficulty</li>
          <li>📍 Adjust location order</li>
        </ul>
        <button onClick={toggleRefinePanel}>Try it →</button>
      </div>
    </div>
  );
}
```
- **Where**: [src/components/planner/PlannerDesktopReviewContent.tsx](src/components/planner/PlannerDesktopReviewContent.tsx) → after generation success
- **Effort**: 1-2 hours
- **Metrics**: Increase refine rate from 50% → 60-65%

### Fix #3: Add Progress Indicator for Apply
```typescript
// Current: Apply button shows no feedback
// New: Show "Saving..." with progress

async function handleApply() {
  setApplyingProgress(0);
  
  try {
    // Call API with onProgress callback
    await savePlanToProject(plan, {
      onProgress: (percent) => setApplyingProgress(percent)
    });
  } finally {
    setApplyingProgress(null);
  }
}

// In UI:
<button disabled={applyingProgress !== null}>
  {applyingProgress !== null 
    ? `Saving... ${applyingProgress}%` 
    : 'Apply to Project'}
</button>
```
- **Where**: [src/app/dashboard/planner/page.tsx](src/app/dashboard/planner/page.tsx) → apply handler
- **Effort**: 2-3 hours
- **Metrics**: Reduce perceived wait, lower abandonment by ~10%

### Fix #4: Better Error Messages
```typescript
// Current: Generic error "Plan generation failed"
// New: Specific, actionable errors

const errorMessages = {
  'validation_error': {
    title: '⚠️ Incomplete plan',
    message: 'Please add at least 2 locations and a shoot date',
    action: 'Back to planning'
  },
  'timeout': {
    title: '⏱️ Taking longer than usual',
    message: 'Route optimization is complex. Try with fewer locations.',
    action: 'Simplify locations'
  },
  'location_not_found': {
    title: '📍 Location not recognized',
    message: `"${failedLocation}" couldn't be found. Try "New York, NY" instead.`,
    action: 'Edit locations'
  },
  'network_error': {
    title: '🌐 Connection issue',
    message: 'Check your internet and try again',
    action: 'Retry'
  }
};
```
- **Where**: Error handling in [src/app/dashboard/planner/page.tsx](src/app/dashboard/planner/page.tsx)
- **Effort**: 2-3 hours
- **Metrics**: Reduce support tickets, improve user confidence

### Fix #5: Optimize Route Generation Time
```typescript
// Current: Heavy computation blocks UI
// New: Show partial results while optimizing

async function generatePlan() {
  // Step 1: Quick geocoding + initial route (show immediately)
  const quickRoute = await quickGeocodeAndRoute(locations);
  setRoute(quickRoute);
  setLoading(true);
  
  // Step 2: Full optimization in background
  const optimizedRoute = await fullOptimization(locations);
  setRoute(optimizedRoute); // Update with better route
  setLoading(false);
}
```
- **Where**: [src/lib/planner/intelligence.ts](src/lib/planner/intelligence.ts) → optimizeRouteOrder function
- **Effort**: 4-5 hours (requires refactoring optimization pipeline)
- **Metrics**: Reduce initial load time from 3-5s → 1-2s

---

## Phase 6: Monitoring Improvements

### Add UX Metrics Tracking

```typescript
// Track where users abandon the funnel
interface UXMetric {
  stepName: 'generate' | 'refine' | 'apply' | 'share';
  action: 'start' | 'success' | 'failure' | 'abandon';
  durationSeconds: number;
  reasonForAbandon?: string; // If failure
  errorMessage?: string;
}

// Send to analytics
async function trackUXMetric(metric: UXMetric) {
  await fetch('/api/planner/analytics', {
    method: 'POST',
    body: JSON.stringify({
      eventName: metric.stepName,
      success: metric.action === 'success',
      event_payload: metric
    })
  });
}

// Usage:
const [startTime, setStartTime] = useState<number>(Date.now());

function handleGenerateClick() {
  trackUXMetric({
    stepName: 'generate',
    action: 'start',
    durationSeconds: 0
  });
}

async function handleGenerateSuccess() {
  trackUXMetric({
    stepName: 'generate',
    action: 'success',
    durationSeconds: (Date.now() - startTime) / 1000
  });
}
```

---

## Phase 7: A/B Testing Setup

**Example: Test Refinement Incentive**

```typescript
// Variant A: Control (no message)
// Variant B: With "Tip: Refine for more insights"
// Variant C: With "Popular: 85% users refine their plans"

const variantId = hashUserId(userId) % 3; // Consistent assignment

return variantId === 0 ? <ControlVersion /> :
       variantId === 1 ? <TipVersion /> :
       <SocialProofVersion />;
```

**Success Criteria**:
- Variant 1 or 2 increases refine rate by ≥ 5%
- No increase in generate failure rate
- Decision: Roll out winner to all users

---

## Backlog: Longer-Term Improvements

| Opportunity | Effort | Impact |
|-------------|--------|--------|
| Save draft plans (mid-flow) | 3-4h | Reduce re-work for indecisive users |
| Import previous shoots as templates | 8-10h | Reduce entry time for repeat clients |
| Mobile map interface for location reordering | 6-8h | Improve UX on mobile (currently keyboard-only) |
| Bulk location import from CSV/spreadsheet | 4-5h | Support event/property managers |
| Collaborator mode (shared planning) | 12-15h | Team workflows |
| Weather sensitivity analysis | 6-7h | Help users choose best shoot days |

---

## Analytics Dashboard Setup

### Create Dashboards in Netlify/Datadog/GA4

**Dashboard 1: Funnel Overview** (Real-time)
- Unique users per step (generate, refine, apply, share)
- Conversion rates (% → %)
- Drop-off rate by step
- Alerts if any step > 20% failure rate

**Dashboard 2: Performance** (Real-time)
- Generate avg/p95/p99 latency
- Refine avg/p95/p99 latency
- Apply avg/p95/p99 latency
- Alert if p95 > 30s

**Dashboard 3: Errors** (Daily)
- Top 10 failure reasons
- Error rate by endpoint
- Failed location geocodes (show address patterns)
- Timeouts vs validation errors

---

## Reference Queries for Weekly Reviews

```sql
-- Weekly funnel snapshot
SELECT 
  DATE_TRUNC('week', created_at) as week,
  COUNT(DISTINCT user_id) FILTER (WHERE event_name = 'generate') as generated,
  ROUND(COUNT(DISTINCT user_id) FILTER (WHERE event_name = 'refine')::numeric / 
        COUNT(DISTINCT user_id) FILTER (WHERE event_name = 'generate') * 100, 1) as refine_rate,
  ROUND(COUNT(DISTINCT user_id) FILTER (WHERE event_name = 'apply')::numeric / 
        COUNT(DISTINCT user_id) FILTER (WHERE event_name = 'generate') * 100, 1) as apply_rate
FROM planner_analytics
WHERE created_at >= NOW() - INTERVAL '12 weeks'
GROUP BY week
ORDER BY week DESC;
```

---

**Created**: 2026-06-11
**Owner**: Product / Analytics Team
**Next Review**: After first week of production (2026-06-18)
