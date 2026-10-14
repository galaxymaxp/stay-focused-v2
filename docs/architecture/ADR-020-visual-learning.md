# ADR-020: Visual Learning uses accepted source pages and extracted figures

Date: 2026-10-13

Status: Accepted for local implementation; production rollout and device acceptance pending.

## Decision

Phase 1 shows a page of the exact accepted, unedited **standalone Canvas PDF**
behind a reviewer topic. Resolve its persisted section `sourceBlockIds` through
`source_versions.metadata.reviewerSourceBlocks[].pageNumber` and choose the
lowest cited page. The canonical source version's `reviewerSourceSnapshotId`
binds the owned Canvas snapshot and its single `file` / `pdf` item. A missing
or ambiguous citation fails safely. No title inference or approximate text match.

Both manual Generate and AG1/AG2 automatic admission use the repaired deferred
PDF path. [The VL1.1b preflight](../ai/acceptance/vl1/preflight.md) records each
persisted link and the native rendering experiment. [ADR-021](ADR-021-canvas-source-provenance-retention.md)
describes accepted-revision retention. Every original-PDF lookup uses
`resolveSnapshotPdfObject`; a missing original returns
`source_revision_unavailable`, even if a cached image exists. A newer revision
is never substituted.

## Phase 1b: local-upload PDFs, respect the delete (VL1.2)

