# B25.3.3 pre-edit architecture inventory

Audited 2026-09-15 at d00a543 on main (0 behind / 51 ahead of recorded origin/main). Original dirty files were inspected and left untouched. `git fsck --full` exited 0 with dangling blobs only. Work proceeds in an independent local checkout; no push.

| Area / component | Decision | Reason |
|---|---|---|
| Reviewer: engine stage0-normalize, structured-document, parser adapters | KEEP | Extraction cleanup, document structure and source identity are infrastructure. |
| Reviewer: stage1-outline, stage2-plan, required/recovery/typed evidence, section support/ancestry/representation | REMOVE from generation | Locally chooses concepts and evidence ownership before authoring. |
| Reviewer: stage3-generate, stage4-verify, stage5a-grounding, stage5-retry, stage6-assemble, semantic-verification/usefulness | REPLACE | Per-section authoring, semantic heuristics and repair trees are replaced by coherent-context authoring and contract checks. |
| Reviewer: runPipeline, synchronous review routes, worker processor | ADAPT | Preserve callers and UI DTO; route to AI-first generator after real-material validation. |
| Reviewer: processing-job workflow prepare/generate/verify/retry/finalize | SIMPLIFY | Preserve lease/cancellation/checkpoints/persistence; replace local semantic stages. |
| Quiz: sources.ts authorization, selected-material preparation, snapshot linkage | KEEP | Scope, freshness, owner checks and provenance. |
| Quiz: regionsFromBlocks | ADAPT | Preserve headings/order/pages; stop discarding source content before context construction. |
| Quiz: generation.ts support splitting, affordances, slot allocation, candidate convergence; blueprints.ts | REMOVE | Model must reason about complete set from broad source context. |
| Quiz: schema, exact count, option/key checks, normalized exact duplicates, reference checks | KEEP | Objective product contracts. |
| Quiz: service.ts durable checkpoints | ADAPT | Checkpoint complete set and bounded repair state, no accepted-slot/candidate state. |
| Quiz: learnerQuestion, scoring, attempt/result services and database RPCs | KEEP | Explicit secret-free projection and authoritative persisted scoring. |
| Activity: sources.ts owned assignment/link/material assembly, Office extraction | KEEP / ADAPT | Keep deterministic relationships; supply available due/submission/rubric metadata; remove semantic source-role inference. |
| Activity: generation.ts sourceRole/createTaskSpecification regex taxonomy, counts, requirement inference | REMOVE | Assignment interpretation belongs to model. |
| Activity: generation.ts content and verification | SIMPLIFY | AI creates structure and content together; thin schema/ID checks and one bounded contract repair. |
| Activity: service.ts editable validation, persistence, owner recheck | KEEP / ADAPT | Preserve existing draft/slide UI shape and database transaction. |
| Shared: GenerationProvider, server OpenAI Responses adapter | KEEP / ADAPT | Structured Outputs, deadlines, bounded transport retry; separate trusted instructions from source data. |
| Shared: context preparation | ADD | Ordered source IDs, full source when within budget, explicit oversized handling with coarse coherent context. No educational ranking. |
| Extraction: OCR package; API OCR/pdf/image, document-parsers, structured-source-blocks; Canvas ingestion | KEEP | Page accounting, OCR limits, tables/lists, Office parsing and diagnostics remain foundational. |
| Mobile: Reviewer reader, Quiz player, Activity editor, Queue/Library | KEEP | Adapt generated objects to existing contracts; no answer keys in learner projection. |
| Database/auth/RLS | KEEP | No schema or authorization redesign is needed. |

## Observed call paths

- Reviewer synchronous: `app/api/review/route.ts`, `app/api/reviewer/generate/route.ts` -> engine `runPipeline`; background worker: `processing-jobs/processor.ts` -> same. Durable workflow separately duplicates stages 0-6 in `workflows/processing-job.ts`.
- Quiz: admission/owned source resolution -> `processQuizJob` -> v4 plan/accepted checkpoints -> candidate generation/verifiers -> completion RPC -> explicit learner projection -> server scoring and result persistence.
- Activity: assignment and same-module/explicitly-selected attachments -> local `createTaskSpecification` -> author + verifier -> editable contract -> completion RPC.

Legacy retirement is gated on real-material spike results, as requested. Existing historical evidence and contract/security tests must survive. No architectural or product PASS is claimed by this inventory.
