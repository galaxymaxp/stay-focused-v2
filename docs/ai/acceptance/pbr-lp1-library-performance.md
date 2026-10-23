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

## STEP 1 reproduction and STEP 2 decision

**No further local runtime optimization is justified by this evidence.** No
runtime, test, schema, dependency or configuration file is changed. AF1's
ef80dfc6 improvement is retained without taking duplicate credit. Mandatory
gates and final reconciliation remain pending at this checkpoint.

Inspected actual hook/store/sync/catch-up/device/snapshot implementations,
LibraryScreen callers, trusted repository, existing tests, scripts and
ADR001/011/031/032/045. Owner verification, manual labels, complete per-page
hidden history and the 10,000-row safe-failure bound stay intact. Supabase skill
security guidance was read; service/changelog/query procedures are outside this
explicitly offline task, and no Supabase API or database change is proposed.

Two independent unchanged-source cohorts run serially at a35b1d3c. Actual
Node24.16.0 SQLite adapter, Windows x64; Vitest4.1.11. Source/package/tool hashes
and 29,546 original evidence/source/untracked-file hashes were captured before
measurement in identity-before.json. Original AF1/MB1 scripts/logs are read-only.

Store fixtures independently construct full expected sorted DTOs and all stats:
reviewer/quiz/activity mix, saved and missing bodies, ready reviewer manifests,
pending draft title/readiness overrides, in-progress/completed activity responses.
Expected bytes come from UTF-8 fixture body JSON, not the code under test. The
history stress adds 1,000 foreign-owner summaries and 1,000 unmatched same-owner
rows in each of four overlay tables (manifest/practice/response/pending edit).
This is an adversarial seeded shape, not observed owner data or a claimed normal
deletion outcome: removeArtifact already removes related overlays atomically.
Every measured SQL read asserts its owner parameters; foreign/pending history
survives unchanged. Empty owner is rejected.

Each of eight size/history cohorts uses 2 warmups then 20 samples per operation
(list, stats, overview), repeated in a fresh process: **960 measured operations**,
plus 96 warmups. Fixtures/migrations/body writes/expected construction, equality
assertions, hashing and serialization are outside the monotonic operation timer.
The adapter and spy overhead are inside. Repeated calls share an in-memory
database and OS/process caches; fixed order, no randomized/native experiment.

| Saved items | Overview ms, cohort A | Overview ms, cohort B | With seeded history A | With seeded history B |
| --- | ---: | ---: | ---: | ---: |
| 0 | 0.187 | 0.157 | 6.611 | 5.894 |
| 100 | 0.762 | 0.768 | 6.687 | 6.605 |
| 240 | 2.108 | 1.676 | 9.287 | 11.816 |
| 300 | 3.029 | 3.440 | 11.788 | 11.078 |

These are descriptive medians, not physical UI latency or a saving. One list
uses 5 SQL reads; stats and overview each use 8, including exactly one summary
scan. Overview reuses its list for current/permanent-failure readiness. The
seeded history attributes additional host work to full owner overlay scans,
but does not establish reachable volume or native impact. Pruning pending work,
caching readiness across writes or restricting queries without an established
real workload/lifetime contract would be speculative. No such change is made.

Hook: copied exact MB1 script, 1 warmup plus 5 samples for each of eight
0/100/240/300 changed/unchanged schedules, in each cohort. All **80 measured
schedules** retain 2 summary / 2 aggregate stats / max 1 active read, complete
items/stats equality, and hashes identical to original MB1 and the repeat.
Held-read gate, explicit late write/invalidation and React flush/yield remain
inside that legacy harness interval; its elapsed samples are retained only as
harness measurements, never claimed as application latency.

API: copied MB1 full-DTO probe with current repository selection only. Each
cohort has 1 warmup plus 5 samples for each of eight size/history pairs: **80
measured complete walks**, plus 16 warmups. Every walk compares the complete
page DTO sequence, ordered visible items, cursors and every hidden ID; foreign
caller identity is replaced by the trusted owner. Each walk also checks hidden
read failure rejects. Full hashes match both cohorts and original MB1. Counts
remain 2/2/6/6 without history, 7/7/21/21 with 1,000 hidden rows. Adapter filtering,
sorting and JSON projection/byte accounting are included; fixture construction,
comparison and hashes are excluded. No SDK client or remote query is created.
These counts do not identify slow production SQL and do not justify omitting
history, changing indexes or adding a cross-authenticated-request cache.

