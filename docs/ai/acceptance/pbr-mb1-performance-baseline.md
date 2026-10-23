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
## STEP 1 baseline checkpoint

FRESH corrected synthetic probe: 12 passed / 3 files, 0 failures/skips.
Repository adapter: 40 measured walks plus 8 warmups; exact results and safe
hidden-history failure checked on each walk. Library: 5 runs per size/schedule,
one full 8-case warmup; setup/navigation: 10 runs each, one warmup. Timings use
Node performance.now; individual rows and hashes persisted in measurements.json.
Library interval starts before the first invalidation and ends after gate release
and React flush (includes explicit harness yield/late-write work); API interval
covers only the complete awaited page walk, excluding fixture construction/hash.
Setup interval covers actual lazy module database open/WAL/schema/store creation;
warm setup resolves the same cached store. Cache miss/hit intervals await the
actual screen snapshot wrapper. Entry intervals cover actual IndexRoute renderer
mount while restoring and update to Redirect; notification interval covers valid
tap callback through actual AppLifecycle effect and one stub router.push.

Before instrumentation medians (ms): cold setup1.887, warm setup0.064;
cold cache miss0.041, warm cache hit0.061; restoring mount0.409,
entry decision update0.194, notification dispatch0.245. Not physical startup.
Library unchanged/changed medians: 0:14.696/15.086, 100:17.798/14.930,
240:15.269/15.746, 300:15.726/14.993. Every case2 summary/2 stats/max1.
API 0/100/240/300 medians without history0.044/0.156/0.787/0.634;
with1000 history1.870/2.379/7.454/7.620. Reads2/2/6/6 versus7/7/21/21,
identical full visible result hashes across history cohorts. The complete
hidden ID set is asserted per page. No optimization or device inference.

First probe attempt: 2 passed / 1 navigation import suite failed before execution
because helper replacement mangled a relative import; corrected helper path and
reran unchanged fixtures/assertions. Initial log retained. Exploratory reads of
three nonexistent guessed test filenames failed; actual paths discovered.

## STEP 2 instrumentation checkpoint

Small shared `localMeasurements` utility: no default observer, clock, buffer,
timer, console or transport. Explicit local observer installation injects a
monotonic clock and optional sink; removal/replacement invalidates unfinished
spans. Six fixed names cover entry decision, cold database setup, snapshot read,
owner-bound hook overview read, notification router dispatch and API repository
page. Outcomes are success/empty/error/cancelled, duration is finite nonnegative
milliseconds, optional count is a nonnegative safe integer on success only.
No arbitrary metadata argument exists. Runtime allowlists reject forged names
and outcomes; event objects are frozen. Clock/sink throws and sink rejections
are contained. Disabled spans invoke no clock/sink and retain no events.

Only the measurement hook uses completion state to classify stale owner/unmount
reads as cancelled without item counts; existing live/abort/epoch fences continue
to own publication. Snapshot events carry no owner/key/count. API spans cover
the existing full page including hidden history, retain all query predicates and
safe failures, and do not invent an API cancellation contract. Entry spans time
the synchronous route decision, not auth I/O or committed pixels; Strict Mode
can repeat render attempts. Notification spans cover the synchronous push call,
not transition completion. No listener, polling, admission, write or cache change.

Fresh initial focused tests: shared5/1file, mobile85/6files, API3/1file, no
failures/skips. Existing owner-switch/read-error tests now assert cancelled/error
events and privacy; new unmount, failed sink, setup retry, snapshot rejection,
entry decisions and exact trusted-owner history tests check real boundaries.
Reviewed the React skill checklist: no hook dependency, state/reset, navigation,
accessibility or rendering structure change; no new async waterfall.

First forced typecheck: FAIL, 6 successful / 8 tasks, 0 cached; three TS2345
errors in the new entry test's host-string findByType arguments. Changed only
those assertions to use typed imported mocked components; no any/cast/validation
weakening. Corrected forced typecheck: FRESH PASS8/8, 0 cached. Logs retained.
Mandatory full suites/builds remain pending at this checkpoint.

First enabled standalone API probe was invalid as instrumentation evidence:
zero events despite enabled mode, because tsx dynamic-imported a separate
CJS/ESM module instance. Original log and script retained. Static import through
the same shared entry as the repository fixes the harness; assertion now requires
exactly one event per page. Corrected disabled/enabled reruns PASS; the invalid
cohort must not enter the final comparison. No product fix was needed.

Inspected Supabase skill security guidance; its service/docs/query workflow is
inapplicable to this expressly offline task. No SDK API/schema/auth/grant change,
remote query or service request. Local adapter assertions verify the boundary.
