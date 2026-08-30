# Current State

Last refreshed: 2026-08-30, Asia/Manila.

## Repository

- Authoritative branch: `main` in `C:\Projects\stay-focused-v2`.
- R5 started from `31522d840fd415267b048408ba0317587d4cafab`; implementation
  commit `3b5f21f` adds the owner-scoped task and deterministic study-plan
  foundation.
- Local `main` contains the R5 implementation, Gap A/Gap B, and acceptance
  documentation commits and remains unpushed. Gap B hosted acceptance began at
  `792205d` with a clean tree, 45 commits ahead and 0 behind `origin/main`.
- R8 started from clean `dbf5e039f345f95986d810bb353c83b5b85487ca`,
  55 commits ahead and 0 behind `origin/main`. Implementation commit
  `69ea697ee916adb0e928171b4d0afdc792b92da0` exposes the existing Canvas
  structured-block/selective-preview contract in the Android reviewer flow.
- Consolidated Reviewer Android acceptance started at `e23ef61` on `main`, 62
  commits ahead and 0 behind `origin/main`, with three preserved in-scope UI
  edits already present in the working tree.
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

- Reviewer Benchmark B4 is complete locally. Stage 4 now scores unique
  source-derived semantic targets, while Stage 5a independently rejects wrong
  definition, parent-child, step-order, example, cross-concept, and sibling
  relationships. Relationship failures remain section-bounded and now produce
  field/type-specific retry guidance. The exact Intro to IT Security PDF
  retains B3's 17 titles and all 17 sourceCore payloads, passing 110/110 semantic
  targets, 1.00 coverage, 1.00 grounding, zero relationship issues, leakage,
  17 calls, 0 retries, and 0 fallbacks. The Google credential exposed during B3
  still requires authorized operational rotation; B4 did not inspect or reuse
  it. See `docs/ai/benchmarks/intro-it-security/benchmark-b4.md`.
- Reviewer Benchmark B3 is complete locally. Stage 2 now carries an optional
  source-derived semantic plan and distinguishes conceptual enumerations from
  procedures; Stage 3 preserves definitions, supported category groups,
  ordered steps, and explicit examples while allowing useful direct-source
  explanations and avoiding filler. The real 32-page Intro to IT Security run
  retains B2's 17-section outline and passes with 17 calls, 0 retries, 0
  fallbacks, 1.00 coverage, 1.00 grounding, and leakage passing. Page 10 visual
  labels and page 14 hierarchy edges remain explicit extraction gaps; see
  `docs/ai/benchmarks/intro-it-security/benchmark-b3.md`.
- Reviewer Benchmark B2 is complete locally. Production PDF extraction now
  preserves normalized page blocks through mobile job submission and durable
  worker storage into generic engine source blocks. Page-aware Stage 0/1
  classifies title/divider/reference noise, recognizes page-leading academic
  headings, merges repeated continuation slides, and keeps distinct concepts
  separate without changing Stage 3. The real 32-page Intro to IT Security run
  now produces the approved 17-concept outline instead of the B1 giant Domains
  span and noise sections; see
  `docs/ai/benchmarks/intro-it-security/benchmark-b2.md`.
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
- The R8 Canvas mobile gap is closed and physically accepted. A synchronized
  source now resolves to server-owned structured blocks, honors the server
  default selection, supports ordered subset selection and a zero-selection
  guard, creates an authoritative selective preview, and hands its preview
  session/fingerprint into the unchanged durable generation path. Changing the
  selection invalidates the old preview and requires a new one.
- The physical R8 run selected three of nine returned blocks. The resulting
  durable job completed 1/1, recovered through Processing after force-stop,
  saved as `Capstone Selective Canvas Reviewer`, and reopened from Study
  Library without regeneration. Its immutable snapshot records exactly three
  ordered paragraph blocks (source block ordinals 5, 6, and 7), the
  selective-preview parser/normalization versions, hashes, no OCR, and
  `wasEdited = false`.
