# PBR-LR1: long reviewer rendering

2026-10-23. Authorized finite LOCAL scope: LR1 only, after actual AS1 PASS.
Initial HEAD `d747fcd2`, branch `overnight/2026-10-15_feedback`, 30 ahead /
23 behind the local upstream snapshot (no fetch). No tracked edits; unrelated
untracked UI/, apps/mobile/.gitignore and supabase/.temp/ remain owner files.
Current prompt supplies manual owner approval of the existing finite roadmap.

## Acceptance frozen before runtime changes

| Row | Preserved requirement / proof | Initial result |
| --- | --- | --- |
| 0 | Root AGENTS/AUTOPILOT, current plans, recent handoff, PBR0/AF1/MB1/LP1/AS1/recovery and runner BACKLOG. Actual predecessor status PASS and all reported status commits reachable under HEAD. No source/privacy/data-loss contradiction. | PASS; live state UNVERIFIED (owner to confirm) |
| 1 | Synthetic empty, short, long and very long complete reviewers. Exact source lengths/counts/hashes, raw samples, tool/script identities, warmup/sample counts, parent updates, search/anchors and memory proxies. | Pending |
| 2 | Remove only attributed redundant processing/allocation or retain measured no-change verdict. Regression proves operation counts AND complete equivalence across identity/content/owner/unmount boundaries. | Pending |
| 3 | Repeat identical fixtures/schedules and compare full ordered output, source/search/anchor/equivalence hashes, calls and descriptive timings. | Pending |
| B | Full text/order/headings/anchors/search/selection/images/media/accessibility/exports/offline behavior preserved. Owner switches/cancel/unmount discard stale results; no cross-owner cache. | Pending |
| G | Focused regressions, full API/mobile/shared suites; web suite if changed (also useful as read-only counterpart coverage). Fresh forced typecheck/lint, explicit API build, Android offline JS/assets export, explicit web build if changed, forced serial root build, staged/unstaged diff hygiene. | Pending |
| C | Reconcile current-state/roadmap/current_sprint, append handoff, atomic owner-authored local commits, ignored progress/status and evidence custody. | Pending |

## Source discovery and measurement contract

Actual mobile `apps/mobile/src/features/reviewer/ReviewerReader.tsx` and web
`apps/web/src/features/reviewer/reviewer-reader.tsx` map the complete reader;
neither virtualizes text. Both memoize segments/search and defer queries.
Navigation helpers preserve segment IDs, accent-aware offsets and heading rules.
Mobile scrubber uses measured refs; web uses topic IDs/IntersectionObserver.
Both TopicAssist wrappers memoize selectTopic but currently JSON serialize the
complete owner/reviewer/section/canonical-content React key on every parent
render. This is a candidate to measure, not yet an optimization claim. Mobile
also rebuilds an image section map; web looks up visuals in complete image data.
Do not claim those existing designs as new work without attributed evidence.

StudyText/parseStudyText render generated assist answers, not the reader's
original paragraphs. Images are owner/version/token scoped by existing loaders;
offline presentation prefers private files and preserves metadata. Selection
and assist stores retain exact canonical content. Shared study-export builders
read the saved model separately; reviewer PDF and draft PDF/DOCX/PPTX stay local.
Relevant ADR-042/043, topic tools and export design remain unchanged.

Use public fictional fixtures only, with explicit paragraphs/headings/lists/
tables/code/math/link/image counts and no remote fetch. Retain new scripts,
fixtures, original attempts, JSON results and SHA256s under ignored
`tmp/overnight/PBR-LR1/`; inherited probes/evidence are read-only inputs.
Node/React test-host measurements include development React, mocks, effects and
deferred updates. Heap-used deltas/node counts/string lengths are host proxies,
not retained native memory, frames or production percentiles. No minimum timing
gain is required; exact reduced work plus unchanged behavior is the criterion.
If no safe measurable repair survives comparison, report no runtime change.

