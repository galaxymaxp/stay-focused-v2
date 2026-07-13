# Product Recovery Phase R3 - Full-document OCR with page completeness

Date: 2026-07-13 (Asia/Manila)

## Starting state

- V2 branch: `main`
- V2 starting commit: `a1ffef95cdc99dc9f0845d6dd2779b2969466f37`
  (`fix(reviewer): add reliable section fallback pipeline`); the hash matched
  the requested R2 baseline even though its actual subject differed from the
  descriptive subject in the task brief.
- Ahead/behind: `0/0`
- Initial dirty paths: `apps/api/next-env.d.ts`,
  `apps/mobile/expo-env.d.ts`, `apps/mobile/.gitignore`, and `.vscode/`; all
  were declared unrelated and remained outside R3.
- V1 reference: clean read-only `main` at
  `d26decf3f82d61f2e8dd6ba2444c6c156473163a`; it was not modified.
- Baselines: OCR 14/14 tests, engine 287/287 evaluations, API 383/383 tests,
  and mobile 126/126 tests.

## Current OCR architecture and audit

| Input path | Page-count source | Extraction method | Previous completeness behavior | Main risk |
|---|---|---|---|---|
| Camera/gallery image | Implicit single page | Google `documentTextDetection` | One normalized page | An empty or malformed provider result had no document-level proof |
| Uploaded image | Implicit single page | Same provider boundary | Same as camera/gallery | Route trusted provider success as complete |
| Uploaded PDF | `pdf-lib` parse before provider work | One synchronous Google `batchAnnotateFiles` request for pages `1..N` | Requested pages were reported as processed without exact response coverage proof | Missing/duplicate/malformed pages could reach combined text |
| Canvas prepared image/PDF | Stored-byte revalidation, then the same image/PDF helpers | Same Google boundary | Shared extraction helper, but no authoritative completeness verifier | Incomplete OCR could enter a Canvas preview |
| Native-text or mixed PDF | `pdf-lib` page count | Entire document is processed uniformly through OCR | No separate native-text extraction or hybrid method exists | Native and scanned pages were not independently classified |

The PDF route already rejected invalid signatures, malformed/encrypted PDFs,
files above 10 MiB, and documents outside 1-5 pages before Google OCR. The
provider used one synchronous call and no retry. It normalized response arrays
positionally, failed the whole request for a page-level provider error, checked
only a short response, ignored extra results, and returned the requested page
count as the processed count. Combined text used blank-line separators and did
not add artificial `Page N` labels.

The mobile OCR action and reviewer action were separate user steps. A failed
retry could leave old editable OCR text in state, so reviewer generation was
not cryptographically or structurally tied to the latest extraction result.

V1 rendered PDFs page by page and tracked `completed`, `empty`, and `failed`
states with timeout/retry behavior. Those per-page terminal states were a useful
test idea. V1 could cap/truncate work, build output from only successful pages,
return a completed status while another page failed, and inject `Page N:` into
source text. R3 adopts the page-state lesson but none of those unsafe behaviors.

## Reproduced failure classes

| Failure class | Previous behavior | Deterministic evidence |
|---|---|---|
| Five-page coverage | Provider request named five pages | Processed count was derived from the request, not the response |
| Blank middle page | Empty annotations normalized as empty text | Blank was not an explicit terminal document state |
| Failed middle page | Provider threw the whole document | Later-page state and affected-page metadata were lost |
| Missing final result | Provider detected only a shorter response | No single reusable verifier guarded every caller |
| Duplicate page result | Position-based normalization made identity implicit | Uniqueness was not validated |
| Out-of-order result | Response array position became page identity | Ordering was assumed rather than proven |
| Out-of-range result | Extra results were ignored | Invalid coverage could still appear successful |
| Malformed page result | Empty/missing shapes were ambiguous | Malformed data could resemble a blank page |
| Provider-wide failure | Generic OCR failure | No safe failed-document diagnostic shape |
| Empty document | Empty text reached generic empty-result handling | All-blank completeness and source eligibility were conflated |
| Partial reviewer handoff | Old editable OCR text could survive a failed retry | Generation could use stale source after incomplete OCR |
| Artificial page markers | V2 did not add them; V1 did | Regression test proves assembly contains no invented labels |