[The original VL1 STOP](../ai/handoff.md#vl1-unattended-source-page-snapshots-2026-10-13)
identified a missing canonical local page-block link. VL0c repaired that link
on new accepted children; job metadata alone remains insufficient for saved
reviewer reads. VL1.2 now allows `sourceType: local_file`, `mimeType: application/pdf`,
`pageProvenance: extracted` and strictly valid, unique `page-N` blocks. Every
accepted child uses `revision_kind: user_edited`, including unchanged accepts;
local eligibility follows provenance and exact normalized-parent text hash,
asset and extraction bindings instead of interpreting that literal as a text edit.
No backfill or newer-revision substitution is performed.

The resolver reads the exact owned accepted version, normalized parent,
extraction result and `document_assets` row. It requires an available PDF asset,
null `deleted_at`, the private `processing-job-sources` bucket and owner-prefixed
`storage_object_path`, then checks Storage existence. The worker checks the
stored byte size and PDF SHA-256 when present. Legacy null hashes retain exact
asset/owner/size identity. Original locators remain server-only.

Fely's 2026-10-13 option 1 decision is **respect the delete**. Deletion, including
`preserve_artifacts`, immediately makes previews unavailable even during the
existing seven-day byte-cleanup grace. Cleanup's missing object also makes them
unavailable; a cached image cannot bypass this check. Deletion/cleanup code and
retention are unchanged. Return `source_revision_unavailable` plus the resolved
cited page so mobile keeps **From page n** and **Page preview unavailable** as
quiet text, with no image/button. Missing bytes during work become terminal
unavailable; deletion is rechecked before upload and fenced at completion.

Edited/unavailable/old local revisions, camera/image/text imports, PPTX, DOCX
and Page/composite sources receive no snapshot control. Missing citation evidence
returns `no_page_source`. The compatibility literal `not_canvas_pdf` is retained
for ineligible sources, including edited Canvas snapshots.

## Data, acceptance and rendering

The forward-only `20261013000300_source_page_snapshots.sql` migration defines
`source_page_snapshots`, unique by owner/source version/page. Owner SELECT is
protected by RLS and column grants; private locators, dispatch and lease fields
are service-only. The `source-page-snapshots` bucket is private, PNG-only and
has no direct authenticated/anonymous Storage policy. Only the owned endpoint
returns ten-minute signed image URLs; image keys use opaque row/attempt IDs.
Original PDF paths, hashes and raw provider errors are never response fields.

The forward-only `20261013000400_local_pdf_page_snapshots.sql` migration lets both
Canvas-binding columns be null together for a local row, which remains bound by
the existing owner/source-version foreign key and unique owner/version/page key.
Canvas rows retain both snapshot bindings and their composite foreign key.
The service-only reservation validates local provenance, exact parent/extraction,
asset availability and the cited page; Canvas validation is unchanged. Both paths
share the existing rolling reservation/attempt budgets, claim function and leases.
Completion locks the available local asset against concurrent deletion; a deleted
asset yields a failed unavailable row and definite publication denial. The worker
removes its unreferenced upload; the next delivery acknowledges the terminal row.
No table, bucket, native package, deletion hook or retention policy is added.

`GET /api/reviewers/{artifactId}/sections/{sectionId}/snapshot` verifies the
Supabase bearer JWT server-side. Default GET reserves/reuses a pending row,
awaits deterministic Google Cloud Tasks acceptance using the existing queue,
dispatcher and private worker IAM, then returns HTTP 202. No `after()` or
in-memory rendering dispatch. `?render=0` checks availability/cache without
admitting a render; mounting a topic header therefore consumes no render quota.
Canonical lookup reads only the requested artifact/version/source.

The worker processes one page per delivery using existing PDF.js and
`@napi-rs/canvas`, at 1400 px wide, with bundled fonts rendered as glyph paths.
No new native dependency. Dimensions, PDF bytes, PNG size and render duration
are bounded. The worker downloads only the accepted revision and verifies its
hash before rendering. A five-minute lease fences publication; upload precedes
the ready-state write. Duplicate deliveries cannot concurrently publish. A
stale attempt removes only its own definitely unreferenced image; ambiguous
completion retains the image and lets durable state reconcile.

Reservations are capped at 20/user/rolling 24 hours. A service-only attempt
ledger and serialized claims independently cap actual render attempts at 20
in the same window, including retries, with at most three claims per row.
An exhausted/failed row does not trigger repeated render admission. No content
is logged. Cancelling an underlying generation cannot create a saved artifact
to admit; deleted/cascaded snapshot rows cannot pass fenced completion.

## Mobile behavior and limits

A topic header discovers server availability and shows **From page n** only
when available. Deferred PDF records may have a null coarse display type; the
server remains the classification authority. First open starts rendering.
While rendering, a quiet placeholder checks status at most five times over
15 seconds, then asks the student to reopen later. The full-screen viewer
supports pinch, pan and double-tap zoom/reset (1x-4x), shows the accepted source
title and page, and has a close control. Existing tokens and Reduce Motion
are respected; no animations are added to zoom gestures.

Offline device copies have no control. Foreground/availability rechecks and a
ten-second read-only heartbeat for eligible idle/ready pages hide the control
and close the viewer on connection failure (three-second discovery timeout).
Rendering progress checks stop after five; heartbeat does not extend them.
These are reachability checks, not an added native network package. Physical
airplane-mode behavior remains an owner acceptance item. Signed images remain
ephemeral UI data; no app offline snapshot store is introduced.

## Grounding policy and later phases

Phase 1 reproduces the accepted source page and adds no new facts, enrichment,
internet imagery or generated imagery to reviewer text. The visual's caption
belongs to its viewer; provenance labels do not enter canonical reviewer prose.

Later phases may extract embedded images from accepted materials, then offer
clearly labeled external visuals **only on student request**. External or
generated visuals must remain separate from source evidence and must never
imply that the instructor supplied them. Offline snapshots are a later
O-series item. Office rendering and composite-file page disambiguation require
their own proven provenance chains.

## Verification and rollout

Local suites exercise ownership, column grants/RLS, private bucket, idempotent
reservation, budgets, leases, page resolution, signed response shape, durable
acceptance, PDF hash checks, actual glyph/graphics rendering, explicit blank
pages, missing pages, mobile visibility, bounded polling and zoom interaction.
The final exact gate counts and failed attempts are in the
[VL1.1b handoff](../ai/handoff.md#vl11b-unattended-canvas-pdf-snapshots-2026-10-13)
and [VL1.2 handoff](../ai/handoff.md#vl12-unattended-local-pdf-page-snapshots-2026-10-13).

Migration/bucket application, production API/worker deployment and preview OTA
are owner steps. Deployed native rendering, live source retention, migrations,
IAM/queue and device checks are UNVERIFIED (owner to confirm). No production
service call, deployment, migration application, Scheduler change or push is
part of this unattended implementation.

## Pre-render (VL1.3)

After the shared Reviewer completion RPC commits the artifact, version and exact
source, manual and automatic generation pre-render each distinct lowest cited
section page. Both reuse canonical `sourceBlockIds`, the existing single unedited
Canvas PDF / accepted local PDF eligibility and exact-original resolver. Dispatch
uses the existing durable page worker, sequentially, at most 100 cited pages per
reviewer. Ready, failed and already dispatched/rendering rows are skipped.
Ineligible sources are silent no-ops; failures log fixed codes/counts only and
cannot change the committed Reviewer outcome. Missing originals remain unavailable.

Forward-only `20261014000300_system_page_snapshot_prerender.sql` adds `origin`
with existing/default rows `student`. Service-only system reservation uses the
same ownership, provenance and idempotency checks, but skips the rolling student
quota. Both student reservation and claim count only student-origin work; system
attempts still enter the ledger and retain the three-claim bound and lease fences.
Reusing a student row through system reservation never changes its origin or
dispatch identity. VL1.2 completion/deletion fencing, RLS and grants are preserved.

The existing on-open student reservation remains the capped fallback for older
reviewers and interrupted pre-render dispatch. Read-only `render=0` header discovery
returns ready images without spending quota; existing mobile tests prove that
thumbnail/viewer path, so no mobile change is needed. This slice dispatches work
after publication; task completion before a student opens is best effort, not a
synchronous generation guarantee. Migration application, worker/API rollout and
RB2 realme acceptance remain owner steps; production state is UNVERIFIED.

## Phase 2: extracted figures (VL2)

Preparation extracts only the accepted original's embedded raster figures.
PDF.js operator lists and image objects expose page-bound pixel data without a
native canvas; Node zlib encodes those exact pixels into PNG. PDF transforms
measure displayed area, excluding full-page scans and very small decoration.
There is no vector rendering, generated imagery, external fetch, enhancement
or invented caption. Scans/vector-only PDFs retain VL1's page snapshot fallback.
Office vector rendering remains VL2.1; unavailable Office figures show no icon.

PPTX follows presentation relationship order and each slide's image relationships.
DOCX follows body paragraphs/table rows and binds media to the preceding emitted
structural block; leading images with no block are omitted. The same parser
emits text drafts for preparation and accepted snapshot manifests. Final block
splitting also determines DOCX anchors. Deleted DOCX runs and PPTX backgrounds,
external relationships, and unsupported media (including EMF/WMF/SVG) are excluded.
PNG/JPEG Office media are supported. Archive expansion remains bounded to 2,000
entries, 4,000,000 bytes per expanded part and 40,000,000 bytes with media.
Image relationship errors cannot fail text-only Office preparation.

The extraction constants are:

| Constant | Value and effect |
| --- | --- |
| `FIGURE_MIN_DIMENSION` / `FIGURE_MIN_AREA` | 128 pixels on both sides / 32,768 pixels minimum area |
| `FIGURE_MAX_PIXELS` | 16,000,000 decoded pixels per image |
| `FIGURE_MAX_BYTES` | 5 MiB per stored raster |
| `FIGURE_MATERIAL_CAP` | 60 kept figures per original |
| `FIGURE_REPEAT_MIN_LOCATIONS` / `FIGURE_REPEAT_SHARE` | Exclude identical SHA-256 on at least 3 distinct locations and more than 50% of pages/slides/blocks |
| `FIGURE_MIN_PAGE_SHARE` / `FIGURE_MAX_PAGE_SHARE` | PDF displayed area must be at least 1% and less than 85% of the page |
| `FIGURE_MAX_CANDIDATE_BYTES` | 40 MiB retained PDF candidate bytes; at most 2,000 image operations |
| `FIGURE_EXTRACTION_TIMEOUT_MS` | 15 seconds per PDF extraction, including stalled image-object resolution |
| `FIGURE_OPERATION_TIMEOUT_MS` | 5 seconds per Storage/database operation |
| `FIGURE_MATERIAL_TIMEOUT_MS` / `FIGURE_PREPARATION_BUDGET_MS` | 30 seconds per material persistence window / 60 seconds for a preparation's optional figure work |
| `SECTION_FIGURE_CAP` | At most 12 cited figures per section; URLs expire after 600 seconds |

Original inputs are capped at 20 MiB (the Office parser retains its stricter
20,000,000-byte cap). Counts, area, bytes and time are bounded. Failure logs
contain only fixed codes/counts. Figures run after the fenced prepared/succeeded
receipt, outside the preparation transaction, and cannot change its outcome.
Cancelled or unsuccessful work publishes no figures. EP2 uses this same worker;
no new trigger, dependency, queue or cleanup worker is introduced.

Forward-only files `20261014000400_source_figures.sql` and
`20261014000500_source_figure_extraction_receipts.sql` add immutable owner rows,
the private bucket and service-only receipts (including successful empty results).
Safe-column owner SELECT uses RLS; anon/authenticated cannot write or access
Storage objects directly. Source identity is owner + file/asset row + exact
original SHA-256. Occurrence positions are stable across the whole original.
Receipts additionally include the preparation revision fingerprint. Unchanged
revisions reuse; changed revisions re-extract. Old rows/objects are retained
with historical accepted sources, following ADR-021; no deletion on revision
replacement. Ambiguous writes may retain extra private objects rather than
deleting a possibly published image.

Owner-only figure routes use server-verified bearer JWTs and private no-store
responses. The batched availability route signs no images. The section route
requires a successful extraction receipt with its complete persisted figure count;
partial or ambiguous writes remain hidden and use the page fallback. It
reuses VL1's strict canonical citation resolver and joins only the exact owned
snapshot item/hash and its canonical page or source/block ordinals. Office
requires `canvas-office-structured-v2`; old flattened Office snapshots cannot
be guessed into alignment. Standalone and composite admissions retain the exact
accepted manifest as canonical `canvas-sourceOrdinal-blockOrdinal` IDs. Missing,
duplicate, edited or unavailable evidence returns no figures. No title/text match,
current-file substitution, private key/hash or provenance label enters reviewer
prose. Signed URLs are returned only on opening the section's figure action.

Durable uploaded local PDFs use the shared successful extraction completion
boundary, verify the owned available asset's byte size/hash, and recheck deletion.
The API repeats VL1.2's exact-original/deletion resolver even for stored figures.
Legacy hashless assets and stateless `/api/ocr/extract-pdf` responses lack a
retained exact original; they are not given guessed figure bindings or backfilled
assets in this slice. Existing eligible page snapshots remain their fallback.

Mobile discovers availability once per Reviewer (with one foreground heartbeat),
shows the image action only for sections with figures, and opens the existing
bottom sheet in place. One source image at a time reuses VL1's bounded pinch/pan
and double-tap viewer, with page/slide labels and previous/next controls. The
existing sheet respects Reduce Motion and uses existing tokens/dismissal.
Offline copies, backgrounding and failed reachability hide the action and close
the viewer; URLs are never added to offline library copies.

Both migrations are files only. Rollout and physical acceptance remain owner
steps; deployed state, costs, real raster quality and device gestures are
UNVERIFIED (owner to confirm).

## Office page snapshots (VL2.1)

PPTX snapshots are implemented locally; worker/API/mobile rollout is pending.
Headless LibreOffice writer/impress is the single approved new native dependency
in the worker image, installed with --no-install-recommends and apt-list cleanup.
The existing non-root node user has a writable HOME. Each conversion uses its
own temporary input/output directory and isolated user profile; no instructor
file is modified and no imagery, text, caption or enhancement is generated.

`convertOfficeToPdf` supports PPTX/DOCX export, with a 60-second process deadline,
process-group kill on Linux, quiet stdio, 20 MiB output cap, PDF signature/parser
validation and 100-page cap. Cleanup follows process termination on success,
timeout and failure. The entire native input archive is bounded to 2,000 parts,
4,000,000 bytes per expanded part and 40,000,000 bytes total, including parts
omitted by text extraction. Active/embedded content and external non-hyperlink
relationships are rejected before native execution, preventing linked media
from fetching content outside the accepted original. No additional dependency
is installed for archive/PDF checks; existing JavaScript packages are reused.

Preparation invokes conversion only for PPTX. Failure, timeout or a missing
local binary logs fixed codes/counts, leaves material prepared, and preserves
VL2 figures. Text/drafts remain from the existing Office parser. Blocks carry
pageNumber equal to slideNumber in presentation relationship order, including
blank slides. ExportHiddenSlides is enabled; page count must equal parsed slide
count or conversion is ineligible. See the official [PDF CLI parameters](https://help.libreoffice.org/latest/en-US/text/shared/guide/pdf_params.html).
The converted page count is a rendering receipt, never an original-PDF pageCount:
Canvas/synchronous original PDFs retain their existing 40-page checks.

DOCX has no deterministic block-to-rendered-page correspondence under font,
wrap and pagination differences. The prompt explicitly permits PPTX-only
delivery; DOCX conversion admission and page mapping remain a follow-up.
DOCX retains VL2 figures without guessed page numbers. Writer is installed as
approved and the generic converter supports it, but no DOCX snapshot is admitted.

Forward-only `20261014000600_office_page_snapshots.sql` adds immutable,
service-only `office_pdf_conversions` with RLS and explicit grants. Receipt
identity is owner + owned Canvas file + content_version_fingerprint + original
SHA-256; it includes PDF hash/size/page count and an opaque private path in
`office-source-pdfs`. The composite file/owner/connection/course foreign key
prevents foreign bindings and physical file deletion from discarding conversion
receipts. There is no revision-replacement cleanup. Unchanged revisions reuse;
new fingerprints or original hashes convert again. Historical receipts/bytes
remain retained, consistent with ADR-021; failed/concurrent writes may retain
extra private objects. Upload precedes immutable receipt persistence, and the
existing preparation completion fence governs publication of usable source text.
Cancelled preparations produce no accepted source/reviewer result; unused
private conversion bytes alone cannot admit a snapshot.

New accepted PPTX snapshot items capture a server-derived revision fingerprint
only when their original hash matches the exact owned file at insertion. Office
MIME is normalized from the successfully parsed kind, including generic provider
MIME. The snapshot resolver requires that accepted fingerprint and original hash,
the same owner/course/connection and structured canonical block IDs whose page
and slide ordinals agree. Old flattened/unbound Office snapshots, edited sources
and composites remain ineligible; no historical provenance backfill is attempted.
Original Storage existence is required even for a cached page, followed by exact
converted PDF existence and worker byte-size/PDF-hash checks. Current Canvas
revisions never replace historical bytes.

The original PDF/local reservation implementation is preserved as a delegated
helper; Office uses the same owner lock, row uniqueness, student quota and system
quota exemption. Renderer, Cloud Tasks dispatch, leases, attempts and completion
remain shared. VL1.3 automatically pre-renders lowest cited slides through shared
eligibility. The worker accepts the explicit converted PDF hash instead of
deriving it from an opaque filename. Mobile adds only an optional slide label;
PPTX shows From slide n and Slide n in the existing zoomable viewer. PDF response
shapes and labels remain unchanged; no quota or polling behavior changes.

Planning estimates (not measured): LibreOffice adds approximately 250-500 MiB
uncompressed / 100-200 MiB compressed, with 150-500 MiB additional active process
memory and 5-30 seconds startup/conversion for a small deck. Historical sampled
Node maximum 679.3 MiB plus the estimated 500 MiB is about 1179 MiB, below the
configured 2048 MiB; this is not a combined peak measurement. The 60-second
conversion deadline fits the documented 1800-second request / 25-minute job
deadline; Cloud Build timeout is 1200 seconds. No numeric image-size/cold-start
limit is documented in the repository, and no known limit contradiction was
established. Image build, actual size, cold start, Linux native fidelity and peak
RSS are UNVERIFIED (owner to confirm); no image was built or pushed here.

Fresh local exact gate counts and failed draft attempts are recorded in the
[VL2.1 handoff](../ai/handoff.md#vl21-unattended-office-page-snapshots-2026-10-14).
Migration application, worker rebuild/deployment, API deployment, preview OTA
and RB2 realme acceptance are owner steps. Production checks were not run.

## Find a visual (VL3)

Implemented locally, migration/API/preview OTA rollout and RB2 acceptance pending.
An authenticated student may explicitly POST Find a visual for one owned, saved
Reviewer section. No search or vision call runs during preparation, sync,
generation, mounting, discovery or pre-render. Canonical reviewer payloads and
source evidence are never mutated or enriched by this feature.

The existing snapshot and figure resolvers check source evidence before cache or
admission. An available source page (including pending/unrendered) or extracted
figure refuses external search. Exact accepted original, owner, citation and
deleted-asset rules stay authoritative. Missing section/owner returns safe 404;
provider/database uncertainty denies work rather than inventing source absence.

Commons is the only discovery API and upload.wikimedia.org the only image host.
Heading plus deterministically ranked section key terms produce one bounded query.
A descriptive StayFocused User-Agent identifies the educational use and owner
contact. Search uses namespace 6, imageinfo metadata, at most five candidates,
1200-pixel-wide thumbnails, a 256 KiB wire-body cap and a ten-second timeout.
Redirects are denied. Raster images and PNG-rendered SVG thumbnails qualify;
non-image MIME, raw SVG, invalid hosts/dimensions and duplicate/prior titles do not.
HTML/scripts are stripped from Artist/Credit, preserving decoded plain attribution.
Only Public domain, CC0, CC BY and CC BY-SA with matching legal metadata URLs
qualify; NC, ND, fair use and unknown/mismatched licenses are skipped. Missing
required BY attribution is skipped. Store and show the license URL and credit.

Match uses the existing OpenAIProvider, OPENAI_API_KEY and installed Responses SDK,
with a narrow typed input_image URL extension. Existing text-only calls are
unchanged. gpt-4o checks only the section's displayed sourceCore prose/key points/
evidence and candidate image; IDs, audit fields and enrichment are excluded.
Instructions treat both image and text as untrusted data, reject merely related
or ambiguous illustrations and add no facts. Strict JSON plus runtime validation
requires matches=true and confidence >= 0.90; stop at the first passing image.
At most three candidates/model calls, fifteen seconds per call and zero SDK retries.
The request budget is therefore ten seconds search plus at most 45 seconds vision,
inside mobile's existing 65-second POST timeout. No new provider/key/env/dependency.
The [official Responses reference](https://developers.openai.com/api/reference/typescript/resources/responses/methods/create)
and installed openai 6.42.0 types confirm image URL plus structured output support.
That documentation read is not a live model call.

Forward-only 20261014000700_section_external_visuals.sql is written, not applied.
Owner-private cache keys are owner + artifact + exact immutable version + stable
section ID. Safe-column owner SELECT uses RLS; query, vision reason and exclusions
remain service-only. Artifact/version/account foreign keys cascade cache and
reservations. The separate service-only request ledger serializes reservations
with an owner advisory lock, permits one 120-second section lease, and caps all
reservations at 20 per rolling 24 hours (including failures/retries). This follows
the existing snapshot reservation pattern; preparation's accepted no-cap policy
is unrelated and unchanged. A service-only finish RPC validates a live lease and
locks the still-active latest Reviewer before publishing. Persistence precedes
response. Expired/replaced/deleted results cannot publish.

Found and reliable no-result outcomes are cached. A normal repeat returns cache
without quota/provider work. Find another is offered once after attempt 1, excludes
prior checked Commons file titles, publishes attempt 2 and thereafter always returns
cache. First-time findAnother also counts as attempt 1. Timeout/network, malformed
Commons/vision evidence and persistence failures are retryable safe errors; none
is never cached for them. Failed second search preserves the first result and its
remaining retry. Failures release a live lease but keep daily accounting. Requests
are synchronous, not background jobs or HTTP 202 work; an interrupted client may
reconnect to server cache on its next explicit tap. No automatic polling of search.

Found responses and both mobile card/viewer always display exactly:
External reference — not from your course material.
The card is separate from snapshot/figure UI and canonical prose. Attribution plus
license link to the Commons file page, with a separate legal-license link. None
shows No reliable visual found. The quiet secondary action needs positive existing
figure reachability plus completed snapshot discovery (where applicable), and
hides offline, on source evidence or while reachability is uncertain. Existing
foreground/ten-second read-only heartbeat checks continue; snapshot absence now
also rechecks reachability so an online-only button cannot survive known failure.
No search occurs from those reads. The existing token-based Sheet and URL pinch/
pan/double-tap viewer are reused; no animation or native package is added.
URLs/results are ephemeral UI state, not offline library content. Counts/fixed
codes alone are logged, never section text, provider reasons or owner-bearing URLs.

Local injected fetch/provider tests, executable PGlite schema contracts and
Reader/component/parser regressions verify the boundary. Live egress to Commons/
upload.wikimedia.org, actual image match quality/latency, production multi-session
locking, licenses/attribution rendering and physical airplane/zoom behavior are
UNVERIFIED (owner to confirm). Apply the migration through the Supabase connector
(filename as name, never db push), deploy API, publish preview OTA and perform RB2
realme checks. Rollout and Device checks are entirely skipped in unattended scope.
