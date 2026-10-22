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
manifest remains 2.2.0/code 6/runtime `2.2.0-sdk57`; historical shipped binary
is 2.3.0/code 7/runtime `2.3.0-sdk57`. These identities deliberately differ.
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

2026-10-22T18:06:37.780Z; source 8d6e60a3, source mobile 2.2.0/code 6,
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

2026-10-22T18:05:28.5724639Z read-only ZIP inventory, saved immediately as `apk.json`.
**MEASURED** 1,729 entries; exact APK **132,024,227 bytes**, SHA256
`0910d589b42c02c04f032dff7362da69258cdd081c5be1c2dc83798452cc12e6`.
108 native entries total **93,639,812 compressed bytes** across arm64-v8a,
armeabi-v7a, x86 and x86_64; assets **8,793,910 compressed bytes**.
Exact checksum matches PBR0's manifest-inspected 2.3.0/code 7/runtime 2.3.0-sdk57
binary, not current source 2.2.0/code 6 or an active-device observation.
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
  OCR-required durable pages, synchronous/Canvas 40 and provider5-page requests;
  completeness and durable202/persist-before-success/cancel semantics unchanged.
  Fresh complete suites below check these contracts without service calls.

These source concerns are not relabelled repaired or production-verified.
Library operation-count repair is the only demonstrated local cause so far.
Remote plan/telemetry/product decisions are larger material choices for handoff,
not requirements introduced into this local repair.

## Final gate ledger

Every command is fresh local execution on the exact working repair indexed by
`identity.json` (baseline and working source SHA256 per owned code/test file).
Documentation-only HEAD advances during gates do not change the tested code.
The ledger source field records HEAD at command completion; the four working
source/test hashes pin the actual repair now committed as ef80dfc6.
Serial runner `run.cjs` uses inspected PBR0 loopback-only Node network guard,
repository-local TEMP/TMP/TMPDIR, npm offline, Expo offline/no-dotenv, disabled
Expo/Next/Turbo telemetry and Turbo `local:rw`. No remote cache result is used;
compiler/Metro internal caches are not purged. Raw output is in the ignored
evidence directory, indexed by timestamped `commands.jsonl`.

| Exact command | Result / freshness |
| --- | --- |
| Focused resume/navigation command in B0 | FRESH PASS: 65 tests / 5 files |
| Focused Library command in D2 | FRESH final PASS: 80 tests / 4 files; earlier baseline 74 pass/4 fail and extended fixture 78 pass/2 fail retained |
| `npm run test --workspace @stay-focused/mobile -- src/features/reviewer/SectionScrubber.test.ts src/features/reviewer/reviewerNavigation.test.ts --maxWorkers=1` | FRESH PASS: 21 tests / 2 files |
| `npm run typecheck -- --force` | FRESH PASS: 8/8 tasks, 0 cached; repeated after generated-file restoration with the same result |
| `npm run lint -- --force` | FRESH PASS: 8/8 tasks, 0 cached, 0 errors / 6 existing warnings (5 mobile import ordering, 1 web unused useMemo) |
| `npm run test --workspace @stay-focused/shared -- --maxWorkers=2` | FRESH PASS: 706 tests / 72 files, including emitted-copy tests |
| `npm run test --workspace @stay-focused/canvas -- --maxWorkers=2` | FRESH PASS: 75 tests / 1 file |
| `npm run test --workspace @stay-focused/ocr -- --maxWorkers=2` | FRESH PASS: 27 tests / 3 files |
| `npm run test --workspace @stay-focused/engine` | FRESH PASS: 606 offline evaluations, 0 failed |
| `npm run test --workspace @stay-focused/api -- --maxWorkers=2` | FRESH PASS: 2,452 passed / 3 existing live skips / 213 files |
| `npm run test --workspace @stay-focused/mobile -- --maxWorkers=2` | FRESH PASS: 1,651 passed / 172 files, 0 skipped |
| `npm run test --workspace @stay-focused/web -- --maxWorkers=1` | FRESH PASS: 575 passed / 76 files, 0 skipped |
| `npm run build --workspace @stay-focused/api` | FRESH PASS: 37/37 static pages |
| `npm run build --workspace @stay-focused/web` | FRESH PASS: 23/23 static pages |
| `npm run build --workspace @stay-focused/mobile -- --platform android` | FRESH PASS: 38 files, offline JS/assets export only |
| `npm run build -- --force --concurrency=1` | FRESH PASS: 8/8 tasks, 0 cached |
| Long-reader synthetic host probe | FRESH PASS: 2 tests / 1 file |
| `git diff --check`; `git diff --cached --check` | FRESH PASS for exact staged runtime repair and final documentation |
| Planning history/path/held-sequence validation | FRESH PASS: 9 owned paths, historical planning/handoff bodies and held sequence preserved |
| Rollout; Device checks | NOT RUN: skipped entirely |

