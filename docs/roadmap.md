# Roadmap

## Tester feedback SP1 complete locally (2026-10-15)

**PASS for the unattended SP1 code scope.** Mobile and website render owner-scoped saved Today, Courses, course pages, Tasks/Work, Library and Reviewer content before background requests. Static Syncing/Updated/Retry status preserves saved content on failure; open reviewers require an explicit tap to accept a changed revision. Exact course-page offsets, stable course/list positions, sign-out purge, account-switch isolation and browser storage fallback are covered. Code tip: `15811de`; [acceptance](ai/acceptance/sp1-cached-first-screens.md), [ADR-027](architecture/ADR-027-cached-first-screens.md).

FRESH final verification: forced typecheck and lint **8/8 tasks each, zero cached**; mobile **1,036/1,036 in 105 files**, shared **223/223 in 19 files**, web **94/94 in 16 files**, no skips. Standalone API/website/Android builds pass **1/1 each**; forced repository build passes **8/8, zero cached**. Lint retains five existing warnings/zero errors. First mobile gate was **1,032 passed/4 failed** (schema-version and header-position fixtures); focused repair **77/77** and full rerun pass. Draft failures remain recorded; no flake observed. API tests are NOT APPLICABLE because API source is unchanged.

Production/deployed revision, actual first-content latency and physical/browser RB3 behavior are **UNVERIFIED (owner to confirm)**. Rollout and Device checks were entirely skipped. **Owner steps remaining:** preview OTA, website deployment, then RB3 saved reopen, airplane-mode Retry, second-account isolation and open-reviewer checks. No remote service call, remote SQL/migration, Scheduler action, environment-file change or push occurred. Next separate item: CQ1; this run does not start it.

## Tester feedback SP0 complete (2026-10-15)

**PASS, docs only:** [SP0 speed audit](architecture/sp0-speed-audit.md), commit
`588bbf1`, establishes screen/cache/API/query/sync/hosting baselines and ranked
code-only fixes plus owner region/capacity decisions. SP1 should reuse mobile
SQLite Library behavior and add missing screen snapshots; CQ1 must account for
term/enrollment evidence absent from stored courses; SP2 starts with preparation
N+1 and exact-id/summary reads. No later item's implementation was started.

FRESH web build PASS (19 static pages, 28 routes), mobile Library 9/9 tests,
final hook probes 2/2, synthetic service observations 12/12, docs hygiene PASS;
failed harness/tooling attempts are recorded. Actual production/device timing,
CIT17 Default Term counts and deployed region/capacity remain **UNVERIFIED
(owner to confirm)**. Owner-present rollout and Device checks remain excluded.
This supersedes the F0S "SP0 next" statement below; next separate item is SP1.

## Tester feedback F0S complete (2026-10-15)

