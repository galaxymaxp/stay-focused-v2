# B29 live OCR and learning-image acceptance

Date: 2026-09-19 (Asia/Manila)

Verdict: **PARTIAL — OCR implementation is sound but required live material acceptance remains incomplete.** A real one-page, image-only Hiragana chart and a real Piaget instructional JPEG completed production Google Vision extraction, fresh Reviewer generation, persistence, and Android Library retrieval. No eligible instructional image exists in the synchronized production Canvas account, so Canvas image discovery and the local routing repair could not be physically accepted. A larger 16-page, 8.1 MB image-only accounting PDF remained in native inspection for more than five minutes and was cancelled safely.

## Starting state

- Branch `b25-3-3-ai-first`; starting HEAD `d526e3e6102132d402406cb66cff960ae38e4a93`; `origin/main...HEAD` was 0 behind / 17 ahead.
- The worktree was clean before B29. `git fsck --full` exited 0 and reported only pre-existing dangling objects.
- The canonical production alias remained on READY deployment `dpl_BXWY9fC2L59bzJnPscspMdKLZHpT`, the accepted B27 deployment based on `08018a8`.
- A realme RMX3151 running Android 13 was connected, authorized, and retained an authenticated production session.

## OCR architecture trace

```text
Text PDF
  -> upload or owner/course-scoped Canvas acquisition
  -> MIME/extension/signature/size validation
  -> private stored bytes + byte-count/SHA-256 verification for Canvas files
  -> pdf.js page inspection
  -> usable native text retained in page order
  -> all pages verified
  -> sanitized ordered source + provenance/source version
  -> buildGenerationContext
  -> durable Reviewer job -> OpenAI -> thin contract validation
  -> owner-linked artifact -> Library

Scanned or mixed PDF
  -> the same safe PDF acquisition
  -> pdf.js page inspection classifies native, explicit blank, or OCR-required pages
  -> zero-text visible pages and sparse layout-incomplete pages selected for OCR
  -> selected page numbers batched at at most 5 pages per Vision request
  -> at most 2 OCR chunks execute concurrently
  -> Vision blocks/lines/bounds/confidence normalized
  -> OCR results mapped back to original page numbers and sorted
  -> exact page count/range/uniqueness/completeness verified
  -> sparse native text supplemented without repeating identical OCR text
  -> empty or unreadable output fails before generation
  -> ordered source/provenance -> buildGenerationContext -> durable Reviewer -> Library

PNG/JPEG
  -> upload or owner/course-scoped Canvas acquisition
  -> MIME/extension/signature/size validation
  -> Google Vision documentTextDetection
  -> normalized blocks/lines/bounds/confidence
  -> sanitized non-empty source + provenance/source version
  -> buildGenerationContext -> durable Reviewer -> owner-linked artifact -> Library
```

The synchronous PDF deadline is 50 seconds; each provider request has a 12-second timeout. The durable path permits 100 total PDF pages with at most 40 OCR pages. The synchronous/Canvas PDF policy remains 40 pages. Google Vision PDF calls are limited to five pages each. Provider errors are converted to safe generic application errors; raw provider payloads are not returned to students. Workflow execution supplies durable retry/recovery behavior; the provider adapter itself does not contain an unbounded retry loop.

## Google Vision readiness

Accepted environment variable names:

- `GOOGLE_CLOUD_CREDENTIALS_JSON`
- `GOOGLE_APPLICATION_CREDENTIALS`
- `GOOGLE_CLOUD_PROJECT`
- `GOOGLE_CLOUD_PROJECT_ID`

Local validation had none of these credentials and therefore did not call the live provider locally. Vercel Production contains `GOOGLE_CLOUD_CREDENTIALS_JSON` and `GOOGLE_CLOUD_PROJECT`; values were never read or printed. The Vercel Workflow runtime used the production environment successfully for both live B29 extractions.

## Real OCR materials located

