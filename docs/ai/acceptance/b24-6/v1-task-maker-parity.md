# B24.6 V1 Task Maker parity audit

Audit completed before implementation, 2026-09-12. All paths below are relative to the reference clone.

## V1 source provenance

- GitHub: https://github.com/galaxymaxp/stay-focused
- Clone: `C:/Users/Fely Max Dilinila/Documents/Projects/_reference/stay-focused-v1`
- Branch main; HEAD `d26decf3f82d61f2e8dd6ba2444c6c156473163a`; clean.
- Origin fetch/push: `https://github.com/galaxymaxp/stay-focused.git`.
- app/components/lib/actions/tests/supabase/package.json contain real implementation.
- Listed branches: main, codex/fix-task-outputs-and-notification-issues, codex/refactor-reviewer-generation-flow, debug/simple-reviewer-output; no tags.
- Inspected history log: 585ccd2 foundation, ea76293 generation/refinement, 76c69b8 routing, 0d30b20 outputs/notifications, 5f21c7a research modes, fc3eee7 research QA, 6e071f5 save/export QA. Current HEAD contains Task Maker; historical recovery unnecessary.
- No V1 changes, installs, migrations, commits, or pushes.

## Behavioral evidence

| Behavior | V1 Evidence | V1 State | V2 State before B24.6 | Decision | Notes |
|---|---|---|---|---|---|
| Assignment-first pipeline | `actions/queue-jobs.ts:1857`, `lib/task-output-context.ts:23`, `app/api/task-output/route.ts` | IMPLEMENTED | Missing generation | PRESERVE + IMPROVE | Resolve task/module context, build request, generate, save; V2 derives all identity server-side. |
| Classification | `lib/task-output.ts:675` | IMPLEMENTED | Missing | PRESERVE + IMPROVE | Seven shapes: short_answer, quiz_like, reflection, activity_sheet, file_upload_report, presentation_document, essay_report fallback. Research/case-study source-mode heuristic separate; no dedicated lab/programming/documentation taxonomy. V2 custom fallback required. |
| Course context | `lib/task-output-context.ts:23` | IMPLEMENTED | Existing source services | PRESERVE + IMPROVE | Selects four module resources by text/title overlap, excludes administrative noise, truncates each to 2200 characters. Prefer exact assignment links/module identity and explicit limits. |
| Attachments | `lib/canvas-content-resolution.ts:397,509`, `lib/canvas-resource-extraction.ts:23` | PARTIAL | PDF/image/text extraction | PRESERVE + IMPROVE | Actual downloaded resource extraction; task consumes related extracted resources, without guaranteed assignment-attachment traversal. |
| Instructor template detection | `lib/task-output.ts:694`, `lib/task-output-template.ts` | PARTIAL | Missing | REPLACE | Template keyword influences generic shape; export template is app-owned. No instructor-role/structure model in active path. |
| Answer-first/exact instructions | `lib/task-output.ts:64,161,849`, `tests/task-output-foundation.test.ts` | PARTIAL | Missing | PRESERVE + IMPROVE | Strong prompt rules, limited sentence fallback, heuristic readiness; no complete question/section validation. |
| Deliverable structures | `lib/task-output.ts`, `lib/types.ts` | IMPLEMENTED | Future DTO only | PRESERVE + IMPROVE | Preset/output type controls HTML/rich text/code in one previewContent blob. V2 sections/slides needed. |
| Source grounding | `lib/task-output.ts:64,699` | PARTIAL | Reviewer primitives | REPLACE | Model-memory general_research_labeled mode exists; no resolving per-section refs. V2 must not silently add outside knowledge. |
| Missing sources/provider failure | `lib/task-output.ts:699`, `app/api/task-output/route.ts` | PARTIAL | Safe errors | PRESERVE + IMPROVE | Readiness flags placeholders/copied instructions; provider failure returns successful fallback. V2 must expose true failure/structured limitations. |
| Save/reopen | `actions/study-outputs.ts:64`, `lib/study-outputs/store.ts:241`, `supabase/migrations/20260509143000_extend_study_outputs_for_task_outputs.sql` | IMPLEMENTED | Missing Activity persistence | PRESERVE + IMPROVE | study_outputs task link, owner-filtered lookup, Library reads persisted JSON. |
| Refinement/history | `actions/study-outputs.ts:115`, `lib/task-output-model-routing.ts` | PARTIAL | Missing | PRESERVE + IMPROVE | Original task remains anchor; matching output overwritten with history metadata, not recoverable full revisions. V2 regeneration creates a new draft. |
| Submission distinction | `actions/study-outputs.ts:saveTaskOutputStudyOutputAction` | IMPLEMENTED | Existing Canvas submission mapping | PRESERVE | Save does not submit to Canvas. |
| Provenance | `lib/task-output.ts:TaskOutputRequest`, `lib/task-output-context.ts` | PARTIAL | Reviewer provenance | PRESERVE + IMPROVE | Source key/context/notes; no source-ref resolver. |
| Downloads | `lib/task-output.ts:916`, `components/StudyOutputTaskOutputPage.tsx:219`, `tests/task-output-save.test.ts` | IMPLEMENTED | Missing Activity exports | DEFER | Actual HTML/TXT/CSS/JS Blob downloads; PDF choice is printable HTML. No native DOCX/PPTX/PDF generation. Defer to post-UI export phase. |
| Generic wrapper | `lib/task-output-template.ts` | IMPLEMENTED | Not applicable | DROP | Hardcoded course/name/date/section wrapper conflicts with instructor-only structure. |
| API/client trust | `app/api/task-output/route.ts` | IMPLEMENTED | Authenticated experience/provider adapter | REPLACE | Direct OpenAI client and client-supplied instructions/source mode, no route authentication. Do not copy. |

