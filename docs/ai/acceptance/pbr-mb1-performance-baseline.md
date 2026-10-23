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
and React flush (includes explicit harness yield/late-write work). The original
API interval includes the awaited page walk and visible/column equality
assertions, excluding fixture construction/hash. The final full-DTO comparison
captures its stop clock before equality assertions.
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
to own publication. Snapshot events measure the shared local-Library cache store
(any key), carry no owner/key/count, and use only the fixed cache-boundary name;
the benchmark exercises the Library key. API spans cover
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

First full mobile suite: **1,654 passed / 3 failed / 174 files**. The three
new event assertions assumed AppLifecycle emitted only navigation spans, but
its existing pending-draft startup also attempted local database setup. Those
fixed numeric setup/error events are valid. Assertions now select the named
navigation boundary; all pre-existing route, readiness, owner-switch and exact
dispatch assertions remain intact, and privacy checks still inspect every event.
No product change or existing regression was weakened. Corrected full mobile:
**FRESH 1,657 passed / 174 files / 0 failed / 0 skipped**. Both logs retained.

Inspected Supabase skill security guidance; its service/docs/query workflow is
inapplicable to this expressly offline task. No SDK API/schema/auth/grant change,
remote query or service request. Local adapter assertions verify the boundary.

## Reproduction and interpretation

Installed host: Node24.16.0 / npm11.13.0, Windows10.0.26200 x64,
AMD Ryzen9 270 / Radeon780M. Vitest reports4.1.11; Next15.5.27;
Expo57.0.30 / React Native0.86.3 source packages. No install or clean-cache
purge. Internal compiler/Metro caches and OS caches remain warm. Public fixtures
are declared in `fixtures.json`, intervals in `measurement-boundaries.json`,
working source/test hashes in `identity.json`, and raw command identities/exits
in `commands.jsonl`, all relative to `tmp/overnight/PBR-MB1/`.

Ready local commands (PowerShell, repository root; no environment file access):

```powershell
$env:MB1_SOURCE = 'baseline'; $env:MB1_MODE = 'disabled'
node tmp/overnight/PBR-MB1/run.cjs repository-full
$env:MB1_SOURCE = 'current'; $env:MB1_MODE = 'disabled'
node tmp/overnight/PBR-MB1/run.cjs probe repository-full
$env:MB1_MODE = 'enabled'
node tmp/overnight/PBR-MB1/run.cjs probe repository-full
node tmp/overnight/PBR-MB1/summarize.cjs
```

These invoke the saved, hash-indexed helpers with the inspected offline guard
and local temporary directories. `repository-baseline.ts` is the exact reviewed
447c0e51 repository source with only its relative errors import relocated for
the ignored harness; current mode imports the real working repository. Neither
constructs an SDK client. The adapter checks every hidden ID in order and the
entire sequence of page DTOs, including cursors, before recording the full hash.
The original AF1 helper and first MB1 probes/logs remain available unchanged.
Prepared probe headers are pinned to the reviewed Git baseline; do not substitute
a live test header that installs a default observer into a disabled benchmark.

Durable source-controlled verification is available through the new shared/API
measurement tests and mobile entry/setup/snapshot/Library/AppLifecycle tests.
Raw probe files intentionally remain ignored per task policy; another checkout
needs the sanitized indexed probe directory to reproduce wall-time samples.
No percentile, production latency, hardware startup or native frame claim follows
from these small host samples. Native/authenticated-browser measurements have
sample size0 and remain **UNVERIFIED (owner to confirm)**.

Precise host interval qualifications: restoring mount includes its host-node
assertion, warm setup includes the same-store identity assertion; cold setup
starts after importing the database module, includes the lazy SQLite import,
WAL/schema/store setup, and uses a fresh in-memory database and opening cache.
No OS cache or native process is reset. Saved cache reads time only their actual
awaited wrapper call. Library timing includes the explicit held-read gate,
late write/invalidation and React flush/yield; it is not isolated SQL latency.
Navigation dispatch excludes readiness waits and the native transition. All
fixture construction, result hashing and measurement serialization happen
outside the API page-walk interval. Repeated fixtures share one test process;
run order is fixed rather than randomized, and medians are descriptive only.

Relevant ADR001/011/031/032/045 were checked: shared utilities stay in the
existing workspace, synthetic surfaces do not replace device acceptance,
summary/history/owner contracts and request-scoped reads remain intact, and
generation grace navigation/admission is untouched. No new ADR is needed.

## STEP 3 final measurements and verdict

**PASS for PBR-MB1 mandatory LOCAL scope.** Runtime/tests committed as `b788663e288f5d970d87cd7d54710c94abf21813`;
all mandatory local measurement, privacy, integration, gate and documentation
rows are complete. No performance optimization was implemented or claimed.
This PASS does not close physical resume-text, beta/tester or release gates.