Full suites total **6,092 passed / 0 failed / 3 existing live skips**; focused
and probe runs are additional checks, not added again to that total. No new
skip, assertion weakening or observed product flake. Three live skips are one
activity-maker and two quiz-generation cases, deliberately outside offline
authorization. No provider request or private source generation occurred.

One commentary update prematurely called the aggregate green before web had
returned; it was immediately corrected. Only the completed 575/76 web result
and timestamped command ledger establish the final full-suite count.

## Owner steps remaining — exact native evidence and material choices

- **Device checks: NOT RUN**, skipped entirely. Native resume text is
  **UNRESOLVED / UNREPRODUCED**; cause-specific repair is **BLOCKED** on essential
  native attribution. Exact question recorded for the owner, not sent unattended:
  what original FS7 route order/background dwell/Appearance state and active OTA
  reproduce the missing labels, and do those labels disappear simultaneously on
  the physical screen and capture? Recover the original FS7 captures first;
  this checkout does not contain their route/dwell record.
- With separate authorization, pin Realme model/Android build fingerprint,
  exact 2.3.0/code 7 APK hash above, runtime 2.3.0-sdk57, active update/channel and
  source revision. Distinguish FS7 `01a162a3` from later `01a16304`; do not
  silently switch updates, install, reset or discard pending work. Repeat the
  recovered exact route/dwell, then ten background/foreground cycles. Record
  same-route resume, Today/Generation without submission, and Settings >
  Appearance > Today separately, Light/Dark/Automatic and Reduced Motion.
  Synchronize AppState/focus/route, Activity/window/surface/GL identity and
  Text/view/font/error markers with physical observation versus capture at
  resume and bounded 1/5/15/30/55-second follow-ups. Record first/last failure
  timestamps, never infer a 54.9-second duration from the historical follow-up.
  Observe page/tab labels, SVG labels, native clock fallback and GL clock
  separately, using public/empty content and redacting academic data/credentials.
- **Rollout: NOT RUN**, skipped entirely. Owner review and separate authorization
  are required for any push, deployment, Google worker/Scheduler/provider/email
  operation, remote SQL/migration, EAS/OTA, native release build/install or
  spending. No such operation or environment-file edit occurred here.
- **UNVERIFIED (owner to confirm):** live revisions, active binary/OTA, applied
  migrations/database state, regions/queues/Scheduler/providers, authenticated
  web/native acceptance, physical latency/RAM/GPU/font/compositor behavior and
  tester/release readiness. Local operation counts and test/build times do not
  establish startup, Web Vitals or production P50/P95.
- Larger material choices remain for review: API supersession-contract/query
  plans; image-ready badge semantics with held LC1; actual stage timing before
  AI changes; compatible native packaging/import experiments; reader rendering
  changes only after target-device profiling with complete content/features.
  PBR-MB1/PBR-LP1/PBR-AS1/PBR-LR1 stay HELD, with PBR-RT1 still STOPPED.
