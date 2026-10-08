# B28 ingestion coverage and document-format acceptance

Date: 2026-09-19 (Asia/Manila)

Verdict: **PARTIAL — core Canvas PDF, PPTX, and Page ingestion is freshly accepted; live scanned PDF, instructional image OCR, and Canvas DOCX acceptance remain unproven.** No production code or database migration was changed.

## Starting state and deployment

- Branch `b25-3-3-ai-first`; starting HEAD `653e95a6fa35da82e7040eaeb6244151c8540e87`; clean tree; `origin/main...HEAD` 0 behind / 16 ahead.
- `git log --oneline -8` begins `653e95a`, `08018a8`, `6b0a806`, `43e2775`, `9f85feb`, `9d7b52d`, `ffa9e47`, `51148bb`.
- `git fsck --full` exited 0, reporting only dangling objects.
- Read-only Vercel inspection found the canonical production alias on READY deployment `dpl_BXWY9fC2L59bzJnPscspMdKLZHpT`, the accepted B27 deployment of `08018a8`.
- The worktree contains no unrelated dirty files. The temporary device screenshot was removed after visual inspection.

## Actual ingestion architecture

```text
Canvas paginated course/module/file/Page discovery
  -> persisted owner/course-scoped Canvas metadata
  -> Generate routing excludes announcements, assignments, and observed administrative material
  -> file: Canvas metadata refresh + bounded/redirect-checked download + MIME/extension/signature check
  -> private Storage + byte count/SHA-256 check on read
  -> PDF pdf.js native page inspection, Google Cloud Vision OCR for needed pages;
     DOCX/PPTX bounded OOXML ZIP parser; text UTF-8; PNG/JPEG Google Vision OCR
  -> Page: persisted body_html -> parse5 readable text and structured blocks
  -> sanitized, ordered source text + provenance/snapshot + source version
  -> durable reviewer job -> buildGenerationContext -> OpenAI -> contract validation/one repair
  -> owner-linked result and artifact version -> Library
```

Code boundaries: `packages/canvas/src/client.ts` discovers Pages/files and downloads same-origin or constrained redirected binary; `apps/api/src/lib/canvas-file-ingestion.ts` persists files; `canvas-file-policy.ts` validates types and signatures; `canvas-stored-file-extraction.ts` dispatches; `activity-maker/office-extraction.ts` parses OOXML; `ocr/extraction-service.ts` chooses native PDF text and needed OCR pages; `canvas-content-normalization.ts` and `canvas-structured-blocks.ts` normalize HTML/blocks; `canvas-reviewer-sources.ts` resolves source and provenance; `packages/engine/src/generation-context.ts` rejects empty sources and retains ordered text in bounded batches. Mobile direct upload picker is PDF-only; Canvas supports the additional types below.

## Format support matrix

| Format | Discovery | Acquisition | Extraction | Generation-ready | Status | Notes |
|---|---|---|---|---|---|---|
| Text PDF | Canvas file and mobile PDF picker | Bounded Canvas download/private Storage; direct PDF upload | pdf.js native page text | Fresh 33-page Canvas job succeeded | SUPPORTED | 40-page synchronous/Canvas limit; 7,984 characters, 109 blocks |
| Scanned/image PDF | Canvas PDF and direct PDF picker | Same PDF acquisition | Sparse/image pages use Google Cloud Vision OCR | Fake-provider page-order tests pass; no real scanned source run | PARTIAL | No suitable scanned learning PDF/fixture found for live OCR acceptance |
| PPTX | Canvas file | Bounded download/private Storage | OOXML slides in presentation relationship order | Fresh Canvas job succeeded | SUPPORTED | 39 slide markers, 9,873 characters; structured snapshot stores one paragraph block, while slide labels/newlines survive within text; notes/images not extracted |
| DOCX | Canvas MIME path; none in synchronized files | Implemented Canvas download/private Storage | OOXML headings, paragraphs, numbering and tables | Local 141,927-byte fixture yielded 4,974 readable characters; no live Canvas job | PARTIAL | Product path is implemented; no Canvas DOCX learning material to prove live end-to-end |
| Canvas Page | Canvas Page/module item | Persisted Page HTML | parse5 text and structured blocks | Fresh Canvas job succeeded | SUPPORTED | 10,035 HTML characters -> 8,227 source characters, 137 blocks |
| TXT/Markdown | Canvas MIME path; no account sample | Implemented Canvas download/private Storage | Strict UTF-8 plus sanitization | Automated extraction/context tests pass | PARTIAL | No real Canvas generation run |
| PNG/JPEG | Canvas file; six synchronized image rows | Implemented download/private Storage | Google Cloud Vision OCR | Fake-provider tests pass; no live instructional image job | PARTIAL | Module-linked `APA Sample.png` exists but is not exposed in the accepted Generate material list; decorative/logo images are unsuitable proof |
| PPT/DOC/XLS/XLSX/RTF | May appear in Canvas metadata | No eligible binary path | None | No | UNSUPPORTED | Correctly metadata-only/unsupported, not claimed as generation-ready |
| Standalone HTML | Canvas metadata possible | Blocked as file | None | No | UNSUPPORTED | Canvas **Page** HTML is supported through the Page path |