| Course/location | Identity | Material | Type | Size | Why suitable |
|---|---|---|---|---:|---|
| FL 100, BSBIO 2-B, Foreign Culture and Language Canvas export | Export entry `Files/Hiragana Charts.pdf` | Hiragana Charts | Image-only PDF, 1 page | 169,991 bytes | A real course kana chart with meaningful Japanese characters, romanization, dakuon, handakuon, and contracted sounds; independent inspection found zero native text |
| CIT5, CITCS 2F Group A, Accounting Essentials Canvas export | Export entry `Files/2-Journaling.pdf` | 2-Journaling | Image-only PDF, 16 pages | 8,089,877 bytes | A real scanned accounting lecture; independent inspection found zero native text on all 16 pages |
| PSYCH 100, CITCS 1M, Understanding the Self Canvas export | Export entry `Extracted_Files/Piaget-1.jpg` | Piaget's Stages of Cognitive Development | JPEG | 314,868 bytes | A real instructional table containing four stages, age ranges, and educational descriptions |
| CC16, CITCS 2N Group A, IT Security | Canvas course `61456`, file `10895533`, module `General Information`, module item `2607200` | APA Sample.png | PNG | 98,102 bytes | A reference-format sample with meaningful text, but it is placed in an administrative module and is intentionally excluded from Generate |

The production synchronized account also contained course logos, a profile photo, and course/LMS banners. They are unsuitable learning-image evidence and were not used.

## Learning-image eligibility investigation

- **B28 missing image:** CC16 `APA Sample.png`, Canvas file `10895533`, direct module File item `2607200` in `General Information`.
- **Current contract:** PNG/JPEG are supported ingestion types, but a Canvas image is a Generate candidate only when a direct module File item establishes learning-material placement and the module/title routing rules do not identify administrative/orientation content.
- **Classification:** `INTENDED_SUPPORTED`.
- **Root cause for the exact B28 image:** intentional administrative-module routing exclusion. Its MIME, signature, stored bytes, and direct module reference were valid.
- **Additional gap found:** all ungrouped Canvas images were previously candidates solely because their MIME was eligible. In live data, that admitted logos, banners, and a profile photo as false positives.
- **Repair:** ungrouped images are now excluded. Direct module File images in non-administrative learning modules remain eligible. No filename classifier or general Canvas sync rewrite was added.

## Scanned-PDF acceptance

| Check | Result | Evidence |
|---|---|---|
| Native text state | PASS | The Hiragana PDF had one visible page and zero native characters; the 16-page Accounting PDF had zero native text on every page |
| OCR actually invoked | PASS | Production job `8d0ed247-dc8b-4f85-b118-f2e02b58dcd1` recorded `ocrChunkCount: 1`, 1/1 processed page, and a 20,335 ms extraction duration |
| OCR pages | PASS for the accepted source | 1/1 page required and received OCR; no native page was available to mask the result |
| Extracted content | PASS | 688 raw and normalized characters; visible kana rows, romanizations, Dakuon, Handakuon, and Yō-on survived. Output was non-empty and had no repeated native/OCR copy |
| Ordering | PASS with limit | The single source page was accounted for exactly. Multi-page order/completeness is covered by automated tests; the 16-page live source did not pass inspection and supplies no live multi-page order evidence |
| Provenance | PASS | Filename, MIME, bytes, page count, extraction result, source version, content hash, policy versions, and owner link were persisted |
| Generation context | PASS | The generation job consumed the same 688-character source version and produced a six-section kana Reviewer |

The larger accounting job `30943105-842a-4fc3-84a2-cbc347b8083e` remained at `inspecting_document`, 0/16 pages, for more than five minutes. Android cancellation changed it to `cancellation_requested`; Workflow reconciled it to `cancelled` about three minutes later, released the lease, and exposed a safe Return to source action. This is a retained scale/performance limitation, not evidence of a Vision failure because the job never reached OCR.

## Instructional-image OCR acceptance

