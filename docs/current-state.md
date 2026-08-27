# Current State

Last refreshed: 2026-08-28, Asia/Manila.

## Repository

- Authoritative branch: `main` in `C:\Projects\stay-focused-v2`.
- R5 started from `31522d840fd415267b048408ba0317587d4cafab`; implementation
  commit `3b5f21f` adds the owner-scoped task and deterministic study-plan
  foundation.
- Local `main` is 38 commits ahead and 0 behind `origin/main` before the R5
  documentation commit. No push was performed.
- Recovery branches/tags remain preserved. Generated Next build drift was
  removed before the R5 implementation commit.

## Deployment and completed development phase

- The separate Vercel prototype at
  `https://stay-focused-v2-prototype.vercel.app` reports healthy V2 status.
- Canvas Phase 5F.1 and Phase 5F.2 are complete and hosted validated. Canvas
  content/grade synchronization is server-owned, durable, resumable, bounded,
  owner-scoped, and manually initiated.
- Phase 6 and Phase 7 have not started.

## Recovery and active implementation

- Capstone development R5 is implementation-complete: manual task CRUD,
  persisted Canvas-assignment import, deterministic preview/apply planning,
  study-session persistence/edit/delete, and two-user denial coverage are in
  place. R6 is the mobile task and schedule experience.
- Product Recovery R1-R5 is complete. R6 is partial: automated checks pass,
  while Dynamic Type, VoiceOver, interruption, navigation/reconciliation, and
  save-flow behavior still require physical iPhone observation.
- Durable document jobs now accept at most 100 total PDF pages and at most 40
  pages that require OCR. Native-text and confirmed blank pages do not consume
  the OCR allowance; synchronous and Canvas extraction remain capped at 40
  total pages.
- API and mobile errors are sanitized, native text is inspected before OCR,
  OCR fan-out remains bounded, and Vercel Workflow owns accepted processing.
- The EAS preview APK was built and installed on a physical Android device.
  Android authentication and hosted API connectivity passed. The specific
  durable 41-100-page native-text and >40-OCR-required-page matrix remains.

## Deterministic test baseline

- Shared: 30/30, including the deterministic planner; targeted R5 API/database
  acceptance: 11/11; reviewer engine: 290/290 deterministic evaluations.
- Shared, DB, and API typechecks pass. DB and API production builds pass.
- Full API regression is 558/559. The only failure is the known pre-existing
  Windows CRLF-sensitive Canvas SQL substring assertion; the SQL semantics and
  all R5 tests pass, so it is not an R5 product defect.

## Migration status

- The four linked Canvas version differences remain classified as metadata-only
  aliases based on the completed R5 preflight. No historical migration was
  edited and no migration repair was performed.
- Forward-only migration
  `20260827155438_task_study_plan_foundation.sql` is last in local order and
  creates `tasks`, `study_plans`, and `study_sessions` with owner-safe foreign
  keys, RLS policies, service-only RPCs, and supporting indexes.
- Static migration/RLS contract validation passes. Supabase CLI and Docker are
  unavailable locally, so local runtime validation is blocked. No linked
  Supabase mutation or `db push` was performed.

## Known blockers and immediate task

- Apply and runtime-validate the forward R5 migration in an approved Supabase
  environment before depending on the endpoints outside deterministic tests.
- Begin R6 mobile task/schedule work only against the accepted R5 contracts.
- Physical-device acceptance debt remains for Product R6 and the durable
  long-document Android matrix. APK installation, authentication, and hosted
  API connectivity are no longer blockers.
- `npm audit` reports 0 critical, 6 high, and 32 moderate findings; the direct
  production high is `next`, and remediation is a separate recovery task.
- Provenance of tracked historical academic live-output artifacts is not
  established; preserve them and complete a privacy review before removal.

## Authoritative documentation

Use this file for the snapshot, `docs/roadmap.md` for verified phase status,
`docs/ai/current_sprint.md` for the one active objective, and the relevant ADR
for invariants. `docs/ai/handoff.md` is historical evidence only.