## Fresh real materials and source fidelity

| Course/source | Canvas identity | Material | Raw size | Extracted/snapshot text | Blocks | Result |
|---|---|---|---:|---:|---:|---|
| CC17 Mobile Application Design and Development | course `66935`, file `11487741` | `Module 1 - Introduction to the Android Platform.pptx` | 1,805,064 bytes | 9,873 characters; 39 ordered slide markers, 410 line breaks | 1 | Fresh Reviewer succeeded and opened with Android platform/lifecycle content |
| CC16 IT Security | course `61456`, file `10910071` | `2. Firewalls.pdf` | 303,908 bytes | 7,984 characters; 33 page provenance, 399 line breaks | 109 | Fresh Reviewer succeeded and opened with firewalls/VPNs content |
| CC13 Systems Analysis and Design | course `28418`, Page `491211`, slug `fact-gathering-methods` | `Fact Gathering Methods` | 10,035 HTML characters | 8,227 characters; 272 line breaks | 137 | Fresh Reviewer succeeded and opened with interviewing/information-gathering content |
| Local safe fixture | outside repo | `Topic Conceptualization Using AI Tools TEMPLATE.docx` | 141,927 bytes | 4,974 characters | not persisted | Readable headings, paragraphs, table/placeholder order; no OOXML tags. Assignment template, used only for format extraction |

All three fresh jobs used `openai:gpt-4o`, reached `succeeded`, had matching `source_metadata.characterCount` and persisted `source_versions.character_count`, and had result, artifact-version, artifact, source-version, and job owner IDs in agreement. The result was retrieved through the authenticated standalone Android Library. The source snapshots each recorded one source item with its exact Canvas title and parser version. Source versions contained no OOXML tag leakage. Production data was read only; no Canvas data was changed. The test PDF fixture `_reference/stay-focused-v1/tests/fixtures/text-readable.pdf` independently yielded one native-text page with 222 characters. These checks do not constitute a side-by-side visual comparison of the original Canvas binaries, which were not exported.

Beginning, middle, and end source-text spot checks remained in reading order. The PPTX included slide 1's mobile-platform introduction, slide 20's Linux Kernel, and slide 39's Publish to Market content. The PDF moved from learning objectives through firewall architectures to end references. The Page retained its fact-gathering headings and lists without visible HTML tags or Canvas navigation chrome. The DOCX fixture retained its opening instructions, middle sections, and ending table/placeholder material; it was not treated as an instructional-generation source.

## OCR acceptance and failures

- OCR path: pdf.js first classifies PDF pages as native, blank, or OCR-required. The existing Google Cloud Vision provider handles OCR-required PDF pages and PNG/JPEG. The PDF service accounts for every page and fails on missing/incomplete evidence; native pages avoid provider calls.
- Text PDF: fresh 33-page Firewalls source passed generation. Native-text extraction is executed separately on the safe local PDF fixture. The snapshot's `ocr_version` field identifies the structured PDF path, not proof that Vision was invoked for this particular document.
- Scanned PDF: automated fake-provider tests exercise scanned PDF OCR, requested-page order, and empty result; no real scanned educational PDF was available for a live provider run.
- Image: PNG/JPEG accepted by signature/MIME policy and fake-provider tests. The real `APA Sample.png` (98,102 bytes, CC16 file `10895533`) is module-linked but not shown as an eligible Generate material; no live image OCR claim is made.
- Failure behavior: tests cover missing/corrupt Storage, byte-count and hash mismatch, image/PDF signature mismatch, encrypted and over-limit PDF, empty OCR, unsupported type, and empty text. They return explicit safe errors or stop before generation. No huge stress fixture was created.

