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
schedules** retain 2 summary / 2 aggregate stats / max1 active read, complete
items/stats equality, and hashes identical to original MB1 and the repeat.
Held-read gate, explicit late write/invalidation and React flush/yield remain
inside that legacy harness interval; its elapsed samples are retained only as
harness measurements, never claimed as application latency.

API: copied MB1 full-DTO probe with current repository selection only. Each
cohort has 1 warmup plus 5 samples for each of eight size/history pairs: **80
measured complete walks**, plus16 warmups. Every walk compares the complete
page DTO sequence, ordered visible items, cursors and every hidden ID; foreign
caller identity is replaced by the trusted owner. Each walk also checks hidden
read failure rejects. Full hashes match both cohorts and original MB1. Counts
remain 2/2/6/6 without history, 7/7/21/21 with1,000 hidden rows. Adapter filtering,
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
explicit/discovered paths. One later filename filter matched no paths due to
Windows line endings; existing full-suite discovery is unaffected. No product
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
