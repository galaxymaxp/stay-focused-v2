# PBR-LP1: attributable local Library profiling

2026-10-23. Finite scope: LP1 only, local public synthetic profiling,
evidence-supported code changes if justified, tests, gates, docs and local commits.
Resumed at `d8d22603ae5bdeaf3d805f88d137d6a2da5ce283` on
`overnight/2026-10-15_feedback`. No LP1 progress record or tracked changes existed.
Untracked `UI/`, `apps/mobile/.gitignore`, `supabase/.temp/` are unrelated and
preserved. Upstream snapshot: 24 ahead / 23 behind github/main; no fetch.

## Frozen acceptance before runtime changes

| Row | Requirement | Required proof / disposition |
| --- | --- | --- |
| 0 | Source and authority | Actual MB1/PBR0/AF1 PASS; MB1 HEAD d8d22603, AF1 ef80dfc6 ancestor; AGENTS/AUTOPILOT/current plans/reports and absolute runner BACKLOG inspected. LP1 publication 2026-10-23 13:57 authorizes this lane. PASS. |
| 1a | Owner-bound repeated local reads | Actual Node SQLite store, 0/100/240/300 saved items, mixed bodies/progress/pending drafts, large foreign-owner/overlay history; isolated list/stats/overview intervals; full ordered items/stats equality, SQL operation counts, samples and hashes. Pending. |
| 1b | Hook notifications | Exact AF1/MB1 changed/unchanged schedules, 0/100/240/300; 2 summary / 2 aggregate stats reads / max 1 read; saved-first state and full equality. Held-gate elapsed time is harness evidence only. Pending. |
| 1c | API paging/history | Trusted repository adapter, 0/100/240/300 visible and 0/1000 superseded rows, complete DTOs/cursors/hidden IDs, trusted owner and safe partial failure; adapter cost is not SQL latency. Pending. |
| 1d | Lifecycle and failure safety | Existing integration tests for slow reads, owner switch, blur/unmount, cancel/retry/reconnect, partial page/body failure, offline work, pending drafts, snapshots and exact deletion evidence. Pending. |
| 2 | Narrow fix or no-change verdict | Change only with reproduced inefficiency and bounded attributable correction plus nontrivial regression/full result equality. Otherwise retain zero runtime changes and explain why no local optimization is justified. Pending. |
| 3 | Repeat and compare | Same fixtures and source, sample size/warmup, monotonic boundaries, setup excluded, original MB1/AF1 probes preserved; raw samples/source/tool hashes. No percent saving without controlled changed code. Pending. |
| G | Mandatory fresh gates | Focused plus full shared/mobile/API tests, forced root typecheck/lint, explicit API build, forced serial root build with loose env, diff/index checks; Android offline export if mobile/shared changed. Web tests/build if web changed. Pending. |
| C | Closure | Reconcile three current plans, append handoff, scoped conventional owner-authored commits, ignored progress/status; no successor work. Pending. |

## Measurement and safety contract

All fixtures are public synthetic, not private academic or owner data. Node
`performance.now()` measures the awaited operation only, with construction,
expected-result comparison, hashing and serialization outside isolated store/API
intervals. Report individual samples and descriptive medians; declare warmups
and repeated process/cache state. React test host timings include renderer/effect
work and explicit yields, not physical frames or production startup. MB1's held
gate waits are never counted as UI latency. Independent repeated cohorts with
unchanged source are reproducibility checks, not a before/after optimization.

Preserve owner predicates, full paging/hidden supersession, source completeness,
manual labels, safe API failure, pending drafts/progress, image readiness,
background admission, first saved display, retries/cancellation and notification
coalescing. No cross-request cache, schema/index change, skipped history or
speculative native repair. No feature removal. Source 2.2.0/code6 is distinct from
archived native 2.3.0/code7; this task establishes no active OTA identity.

New scripts, fixtures, samples, comparison/source/tool hashes, first attempts and
logs live in ignored `tmp/overnight/PBR-LP1/`. AF1/MB1 inputs remain read-only.
Use the inspected MB1 runner's loopback-only Node guard, repo-local TEMP/TMP/
TMPDIR, npm/Expo offline, EXPO_NO_DOTENV=1, telemetry off, local Turbo cache,
loose env propagation. No environment file is opened or edited by task helpers.
No install, provider traffic, remote SQL, deployment, Scheduler or device work.

Production SQL plans/cardinality/latency, deployed revisions/database/Scheduler,
authenticated browser and physical timings: **NOT RUN / UNVERIFIED (owner to
confirm)**. Missing live evidence is expected, not a local task blocker.

## Owner steps remaining

Rollout and Device checks are skipped entirely: **NOT RUN**. No push, deployment,
migration, email, native build/install, OTA/EAS or settings/account action.
RT1/EV1 remain STOPPED; RT2 physical preflight STOPPED, resume text INCONCLUSIVE
and deferred; active OTA and safe isolation UNVERIFIED. Beta/release gates stay
blocked. OX2 remains blocked by OX1. AS1 becomes eligible only after actual LP1
PASS and fresh supervisor review; LR1 follows AS1 PASS/review.
