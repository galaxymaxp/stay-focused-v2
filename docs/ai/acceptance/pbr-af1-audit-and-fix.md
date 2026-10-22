# PBR-AF1: renewed pre-beta audit and supported local repairs

## Frozen scope and evidence contract

2026-10-23. Initial source `859590308b16afbabd4b454b0741565e5972dbcf`,
branch `overnight/2026-10-15_feedback`; tracked tree clean, local upstream
snapshot 4 ahead / 23 behind `github/main` (no fetch). Preserve untracked `UI/`,
`apps/mobile/.gitignore`, `supabase/.temp/` and ignored evidence.

Owner direction read in full from runner answer
`chatgpt-owner-1792691511294-971f0f34-866c-4ea9-856b-57750399b31c.md`
(2026-10-22T17:51:51.302Z): renew audit, reproduce/diagnose/repair/verify in
one task, save evidence immediately, record unreproduced findings honestly.
This scope depends on PBR0. PBR-RT1 stays STOPPED; PBR-MB1, PBR-LP1,
PBR-AS1 and PBR-LR1 stay HELD, not started or automatically advanced.

Read root AGENTS/AUTOPILOT, active planning checkpoints, PBR0 and PBR-RT1
acceptance, latest handoff, runner BACKLOG PBR sections and queue/137.
No nested AGENTS found under tracked application/package paths. Historical
scaffold/design files and unrelated OX/parity work are excluded.

Mandatory local rows frozen before runtime edits:

| Row | Requirement / owning layer | Proof needed | Initial result |
| --- | --- | --- | --- |
| I0 | Exact source, binary, OTA and export boundaries | Git/manifest/local artifact inventory; historical release reports distinguished | Source matches; inventory pending; live state UNVERIFIED |
| B0 | Resume/render: DayOrb, DayRingClock, AppLifecycle, navigation/Appearance | Source recheck and bounded local probe; separately identify missing native proof | Existing replacement-GL repair present; FS7 unresolved |
| B1 | Web/mobile/API experience and existing optimizations | Current source plus offline synthetic repository counts; no production percentile inference | Pending |
| D1 | API Library: `apps/api/src/lib/experience/repository.ts` | Synthetic 0/100/240/300 and large superseded history, exact count/equivalence/failure boundaries | Pending |
| D2 | Mobile Library: `apps/mobile/src/features/redesign/useLocalLibrary.ts`, `apps/mobile/src/services/localLibrary/{librarySync,artifactStore}.ts` | Synthetic read/progress counts; retain failing proof before any repair, owner/cancel/offline/final state regressions | Pending |
| S1/S2 | APK/export/assets and imports | Read existing APK/archive and source/export separately; no native build or APK savings claim | Pending |
| R1 | Long reviewer: `apps/mobile/src/features/reviewer/ReviewerReader.tsx` and discovered web equivalent | Synthetic complete-content/search/anchor/render audit; measured versus inferred costs | Pending |
| O1/A1/U1 | Remaining PBR0 image/AI/polish findings | Bounded current-source recheck; avoid unrelated LC1/OX scope | Pending |
| G | Focused reproductions, relevant full suites and serial forced gates | Fresh exact counts, first failures, cache results, offline guarded builds and diff hygiene | Pending |
| C | Final acceptance, planning/handoff and scoped local commits | All mandatory local audit/repair rows complete; native limitation explicit | Pending |

Only demonstrated in-scope local causes receive the smallest complete repair,
cause-specific regression and identical-fixture before/after measurement.
Unsupported native fixes, architecture/native release changes, installs, remote
services/SQL, environment edits, device operations and rollout are excluded.
No new index, telemetry service, provider, font/module/ABI removal or content cap.
No test duration establishes physical latency or native pixels.

## Durable evidence index

