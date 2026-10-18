<!-- RV1 begin -->
## RV1 reviewer header complete locally - PASS (2026-10-18)

**PASS for unattended STEP 0-5, tests, fresh serial local gates, docs and local
commits.** Mobile title-row Reviewer actions contains Export and Share in a
measured native popover, reusing QueueDropdown's outside/Android Back pattern.
The title wraps beside a 48-point trigger; the menu has no animation. Offline
Export works; Share keeps its owner/offline guard, sheet and request logic.
Website Share/Save to file use the existing account popover pattern with
Escape/focus return, arrows/Tab and outside dismissal; Generate Quiz stays
visible. Both clients group minutes/topics compactly. Mobile automatic labels
and website course/date remain. Reviewer-only hideFreshLabel suppresses idle
Updated while preserving Syncing, error/Retry and update-available actions.
Other screens retain default status behavior. **RV1 supersedes RX1's button
row.** No existing reviewer Save offline action; none invented. No reusable
primitive, ADR, dependency, native module, API change or migration.

**FRESH PASS, serial:** forced root typecheck/lint/build **8/8 tasks each,
0 cached**; mobile **1321/1321** (139 files), web **249/249** (42 files), shared
workspace **427/427** (44 files including existing compiled copies), separate
shared source-only **215/215** (22 files). Standalone API build **1/1**,
**35/35** pages; Android export **1/1**. Root build includes website **19/19**
pages and Android/iOS/web exports. Diff/staged-diff PASS; six existing lint
warnings. Deterministic failed first attempts are recorded in acceptance;
no nondeterministic flake. Implementation: **e4f5ee9**, **0f500cd**, **6bef993**.

**Owner steps remaining:** Rollout and Device checks **NOT RUN**, skipped
entirely. Owner RB6 fullsend: website deploy and APK/OTA, then Realme menu,
offline/meta/status checks and browser checks at 1440/390 px. Production
revision, database rows, Scheduler and device/browser behavior are **UNVERIFIED
(owner to confirm)**. No remote service operation, deployment, remote SQL,
Scheduler change, email, environment-file edit or push. Generated Next
declarations were restored; original untracked work is preserved. RV1 is the
finite endpoint; no later task started. WG3's earlier stop remains independent.

[RV1 acceptance](acceptance/rv1-reviewer-header.md).

<!-- RV1 end -->

<!-- MR3 begin -->
## MR3 failed-generation recovery complete locally - PASS (2026-10-18)

Finite owner-approved scope: MR3 STEP 0-5, tests, fresh serial local gates,
documentation and atomic local commits on overnight/2026-10-15_feedback.
Reviewer/Quiz manual retry uses the exact stored source, fresh accepted-attempt
keys, real-stage phrases and safe rejection handling on mobile and web.
Existing automatic retry, quotas, OCR accounting, ownership and cancellation
remain. New function-only migration adds legacy eligibility/deletion checks;
no existing-row backfill. Migration application is an owner step.

**PASS for this finite unattended scope.** Implementation: **84ab171** shared,
**71f3d25** API/function-only migration, **55d4eb0** web, **cb36f82** mobile.
All requested surfaces offer Try again/stage/safe-material copy; stale 409/422
denials suppress retry, synchronous locks prevent duplicates, and accepted
attempts get fresh keys including a still-mounted original Queue card.

**FRESH PASS, serial:** forced root typecheck/lint/build **8/8 each, 0 cached**;
shared **393/393** (43 files), API **2306 passed + 3 existing live skips**
(201 files), mobile **1311/1311** (138 files), web **236/236** (40 files).
Standalone API build **1/1**, **35/35** pages; Android export **1/1**. Root build
includes website **19/19** and Android/iOS/web exports. Both diff checks PASS;
six existing lint warnings. Failed first attempts and key-rotation review are
retained; no nondeterministic flake observed. Optional standalone workflow probe
is **BLOCKED, zero tests**, NOT APPLICABLE to mandatory MR3 gates because no
runtime/provider boundary changed; existing API workflow/source-chain tests pass.

**Owner steps remaining:** apply `20261018000100_failed_generation_retry.sql`
before API/web/mobile rollout, then the specified SOC_SCI_103 failure/retry
device check. These actions are NOT RUN and skipped entirely. No migration or
existing-row backfill was applied remotely. Generated build type changes were
restored; the three original untracked paths remain preserved.

Acceptance: [MR3](acceptance/mr3-failed-generation-retry.md); policy:
[ADR-044](../adr/ADR-044-failed-generation-retry.md). Endpoint is MR3 only.
Rollout/Device checks are excluded; production/Scheduler/database/device state
is UNVERIFIED (owner to confirm). No provider calls, deployment, remote SQL,
Scheduler change, email, environment-file edit or push. No later task is started.
<!-- MR3 end -->

<!-- OI1 begin -->
## OI1 offline reviewer images complete locally - PASS (2026-10-18)

Finite STEP 0-8, tests, fresh serial local gates, docs and local commits are
complete from baseline 181c4b6 on overnight/2026-10-15_feedback. Implementation
**c78e4b5** reuses FX1b owner reads; private image files and a SQLite v9 manifest
provide automatic saving, two downloads, restart/retry, local rendering, cleanup,
40 MiB/500 MiB caps and image-aware readiness/bytes. Labels and attribution remain.
No native dependency, API or remote migration. Website offline: NOT APPLICABLE
(PAR1), since the website has no offline mode.

**FRESH PASS:** forced root typecheck/lint/build **8/8 each, 0 cached**; shared
**362/362** (42 files), mobile **1301/1301** (137 files); standalone API build
**1/1**, **35/35** pages; Android export **1/1**. Root build also exports iOS/web
and builds website **19/19** pages. API tests NOT APPLICABLE. Both diff checks
PASS; six existing lint warnings. First failures and an aborted resumed build
are recorded in acceptance; no nondeterministic flake observed.

**Owner steps remaining:** Rollout and Device checks NOT RUN, skipped entirely.
Publish reviewed mobile code; check images in airplane mode/after restart and
replacement/removal storage drops. Live deployment/native build, DB/Scheduler
and device behavior are UNVERIFIED (owner to confirm). No live provider check,
deployment, remote SQL/migration, Scheduler, email, environment-file edit or push.
Unrelated untracked work is preserved. OI1 is complete; no later scope started.

[OI1 acceptance](acceptance/oi1-offline-reviewer-images.md).
<!-- OI1 end -->

<!-- WV1 begin -->
## WV1/N7 reviewer image load complete locally - PASS (2026-10-18)

**PASS for unattended STEP 0-5, tests, local gates, docs and commits.** Website
and mobile load all cached reviewer image URLs in one owner-scoped `/figures`
response on open. Bulk snapshot discovery checks the exact original once and
never renders. Missing snapshots use a three-request queue with read-only
bounded polling; source-image errors share one signed-URL refresh. Website
reserves image boxes, eagerly loads the first two images, and lazily loads the
rest with async decoding. IM2 Ask/Save/details, source priority, owner isolation
and offline/identity guards remain. Legacy routes are compatible; no migration
or dependency change.

Synthetic fixture: **7 -> 2 metadata requests**, first course URL **2 -> 1
sequential responses**; unrendered page **3 -> 2** with mocked immediate
completion. Earliest URL including stored external remains **1 -> 1**.
Production speed is unverified.

**FRESH PASS, serial:** forced root typecheck/lint/build **8/8 tasks each,
0 cached**; API **2283/2283** (201 files, three existing live skips),
web **227/227** (39 files), shared **362/362** (42 files),
mobile **1269/1269** (135 files); standalone API/web builds
**1/1 each**, **35/35** and **19/19** pages; mobile Android export **1/1**.
Root build also exports Android/iOS/web. Six existing lint warnings remain.
Diff and staged-diff hygiene PASS. First-attempt failures and corrected fixture
mocks are retained in acceptance; no nondeterministic flake observed.

**Owner steps remaining:** Rollout and Device checks **NOT RUN**, skipped
entirely. Owner RB5: deploy reviewed API/web and assess real reviewer image
loading; publish/recheck the mobile change on device. Deployment revision,
production rows, device behavior and Scheduler state are **UNVERIFIED (owner
to confirm)**. No remote call, deployment, SQL/migration application, Scheduler
action, email, environment-file edit or push occurred. The referenced overnight
roadmap is absent; the complete WV1 prompt supplied scope. Unrelated untracked
paths are preserved. This finite run ends at WV1; no later task was started.

Local implementation commits:

- 3d54f97 feat(api): batch owner-scoped reviewer image discovery
- e5c1165 perf(web): load reviewer visuals on open
- 32a1714 perf(mobile): load reviewer visuals with the reader

[WV1 acceptance](acceptance/wv1-reviewer-images.md).
<!-- WV1 end -->

# WG2 finite unattended code scope complete locally

**PASS - WG2/N6 only**, branch `overnight/2026-10-15_feedback`, baseline
`b750224` including WG1 `653e8d8`. STEP 0-2, mocked web/shared tests, fresh
serial gates, documentation and local commits are complete. Implementation
**0eaffa9**; tests **bb2395f**. No later roadmap task was started.

Rows show Reviewer ready in the existing meta line and accessible name; detail
shows Open reviewer, confirmed Remake and a Ready fact. Confirmation has
Cancel/Escape focus return, owner/material identity and duplicate-submit locks.
The saved Reviewer remains accessible after failure. Existing course/material
resources refresh after acceptance and on return/focus, including later pages.
Quiz/no-Reviewer flows remain. No new endpoint, contract or migration.

**generating state per material: not available from existing data**. General
jobs lack a material ID; partial batch mappings cannot identify the latest
arbitrary direct remake. Use the authorized saved-state fallback.

**FRESH PASS:** forced root typecheck/lint/build **8/8 each, 0 cached**; web
**224/224** (38 files), shared **350/350** (40 files); API/web builds **1/1 each**,
**35/35** and **19/19** pages; root Android/iOS/web exports, 68 assets;
diff/staged-diff hygiene PASS. Six existing lint warnings remain. Initial
typecheck and lint fixture failures were fixed; serial gates restarted and
failure counts retained in [WG2 acceptance](acceptance/wg2-generated-reviewer-state.md).

**Owner steps remaining:** Rollout/Device checks **NOT RUN**, skipped entirely.
Publish the reviewed website change and perform RB5 on phone/resized desktop.
Deployed revision, owner acceptance and live database/Scheduler state are
**UNVERIFIED (owner to confirm)**. The referenced overnight roadmap is absent;
the full prompt defined scope. No remote service call, environment-file edit,
deployment, remote SQL/migration, Scheduler action, email or push occurred.
Unrelated untracked work is preserved. This finite run ends at WG2.

# FX1b finite unattended repair complete locally; live acceptance pending

## FX1b image repair complete locally (2026-10-18)

**PASS for the finite unattended code scope; device acceptance remains pending.**
Owner's revised FX1b scope supersedes the earlier diagnostic STOP. Commons
already selected bounded thumbnails from its first implementation; no legacy
conversion is needed. New GIF candidates are skipped. The native User-Agent
uses expo-constants/app config (currently 2.2.0) and the existing contact URL.
Mobile and web external-image failures retain the viewer and display
Image couldn't load, Retry and Open on Commons; safe failure logs contain no URL.

Save returns/logs typed permission, download, HTTP-status, MIME, empty-file,
media-write and missing-module stages with specific messages. Source saves
refresh signed URLs through existing bearer-protected reads after permission,
match the exact figure/snapshot identity, and fail safely if it changed.
SDK 57 explicitly supports the current Android initial-file album call, so
ADR-038's Android write-only and iOS add-only paths remain; cleanup follows
the awaited native write. These fixes do not establish the actual phone exception.

**FRESH final gates:** forced root typecheck/lint/build **8/8 tasks each,
zero cached**; shared **350/350** (40 files), API **2273/2273** (199 files, 3 existing live skips), mobile **1263/1263** (134 files), web **211/211** (37 files); zero test failures. All seven application gates
ran serially with repo-local TEMP/TMP. Diff and staged-diff hygiene PASS.
Lint retains six existing warnings. First lint attempt failed on a new web
JSX apostrophe (5/8 tasks complete, one error); fixed and the serial sequence
restarted. Focused mobile first attempt had 141 pass/1 fail from an invalid
test fixture; corrected, then 142/142 passed. First full mobile run had 1,243
passing tests and two failed suites (132 passing files) because indirect imports
needed an expo-constants Node mock; fixed before restarting the final sequence.
No nondeterministic flake observed.

**Owner steps remaining:** Rollout and Device checks skipped entirely (NOT RUN).
Publish reviewed JS/TS changes and the GIF API rule, then recheck figure,
snapshot and external saves plus external card/viewer rendering on Realme.
ADB evidence is BLOCKED (zero devices); actual native cause/module resolution,
failed image/response and production/database/Scheduler state are **UNVERIFIED
(owner to confirm)**. No remote service call, deployment, SQL, migration,
Scheduler action, email, environment-file edit or push occurred. The absent
2026-10-17 roadmap file was skipped; unrelated untracked work is preserved.
This run ends at FX1b; FULLSEND's other live checks remain pending.

[FX1 diagnosis and FX1b outcome](acceptance/fx1-image-diagnosis.md).

## FULLSEND shipped; live acceptance PARTIAL (2026-10-18)

The explicitly authorized release is on main and production: pinned WG1
653e8d8a2b9b43b7e607e103d9d1a09a25cd451c, tested application main
dc162de3df634eea8b447f73ac67d758be75f4ee. It includes INT1/PR #12, MR1,
SA1/SA2, MR2, IM1b, RT1, EV1, RX1, IM2 and WG1. **WG2, WV1 and MD1 are not
in this release.** The active autopilot worktree and other worktrees were
preserved; this release used a separate clean clone.

All fresh gates and GitHub CI run 39069451068 pass. Root forced
typecheck/lint/build: 8/8 each, zero cached. Doctor: 21/21. Shared: 350,
Canvas: 75, OCR: 27, engine: 606, API: 2,268 plus 3 existing live skips,
mobile: 1,239, web: 209, provider contract: 20; zero failing tests.
The sole release migration, 20261016000100_manual_reviewer_uploads.sql,
was applied before main; all 95 staged/remote versions match.

Worker generation-worker-00028-f5t is Ready with 100% traffic on image
worker:b55d5a5. API dpl_2f7nfcr1Y5JJufzTZYmqu1s7276g and website
dpl_EgAH83B3iJFhkHT5fWiN6PBHe5MN are READY; health and HTTP availability
pass. Realme RMX3151 was upgraded in place to **2.2.0 / code 6**, runtime
2.2.0-sdk57, from signed EAS build 2ed33756-ef3b-4887-ac0a-fa0c59adf7ab.
The owner session and all 75 offline Library items remain. No OTA was published.

Physical PASS: Export/Share row, first What is this? Ask chip, bulleted and
revealed text/image answers, tap-only source-figure details, pull-down close,
Library Sort placement and offline cold restart. Two live generation requests
were used. Physical FAIL: Save image shows its generic failure alert, and the
checked external-reference image stays blank and cannot keep its viewer open.
Causes are unverified. NOT RUN: desktop/390px website UI (Windows browser
activation Access denied), overflowing-viewer scroll, and Office upload
(no suitable local instructional source). These prevent full live acceptance.

Next: repair/recheck the two image failures and finish the unrun checks; keep
the finite release endpoint at WG1. Preview autoIncrement is false to retain
code 6 after the first failed build; deliberately advance the code or restore
auto-increment before a later native release. Email delivery remains disabled
(CANVAS_EMAIL_DELIVERY_ENABLED=0 was not changed); no plan purchase, persistent
credential creation/rotation, destructive SQL or app-data deletion occurred.
This entry supersedes older owner-rollout-pending statements for the shipped
scope; their historical local evidence remains below.

[Full release acceptance](acceptance/fullsend-20261018.md).

## Previous finite-scope history

# WG1 finite unattended scope complete locally

Finite scope: WG1/N5 only, baseline fdf1937 (includes 1a9d3f9 and completed IM2).
Endpoint is WG1; no later task is authorized by this run.

## WG1 website Generate layout complete locally - PASS (2026-10-18)

**PASS for unattended WG1/N5 STEP 0-2, tests, fresh serial gates, documentation
and local commits.** Generate search/link and course heading actions wrap across
1440-360 px. Breadcrumb levels truncate on one line without colliding with Queue.
Batch buttons reuse shared padding/height; cards in each row stretch equally;
material titles/meta/actions wrap. Both Generate and Canvas use one styled
Course options disclosure with aria-expanded, Escape/focus return and outside
click/focus dismissal. Canvas popovers escape the card list's overflow clipping.

Single in-flight sync text lives in CanvasRefreshStatus below the heading.
During that global refresh the course button keeps a spinner, disabled state
and aria-busy without duplicate Syncing text; local text remains when global
refresh is idle. Existing sync and move-course requests are preserved. No API,
mobile, dependency, schema or migration change. Implementation: **ace4cb2**;
browser harness: **f485a2f**.

**FRESH PASS on f485a2f:** forced root typecheck/lint/build **8/8 tasks each,
zero cached**; web **209/209** tests (37 files), focused render/batch **8/8**;
standalone API/web builds **1/1 each**, **35/35** and **19/19** pages; root
Android/iOS/web exports with 68 assets. Local Playwright **20/20** page/viewport
checks and **10/10** mocked move-course requests, zero text-control collisions,
horizontal page scroll, unexpected requests or runtime errors. Screenshots and
logs: ignored .local/wg1/. Diff/staged-diff hygiene PASS. Six existing lint
warnings remain (five mobile, one web); every final gate passed first attempt.
Focused development failures and browser-checker false positives are retained
in acceptance; no nondeterministic flake observed. API/mobile/shared tests
NOT APPLICABLE (unchanged); generated Next declarations inspected and restored.

**Owner steps remaining:** Rollout and Device checks skipped entirely (NOT RUN).
Owner publishes the reviewed website change and performs RB5 Generate in a phone
browser and resized desktop. Deployed revision, owner device acceptance and
live DB/Scheduler state are **UNVERIFIED (owner to confirm)**. The referenced
overnight roadmap file is absent; the complete WG1 prompt supplies the scope
without contradicting implementation. No remote service call, deployment,
SQL/migration application, environment-file edit, Scheduler action, email or
push occurred. Expected unrelated untracked paths remain. This finite run ends
at WG1; no later roadmap task was started.

[WG1 acceptance](acceptance/wg1-generate-layout.md).

# IM2 finite unattended scope complete locally

Finite scope: IM2/N4 only, baseline 1a9d3f9 after INT1/EV1/RX1. Endpoint is IM2.

## IM2 reviewer images complete locally - PASS (2026-10-17)

**PASS for unattended IM2/N4 STEP 0-3, tests, fresh serial gates, documentation
and local commits.** Opening an image reveals its details inside the viewer on
all mobile/web surfaces. Grounding remains visible; external Commons/source and
license links are direct viewer actions. Named thumbnails, Ask/Save exact targets,
offline guards, source precedence and existing gallery permissions remain.

Mobile uses one scrollable ImageViewer Modal for images/details/actions, with
pinch/double-tap zoom, bounded pan, top/zoom-1 pull-down dismissal (120 dp or a
fast downward flick), Android back and Reduce Motion. An explicit touch boundary
prevents reader edge-scrubber interaction. Web dialog/image overflow supports
all zoom levels; Close/backdrop dismissal and native Esc semantics remain.
No dependency, native module, API, schema or migration is added. Code commits:
**93dea65**, **13833e9**, **11fb0ee**, **739d80b**, **311cc58**.

**FRESH PASS on code 311cc58:** forced root typecheck/lint/build **8/8 each,
zero cached**; mobile **1,239/1,239** (133 files), web **204/204** (35 files);
standalone API and Android builds **1/1 each**, API/web pages **35/35** and
**19/19**, Android one bundle/35 assets, root Android/iOS/web exports with 68
assets. Diff/staged-diff hygiene PASS. Zero lint errors, six existing warnings.
Initial lint (7/8 tasks) and mobile (3 import failures / 130 passing files)
failures were fixed; focused test expectation failures and retries are retained
in acceptance. No nondeterministic flake observed. API/shared tests NOT
APPLICABLE (unchanged). Generated Next declarations inspected and restored.

**Owner steps remaining:** Rollout and Device checks skipped entirely (NOT RUN).
Release mobile/website through the normal owner flow; perform RB5 on Realme for
caption reveal, always-visible grounding, direct license access, tall-content
scroll, pull-down, zoom/pan, Android back, Reduce Motion and edge-swipe isolation;
check website scrolling and Esc/Close/backdrop. Deployed revisions, native/browser
interaction and DB/Scheduler state are **UNVERIFIED (owner to confirm)**. The
referenced overnight roadmap file was missing locally; the full IM2 prompt
supplied the scope without an implementation contradiction. No remote service
call, deployment, SQL/migration application, environment-file edit, Scheduler
action, email, fetch or push occurred. Expected unrelated untracked paths remain.
This finite run ends at IM2; no later roadmap item was started.

[IM2 acceptance](acceptance/im2-reviewer-images.md);
[ADR-041](../architecture/ADR-041-reviewer-image-viewer.md).

# RX1 finite unattended scope complete locally

## RX1 reviewer header complete locally - PASS (2026-10-17)

**Header layout superseded by RV1; RX1 validation below is historical.**

