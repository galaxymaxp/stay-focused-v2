# B21 Canvas learner-material ingestion

Date: 2026-09-11 (Asia/Manila)

Verdict: **PARTIAL — V2 Canvas learner-material discovery is implemented, but current real courses provide no supported material for final E2E proof.**

## 1. Starting state

- Branch: `main`
- Starting HEAD: `ffd2316 docs(ai): record B20 mobile Reviewer validation`
- Ahead/behind: 28 ahead, 0 behind `origin/main`
- Working tree: pre-existing untracked `docs/ai/acceptance/b8/`, preserved
- Git fsck: clean except two dangling blobs (`e69de29...`, `625ec80...`)
- Baselines: Canvas typecheck + 72/72, API typecheck + 607/607, mobile typecheck + 376/376 passed

## 2. V1 learner-material behavior

| Area | V1 behavior | Relevant V1 files |
| --- | --- | --- |
| Discovery | Course modules and ordered module items were primary | `lib/canvas.ts`, `actions/canvas.ts` |
| Resolution | Resolved Page, assignment, announcement, discussion, and File URLs | `lib/canvas-content-resolution.ts` |
| Attachments | Combined typed/HTML-linked attachments with body text | `lib/canvas-resource-extraction.ts` |
| Extraction | PDF, selected images/OCR, plain text/Markdown/CSV/HTML, explicit readiness | `lib/canvas-resource-extraction.ts`, `app/api/sources/ocr/route.ts` |
| Repair/Learn | Repaired individual sources; Learn chose ready/repair/generate | `app/api/sources/repair/route.ts`, `app/api/cron/resource-refresh/route.ts`, `app/modules/[id]/learn/page.tsx` |

Restore module-first discovery, exact resolution, attachments, and honest readiness states. Do not copy V1 storage, queue, OCR, authorization, or UI internals; V2 ownership, RLS, durable jobs, fingerprints, provenance, and Reviewer gates remain authoritative.

## 3. V2 pre-B21 architecture

`PAT -> CanvasClient -> protected connection/capability routes -> canvas-sync.ts + canvas-sync-jobs/* -> Canvas graph tables -> canvas-reviewer-sources.ts -> CanvasSourceReviewerScreen.tsx -> /api/reviewer/generate`.

Modules/items were fetched, but broad Pages was required for final content persistence and course Files was the sole file inventory. Their failures became “no material”; the picker then surfaced remaining announcements.

## 4. Root cause

Multiple causes: broad collection dependency; no independent module Page/Assignment/File resolution; incorrect loss of successful staged module data when Pages failed; and announcement picker filtering. Real permissions (`canvas_permission_denied` for Files, `canvas_resource_not_found` for Pages) exposed these defects but did not prove exact module resources were inaccessible.

## 5. Real Canvas API findings

| Course | Resource | Result | Accessible through module? | Notes |
| --- | --- | --- | ---: | --- |
| CC17 Mobile Application Design and Development | Modules/items | API units succeeded | Yes | Pre-B21 finalizer later persisted zero rows |
| CIT6 Capstone Project 1 | Modules/items | API units succeeded | Yes | Pre-B21 finalizer later persisted zero rows |
| CC16 IT Security | Modules/items | API units succeeded | Yes | Pre-B21 finalizer later persisted zero rows |
| All three | Files collection | `canvas_permission_denied` | Exact access unknown | B21 uses documented global `/files/:id` |
| All three | Pages collection | `canvas_resource_not_found` | Exact access unknown | B21 resolves module Page URLs individually |
| All three | Assignments/announcements | Collection units succeeded | N/A | Announcements excluded from learner materials |

No credentials, IDs, headers, signed URLs, or secrets are recorded.

## 6. B21 architecture

```text
Course -> Modules -> ordered Module Items (+ content_details)
  -> exact Page / Assignment / global File resolver
  -> supported learner material
  -> canonical V2 rows + reference relationships
  -> existing Storage/extraction/OCR/structured blocks
  -> existing provenance/fingerprint/Reviewer pipeline -> Android
```