New raw logs, probes, measurements and their SHA256 index are saved immediately
under ignored `tmp/overnight/PBR-AF1/`. Progress is appended to
`tmp/overnight/PBR-AF1.progress` after each step/finding. No generated/private
artifact is committed. Findings below will include UTC timestamp, identity,
command/fixture, observed/expected, owning code, confidence, failing proof,
next action and verification. This report and progress suffice to resume.

## STEP 0 checkpoint

PASS for local baseline inspection. No source contradiction found. Source
manifest remains 2.2.0/code6/runtime `2.2.0-sdk57`; historical shipped binary
is 2.3.0/code7/runtime `2.3.0-sdk57`. These identities deliberately differ.
FS7 update `01a162a3-6a63-7318-9a64-4b40789569a1` and later narrower GL
update `01a16304-432c-703e-838e-c4ea04e4b3d9` are historical, not active OTA
observations. Current deployments, active binary/OTA, database/applied migration,
queue, Scheduler/provider state: **UNVERIFIED (owner to confirm)**.

Scripts inspected: Next builds, mobile `expo export`, Vitest, shared TypeScript
and engine offline evaluations. Release/update/worker/live-validation scripts
will not run. Inspected PBR0 loopback-only Node network guard and local temp
runner; new runner will additionally use npm offline, Expo offline, disabled
telemetry and local Turbo cache only. Gates run serially.

## Owner steps remaining

Rollout and Device checks: **NOT RUN**, skipped entirely by unattended rules.
Pinned native reproduction/attribution and authenticated live acceptance remain
owner work; no local PASS will close PBR-RT1 or establish beta/release readiness.

## Finding D2 — overlapping and duplicate local Library reads (before repair)

2026-10-22T18:06:37.780Z; source 8d6e60a3, source mobile 2.2.0/code6,
Node/SQLite + React test renderer, no OTA/native renderer. **MEASURED**,
high cause confidence. Exact command: `node tmp/overnight/PBR-AF1/run.cjs library`;
four focused files, **FRESH 74 passed / 4 failed / 0 skipped**. The new
parameterized hook regression fails on maximum overlapping summary reads.

Fixture: 0/100/240/300 public synthetic draft summaries, one initial image
notification plus N progress notifications during a held local read, then one
committed late summary (which itself notifies). Initial cloud read fails with
synthetic `connection`, so saved data and offline state stay visible.

| Existing summaries | Explicit events + late-write event | Summary reads | Stats reads | Maximum overlapping summary calls |
| ---: | ---: | ---: | ---: | ---: |
| 0 | 1 + 1 | 4 | 2 | 4 |
| 100 | 101 + 1 | 204 | 102 | 204 |
| 240 | 241 + 1 | 484 | 242 | 484 |
| 300 | 301 + 1 | 604 | 302 | 604 |

Observed full content/stats equality passes, but work scales with redundant
notifications. Expected: one active derived read plus one fresh follow-up for
invalidations received during it, with late writes included and owner fences
preserved. Owning code: `useLocalLibrary.ts` subscription independently starts
`Promise.all(listSummaries, offlineStats)` for every event;
`artifactStore.ts:offlineStats` internally calls `listSummaries` again. Each
summary read parses image, response, quiz and pending-draft metadata.

Failing proof: `tmp/overnight/PBR-AF1/library-1792692397781.log`, SHA256
`af66eb1df7cc434977a5d9ac72e582139ef72aebb22e8fc29196bbd1b4a621d6`.
The first harness attempt `library-1792692303699.log` did not finish: its held
mock remote ignored abort and blocked afterEach draining. Only that runner's
process tree was terminated. Replacing the mock with an immediate synthetic
connection failure fixes the harness; no product/assertion weakening occurred.
Next action: reuse the owner-bound summary scan for list/stats and serialize
overlapping screen invalidations with a dirty follow-up; no debounce timer,
catch-up throttle change, write batching or lost progress notification.

## Finding B0 — native resume text remains UNREPRODUCED

