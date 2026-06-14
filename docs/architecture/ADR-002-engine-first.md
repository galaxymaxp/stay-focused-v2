# ADR-002: Build the Generation Engine First

## Status

Accepted

## Context

V1 patched generation quality issues on top of completed UI work. That made
the core reviewer workflow difficult to test, reason about, and improve
without also changing application screens.

## Decision

Build and prove the generation engine in isolation before building product
screens. The engine must have no UI dependency and must access generation
vendors through a provider interface.

## Consequences

- Every pipeline stage can be tested independently.
- Generation behavior remains decoupled from UI concerns.
- Providers can be replaced without rewriting the pipeline.
- Visible product progress begins after the core quality bar is established.
