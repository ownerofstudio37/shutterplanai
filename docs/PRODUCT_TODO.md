# ShutterPlan AI Product TODO

## High Priority: True AI Planning Utility

Recommended build order:

1. Planner brain schema and stage-based action API.
2. Persistent planner chat that can update the structured plan after generation.
3. Location candidate decision screen centered on choosing one primary location.
4. Micro-location editor for mapping exact spots inside the chosen location.
5. Deliverable-to-shot matching from client needs, micro-spots, photographer style, and logistics.
6. Sun/weather optimization that directly changes timeline and shot-card recommendations.
7. Client guide polish with separate photographer-facing and client-facing outputs.

- [ ] Make a real planning brain: replace mostly deterministic plan assembly with an AI orchestration layer for `intake`, `location_discovery`, `location_selection`, `micro_location_mapping`, `shot_list_generation`, `sun_weather_optimization`, and `client_guide_generation`, always returning one predictable structured `SessionPlan`.
- [ ] Add a persistent planner chat that stays available through the whole flow, not only intake, and can update the structured plan from requests like “find more locations like the lake option,” “make this easier for toddlers,” “move golden-hour portraits later,” “add more editorial poses,” “build this around only one spot,” and “make the client guide sound warmer.”
- [ ] Improve location discovery with real search results, parking/restroom/accessibility guesses, visual fit, crowd/permit risk, weather backup quality, sun direction/usefulness, and clear “why this fits this client/style” explanations.
- [ ] Make the location decision screen center on the photographer choosing one primary location instead of dumping users into a broad multi-location plan.
- [ ] Build a true micro-location workspace after location selection where photographers map the inside of the chosen location.
- [ ] Extend micro-spots with name, exact pin, purpose, best light direction, best shot types, walking order, backup use, parking notes, restroom/reset notes, and client-facing arrival notes.
- [ ] Support exemplar micro-spots such as South lot arrival, Oak tree open shade, Trail walking sequence, Lake edge hero frame, and Covered pavilion rain backup.
- [ ] Match deliverables to micro-spots so every client need maps to the best spot, timing, pose/prompt, lens, angle, light note, backup spot, and priority.
- [ ] Make sun and weather first-class planning inputs that alter decisions instead of living as a passive telemetry panel.
- [ ] Add direct sun/weather decision examples: rain risk moves family formals to covered backup first, golden-hour portraits schedule at the right micro-spot/time, high UV avoids open fields too early, and wind avoids hair-sensitive closeups near exposed water.
- [ ] Split outputs clearly into a photographer plan with timeline, shot list, poses/prompts, angle/lens suggestions, micro-location map, sun/weather notes, priority checklist, and backup plan.
- [ ] Split outputs clearly into a client guide with arrival instructions, parking, what to wear/bring, session flow, weather expectations, reassurance, and photographer-branded tone.
- [ ] Make the planner UI feel like one conversation: left-side chat assistant, right-side live plan preview.
- [ ] Add live plan preview sections for brief, candidate locations, chosen location, micro-spots, shot list, sun/weather, and client guide.
- [ ] Add section-level actions for edit, regenerate, ask AI, and lock/approve.
- [ ] Save plans as drafts with version history, including autosaved chat history, structured plan drafts, before/after refinements, and restore previous version.
- [ ] Replace the single “Generate full plan” mental model with guided step actions: Find locations, Choose location, Map micro-spots, Generate shot list, Optimize for sun/weather, and Build client guide, while still keeping a one-click full-plan option.

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
- [x] Add controls to add, rename, reorder, and remove micro-spots before applying a plan.
- [x] Add AI-assisted micro-spot suggestions for the selected location based on session type, light, logistics, and client constraints.
- [x] Make the planner review UI sleeker: stronger visual hierarchy, fewer dense panels, clearer next actions, and a more polished “planning cockpit” flow.
- [x] Add a final “session route” confirmation step before creating the project or client guide.
- [x] Upgrade the landing page to explain candidate discovery, final route selection, micro-location mapping, and client guide handoff.

## Next: Launch Readiness

- [ ] Fix local verification/toolchain reliability by using a supported Node version and rerunning lint, tests, build, and Playwright.
- [x] Create a launch checklist covering auth, production env vars, Supabase policies, observability, demo data, billing, and QA routes.
- [x] Build a real upgrade/payment path with checkout, customer portal, plan status, and testable premium states.
- [x] Seed a polished founder-demo shoot that shows the first two minutes of the product at its best.
- [ ] Run a full mobile and desktop QA pass across planner, shared guide, settings, billing, dashboard, and public pages.
- [x] Tighten landing/onboarding copy around the photographer pain: fewer apps, faster planning, better-prepared clients.
- [x] Add a beta feedback loop for photographers to report confusing planner output, missing location details, and guide handoff friction.
