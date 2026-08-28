# Reviewer Core Capstone Acceptance

Accepted: 2026-08-28, Asia/Manila.

Verdict: **READY FOR CAPSTONE REVIEWER DEMO**.

## Capability matrix

| Capability | Current contract | Acceptance |
|---|---|---|
| Pasted text | Editable normalized text to durable reviewer generation | Automated pass |
| Gallery image | PNG/JPEG up to 5 MB, durable OCR, editable extracted text | Automated pass; fresh physical device not run |
| Camera image | Expo camera permission/capture through the same image OCR path | Static/automated pass; fresh physical device not run |
| PDF | Up to 10 MB; durable jobs allow 100 total pages and at most 40 OCR-required pages; sync/Canvas extraction remains 40 total pages | Automated pass; saved metadata now matches the 100-page durable limit |
| Canvas | Persisted Pages, assignment descriptions, announcements, and prepared PDF/image files; up to 8 sources, 400 structured blocks, 250 selected blocks, 20,000 characters/source, and 90,000 combined preview characters | Fresh linked-project pass for page inventory, ten selected blocks, preview, generation, persistence, provenance, and source health |
| Engine | Deterministic Stage 0-6 pipeline with coverage, grounding, leakage, retry, and strict final assembly | 290/290 |
| Live OpenAI | Existing IT Security fixture | 18/18 sections, coverage 1.00, grounding 1.00, zero leakage and no visible enrichment |
| Processing | Durable HTTP 202 jobs, persisted named progress, success/failure, cancellation, retry, completion notification, reconciliation, and cached result | Automated and previously hosted accepted; completed results can now save from Processing |
| Study Library | Owner-scoped save, list, open, rename, delete, source health | Fresh linked-project pass |

## Current architecture

The mobile reviewer screen accepts paste, gallery, camera, or PDF input. Image
and document sources are durably extracted first, then shown as editable text.
Canvas source selection reads synchronized rows, prepares supported files,
builds a server-validated structure/selection preview, and sends the preview
session plus a resolution fingerprint into generation. Reviewer generation is
accepted as a durable job; Processing renders the persisted stage and unit
progress, reconciles after navigation or relaunch, retrieves the reviewer, and
now exposes the same save operation as the originating screen. Study Library
uses the same `ReviewerPreview` structure for persisted results.

The engine normalizes the source (Stage 0), detects its outline (Stage 1),
creates a one-to-one section plan and schema choices (Stage 2), generates and
validates each section at the provider boundary (Stage 3), verifies outline
coverage (Stage 4), checks grounding and leakage and performs bounded retry or
safe extractive fallback (Stage 5a/5), then assembles only ordered validated
sections without a final generative pass (Stage 6).

## Fresh runtime evidence

An isolated linked-Supabase acceptance created two fictional confirmed users
and one fictional synchronized Canvas page. It passed inventory, structured
block selection, selective preview, authenticated OpenAI generation (three
sections), coverage/grounding/leakage, immutable snapshot creation, save, list,
open, rename, delete, API denial for the other owner, direct RLS denial, current
source status, and `ready_current` regeneration readiness. Both users and all
dependent rows were deleted; the post-cleanup residue count was zero.

The first fresh attempt intentionally used the local Vercel Workflow-backed
202 route. Acceptance and polling worked, but the local workflow worker did not
advance the job before the 240-second harness deadline. Cleanup still passed.
The protected synchronous Canvas route then completed the same linked-project
generation and persistence path successfully. Durable processing retains its
automated coverage and prior hosted acceptance; the local worker timeout is an
environment/deployment rehearsal risk, not evidence of lost persisted data.

## Defects hardened

1. Saved-reviewer validation still limited `pdfPageCount` to five although
   durable extraction supports 100 total pages. Validation now imports the
   durable policy constant, accepts 100, and rejects 101.
2. Completion routing correctly opened reviewer jobs in global Processing, but
   that reader could not save the result. Processing now preserves a returned
   Canvas snapshot, accepts a title, calls the existing owner-scoped save API,
   and points successful saves to Study Library.

## Provenance and persistence

Saved rows retain the title, complete structured reviewer output, section
count, source metadata, generation metadata inside the reviewer output, and
created/updated timestamps. Canvas reviewers also require an owned immutable
snapshot. That snapshot retains exact selected source items and blocks,
ordering/relationships, parser and OCR versions, edit state, generation time,
and hashes used to compare current synchronized rows. Source health reports
current, changed, unavailable, unsupported, missing-after-sync, or unknown and
maps those results to regeneration readiness.

Non-Canvas library rows retain descriptive source metadata but do not expose
an immutable raw-source snapshot. After a cold start, a non-Canvas reviewer
opened only from Processing can be saved and reopened, but its original
gallery/camera/PDF mode is conservatively recorded as pasted text because that
origin is not part of the public reviewer-job result contract.

## Recommended demonstration

Use a preselected course that has already completed a successful sync. Open
Canvas source selection, select one or more compact Pages/assignment/
announcement blocks, inspect the preview, generate, show real section progress,
open the completed reviewer, save it, and reopen it from Study Library. Before
the presentation, rehearse the deployed durable worker and keep the same source
available.

The safest fallback is the tracked IT Security pasted-text fixture: paste it,
edit/confirm the source, generate, show progress, save, and reopen. A native-text
PDF under the documented limits is the second fallback; it still requires
network access for upload and generation.

## Known limitations

- Fresh camera and long-document device acceptance was not run in this audit.
- Current mobile Canvas selection presents one source at a time even though the
  backend supports multi-source and selective structured blocks.
- List-heavy live output is accurate but can have sparse explanations, and one
  source-formatting fragment remains awkward.
- Study Library operations and reviewer generation require network access;
  previously retrieved durable artifacts can be cached, but offline upload
  staging does not exist.
- The full API suite is 576/577 after the two added reviewer-save boundary
  tests. Its sole failure is the documented unrelated Windows CRLF-sensitive
  Canvas SQL substring assertion.

## Verification summary

- Reviewer engine: 290/290.
- Mobile: 269/269.
- Shared: 32/32.
- OCR package: 27/27.
- Canvas package: 72/72.
- Targeted reviewer API: 18/18.
- Forced root typecheck/lint: 7/7 packages; lint has only four known warnings.
- API and engine production builds: PASS; full API: 576/577 with only the known
  unrelated Windows CRLF-sensitive assertion failing.