- Consolidated Reviewer UI acceptance is complete on realme RMX3151 / Android
  13. Pasted text, gallery, camera, PDF, Canvas selection/preview, a real durable
  generation, Processing, Reader, save, immediate Library refresh, reopen,
  rename, native delete Cancel/Confirm, and both Back paths passed. The run fixed
  blank-source/footer readiness and saved-Reader Android Back behavior without
  changing reviewer architecture or persistence semantics.
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
- R8 EAS internal preview build `ab67feeb-0f61-4d6c-b24c-a7c5658ac050`
  (Stay Focused V2 2.0.0, build 1, commit `69ea697`) was installed with
  `adb install -r` on the realme RMX3151 / Android 13. Authentication and the
  existing session survived replacement. No API code changed, so the verified
  production deployment remained in use.
- Reviewer acceptance EAS build `b625303b-943e-45a1-89da-e50c33fbba1b`
  (Stay Focused V2 2.0.0, build 1) was installed with `adb install -r` on the
  same device. Authentication and the two pre-existing saved reviewers survived
  replacement; the hosted preview API remained reachable.

## Deterministic test baseline

- Shared: 32/32, including the PostgreSQL microsecond timestamp regression;
  targeted Gap A/Gap B API/database/session coverage: 27/27; mobile: 216/216;
  reviewer engine: 343/343 deterministic evaluations after B4 semantic
  coverage, relationship, fault-injection, and retry-diagnostic regressions.
  These suites were rerun after hosted acceptance.
- Forced root typecheck and lint pass fresh for 7/7 packages with zero cached
  tasks; lint retains only the four known mobile import-order warnings. DB and
  API production builds pass.
- Full API regression is 576/577 after two new reviewer-save boundary tests.
  The only failure matches the documented
  pre-existing Windows CRLF-sensitive Canvas SQL substring baseline; the SQL
  semantics and all planning tests pass, so it is not a Gap B product defect.
- R8 verification passed: mobile 278/278, Canvas 72/72, targeted Canvas
  structure/selective-preview/generation/freshness/provenance API tests 43/43,
  fresh forced root typecheck 7/7, fresh forced root lint 7/7, `git diff
  --check`, and `git fsck --full`. The four previously accepted mobile
  import-order warnings did not appear in the R8 lint run and no new warning
  was introduced.
- Consolidated Reviewer acceptance verification passes mobile 373/373, focused
  Reviewer/Library 108/108, mobile and root typecheck/lint, `git diff --check`,
  and `git fsck --full`. Lint retains only the same four accepted mobile
  `import/first` warnings.

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

- Recommended next task: run the same reviewer benchmark on the Firewalls PDF
  to test whether the B3 generation structure and B4 semantic verifier
  generalize beyond Intro to IT Security.
- The Google service-account credential exposed during B3 requires authorized
  operational rotation. Do not inspect, print, copy, or commit the existing
  value while remediation is pending.
- Reviewer-core limitations are documented in
  `docs/ai/reviewer-core-capstone-acceptance-20260828.md`; notably, fresh camera
  and long-document device acceptance was not repeated, and a cold-start
  non-Canvas result conservatively loses its gallery/camera/PDF mode label when
  saved from Processing. Content and reopen behavior remain intact.
- Supabase warn-level advisors report only legacy non-Gap-B findings: four
  `reviewers` RLS init-plan performance warnings plus older function/Auth
  security warnings. No warning names the Gap B status/index/apply objects.
  Address unrelated findings only through separately scoped work.
- Physical-device acceptance debt remains for Product R6, readable camera OCR,
  the durable long-document Android matrix, and notification registration,
  delivery, and routing. Persisted Processing/relaunch recovery is accepted and
  does not depend on notifications.
- `npm audit` reports 0 critical, 6 high, and 32 moderate findings; the direct
  production high is `next`, and remediation is a separate recovery task.
- Provenance of tracked historical academic live-output artifacts is not
  established; preserve them and complete a privacy review before removal.

## Authoritative documentation

Use this file for the snapshot, `docs/roadmap.md` for verified phase status,
`docs/ai/current_sprint.md` for the one active objective, and the relevant ADR
for invariants. `docs/ai/handoff.md` is historical evidence only.
