# ADR-005: OpenAI Provider Adapter Boundary

## Status

Accepted

## Context

The Stage 0 through Stage 6 engine and `runPipeline` contract are complete and
provider-agnostic. The next provider integration must not introduce OpenAI SDK
types, environment access, or vendor response objects into core engine stages.

The API layer is the server boundary that can safely read `OPENAI_API_KEY` and
translate the engine's stable `GenerationRequest` into a vendor request. V1
local environment values may help configure V2 during development, but they
must be migrated only through approved variable-name matches and must remain in
ignored local files.

## Decision

Keep `GenerationProvider` as the only generation interface called by the
engine. Implement the OpenAI adapter in `apps/api`, inject a narrow Responses
API client, and map its output back to parsed structured data for Stage 3 to
validate.

Core engine stages must not import the OpenAI SDK. The current API layer now
contains real SDK construction and the protected reviewer route wires the
adapter into `runPipeline`; normal tests still use fake clients unless an
explicit smoke command is run.

## Adapter Location

The adapter lives in `apps/api/src/providers/openai-provider.ts`.

`apps/api` is responsible for server-only configuration and HTTP route wiring.
This location prevents `OPENAI_API_KEY` and SDK code from entering the engine,
browser bundles, or mobile application.

## Provider Contract

`OpenAIProvider` implements `GenerationProvider`:

```ts
generate<TOutput>(request: GenerationRequest<TOutput>): Promise<TOutput>
```

The adapter receives only prompt, schema, model, optional temperature, and
metadata. Metadata is not added to the prompt or sent in the current narrow
OpenAI request mapping.

## Structured Outputs Mapping

The adapter maps `GenerationRequest` to a Responses API-style request:

- `model` -> `model`, with `gpt-4o` as the adapter fallback;
- `prompt` -> `input`;
- `temperature` -> `temperature` when supplied; and
- `StructuredOutputSchema` -> `text.format` with `type: "json_schema"`, schema
  name, description, JSON Schema, and `strict: true`.

The adapter accepts JSON text from `response.output_text` or an `output_text`
item in the response output array. It parses the JSON and returns it as the
provider result. Stage 3 remains responsible for validating the expected
section kind, identity, required fields, and source references.

## Environment Variables

`OPENAI_API_KEY` is server-only. It may exist in root or `apps/api` local env
files and must never appear in `apps/mobile/.env.local`, browser code, logs,
errors, or committed templates with a value.

Supabase service-role and Google Cloud credentials follow the same server-only
rule. Mobile receives only `EXPO_PUBLIC_SUPABASE_URL` and
`EXPO_PUBLIC_SUPABASE_ANON_KEY`.

## Error Handling

The adapter validates its injected client, request, prompt, and schema. Empty
responses, invalid JSON, and non-object JSON produce explicit errors. Client
failures are wrapped with model context without including API keys or other
environment values.

Stage 3 adds planned-section context when a provider error reaches the engine.

## Evaluation Strategy

Dependency-free contract checks use injected fake clients only. They verify
request mapping, strict schema configuration, model selection, temperature,
response parsing, validation errors, and client failure wrapping. They do not
read `OPENAI_API_KEY` or make network calls.

Real provider smoke tests must be opt-in, server-side, excluded from
deterministic evals, and skipped unless an explicit local credential and command
are provided.

## Consequences

- The completed engine contract remains unchanged.
- OpenAI SDK changes can be isolated to API adapter wiring.
- Provider mapping is testable without credentials or network access.
- Server and mobile secret boundaries are explicit.
- Production hardening still requires broader operational testing, deployment
  validation, cost tracking, latency measurement, and failure monitoring.

## Current Implementation Note

As of `ebb79d8`, the API package includes the OpenAI SDK, the
`createServerOpenAIProvider` factory, and the protected
`POST /api/reviewer/generate` route. The current completed vertical slice signs
in with Supabase email/password, submits pasted text from Expo, calls the
authenticated reviewer API, uses OpenAI-backed generation, validates coverage
and grounding, and renders a reviewer preview. OCR ingestion, Canvas sync,
reviewer persistence, tasks, and schedules remain pending product phases.

## Alternatives Considered

- **Import OpenAI in `packages/engine`.** Rejected because it would make core
  stages vendor-specific.
- **Construct the SDK client inside the adapter class.** Deferred because it
  would require the SDK and environment access during contract tests.
- **Call OpenAI from mobile or browser code.** Rejected because it would expose
  the server API key.
- **Reuse V1 env files directly.** Rejected because V2 requires explicit local
  files, safe name mapping, and independent secret hygiene.

## Capstone Relevance

This boundary demonstrates that provider integration can evolve independently
from the tested generation algorithm. It supports maintainability, security,
and repeatable evaluation while keeping claims honest: the adapter contract is
tested, but real OpenAI quality and operational behavior are not yet evaluated.
