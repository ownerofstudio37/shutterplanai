# ShutterPlan AI Product TODO

## Now: Onboarding and Readiness

- [x] Add an empty-state First Shoot Plan flow on the dashboard.
- [x] Guide users to complete their Business Profile before AI planning.
- [x] Add starter prompts like Family mini session, Engagement golden hour, and Senior portrait downtown.
- [x] Make the dashboard show a clear readiness path: profile -> project -> AI plan -> client guide.
- [x] Add a polished sample plan state if there is no account data yet.

## Next: Monetization

- [x] Add planner usage limits.
- [x] Add subscription gates for premium planning/export workflows.
- [x] Add upgrade prompts that explain the value of paid tiers.

## Next: Client Guide Polish

- [x] Add custom branding controls for guide links.
- [x] Add logo and color settings for client-facing guides.
- [x] Add share analytics for guide opens and engagement.

## Next: Weather and Sun Telemetry

- [x] Deepen golden hour and blue hour calculations.
- [x] Integrate more complete weather forecasting where gaps remain.
- [x] Surface weather and sun confidence directly inside planning decisions.

## Next: Mobile QA

- [x] Audit dashboard surfaces at mobile viewport sizes.
- [x] Tighten touch targets and field-ready workflows.
- [x] Verify no text overflow, content overlap, or unusable controls on small screens.

## Audit Notes: June 11, 2026

- `npm test` passes: 8 files, 34 tests.
- `npm run build` passes: 37 app routes generated.
- Playwright route sweep found no mobile or desktop horizontal overflow, console errors, or failed requests across marketing, auth, and dashboard routes.
- `npm run lint` currently fails because ESLint scans stale `.next_broken_*` artifacts and because source lint still has React Compiler/API cleanup items.

## Now: Engineering Hardening

- [x] Update ESLint ignores so stale `.next_broken_*` build artifacts never get linted.
- [x] Remove or archive the local `.next_broken_1781094522` generated directory.
- [x] Fix source lint errors in `src/app/dashboard/planner/page.tsx`.
- [x] Replace the loose `any` cast in `src/app/api/shots/route.ts`.
- [x] Clean remaining lint warnings: unused imports/vars, raw `<img>` usage where `next/image` is appropriate, and unused eslint-disable comments.
- [x] Add a CI-ready command that runs source lint, tests, and production build together.

## Next: Planner Architecture

- [x] Split the large planner page into smaller state/workflow hooks and focused view components.
- [x] Move draft autosave, chat answer state, AI typing state, and selected review location state out of synchronous effects.
- [x] Normalize planner memo dependencies so React Compiler can optimize route and logistics lookups.
- [x] Add unit coverage around planner draft resume/autosave behavior.
- [x] Add integration coverage for generate -> refine -> apply -> share planner flow.

## Next: E2E and QA Automation

- [x] Add Playwright as a first-class dev dependency with `playwright.config.ts`.
- [x] Add authenticated dashboard smoke tests for mobile and desktop viewports.
- [x] Add E2E coverage for login, signup, planner generation, project creation, shot creation, and client guide access.
- [x] Add visual/DOM checks for no horizontal overflow and minimum touch target sizes on key routes.
- [x] Run E2E against production build via Playwright `webServer`.

## Next: Security and Abuse Protection

- [x] Add rate limiting to expensive AI routes: session generation, refinement, shot suggestions, website analysis, and public guide password checks.
- [x] Add upload size limits and file extension validation to shot image uploads.
- [x] Add timeout and max-body safeguards to website analysis fetches.
- [x] Avoid sending public guide passwords through query strings; use POST or short-lived verification state.
- [x] Add stronger logging for auth failures, share-link password failures, and AI provider failures without exposing sensitive data.
- [x] Add regression tests for billing gates on refinements, AI suggestions, multi-day planning, share links, and password-protected exports.

## Next: Field Execution Mode

- [x] Build a mobile shoot-day checklist that lets photographers mark timeline items and shots complete.
- [x] Add variance tracking for planned vs actual time at each location.
- [x] Add "running late" catch-up suggestions from the planned timeline.
- [x] Add quick notes per location and per shot during execution.
- [x] Add offline-friendly local progress state with sync when the connection returns.

## Next: Venue and Permit Intelligence

- [x] Add venue/park hours, parking cost, and restroom confidence where available.
- [x] Add permit likelihood details with source notes and lead-time guidance.
- [x] Add event/crowd risk signals for public locations.
- [x] Add no-permit alternative suggestions when a location looks risky.
- [x] Add a "needs verification" badge when telemetry or venue data is incomplete.

## Next: Collaboration and Client Approval

- [x] Add client approval states to shared guides: pending, approved, changes requested.
- [x] Add comments on locations, timeline items, and shot-list items.
- [x] Add share-link activity summaries back into the planner review UI.
- [x] Add role-based guide access for photographer, assistant, client, and vendor views.
- [x] Add version history for plan refinements and client-facing guide updates.

## Next: Integrations and Growth

- [x] Add calendar export or sync for confirmed shoot timelines.
- [x] Add downloadable branded PDF export for client guides.
- [x] Add reusable guide templates by session type.
- [x] Add onboarding prompts that connect business profile settings to visible planner output examples.
- [x] Add upgrade-page copy and plan comparison tied directly to saved hours, client readiness, and premium guide controls.

## Now: Pre-Launch Planner UX

- [x] Add a dedicated location shortlisting workflow where AI can surface 6-10 candidate locations but the photographer chooses the actual shoot stops.
- [x] Ask during intake how many final shoot locations or venue zones are necessary before AI generates the plan.
- [x] Let photographers select 1-3 final locations for most shoots, with clear selected/unselected states and a recommended count by session duration.
- [x] Make selected locations drive the map review, route order, shot list context, client guide export, and project creation instead of blindly using every AI candidate.
- [x] Add micro-location mapping inside a selected location: named exact spots, notes, parking/restroom anchors, walking order, and client-facing arrival guidance.
- [ ] Add controls to add, rename, reorder, and remove micro-spots before applying a plan.
- [ ] Add AI-assisted micro-spot suggestions for the selected location based on session type, light, logistics, and client constraints.
- [ ] Make the planner review UI sleeker: stronger visual hierarchy, fewer dense panels, clearer next actions, and a more polished “planning cockpit” flow.
- [ ] Add a final “session route” confirmation step before creating the project or client guide.

## Next: Launch Readiness

- [ ] Fix local verification/toolchain reliability by using a supported Node version and rerunning lint, tests, build, and Playwright.
- [ ] Create a launch checklist covering auth, production env vars, Supabase policies, observability, demo data, billing, and QA routes.
- [ ] Build a real upgrade/payment path with checkout, customer portal, plan status, and testable premium states.
- [ ] Seed a polished founder-demo shoot that shows the first two minutes of the product at its best.
- [ ] Run a full mobile and desktop QA pass across planner, shared guide, settings, billing, dashboard, and public pages.
- [ ] Tighten landing/onboarding copy around the photographer pain: fewer apps, faster planning, better-prepared clients.
- [ ] Add a beta feedback loop for photographers to report confusing planner output, missing location details, and guide handoff friction.
