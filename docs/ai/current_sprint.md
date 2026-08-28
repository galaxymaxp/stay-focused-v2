# Current Sprint

Last refreshed: 2026-08-28, Asia/Manila.

## Completed objective

Close R6 backend Gap B locally so repeated plan application replaces active
sessions instead of accumulating duplicate overlapping schedules.

## Why it matters

The mobile plan flow needs one deterministic apply contract: active sessions in
the requested range are replaceable, terminal history survives, and repeated
or concurrent applies cannot append duplicate active blocks.

## Current branch

`main`

## Baseline commit

Gap B started from clean `26ae471cdc8bc560f4420ced5f23c3f8672af833`
after the Expo Router migration, with local `main` 44 commits ahead of origin.

## Completed scope

- Added a forward-only session-lifecycle migration without editing the applied
  R5 foundation migration.
- Replaced the apply RPC with one owner-scoped advisory-lock transaction that
  removes only intersecting `planned` rows, preserves `completed`/`skipped`,
  rejects proposal overlap, and inserts the replacement plan and sessions.
- Exposed session lifecycle in typed API reads and owner-scoped PATCH updates.
- Added database-contract and stateful repeated-replan acceptance coverage.

## Explicit non-goals

- Applying the new migration to linked Supabase without a separate runtime
  acceptance task.
- New Canvas network collection behavior.
- AI-based planning or reviewer-engine changes.
- OCR/PDF, durable processing, notifications, offline study, or EAS redesign.
- Task, Work, Today, or plan-flow UI implementation.

## Required verification

- Shared 32/32; targeted Gap B planning/database/session tests 27/27; mobile
  216/216; reviewer 290/290.
- Shared, DB, API, and mobile typechecks; root lint with only four pre-existing
  mobile warnings; DB/API builds; `git diff --check`.
- Full API 574/575 with only the accepted pre-existing Windows CRLF assertion.

## Result and residual risks

- LOCAL PASS: typed, static, stateful, regression, lint, and build gates pass.
- Runtime migration verification is pending. The isolated local Supabase stack
  could not start because Docker Desktop's Linux engine was unavailable; the
  linked project was intentionally not mutated.
- The partial index supports the range replacement predicate for active rows;
  retain the existing advisor discipline and evaluate it after live rollout.

## Completion criteria

Met locally. Gap B is implemented without weakening owner isolation or planner
determinism. Linked Supabase execution remains a deployment acceptance gate.

## Next action after completion

Apply and runtime-validate
`20260828173643_replace_planned_study_sessions_on_replan.sql` against linked
Supabase, then continue R6 mobile Tasks and Study Schedule integration.
