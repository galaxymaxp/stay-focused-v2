# Engine Contract

## Purpose

`packages/engine` converts already-extracted study source content into an
ordered, source-grounded `ReviewerOutput`. It defines stable contracts for
normalization, structural analysis, generation planning, provider requests,
coverage verification, bounded retries, and final reviewer assembly.

The public orchestration entrypoint is `runPipeline(args: RunPipelineArgs)`.

## Non-goals

The engine does not:

- read or parse raw files, PDFs, images, `File`, `Blob`, or `Buffer` values;
- call OCR or understand OCR-provider response objects;
- fetch Canvas content or understand Canvas API objects;
- read or write Supabase rows;
- handle authentication, mobile screens, API routes, or web routes;
- import a model-provider SDK; or
- use a final model pass to rewrite or reorder the reviewer.

Extraction and application integration happen outside the engine.

## Public Input Contract

### `SourceNormalizationInput`

The extraction boundary accepts optional source identity and metadata plus
either extracted `text`, pre-extracted block-like `blocks`, or both. Block input
may carry order, page number, section hint, and safe scalar metadata. It must not
contain raw file or provider objects.

### `RunPipelineArgs`

`RunPipelineArgs` contains:

- `input: SourceNormalizationInput`;
- `provider: GenerationProvider`;
- optional `model` (defaults to `gpt-4o` at Stage 3);
- optional `temperature`;
- optional bounded `retryPolicy`;
- optional `allowWeakSections` (defaults to `false`); and
- optional provider-request metadata.

`runPipeline` does not mutate the input object.

### `NormalizedSource`

`NormalizedSource` is the stable internal source contract established by Stage
0. It contains a deterministic source ID where possible, title, source kind,
language, sanitized metadata, ordered `NormalizedSourceBlock` items, and a
creation timestamp. All later stages consume this representation rather than
extraction-provider or application objects.

## Public Output Contract

### `ReviewerOutput`

`ReviewerOutput` is the final engine result. It contains a deterministic ID,
title, ordered `ReviewerSection` items, and `ReviewerMetadata` linking the
result to its source, plan, and final coverage report.

Each reviewer section preserves:

- source and planned section identity;
- generation-plan order;
- schema kind;
- source block IDs;
- final section coverage status and score; and
- the typed `SectionOutput` item without a final rewrite pass.

## Pipeline Overview

```text
SourceNormalizationInput
  -> normalizeSource
  -> NormalizedSource
  -> detectOutline
  -> SourceOutline
  -> buildGenerationPlan
  -> GenerationPlan
  -> generateSection (once per planned section)
  -> SectionOutput[]
  -> verifyCoverage
  -> CoverageReport
  -> retryFailedSections
  -> final SectionOutput[]
  -> verifyCoverage
  -> final CoverageReport
  -> assembleReviewer
  -> ReviewerOutput
```

Initial section generation is executed in plan order. Stage 5 runs only after
initial coverage verification. Stage 4 runs again after retries, and Stage 6
receives only the final outputs and final coverage report.

## Stage Contracts

| Stage | Function | Input | Output | Execution | Must not know about |
| --- | --- | --- | --- | --- | --- |
| 0 | `normalizeSource` | `SourceNormalizationInput` | `Promise<NormalizedSource>` | Deterministic except a fallback timestamp when none is supplied | Raw files, PDFs, images, OCR objects, Canvas, Supabase, provider SDKs, UI |
| 1 | `detectOutline` | `NormalizedSource` | `Promise<SourceOutline>` | Deterministic | Providers, storage, LMS APIs, UI |
| 2 | `buildGenerationPlan` | `SourceOutline`, `NormalizedSource` | `GenerationPlan` | Deterministic | Provider responses, storage, LMS APIs, UI |
| 3 | `generateSection` | planned section, plan, source, `GenerationProvider` | `Promise<SectionOutput>` | Provider-backed through the interface | OpenAI SDK, Supabase, Canvas, OCR, UI |
| 4 | `verifyCoverage` | outputs, plan, source | `CoverageReport` | Deterministic | Models, provider calls, storage, UI |
| 5 | `retryFailedSections` | outputs, coverage, plan, source, provider, policy | `Promise<readonly SectionOutput[]>` | Deterministic selection with bounded provider-backed attempts | Direct SDK calls, unbounded loops, UI |
| 6 | `assembleReviewer` | final outputs, coverage, plan, source | `ReviewerOutput` | Deterministic | Providers, final model rewriting, storage, UI |