Broad collections are supplemental. A failure produces a partial result and preserves last-known-good owned rows; it no longer means an empty course.

## 7. Material support matrix

| Type | Discovery | Ingestion | Reviewer selectable | Status |
| --- | ---: | ---: | ---: | --- |
| PDF | Module File/attachment | Existing PDF path | Yes when prepared | SUPPORTED |
| Image | Module File/attachment | Existing OCR path | Yes when prepared | SUPPORTED |
| Canvas Page/text | Exact Page; TXT/Markdown | Existing structured/stored-source path | Yes when substantive | SUPPORTED |
| Assignment material | Exact description/attachments | Existing HTML/file paths | Yes when substantive | SUPPORTED |
| DOCX | Classified | No parser added | No | UNSUPPORTED |
| PPTX | Classified | No parser added | No | UNSUPPORTED |

## 8. Files changed

- `.vercelignore`: excludes local evidence/temp output from deployment.
- `packages/canvas/src/{types,client}.ts` + test: module API URL/content details, exact assignments/attachments, exact global File endpoint.
- `apps/api/src/lib/canvas-module-material.ts` + test: eight-state classifier and DOCX/PPTX handling.
- `apps/api/src/lib/canvas-sync.ts` + route tests: module-first exact resolution, optional collections, safe preservation, partial reporting, deduplication.
- `apps/api/src/lib/canvas-sync-jobs/{checkpoints,unit-executor,finalize}.ts`: durable exact resource units and fallback finalization.
- `apps/api/src/lib/canvas-file-normalize.ts` + test: assignment attachment discovery and canonical File/reference deduplication.
- `apps/api/src/lib/canvas-stored-file-extraction.ts` + test: UTF-8 TXT/Markdown through private stored-source extraction without OCR.
- `apps/api/src/lib/canvas-structured-blocks.ts`, `canvas-usable-content.ts`, `canvas-usable-content-service.ts`, `canvas-reviewer-sources.ts`, `types/canvas.ts` + tests: shared plain-text method and learner-material filtering.
- `apps/mobile/src/services/canvasApi.ts`, `CanvasSourceReviewerScreen.tsx`, `canvasSourcePresentation.ts` + test: text contract, clearer copy, announcement exclusion.

## 9. Tests added

| Test area | Scenarios | Result |
| --- | --- | --- |
| Canvas client | content details/API URL, exact assignment attachments, exact global File | PASS, 73/73 |
| Classifier | PDF/image/Page/Assignment, empty/task-only, DOCX/PPTX, external/navigation, missing/inaccessible/unknown | PASS |
| Sync/API | denied Files + module PDF; unavailable Pages + module Page; preservation, duplicates, repeat sync, owner/auth | PASS, 624/624 |
| Extraction | UTF-8 text without OCR plus existing PDF/image safety | PASS |
| Mobile | grouping, selectable source types/IDs, unsupported state, announcement exclusion | PASS, 377/377 |

Intermediate API runs exposed stale fixture expectations (5, then 1, then 2 after the intentional text-contract change); fixtures were corrected and final full runs passed.

## 10. Fresh three-course sync

This is the fresh pre-repair runtime evidence that exposed the defect. Deployment of repaired code failed, so these are honest persisted counts, not invented post-repair results.

| Course | Modules | Module Items | PDF | Image | Page | Assignment Material | Unsupported | Selectable |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| CC17 Mobile Application Design and Development | 0 persisted | 0 persisted | 0 | 0 | 0 | 0 | 0 | 0 |
| CIT6 Capstone Project 1 | 0 persisted | 0 persisted | 0 | 0 | 0 | 0 | 0 | 0 |
| CC16 IT Security | 0 persisted | 0 persisted | 0 | 0 | 0 | 0 | 0 | 0 |