**PASS:** the autopilot base is now `overnight/2026-10-15_feedback`, created
from released GitHub `main` `079986c` (PR #10). All 37 overnight-added migrations
and all added source paths are present; unrelated untracked files remain intact.
This supersedes the older local Git/PR-pending state below, without asserting
production or device acceptance.

FRESH baseline: typecheck/lint/build 8/8 each, zero cached; lint zero errors/five
existing warnings; shared 134, Canvas 75, mobile 1,026, web 84 tests passed.
API's first run had 2,095 passed, three skipped and one 5-second timeout; its
unchanged full rerun passed 2,096 with three skips (179 files). See the F0S
handoff for exact commands and evidence. Production/device state is
**UNVERIFIED (owner to confirm)**. Owner steps remaining: none for F0S.

Next separate item: SP0 speed audit, docs only, before implementing speed fixes.
F0S ends at local baseline verification and documentation; no later roadmap item,
deployment, remote migration, environment edit or push is included.

## Realignment and mobile visuals parity in progress (2026-10-15)

Owner-approved finite scope: realign to main 150df38 (PRs #7/#8), deliver
JS-only mobile automatic reviewer visuals and inline lazy course visuals,
pass all quality gates, merge by PR, publish preview OTA, then verify existing
Reviewers and finish notification/offline checks on the realme. No new manual
Reviewer generations: the two PDF/PPTX smoke generations are complete.

Main was fast-forwarded from d0fa50b to 150df38; pre-realignment edits are
preserved locally on wip/pre-realign-20261015 at 6ad67bf. Clean-main fresh
root typecheck passed 8/8 before edits. Cloud Run generation-worker-00027-rz2
serves 100% from 150df38; authenticated health 200, unauthenticated 403.
Supabase migration 20261015020000 was already applied and remains untouched.

Mobile parity branch feat/mobile-reviewer-visuals-parity now has 1,024 passing
mobile tests in 102 files (+15), fresh root typecheck/lint 8/8 and Expo Doctor
21/21. Fresh root build also passes 8/8 (2m45.765s). PR/CI/merge, OTA, and physical acceptance are pending.
Finished APK 12ab0357 (2.1.0/code 4, source f989710) is kept; mobile parity
will arrive through OTA on runtime 2.1.0-sdk57. The existing account is preserved.
Canvas schedule stays enabled every five minutes; owner automatic reviewers
are restored. Broad student email stays off because no sending domain is owned.
See [release evidence](ai/acceptance/release-20261014.md); older entries below are historical.

## VL3 Find a visual completed locally; rollout pending (2026-10-14)

**Code complete; unattended run FAILED on the validation-temp guard.** Initial
full API tests cleaned their own synthetic directories in Windows Temp before
TEMP/TMP were redirected into the repo. Final API rerun uses repo-local temp;
the incident is recorded in the handoff and requires owner review before rollout.
The Visual Reviewer now supports explicit
Commons-only external references for sections without source snapshots/figures.
License/attribution filtering, five-candidate search, at most three vision checks
at 0.90 confidence, exact-version section cache, one Find another and a serialized
20/owner/rolling-day reservation cap are implemented. Provider failure never
becomes a cached no-result. No preparation/sync/generation/pre-render search.

Mobile uses a separate labeled card and the existing zoom sheet, with attribution
and legal links, honest no-result copy, and positive reachability/source discovery
before showing its quiet action. Canonical prose/source evidence and offline
library payloads remain source-grounded. Existing design tokens only.

Migration `20261014000700_section_external_visuals.sql` is **not applied**.
See [ADR-020](architecture/ADR-020-visual-learning.md#find-a-visual-vl3) and
[VL3 handoff](ai/handoff.md#vl3-unattended-find-a-visual-2026-10-14) for exact
fresh gates and attempts. VL2.1 is present and reused; DOCX snapshots retain their
separate evidence follow-up. Next owner milestone is RB2: apply reviewed queued
migrations via the Supabase connector, deploy API/worker prerequisites, publish
preview OTA and test on realme. VL3 needs API/OTA, no new worker or native module.
Confirm live Wikimedia egress and actual match quality. Rollout/Device checks
entirely skipped; deployed state and physical/provider behavior **UNVERIFIED
(owner to confirm)**. No push or remote change occurred.


## VL2.1 PPTX page snapshots completed locally; rollout pending (2026-10-14)

**PASS for unattended code scope.** PPTX now uses the existing page snapshot renderer and VL1.3 pre-render path.
Preparation converts the accepted original with isolated headless LibreOffice,
with a 60-second deadline, process kill, 20 MiB output / 100-page caps, safe PDF
validation and temporary-file cleanup. Full archive bounds and linked-media
rejection precede native execution. Conversion failure or missing local binary
leaves material prepared and keeps VL2 extracted figures as the fallback.

Receipt identity is owner + Canvas file + exact metadata fingerprint + original
SHA-256. The new forward-only migration
`20261014000600_office_page_snapshots.sql` is written, **not applied**. It
adds a private PDF bucket, immutable service-only receipts with RLS/grants and
server-derived accepted-snapshot fingerprint binding. Changed revisions convert
again, unchanged ones reuse, and historical conversions/originals remain retained.
Old unbound/edited/composite Office sources fail closed; no provenance backfill.

PPTX blocks map pageNumber to slideNumber in presentation order, including blank
and hidden slides. Canonical citations and exact accepted conversion evidence
qualify snapshots. Missing original/converted bytes cannot be bypassed by cache.
Original PDF/local checks, rendering budgets, system exemption, leases and
completion remain shared. Mobile adds From slide n / Slide n labels to the
existing viewer without changing polling, gestures, tokens or offline behavior.
Canvas/synchronous original PDFs keep the 40-page limit; converted page counts
live only in their own rendering receipt. DOCX pagination is not deterministic
from existing blocks, so the permitted PPTX-only scope ships; DOCX snapshots
remain a follow-up, and its VL2 extracted figures continue to work.

Worker image installs only the approved LibreOffice writer/impress components
with --no-install-recommends, apt-list cleanup and writable non-root HOME.
Estimated delta is 250-500 MiB uncompressed / 100-200 MiB compressed; estimated
small-deck startup/conversion is 5-30 seconds. No repository-documented image or
cold-start numeric limit was found. Actual image size, peak RSS, cold start and
native conversion fidelity are **UNVERIFIED (owner to confirm)**; no image build
was run. Exact fresh gates and draft failures are in [VL2.1 handoff](ai/handoff.md#vl21-unattended-office-page-snapshots-2026-10-14).
See [ADR-020 Office page snapshots](architecture/ADR-020-visual-learning.md#office-page-snapshots-vl21).

Final FRESH gates: forced typecheck 7/7 and lint 7/7 (0 cached, 0 errors,
4 existing warnings); shared 133 passed; API 1,997 passed / 3 existing skips
(169 files); mobile 984 passed (95 files); API build 34/34 pages; Android export
1 bundle / 31 assets; whitespace 0 errors. No failed required gate; draft fixture
and syntax failures are retained in the handoff.

Owner steps remaining: review/apply the migration through the Supabase connector
(filename as name, never db push), rebuild/deploy the worker and measure its
real size/cold start/peak RSS, deploy API, publish preview OTA, then RB2 realme
From slide n and conversion-failure figure-fallback checks. Rollout and Device
checks were entirely skipped. Deployed state, prerequisites, migrations/buckets,
queue/IAM/Scheduler, retained source rows and physical behavior are unverified.
No deployment, production service call, remote SQL, environment-file edit, Scheduler
change or push occurred. Next code work requires a separately prompted item.


## VL2 extracted source figures completed locally; rollout pending (2026-10-14)

**PASS for unattended code scope.** Preparation extracts the exact original's
PDF raster figures and PPTX/DOCX media. Named size, area, repetition, count and
time limits remove tiny/repeated decoration and bound work. PDF.js image objects
and a pure JavaScript PNG encoder need no new dependency. Office preparation and
accepted manifests share structural drafts; standalone and composite admission
retain canonical cited IDs. No generated/external image or model caption.

Figures run only after prepared/succeeded completion, outside its transaction.
Failure is code/count-only and leaves preparation successful. Private immutable
rows bind owner + file/asset + original SHA-256; revision receipts also preserve
successful empty extraction. New revisions re-extract, unchanged ones reuse, and
historical rows/originals remain retained under ADR-021. Both migration files
`20261014000400_source_figures.sql` and
`20261014000500_source_figure_extraction_receipts.sql` are written, **not applied**.

Owner-only bearer API routes use private no-store responses, strict canonical
citations and exact accepted material/hash. Batched availability signs no images;
only fully receipted extractions are visible. Opening a section returns at most
12 short-lived signed images. Office requires
the new structural parser, so old flattened snapshots are not guessed into
alignment. Missing/deleted/edited or ambiguous evidence exposes no figures.

Mobile shows the image action only where figures exist, hides it offline, and
opens the existing bottom sheet with page/slide labels, one figure at a time and
the existing bounded pinch/pan/double-tap viewer. Existing tokens, Reduce Motion
and dismissal are retained. Eligible VL1 page snapshots remain the fallback.
Office vector rendering belongs to VL2.1. Durable uploaded local PDFs are covered;
legacy hashless assets and stateless synchronous OCR lack a retained exact
original and receive no guessed figure binding or new asset backfill.

Final FRESH gates: forced typecheck 7/7 and forced lint 7/7 (0 cached, 0 errors,
4 existing warnings); shared 133 passed; API 1,947 passed / 3 existing skips
(166 files); mobile 979 passed (95 files); API build 34/34 static pages;
Android export 1 bundle; whitespace 0 errors. Draft failures, the initial
PGlite timeout and exact validation details are retained in the
[VL2 handoff](ai/handoff.md#vl2-unattended-extracted-figures-2026-10-14).
See [ADR-020 Phase 2](architecture/ADR-020-visual-learning.md#phase-2-extracted-figures-vl2).

Owner steps remaining: apply both migrations through the Supabase connector
(filename as name, never db push), deploy worker and API, publish preview OTA,
then RB2 realme figure/logo/no-icon, zoom, offline and snapshot-fallback checks.
Rollout and Device checks were entirely skipped. Deployed state, applied
migrations/buckets, retained originals, costs and device behavior are
**UNVERIFIED (owner to confirm)**. No remote service call, environment-file edit,
Scheduler change or push. VL2.1 is now completed locally above; DOCX pagination remains a follow-up.

## VL1.3 cited page pre-render completed locally; rollout pending (2026-10-14)

**PASS for unattended code scope.** Manual and automatic Reviewer completion share
one post-commit hook that reserves and dispatches every distinct lowest cited
section page, at most 100, sequentially. The exact accepted standalone Canvas PDF
or unchanged accepted local PDF is resolved once. Edited, Office and multi-source
materials are silent no-ops. Failures log fixed codes/counts and cannot change
the committed Reviewer outcome; completion before a student opens is best effort.

New forward-only migration `20261014000300_system_page_snapshot_prerender.sql`
is written, not applied. Existing/default snapshot rows remain student-origin;
service-only system reservations bypass the rolling 20-render student cap.
Student reservation and claim count student work only; system attempts retain
the three-claim bound, leases and deletion fences. Idempotent reuse never changes
origin. Older reviewers keep their capped on-open fallback. Existing mobile
header discovery shows ready images without a student reservation; no mobile
or EP3 source change was needed.

Final FRESH gates: forced typecheck 7/7, forced lint 7/7 (0 errors, four existing
mobile warnings), shared 133 passed, API 1,896 passed / 3 existing skips (160 files),
API build 34/34 static pages (16 steps / 1 workflow), whitespace 0 errors. Unchanged
mobile snapshot discovery/viewer tests also pass 22/22. Full mobile/Android gates
are NOT APPLICABLE because mobile is unchanged. Draft failures and exact counts
are retained in the [VL1.3 handoff](ai/handoff.md#vl13-unattended-cited-page-pre-render-2026-10-14); see [ADR-020 Pre-render](architecture/ADR-020-visual-learning.md#pre-render-vl13).

Owner steps remaining: apply the migration through the Supabase connector using
the filename as name (never db push), deploy worker then API, and run RB2 realme
new-PDF instant-image / older-reviewer on-open-fallback checks. Rollout and Device
checks were entirely skipped. Deployed revisions, applied migrations, queue/IAM,
Scheduler, retained bytes and physical behavior are UNVERIFIED (owner to confirm).
No remote service call, environment-file edit, Scheduler change or push occurred.
VL2 subsequently completed locally above; EP3 remains committed.

## EP3 preparation status completed locally; rollout pending (2026-10-14)

**PASS for unattended code scope.** EP3 STEPS 0-3, all required fresh gates,
documentation and local commits are complete. The corrected owner roadmap is
readable; the earlier missing-roadmap STOP is superseded. Each current Canvas
revision exposes a fixed safe preparation status. Older prepared revisions never
make newer work Ready; backlog/deferred work is Preparing, failed/cancelled/capped
or guard-paused work is Couldn't prepare. Unsupported/empty/unavailable stay
explicit. Legacy fields remain for one release; strict older Canvas clients keep
their response shape unless they opt in with '?preparationStatus=1'.

Mobile replaces normal Prepare actions with Ready / Preparing / Couldn't prepare.
Only failures offer Retry, hidden on observed connection failure. Preparing has
no animation (including Reduce Motion); Reviewer and Quiz wait for Ready. Focus
refresh and serial ten-second polling are bounded to 18 reads/polls per refresh
cycle and stop on terminal status, blur/background or offline evidence. Later
loaded pages keep their pagination and refresh their own material statuses.
Retry uses EP1's single admission/dispatch path, with accounting reset only in
the serialized RPC, cumulative lifetime attempts retained, and double submission/
Ready reconnection idempotent. Existing Reviewer Retry recovery remains intact.
No migration or native dependency was added; owner RLS/private columns are intact.

Final FRESH gates: forced typecheck 7/7, forced lint 7/7 (0 errors, four existing
mobile warnings), shared 133 passed, API 1,856 passed / 3 existing skips, mobile
959 passed, API build 34/34 pages (16 steps / 1 workflow), Android export one
bundle / 31 assets, whitespace 0 errors. Draft failures and exact counts are in
the [EP3 handoff](ai/handoff.md#ep3-corrected-prompt-continuation-2026-10-14); see [ADR-026 Client status](architecture/ADR-026-eager-preparation.md#client-status).

Owner steps remaining: deploy API then preview OTA after EP1/EP2 prerequisites;
RB2 realme checks new PDF Preparing -> Ready without a tap, forced failure plus
Retry, airplane-mode Retry visibility, and Reduce Motion. Rollout and device
checks were entirely skipped. Deployed revisions, applied migrations, job rows,
queue/IAM, Scheduler and physical behavior are UNVERIFIED (owner to confirm).
No remote service call, environment-file edit, Scheduler change or push occurred.

## EP2 preparation backfill completed locally; rollout pending (2026-10-14)

EP2 STEPS 0-3 are implemented locally. The corrected external roadmap was read;
the earlier EP2 missing-path STOP is superseded. Active selected owned courses,
including completed courses skipped by notification polling, now receive fair
poll-owned preparation visits without another sync or student request. Inactive
or unselected courses wait until their connection/selection permits preparation.

Complete source eligibility and batched exact-revision/control reads seed only
unprepared, unsuppressed, below-cap materials into the existing discovery backlog.
EP1's admission, worker and 25/200 runaway guard remain the single preparation
path. Stable five-material round-robin turns are bounded by 25 per course and
50 globally per poll invocation; at most 20 courses are leased for 90 seconds.
Live sync/discovery and student Retry recover before backfill. Worker completion
cannot advance a backfill ledger outside the poll budget. Durable visits and
idempotent discoveries/receipts recover seed/admission/registration crashes.

New forward-only migration `20261014000200_canvas_preparation_backfill.sql` is
written, not applied. It adds service-only fair course visits with safe owner
RLS reads and explicit grants. The real discovery/PGlite proof prepares all
230 old materials within budgets; the five-material course is fully admitted
in the first round. Existing EP1 tests pass unchanged. Final FRESH gates:
typecheck 7/7, lint 7/7 (four existing mobile warnings), shared 133/133,
API 1,841 passed / 3 existing skips, API build 34/34 pages, whitespace 0 errors.
First timeout/typecheck failures and exact results are retained in the
[EP2 handoff](ai/handoff.md#ep2-corrected-prompt-continuation-2026-10-14).
See [ADR-026](architecture/ADR-026-eager-preparation.md#backfill) for budgets, priority and resumability.

Rollout and device checks were entirely skipped. Owner steps: apply the EP2
migration after EP1's two migrations, deploy API and Google worker, observe
per-course backfill counts and guard state not `tripped`, then RB2 checks an
old never-opened material shows Ready on realme. Deployed revisions, migrations,
credentials, Scheduler, production inventory, OCR/cost and retained bytes are
UNVERIFIED (owner to confirm). No remote call, environment-file edit or push.

## EP1e eager preparation done locally; owner rollout next (2026-10-14)

**EP1 STEPS 0-4 are implemented locally.** The owner answered the earlier STOPs;
exact-revision original reuse, Page attachment invalidation and staged extraction
fences are repaired. The durable store, Google preparation task/broker lease,
sync batches/guard/recovery, deferred poll drain and prepared-only consumers are
complete. Existing eligibility, AG1 limits, PV1c retention and Canvas 40/local
durable 100/40 limits remain. The real discovery/SQL case is 230 -> 200 prepared
+ 30 deferred -> 30 prepared on the next poll cycle without new module IDs.

[ADR-026](architecture/ADR-026-eager-preparation.md) records the design and guard
queries. The [EP1e handoff](ai/handoff.md#ep1e-unattended-continuation-2026-10-14)
records final FRESH gates, commits, failed first attempts and owner steps. Prior
STOP sections below are historical and superseded.

Next owner steps: apply migrations `20261014000000` then `20261014000100`; deploy
API and Google worker; confirm Cloud Tasks queue/IAM; watch first CIT17 sync for
<=200 enqueued and `completed`/`deferred`; RB2 checks realme sync-to-Ready.
Rollout/device checks were entirely skipped; all live state remains UNVERIFIED.
EP2 resumable backfill and EP3 preparation status are complete locally.
The later Visual Reviewer phases remain pending. No mobile UI change belonged to EP1.

## EP1d inventory repairs done; revision-byte binding STOP (2026-10-14)

**EP1 remains incomplete before STEPS 1-4.** Owner-approved Module/ModuleItem
pagination is committed as `996574a`; additional file-reference/open-candidate
pagination is committed as `e739cab` under the standing inventory authorization.
Stable owned reads, safety bounds and fail-closed placement/admission preserve
the earlier cap and File/Page fixes. FRESH focused tests: 78/78; the modeled
1,000-row response cap no longer loses the 1,002-item placement evidence.

New non-inventory STOP: the actual inventory SQL can store revision B's
fingerprint alongside retained revision A bytes (`not_requested`), then the
ingester marks those bytes `unchanged` without downloading B. Local actual-SQL/
ingester evidence: 1 passed, 17 deliberately filtered, 0 downloads/uploads.
Safe exact-revision preparation cannot rely on that reuse decision. The
continuation question and verification are in the
[EP1d handoff](ai/handoff.md#ep1d-unattended-continuation-2026-10-14).
No preparation schema, worker/broker, guard/drain or consumer gating was added;
ADR-026 remains free. EP2/EP3 and Visual Reviewer phases remain downstream.
Rollout/device checks entirely skipped; live impact UNVERIFIED (owner to confirm).
The older EP1c placement question below has been answered and repaired.

Retained-repair gates FRESH PASS: forced typecheck/lint 7/7 each (0 cached;
4 existing lint warnings), shared 133/133, API 1,766 passed / 3 existing skips,
API build 34/34 pages, diff 0 errors. Final focused tests: 102/102. One initial
API fixture failure was corrected and the full suite rerun; see the handoff.
Mobile gates NOT APPLICABLE.

## EP1c File/Page inventory repaired; placement completeness STOP (2026-10-14)

**STEP 0.6 done locally; EP1 remains STOPPED before STEPS 1-4.** Owner-approved
File/Page reads now use stable ID order and 200-row ranges, with a 50-page
safety bound per owned course/type. Errors or an exhausted bound fail explicitly;
AG1 records no candidate/baseline from that incomplete evidence. Real listing
regressions discover all 230 Files and all 230 Pages with correct public
pagination; mixed placement/exclusion and Page reference behavior is preserved.
The earlier Canvas 40-page repair `23cb9d0` remains intact.

A separate placement-evidence surprise requires continuation review:
`readModules` / `readModuleItemsForReferences` still perform a single
unpaginated read. Under a modeled 1,000-row server cap, the actual source-list
path silently omits an independently placed instructional attachment and admits
an administrative file whose excluded module placement was beyond the cap;
`hasMore=false`. This is distinct from the repaired File/Page cap. Live row-limit
configuration/impact is **UNVERIFIED (owner to confirm)**. See the exact evidence
and continuation question in the [EP1c handoff](ai/handoff.md#ep1c-unattended-continuation-2026-10-14).

Commit: `c5d537b`. Retained-repair gates FRESH PASS: forced typecheck/lint 7/7
each (0 cached; 4 existing warnings), shared 133/133, API 1,756 passed / 3 skips,
API build 34/34 pages, diff 0 errors. Mobile gates NOT APPLICABLE.

No preparation migration/types, result store, worker/broker extension, guard,
poll drain or consumer gating was added. ADR-026 remains free. EP2/EP3 remain
blocked on EP1. Rollout and device checks entirely skipped.

## EP1b continuation stopped on source inventory completeness (2026-10-14)

**STEP 0.5 done locally; EP1 remains STOPPED and incomplete.** `23cb9d0`
restores Canvas PDFs to 40 total pages before deferred inspection/OCR and checks
reused page counts; local durable 100/40 limits remain. FRESH focused tests 29/29.
Retained-fix gates FRESH PASS: forced typecheck/lint 7/7 each (0 cached,
4 existing warnings), shared 133/133, API 1,749 passed / 3 skips, API build
34/34 pages, diff check 0 errors. Mobile gates NOT APPLICABLE.

A second preflight surprise blocks discovery: source readers cap Files/Pages
at 150 each, but public pagination can report `hasMore=false` on that partial
inventory. Offline 230-file reproduction observes 150 and omits 80. Required
200-prepared/30-deferred behavior needs complete owned discovery using the same
eligibility boundary. The unattended rule requires an owner answer; see the
[continuation question](ai/handoff.md#ep1b-unattended-continuation-2026-10-14).
The unfinished store draft was removed; no new schema, preparation worker,
guard or consumer path is shipped. ADR-026 stays free. EP2/EP3 and visual phases
remain downstream; rollout/device checks entirely skipped and live state
UNVERIFIED (owner to confirm).

## EP1 preflight stopped (2026-10-14)

**STOPPED at STEP 0; EP1 implementation remains pending.** Current deferred
Canvas PDF worker validation uses the durable 100-page limit, contrary to the
audit's assumed 40-page Canvas extraction cap. Canvas snapshot acceptance still
has a 40-page constraint, which acts after extraction. The unattended STOP rule
requires owner review of the [finding and continuation question](ai/handoff.md#ep1-unattended-preflight-stop-2026-10-14).

Recommended continuation: repair the Canvas pre-extraction cap, preserving local
durable 100/40 limits, then complete EP1's remaining preflight and STEPS 1-4.
ADR-026 remains available. EP2, EP3 and the visual phases continue to depend on
EP1 completion; no preparation store, worker task or guard has been implemented.
Code gates NOT RUN (0); documentation diff check FRESH PASS (0 errors).
Rollout/device checks entirely skipped; live state UNVERIFIED (owner to confirm).

## Eager preparation and Visual Reviewer: EP0 complete (2026-10-14)

**EP0 docs-only PASS; EP1 next.** Owner direction is eager preparation of every
instructional Canvas material on sync; cost accepted, no per-user preparation
cost cap. Guard: 200/sync in batches of 25 with repeat/no-progress stops, plus
three attempts across syncs before student Retry. LibreOffice is approved for
VL2.1. P0 confirmation at 12:48 is recorded by the EP0 unattended prompt.

Sequence: EP0 -> EP1 durable prepare-on-sync -> EP2 resumable backfill -> EP3
status/Retry -> VL1.3 pre-render cited pages -> VL2 extracted diagrams -> VL2.1
Office snapshots -> VL3 labeled requested visuals -> RB2 owner rollout.
The [EP0 audit and implementation brief](architecture/ep0-preparation-audit.md)
identifies current Prepare as binary ingestion, later worker/preview extraction,
and the single durable result path EP1 must unify. No request-context STOP;
use brokered tokens and awaited dispatch. EP1 uses ADR-026 if still free,
not occupied ADR-021. Guard tests: repeat, stuck/no progress, 230 -> 200 + 30
deferred, with next-poll drain even without a new module item.

FRESH diff check PASS (0 errors); full suites NOT RUN (0), docs only. Live
counts/OCR/cost and production state UNVERIFIED (owner to confirm); historical
CIT17 sample is five PDFs / 164 pages / 8,973,082 bytes. No remote work or release.
RB1/N1 acceptance remains owner work; the new owner-authorized EP0 slice
supersedes the earlier blanket pause for this audit. Rollout/device checks
entirely skipped; RB2 remains owner-present.

## RB1 rollout — device acceptance in progress (2026-10-13)

**Production-deployed at exact commit `9d6f254`; device acceptance NOT RUN.**
This section supersedes the rollout-pending statements in the earlier local
slice records below. Autopilot remains paused until RB1 and the requested N1
continuation are handled.

API `dpl_D7XoTybcNT1ib9AMcEvXYU8tKB4P` is READY and healthy; worker
`generation-worker-00024-p6n` is READY with 100% traffic and authenticated
health 200. Preview OTA group `3b109b84-f28d-4557-b1ba-433a1a2e9145`
is published on Android runtime `2.0.1`. Five forward-only migrations applied
and passed object/RLS/grant/private-bucket verification. No RB1 env change.

| Item | Deployment | RB1 device acceptance |
| --- | --- | --- |
| P1 hidden grades, Grades navigation, Matching cap | API + preview deployed | NOT RUN |
| AG2 polling and labels | API + preview + migrations deployed; poll inactive | Queue Auto NOT RUN; Library/reviewer automatic labels BLOCKED (no successful automatic artifact) |
| PV1c Canvas PDF provenance retention | API + worker + migration deployed | NOT RUN |
| VL1.1b Canvas page snapshots | API + worker + preview + migration deployed | NOT RUN |
| E2 review-time estimate | API + preview deployed | NOT RUN |
| G1.1 drop rules | API + preview deployed | BLOCKED (no live drop-lowest fixture) |
| H1b private logging | API + worker deployed | End-to-end generation NOT RUN |
| VL0c/VL1.2 local PDF provenance/snapshots | API + worker + preview + migration deployed | NOT RUN |
| O2c offline quiz scoring | API + preview deployed | NOT RUN |
| H2/H2b dependency fixes | API + worker deployed | Dispatch/completion NOT RUN |
| H3 private responses | API deployed; FRESH owner GET 200/private,no-store PASS | Live API check PASS |
| H4 legacy review retirement | API deployed; FRESH POST /api/review 404 PASS | Canonical generation NOT RUN |

STEP 5 is **DEFERRED to N1 notification activation (separate owner step;
follows docs/architecture/canvas-email-notifications.md, including
skip_stale_canvas_email_events_v1 before any send)**. No RB1 cron call,
Scheduler operation or Resend activation. N1 starts after RB1 acceptance/docs;
creating/resuming Scheduler requires its separate STEP 5 yes.

FRESH pinned gates PASS: forced typecheck/lint 7/7 each (zero cached; four
existing lint warnings), shared 108/108, API 1,735 passed/3 existing skips,
mobile 928/928, API build, Android export and diff check. The first OTA command
stopped before publication for a missing noninteractive message; the owner
approved the explicit-message retry, which published one update group.

See [RB1 rollout evidence and device matrix](ai/acceptance/rb1/rollout.md).


## H4 legacy review route retirement (2026-10-13)

**PASS for local code scope; owner rollout/device acceptance pending.**
Security status: **H1-03 FIXED locally (retired)**. Fely selected option 1 on
2026-10-13 at 18:27: retire the legacy /api/review route if unused. STEP 0 found
no runtime, test-harness, script, CI or mobile/website consumer. Commit
`eb2a4b5` removes its only POST module and adds a focused offline absence
test. The canonical reviewer route, engine/provider exports and opt-in provider
smoke script remain used and unchanged. No migration, dependency or mobile change.

FRESH gates: forced typecheck and lint 7/7 tasks each, 0 cached;
lint 0 errors / 4 existing mobile import warnings; shared 133/133 in 12 files;
API 1,735 passed / 3 skipped / 0 failed in 146 files; API build 34/34 pages,
16 steps / 1 workflow; diff check PASS (0 whitespace errors). The build route
list and manifest omit /api/review and retain /api/reviewer/generate.
Mobile tests and Android export are NOT APPLICABLE (mobile unchanged).
The first typecheck failed on three stale generated Next route imports;
a local rebuild refreshed them, and the forced rerun passed. No test flake.

Owner steps remaining: ship H4 with the next API deploy, confirm POST /api/review
returns 404 and canonical generation works, optionally remove the deployed API's
RUN_OPENAI_SMOKE variable, and generate a reviewer from a Canvas module on device.
Rollout and device checks were entirely skipped. Live deployed revisions, route
behavior and environment state remain **UNVERIFIED (owner to confirm)**.
See [H4 handoff](ai/handoff.md#h4-unattended-legacy-review-route-retirement-2026-10-13).

## H3 private responses and bounded bodies (2026-10-13)

**PASS for local code scope; owner rollout/device acceptance pending.**
All 14 bounded text readers stream
request bodies and cancel at their existing byte caps, including missing or
misleading Content-Length. Fatal UTF-8 decoding maps to each caller's existing
invalid-JSON/request denial; null/blank-body behavior is preserved. All 15
previously uncovered owner-data route files return Cache-Control: private,
no-store on success and error, including the four audited source/job routes.
Existing no-store helpers and the separate experience streaming reader stay
unchanged. Status codes, error codes/messages, bodies and authorization are preserved.

Local code commits: `e2f2d1c` (shared reader), `ca6e48d` (14 bounded readers and regressions),
`d2a2ba8` (15 owner-response route files and regressions). No dependency,
migration, mobile, environment-file or legacy /api/review change.

FRESH gates: forced typecheck 7/7 tasks, 0 cached; forced lint 7/7 tasks,
0 cached, 0 errors / 4 existing mobile import warnings; shared 133/133 in 12
files; API 1,734 passed / 3 skipped in 145 files; API build 35/35 pages,
16 steps / 1 workflow; diff check PASS (0 whitespace errors). Mobile tests
and Android export are NOT APPLICABLE (mobile unchanged).
One new connection test first used POST instead of PUT (34 passed / 2 failed);
corrected fixture rerun 36/36. No full-gate failure or flake.

Owner steps remaining: include H3 in the next API deploy; spot-check source
detail and job result response headers; sign in, sync Canvas and open a reviewer
and task plan on device. Rollout and device checks were entirely skipped. Live
deployed headers/revisions, database/applied state and Scheduler remain
**UNVERIFIED (owner to confirm)**. See [ADR-024](architecture/ADR-024-private-responses-bounded-bodies.md) and
[H3 handoff](ai/handoff.md#h3-unattended-private-responses-and-bounded-bodies-2026-10-13).

## VL1.2 local PDF page snapshots (2026-10-13)

**PASS for local code scope; owner rollout/device acceptance pending.** Accepted
unchanged local PDFs with VL0c's extracted page blocks now use the shared
lowest-cited-page cache, durable worker and 1400 px thumbnail/zoom viewer.
Exact accepted source/parent/extraction/asset ownership and byte size/hash are
verified. Edited/unavailable/old local revisions and non-PDF sources stay excluded.

Fely's option 1 is implemented: **respect the delete**. Deleted/cleanup-pending
assets or missing objects make even cached images unavailable before download,
reservation or dispatch. Mobile keeps page text with "Page preview unavailable";
offline controls remain hidden. Deletion, cleanup and preserve-artifacts retention
are unchanged; missing bytes terminate safely and completion fences deletion.

Local commits: `4a7bb83` and `84bee38`. Forward-only migration
`20261013000400_local_pdf_page_snapshots.sql` is **NOT APPLIED**. Paired nullable
Canvas bindings admit local cache rows under the same owner/version/page key,
RLS/grants, budgets, leases and dispatch. No native dependency or new bucket.

FRESH gates: forced typecheck/lint 7/7 each, 0 cached (0 errors / 4 existing lint
warnings); shared 133/133 in 12 files; API 1,655 passed / 3 skipped in 141 files;
mobile 928/928 in 90 files; API build 35/35 pages, 16 steps / 1 workflow; Android
export 3,456 modules / 31 assets / 1 bundle / 1 metadata file; diff check PASS
(0 whitespace errors). First mobile attempt: 927 passed / 1 failed, old local-file
header exclusion assertion corrected. Gates ran with the then-uncommitted H2 dependency group, now completed by H2b.

Owner next: reviewed migration application, one API deploy, one worker deploy,
one preview OTA and fresh local PDF/one-word edit/keep-reviewers deletion/airplane-mode
device acceptance. Live revisions, applied state and retained bytes remain
**UNVERIFIED (owner to confirm)**. Rollout and device checks entirely skipped.
See [ADR-020](architecture/ADR-020-visual-learning.md) and
[VL1.2 handoff](ai/handoff.md#vl12-unattended-local-pdf-page-snapshots-2026-10-13).

## H2 dependency upgrades (2026-10-13)

**H2b PASS for local code scope; H2 code work is done. Rollout/device acceptance
pending.**
Dependency status: Next / eslint-config-next 15.5.27 (`bd39917`), Workflow 4.8.13 / test
adapter 4.0.29 (`86cf90a`, accepted ADR-023), Google authentication/gRPC, sharp 0.35.5,
undici 6.29.0 / 7.30.0 and compatible parsing/archive/mobile leaves are committed in
separate groups. React/React DOM remain 19.1.0; all 110 frozen Expo/RN/tooling package
names and existing majors pass the local scope check. No app/test/snapshot changes or
new migration.

CACHED before audit (reused from H2): **5 critical / 38 high / 33 moderate / 0 low / 0
info / 76 total**. FRESH after audit: **0 critical / 24 high / 21 moderate / 0 low / 0
info / 45 total** (valid JSON; exit 1 reports residual advisories). Remaining findings
and every changed package are in the [H2b
result](ai/audits/h1-release-hardening.md#h2-result-2026-10-13-h2b-pass). Original H2
failures remain historical; O2c PASS and isolated HEAD mobile 928/928 cleared that
blocker.

All eight gates ran FRESH between each STEP 2 group. Final: forced typecheck/lint 7/7
each, 0 cached, 0 errors / 4 existing lint warnings; shared 133/133 (12 files), API 1655
passed / 3 skipped (141 files), mobile 928/928 (90 files), API build 35/35 pages with 16
steps / 1 workflow, Android export 3459 modules / 31 assets / 1 bundle / 1 metadata
file, whitespace check 0 errors. No full-suite H2b flake; failed preflight launcher and
original H2 attempts are recorded in the
[handoff](ai/handoff.md#h2b-unattended-dependency-upgrade-completion-2026-10-13).

**Separate owner-planned item:** Expo SDK 54 -> 57 / React Native 0.81 -> 0.87, with
coordinated native/Metro/Jest/router changes and device acceptance. Next's excluded
PostCSS pin and unavailable compatible argparse/sprintf-js fixes remain reported. Live
production state is **UNVERIFIED (owner to confirm)**. Rollout and device checks were
entirely skipped. Owner steps remaining: review, one API deploy plus the coordinated
mobile OTA, then sign-in/sync/reviewer smoke and app/Canvas/reviewer/quiz device checks.

## H1/H1b release hardening audit (2026-10-13)

**PASS for local scope.** H1 audit local: 8 findings, 2 fixed, 5 reported,
1 UNVERIFIED boundary. The completed inventory covers 75 migrations, 106 current
security-definer functions, 69 application tables, 100 policies including Storage
and 65 API routes. Reviewer log hygiene (`aa58d87`) and experience exception-name
log hygiene (`21bb836`) are fixed with regressions and preserve HTTP behavior.

Next owner decisions: prioritize compatible runtime dependency updates and assess
reachable advisories (FRESH npm audit: 5 critical / 38 high / 33 moderate; 76
entries, historical H1 baseline). H4 retires the unused legacy review endpoint
locally. H3 completed private/no-store responses and bounded body reading; H2b
completed the compatible dependency slice (see current entries above). Fely's VL1.2
option 1 decision resolves local retention: respect deletion, no retention change. Options and
recommendations are in
the [audit](ai/audits/h1-release-hardening.md#owner-decisions-needed). No dependency
change, new migration or retention implementation was added by H1/H1b.

FRESH gates: typecheck/lint 7/7 each, 0 cached (lint 0 errors / 4 existing warnings);
shared 108/108, API 1,558 passed / 3 skipped, mobile 898/898; API build 35/35 pages,
16 steps / 1 workflow; diff check PASS (0 errors). Android export NOT APPLICABLE.
Live ACL/RLS/bucket privacy, secrets, deployed revisions/flags, Scheduler and
runtime logs are **UNVERIFIED (owner to confirm)**. Rollout and device checks were
entirely skipped; both API fixes await the owner's rollout batch. See
[handoff](ai/handoff.md#h1h1b-unattended-release-hardening-audit-2026-10-13).

## O2 offline quiz reveal and scoring (2026-10-13)

**O2c PASS for local code scope; rollout/device acceptance pending.** O2b's shared
TypeScript grader (`4ad11b4`) and owner-only answer-key endpoint (`086e7ad`) are
preserved. The owner's corrected decision keeps `complete_quiz_attempt` and
persisted History/Library percentages SQL-authoritative; no database migration
or SQL function was changed. Frozen TypeScript response parity and all 23
SQL-rule fixtures pass against the unchanged function in local PGlite.

Separate owner-scoped SQLite keys hydrate with O1 bodies, retry independently,
refresh with the body revision and purge on sign-out/copy removal. Missing keys
retain the existing connection-required behavior. Offline check, reveal and
finish use the shared grader and persist provisional results with the caption
"Scored offline · will sync". Replay persists the server attempt identity before
mutations, preserves assisted-reveal ordering, tolerates interrupted completion,
and replaces local results with the server's; mismatch logging is only
`offline_score_mismatch`. No AI calls or jobs were added.

O2c implementation commits: `f2ac5dd` (storage/hydration) and `3b05865`
(offline practice/replay). FRESH final gates: forced typecheck/lint 7/7 each,
0 cached (0 lint errors / 4 existing warnings); shared 133/133 in 12 files;
API 1,608 passed / 3 skipped in 141 files; mobile 920/920 in 90 files;
API build 35/35 pages, 16 steps / 1 workflow; Android export 3,456 modules /
31 assets / 1 bundle / 1 metadata file; diff check PASS (0 whitespace errors).
The failed first fixture/typecheck/mobile-request-count attempts are recorded
in the handoff. Gates ran with the pre-existing uncommitted H2 dependency group;
O2c neither changes nor commits those manifests, lockfile or ADR-023.

Live revisions, deployed SQL and parity on real student data are
**UNVERIFIED (owner to confirm)**. Owner steps remaining: one API deploy,
one preview OTA, then airplane-mode/force-stop/reopen/reveal/finish/reconnect
acceptance and score comparison. Rollout and device checks were entirely skipped.
See [ADR-022](architecture/ADR-022-offline-quiz-answer-keys.md) and [O2c handoff](ai/handoff.md#o2c-unattended-offline-quiz-reveal-and-scoring-completion-2026-10-13).

## VL0 local-upload PDF provenance (2026-10-13)

**VL0c PASS for local code scope; owner rollout/device acceptance pending.**
Accepted unchanged PDF text keeps the worker's page blocks on its canonical child
with `pageProvenance: "extracted"`. Exact trimmed-text hash comparison rejects
edited provenance (`"edited"`, no blocks). Read failures/missing or invalid
evidence keep acceptance successful with `"unavailable"` and no blocks. Existing
readers work without changes; no backfill, migration or second builder is needed.

VL1.2 subsequently adds local-PDF snapshots under Fely's respect-the-delete
decision. Owner answer 6 records VL0 STEP 0.5 as **accepted, deferred to VL1.2**; metadata relies
only on accepted text and does not assume bytes survive deletion. Cleanup,
camera/image, Canvas and mobile paths remain unchanged.
FRESH typecheck/lint 7/7 each (0 cached; 4 existing warnings); shared 108/108,
API 1,579 passed / 3 skipped, mobile 898/898; API build 35/35 pages, 16 steps /
1 workflow; diff check PASS (0 errors). Android export NOT APPLICABLE. Live state
and old affected-row counts **UNVERIFIED (owner to confirm)**.
Rollout/device checks entirely skipped. See
[VL0c handoff](ai/handoff.md#vl0c-unattended-local-upload-pdf-provenance-2026-10-13).

## G1.1 grade estimator drop rules (2026-10-13)

**PASS for local code scope; rollout/device acceptance pending.** Grade estimates
now apply `drop_lowest`, `drop_highest` and `never_drop` within each group, using
percentage ordering, stable assignment-ID ties and the one-graded-score guard.
The API translates persisted Canvas IDs into owned stored assignment IDs;
malformed rules retain an explicit warning. Hidden grades remain pending, and
mode selection still chooses the current calculation nearest Canvas's visible
score. No-rule output is pinned by the CIT17-like regression: 217/250 graded,
350 remaining, target 90% gives 92.3%, with the same per-activity points.

Uniform future scores are simulated at each candidate. Bounded binary searches
within stable drop ranges find the minimum required score to 0.1%, including
unequal-point order changes; dropped future activities do not contribute to the
target or appear in retained activity advice. Mobile displays applied drop counts
in existing secondary text. Protected-only rules have no misleading warning.

Implementation commits: `378fb61`, `fae3bdc`, `f856de7`, `0ccc29e`.
FRESH gates: forced typecheck/lint 7/7 each (0 cached; lint 0 errors / 4 existing
warnings); shared 108/108 in 11 files; API 1,551 passed / 3 skipped in 140 files;
mobile 898/898 in 89 files; API build 35/35 pages, 16 steps / 1 workflow;
Android export 3,454 modules / 31 assets / 1 bundle / 1 metadata file;
diff check PASS. Failed fixture/preload attempts are recorded in the handoff.

Live production state and Canvas parity are **UNVERIFIED (owner to confirm)**.
Owner next: one Vercel deploy, one preview OTA, then a drop-lowest course/device
hand calculation. No migration, remote service call, Scheduler change,
environment-file edit or push. Existing G1/R1 acceptance remains unchanged.
See [G1.1 handoff](ai/handoff.md#g11-unattended-grade-estimator-drop-rules-2026-10-13).

## E2 reviewer review-time estimate (2026-10-13)

**PASS: estimate and display code, tests and local commits complete; rollout/device acceptance pending.**
Reviewer estimates: E2 local. The reader and Library already load the exact saved
version payload, so both compute the estimate on read without new queries, metadata
writes or a migration. Saved explanations, key points and item/evidence text count
at 200 words/minute, plus 15 seconds per nonblank key point and 1 minute per section;
round up to 5-minute increments, minimum 5. Titles, metadata, emphasis copies and
unsupported enrichment are excluded. Empty/invalid content returns null.
Optional `reviewMinutes` fields keep older clients compatible; quizzes and activity
outputs return null. Mobile shows `~N min review` in the existing secondary caption,
joined to the automatic-origin label with ` · ` when present.

Implementation commits: `80e8cd5`, `4c48804`, `f3d3b7b`.
FRESH gates: forced typecheck 7/7 and lint 7/7 (0 cached; 0 lint errors,
4 existing mobile warnings); shared 93/93 in 11 files; API 1,542 passed / 3 skipped
in 140 files; mobile 890/890 in 89 files; API build 35 pages / 16 steps / 1 workflow;
Android export 3,454 modules / 31 assets / 1 bundle / 1 metadata file; diff check PASS.
The handoff records the corrected fixture failures and generated-type race.

E3 is the next product decision: which reviewers become Today review blocks, when,
and how often. Today and `task-planning.ts` are unchanged. E2 is independent of
PV1c/VL1.1b. Live production state is **UNVERIFIED (owner to confirm)**. Rollout and
device checks were entirely skipped under the unattended rules.

## PV1 Canvas PDF provenance (2026-10-13)

**PASS: code, migration file, tests and local commits complete; rollout pending.**
Freshly prepared Canvas PDFs refresh the owned descriptor and use existing deferred
admission for both manual and automatic generation. The worker remains the sole
builder of cited page blocks; preparation failure remains `409 not_ready`.
Snapshot-aware cleanup uses transaction advisory locks plus a durable exclusive
claim to bridge the Storage HTTP deletion window. Snapshot insertion and new
current-file references share that lock and fail safely during a claim. Rollback
keeps any pre-existing or uncertain object and removes only a new unreferenced key.
The unused server resolver returns only the accepted unedited Canvas PDF revision.

Implementation commits: `2b0ce49`, `9b6ce4e`. Forward-only migration:
`20261013000200_canvas_source_provenance_retention.sql` (NOT APPLIED).
FRESH gates: typecheck 7/7 tasks; lint 7/7 tasks, 0 errors / 4 existing mobile
warnings; API 134 files, 1,488 passed / 0 failed / 3 skipped; mobile 87 files,
861 passed / 0 failed; API build 1/1, 35/35 static pages; diff check 0 errors.
The first API gate had one existing database setup timeout (1,484 passed / 7
skipped); both rerun and final run passed. A focused database fixture initially
failed 7 cases and was repaired (final focused retention suite 37/37).
No cached results claimed. PGlite tests deterministic transaction interleavings;
physical multi-session blocking and deployed Storage remain UNVERIFIED.

R1.4 admission evidence is NOT AVAILABLE (R1.4 preflight stop). Preview caps
(20,000/source; 90,000 combined) reject rather than truncate; no partial-source
quality finding is established. VL1.1b subsequently passed STEP 0 and completed Canvas-only snapshots locally;
owner rollout remains pending. VL0 remains separate. No production calls, deployment,
migration application, Scheduler changes, environment-file edits or push.
See [PV1c completion handoff](ai/handoff.md#pv1c-canvas-pdf-provenance-completion-2026-10-13)
and [ADR-021](architecture/ADR-021-canvas-source-provenance-retention.md).

## R1.4 CIT17 acceptance (2026-10-13)

**STOPPED at step 1; R1 remains 15/16, AG1 PARTIAL.** All five CIT17 baseline materials already have reviewers under the shared owner-scoped reviewer mapping. No eligible file, baseline edit, sync tap or generation; baseline remains exactly `2026-10-12T07:07:14.956768+00:00`. Production API `dpl_Hua1KbWEDGYphVB8xVexSdV3UBdQ` is READY and worker `generation-worker-00023-9hs` serves 100%. End counts: 622 sync jobs, 242 processing jobs, 113 reviewer jobs, 90 artifacts; 0 active sync/processing jobs. PV1 admission-path evidence NOT RUN because no new job exists. AG2 rollout/device acceptance remains pending. FRESH read-only checks; code gates NOT RUN (docs only). See [R1.4 stop evidence](ai/acceptance/r1/rollout-and-acceptance.md#r14--cit17-preflight-stop-2026-10-13).

## VL1.1b Canvas PDF snapshots (2026-10-13)

**PASS for local code scope; owner rollout/device acceptance pending.** Both
manual and automatic standalone unedited Canvas PDFs preserve cited page blocks.
The authenticated topic endpoint selects the lowest cited page, reuses an
owner/source-version/page cache, and awaits durable Google task acceptance before
HTTP 202. Header discovery does not render. The existing native worker renders
one accepted PDF page at 1400 px, verifies its hash, uploads privately and fences
publication with a lease. Reservations and actual attempts are capped at
20/user/rolling 24 hours, including retries. Missing original revisions return
source_revision_unavailable; VL1.1b excluded local/edited/Office/Page sources.
VL1.2 above subsequently admits eligible local PDFs while respecting deletion.

Mobile adds From page n, bounded five-check/15-second progress polling, and a
full-screen pinch/pan/double-tap viewer using existing tokens and Reduce Motion.
Offline device copies and failed reachability checks hide it; no offline image
store or new native dependency. Coarse null source types are classified server-side.

FRESH gates: forced typecheck and lint 7/7 each, 0 cached; lint 0 errors /
4 existing warnings; API 140 files, 1,537 passed / 0 failed / 3 skipped; mobile
89 files, 879 passed / 0 failed; API build 35/35 static pages, 16 steps/1 workflow;
Android export 1 bundle / 3,452 modules / 31 assets; diff check 0 errors.
Failed first attempts and the recurring PGlite bootstrap flake are recorded in
the handoff; its setup timeout now matches the other database fixtures.

Forward-only migration 20261013000300_source_page_snapshots.sql is NOT APPLIED.
PV1 migration/rollout, live retained bytes, bucket/IAM/queue, deployed renderer
and device checks remain UNVERIFIED (owner to confirm). No remote service calls,
deployments, applied migrations, Scheduler changes, environment-file edits or push.
VL0 local provenance remains separate. Embedded images and labeled external
visuals on request remain later phases. See [ADR-020](architecture/ADR-020-visual-learning.md),
[preflight](ai/acceptance/vl1/preflight.md), and
[VL1.1b handoff](ai/handoff.md#vl11b-unattended-canvas-pdf-snapshots-2026-10-13).

## VL1 source-page snapshots (2026-10-13)

**STOPPED at STEP 0.1; implementation remains pending.** Local PDF canonical
source versions lose page-numbered blocks at extraction persistence, although
reviewer payloads retain `sourceBlockIds` and original document links survive.
Owner direction is required for a provenance repair before the snapshot table,
API, durable worker rendering, mobile viewer and tests. ADR-020 is not written:
the run stopped before implementation and the Docs section. Later visual phases
remain extracted embedded images, then labeled external visuals only on request;
VL1 is actual source pages only. No rollout or device checks attempted. FRESH:
documentation diff check (0 errors); six build/test gates NOT RUN. See
[VL1 handoff](ai/handoff.md#vl1-unattended-source-page-snapshots-2026-10-13).

## P1 unattended polish (2026-10-13)

**PASS for local code scope; rollout/device acceptance pending.** Singular hidden-grade
copy is tested, Tasks opens the shared Grades screen inside its own `work` stack,
and Matching-only quizzes use a deterministic verbatim-term budget in setup,
admission, retry and worker processing. The strict validator and Mixed capacity
are preserved. No migration, external service call, deployment, Scheduler change,
environment-file edit or push. FRESH: forced typecheck/lint 7/7 (0 cached,
4 existing lint warnings); shared 71/71; API 1,415 passed/3 skipped; mobile
853/853; API build 35 pages/16 steps/1 workflow; diff check 0 errors.
The original R1 Matching-only source/cause and live revisions are UNVERIFIED
(owner to confirm); the historical fixture does not establish that root cause.
Failed first attempts, evidence and Owner steps remaining are recorded in [P1 acceptance](ai/acceptance/p1/unattended-polish.md).

## AG2 background automation (2026-10-13)

**PASS (local code scope); rollout and device acceptance pending.** Complete
metadata polls now detect newly observed File/Page module-item IDs and await the
existing durable course-content admission and Google dispatch. The first complete
inventory baselines existing IDs; changed items and failed scopes do not trigger.
Service-only reservations serialize per-user checks: automation enabled, verified
API activity within 7 days, at most 1 request/course/rolling 6 hours and 3/user/rolling
24 hours. Auth records activity with an hourly conditional write. AG1's 3/run and
5/24-hour reviewer limits remain unchanged. Queue shows Auto; Library and the
reviewer header show Made automatically, derived from owned candidate/job/version
receipts. A service-only, idempotent stale-email SQL guard and owner activation
runbook are prepared. Migrations `20261013000000` and `20261013000100` are local only.

FRESH: forced typecheck/lint 7/7 each (0 cached; 4 existing lint warnings), API
1,450 passed/3 skipped in 132 files, mobile 861 passed in 87 files, API build
35 static pages/16 workflow steps/1 workflow, Android export 1 bundle/3,450 modules/
31 assets, and diff check 0 errors. The first typechecks failed on JSON narrowing
and mobile fetch-mock types; both were fixed and rerun successfully. No test flakes.
R1.4 pending. Cloud Scheduler, live revisions, environment/IAM and applied
migration state are UNVERIFIED (owner to confirm). No remote service calls,
deployments, migration application, emails, Scheduler changes, environment-file
edits or push. Website parity is deferred. See the
[execution contexts](architecture/ag2-execution-contexts.md) and [handoff](ai/handoff.md).

## R1 coordinated rollout (2026-10-12)

**PARTIAL — production rollout complete; 15/16 device lines PASS, line 7 FAIL (R1.3 reviewer generation), 0 pending.** R1 source `cc42361`; AG1.1 fix `b5adb7d`; AG1.2 token fix `4a2a2d0` and dispatch fix `b6ab830`. Owner-applied R1.1 migrations remain reconciled with no history repair. API `dpl_38faB6K3SfD38KeGE7TNuG6W6bgp` was later redeployed by the CC17 session as R1 + API quiz fixes, `dpl_7xLxnfVqY81QVCUyiiy6qQvsDDgF`. GR1 API **dpl_Hua1KbWEDGYphVB8xVexSdV3UBdQ** and worker **generation-worker-00023-9hs** (100%) deploy source fc3486b. Rollback: API dpl_7xLxnfVqY81QVCUyiiy6qQvsDDgF; worker generation-worker-00022-wzx. Preview OTA `ba5e6d56-d75a-4ef4-adb0-162518572c48` is unchanged. Scheduler/Resend inactive. See [R1 evidence](ai/acceptance/r1/rollout-and-acceptance.md).

| Feature | Overall status | Device acceptance |
|---|---|---|
| O1 offline library | PASS | Lines 1–4 accepted: cold offline Reviewer/Quiz/Draft reopen, copy removal/recovery, practice kept, no sync jobs |
| AG1 automatic reviewers | PARTIAL | R1.3 proved preparation/admission/dispatch/start but failed during generation. GR1 classification and bounded known-outcome retries are live. Fresh manual Unit 2 diagnosis succeeded on worker 00023, first delivery, 53,159 ms; saved reviewer opens in Library. Original failed job unchanged. Line 7 still needs one completing automatic run. |
| E1 study-time estimates | PASS | Lines 10–12: varied estimates, student edit kept, no re-estimation |
| G1 grade estimator | PASS | Lines 13–14: hand-checked CIT17 90% → 92.3% per remaining activity |

Regression/sign-out-in line 15 and Mixed-quiz Matching line 16 PASS. Matching-only generation contract failure remains open. GR1 provider classification and bounded definite-outcome checkpoints are deployed from fc3486b. Unit 2 manual diagnosis PASS on worker 00023: fresh job ceaebf6d succeeded on delivery 1; provider duration 53,159 ms; saved reviewer opens from Library (18 topics). No request_failed or reviewer_generation.* failure events; kind/httpStatus/incompleteReason absent on success. Original d9de6cfe remains failed/generation_failed, attempt 2, retryable=false. No Queue Retry or direct data edits; no new deploy, cap change, migration, OTA or push. The earlier R1.3 failure cause remains unknown; this run does not establish output truncation. Line 7 remains FAIL, R1 15/16, AG1 PARTIAL; next automatic acceptance needs naturally new or known-fitting material. AG2 background-poll code is complete locally; rollout/device acceptance and website parity remain open. Prior GR1 code gates passed: forced typecheck/lint 7/7 (0 cached, 4 existing warnings), API 1,409 passed/3 skipped/128 files, build 35 pages/16 steps/1 workflow, provider contract 20/20. Code gates NOT RERUN for this device/docs continuation; documentation diff check FRESH PASS.

## O1 explicit offline library (2026-10-12)

**PASS (local) - v1.4 follow-up item (4); device acceptance pending.** O1 implemented locally: every saved artifact body hydrates in batches (foreground and completion catch-up, no new jobs), Saved offline markers and counts, calm offline states, Offline storage settings. Not physically accepted. O2c now supports offline Quiz reveal/scoring with separate owner-scoped device keys; offline Draft editing remains network-only. Fely's option 1 and corrected grading decision are implemented by O2c (ADR-022); TypeScript is shared, SQL retains persisted authority, and deployment/device acceptance remain pending.

## G1 grade estimator (2026-10-12; historical local result before R1/G1.1)

**PARTIAL - local implementation verified.** Product direction v1.4 follow-up item (2): G1 implemented locally: target grade → required score per remaining activity, mode chosen by Canvas's own current score, drop-rule/hidden-grade/mismatch warnings. Not physically accepted. Drop rules are not simulated; hidden grades count as pending. Read-only live sanity check awaits account/course context. Next: offline library (O1).

## E1 study-time estimates (2026-10-12)

**PARTIAL - local implementation verified.** Product direction v1.4 follow-up item (3): E1 implemented locally: content-based task estimates (batched AI, heuristic fallback, student override wins), refreshed before planning. Not production-applied or physically accepted. Reviewer estimates: E2 local; Today review blocks deferred to E3.

## AG1 automatic reviewer generation (2026-10-12)

**PARTIAL - local implementation verified.** AG1 implemented locally (ADR-019): admission after content sync, baseline, caps, off switch. Not production-applied or physically accepted. AG2: metadata-poll trigger, inactivity gating, Queue/Library Auto label, website parity. [ADR-019](architecture/ADR-019-automatic-reviewer-generation.md).

## Product direction v1.4 follow-up (2026-10-10)

**PARTIAL — AG1, E1, G1 and O1 implemented locally; device acceptance pending.** From the October 10 TBI assessment huddle (see [official direction v1.4](capstone/official-direction.md)): (1) AG1 implemented locally (ADR-019): admission after content sync, baseline, caps, off switch. Not production-applied or physically accepted. AG2: metadata-poll trigger, inactivity gating and Queue/Library Auto labels complete locally; rollout/device acceptance and website parity remain; (2) G1 implemented locally: target grade → required score per remaining activity, mode chosen by Canvas's own current score, drop-rule/hidden-grade/mismatch warnings. Not physically accepted.; (3) E1 implemented locally: content-based task estimates (batched AI, heuristic fallback, student override wins), refreshed before planning. Not production-applied or physically accepted. Reviewer estimates: E2 local; Today review blocks deferred to E3; (4) O1 implemented locally: every saved artifact body hydrates in batches (foreground and completion catch-up, no new jobs), Saved offline markers and counts, calm offline states, Offline storage settings. Not physically accepted. O2c now supports offline Quiz reveal/scoring with separate owner-scoped device keys; offline Draft editing remains network-only. Team action items: compare the app against NotebookLM, research fair use and the replacement term for "grounded generative AI", and revise the BMC. Notification activation and B43 remain the current engineering priorities unless Fely reorders them.

## Urgent Canvas notification activation (2026-10-03)

Local metadata synchronization, transactional email outbox, deadline reminders and persistent Settings controls are implemented. Next: apply the forward migration, configure cron/Resend variables and verified sender, roll out API and Mobile, perform developer-only live delivery and repeat-request/device acceptance, verify five-minute workload capacity, then enable the single Google Cloud Scheduler job. The current Hobby plan cannot provide that trigger interval through Vercel Cron. [Setup and behavior](architecture/canvas-email-notifications.md). Other phase gates below remain unchanged.

## Quick Canvas token tutorial (2026-10-01)

The scoped tutorial popup is implemented and checked on the realme through preview OTA `01a0f7d2-ca43-760b-9723-4a4ddf1f1a40`. New-token reconnection remains untested on the device; no Canvas integration or footer navigation code changed. B43–B45 work has not started.

## B39.1 deploy + physical Canvas sync and Task attachment acceptance (2026-10-01)

**BLOCKED at live Canvas/device acceptance.** Offline Task attachment metadata is stored in the existing owner-scoped SQLite database. API deployment `dpl_74hWVM2kSvg21hfnRLcVu885ohFe` is READY and healthy; preview APK `de93f504-cb53-4388-b48a-47103d65eb3a` contains Expo Sharing and is installed on the RMX3151. The session exposes no Android UI control surface, so the fresh Canvas credential check/sync, attachment open, and physical workflow/passive-sync tests could not run. Next: provide supported CUA Android control for the authorized RMX3151, then finish the remaining B39 acceptance gates. [Evidence](ai/acceptance/b39.1/deploy-physical-canvas-sync.md).

## B39 student workflow and Canvas Task attachments (2026-10-01)

**BLOCKED pending live Canvas and physical acceptance.** Course-first workflows and the student screens were retained. Assignment/announcement attachment-only files are now excluded from Generate; Task detail presents owner-scoped attachment metadata and a server-resolved, authenticated file open path. Local typecheck and focused sync, routing, Task, Library, Announcement, Reviewer, and Canvas-client suites pass. No production changes or fresh sync occurred. Next: run the normal manual Sync and complete realme attachment/resync/passive-navigation acceptance on a native build with `expo-sharing`. [Evidence and outstanding gates](ai/acceptance/b39/student-workflow-canvas-tasks.md).

## B37 generation regression physical gate (2026-10-01)

**BLOCKED after B37.2.** The Introduction PDF remains physically PASS. The hidden Page-linked file `11574237` is now authenticated, downloaded, validated and stored through the scoped repair `54aa9fd`, deployed as API `dpl_AHpKJsANQzNa3Tya3QqaYusZn89z` and Android preview OTA `01a0f4ef-496a-7c4c-a6e7-52617f4268bd`. Fresh Unit 3 job row `dde023f1-65ef-415b-b888-5550bc845494` cannot stage its Page plus file provenance: production `stage_deferred_canvas_reviewer_pdf_v1` requires exactly one file item. It remains queued with zero worker attempts and no result after an API 503. Next: reconcile this database contract with the already implemented two-source worker path, address the stranded row safely, then rerun fresh Unit 3 acceptance before the 40-page PDF. No further repair was made after this device failure. [Evidence](ai/acceptance/b37/production-generation-regression-20261001.md).

## B39 preview API configuration (2026-09-30)

**PASS.** Runtime configuration failures are separated from authentication, and the Android preview OTA command now validates the EAS preview API address before publishing. Final update `01a0f2ae-79d7-732a-9ba4-c492f2af3545` passed realme acceptance. Canvas jobs stayed at 468 with zero passive additions. Continue using the [guarded preview command](dev/mobile-device-runbook.md#android-preview-updates) for future OTAs. [Acceptance](ai/acceptance/b39/preview-api-configuration.md).

## B38 Canvas admission and physical gate (2026-09-30)

**PASS.** Production API and private worker deployment, manual synchronization, passive zero-job navigation, and realme relaunch passed after explicit user authorization. [Acceptance](ai/acceptance/b38/canvas-sync-admission.md).

## B38 pre-rollout snapshot (historical, 2026-09-29)

**Deployment gate blocked.** Automatic approval review rejected the production Vercel rollout and prohibited a workaround. Obtain authorization for the prepared Vercel, Cloud Run, and preview mobile deployments, then run the realme gates. [Evidence](ai/acceptance/b38/canvas-sync-admission.md).

B37 Google dispatch is committed at `46e66a8`. B38 locally removes full-course sync requests from launch, foreground stale checks, Today focus, and Generate/Tasks refresh. The existing unique active-job index is reused to return the current job on a concurrent request. A bounded token-handoff retry addresses the zero-unit repeat failure associated with a Vercel internal-route timeout, and empty Canvas Pages are excluded from Generate. Next: deploy the verified API/worker/mobile revisions, then run the realme passive-navigation, one-course-at-a-time manual sync, announcement, and relaunch gates. The preceding P0 note is historical.

## Immediate P0: Canvas sync capacity (2026-09-29)

The direct Google Cloud Tasks to private Cloud Run Canvas path is deployed and proved by fresh terminal content/grade jobs for CC6, CIT17 and SOC SCI 103N, all without Workflow. The finalization token handoff bug is corrected. Physical acceptance remains PARTIAL: app navigation and relaunch started additional 7-course batches, one repeat CC6 content delivery failed before units, and an empty CIT17 administrative Page appeared in Generate. Next: correct automatic sync freshness/relaunch admission and the repeat-delivery failure, then rerun physical routing and relaunch acceptance. The earlier capacity note below records the pre-cutover state.

Vercel Workflow has exhausted its usage limit, so accepted Canvas jobs do not execute. Overdue-job expiry and client failure convergence are implemented, with the database reaper applied and Android preview OTA published. Fresh CC6, CIT17 and SOC SCI 103N syncs remain blocked. Restore Workflow capacity or implement the already planned Google-worker Canvas sync migration, then run the three-course physical acceptance and commit the scoped repair only after it passes.

## B39 EAS preview distribution (2026-09-29)

**PASS after authorized native preview-build fallback.** B38 plus header cleanup was delivered by preview OTA, then the old APK's missing native crypto required owner-authorized APK `21be5ea3-f224-4be4-a707-643c7957dd15` from `2c66889`, Android runtime `2.0.1`. Realme Google sign-in, Draft-first UI/headers, Library categories, Reviewer controls, Quiz progress, offline force-stop/reopen and unchanged Draft cards/count pass without Metro. FRESH focused mobile 147/auth 29 tests, typecheck/lint, diff check, export and APK build pass. Preview channel retained; future Android updates target `2.0.1`; no backend rollout, production channel change or push. Next: complete separate native Office DOCX/PPTX-opening acceptance. [Acceptance](ai/acceptance/b39/eas-preview-b38-distribution.md).

## Artifact header simplification (2026-09-29)

Removed repeated course/source banners and generated-date lines from saved Draft/Quiz previews, and repeated course/source context from the Reviewer header. Draft uses one multiline editable title and a header Export action; Quiz preview titles are compact. Topic navigation, question progress, Draft save status, actions and course organization remain. FRESH verification: 67 focused mobile tests, mobile typecheck, changed-screen lint and git diff check pass. Existing Draft, Quiz preview and Reviewer opened on realme with the cleaned headers; no generation or account data changed. Local debug JS only, no deployment or push.

## B38 draft-first assignment UX (2026-09-29)

**PASS.** Draft-first assignment UX is complete locally and accepted on realme: Task -> Assignment -> Generate Draft -> saved editable Draft. Library uses Drafts and the separate Study Activity artifact is no longer exposed. Internal Activity pipeline and B37 source handling remain intact. Fresh Firewall/VPN and Dice Roller each persist once; Firewall/VPN offline force-stop/reopen passes. Automated checks pass. Next: distribute the tested mobile UX through the existing preview update channel; no rollout or next milestone started. Earlier B38 architecture entries below describe separate historical scopes. [Acceptance](ai/acceptance/b38/draft-first-assignment-ux.md).

## B37.1 firewall/VPN Activity acceptance (2026-09-29)

**This generation bug PASS; B37.1 remains PARTIAL.** Course-aware assignment link resolution fixes the specific pre-provider source failure. The same firewall/VPN assignment and Dice Roller generated fresh drafts on realme through private Google worker `generation-worker-00011-n2s`; Queue, Library and firewall force-stop/reopen pass, with one result/draft per new job. Supplemental API error-message rollout awaits explicit authorization after automatic approval review rejection. Other B37.1 gates remain; no B38 work, EAS build or push. [Evidence](ai/acceptance/b37/activity-firewall-vpn-generation.md).

## B37.1 pre-APK polish and B38 order (2026-09-28)

**B37.1 PARTIAL; B37 PARTIAL.** Authorized production API/private-worker rollout is complete (`dpl_6UepXtqEVSPwnZMRYejoN5rMy38x`, `generation-worker-00010-g9v`). Minimal integrated arrows/slider, realme adb navigation/drift, reveal, offline persistence/replay, completion/score and retake/history pass. Fresh Reviewer emphasis, source grounding and three-page PDF pass. Fresh Matching generation loses pair labels during publication; tested forward migration `1025208` awaits Supabase approval, followed by fresh pairing/partial-credit acceptance. Real-finger 10/30/100 slider and remaining Activity task/native Office acceptance remain open. Earlier Activity persistence/PDF/DOCX/PPTX evidence is preserved. Do not make the EAS build yet; no origin push. [B37.1 evidence](ai/acceptance/b37/pre-apk-study-experience-polish.md).

After B37.1 passes, **B38 — Durable Canvas Sync Migration to Google Worker** is next. Keep Mobile → authenticated Vercel API → durable Supabase job → internal Google worker → Canvas → canonical Supabase data. Vercel owns validation, ownership, job start/status and lightweight API; the existing Google worker owns pagination, courses/modules/instructional files/Pages/tasks/announcements, downloads, checkpointed ingestion and bounded retry. Supabase owns job state, RLS, provenance, normalized data and generated artifacts. Design for interruption recovery, observable progress, isolated material failures, idempotent repeat sync, historical data retention and disconnect/reconnect. Preserve instructional material → Generate, deadline work → Tasks and announcements → Announcements. Keep worker credentials out of Mobile and logs. **B38 is not implemented.** Then run production Canvas lifecycle acceptance, make one new EAS preview APK and finish physical-device acceptance.

## B37.2 non-Canvas acceptance and build gate (2026-09-28)

**PARTIAL.** Non-Canvas sources (Text, Camera, Local File) and the 100-item Quiz pass physically after the immutable-source claim fix and two extraction-panel fixes. Canvas sync is blocked by the Vercel Workflow quota, so B37 closure and the signed preview APK wait for a fresh Canvas sync and a disconnect/reconnect check. Canvas sync jobs still run on Vercel Workflow; moving them to the Google worker would remove this failure mode. Consider this for B38. [Ledger](ai/acceptance/b37/study-experience-overhaul.md).

## B37.2 continuation in progress (2026-09-28)

Authentication and Canvas lifecycle implementation is deployed; email/password restoration, native S256, invalid Canvas token handling and same-account replacement have fresh device evidence. Owner/history fingerprints are retained. Resend delivered one deduplicated server-originated test message; a verified sender domain is still needed for general student delivery. Manual linking readiness now returns 200 after the user's saved setting change. Google/Microsoft device acceptance is continuing.

The normal quota admitted the fresh VPN 30 Mixed (30 persisted, two calls, no repairs) and Firewalls 100 Mixed (batch 4 duplicate rejection after seven calls, no published result). Finish provider flows, Canvas disconnect/reconnect/sync, Queue/Library reopen and Text/Camera/Local File physical acceptance before deciding B37 closure. Study Assist latency optimization remains deferred. API `dpl_6A3CygzdmL4u3jzUd9zkKZZb8afL`, unchanged private worker `generation-worker-00009-jzb`, Canvas migration `20260928001117`; 0 EAS builds, no push, `tmp/` untouched. [Ledger](ai/acceptance/b37/study-experience-overhaul.md). Earlier quota-stop checkpoints remain historical.

## B37.2 opening production gate (2026-09-28)

**PARTIAL — migration/deployment/small-source rejection verified; fresh 30 Mixed blocked at the existing daily quota (25/25), so B37.2 is NOT STARTED.**

The approved B37.1a migration is recorded once in `xfdbwfqtorelmurncyql` as version `20260927230139`, name `20260928100000_canonical_non_canvas_sources`; reviewed local filename unchanged. Sources/courses/original Quiz row fingerprints match, all 15 historical Quizzes remain readable, and RLS/grants/owner-source constraints are preserved. No reset or deletion. Production API `dpl_FnAWyTzQmfNgsQLuo5rQyPKpdzbv` is READY for `0c354ac`, health 200 and signed-out Library 401. Private worker `generation-worker-00009-jzb` serves 100%; anonymous health 403. Build/digest and detailed verification are in the ledger.

VPN sections 6–10 have 26 concepts, 5 duplicate exclusions and capacity 52. Direct 100-item admission returns typed 422 with maximum 52, no job and zero provider calls. The whole VPN Reviewer still calculates capacity 100; its whole-source capacity is not claimed to pass a below-100 check. Fresh 30 Mixed returns 429 `rate_limited`, no job/provider calls: 25/25 daily jobs, zero queued/running. The next window starts **2026-09-28 08:00 Manila**. An existing Canvas `2. Firewalls.pdf` Reviewer is a candidate with 138 concepts/capacity 100. No fresh 100-item, Queue/Library completion or non-Canvas physical flow was run after the required stop. Do not bypass the quota.

Realme `PB6DWWEIHAUCMZOR` loaded current JS against production, retained the authorized owner's session, and loaded existing Library/Queue data. Tokens stayed in the app. The corrected config `stay-focused-v2/env.local` matches production; only variable names/presence are recorded. Initial inventory approval blocks were resolved for aggregate counts after explicit user approval; private content exports were not bypassed. Fresh Quiz tests: 157 passed, 2 existing skips; focused database tests: 30 passed, 2 skips (overlapping); production build and `git diff --check` pass. No EAS build, auth/Canvas credential/Resend implementation, live email or new lifecycle acceptance. Existing unrelated Supabase security-advisor warnings remain recorded for separate review.

The authenticated Supabase user UUID is the canonical owner.

Canvas credentials authorize synchronization.
They do not own Stay Focused data.

Resume the 30/100 and non-Canvas physical gate after daily admission resets, then B37.2. Study Assist latency remains approximately 20 seconds and optimization is deferred. `tmp/` untouched; no push.

[Detailed B37 rollout and acceptance ledger](ai/acceptance/b37/study-experience-overhaul.md).


## B37.1a local checkpoint before rollout (2026-09-28)

The local implementation reuses owner-bound `source_versions` for Text, Camera and Local PDF; Reviewer and Quiz share canonical source identity, existing generation, capacity and Library persistence in code. Canvas-specific IDs remain source provenance only. Non-Canvas sources do not use fake Canvas IDs. The rising Other source sheet persists on Continue, with no manual Save. Activity remains a separate Canvas assignment flow. The live Supabase migration was rejected by automatic approval review because its production Quiz constraint and RPC changes lacked clear authorization; the physical app's API was unreachable. That earlier approval/rollout blocker is resolved by the opening-gate checkpoint above; physical Android source and Library acceptance remains pending. Then run fresh small-source, 30-item and 100-item B37.1 production acceptance and Queue/Library reopen before B37.2 authentication. Study Assist latency follows B37 closure. [Ledger](ai/acceptance/b37/study-experience-overhaul.md).

Source acquisition may differ. After normalization/persistence, generation uses the same current engine.

## B37.1 capacity and non-Canvas decision (2026-09-28)

**PARTIAL.** The Generate UI now offers Text, Camera and Local File in a rising sheet verified on realme. Finish the canonical ownership/provenance design for those sources so they can use the same Reviewer, Quiz and Library pipeline as Canvas without invented Canvas IDs. Then deploy the scoped capacity/repair code, verify the small VPN source, find a legitimate instructional source with capacity at least 100, and run fresh 30/100-item and remaining physical acceptance. Study Assist selected-Reviewer fetch optimization follows B37 closure. [Checkpoint](ai/acceptance/b37/study-experience-overhaul.md).

## B37 study experience overhaul (2026-09-27)

**PARTIAL.** Batched Quiz generation, retry, exact-wording contract, key-point result reopening and Android sheet swipe-to-close are live and verified; 30-item production Quizzes pass. Next: decide how 100-item Quizzes stay unique (concept planning before batches or a source-size guard), make Study Assist reads scoped or co-locate the API with Supabase, then finish device acceptance and spend the single EAS build only after every gate passes. [Implementation and acceptance ledger](ai/acceptance/b37/study-experience-overhaul.md).

## B38 Google generation cutover readiness (2026-09-27)

**PASS — production generation cutover complete.** The B37 Quiz failure was a multi-select prompt/type mismatch; the prompt was repaired without relaxing validation. Fresh Google-backed Quiz, terminal duplicate replay, scoped Vercel OIDC federation and authenticated dispatch pass. After the user confirmed deployment capacity, one READY production deployment `dpl_Cgp6geT9JJrE2epyR9zQDmmYxvbL` switched routing to Google Cloud. Health and one owner-authenticated real instructional Quiz passed through the production API, queue, worker, persistence and Library reopen. Vercel Workflow remains the rollback path; no Android/EAS build was used. See [acceptance](ai/acceptance/b38/google-generation-cutover-readiness.md).

## B37 Google Cloud generation foundation (2026-09-27)

**PARTIAL.** A private Cloud Run worker and OIDC Cloud Tasks queue in the existing Stay Focus project executed the shared Reviewer/Quiz/Activity pipeline without a Vercel deployment. Five fresh Reviewer source formats and Activity succeeded, including existing scanned-PDF Google OCR and Library reopen. Quiz failed existing source validation; terminal replay was not executed after automatic approval review hit its usage limit. Vercel dispatcher workload identity and deployment capacity remain B38 prerequisites. Production still uses Vercel Workflow. See [acceptance](ai/acceptance/b37/google-cloud-generation-foundation.md).

## B37 Reviewer Study Assist (2026-09-27)

**PASS - production and realme acceptance complete.** On-demand Summarize, Explain simply, Analogy and Example use existing canonical Reviewer blocks and the contextual sheet, with a separate owner-scoped SQLite cache, content/prompt invalidation and concurrent-request deduplication. Reviewer and Quiz prompts/schemas are unchanged; cache isolation is regression-tested. Fresh mobile 677/677, API 947 passed / 3 existing opt-in skips, shared 44/44, provider contracts 19/19, forced typecheck/lint 7/7, API build and mobile export pass. Production deployment dpl_F87NsbQVEkbisWzJ1VZqiXtt5RKD is READY. EAS preview group c52531f9-a177-4b82-b73b-533f7ef0b93c reached the realme. All four live assists, cached sheet/Reviewer reopen, offline cached reuse after force-stop/relaunch, uncached-offline guidance, canonical integrity and Quiz UI pass. Logs show exactly four successful generation requests and zero additional calls for cached reuse; no deployment error entries. See [acceptance](ai/acceptance/b37/reviewer-study-assist-acceptance.md). Reviewer generation-quality review remains a separate user-guided milestone.

### B38.2.1 ribbon refinement (2026-09-26)

Dev-lab glow, palette flow and true ribbon-shape morphing are implemented and physically checked; mobile 576/576, typecheck and lint pass. Continuous completion and stopped failure/Reduced Motion are preserved. See [follow-up](ai/acceptance/b38-2-1/ribbon-glow-refinement.md). Original visual acceptance remains PARTIAL: approve material/shape and directly profile GL before production integration.

## B38.2.1 Knowledge Core visual prototype (2026-09-26)

**PARTIAL — prototype-only; production integration remains gated.** Real GL geometry, six states, theme variants and Reduced Motion work on the realme. Complete keeps moving slowly; Error stops. Mobile 574/574, typecheck and lint pass with four existing warnings. Materials/transparency and direct GL pacing still need acceptance; UI-frame evidence alone is insufficient. See [acceptance](ai/acceptance/b38-2-1/generation-core-prototype.md). Next for this visual: refine geometry/materials, reprofile, and approve before replacing the production SVG. B39 E2E remains separate; no job/Queue behavior changed.

## B38.2 physical-use repair (2026-09-25)

**PASS with limitations — Canvas sync, navigation, Reviewer navigation, course-first IA, motion and theme are repaired and physically accepted on the realme RMX3151.** Canvas sync had not run for six days. Durable jobs and credentials were healthy, but the only trigger was a buried legacy page, and every visible Refresh re-read stale rows. No account had ever synced submissions either, so Tasks counted submitted work as missing. Mobile now has one account-level sync (content + grades per selected course): it resumes on foreground, refreshes automatically when data is older than 6 hours, and shows a calm status line with Retry. Two latent defects were also fixed: stale idempotency-key replay and a lost-update race on job references. Announcement detail is a dismissible modal route; the old sheet re-selected the deep-linked announcement on every dismissal. Generate, Tasks and Library use one stack route per level, so header, Android and swipe back walk the hierarchy. Reviewers gain local find (highlights, count, previous/next) and a right-edge topic scrubber that activates only on a still hold. Also delivered: course-first Tasks with real due/past-due/completed counts, a uniform Library course grid with an All/Reviewers/Quizzes/Activities control, and title-first shared course identity. Motion uses native hierarchy slides, modal rises and tab fades, with a Reduced Motion fallback. The free-time ring is calm and theme-accented. A labelled UC-inspired (not official) palette is available. Mobile-only: no API, schema or migration change. Fresh mobile 569/569, typecheck, and lint with 0 errors. Delivered as EAS preview update `7b04c8e2` at `2974ced`. Screen recording is NOT RUN (ROM lacks `screenrecord`); physical Reduced Motion is BLOCKED (settings writes denied). Frame timing (17% janky over transitions) needs a performance pass. See [B38.2 acceptance](ai/acceptance/b38-2/physical-use-repair.md). Next: B39 Full E2E / Demo Acceptance.

## B38.1 production generation quality acceptance (2026-09-24)

**PASS.** Fresh production PDF Reviewer, same-source Quiz, PPTX Reviewer, and assignment-grounded Activity Output passed source fidelity, coverage, correctness, readability, physical-device presentation, Queue/background, Library, and relaunch acceptance. A real PPTX contract-budget failure was traced to the response schema's per-source-ID enum, repaired without weakening local exact-reference validation, deployed as `dpl_EBwoR9gdNTvWBTMdezJD1ydqDXdk`, and successfully retested. See [B38.1 acceptance](ai/acceptance/b38-1/production-generation-quality-acceptance.md). Next: B39 Full E2E / Demo Acceptance.

## B38.0 Generate course state and material loading repair (2026-09-24)

**PASS.** This was a blocking repair before B38 quality testing. Generate now uses the Sync page's course inventory, so tapping a course follows its sync status: unsynced or incomplete courses go to Canvas sync, synced courses open Generate. What a synced course shows follows material eligibility: its materials or "No study materials found". Current courses come before previous ones. The HIST 100 "Materials could not be loaded" defect was an unselected course reported as a server outage. Deployed without a migration and accepted on Android. See [B38.0 acceptance](ai/acceptance/b38-0/generate-course-state-and-material-repair.md). Next: B38 Production Generation Quality Acceptance.

## B37.1 production migration and runtime closure (2026-09-24)

**PASS.** Production migration metadata was reconciled, the canonical Reviewer migration and owner-scoped read-grant follow-up were applied, and the corrected API deployment is READY. Signed Android acceptance covered both Quiz gates, explicit-confirmation spend safety, one real canonical Quiz through the durable Queue, offline SQLite reopen, canonical management, successful disposable deletion, and dependency-protected deletion. Legacy `reviewers` remains compatibility-only with zero rows and no active runtime reads. See [B37 acceptance](ai/acceptance/b37/generated-artifact-convergence.md). Next: B38 Generation Quality Acceptance.

Current milestone order: B34 Current Mobile UX Repair → B35 On-Device Artifact Persistence → B36 Signed Physical UX + Offline Acceptance → B37 Generated Artifact Model Convergence → B38 Generation Quality Acceptance → B39 Full E2E / Demo Acceptance → B40 Capstone & Release Hardening.

## B37 generated artifact model convergence (2026-09-23)

**PARTIAL — canonical implementation passes locally; production migration and workflow acceptance remain.** All current source consumers now use owner-scoped `generated_artifacts` identity and persisted current versions. The forward migration preserves historical Quiz rows, adds an owner-safe canonical Quiz FK, and keeps the legacy table for later audited retirement. Saved-Reviewer management/deletion and B35 local removal use canonical IDs. Queue opening no longer accepts billable work. Production was not mutated because the known remote migration-history mismatch remains unresolved and no safe Supabase access path was available. See [B37 acceptance](ai/acceptance/b37/generated-artifact-convergence.md). Next: controlled B37 production rollout/smoke, then B38.

## B36 signed physical UX + offline acceptance (2026-09-23)

**PARTIAL — signed post-B35 physical acceptance completed; two items are unreachable on this branch.** Signed preview APK `245ccaec` at `1e81edd` (expo-sqlite included, signing identity unchanged) was installed on the realme RMX3151. B34's pending physical matrix now passes: Generate synced-course browser, Reviewer hierarchy, generation visual with status-independent layout, Library paging and indicator, Today handle geometry, and motion. B35 passes on device: local-first Library before any network call, force-stop/relaunch from the device store, full airplane-mode reading of Reviewer, Quiz (read-only, no answer keys, no scoring), and Activity Output, and reconnect with no duplicates or loss. Logout clears the session and the owner re-authenticated. Two bounded layout defects were repaired in `1e81edd`. Quiz generation and the supported Reviewer deletion flow remain unreachable because the Quiz gate, quiz source resolution, and Reviewer management still read the retired `reviewers` table while artifacts live in `generated_artifacts`; that needs a migration and RPC change, not an on-device repair. No second test account exists, so cross-account isolation stays covered by automated tests. See [B36 acceptance](ai/acceptance/b36/signed-physical-offline-acceptance.md). Next: B37.

## B35 on-device artifact persistence (2026-09-22)

**PASS — completed Reviewers, Quizzes, and Activity outputs are stored on the device and the Library is local-first.** An owner-scoped, versioned expo-sqlite store holds the authoritative cloud copy after the server has persisted the artifact. The Library renders from it before any network call, reconciles in the background without blanking, retains local rows on failure or remote-list absence, and removes a row only on an explicit owner-authenticated `not_found`. Explicit sign-out purges that owner's rows. Supabase, RLS, durable generation, and Queue are unchanged. A new native build is required. See [B35 acceptance](ai/acceptance/b35/on-device-artifact-persistence.md). Next: B36.

## B34 current mobile UX repair (2026-09-21)

**PARTIAL — the connected mobile UX implementation and automated gates pass; authenticated changed-build physical acceptance is pending.** The repaired surfaces are Generate information architecture, persisted Reviewer→Quiz dependency, Reviewer hierarchy, generation visual/stable layout, Library paging/loading/cards, Today handle geometry, and shared reduced-motion-aware interactions. The ADB-authorized realme loaded the local changed bundle but Expo Go has no access to the signed app's session; a signed EAS preview requires explicit upload approval. See [B34 acceptance](ai/acceptance/b34/current-mobile-ux-repair.md).

## B33 student-material ingestion closure audit (2026-09-21)

**PASS — supported student-material ingestion matrix is closed.** The former standalone DOCX/PPTX production milestone was absorbed by B31, and B32 closed scanned-PDF reliability; those production jobs should not be repeated without a new reproduced defect. B33 verified the complete Page/PDF/Office/image eligibility, acquisition, extraction, provenance, durable-generation, Queue, persistence, and Library evidence chain and repaired the one remaining concrete boundary defect: Tasks now admits Canvas assignments only when deadline-bearing and/or submittable. Positive Canvas instructional-image discovery remains naturally fixture/Student-permission limited and does not block the roadmap. See [B33 acceptance](ai/acceptance/b33/student-material-ingestion-closure-audit.md). Next: B34 generation quality acceptance.

## B32 scanned-PDF runtime reliability (2026-09-20)

**PASS — the 16-page Accounting scan now completes through checkpointed production inspection, OCR, ordered source attachment, AI generation, Queue, and Android Library persistence/reopen.** The final READY deployment is `dpl_EekcdmCmpfdoobvYouekuXrUmMEd`; the accepted fresh job is `a85bd672-2aed-401b-a37e-fd1c794d826f`. See [B32 acceptance](ai/acceptance/b32/scanned-pdf-runtime-reliability-acceptance.md). Next: B34 generation quality acceptance; revisit B33 only for a newly proven DOCX/PPTX defect.

## B31 student-accessible Canvas material acceptance (2026-09-19)

**PARTIAL — fresh Student-accessible Canvas text PDF, DOCX, PPTX, and Page Reviewers pass production generation, persistence, Queue/background use, Android Library retrieval, and relaunch reopen.** A proven FL 100 administrative-module routing defect was narrowly repaired and deployed as READY production `dpl_DKat3ypp6q4V5UETSKuDbJjLymcK`. The real 16-page Accounting scan now prepares to `PDF · ready`, but generation submission OOMs before durable job creation; exact internal provenance/byte/signature fields were not safely inspectable from student-facing surfaces. No eligible instructional image exists. See [B31 acceptance](ai/acceptance/b31/student-accessible-canvas-material-production-acceptance.md). Next: B32 scanned-PDF reliability.

## B30 Canvas instructional-image production acceptance (2026-09-19)

**PARTIAL / CLOSED WITH PLATFORM LIMITATION — the image-routing guard is deployed, READY, healthy, and verified to exclude administrative and ungrouped image noise after fresh physical-device synchronization.** The Student-only Canvas identity cannot create a direct teaching-module image fixture. Teacher/Designer cooperation and sandbox access will not be pursued. Automated routing tests remain the acceptance evidence unless a suitable student-accessible instructional image occurs naturally. This external Canvas-permission limitation does not block the student product roadmap. See [B30 acceptance](ai/acceptance/b30/canvas-instructional-image-production-acceptance.md).

## Former B33 DOCX and PPTX production milestone (absorbed)

Status: **Closed and superseded by the B33 closure audit above.** Real Student-accessible Canvas DOCX and PPTX acquisition, extraction, durable generation, persistence, Queue, physical Android rendering, and Library reopen were completed early in B31. B32 then closed the remaining scanned-PDF format blocker. Do not repeat a standalone Office-format milestone unless a new student-facing defect is reproduced.

## B36 Signed Physical UX + Offline Acceptance

Status: **PARTIAL and closed.** Signed post-B35 builds were produced and accepted on the realme RMX3151; see the dated entry above. Do not repeat the physical matrix without a new reproduced defect.

Complete B34's pending physical matrix (Today, Generate, Queue, Library, Reviewer, generation, motion, gesture conflicts, relaunch, accessibility) and accept B35 on device: generation completion stored locally, force-stop/relaunch Library before network, airplane-mode Library and Reviewer/Quiz/Activity opening, reconnect reconciliation, and sign-out/account-switch isolation.

## B37 Generated Artifact Model Convergence

Status: **PARTIAL.** Implemented and locally verified; production migration, deployment, authenticated smoke, safe deletion, and physical accidental-spend acceptance remain.

## B38 Generation Quality Acceptance

Status: **PASS and closed by B38.1.**

Fresh PDF Reviewer/Quiz, PPTX Reviewer, and Activity Output acceptance covered grounding, source fidelity, formatting, larger extracted context, durable Queue behavior, Library, and relaunch. The reproduced PPTX `request_exceeds_context_budget` defect was repaired at the structured-output contract boundary and retested in production. Previously accepted ingestion work remains historical evidence rather than being duplicated. See the dated B38.1 entry above.

## B39 Full E2E / Demo Acceptance

Status: **NEXT — ready to begin after B38.1 PASS.**

Run the complete authenticated Canvas-to-generation-to-Queue-to-Library demo matrix, including background/relaunch and failure recovery.

## B40 Reviewer Smart Selection Learning Tools

Status: **PASS (2026-10-01).** Topic tap → existing Study Assist sheet → selectable concept text → Define / Explain / Example / Test Me / Ask with lazy refinements, automatic labelled grounding, source-only Test Me, and server-enforced cost limits. Production-deployed (`dpl_CW3TWB9FjkXAoMvBPRbMntZvqMaR`, OTA `ded5f2a6`). [Acceptance](ai/acceptance/b40/reviewer-smart-selection-learning-tools.md).

## B41 Native Office DOCX/PPTX Opening Acceptance

Status: **PASS (2026-10-01).** Exported Draft DOCX and PPTX files open in Google Docs and Slides on the realme, after a line-break export fix shipped by OTA `9129850a`. [Acceptance](ai/acceptance/b41/native-office-docx-pptx-opening.md).

## Capstone & Release Hardening (formerly labelled B40)

Status: **NEXT.**

Close release, evidence, operational, security, and capstone presentation readiness without weakening the accepted product contracts.

## Canvas permission boundary

Stay Focused V2 will not depend on teacher or instructor cooperation for development, testing, demonstration, or capstone acceptance. Features requiring Teacher/Designer privileges must be supported by automated tests, exercised only through naturally available student-accessible content, or documented as external platform-permission limitations. They do not block the core student product roadmap.

## B29 live OCR and learning-image acceptance (2026-09-19)

**PARTIAL — live one-page scanned-PDF OCR, instructional-image OCR, fresh Reviewer generation, persistence, and Android Library retrieval pass.** The synchronized Canvas account provides no eligible direct-module teaching image, so Canvas learning-image discovery and the local routing repair remain physically unexercised. Generate now rejects ungrouped Canvas images such as course banners/profile artwork while retaining direct teaching-module images; administrative exclusions remain. One 16-page image-only accounting scan stalled before OCR and was cancelled safely. See [B29 acceptance](ai/acceptance/b29/live-ocr-learning-image-acceptance.md). Next bounded task: B30 deploy and physically accept one consented direct-module Canvas instructional PNG/JPEG, including provenance and decorative-image exclusion.

## B28 ingestion coverage and document-format acceptance (2026-09-19)

**PARTIAL — fresh production PDF, PPTX, and Canvas Page ingestion and generation passed; live OCR and Canvas DOCX coverage remain.** Three new owner-linked Reviewers completed and opened on physical Android from substantive CC16, CC17, and CC13 materials. The source snapshots retained 33 PDF pages, 39 PPTX slide markers, and 137 Page blocks. DOCX is implemented and extracted from a local fixture but absent in the Canvas account; scanned PDF and instructional image OCR await real sources. The accepted B27 deployment remains live. See [B28 acceptance](ai/acceptance/b28/ingestion-document-format-acceptance.md). Next bounded task: B29 live scanned-PDF and instructional-image OCR, including a decision on whether module-linked learning images should appear in Generate.

## B27 student-facing Canvas announcements (2026-09-18)

**PASS — B27 production rollout and authenticated physical announcement acceptance are complete.** Implementation commit `6b0a806` is live in READY deployment `dpl_BXWY9fC2L59bzJnPscspMdKLZHpT`; the metadata schema is applied, a fresh Canvas sync retained author data, and the signed Android app passed real Today/list/detail/Canvas-handoff and B26 routing checks. Links and attachments have no current source example. Reconcile the connector-assigned remote migration-history version with the local filename before a future CLI push. See [B27.1 acceptance](ai/acceptance/b27/student-facing-announcements.md). Next: B28 ingestion coverage and document-format acceptance.

## B26.1 deployed Canvas routing and Activity reliability acceptance (2026-09-18)

**PASS — B26 Canvas routing and Activity reliability acceptance is complete. B27 may begin.** The routing repair and two generic Activity requirement/personalization repairs are live in READY production deployment `dpl_GKBaGect3Gvh4Nq6w7Ny8HzYVz7v`. Standalone realme validation before and after normal sync confirms learning Pages/PDF/PPTX in Generate, assignments in Tasks, announcements separated, and retained orientation material excluded. Five completed fresh Activity types passed all prewritten mandatory checks; a sixth was consistently source-limited before provider execution. Full verification passes except the existing local Expo external-link export limitation. See [B26.1 acceptance](ai/acceptance/b26.1/deployed-routing-and-activity-reliability.md). Next milestone: B27 remaining application redesign, beginning with a student-facing announcement experience.

## B25.3.4 standalone and AI-first production acceptance (2026-09-17)

**PASS — B25 is complete; B26 may begin.** The repaired existing APK passed physical standalone acceptance on the realme RMX3151: session/Canvas, one new completed Reviewer, five-question server-scored Quiz, one Canvas-instruction-grounded Activity draft, and Queue/Library cold-relaunch persistence. AI-first production paths, API security/health, and mobile regressions passed. See [B25.3.4 acceptance](ai/acceptance/b25.3.4/device-standalone-ai-first-acceptance.md). Next: B26 generation-quality evaluation across multiple real Reviewer materials and Activity assignment types. Earlier PARTIAL entries are historical.

## B25.4 physical-device acceptance (2026-09-16)

Authenticated physical production-API runs completed a real CIT6 Reviewer, exact 5/5 Quiz with server-scored 100% attempt, and CC16 Learning Contract Activity. Queue and Library persisted all three and the result reopened. A corrupt local generation cache defect was fixed and retested in Expo Go; the full regression passed. The patched standalone APK is being built for installation and release-path retest, so **B25 remains PARTIAL; B26 may not begin**. See [B25.4 device checkpoint](ai/acceptance/b25.3.3/device-acceptance.md).

## B25.3.3 AI-first generator migration (2026-09-16)

Real-material comparison is complete. Reviewer routes/worker/Workflow, whole-set Quiz and Activity now use the shared coherent-context/AI/thin-contract boundary. Legacy Quiz and Activity semantic planners and the duplicate Reviewer Workflow pipeline are removed. Full deterministic regression, typecheck, lint and build pass. Production 09835be / dpl_9yAtq2sy2YYRfYjoqytHCL6aWUa4 is READY and healthy. Physical acceptance is blocked on direct device sign-in and Activity assignment selection; B25 remains PARTIAL and B26 may not begin. See docs/ai/acceptance/b25.3.3/architecture-simplification.md and the accepted ADR.

## B25.3.2 candidate convergence (2026-09-15)

Commit `79e54dd` adds source-compatible blueprints, two-candidate pools, deterministic selection, cumulative semantic-intent exclusions and v4 durable call bounds. Strict quality, secrecy, ownership and exact-count gates remain. Focused Quiz 117; full Quiz 168 passed / 3 skipped; API 944, Mobile 481, Canvas 73, Engine 606, OCR 27, Shared 44; Workflow 1, provider contract 18; fresh root typecheck/lint/build 7/7 each. One live fixture passed 5/5 in 63.331 seconds with two author/two verifier calls and 14 candidates. Deployment `dpl_peVBgRctKVmGTfkNfQqTev74QCda` is READY and canonical health is OK.

The single authenticated production attempt on the unchanged real lecture failed: job `d038e85b-ae03-4853-aa2a-f663037415b0`, Workflow `wrun_01M2J4TSMPMWB6SPQXW8F0CTH0`, 4/5 accepted, q3 pending, `repair_exhausted` / `bounded_repair_attempts_exhausted` / `quiz_generation_failed`. Eighteen candidates and four author/four verifier batches; no Quiz persisted and no retry submitted. q1/q4 accepted second alternatives; q5 converged after a new intent; q3 failed even with alternate support. The realme showed the Generation failure and opened Queue; Library/attempt/secrecy/score/result/reopen remain unaccepted.

B25.3.3 should preserve source context and precise evidence ownership, select supports with enough evidence for meaningful distractors, and plan full-set concept/difficulty feasibility before immutable acceptance. **PARTIAL — Quiz semantic convergence remains incomplete.** B26 may not begin. See [B25.3.2 report](ai/acceptance/b25.3.2/quiz-candidate-convergence.md).


## B25.3.1 real-material Quiz semantic convergence (2026-09-15)

The implementation now sends structured validator findings, permits complete slot reauthoring, escalates to unused compatible support, derives mixed difficulty from source affordance, preserves accepted questions, and keeps the exact-count/grounding/distractor/leakage/academic-value gates strict. Fresh full verification and the final bounded synthetic-live attempt pass; production deployment `dpl_3UxRUwZDy5iGgkX1j8HnLpJBqpnD` is `READY` and healthy.

The single real-material production retest still accepted only 1/5 and exhausted all bounded repair phases with four pending slots. No Quiz artifact or persisted attempt/result was available. **PARTIAL — Quiz semantic convergence remains incomplete.** The next B25 follow-up must use this symbolic failure trace under separately authorized provider/production limits; B26 does not begin automatically. See [B25.3.1 report](ai/acceptance/b25.3.1/quiz-semantic-convergence.md).

## B25.2.1 Generation orb animation repair (2026-09-14)

The Generation orb now uses independently animated halo, deforming body, spectrum wash, highlights and orbital light rather than moving one static SVG composition. Press/hold compresses and brightens it; tap pulses; blur, background, terminal state and unmount stop the native-driven loops; reduced motion holds a stable phase.

Fresh verification: Mobile 481 tests in 40 files, mobile typecheck and lint passed. Physical realme RMX3151 profiling recorded 0.51% janky frames with 14 ms p99 over 1,177 frames, no temperature rise, and one frame over 10 seconds after navigating away. **PASS — the focused orb repair is accepted; B25's separate Quiz-generation acceptance remains PARTIAL and B26 was not started.** See [B25.2.1 report](ai/acceptance/b25.2.1/generation-orb-repair.md).

## B25.2 core UI visual repair (2026-09-14)

Implemented compact shared controls/surfaces, quieter bottom navigation, detailed Today ring, material/task/artifact rows, compact Queue and a layered Generation orb. Three screenshot cycles preserve the accepted fixture data; final reference comparisons and a real bottom-navigator web preview are saved for human review.

Fresh verification: mobile 477 tests; mobile typecheck; forced root typecheck, lint and build all 7/7 with zero cached tasks. Sixteen browser interaction checks passed. Backend behavior and unrelated persistence/workflow changes are preserved.

PARTIAL — implementation improved but visual convergence still requires work. The orb remains more geometric than the reference; populated Today and native typography/motion remain unverified because the connected realme is locked. No B25.1 or B26 work starts automatically. See [B25.2 report](ai/acceptance/b25.2/final-comparison-v2.md). This status supersedes the earlier B25 next-step guidance below.

## B25 mobile redesign foundation (2026-09-13)

Implemented the Today / Generate / Tasks / Library shell, shared light/dark/system themes, interactive day-ring planner entry, hidden durable Generation/Queue, Canvas material actions, Activity Maker entry and saved-artifact consumption. Existing deep functionality remains reachable. No production AI model, schema or planner changes.

Automated verification is passing; physical acceptance is pending because the connected realme remains locked. Component-only dark/light renders were compared with the approved references. Hosted B24.6/B24.7 rollout is not certified by this mobile work. B25 is PARTIAL until authenticated device validation is completed; then proceed to B26 deep screens and advanced animation polish. See [B25 acceptance](ai/acceptance/b25/ui-redesign-foundation.md).


## B24.7 Quiz backend (2026-09-13)

**PASS — Quiz backend is ready and core backend capability is complete for the UI redesign.**
Owned prepared material and saved Reviewer source relationships now feed durable,
source-grounded quizzes with server-only answer keys, persisted attempts,
deterministic exact-set scoring, weak-area navigation and Library reopen.
Reviewer, Activity Maker and Quiz capabilities are available in the new code.
Quiz uses the existing provider adapter with its own pinned GPT-5.4 model;
Reviewer and Activity model defaults and behavior are unchanged.

Fresh verification: API 906 passed plus three opt-in live tests skipped; mobile
443, Canvas 73, OCR 27, shared 44 and engine 606. Forced root typecheck/lint/build
passed 7/7 each with zero cached tasks and no lint warnings; Workflow runtime 1
and provider contract 18 passed. Both five-question live fixtures passed final
whole-set verification, local SQL attempts/scoring and Library reopen after
three rejected questions were repaired. Earlier academic failures are documented;
the limited sample is not a production reliability benchmark.

Pending rollout: apply Activity migration `20260912100000_activity_maker.sql`
then Quiz migration `20260912110000_quiz_maker.sql`, deploy API and smoke test.
No hosted migration, deployment, UI redesign or push occurred in B24.7.
This entry supersedes earlier Quiz-missing statements. Acceptance evidence is
under `docs/ai/acceptance/b24-7/`, including quality limits and failure history.

Next: B24.8 — Backend rollout readiness, then B25 — Apple-inspired 2026 design
system + mobile app shell.

## B24.6 Activity Maker backend (2026-09-12)

**PASS — V1-informed Activity Maker backend is ready for the redesigned UI.**
The verified GitHub V1 audit informed owned Canvas assignment/resource assembly,
DOCX/PPTX structural ingestion, TaskSpecification, source-grounded structured
generation, transactional editable drafts and Library/Activity Detail integration.
Activity Maker is available in the new code; Quiz remains unavailable. No UI,
Reviewer-engine rewrite, planner replacement or Canvas submission behavior added.

Fresh verification: API 768 passed plus one opt-in live test skipped; mobile 443,
Canvas 73, OCR 27, shared 44 and engine 606. Root typecheck/lint/build passed 7/7
with zero cache hits and no lint warnings. Provider contract 18 and existing
Workflow runtime 1 passed. Two live provider fixtures passed instruction/grounding
checks and local Postgres persistence/reopen/edit/regeneration validation.
Database policies, retention and account deletion passed deterministic SQL tests.

Deployment prerequisite: apply `20260912100000_activity_maker.sql` before the API
that reads Activity drafts. Hosted migration/RLS/deployed Activity execution were
not run. Legacy DOC/PPT, advanced Office layout/media and output export remain
outside this slice. Earlier phase entries below are historical; B24.6 supersedes
their Activity Maker/DOCX/PPTX missing-capability statements.

Next: B24.7 — Quiz generation, attempts, results, weak-area mapping and Library
persistence. Acceptance evidence is under `docs/ai/acceptance/b24-6/`.


## B24.5 backend experience contracts (2026-09-12)

**PARTIAL — core contracts are aligned but a product capability still requires
backend implementation.** Shared student DTOs and authenticated API experience
services now compose Today, Learn, Activities and Library. Reviewer admission
reuses source preparation, snapshot/freshness gates and durable jobs; Library
opens persisted output and deduplicates the existing automatic save path.
Capabilities explicitly disable missing Quiz, Activity Maker and calendar
implementations. No UI redesign, migration, model/provider selection change or
planner algorithm change. The standalone provider contract's pre-existing import
resolution issue is repaired with an equivalent relative import.

Fresh verification: API 710, mobile 443, Canvas 73, OCR 27, shared 44 (22 distinct source tests), engine 606,
Workflow runtime 1 and provider contract 18; forced typecheck/lint/build each pass
7/7 with zero cache hits and zero lint warnings. Hosted RLS/new APK acceptance
NOT RUN. Pre-existing persistence edits are preserved and excluded from this commit.

Next: B24.6 Activity Maker generation and owner-scoped draft persistence, then a
separate Quiz generation/attempt/results slice. Reconcile the completed B24
specification (not found in this checkout) before B25 app-shell implementation.
See [B24.5 contract](ai/acceptance/b24-5/backend-ui-contract.md) and [verification](ai/acceptance/b24-5/verification.md).


## B23 mobile recovery foundation — current result (2026-09-12)

**PASS — B23 mobile recovery foundation proven; ready for B24 full UX/UI redesign.** The physical Android flow now survives backgrounding, process death during a running Reviewer job, and temporary network loss while preserving one exact durable identity. Relaunch restores the owning course, terminal results render and save once per immutable snapshot, unsafe state fails closed, and explicit retry is the only path to a new identity. Large-text behavior remains usable at font scale 1.35. Fresh Canvas 73/73, API 626/626, mobile 411/411, engine 606/606, and root gates pass. See [B23 acceptance](ai/acceptance/b23/mobile-recovery-foundation.md). Earlier entries below are historical.

B23 establishes accessibility/recovery behavior contracts only. Final UI accessibility and visual polish will be performed against the redesigned interface during B25–B28.

1. B24 — Complete Stay Focused V2 mobile UX/UI redesign specification
2. B25 — Design system + app shell implementation
3. B26 — Core experience redesign
4. B27 — Remaining application redesign
5. B28 — Full design QA + pilot freeze

## B22 mobile Canvas-to-Reviewer workflow — current result (2026-09-12)

**PASS — the Canvas learner-material capability is now a coherent physical-mobile study workflow.** Students choose a synced course, see ordered module materials with honest states, confirm a material, create a durable Reviewer with one primary action, study the completed output, receive automatic snapshot-bound persistence, and reopen it from Study Library without regeneration. The physical CIT6 run produced one fresh 20-section Reviewer from all 23 PDF pages with 1.00 coverage/grounding, zero verifier issues, passed leakage, and safe fallback disclosure. Unsupported PPTX and empty items remained visible and blocked. All final package and root gates pass; no backend deployment was needed. Next: define B23 as a separate accessibility and interrupted-session/resume hardening slice rather than broadening B22 into format ingestion or Canvas permission expansion. See [B22 acceptance](ai/acceptance/b22/mobile-canvas-study-workflow.md). Earlier entries below are historical.

## B21.1 Canvas learner-material production acceptance — current result (2026-09-11)

**PASS — B21 is deployed and physically proven.** Fresh production syncs persisted exact module Files, Pages, and Assignments for the three selected courses while unavailable broad collections remained safe partial warnings. Production repairs aligned the durable sync-unit constraint with B21's exact resolver kinds and reviewer snapshot provenance with the existing 40-page Canvas PDF limit. A real module-owned 23-page CIT6 PDF completed prepare, native-text extraction, 20-section grounded Reviewer generation, rendering, save, and Study Library reopen on a physical Android 13 phone. Fresh Canvas 73/73, API 626/626, mobile 377/377, and engine 606/606 pass. PPTX/DOCX and broader Canvas permission expansion remain out of scope. Next: begin B22 as a new bounded milestone. See [B21.1 acceptance](ai/acceptance/b21/canvas-learner-material-ingestion.md). Earlier entries below are historical.

## B20 real mobile Reviewer E2E — current result (2026-09-10)

**PASS — B20 real mobile Reviewer end-to-end validation passed for real PDF upload.** A physical realme RMX3151 / Android 13 completed authentication restoration, selection of real learner PDFs, durable extraction, authenticated production Reviewer jobs, completion, rendering, save, and Study Library reopen for 15-page prose-heavy and 55-page formula/table-like sources. Live auth, owner isolation, duplicate-submit, and network recovery checks passed. Fresh mobile 376/376, Reader 32/32, API 607/607, engine 606/606, architecture 157/157, Expo config, and forced root gates pass. **YES — MOBILE REVIEWER DEMO FLOW READY for PDF upload.** Canvas learner-material selection remains a capstone gap: fresh syncs of all three available courses were partial because Canvas denied Files and did not expose Pages, leaving announcements or no source; DOCX/PPTX ingestion is also absent. EAS preview APK build `58c631c6-ef35-4822-b634-c8c32eea064c` finished and passed standalone validation; [download the APK](https://expo.dev/artifacts/eas/HuRRjoOyl-ew_PDWGXUZcwOQ2hsHVV9fv9njifiRuQk.apk). Next capstone slice: Canvas learner-material access and ingestion validation; do not resume general Reviewer polishing without a demonstrated blocker. See [B20 acceptance](ai/acceptance/b20/mobile-reviewer-e2e-validation.md). Earlier entries below are historical.

## B19.3 grouped-median repair — current result (2026-09-09)

**PASS — B19.3 grouped-median demo blocker cleared.** A deterministic display graph uses frozen source-member boundaries to separate definitions, formula components, objectives, captions and ordered tables while preserving every factual owner. Targeted live and full frozen B12 generation reruns pass all four routes: 533/533 targets, coverage 1.00, grounding 0.99/1.00/1.00/1.00, zero issues/omissions/fabrication/retries/fallback and automatic usefulness PASS. Grouped-median manual usefulness PASS; other cases have no new regression, with their explicitly pre-existing non-blocking presentation and cache limitations retained. This does not claim those historical strict polish failures are repaired. Fresh engine 606/606 (14 new regressions), architecture 157/157, reader 32/32, API 607/607, forced root typecheck/lint/build PASS; four existing lint warnings unchanged. Sources, plans, manifests, residuals, hashes and typed payloads match B19.2. Runtime model gpt-4o, parser default legacy and OCR/extraction unchanged; no push. **YES — REVIEWER DEMO BLOCKER CLEARED.** Next: real mobile end-to-end Reviewer validation. See [B19.3 acceptance](ai/acceptance/b19-3/grouped-median-composite-repair.md). Earlier phase entries below are historical.

## B19.2 final presentation cleanup — current result (2026-09-09)

**FAIL — demo-blocking presentation defect remains.** Final live gpt-4o preserves 533/533 targets, grounding 0.99/1.00/1.00/1.00, zero omissions/fabrication/retries, and passing assembly. All four automatic usefulness checks now pass. Source-owned navigation edits, exact display deduplication, ordered-table ownership and conservative fragment repairs improve presentation; strict manual review still fails. The one pre-demo engine blocker is the MinerU grouped-median composite that mixes definitions, exercise text and table-heading fragments. Other remaining prose imperfections are non-blocking; frozen code/cell damage is not reconstructed. Full B12: NOT RUN — targeted prerequisites failed. **NO — DEMO BLOCKER REMAINS.** FRESH engine 592/592, architecture 143/143, reader 32/32, API 607/607, forced root typecheck/lint/build PASS; four existing lint warnings unchanged. Parser default legacy, production gpt-4o and OCR/extraction unchanged; no push. Next: repair only that grouped-median composite while preserving frozen source owners. Do not start general architecture work or another model comparison. See [B19.2 acceptance](ai/acceptance/b19-2/final-presentation-demo-readiness.md). Earlier B16–B19.1 entries below remain historical evidence.

## B19.1 runtime-model escalation — current result (2026-09-08)

**FAIL — presentation defects are model-independent.** Frozen B19 runs on `gpt-5.6-terra` and `gpt-5.6-sol`, plus one Sol replication, preserved 533/533 targets, grounding, zero omissions/fabrication/retries, and passing assembly. Neither candidate materially removed Python source dumps/lecture wording/repetition or Statistics fragments/instructional presentation; Sol's isolated Accounting grammar repair reverted in replication. Production remains `gpt-4o`; OCR/extraction is unchanged and no document was re-extracted. Fresh engine 547/547, architecture 98/98, reader 32/32, API 607/607, and forced root typecheck/lint/build PASS. No push. See [B19.1 acceptance](ai/acceptance/b19-1/runtime-model-escalation-demo-readiness.md).

## B19 local repair — current result (2026-09-08)

**FAIL — Reviewer source completeness/presentation defect remains.** Source-owned residual evidence restores both real Docling definitions without changing the 533 frozen targets, hashes, ownership, parser default legacy, or gpt-4o. All four cases now have zero omissions and pass assembly; all Statistics SOURCE_DUMP findings are resolved. Calls are 2/2/2/1, with zero factual/explanation retries or replacements. Python/MinerU/Docling still fail serialized automatic usefulness; all four fail manual quality for residual fragments/repetition/grammar. Full unchanged B12: NOT RUN — targeted prerequisites failed. FRESH engine 547/547, architecture 98/98, reader 32/32, API 607/607, and forced root typecheck/lint/build PASS. No push. See [B19 acceptance](ai/acceptance/b19/source-span-ancestry-completeness.md).

## B18 local repair — historical result (2026-09-08)

**FAIL — Reviewer representation defect remains.** All frozen targets remain
99/99, 232/232, 156/156 and 46/46, with unchanged hashes, source ownership,
production gpt-4o, parser default legacy and initial prompts. Deterministic
representation ownership reduces composite/relationship copies and validates
visible spans. All Statistics mapping mismatches are resolved; Docling remains
withheld for one finding containing two real missing definitions. MinerU now
assembles with zero omissions. Python fallback remains zero. Final calls are
2/3/3/1, explanation retries 0/1/1/0, factual retries all zero. All four manual
gates still FAIL; serialized usefulness also fails Python/MinerU/Docling.
Full unchanged B12: NOT RUN — targeted prerequisites failed.
Fresh engine 519/519, architecture 70/70, reader 32/32, API 607/607, root
typecheck/lint/build all PASS. No push. B16/B17 historical FAIL reports unchanged.
Next: repair remaining source-span ancestry and source-item completeness from
B18 captures, preserving frozen targets and gates.
See [B18 acceptance](ai/acceptance/b18/composite-source-presentation-source-item-alignment.md).


## B17 local repair — historical result (2026-09-07)

**FAIL — generic Reviewer quality defect remains.** All frozen targets remain
99/99, 232/232, 156/156 and 46/46; model gpt-4o and parser default legacy
are unchanged. Deterministic display now separates typed evidence, protects
row identity/order and exact overlap, and preserves every target at serialization.
Local sentence context and heading-subject completion improve explanations.
Fresh engine 494/494, architecture 45/45 and reader 32/32 pass.
Final calls 2/2/2/2, explanation retries 0/0/0/1, factual retries all zero.
Python has zero fallback, but source code/layout and repetitive labels remain.
Statistics remains withheld (two/four omissions); Accounting improves but
still fails manual usefulness. All four manual gates FAIL; full B12 NOT RUN.
Next: repair composite source-span/relationship presentation and align its
source-item evidence, preserving the frozen gates. No push or parser promotion.
See [B17 acceptance](ai/acceptance/b17/reviewer-explanation-evidence-presentation.md).


Last refreshed: 2026-09-08, Asia/Manila.

## Reviewer B16 - Deterministic retention verified, live quality gate failed

B16.1 attempt 3 (2026-09-07): capacity AVAILABLE; all four live cases ran.
Required targets are retained at 99/99, 232/232, 156/156 and 46/46, with no
provider-owned targets, provider losses or factual retries. Final calls are
4/2/3/1 and durations 10.383/26.266/16.945/5.824 s. A generic, regression-backed
prompt correction aligns explanation wording with the frozen lexical gate;
Python still uses two fallbacks. Statistics fails assembly and Accounting fails
manual quality despite automated PASS. Full B12 is NOT RUN because targeted
acceptance failed. Fresh engine 476/476, architecture 27/27 and API 607/607 pass.
Next: reconcile the generic explanation/evidence presentation contract with
existing validation rules using captured failures; do not weaken gates or start
a benchmark-specific B17. The earlier no-credit attempts remain historical.
See `docs/ai/acceptance/b16/live-provider-runtime-validation.md`.

Required evidence is now assembled and identity-checked from the Stage 2
manifest before any provider call. OpenAI owns only bounded batched
explanations; factual retries are zero, stable IDs isolate batch failures, and
non-standalone dispositions consume zero calls. Focused 26/26, full engine
475/475, API 607/607, and all root gates pass.

Historical B16 result before restored capacity: Python's two batches returned
OpenAI 429 `no credits remaining`; safe fallback preserved 99/99 targets in
5.432 s with no loss/fabrication, but this does not establish provider quality.
Statistics, Accounting, and full B12 were not run in that historical attempt.
The attempt 3 result above supersedes its provider blocker. Production remains `legacy`.

## Reviewer B15 - Planning boundary repaired, acceptance still failed

Stage 2 now distinguishes standalone, structural, typed-evidence and
unsupported source nodes using only local normalized/semantic evidence.
Non-standalone nodes retain explicit hierarchy, disposition reasons, exact
typed/semantic representations and unchanged manifest owners while consuming
no provider or retry calls. Twelve focused regressions pass and the complete
engine suite is 449/449 with all B13/B14 gates retained.

Fresh targeted acceptance did not clear the full-corpus prerequisite. Python
preserved 99/99 targets at 1.00 coverage/grounding but was withheld for
instructional noise. Statistics/MinerU preserved 211/232, Statistics/Docling
152/156 and Accounting 35/46; provider omissions and Statistics usefulness
failures were rejected with zero fabrication failures. The full unchanged B12
rerun was therefore not run. Production remains `legacy` and historical
acceptance evidence is unchanged.

Next task: repair source-supported evidence completion and usefulness without
changing B15 classifications, ownership, frozen thresholds or parser defaults,
then rerun the four targeted cases before full B12.

## Reviewer B14 - Explanation hardening, acceptance blocked by source boundary

Field-aware imperative, code-as-explanation, fragment and explanation-dump
checks now protect Stage 6. Missing-target repair prompts carry only exact
target evidence while retaining all source identities, and usefulness repairs
merge with accepted content. B14 adds 12/12 regressions; engine total is
437/437 with all 425 prior cases retained.

The milestone still fails. Exact candidate replay remains withheld, and source
audit proves the frozen 13-title Python plan contains two heading-only sections
and two code-only sections without explanatory prose. No B14 live or full B12
rerun was attempted after that deterministic stop condition. Production remains
`legacy`; historical acceptance evidence is unchanged.

Next task: reconcile heading-only planned sections with the source-faithful
Reviewer contract without cross-section borrowing, fabrication, default-parser
promotion, or weaker usefulness gates.

## Reviewer B13 - Implemented hardening, failed acceptance

Required evidence now has stable IDs and typed provenance, source availability
is checked before generation/fallback/assembly, and retries receive exact
missing targets with prior accepted content. Stage 6 rejects non-explanatory,
instructional-noise, source-dump and low-information content without deleting
required sections. Formula/code/table allowances remain block-aware. The engine
suite is **425/425**, including all 406 previous cases.

This does not complete the acceptance milestone. The frozen targeted workload
still produces withheld reviewers. The report distinguishes captured live
metrics from replay after final required-technical-evidence tightening; no full
B12 or durable acceptance rerun is claimed. Production remains `legacy` and
all original safety/structure gates are retained.

Next task: evidence-bound provider completion and source-sparse explanation
recovery, then targeted acceptance and only afterward the unchanged full B12
corpus. See `docs/ai/acceptance/b13/reviewer-usefulness-and-completion.md`.

## Reviewer Benchmark B12 - Failed acceptance

The frozen B8 Python, Statistics, and scanned Accounting sources were rerun
through hybrid extraction, production pipeline components, and the real durable
job APIs. Parser readiness passed for every source with no fallback or parser
loss. One generic durable-boundary defect was fixed: persisted Docling/MinerU
typed blocks now bypass legacy presentation-page expansion. The focused Stage 0
regression passes and the complete engine suite is 406/406.

The acceptance milestone is not complete. Python restores the exact 13 B11
titles and passes coverage/grounding at 1.00, but manual inspection still finds
non-explanatory sections, activity leakage, and overlong source-like points.
Statistics remains withheld for omissions with both MinerU and Docling.
Accounting remains withheld when generated Ledger content omits an exact table
row. Zero fabrication and zero unsupported relationships were accepted; the
production parser default remains `legacy`.

Next Reviewer task: generically strengthen student-visible usefulness and
required-evidence completion without weakening current gates, then rerun the
unchanged B12 workload.

## Reviewer Benchmark B11 - Complete

Stages 1-6 now exploit the typed structure established in B10. Generic
multi-signal heading roles suppress furniture and instructional fragments while
retaining their child evidence; equivalent same-parent headings consolidate
without numeric suffixes. Planned typed evidence groups preserve formula raw
text/parser LaTeX, tables, exact cells, code, results, and provenance through
generation and relationship grounding. Objective Stage 6 diagnostics withhold
malformed student-visible structure without imposing a blind point cap.

The eight B11 regression families pass, and the complete engine suite is
405/405 with all prior 396 cases retained. API remains 607/607. Live Python
Docling now assembles 13 clean concepts at 1.00 coverage/grounding. Statistics
Docling grounding issues fall from 41 to 4 and MinerU from 40 to 2, with zero
fabrication failures; both remain safely withheld for omissions or missing
output. Accounting cell and numeric/OCR provenance is unchanged. The parser
production default remains `legacy`.

Next Reviewer benchmark: B12 - rerun full B8 end-to-end acceptance using hybrid
structured parsing. Unconditional parser promotion remains deferred.

## Reviewer Benchmark B10 - Complete

A feature-flagged structured parser architecture now preserves typed document
structure and provenance across the API, durable processing, engine Stage 0,
and mobile result boundary. Legacy, Docling, and MinerU outputs map into one
provider-independent contract; generic observable-signal routing and quality
gates select or reject external parses, and every external failure falls back
to the unchanged current extraction/Google OCR path. `legacy` remains the
production default.

Sanitized code-heavy, formula/table-heavy, and scanned-accounting fixtures
protect typed code, formulas, tables, OCR origin, hierarchy, source order, and
numeric cell provenance. The deterministic engine suite is 396/396 and the API
suite is 607/607. Live generation evidence is partial: Docling improves the
code-heavy reviewer before additional heading heuristics, but MinerU is
withheld; all central-tendency arms are withheld even though Docling/MinerU
retain formulas and tables. Scanned accounting reaches MinerU and the shared
contract without Google credentials, while known parser omissions remain
visible rather than being invented.

Next Reviewer benchmark: B12 - rerun full B8 end-to-end acceptance using the
accepted typed hierarchy/grounding layer and hybrid structured parser.

## Reviewer Benchmark B4 - Complete

Stage 4/5 now verifies relationships rather than certifying source-token
presence alone. Coverage assigns visible rows to unique semantic targets and
scores covered targets over total targets. Grounding separately rejects wrong
definition, parent-child, procedure-order, example, cross-concept, and sibling
associations while retaining lexical fabrication and omission checks. Valid
conservative paraphrases and ambiguous flat source structures still pass.

The required 16-fixture matrix, seven structured fault injections, and precise
section-only retry diagnostic pass. The engine suite is 343/343. The exact Intro
to IT Security PDF rerun preserves B3's 17 titles and every sourceCore payload,
passes 110/110 semantic targets, coverage and grounding at 1.00, zero semantic
relationship issues, and leakage, with 17 calls, no retries, and no fallbacks.

Page 10 visual labels, page 14 hierarchy edges, and flat denial-service visual
relationships remain extraction limits rather than verifier failures. The
Google service-account credential exposed during B3 requires separate
authorized operational rotation; B4 did not inspect or reuse it.

Next Reviewer benchmark: apply the same process to the Firewalls PDF to test
cross-document generalization before making additional engine changes.

## Reviewer Benchmark B3 - Complete

The accepted B2 17-section outline is unchanged. Stage 2 now carries a generic,
optional semantic plan for concepts, lists, definition sets, supported category
groups, procedures, and example groups. Stage 3 serializes those relationships
through the compatible key-point surface, retains only useful direct-source
explanations, keeps sparse facts free of filler, and continues to exclude
outside enrichment. Page-scoped continuation content remains whole through
generation and grounding.

The 32-page Intro to IT Security rerun used `gpt-4o`, made 17 calls with zero
retries and zero fallbacks, emitted the same 17 titles, and passed coverage and
grounding at 1.00 with leakage passing. Definitions, threat categories,
infiltration groups and ordered steps, and blended-attack examples remain
associated. The deterministic engine suite passes 319/319.

Known extraction limits remain: page 10 visual labels are absent and page 14
attacker hierarchy edges are not reconstructed. The next Reviewer benchmark is
B4 semantic verification: Stage 4/5 should independently reject incorrect
relationship flattening/grouping instead of treating lexical 1.00 scores as
semantic proof.

## Reviewer Benchmark B2 - Complete

Production PDF review now retains normalized page identity through durable job
submission and feeds generic page-aware blocks to Stage 0/1. Presentation title,
divider, references, and OCR/logo noise are classified as source evidence but
excluded from the academic outline; repeated continuation headings merge while
distinct neighboring concepts remain separate. The unchanged Stage 3 generated
the Intro to IT Security benchmark from a natural 17-section outline with
coverage, grounding, and leakage gates passing. Eleven new generic regressions
raise the deterministic engine suite from 292 to 303 cases.

Known next-layer debt remains explicit: Stage 2/3 must preserve semantic
relationships and write useful explanations, and extraction still cannot recover
page 10's diagram labels or page 14's visual hierarchy edges.

## Capstone Development Phase R5 - Task And Study-Plan Foundation

Status: Complete and live accepted.

- Added owner-scoped `tasks`, `study_plans`, and `study_sessions` with RLS,
  owner-safe foreign keys, service-only atomic import/apply functions, and a
  forward-only migration after the existing local/linked versions.
- Manual task CRUD and persisted synchronized Canvas-assignment import are
  exposed through authenticated APIs. Import makes a user-owned task, is
  idempotent, performs no Canvas request, and preserves user edits on re-import.
- The shared planner is deterministic and non-AI. It orders by deadline,
  priority, creation time, then task ID; bounds sessions to 90 minutes; and
  reports every unscheduled minute when capacity is insufficient.
- Preview is read-only. Apply accepts the normalized planning request, reruns
  the planner, validates owned pending tasks, and persists the plan/sessions in
  one RPC transaction rather than trusting arbitrary client session records.
- Targeted R5 API/database/acceptance tests pass 11/11, shared tests pass 31/31,
  reviewer regression passes 290/290, and shared/DB/API typechecks plus DB/API
  builds pass. Full API regression remains 558/559 only because of the known
  pre-existing Windows CRLF Canvas assertion.
- The four authorized Canvas migration-version aliases were reverified against
  live tables, constraints, indexes, RLS, functions, grants, retry structures,
  and service-role protections, then reconciled as metadata only. Historical
  SQL and Canvas schema objects were not changed or replayed.
- Supabase CLI 2.116.0 dry-run proposed only
  `20260827155438_task_study_plan_foundation`; the linked push applied only that
  migration. Live schema, CRUD, Canvas import, preview/apply, session behavior,
  atomicity, cleanup, and all eight API plus RLS/database cross-user denials
  passed.
- Live preview initially exposed a valid PostgreSQL microsecond timestamp being
  rejected by the shared validator. R5 now accepts arbitrary valid fractional
  seconds, the focused regression passes, and the full live suite passes.

### R6 prerequisite - deterministic replanning replacement

Status: Complete and hosted accepted.

- Study sessions expose `planned`, `completed`, and `skipped` lifecycle state.
- Applying a plan serializes per owner, deletes only active sessions that
  intersect the requested planning range, preserves terminal history, rejects
  overlapping proposed sessions, and persists the replacement atomically.
- Repeated stateful API applies remain bounded to one active schedule for the
  range. Shared, targeted planning, mobile, reviewer, typecheck, lint, and build
  gates pass. The full API suite remains green except for its known Windows
  CRLF Canvas assertion.
- Supabase CLI 2.116.0 dry-run proposed only
  `20260828173643_replace_planned_study_sessions_on_replan.sql`; the linked push
  applied it and local/remote migration history now matches.
- Hosted catalog inspection verified lifecycle schema, the partial planned-row
  index, advisory locking, replacement/overlap markers, `SECURITY INVOKER`,
  service-role-only execution, RLS, and owner policies.
- Dedicated two-user live acceptance passed first apply, same-window reapply,
  active-duplicate absence, completed/skipped preservation, status PATCH
  persistence, atomic proposed-overlap rejection, cross-owner denial, two
  concurrent RPC applies, unaffected outside-range data, and the Gap A embedded
  task/full PATCH response contract. All fixtures were removed and R5 table
  counts returned to zero.
- Fresh verification passed targeted Gap A/Gap B 27/27, shared 32/32, mobile
  216/216, reviewer 290/290, forced root typecheck/lint for 7/7 packages, and
  DB/API builds. Full API is 574/575 with only the documented Windows
  CRLF-sensitive Canvas SQL assertion.

Immediate next task: continue R6 mobile Tasks and Study Schedule integration.

## Phase 5F.2 - Incremental, Resumable Canvas Synchronization

Status: Complete and hosted validated.

- Content and grade jobs expand into database-owned list-page, item-detail,
  announcement, file, assignment, submission, and grade-summary units. Vercel
  Workflow executes one Canvas request per step and resumes from persisted
  units rather than replaying a whole course.
- Atomic connection-scoped claims cap provider work at three concurrent units,
  or two for grade jobs. Ninety-second leases, bounded provider retries,
  durable `Retry-After` scheduling, a 30-minute parent deadline, and same-job
  retry prevent unsafe request races and unbounded work.
- Relational course content promotes atomically. Announcements, files, and
  grades maintain independent health so usable scopes can advance while an
  incomplete scope keeps its last-known-good snapshot.
- Expo Go now shows course and scope health, nullable expanding totals,
  truthful partial completion, Sync again, and Cancel. Synchronization remains
  manual and still requires HTTP 202 acceptance before the app may switch away.
- Private staging is service-only, is removed on success/cancellation, and
  expires after 24 hours for failed jobs. Sanitized job/unit audit records stay
  within the existing 30-day idempotency window.
- Release reminder: before the next mobile release, physically spot-check Expo
  Go reload recovery, temporary network loss, and explicit cancellation.

Hosted content produced a safe `partial` outcome when one Canvas list endpoint
was unavailable, while independent announcements advanced and no deletion was
inferred. Grade synchronization returned `unchanged`, idempotent replay reused
the same content job, and explicit cancellation published no result.

Release acceptance debt: perform the three-item physical Expo Go reload,
temporary-network, and cancellation spot-check before the next mobile release.

## Phase 5F.1 - Durable Canvas Synchronization

Status: Complete and hosted validated.

- Course-content and grade synchronization are now separate Supabase-owned
  jobs started through Vercel Workflow after HTTP 202 durable acceptance.
- Job creation is owner-scoped and idempotent. Workflow run IDs, progress,
  retryability, cancellation, bounded attempts, and stale underlying sync
  recovery are persisted without exposing Canvas source or grade content.
- Expo Go persists the creation intent before submission, replays the same key
  if acceptance is lost, stops relying on background JavaScript, and reconciles
  on launch or foreground return. Grade jobs expose Cancel and Retry.
- The user has physically passed OCR and reviewer-generation switch-away tests.
  Agent-led hosted reload recovery, temporary client disconnection, and
  explicit cancellation also pass for the existing extraction/reviewer jobs.
- Release reminder: before the next mobile release, physically spot-check Expo
  Go reload recovery, temporary network loss, and explicit cancellation.
- Hosted Canvas validation passed content sync, grade sync, idempotent replay,
  and explicit cancellation. The temporary validation course selection was
  restored, successful results were persisted before terminal status, and the
  cancelled job published no result.

Phase 5F.2 builds on this completed server-owned acceptance boundary.

## Durable-document Android closeout - Device smoke passed, matrix pending

- Durable processing accepts up to 100 total PDF pages while allowing at most
  40 pages that actually require OCR. Native-text and confirmed blank pages do
  not consume the OCR allowance.
- Synchronous and Canvas extraction retain the existing 40-total-page ceiling.
- Native text is inspected before OCR; an oversized scanned document fails
  safely before provider dispatch, and mobile presents sanitized guidance.
- The EAS preview APK was built and installed on a physical Android device.
  Authentication and hosted V2 API connectivity passed. Those checks do not
  yet prove the durable long-document limits or interruption/reconciliation
  behavior.

Current acceptance task: use the installed preview build to validate the
durable-document matrix on a physical Android device. This is a closeout task,
not Phase 6.

## Product Recovery Phase R6 - Partial

Automated R6 acceptance passed on 2026-07-15, but physical-device acceptance
remains deferred because no controllable physical iPhone Expo Go session was
available to this agent. No product defect was reproduced, no product code was
changed, and the R5 automated/protected gates remain green: Canvas 69/69, OCR
25/25, engine 287/287, API 428/428, mobile 154/154, reviewer web smoke 51/51,
R3/R4/R5 protected validations, PDF OCR web smoke, root lint/typecheck, and
root production build.

Remaining recovery debt: complete Product Recovery Phase R6 on a physical
iPhone with Expo Go before claiming R6 complete.

## Product Recovery Phase R5 — Complete

The Canvas reviewer path now presents authoritative module/item ordering, safe
capability states, explicit file preparation and source checking, exact editable
preview text, existing protected generation, immutable snapshot save, and
stale-state invalidation as one calm staged student journey. Large bounded
inventories can load later pages without mixing changed or duplicate pages.
R1-R4 security, OCR completeness, reviewer grounding, and provider-call gates
remain intact. No database migration was required.

Immediate next task result: Product Recovery Phase R6 automated acceptance is
partial pending physical-device observation.

## Phase 1 - Foundation And Reviewer Engine

Status: Complete

Purpose: Establish the repository foundation and a tested reviewer-generation
engine before product UI and integrations depend on it.

Major deliverables:

- Monorepo foundation
- Stage 0 through Stage 6 pipeline
- OpenAI-compatible provider boundary
- Coverage verification
- Grounding validation
- Leakage protection
- Deterministic evaluations
- Short-prose fallback for OCR-style pasted text

Exit criteria:

- Engine build passes.
- Aggregate deterministic evals pass with 343 cases.
- Default visible reviewer output is source-faithful.
- Unsupported enrichment is excluded from default assembly.

Real-course quality note: Intro to IT Security B4 preserves B3's repaired
course-PDF outline and source-supported definitions, categories, procedures,
and examples. Stage 4/5 now independently verifies those relationships. The
next quality proof is the Firewalls PDF, not additional Intro-specific tuning.

Immediate dependency: None.

## Phase 2 - Authenticated Reviewer Vertical Slice

Status: Complete

Purpose: Prove a real user can sign in, submit source text, call the protected
API, generate with OpenAI, and preview validated reviewer output.

Major deliverables:

- Supabase email/password authentication
- Protected reviewer API route
- Expo reviewer input and preview
- OpenAI-backed generation
- Local Expo Web CORS
- Unattended authenticated browser smoke
- Persistent smoke session and output assertions

Exit criteria:

- `POST /api/reviewer/generate` requires a valid Supabase bearer token.
- Expo reviewer generation screen can submit pasted text and render a preview.
- `npm run smoke:reviewer:web` passes against the local API and Expo Web.
- Immediate repeat and session-only smoke flows are supported.

Immediate dependency: Phase 1 complete.

## Phase 3 - OCR And Source Ingestion

Status: Complete

Purpose: Replace paste-only source intake with a server-side OCR contract that
preserves layout enough for the reviewer engine to stay source-faithful.

Completed in Phase 3A:

- Audit existing source and OCR-related contracts.
- Provider-agnostic OCR boundary.
- Server-only Google Cloud OCR adapter.
- Fake-client OCR tests.
- Protected image OCR API route.
- MIME type and size validation.
- Preserved line, list, and layout boundaries.

Completed in Phase 3B:

- Gallery image selection through Expo Image Picker.
- Selected-image preview and filename display.
- Authenticated upload to `POST /api/ocr/extract`.
- Editable extracted-text review before reviewer generation.
- Manual paste fallback as a separate source mode.
- Deterministic Expo Web OCR smoke using a mocked OCR response and real
  reviewer generation.

Completed in Phase 3C:

- Camera capture through the existing Expo image-picker boundary.
- Captured-image preview and generated filename display.
- Reuse of the authenticated `POST /api/ocr/extract` upload path.
- Editable extracted-text review before reviewer generation.
- Live physical-device validation on iPhone Expo Go with the local Next.js API
  over LAN and server-only Google Cloud Vision OCR.
- Verified that edited OCR text is used as the reviewer source.
- Verified Reviewer Ready, source-faithful, coverage, and clean-output passed
  for the live OCR-generated reviewer.

Completed in Phase 3D:

- Synchronous small-batch PDF OCR ingestion for one PDF per request.
- PDF selection through Expo Document Picker.
- Authenticated upload to `POST /api/ocr/extract-pdf`.
- Server-side PDF validation for MIME type, `%PDF-` signature, parseability,
  encrypted/password-protected files, upload size, and 1-5 page count.
- Google Vision `DOCUMENT_TEXT_DETECTION` through synchronous
  `batchAnnotateFiles` with inline PDF bytes and explicit pages.
- Page-ordered normalized text with editable extracted-text review before
  reviewer generation.
- PDFs over five pages are rejected, not silently truncated.
- PDF files stay server-bound; Google credentials remain server-only.
- No Cloud Storage, background jobs, polling, local PDF rasterization, Poppler,
  or Ghostscript in this phase.
- Mocked PDF OCR web smoke using a fictional PDF fixture and real reviewer
  generation.
- Live physical-device validation on iPhone Expo Go with the local Next.js API
  over LAN and server-only Google Cloud Vision PDF OCR.
- Verified that a fictional, image-only, two-page scanned PDF extracted both
  pages in page order.
- Verified that edited PDF OCR text is used as the reviewer source.
- Verified Reviewer Ready, source-faithful, coverage, and clean-output passed
  for the live PDF OCR-generated reviewer.
- Verified that a separate PDF with more than five pages is rejected safely with
  the expected UI messages instead of being silently truncated.

Remaining Phase 3 deliverables:

- None.

Exit criteria:

- A protected OCR API route accepts image input, validates it, invokes the OCR
  provider boundary, and returns typed extracted text without exposing secrets.
- Fake-client tests prove success, error, size, MIME, and layout-preservation
  behavior.
- The reviewer input flow can use user-reviewed extracted text while manual
  paste remains available.
- Live iPhone camera/image OCR validation passes without exposing Google
  credentials to mobile code or committed files.
- Live iPhone PDF OCR validation passes using a fictional 1-2 page scanned PDF,
  editable OCR text, and reviewer generation.

Immediate dependency: Phase 2 complete.

Known limitation: visible repeated headers and footers in scanned PDFs may be
extracted as source text and become reviewer sections. Users can remove them in
the editable OCR text field. Automatic repeated header/footer detection is
deferred to a later OCR cleanup task.

Immediate next task after Phase 3D: Phase 4 Study Library and Persistence.
Phase 4 is complete and live validated; the next product phase is Phase 5
Canvas Integration.

## Phase 4 - Study Library And Persistence

Status: Complete

Purpose: Save generated study content to a user-owned library so reviewers can
be reopened, renamed, and managed across sessions.

Major deliverables:

- Supabase reviewer storage
- User-owned RLS policies
- Source metadata
- Reviewer list
- Open, rename, and delete actions
- Study Library as the saved-content destination

Implemented foundations:

- `reviewers` Supabase migration with owner-scoped RLS policies, timestamps,
  section count, source metadata, and reviewer JSON output.
- Typed reviewer table shapes in `@stay-focused/db`.
- Authenticated Next.js reviewer CRUD API using the caller's bearer token and
  user-scoped Supabase access instead of service-role CRUD.
- Mobile Study Library screen with list, open, rename, delete, refresh, and
  return-to-generator actions.
- Save-to-library action after reviewer generation, preserving editable
  OCR-before-reviewer behavior and storing only safe source metadata.
- Regression-hardened PDF OCR web smoke wait for fast mocked OCR completion.
- Live Supabase verification confirmed the migration is already applied, the
  `public.reviewers` table exists, RLS remains enabled, and owner SELECT,
  INSERT, UPDATE, and DELETE policies use `auth.uid() = user_id`.
- Live cross-user validation used two distinct Supabase auth users. User A
  created, listed, and opened a reviewer; User B's list excluded it and open,
  rename, and delete attempts returned safe `404 reviewer_not_found` responses.
- Reverse isolation was also validated: User B created and listed a reviewer;
  User A could not list or open it; User B deleted it.
- Cleanup removed both fictional validation reviewers through their owning
  users, and follow-up owner-list/open checks confirmed no validation rows
  remained.
- The Next.js reviewer detail route typing fix aligns `[id]` route params with
  the Promise-based App Router context without changing runtime behavior.
- Consolidated physical Android acceptance on realme RMX3151 / Android 13 now
  covers Maker source modes, Canvas selective preview, pinned readiness-gated
  Generate/Save actions, durable Processing, Reader, save/list/reopen, rename,
  native delete Cancel/Confirm, and in-app/hardware Back. Reopen remains a plain
  persisted read with no regeneration.

Exit criteria:

- Authenticated users can save, list, open, rename, and delete their own
  reviewers.
- RLS prevents cross-user access.
- Reviewer metadata preserves enough source context for later study workflows.
- Automated API, mobile, DB typecheck, engine, OCR, and browser smoke
  regression checks pass.
- Live migrated Supabase validation proves save, list, open, rename, delete,
  and cross-user denial against the deployed `reviewers` table.

Immediate dependency: Phase 3 source-ingestion contracts are stable enough to
store source metadata consistently. All Phase 4 external validation gates are
complete.

## Phase 5 - Canvas Synchronization Foundation

Status: Implementation complete through Phase 5F.2. Phase 5E.6 and Product
Recovery R6 acceptance remain partial only for named physical-device checks.
Phase 5A is complete and live validated; Phase 5B.1
academic graph foundation is complete; Phase 5B.2 initial full academic graph
synchronization is complete and live validated; Phase 5B.3A course recovery
hardening is complete and live validated; Phase 5B.3B incremental persistence
is complete and live validated; Phase 5B.3C1 conditional-request capability
audit is complete; Phase 5B.4A planner-item and announcement synchronization
is complete with documented live Canvas limitations; Phase 5C.1 secure file
inventory and bounded ingestion is remotely and live validated with a
documented account-wide synchronous route-duration limitation; Phase 5C.2A1
selected-course synchronization is complete and runtime-safe in local
production-build validation; Phase 5C.2A2 Canvas source selection and reviewer
handoff is complete and live validated; Phase 5C.2B Canvas PDF/image OCR
sources are complete and live validated for preparation, private Storage OCR
preview, edited reviewer handoff, and Study Library cleanup; Phase 5D.1
immutable source snapshots and exact reviewer provenance, Phase 5D.2
structured normalized blocks and selective import, and Phase 5D.3 duplicate
relationships, source freshness, and regeneration readiness are implemented,
remotely verified, and protected-live validated. Phase 5E planning is complete
in `docs/ai/phase5e-grades-submissions-plan-20260708.md`, Phase 5E.1 is
complete in
`docs/ai/phase5e1-grades-submissions-foundation-20260708.md`, and Phase 5E.2
is complete in `docs/ai/phase5e2-canvas-grade-client-20260708.md`. Phase 5E.3
explicit synchronized import is complete and remotely verified, and Phase 5E.4
protected grade APIs are implemented and protected-live validated in
`docs/ai/phase5e4-protected-grade-api-live-validation-20260708.md`. Phase 5E.5
mobile assignment and grade experience is complete and locally validated in
`docs/ai/phase5e5-mobile-grade-experience-20260708.md`. Phase 5E.6 and Phase
5F remain planned and must not be collapsed into a single generic Canvas
integration task.

Purpose: Bring Canvas LMS data into Stay Focused as a permission-aware academic
graph that can feed the existing OCR, normalization, provenance, reviewer, and
future schedule/grade-planning boundaries without creating a parallel
generation path.

Immediate dependency: completed Phase 4 persistence and source metadata, plus a
stable source-ingestion contract from Phase 3.

Credential-source boundary: Canvas client, synchronization, and capability
logic must remain independent of whether credentials came from a manually
entered personal access token or a later OAuth flow. The intended model remains
conceptually similar to:

```text
CanvasCredentialProvider
|-- PersonalAccessTokenCredential
`-- OAuthCredential
```

### Phase 5A - Secure Canvas Connection And Capability Discovery

Status: Complete, live validated, and audit-hardened. Direct server-side Canvas
validation, remote Supabase migration/RLS validation, protected API
connect/status/courses/capabilities/disconnect lifecycle, strict encrypted
payload validation, atomic connection/capability persistence, redirect
rejection, and automated two-user authorization tests have passed.

Scope:

- Canvas instance URL
- Canvas personal access token
- API-side credential validation
- AES-256-GCM encrypted credential storage
- Protected connection-status API
- Disconnect support
- Course discovery
- Initial capability registry
- Safe endpoint probes
- User-visible connection and course states

#### Phase 5A Authentication Model

Phase 5A uses user-generated Canvas personal access tokens for development,
capstone demonstrations, controlled testing, and initial user-controlled Canvas
connections. Each Stay Focused user supplies their own personal access token.
There is no shared school-wide token.

Each token is scoped to the Canvas account that generated it and remains subject
to the permissions configured by the institution and course. A token cannot
access school-wide Canvas data, cannot bypass locked, hidden, unpublished, or
permission-restricted content, and must never be shared between Stay Focused
users.

Personal access tokens must be:

- validated before persistence
- encrypted server-side with AES-256-GCM
- stored per Stay Focused user
- excluded from API responses
- excluded from logs and errors
- removable through disconnect
- treated as revocable credentials

Personal access token entry is acceptable for the capstone, development, and
controlled initial deployment, but it is not the preferred permanent
authorization flow for a broad public multi-user release.

Completion criteria:

- A signed-in Stay Focused user can connect Canvas.
- The Canvas profile is validated.
- The token is encrypted before persistence.
- The token is never returned to mobile.
- Courses can be listed.
- Supported and unsupported Canvas capabilities are recorded honestly.

Validation status as of 2026-07-05:

- Direct Canvas HTTPS validation passed through the server-side validation
  script using one developer-owned personal access token from existing ignored
  local credential names.
- Canvas profile returned and normalized successfully.
- Course listing returned 17 courses.
- These results prove only the validating user's available Canvas capabilities;
  they do not prove institution-wide course or endpoint access.
- Live pagination was not exercised because the account did not require a
  second page; automated tests cover ordered pagination and cross-origin
  rejection.
- Enrollments, modules, assignment groups, and planner probes returned
  `available` for that user; capability availability may differ per user,
  course, role, or institution.
- Supabase migration `202607050002_create_canvas_connections.sql` applied
  remotely and read-only checks verified both tables, RLS, and no direct
  `anon`/`authenticated` access to encrypted token columns.
- `CANVAS_TOKEN_ENCRYPTION_KEY` is configured locally as a canonical padded
  Base64 key that decodes to exactly 32 bytes. The helper accepts surrounding
  environment whitespace, rejects malformed or non-canonical key material, and
  validates only when encryption or decryption is used.
- Protected API lifecycle validation passed against `http://localhost:3000`:
  Supabase bearer authentication was acquired for an established smoke-test
  user, `PUT /api/canvas/connection` validated the Canvas profile before
  persistence, 17 courses were returned, 25 capability records were created,
  and connection metadata responses excluded credential fields.
- Encrypted persistence was verified through a server-side database query:
  one connection row existed for the selected user, ciphertext, IV,
  authentication tag, and encryption version were populated, no plaintext PAT
  column was present, ciphertext differed from the submitted PAT, and capability
  rows were scoped to the same user and connection.
- `GET /api/canvas/connection`, `GET /api/canvas/courses`, and
  `GET /api/canvas/capabilities` passed from the stored encrypted credential.
  Capability statuses were `available` and `not_tested`.
- Invalid replacement PAT validation returned the stable token error while
  preserving the existing valid connection.
- `DELETE /api/canvas/connection` removed the selected user's connection and
  dependent capability rows, left saved reviewers unchanged, and final
  connection status returned the disconnected state.
- Automated route tests cover cross-user scoping for connection, courses,
  capabilities, and disconnect behavior. A live second-user validation was not
  run because no separate second test-user credentials were available.
- Phase 5A.2 hardening adds strict canonical Base64 validation for encrypted
  payload fields, the atomic `replace_canvas_connection_with_capabilities` RPC,
  a composite capability ownership foreign key, explicit redirect rejection,
  expanded request validation coverage, and realistic two-user route tests.
- Remote migration `202607050003_harden_canvas_connection_persistence.sql` is
  applied. Read-only checks passed for RPC existence, revoked public execution,
  service-role execution, validated ownership constraint, RLS, and revoked
  direct grants.

### Phase 5B - Academic Graph Synchronization

Status: Complete through Phase 5B.4A. Phase 5B.1 is complete as a database and
typed Canvas API foundation. Phase 5B.2 initial full synchronization is complete as a manual,
synchronous route with atomic per-course persistence. Phase 5B.3A recovery
hardening and Phase 5B.3B deterministic incremental persistence are complete.
Phase 5B.3C1 found no useful 304 support for the currently synchronized
endpoint families, so production conditional fetching remains unsupported.
Phase 5B.4A planner-item and announcement synchronization is complete as a
backend-only extension.

#### Phase 5B.1 - Academic Graph Foundation

Status: Complete and remotely verified.

Implemented:

- Supabase migration `202607050004_create_canvas_academic_graph.sql`.
- Tables: `canvas_courses`, `canvas_modules`, `canvas_module_items`,
  `canvas_pages`, `canvas_assignment_groups`, and `canvas_assignments`.
- Stable Canvas identity constraints for courses, modules, module items, Pages,
  assignment groups, and assignments.
- Composite ownership constraints across `user_id`, `canvas_connection_id`,
  and `course_id`.
- RLS on every academic graph table.
- Direct `anon` and `authenticated` grants revoked to preserve the Phase 5A
  service-role persistence boundary.
- Typed Canvas client methods for courses, modules, module items, Pages, Page
  detail, assignment groups, and assignments.
- Pagination tests for all new collection methods, including later-page
  failures, repeated-link loop protection, and cross-origin next-link
  rejection.

Deferred from Phase 5B.1:

- Full synchronization orchestration
- Scheduled jobs and background workers
- Mobile course screens
- Sync-start API routes
- Announcements, discussions, planner data, quiz metadata, and files/media
  ingestion
- Incremental sync cursors and destructive stale cleanup
- Reviewer generation from Canvas content

Recommended next phase after Phase 5B.3B: Phase 5B.3C - Conditional Canvas
fetching and network-efficiency hardening.

#### Phase 5B.2 - Initial Full Academic Graph Synchronization

Status: Complete, remotely verified, and live validated.

Scope:

- Courses
- Modules
- Ordered module items
- Canvas Pages
- Assignment groups
- Assignments
- Page detail bodies
- Existing assignment quiz metadata fields
- Sync-run history
- Bounded synchronous orchestration
- Per-course atomic replacement
- Stale-child cleanup after complete course snapshots only
- Partial account-sync handling
- Mobile service function without UI

Required source relationships:

```text
Course
|-- Module
|   `-- Module item
|       |-- Page
|       |-- Assignment
|       |-- External URL
|       `-- External tool
|-- Assignment group
`-- Assignment
```

Exit criteria:

- Canvas material is stored as related academic entities, not as a flat file
  list.
- Module order, Page relationships, assignment-group relationships, nullable
  dates, HTML fields, and existing assignment quiz metadata are preserved.
- The authenticated user can manually trigger synchronization through
  `POST /api/canvas/sync`.
- Persistence is atomic per course rather than for the whole Canvas account.
- A partial account sync may commit successful courses while preserving failed
  courses.
- Empty complete snapshots remove stale child rows for that course only.
- Incomplete course fetches and failed RPC calls do not prune existing graphs.
- Repeated full synchronization is idempotent and preserves internal row IDs.
- No background or scheduled synchronization exists yet.
- No mobile synchronization screen exists yet.

Validation:

- Remote migrations `202607050005_add_canvas_academic_sync.sql` and
  `202607050006_fix_canvas_connection_rpc_ambiguity.sql` are applied.
- Remote rollback verification passed through
  `scripts/phase5b2-full-sync-verification.sql`.
- Live protected connection recreation passed through
  `PUT /api/canvas/connection`.
- Two live sync calls returned HTTP 200 with sanitized partial results:
  17 courses discovered, 13 succeeded, 4 failed, 27 modules, 311 module items,
  459 Pages, 18 assignment groups, and 25 assignments.
- The second live sync introduced no duplicates, preserved internal
  identities, kept first-sync timestamps stable, advanced last-sync timestamps,
  and left zero running sync rows.

#### Phase 5B.3A - Course Failure Diagnostics And Recovery Hardening

Status: Complete.

Scope:

- Added migration `202607050007_add_canvas_sync_course_results.sql`.
- Added sanitized per-course sync diagnostics through
  `record_canvas_sync_course_result`.
- Preserved manual synchronous sync and atomic per-course persistence.
- Added operation-specific failure codes and bounded transient retries.
- Preserved course/module-item/Page-detail concurrency limits.
- Confirmed the four previous generic failures are Page-listing
  `resource_not_found` 4xx permanent Canvas limitations, not implementation
  defects.

Validation:

- Remote migration history includes `202607050007`.
- Remote rollback verification passed through
  `scripts/phase5b3a-recovery-verification.sql`.
- Two hardened live sync calls returned HTTP 200 partial results:
  17 courses discovered, 13 succeeded, 4 failed with sanitized
  `canvas_course_pages_failed`, 27 modules, 311 module items, 459 Pages,
  18 assignment groups, and 25 assignments.
- Retry attempts in live validation: 0, because the four failures are
  non-retryable 4xx resource-not-found responses.
- Duplicate identities remained 0, internal identities remained stable, and
  zero sync rows remained running.

#### Phase 5B.3B - Incremental Synchronization Foundation

Status: Complete, remotely verified, and live validated.

Scope:

- Added migration `202607050008_add_canvas_incremental_sync_state.sql`.
- Added `canvas_course_sync_states` with one row per user, Canvas connection,
  and Canvas course identity.
- Added deterministic course-snapshot fingerprints from the normalized
  persistence payload, with version `canvas-course-snapshot-v1`.
- Added `full` and `incremental` sync modes and `unchanged` course results.
- Added service-role-only RPCs for mode-aware run creation, changed-course
  graph replacement plus state advancement, unchanged-course recording, and
  failed-course metadata.
- Preserved the Phase 5A credential boundary and Phase 5B.2 per-course
  atomicity.

Validation:

- Remote migration history includes `202607050008`.
- Remote rollback verification passed through
  `scripts/phase5b3b-incremental-sync-verification.sql`.
- A full live baseline returned HTTP 200 partial with 17 courses discovered,
  13 changed/succeeded, 0 unchanged, 4 Page-listing failures, 13 graph
  replacements, and zero running sync rows.
- Two immediate incremental live runs returned HTTP 200 partial with 13
  unchanged courses, 0 changed courses, 4 Page-listing failures, 0 graph
  replacements for unchanged courses, deterministic fingerprints, stable graph
  timestamps, no duplicate identities, and zero running sync rows.

Deferred from Phase 5B.3B:

- Endpoint-level conditional requests
- ETag and Last-Modified support
- Secondary Canvas resources
- Scheduled/background synchronization
- Mobile synchronization UI
- Reviewer generation from Canvas content

#### Phase 5B.3C - Conditional Canvas Fetching And Network-Efficiency Hardening

Status: Audit complete for Phase 5B.3C1. Production conditional fetching is
not implemented.

Scope:

- Investigate Canvas endpoint support for conditional requests.
- Add ETag or Last-Modified handling only where reliable per endpoint.
- Measure whether request count, bandwidth, or duration improves.
- Preserve deterministic persistence and safe failure behavior from Phase
  5B.3B.
- Avoid claiming delta synchronization where Canvas cannot provide a reliable
  cursor.

Phase 5B.3C1 audit result:

- A local ignored harness audited active course listing, modules, module items,
  Pages, Page details, assignment groups, and assignments using the stored
  encrypted Canvas connection.
- Production sync behavior was unchanged; no sync runs, graph writes,
  validator persistence, raw response caching, or migrations were added.
- ETags were present and stable across all audited endpoint families.
- `Last-Modified` was absent across all audited endpoint families.
- If-None-Match primary conditional requests returned HTTP 200 with full
  bodies for every audited endpoint; no 304 responses were observed.
- Baseline and conditional body bytes were both 154,503, so observed body-byte
  reduction was 0%.
- One paginated Page collection included a later page, confirming that any
  future conditional design would need independent per-page validator and
  pagination state.
- Page-list validators cannot be treated as proof that Page-detail bodies are
  unchanged.
- Module lists, module-item lists, assignment groups, and assignments require
  separate state if future evidence ever supports conditional requests.
- The four known Page-listing failures remained
  `canvas_course_pages_failed`, `resource_not_found`, non-retryable, not 304,
  and did not advance graph or fingerprint state.

Decision:

- Outcome C: no useful validator support was observed.
- Do not implement Phase 5B.3C2 for the currently synchronized endpoint
  families.
- Continue ordinary GET behavior for courses, modules, module items, Pages,
  Page details, assignment groups, and assignments.
- Do not invent validators and do not skip requests based only on
  course-level fingerprint state.

#### Phase 5B.4 - Secondary Canvas Resource Synchronization

Status: Phase 5B.4A complete, remotely verified, and live validated with
documented permanent Canvas limitations.

Scope:

- Select each secondary Canvas resource family only after explicit product and
  security review.
- Continue using the per-user credential boundary, service-role persistence,
  sanitized diagnostics, and failure-preservation rules established in Phase
  5A through Phase 5B.3C1.
- Keep production conditional fetching out unless future evidence shows
  reliable 304 behavior.
- Continue not treating Page-listing 404 failures as successful empty-Page
  collections.

##### Phase 5B.4A - Planner Items And Announcements

Status: Complete, remotely verified, and live validated with a documented
partial result.

Scope:

- Canvas planner-item retrieval through `GET /api/v1/planner/items`.
- Canvas announcement retrieval through per-course
  `GET /api/v1/announcements` calls.
- A deterministic rolling sync window: 30 days in the past and 120 days in the
  future, captured from one run timestamp.
- Typed Canvas client methods, repeated `context_codes[]` query serialization,
  ordinary authenticated GET behavior, trusted pagination, redirect rejection,
  and bounded transient retry behavior.
- Normalized planner and announcement payloads with deterministic source
  fingerprints and without unrestricted nested Canvas payload retention.
- Tables `canvas_planner_items` and `canvas_announcements`.
- Service-role-only snapshot RPCs for planner and per-course announcement
  persistence.
- Insert/update/unchanged/pruned accounting and safe scoped pruning only after
  a complete authoritative snapshot is fetched.
- Aggregate-only route summaries and mobile service parsing without UI.

Validation:

- Remote migrations `202607060001` and `202607060002` are applied.
- Remote rollback verification passed through
  `scripts/phase5b4a-planner-announcements-verification.sql`.
- Protected live validation used the existing encrypted Canvas connection.
  The first run returned HTTP 200 `partial`, discovered 37 planner items and
  27 announcements, inserted 37 planner items and 19 announcements, preserved
  four known Page-listing limitations, and left zero running sync rows.
- The second run returned HTTP 200 `partial`, classified 37 planner items and
  19 announcements as unchanged, preserved stable identities, produced zero
  duplicates, zero unnecessary updates, zero unexpected pruning, stable failure
  categories, and zero running sync rows.
- The four known Page-listing failures remain non-retryable
  `canvas_course_pages_failed` `resource_not_found` 4xx limitations.
- Four announcement persistence scopes remain partial for the same unavailable
  course graphs and are reported as sanitized
  `canvas_announcement_persistence_failed` diagnostics without pruning.

Deferred from Phase 5B.4A:

- Discussion entries, discussion replies, and general discussion-topic
  synchronization.
- Quiz details and quiz-question metadata.
- Planner-note creation, planner-note editing, and planner-override mutation.
- Submission, grade, rubric, and feedback synchronization.
- File, attachment, announcement-attachment, and media ingestion.
- Canvas webhooks, scheduled synchronization, background jobs, resumable jobs,
  queues, mobile synchronization UI, source-selection UI, notifications, and
  reviewer generation from Canvas data.

### Phase 5C - File, Attachment, And Media Ingestion

Status: Complete through Phase 5C.2B. Phase 5C.1 secure file inventory and
bounded selected-file ingestion is remotely and live validated for backend behavior, private Storage,
and second-run stability. The account-wide synchronous metadata sync route
remains over its configured runtime budget in local production-build
measurement, so deployed production-runtime readiness is not claimed for that
diagnostic route. Phase 5C.2A1 selected-course synchronization is complete,
uses independent course-scoped requests, and stayed within the 60-second
per-course budget in protected live validation. Phase 5C.2A2 Canvas source
selection and reviewer handoff is complete and live validated. Phase 5C.2B
Canvas PDF/image OCR sources are complete and live validated for preparation,
private Storage OCR preview, edited reviewer handoff, and Study Library
cleanup. Phase 5D.1 immutable source snapshots, Phase 5D.2 structured
normalized blocks, and Phase 5D.3 duplicate relationships, source freshness,
and regeneration readiness are implemented, remotely verified, and
protected-live validated. The historical Phase 5E next-step text is superseded:
Phase 5E.1 through 5E.5 are implemented, and Phase 5E.6 remains partial only
for physical-device acceptance.

#### Phase 5C.1 - Secure File Inventory And Bounded Ingestion Foundation

Status: Remotely and live validated for backend behavior; production-runtime
safe status is partial because the synchronous sync route exceeds its
configured 60-second budget.

Implemented:

- Canvas file metadata listing and single-file metadata lookup in
  `@stay-focused/canvas`.
- Bounded Canvas file download support with manual redirect handling,
  off-origin bearer stripping, unsafe host rejection, timeout enforcement, and
  content-length/stream byte caps.
- Central file policy shared with existing OCR limits: 10 MiB per file, 3 files
  per ingestion request, and 15 MiB aggregate stored bytes per ingestion
  request.
- Metadata-only or blocked classification for media, unsupported formats,
  dangerous MIME/extension combinations, archives/containers, locked files,
  hidden files, unavailable files, and oversized files.
- `canvas_files`, `canvas_file_references`, and
  `canvas_file_ingestion_results` migration foundation.
- Private Supabase Storage bucket `canvas-source-files` with restrictive
  policies denying direct `anon` and `authenticated` object access.
- Service-role-only RPCs for file inventory replacement and sanitized ingestion
  result recording.
- `POST /api/canvas/sync` file inventory for successful course graphs, with
  module-item references and Canvas file links discovered from Page,
  assignment, and announcement HTML.
- `POST /api/canvas/files/ingest` for authenticated selected file-row ids,
  fresh metadata lookup before download, content signature validation, private
  storage upload, stale-object cleanup, and sanitized per-file terminal
  results.
- Mobile sync response parsing for aggregate `files` and `fileReferences`
  counts without adding UI.
- Remote migrations `202607060003` and `202607060004` are applied.
- Supabase security and performance advisors were reviewed; new Phase 5C.1
  foreign-key index warnings were fixed by `202607060004`.
- Private Storage access controls passed: public, anonymous, authenticated
  arbitrary, and cross-user object access were denied while trusted server
  access worked.
- Protected live ingestion stored two eligible selected files, recorded one
  metadata-only result, and preserved stable object pointers on the second
  ingestion with zero additional bytes stored.
- Protected live metadata sync remained aggregate-only and metadata-only for
  files, but measured 72.294 seconds and 65.355 seconds in local
  production-build validation against `maxDuration = 60`.

Still deferred from Phase 5C.1:

- Text extraction from Canvas files.
- OCR over Canvas files.
- Parser registry and parser-version tracking.
- PowerPoint, Word, spreadsheet, HTML, caption, and media parsers.
- Mobile file-selection, source-preview, and selective-import UI.
- Reviewer generation from Canvas file contents.
- Background/resumable ingestion jobs.

Verification:

- Canvas package tests: 50/50.
- API tests: 184/184.
- Mobile tests: 79/79.
- OCR tests: 14/14.
- Root typecheck/build/tests: 7/7 workspaces.

#### Phase 5C.2A1 - Course Selection And Runtime-Safe Canvas Synchronization

Status: Complete. Remotely verified and protected-live validated.

Implemented:

- `GET /api/canvas/courses` now returns a Canvas course inventory with
  metadata-based presentation categories: likely current, past or concluded,
  other or uncertain, and unavailable.
- Course names are display data only, not authoritative exclusion rules.
- `canvas_course_sync_preferences` stores selected-course choices separately
  from the course inventory with stable identities, composite ownership,
  RLS, revoked direct client grants, and service-role-only RPCs.
- Deselecting a course disables future normal selected-course synchronization
  but does not delete synchronized graph data, file metadata, stored objects,
  or sync history.
- `POST /api/canvas/courses/:courseId/sync` synchronizes one selected internal
  course row through the existing shared course synchronization path.
- Course-scoped sync covers course-owned graph data, announcements, file
  metadata, and file references, but intentionally excludes user-wide planner
  synchronization.
- Normal mobile synchronization uses selected course IDs and a maximum
  concurrency of two independent course-scoped requests.
- Per-course mobile status distinguishes unsaved selection changes, running,
  success, partial, failed, deselected, and unavailable states.
- Academic-unit synchronization limit: none.

Validation:

- Remote migration `20260706113150` is applied and rollback-safe SQL
  verification passed.
- Supabase security and performance advisors produced no new Phase 5C.2A1
  findings.
- Protected live inventory returned 76 course shells: 15 likely current,
  59 past or concluded, 2 other or uncertain, and 0 unavailable.
- Two likely-current courses were selected, persisted, restored after reload,
  synchronized independently, deselected, and reselected without duplicate
  identities or destructive cleanup.
- First selected-course sync durations were 6.052 seconds and 8.492 seconds.
  Second selected-course sync durations were 5.833 seconds and 7.849 seconds.
- The account-wide route was not called by the normal selected-course mobile
  flow.

Still deferred from Phase 5C.2A1:
- Parser/OCR expansion for Canvas file contents.
- Background, scheduled, resumable, or queued synchronization.
- Canvas OAuth and broader Canvas resource families.

#### Phase 5C.2A2 - Canvas Source Selection And Reviewer Handoff

Status: Complete and protected-live validated.

Implemented:

- Protected `GET /api/canvas/courses/:courseId/sources` for selected,
  synchronized, owned internal course rows.
- Source descriptors over existing synchronized Canvas tables for Pages,
  assignment descriptions, announcements, and unavailable file metadata.
- Safe course freshness summary with terminal sync status, completed timestamp,
  partial flag, sanitized failure categories, and synchronized-source
  availability.
- Deterministic descriptor ordering: available first, then Page, Assignment,
  Announcement, File, then sanitized title and internal id.
- Bounded source listing with pagination-ready metadata.
- Protected `POST /api/canvas/courses/:courseId/sources/preview` that validates
  ordered internal source ids, rejects duplicates, cross-course ids, unknown
  ids, unavailable files, unsupported types, and over-limit selections.
- Server-side `parse5` HTML-to-text normalization preserving readable
  structure while removing hidden/executable content, URLs, signed parameters,
  bearer tokens, and token-like strings.
- Preview limits that fit inside the existing reviewer request limit:
  8 sources, 20,000 characters per source, 90,000 combined preview characters,
  120-character suggested title, and 100,000-character reviewer request limit.
- Mobile `Create reviewer from Canvas` entry point for saved selected courses
  with terminal sync history.
- Mobile source picker sections for Pages, Assignments, Announcements, and
  Files, with unavailable files disabled.
- Editable Canvas preview text and title before generation.
- Existing reviewer-generation API reuse with only `sourceText` and
  `sourceTitle`.
- Existing Study Library save flow reuse with minimal `sourceMode: "canvas"`
  metadata.
- No migration, no new reviewer engine, no file parsing/OCR, no automatic sync,
  and no full persistent provenance table.

Exit criteria:

- Canvas provides visible student value in mobile before more Canvas resource
  families are added.
- Partial sync failures are understandable without exposing raw Canvas errors,
  course names, filenames, URLs, object keys, hashes, or private content.
- Reviewer generation still receives user-reviewed source text through the
  existing generation boundary.

Validation:

- API source service tests passed with 11/11 cases, covering normalization,
  limits, selected-course lookup, unavailable files, duplicate rejection,
  cross-course rejection, and no token-column selection.
- API route tests for source list and preview passed with 10/10 cases.
- Mobile Canvas API service tests passed with 22/22 Canvas source cases.
- Package verification passed for Canvas, DB, API, mobile, engine, and OCR.
- Protected live validation used opaque `live-course-1` and aggregate-only
  output: 49 descriptors, 36 available Pages, 2 unavailable Pages, 11 available
  announcements, 0 available assignments, no source bodies in listing, ordered
  two-source preview with 3,467 characters, deterministic assembly, empty-source
  rejection, cross-course rejection, no URLs or credentials, and no
  Canvas/Storage/OCR/OpenAI calls during preview.
- Reviewer-generation smoke reused the existing reviewer API, returned HTTP
  200, generated 2 sections, saved to Study Library, verified list visibility,
  and deleted the smoke reviewer.
- Expo Web UI smoke selected two Canvas sources, loaded preview, edited source
  text and title, returned to source selection with selection preserved, and
  reloaded preview.

Still deferred from Phase 5C.2A2 and completed by Phase 5C.2B:

- Canvas PDF extraction.
- Canvas image OCR.

Still deferred after Phase 5C.2B:

- Office parsing.
- audio/video transcription.
- full persistent Canvas source provenance.
- background, scheduled, resumable, or queued synchronization.
- tasks and schedule generation.
- Canvas OAuth.
- broader Canvas resource support.

#### Phase 5C.2B - Canvas PDF And Image Extraction/OCR Integration

Status: Complete and protected-live validated.

Implemented:

- Safe Canvas file-state descriptors for ready, not prepared, failed,
  blocked, unsupported, and unavailable files without returning Storage fields,
  Canvas URLs, hashes, raw MIME internals, or credentials.
- Course-scoped `POST /api/canvas/courses/:courseId/sources/prepare` that
  accepts only owned `file:<internal-row-id>` descriptors and delegates to the
  existing `ingestCanvasFiles` boundary.
- Shared API-side OCR validation/extraction helpers reused by manual image/PDF
  OCR routes and Canvas stored-file extraction.
- Stored-file extraction from server-resolved owned rows only, with private
  bucket, object-key shape, byte count, SHA-256, MIME/signature, PDF
  parseability, encrypted-PDF, and page-limit validation before OCR.
- Source preview support for one OCR-backed PDF/image file mixed with Pages,
  assignment descriptions, and announcements while preserving submitted picker
  order.
- Mobile source-picker prepare/ready/failed/unsupported states, one-file
  selection guard, and honest extraction loading copy.
- No extracted-text persistence, no Canvas call or PAT decryption during
  preview, no signed URLs or raw bytes returned to mobile, and no Canvas
  metadata sent to OpenAI.

Validation:

- Canvas package typecheck/build/tests: 52/52.
- DB package typecheck: passed.
- OCR package typecheck/build/tests: 14/14.
- API typecheck/build/tests: 269/269.
- Mobile typecheck/tests: 92/92.
- Engine typecheck/build/evals: 266/266.
- Root Turbo typecheck/build: 7/7 tasks, 5 cached and 2 fresh.
- Workspace tests: API 269/269, mobile 92/92, Canvas 52/52, OCR 14/14.
- Protected live validation checked 2 selected synchronized courses, found 0
  eligible PDFs and 2 eligible images, prepared opaque `live-file-1`, reran
  preparation idempotently, previewed Page -> Image -> Announcement with 1
  OCR-backed source and 62 extracted image characters, returned no private
  Storage or credential fields, generated and saved a reviewer from harmless
  edited text, verified Study Library visibility, and deleted the validation
  reviewer. An exploratory generation attempt including the very short/noisy
  live OCR preview text returned the existing `reviewer_validation_failed`
  response.

#### Later Phase 5C Parser And Source Import Work

Scope:

- PDF with embedded text
- Scanned PDF through the existing OCR boundary
- PowerPoint `.ppt` and `.pptx`
- Word `.doc` and `.docx`
- Images
- Plain text
- HTML
- Supported spreadsheet text
- Assignment attachments
- Discussion attachments
- Announcement attachments
- Canvas-hosted media captions when available
- Unsupported format handling
- File-size and page-count limits
- Parser registry
- Partial-failure reporting

Required ingestion flow:

```text
Canvas discovery
-> metadata record
-> authorized file download
-> MIME and extension detection
-> parser or OCR selection
-> structured text extraction
-> normalized source blocks
-> editable preview
-> confirmed import
-> reviewer generation
```

Exit criteria:

- Canvas file discovery does not bypass the existing OCR, normalization,
  grounding, or reviewer validation boundaries.
- Unsupported files and partial failures are visible without blocking unrelated
  synchronized records.

### Phase 5D - Source Normalization, Provenance, And Selective Import

Status: Complete through Phase 5D.3 and protected-live validated for Phase
5D.1 through Phase 5D.3 on 2026-07-08. Phase 5D.1 is implemented and remotely
verified as the immutable source-snapshot and exact reviewer-provenance
foundation. Phase 5D.2 is implemented and remotely verified as the structured
normalized-block and selective-import slice. Phase 5D.3 is implemented as
duplicate relationships, source freshness, and regeneration readiness without
actual regeneration. Remote Phase 5D.3 verification passed with migrations
`202607080001_add_canvas_source_relationships_freshness.sql` and
`202607080002_harden_source_relationship_grants.sql`, plus 18/18 rollback-safe
SQL verifier checks; protected live validation passed with aggregate opaque
output only; remaining Supabase advisor warnings are historical.

Subphases:

- Phase 5D.1 - Immutable Source Snapshots And Exact Reviewer Provenance:
  private preview sessions, exact edited source snapshots, ordered snapshot
  items, parser/OCR version identifiers, database-enforced reviewer ownership
  linkage, safe detail summaries, no historical reviewer backfill, and no
  provenance sent to OpenAI.
- Phase 5D.2 - Structured Normalized Blocks And Selective Import:
  private short-lived structure sessions, heading/list/table/OCR block models,
  page ordering where available, safe public block selectors, bounded
  user-selectable blocks before generation, selected-block preview manifests,
  immutable snapshot block provenance, and no provenance sent to OpenAI.
- Phase 5D.3 - Duplicate Relationships, Source Freshness, And Regeneration
  Readiness: same-source and exact-content duplicate detection, repeated Canvas
  reference summaries, immutable relationship provenance, protected
  current-versus-snapshot source-status checks, conservative
  missing-after-sync semantics, unsupported-source reporting, and readiness
  assessment without actual regeneration.

Scope:

- Structure preservation
- Headings
- Bullet hierarchy
- Tables
- Pages
- Slide numbers
- Module order
- Source snapshots
- Source versions
- Content hashes
- Parser versions
- OCR versions
- Selective import
- Editable source preview
- Deduplication
- Repeated-source relationships
- Stale-source handling
- Deleted-source handling
- Unsupported-source reporting

Every normalized source must preserve provenance such as:

```text
Stay Focused user ID
Canvas connection ID
Canvas course ID
Canvas module ID
Canvas module-item ID
Canvas source-object ID
source type
source title
file name
MIME type
page or slide number
Canvas URL
Canvas updated timestamp
local synchronized timestamp
content hash
parser version
OCR version
```

Exit criteria:

- A reviewer remains linked to the exact source snapshot used during
  generation. Phase 5D.1 satisfies this foundation for the current Canvas
  reviewer path.
- Users can preview and selectively import source material before it reaches the
  reviewer engine. Phase 5D.2 satisfies this for the current Canvas reviewer
  path using server-held block manifests and selected-block snapshots.
- Saved Canvas reviewers can be checked against current synchronized source
  state with conservative current/changed/unavailable/unsupported/missing/unknown
  results and a regeneration-readiness summary. Phase 5D.3 satisfies this as
  assessment only; actual reviewer regeneration remains out of scope.

### Phase 5E - Grades, Submissions, Rubrics, And Feedback Foundation

Status: Implemented through Phase 5E.5. Phase 5E.6 automated, protected API,
and Expo Web validation is complete; physical iPhone acceptance remains
partial. The implementation-ready plan is recorded in
`docs/ai/phase5e-grades-submissions-plan-20260708.md`. Phase 5E.1 is complete
in `docs/ai/phase5e1-grades-submissions-foundation-20260708.md`: database
tables, normalized data contracts, DB types, remote migration verification, and
rollback-safe SQL verification are done. Phase 5E.2 is complete in
`docs/ai/phase5e2-canvas-grade-client-20260708.md`: typed read-only Canvas
client methods, normalized assignment/submission/course-grade provider
contracts, explicit visibility wrappers, pagination/error coverage, and
unsafe-field discards are done. Phase 5E.3 is implemented and locally validated
in
`docs/ai/phase5e3-explicit-grade-sync-20260708.md`: an internal explicit
service can synchronize one owned selected course into the Phase 5E.1
assignment/submission and visible-summary tables with service-role-only RPCs,
deterministic fingerprints, sync-state transitions, and failed-family
preservation. Remote Supabase verification is complete: migrations
`202607080005_add_canvas_grade_sync_rpcs.sql` and
`202607080006_harden_canvas_grade_sync_rpc_function_references.sql` are applied
remotely, RPC execution is service-role-only, RLS/direct grants remain
hardened, the rollback-safe verifier passed 17/17 checks, and no fictional rows
remain. Phase 5E.4 is implemented in
`docs/ai/phase5e4-protected-grade-api-20260708.md`: protected API routes now
allow explicit selected-course grade sync, paginated assignment/submission
list, assignment detail, Canvas-provided visible course summary, and sync-status
reads. The sync route delegates to Phase 5E.3; all GET routes are database-only
and return `Cache-Control: no-store`. Phase 5E.5 is complete and locally
validated in `docs/ai/phase5e5-mobile-grade-experience-20260708.md`: mobile now
adds selected-course `Grades` entry points, strict grade API client parsers,
GET-only initial loading and reload behavior, explicit per-course grade sync,
course summary display, assignment pagination, safe assignment detail loading,
status presentation, stale/partial/failed copy, and in-memory-only
network-failure preservation. Synchronization is manual and per selected course
only, Canvas access remains read-only, and no background job, notification,
durable grade cache, local grade calculation, submission write, private
submission-content storage, or reviewer prompt integration exists.
Phase 5E.6 is partial in
`docs/ai/phase5e6-mobile-grade-protected-live-validation-20260708.md`:
automated baseline checks, protected API preflight, Expo Web protected smoke,
session-only smoke, controlled fictional edge validation, authorization
regression checks, and privacy scans passed. Physical iPhone Expo Go validation
remains required before Phase 5E.6 and Phase 5E can be marked complete.
Phase 5E.4 protected live validation is complete in
`docs/ai/phase5e4-protected-grade-api-live-validation-20260708.md`; the closeout
fixed the sync route course-scope preflight so unknown valid course UUIDs return
safe `404` and owned but unselected courses return safe `400` before Canvas
synchronization.

MVP boundary:

- Strictly read-only selected-course assignment, submission, and visible grade
  state.
- Explicit per-course synchronization only; Canvas calls happen only in the
  sync route.
- DB-only mobile read routes over synchronized state.
- Canvas-provided visible course grade summaries only when returned by Canvas.
- No unofficial local grade calculation or weighted estimate.
- No notification delivery, background jobs, cron, queues, submission writes,
  uploads, comments, grade edits, or reviewer prompt use.

Scope:

- Visible current course score
- Visible final course score
- Displayed grades
- Assignment groups
- Assignment-group weights
- Drop rules
- Grading periods
- Assignments
- Points possible
- Grading type
- Submission scores
- Submission state
- Attempt number
- Missing state
- Late state
- Excused state
- Omitted-from-final-grade state
- Rubric definitions
- Rubric assessments
- Instructor comments
- Feedback attachments
- Learning outcomes when permitted
- Grade snapshots
- Canvas hidden-grade behavior

MVP subphases:

- Phase 5E.1 - Data contract and database foundation (complete)
- Phase 5E.2 - Canvas assignment/submission client support (complete)
- Phase 5E.3 - Explicit synchronized import (complete and remotely verified)
- Phase 5E.4 - Protected API read model (complete and live validated)
- Phase 5E.5 - Mobile assignment and grade experience (complete and locally validated)
- Phase 5E.6 - Protected live validation and hardening (automated/protected
  validation complete; physical iPhone acceptance pending)

Roadmap result: Phase 5E.6 - partial for physical-device acceptance only.
Product Recovery Phases R1, R2, and
R3 are complete and documented in
`docs/ai/product-recovery-r1-v1-audit-20260713.md`,
`docs/ai/product-recovery-r2-reviewer-reliability-20260713.md`, and
`docs/ai/product-recovery-r3-full-document-ocr-20260713.md`.

Historical next step at that checkpoint was Product Recovery Phase R4; R4 and
R5 are now complete and R6 remains partial.

Exit criteria:

- Grade and submission records remain separate from reviewer source content.
- Grades never automatically enter reviewer-generation prompts.
- Hidden or incomplete Canvas grading information is represented honestly.
- Phase 5E.1 through Phase 5E.5 are complete. Phase 5E.6 automated,
  protected API, and Expo Web validation passed; physical iPhone Expo Go
  validation remains before Phase 5E can be marked complete.

## Product Recovery

Status: Partial. Phases R1 through R5 are complete; R6 automated acceptance is
complete and its physical-device matrix remains open.

Product Recovery Phase R5 - Complete.

Purpose: Restore practical student usefulness while preserving the stronger V2
architecture. V1 is the behavioral benchmark; V2 is the security,
maintainability, privacy, and mobile architecture benchmark.

Phase R1 result:

- Completed `docs/ai/product-recovery-r1-v1-audit-20260713.md`.
- Located and inspected the V1 repository without modifying it.
- Compared V1 and V2 reviewer generation, OCR, Canvas source resolution,
  mobile workflow, security, and maintainability behavior.
- Identified V2 safeguards that must remain: authentication, RLS, encrypted
  Canvas credentials, server-only OCR/OpenAI credentials, protected Canvas APIs,
  private source snapshots, provenance, strict parsers, grade/reviewer
  separation, and privacy-preserving validation docs.
- Identified product restrictions that are blocking usefulness: the five-page
  OCR ceiling, incomplete page coverage handling, all-or-nothing reviewer
  assembly, narrow Canvas source eligibility, ambiguous sync/capability copy,
  and a workflow that exposes too many implementation gates to students.

Phase R3 result:

- Completed `docs/ai/product-recovery-r3-full-document-ocr-20260713.md`.
- Centralized the synchronous five-page PDF limit and documented the Google
  Vision `files:annotate` constraint behind it.
- Added one authoritative verifier for expected count, exact unique page
  coverage, range, terminal states, explicit blank pages, deterministic order,
  and source eligibility.
- Gated manual and Canvas-backed OCR so incomplete extraction returns safe
  diagnostics and cannot reach reviewer generation.
- Preserved R2 at 287/287 engine evaluations and protected-live validated all
  five accepted pages with coverage, grounding, and leakage passing.

Phase R4 result:

- Enforced one authoritative `usable`, `empty`, `unsupported`, `inaccessible`,
  or `failed` Canvas content boundary.
- Kept metadata and incomplete OCR out of reviewer text and added current-row,
  selection, fingerprint, and preview-session generation gates.

Phase R5 result:

- Recovered the selected-course student journey with authoritative ordering,
  safe capability states, explicit preparation/checking, exact editable
  preview, existing reviewer generation, and snapshot-bound save.
- Added continuous bounded source pagination, complete stale-state clearing,
  duplicate-request prevention, accessible progress, and the parchment/gold
  flat-content visual hierarchy.
- Protected R5 validation passed live generation/save/cleanup and stored-file
  resolution; unsupported, inaccessible, and stale scenarios made zero
  reviewer calls.

Recovery roadmap:

- Phase R2 - Reviewer reliability and fallback redesign (complete; 287/287 engine evals and protected Canvas HTTP 200 with validated limited fallback output).
- Phase R3 - Full-document OCR with page completeness (complete; exact page coverage enforced, OCR 25/25, API 391/391, mobile 130/130, protected five-page extraction 5/5 with reviewer validation passing).
- Phase R4 - Canvas usable-content resolution (complete; typed terminal states, exact content-only normalization, current fingerprint gate, and zero reviewer calls for non-usable sources).
- Phase R5 - Simplified student workflow (complete; module ordering, safe capability presentation, staged single-source preview/generation/save, pagination, stale invalidation, and protected end-to-end validation).
- Phase R6 - Real-device product acceptance (partial; automated checks pass,
  physical iPhone checks remain).

Remaining recovery task: Phase R6 physical iPhone acceptance.

Historical note: Phase 5F was pending when this recovery roadmap was written.
Phase 5F.1 and 5F.2 are now complete and hosted validated as recorded at the
top of this roadmap.

### Phase 5F - Incremental And Resilient Synchronization

Status: Complete through Phase 5F.2 and hosted validated. The original scope
below is retained as the planning record; physical release spot-checks remain
acceptance debt rather than implementation work.

Scope:

- Incremental updates
- Canvas `updated_at` handling
- Content hashing
- Idempotent upserts
- Per-course checkpoints
- Per-item sync status
- Resumable synchronization
- Pagination
- Low-concurrency queues
- Retry behavior
- `429` handling
- Retry-after handling
- Stale records
- Deleted Canvas objects
- Locked or unpublished objects
- Partial failures
- Synchronization history
- Background synchronization
- User-visible sync health

Supported item states:

```text
discovered
synced
metadata_only
locked
unpublished
permission_denied
external
unsupported_format
download_failed
parse_failed
ocr_failed
stale
deleted_from_canvas
temporarily_failed
```

Exit criteria:

- Synchronization is idempotent, resumable, low-concurrency, and transparent
  about partial failures.
- Users can see sync health without seeing raw Canvas errors or secret data.

### Future Phase - Canvas OAuth Production Authorization

Status: Future. Not implemented.

Purpose: Replace or supplement manual personal access token entry with the
intended production authorization path for broad multi-user Canvas deployment.

Scope:

- institution-approved Canvas Developer Key
- OAuth authorization redirect
- Canvas authorization-code exchange
- per-user OAuth access tokens
- refresh-token handling where supported
- token refresh and expiration
- encrypted server-side token storage
- connection revocation
- OAuth state validation
- redirect URI validation
- migration from manually entered PAT connections
- institution-specific configuration
- capability revalidation after OAuth connection

Stay Focused does not currently possess a Canvas Developer Key. A Developer Key
is controlled by the Canvas institution or administrator, so OAuth cannot be
fully implemented for the school instance until such a key is approved.

OAuth is required before presenting the Canvas integration as a broadly
deployable public production authorization system. Phase 5A personal access
token support remains useful as a capstone and controlled deployment path, but
OAuth is not merely an optional hardening step.

### Future Phase - Grade Goal Planner

Status: Future.

Grade Goal Planner - Allow students to set a desired course grade, such as
90%, and calculate what scores they need on remaining activities using
synchronized Canvas grades, assignment weights, points, submissions, grading
rules, and editable manual assumptions.

Future planner requirements:

- Target-grade input
- Total-points courses
- Weighted assignment-group courses
- Grading periods
- Dropped-score rules
- Excused assignments
- Omitted assignments
- Extra credit
- Hypothetical scores
- Minimum required score
- Feasibility detection
- Best-case projection
- Worst-case projection
- "What happens if" scenarios
- Highest-impact remaining activity
- Manual correction when Canvas data is incomplete
- Confidence labels
- Optional Canvas What-If Grades verification when supported

Authorization relationship: the planner must consume only grade and assignment
data visible through the connected user's own Canvas credentials, whether the
credential source is the current per-user PAT model or the future OAuth model.
It must not require or assume a school-wide Canvas credential.

Required confidence states:

```ts
type GradeProjectionConfidence =
  | "exact_from_visible_canvas_rules"
  | "verified_with_canvas_what_if"
  | "estimated_from_visible_data"
  | "manual_configuration_required"
  | "insufficient_data";
```

Future grade projections must not be described as exact when grading
information is incomplete or hidden.

### Future Phase - Student Intelligence Features

Status: Future.

Later roadmap group:

- Missing-work recovery plans
- Announcement digests
- Deadline-conflict detection
- Professor-feedback summaries
- Rubric weakness detection
- Outcome-based study planning
- Course-progress dashboards
- Transcript-based reviewers
- Searchable lecture captions
- Offline course packs
- Course-wide semantic search
- Recently viewed material
- "Continue where you left off"

Permission-dependent features must be marked honestly. Successful Canvas course
access does not imply access to inbox messages, recent history, captions,
quiz questions, grades, outcomes, or external-tool content.

## Phase 6 - Tasks And Study Schedules

Status: In progress; route foundation and replanning backend are hosted
accepted, with task/schedule mobile surfaces remaining.

Purpose: Expand from reviewer generation into schedule-first planning and
actionable study sessions.

Major deliverables:

- Task generation
- Due-date awareness
- Schedule generation
- Calendar-first planning
- Canvas deadline integration
- Actionable study sessions

Exit criteria:

- Source material and deadlines can produce user-actionable tasks.
- Generated study sessions fit into schedule-first planning.
- Canvas deadlines can inform task and schedule generation when Canvas is
  connected.

Immediate dependency: Phase 5 Canvas integration and Phase 4 saved content.

## Phase 7 - Polish, Deployment, And Capstone Validation

Status: Pending

Purpose: Validate the app as a polished, deployable capstone product rather
than only a local development slice.

Major deliverables:

- Completed mobile OAuth flows
- Deployed API validation
- Accessibility
- Navigation and UI polish
- Performance testing
- User testing
- Capstone evidence
- Production readiness

Exit criteria:

- Production deployment is validated with safe environment separation.
- Mobile auth flows are complete, including OAuth redirects if kept in scope.
- Accessibility, performance, and user-testing evidence are documented.
- Capstone evidence reflects the implemented product accurately.

Immediate dependency: Phases 3 through 6 complete enough to validate an end-to-end
student workflow.



## W2 mobile parity main integration (2026-10-11)

Owner requested main publication. W1/W2 website already exists on remote
main `7ef5a61`; W2 mobile patches now integrate as `f308faf`, `55b7cd0`,
`815631d`, `dc018c8`, retaining main's newer task refresh. **FRESH PASS:**
web typecheck/lint/82 tests and mobile typecheck/lint/793 tests, with four
existing lint warnings. Existing integration and parity documentation both
survive conflict resolution. Normal push targets `origin/main`; no manual
deployment or force push. Unrelated dirty work remains intact. Next: owner
laptop/fullscreen review; other feature scopes remain separately scheduled.

## W2 mobile parity and fresh acceptance (2026-10-11)

**PASS locally, including physical Android acceptance.** Website W2 remains
verified (fresh typecheck/lint, 79 tests, 25 page/viewport checks). STEP 7 is
complete on `b25-3-3-ai-first`: grouped Canvas spaces, growing/keyboard-aware
draft fields, and light/dark clear-day illustrations with reduced-motion
handling. Mobile implementation tip `9ec9fa1`; fresh typecheck/lint and 791
tests pass, with four existing lint warnings. Physical RMX3151 checks used an
isolated local debug package and fictional fixtures; production/real-account
mobile flows were not tested. Original device settings restored. The appended
W2 handoff records evidence and adaptations; dirty mobile docs/design files
were preserved. No push/deployment. Next: owner laptop/fullscreen review,
then separately scheduled content-estimate, grade-estimator and sync work.

## W1/W2 main integration (2026-10-11)

Owner-authorized release: merge W1/W2 `c05634f` with main `6319376` and push
normally to main. The integration retains the newer canonical activity model
and explicit content+grades refresh while delivering W1 completion/free-time
alignment and W2 desktop, Library, Canvas search and draft editor improvements.
FRESH PASS: 82 web tests, 171 focused API planning/experience tests, root
typecheck/lint/build 8/8 each with zero cached. The
25 page/viewport checks, both Today themes, Canvas/draft flows and unlinked
paper completion pass in isolated browser fixtures. Earlier W1/W2 entries
below are local checkpoints superseded by this release. Separate estimator,
notification automation and inactivity-gating scopes remain pending.

## W2 website desktop layout (2026-10-11)

**PASS locally.** The website now supports the requested laptop/fullscreen
layouts, uniform Library grids, searchable/grouped Canvas courses, a desktop
draft editor with auto-growing fields, and theme-aware clear-day states.
Fresh web typecheck/lint/79 tests and all 25 page/viewport checks pass, with
additional light/dark, Canvas selection and draft persistence checks.
Implementation tip `14b12c4`; evidence/adaptations are in the W2 handoff.
No push/deployment. Next: owner review on laptop and fullscreen; content-based
estimates, grade estimator, sync automation and inactivity gating await their
separately scheduled scopes.

## W1 Today/Schedule alignment and submitted-work filtering (2026-10-11)

**PASS locally and in all six signed-in real-account checks.** Shared planner
submission filtering, Done actions including unlinked paper activities,
date-specific shared free time, unsaved-plan labels and overdue separation are
implemented on `website/functional-v1` (`de3e99c`, `9d2ef46`, `1343428`). Fresh
API typecheck/32 task-planning tests and web typecheck/lint/79 tests pass.
Test sessions, plan metadata and preferences were restored; The 5 Why Analysis
stays completed. No push/deployment. Next requires a separate W2 scope:
website desktop/16:9 layout, Library grid, Canvas course search, draft editor.
Estimator, generation-on-sync and inactivity-gating exclusions remain intact.

## Task and planner sync reliability (2026-10-10)

Owner-authorized scope: repair stale Tasks/Today/Schedule on website and mobile,
merge immediately, and publish the existing API, website and Android preview.

The canonical activity model now checks course selection, stored course end/state,
assignment availability and submission evidence for both clients and the planner.
Imported Canvas tasks retain their course identity and current assignment deadline.
Submitted work moves to Completed, is never overdue, and is excluded from planning;
planned sessions reflect the linked activity state. Deselected/ended courses and
orphaned imports do not return as personal tasks. Saved work is preserved.

Website Tasks consumes the complete canonical activity list; Tasks, Today and
Schedule expose explicit content+grades Sync now and poll persisted data every
minute. Per-course website sync now includes grades. Partial sync outcomes remain
partial. Android refresh admissions are bounded to one content/grades pair.
Opening Tasks/Today/Schedule does not create Canvas jobs; the existing once-per-load Generate refresh is preserved. Automatic five-minute Canvas polling
is still the separate, pending notification activation scope.

FRESH PASS: API 1,275 tests (3 skipped), focused final activity/planning regression
162 tests, web 69 tests, mobile sync/screens 68 tests, root production builds 8/8,
root lint 8/8 (four existing mobile warnings), root typecheck 8/8 (changed apps fresh;
unmodified packages cached). Read-only live database checks passed and found four
pending local imports with submitted Canvas evidence. Android preview OTA
25edeaae-9365-4ffa-acb2-f84123430983 is published for runtime 2.0.1.

API/website publication and main integration are being completed. Physical device
acceptance is NOT RUN: no ADB device or browser surface is exposed. See
[acceptance](ai/acceptance/task-sync-reliability-20261010.md).


## Website completion and main integration (2026-10-08)

Owner-authorized finite scope: finish Claude's pending web changes, verify the
website, publish it, and push to main. Existing API/mobile/database architecture
and unrelated working-tree changes are preserved.

PUBLISHED AND INTEGRATED INTO MAIN. Course Library, reviewer management and
selection tools, account menu, content identity and Schedule deadlines are
complete. Canvas refresh is explicit, bounded, owner-cancelled and honest about
partial admission or unknown polling outcomes. Fresh web tests 66/66, reviewer
route regression 9/9, web typecheck/lint and root typecheck/lint/build 8/8 pass.
Production deployment ca524a4 is READY. Live signed-in read, rename with reload,
delete confirmation Cancel, and desktop/mobile layout checks passed. The normal
main push was verified remotely; no force push. No paid generation or live
Canvas sync was submitted. See
[completion evidence](ai/acceptance/website-completion-20261008.md).

## Urgent Canvas notification activation (2026-10-03)

Local metadata synchronization, transactional email outbox, deadline reminders and persistent Settings controls are implemented. Next: apply the forward migration, configure cron/Resend variables and verified sender, roll out API and Mobile, perform developer-only live delivery and repeat-request/device acceptance, verify five-minute workload capacity, then enable the single Google Cloud Scheduler job. The current Hobby plan cannot provide that trigger interval through Vercel Cron. [Setup and behavior](architecture/canvas-email-notifications.md). Other phase gates below remain unchanged.
