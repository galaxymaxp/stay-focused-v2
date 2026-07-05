# Stay Focused V2

Stay Focused V2 is a mobile-first, schedule-first student productivity app for
turning school source material into useful study work. The current product is
an Expo/React Native app backed by a Next.js 15 App Router API, Supabase
authentication, OpenAI-backed reviewer generation, TypeScript workspaces, and
Google Cloud OCR-backed source intake, with Canvas LMS still planned.

Expo Web is the fast laptop-browser development and regression surface for the
mobile app. It is not a replacement for the mobile-primary product.

## Workspace

- `apps/mobile`: Expo and Expo Router mobile app
- `apps/api`: Next.js 15 App Router API
- `packages/engine`: Provider-agnostic reviewer generation pipeline
- `packages/ocr`: Provider-agnostic OCR contracts and deterministic
  normalization
- `packages/db`: Supabase client and database types
- `packages/canvas`: Canvas LMS client and types
- `packages/shared`: Shared types, constants, and utilities

## Current Working Vertical Slice

The current completed flow is:

```text
Sign in
-> paste source text, import a gallery image, take a camera photo, or import a PDF
-> review and edit source text
-> authenticated reviewer API
-> OpenAI generation
-> coverage, grounding, and leakage validation
-> reviewer preview
-> save to Study Library
-> list, open, rename, or delete saved reviewers
```

This slice uses Supabase email/password authentication in the Expo app. The
mobile client sends a Supabase bearer token to `POST /api/reviewer/generate`;
the API verifies it with Supabase, creates the server-only OpenAI provider, runs
the Stage 0 through Stage 6 engine pipeline, and returns a reviewer preview.

## Current Implementation Status

Complete:

- Stage 0 through Stage 6 provider-agnostic reviewer engine
- OpenAI provider boundary in the API layer
- Supabase bearer-token protection for reviewer generation
- Expo reviewer input and preview
- Email/password sign-in and session restore
- Local Expo Web CORS support for the reviewer route
- Unattended authenticated Expo Web reviewer smoke runner
- Persistent smoke-browser session and automatic output assertions
- Provider-agnostic OCR contracts and normalization in `@stay-focused/ocr`
- Server-only Google Cloud Vision OCR adapter with fake-client tests
- Protected `POST /api/ocr/extract` image OCR route
- Expo gallery image import and camera capture with editable OCR text review
  before reviewer generation
- Protected `POST /api/ocr/extract-pdf` scanned-PDF OCR route for synchronous
  1-5 page PDF intake
- Expo PDF import with editable OCR text review before reviewer generation
- Supabase reviewer persistence migration and authenticated reviewer CRUD API
- Expo Study Library for saved reviewer list, open, rename, and delete
- Live Supabase Study Library validation with distinct users, bidirectional
  owner isolation, safe `404 reviewer_not_found` denial, and cleanup
- Reviewer detail route typing fix for Promise-based Next.js App Router params

Working locally:

- OpenAI-backed reviewer generation through the authenticated API route
- Authenticated image OCR extraction through the API route contract
- Gallery-selected, camera-captured, and scanned-PDF source intake in the
  mobile client
- Save, list, open, rename, and delete flows against the reviewer library API
  contract
- Live `reviewers` schema, RLS, policy, and migration-history verification
- Live cross-user Study Library validation against `http://localhost:3000`
- Final Phase 4 regression pass: DB/API/mobile typechecks, API/mobile/OCR
  tests, engine build/evals, and `git diff --check`
- `npm run smoke:reviewer:web` for laptop-browser regression coverage
- `npm run smoke:ocr:web` for deterministic Expo Web OCR UI coverage with a
  mocked OCR response
- `npm run smoke:ocr-pdf:web` for deterministic Expo Web PDF OCR UI coverage
  with a mocked OCR response
- API route tests, smoke-runner tests, engine evals, API typecheck, mobile
  typecheck, and engine build

Pending:

- Canvas LMS integration
- Task generation and study scheduling
- Completed mobile OAuth redirects, deployment validation, product polish, and
  capstone evidence

See [Current State](docs/current-state.md), [Roadmap](docs/roadmap.md), and
[Current Sprint](docs/ai/current_sprint.md) for the detailed working status.

## Reviewer Engine Status