**PASS for unattended RX1/N3 STEP 0-2, fresh serial gates, documentation and local
commits.** Finite scope based on merged INT1 and EV1 at 7d503dd; endpoint is RX1.
Mobile now renders title, equal-width secondary Export/Share row, review-time/
topics metadata, Generate Quiz hero and hint. Export fills non-artifact rows;
font scale 2+ stacks complete labels. Existing 48-point targets, accessibility
defaults, Share/offline behavior and source content remain. Website actions
already use one row and are unchanged. No dependency, native module or migration
is added. Implementation/tests: **0ce5db6**.

**FRESH PASS:** forced root typecheck/lint/build **8/8 each, zero cached**; mobile
**1,216/1,216** (131 files), focused header/Share **14/14** (3 files); standalone
API/Android builds **1/1 each**, API/web pages **35/35** and **19/19**, Android
one bundle/35 assets and root Android/iOS/web exports with 68 assets; diff/staged
checks PASS. Zero lint errors, six existing warnings. First typecheck **7/8**
failed on a test fixture metadata type, fixed with ComponentProps; fresh retry
passed. No flake observed. Web/API/shared tests NOT APPLICABLE (unchanged).
Generated Next declarations restored. [RX1 acceptance](acceptance/rx1-reviewer-header.md).

**Owner steps remaining:** Rollout and Device checks skipped entirely (NOT RUN).
Owner releases the mobile change and performs RB5 on Realme for narrow/large-font
layout, focus order, offline Share and Export-only fallback. Deployed revisions
and physical behavior are **UNVERIFIED (owner to confirm)**. No remote service
call, deployment, SQL/migration application, environment-file edit, Scheduler
action, email, fetch or push occurred. Unrelated untracked paths preserved.
No later roadmap slice was started and no unanswered question blocks local closure.

# EV1 finite unattended scope complete locally

## EV1 external references complete locally - PASS (2026-10-17)

**PASS for unattended EV1/N2 STEP 0-2, fresh serial gates, documentation and local commits.** Root cause in code: mobile coupled external visibility to source discovery and snapshot eligibility instead of displayed source URLs, with a batch-wide parser failure capable of hiding every valid reference. Snapshot/figure components now report displayed source images; found Commons references can render during pending, absent or failed discovery. Malformed sections are omitted individually while strict visual validation remains.

The exact external label, attribution, Wikimedia headers, source precedence, offline/auth/reachability guards, bounded batch polling and explicit replacement flow remain. Temporary reviewer.* diagnostics are removed. Captions and image viewer behavior are preserved. No API/web/shared serializer, migration, dependency or native module changed. Code commits: **239a0ab** (reproduction), **a9c1d7f** (fix).

**FRESH PASS:** forced root typecheck/lint/build **8/8 each, zero cached**; mobile **1,209/1,209** (130 files); focused regressions **87/87** (5 files); standalone API and Android builds **1/1 each**, API/web pages **35/35** and **19/19**, Android one bundle / 35 assets, root mobile Android/iOS/web exports with 68 assets; diff/staged-diff hygiene PASS. Zero lint errors, six existing warnings. Deliberate red reproduction **7 failed / 80 passed** is retained in acceptance; every gate passed on its first gate attempt and no nondeterministic flake was observed. API/web/shared tests are NOT APPLICABLE because those workspaces did not change. Generated Next declarations were restored.

**Owner steps remaining:** Rollout and Device checks were skipped entirely (NOT RUN). Publish the reviewed mobile fix through the normal owner release flow; RB5 on Realme must confirm a found external image, exact label and attribution for a section without a course image, source precedence and offline behavior. Deployed revisions, actual stored visuals, applied migrations, database/Scheduler state, provider/image egress and physical-device root cause remain **UNVERIFIED (owner to confirm)**. No deploy, push, fetch, remote service/SQL call, migration application, environment-file edit, Scheduler action or email occurred. Unrelated UI/, apps/mobile/.gitignore and supabase/.temp/ remain untouched. This finite run ends at EV1; IM2 and later items are not started.

[EV1 acceptance](acceptance/ev1-mobile-external-references.md).

# INT1 finite unattended scope complete locally

## INT1 combined locally - PASS (2026-10-17)

**PASS for the finite unattended INT1 code scope, fresh serial gates, documentation and local commits.** Merge efad5c9 combines the 35 local 10-16 commits through a967460 with PR #12 at 8fcdf16; 979f120 cherry-picks only f3dd833 with provenance. Test commits 2ddb9a8 and 21e685a prove the combination and restore PR #12's grouping contract. MR1/SA1/SA2/MR2/IM1b/RT1 remain, with PR #12 offline auth, silent idempotent Reviewer submission, organization and sorting. What is this? renders first, and inline/zoom image Ask callbacks pass for snapshots, extracted figures and external visuals on both platforms.

PR #12 mobile sorting wins: pill beside update status, compact highlighted 48-point rows, disabled during selection, displayed-title alphabetization, owner/course-scoped preferences and offline Canvas sequence cache. Website has one contextual select with identical options/values/labels and preference DTO. Both clients use complete material sequences for Canvas order; unlinked work follows. Obsolete LS1 sorting/open tracking and unused sourcePosition projection/tests are removed. Both preference versions parse safely. ADR-040 records the supersession; original branch histories below are retained as historical evidence.

**FRESH PASS:** forced root typecheck/lint/build **8/8 each, zero cached**; shared **350/350** (40 files), API **2,268 passed / 3 existing live skips** (199 files), mobile **1,202/1,202** (130 files), web **203/203** (35 files), Canvas **75/75**, OCR **27/27**, engine **606 evaluations / zero failures**. Lint has zero errors and six existing warnings. API/web build 35/35 and 19/19 pages; mobile exports Android, iOS and web (68 assets). Generated Next.js declarations were restored. Root gates ran on production code at 2ddb9a8; the only subsequent code-tree change restores a PR #12 test, verified by fresh mobile typecheck/lint and the full suite. First failures and repairs are recorded in acceptance; no nondeterministic flake was observed.

PR #12 CI was green at 8fcdf16 (run 39035996757), according to owner-provided history; live CI was not queried. Nothing beyond the reported Realme OTA is deployed. Deployed revisions, database rows/applied migrations, provider behavior, Scheduler and physical acceptance are **UNVERIFIED (owner to confirm)**.

**Owner steps remaining:** Rollout and Device checks were skipped entirely and remain RB5 owner work after the later roadmap slices. No push, deployment, remote database/service call, migration application, environment-file edit, Scheduler action or email occurred; git fetch was the sole authorized remote operation. No changes to codex-fullsend-20261016.md. This run ends at INT1; EV1 and all later items were not started.

[INT1 acceptance](acceptance/int1-local-integration.md).

## LS1 Library sorting complete locally (2026-10-16)

**PASS for unattended LS1 STEP 0-3, fresh serial gates, documentation and local commits.** Mobile and website Library now offer Recently added / Course / Title A-Z / Recently opened; course contents default to Canvas order, with Recently added and Title A-Z alternatives. Shared pure comparators sort within pinned and unpinned groups without refetching. Personal & other participates in date sorts and follows courses in alphabetical sorts. Choices and capped opened timestamps stay per owner/device; old or unavailable storage defaults safely. Mobile uses the existing sheet and Reduce Motion-aware layout animation; website uses a compact native select.

Optional sourcePosition is projected server-side from existing synced Canvas module/item/file/page/assignment metadata, with owner/course/connection checks, complete pagination and safe failure. No Canvas calls, migration, dependency or native module is added. Manual/mixed/unplaced sources follow positioned work by creation time. Existing source, authentication, RLS, grants, offline and RT1/earlier behavior remain intact.

FRESH forced typecheck/lint/root build **8/8 each, zero cached**; API **2,280 passed / 3 existing live skips** (200 files), mobile **1,136** (123), shared **358** (41, including emitted copies), web **195** (34). Standalone API/web/Android builds **1/1 each**, 35/35 and 19/19 pages, one Android bundle / 35 assets. Zero lint errors; six existing warnings. Repaired attempts are retained in acceptance; no nondeterministic flake. Code commits: **d027f2b**, **45c6d19**, **451eabb**, **c5f1f6b**.

**Owner steps remaining:** Rollout and Device checks were skipped entirely. Publish API/website and a compatible preview update; verify all Library sorts, Canvas source order, pins, successful reviewer/quiz/draft opens and choice persistence after restart on mobile and website. LS1 adds no native module; inherited IM1b APK and MR2 migration/worker rollout remain owner work. Older API/cache entries use the unpositioned fallback until successful reconciliation. Deployed revisions, actual Canvas positions, database/applied migrations, Scheduler and physical behavior are **UNVERIFIED (owner to confirm)**. No remote service call, deployment, remote SQL/migration application, environment-file edit, Scheduler action, email or push occurred. This finite run ends at LS1; RB4 was not started.

[LS1 acceptance](acceptance/ls1-library-sorting.md); [ADR-040](../architecture/ADR-040-library-sort-orders.md).

# RT1 finite unattended scope complete locally

## RT1 topic levels and Expound complete locally (2026-10-16)

**PASS for unattended RT1 STEP 0-4, fresh serial gates, docs and local commits.** Each mobile/website topic has compact Original / Simplify / Explain simply controls and collapsible Expound. Canonical content stays unchanged; Original is immediate and has no model action. Server-read, owner-scoped sections feed source-only SA1 formatted answers and grounding labels. Persistent owner/exact-content caches support offline reuse; uncached controls show the existing offline reason. Reading choices last only for the session; canonical search restores Original. Shared snapshots remain unchanged, so shared topic controls route to sign-in and make no model calls.

Study Tools' existing 20/minute warm-instance admission and provider configuration are reused. New bounded server dedup/cache is per warm instance (400 entries / 30 minutes), not a durable global quota/cache. Context is capped at 18,000 characters without truncation; results at 6,000 characters. No migration, dependency or native module is added. All prior SP1/CQ1/QD1/SP2/SP2b/SH1/GA1b/MR1/SA1/SA2/MR2/IM1b local regressions remain green.

FRESH forced typecheck/lint/root build **8/8 each, zero cached**; API **2,268 passed / 3 existing live skips** (199 files), mobile **1,129** (122), shared **345** (39 including existing emitted copies), web **188** (32). Standalone API/web/Android builds **1/1 each**, 35/35 and 19/19 pages, one Android bundle / 35 assets. Zero lint errors, six existing warnings. Repaired first attempts are recorded in acceptance; no nondeterministic flake. Implementation commits: **959424e**, **d0db258**, **dc4f381**, **06b9385**, **f1b09f1**, **ba81163**.

**Owner steps remaining:** Rollout and Device checks were skipped entirely. Publish API/website and compatible preview update, then check topic levels, instant Original/cache switching, organized Expound/collapse, offline, canonical search, manual scrolling/Reduce Motion and shared sign-in routing on realme. Predecessor IM1b APK and MR2 migration/worker rollout remain owner work. Deployed revisions, actual provider output, live database/applied migrations/Scheduler and physical behavior are **UNVERIFIED (owner to confirm)**. No remote service call, deployment, migration application, environment-file edit, Scheduler action, email or push occurred. This finite run ends at RT1; LS1/RB4 were not started.

[RT1 acceptance](acceptance/rt1-topic-levels.md); [ADR-039](../architecture/ADR-039-topic-level-study-tools.md).

## IM1b image saving and Android Share complete locally (2026-10-16)

**PASS for unattended IM1b STEP 0-4, fresh serial gates, docs and local commits.** Owner resolved the previous iOS album contradiction: write-only photo permission, Android **Stay Focused** album, iOS **Photos without an album** using add-only saving. SDK-compatible expo-media-library ~57.0.5 and the permission plugin are added with no other dependency upgrades. All three mobile image zoom viewers offer Save beside Ask; owner website zoom viewers download the same sanitized title/section/kind filename. Wikimedia includes source title and stored attribution/license confirmation. Failed/non-image/empty downloads never reach gallery insertion; temporary bytes are cleaned. Shared-link viewers have no Save control.

Share retains SH1's canonical owner/server-ID gate and disabled device-copy state. No Android hide branch or lost canonical ID was found. Clipboard is loaded lazily and guarded; a missing module, rejected copy or false result falls back to system sharing with **Link ready to share** and a visible link. Eager native loading is a plausible old-APK cause; actual installed contents and physical diagnosis remain **UNVERIFIED (owner to confirm)**. SA2/MR2 and earlier features remain preserved.

FRESH forced typecheck/lint/root build **8/8 each, 0 cached**; API **2,257 passed / 3 existing live skips** (197 files), mobile **1,119** (120), shared **337** (37 including existing emitted copies), web **179** (30). Standalone API/web/Android builds **1/1 each**, 34/34 and 19/19 pages, one Android bundle / 35 assets. Zero lint errors, six existing warnings. Failed first attempts and repairs are recorded in acceptance; no nondeterministic flake. Code: **1959a0e**, **d8544f9**.

**Owner steps remaining:** Rollout and Device checks were skipped entirely. Build/install a new preview APK containing clipboard and media-library (OTA alone cannot add native modules), publish the website, and verify realme snapshot/figure/Wikimedia saves, Share, offline state, permission denial/settings and clipboard fallback. Verify iOS add-only Photos saving with no album/full-access prompt. Deployed revisions, native permissions/gallery behavior, live database/applied migrations/Scheduler/provider state and physical root cause are **UNVERIFIED (owner to confirm)**. No prohibited remote call, deployment, migration application, environment-file edit, Scheduler action, email or push occurred. No later roadmap item was started.

[IM1b acceptance](acceptance/im1b-image-save-share.md); [ADR-038](../architecture/ADR-038-reviewer-image-gallery-saving.md).

# MR2 finite unattended scope complete locally (2026-10-16)

**PASS for unattended MR2 STEP 0-3, fresh serial gates, docs and local commits.** Manual PDF/photo/DOCX/PPTX picks now upload, extract and generate one reviewer job with one progress destination in generation and the existing Queue. Office uses the shared extractor at the Canvas 10 MiB cap, validates ZIP/expected parts, and retains ordered source blocks and MR1 generation. Legacy DOC/PPT gets conversion copy. Files/photos have no editable-text step; paste retains editing and explicit generation. Empty extraction fails with the required message before generation. Per-pick keys and upload references survive interrupted acceptance retries.

The new forward-only migration `20261016000100_manual_reviewer_uploads.sql` extends private upload policy and service-only atomic creation/source attachment. Both quota families, page/character limits, owner isolation, live leases, immutable child Retry and cancellation without publication remain. Google/database workers reuse extraction checkpoints; Vercel Workflow keeps explicit page/chunk boundaries. No new service, dependency or native module. SP1/CQ1/QD1/SP2/SP2b/SH1/GA1b/MR1/SA1/SA2 remain working under local regressions.

FRESH forced typecheck/lint/root build **8/8 each, zero cached**; API **2,257 passed / 3 existing live skips** in 197 files; mobile **1,098** in 117; shared **334** in 36 including emitted copies; web **176** in 29; provider contract **20/20**. Standalone API/web/Android builds **1/1 each**, 34/34 and 19/19 pages, one Android bundle / 35 assets. Six existing lint warnings, zero errors. Five mocked workflow orchestration tests pass; the dedicated runtime directory has zero test sources and is NOT APPLICABLE, not runtime acceptance. Repaired first attempts are recorded in acceptance. Code: 36f19a1, 9e42184, 15c351d, e96c6be.

**Owner steps remaining:** Rollout and Device checks were skipped entirely. Apply the new migration and coordinate API/website/Google-worker/compatible preview OTA publication, then verify DOCX/PPTX/PDF/photo direct generation, Queue/reconnect after 202, empty/legacy failures, cancellation and paste parity. Deployed revisions, live database/applied migrations/Scheduler, provider outcomes and physical behavior are **UNVERIFIED (owner to confirm)**. No remote service call, migration application, environment-file edit, deployment, Scheduler action, email or push occurred. IM1 remains a separate next item; this finite MR2 run ends here.

[Acceptance](acceptance/mr2-manual-reviewer-upload-chain.md); [ADR-037](../architecture/ADR-037-manual-reviewer-upload-chain.md).

## Previous scope: SA2 checkpoint

**PASS for the unattended SA2 code scope: STEP 0-4, fresh serial gates, docs and local commits.** Ask now accepts an owner-scoped image reference for page snapshots, extracted figures and stored Wikimedia visuals. All three mobile/web image surfaces and zoom viewers open the existing Ask panel with a thumbnail, the four specified static chips, typed questions and two follow-ups. SA1 formatting/reveal/session caching remain in use. The server fetches exact scoped bytes, rejects raster input above 3 MiB, supplies section text and attribution to the existing vision adapter, and preserves grounding/admission/error controls. Clients never submit bytes or image URLs. Shared visuals route to sign-in with the share return path and make zero model calls. Offline controls are disabled. No migration, dependency, native module or canonical reviewer rewrite is introduced. SP1/CQ1/QD1/SP2/SP2b/SH1/GA1b/MR1/SA1 remain preserved.

FRESH forced typecheck/lint/root build **8/8 each, zero cached**; API **2,226 passed / 3 existing live skips** in 192 files, mobile **1,086/1,086** in 115, shared **324/324** in 34 (includes emitted copies), web **168/168** in 28; provider contract **20/20**. Standalone API/web/Android builds **1/1 each** (34/34 and 19/19 pages, one Android bundle / 35 assets). Zero lint errors, six existing warnings. Failed first attempts and fixes are retained in acceptance; no nondeterministic flake observed. Code commits: 3a03e34 shared, 1e46ee3 API, 99ba4f7 mobile, c886fec web.

**Owner steps remaining:** Rollout and Device checks were skipped entirely. Coordinate API/website and compatible preview OTA publication for the v3 Study Tools contract. Then check image Ask on a page snapshot, figure and Wikimedia image, including inline/zoom controls, all four chips, typed questions, follow-ups, organized answers/reveal, offline behavior and shared-link sign-in return. Production revisions, live database/Scheduler state, actual provider interpretation, deployed compatibility and physical behavior are **UNVERIFIED (owner to confirm)**. No remote service call, remote SQL/migration application, environment-file edit, deployment, Scheduler action or push occurred. SA2 adds no migration or worker change. MR2 subsequently completed locally; see its newer entry above.

[Acceptance](acceptance/sa2-ask-about-image.md); [ADR-036](../architecture/ADR-036-ask-about-image.md).


# SA1 finite unattended scope complete locally (2026-10-16)

**PASS for the unattended SA1 code scope: STEP 0-5, fresh serial gates, reconciled docs and scoped local commits.** Shared flat markdown-lite parsing, v2 prompts/cache keys, organized mobile/web/shared-link answers, press/completion reveal with manual-scroll and Reduce Motion guards, and the exact four Ask chips with **What is this?** first are complete. Test Me question/choice structure, canonical reviewer content, grounding, owner isolation and all existing limits remain intact. SH1 explicitly accepts retained v1 and current v2 assists with exact content validation. SP1/CQ1/QD1/SP2/SP2b/SH1/GA1b/MR1 are preserved. No later roadmap scope is included.

FRESH forced typecheck/lint/root build **8/8 each, zero cached**; API **2,208 passed / 3 existing skips** in 191 files, mobile **1,082/1,082** in 115, shared **296/296** in 30 (includes emitted copies), web **164/164** in 27. Standalone API/web/Android builds **1/1 each** (34/34 and 19/19 pages, one Android bundle / 35 assets). Zero lint errors, six existing warnings. Failed first attempts and their repairs are retained in acceptance; no nondeterministic flake observed. Code commits: ad92609 shared, 5bcf15e API, 051c649 mobile, 5041c1d web.

**Owner steps remaining:** Rollout and Device checks were entirely skipped. Coordinate API/website and compatible preview OTA publication for the v2 prompt contracts, then check Explain loading/answer reveal, organized answers, Ask chip order, manual scrolling, Reduce Motion and website keyboard/focus on realme and website. Production revisions, database/Scheduler state, actual provider formatting, deployed compatibility and physical behavior are **UNVERIFIED (owner to confirm)**. No remote service call, migration application, environment-file edit, deployment, Scheduler action or push occurred. SA2 subsequently completed locally; see its newer entry above.

[Acceptance](acceptance/sa1-study-assist.md).

# MR1 finite unattended scope complete locally (2026-10-16)

**PASS for STEP 0-2, fresh serial gates, reconciled docs and local commits.**
MR1 is the first item of the 2026-10-16 roadmap, after GA1b `ed67445`.
Source-sized bounded output budgets, ordered whole-block recovery on known token
exhaustion, two-attempt part quarantine with typed partial results, durable
receipts/cost counts, and safe website/mobile partial notices are implemented.
Short sources keep one call; content filtering and unknown transfer fencing
retain their existing failure behavior. SP1/CQ1/QD1/SP2/SP2b/SH1/GA1b are preserved.
[Acceptance](acceptance/mr1-long-source-reviewer.md); ADR-035 records the split/assembly decision.
No later roadmap scope is included.

FRESH forced typecheck/lint/root build **8/8 each, zero cached**; API **2,206
passed / 3 existing skips**, mobile **1,072**, shared **272**, web **154**, engine
**606 evaluations**, AI-first unit **20**, provider contract **20** passed.
Standalone API/web/Android builds **1/1 each** (34/34 and 19/19 pages, one Android
bundle / 35 assets). Zero lint errors, six existing warnings. Repaired first
provider-contract/config-launch failures are retained in acceptance. Code:
747ea4d engine, 7c226ed API, 307000e mobile/web partial disclosure.