Use the inspected loopback-only Node guard plus environment-file read exclusion,
repo-local TEMP/TMP/TMPDIR, npm/Expo offline, EXPO_NO_DOTENV=1, telemetry off,
local-only Turbo cache and loose environment mode. No dependency installation,
environment-file read/edit, provider/service call or remote operation.

## Owner steps remaining

Rollout and Device checks are skipped entirely: NOT RUN. Active Realme full OTA/
runtime/channel/embedded identity, safe public isolation, physical rendering/
frames/RAM, authenticated browser, deployed revisions/database/applied migrations/
Scheduler/provider and production state are UNVERIFIED (owner to confirm).
RT1/EV1 STOPPED, RT2 physical STOPPED / resume-text INCONCLUSIVE and deferred,
and OX2 blocked by OX1 remain intact. Source 2.2.0/code6 differs from archived
2.3.0/code7. No native/release/beta readiness inference from local evidence.
No push/deploy/SQL/migration/email/Google worker/Scheduler/OTA/EAS/native build/
install/device/account action or spending. This finite roadmap endpoint does
not authorize another initiative, task publication or physical repair retry.

## STEP 1: fresh baseline and supported repair boundary

FRESH corrected full-reader probe: **2 passed / 2 files / 0 failed / 0 skipped**
at `5f3bf300`, before runtime edits. Each client runs 0/1/12/120/240 topics,
one warmup and three measured schedules per size: 30 measured schedules plus
10 warmups across the clients. Each nonempty schedule mounts, performs three
unchanged parent updates and one identical artifact-prop replacement, searches
the unique last evidence sentinel, clears search, selects a point, then unmounts.
All complete rendered segments are checked after every operation. Web/mobile
segments and anchors agree; canonical-content and saved export-layout hashes
are recorded, alongside raw complete render hashes and React Profiler phases.

Each topic has four blocks, 24 prose paragraphs, five headings, four key-point
lists / 20 items, four tables, four whitespace-sensitive code examples, four
formulas, four sentinel examples and 24 literal link occurrences. No image
reference in these text stress fixtures; image states are covered separately
by existing public synthetic loader/offline/visual tests. Full model JSON lengths
(UTF-16 code units) are 194 / 4,562 / 52,737 / 532,013 / 1,070,213 respectively.
Original links, literal markup, accents, Greek and surrogate pairs are preserved.
The reader does not run parseStudyText on this original content; the standalone
assist-answer parser fixture is recorded separately and will remain unchanged.

At 240 topics, each complete schedule serializes identical full-content identity
keys **2,640 times / 11,637,780 code units on mobile**, and **2,400 times /
10,579,800 on web**. Mobile's mount effect adds one parent render. The first
three unchanged updates plus identical artifact replacement alone add 960 calls
per client. Existing memoized source/search derivations are retained; deferred
query changes intentionally remount topic controls and must keep doing so.

Supported narrow repair: memoize only the existing JSON key computation in each
TopicAssist wrapper, with owner and existing memoized selection dependencies.
Keep the full exact serialized value, not a digest or abbreviated identity.
No global cache, content cap, virtualization, effect suppression, image-map
change or reader component rewrite. New model objects still compute their key;
equal content retains state, changed content/owner/reviewer/section resets it.

Failing regressions before repair: focused mobile **361 passed / 1 failed /
28 files**, web **65 passed / 1 failed / 11 files**; only new removed-work
expectation fails (five serializations instead of one). Existing semantics and
new owner/lifecycle tests pass. Original logs retained, not waived gates.

Original probe attempt: mobile circular JSON from mock Page's raw React-element
props; web assertion repeatedly traversed the entire tree and was deliberately
interrupted (worker error retained; 1 failed test / 1 worker error, no completed
web sample). Second: web passed, mobile still hit the mock serialization issue
(1 passed / 1 failed). Corrected mock renders header/overlay children and omits
their raw element props; web verification builds one segment index per snapshot.
Each schedule now has its own EventTarget, avoiding Node's capture-listener
warning across repeated synthetic mounts; product listeners are unchanged.
Third full attempt passes. Discovery-only Windows wildcard/guessed ADR/helper
path errors are retained in session history; no product assertion is removed.

