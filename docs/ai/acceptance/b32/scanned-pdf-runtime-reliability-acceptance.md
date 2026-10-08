# B32 scanned-PDF runtime reliability acceptance

Date: 2026-09-20 (Asia/Manila)

Verdict: **PASS — scanned-PDF production generation is durable and memory-safe.**

## Starting State

- Branch: `b25-3-3-ai-first`.
- Starting B32 baseline: `72d4cebd3d2167b100d72a7a6f0bd3b3b72d15cb`.
- B31 defect: CIT5 `2-Journaling.pdf` prepared to `PDF - ready`, then production Reviewer submission OOMed before durable job creation.
- Physical device: realme RMX3151, Android 13, serial `PB6DWWEIHAUCMZOR`.
- Fixture: Canvas course Accounting Essentials, module Midterms, `2-Journaling.pdf`; 8,089,877 bytes, 16 pages, zero native PDF text.

## Scanned-PDF Architecture Trace

The request path now creates the durable processing job from a lightweight Canvas source reference only. The request function no longer downloads, inspects, rasterizes, OCRs, or builds reviewer context for the PDF. Vercel Workflow owns the heavy work after the job is accepted:

1. `prepare_canvas_reviewer_extraction`
2. `inspect_page_1` through `inspect_page_16`, one page per step, bounded concurrency
3. `prepare_extraction`
4. OCR chunks `extract_chunk_0` through `extract_chunk_3`
5. `finalize_canvas_reviewer_extraction`
6. `processAIReviewerStep`
7. normal result/artifact persistence and Library consumption

Production job `a85bd672-2aed-401b-a37e-fd1c794d826f` followed this trace. Logs show all 16 inspect-page steps, four OCR chunks, ordered page accounting, source attachment, and AI generation attempt 1.

## Root Cause

B31 performed too much scanned-PDF work inside the synchronous generation request. The 16-page image-only PDF caused the production function to allocate the downloaded PDF plus page inspection/raster/OCR context before a durable job existed, so Vercel killed the instance for memory before Queue could reconnect to a stable backend identity.

B32 also exposed two downstream durability defects after the memory repair:

- `attach_deferred_canvas_reviewer_source_v1` used unqualified `digest` under a pinned `search_path`; production pgcrypto lives in `extensions`, so source attachment failed with PostgreSQL 42883.
- The AI reviewer schema allowed empty reviewer contract fields and did not constrain reviewer `sourceRefs` to the dynamic source ID set, causing bounded contract failures after OCR succeeded.

## Repair Implemented

- Deferred Canvas PDF download, page inspection, OCR, source attachment, and reviewer context creation into the Vercel Workflow worker.
- Added page-inspection and OCR chunk checkpoints so retries resume at completed units.
- Added ordered page accounting and atomic PDF-to-text source attachment before AI generation.
- Qualified `extensions.digest` in the deferred source attachment migration.
- Preserved the database stage/type contract by mapping reviewer extraction progress to `preparing_source`.
- Added safe numeric memory logs for request, page inspection, OCR chunks, and source attachment.
- Added safe reviewer provenance and reviewer contract diagnostics without logging source text or provider output.
- Hardened the reviewer structured output schema with non-empty fields and dynamic enum-constrained `sourceRefs`; added targeted contract findings.

## Memory Comparison

| Surface | B31 behavior | B32 production evidence | Result |
|---|---:|---:|---|
| Request payload | 90,423 bytes carried heavy context | 407 bytes durable source reference | 99.55% smaller |
| Request RSS delta | B31 died before job creation | prior B32 request delta +749,568 bytes, 0.45% | Durable admission safe |
| Page inspection max RSS | Not durable; request OOM | 617,398,272 bytes on pages 5/6 | Inside production runtime |
| OCR chunk max RSS | Not durable | 373,874,688 bytes on chunk 3 | Inside production runtime |
| Source attachment RSS | Not reached in B31 | 270,917,632 bytes | Inside production runtime |
| Final OCR source | Not reached in B31 | 6,757 characters from 16 accounted pages | Complete |

## Verification

| Check | Result |
|---|---|
| Focused reviewer contract test | PASS, `src/lib/quiz/ai-first.test.ts`, 29/29 |
| Engine typecheck | PASS |
| DB/API production build | PASS locally and in Vercel deployment |
| Full API regression | PASS, 88 files; 893 passed / 3 skipped |
| Full engine build/evals | PASS, 606/606 |
| Production health | PASS, `{"status":"ok","version":"2.0.0"}` |
| Production workflow logs | PASS, job `a85bd672-2aed-401b-a37e-fd1c794d826f` reached OCR, source attachment, AI generation, Queue completion, and Library artifact |
| Direct DB metadata query | NOT AVAILABLE; Vercel env pull returned secret references rather than decrypted Supabase values, and the production Android app is not debuggable |