V1's useful core is anchored task-to-saved-output generation, answer-first prompting and related context selection. Brittle parts are heuristic readiness, lossy Office text extraction, broad essay fallback, missing source-reference validation and destructive replacement. These are code findings, not claims about unobserved user satisfaction or live quality.

## File-format matrix

| Format | V1 support | V2 support before B24.6 | Needed for Activity Maker? | B24.6 decision |
|---|---|---|---|---|
| PDF | Native text via `lib/extraction/pdf-extractor.ts` called by Canvas dispatcher | Hybrid PDF path | Yes | Reuse V2 |
| Scanned PDF | Separate authenticated manual OCR at `app/api/sources/ocr/route.ts`; native path flags scans | Existing OCR | Yes | Reuse V2 |
| PNG/JPEG | Canvas dispatcher unsupported; manual scanned-PDF route rejects images | Existing image OCR | Yes | Preserve V2 |
| DOCX | `lib/canvas-resource-extraction.ts:275`: executed ZIP/XML parsing; paragraphs but lost heading levels/numbering/table cells | Unsupported | Yes | Add structural extraction |
| DOC | No parser branch | Unsupported | No reliable parser | Explicit unsupported |
| PPTX | `lib/canvas-resource-extraction.ts:252`: executed ZIP/XML parsing; filename order and interleaved notes | Unsupported | Yes | Add relationship-ordered extraction |
| PPT | Explicit unsupported branch | Unsupported | No reliable parser | Explicit unsupported |
| Plain text | TXT/MD/CSV UTF-8 dispatcher | Plain/Markdown | Yes | Reuse |
| Canvas page | Structured HTML extraction | HTML normalization | Yes | Reuse |
| Canvas assignment body | Task instructions/context | Activity Detail normalization | Yes | Highest priority |

## Implementation gate and V2 reuse plan

Sufficient evidence exists; proceed automatically. REUSE authenticated experience HTTP, Canvas ownership/preparation/PDF/OCR/text, provider Structured Outputs primitives. EXTEND structured draft contracts, Library/Activity Detail and durable infrastructure. REPLACE future-only Activity output boundary. Reviewer Stage 0-6, planner and Quiz generation are UNRELATED and remain unchanged. Native binary exports, generic chat and model-memory research are out of scope.