Exact scripts, corrected script hashes, baseline sources, tool versions and
original attempts are in ignored PBR-LR1/. Guard rejection proof: 3/3 PASS
before actual outbound access or environment-file reads. Timings and heap
deltas include test renderer/mocks/spies/effects and are descriptive host
proxies; temporary JSON/verification allocations and GC prevent interpreting
heap deltas as retained reader memory. Native, authenticated browser and
production evidence remain NOT RUN / UNVERIFIED.

## STEP 2 and STEP 3: exact key reuse, unchanged complete results

Only `TopicAssist.tsx` on mobile and `topic-assist.tsx` on web change at runtime:
the existing full JSON key is computed with useMemo using owner/selection.
All original identity values, child props, hooks, effects and content remain.
There is no module/owner cache; React may safely recompute the same value.
The selection was already memoized by reviewer-object/section identity. A new
model object computes its key even when content is equal, preserving the exact
previous state/reset behavior. Deferred-query outer keys still remount controls.

Added three meaningful tests per client: exact work count with full serialized
key and active-answer/tree equality, old-owner/unmounted pending results, and
reviewer/section/missing-selection resets. Existing exact-content reset tests
also pass. FRESH focused reruns: **mobile 362/362 (28 files), web 66/66
(11 files), 0 failed / 0 skipped**. No expectation/test was weakened.

Identical corrected probes after the edit: **FRESH 2/2 PASS, 0 failed/skipped**.
Comparison helper: **771/771 PASS, 0 failed**, including unchanged fixture/probe
script hashes, every schedule's complete output hashes, source/model length and
hash, ordered segments/anchors, canonical selections, parser fixture, export
layout, node count, search invocation count and React commit count. All five
complete input models are saved as fixtures.json. Runtime file/diff hashes are
in runtime-after.json; baseline originals and tool hashes are retained separately.
The two corrected cohorts execute serially, each in fresh Vitest processes;
installed Node24.16.0, React/test-renderer19.2.3, Vitest4.1.11, Windows x64.
One warmup per size per client, then three samples; fixed order, warm OS/module/
JIT caches possible. No cache purge or randomized experiment.

| Topics / complete segments | Mobile key calls before -> after | Web key calls before -> after | Key output code units mobile before -> after | Web before -> after |
| --- | ---: | ---: | ---: | ---: |
| 0 / 0 | 0 -> 0 | 0 -> 0 | 0 -> 0 | 0 -> 0 |
| 1 / 45 | 11 -> 3 | 10 -> 3 | 47,575 -> 12,975 | 43,250 -> 12,975 |
| 12 / 540 | 132 -> 36 | 120 -> 36 | 572,088 -> 156,024 | 520,080 -> 156,024 |
| 120 / 5,400 | 1,320 -> 360 | 1,200 -> 360 | 5,786,220 -> 1,578,060 | 5,260,200 -> 1,578,060 |
| 240 / 10,800 | 2,640 -> 720 | 2,400 -> 720 | 11,637,780 -> 3,173,940 | 10,579,800 -> 3,173,940 |

Calls are deterministic in every warmup/sample. Each client retains three
serializations per topic: mount, search remount, clear remount. Four unchanged
parent updates add **zero**, versus one per topic per update previously.
The 240-topic schedule avoids 8,463,840 mobile / 7,405,860 web code units of
repeat serialization. These are UTF-16 output-length/work proxies, not bytes
of measured retained heap; JS interning/GC/string storage are not inferred.
The memo holds one key reference and dependency tuple per mounted topic, while
the complete canonical selection and React key were already retained.

