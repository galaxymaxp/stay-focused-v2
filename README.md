# Stay Focused V2

Engine-first rebuild of Stay Focused, a schedule-first student productivity app
with Canvas LMS integration and AI-generated study materials.

## Workspace

- `apps/mobile`: Expo and Expo Router mobile app
- `apps/api`: Next.js 15 App Router API and future web app
- `packages/engine`: Provider-agnostic generation pipeline
- `packages/db`: Supabase client and database types
- `packages/canvas`: Canvas LMS client and types
- `packages/shared`: Shared types, constants, and utilities

## Engine Status

The provider-agnostic Stage 0 through Stage 6 pipeline and end-to-end
`runPipeline` integration are complete. The dependency-free eval harness
currently reports 176 passed and 0 failed using deterministic fake providers.

Real OpenAI, Supabase, Canvas, OCR, and mobile integration are intentionally
deferred. The next step is provider adapter design, not GUI implementation.

See [ADR-004](docs/architecture/ADR-004-engine-pipeline.md) and the
[engine contract](docs/architecture/engine-contract.md) for the completed
pipeline boundaries.

## Getting started

```sh
npm install
npm run typecheck
npm run build
```