2026-10-22T18:04:16.966Z; same source/build boundary. Source recheck confirms
DayOrb replacement-context disposal/rebuild/load gating already exists.
DayRingClock's foreground/focus timer, ThemeProvider AppState/Appearance,
authenticated owner-key stack and AppLifecycle show no newly demonstrated
native text removal cause. FRESH existing resume/navigation suites: **65 passed /
0 failed / 0 skipped / 5 files**, `resume-1792692256976.log`. These are JS mocks,
not fresh physical proof; historical combined 8-case probe is not rerun as
native evidence. Original FS7 captures remain unavailable locally; OX1 captures
belong to a different isolated diagnostic shell. No speculative repair.
Missing essential native attribution blocks this repair path only, per AF1.

## D2 repair and immediate verification checkpoint

2026-10-22T18:10:23.604Z. **FIXED WITH LOCAL PROOF** (full gates pending).
`LocalArtifactStore.readLibraryOverview(owner)` reuses one owner-bound derived
summary scan for items and offline stats; standalone stats retains its API and
readiness/bytes/permanent-failure behavior. Removed only an unused SQL aggregate
whose result was never read. No schema or stored-data changes.
The Library hook now has one effect-local read flight, with a dirty follow-up
for overlapping invalidations. It publishes the first result immediately, then
reads again for late writes; cleanup discards queued work and stale publication.
Failure releases the flight so later invalidations can recover. No new timer,
progress/write batching, download limit, focus throttle or background job change.

Identical D2 fixture after: **all four sizes use 2 summary reads / 2 stats
aggregate reads / maximum 1 active summary call** (including the late write).
300-item reduction is 604 -> 2 summary scans and 302 -> 2 stats scans;
these are controlled operation counts, not physical latency percentages.
Test instrumentation now observes actual stats aggregate queries rather than
only the standalone stats method; the fixture/event schedule is unchanged.
Complete list equality and final stats are asserted for every size.

FRESH focused files: first repair **78 passed / 4 files**, then final extended
regressions **80 passed / 0 failed / 0 skipped / 4 files**
(`library-1792692623605.log`). Additional checks cover delayed prior-owner
results with queued invalidations, read-failure recovery retaining saved content,
list/stat equivalence for both owners and exactly one scan per overview.
Existing per-committed-item progress/blur/refocus, partial failure, cancellation,
body/key retry/version and local pending work suites remain green.
First extended run **78 passed / 2 failed** (`library-1792692598296.log`):
new fixtures accidentally supplied an already-prefixed draft ID, whereas the
fixture factory adds `activity:`. Corrected those new inputs; assertions retained.
No product failure or flake hidden. FRESH forced root typecheck **8/8 tasks,
0 cached** (`typecheck-1792692631736.log`).

## Finding D1/B1 — API experience read audit

2026-10-22T18:11:35.076Z; current source and same source build, no OTA.
Command `node tmp/overnight/PBR-AF1/run.cjs service` runs
`repository-probe.ts` against the actual trusted repository and a public
synthetic in-memory PostgREST adapter. No SDK client/service created; fetch
throws. **MEASURED LOCAL COUNTS**, not PostgreSQL plans or API latency.

| Visible summaries | Pages | Reads, no superseded history | Reads, 1,000 superseded rows | DB JSON bytes, no history / with history |
| ---: | ---: | ---: | ---: | ---: |
| 0 | 1 | 2 | 7 | 4 / 56,899 |
| 100 | 1 | 2 | 7 | 36,973 / 93,868 |
| 240 | 3 | 6 | 21 | 89,942 / 260,627 |
| 300 | 3 | 6 | 21 | 112,325 / 283,010 |

Exact full-result equality/hash is stable for each history pair; caller-supplied
other-owner identity cannot override the trusted owner. Queries exclude payload
columns; failed hidden-history reads reject instead of publishing partial data.
Log `service-1792692695077.log` includes result hashes and desktop-adapter times.
First probe launch failed on CJS top-level await; wrapped its entry in async main
and reran unchanged assertions/fixture. `service-1792692680367.log` retained.

