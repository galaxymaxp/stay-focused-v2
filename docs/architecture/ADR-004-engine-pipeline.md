# ADR-004: Stage-Based Generation Engine Pipeline

## Status

Accepted

## Context

Stay Focused V1 proved that Canvas-informed study workflows and generated
reviewers were feasible. It also exposed architectural limitations: generation
quality was patched after UI work, provider behavior was difficult to isolate,
and later source sections could be weakened or omitted without a clear engine
contract detecting the regression.

V2 therefore uses an engine-first architecture. Extractors outside the engine
convert files, OCR results, LMS content, or other provider-specific data into
text or block-like input. Stage 0 turns that extracted content into the stable
internal `NormalizedSource` contract. The completed pipeline returns a typed
`ReviewerOutput`.

The engine does not know about Canvas, Supabase, authentication, OCR providers,
raw files, mobile screens, or web routes. Those concerns belong to adapters and
applications outside `packages/engine`.

## Decision

Use a seven-stage pipeline with explicit typed contracts between stages. Keep
structural decisions, verification, retries, and final assembly in code. Limit
model-backed behavior to generation through the `GenerationProvider` boundary.

`runPipeline` accepts extracted `SourceNormalizationInput`, establishes the
stable `NormalizedSource` boundary, executes Stage 0 through Stage 6, and
returns `ReviewerOutput`. It preserves source and generation-plan order.

No final model pass may reorder, rewrite, summarize, merge, or drop generated
content. Reviewer assembly is deterministic.

## Pipeline Stages

1. **Stage 0: Source normalization**
   `normalizeSource` converts extracted text or block-like input into
   `NormalizedSource`. It does not parse files, OCR responses, Canvas objects,
   or database records.
2. **Stage 1: Outline detection**
   `detectOutline` groups normalized blocks into ordered sections and assigns
   deterministic content tags and confidence scores.
3. **Stage 2: Generation planning**
   `buildGenerationPlan` creates one planned section per outline section,
   selects a schema kind, and records source coverage targets.
4. **Stage 3: Structured generation**
   `generateSection` constructs a source-grounded provider request, selects the
   correct schema descriptor, calls `GenerationProvider`, and validates the
   returned `SectionOutput`.
5. **Stage 4: Coverage verification**
   `verifyCoverage` checks schema kind, required fields, source references, and
   planned source coverage using deterministic code only.
6. **Stage 5: Bounded retries**
   `retryFailedSections` retries only retryable weak or failed sections under a
   bounded policy. Passing outputs are preserved.
7. **Stage 6: Reviewer assembly**
   `assembleReviewer` validates final coverage and assembles `ReviewerOutput`
   in generation-plan order without another provider call.

## Provider Boundary

The engine accesses generation only through `GenerationProvider`. The provider
receives a deterministic prompt, a serializable structured-output schema, a
model name, optional temperature, and metadata. Core stages do not import a
vendor SDK.

Model execution is intentionally outside the core engine. The current default
model name passed through the provider request is `gpt-4o`; the API-layer
OpenAI adapter and protected reviewer route execute real provider calls around
the engine without importing vendor SDKs into Stage 0 through Stage 6.

## Evaluation Strategy

Each stage was developed eval-first using dependency-free TypeScript suites and
readable JSON fixtures. Provider-facing cases use deterministic fake providers.
The aggregate harness currently reports 266 passing cases and 0 failures,
covering Stage 0 through Stage 6 and end-to-end pipeline integration.

These evals test contracts, ordering, validation, retry bounds, failure
behavior, source grounding, and deterministic IDs. LLM response-quality evals
are separate from this deterministic harness even though the API layer now has
an OpenAI adapter.

## Consequences

- Pipeline behavior can be tested independently from applications and vendors.
- Source order and planned coverage remain visible throughout generation.
- Weak or failed outputs cannot silently enter the reviewer by default.
- Provider replacement does not require rewriting the engine stages.
- File extraction, storage, LMS access, authentication, and presentation remain
  separate integration responsibilities.
- The system requires explicit adapters before it can process real files,
  persist reviewers, read Canvas material, or expose new product workflows.

## Alternatives Considered

- **Generate the entire reviewer in one model call.** Rejected because coverage,
  section ordering, failure isolation, and bounded retries would be difficult
  to enforce.
- **Add a final model rewrite pass.** Rejected because it could reorder or drop
  validated content and would make final assembly non-deterministic.
- **Place generation logic in API or UI routes.** Rejected because it would
  couple reviewer quality to application concerns and repeat V1 limitations.
- **Import a provider SDK into core stages.** Rejected because vendor-specific
  request and response types would weaken the engine boundary.

## Capstone Relevance

The pipeline is a capstone-ready technical contribution because it turns an
exploratory V1 concept into a documented, typed, and measurable architecture.
The contribution is not a claim that model quality is solved. It is a concrete
foundation for evaluating generation quality without losing source coverage,
later sections, or reproducibility as provider and product integrations are
added.
