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
currently reports 242 passed and 0 failed using deterministic fake providers.
Default assembled reviewer cards are source-faithful: Stage 5 validates every
default-visible title, explanation, and key point, while source-external
enrichment is excluded from the default reviewer output.

Real OpenAI, Supabase, Canvas, OCR, and mobile integration are intentionally
deferred. The OpenAI SDK and server-only provider factory now live in
`apps/api`; normal contract checks still use injected fake clients and make no
network calls. Production route wiring remains deferred. GUI/mobile work
remains deferred until provider integration and engine validation are stable.

See [ADR-004](docs/architecture/ADR-004-engine-pipeline.md) and the
[engine contract](docs/architecture/engine-contract.md) for the completed
pipeline boundaries. See [ADR-005](docs/architecture/ADR-005-openai-provider-adapter.md)
for the provider adapter decision.

## Local Environment Setup

Copy the committed empty templates into ignored local files as needed:

```sh
cp .env.example .env.local
cp apps/api/.env.example apps/api/.env.local
cp apps/mobile/.env.example apps/mobile/.env.local
```

Root and API env files may hold server credentials. Mobile must contain only
`EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`.
`SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_API_KEY`, and Google Cloud credentials must
never be placed in mobile env files or committed.

Node.js 20 or newer and npm 10 or newer must be available before provider
setup. The OpenAI SDK is installed only in `apps/api`, and
`OPENAI_API_KEY` is read only by the server provider factory.

The real provider smoke test is opt-in and makes one API request:

```powershell
$env:RUN_OPENAI_SMOKE="1"
$env:OPENAI_API_KEY="<server-only-key>"
npm run smoke:openai -w apps/api
```

Normal engine evals and provider contract checks do not run this smoke test.

For the reusable authenticated Expo Web reviewer smoke, see
[Local Expo Web Reviewer Smoke](docs/testing/local-reviewer-smoke.md).

## Getting started

```sh
npm install
npm run typecheck
npm run build
```