The new tests were first run against the old contract and failed because no
authoritative completeness module or explicit page states existed.

## Page-completeness contract

The shared `@stay-focused/ocr` package now owns one authoritative
`verifyDocumentExtraction` function. A document is `complete`, `incomplete`,
or `failed`. Each page is `text_extracted`, `blank`, or `failed`, with a page
number, accurate method (`ocr`, `native_text`, or `blank`), and an optional
sanitized failure category.

Complete means `expectedPageCount > 0`, exact unique coverage of `1..N`, no
out-of-range result, valid terminal states, no failed page, and deterministic
ascending order. A confirmed blank page remains in its original position,
counts as processed and complete, contributes no invented text, and is not
interchangeable with absent or malformed data. All-blank input is structurally
complete but source-ineligible and returns `document_unreadable`.

Missing, duplicate, out-of-range, malformed, or failed results produce an
incomplete document with no assembled text and `sourceEligible: false`.
Provider-wide failure produces a failed document. Neither state can enter the
reviewer pipeline. Combined source text uses only original extracted text,
ordered by page number and separated by blank lines; page identity remains
structured metadata and no page label is injected.

## Accepted page limit

The accepted PDF limit remains five pages and is now centralized as
`OCR_MAX_PDF_PAGES` in `@stay-focused/ocr`. This is not an arbitrary mobile
decision: the current inline synchronous Google Vision `files:annotate` method
supports at most five pages per request. Google's asynchronous path supports
larger files but requires Cloud Storage and a different execution model, which
is outside R3. The existing route has `maxDuration = 60`; observed five-page
OCR took 1.591 seconds and the slowest protected OCR case took 5.443 seconds.

Evidence:

- https://docs.cloud.google.com/vision/docs/samples/vision-batch-annotate-files
- https://docs.cloud.google.com/vision/quotas
- https://nextjs.org/docs/app/api-reference/file-conventions/route-segment-config

Page count is parsed and the limit rejected before any external OCR call.
There is one provider call per accepted image or PDF, concurrency is one, and
no provider retry is added.

## Implementation

| Area | Change | Result |
|---|---|---|
| OCR contract | Added strict document/page statuses, diagnostics, methods, policy, and verifier | Exact coverage has one authoritative definition |
| Provider normalization | Emits explicit text/blank/failed results; retains missing and extra evidence for verification | No page-level anomaly is silently omitted |
| Extraction service | Verifies every image/PDF provider result against the trusted expected count | Only complete source is returned as eligible |
| API routes | Return additive sanitized extraction metadata and actionable `422` completeness errors | Counts and affected page numbers are available without text |
| Canvas prepared files | Reuses the same verified extraction boundary | Canvas preview cannot bypass completeness checks |
| Mobile API | Requires complete extraction proof for PDF success and parses safe failure diagnostics | A nominal HTTP success cannot silently bypass the gate |
| Mobile source flow | Clears stale OCR text on start/failure/mode switch and tracks readiness | Failed or stale extraction cannot start reviewer generation |
| Reviewer screen | Hard-gates image/PDF generation on current completed extraction | Reviewer provider calls remain zero for incomplete OCR |
| Browser smoke | Mocked response now carries the additive complete-document contract | Existing editable OCR-to-reviewer flow remains compatible |

## API and mobile behavior

Successful image and PDF responses preserve their existing text/pages shape
and add `extraction` diagnostics. Incomplete extraction returns HTTP 422 with
`document_extraction_incomplete`; all-blank content returns
`document_unreadable`; internal extraction failure returns
`document_extraction_failed`; existing provider availability failures remain a
sanitized retryable provider error. Public metadata contains counts, status,
and safe page-number arrays only. It excludes OCR excerpts, titles, provider
messages/bodies/IDs, stack traces, file paths, credentials, and private Canvas
data.

Mobile now says that not every page could be read and suggests retrying,
rescanning, or choosing another document. Unreadable input asks for a clearer
scan; provider outage gives generic retry guidance; page-limit copy names the
five-page accepted limit. OCR failures never show reviewer-recovery messaging.

## Deterministic verification

