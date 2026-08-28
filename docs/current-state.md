# Current State

Last refreshed: 2026-08-28, Asia/Manila.

## Repository

- Authoritative branch: `main` in `C:\Projects\stay-focused-v2`.
- R5 started from `31522d840fd415267b048408ba0317587d4cafab`; implementation
  commit `3b5f21f` adds the owner-scoped task and deterministic study-plan
  foundation.
- Local `main` contains the R5 implementation, Gap A/Gap B, and acceptance
  documentation commits and remains unpushed. Gap B hosted acceptance began at
  `792205d` with a clean tree, 45 commits ahead and 0 behind `origin/main`.
- Recovery branches/tags remain preserved. Generated Next build drift was
  removed before the R5 implementation commit.

## Deployment and completed development phase

- The separate Vercel prototype at
  `https://stay-focused-v2-prototype.vercel.app` reports healthy V2 status.
- Canvas Phase 5F.1 and Phase 5F.2 are complete and hosted validated. Canvas
  content/grade synchronization is server-owned, durable, resumable, bounded,
  owner-scoped, and manually initiated.
- Phase 6 is in progress locally; Phase 7 has not started.

## Recovery and active implementation

- The R6 reviewer-core capstone audit is accepted. The complete supported path
  is source intake or synchronized Canvas selection, editable preparation,
  grounded Stage 0-6 generation, durable progress, reviewer reading, save, and
  Study Library reopen. A fresh linked-project Canvas run passed selection,
  OpenAI generation, immutable provenance, persistence, source health, owner
  isolation, and zero-residue cleanup.
- Two reviewer defects were hardened: saved PDF metadata now matches the
  durable 100-total-page policy instead of rejecting page counts above five,
  and reviewer results opened from completion routing can be titled and saved
  from Processing, including their Canvas snapshot.
- Capstone development R5 is complete and live accepted: manual task CRUD,
  persisted Canvas-assignment import, deterministic preview/apply planning,
  study-session persistence/edit/delete, and two-user denial coverage are in
  place and passed against linked Supabase. Final verdict: PASS.
- The R6 replanning prerequisite (Gap B) is implemented and hosted accepted.
  Study sessions have `planned`, `completed`, and `skipped` lifecycle state;
  applying a range serializes per owner and atomically replaces only
  intersecting planned rows, preserves terminal history, and rejects
  overlapping new proposals.
- Live acceptance exposed one R5 runtime defect: PostgreSQL returned persisted
  timestamps with microsecond precision while the shared ISO validator allowed
  at most milliseconds. The parser now accepts valid fractional precision and
  a regression test covers the live format.
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

- Shared: 32/32, including the PostgreSQL microsecond timestamp regression;
  targeted Gap A/Gap B API/database/session coverage: 27/27; mobile: 216/216;
  reviewer engine: 290/290 deterministic evaluations. These suites were rerun
  after hosted acceptance.
- Forced root typecheck and lint pass fresh for 7/7 packages with zero cached
  tasks; lint retains only the four known mobile import-order warnings. DB and
  API production builds pass.
- Full API regression is 576/577 after two new reviewer-save boundary tests.
  The only failure matches the documented
  pre-existing Windows CRLF-sensitive Canvas SQL substring baseline; the SQL
  semantics and all planning tests pass, so it is not a Gap B product defect.

## Migration status

- The four proven Canvas metadata aliases were reconciled through supported
  `supabase migration repair` metadata operations only:
  `20260728022127` to `20260728094421`, `20260728024021` to
  `20260728104000`, `20260728131529` to `20260728201000`, and
  `20260728133821` to `20260728213700`. No historical SQL was edited or
  replayed and no Canvas schema object was changed by the repair.
- Forward-only migration
  `20260827155438_task_study_plan_foundation.sql` is the applied R5 foundation.
  It creates `tasks`, `study_plans`, and `study_sessions` with owner-safe
  foreign keys, RLS policies, service-only RPCs, and supporting indexes.
- Forward-only migration
  `20260828173643_replace_planned_study_sessions_on_replan.sql` is applied to
  linked Supabase. A CLI 2.116.0 dry-run proposed only this migration; final
  local/remote history matches through `20260828173643`.
- Hosted catalog inspection confirmed the non-null `planned` status default and
  lifecycle check, partial planned-session index, owner-serialized replacement
  function, safe search path, `SECURITY INVOKER`, service-role-only execution,
  enabled RLS, and unchanged owner policies.
- Dedicated two-user runtime acceptance passed first apply, same-window
  reapply, no duplicate active schedule, completed/skipped preservation,
  owner-scoped status PATCH persistence, overlap rejection with no partial
  writes, cross-owner API/RLS denial, two concurrent RPC applies, and the Gap A
  embedded-task/full-PATCH response contract. Temporary users and rows were
  removed; `tasks`, `study_plans`, and `study_sessions` counts returned from
  0/0/0 to 0/0/0.
- Supabase CLI 2.116.0 dry-run proposed only the R5 migration. The linked push
  applied only `20260827155438`, and final linked history records it as
  `task_study_plan_foundation`.
- Live schema checks passed for constraints, indexes, owner RLS, grants,
  triggers, and service-only security-invoker import/apply RPCs. Live CRUD,
  Canvas import/idempotency/edit preservation, deterministic preview, atomic
  apply, study-session behavior, and all eight API plus RLS/database isolation
  attacks passed. Dedicated test users and rows were removed; R5 table counts
  returned from 0 to 0.

## Known risks and immediate task

- Recommended next task: run one deployed-build physical-device rehearsal of
  the primary Canvas reviewer demo, including durable worker completion,
  notification routing, save, and Study Library reopen.
- Reviewer-core limitations are documented in
  `docs/ai/reviewer-core-capstone-acceptance-20260828.md`; notably, fresh camera
  and long-document device acceptance was not repeated, and a cold-start
  non-Canvas result conservatively loses its gallery/camera/PDF mode label when
  saved from Processing. Content and reopen behavior remain intact.
- Supabase warn-level advisors report only legacy non-Gap-B findings: four
  `reviewers` RLS init-plan performance warnings plus older function/Auth
  security warnings. No warning names the Gap B status/index/apply objects.
  Address unrelated findings only through separately scoped work.
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