- Vercel CLI is unavailable. Strongly recommend `npm i -g vercel` for future,
  separately authorized environment/deploy/log tooling. No install or Vercel
  command ran during this local-only task.

## Finding R1 — fresh complete long-reader host profile

2026-10-22T18:40:45.106Z; working source hashes in `identity.json`, mobile
source 2.2.0/code 6/runtime 2.2.0-sdk57, no active OTA observation. Owning paths:
`apps/mobile/src/features/reviewer/ReviewerReader.tsx` and discovered literal
web counterpart `apps/web/src/features/reviewer/reviewer-reader.tsx`.
Both retain full section/block rendering and deferred/memoized search.

Command: `node node_modules/vitest/vitest.mjs run --config
tmp/overnight/PBR-AF1/reader-probe.config.ts --maxWorkers=1 --reporter=verbose`.
Ignored probe uses actual mobile reader plus React test renderer and the existing
SectionScrubber test's native/theme/auth/visual adapters. Public fictional
fixtures contain four blocks per section, six repeated explanation sentences,
five key points and two examples per block. No owner session, live image request,
provider, paid generation or private text. Reduced Motion is true in this host.

| Sections / blocks | Complete text segments / anchors | Characters | Host nodes | Local act mount / search ms |
| --- | --- | ---: | ---: | ---: |
| 12 / 48 | 444 / 12 | 16,782 | 2,913 | 234.262 / 219.779 |
| 120 / 480 | 4,440 / 120 | 174,090 | 28,833 | 647.192 / 1,835.517 |

**FRESH 2 passed / 0 failed / 0 skipped / 1 file**, first attempt.
Every original section/title/explanation/key point/example remains present
before and after searching the unique last-block sentinel. Mobile/web navigation
models, anchors and exact matches agree. Raw React Profiler phases and full
host measurements are saved immediately in `reader-probe-1792694445107.log`.
Existing search/jump/scrubber tests also pass 21/21 and both full client suites
are fresh. Source recheck retains image alignment, selection/assists, search
anchors, accessibility and all export formats; none changed by the Library fix.

**MEASURED HOST COST / SOURCE-INFERRED device concern**, high confidence in
the local node/content counts, low confidence in device attribution. There is
no failing content assertion or attributed redundant reader operation in this
probe. Full rendering scales with content; act timings include development
React, stub host rendering, effect work and deferred updates. They are not
physical input latency, native layout/rasterization, memory pressure, INP or
device stutter. Search changes highlights throughout the complete document, so
this measurement alone does not justify speculative memo boundaries or
virtualization that could lose anchors/selection/images/state. **No reader fix
claimed**; next action is the pinned-device long-content trace before choosing
a material rendering change. Native selection/image/export performance remains
OWNER-TO-VERIFY; source features and existing regressions are preserved.

## Fresh final export inventory

Standalone outputs were inventoried immediately after each build, before the
root build overwrote output directories. Per-file byte counts and SHA256 are
in `web-build-inventory.json` and `android-build-inventory.json`; normalized
summary is `artifacts-summary.json`. These are separate from the release APK.

| Boundary | Fresh local result | Comparison / limit |
| --- | --- | --- |
| API Next build | 37/37 static pages; Today NFT79 / mixed experience NFT1,310 files | File membership, not cold-start duration or deployment bytes; no API runtime edit |
| Web Next build | 23/23 pages; Today 213kB / Library 223kB First Load JS | Same reported route units as PBR0, no web speed improvement claimed |
| Web emitted JS chunks | 71 files / 2,585,223 raw bytes / 821,493 local gzip bytes; CSS 97,462 bytes | Same chunk totals as historical PBR0; not route transfer sums |
| Standalone Android export | 38 files / 14,668,897 bytes; HBC 10,946,724 bytes | PBR0 historical HBC 10,945,101: +1,623 bytes; no APK saving claim |
| Existing APK | 132,024,227 bytes, exact SHA256 above | Unmodified existing 2.3.0/code 7 binary; source/export units deliberately separate |

