# Current Sprint

Last refreshed: 2026-08-28, Asia/Manila.

## Current objective

Complete R5.1 live Supabase migration and domain acceptance for the committed
R5 task/study-plan foundation before beginning R6.

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

## Scope

- Obtain explicit linked-project authorization before any mutation.
- Apply the forward R5 migration without repairing or rewriting migration
  history.
- Runtime-validate tables, constraints, grants, RLS, import/apply RPCs,
  persistence, and all eight two-user denial attacks.
- Preserve the accepted planner/API contracts and record sanitized evidence.

## Explicit non-goals

- Migration-history repair or edits to applied migrations.
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

## Known blockers

- Supabase CLI and Docker are unavailable in the current local environment, so
  R5 migration runtime validation is blocked locally.
- Four linked Canvas migrations retain metadata-only aliases; do not repair or
  mutate linked history as part of R5.1.
- No R5 push or linked migration application has been performed.

## Completion criteria

The forward R5 migration is applied and runtime-validated in an approved
environment, including persistence and all eight cross-user denials, without
weakening owner isolation or planner determinism.

## Next action after completion

Begin R6 — Mobile task and schedule experience.