All times below are descriptive median milliseconds; raw samples, counts,
events and hashes remain in the indexed ignored directory. Setup/navigation
use10 measured runs after1 warmup; Library/API use5 per size/schedule after1
warmup. Clock is performance.now; source identities and limitations above apply.

| Host interval | Before instrumentation | After, disabled | After, enabled |
| --- | ---: | ---: | ---: |
| Fresh database setup | 1.887 | 1.570 | 1.710 |
| Warm setup resolution + assertion | 0.064 | 0.047 | 0.040 |
| Cold saved-cache miss | 0.041 | 0.038 | 0.044 |
| Warm saved-cache hit | 0.061 | 0.054 | 0.054 |
| Restoring entry mount + assertion | 0.409 | 0.566 | 0.477 |
| Entry Redirect update | 0.194 | 0.226 | 0.201 |
| Notification dispatch + React effect | 0.245 | 0.448 | 0.259 |

| Library size / notification schedule | Before | After disabled | After enabled | Summary/stats/max active |
| --- | ---: | ---: | ---: | --- |
| 0 / unchanged | 14.696 | 11.934 | 15.708 | 2 / 2 / 1 |
| 0 / changed | 15.086 | 14.730 | 14.952 | 2 / 2 / 1 |
| 100 / unchanged | 17.798 | 15.601 | 15.139 | 2 / 2 / 1 |
| 100 / changed | 14.930 | 15.112 | 15.862 | 2 / 2 / 1 |
| 240 / unchanged | 15.269 | 15.036 | 15.647 | 2 / 2 / 1 |
| 240 / changed | 15.746 | 14.609 | 15.674 | 2 / 2 / 1 |
| 300 / unchanged | 15.726 | 15.229 | 15.678 | 2 / 2 / 1 |
| 300 / changed | 14.993 | 14.925 | 15.245 | 2 / 2 / 1 |

Library full item + offline-stat hashes match before/disabled/enabled for every
cohort. N+2 notifications use the identical held-read schedule in both variants.
AF1 coalescing remains the baseline; no duplicate repair or reduction is claimed.

The final API comparison runs the frozen447c0e51 repository, current disabled,
and current enabled against the identical no-network adapter. Earlier original
baseline measurements remain above. All visible items, hidden IDs/order and
next cursors compare exactly; full page DTO hashes match across all three.

| Visible / hidden history | Frozen before ms | After disabled ms | After enabled ms | Pages / reads | Full page hash |
| --- | ---: | ---: | ---: | --- | --- |
| 0 / 0 | 0.021 | 0.024 | 0.024 | 1 / 2 | `2547a4ec06231dfc4d10110a297cb34e4ebbe12e488358d4e518b2a55f05c71a` |
| 0 / 1000 | 1.958 | 2.206 | 1.743 | 1 / 7 | `0dbbe225afb2a74cf23b1c6ea11a9057cfcf27c66a1aceecdb31344a58f75533` |
| 100 / 0 | 0.151 | 0.168 | 0.147 | 1 / 2 | `c0d0df1fbd83200d48d252554f8b1484ca4edf85b072f9dd1c488e16dc4a0cf8` |
| 100 / 1000 | 2.305 | 2.095 | 2.644 | 1 / 7 | `642ad95400876de3dc66dcb2cd41808a5babcaaa780ebc9cd6c439257b89a63d` |
| 240 / 0 | 0.506 | 0.579 | 0.565 | 3 / 6 | `de148a2a8fcc3f9b5dcc535137fa5773eee95cebb43edd01feaf29df85316f83` |
| 240 / 1000 | 6.853 | 6.970 | 8.820 | 3 / 21 | `b323ec37e19b70256bba759b2d90499db64736cec59ed6c1e2d3104606d45cfc` |
| 300 / 0 | 0.549 | 1.149 | 0.745 | 3 / 6 | `4887ba49bfd0d667c42cd51d78cb5ed25de1aec0e1bc9e7841ace0b2f349d8b1` |
| 300 / 1000 | 7.616 | 9.792 | 8.187 | 3 / 21 | `ffdf81fd7a4fd3461540ab149b572583c4b7637765f4244af75d1a7286ce05c1` |

Enabled versus disabled elapsed deltas vary in both directions. Fixed run order,
JIT/cache/scheduling noise, explicit held gates and tiny sample counts prevent
an attributable speedup or stable overhead percentage. Enabled event payloads
and exact clock-call counts are recorded per sample. Disabled cohorts emit0
events and perform0 injected clock calls. Enabled API walks emit1 event per
page with2 clock calls per completed span; database reads/returned JSON bytes
are unchanged. Snapshot/setup and navigation sinks contain fixed numeric events
only; raw event samples make any additional lifecycle setup span explicit.
No production/database percentile, native startup, frame or real-user metric
was measured. Adapter counts are not PostgreSQL latency or an index mandate.

