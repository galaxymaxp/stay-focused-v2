# API Provider Adapters

Provider adapters live in `apps/api` because they execute on the server and may
read server-only credentials. Core engine stages depend only on
`GenerationProvider`; they must not import the OpenAI SDK or API-layer code.

`OpenAIProvider` implements the adapter boundary with an injected, narrow
`OpenAIResponsesClient`. Contract checks instantiate it with fake clients, so
they make no network calls and do not construct an SDK client.

`createServerOpenAIProvider` is the server-only factory. It reads
`OPENAI_API_KEY`, constructs the OpenAI SDK client, adapts the SDK Responses API
to the narrow injected-client contract, and keeps `gpt-4o` as the default model.
The SDK import and credential lookup remain isolated to this API-layer module;
engine and mobile packages must not import it.

OCR follows the same server boundary rule. Provider-agnostic OCR contracts and
normalization live in `@stay-focused/ocr`; Google Cloud Vision SDK usage lives
only in `apps/api/src/lib/ocr`. `GoogleCloudVisionOcrProvider` implements the
shared `OcrProvider` interface through an injected `GoogleVisionDocumentTextClient`,
and `createServerOcrProvider` reads Google configuration at runtime. Normal
tests use fake clients and never make live Google requests.

The real smoke test is opt-in:

```powershell
$env:RUN_OPENAI_SMOKE="1"
$env:OPENAI_API_KEY="<server-only-key>"
npm run smoke:openai -w apps/api
```

It makes exactly one structured-output request. Normal builds, engine evals,
and `npm run provider:contract -w apps/api` never invoke it. The OpenAI key,
Supabase service-role key, and Google credentials must never be exposed to
browser or mobile environments.

OCR configuration is server-only. Use `GOOGLE_CLOUD_PROJECT_ID` plus
`GOOGLE_CLOUD_CREDENTIALS_JSON`, or Application Default Credentials through
`GOOGLE_APPLICATION_CREDENTIALS` or `GOOGLE_CLOUD_PROJECT`. Do not put these in
Expo public env files.

V1 env files may supply local V2 values only through approved variable-name
matching. Real `.env` and `.env.local` files remain ignored and uncommitted.