| Course | Files collection | Pages collection |
| --- | --- | --- |
| CC17 | `canvas_permission_denied` | `canvas_resource_not_found` |
| CIT6 | `canvas_permission_denied` | `canvas_resource_not_found` |
| CC16 | `canvas_permission_denied` | `canvas_resource_not_found` |

Each job ended safely `partial`; module/item units succeeded, but the pre-B21 finalizer persisted zero graph rows after Pages failed—the behavior now regression-covered.

## 11. Canvas Reviewer E2E

- Source/course/type: no genuine persisted Canvas learner material across the three selected courses
- Discovery route: module units succeeded pre-B21; repaired exact resources not re-probed
- Physical Android, ingestion, Reviewer generation, coverage, grounding, leakage, rendering, save, Library reopen: not run
- Durable job: three sync jobs succeeded with safe `partial` outcomes; no Reviewer job created

The Vercel deploy returned `fetch failed`; using the old Android/API runtime would only repeat known pre-B21 behavior. B20's independent PDF-upload E2E remains PASS.

## 12. V1 vs V2 after B21

| Capability | V1 | V2 after B21 | Winner / Notes |
| --- | --- | --- | --- |
| Material discovery | Working module/resource reference | Module-first exact resolution | V2 design; runtime re-proof pending |
| PDF/Page/Image/Assignment | Supported paths | Shared hardened V2 paths | V2 |
| DOCX/PPTX | Limited/unsupported | Explicitly unsupported | Honest parity |
| Provenance/security | Weaker | Canonical IDs, hashes, owner/RLS boundaries | V2 |
| OCR/durable processing | Older queue | Existing bounded OCR + durable jobs | V2 |
| Reviewer quality | Earlier Learn path | Stages 0–6 + coverage/grounding/leakage | V2 |
| Mobile | Not V2 architecture | Native grouped picker | V2 implementation; live proof pending |

## 13. Regression verification

| Suite | Fresh result |
| --- | --- |
| Canvas typecheck/tests | PASS; 73/73 |
| Engine typecheck/build/eval | PASS; 606/606 (157/157 architecture) |
| API typecheck/tests | PASS; 624/624 |
| Mobile typecheck/tests | PASS; 377/377 |
| Reader | PASS; 32/32 |
| Root typecheck | PASS; 7/7 workspaces |
| Root lint | PASS; 7/7, 0 errors, 4 pre-existing warnings |
| Root build | INCOMPLETE; command hung and was terminated; engine build passed independently |
| Production deploy | FAIL; Vercel CLI `fetch failed`, no promotion |

## 14. Remaining gaps

### DEMO_BLOCKING

Deploy B21; fresh-sync the three courses; complete one genuine Canvas PDF/Page/image Android generation/save/reopen.

### NON_BLOCKING_UX

Unsupported-format labels may become more specific later.

### NON_BLOCKING_PRESENTATION

None beyond lack of a real runtime sample.

### CANVAS_PERMISSION_OR_CONTENT_LIMITATION

Broad Files is denied and Pages unavailable for all three; exact module-resource access remains unproved post-repair.

### UNSUPPORTED_FORMAT

DOCX and PPTX remain intentionally unsupported and fail safely.

### DEFERRED_PRODUCT_WORK

Canvas OAuth and broader parsers remain out of scope.

## 15. Verdict

**PARTIAL — V2 Canvas learner-material discovery is implemented, but current real courses provide no supported material for final E2E proof.**

Automated evidence proves module-first exact fallback, safe persistence, and shared ingestion contracts. Real pre-B21 evidence proves module APIs succeed while collections fail, but no material survived that old finalizer. Failed deployment prevented post-repair real-course and Android proof, so PASS is not claimed.

## 16. Git result

The final response records the implementation commit and final HEAD. `.local/`, credentials, signed URLs, generated build drift, and unrelated B8 files are excluded; nothing was pushed.

## 17. Next recommended task

Deploy the committed B21 API, rerun only the three selected courses, and complete one genuine Canvas-originated physical-Android Reviewer generation/save/reopen. Do not start B22 before this smallest runtime proof is resolved.