Observed instrumentation work per complete fixture (outside a fixture, no
observer or event history is retained):

| Workload | Disabled events / clock calls | Enabled events / clock calls |
| --- | --- | --- |
| Setup plus three cache reads | 0 / 0 | 4 / 8 |
| Restoring entry, ready entry and notification dispatch | 0 / 0 | 3 / 6 |
| Whole Library hook fixture, including initial saved reads | 0 / 0 | 6 / 12 |
| One-page / three-page API walk | 0 / 0 | 1 / 2 or 3 / 6 |

The timed Library invalidation portion still performs two overview reads.
Events retained by these finite benchmark sinks are test evidence; the runtime
utility retains no event buffer.

## Final gate ledger

All entries below are **FRESH PASS**; no result is relabelled from a prior task.
Exact source/test byte hashes are in identity.json. Only documentation commits
advanced HEAD during the run; the router-throw test received the final focused
and full mobile reruns. The API test received whitespace-only hygiene after its
full suite, followed by focused/typecheck/lint checks. Runtime hashes are stable.
Turbo is forced/local-only with loose env propagation; zero cached gate tasks.
Internal compiler/Metro caches are not purged. Command wall times are not app
latencies. First failures and invalid instrumentation cohorts are retained above.

| Exact command | Result | Command seconds |
| --- | --- | ---: |
| `npm run test --workspace @stay-focused/shared -- src/local-measurements.test.ts --maxWorkers=1` | 5 passed / 1 files / 0 skipped | 2.664 |
| `npm run test --workspace @stay-focused/mobile -- src/features/redesign/useLocalLibrary.test.ts src/services/localLibrary/librarySync.test.ts src/services/localLibrary/artifactStore.test.ts src/services/localLibrary/localMeasurements.test.ts src/app-shell/AppLifecycle.test.ts src/app-shell/entryMeasurement.test.ts --maxWorkers=1` | 86 passed / 6 files / 0 skipped | 15.957 |
| `npm run test --workspace @stay-focused/api -- src/lib/experience/localMeasurements.test.ts --maxWorkers=1` | 3 passed / 1 files / 0 skipped | 4.359 |
| `npm run test --workspace @stay-focused/shared -- --maxWorkers=2` | 711 passed / 73 files / 0 skipped | 21.801 |
| `npm run test --workspace @stay-focused/mobile -- --maxWorkers=2` | 1658 passed / 174 files / 0 skipped | 85.696 |
| `npm run test --workspace @stay-focused/api -- --maxWorkers=2` | 2455 passed / 214 files / 3 skipped | 189.084 |
| `npm run test --workspace @stay-focused/web -- --maxWorkers=1` | 575 passed / 76 files / 0 skipped | 329.009 |
| `npm run test --workspace @stay-focused/canvas -- --maxWorkers=2` | 75 passed / 1 files / 0 skipped | 2.509 |
| `npm run test --workspace @stay-focused/ocr -- --maxWorkers=2` | 27 passed / 3 files / 0 skipped | 2.183 |
| `npm run test --workspace @stay-focused/engine` | 606 passed / 0 failed offline evaluations | 19.904 |
| `npm run typecheck -- --force` | 8/8 tasks, 0 cached | 59.531 |
| `npm run lint -- --force` | 8/8 tasks, 0 cached; 0 errors / 6 existing warnings | 81.403 |
| `npm run build --workspace @stay-focused/api` | 37/37 static pages; 18 workflow steps / 1 workflow | 140.363 |
| `npm run build --workspace @stay-focused/web` | 23/23 static pages | 66.010 |
| `npm run build --workspace @stay-focused/mobile -- --platform android` | 38-file Android offline JS/assets export; no native build | 201.177 |
| `npm run build -- --force --concurrency=1 --env-mode=loose` | 8/8 tasks, 0 cached; API37/web23; Android/iOS/web JS/assets exports | 491.694 |

Full suites total **6107 passed / 0 failed / 3 existing live skips**. Focused
and benchmark runs are additional checks, not double-counted in that total.
Shared711 includes37 source files and36 pre-existing emitted-copy files; it
is not711 unique source tests. The3 API skips are the existing live activity
and2 live quiz cases. No new skip or observed product flake. Existing Vite
native-config, React test-renderer and Expo color warnings remain. Lint warnings
are the same5 mobile import-order warnings and1 web unused useMemo warning.
Generated API/web next-env.d.ts changes were inspected and restored to the
initial tracked declarations; the final forced typecheck/lint again passed.
Both staged/unstaged diff hygiene and final documentation/custody checks PASS;
documentation/custody validation is **FRESH 99/99 passed, 0 failed** in
verification.json. No private/generated artifact is staged.