### `SourceOutline`

Stage 1 represents source structure as ordered `OutlineSection` items. Each
section records its block IDs, rough boundaries, deterministic content tags,
and confidence score.

### `GenerationPlan`

Stage 2 creates one `PlannedSection` per outline section. Each planned section
selects a schema kind and records its source block IDs plus a deterministic
target containing objective, focus, expected tags, item count, and coverage
rules.

### `SectionOutput`

Stage 3 returns a discriminated union of the four supported structured output
types. Every output carries an ID, planned section ID, title, and source block
IDs.

### `CoverageReport`

Stage 4 returns report-level status and score plus one
`SectionCoverageResult` per planned section. Status values are `passed`,
`weak`, or `failed`; each section result also indicates whether it is
retryable and lists deterministic issues.

## Provider Boundary

`GenerationProvider` exposes one method:

```ts
generate<TOutput>(request: GenerationRequest<TOutput>): Promise<TOutput>
```

The request contains:

- `prompt` with section target and source excerpt;
- provider-agnostic `schema`;
- `model`, defaulting to `gpt-4o` when omitted by the pipeline caller;
- optional `temperature`; and
- metadata including plan, source, planned section, schema kind, and retry
  attempt when applicable.

The engine calls this interface only. No direct OpenAI SDK import belongs in
Stage 0 through Stage 6. A future provider adapter may translate this request
into vendor-specific API calls without changing the stage contracts. The
API-layer OpenAI adapter boundary is now defined by
[ADR-005](ADR-005-openai-provider-adapter.md); real SDK client construction and
network wiring remain deferred.

## Schema Family

The current Stage 3 schema family is intentionally small:

- `ConceptCard`: explanation and key points;
- `ProcessStep`: ordered steps and summary;
- `ExampleCard`: scenario, explanation, and takeaway; and
- `ClaimCard`: claim, support, and reasoning.

The descriptors in `schemas.ts` are plain serializable TypeScript data with
closed object schemas and explicit required fields.

## Verification and Retry Rules

Stage 4 verifies:

- output kind matches the planned schema kind;
- required schema-specific fields are present and non-empty;
- output source block IDs exist in the normalized source;
- required planned source blocks are represented; and
- each planned section has one corresponding output.

Stage 5 preserves passing outputs and retries only results marked retryable
whose status is enabled by policy. The default policy retries weak and failed
sections up to two times; `maxRetries` must be an integer from 0 through 5.
Provider failures during retries do not erase a previous output.

Stage 6 always rejects failed sections. It rejects weak sections by default and
includes them only when `allowWeakSections` is explicitly `true`. It rejects
missing, duplicate, unplanned, mismatched, or invalidly referenced outputs
rather than silently dropping them.

## Evaluation Harness

The dependency-free harness compiles with the engine and uses JSON fixtures plus
small TypeScript assertions. It covers:

- Stage 0 normalization: 14 cases;
- Stage 1 outline detection: 14 cases;
- Stage 2 generation planning: 24 cases;
- Stage 3 request construction and output validation: 24 cases;
- Stage 4 coverage verification: 21 cases;
- Stage 5 bounded retries: 28 cases;
- Stage 6 reviewer assembly: 30 cases; and
- end-to-end pipeline integration: 21 cases.

Current result: **219 passed, 0 failed**. Provider-facing and integration cases
use deterministic fake providers only. The runner exits with code 1 when any
case fails.

## Current Limitations

- Engine evals use fake providers. The API adapter has fake-client contract
  checks, but real OpenAI integration is not present.
- LLM response quality, latency, cost, and provider reliability are not yet
  measured.
- File and OCR extraction remain external to the engine.
- Supabase, Canvas, authentication, API, and mobile integration are not wired
  into the pipeline.
- Local npm verification is blocked because `npm` is unavailable on `PATH`;
  direct TypeScript 5.8.3 typecheck/build and the compiled eval runner currently
  pass through the bundled runtime.

## Next Engineering Steps

1. Restore Node.js/npm access, then install and wire the OpenAI SDK in the API
   layer without changing engine contracts.
2. Add opt-in real-provider smoke tests with explicit timeout and cost limits.
3. Add LLM quality, latency, and cost evaluation separately from deterministic
   engine evals.
4. Integrate extraction, storage, Canvas, and mobile only after the provider
   adapter preserves the documented engine boundary.
