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
