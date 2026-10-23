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
