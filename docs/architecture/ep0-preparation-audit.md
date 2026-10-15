# EP0: Canvas preparation audit

Date: 2026-10-14 (Asia/Manila). Audited branch `overnight/2026-10-13_0132`,
base `1d2b0f7`. **PASS for the unattended documentation scope. EP1 is next.**
All implementation references below are relative to the repository and refer
to this base, not to deployed code. No application code or migration changed.

### EP1 preflight correction (2026-10-14)

**EP1d additive correction:** owner-approved Module/ModuleItem pagination is
now complete and fail-closed (`996574a`); file-reference and open-candidate
reads are also paged (`e739cab`). A new non-inventory revision binding surprise
blocks EP1: inventory SQL replaces `content_version_fingerprint` but retains
old original fields with `ingestion_status=not_requested`; ingestion's unchanged
branch only compares the new metadata fingerprint and presence of old storage
identity, then marks the old bytes unchanged without downloading the revision.
A local reproduction executes the actual inventory function and ingester,
confirming this sequence with distinct A/B byte hashes and zero B downloads.
The revision discussion below describes intended replacement, not proof that
current ingestion performs it after sync. See the
[EP1d handoff](../ai/handoff.md#ep1d-unattended-continuation-2026-10-14).

**EP1c additive correction:** the owner-approved File/Page pagination repair
now discovers 230/230 of each type and fails closed on read/bound exhaustion.
Module and ModuleItem inventory reads still lack pagination/completeness proof.
A local reproduction with a modeled 1,000-row server cap loses instructional
placement evidence and administrative exclusion evidence while reporting a
complete source list. EP1c STOPPED on this separate eligibility-boundary finding;
live cap/impact is unverified. See
[EP1c handoff](../ai/handoff.md#ep1c-unattended-continuation-2026-10-14).


**EP1b additive correction:** `0a5703c` repairs the Canvas cap described below;
fresh/reused 41-page inputs fail before inspection/OCR, while local durable
100/40 remains. EP1b found another discovery assumption requiring owner review:
`readFiles` / `readPages` limit inventories to 150 each, and source-list
`hasMore` only reflects that capped subset. A local 230-file reproduction
observes 150 and reports completion, omitting 80. The EP1 brief's shared
discovery must preserve eligibility while reading complete owned inventory;
the existing public pagination alone cannot prove completeness. See
[EP1b handoff](../ai/handoff.md#ep1b-unattended-continuation-2026-10-14).

EP1 stopped under its STEP 0 surprise rule: the blanket statement below that
Canvas extraction caps at 40 pages does not hold for the deferred worker path.
`processing-jobs/operations.ts:107` passes
`getConfiguredDurableDocumentMaxPdfPages()` (default 100) to PDF validation;
`:103` also returns an existing page count without a Canvas cap check.
The synchronous stored-file extractor uses the 40-page default. Canvas snapshot
items retain the separate 40-page database constraint, after extraction.
No production behavior was tested and no repair was made. See the
[EP1 stop evidence and owner question](../ai/handoff.md#ep1-unattended-preflight-stop-2026-10-14).
The existing 40-page Canvas requirement remains the intended policy.

## Decision and STEP 0

Fely decided on 2026-10-14 to prepare every instructional Canvas material as
soon as sync discovers it, accepting cost with no per-user preparation cost
cap. The guard is 200 preparations per sync, checked every 25 for repeat and
no-progress signals; three attempts across syncs require explicit student Retry.
LibreOffice in the worker is approved for later VL2.1, not implemented by EP0.
The EP0 prompt records owner confirmation of P0 at 12:48; no push was attempted.

Read ADR-019, ADR-020, ADR-021 and the PV1/PV1c, VL1.1b and VL1.2 handoffs.
Repository code is authoritative: ADR-021's original statement that the PDF
resolver has no consumer is historical; current snapshot code consumes it.
RB1's latest repository record says PV1c/VL1.1b/VL1.2 shipped, with device
acceptance pending. This run did not verify that production statement.

**No request-context STOP condition found.** Binary ingestion, extraction and
block construction can run in the Google worker with an explicit owner, service
client and brokered Canvas token. The existing token broker remains necessary;
the worker need not hold the Vercel encryption key. There is no owner approval
question and no DECISIONS-NEEDED entry for EP0.

**ADR numbering:** ADR-021 is Canvas provenance retention; ADR-022 through
ADR-025 also exist. EP1 should use **ADR-026-eager-preparation.md**, rechecking
the next free number at its own STEP 0. Do not overwrite ADR-021.

## What preparation means today

There are three stages, not one persisted full-preparation operation:

1. **Prepare / binary ingestion:** fetch metadata, download and validate bytes,
   upload the original, persist the current file's storage identity. A descriptor
   reports `ready` once those fields are valid; this does not prove extraction
   succeeded or page blocks exist.
2. **Extraction / structuring:** read those bytes and extract text, OCR and
   source blocks during preview or durable reviewer work. This can fail after
   the UI already reports the file ready.
3. **Accepted reviewer provenance:** persist an immutable snapshot and canonical
   source version, with blocks where supplied by the deferred worker. A stored
   original alone does not establish a saved reviewer's page-citation chain.

Evidence: `apps/api/src/lib/canvas-reviewer-sources.ts:1117` (Prepare), `:1214`
(ingestion only), `:2524` (descriptor),
`apps/api/src/lib/canvas-stored-file-extraction.ts:69` (binary-ready predicate),
`apps/api/src/lib/processing-jobs/deferred-canvas-reviewer.ts:237` (source blocks
and snapshot metadata). EP1 must persist full revision preparation before using
the new `prepared` state; renaming today's binary-ready state is insufficient.

### Download, storage and status

| Step | Current function and evidence |
| --- | --- |
| Validate owner/course/source | `prepareCanvasReviewerSources`, `canvas-reviewer-sources.ts:1159`, loads the selected owned course, exact file IDs and Page reference where applicable (`:1187`). Only file IDs are accepted (`:1146`); max three per call. |
| Token | `ingestCanvasFiles`, `canvas-file-ingestion.ts:90`, reads the active owned connection. At `:115` it uses `brokeredCanvasToken`; otherwise it decrypts the stored token. The Page attachment resolver has the same override at `experience/canvas-page-attachments.ts:42`. |
| Fresh metadata | `ingestOneCanvasFile`, `canvas-file-ingestion.ts:246`, calls `getCourseFile`, verifies Canvas identity and eligibility. Matching metadata fingerprint and existing storage identity allow `unchanged` (`:301`). |
| Download and validation | `canvas-file-ingestion.ts:343` calls `CanvasClient.downloadFile`; `:358` validates actual MIME/signature/security. `canvas-file-policy.ts:19` sets private bucket `canvas-source-files`, 10 MiB single-file limit, three files, 15 MiB aggregate (PDF limit + image limit), concurrency two, 30-second download timeout and five redirects. Images additionally cap at 5 MiB (`ocr/upload-policy.ts:4`). |
| Credential-safe download | `packages/canvas/src/client.ts:863` bounds redirects and loops; `:882` sends the bearer token only on the appropriate origin. Collection pagination is bounded at `:659` and rate responses preserve `Retry-After` (`:2486`). EP1 must defer/retry on that signal rather than spin; ingestion itself returns a retryable safe code (`canvas-file-ingestion.ts:608`). |
| Key and upload | `canvas-file-ingestion.ts:395` hashes downloaded bytes; `canvas-file-policy.ts:187` derives a key from owner, local file ID and SHA-256. Only the symbolic derivation is recorded here. `canvas-file-ingestion.ts:419` uploads with `upsert: true`; identical owner/file/hash shares an object. No real private locator is recorded. |
| Current row | `canvas-file-ingestion.ts:434` saves `availability_status`, `current_sha256`, `ingestion_status=stored`, `last_successful_ingestion_at`, bucket/key, stored byte count and MIME. Owned updates are at `:499`. |
| Result receipt | `canvas-file-ingestion.ts:515` calls `record_canvas_file_ingestion_result`; its ownership-checked SQL implementation is `packages/db/migrations/202607060003_add_canvas_file_ingestion_foundation.sql:795`. Receipts include safe code/retryable/bytes/status. The call is best effort; this is not a durable full-preparation completion receipt. |
| Public state | `canvas-reviewer-sources.ts:2524` maps valid binary identity to `preparationStatus=ready`; otherwise unavailable/blocked/failed/not_prepared. `:2709` maps stored/unchanged ingestion results to ready. `experience/mappers.ts:50` maps this into material readiness. There is no revision preparation job or Preparing state today. |

The private bucket declaration is at
`packages/db/migrations/202607060003_add_canvas_file_ingestion_foundation.sql:956`.
Client roles are excluded from this bucket's general Storage policies (`:968`,
`:978`); owned application reads and server service access remain the boundary.

### Extraction and block creation by kind

`extractPreparedCanvasFileText` validates exact owner/connection/course, private
key derivation, actual size, SHA-256 and content before extraction
(`canvas-stored-file-extraction.ts:91`, `:145`, `:163`). It downloads from Storage,
not from Canvas (`:409`).

| Kind | Extraction and provenance today |
| --- | --- |
| PDF native/mixed/scanned | `canvas-stored-file-extraction.ts:292` validates a PDF, then `:336` calls `extractPdfDocument`. `ocr/extraction-service.ts:350` inspects pages; native and explicit blank pages avoid OCR, layout-incomplete/scanned pages use OCR (`:390`). Chunks contain at most five OCR pages (`packages/ocr/src/policy.ts:3`), mapped back to original page numbers. `:499` verifies every expected page; missing, duplicate, invalid, out-of-range or failed evidence denies usable source. Canvas and synchronous PDFs cap at 40 total pages; generic durable uploads allow 100 total / 40 OCR-required (`ocr/upload-policy.ts:9`, `:14`). Moving Canvas work to the worker must not increase its cap. |
| PDF preview blocks | `canvas-reviewer-sources.ts:1923` calls the extractor, then `:1959` uses `normalizeOcrResultToStructuredBlockDrafts` and `finalizeStructuredBlockDrafts`. `canvas-structured-blocks.ts:126` propagates `pageNumber`; `:188` stores `page_number` in the structure manifest. These are structured preview blocks, not the canonical deferred `page-N` builder. |
| PDF durable blocks | Google work uses `processing-jobs/google-cloud.ts:175` -> `operations.ts:91` (`prepareCanvasReviewerExtractionStep`), `:131` (`inspectPdfPageStep`), `:219` (`prepareExtractionStep`), `:464` (`extractPdfChunkStep`), `:709` (`finalizeCanvasReviewerExtractionStep`). Verification at `:726` precedes normalization and `prepareDeferredCanvasReviewerSource` (`:761`). That helper validates ordered pages at `deferred-canvas-reviewer.ts:70`, builds the existing nonblank `page-N` blocks with `pageNumber` at `:138`, creates preview/snapshot, then attaches blocks and snapshot ID (`:248`). Blank pages remain explicit extraction evidence/page-count gaps, not invented text blocks. |
| PPTX | `canvas-stored-file-extraction.ts:191` calls `extractOfficeText`. `activity-maker/office-extraction.ts:109` follows presentation slide relationships, rejects external/invalid targets, and reads title/body/table text in slide order, max 100 slides. It returns text with Slide headings (`:139`), not a persisted slide/page map or rendered PDF. The later plain-text structurer does not manufacture physical `pageNumber`. |
| DOCX | Same extractor; `office-extraction.ts:52` reads bounded XML paragraphs, headings, numbering and table rows; deleted text/instructions and active content are excluded. It has no physical pagination and no `pageNumber` evidence. Archive limits are at `:25`. LibreOffice conversion belongs to VL2.1. |
| Canvas Pages | Synchronized `body_html` is normalized by `canvas-content-normalization.ts` and read via `canvas-reviewer-sources.ts:2212` / `:2275`. No binary Prepare is accepted for a Page. Inline HTML blocks have no physical page numbers. Generation resolves same-course instructional attachments first (`experience/generation.ts:50`). A single PDF uses deferred PDF provenance; multiple files use the composite worker. Apple `.pages` archives are unsupported, distinct from Canvas Pages. |
| PNG/JPEG | `canvas-stored-file-extraction.ts:231` validates image bytes and invokes OCR; `ocr/google-cloud-vision-provider.ts:149` calls document text detection. Preview structuring carries OCR page evidence, but phase-1 source page snapshots exclude images. |
| Plain text/Markdown | Fatal UTF-8 decode and source sanitization at `canvas-stored-file-extraction.ts:207`; plain-text blocks via `canvas-reviewer-sources.ts:1968`. No OCR or physical page map. |

Preview structure sessions are persisted by `canvas-reviewer-sources.ts:3584`;
preview sessions by `reviewer-source-provenance.ts:createCanvasSourcePreviewSession`.
The deferred attach RPC writes canonical `source_versions.metadata` and binds
processing source/job at
`packages/db/migrations/20260919234000_attach_chunked_canvas_reviewer_source.sql:201`.
Worker extraction checkpoints retain raw pages and complete-page diagnostics
(`operations.ts:596`, `:695`). Local uploads use separate processing assets;
`processor.ts:355` emits extraction source blocks. They are not Canvas sync jobs.

## Current triggers and different paths

| Trigger | Exact call chain |
| --- | --- |
| Current mobile Prepare material | `apps/mobile/src/features/redesign/GenerateScreen.tsx:311` -> bearer `experienceRequest` at `:320` -> `POST /api/experience/materials/prepare` in `apps/api/app/api/experience/[...path]/route.ts:117` -> `prepareCanvasReviewerSources`. Returns refreshed binary descriptors; no OCR. |
| Older Canvas source picker Prepare/Retry | `apps/mobile/src/features/courses/CanvasSourceReviewerScreen.tsx:580` / `:610` -> `services/canvasApi.ts:1261` -> course `/sources/prepare` route (`apps/api/app/api/canvas/courses/[courseId]/sources/prepare/route.ts:59`) -> same helper. Protected route auth verifies bearer JWT; caller identity is not accepted from request data. |
| Lower-level explicit ingest API | `apps/api/app/api/canvas/files/ingest/route.ts:39` -> `ingestCanvasFiles` directly, bypassing course reviewer selection while retaining file/connection ownership and binary policy. It does not perform extraction. |
| Manual generation admission | Experience generations route `:122` -> `startReviewerGeneration` (`experience/generation.ts:18`). Existing job reconnect happens before preparation (`:27`). Page attachments prepare at `:57`; standalone preparable files at `:68`. PV1c refreshes PDF descriptors (`:73`) and enters deferred admission (`:89`). Failure is `409 not_ready`, not a fallback. Non-PDF generation uses structure/selective preview/snapshot (`:141`, `:180`). |
| AG1 after durable content sync | `canvas-sync-jobs/finalize.ts:249` completes sync; `:255` calls `runAutomaticReviewersAfterSync` for successful terminal course_content jobs, including partial/unchanged outcomes. `auto-reviewers/after-sync.ts:6` isolates errors. `admission.ts:42` calls the same `startReviewerGeneration` with brokered token and no-op schedule, then awaits `dispatchAcceptedProcessingJob` (`:46`). Current eligibility includes preparable files (`:54`), with baseline, 3/run, 5/day and 3 admission attempts (`:18`, `:162`, `:205`). These are reviewer limits, not the new preparation guard. |
| AG2 / five-minute metadata poll | Cron `apps/api/app/api/cron/canvas-sync/route.ts:15` -> `processCanvasMetadataPolls` -> `pollCanvasCourse` (`notifications/canvas-poll.ts:43`). After complete module evidence and successful metadata apply (`:97`), new File/Page item IDs invoke `maybeRequestContentSync` (`auto-reviewers/poll-trigger.ts:42`) -> durable sync creation and awaited dispatch. The resulting worker finalize runs AG1 above. No preparation or generation runs in the poll. First inventory baselines IDs; changed existing IDs do not trigger sync (`poll-trigger.ts:13`). Preference/activity/rolling sync reservations remain. The cron also has email work; EP0 never invokes it. |
| Durable worker PDF/composite work | `apps/api/scripts/google-cloud-worker.ts:13` routes /tasks/canvas-sync, /tasks/generation and /tasks/page-snapshot; there is no preparation task. PDF extraction/provenance chain above follows generation acceptance. Multiple Page attachments use `processing-jobs/deferred-canvas-composite.ts:20` -> structure/preview -> snapshot -> attached `reviewerSourceBlocks` (`:97`); original binaries were already prepared on admission. |
| Activity Maker attachment resolution | `activity-maker/sources.ts:115` explicitly prepares assignment-linked files with the same helper (`:120`), then previews/extracts (`:128`). This is user-requested Activity Maker work, not automatic instructional reviewer eligibility; keep that distinction. |
| Usable-content reads / preview endpoints | `canvas-usable-content-service.ts:226` and reviewer preview/structure endpoints call `extractPreparedCanvasFileText` for already stored files. Repeated reads can repeat OCR; there is no common revision extraction cache in that helper. Snapshot render tasks consume accepted originals, not Canvas preparation. |

**EP1 single path:** a request-independent revision preparation service, using
the existing `prepareCanvasReviewerSources` / `ingestCanvasFiles` for original
bytes and the existing extraction/block builders for full results. Manual,
automatic and sync triggers must use the same durable admission/result lookup.
Do not create a second PDF page-block builder. Refactor the existing worker
builder into a reusable pure helper if needed; do not generate reviewers just
to obtain preparation blocks. Selection/editable-preview logic remains a
consumer of prepared evidence, not a competing extraction path.

## Instructional material eligibility

The authoritative reviewer inventory filters parent-work attachment rows and
then applies `isCanvasGenerateCandidate`
(`canvas-reviewer-sources.ts:395`, `:439`, `:1517`):

- All assignments and announcements are excluded from reviewer candidates.
  Deadline/submittable work is routed to tasks; the predicate is due date or
  a submission type other than empty/none/not_graded (`experience/mappers.ts:103`).
  Do not reinterpret the older module classifier's generic learner-material
  label as automatic reviewer permission.
- Assignment/typed-attachment/announcement-only files are excluded unless
  independently placed in a module (`canvas-reviewer-sources.ts:1517`).
  Page instructional attachments remain eligible only inside their owned Page
  bundle, with exact references and administrative-name filtering
  (`experience/canvas-page-attachments.ts:14`, `:111`). Max seven attachments;
  hidden direct-link exceptions do not weaken locks or security validation.
- PNG/JPEG must have direct module placement (`canvas-reviewer-sources.ts:454`).
  Navigation-only/empty Pages, administrative titles and orientation/policy
  modules are excluded (`:447`, `:463`). Supported stored MIME kinds are PDF,
  DOCX, PPTX, PNG/JPEG, plain text/Markdown (`canvas-stored-file-extraction.ts:48`).
  Media, legacy DOC/PPT, Apple Pages and other unknown types remain unsupported;
  locked/unavailable/security/oversize material remains safely blocked.

EP1 should reuse this selection boundary for preparation discovery, including
Page attachments, rather than prepare every row in broad Canvas Files.

## Cost points and CIT17 estimate

**No fresh read-only queries were run:** UNATTENDED rule 2 prohibits Supabase
and Canvas calls, including reads. No downloads or re-preparation occurred.
Historical read-only query evidence is available in
`docs/ai/acceptance/r1/rollout-and-acceptance.md:15` / `:25`, dated
2026-10-13 02:05:53 UTC. It lists five baseline PDFs, not a complete current
course inventory. Aggregation here is CACHED input / fresh arithmetic:

| Historical CIT17 sample | Count | Pages | Original bytes |
| --- | ---: | ---: | ---: |
| PDFs | 5 | 164 (38 + 32 + 40 + 21 + 33) | 8,973,082 (8.56 MiB) |
| PPTX / DOCX / Canvas Pages / images / text | UNVERIFIED | UNVERIFIED | UNVERIFIED |

All five were already stored in that evidence. On unchanged binary Prepare,
incremental original upload bytes are zero, though metadata calls still occur.
For an initial eager extraction of those five originals:

- Native/blank-only PDFs: zero billable OCR pages. All-scanned upper bound:
  **164 OCR page units and 35 five-page-or-smaller provider requests** across
  the five files. Actual OCR-required pages, retries and layout supplements are
  **UNVERIFIED (owner to confirm)**, not assumed to equal total pages.
  Vision PDF and image calls are at `ocr/google-cloud-vision-provider.ts:174`
  and `:149`; an instructional image normally adds one page unit/call.
- PDF/Office/HTML/text extraction and block construction make **zero LLM
  generation calls**. Reviewer generation is separate:
  `processing-jobs/ai-reviewer.ts:20` calls `runAIReviewer`, with actual provider
  call count in its metrics (`:24`). Do not estimate one model call per file;
  calls/tokens depend on accepted source and generation stages.
- Original storage is about **0.008973 decimal GB** for this historical sample,
  plus extracted text/blocks/checkpoints in the database, distinct referenced
  old revisions, and fail-closed cleanup leftovers. Storage operation/egress
  costs occur for uploads, exists checks and extraction downloads. Separate
  PNG snapshots and future converted Office PDFs add storage/compute later;
  EP0 does not charge them to current Prepare.
- Parametric estimate: initial OCR cost = actual OCR page units * applicable
  billed page rate; monthly originals = retained GB-months * applicable storage
  rate; add worker CPU/memory and request/egress charges. Pricing, free-tier
  balances and actual billing are **UNVERIFIED (owner to confirm)**. No live
  tariff or dollar total is fabricated. Existing stored bytes are not new spend.

Owner read-only follow-up should return aggregate counts by authoritative
eligible kind, sum(size_bytes/stored_byte_count), distinct revision bytes and
expected/native/blank/OCR page counts from exact persisted extraction evidence.
Do not select source text, whole metadata blobs, private object keys, tokens or
file bodies. Snapshot page counts cannot establish actual OCR consumption.
Do not run provider work to improve the estimate.

Existing processing quotas are not synonymous with OCR billing:
`packages/db/migrations/20260723090006_processing_quota_concurrency_hardening.sql:88`
counts requested document-extraction source pages conservatively. EP1's
preparation admission must not inherit per-user cost quotas accidentally;
existing reviewer limits remain separate under ADR-019.

## New revisions and PV1c retention

File sync computes `content_version_fingerprint` from provider metadata
(`canvas-file-normalize.ts:280`). Inventory SQL preserves ingestion status for
matching fingerprints, but resets it for changed eligible revisions, retaining
the old storage identity until replacement
(`202607060003_add_canvas_file_ingestion_foundation.sql:563`). Sync does not
automatically download the new revision today. AG2 detects new item IDs, not
changed existing IDs; AG1 records descriptor.updatedAt revisions and skips any
material already linked to a reviewer (`auto-reviewers/admission.ts:71`, `:234`).
Generation of a revised material therefore remains a manual freshness action.

All current Canvas ingestion removal paths retain referenced bytes in code:

| Path | Retention evidence |
| --- | --- |
| Metadata becomes ineligible | Clear current fields, then guarded cleanup (`canvas-file-ingestion.ts:278`, `:292`). |
| Download validation failure | Clear fields, then guarded cleanup (`:365`, `:372`); even a failed row update leaves current references for the guard to detect. |
| Successful new revision | Upload and save new identity, then clean the old identity (`:434`, `:455`). |
| Failed row update after upsert | Existence checked before upload (`:408`); only a provably new object is eligible for guarded rollback (`:446`). Existing/uncertain current or historical keys are kept. |
| Final removal | All four paths converge on `cleanupCanvasObjectIfUnreferenced` (`:673`), claim -> Storage remove -> finish. No unconditional Canvas remover remains. |

`20261013000200_canvas_source_provenance_retention.sql:20` checks both current
files and immutable snapshot items. A durable exclusive claim bridges the
database/Storage HTTP gap. BEFORE INSERT snapshot and new current-object
triggers share its advisory lock (`:76`, `:118`). Errors preserve bytes/claims;
claims do not automatically expire. Protection is stronger than only saved
reviewer references: any matching snapshot item preserves the object.
`snapshot-pdf-object.ts:63` derives only the exact owned accepted file/hash,
checks its unedited snapshot and original existence; no newer revision is used.

Repository-wide remove-site inspection found processing staging cleanup and
PNG cleanup separately (`processing-jobs/creation.ts:543`,
`source-page-snapshot-worker.ts:67`). The generic processing cleanup script
removes queue objects (`scripts/processing-cleanup.ts:93`); its current writers
queue document assets or processing staging, not Canvas original revisions
(`20260723084329_reusable_processing_assets.sql:1857`, `:1882`,
`processing-jobs/creation.ts:551`). Deferred Canvas staging changes the processing
source to reference the Canvas object without creating a document asset
(`20261001015348_composite_canvas_page_staging.sql:114`). EP1 must not route
Canvas originals into generic processing cleanup or bypass the claim protocol.

**Conclusion:** referenced-bytes retention holds on audited current code paths,
conditional on the migration being applied and Storage/database evidence being
consistent. Fresh production behavior and actual retained bytes are
**UNVERIFIED (owner to confirm)**. No backfill or missing-byte repair is claimed.
Local uploads retain VL1.2's separate respect-the-delete policy.

## Worker suitability

Comparison with `docs/architecture/ag2-execution-contexts.md:6`:

- Sync worker claims a job and obtains its token using Google IAM and the
  bounded Vercel broker (`canvas-sync-jobs/google-worker.ts:122`). Broker
  validates worker identity, dispatch, live lease and deadline before decryption
  (`apps/api/app/api/internal/canvas/sync-token/route.ts:23`, `:44`). No token
  belongs in a durable task payload, job row or log.
- Binary preparation and Page attachment resolution accept the brokered token;
  extraction accepts a service client/owner/row and OCR provider. None requires
  a user request or `after()`. OCR can use worker ADC with project configuration
  (`ocr/create-server-ocr-provider.ts:75`).
- Manual reviewer admission's default dispatch uses `after()`
  (`processing-jobs/background-dispatch.ts:17`), but AG1 explicitly replaces it
  and awaits dispatch (`auto-reviewers/admission.ts:42`). Google task dispatch
  uses ADC outside Vercel (`processing-jobs/google-cloud.ts:81`). EP1 must use
  that awaited pattern, not call an HTTP wrapper's default scheduler.
- The deployment script supplies service credentials, task configuration and
  project, with 1,800-second runtime, concurrency one and no Canvas encryption
  key (`infra/google-generation/deploy.ps1:7`). Worker operation budget is
  25 minutes (`processing-jobs/google-cloud.ts:178`). These are intended
  configuration, not live credential/IAM verification.

Preparation can execute in the worker after broker handoff. A new independent
preparation job cannot reuse a completed sync's token lease: EP1 must extend
the broker's claimed-job authorization for its own preparation lease (or use
an equivalent job-scoped handoff). That is part of adding durable preparation,
not an existing request-context bug or approval gate. Do not provision the
Vercel encryption key to the worker.

## EP1 implementation brief

Add one durable revision preparation service and make these files its consumers:

| Change area | Exact files/functions |
| --- | --- |
| Discovery/admission | `canvas-sync-jobs/finalize.ts:finalizeCheckpointedCanvasSync`, after safe persisted content scopes; `canvas-reviewer-sources.ts:listCanvasReviewerSources` / eligibility / `prepareCanvasReviewerSources`; `experience/canvas-page-attachments.ts:resolveInstructionalPageAttachments`. Enqueue new and changed exact revisions independently of AG1 baseline/reviewer existence/off switch. Preparation failure never rewrites the sync outcome. |
| Durable repository/worker | New preparation repository, contracts, dispatch and worker modules; `apps/api/scripts/google-cloud-worker.ts` task routing; reuse Google ADC dispatch/lease patterns. New forward-only migration plus `packages/db/src/types.ts`; service-only mutation, owner reads, explicit grants/RLS and idempotent admission. Extend internal token broker/contract to authorize claimed preparation jobs, not accept arbitrary user/course IDs. |
| One extraction implementation | `canvas-file-ingestion.ts:ingestCanvasFiles`; `canvas-stored-file-extraction.ts:extractPreparedCanvasFileText`; `ocr/extraction-service.ts:extractPdfDocument`; `processing-jobs/operations.ts` inspection/chunk/finalization; refactor `deferred-canvas-reviewer.ts` existing page builder as needed; `canvas-structured-blocks.ts` HTML/Office/text structuring. Persist raw page evidence and canonical blocks before prepared success. Reuse result evidence on generation/preview instead of OCR again. |
| Admissions/consumers | `experience/generation.ts:startReviewerGeneration`, `auto-reviewers/admission.ts:isAutoReviewerEligible` / `admitWithLease`, `auto-reviewers/after-sync.ts`, `deferred-canvas-reviewer.ts`, `deferred-canvas-composite.ts`. Gate on full exact-revision prepared evidence, preserve source snapshots/hash checks; do not prepare inline or fall through to preview text when pending/failed. Wake pending AG1 candidates after preparation completion so a once-per-sync admission does not miss newly completed work. Keep reviewer quota/baseline rules. |
| Manual and other callers | Experience materials/prepare route, course sources/prepare route, lower-level files/ingest route, Activity Maker sources, usable-content/preview consumers: share admission/result semantics while preserving explicit Activity Maker attachment permissions and compatibility. EP3 owns normal Prepare-button removal. |
| Deferred work reconciliation | `notifications/canvas-poll.ts:pollCanvasCourse`, `auto-reviewers/poll-trigger.ts:maybeRequestContentSync`, and preparation orchestration. Persist/drain overflow even when no new module IDs arrive. Existing new-ID poll triggers alone cannot guarantee next-poll processing of deferred 30 materials or detect revised existing File/Page items. Preserve complete-evidence safeguards and provider pagination/Retry-After. |

**Proposed job shape:** one unique owner/material/revision row, equivalent to
one job per `(material_id, material_revision)` within the owned namespace.
Store course/connection/source type, revision fingerprint, original hash/size
once known, pending/running/prepared/failed/cancelled state, dispatch identity,
lease/fencing, safe reason, attempt counters and persisted result reference.
Use File metadata fingerprint / Page body-and-attachment revision evidence;
today's `updatedAt ?? unversioned` reviewer key alone is not sufficient to bind
prepared bytes. Fence revision changes before publication; never relabel older
results as the current revision. Idempotent re-enqueue returns the same job.
Do not store tokens or include private locators in owner-facing DTOs.

Retry once per admitted work cycle, with durable accounting across cycles;
at three preparation attempts across syncs mark terminal failed for automatic
work until the student's explicit Retry. Two failed attempts should already
show a safe failed reason, not hide in an infinite pending loop. Publication
requires persisted extraction, expected-page accounting and blocks. Cancellation
publishes no result. HTTP admission is background-safe only after durable task
acceptance/202; sync-origin work uses equivalent awaited dispatch and persisted
receipts. No per-user preparation cost quota; bounded file/page/provider limits
and resource leases remain.

**Runaway guard location:** durable per-sync orchestration/ledger, shared by
sync admission and worker completions, not a counter in the poll HTTP request.
Process batches of 25 up to 200. At each completed batch compare persisted
terminal prepared+failed totals and check repeated material/revision enqueue
evidence within that sync. A request redelivery should reconnect its receipt,
not masquerade as a new intentional enqueue. Repeat or no progress stops further
enqueue, preserves completed work, persists suppression of looping material
across later syncs, logs IDs and fixed signal only, and surfaces an owner
decision. A stuck worker needs a bounded lease/deadline check so the batch can
reach the no-progress evaluation. Beyond 200 stays durably deferred to the next
poll, never dropped. Use server state, not in-memory completion counts.

**Tests required by the roadmap:** forced same-revision re-enqueue trips repeat;
stuck worker trips no progress; 230 healthy materials prepare 200 and defer 30.
Add proportional regressions for next-poll drain without a new item, concurrent
idempotent claims, once-only retry/three-attempt stop/manual Retry, token broker
lease/owner denial, revision fencing, cancellation, prepared admission wait and
wake-up, Page attachment exclusion/provenance, and retained historical bytes.
Keep existing OCR blank/missing/duplicate/range cases and PV1c rollback/claim
tests. Verify Canvas stays 40 total pages; local durable PDFs retain 100/40.
EP1 chooses its checks from changed paths and records fresh/cached results.

## Verification and owner steps

- `git diff --check`: **FRESH PASS, 0 whitespace errors**, including staged docs.
- Typecheck, lint, tests and builds: **NOT RUN, 0 tasks/tests/builds**, as required
  for this docs-only audit. No cached suites are claimed. No gate failures or
  flakes; exploratory reads needed bounded reruns after output truncation and
  corrections of guessed Windows wildcard/nonexistent paths.
- **UNVERIFIED (owner to confirm):** fresh CIT17 inventory/OCR/bytes/cost,
  deployed revisions, applied migrations/buckets, actual retained originals,
  multi-session retention behavior, credentials/IAM/queues and Scheduler state.

**Owner steps remaining:** review this audit, then start EP1 from a fresh STEP 0
using ADR-026 if still free. Confirm live read-only aggregates and RB1/device
acceptance separately. Rollout and Device checks were entirely skipped; later
RB2 owns migration application, API/worker/mobile releases and the roadmap's
realme sync-to-Ready, instant exact-page, diagrams/Office snapshots, logo filter,
labeled visual and airplane-mode checks. EP0 has nothing to deploy. No Scheduler
or email activation is authorized here. For later authorized Vercel work,
strongly recommend installing the absent CLI with `npm i -g vercel`; no CLI
installation or Vercel command ran in EP0.