New HBC SHA256 `d1a4269352d157df265189bf1c7bdf5ffcecbd48998587eca6d1954120d4492e`.
All fonts, tutorial, clock atlas, sounds and native modules/ABIs remain.
No native release build/install or packaging/signing/runtime change occurred.
First summary included two Next build-manifest JS files (73 total); narrowed to
`static/chunks` for the like-for-like PBR0 comparison above. The initial API
package counter only matched forward-slash paths; final root trace normalizes
both separators. Overall trace counts remain79/1,310, with375 PDF.js entries
on the mixed route and none on Today. No unsafe trace narrowing was attempted.
These helper corrections required no product, assertion or build change.

## Final local acceptance

**PASS for PBR-AF1 mandatory LOCAL audit/repair/gate scope**, implementation
`ef80dfc6`. Every frozen local row is complete; this does not close native
acceptance, PBR-RT1, beta/release readiness or any held dependent task.

| Row | Final result |
| --- | --- |
| I0 | PASS local identity/inventory; active binary/OTA/live state OWNER-TO-VERIFY |
| B0 | Local source/coverage audit complete; native text UNRESOLVED / UNREPRODUCED; native repair BLOCKED on essential attribution |
| B1/D1 | PASS local experience/repository counts, exact results and safe failure; database plans/production latency unknown |
| D2 | FIXED WITH LOCAL PROOF: same 300-item fixture 604 -> 2 summary reads, 302 -> 2 stats reads, max 1 active summary call; full results and owner/error/progress retained |
| S1/S2 | PASS existing APK/source/export audit; no native build or APK saving claimed |
| R1 | PASS complete-content host profile and navigation equivalence; device rendering/selection/image/export performance OWNER-TO-VERIFY, no reader fix claimed |
| O1/A1/U1 | PASS bounded source recheck; existing product/measurement/accessibility concerns remain explicitly inferred or unknown, held scope untouched |
| G | PASS all mandatory serial offline suites/builds/forced gates and diff hygiene; 6,092 full-suite passes, 3 existing live skips, 0 failures |
| C | PASS scoped local code/doc commits, reconciled current planning and durable handoff; exact commit IDs in Git and status file |

No feature, content, token, font, ABI or module removed. No dependency, native
release config, migration, auth/RLS/grant, provider, deployment or environment-file
change. Generated API/web next-env.d.ts edits were inspected and restored to
initial tracked content; final forced typecheck again passes 8/8, zero cached.
No further test rerun is needed for documentation-only closure. ADR: NOT
APPLICABLE, no architectural decision. First failures/harness corrections are
retained above; no failed gate left unresolved, no product flake observed.

Commits before the final documentation checkpoint:

- `8d6e60a3 docs(perf): freeze PBR-AF1 renewed audit acceptance`
- `da8daa6f docs(perf): checkpoint reproduced Library read amplification`
- `5ca0ca9f docs(perf): checkpoint verified Library repair and renewed inventories`
- `3074a473 docs(perf): preserve PBR-AF1 progress and held roadmap boundaries`
- `54aef02b docs(perf): checkpoint fresh PBR-AF1 full-suite results`
- `ef80dfc6 perf(library): coalesce owner-scoped local refresh reads`

Final checkpoint: `docs(perf): close PBR-AF1 local acceptance`; its exact hash
is recorded after committing in Git and tmp/overnight/PBR-AF1.status.

## Sanitized evidence index

All paths below are relative to ignored `tmp/overnight/PBR-AF1/`. Only these
metadata and findings are committed; logs, fixtures, exports, screenshots and
private/generated artifacts are excluded. `commands.jsonl` records exact commands,
UTC start times, completion HEAD and exits. SHA256.json preserves this index.
No new screenshot/device capture was collected.

