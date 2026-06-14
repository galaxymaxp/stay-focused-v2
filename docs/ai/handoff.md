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