| Check | Result | Evidence |
|---|---|---|
| Canvas discovery | NOT EXERCISED | No synchronized direct-module instructional PNG/JPEG outside administrative content existed. Unsuitable logos/banners/profile imagery was rejected as evidence |
| Eligibility | PASS in code/tests; physical Canvas pending | Direct module teaching images remain eligible; ungrouped artwork and administrative images are excluded |
| Acquisition | PASS for safe fixture | Android Files selected the real 314,868-byte JPEG and production accepted its JPEG MIME/signature. Canvas private-download provenance was not exercised for this image |
| OCR invoked | PASS | Production image job `128d2dce-d2d1-4d26-9411-fcdfc11a2301` used the image-only Vision path and completed one processed page in 9,973 ms |
| OCR quality | PASS | 965 characters retained the main title, all four stage names, age ranges, and their major descriptions without garbage dominating the result |
| Provenance | PASS for upload; Canvas pending | The upload extraction result/source version and owner matched. Canvas course/module/file provenance could not be exercised |
| Generation-ready | PASS | The exact 965-character source version completed a six-section Piaget Reviewer |

## OCR-derived generation acceptance

| Source | OCR/extraction | Generation | Persistence | Android retrieval | Result |
|---|---|---|---|---|---|
| Hiragana Charts image-only PDF | PASS, 688 characters, 1/1 OCR page | PASS, job `93db7946-f03c-45c2-805a-8c6ffc11d8b8`, one provider call, six sections | PASS, result and Reviewer artifact owner links matched | PASS, Library reopened `Japanese Kana Reviewer: Basic Rows, Voiced Sounds, and Contracted Sounds` | PASS |
| Piaget instructional JPEG | PASS, 965 characters | PASS, job `caaefbac-5ffb-4e3b-9493-59b184f7af1e`, one provider call, six sections | PASS, result and Reviewer artifact owner links matched | PASS, Library reopened `Piaget's Stages of Cognitive Development` | PASS as safe provider fixture; Canvas discovery NOT EXERCISED |
| 16-page Accounting scan | INCOMPLETE; stalled before OCR and cancelled | NOT RUN | No result/artifact created | Safe cancelled state shown | PARTIAL |

## Failure handling and privacy

| Scenario | Result | Evidence |
|---|---|---|
| Zero-text scan | PASS | The zero-native-text Hiragana page invoked OCR and could not silently succeed as empty |
| Empty OCR | PASS, automated | Empty provider output becomes an explicit unusable-source failure before OpenAI |
| Provider failure / malformed response | PASS, automated | Safe OCR failure returned; missing/duplicate/out-of-range page evidence is rejected |
| Credential failure | PASS, automated | Safe configuration failure; credential values and raw provider response are not exposed |
| Provider timeout | PASS, automated | Bounded request timeout and safe failure; no empty success |
| Transient upload/API connection | PASS live | Android displayed `Could not reach the API`; Retry extraction subsequently completed the Hiragana source |
| Cancellation | PASS live | The 16-page job reconciled to terminal `cancelled`, had no result, and allowed return to source |
| MIME/signature/hash/byte mismatch | PASS, automated | Invalid or changed stored bytes are rejected before OCR |
| Owner boundary | PASS | Canvas acquisition checks owner/connection/course; all B29 job, source, result, artifact-version, and artifact owner joins matched |

Credentials, signed URLs, storage tokens, and raw provider errors were not logged or placed in documentation. Canvas objects remain in the private bucket under owner/file/hash-derived keys. Public source descriptors carry safe provenance and omit private storage URLs.

## Routing regression

| Content | Expected surface | Result | Notes |
|---|---|---|---|
| Announcement | Announcements | PASS | Existing production/device separation retained; routing tests pass |
| Learning PDF | Generate | PASS | Existing B28 acceptance retained |
| Scanned learning PDF | Generate/import | PASS for direct import | Hiragana scan completed; no synced Canvas scan was available |
| Eligible instructional image | Generate when direct module learning material | PASS in code; Canvas physical NOT EXERCISED | Safe direct-import image completed; no eligible synced Canvas image existed |
| Decorative/non-learning image | Excluded | PASS | New regression excludes ungrouped banner; live account logos/banners/profile photo do not qualify |
| Learning PPTX | Generate | PASS | Existing behavior and tests retained |
| Lesson Page | Generate | PASS | Existing behavior and tests retained |
| Assignment | Tasks | PASS | Existing production/device separation retained |
| Orientation/course outline | Excluded/separate | PASS | Existing admin-module/title rules retained; APA sample remains excluded in `General Information` |