**Owner steps remaining:** Rollout and Device checks are entirely skipped.
Deploy API/Google worker and compatible website/mobile code, then re-upload the
SOC SCI 103 midterm material on realme and website and inspect completeness.
Live revisions/database/Scheduler, original incomplete reason/token usage and
physical behavior are **UNVERIFIED (owner to confirm)**. No migration, remote
call, environment-file edit, deployment, Scheduler change or push is part of MR1.

# GA1b finite unattended scope complete locally (2026-10-16)

## Library Sort layout follow-up (2026-10-17)

Owner feedback: Sort crowds the title and looks out of place. Finite scope:
move it beside update status on both Library pages, use a compact horizontal
pill, remove duplicate status inset, tighten the option sheet and retain all
presets, touch targets and drag selection. Mobile tests FRESH PASS: 1,135 / 121.
FRESH PASS: forced root typecheck/lint/build, 8/8 each, zero cached; six existing
lint warnings. Preview source bcb9988, group b60fe0f0-5319-4c11-b0a3-9aba991bbc43,
update 01a14a01-00f6-70b7-a358-d708971b2e95, runtime 2.1.0-sdk57, published
2026-10-17 21:15 Manila, applied on Realme. Ten native layout/interaction checks
PASS, with screenshots inspected: title now two lines, status and Sort share a
row, all six menu choices fit, selection toolbar remains compact. Zero matching
fatal/JS errors in current process sample. Draft PR #12 updated; CI pending.
Acceptance: docs/ai/acceptance/realme-library-sort-20261017.md. No remaining
layout blocker; course page left open with Course order selected.

## Library sort presets (2026-10-17)

Owner-approved finite scope: visible Library sorting by updated date, Canvas
module/material order and alphabet, while preserving manual drag order. Cover
both the course grid and saved items, store choices per owner/scope, use the
complete existing material inventory for course sequence, retain a complete
sequence for offline use, verify automated/native behavior, publish preview
and reconcile this record. No backend/schema change or paid generation.
Visible Sort controls now cover the Library course grid and saved items.
Presets: Updated newest/oldest, Alphabetical A?Z/Z?A, Canvas Course order and
My order. Choices are owner/scope specific; dragging switches to My order
without erasing a previously saved order when another preset is selected.
Canvas sequence comes from the complete paginated material inventory, with
linked quizzes placed with their Reviewer. Unlinked work is last. Complete
sequences are cached for offline use; failed refreshes retain the saved one.

FRESH PASS: mobile 1,134 tests / 121 files, web 154 / 26, forced root TypeScript
and lint 8/8 each, zero cached; six existing lint warnings. Root production build passed 8/8, zero cached; native correction and final
publication are recorded below. First icon-mock and old
bulk-toolbar assertion failures were repaired; the full rerun passes.
FRESH PASS: final Android preview group 456c1693-3c24-4104-8bd5-58f2b162d563,
update 01a146c3-084c-7407-acf0-d3f36b97bd70, source 22b4afa, runtime
2.1.0-sdk57, published 2026-10-17 06:09 Manila, is active on Realme
2.1.0/code 5. Visible-title course-grid A-Z and Z-A now pass. Six choices are
visible; item alphabet/date choices, complete course sequence and preserved
manual order passed the preceding feature OTA. Course-order selection also
passes an explicit fresh select/relaunch check on the final OTA. Cached course
sequence/account/choice passed restart without an active default network;
original network settings were restored. The Sort sheet is left open for the
owner. Recent final process log has zero matching fatal/JS errors.

FRESH final mobile suite: 1,135 tests / 121 files, mobile TypeScript, focused
ESLint and final Android export/publication PASS. Web 154 tests and forced root
typecheck/lint/build 8/8 each, zero cached, passed for feature base 29d48e6.
The corrective change only adjusts the pure grid comparator to use the same
courseIdentity title as the tiles. Initial implementation CI passed; final
implementation CI is in progress. No APK, database, backend or paid generation.

See [acceptance](acceptance/realme-library-sort-20261017.md).


## Realme offline startup and current Autopilot integration (2026-10-17)

Owner scope: restore saved-account offline startup, retain the Realme Library
hold/drag and compact toolbar, update to current Autopilot source, and make
Generate Reviewer submit silently without forcing the generation page.

Isolated branch `fix/realme-offline-current-20261017` combines main `ed67445`
with Realme branch `e38f96b`. Current durable course batches, cached-first
screens, Queue, sharing and course-state work are retained alongside the device
Library changes and ExpoGL hotfix. No main push or backend mutation.

Saved SDK credentials unlock owner-scoped device data before online refresh.
Retryable auth transport failures retain offline access; explicit SIGNED_OUT,
invalid/revoked refresh tokens and late pre-logout responses cannot revive it.
SecureStore uses serialized alternating chunk banks and commits the manifest
last; legacy chunks remain readable. A visible offline-access message explains
the saved-content state. Online APIs still verify the bearer token.

Reviewer Generate and confirmed Library Remake save an explicit automatic
intent, submit independently of the screen and leave navigation alone. Queue
tracks accepted jobs. Interrupted admissions resume on launch/foreground with
the same idempotency key; permanent rejection requires a deliberate Retry.
Server background safety begins at acceptance. If the OS kills the process
before acceptance, the saved request resumes when the app reopens.

FRESH mobile suite: 1,124 tests / 119 files PASS. Focused authentication/storage
51 tests PASS; reviewer admission tests cover navigation, restart replay,
duplicate taps, account fencing and permanent rejection. FRESH forced root typecheck/lint/build pass 8/8 each, zero cached; six
existing lint warnings. A final lifecycle concurrency adjustment has fresh
mobile suite/typecheck/lint coverage; the preview export verifies its bundle.
Preview/device acceptance passes as recorded below. Earlier silent-screen assertion
failed because it inspected Copy nodes instead of the rendered Notice; fixed.

Read-only live checks confirm the API production deployment uses `ed67445`
and all CQ1/SP2/SH1/GA1b migrations are present. Vercel connector inspection
returned 403; the explicitly scoped authenticated CLI fallback succeeded.
The installed Realme APK 2.1.0/code 5 includes expo-clipboard, so this remains
a JavaScript-only update on runtime `2.1.0-sdk57`.

FRESH PASS: Android preview group `e2aa9590-bb0b-4afe-908a-36bd52d5cc8c`,
update `01a1465e-b73c-7d7a-be19-13d2ad63195d`, source `a4d11a8`,
runtime `2.1.0-sdk57`, published 2026-10-17 04:19 Manila. The update is
active on Realme 2.1.0/code 5: current cached-first status/Queue and retained
four-icon Library controls are visible. With Android reporting no active
default network, force-stop/relaunch retains the account, opens the course
Library and reads a full saved Reviewer. Native hold/drag reorders two cards;
an inverse drag restores the original order. Original Wi-Fi/data settings are
restored. Recent app-process sample: zero matching fatal/JS errors.