**No rerender reduction, retained-heap saving or host/device speedup is claimed.**
Commit counts stay mobile 13 / web 12 for each nonempty schedule, and 6 / 5
for empty; 240-topic final host node counts stay mobile 64,362 / web 40,822.
Source/search derivations stay one segments execution and three reader searches
per nonempty schedule (plus one explicit test oracle search). Original reader
prose invokes no StudyText parser; the independent assist parser sample is
unchanged. Full search, selection, emphasis and code whitespace remain equal.
Images/offline behavior/accessibility are additionally covered by fresh focused
and full client/shared suites; exports use unchanged complete saved models.

Descriptive median act intervals in milliseconds (three measured samples each):

| Client / topics | Mount before -> after | Identical-prop parent update | Search |
| --- | ---: | ---: | ---: |
| mobile / 120 | 1009.201 -> 1002.704 | 665.842 -> 715.993 | 1609.062 -> 1099.201 |
| mobile / 240 | 1946.286 -> 1927.473 | 938.481 -> 936.989 | 2218.922 -> 2276.480 |
| web / 120 | 140.234 -> 138.013 | 151.139 -> 151.974 | 784.203 -> 888.470 |
| web / 240 | 682.340 -> 673.659 | 641.138 -> 730.302 | 1743.028 -> 1836.563 |

Mixed timing movement is not evidence of a latency gain; the exact removed
serialization is the supported result. Hashing/equality verification is outside
timed act calls. Raw individual samples/Profiler phases/heap deltas remain in
mobile-before/after.json, web-before/after.json and comparison.json; no samples
are discarded except explicitly labelled warmups. Heap deltas include snapshot
serialization, spy retention, verification allocations and uncontrolled GC, so
they do not establish reader RAM or peak-memory improvement. This small pure
derived-value repair leaves full rendering, owner privacy, failure checks,
source completeness, media, semantics, exports and pagination unchanged.
No ADR is needed. Mandatory full gates and final closure follow below.

React performance review: both new hooks are unconditional pure computations;
owner and the existing memoized selection cover every serialized input. No
mutable ref, callback, subscription, dependency, accessibility attribute or
conditional branch changes. Dropping React's memo only recomputes the same key.
The tests verify state/lifecycle behavior as well as work counts; they do not
replace an output-equivalence check with an implementation-only assertion.

## Final mandatory local gates

All successful rows below are **FRESH**, with zero failed tests and no new
skip or observed product flake. Turbo reports 8/8 successful and 0 cached for
each forced root gate. Compiler/Metro/OS caches may remain warm. Commands run
serially through the inspected loopback-only offline runner, local temp, no
environment-file reads, telemetry off and local-only Turbo cache.

| Exact command | Result | Seconds |
| --- | --- | ---: |
| `npm run test --workspace @stay-focused/mobile -- src/features/reviewer src/services/reviewerImages.test.ts src/services/localLibrary/offlineImagePresentation.test.ts src/services/localLibrary/useOfflineReviewerImages.test.ts src/features/export --maxWorkers=2` | Test Files  28 passed (28); Tests  362 passed (362) | 10.059 |
| `npm run test --workspace @stay-focused/web -- src/features/reviewer src/app-model/reviewerNavigation.test.ts src/features/study-export --maxWorkers=2` | Test Files  11 passed (11); Tests  66 passed (66) | 4.637 |
| `node node_modules/vitest/vitest.mjs run --config tmp/overnight/PBR-LR1/probe.config.ts --maxWorkers=1 --reporter=verbose` | Test Files  2 passed (2); Tests  2 passed (2) | 185.709 |
| `npm run typecheck -- --force` | Tasks:    8 successful, 8 total; Cached:    0 cached, 8 total | 38.105 |
| `npm run lint -- --force` | Tasks:    8 successful, 8 total; Cached:    0 cached, 8 total | 51.142 |
| `npm run test --workspace @stay-focused/shared -- --maxWorkers=2` | Test Files  74 passed (74); Tests  716 passed (716) | 15.188 |
| `npm run test --workspace @stay-focused/mobile -- --maxWorkers=2` | Test Files  174 passed (174); Tests  1661 passed (1661) | 61.778 |
| `npm run test --workspace @stay-focused/api -- --maxWorkers=2` | Test Files  214 passed (214); Tests  2455 passed \| 3 skipped (2458) | 165.969 |
| `npm run test --workspace @stay-focused/web -- --maxWorkers=2` | Test Files  76 passed (76); Tests  578 passed (578) | 156.506 |
| `npm run build --workspace @stay-focused/api` | PASS; artifact identity retained below | 114.112 |
| `npm run build --workspace @stay-focused/mobile -- --platform android` | PASS; artifact identity retained below | 128.908 |
| `npm run build --workspace @stay-focused/web` | PASS; artifact identity retained below | 47.869 |
| `npm run build -- --force --concurrency=1 --env-mode=loose` | Tasks:    8 successful, 8 total; Cached:    0 cached, 8 total | 364.619 |

