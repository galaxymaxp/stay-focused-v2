# API Provider Adapters

Provider adapters live in `apps/api` because they execute on the server and may
read server-only credentials. Core engine stages depend only on
`GenerationProvider`; they must not import the OpenAI SDK or API-layer code.

`OpenAIProvider` currently implements the adapter boundary with an injected,
narrow `OpenAIResponsesClient`. SDK construction and production route wiring
are intentionally deferred. Dependency-free contract checks use fake clients
and make no network calls.

Future real smoke tests must be opt-in and require `OPENAI_API_KEY`. That key,
the Supabase service-role key, and Google credentials must never be exposed to
browser or mobile environments.

V1 env files may supply local V2 values only through approved variable-name
matching. Real `.env` and `.env.local` files remain ignored and uncommitted.