| Artifact | Bytes | SHA256 |
| --- | ---: | --- |
| `identity.json` | 1537 | `9f075df07739066818bc996570085ee206a4f5cc8b9fe3d6d73f0bb57782cb2a` |
| `apk.json` | 334312 | `3281dbca18f8564fe987019de36f5783338e7e2ddde88f1084a34c83bcbc077e` |
| `artifacts-summary.json` | 1253 | `5240528ea642ee12c3ce4ecde89ec68701c767a854e642875956591a7191c8bf` |
| `repository-probe.ts` | 3989 | `28707d41eacd418106e7d44b10f7a55c3e933dc3ac6c366bd0d4da6e716b282f` |
| `reader-probe.test.ts` | 7361 | `0a755624012122613b1c2b970787617240f10017ed17a7c882c0041670942b1e` |
| `reader-probe.config.ts` | 448 | `ff7b77c99a183f20d00e2a3fc0c91a7cadfe2a4994d70785f9cd379b6e3c004b` |
| `library-1792692397781.log` | 7648 | `af66eb1df7cc434977a5d9ac72e582139ef72aebb22e8fc29196bbd1b4a621d6` |
| `resume-1792692256976.log` | 889 | `b6b35106045c6afe3859c2710cd08576c5c9c25626c9ed7455bb3005e891531c` |
| `library-1792692623605.log` | 885 | `0ef9c4c27d71f32c8c9dc7f883135ee5c9e90a3458f98759bb6205b05ce5b90c` |
| `service-1792692695077.log` | 1863 | `ed01b5e86497d7e9cb33e0960a046c4eb0ec3d2f3e947714c032bded941db95d` |
| `reader-probe-1792694445107.log` | 2317 | `97df587c2a45da42436f667f17690d45eab6130ba4799d4287b7d645176ff403` |
| `shared-1792692828938.log` | 330 | `fb3879902a0633d2647f14f0537e8ad5908172b2d815b5aac6bf97e95b1792b5` |
| `canvas-1792692843801.log` | 344 | `2470035c593e42c1306af1da9c602d56f21ed145b6ce40c9a1c225252adcfb97` |
| `ocr-1792692845789.log` | 318 | `c5cbb229f13f9ad1dd6deecc6708909b3761f046f369c84d29a7a0a468566d82` |
| `engine-1792692847769.log` | 87493 | `019326daa322e0df582a3ad7be81425044912e04f9af05488a75d31ba8d4920b` |
| `api-1792692877127.log` | 718 | `9367d420dc89971f5a294ebe6d3fc7caa21a1658f0e99b561c255333f3caad16` |
| `mobile-1792693082745.log` | 708 | `3f465b683006080b7292eff3f536156553e46b3609183a883715204840bf06ed` |
| `web-1792693157902.log` | 699 | `a8973044339414057c432edbcd6d15d28cfb24e0292e0cfd1e73606c46623573` |
| `typecheck-1792694479196.log` | 2529 | `bc80120633a203faefb4e981739b4ca73e2a234729dc3185dd987881200529d5` |
| `lint-1792692704310.log` | 4092 | `b571e6c6f81c030dbfdd8b4ea488954bf18bdba7d8c8bad740ee440491c01142` |
| `api-build-1792693488814.log` | 8379 | `93ae6b8b8af1cdf0287b183f029b68505ca4c71cba1f8c869e3e2250c01787b9` |
| `web-build-1792693629763.log` | 3506 | `99d92ed0ae33ca7383de27da24eef3b181b3f022591977744791cef5427407c2` |
| `android-build-1792693689910.log` | 3514 | `1f9a306a2569b1c8b91fa34bdfe4dd9e2a77ab5b6488175181e2cda49e15a020` |
| `root-build-1792693909244.log` | 27596 | `b5b2cacb46dd6e515e8b0277f1baa787b8015e662b8d5b8d50b0a2177067055d` |