Full relevant suites: shared 716 /74 files (including emitted copies), mobile 1661
/174, API 2455 /214 plus 3 existing live skips, web 578 /76: **5,410 passed /
0 failed / 3 existing live skips**. Focused mobile 362 + web 66 are overlapping
coverage, not added to the full-suite total. Synthetic reader before/after probes
2/2 each and strict comparison 771/771 are separate evidence. API workflow/provider
contract commands are NOT APPLICABLE to this pure client computation change;
no live provider/database/device suite is run.

First forced lint: 5/8 successful tasks, 0 cached, web failed on 3 new test
react/no-children-prop errors. Corrected createElement calls to pass children as
arguments in both new test groups; no assertion or lint rule changed. Rerun
8/8, 0 cached, 0 errors, six existing warnings. Fresh forced typecheck repeated
after this test-only edit: 8/8, 0 cached. Full suites exercise the final test code.
Original failed logs/red tests/probe attempts are preserved. The runtime source
hashes still match the successful after measurement, checked by gate-report.cjs.

Standalone API build ID: aOabaeQhG6XxVqwcjXvvK. Standalone web:
eTzj6GBH6Ra2j0yPwoopN. Android JS/assets export:
38 files /14,671,742 bytes, all copied unchanged
with individual SHA256s under standalone-android-export/. Root build IDs:
API R71mSox2ecfjg4-innZ3C, web vPP6OJgNGEDHbfHbi48-K; mobile
84 files /35,320,978 bytes across Android/iOS/web. These are local
artifacts, not a deployed revision, new native APK, OTA or size-saving claim.
Build logs and per-file hashes are retained; no generated artifact is staged.

Acceptance rows 0, 1, 2, 3, B, G pass for the mandatory LOCAL scope. Closure row C
finishes with the planning/handoff reconciliation, source/custody verification,
diff/index checks and scoped local documentation commit below. Physical/native/
authenticated-browser/production performance stays NOT RUN / UNVERIFIED; the finite
roadmap endpoint authorizes no further task, physical retry or release.

FRESH standalone and root page generation: API 37/37 and web 23/23. Both
Next-generated next-env.d.ts files were inspected and restored byte-for-byte
to the initial source; final forced typecheck after restoration is 8/8,
0 cached. No generated declaration or output is included in the commits.

## Closure checkpoint

Implementation/tests/measurement report committed as e1bde90c. Three current
planning documents reconcile the finite LOCAL endpoint; handoff appended without
rewriting its historical prefix. Original tracked inputs outside the nine owned
paths, inherited probe/guard/status hashes and historical planning text are
verified by verify.cjs. All 23 unrelated owner-file hashes also match the prior
AS1 custody snapshot; no environment file is read. Final verification count and local documentation commit
are recorded by verification.json, Git and PBR-LR1.status. Staged/unstaged diff
checks are required at that final commit boundary. RowC then PASS; no remaining
mandatory LOCAL code/gate work. All Owner steps remaining above are NOT RUN.

Final FRESH verify.cjs: **2,135/2,135 passed, 0 failed**, including original
source, inherited statuses/probes, 23 owner artifacts, historical text and new
document links. Both git diff --check and git diff --cached --check pass at the
final scoped commit boundary. SHA256.json indexes all retained task evidence.
