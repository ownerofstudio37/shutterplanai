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

- [ ] Add client approval states to shared guides: pending, approved, changes requested.
- [ ] Add comments on locations, timeline items, and shot-list items.
- [ ] Add share-link activity summaries back into the planner review UI.
- [ ] Add role-based guide access for photographer, assistant, client, and vendor views.
- [ ] Add version history for plan refinements and client-facing guide updates.

## Next: Integrations and Growth

- [ ] Add calendar export or sync for confirmed shoot timelines.
- [ ] Add downloadable branded PDF export for client guides.
- [ ] Add reusable guide templates by session type.
- [ ] Add onboarding prompts that connect business profile settings to visible planner output examples.
- [ ] Add upgrade-page copy and plan comparison tied directly to saved hours, client readiness, and premium guide controls.