## Production Deployment

- Final deployment: `dpl_EekcdmCmpfdoobvYouekuXrUmMEd`
- Production URL: `https://stay-focused-v2-prototype-jq8xnr8gx-galaxymaxps-projects.vercel.app`
- Canonical alias: `https://stay-focused-v2-prototype.vercel.app`
- State: READY
- Health: HTTP 200, version `2.0.0`
- Build: Vercel completed the Next.js build and Workflow build; 22 workflow steps and 2 workflows bundled.

## Scanned Accounting PDF Acceptance

| Acceptance row | Evidence | Result |
|---|---|---|
| Fresh physical submit accepted durable | Real device submitted `2-Journaling.pdf`; screen changed to `Waiting to begin...` and allowed leaving the screen | PASS |
| Navigate away while running | Device moved to Today while job continued | PASS |
| Ordered page inspection | Logs show pages 1-16 inspected with per-page memory | PASS |
| OCR chunking | Logs show chunks 0, 1, 2, 3 completed | PASS |
| Page accounting | `expectedPageCount: 16`, accounted pages 1-16, `ordered: true`, `sourceEligible: true` | PASS |
| Source attachment | `source_attached`, 16 accounted pages, 6,757 source characters | PASS |
| AI reviewer generation | `ai_generation.request_finished`, attempt 1, 15,547 ms | PASS |
| Queue terminal state | Queue showed completed Reviewer for `2-Journaling.pdf` | PASS |
| Android artifact render | Library rendered `Reviewer in Journaling and Basic Accounting` with Accounting sections and key points | PASS |
| Relaunch persistence | After `am force-stop` and relaunch, Library listed and reopened the same reviewer | PASS |

## Physical Android Acceptance

- Device remained authenticated throughout.
- Generate showed Accounting Essentials with `2-Journaling.pdf` ready.
- Queue continued after navigating to Today.
- Queue later showed the completed Reviewer under Completed.
- The generated Reviewer opened from Queue/Library and contained source-specific Accounting content: coverage of lesson objectives, bookkeeping, journal, ledger, debit/credit, and related concepts.
- After force-stop and launcher restart, Library listed `Reviewer in Journaling and Basic Accounting` as the newest artifact and reopened it without regeneration.

## Regression Status

Fresh passing checks:

- `npm.cmd test --workspace @stay-focused/api -- src/lib/quiz/ai-first.test.ts`: 29/29
- `npm.cmd run typecheck --workspace @stay-focused/engine`: pass
- `npm.cmd run build --workspace @stay-focused/db --workspace @stay-focused/api`: pass
- `npm.cmd test --workspace @stay-focused/api`: 893 passed / 3 skipped
- `npm.cmd test --workspace @stay-focused/engine`: 606/606

Known unrelated local caveat: mobile/root lint behavior on this Windows checkout can be affected by the existing `node_modules` junction arrangement. Mobile code was not changed in B32.

## Remaining Limitations

- Direct production DB metadata inspection was not possible in this session because Vercel env pull returned secret references, not decrypted Supabase values. No secret workaround was attempted.
- Several old Queue entries still show `Request needs confirmation`; they are historical failed/confirmation entries and did not block the fresh completed artifact.
- B32 proves the scanned-PDF Reviewer path. It does not broaden the Canvas-image fixture limitation from B30/B31.

## Git Result

Implementation commits:

- `7410a318` fix(api): make scanned PDF generation submission memory-safe
- `8cd76b1` fix(api): defer experience workflow dispatch
- `0b84e51` fix(api): defer canvas PDF extraction to workflow
- `9b6648d` fix(api): checkpoint scanned Canvas PDF OCR
- `74f6933` fix(api): checkpoint scanned PDF page inspection
- `ab5de5e` fix(api): keep reviewer OCR progress contract-safe
- `dcd9ef6` chore(api): expose safe reviewer provenance diagnostics
- `226ae78` fix(db): qualify reviewer source hashing
- `9b797d8` chore(api): expose reviewer contract diagnostics
- `262ac2a` fix(api): constrain reviewer generation contract

Documentation commit is recorded separately from implementation.

## Verdict

PASS — scanned-PDF production generation is durable and memory-safe.

Recommended next roadmap task: B33 DOCX/PPTX deeper format hardening only if new production defects appear; otherwise proceed to B34 generation quality acceptance across real Reviewer, Quiz, and Activity materials.