The history walk is a confirmed cost, **SOURCE-INFERRED performance concern**,
not a proved incorrect result or slow database plan. Each HTTP page is a separate
authorized request and must receive current supersession evidence. No unsafe
cross-request cache, omitted IDs, new index or projection rewrite is justified
by adapter counts alone. Next action: owner local-history/cardinality and plan
review before a material contract/cache decision. Current exact detail/summary
projection, Today request-local dedupe, saved-first screens, shared job reader,
Canvas pagination/Retry-After and durable 202/cancel semantics remain present.

## Finding S1/S2 — exact existing APK and export boundary

2026-10-22T18:05Z read-only ZIP inventory, saved immediately as `apk.json`.
**MEASURED** 1,729 entries; exact APK **132,024,227 bytes**, SHA256
`0910d589b42c02c04f032dff7362da69258cdd081c5be1c2dc83798452cc12e6`.
108 native entries total **93,639,812 compressed bytes** across arm64-v8a,
armeabi-v7a, x86 and x86_64; assets **8,793,910 compressed bytes**.
Exact checksum matches PBR0's manifest-inspected 2.3.0/code7/runtime2.3.0-sdk57
binary, not current source2.2.0/code6 or an active-device observation.
First PowerShell summary aggregation used OrderedDictionary values which
Measure-Object could not resolve; reread the saved JSON as objects and verified
the sums. No artifact modification. 117 MB owner report remains unidentified.
No native packaging/signing/config/ABI/module/font changes or native build.
No APK savings claimed from the Library JavaScript repair. Fresh export ledger
will be recorded after mandatory local builds; existing export identity stays
separate. Static native export imports and full-font packaging remain measured
PBR0 hypotheses, without a proven compatible byte-saving change in this slice.

## Remaining PBR0 source findings — bounded recheck

2026-10-22T18:16Z, same source/build identity; **SOURCE-INFERRED**, no live
provider, private data or device measurements. Owning code and current result:

- O1: `localLibrary/imageManifest.ts:imagesReady` still treats `skipped_cap` as
  settled; `imagesNeedConnection` and `ReviewerReader.tsx` retain the separate
  connection warning. Existing cap/quotas/text are preserved. This is an existing
  product badge/completeness decision overlapping held LC1, not evidence to
  enlarge offline downloads or silently change meaning. Owner/supervisor review
  remains the next action; no LC1 work started.
- A1/B1: `processing-jobs/ai-reviewer.ts` still computes a call budget then runs
  the AI-first path; `engine/src/ai-first-reviewer.ts:138,145` normalizes in both
  paths, and :107 still assigns total duration to provider wait with zero stage
  timings. No provider timing percentile or completeness-preserving measured
  CPU bottleneck is established. Actual planning/provider timing is unknown;
  no speculative generation/concurrency/model/source-contract change made.
- U1: `design/primitives.tsx` segments retain minHeight32 plus top/bottom hitSlop6.
  Effective native accessibility/overlap is unmeasured, not a proved 32pt target
  failure. Existing tokens, gestures, focus, Reduced Motion and held OX scope
  remain. Owner accessibility/font-scale/keyboard matrix is still required.
- Saved-first native/web Library, exact reviewer detail, dynamic web export,
  offline pending draft/quiz handling, job reader and native GL gating remain
  present. Native export still statically imports format builders; a safe
  byte-saving import boundary is not established by file names alone.
- Server bearer verification and trusted owner predicates remain unchanged.
  No database/RLS/grant/auth/storage-policy edits. OCR keeps 100 total/40
  OCR-required durable pages, synchronous/Canvas40 and provider5-page requests;
  completeness and durable202/persist-before-success/cancel semantics unchanged.
  Fresh complete suites below check these contracts without service calls.

These source concerns are not relabelled repaired or production-verified.
Library operation-count repair is the only demonstrated local cause so far.
Remote plan/telemetry/product decisions are larger material choices for handoff,
not requirements introduced into this local repair.