FRESH web suite 154/154, TypeScript and lint pass after mirroring the shared
Library-order preference schema. PR CI initially found that mirror mismatch
and a missing Chromium executable; the workflow now installs its required
Playwright Chromium before browser tests. [Draft PR #12](https://github.com/galaxymaxp/stay-focused-v2/pull/12)
retains the combined changes for mainline review. CI rerun is pending.

NOT RUN: paid real-source generation/deletion and forced real-token expiry on
the phone. Silent admission, screen exit/restart recovery and expired-token
startup are covered by deterministic regressions. The first physical attempt
used Android's stale global mobile-data preference as its offline check; it
was not accepted as offline proof. The successful rerun verifies that there is
no active default network. No native build or backend mutation was needed.

See [acceptance](acceptance/realme-offline-current-20261017.md).

Saved explicit batch requests, normal per-material generation under server quotas, course selection/confirmation and Queue on both platforms, tests, serial local gates, reconciled docs and scoped commits. Auto off, baseline and explicitly opened past courses are included. Confirmation omits generation minutes. All remote calls, rollout, device checks, environment-file edits and pushes are excluded. Prior GA1 audit is reused; SP1/CQ1/QD1/SP2/SP2b/SH1 are preserved.

**PASS for STEP 0-3, gates, reconciled docs and scoped local commits.**
App gates **FRESH PASS**: forced typecheck/lint **8/8
each, zero cached**; API **2,187 passed/3 existing skips in 189 files**, mobile
**1,072/1,072 in 114**, shared **269/269 in 27** (includes emitted copies), web
**154/154 in 26**. Standalone API/web/Android builds **1/1 each** (34/34 and
19/19 static pages, one Android bundle). Zero lint errors/six existing warnings.
Forced root build **FRESH PASS, 8/8 tasks, zero cached**. Implementation commits:
`6f247f0` API/shared/migration, `2782bc3` mobile, `7a73181` web. Details are in
[acceptance](acceptance/ga1b-saved-course-batch-generation.md);
[ADR-034](../architecture/ADR-034-course-batch-generation.md) supersedes ADR-030.
Repaired first typecheck/mobile failures and interrupted web build are disclosed.

**Owner steps remaining:** entirely skipped Rollout and Device checks, applying
`supabase/migrations/20261016010000_course_reviewer_batch_requests.sql` after
preparation/quota/CQ1/SP2/SH1 prerequisites, API/website/worker publication as
needed, compatible preview OTA, confirmation of existing global polling and
CIT17/realme/web generation/selection/skip/quota/wait/Cancel/Retry/Open parity.
Live revisions, applied migrations/rows, Scheduler, latency and physical
behavior are **UNVERIFIED (owner to confirm)**. No remote call, SQL/application,
environment edit, deployment, Scheduler action or push. Finite endpoint only;
no subsequent roadmap work is included.

# Current Sprint

## Realme compact Library selection toolbar (2026-10-17)

Owner UI correction supersedes the earlier Library controls: remove the always
visible remake/remove card, Organize/Done, and the move-to-edge footer. Holding
a saved item reveals four equal icon targets in place of the filter tabs:
remake, trash, select/unselect all, and X to cancel. The header shows the selected
count. Selection covers the current filter, including items beyond the first
page; remake/removal use only that selection and retain confirmation. Dragging
and stored order remain available. The toolbar occupies a fixed 48-point slot
in both modes, preserving the list viewport during the hold.

FRESH PASS: 1,056 mobile tests in 105 files; mobile TypeScript; focused ESLint;
diff hygiene; EAS preview environment preflight. Final copy-only change also
passes all 70 screen tests.

FRESH PASS: preview OTA group `b1537d74-77d0-4e80-ad86-24fef46abe6d`
from `e4f0ae7` is active on Realme 2.1.0/code 5. Physical checks confirm
three complete Reviewer cards plus part of a fourth remain visible in selection
mode; four equal icons replace the tabs; select all, unselect all and X work.
Native hold/drag and saved order after force-stop/relaunch pass. The original
item order was restored; the course Library is left open in normal mode. Recent
process sample: 0 matching fatal/JS errors. See
`docs/ai/acceptance/realme-library-toolbar-20261017.md`.

## Realme course Library organization (2026-10-17)

Owner scope: home-screen-style organization of saved items inside a course,
not the course grid. Long press selects and arms drag; further taps select
items without opening them. Drop moves the selection as a block. Order is
account/course scoped on the device; filtered-out items retain their slots.
Done returns to ordinary opening. Move-to-edge controls provide a gesture-free
option, and selected removal uses the existing explicit confirmation.

FRESH PASS: 1,052 mobile tests in 105 files; mobile TypeScript; focused ESLint;
diff hygiene. Final test-only typing correction also passes 66 screen tests.
FRESH PASS: preview OTA group `7dc9a912-93aa-4348-8d1f-ca41911575a6`
from `43131a5` is active on the connected Realme (2.1.0/code 5). Native
hold-to-select and the selection controls were verified. Recent process log
sample: zero matching fatal/JS errors. The owner is testing the phone directly;
agent physical multi-select, drag and restart-persistence checks were not run.
Those behaviors pass automated regression tests. See
`docs/ai/acceptance/realme-library-organize-20261017.md`. No native
dependency, database or backend change.

## Realme Library and generation actions (2026-10-16)

JS-only update adds Generate all Reviewers for ready course materials, including
PPTX slides, with complete fresh pagination and saved-Reviewer skipping. Generated
materials have a shaded row and explicit label; their detail opens the saved
Reviewer or offers Remake. Course Library adds Remake all reviewers and Remove
all saved work with confirmation; individual drafts can now be removed. Server
confirmation precedes local removal, failed items remain visible, and quizzes
are removed before their referenced Reviewers. Batch submissions reuse uncertain
requests, wait up to three minutes for queue capacity, and report partial
acceptance and queue limits. Keep the app open until
submission finishes; accepted work remains server-backed.

FRESH PASS: 91 tests across screen, batch, generation-recovery, local-Library and
Reviewer API suites; mobile TypeScript; focused ESLint; diff hygiene. Initial
checks caught a CRLF-sensitive edit duplication; corrected before final checks.
FRESH PASS: preview OTA `55e1412d-c073-45d6-9bb4-651dfddddb4c` published
from `9ef1340` and applied to the connected Realme (2.1.0/code 5). Physical
checks confirm CC17 Generate all, generated labels, both course Library bulk
actions and the draft Remove swipe. All confirmation dialogs were cancelled;
NOT RUN: live generation or deletion. Recent process log sample has no matching
fatal/JS errors. No native build, backend deployment or migration. See
`docs/ai/acceptance/realme-library-actions-20261016.md` for evidence.

## Realme generation orb hotfix (2026-10-16)

The generation screen incorrectly checked the retired `ExponentGLObjectManager`
native module after the SDK 57 upgrade. It now checks `ExpoGL`, matching the
installed GLView, so supported devices use the existing 3D Knowledge Core.
Scoped from published preview source `079986c`; unrelated unshipped work is
excluded. FRESH generation/core tests: 23/23; mobile typecheck and focused
ESLint PASS. JavaScript-only preview OTA `d1b79016-9ed3-4de4-85af-184896cbc25e`
published from `e18dda0`; FRESH physical Realme verification PASS: the
generation screen shows the animated 3D orb after relaunch. No native/APK/EAS build requested or run.

## SH1 finite unattended scope complete locally (2026-10-16)

**PASS for STEP 0-5, fresh serial gates, reconciled docs and local commits.** SH0-approved public snapshot reader/quiz, owner share/copy/update/stop on both platforms, saved assistance and attributed Wikimedia images, explicit privacy allow-list, RLS, bounded limiter and revocation/deletion handling are complete through `147db48`. Public paths make zero auth/model calls and database writes; scores stay in memory. SP1/CQ1/QD1/SP2/SP2b behavior is preserved; GA1 remains excluded. [Acceptance](acceptance/sh1-public-share-links.md), [ADR-033](../architecture/ADR-033-public-share-links.md).

FRESH forced typecheck/lint/root build **8/8 each, zero cached**; API **2,166 passed/3 existing skips in 187 files**, mobile **1,068/1,068 in 112**, shared **264/264 in 25** (includes emitted copies), web **150/150 in 24**. Standalone API/web/Android builds **1/1 each**. Lint zero errors/six existing warnings. Repaired drafts/first attempts retained in acceptance; no nondeterministic flake.

**Owner steps remaining:** entirely skipped Rollout and Device checks, migrations `20261015050000` then `20261015050100` after prerequisites, API/website publication, native clipboard compatibility confirmation or preview rebuild before OTA, then CIT17 private-window/mobile share/read/quiz/sign-in/update/stop/deletion checks. Live production/database/Scheduler/ingress and physical state **UNVERIFIED (owner to confirm)**. Score saving after sign-in and assistance synchronization across devices are follow-ups. No remote service/SQL, env-file edit, deployment, Scheduler action or push. Finite SH1 endpoint reached; no additional roadmap item is started.

## Tester feedback (2026-10-15)

### SP2b complete locally

**PASS for the unattended SP2b code scope: findings 4/7/8/10/13, tests, fresh serial gates, documentation and local commits.** Courses opens from stored inventory with zero Canvas calls/writes; Today shares one verified bundle; website WebGL loads after useful content; read handlers shed preparation/document imports; Queue/header/generation detail share one owner-scoped reader and poller. Mobile detail follows screen focus. SP1/CQ1/QD1/SP2 are preserved; GA1 stays STOPPED. Code tip `19028c5`; [acceptance](acceptance/sp2b-read-path-speed.md), [ADR-032](../architecture/ADR-032-today-and-job-read-context.md).

FRESH final verification: forced typecheck/lint/root build **8/8 tasks each, zero cached**; API **2,146 passed / 3 existing skips in 183 files**, mobile **1059/1059 in 110 files**, shared **260/260 in 23 files**, web **121/121 in 22 files**. Standalone API/web/Android builds **1/1 each** (34/34 and 19/19 static pages; Android 1 bundle/35 assets). Zero lint errors, six existing warnings. Repaired draft fixture/tracing failures and first mobile gate **1,056 passed / 2 failed** remain recorded in acceptance; no nondeterministic flake observed.

Local deterministic measures: Today **4 requests / 16 data reads + 8 auth/activity calls -> 1 / 9 + 2**; `/today` First Load JS **320 -> 198 kB**; dedicated Today server trace **375 PDF.js package entries -> 0** (79 total files). Courses uses four data reads plus its connection lookup, with the final three reads parallel. Detail **2 sequential requests plus header polling -> 1 shared request/poller**. These are fixture/build counts, not production latency. Mobile orb remains unchanged (Three.js **1,292,907 raw bytes**, not its Metro contribution).

**Owner steps remaining:** rollout and device checks were entirely skipped. Confirm pending SP2/CQ1 migration prerequisites, deploy API/website and preview OTA, then verify CIT17 Courses/Today speed, orb/clock/reduced motion, Queue Retry/Open/extraction/detail, saved content and owner isolation. Deployed revisions, live rows/applied migrations, Scheduler, actual latency/cold starts, physical behavior and Metro contribution are **UNVERIFIED (owner to confirm)**. SP2b adds no migration, region/capacity/queue/service change. Findings 11/12 and GA1 remain separate owner decisions. No remote service call, remote SQL/application, environment-file edit, deployment, Scheduler action or push occurred. This finite SP2b run ends here.

### SP2 complete locally

**PASS for the unattended SP2 code scope (STEP 0-5, fresh serial gates, docs and local commits).** Owner-bound summary projections and exact current-version detail reads replace whole-owner body scans; preparation reuses complete current evidence and batched receipts/controls; independent reads run in parallel; website Library publishes accepted pages while retaining saved cards on partial failures. Existing unchanged-version mobile hydration was already implemented and is retained with stronger regression proof. SP1/CQ1/QD1 remain intact; GA1 remains separately STOPPED, with no batch-generation implementation claimed. Code tip `97a6934`; [acceptance](acceptance/sp2-library-data-path.md), [ADR-031](../architecture/ADR-031-library-summary-projections.md).

FRESH final verification: forced typecheck/lint/root build **8/8 tasks each, zero cached**; API **2,130 passed / 3 existing skips in 182 files**, mobile **1,057/1,057 in 110 files**, web **118/118 in 21 files**. Standalone API/web/Android builds **1/1 each** (34/34 and 19/19 static pages; Android 1 bundle/35 assets). Zero lint errors, six existing warnings; one repaired source-fixture import timeout and earlier draft failures remain recorded. Shared tests NOT APPLICABLE (unchanged source). Diff/staged hygiene PASS.

Same SP0 synthetic fixture: Library **18 reads / 18,900,915 bytes -> 2 / 44,277**; exact reviewer **11 / 18,879,565 -> 2 / 78,702**; preparation probe **700 / 75,400 -> 2 / 4** with empty receipts/controls. Response bodies remain identical. These are local DB JSON counts, excluding unchanged auth/freshness and real inventory/provider costs; no production latency claim.

**Owner steps remaining:** apply new migration file `20261015040000_experience_library_projections.sql` before API publication (including appropriate version-table generated-estimate backfill scheduling), deploy API/website and preview OTA, then perform the entirely skipped CIT17/realme/website Rollout and Device checks. Regions, capacity, live rows/applied migrations/query plans, Scheduler, actual latency and physical behavior are **UNVERIFIED (owner to confirm)**. SP0 findings 11/12 remain owner region/capacity decisions; SP2b is tracked above. No remote service, remote SQL/migration application, environment-file edit, deployment, Scheduler action or push occurred. This finite SP2 run ends here.

- GA1 **STOPPED at STEP 0**, inspected `65c9150`; audit `2c0a02b`.
  [Evidence/owner questions](acceptance/ga1-course-batch-generation.md),
  [deferred ADR-030](../architecture/ADR-030-course-batch-generation.md).
  EP1 returns `409 not_ready` without durable explicit Reviewer intent while
  preparation is pending; its automatic wakeup cannot cover baseline material,
  Auto opt-out or explicit past courses. E2 estimates saved-reviewer study time,
  not generation duration. These code contradictions trigger the unattended
  STOP rule. Server quota enforcement exists; no product change was made.
- GA1 FRESH baseline **3/3 PASS**, documentation diff/staged checks **0 errors**.
  Product typecheck/lint/tests/builds **NOT RUN**, zero executed, no cached
  verification claimed. Owner steps remaining: resolve the two recorded
  questions, resume GA1 implementation/gates, then entirely skipped Rollout and
  Device checks. Live revisions/database/Scheduler/CIT17/physical behavior
  **UNVERIFIED (owner to confirm)**. No remote service, env edit, deploy or push.
  No later roadmap work was started; existing SP1/CQ1/QD1 stays intact.

- QD1 **PASS locally**, finite STEP 0-4/gates/docs/local commits only. Code `1183369`; [acceptance](acceptance/qd1-queue-dropdown.md), [ADR-029](../architecture/ADR-029-queue-dropdown.md). Header dropdown/popover on both apps, one adaptive owner-scoped poller, running badge/unseen error dot, progress/Retry/Open, latest five finished entries, retained mobile Auto/local requests, old-route recovery and web focus/Esc are implemented. Processing notification route, SP1 saved-first and CQ1 filtering remain intact.
- QD1 FRESH final serial: forced typecheck/lint/root build **8/8 each, zero cached**; mobile **1,056/1,056 (110 files)**, web **113/113 (20 files)**; standalone API/web/Android builds **1/1 each**; zero skips, zero lint errors, six existing warnings. First failures and deterministic harness repairs retained; no product flake observed. API/shared tests **NOT APPLICABLE** (source unchanged).
- QD1 **Owner steps remaining:** website deployment, preview OTA, then entirely skipped realme/website Rollout/Device checks for badge, overlay, Retry/Open, old links, outside/Back, Reduce Motion and web keyboard/focus. Revisions/live database/Scheduler/physical behavior **UNVERIFIED (owner to confirm)**. No remote service action, migration application, env-file edit, deployment, Scheduler change or push. Next separate item GA1; do not start it in this run.


- CQ1 **PASS locally**, finite STEP 0-4/gates/docs/local commits only. Code `6d8759e`; [acceptance](acceptance/cq1-current-and-past-courses.md), [ADR-028](../adr/ADR-028-current-and-past-courses.md). Owner override, safe automatic rule, collapsed Past courses, active-work/background filters, explicit refresh and retained Library are implemented.
- FRESH final serial verification: forced typecheck/lint/root build **8/8 tasks each, zero cached**; API **2,120 passed/3 skipped in 180 files**, mobile **1,042/1,042 in 105 files**, shared **258/258 in 22 files** (includes emitted JS copies; source-only **129/129 in 11 files**), web **95/95 in 16 files**, Canvas **75/75 in 1 file**. Standalone API/web/Android builds **1/1 each**. Lint: zero errors/five existing warnings. Repaired draft/first-gate failures and one earlier API timeout flake remain recorded in acceptance; the final serial run passed without retries.
- **Owner steps remaining:** apply migration files `20261015030000` then `20261015030100`, publish API/website/worker and preview OTA, then run the entirely skipped Rollout/Device checks on realme and website. CIT17 Default Term identities/counts, live course evidence, deployed revisions/database/Scheduler state, actual speed and physical behavior are **UNVERIFIED (owner to confirm)**. No remote service call, remote SQL/migration application, deployment, Scheduler action, environment-file edit or push occurred. Next separate roadmap item: QD1; this finite CQ1 run ends here.

- SP1 **PASS locally**, finite scope STEP 0-4, all local gates, docs and commits; Rollout/Device checks excluded. Code `15811de`; [acceptance](acceptance/sp1-cached-first-screens.md), [ADR-027](../architecture/ADR-027-cached-first-screens.md). Saved-first screens on both apps, owner/query/schema isolation, sign-out purge, static Retry/time status, stable groups and explicit Reviewer revision updates.
- SP1 FRESH: forced typecheck/lint/build **8/8 each, zero cached**; mobile **1,036/1,036**, shared **223/223**, web **94/94**, zero skips; standalone API/web/Android builds **1/1 each**; five existing lint warnings. First full mobile **1,032 passed/4 failed**, focused repair **77/77**, full rerun PASS; development failures retained, no flake. API tests NOT APPLICABLE (unchanged API).
- SP1 **Owner steps remaining:** preview OTA + website deployment, then skipped RB3 reopen/offline Retry/account-switch/reader checks. Production revision, real latency and physical behavior **UNVERIFIED (owner to confirm)**. No remote service/action, environment edit or push. Next separate item CQ1; finite SP1 run ends here.

- SP0 **PASS**, docs only: [speed audit](../architecture/sp0-speed-audit.md) `588bbf1`; FRESH web build PASS (19 static pages/28 routes), Library tests 9/9, final hook probes 2/2, service observations 12/12, docs hygiene PASS; harness/tooling failures retained in handoff; production/CIT17/regions/capacity **UNVERIFIED (owner to confirm)**; no rollout/device/service actions or product edits; next separate item SP1, with CQ1/SP2 inputs recorded.

## F0S complete: released-main baseline (2026-10-15)

Finite scope: verify the starting checkout, fetch released GitHub main, confirm
overnight migration/source inclusion, preserve untracked paths, create
`overnight/2026-10-15_feedback`, install, run all specified baseline gates and
record local documentation commits. **PASS:** base `079986c` (PR #10), all 37
overnight-added migrations present, no absent added source paths or untracked
collisions. The local-path `origin` and all 23 unrelated untracked files remain.

FRESH results: forced typecheck/lint/build 8/8 each with zero cached tasks;
lint zero errors/five existing warnings; shared 134, Canvas 75, mobile 1,026,
web 84 passed. API initially timed out once at 5 seconds (2,095 passed, three
skipped); unchanged full rerun passed 2,096 with three skips in 179 files.
All test temp stayed in `.local/test-temp`; the F0S handoff retains both attempts.

This checkpoint supersedes older local branch/PR-pending descriptions below.
Production/device state is **UNVERIFIED (owner to confirm)**. Rollout/device
checks were skipped; owner steps remaining: none for F0S. No product edits,
remote service actions, environment edits or push. Next separate item is SP0;
this run does not advance into it.

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
See [release evidence](acceptance/release-20261014.md); older entries below are historical.

## VL3 Find a visual completed locally; rollout pending (2026-10-14)

**Code complete; unattended run FAILED on the validation-temp guard.** Initial
full API tests cleaned their own synthetic directories in Windows Temp before
TEMP/TMP were redirected into the repo. Final gates pass; the recorded incident
requires owner review before rollout. Explicit, owner-authenticated Commons-only
visual search is implemented with free-license/plain-attribution filtering,
five candidates, up to three existing OpenAI vision checks at >=0.90 confidence,
exact-version section caching and one Find another. Source snapshots/figures
take precedence. Failed provider/network work is retryable, never cached none.

Forward migration `20261014000700_section_external_visuals.sql` is written only:
owner-safe RLS reads, service writes/leases, cascades, serialized 20/day requests
including retries and persistence-before-response. Mobile renders a separate
**External reference — not from your course material.** card, attribution/license
links and existing zoom sheet. Positive read-only reachability/source discovery
hides actions/images offline and when source visuals exist. No automatic search,
canonical prose changes, offline enrichment, new SDK/key/env/native dependency.

[VL3 handoff](handoff.md#vl3-unattended-find-a-visual-2026-10-14) contains exact
FRESH gates, failed attempts and commits; [ADR-020](../architecture/ADR-020-visual-learning.md#find-a-visual-vl3)
records the contract. Owner rollout: apply migration through Supabase connector
(filename as name), deploy API, preview OTA, confirm Wikimedia egress, RB2 realme
label/no-result/offline/source-first checks. All Rollout and Device checks are
skipped; deployed state, real quality/cost and physical behavior **UNVERIFIED
(owner to confirm)**. No deployment, production call, environment edit, remote
SQL, Scheduler change or push. Owner untracked paths stay untouched.


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
was run. Exact fresh gates and draft failures are in [VL2.1 handoff](handoff.md#vl21-unattended-office-page-snapshots-2026-10-14).
See [ADR-020 Office page snapshots](../architecture/ADR-020-visual-learning.md#office-page-snapshots-vl21).

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
[VL2 handoff](handoff.md#vl2-unattended-extracted-figures-2026-10-14).
See [ADR-020 Phase 2](../architecture/ADR-020-visual-learning.md#phase-2-extracted-figures-vl2).

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
are retained in the [VL1.3 handoff](handoff.md#vl13-unattended-cited-page-pre-render-2026-10-14); see [ADR-020 Pre-render](../architecture/ADR-020-visual-learning.md#pre-render-vl13).

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
the [EP3 handoff](handoff.md#ep3-corrected-prompt-continuation-2026-10-14); see [ADR-026 Client status](../architecture/ADR-026-eager-preparation.md#client-status).

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
[EP2 handoff](handoff.md#ep2-corrected-prompt-continuation-2026-10-14).
See [ADR-026](../architecture/ADR-026-eager-preparation.md#backfill) for budgets, priority and resumability.

Rollout and device checks were entirely skipped. Owner steps: apply the EP2
migration after EP1's two migrations, deploy API and Google worker, observe
per-course backfill counts and guard state not `tripped`, then RB2 checks an
old never-opened material shows Ready on realme. Deployed revisions, migrations,
credentials, Scheduler, production inventory, OCR/cost and retained bytes are
UNVERIFIED (owner to confirm). No remote call, environment-file edit or push.

## EP1e preparation slice done locally; rollout pending (2026-10-14)

**EP1 STEPS 0-4 are implemented locally.** Owner-authorized revision/placement
repairs are retained, and the durable exact-revision result store, Google worker
task/broker lease, sync guard/recovery/poll drain and prepared-only consumers are
complete. The real 230-file discovery case completes 200, defers 30 and drains
30 in the next poll cycle without a new module item. Automatic reviewers wait
for preparation and wake on completion with ADR-019 limits unchanged.

See [ADR-026](../architecture/ADR-026-eager-preparation.md) and the
[EP1e handoff](handoff.md#ep1e-unattended-continuation-2026-10-14) for safe guard
queries, commits, exact final FRESH gates and recorded first failures. Earlier
STOP sections below are superseded historical checkpoints. EP2 backfill is now
complete locally; EP3 status UI is also complete locally, with owner rollout pending.

Owner steps remaining: apply both preparation migrations (`20261014000000`,
`20261014000100`), deploy API/Google worker, confirm Cloud Tasks queue/IAM, watch
the first CIT17 sync and perform RB2's realme sync-to-Ready check. Rollout/device
checks were entirely skipped. Live state remains UNVERIFIED (owner to confirm).
No remote service call, environment-file edit, Scheduler change, email or push.

## EP1d inventory repairs done; exact-revision reuse STOP (2026-10-14)

**STEPS 0.7/0.8 completed locally; EP1 STOPPED before STEPS 1-4.** `996574a`
completes owned Module/ModuleItem placement reads; `e739cab` completes file
references and open automatic candidates under the standing inventory rule.
Both use stable paging, safety bounds and fail-closed behavior. FRESH focused
tests: 78/78, including the 1,002-item placement case with a modeled 1,000-row
response cap. The earlier Canvas cap and complete File/Page reads remain intact.

The next blocker is outside inventory: sync stores revision B's fingerprint
while retaining A's hash/key and resetting ingestion to `not_requested`.
The ingester checks the new fingerprint but no stored-byte revision binding,
then returns `unchanged` without downloading B. A local test runs the actual
inventory SQL and ingester: 1 passed / 17 deliberately filtered, 0 downloads/
uploads. The unattended STOP rule requires the exact continuation answer in
the [EP1d handoff](handoff.md#ep1d-unattended-continuation-2026-10-14).
No preparation migration/store/types, worker/broker, guard/drain or consumer
gating was started; ADR-026 remains free. EP2/EP3 await EP1. Rollout/device
checks entirely skipped and live impact UNVERIFIED (owner to confirm).
The older EP1c placement question below is historical; its repair is complete.

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
and continuation question in the [EP1c handoff](handoff.md#ep1c-unattended-continuation-2026-10-14).

Commit: `c5d537b`. Retained-repair gates FRESH PASS: forced typecheck/lint 7/7
each (0 cached; 4 existing warnings), shared 133/133, API 1,756 passed / 3 skips,
API build 34/34 pages, diff 0 errors. Mobile gates NOT APPLICABLE.

No preparation migration/types, result store, worker/broker extension, guard,
poll drain or consumer gating was added. ADR-026 remains free. EP2/EP3 remain
blocked on EP1. Rollout and device checks entirely skipped.

## EP1b continuation stopped (2026-10-14)

**STOPPED on newly discovered inventory truncation; STEP 0.5 committed.**
`23cb9d0` enforces Canvas's 40-total-page limit before deferred inspection/OCR,
including reused counts, with local durable 100/40 unchanged. FRESH focused
cap/extraction/policy tests pass 29/29 in 3 files.
Retained-fix gates FRESH PASS: forced typecheck/lint 7/7 each (0 cached,
4 existing warnings), shared 133/133, API 1,749 passed / 3 skips, API build
34/34 pages, diff check 0 errors. Mobile gates NOT APPLICABLE.

The source-list readers silently limit Files and Pages to 150 each. Public
pagination then appears complete: the offline 230-file reproduction returns
150 and `hasMore=false`, omitting 80. The required complete discovery and
200/30 guard cannot use that inventory as authoritative. Per the unattended
STOP rule, the exact owner continuation question is recorded in the
[EP1b handoff](handoff.md#ep1b-unattended-continuation-2026-10-14).

The uncommitted preparation-store draft was removed. No new migration/types,
worker/broker, guard/drain or consumers remain; STEPS 1-4 are incomplete.
ADR-026 remains available. EP2/EP3 await EP1. Rollout and device checks entirely
skipped; live state and already-stored >40-page Canvas sources are
UNVERIFIED (owner to confirm).

## EP1 preflight stopped (2026-10-14)

**STOPPED at STEP 0; no implementation started.** Deferred Canvas PDF validation
uses the durable 100-page limit; EP0 and EP1 assume a 40-page Canvas extraction
cap. The later 40-page snapshot constraint does not bound earlier inspection/OCR.
The unattended STOP rule was followed: findings and the exact owner question are
in the [EP1 handoff](handoff.md#ep1-unattended-preflight-stop-2026-10-14).

Owner review precedes continuation. Recommendation: enforce the existing Canvas
40-page rule before extraction, including reused page counts; retain local
durable 100/40, then finish EP1's preflight, code and gates. ADR-026 remains free;
no migration was added. Code suites/builds NOT RUN (0); documentation diff check
FRESH PASS (0 errors). Rollout/device checks entirely skipped, live state
UNVERIFIED (owner to confirm). EP1 remains pending, with EP2/EP3 downstream.

## EP0 eager preparation audit (2026-10-14)

**PASS, documentation committed locally; EP0 done and EP1 next.** Fely's eager
preparation decision accepts cost without a per-user preparation cap: prepare
instructional Canvas material on sync, guard 200/sync in batches of 25 for
repeat/no progress, stop automatic attempts at three until student Retry.
VL2.1 LibreOffice is already approved; no dependency was installed by EP0.
P0 confirmation at 12:48 is recorded by the unattended prompt.

[Audit/EP1 brief](../architecture/ep0-preparation-audit.md): current Prepare
stores originals; extraction and page blocks happen later. No request-context
STOP was found; worker functions accept brokered tokens and AG1 awaits dispatch.
EP1 must persist full exact-revision preparation, gate/wake AG1 admission and
drain deferred batches on later polls. Use ADR-026 if still free; ADR-021 is
provenance retention. EP2/EP3 and visual phases follow EP1; RB2 is owner-present.

FRESH git diff --check PASS: 0 whitespace errors. Typecheck/lint/tests/builds
NOT RUN: 0 tasks/tests/builds, docs only. Historical read-only CIT17 sample:
five PDFs / 164 pages / 8,973,082 bytes; fresh totals/OCR/cost and live deployment,
migration/bucket/IAM/Scheduler state UNVERIFIED (owner to confirm).
No code/migration/env changes, remote calls, deployment or push. Rollout/device
checks entirely skipped. RB1/N1 owner acceptance remains separately pending;
this audit's explicit authorization supersedes its earlier blanket pause.
See [EP0 handoff](handoff.md#ep0-unattended-preparation-audit-2026-10-14).

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

See [RB1 rollout evidence and device matrix](acceptance/rb1/rollout.md).


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
See [H4 handoff](handoff.md#h4-unattended-legacy-review-route-retirement-2026-10-13).

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
**UNVERIFIED (owner to confirm)**. See [ADR-024](../architecture/ADR-024-private-responses-bounded-bodies.md) and
[H3 handoff](handoff.md#h3-unattended-private-responses-and-bounded-bodies-2026-10-13).

## VL1.2 local PDF page snapshots (2026-10-13)

**PASS for local code scope; owner rollout/device acceptance pending.** VL0c's
accepted unchanged local PDF page blocks now enable the existing From page
thumbnail and zoom viewer. The resolver follows the exact owned accepted
version, normalized parent, extraction and PDF asset, checks availability and
Storage existence; the worker verifies size/hash and fails safely on lost bytes.
No title/file-name inference, newer revision, unsupported enrichment or backfill.

Fely's option 1 is implemented: **respect the delete**. Deletion/cleanup and
preserve-artifacts retention are unchanged. A deleted/cleanup-pending asset or
missing original returns source_revision_unavailable with its cited page before
download, quota reservation or dispatch, including cached images. Mobile keeps
page text plus "Page preview unavailable" and hides all controls offline.
Completion fences local deletion; budgets, dispatch, leases and 1400 px rendering
remain shared with Canvas.

Local commits: `4a7bb83` (API/migration), `84bee38` (mobile). Forward-only migration
`20261013000400_local_pdf_page_snapshots.sql` is **NOT APPLIED**; paired nullable
Canvas bindings reuse the existing owner/version/page cache and RLS/grants.

FRESH gates: forced typecheck/lint 7/7 each, 0 cached (0 errors / 4 existing lint
warnings); shared 133/133 in 12 files; API 1,655 passed / 3 skipped in 141 files;
mobile 928/928 in 90 files; API build 35/35 pages, 16 steps / 1 workflow; Android
export 3,456 modules / 31 assets / 1 bundle / 1 metadata file; diff check PASS
(0 whitespace errors). First mobile attempt: 927 passed / 1 failed; corrected the
old local-file header exclusion assertion. Gates ran with the then-uncommitted H2 dependency group, now completed by H2b.

Owner next: migration application, one API deploy, one worker deploy, one preview
OTA, then fresh-PDF, edited-text, keep-reviewers deletion and airplane-mode device
acceptance. Live revisions, applied state, retained bytes and cleanup remain
**UNVERIFIED (owner to confirm)**. Rollout/device checks were entirely skipped.
See [ADR-020](../architecture/ADR-020-visual-learning.md) and
[VL1.2 handoff](handoff.md#vl12-unattended-local-pdf-page-snapshots-2026-10-13).

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
result](audits/h1-release-hardening.md#h2-result-2026-10-13-h2b-pass). Original H2
failures remain historical; O2c PASS and isolated HEAD mobile 928/928 cleared that
blocker.

All eight gates ran FRESH between each STEP 2 group. Final: forced typecheck/lint 7/7
each, 0 cached, 0 errors / 4 existing lint warnings; shared 133/133 (12 files), API 1655
passed / 3 skipped (141 files), mobile 928/928 (90 files), API build 35/35 pages with 16
steps / 1 workflow, Android export 3459 modules / 31 assets / 1 bundle / 1 metadata
file, whitespace check 0 errors. No full-suite H2b flake; failed preflight launcher and
original H2 attempts are recorded in the
[handoff](handoff.md#h2b-unattended-dependency-upgrade-completion-2026-10-13).

**Separate owner-planned item:** Expo SDK 54 -> 57 / React Native 0.81 -> 0.87, with
coordinated native/Metro/Jest/router changes and device acceptance. Next's excluded
PostCSS pin and unavailable compatible argparse/sprintf-js fixes remain reported. Live
production state is **UNVERIFIED (owner to confirm)**. Rollout and device checks were
entirely skipped. Owner steps remaining: review, one API deploy plus the coordinated
mobile OTA, then sign-in/sync/reviewer smoke and app/Canvas/reviewer/quiz device checks.

## H1/H1b release hardening audit (2026-10-13)

**PASS for local scope; owner rollout/live verification pending.** H1 audit local:
8 findings, 2 fixed, 5 reported for decisions, 1 UNVERIFIED boundary. H1b resumed
the committed reviewer log fix `aa58d87`, verified the untracked report against
local source inventories and refreshed the dependency evidence. The additional
experience logger defect is fixed in `21bb836`, with three regression cases and
unchanged response/auth behavior. The report covers all 75 migrations, 106 current
security definers, 69 application tables, 100 policies and 65 API routes.

FRESH gates: forced typecheck/lint 7/7 each, 0 cached; lint 0 errors / 4 existing
warnings; shared 108/108 in 11 files; API 1,558 passed / 3 skipped in 140 files;
mobile 898/898 in 89 files; API build 35/35 pages, 16 steps / 1 workflow; diff check
PASS (0 whitespace errors). Android export NOT APPLICABLE (0; mobile unchanged).
FRESH npm audit exit 1 with valid JSON: 5 critical / 38 high / 33 moderate, 76
entries. No dependency change or new migration. Failed fixture, deliberate
reproduction and corrected launcher attempts remain recorded; no full-suite flakes.

Owner next: review residual dependency reachability/advisories and legacy endpoint
admission; H3 completed private cache policy and bounded body reads; VL1.2 local retention is resolved
by Fely's option 1 respect-the-delete decision. Verify live ACL/RLS/buckets, secrets, revisions/flags,
Scheduler and runtime logs. Production
is **UNVERIFIED (owner to confirm)**. Rollout and device checks were entirely
skipped. See [audit](audits/h1-release-hardening.md) and
[handoff](handoff.md#h1h1b-unattended-release-hardening-audit-2026-10-13).

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
See [ADR-022](../architecture/ADR-022-offline-quiz-answer-keys.md) and [O2c handoff](handoff.md#o2c-unattended-offline-quiz-reveal-and-scoring-completion-2026-10-13).

## VL0 local-upload PDF provenance (2026-10-13)

**VL0c PASS for local code scope; rollout/device acceptance pending.** The
sources route copies the worker's owner-scoped extraction blocks only when the
accepted trimmed-text hash matches the normalized parent. Canonical child metadata
is `"extracted"` with page blocks, `"edited"` without blocks for text changes, or
`"unavailable"` without blocks for missing/invalid evidence and read failures.
Provenance failures preserve HTTP 200 acceptance. No backfill or migration.

Reader regressions confirm page mapping/Study Assist source evidence and today's
unavailable behavior for old/edited revisions. Reader production code, camera,
Canvas, snapshot renderer and mobile controls are unchanged. Owner answer 6
supersedes VL0's historical retention stop: **accepted, deferred to VL1.2**.
Deletion/cleanup remains unchanged. VL1.2 subsequently adds local snapshot UI
under Fely's respect-the-delete decision, with no retention change.
FRESH typecheck/lint 7/7 each (0 cached; 4 existing warnings); shared 108/108 in
11 files, API 1,579 passed / 3 skipped in 140 files, mobile 898/898 in 89 files.
API build 35/35 pages, 16 steps / 1 workflow; diff check PASS (0 whitespace errors).
Android export NOT APPLICABLE (mobile unchanged). Live state and old affected-row
counts are **UNVERIFIED (owner to confirm)**. Rollout/device checks entirely skipped.
See [VL0c handoff](handoff.md#vl0c-unattended-local-upload-pdf-provenance-2026-10-13).

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
See [G1.1 handoff](handoff.md#g11-unattended-grade-estimator-drop-rules-2026-10-13).

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
See [PV1c completion handoff](handoff.md#pv1c-canvas-pdf-provenance-completion-2026-10-13)
and [ADR-021](../architecture/ADR-021-canvas-source-provenance-retention.md).

## R1.4 CIT17 acceptance (2026-10-13)

**STOPPED at step 1; R1 remains 15/16, AG1 PARTIAL.** All five CIT17 baseline materials already have reviewers under the shared owner-scoped reviewer mapping. No eligible file, baseline edit, sync tap or generation; baseline remains exactly `2026-10-12T07:07:14.956768+00:00`. Production API `dpl_Hua1KbWEDGYphVB8xVexSdV3UBdQ` is READY and worker `generation-worker-00023-9hs` serves 100%. End counts: 622 sync jobs, 242 processing jobs, 113 reviewer jobs, 90 artifacts; 0 active sync/processing jobs. PV1 admission-path evidence NOT RUN because no new job exists. AG2 rollout/device acceptance remains pending. FRESH read-only checks; code gates NOT RUN (docs only). See [R1.4 stop evidence](acceptance/r1/rollout-and-acceptance.md#r14--cit17-preflight-stop-2026-10-13).

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
visuals on request remain later phases. See [ADR-020](../architecture/ADR-020-visual-learning.md),
[preflight](acceptance/vl1/preflight.md), and
[VL1.1b handoff](handoff.md#vl11b-unattended-canvas-pdf-snapshots-2026-10-13).

## VL1 source-page snapshots (2026-10-13)

**STOPPED at STEP 0.1.** Local PDF extraction returns page-numbered blocks but
does not persist them in canonical source-version metadata. Reviewer admission
stores blocks in job-source metadata without adding them to the reused source
version. Canonical saved reads retain section `sourceBlockIds` and a document
link, but cannot resolve those IDs to original pages from the source version.
Per the unattended rules, no prerequisite repair or STEPS 1-5 were started.
Owner question and deferred rollout/device checks are in the
[VL1 handoff](handoff.md#vl1-unattended-source-page-snapshots-2026-10-13).
FRESH: documentation diff check (0 errors); six build/test gates NOT RUN. No
external calls, deployment, migration application, environment-file edits or push.

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
Failed first attempts, evidence and Owner steps remaining are recorded in [P1 acceptance](acceptance/p1/unattended-polish.md).

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
[execution contexts](../architecture/ag2-execution-contexts.md) and [handoff](handoff.md).

## R1 coordinated rollout (2026-10-12)

**PARTIAL — production rollout complete; 15/16 device lines PASS, line 7 FAIL (R1.3 reviewer generation), 0 pending.** R1 source `cc42361`; AG1.1 fix `b5adb7d`; AG1.2 token fix `4a2a2d0` and dispatch fix `b6ab830`. Owner-applied R1.1 migrations remain reconciled with no history repair. API `dpl_38faB6K3SfD38KeGE7TNuG6W6bgp` was later redeployed by the CC17 session as R1 + API quiz fixes, `dpl_7xLxnfVqY81QVCUyiiy6qQvsDDgF`. GR1 API **dpl_Hua1KbWEDGYphVB8xVexSdV3UBdQ** and worker **generation-worker-00023-9hs** (100%) deploy source fc3486b. Rollback: API dpl_7xLxnfVqY81QVCUyiiy6qQvsDDgF; worker generation-worker-00022-wzx. Preview OTA `ba5e6d56-d75a-4ef4-adb0-162518572c48` is unchanged. Scheduler/Resend inactive. See [R1 evidence](acceptance/r1/rollout-and-acceptance.md).

| Feature | Overall status | Device acceptance |
|---|---|---|
| O1 offline library | PASS | Lines 1–4 accepted: cold offline Reviewer/Quiz/Draft reopen, copy removal/recovery, practice kept, no sync jobs |
| AG1 automatic reviewers | PARTIAL | R1.3 proved preparation/admission/dispatch/start but failed during generation. GR1 classification and bounded known-outcome retries are live. Fresh manual Unit 2 diagnosis succeeded on worker 00023, first delivery, 53,159 ms; saved reviewer opens in Library. Original failed job unchanged. Line 7 still needs one completing automatic run. |
| E1 study-time estimates | PASS | Lines 10–12: varied estimates, student edit kept, no re-estimation |
| G1 grade estimator | PASS | Lines 13–14: hand-checked CIT17 90% → 92.3% per remaining activity |

Regression/sign-out-in line 15 and Mixed-quiz Matching line 16 PASS. Matching-only generation contract failure remains open. GR1 provider classification and bounded definite-outcome checkpoints are deployed from fc3486b. Unit 2 manual diagnosis PASS on worker 00023: fresh job ceaebf6d succeeded on delivery 1; provider duration 53,159 ms; saved reviewer opens from Library (18 topics). No request_failed or reviewer_generation.* failure events; kind/httpStatus/incompleteReason absent on success. Original d9de6cfe remains failed/generation_failed, attempt 2, retryable=false. No Queue Retry or direct data edits; no new deploy, cap change, migration, OTA or push. The earlier R1.3 failure cause remains unknown; this run does not establish output truncation. Line 7 remains FAIL, R1 15/16, AG1 PARTIAL; next automatic acceptance needs naturally new or known-fitting material. AG2 background-poll code is complete locally; rollout/device acceptance and website parity remain open. Prior GR1 code gates passed: forced typecheck/lint 7/7 (0 cached, 4 existing warnings), API 1,409 passed/3 skipped/128 files, build 35 pages/16 steps/1 workflow, provider contract 20/20. Code gates NOT RERUN for this device/docs continuation; documentation diff check FRESH PASS.

## O1 explicit offline library (2026-10-12)

**PASS (local) - physical acceptance pending.** O1 implemented locally: every saved artifact body hydrates in batches (foreground and completion catch-up, no new jobs), Saved offline markers and counts, calm offline states, Offline storage settings. Not physically accepted. O2c now supports offline Quiz reveal/scoring with separate owner-scoped device keys; offline Draft editing remains network-only. Device copies stay owner-scoped; only authenticated not_found removes an artifact, list absence retains it, sign-out purges the owner, and Quiz bodies remain learner questions without answer keys. Fely's 2026-10-13 option 1 decision is implemented by O2c (ADR-022): keys hydrate separately, purge with device copies and enable provisional scores until server-wins replay. Removing copies keeps summaries, aliases, Quiz practice, Activity responses and Task snapshots. O2c adds local API/shared and mobile changes; rollout remains pending. Historical O1 FRESH gates: root typecheck 7/7 (0 cached); root lint 7/7 (0 cached, 0 errors, 4 pre-existing mobile import-order warnings); mobile tests 843/843 in 85 files; Android export 1 bundle / 3,448 modules / 31 assets; git diff --check 0 whitespace errors.

## G1 grade estimator (2026-10-12; historical local result before R1/G1.1)

**PARTIAL - implemented locally; API/mobile rollout and physical acceptance pending.** Grade goal computes the same percentage needed on each remaining activity using a pure points/weighted model, choosing the mode nearest Canvas's visible current score. A read-only owner-selected-course API excludes non-gradable/excused work and treats hidden grades as pending; drop-rule and mismatch warnings keep the estimate qualified and Canvas authoritative. Mobile remembers the target by account/course and links course Tasks to Grades. No migration, AI, grade writes, website, deployment, OTA/EAS or push. FRESH: root typecheck 7/7 (0 cached); root lint 7/7 (0 cached, 0 errors, 4 pre-existing mobile warnings); shared 68 passed in 10 files; API 1,362 passed / 3 skipped in 126 files; mobile 817 passed in 82 files; API build passed (35 static pages, 16 workflow steps / 1 workflow); git diff --check passed. Live sanity check awaits account/course context; device acceptance remains pending.

## E1 study-time estimates (2026-10-12)

Reviewer estimates: E2 local; Today review blocks deferred to E3.

**PARTIAL - implemented locally; production migration/API rollout/OTA and physical acceptance pending.** Canvas task time now uses one bounded structured AI call (10 tasks/request; snapshot limit 40 AI tasks/user/24 hours), with deterministic heuristic fallback and retry. Owner-scoped fingerprints avoid repeat calls and refresh changed assignments; student estimates win through guarded writes. Today/Tasks show approximate automatic time and TaskEditor explains the source. Migration `20261012000200` remains local. FRESH: root typecheck 7/7 (0 cached); root lint 7/7 (0 cached, 0 errors, 4 pre-existing mobile warnings); shared 57 passed in 9 files; API 1,336 passed / 3 skipped in 124 files; mobile 807 passed in 81 files; API build passed (35 static pages, 16 workflow steps / 1 workflow); git diff --check passed.

## AG1 automatic reviewer admission (2026-10-12)

**PARTIAL - implemented locally; production migration, API/worker rollout and physical acceptance pending.** Content-sync admission, baseline receipts, limits, serialized user runs, existing-reviewer protection, and the API/mobile off switch are complete. FRESH: root typecheck 7/7 (0 cached); root lint 7/7 (0 cached, 0 errors, 4 pre-existing mobile warnings); API 1,304 passed / 3 skipped in 123 files; mobile 800 passed in 80 files; API build passed (35 static pages, 16 workflow steps / 1 workflow); git diff --check passed. No production or device actions occurred. AG2 has completed the metadata-poll trigger, inactivity gating and Auto labels locally; rollout/device acceptance and website parity remain. [ADR-019](../architecture/ADR-019-automatic-reviewer-generation.md).

## Product direction v1.4 (2026-10-10)

Target users are now regular Canvas-using students at one institution, not CTE students or CTE Board Examiners. AG1 automatic reviewer admission, G1 grade estimator, E1 task study-time estimates and O1 offline library are implemented locally as recorded in [official direction v1.4](../capstone/official-direction.md); production activation and device acceptance remain pending.

## Urgent Canvas notification system (2026-10-03)

**PARTIAL: implemented locally; activation pending.** Protected metadata polling, database event deduplication and due revisions, durable Resend delivery, submission/completion suppression, and persistent per-type Settings controls are complete. Forward migration `20261003025905` has local Postgres/RLS verification. Production lacks `CRON_SECRET`, `RESEND_API_KEY`, and `RESEND_FROM_EMAIL`; sender verification, rollout, developer-only live/physical acceptance, workload measurement, and enabling one Google Cloud Scheduler job remain. No production migration, deployment, Scheduler job, or real email was performed. [Architecture/runbook](../architecture/canvas-email-notifications.md).

## Quick Canvas token tutorial (2026-10-01)

**PARTIAL physical acceptance.** The unchanged local image, one-time popup, manual reopen action, and scrollable full-screen viewer are on Android preview OTA `01a0f7d2-ca43-760b-9723-4a4ddf1f1a40`. The realme passed the popup, readability, scrolling, close/reopen, and edited-domain preservation checks; connected courses still loaded. A fresh Canvas token was not entered, so successful reconnection and real-token log absence remain unverified. FRESH: mobile typecheck and two focused sync test files (16 tests) pass; mobile lint has zero errors and four existing warnings in unrelated service tests.

## B41 native Office DOCX/PPTX opening (2026-10-01)

**PASS.** The realme had no app able to open DOCX or PPTX; with the owner's approval, Google Docs and Slides were installed. The opening test exposed a defect: exported Drafts lost every line break (DOCX breaks were written outside runs, and PPTX chunking flattened lines). Fixed in `28b81af`/`74ae2ab` with regression tests, and shipped as preview OTA `9129850a-bd65-4588-b80b-53cd53d82745` (runtime 2.0.1). The re-exported DOCX and PPTX open directly from My Files in Google Docs and Slides (18/18 slides), with lines preserved. No new jobs or artifacts. FRESH: mobile 782, typecheck and lint pass. Microsoft Word/PowerPoint not tested. [B41 acceptance](acceptance/b41/native-office-docx-pptx-opening.md).

## B40 Reviewer Smart Selection learning tools (2026-10-01)

**PASS.** Tapping a Reviewer topic opens the existing Study Assist sheet. The full concept is now selectable there with Android's own handles and Copy/Select All, and the sheet captures the exact range. Define, Explain, Example, Test Me and Ask then run on that selection in the same sheet, with lazy refinements (Plain words, In context, Key traits, Compare; Simpler, Deeper, Analogy, Why it matters; Real world, Step-by-step, Another, Counterexample; Test Me checking, Harder, Apply it, Explain answer, Need choices?).

One owner-scoped `POST /api/experience/study-tools` route reuses the Study Assist ownership and source-provenance path. It verifies that the selection belongs to the owner's block, sends only bounded context (the block, nearby section content and cited source excerpts), and enforces selection, question, answer, follow-up (2) and output limits on the server. Define/Explain/Example/Ask fall back to general knowledge automatically, with a tappable From your material / Source + general knowledge / General knowledge badge. Test Me is source-only. The canonical Reviewer is never modified.

Physical acceptance passed on the RMX3151 against a local API and a coinstalled local debug build: all actions and refinements, grounding states, offline message, Reduce Motion, search and the scrubber, and zero new Canvas, processing or artifact rows. FRESH: API 1,198 tests, mobile 778, shared 50; typecheck and lint 7/7. **Production-deployed:** API `dpl_CW3TWB9FjkXAoMvBPRbMntZvqMaR` and preview OTA `ded5f2a6-19a4-4934-99ea-23610409a642` (runtime 2.0.1), both smoke-tested on the preview app. The sheet now opens on whole-topic quick assists, and selecting text swaps in the five actions. [B40 acceptance](acceptance/b40/reviewer-smart-selection-learning-tools.md). Next: B41 native Office DOCX/PPTX opening acceptance.

## B39.2 physical Canvas and Android acceptance (2026-10-01)

**PASS — closes B39.** Recorded in [B39.2 acceptance](acceptance/b39.2/physical-canvas-android-acceptance.md); the B39.1 BLOCKED entry below is historical.

## B39.1 deployment + physical Canvas sync and Task attachment acceptance (2026-10-01)

**BLOCKED at live Canvas/device acceptance.** Production API `dpl_74hWVM2kSvg21hfnRLcVu885ohFe` is READY and healthy. Offline Task attachment metadata is now persisted in the existing local SQLite store. Native preview APK `de93f504-cb53-4388-b48a-47103d65eb3a` from commit `80cd1b0` is installed on the RMX3151 and includes Expo Sharing. No Android UI control surface is exposed, so live Canvas authentication/sync and the physical task/Generate/Library/Announcement/Reviewer/passive-sync checks remain unverified. Do not close B39 or begin B40. Next: restore supported CUA Android control for the authorized device and resume these gates. [B39.1 record](acceptance/b39.1/deploy-physical-canvas-sync.md).

## B39 student workflow and Canvas Task attachments (2026-10-01)

**BLOCKED at live Canvas/device acceptance.** Local Task attachment metadata/opening and Generate attachment-routing fixes are implemented; root typecheck, scoped API/Mobile tests, Canvas client tests, and lint pass. Current Canvas credentials were not inspected, fresh manual sync was not triggered, and the attached RMX3151 did not expose a controllable UI. No deployment or app data mutation occurred. Expo Sharing requires a native preview build before the physical attachment-open gate. Complete the current Canvas-auth/sync, idempotency, attachment-open, and passive-navigation checks on that build. [B39 record](acceptance/b39/student-workflow-canvas-tasks.md).

## B37 production generation regression (2026-10-01)

**BLOCKED after B37.2.** B37.1's Introduction PDF and durable recovery remain PASS. B37.2 established that Page-linked Canvas file `11574237` is directly downloadable despite `hidden` and `hidden_for_user`; scoped repair `54aa9fd` is live in API `dpl_AHpKJsANQzNa3Tya3QqaYusZn89z` and preview OTA `01a0f4ef-496a-7c4c-a6e7-52617f4268bd`. The realme's fresh Unit 3 request prepared the full PDF but hit a separate database staging contract: `stage_deferred_canvas_reviewer_pdf_v1` accepts one file ID, while Page plus attachment supplies two IDs. API returned 503; job row `dde023f1-65ef-415b-b888-5550bc845494` is queued without dispatch, attempt or result. No further repair or 40-page retest was made after this failure. [Evidence](acceptance/b37/production-generation-regression-20261001.md).

## B39 preview API configuration (2026-09-30)

**PASS — preview API configuration is explicit and future EAS updates are guarded.** The mobile API clients validate a canonical API address before requests and render configuration-specific errors while retaining the existing session, Canvas connection, and local data. The EAS preview environment contains the public API address; the normal preview OTA command checks it against the build profile and publishes with `--environment preview`. Final Android update `01a0f2ae-79d7-732a-9ba4-c492f2af3545` passed on the realme. Generate, Tasks, Library, Today, CIT17 PDFs, Canvas connection, and force-stop/relaunch remained intact; Canvas jobs stayed at 468 with zero active. [Acceptance](acceptance/b39/preview-api-configuration.md).

## B38 Canvas sync admission (2026-09-29)

**PASS — Google Canvas sync is stable, idempotent, and physically accepted.** After explicit user authorization, Vercel production deployment `dpl_7CiWZrgZAf9ersa5bFsegVfnMbnn` is READY, private Cloud Run revision `generation-worker-00014-qxb` serves 100%, and corrected Android preview OTA `01a0ef99-599e-7e9f-88dc-509cae198f4b` loads authenticated Canvas courses. Launch, repeated Generate/Tasks/Library/Today navigation, and post-sync force-stop/relaunch created zero automatic jobs. Manual CC6, CIT17, and SOC SCI 103N syncs each created exactly one content and one grades job; all six reached terminal success with one worker attempt. SOC SCI content had the expected partial Canvas Files/Pages access result. CIT17 instructional PDFs, empty-Page exclusion, submitted Tasks, announcements open/close and Canvas handoff, persisted session/data, and stable row counts passed on the realme. The first OTA omitted the API address and misleadingly showed “Please sign in again”; the corrected OTA fixed connectivity without signing out. A follow-up should make missing API configuration explicit and include the URL in the EAS update environment. [Evidence](acceptance/b38/canvas-sync-admission.md).

**Repair deployed and verified.** B37 architecture is committed at `46e66a8`. The extra-batch paths were sign-in/foreground staleness and Today focus, with Generate/Tasks refresh also able to call account-wide `sync()`. Passive paths now restore persisted data and poll already accepted jobs; only explicit Sync actions start new work. Database unique active-job admission remains authoritative and the API reuses its winner on concurrent requests. The failed CC6 repeat content job had one claim and zero units; a contemporaneous production token-route 504 supports a pre-unit handoff timeout, now addressed with one bounded retry and a 35-second request deadline. An empty CIT17 Page is excluded by body eligibility. Physical acceptance passed on the corrected preview OTA.

## B37 Canvas sync Google worker cutover (2026-09-29)

**PARTIAL.** Production Canvas jobs enqueue to the existing Google Tasks queue and run on private Cloud Run. After correcting legacy finalization token decrypts, fresh realme CC6, CIT17 and SOC SCI 103N content/grade jobs all reached terminal success; content was partial for inaccessible Canvas resources, with no Workflow run IDs. Generate showed CIT17 PDFs, Tasks showed submitted assignments, and relaunch retained the signed-in session and canonical row counts. Opening Generate and relaunching started extra 7-course sync batches; one repeat CC6 content delivery failed before units. An empty CIT17 administrative Page appeared as a learning source. Full physical acceptance and the architecture commit remain open. The older P0 note below is historical.

## Canvas sync P0 (2026-09-29)

Production Workflow queue deliveries fail with `ThrottleError: Workflow usage limit exceeded`; CC6, CIT17 and SOC SCI 103N jobs were accepted but never claimed. The existing Canvas credential works for live course inventory. Applied forward expiry migration `20260929060000`; the original six jobs now expire to a safe terminal state. Mobile now reconciles terminal jobs on foreground, polls beyond 15 minutes, persists a restart cooldown, and shows a retryable failure. Android preview OTA `bbf3c411-38b7-4c26-880b-61a6f9206514` is published but realme activation is unconfirmed. Do not trigger more automatic sync attempts while capacity is exhausted. Next: restore Workflow capacity or move Canvas execution to the Google worker, then retest all three courses and finish physical acceptance. Scoped code remains uncommitted until that acceptance passes.

## B39 EAS preview distribution (2026-09-29)

**PASS after authorized native preview-build fallback.** Preview OTA group `cdc3f3a6-5ecb-46b5-96cb-ea1404c007bb` delivered B38/header cleanup at `b88a507`, runtime `2.0.0`. Old APK lacked native provider-auth crypto; owner-authorized preview APK `21be5ea3-f224-4be4-a707-643c7957dd15` at `2c66889`, Android runtime `2.0.1`, is built and installed. FRESH realme Google sign-in, Draft-first flow/headers, Library, Reviewer navigation, Quiz progress, offline Draft force-stop/reopen and stable Draft cards/count pass without Metro. FRESH focused mobile 147/auth 29 tests, typecheck/lint (four existing warnings), diff check, export and APK build/inspection pass. Debug app restored, connectivity restored; preview channel unchanged; future Android updates target `2.0.1`. No backend rollout, production channel change or push. Next: separate native Office DOCX/PPTX-opening acceptance. [Acceptance](acceptance/b39/eas-preview-b38-distribution.md).

## Artifact header simplification (2026-09-29)

Removed repeated course/source banners and generated-date lines from saved Draft/Quiz previews, and repeated course/source context from the Reviewer header. Draft uses one multiline editable title and a header Export action; Quiz preview titles are compact. Topic navigation, question progress, Draft save status, actions and course organization remain. FRESH verification: 67 focused mobile tests, mobile typecheck, changed-screen lint and git diff check pass. Existing Draft, Quiz preview and Reviewer opened on realme with the cleaned headers; no generation or account data changed. Local debug JS only, no deployment or push.

## B38 draft-first assignment UX (2026-09-29)

**PASS.** Completed the user-requested B38 Draft-first assignment UX. Draft is the immediate saved/editable assignment result; no Study Activity worksheet/status; Library categories are All / Reviewers / Quizzes / Drafts. Saved-Draft export and immediate confirmed-revision display are covered. Backend Activity infrastructure, B37 cross-course resolution, Tasks model and offline copies remain. Fresh physical Firewall/VPN and Dice Roller generation/opening, one result each, and Firewall/VPN offline force-stop/reopen pass. Fresh mobile 733/API 1,076 tests, focused mobile 103/Activity-worker 70, Workflow, typechecks/lint/diff check pass with four existing mobile lint warnings. Next: preview-channel mobile distribution, not started. No API/worker rollout, migration, EAS build/update or push. [Acceptance](acceptance/b38/draft-first-assignment-ux.md).

## B37.1 firewall/VPN Activity generation (2026-09-29)

**Specific bug PASS; remain on B37.1.** The failed physical job had zero provider calls: a page URL scoped to another Canvas course was incorrectly treated as required local material. Narrow course-aware preparation is deployed to private worker `generation-worker-00011-n2s`; the same assignment now produces one 12-slide presentation draft, completes Queue, lists in Library and reopens after force-stop. Fresh Dice Roller also passes. API 1,076/mobile 726 tests, focused Activity/Google worker 72 tests, typechecks and lint pass (four existing mobile warnings). Safe API error mapping is tested locally; production deployment awaits explicit authorization after automatic approval review rejected it. Separate B37.1/Matching/native Office gates remain. No EAS build, B38 work or push. [Evidence](acceptance/b37/activity-firewall-vpn-generation.md).

## B37.1 pre-APK study experience polish (2026-09-28)

**PARTIAL; remain on B37.1.** Authorized Vercel API/private Google worker rollout is complete (`dpl_6UepXtqEVSPwnZMRYejoN5rMy38x`, `generation-worker-00010-g9v`). Commits `3ed1428` and `8251652` provide minimal integrated spatial arrows/slider and unrestricted unanswered navigation. Fresh mobile tests 726/726 and earlier API 1071 passed/three existing skips; mobile typecheck and lint pass (four existing warnings). Realme adb navigation/synthetic drift and vertical handoff, reveal-before/after, offline force-stop, production replay, completion/score and retake/history pass. After an initial real-finger failure, the user reports about 20 connected thumb drags without cancellation on the corrected slider. The user physically retested and accepted the follow-up instant-on-release navigation; automated vertical handoff passed. Fresh Reviewer emphasis/grounding/three-page PDF pass. Fresh Matching's public projection drops visible pairs; tested forward migration `1025208` awaits explicit Supabase approval, then fresh pairing/partial scoring acceptance. Remaining Activity task/native Office acceptance is pending. Earlier Activity persistence/exports remain valid. Export scope remains **generated Library Activities: PDF/DOCX/PPTX; Reviewers: PDF only**. No EAS build or origin push. [B37.1 evidence](acceptance/b37/pre-apk-study-experience-polish.md).

The next milestone, **after B37.1 passes**, is B38: move durable Canvas sync execution from Vercel Workflow to the existing Google worker, with Vercel retaining the authenticated API and Supabase retaining owner-scoped job/data state. Production Canvas lifecycle acceptance follows B38, then one new EAS preview APK and final physical acceptance. B38 is a recorded decision, not implemented. B37 remains PARTIAL.

## B37.2 non-Canvas acceptance and build gate (2026-09-28)

**PARTIAL.** Text, Camera and Local File pass on realme after two fixes. The API (`dpl_Ehds5J5evWG1zwj7JT68CZaYZRnR`) now claims unedited Camera/PDF text as a new revision, because `source_versions` is immutable and the old path returned 503. The mobile source panel now shows extraction failures and applies reused extractions. The 100-item Firewalls Quiz produced 100 unique, sourced items in 10 bounded calls, and the 30- and 100-item Quizzes reopen physically. The recovery email reached the owner via the Resend test sender, and Google sign-out/sign-in keeps the same owner. The stale Canvas provider test mock is fixed (692/692 mobile, 1066 API). **Canvas sync is BLOCKED** by the Vercel Workflow usage limit (ThrottleError; stuck `queued` jobs return 409 until about 23:30Z). **No EAS build.** Next: once the quota clears, run a Canvas sync plus disconnect/reconnect, then build one preview APK (it needs native `expo-crypto`). [Evidence](acceptance/b37/study-experience-overhaul.md). No push; `tmp/` untouched.

## B37.2 continuation in progress (2026-09-28)

Core implementation is deployed. Email/password sign-out/sign-in and restored owner session pass; the locally upgraded realme client proves native S256 with 0 EAS builds. Manual linking is now ready (fresh 200 after the user saved the toggle), and Google/Microsoft physical acceptance is continuing. Invalid Canvas credential handling and user-entered same-account replacement preserve original owner/connection IDs and historical data fingerprints. Hostname-only Canvas input adds HTTPS. Live disconnect/reconnect and sync remain pending.

One server-originated Resend test message is delivered; replay deduplicates. No verified sender domain exists, so broad student delivery remains unproven. Fresh 30 Mixed persisted exactly 30 with two calls/no repairs. Fresh capacity-100 Firewalls stopped in batch 4 on duplicate validation after seven calls and published no Quiz. Next: provider completion, Canvas disconnect/reconnect, physical Queue/Library reopen and Text/Camera/Local File acceptance; then final B37 verdict. API `dpl_6A3CygzdmL4u3jzUd9zkKZZb8afL`, migration `20260928001117`, worker unchanged. [Evidence](acceptance/b37/study-experience-overhaul.md). Historical quota-stop sections below are superseded. `tmp/` untouched; no push.

## B37.2 opening production gate (2026-09-28)

**PARTIAL — migration/deployment/small-source rejection verified; fresh 30 Mixed blocked at the existing daily quota (25/25), so B37.2 is NOT STARTED.**

The approved B37.1a migration is recorded once in `xfdbwfqtorelmurncyql` as version `20260927230139`, name `20260928100000_canonical_non_canvas_sources`; reviewed local filename unchanged. Sources/courses/original Quiz row fingerprints match, all 15 historical Quizzes remain readable, and RLS/grants/owner-source constraints are preserved. No reset or deletion. Production API `dpl_FnAWyTzQmfNgsQLuo5rQyPKpdzbv` is READY for `0c354ac`, health 200 and signed-out Library 401. Private worker `generation-worker-00009-jzb` serves 100%; anonymous health 403. Build/digest and detailed verification are in the ledger.

VPN sections 6–10 have 26 concepts, 5 duplicate exclusions and capacity 52. Direct 100-item admission returns typed 422 with maximum 52, no job and zero provider calls. The whole VPN Reviewer still calculates capacity 100; its whole-source capacity is not claimed to pass a below-100 check. Fresh 30 Mixed returns 429 `rate_limited`, no job/provider calls: 25/25 daily jobs, zero queued/running. The next window starts **2026-09-28 08:00 Manila**. An existing Canvas `2. Firewalls.pdf` Reviewer is a candidate with 138 concepts/capacity 100. No fresh 100-item, Queue/Library completion or non-Canvas physical flow was run after the required stop. Do not bypass the quota.

Realme `PB6DWWEIHAUCMZOR` loaded current JS against production, retained the authorized owner's session, and loaded existing Library/Queue data. Tokens stayed in the app. The corrected config `stay-focused-v2/env.local` matches production; only variable names/presence are recorded. Initial inventory approval blocks were resolved for aggregate counts after explicit user approval; private content exports were not bypassed. Fresh Quiz tests: 157 passed, 2 existing skips; focused database tests: 30 passed, 2 skips (overlapping); production build and `git diff --check` pass. No EAS build, auth/Canvas credential/Resend implementation, live email or new lifecycle acceptance. Existing unrelated Supabase security-advisor warnings remain recorded for separate review.

The authenticated Supabase user UUID is the canonical owner.

Canvas credentials authorize synchronization.
They do not own Stay Focused data.

Resume the 30/100 and non-Canvas physical gate after daily admission resets, then B37.2. Study Assist latency remains approximately 20 seconds and optimization is deferred. `tmp/` untouched; no push.

[Detailed B37 rollout and acceptance ledger](acceptance/b37/study-experience-overhaul.md).


## B37.1a local checkpoint before rollout (2026-09-28)

**PARTIAL — implementation complete locally; production and physical acceptance pending.** `source_versions.id` is the canonical persisted source identity and `user_id` is the authenticated owner. Text creates an imported source; Camera and PDF reuse the normalized OCR/extraction source (or an owner-linked correction revision). Each carries source type, display name and applicable asset provenance. The Other source rising sheet offers Text, Camera and Local File, persists on Continue, and offers Reviewer or Quiz. Quiz prepares a saved Reviewer and opens the existing Quiz setup with local capacity; both use the existing worker and Library. The manual Save step is gone. Canvas snapshot checks remain for Canvas sources; non-Canvas sources use no fake Canvas IDs. Activity remains assignment based and is deferred. The realme confirmed the sheet and Text entry; PDF extraction failed to reach the configured API, and camera capture was not completed. Automatic approval review rejected the live Supabase Quiz migration because its production constraint and RPC changes lacked clear authorization. No production data was changed, EAS build used, or push made. [B37 ledger](acceptance/b37/study-experience-overhaul.md).

Source acquisition may differ. After normalization/persistence, generation uses the same current engine.

## B37.1 source capacity checkpoint (2026-09-28)

**PARTIAL.** Local deterministic Reviewer concept counting now limits Quiz setup, API admission, worker batching and old-job Retry. Repair rejects a self-repeating replacement after its single repair call. Focused code checks pass. The user's UI correction moved Other source near the top of Generate and into a rising Text/Camera/Local File sheet; the reloaded realme verified text entry, native camera launch and instructional PDF selection. The underlying flow remains Reviewer-only while Quiz ownership requires Canvas snapshot IDs, triggering B37.1's architecture stop condition. No production deployment, fresh Quiz, EAS build or push. Decide canonical non-Canvas provenance, then resume production acceptance. [Checkpoint](acceptance/b37/study-experience-overhaul.md).

## B37 study experience overhaul (2026-09-27)

**PARTIAL - 100-item Quiz stopped for review.** Owner-approved Quiz batching is live: two provider calls per 20-item batch (cap 10), repair of only rejected items with a distinct call identity, single formats kept across batches, exact source wording for recall answers, and retryable failed Quizzes without duplicate retries. Production 30-item Mixed (via Retry) and 30-item Multiple Choice Quizzes pass; the 100-item Mixed smoke failed at batch 3 of 5 on duplicate questions after one fresh repair (5 of 10 calls) and was stopped as instructed. Reviewer key-point results open on tap and sheets close by swiping on Android. No EAS build used (0 of 1). [B37 report](acceptance/b37/study-experience-overhaul.md).

## B38 Google generation cutover readiness (2026-09-27)

**PASS — production generation runs on Google Cloud.** The fresh VPN instructional Quiz, terminal duplicate replay, production-scoped Vercel OIDC federation and rebuilt private worker passed. After the user confirmed deployment capacity, one READY Vercel production version `dpl_Cgp6geT9JJrE2epyR9zQDmmYxvbL` enabled Google routing. `/api/health` returned 200; one authenticated production API Quiz from the existing VPN Reviewer completed through Cloud Tasks, Cloud Run, OpenAI and Supabase, then listed and reopened from Library. Vercel Workflow remains for rollback, and no EAS build was consumed. [B38 evidence and rollback](acceptance/b38/google-generation-cutover-readiness.md).

## B37 Google Cloud heavy-generation foundation (2026-09-27)

**PARTIAL — Google execution proven, B38 cutover gated.** Cloud Tasks delivered fresh jobs to a private Cloud Run worker using the existing engine, Supabase persistence and Google Vision OCR. Text/scanned PDF, DOCX, PPTX and Canvas Page Reviewers plus Activity succeeded and reopened; the fresh Quiz failed existing validation. Lease retry, cancellation and safe failure passed, but terminal replay was blocked by an automatic approval-review usage limit. Vercel-to-Google dispatcher identity is not configured, and Vercel storage pressure still affects redeployment. No production routing change or EAS build. [Evidence and exact B38 actions](acceptance/b37/google-cloud-generation-foundation.md).

## B37 Reviewer Study Assist (2026-09-27)

**PASS - production and realme acceptance complete.** On-demand Summarize, Explain simply, Analogy and Example use existing canonical Reviewer blocks and the contextual sheet, with a separate owner-scoped SQLite cache, content/prompt invalidation and concurrent-request deduplication. Reviewer and Quiz prompts/schemas are unchanged; cache isolation is regression-tested. Fresh mobile 677/677, API 947 passed / 3 existing opt-in skips, shared 44/44, provider contracts 19/19, forced typecheck/lint 7/7, API build and mobile export pass. Production deployment dpl_F87NsbQVEkbisWzJ1VZqiXtt5RKD is READY. EAS preview group c52531f9-a177-4b82-b73b-533f7ef0b93c reached the realme. All four live assists, cached sheet/Reviewer reopen, offline cached reuse after force-stop/relaunch, uncached-offline guidance, canonical integrity and Quiz UI pass. Logs show exactly four successful generation requests and zero additional calls for cached reuse; no deployment error entries. See [acceptance](acceptance/b37/reviewer-study-assist-acceptance.md). Reviewer generation-quality review remains a separate user-guided milestone.

### B38.2.1 ribbon refinement (2026-09-26)

Delivered in the lab: soft ribbon-edge glow, three-color palette flow, local width/twist/bend changes and depth-tested bodies. Complete keeps moving slowly; Error/Reduced Motion freeze. Fresh tests 576/576, typecheck and lint pass with four existing warnings. [Physical follow-up evidence](acceptance/b38-2-1/ribbon-glow-refinement.md) records seven screenshots and a short UI-frame sample, not direct GL FPS. Still PARTIAL for glass-artifact approval; production is unchanged.

## B38.2.1 Knowledge Core visual prototype (2026-09-26)

**PARTIAL — development lab implemented and physically inspected; visual approval withheld.** Six states/four themes use true GL geometry. Successful completion decelerates into continuous movement; failure and Reduced Motion stop. Fresh mobile tests 574/574, typecheck and lint (0 errors, four existing warnings) pass. Device screenshots and short UI-frame/memory/thermal samples are recorded, with no direct GL FPS claim. Main gap: plastic-looking ribbon intersections and weak glass/refraction, especially UC coloration. Production generation and Queue are unchanged. See [acceptance](acceptance/b38-2-1/generation-core-prototype.md). Next: material/geometry refinement and repeat realme acceptance before integration.

## B38.2 physical-use repair (2026-09-25)

**PASS with limitations — Canvas sync, navigation, Reviewer navigation, course-first IA, motion and theme are repaired and physically accepted on the realme RMX3151.** Canvas sync had not run for six days. Durable jobs and credentials were healthy, but the only trigger was a buried legacy page, and every visible Refresh re-read stale rows. No account had ever synced submissions either, so Tasks counted submitted work as missing. Mobile now has one account-level sync (content + grades per selected course): it resumes on foreground, refreshes automatically when data is older than 6 hours, and shows a calm status line with Retry. Two latent defects were also fixed: stale idempotency-key replay and a lost-update race on job references. Announcement detail is a dismissible modal route; the old sheet re-selected the deep-linked announcement on every dismissal. Generate, Tasks and Library use one stack route per level, so header, Android and swipe back walk the hierarchy. Reviewers gain local find (highlights, count, previous/next) and a right-edge topic scrubber that activates only on a still hold. Also delivered: course-first Tasks with real due/past-due/completed counts, a uniform Library course grid with an All/Reviewers/Quizzes/Activities control, and title-first shared course identity. Motion uses native hierarchy slides, modal rises and tab fades, with a Reduced Motion fallback. The free-time ring is calm and theme-accented. A labelled UC-inspired (not official) palette is available. Mobile-only: no API, schema or migration change. Fresh mobile 569/569, typecheck, and lint with 0 errors. Delivered as EAS preview update `7b04c8e2` at `2974ced`. Screen recording is NOT RUN (ROM lacks `screenrecord`); physical Reduced Motion is BLOCKED (settings writes denied). Frame timing (17% janky over transitions) needs a performance pass. See [B38.2 acceptance](acceptance/b38-2/physical-use-repair.md). Next: B39 Full E2E / Demo Acceptance.

## B38.1 production generation quality acceptance (2026-09-24)

**PASS — production generation quality is physically accepted.** Fresh CC16 Firewalls PDF Reviewer and five-question Quiz, CC17 Android Platform PPTX Reviewer, and CC17 Android Versions Activity Output were inspected against their real instructional/assignment sources on the realme RMX3151. All material fidelity, coverage, answer correctness, distractor quality, presentation, Queue/background, Library, and relaunch gates passed. The PPTX run first exposed a real `request_exceeds_context_budget` blocker: the response schema duplicated every long source block ID in an enum before provider execution. Commit `1d992aa` bounds the provider schema while retaining exact local source-reference validation; focused regression 30/30 and the full suite pass. READY production deployment `dpl_EBwoR9gdNTvWBTMdezJD1ydqDXdk` completed the 32-topic PPTX retest on `gpt-5.4-2026-03-05`; health is 200 and post-deploy logs are clean. See [B38.1 report](acceptance/b38-1/production-generation-quality-acceptance.md). Next: B39 Full E2E / Demo Acceptance.

## B38.0 Generate course state and material loading repair (2026-09-24)

**PASS — blocking Generate repair complete; B38 quality acceptance may begin.** The root cause was the course sync state plus error-state handling: the Generate list read raw discovered courses with an upsert timestamp shown as "Synced", and the service mapped the unselected-course gate to 503. The repair reuses `loadCanvasCourseInventory` (with a read-only stored fallback), orders current → previous → other with synced first, routes by sync state on mobile, maps the gate to `409 course_not_synced`, and uses truthful empty-state copy. Production deploy `dpl_BB4Zf1kh2cBmiyKn8733USYzkJCZ` and EAS preview update `d288a6ea` are live. Physical acceptance covered the grouped list, HIST 100 → Sync with no materials request, current and previous synced courses → materials, CIT6 empty state, and offline error → retry. Failed/incomplete sync has automated coverage only, because no real course is in that state. Pre-existing eligibility quirks (a schedule PDF, "Homepage" navigation Pages, an xlsx labelled as a document) are recorded but not changed. See [B38.0 report](acceptance/b38-0/generate-course-state-and-material-repair.md). Next: B38 Production Generation Quality Acceptance.

## B37.1 production migration and runtime closure (2026-09-24)

**PASS — production and physical acceptance are complete.** Remote migration aliases were normalized only after stored-SQL/schema proof, then the canonical migration and the narrowly scoped authenticated SELECT-grant follow-up were applied. The corrected Vercel deployment is READY. On signed Android, the exact canonical Reviewer gate enabled eligible material and blocked ineligible material; Queue creation remained at zero until explicit confirmation, after which exactly one durable Quiz job/result/Quiz completed from the persisted Reviewer version. The Quiz cold-reopened offline from SQLite. Canonical Reviewer management populated, a disposable Reviewer renamed/deleted without resurrection, and a Quiz-backed Reviewer correctly returned `reviewer_has_quizzes`. All fresh gates pass. See [B37 report](acceptance/b37/generated-artifact-convergence.md). Next: B38 Generation Quality Acceptance, including the large-PPTX `request_exceeds_context_budget` investigation.

## B37 generated artifact model convergence (2026-09-23)

**PARTIAL — implementation and local verification are complete; production rollout/acceptance is unresolved.** Canonical `generated_artifacts` IDs now flow through Quiz availability, `reviewerArtifactId` DTOs, owner/type/current-version checks, durable jobs, persisted Reviewer source assembly, Quiz persistence, Library relationships, saved-Reviewer management, source status, soft deletion, and B35 local removal. Existing legacy-linked Quizzes remain readable. Deletion is denied when canonical dependent Quizzes exist. Queue mount no longer accepts billable work; explicit confirmation is single-flight and accepted intents reopen without resubmission. Fresh full gates pass: typecheck/lint 7/7, mobile 508/508, API 886 passed/3 opt-in skipped, Canvas 73/73, shared 44/44, local Postgres migration tests, DB/API build, mobile export, and lockfile dry-run. Production migration/deployment/smoke were not performed because the documented remote migration-history mismatch remains unresolved and no safe Supabase credential/dashboard path was available. See [B37 report](acceptance/b37/generated-artifact-convergence.md). Next: controlled production migration and B37 smoke, then B38 Generation Quality Acceptance with large-PPTX `request_exceeds_context_budget` investigation.

## B36 signed physical UX + offline acceptance (2026-09-23)

**PARTIAL — physical validation completed with unresolved defects.** Signed preview builds `0dc19cdd` (`f88b0c2`) and `245ccaec` (`1e81edd`) were installed on the realme RMX3151; both contain `libexpo-sqlite.so` and the signing identity is unchanged. Passing physically: authentication and session persistence, Generate synced-course browsing with real Canvas data, Reviewer hierarchy across Accounting, Japanese/FL100, and a newly generated CC17 Reviewer, the replacement generation visual holding position across a real one-line-to-two-line status change, Library tap/swipe/indicator/cards, Today handle geometry and drag, relaunch from the device store, full offline reading of all three artifact types with the Quiz correctly read-only, reconnect without duplicates, measured motion (11.4% janky over 289 frames, GPU 8ms), and reduced motion. Repaired and rebuilt: corner clipping on `RowLink inset` rows given a `padding: 0` Surface, and a Library tab row hardcoded wider than the content area. Blocked: Quiz generation and Reviewer deletion, both because the Quiz gate, quiz source resolution, and Reviewer management still read the retired `reviewers` table (0 rows) while artifacts live in `generated_artifacts` (48 rows) — a migration-level fix, out of bounded repair scope. Quiz and Activity Output were not generated during B36, though their persistence and offline behaviour were verified against real artifacts. No second account exists for cross-account isolation. All automated gates pass. See [B36 report](acceptance/b36/signed-physical-offline-acceptance.md). Next: B37 Generation Quality Acceptance.

## B35 on-device artifact persistence (2026-09-22)

**PASS — local persistence and the local-first Library are implemented and verified.** expo-sqlite `~16.0.10` backs an owner-scoped, `user_version`-migrated store of canonical Library ids with summaries and typed detail bodies. The completed-generation write path is GenerationScreen → server `artifactId` → cloud detail → idempotent upsert; queued, running, failed, and cancelled jobs are never stored. The Library renders SQLite first, reconciles pages and up to 20 bodies per refresh, and keeps the B34 pager/tabs/cards. Sign-out purges the owner's rows. Tests use real SQLite and cover all 15 required areas; mutation checks confirmed the owner-isolation and older-copy guards. Fresh forced typecheck/lint 7/7 (4 pre-existing warnings), mobile 505/505, API 895/3 skipped, Canvas 73/73, shared 44/44, mobile export, and DB/API builds pass. No device was attached. See [B35 report](acceptance/b35/on-device-artifact-persistence.md). Next: B36 Signed Physical UX + Offline Acceptance on a new signed native build.

## B34 current mobile UX repair (2026-09-21)

**PARTIAL — implementation and automated verification are complete; changed-build authenticated physical acceptance remains.** Generate is now a synchronized-course browser with exact persisted Reviewer→Quiz dependency, Reviewer rendering has semantic study hierarchy and normalized duplicate-heading suppression, the orb was replaced with a low-overhead native-driven study field whose position is independent of status text, Library is a native horizontal pager with an interpolated rounded indicator and structural loading, Today handles fully cover the track with aligned 56-point targets, and shared motion tokens/press feedback respect reduced motion. Fresh mobile 456/456, API 895 passed / 3 skipped, Canvas 73/73, shared 44/44, forced 7-workspace typecheck/lint, mobile export, and isolated DB/API production builds pass; four unrelated pre-existing lint warnings remain. ADB confirms realme RMX3151 / Android 13 and the changed local bundle loads, but Expo Go cannot reuse the signed app session and EAS upload needs explicit approval. See [B34 report](acceptance/b34/current-mobile-ux-repair.md). Next: finish B34 signed physical checks, then B35 Physical UX Acceptance.

## B33 student-material ingestion closure audit (2026-09-21)

**PASS — supported student-material ingestion matrix is closed.** B31 already proved real Student-accessible Canvas Page, text PDF, DOCX, and PPTX through production Reviewer generation, Queue, Android rendering, and Library reopen; B32 proved the 16-page scanned-PDF durable OCR path. B33 found no remaining format blocker and did not repeat those live jobs. One reproducible B26 boundary defect was fixed: Tasks now includes Canvas assignments only when deadline-bearing and/or submittable, while Generate continues to exclude assignments, announcements, administrative modules, and ungrouped image artwork. JPEG direct-import production acceptance and shared PNG/JPEG implementation remain valid; positive Canvas image discovery is still naturally fixture/permission-limited and non-blocking. Fresh API 894 passed / 3 skipped, engine 606/606, Canvas 73/73, focused ingestion/failure safety 152/152, API/engine typechecks, and DB/API production build pass. See [B33 acceptance](acceptance/b33/student-material-ingestion-closure-audit.md). Next: B34 generation quality acceptance.

## B32 scanned-PDF runtime reliability (2026-09-20)

**PASS — the real 16-page zero-native-text Accounting PDF now completes production Reviewer generation durably and reopens on physical Android.** B32 moved scanned Canvas PDF download, page inspection, OCR, source attachment, and reviewer context creation out of the synchronous request and into checkpointed Vercel Workflow steps. Production deployment `dpl_EekcdmCmpfdoobvYouekuXrUmMEd` is READY and healthy. Fresh job `a85bd672-2aed-401b-a37e-fd1c794d826f` inspected all 16 pages, OCRed four chunks, attached 6,757 ordered source characters, completed AI generation, appeared in Queue as completed, rendered as `Reviewer in Journaling and Basic Accounting`, and reopened from Library after app force-stop/relaunch. Full API and engine regressions pass. Direct service-role DB metadata inspection was unavailable because the local Vercel environment pull returned secret references rather than decrypted Supabase values. See [B32 acceptance](acceptance/b32/scanned-pdf-runtime-reliability-acceptance.md). Next: B34 generation quality acceptance, unless B33 format hardening is reopened by a new DOCX/PPTX defect.

## B31 student-accessible Canvas material acceptance (2026-09-19)

**PARTIAL — real Student-accessible Canvas text PDF, DOCX, PPTX, and Page paths completed fresh production Reviewers and Android persistence/reopen.** FL 100 and CIT5 were added as concluded-course selections without Canvas mutation. Production exposed an administrative `Module 0: Course Information Module` routing defect; the exact-label guard and regression were deployed in READY `dpl_DKat3ypp6q4V5UETSKuDbJjLymcK`, after which the eight administrative items disappeared while lesson materials remained. The 16-page Accounting scan now prepares to `PDF · ready` but two generation submissions OOM before durable job creation. Safe student/log surfaces do not expose every requested internal provenance/validation field, and no eligible instructional image exists. See [B31 acceptance](acceptance/b31/student-accessible-canvas-material-production-acceptance.md). Next: B32 scanned-PDF reliability.

## B30 Canvas instructional-image production acceptance (2026-09-19)

**PARTIAL / CLOSED WITH PLATFORM LIMITATION — the B29 routing guard is deployed and negative production acceptance passes.** Deployment `dpl_3LCFzi9ao68Upsiir8GFL1kroX82` is READY, healthy, and serves the canonical production alias. Four fresh Android-triggered Canvas sync jobs succeeded. Physical Generate checks kept CC16 `APA Sample.png` under `General Information` and five ungrouped CC13 logos/banner/profile images excluded; Announcements and Tasks remained separate. The Student account cannot author the positive direct-module fixture. Teacher/Designer cooperation and sandbox access will not be pursued; automated routing coverage remains the evidence unless a suitable student-accessible image occurs naturally. See [B30 acceptance](acceptance/b30/canvas-instructional-image-production-acceptance.md). Next: B31 student-accessible Canvas material acceptance.

## B29 live OCR and learning-image acceptance (2026-09-19)

**PARTIAL — live OCR and OCR-derived generation are accepted, while production Canvas image discovery remains unavailable.** On the authenticated realme, a real one-page zero-native-text Hiragana course scan invoked Google Vision for 1/1 page, produced 688 characters, completed a fresh six-section Reviewer, and reopened from Library. A real Piaget instructional JPEG similarly produced 965 characters and a persisted six-section Reviewer. The synchronized Canvas account has no eligible direct-module teaching image outside administrative content, so Canvas image acceptance is `NOT EXERCISED`. Routing now requires direct module placement for images, excluding ungrouped logos/banners/profile imagery while retaining teaching images; all focused tests and the isolated API build pass. A 16-page 8.1 MB scan stalled before OCR and was cancelled safely. See [B29 acceptance](acceptance/b29/live-ocr-learning-image-acceptance.md). Next: bounded B30 production acceptance with one consented direct-module Canvas instructional image.

## B28 ingestion coverage and document-format acceptance (2026-09-19)

**PARTIAL — fresh real Canvas PDF, PPTX, and Page Reviewer ingestion is accepted; scanned PDF, instructional image OCR, and Canvas DOCX need live evidence.** The authenticated realme generated and reopened three new Reviewers from CC16 Firewalls PDF (33 pages, 7,984 characters), CC17 Android Platform PPTX (39 slide markers, 9,873 characters), and CC13 Fact Gathering Methods Page (8,227 characters). Owner-linked source versions, provenance snapshots, result records, and artifacts were confirmed read-only. Local DOCX extraction worked; no Canvas DOCX learning file exists in the synchronized account. Full relevant tests pass, and the root build reaches the known local `expo-router` junction problem; isolated API build passes. No production repair or migration was needed. See [B28 acceptance](acceptance/b28/ingestion-document-format-acceptance.md). Next: bounded B29 live scanned-PDF/instructional-image OCR acceptance and image discoverability decision.

## B27 student-facing Canvas announcements (2026-09-18)

**PASS — B27 student-facing Canvas announcements are deployed and physically accepted.** The author/attachment migration is applied, production deployment `dpl_BXWY9fC2L59bzJnPscspMdKLZHpT` is READY and healthy, and a signed B27 APK retained the authenticated realme session. Fresh Canvas sync populated CC17 author metadata; physical Today, list, details, native HTML readability, Canvas handoff, and Generate/Tasks separation passed. Links and attachments had no live source example. The remote migration-history version differs from the local filename and needs reconciliation before a future CLI push; the applied schema is verified. See [B27.1 acceptance](acceptance/b27/student-facing-announcements.md). Next: B28 ingestion coverage and document-format acceptance.

## B26.1 deployed Canvas routing and Activity reliability acceptance (2026-09-18)

**PASS — B26 Canvas routing and Activity reliability acceptance is complete. B27 may begin.** Production deployment `dpl_GKBaGect3Gvh4Nq6w7Ny8HzYVz7v` is READY and healthy. On the standalone realme app, lesson Pages/PDF/PPTX stayed in Generate, assignments stayed in Tasks, and the retained CIT6 orientation PDF stayed excluded before and after normal Canvas sync. Five completed fresh Activity types preserved every prewritten mandatory requirement after two generic prompt repairs; a sixth stopped consistently before provider execution because its referenced Group Announcement/scenario was unavailable. Personal details now remain explicit editable placeholders. Full package, contract, typecheck, lint, API-build, deployment-health, and physical gates pass; the known local Expo external-link limitation remains. See [B26.1 acceptance](acceptance/b26.1/deployed-routing-and-activity-reliability.md). Next: B27.

## B25.3.4 standalone and AI-first production acceptance (2026-09-17)

**PASS — B25 is complete; B26 may begin.** The existing repaired APK installed data-preservingly and ran standalone on the realme RMX3151. Authenticated Canvas access, fresh AI-first Reviewer/Quiz/Activity generations, server Quiz scoring, and all three Library reopens plus Queue after cold relaunch passed. Production health/401 security checks and fresh mobile regressions pass. See [B25.3.4 acceptance](acceptance/b25.3.4/device-standalone-ai-first-acceptance.md). Next: B26 generation-quality evaluation across multiple real Reviewer materials and Activity assignment types. Earlier PARTIAL entries remain historical.

## B25.4 physical-device acceptance (2026-09-16)

The signed-in realme completed a production-API Reviewer from the real CIT6 PDF, an exact five-question Quiz with a persisted 5/5 server-scored result, and a CC16 Learning Contract Activity matching its four-by-five complete-sentence instruction. Queue and Library reopened the new records. A malformed local admission cache was repaired in `9bdc03e` and physically retested via Expo Go; all post-fix regression gates pass. A patched preview APK still needs installation/retest before B25 can close. **PARTIAL — B26 may not begin.** See [B25.4 device checkpoint](acceptance/b25.3.3/device-acceptance.md).

## B25.3.3 AI-first generator migration (2026-09-16)

Real-material comparison is complete. Reviewer routes/worker/Workflow, whole-set Quiz and Activity now use the shared coherent-context/AI/thin-contract boundary. Legacy Quiz and Activity semantic planners and the duplicate Reviewer Workflow pipeline are removed. Full deterministic regression, typecheck, lint and build pass. Production 09835be / dpl_9yAtq2sy2YYRfYjoqytHCL6aWUa4 is READY and healthy. Physical acceptance is blocked on direct device sign-in and Activity assignment selection; B25 remains PARTIAL and B26 may not begin. See docs/ai/acceptance/b25.3.3/architecture-simplification.md and the accepted ADR.

## B25.3.2 candidate convergence (2026-09-15)

Commit `79e54dd` adds source-compatible blueprints, two-candidate pools, deterministic selection, cumulative semantic-intent exclusions and v4 durable call bounds. Strict quality, secrecy, ownership and exact-count gates remain. Focused Quiz 117; full Quiz 168 passed / 3 skipped; API 944, Mobile 481, Canvas 73, Engine 606, OCR 27, Shared 44; Workflow 1, provider contract 18; fresh root typecheck/lint/build 7/7 each. One live fixture passed 5/5 in 63.331 seconds with two author/two verifier calls and 14 candidates. Deployment `dpl_peVBgRctKVmGTfkNfQqTev74QCda` is READY and canonical health is OK.

The single authenticated production attempt on the unchanged real lecture failed: job `d038e85b-ae03-4853-aa2a-f663037415b0`, Workflow `wrun_01M2J4TSMPMWB6SPQXW8F0CTH0`, 4/5 accepted, q3 pending, `repair_exhausted` / `bounded_repair_attempts_exhausted` / `quiz_generation_failed`. Eighteen candidates and four author/four verifier batches; no Quiz persisted and no retry submitted. q1/q4 accepted second alternatives; q5 converged after a new intent; q3 failed even with alternate support. The realme showed the Generation failure and opened Queue; Library/attempt/secrecy/score/result/reopen remain unaccepted.

B25.3.3 should preserve source context and precise evidence ownership, select supports with enough evidence for meaningful distractors, and plan full-set concept/difficulty feasibility before immutable acceptance. **PARTIAL — Quiz semantic convergence remains incomplete.** B26 may not begin. See [B25.3.2 report](acceptance/b25.3.2/quiz-candidate-convergence.md).


## B25.3.1 real-material Quiz semantic convergence (2026-09-15)

Finding-specific structured feedback, direct correction, full same-support reauthoring, alternate unused support, source-affordance difficulty planning, immutable accepted questions, and explicit academic-value examples are implemented in `bd5eb15`. Fresh package/root gates and the final bounded synthetic-live validation pass. Production deployment `dpl_3UxRUwZDy5iGgkX1j8HnLpJBqpnD` is `READY` and its canonical health endpoint is green.

The only authorized authenticated real-lecture retest still ended `repair_exhausted`: 1/5 accepted and four slots pending after the alternate-support phase. No complete Quiz persisted, so Library/take/submit/score/result/reopen remain unaccepted. **PARTIAL — Quiz semantic convergence remains incomplete.** No validation was weakened, no production retry occurred, and B26 was not started. See [B25.3.1 report](acceptance/b25.3.1/quiz-semantic-convergence.md).

## B25.2.1 Generation orb animation repair (2026-09-14)

The Generation orb now uses independently animated halo, deforming body, spectrum wash, highlights and orbital light rather than moving one static SVG composition. Press/hold compresses and brightens it; tap pulses; blur, background, terminal state and unmount stop the native-driven loops; reduced motion holds a stable phase.

Fresh verification: Mobile 481 tests in 40 files, mobile typecheck and lint passed. Physical realme RMX3151 profiling recorded 0.51% janky frames with 14 ms p99 over 1,177 frames, no temperature rise, and one frame over 10 seconds after navigating away. **PASS — the focused orb repair is accepted; B25's separate Quiz-generation acceptance remains PARTIAL and B26 was not started.** See [B25.2.1 report](acceptance/b25.2.1/generation-orb-repair.md).

## B25.2 core UI visual repair (2026-09-14)

Implemented compact shared controls/surfaces, quieter bottom navigation, detailed Today ring, material/task/artifact rows, compact Queue and a layered Generation orb. Three screenshot cycles preserve the accepted fixture data; final reference comparisons and a real bottom-navigator web preview are saved for human review.

Fresh verification: mobile 477 tests; mobile typecheck; forced root typecheck, lint and build all 7/7 with zero cached tasks. Sixteen browser interaction checks passed. Backend behavior and unrelated persistence/workflow changes are preserved.

PARTIAL — implementation improved but visual convergence still requires work. The orb remains more geometric than the reference; populated Today and native typography/motion remain unverified because the connected realme is locked. No B25.1 or B26 work starts automatically. See [B25.2 report](acceptance/b25.2/final-comparison-v2.md). This status supersedes the earlier B25 next-step guidance below.

## B25 mobile redesign foundation (2026-09-13)

Implemented the Today / Generate / Tasks / Library shell, shared light/dark/system themes, interactive day-ring planner entry, hidden durable Generation/Queue, Canvas material actions, Activity Maker entry and saved-artifact consumption. Existing deep functionality remains reachable. No production AI model, schema or planner changes.

Automated verification is passing; physical acceptance is pending because the connected realme remains locked. Component-only dark/light renders were compared with the approved references. Hosted B24.6/B24.7 rollout is not certified by this mobile work. B25 is PARTIAL until authenticated device validation is completed; then proceed to B26 deep screens and advanced animation polish. See [B25 acceptance](acceptance/b25/ui-redesign-foundation.md).


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
See [B24.5 contract](acceptance/b24-5/backend-ui-contract.md) and [verification](acceptance/b24-5/verification.md).


## B23 mobile recovery foundation — current result (2026-09-12)

**PASS — B23 mobile recovery foundation proven; ready for B24 full UX/UI redesign.** Minimal SecureStore state binds the authenticated owner, Canvas source, idempotency request, accepted job, and immutable snapshot without storing source or generated content. Exact-job polling resumes after backgrounding, process recreation, and transient network failure; a unique owner/snapshot database contract makes automatic Library persistence replay-safe. Physical Android acceptance proved the running-job recovery path, large-text reachability, save, and reopen, while production counts showed two intentional jobs and one Reviewer for each of two distinct snapshots. Fresh Canvas 73/73, API 626/626, mobile 411/411, engine 606/606, and root gates pass. See [B23 acceptance](acceptance/b23/mobile-recovery-foundation.md). Earlier entries below are historical.

B23 establishes accessibility/recovery behavior contracts only. Final UI accessibility and visual polish will be performed against the redesigned interface during B25–B28.

Next: B24 — Complete Stay Focused V2 mobile UX/UI redesign specification, followed by B25 — Design system + app shell implementation, B26 — Core experience redesign, B27 — Remaining application redesign, and B28 — Full design QA + pilot freeze.

## B22 mobile Canvas-to-Reviewer workflow — current result (2026-09-12)

**PASS — B22 mobile Canvas-to-Reviewer study workflow is proven end-to-end on physical Android.** The mobile flow now leads with course/module/material context, keeps Ready/Prepare/unsupported/empty states understandable, turns default source resolution and durable job submission into one Create Reviewer action, shows coarse progress, and auto-saves against the immutable Canvas snapshot. A fresh production job from the real 23-page CIT6 PDF produced a grounded 20-section Reviewer (coverage/grounding 1.00, zero issues, leakage passed), rendered on the realme Android 13 phone, appeared in Study Library, and reopened without regeneration. Real CC17 PPTX and CIT6 empty rows remained visible and disabled. Fresh Canvas 73/73, API 626/626, mobile 389/389, engine 606/606, and root gates pass. B22 required no API or schema deployment; production health is green. Next: scope B23 separately. See [B22 acceptance](acceptance/b22/mobile-canvas-study-workflow.md). Earlier entries below are historical.

## B21.1 Canvas learner-material production acceptance — current result (2026-09-11)

**PASS — B21 Canvas learner-material ingestion is proven end-to-end on physical Android.** Fresh production syncs of the three selected courses persisted exact module resources despite broad Files/Pages failures. Two database contract mismatches found live were minimally migrated and regression-covered. A genuine 23-page CIT6 Canvas PDF was prepared from its module, extracted into 23/23 native-text blocks, generated by the durable production workflow into a grounded 20-section Reviewer with 1.00 coverage/grounding and passed leakage, rendered on a physical realme Android 13 phone, saved, and reopened from Study Library. Fresh Canvas 73/73, API 626/626, mobile 377/377, and engine 606/606 pass; production health is HTTP 200. PPTX/DOCX stay safely unsupported and broad Canvas permissions remain partial warnings. Next: begin B22 only under a new scope. See [B21.1 acceptance](acceptance/b21/canvas-learner-material-ingestion.md). Earlier entries below are historical.

## B20 real mobile Reviewer E2E — current result (2026-09-10)

**PASS — B20 real mobile Reviewer end-to-end validation passed for real PDF upload.** A physical realme RMX3151 / Android 13 completed cold launch/session restoration, real 15-page and 55-page learner-PDF intake, durable authenticated production jobs, Reviewer completion/rendering, save, and Library reopen. Missing-token, owner-filtered invalid-source, rapid-double-tap, and recoverable network-failure checks passed. Fresh mobile 376/376, Reader 32/32, API 607/607, engine 606/606, architecture 157/157, Expo config, and forced root gates pass; four existing lint warnings remain. **YES — MOBILE REVIEWER DEMO FLOW READY for PDF upload.** Canvas-backed learner-material selection remains unvalidated: fresh syncs of all three available courses were partial because Canvas denied Files and did not expose Pages, leaving announcements or no source; DOCX/PPTX parsing is not implemented. EAS preview APK build `58c631c6-ef35-4822-b634-c8c32eea064c` finished and passed standalone validation; [download the APK](https://expo.dev/artifacts/eas/HuRRjoOyl-ew_PDWGXUZcwOQ2hsHVV9fv9njifiRuQk.apk). Next: Canvas learner-material access and ingestion validation. See [B20 acceptance](acceptance/b20/mobile-reviewer-e2e-validation.md). Earlier entries below are historical.

## B19.3 grouped-median repair — current result (2026-09-09)

**PASS — B19.3 grouped-median demo blocker cleared.** A deterministic display graph uses frozen source-member boundaries to separate definitions, formula components, objectives, captions and ordered tables while preserving every factual owner. Targeted live and full frozen B12 generation reruns pass all four routes: 533/533 targets, coverage 1.00, grounding 0.99/1.00/1.00/1.00, zero issues/omissions/fabrication/retries/fallback and automatic usefulness PASS. Grouped-median manual usefulness PASS; other cases have no new regression, with their explicitly pre-existing non-blocking presentation and cache limitations retained. This does not claim those historical strict polish failures are repaired. Fresh engine 606/606 (14 new regressions), architecture 157/157, reader 32/32, API 607/607, forced root typecheck/lint/build PASS; four existing lint warnings unchanged. Sources, plans, manifests, residuals, hashes and typed payloads match B19.2. Runtime model gpt-4o, parser default legacy and OCR/extraction unchanged; no push. **YES — REVIEWER DEMO BLOCKER CLEARED.** Next: real mobile end-to-end Reviewer validation. See [B19.3 acceptance](acceptance/b19-3/grouped-median-composite-repair.md). Earlier phase entries below are historical.

## B19.2 final presentation cleanup — current result (2026-09-09)

**FAIL — demo-blocking presentation defect remains.** Final live gpt-4o preserves 533/533 targets, grounding 0.99/1.00/1.00/1.00, zero omissions/fabrication/retries, and passing assembly. All four automatic usefulness checks now pass. Source-owned navigation edits, exact display deduplication, ordered-table ownership and conservative fragment repairs improve presentation; strict manual review still fails. The one pre-demo engine blocker is the MinerU grouped-median composite that mixes definitions, exercise text and table-heading fragments. Other remaining prose imperfections are non-blocking; frozen code/cell damage is not reconstructed. Full B12: NOT RUN — targeted prerequisites failed. **NO — DEMO BLOCKER REMAINS.** FRESH engine 592/592, architecture 143/143, reader 32/32, API 607/607, forced root typecheck/lint/build PASS; four existing lint warnings unchanged. Parser default legacy, production gpt-4o and OCR/extraction unchanged; no push. Next: repair only that grouped-median composite while preserving frozen source owners. Do not start general architecture work or another model comparison. See [B19.2 acceptance](acceptance/b19-2/final-presentation-demo-readiness.md). Earlier B16–B19.1 entries below remain historical evidence.

## B19.1 runtime-model escalation — current result (2026-09-08)

**FAIL — presentation defects are model-independent.** Frozen B19 runs on `gpt-5.6-terra` and `gpt-5.6-sol`, plus one Sol replication, preserved 533/533 targets, grounding, zero omissions/fabrication/retries, and passing assembly. Neither candidate materially removed Python source dumps/lecture wording/repetition or Statistics fragments/instructional presentation; Sol's isolated Accounting grammar repair reverted in replication. Production remains `gpt-4o`; OCR/extraction is unchanged and no document was re-extracted. Fresh engine 547/547, architecture 98/98, reader 32/32, API 607/607, and forced root typecheck/lint/build PASS. No push. See [B19.1 acceptance](acceptance/b19-1/runtime-model-escalation-demo-readiness.md).

## B19 local repair — current result (2026-09-08)

**FAIL — Reviewer source completeness/presentation defect remains.** Source-owned residual evidence restores both real Docling definitions without changing the 533 frozen targets, hashes, ownership, parser default legacy, or gpt-4o. All four cases now have zero omissions and pass assembly; all Statistics SOURCE_DUMP findings are resolved. Calls are 2/2/2/1, with zero factual/explanation retries or replacements. Python/MinerU/Docling still fail serialized automatic usefulness; all four fail manual quality for residual fragments/repetition/grammar. Full unchanged B12: NOT RUN — targeted prerequisites failed. FRESH engine 547/547, architecture 98/98, reader 32/32, API 607/607, and forced root typecheck/lint/build PASS. No push. See [B19 acceptance](acceptance/b19/source-span-ancestry-completeness.md).

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
See [B18 acceptance](acceptance/b18/composite-source-presentation-source-item-alignment.md).


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
See [B17 acceptance](acceptance/b17/reviewer-explanation-evidence-presentation.md).


Last refreshed: 2026-09-08, Asia/Manila.

## Previous objective result — B16.1 historical

B16.1 attempt 3 (2026-09-07) is FAIL with provider capacity AVAILABLE.
All four targeted cases ran through real `gpt-4o`; deterministic retention is
99/99, 232/232, 156/156 and 46/46 with zero factual retries or provider losses.
A captured generic prompt-contract regression now passes: concise source wording
is explicitly permitted under the unchanged lexical grounding rule. Python
improves to four calls, 10.383 s and two fallback explanations, but still fails
provider acceptance. Statistics MinerU/Docling remain withheld (two/four
grounding omissions; MinerU also structural noise). Accounting has one call,
5.824 s and automated PASS, but fragmentary prose/raw tables fail manual quality.
Full B12 is NOT RUN: targeted prerequisites failed. Fresh engine 476/476,
architecture 27/27 and API 607/607 pass. Next: reconcile the generic
explanation/evidence presentation contract with the existing validation rules
using captured failures. No B17, ownership/default/threshold change or push.
See `docs/ai/acceptance/b16/live-provider-runtime-validation.md`.

Historical B16 architecture baseline: the engine assembles every required manifest target deterministically
before provider work and restricts batched provider output to explanations.
The focused suite passes 26/26, the engine 475/475, and API 607/607. Provider-
owned required targets and factual retries are zero; non-standalone nodes use
zero calls. Live quality acceptance is unresolved because Python calls returned
OpenAI 429 `no credits remaining`. Its safe fallback preserved 99/99 targets
with zero loss/fabrication in 5.432 s and two initial batches, but Statistics,
Accounting, and full B12 were not run. Production remains `legacy`. See
`docs/ai/acceptance/b16/reviewer-deterministic-evidence-runtime.md`.

## B15 predecessor result

Reviewer B15 now distinguishes source-supported standalone sections from
structural, typed-evidence and unsupported nodes before generation. Exact
non-standalone representations retain titles, manifests and ownership while
making no provider or retry calls. Its new suite is 12/12 and the engine is
**449/449**, retaining B13 and B14. Fresh targeted acceptance still fails:
Python is withheld for instructional noise despite 99/99 target representation;
Statistics and Accounting remain withheld for provider omissions, with
Statistics also failing usefulness. Production remains `legacy`. See
`docs/ai/acceptance/b15/reviewer-section-planning.md`.

## B13 predecessor result

Reviewer B13 introduced stable required-evidence manifests, exact-target repair,
source-absent refusal and initial deterministic usefulness gates. Its 19/19
regressions remain frozen and green. B13 acceptance failed because provider
omissions, activity/source dumps and source-sparse explanations remained.

## B12 predecessor result

Reviewer Benchmark B12 completed the frozen three-source B8 workload through
hybrid parsing and the real durable job path. Verdict:
`FAIL — B12 exposed unresolved Reviewer acceptance defects`.

The run found and fixed one generic Stage 0 defect: non-legacy typed blocks
rehydrated from durable metadata were incorrectly expanded as legacy
presentation pages. The post-fix durable rerun restored Python's 13-section
typed plan. Python technically passes at 1.00 coverage/grounding, but manual
inspection still finds title-only explanations, activity leakage, and overly
source-like key-point lists. Statistics remains safely withheld for provider
omissions with both MinerU and Docling; Accounting remains safely withheld
because generated Ledger content omits a required exact source row. No visible
fabrication or unsupported relationship was accepted. Production remains
`legacy` by default.

## Completed predecessor

Reviewer Benchmark B11 is complete. Stages 1-6 now use B10's typed document
structure for concept hierarchy, evidence grouping, relationship grounding,
and objective student-visible assembly validation. The production parser
default and existing Google OCR-backed path remain unchanged.

## Completed scope

- Added generic multi-signal typed-heading roles, metadata/furniture demotion,
  same-parent repeated-heading consolidation, and child-evidence retention.
- Added plan-level typed evidence groups for formulas, tables, exact cells,
  code, and result statements with preserved structural provenance.
- Grounded formula raw text/parser LaTeX and exact table cells without allowing
  unstated calculations, range substrings, or algebraic transformations.
- Added objective Stage 6 diagnostics for furniture, duplicate/code/body titles,
  empty sections, structural noise, and evidence-based oversized sections.
- Added eight deterministic regression families and reran live Python Docling
  plus central-tendency Docling/MinerU generation through the B10 harness.

## Result

`PASS - TYPED REVIEWER HIERARCHY AND GROUNDING HARDENING ACCEPTED`

Python Docling now assembles 13 clean concepts at 1.00 coverage and grounding,
with no REVIEW/ACTIVITY/Examples furniture, partial-sentence/code/list titles,
or repeated numeric suffixes. Central-tendency grounding issues fall from 41
to 4 with Docling and from 40 to 2 with MinerU, with zero fabrication failures.
Both statistics arms remain correctly withheld for omissions or missing output
rather than inventing relationships. Typed accounting cells and numeric/OCR
provenance remain intact.

## B15 verification

- FRESH B15 regressions: 12/12; engine evaluations: 449/449, retaining all 437
  prior cases, including all B13 and B14 regressions.
- FRESH API tests: 607/607 across 69 files.
- Full typecheck, lint and builds pass; the acceptance report records fresh
  versus cached tasks. Lint retains only the four accepted mobile warnings.
- Fresh provider-backed targeted results: Python 1.00/1.00 with 99/99 required
  targets but usefulness failure; Statistics/MinerU 0.91/0.80 with 211/232;
  Statistics/Docling 0.97/0.81 with 152/156; Accounting 0.76/0.88 with 35/46.
  All four were safely withheld with zero fabrication failures.
- Full unchanged B12 rerun: NOT RUN because targeted prerequisites failed.
- Repository diff and object-integrity checks pass; only the two known
  dangling blobs remain.

## Next action

Restore provider capacity and rerun the B16 targeted order. Accept only after
successful explanations pass grounding, usefulness, manual quality, and
runtime, then run unchanged B12. Do not start a B17 benchmark patch.



## W2 mobile parity main integration (2026-10-11)

Owner-authorized scope: `push to main`. W1/W2 website is already on remote
main at `7ef5a61`; integrated only the four W2 mobile patches and their docs.
Mobile mainline commits: `f308faf`, `55b7cd0`, `815631d`, `dc018c8`.
**FRESH PASS:** web typecheck/lint, 82 tests; mobile typecheck/lint, 793 tests
with the four existing warnings. Main's task-refresh interval and unrelated
changes are preserved. Documentation conflicts combine existing integration
history and the parity report. Normal push targets `origin/main`, with remote
HEAD verification; no force push or manual deployment. All original dirty
checkouts remain untouched. Previous physical/viewport checks were not rerun.

## W2 mobile parity and fresh acceptance (2026-10-11)

**PASS locally; revised W2 scope including STEP 7 complete.** Reused and
freshly verified the existing website commits: web typecheck/lint, 79 tests,
25 page/viewport checks and browser interaction/theme checks pass. Mobile
commits `b87fe54`, `e1f5f3d`, `f42c43f`, `9ec9fa1` add Canvas grouping,
growing draft inputs plus keyboard avoidance, and both clear-day variants.
Fresh mobile typecheck/lint and 791 tests pass (four existing lint warnings).
Realme RMX3151 local-debug checks pass with isolated fictional data, including
the real keyboard and system Reduce Motion on/off in both themes. Original
device settings restored; unrelated mobile docs/design changes preserved.
See the appended W2 mobile parity handoff for limits, files and evidence.
No API change, push or deployment. Next: owner laptop/fullscreen review;
separately scheduled estimator/sync-automation prompts remain outside W2.

## W1/W2 main integration (2026-10-11)

Finite owner instruction: `push to main w1 w2`. W1/W2 tip `c05634f` is merged
with main `6319376` in `integration/w1-w2-main-20261011`. Conflicts preserve
main's canonical planner/Tasks data, content+grades refresh and capstone
terminology, adding W1 Done/shared free time and W2 layouts/search/editor.
FRESH PASS: web 82/82 tests, focused API 171/171 tests, root typecheck and
lint/build 8/8 each, zero cached. Browser acceptance
passes 25 page/viewport checks, 10 theme captures, four desktop pages,
Canvas selection/sync and draft guards/persistence, plus unlinked paper Done.
Evidence is fictional and ignored under the integration checkout's
`tmp/w2-screens/`; earlier signed-in W1 evidence remains historical. The
dirty main checkout and unrelated website files are preserved. The earlier
local-only W1/W2 checkpoints below are superseded by this integration.

## W2 website desktop layout (2026-10-11)

**PASS locally; finite W2 scope complete.** W1 commits are retained in the
isolated website checkout. Shell/clock sizing, uniform Library cards, Canvas
search/grouping, desktop draft outline/auto-growing textareas and clear-day
illustrations are implemented. Fresh web typecheck/lint and 79/79 tests pass;
25 requested page/viewport checks, both Today themes and browser interaction
flows pass using isolated fictional API/Auth fixtures. Final implementation
tip: `14b12c4`; per-step commits and adaptations are in the appended W2
handoff. Screenshots/report: ignored `tmp/w2-screens/`. Unrelated files remain
untouched. No push or deployment. Next: owner laptop/fullscreen review, then
content-based estimates, grade estimator and sync automation when scheduled.

## W1 Today/Schedule alignment and submitted-work filtering (2026-10-11)

**PASS locally and against the signed-in real account.** Finite owner scope:
shared planner submission filtering, Done from Tasks/Overdue/Schedule, shared
free time, unsaved-plan labels, and today's schedule alignment. Implementation
commits `de3e99c`, `9d2ef46`, `1343428`; fresh API typecheck and 32 task-planning
tests, web typecheck/lint and 79 tests pass. All six STEP 6 checks passed;
temporary saved sessions/plan metadata and free-time/lock settings were
restored. The 5 Why Analysis is intentionally completed. Original unrelated
dirty files and website evidence directories are untouched. No push or
deployment. See the appended W1 handoff for evidence and prompt adaptations.
Next separately scoped work: W2 website desktop/16:9 layout, Library grid,
Canvas course search, draft editor. Estimates, grade estimator, generation on
sync and inactivity gating were not started.

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
[completion evidence](acceptance/website-completion-20261008.md).

## Website production deployment (2026-10-08)

Owner-authorized: the V2 website replaces retired V1 on
`https://stay-focused-ten.vercel.app` (Vercel project `stay-focused`). The
project now builds `galaxymaxp/stay-focused-v2` from `apps/web`, and pushes to
`website/functional-v1` deploy production automatically. It uses the shared V2
Supabase project and the existing API (`stay-focused-v2-prototype`) through the
same-origin rewrite. Owner enabled web generation and Google/Microsoft sign-in;
V1 server secrets were removed from the project.

Shipped with it: V1-style desktop shell (sidebar, breadcrumbs, full-width
layout), Today with a right rail, side-by-side course materials, and motion
mirroring the mobile tokens. FRESH: web typecheck/lint/tests, both isolated
browser runs, production build, and live checks (API proxy 200/401, anon key
for the V2 project). NOT RUN: authenticated live use by the owner, live
generation and OAuth round trips. Preview deployments have no Supabase key
(`NEXT_SUPABASE_ANON_KEY` is production-only), and `main` now includes `apps/web`; preview authentication remains unconfigured.

## Website V1.1 orb parity (2026-10-08)

Owner-authorized scope: port the authoritative mobile WebGL orb, verify visual
and behavioral parity, preserve the functional website and commit scoped work
on `website/functional-v1`. Investigation at `6a8032a` found that the actual
mobile Generation route uses Animated plus layered SVG, with no WebGL renderer
or shaders in the inspected local sources. **BLOCKED** pending the actual
WebGL source location or owner resolution of that rendering requirement. No
replacement orb or runtime change was made. See [orb parity report](acceptance/website-orb-parity.md)
for source mapping, baseline verification and remaining differences. Existing
V1 historical findings remain below; B25.3.3 stays paused and incomplete. No
production deployment, provider call, schema or generation-engine change.

## Website V1 owner-approved scope (2026-10-08)

The owner prioritizes functional website implementation immediately. B25.3.3
production compatibility investigation is paused; its PARTIAL/BLOCKED verdict,
reports, repairs, and blockers remain preserved and it is not complete. This
instruction supersedes earlier web exclusions for the finite website scope only.

Endpoint: implement and locally verify the nine requested browser surfaces in
`apps/web` over existing Supabase identity and shared API/workflows, record exact
blockers, and commit scoped changes on `website/functional-v1`. No production
deployments, migrations/data writes, PR #1 edits, or paid generation requests.
See `docs/ai/acceptance/website-v1.md` and ADR-019 for the acceptance matrix.

Task order: W1 auth/shell/Today; W2 tasks/calendar; W3 Canvas/generation/queue;
W4 Library/Reviewer/Quiz/settings; W5 browser, regression and root verification.
Continue independent work when live acceptance is blocked. Current result:
LOCALLY VERIFIED; W1-W4 functional client implementations and W5 browser,
visual, regression and fresh root TypeScript/lint/build checks pass. Live
acceptance remains PARTIAL/BLOCKED: dedicated non-production Supabase/API and
Canvas test access, plus a separate paid-generation allowance, are not established.
Generation is disabled by default. Run instructions are in `apps/web/README.md`.
Historical sections below are retained.

## Urgent Canvas notification system (2026-10-03)

**PARTIAL: implemented locally; activation pending.** Protected metadata polling, database event deduplication and due revisions, durable Resend delivery, submission/completion suppression, and persistent per-type Settings controls are complete. Forward migration `20261003025905` has local Postgres/RLS verification. Production lacks `CRON_SECRET`, `RESEND_API_KEY`, and `RESEND_FROM_EMAIL`; sender verification, rollout, developer-only live/physical acceptance, workload measurement, and enabling one Google Cloud Scheduler job remain. No production migration, deployment, Scheduler job, or real email was performed. [Architecture/runbook](../architecture/canvas-email-notifications.md).