FRESH initial/repeat probes: 2 tests / 2 files passed each, 0 failed/skipped;
API probe exits0 each. FRESH focused existing Library integration:82 passed /
4 files,0 failed/skipped; API measurement integration:3 passed /1 file,0
failed/skipped. Slow/unmount/owner switch/blur/saved-first/read-error cases,
full pagination/idempotence, partial failures, exact not-found deletion and
background reconnect/cancel/drain are exercised by these existing suites.
Remaining snapshot/device/pending/image regressions run in the full mobile suite.

Read-only discovery first attempts used unsupported PowerShell brace expansion
and an rg wildcard path that Windows did not expand; both were corrected with
explicit/discovered paths. One later filename filter matched no paths;
existing full-suite discovery is unaffected. No product
or measurement assertion failure occurred in these attempts. Logs are retained.

Reproduce from the repository root, without opening any environment file:

```powershell
$env:LP1_COHORT = 'first'
node tmp/overnight/PBR-LP1/run.cjs probe repository-full
$env:LP1_COHORT = 'repeat'
node tmp/overnight/PBR-LP1/run.cjs probe repository-full
node tmp/overnight/PBR-LP1/summarize.cjs
```

Original cohort logs/results are preserved; use new cohort names/log directories
when reproducing rather than overwriting them. New ignored probes are available
in this checkout; another checkout requires the sanitized evidence directory.
Raw samples and every result hash are in store-first.json/store-repeat.json,
the command-indexed logs and summary.json. This is unchanged-source repeat
verification, with zero runtime changes and no before/after percent claim.

## STEP 3 final local verdict and gates

**PASS for the mandatory LP1 local profiling/verification scope; no runtime
change.** Source is identical to reviewed MB1 d8d22603. Acceptance freeze
a35b1d3c; measurements/decision 204f8731; final scoped documentation commit is
recorded by Git and tmp/overnight/PBR-LP1.status after this report is committed.

API complete-walk median milliseconds, cohorts A / B: size 0 / history 0
0.025 / 0.017; size 0 / history 1,000 2.212 / 2.314; size 100 / history 0
0.186 / 0.161; size 100 / history 1,000 2.574 / 1.911; size 240 / history 0
0.630 / 0.532; size 240 / history 1,000 7.105 / 7.552; size 300 / history 0
0.704 / 0.561; size 300 / history 1,000 7.741 / 8.423. Adapter cost only.
Full sorted result, stats and DTO/cursor/hidden-ID hashes match; raw exact hashes
and min/max/samples are in summary.json and the original cohort logs. For example,
the 300-item API/1000-history full-page SHA256 is
`ffdf81fd7a4fd3461540ab149b572583c4b7637765f4244af75d1a7286ce05c1`;
the 300 unchanged-hook item/stats SHA256 is
`e77543c4c32025e1eec66567c9f0081a0d66656a20daa3e13e771c09ec90a341`.

All rows below are **FRESH**, guarded/offline in this checkout on the unchanged
MB1 runtime (command ledger records actual documentation HEAD and time). Runtime
module/compiler/Metro/OS caches can remain warm; forced Turbo results have 0
task-cache hits. Suite wall times are verification cost, never product latency.

