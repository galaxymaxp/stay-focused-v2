# Current Sprint

Last refreshed: 2026-08-28, Asia/Manila.

## Completed objective

R5.1 live Supabase migration and domain acceptance for the committed R5
task/study-plan foundation is complete. R6 has not started.

## Why it matters

Local, static, and stateful-double validation cannot prove that the forward R5
migration and owner-isolation contracts execute correctly in the linked
Supabase environment. R5.1 closes that acceptance gap.

## Current branch

`main`

## Baseline commit

`31522d840fd415267b048408ba0317587d4cafab` was the R5 starting point.
Implementation commit `3b5f21f` contains the R5 domain, API, planner, tests,
and forward migration.

## Completed scope

- Used the explicit authorization to reverify and reconcile only the four
  proven Canvas metadata aliases without replaying or editing historical SQL.
- Applied only the forward R5 migration after a single-migration dry-run gate.
- Runtime-validate tables, constraints, grants, RLS, import/apply RPCs,
  persistence, and all eight two-user denial attacks.
- Fixed the live PostgreSQL microsecond timestamp compatibility defect and
  added a focused regression.
- Preserved the accepted planner/API contracts and recorded sanitized evidence.

## Explicit non-goals

- Any migration-history cleanup beyond the four explicitly authorized aliases,
  or edits/replays of applied migration SQL.
- New Canvas network collection behavior.
- AI-based planning or reviewer-engine changes.
- OCR/PDF, durable processing, notifications, offline study, or EAS redesign.
- R6 mobile task/schedule implementation.

## Required verification

- Preserve shared planner, R5 API/database/acceptance, and two-user isolation
  suites.
- Preserve the 290/290 deterministic reviewer regression.
- Confirm the linked migration executes and the new domain behaves correctly
  against real Supabase RLS/RPC semantics.

## Result and residual risks

- PASS: linked history is aligned, `20260827155438` is applied, and every
  mandatory live gate passed.
- Test cleanup deleted both dedicated identities and restored R5 table counts
  from 0 to 0.
- Security advisors reported no R5 finding. Informational performance notices
  remain for composite study-session foreign-key coverage and new unused
  indexes; do not add an index without measured need and a forward migration.
- Full API remains 558/559 only because of the known Windows CRLF-sensitive
  Canvas assertion; targeted R5 is 11/11 and shared is 31/31.

## Completion criteria

Met. The forward R5 migration is applied and runtime-validated in the linked
environment, including persistence and all eight cross-user denials, without
weakening owner isolation or planner determinism.

## Next action after completion

Begin R6 — mobile Tasks and Study Schedule integration.
