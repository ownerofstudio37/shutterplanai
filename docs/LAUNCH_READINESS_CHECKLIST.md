# Launch Readiness Checklist

## Auth
- [ ] Signup, login, logout, and expired-token states pass in production.
- [ ] Demo account exists and is confirmed in Supabase auth.
- [ ] Password reset or support fallback is documented before paid beta invites.

## Production Env Vars
- [ ] `NEXT_PUBLIC_SUPABASE_URL`
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] `SUPABASE_SERVICE_ROLE_KEY`
- [ ] `GEMINI_API_KEY`
- [ ] `GEMINI_MODEL`
- [ ] `PLANNER_EXPORT_CLEANUP_SECRET`
- [ ] `BILLING_TEST_MODE=false`
- [ ] `BILLING_CHECKOUT_URL`
- [ ] `BILLING_PORTAL_URL`

## Supabase
- [ ] All migrations are applied, including `20260726_launch_readiness.sql`.
- [ ] RLS policies are enabled on users, projects, shots, planner drafts, exports, analytics, templates, and feedback.
- [ ] Shared-guide access, revocation, expiry, and password policies are tested from an incognito session.

## Observability
- [ ] API responses include `x-request-id` and `x-response-time-ms`.
- [ ] Error logs include request id, route, status, stage, and user id where available.
- [ ] Alerts exist for auth failures, planner generation failures, export failures, and cron cleanup failures.

## Demo Data
- [ ] Run `supabase/seed_founder_demo.sql` against staging after creating the demo auth user.
- [ ] Demo script covers: landing page, signup/login, planner intake, route selection, micro-spots, export, shared guide, upgrade path.
- [ ] Demo account is reset before every sales or beta call.

## Billing
- [ ] Hosted checkout URL is configured.
- [ ] Customer portal URL is configured.
- [ ] Free account limits block extra planner generations and premium guide options.
- [ ] Pro status unlocks unlimited planning, protected guide links, longer expiry, and multi-day planning.
- [ ] Test-mode upgrade is disabled in production.

## QA Routes
- [ ] `/`
- [ ] `/auth/signup`
- [ ] `/auth/login`
- [ ] `/dashboard`
- [ ] `/dashboard/planner`
- [ ] `/dashboard/settings`
- [ ] `/dashboard/shot-board`
- [ ] `/plans/[token]`
- [ ] `/api/billing/status`
- [ ] `/api/billing/checkout`
- [ ] `/api/billing/portal`
- [ ] `/api/planner/feedback`

## Final Verification
- [ ] Use supported Node 20 or newer.
- [ ] `npm run lint`
- [ ] `npm test`
- [ ] `npm run build`
- [ ] `npm run test:e2e`