The provider-agnostic Stage 0 through Stage 6 pipeline and end-to-end
`runPipeline` integration are complete. The deterministic engine evaluation
harness currently reports **266 passed and 0 failed**.

Default visible reviewer content is source-faithful: validation checks visible
titles, explanations, and key points, while unsupported enrichment is excluded
from default assembly. Short OCR-style prose has an extractive fallback, and the
mobile client can now send edited OCR text into the same reviewer generation
flow. Scanned-document OCR is implemented as a synchronous small-PDF MVP, and
reviewer persistence sits outside the engine behind authenticated API routes.

See [ADR-004](docs/architecture/ADR-004-engine-pipeline.md), the
[engine contract](docs/architecture/engine-contract.md), and
[ADR-005](docs/architecture/ADR-005-openai-provider-adapter.md) for the core
generation boundaries. See
[OCR API Boundary](docs/architecture/ocr-api-boundary.md) for the Phase 3A OCR
server contract.

## Local Environment Setup

Copy the committed empty templates into ignored local files as needed:

```sh
cp .env.example .env.local
cp apps/api/.env.example apps/api/.env.local
cp apps/mobile/.env.example apps/mobile/.env.local
```

Root and API env files may hold server credentials. Mobile must contain only
public `EXPO_PUBLIC_` values. `SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_API_KEY`, and
Google Cloud credentials must never be placed in mobile env files or committed.
The OCR server factory supports `GOOGLE_CLOUD_PROJECT_ID`,
`GOOGLE_CLOUD_CREDENTIALS_JSON`, and Application Default Credentials through
`GOOGLE_APPLICATION_CREDENTIALS` or `GOOGLE_CLOUD_PROJECT`.

Node.js 20 or newer and npm 10 or newer are required.

## Local Testing

Run the reusable authenticated Expo Web reviewer smoke from the repository
root:

```sh
npm run smoke:reviewer:web
npm run smoke:ocr:web
npm run smoke:ocr-pdf:web
```

The reviewer smoke submits the pasted-text fixture. The OCR web smoke switches
to image mode, injects a tiny fictional image fixture without opening the
operating-system picker, mocks only `POST /api/ocr/extract`, verifies editable
extracted text, then uses the real reviewer route. The PDF OCR web smoke follows
the same pattern with a fictional PDF fixture and mocked
`POST /api/ocr/extract-pdf`. These OCR smokes do not prove live Google OCR. The
commands start or reuse local services, authenticate or restore a persisted
smoke session, verify reviewer output, and clean up runner-owned services.

See [Local Expo Web Reviewer Smoke](docs/testing/local-reviewer-smoke.md) for
credential setup, session-only mode, failure codes, and diagnostics.

Useful non-live checks:

```sh
npm run test:reviewer-web-smoke
npm run test --workspace apps/mobile
npm run test --workspace @stay-focused/ocr
npm run test --workspace apps/api
npm run typecheck --workspace @stay-focused/db
npm run typecheck --workspace apps/api
npm run typecheck --workspace apps/mobile
npm run build --workspace @stay-focused/engine
npm run eval --workspace @stay-focused/engine
```

The API-layer OpenAI provider also has a separate opt-in one-call smoke test:

```powershell
$env:RUN_OPENAI_SMOKE="1"
$env:OPENAI_API_KEY="<server-only-key>"
npm run smoke:openai -w apps/api
```

Normal engine evals, provider contract checks, and reviewer smoke-runner unit
tests do not run that opt-in provider smoke.

## Current Limitations

- Gallery image import and camera capture support PNG/JPEG OCR into editable
  text, and manual paste remains available.
- Scanned-PDF import supports one server-bound PDF per request, 1-5 pages, and
  editable extracted-text review.
- Physical-device live OCR validation depends on local API, Supabase, and
  Google Cloud OCR credentials.
- Canvas integration is not implemented beyond a thin package boundary.
- Task and schedule generation are not implemented.
- Google and Microsoft OAuth helpers exist, but completed mobile OAuth redirect
  flows are not validated as a finished feature.
- Production deployment and iPhone production readiness are not complete.

## Next Milestone

Phase 5 Canvas Integration is the next milestone: bring Canvas LMS material
into the same authenticated source-to-reviewer pipeline now that Phase 4 Study
Library persistence is complete and live validated.
