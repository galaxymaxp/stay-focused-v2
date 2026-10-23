# PBR-MB1: current-source local performance baseline

2026-10-23. Finite scope: MB1 only, code/tests/evidence/docs/local commits.
Initial HEAD `447c0e51a55c7cf0c93aaddef754d933bf849656`, branch
`overnight/2026-10-15_feedback`; tracked/index clean. Untracked `UI/`,
`apps/mobile/.gitignore`, `supabase/.temp/` and ignored evidence preserved.
Local upstream snapshot 19 ahead / 23 behind github/main; no fetch.

## Frozen acceptance matrix (before implementation)

| Row | Requirement / owner | Proof required | Initial disposition |
| --- | --- | --- | --- |
| 0 | Source/policies/prerequisites | AGENTS/AUTOPILOT, planning, PBR0/AF1/recovery, runner BACKLOG, source/scripts inspected | PASS; PBR0/AF1 PASS, recovery explicitly authorizes MB1 |
| 1a | Startup/cache and navigation | Repeatable public synthetic JS-host cold setup versus warm cached reads; actual entry route and notification dispatch; explicit intervals, run count, clock, output equality | Pending |
| 1b | Current Library | 0/100/240/300 items, identical changed/unchanged notification schedules, complete result hashes, reads/stats/concurrency/timing | Pending; retain AF1 coalescing |
| 1c | API Library | Actual trusted repository, 0/100/240/300 visible and 0/1000 hidden rows, complete pagination, trusted owner, partial-failure denial, hashes/counts/timing | Pending; adapter work is not SQL latency |
| 2a | Optional typed instrumentation | Fixed name/outcome/numeric schema, injected monotonic clock/sink, no default sink/clock/events, bounded state, sink/clock failures inert | Pending |
| 2b | Integration safety | Deterministic intervals, thrown/rejected/cancelled paths, owner switch/unmount, complete results and operation counts disabled/enabled, no network | Pending |
| 3 | Identical before/after measurements | Preserve original scripts/logs; rerun exact fixtures after instrumentation, disclose overhead without optimization claim | Pending |
| G | Fresh verification | Focused integration + full shared/mobile/API suites; forced root typecheck/lint; explicit API/Android export; forced serial root build with loose env; diff/index checks | Pending |
| C | Closure | Report actual counts/hashes/attempts; reconcile three planning files; append handoff; atomic owner-authored commits and ignored progress/status | Pending |

## Boundary and evidence contract

All measurements are LOCAL PUBLIC SYNTHETIC / TEST-HOST. Node monotonic
`performance.now()` measures explicitly delimited awaited work; deterministic
unit tests inject a numeric clock. Cold means a fresh in-memory Node SQLite
database/module setup, never a cold OS/native process or cleared hardware cache.
Warm means the same initialized store/cache. JS renderer mount/update timings
include React act/effects and controlled adapters, exclude native frames/layout,
GPU, networking, auth restoration I/O and physical startup. No suite wall time
is an application latency metric. Report individual samples and medians, with
warmup/run counts and fixture identity in ignored evidence.

Source manifest 2.2.0/code6/runtime2.2.0-sdk57; historical installed archive
2.3.0/code7/binary configured2.3.0-sdk57/preview. Active OTA UNKNOWN. Source,
test host, JS/assets export and device are different identities. Live deployment,
database/applied migrations, Scheduler, physical timings and device identity:
**UNVERIFIED (owner to confirm)**. These expected omissions do not block MB1.

Inspected boundaries: root layout and IndexRoute; Expo Router owns navigation
through tab/hierarchy stacks, AppLifecycle owns notification pushes; local setup,
screenSnapshots, useLocalLibrary/readLibraryOverview, librarySync catch-up;
API ExperienceService.getLibrary and trusted repository.libraryPage. Keep
foreground/outbox/admission semantics and all owner/cancel fences. No duplicate
AF1 repair, SQL/schema/index/cache-contract change or speculative native fix.

Evidence scripts, fixture manifests, command ledger, logs and SHA256 index live
under ignored `tmp/overnight/PBR-MB1/`. Progress is appended after each STEP.
Original AF1 evidence remains unchanged. Run local serial commands using the
inspected RT2 runner pattern, loopback-only PBR0 guard, local TEMP/TMP/TMPDIR,
npm offline, Expo offline/no-dotenv, disabled telemetry, local Turbo cache and
loose environment propagation. No service/device/release command is authorized.

## Owner steps remaining

Rollout and Device checks: **NOT RUN**, skipped entirely. RT1/EV1 STOPPED,
RT2 physical preflight STOPPED / resume-text INCONCLUSIVE, isolation/active OTA
unresolved; no beta/release gate passes. Physical future method: separately
authorized pinned build/OTA and safe public isolated state, 20 cold/20 warm
launches and navigation samples with native frame tracing; independent resume
observation under the preserved RT2 runbook. No phone operation in MB1.
After actual MB1 PASS, supervisor reviews LP1 using this baseline and completed
AF1 work; AS1 follows LP1, LR1 follows AS1. No successor implemented here.

Vercel CLI is unavailable. Strongly recommend `npm i -g vercel` for separately
authorized future env/deploy/log tooling; installation and Vercel commands are
NOT RUN in this task.