## Physical Android acceptance

On the authorized realme RMX3151 / Android 13, the authenticated production app selected both real export-derived fixtures through the normal image/PDF import controls. Durable status UI allowed navigation and restoration. Both fresh Reviewers persisted and reopened from Library with content corresponding to their source. The app exposed readable retry/cancellation messages and no raw OCR or provider debug payload. The running production app still uses accepted deployment `08018a8`; the new image-routing guard is local and therefore has no physical Canvas acceptance claim.

## Automated verification

| Suite/command | Result | Count/notes |
|---|---|---|
| `npm run test --workspace @stay-focused/canvas` | PASS | 73/73 |
| `npm run test --workspace @stay-focused/api` | PASS | 872 passed, 3 skipped; includes the new image-routing regression |
| `npm run test --workspace @stay-focused/mobile` | PASS | 455/455 |
| `npm run test --workspace @stay-focused/shared` | PASS | 44/44 |
| OCR tests | PASS | 27/27 |
| Engine tests | NOT RUN | Generation input/context code was not changed; root typecheck/build covered package compilation |
| `npm run typecheck` | PASS | 7/7 workspaces |
| `npm run lint` | PASS | 7/7; four existing Mobile import-order warnings, zero errors |
| Root `npm run build` in sandbox | ENVIRONMENT FAILURE | Filesystem traversal denied and aliases could not resolve |
| Root `npm run build` elevated | KNOWN LOCAL FAILURE | API compiled; Expo export could not resolve junctioned `expo-router`, unchanged from B27/B28 |
| Isolated DB/API production build elevated | PASS | Workflow bundle, Next production build, and 28 static pages/routes completed |
| `git diff --check` | PASS | No whitespace errors |
| `git fsck --full` | PASS | Only pre-existing dangling objects |

## Repairs

One focused repair was made in `canvas-reviewer-sources.ts`: Canvas image files now require a direct module File placement before they can appear in Generate. The existing administrative module/title exclusions still apply. Regression coverage proves that an ungrouped course banner and `General Information` APA image are excluded while a direct `Cell Biology` teaching diagram remains eligible.

No OCR provider, parser, generation, database schema, or migration-history change was made. No deployment, push, merge, or Canvas mutation occurred.

## Remaining limitations

- Production Canvas image acceptance remains `NOT EXERCISED`: the synchronized account has no eligible direct-module instructional PNG/JPEG outside administrative content, and the local routing repair is not deployed.
- The 16-page, 8.1 MB zero-native-text accounting scan stalled before OCR and was cancelled. One-page live OCR passed, while live first/middle/last page ordering on a multi-page scan remains open.
- Canvas DOCX live acceptance remains open from B28.
- The B27 Supabase migration-history mismatch remains unchanged: local `20260918120000_canvas_announcement_student_metadata.sql`, remote recorded `20260918123510`. No migration push or history edit occurred.
- The unchanged local root-build junction issue prevents Expo from resolving `expo-router`; the isolated production-equivalent API build passes.
- The direct-import image proves the live Vision/provider/generation path but does not prove Canvas download metadata, module discovery, or Canvas image provenance on a physical device.

## Recommended B30

Run one bounded Canvas instructional-image production acceptance task: deploy the reviewed B29 routing guard, synchronize one consented PNG/JPEG attached as a direct File item to a non-administrative teaching module, and verify Generate discovery, Canvas acquisition/provenance, fresh Reviewer completion, persistence, and physical Android Library reopen while confirming ungrouped artwork remains excluded.
