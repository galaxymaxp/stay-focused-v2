# ADR-001: Use a Turborepo Monorepo

## Status

Accepted

## Context

The web API, mobile application, and shared generation engine need to coexist
while retaining clear ownership boundaries. They also need to share types and
support coordinated changes without publishing internal packages.

## Decision

Use a Turborepo monorepo managed with npm workspaces. Applications live under
`apps/`, reusable packages live under `packages/`, and Turborepo coordinates
build, development, lint, and type-check tasks.

## Consequences

- Types and utilities can be shared without duplication.
- A single CI pipeline can validate the complete system.
- Internal packages are directly importable by both applications.
- Repository-wide dependency and tooling changes must remain coordinated.
