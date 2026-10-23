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