The OCR suite grew from 14 to 25 tests. It covers exact five-page coverage,
out-of-order reordering, blank middle page, missing final page, duplicate page,
out-of-range page, failed page, malformed result, invalid expected count,
all-blank rejection, mixed accurate methods, no artificial labels, and
diagnostics without source text.

API route/provider/service coverage includes single-page image compatibility,
two- and five-page PDFs, early over-limit rejection, blank middle pages,
missing/duplicate/out-of-range/out-of-order/failed/malformed results,
provider-wide failure, malformed/encrypted/empty PDFs, actual processed counts,
and sanitized metadata. Mobile tests prove successful progress, actionable OCR
errors, stale-source clearing, readiness gating, and separation from reviewer
recovery copy.

Final automated counts: OCR 25/25, engine 287/287, API 391/391, mobile 130/130,
and reviewer smoke-runner tests 51/51. Typecheck, build, lint, root checks, and
the PDF OCR browser smoke all passed.

## Protected live validation

The protected harness used generated fictional in-memory fixtures and the real
authenticated API/Google OCR boundary. It emitted aggregate counts and hashes
only; no OCR text, title, upload, provider response, request body, or credential
was printed or persisted.

| Source label | Expected | Processed | Extracted | Blank | Failed | Status | OCR calls | Duration | Reviewer |
|---|---:|---:|---:|---:|---:|---|---:|---:|---|
| single-page-image | 1 | 1 | 1 | 0 | 0 | complete | 1 | 5,443 ms | not requested |
| two-page-scanned | 2 | 2 | 2 | 0 | 0 | complete | 1 | 2,725 ms | not requested |
| five-page-scanned | 5 | 5 | 5 | 0 | 0 | complete | 1 | 1,591 ms | HTTP 200; coverage, grounding, leakage passed |
| blank-middle | 3 | 3 | 2 | 1 | 0 | complete | 1 | 2,784 ms | not requested |
| controlled-incomplete | 3 | 2 | 2 | 0 | 0 | incomplete | 1 simulated | 1 ms | not started |

The five-page case returned five ordered non-revealing page hashes. The blank
case retained page 2 as blank and page 3 as page 3. The controlled incomplete
case returned no assembled source and made zero reviewer calls. Maximum
observed OCR concurrency was one.

## Exact verification commands

All of the following passed:

- `npm run typecheck --workspace @stay-focused/ocr`
- `npm run build --workspace @stay-focused/ocr`
- `npm run test --workspace @stay-focused/ocr` - 25/25
- `npm run typecheck --workspace @stay-focused/engine`
- `npm run build --workspace @stay-focused/engine`
- `npm run eval --workspace @stay-focused/engine` - 287/287
- `npm run typecheck --workspace @stay-focused/api`
- `npm run lint --workspace @stay-focused/api`
- `npm run test --workspace @stay-focused/api` - 391/391
- `npm run build --workspace @stay-focused/api`
- `npm run typecheck --workspace @stay-focused/mobile`
- `npm run lint --workspace @stay-focused/mobile`
- `npm run test --workspace @stay-focused/mobile` - 130/130
- `npm run typecheck` - 7/7 workspaces
- `npm run lint` - 7/7 workspaces
- `npm run test:reviewer-web-smoke` - 51/51
- `npm run smoke:ocr-pdf:web` - passed with mocked OCR and real reviewer HTTP 200
- `npm run validate:ocr:r3` - protected matrix passed
- `node --check scripts/ocr-pdf-web-smoke.mjs`
- `git diff --check`

## Remaining limitations

- Full-document means all pages inside the accepted five-page synchronous
  limit, not unlimited input. Larger PDFs require a separately planned async
  Cloud Storage architecture.
- PDFs are processed uniformly through OCR; separate native-text extraction and
  native/scanned hybrid classification are not implemented.
- Repeated scanned-PDF header/footer cleanup remains deferred and editable by
  the student before generation.
- Live OCR remains credential-, network-, provider-, and local-machine
  dependent. The deterministic suites require no private document.
- Phase 5E.6 remains in progress and is unchanged.

## Verdict

PRODUCT RECOVERY PHASE R3 COMPLETE - full-document OCR page completeness enforced

Next recommended task: Product Recovery Phase R4 - Canvas usable-content resolution.
