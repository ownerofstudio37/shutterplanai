# Phase 3 QA Checklist

## Planner Drafts

- [ ] Intake answers auto-save after edits.
- [ ] Draft badge/status updates correctly (`Saving`, `Saved`, `Unable to sync`).
- [ ] Resume banner appears on return visit.
- [ ] Resume restores intake values and stage.
- [ ] Draft is cleared after successful `Create Project + Shot List`.

## Editable Output

- [ ] `Edit output` toggles editable controls in shot list.
- [ ] Timeline blocks can be edited inline.
- [ ] Prep checklist and contingency items can be edited.
- [ ] Edits persist in-memory through tab switches.

## Intelligence

- [ ] Golden hour/sunrise/sunset chip row renders after plan generation.
- [ ] Logistics risk chips render per location.
- [ ] Route optimize button reorders location suggestions.

## Export + Share

- [ ] `Create share link` generates a URL.
- [ ] Copy action copies the link.
- [ ] Public route `/plans/[token]` renders snapshot content.
- [ ] Expired/invalid token returns error message.

## Analytics

- [ ] Generate success event is sent.
- [ ] Generate failure event is sent.
- [ ] Refine success/failure events are sent.
- [ ] Apply success/failure events are sent.
- [ ] Share link creation event is sent.

## Security / Migrations

- [ ] Run drafts, exports, analytics migrations in order.
- [ ] Run hardening migration and verify no-op on second run.
- [ ] Confirm RLS enabled on planner tables.
- [ ] Confirm exports table remains inaccessible via anon/authenticated client.
