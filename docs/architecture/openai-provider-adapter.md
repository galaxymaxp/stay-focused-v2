# OpenAI Provider Adapter

## Purpose

The API-layer `OpenAIProvider` translates the engine's provider-agnostic
generation request into a narrow OpenAI Responses API-style structured-output
request. It preserves dependency injection for fake-client contract testing
while providing a separate server-only factory for real SDK construction.

## Non-goals

The current adapter boundary does not:

- make network calls in tests;
- run the real smoke test by default;
- change Stage 0 through Stage 6 or `runPipeline`;
- validate generated section fields after JSON parsing; or
- accept raw files, OCR objects, Canvas objects, Supabase objects, auth objects,
  route objects, or UI state.

## Existing Engine Contract

Input from the engine is `GenerationRequest<TOutput>`. Output to the engine is
`Promise<TOutput>`. The schema is the engine's serializable
`StructuredOutputSchema`, and the default model is `gpt-4o`.

The adapter implements `GenerationProvider`; core engine stages do not import
the adapter or the OpenAI SDK.

## Adapter Responsibilities

The adapter must:

- require an injected `OpenAIResponsesClient`;
- validate the engine request, prompt, and schema;
- map only prompt, schema, model, and optional temperature;
- request strict JSON Schema structured output;
- extract and parse JSON response text;
- return parsed object data for Stage 3 validation; and
- wrap client failures without leaking secrets.

Request metadata remains available to surrounding API code for future tracing,
but the current adapter neither logs it nor injects it into the prompt.

## Real SDK Factory

`createServerOpenAIProvider` lives beside the injected adapter in
`apps/api/src/providers/openai-provider.ts`. It reads `OPENAI_API_KEY` from the
server process, constructs the OpenAI SDK client, and wraps that client in the
existing `OpenAIResponsesClient` boundary. It throws before client construction
when the key is missing.

The SDK is a dependency of `apps/api` only. Core engine stages and mobile code
must not import the SDK, the factory, or server credentials. The authenticated
reviewer route now constructs this provider and passes it to `runPipeline`
without changing any Stage 0 through Stage 6 contract.

## Request Mapping

The engine request:

```ts
interface GenerationRequest<TOutput> {
  prompt: string;
  schema: StructuredOutputSchema;
  model: string;
  temperature?: number;
  metadata?: Readonly<Record<string, unknown>>;
}
```

maps to:

```ts
interface OpenAIResponsesCreateRequest {
  model: string;
  input: string;
  temperature?: number;
  text: {
    format: {
      type: "json_schema";
      name: string;
      description: string;
      schema: StructuredOutputSchema["schema"];
      strict: true;
    };
  };
}
```

No raw file, OCR, Canvas, Supabase, authentication, or UI data should enter this
mapping. Stage 3 has already constructed a source-grounded prompt from normalized
blocks and the generation plan.

## Response Mapping

The adapter supports a minimal fake-client-compatible response shape:

- `response.output_text` containing a JSON string; or
- `response.output` containing an `output_text` item, directly or in message
  content.

The JSON must parse to a non-array object. The adapter returns that object as
`TOutput`. It intentionally does not duplicate Stage 3 schema validation.

## Error Mapping

Validation failures use explicit messages for missing client, request, prompt,
or schema. Empty output, invalid JSON, and non-object JSON are distinct errors.

Client failures are wrapped as:

```text
OpenAI provider request failed for model "<model>": <message>
```

API keys and environment values must never be included in an error.

## Environment Variables

Server-only files may contain:

- `OPENAI_API_KEY`;
- `SUPABASE_SERVICE_ROLE_KEY`;
- `GOOGLE_CLOUD_PROJECT_ID`; and
- `GOOGLE_CLOUD_CREDENTIALS_JSON`.

Mobile local env files may contain only:

- `EXPO_PUBLIC_SUPABASE_URL`; and
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`.

Real `.env` and `.env.local` files are ignored. Committed `.env.example` files
contain empty values only. V1 local env files may be used as a source for V2
values only through approved variable-name matching.

## Testing Strategy

`openai-provider.contract.test.ts` uses fake clients and covers:

- prompt, model, temperature, and JSON Schema mapping;
- `strict: true` structured outputs;
- direct and output-array JSON extraction;
- missing client, request, prompt, and schema;
- empty, invalid, and non-object responses; and
- client error wrapping with model context.

The checks require no API key or network connection. They are kept separate
from the 266 deterministic engine evals because they test an API-layer adapter
rather than engine behavior.

The installed SDK module is present for compilation, but fake checks inject a
client factory and do not construct the real SDK client. The checks also verify
the missing-key guard, `json_schema` format, `strict: true`, and the `gpt-4o`
default.

## Opt-in Smoke Test

`openai-provider.smoke.ts` makes exactly one small structured-output request.
It is not part of normal builds, engine evals, or provider contract checks and
requires both `RUN_OPENAI_SMOKE=1` and `OPENAI_API_KEY` when explicitly run:

```powershell
$env:RUN_OPENAI_SMOKE="1"
$env:OPENAI_API_KEY="<server-only-key>"
npm run smoke:openai -w apps/api
```

CI should leave `RUN_OPENAI_SMOKE` unset unless a dedicated, credentialed smoke
job is intentionally configured.

## Real Integration Checklist

1. Keep Node.js 20+ and npm 10+ available for API provider work.
2. Keep route handlers responsible for selecting the adapter and invoking
   `runPipeline`.
3. Run the opt-in smoke test only in an explicitly credentialed environment.
4. Add quality, latency, cost, and operational monitoring separately from
   deterministic engine evals.
5. Confirm no server credential enters mobile or browser bundles.

## Current Limitations

- Normal tests do not make real OpenAI requests.
- The authenticated reviewer route can invoke the real provider when server
  credentials are configured, but model quality, latency, cost, refusal, and
  operational behavior still need broader measurement.
- User-facing source input supports pasted text, image OCR, camera OCR, and
  scanned-PDF OCR before reviewer generation. Reviewer persistence is handled by
  authenticated API routes outside the OpenAI provider boundary. Canvas, tasks,
  and schedules are pending.
- Engine evals still use fake providers and remain unchanged.

Node.js and npm are prerequisites for SDK installation and verification. V1
environment values may be reused only in ignored local V2 env files after
variable-name matching; they must never be copied into committed templates or
mobile server-secret variables.
