# Current Sprint

Last refreshed: 2026-08-28, Asia/Manila.

## Current objective

Close the capstone R5 task/study-plan foundation and prepare R6 mobile task and
schedule implementation against the accepted backend contracts.

## Why it matters

The schedule-first product promise now has a secure persistent backend and a
deterministic planner. The next slice can focus on the student-facing mobile
experience without reopening Canvas sync or reviewer-engine architecture.

## Current branch

`main`

## Baseline commit

`31522d840fd415267b048408ba0317587d4cafab` was the R5 starting point.
Implementation commit `3b5f21f` contains the R5 domain, API, planner, tests,
and forward migration.

## Scope

- Preserve the R5 planner and API contracts while preparing R6.
- Apply and runtime-validate the forward R5 migration only with explicit linked
  project authorization.
- Build the R6 mobile task list, Canvas import selection, plan preview/apply,
  and study-session agenda on the authenticated R5 APIs.
- Preserve owner isolation, deterministic output, and explicit unscheduled work.

## Explicit non-goals

- Migration-history repair or edits to applied migrations.
- New Canvas network collection behavior.
- AI-based planning or reviewer-engine changes.
- OCR/PDF, durable processing, notifications, offline study, or EAS redesign.

## Required verification

- Preserve shared planner, R5 API/database/acceptance, and two-user isolation
  suites.
- Preserve the 290/290 deterministic reviewer regression.
- Run mobile tests/typecheck/build for the R6 UI and API integration.
- Runtime-validate the forward R5 migration separately from static SQL checks.

## Known blockers

- Supabase CLI and Docker are unavailable in the current local environment, so
  R5 migration runtime validation is blocked locally.
- Four linked Canvas migrations retain metadata-only aliases; do not repair or
  mutate linked history as part of R6.
- No R5 push or linked migration application has been performed.

## Completion criteria

The forward R5 migration is applied and runtime-validated in an approved
environment, and the R6 mobile experience consumes the existing R5 APIs without
weakening owner isolation or planner determinism.

## Next action after completion

Implement R6 - Mobile task and schedule experience.