The first final-document assembler invocation had a syntax error in its closing
lines.push delimiter and exited before writing. The corrected helper passed its
syntax check and assembled the report successfully; closure-attempts.log retains
the failure. No application change or gate rerun was needed for that helper fix.

Standalone Android inventory captured before the root export overwrote it:
38 files /14,671,619 bytes; Android HBC10,949,446 bytes, SHA256
`ea8f0a0c96c4e2048043237f77c3898f5c53cd2175008e03873ec5a2448c9083`.
This is current-source2.2.0/code6/runtime2.2.0-sdk57 JS/assets, not a rebuilt
2.3.0/code7 APK or an active OTA. No APK saving claim; all modules/fonts/ABIs
and source content/contracts remain. Inventory and per-file hashes are saved.

## Final acceptance and continuation

| Row | Disposition |
| --- | --- |
| 0 | PASS source/prerequisites/policies; actual PBR0/AF1 PASS statuses and AF1 ancestry verified |
| 1a | PASS repeatable synthetic setup/cache/entry/dispatch measurements; physical metrics UNVERIFIED |
| 1b | PASS all8 Library schedules, full data/stats equality and unchanged2/2/max1 operation counts |
| 1c | PASS all8 API history cohorts, exact page/hidden-ID equality, spoofed-owner denial and partial failure |
| 2a | PASS optional typed privacy allowlist, injected clock, disabled inertness, bounded observer lifetime and sink/clock failure containment |
| 2b | PASS deterministic real-boundary errors/cancellation/owner switch/unmount and full-result noninterference |
| 3 | PASS original and repeated identical public fixtures, full hashes, events/clock counts and measured overhead disclosure |
| G | PASS fresh relevant/full/forced/explicit build and diff/documentation gates; first failures retained |
| C | PASS source/doc reconciliation, scoped owner-authored local commits and ignored evidence/progress/status |

Next eligible task is **PBR-LP1 only after fresh supervisor review/publication
of this actual MB1 PASS**. Begin with this baseline and AF1 ef80dfc6, optimize
only a demonstrated remaining cost with equivalent before/after verification,
or document that no further local optimization is justified. Preserve complete
history and owner/source boundaries. AS1 follows LP1 PASS/review; LR1 follows
AS1 PASS/review. None is implemented here. Historical OX2 remains blocked by
OX1 and unrelated roadmaps/Owner Pause remain intact.

Owner steps remaining: Rollout and Device checks **NOT RUN**, skipped entirely.
Full active OTA/runtime/channel/embedded identity, safe isolation, physical
resume-text attribution, authenticated acceptance, live revisions/DB/applied
migrations/regions/Scheduler/provider state and production/native metrics are
**UNVERIFIED (owner to confirm)**. RT1/EV1 STOPPED and RT2 physical preflight
STOPPED / resume-text INCONCLUSIVE remain unchanged. No release/beta gate passes.
No push/deploy/remote SQL/migration/Scheduler/service/email/device/OTA/EAS/native
build/install, environment-file change, paid generation or spending occurred.

## Sanitized evidence index

All paths below are under ignored tmp/overnight/PBR-MB1/. SHA256.json covers
the saved scripts, initial failed logs, valid/invalid cohorts, original probe
snapshots, fixtures, source identity, measurements and verification. Logs and
generated/private fixtures never enter Git. Re-run summarize.cjs --index-only after final
verification to refresh the full index. Key evidence hashes follow.

| Artifact | SHA256 |
| --- | --- |
| `identity.json` | `9591bfee8be33ef42a4e6404ac7e3df62878e50f909bf013be6d4668ce8367cf` |
| `fixtures.json` | `5fc0b3bc49f266d9b62778f87137613586f687fc23696cb9c4902f8067989ecd` |
| `measurement-boundaries.json` | `f9984d51ecc8de3a3819d957b45b5d872a93fed7e4596a5e32a9cc88db0c9bc9` |
| `measurements-before.json` | `274f414393d2a0be436dd3276d5bb4d1e6ebfddaf47a32ed2b998eaca5b49c3e` |
| `measurements.json` | `c3b401bf6533dbb74add1bb424ae2a51f6f2feb61f212fd9b5f930bbc1a3a95b` |
| `android-build-inventory.json` | `51705bc950569663ded8c091c940b72dd9a9fb0b0666b81b28524710fc6f8613` |
| `repository-baseline.ts` | `e766ae0c7b516362e9958d76640f050c6192c7318b5e07c6aa3385d9d65ed2bf` |
| `repository-probe-full.ts` | `d7c9bc2be15953b1407310a663954f86223349cdd1cdb4a7f3025e2daef07666` |
| `run.cjs` | `2d24465d2defef95f3e5419a804e60e84068fbd943c8df0f62e01cfe84198ad3` |
