# AI Handoff Log

## Session 0

### What Was Decided

- Initialize V2 as a Turborepo monorepo with npm workspaces.
- Use an engine-first architecture with no UI dependency.
- Use token-based JWT authentication instead of cookies.
- Keep mobile, API, engine, database, Canvas, and shared code in separate
  workspaces.

### Next Steps

1. Implement the domain types in `packages/engine/src/types.ts`.
2. Implement source normalization in `packages/engine/src/stage0-normalize.ts`.

### Blockers

None.

### Risks

- OpenAI token ceilings and serverless execution limits may affect Stage 3
  generation latency and must be monitored.

## Session 1

### What Was Implemented

- Implemented stable engine domain types for normalized sources, outlines,
  generation plans, section outputs, coverage, reviewer output, and retries.
- Updated the provider boundary to use a generic, provider-agnostic generation
  request without importing an SDK.
- Updated all stage signatures to use the new domain types and argument objects.

### Next Step

1. Implement Stage 0 source normalization.

### Blockers

- Node.js and npm are not currently available on `PATH`, so local install,
  typecheck, and build verification remain blocked.

## Session 2

### What Was Implemented

- Implemented Stage 0 normalization for extracted text and block-like input.
- Added deterministic text-to-block normalization and stable source/block IDs.
- Preserved the engine boundary with no raw file, OCR, storage, LMS, UI, or
  generation-provider dependencies.

### Next Step

1. Build the evaluation harness before implementing Stage 1 outline detection.

### Blockers

- Node.js and npm remain unavailable on `PATH`. The engine package was checked
  with a temporary TypeScript 5.8.3 compiler, but the root npm workflows remain
  blocked until the local PATH is repaired.

## Session 3

### What Was Implemented

- Built a dependency-free evaluation harness for deterministic engine stages.
- Added a Stage 0 normalization suite with success and expected-error cases.
- Added capstone-friendly JSON fixtures for basic behavior, document structure,
  metadata sanitization, deterministic ordering, and validation errors.

### Next Step

1. Implement Stage 1 outline detection by writing its eval cases first.

### Blockers

- Node.js and npm remain unavailable on the normal shell `PATH`; direct runtime
  and TypeScript verification are used until the local PATH is repaired.

## Session 4

### What Was Implemented

- Implemented eval-first Stage 1 deterministic outline detection.
- Added Stage 1 fixtures and an eval suite for grouping, ordering, tags,
  confidence scores, deterministic IDs, and empty-source validation.
- Updated the eval runner to cover both Stage 0 normalization and Stage 1
  outline detection with aggregate totals.

### Next Step

1. Implement Stage 2 generation planning using the eval-first approach.

### Blockers

- Node.js and npm remain unavailable on the normal shell `PATH`; direct runtime
  and TypeScript verification remain necessary until the PATH is repaired.

## Session 6

### What Was Implemented

- Implemented eval-first Stage 3 schema contracts and provider-request
  construction.
- Added provider-agnostic schema descriptors for the four current section
  output kinds.
- Added Stage 3 fake-provider evals for requests, valid outputs, validation,
  source isolation, and contextual provider errors.
- Updated the eval runner to cover Stage 0, Stage 1, Stage 2, and Stage 3.

### Next Step

1. Implement Stage 4 deterministic coverage verification.

### Blockers

- Node.js and npm remain unavailable on the normal shell `PATH`; direct runtime
  and TypeScript verification remain necessary until the PATH is repaired.

## Session 5

### What Was Implemented

- Implemented eval-first Stage 2 deterministic generation planning.
- Added Stage 2 fixtures and an eval suite for schema selection, target
  contracts, source references, ordering, deterministic IDs, and validation.
- Updated the eval runner to cover Stage 0, Stage 1, and Stage 2.

### Next Step

1. Implement Stage 3 schema contracts and provider-request construction without
   real OpenAI integration.

### Blockers

- Node.js and npm remain unavailable on the normal shell `PATH`; direct runtime
  and TypeScript verification remain necessary until the PATH is repaired.