| Command | Result | Seconds |
| --- | --- | ---: |
| `npm run test --workspace @stay-focused/mobile -- src/features/redesign/useLocalLibrary.test.ts src/services/localLibrary/librarySync.test.ts src/services/localLibrary/artifactStore.test.ts src/services/localLibrary/offlineCatchUp.test.ts --maxWorkers=1` | 82 passed / 4 files / 0 skipped | 8.133 |
| `npm run test --workspace @stay-focused/api -- src/lib/experience/localMeasurements.test.ts --maxWorkers=1` | 3 passed / 1 files / 0 skipped | 2.118 |
| `npm run test --workspace @stay-focused/shared -- --maxWorkers=2` | 716 passed / 74 files / 0 skipped | 18.844 |
| `npm run test --workspace @stay-focused/mobile -- --maxWorkers=2` | 1658 passed / 174 files / 0 skipped | 61.148 |
| `npm run test --workspace @stay-focused/api -- --maxWorkers=2` | 2455 passed / 214 files / 3 skipped | 162.475 |
| `npm run typecheck -- --force` | 8/8 tasks, 0 cached | 43.614 |
| `npm run lint -- --force` | 8/8 tasks, 0 cached; six existing warnings | 82.874 |
| `npm run build --workspace @stay-focused/api` | 37/37 static pages; local workflow build | 120.230 |
| `npm run build -- --force --concurrency=1 --env-mode=loose` | 8/8 tasks, 0 cached; API/web/mobile JS exports | 416.301 |

Full relevant suites: **4,829 passed / 0 failed / 3 existing live skips**.
Shared 716/74 files includes 37 TypeScript source test files plus 37
existing emitted-copy files after MB1's build; it is not that many unique source
assertions. MB1's 711/73-file checkpoint preceded the emitted local-measurement
copy now discovered, which accounts for the 5 additional passes; no source test
was added or weakened. Mobile 1,658/174 files, API 2,455/214 files.
The 3 existing API skips are the live activity case and 2 live quiz cases.
Focused 85 checks and both 2-test probe runs are additional, not double-counted.
No failed application test/typecheck/lint/build first attempt, new skip or
observed product flake. Existing
Vite config/React test renderer/Expo warnings and five mobile import-order plus
one web unused useMemo lint warning are retained.

Standalone Android export is **NOT APPLICABLE**: no mobile/shared changes.
The mandatory root build nevertheless exports mobile Android/iOS/web JS/assets
offline. Standalone web build/tests are **NOT APPLICABLE**: no web changes;
root build includes the web build. API explicit build is FRESH as required.
Native build, physical/authenticated-browser/production metrics and rollout
remain **NOT RUN / UNVERIFIED (owner to confirm)**. Build identities/inventories,
original-input custody and final diff/documentation checks are recorded in
verification.json and SHA256.json. Generated Next declarations are inspected
and restored to the reviewed baseline when the local builds change them.

Final acceptance: rows 0, 1a, 1b, 1c, 1d, 2, 3, G, C PASS within this local scope.
Row 2 passes by the expressly allowed no-runtime-change verdict; it does not
claim an optimized query, speedup or physical improvement. No new ADR is needed.
AS1 is next only after actual LP1 PASS plus fresh supervisor review; LR1 after
AS1 PASS/review. No successor/queue/controller work was performed.

Owner steps remaining are unchanged from the frozen boundary above. Vercel CLI
is unavailable; strongly recommend `npm i -g vercel` for separately authorized
future env/deploy/log tooling. Installation and Vercel commands were NOT RUN.

First final custody/documentation verifier: exit 1 after all 29,546 original
hashes passed, because it rejected replacement characters anywhere in the entire
historical handoff. Baseline d8d22603 already contains them; current history is
an unchanged prefix and the new LP1 footer contains none. Corrected the helper
to assert no new replacement characters against baseline and separately verify
the unchanged historical prefix and clean LP1 footer. Original history is
preserved. This was a documentation-verifier scope error, not an application
test/build failure; first attempt retained in attempts.log. Final corrected
verification counts are recorded in verification.json.

Corrected final verifier: **FRESH 29,575/29,575 passed, 0 failed**, including
29,546 unchanged original input hashes, no runtime diff, five scoped Markdown
paths, report links, unchanged historical handoff prefix and no new replacement
characters. Root mobile export inventory:84 files /35,320,652 bytes across
Android/iOS/web; per-file SHA256 and API/web build IDs are in verification.json.
These bytes describe JS/assets exports, not a native APK or an APK reduction.
Final unstaged/staged diff checks pass at the local documentation commit boundary.