| Failure scenario | Observed B28 evidence | Outcome |
|---|---|---|
| Unsupported legacy extension/MIME | Canvas policy classifies unsupported documents as metadata-only; extractor returns unsupported type | No generation-ready source |
| MIME/extension or binary-signature mismatch | Policy and stored-extraction regressions | Rejected as blocked/corrupt |
| Empty text or zero-readable-text PDF | Strict text and PDF/OCR empty-result regressions | Explicit unreadable/empty failure |
| Corrupt/truncated or mismatched stored object | Missing object, byte-count, SHA-256, and signature regressions | Explicit corrupt/missing failure |
| Over-limit or encrypted PDF | Page-limit and encrypted-PDF regressions | Rejected before provider |
| OCR missing/empty result | Fake-provider failure regressions | Explicit OCR error; no empty successful source |

## Routing and physical Android

The authorized realme RMX3151 (Android 13) ran the existing authenticated production build. CC17 showed learning PPTX in Generate, CC16 showed learning PDFs and Pages, and CC13 showed the lesson Page. Today showed Canvas announcements separately. Tasks displayed real CC16 assignments and quizzes. No announcement or submittable assignment appeared in the inspected Generate lists. Administrative/orientation exclusion was covered by existing regression and B27 physical evidence; it was not freshly rechecked on the CIT6 course during B28. The device started all three fresh jobs, showed readable queue/progress states, completed them, and opened each corresponding saved Reviewer in Library. No raw engineering diagnostic was visible in these flows. No live DOCX, scanned PDF, or eligible instructional image selection was performed.

| Physical scenario | Result |
|---|---|
| Connected and authorized realme RMX3151, Android 13 | PASS |
| Generate learning PDF, PPTX, and Page discovery across three courses | PASS |
| Separate Announcements and assignment Tasks | PASS on inspected lists |
| Fresh Reviewer queue, completion, persistence, Library reopen | PASS for PDF, PPTX, Page |
| Course-outline/orientation exclusion | Existing B27 physical and automated evidence; NOT RERUN in B28 |
| DOCX, scanned PDF, instructional image | NOT PRESENT or NOT EXERCISED on device |

## Automated verification

| Command | B28 result |
|---|---|
| Canvas tests | FRESH PASS 73/73 |
| API tests (includes file extraction, OCR dispatch, routing, failure paths) | FRESH PASS 871 passed, 3 skipped |
| Mobile tests | FRESH PASS 455/455 |
| Shared tests | FRESH PASS 44/44 |
| OCR tests | FRESH PASS 27/27 |
| Engine test/eval | FRESH PASS 606/606 |
| Root typecheck | CACHED PASS 7/7 |
| Root lint | CACHED PASS 7/7; four existing Mobile import-order warnings |
| Root build in sandbox | FAILED on external linked path access |
| Root build elevated | FAILED at the known junctioned `expo-router` resolution in Expo export |
| Isolated API production build elevated | FRESH PASS, 28 static routes/pages |
| `git diff --check`; `git fsck --full` | PASS; fsck reports only pre-existing dangling objects |

The root build limitation matches B27's local dependency/junction condition. Accepted production Vercel and signed Android builds remain the B27 baseline; no B28 code deployment was needed.

## Repairs and remaining limitations

No implementation repair was required. The extraction and empty-source defenses already exist. No migration, push, merge, or Canvas mutation was performed.

Remaining B28 evidence gaps: a real scanned learning PDF with live Vision OCR; a real instructional PNG/JPEG through Generate; a real Canvas DOCX end-to-end job; and a direct visual comparison against the original Canvas PDF/PPTX binaries. PPTX's one-block structured snapshot preserves slide markers in text but lacks per-slide block metadata. Retain the B27 migration-history mismatch: local `20260918120000_canvas_announcement_student_metadata.sql` versus connector-recorded remote version `20260918123510`. Do not run a Supabase CLI migration push or alter history rows until separately reconciled.

Recommended bounded B29: exercise a consenting, module-linked scanned PDF and instructional image through the existing Google Vision path, then make eligible learning images discoverable in Generate only if the current routing contract requires it.
