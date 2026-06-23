# Stay Focused V2 - Local Agent Handoff

This file is local-only and intentionally ignored by Git.

## Current Status

- Stay Focused V2 uses an engine-first, evaluation-first workflow.
- Stages 0 through 6 and the end-to-end pipeline are implemented with typed
  evaluation coverage.
- The API-layer OpenAI provider now includes an injected-client adapter and a
  server-only OpenAI SDK factory in commit `d8374e9`, present on `origin/main`.
- The current branch is `main` at `d8374e9`, matching `origin/main`.
- The latest full evaluation result is 219 passed and 0 failed.
- OpenAI adapter contract checks pass 18 cases with fake clients and no network
  access.
- Node.js `v24.16.0` and npm `11.13.0` are installed. The Node directory was
  added to the user PATH, and PowerShell CurrentUser execution policy is
  `RemoteSigned` so the official npm shim can run.
- API and engine typechecks/builds pass. Root workspace typecheck/build now run
  but stop in untouched mobile configuration due duplicate React types and a
  missing `react-native-web` dependency.
- The real OpenAI smoke test is implemented but was not run because it remains
  explicitly opt-in through `RUN_OPENAI_SMOKE=1`.
- Supabase JWT Bearer authentication is now enforced on `/api/review`.
- This handoff is local-only, ignored by Git, and was not committed.

## Recent Completed Work

### Stage 0 - Domain Contracts and Source Normalization

- Added domain contracts and initial normalized source handling.
- Added the evaluation framework foundation and Stage 0 cases.
- Recorded verification: 14 passed, 0 failed.

### Stage 1 - Outline Detection

- Implemented deterministic outline detection.
- Added typed eval coverage for outline behavior.
- Recorded verification: Stage 0 14 passed; Stage 1 14 passed.

### Stage 2 - Generation Planning

- Implemented deterministic generation planning.
- Added plan-oriented eval cases.
- Recorded verification: Stage 0 14 passed; Stage 1 14 passed; Stage 2 24
  passed.

### Stage 3 - Provider Requests and Typed Outputs

- Implemented deterministic, source-grounded prompts.
- Added provider-agnostic schema selection with `gpt-4o` as the default model.
- Added plan, section, schema, and source metadata to provider requests.
- Added validation for returned output fields and identities.
- Wrapped provider failures with section context.
- Kept all provider access behind the `GenerationProvider` interface.
- Added plain serializable TypeScript descriptors for `ConceptCard`,
  `ProcessStep`, `ExampleCard`, and `ClaimCard`.
- Added 24 eval cases covering schema selection, prompts, metadata, valid
  outputs, invalid responses, missing inputs, source references, and provider
  failures.

### Stage 4 - Coverage Verification

- Implemented deterministic coverage verification using eval-first
  development.
- Added checks for schema alignment, required content, source coverage,
  scoring, statuses, ordering, and validation.
- Added Stage 4 to the aggregate eval runner.

### Stage 5 - Bounded Retry Handling

- Implemented eval-first bounded retries through the existing Stage 3 provider
  boundary.
- Preserved passed outputs and retried only retryable weak or failed sections.
- Re-ran Stage 4 coverage after generated retry candidates and stopped sections
  once they passed or reached the configured retry bound.
- Added fake-provider coverage for policy switches, provider failures, missing
  outputs, ordering, replacement behavior, and structural validation.
- Added Stage 5 to the aggregate eval runner.

### Stage 6 - Deterministic Reviewer Assembly

- Implemented deterministic reviewer assembly without a final provider or
  model pass.
- Preserved generation-plan order and all typed section output content.
- Added stable reviewer and reviewer-section IDs, deterministic metadata, and
  explicit weak-section opt-in.
- Added validation for output, coverage, plan, source, schema, and source-block
  relationships.
- Added Stage 6 to the aggregate eval runner with 30 cases.

### Pipeline Integration

- Wired `runPipeline` through normalization, outline detection, generation
  planning, initial generation, coverage verification, bounded retries, final
  verification, and reviewer assembly.
- Kept all provider calls behind `GenerationProvider` and used deterministic
  fake providers in integration evals only.
- Added integration coverage for schema routing, source order, request counts,
  retries, weak-section policy, metadata, deterministic IDs, and contextual
  failures.
- Added the pipeline integration suite to the aggregate eval runner.

### Engine Contract Documentation

- Added ADR-004 for the accepted Stage 0 through Stage 6 engine pipeline.
- Added an implementation-focused engine contract covering public types, stage
  boundaries, provider requests, schema family, verification, retries, and
  current limitations.
- Updated the repository README, thesis overview, and eval README with the
  completed pipeline status and capstone context.

### OpenAI Provider Adapter Boundary

- Added ADR-005 and implementation documentation for an API-layer OpenAI
  adapter behind `GenerationProvider`.
- Added an injected-client `OpenAIProvider` boundary without importing the
  OpenAI SDK or changing Stage 0 through Stage 6.
- Added 16 dependency-free fake-client contract checks for request mapping,
  structured output parsing, validation, and error wrapping.
- Added safe env templates and strengthened ignore rules for local env and
  credential files.
- Migrated matching V1 local values into ignored V2 root/API/mobile env files;
  Google Cloud project and credential values remain missing.

### Server OpenAI SDK Wiring

- Installed the OpenAI SDK in `apps/api` only.
- Added `createServerOpenAIProvider`, which reads the server-only
  `OPENAI_API_KEY` and constructs the real SDK client behind the existing
  `OpenAIResponsesClient` boundary.
- Preserved strict JSON Schema Responses API mapping and Stage 3 validation.
- Added an opt-in, one-call OpenAI smoke module guarded by
  `RUN_OPENAI_SMOKE=1`.
- Expanded fake-client provider contract coverage to 18 passing checks.
- Restored local Node/npm access without changing system PATH.

## Active Branch / Commits

- Branch: `main`
- `d8374e9` - `feat(api): wire server openai provider`
- `a0233be` - `feat(api): design openai provider adapter boundary`
- `e2a665f` - `docs(engine): document completed pipeline contract`
- `cc5dac2` - `feat(engine): wire pipeline integration`
- `d54b4cb` - `feat(engine): implement stage 6 reviewer assembly`
- `25aabc4` - `feat(engine): implement stage 5 bounded retries`
- `612bfe0` - `chore: add local-only agent handoff template`
- `e0f79bf` - `feat(engine): implement eval-first stage 4 coverage verification`
- `a108a26` - `feat(engine): implement eval-first stage 3 provider requests`
- `5f50c89` - `feat(engine): implement eval-first stage 2 generation planning`
- `1aad79c` - `feat(engine): implement eval-first stage 1 outline detection`
- `4483503` - `test(engine): add dependency-free evaluation harness`
- `dfd6ae8` - `feat(engine): add domain contracts and stage 0 normalization`

`origin/main` currently points to `a0233be`, confirming that the OpenAI adapter
boundary commit was pushed.

## Test / Verification Status

Latest full verification through pipeline integration on 2026-06-15:

- Stage 0: 14 passed
- Stage 1: 14 passed
- Stage 2: 24 passed
- Stage 3: 24 passed
- Stage 4: 21 passed
- Stage 5: 28 passed
- Stage 6: 30 passed
- Pipeline integration: 21 passed
- Total: 176 passed, 0 failed
- Direct TypeScript 5.8.3 source and eval typechecks passed.
- Direct TypeScript 5.8.3 source and eval builds passed.
- Each Stage 0 through Stage 6 suite and the pipeline suite passed
  independently.
- The aggregate eval runner passed.
- The failure exit-code check correctly returned `1`.
- `git diff --check` passed with exit code `0`.
- `npm install` passes with npm `11.13.0`.
- `npm run typecheck` starts successfully but fails in untouched mobile code
  because React Native JSX types resolve against incompatible duplicate React
  type definitions.
- `npm run build` starts successfully but fails in untouched mobile setup
  because Expo web export requires `react-native-web`.
- Verification used the bundled Codex Node.js runtime and the local temporary
  TypeScript 5.8.3 compiler package.
- The documentation session reran direct source/eval typechecks, both builds,
  and the full 176-case eval runner successfully.
- The adapter session reran the full 176-case engine eval runner and direct
  engine typechecks/builds successfully.
- API provider-specific TypeScript typecheck/build passed, and all 18 provider
  contract checks passed without a real API key or network call.
- The API Next.js production build passes.
- The OpenAI smoke test was not run because it is opt-in and
  `RUN_OPENAI_SMOKE=1` was not explicitly enabled.

## Important Architecture Decisions

- Engine-first development continues.
- Evaluation-first development is the standard workflow for each engine stage.
- The provider boundary must remain isolated through `GenerationProvider`.
- Stage outputs must remain typed, serializable, and source-grounded.
- `packages/engine` must not contain UI coupling.
- Provider schema descriptors remain plain serializable TypeScript data rather
  than SDK-specific objects.
- Real model quality evaluation remains separate from deterministic engine
  contract evaluation.

## Known Constraints

- New shells inherit `C:\Program Files\nodejs` from the user PATH. Existing
  long-lived parent processes may require a restart to observe the updated
  environment automatically.
- Google Cloud project ID and credentials are not available in the migrated
  local environment files.
- OpenAI token ceilings and serverless execution limits may affect future
  generation latency and should be monitored when real provider integration is
  added.
- `npm install` currently reports 12 moderate dependency vulnerabilities; no
  forced audit fix was applied because that could introduce unrelated breaking
  changes.

## Blockers

- Root workspace typecheck is blocked by duplicate React type definitions in
  the existing mobile workspace.
- Root workspace build is blocked because the existing Expo web configuration
  does not include `react-native-web`.
- CRLF warnings appear during some Git checks but do not block verification.

## Recommended Next Task

- Run the opt-in OpenAI smoke test in a deliberate credentialed session, then
  add a protected API route that constructs the server provider and invokes the
  unchanged engine pipeline.
- Resolve the separate mobile dependency/type mismatch before requiring clean
  root monorepo typecheck and build results.

## Session Log

### 2026-06-15 - Session 14 Supabase JWT Auth on /api/review

**Files created:**
- `apps/api/src/lib/auth.ts` — `verifyBearerToken(request)` helper using
  Supabase service-role client to validate `Authorization: Bearer <token>`
  headers. Returns the `User` object on success, `null` on any failure.
  Never exposes token contents, stack traces, or Supabase internals.

**Files changed:**
- `apps/api/app/api/review/route.ts` — Auth check now runs first, before
  `RUN_OPENAI_SMOKE` and all other checks. Returns `{ error: "Unauthorized" }`
  with HTTP 401 on any auth failure.
- `apps/api/package.json` — Added `@supabase/supabase-js: ^2.49.4` to
  `dependencies` (was already hoisted to root node_modules via `packages/db`;
  now declared explicitly in the API package).

**What was implemented:**
- JWT Bearer-only authentication for `/api/review` (no cookies, mobile-safe).
- Auth call order: auth → RUN_OPENAI_SMOKE guard → input validation → provider
  → pipeline.
- Status mapping: 401 (no/bad/expired token), 501 (smoke disabled), 400 (bad
  input), 500 (provider/pipeline failure).
- `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are read from `process.env`
  inside the helper; both are already configured in Vercel.

**Risks / edge cases noticed:**
- `@supabase/supabase-js` was not explicitly listed in `apps/api/package.json`
  before this session. It was accessible via hoisting from `packages/db`, but
  explicit declaration was added for correctness and deploy reliability.
- The `tsconfig.providers.json` scope does not include `src/lib/`, so the new
  auth helper is only compiled by the main `tsconfig.json`. This is intentional
  and consistent with existing route files.
- `persistSession: false` is passed to `createClient` to prevent any
  cookie/storage side effects in the server environment.
- If `SUPABASE_URL` or `SUPABASE_SERVICE_ROLE_KEY` are missing at runtime, the
  helper returns `null` (→ 401) rather than throwing, keeping error responses
  generic.

**Next recommended step:**
- Run `npm run build` in `apps/api` and verify the Next.js production build
  still passes with the new auth import.
- Test the deployed `/api/review` endpoint: confirm 401 without a token, 401
  with an invalid token, and 501 with a valid Supabase token (until
  `RUN_OPENAI_SMOKE=1` is enabled).
- Consider adding a mobile integration test that exercises the full auth +
  pipeline path once `RUN_OPENAI_SMOKE=1` is enabled in a staging environment.

### 2026-06-15 - Session 13 Server OpenAI SDK Wiring

- Diagnosed Node/npm as absent rather than only missing from PATH.
- Installed official Node.js LTS `v24.16.0` through `winget`; npm `11.13.0` is
  available.
- Added `C:\Program Files\nodejs` to the user PATH and set PowerShell
  CurrentUser execution policy to `RemoteSigned`; system PATH and machine
  policy were not changed.
- Installed `openai@6.42.0` in `apps/api` only.
- Added the server-only SDK factory while preserving the injected fake-client
  adapter and all engine contracts.
- Added an opt-in one-call smoke module; it was not run because
  `RUN_OPENAI_SMOKE=1` was not explicitly enabled.
- Provider contract checks pass 18 cases with no network access.
- Engine evals remain 176 passed, 0 failed.
- API and engine typechecks/builds pass; the API Next.js production build
  passes.
- Root workspace typecheck/build now execute but fail only in untouched mobile
  setup due duplicate React types and missing `react-native-web`.
- `npm install` passes. It reports 12 moderate dependency vulnerabilities; no
  forced audit remediation was applied.
- Committed and pushed the server SDK wiring as `d8374e9`.
- Next step: run the opt-in real OpenAI smoke test intentionally, then add a
  protected API route without changing engine contracts.
- `docs/ai/handoff.md` is ignored and local-only, so it was updated locally but
  not staged or committed.

### 2026-06-15 - Session 12 OpenAI Adapter Boundary

- Safely prepared V2 env files using matching V1 local env values.
- Created the root env example and confirmed the existing API/mobile examples
  contain empty values only.
- Designed the OpenAI provider adapter boundary and added ADR-005.
- Added provider adapter implementation documentation.
- Added an API-layer `OpenAIProvider` boundary with 16 fake-client contract
  checks and no network calls.
- Current engine eval total remains 176 passed, 0 failed.
- Direct TypeScript 5.8.3 engine and provider typechecks/builds passed.
- npm remains unavailable on `PATH`; `npm install`, `npm run typecheck`, and
  `npm run build` were blocked by the command-not-found error.
- Committed and pushed the adapter boundary as `a0233be`.
- Next step: fix Node.js/npm PATH before real SDK wiring, or add an opt-in real
  OpenAI smoke test only after npm works.
- `docs/ai/handoff.md` is ignored and local-only, so it was updated locally but
  not staged or committed.

### 2026-06-15 - Session 11 Engine Contract Documentation

- Added engine contract documentation.
- Added ADR-004 for the completed Stage 0 through Stage 6 pipeline.
- Updated the repository README, thesis overview, and eval README.
- Current eval total: 176 passed, 0 failed.
- Direct TypeScript 5.8.3 source/eval typechecks and builds passed.
- npm remains unavailable on `PATH`; `npm install`, `npm run typecheck`, and
  `npm run build` were blocked by the command-not-found error.
- Committed and pushed the documentation as `e2a665f`.
- Next step: design the provider adapter boundary for OpenAI integration
  without changing engine contracts.
- `docs/ai/handoff.md` is ignored and local-only, so it was updated locally but
  not staged or committed.

### 2026-06-15 - Session 10 Pipeline Integration

- Wired `runPipeline` end to end with fake-provider integration fixtures.
- Added a 21-case pipeline eval suite.
- The eval runner now covers Stage 0 through Stage 6 plus pipeline integration.
- Current eval totals: 176 passed, 0 failed.
- Direct TypeScript 5.8.3 source/eval typechecks and builds passed.
- npm remains unavailable on `PATH`; `npm install`, `npm run typecheck`, and
  `npm run build` were blocked by the command-not-found error.
- Committed and pushed pipeline integration as `cc5dac2`.
- Next step: add engine contract documentation and an ADR for the completed
  pipeline before provider integration.
- `docs/ai/handoff.md` is ignored and local-only, so it was updated locally but
  not staged or committed.

### 2026-06-15 - Session 9 Stage 6 Reviewer Assembly

- Implemented eval-first Stage 6 deterministic reviewer assembly.
- Added Stage 6 fixtures and a 30-case eval suite.
- The eval runner now covers Stage 0 through Stage 6.
- Current eval totals: 155 passed, 0 failed.
- Direct TypeScript 5.8.3 source/eval typechecks and builds passed.
- npm remains unavailable on `PATH`; `npm install`, `npm run typecheck`, and
  `npm run build` were blocked by the command-not-found error.
- Committed and pushed Stage 6 as `d54b4cb`.
- Next step: wire `runPipeline` end to end using fake-provider fixtures, then
  add integration evals.
- `docs/ai/handoff.md` is ignored and local-only, so it was updated locally but
  not staged or committed.

### 2026-06-15 - Session 8 Stage 5 Bounded Retries

- Implemented eval-first Stage 5 bounded retry handling.
- Added Stage 5 fixtures and a 28-case fake-provider eval suite.
- The eval runner now covers Stage 0, Stage 1, Stage 2, Stage 3, Stage 4, and
  Stage 5.
- Current eval totals: 125 passed, 0 failed.
- Direct TypeScript 5.8.3 source/eval typechecks and builds passed.
- npm remains unavailable on `PATH`; `npm install`, `npm run typecheck`, and
  `npm run build` were blocked by the command-not-found error.
- Committed and pushed Stage 5 as `25aabc4`.
- Next step: implement Stage 6 deterministic reviewer assembly.
- `docs/ai/handoff.md` is ignored and local-only, so it was updated locally but
  not staged or committed.

### 2026-06-15 - Current Progress Refresh

- Refreshed the local-only handoff with detailed Stage 0 through Stage 3
  progress and verification results.
- Verified that the exact Stage 3 commit is `a108a26`.
- Confirmed that `origin/main` includes Stage 4 at `e0f79bf`, which is newer
  than the supplied Stage 3 project snapshot.
- Confirmed the current branch is `main` and locally ahead by the handoff
  template commit `612bfe0`.
- Attempted the engine build and aggregate eval commands; both remain blocked
  by npm being unavailable on `PATH`.
- Confirmed `git diff --check` passes in the current workspace.

### Session 7 - Stage 4 Coverage Verification

- Implemented eval-first Stage 4 deterministic coverage verification.
- Added fixtures and eval coverage for schema alignment, required content,
  source coverage, scoring, statuses, ordering, and validation.
- Updated the aggregate eval runner to include Stage 4.
- Next task recorded at the time: Stage 5 bounded retry handling with fake
  providers.

### Session 6 - Stage 3 Provider Requests

- Implemented eval-first Stage 3 schema contracts and provider-request
  construction.
- Added provider-agnostic schema descriptors for four section output kinds.
- Added fake-provider evals for requests, valid outputs, validation, source
  isolation, and contextual provider errors.
- Updated the aggregate eval runner to include Stage 3.

### Session 5 - Stage 2 Generation Planning

- Implemented eval-first deterministic generation planning.
- Added cases for schema selection, target contracts, source references,
  ordering, deterministic IDs, and validation.

### Session 4 - Stage 1 Outline Detection

- Implemented eval-first deterministic outline detection.
- Added coverage for grouping, ordering, tags, confidence scores,
  deterministic IDs, and empty-source validation.

### Session 3 - Evaluation Harness

- Built a dependency-free evaluation harness for deterministic engine stages.
- Added Stage 0 success and expected-error cases with readable JSON fixtures.

### Session 2 - Stage 0 Normalization

- Implemented normalization for extracted text and block-like input.
- Added deterministic text-to-block normalization and stable source/block IDs.
- Preserved the engine boundary from raw file, OCR, storage, LMS, UI, and
  provider dependencies.

### Session 1 - Domain Types

- Implemented stable domain types for normalized sources, outlines, generation
  plans, outputs, coverage, reviewer output, and retries.
- Defined a provider-agnostic request boundary without importing an SDK.
- Updated stage signatures to use typed argument objects.

### Session 0 - Initial Architecture

- Initialized V2 as a Turborepo monorepo with npm workspaces.
- Chose an engine-first architecture with no UI dependency.
- Chose token-based JWT authentication instead of cookies.
- Separated mobile, API, engine, database, Canvas, and shared code into
  workspaces.

Vercel project created:
- Project name: stay-focused-v2-api
- Root directory: apps/api
- Preset: Next.js
- RUN_OPENAI_SMOKE=0
- /api/health expected live
- /api/review expected 501 until real provider is enabled

Design reference:
- Local folder: C:\Users\Fely Max Dilinila\OneDrive\Documents\Projects\stay-focused-v2\design

### Session: Stage 6.1 - JWT auth on /api/review

- Files created: `apps/api/src/lib/auth.ts`
- Files changed: `apps/api/app/api/review/route.ts`
- What was implemented: Bearer token verification via Supabase `getUser`, runs
  before all other checks, with a generic 401 response on failure.
- Next step: Apply the same auth helper to remaining generation routes.
- Risks/blockers: The app has no `@/*` TypeScript path alias, so the route uses
  the existing relative import style. Missing Supabase server environment
  variables intentionally produce the same generic 401 response.

### Stage 6.1 — Supabase JWT verification — 2026-06-15
- Files created: `apps/api/src/lib/auth.ts`
- Files changed: `apps/api/app/api/review/route.ts`, `docs/ai/handoff.md`
- What was implemented: Added a Supabase-backed Bearer token verifier and enforced authentication before all other `/api/review` checks, returning a generic 401 on failure without cookies or exposed internals.
- Verified by: API TypeScript check (`tsc --noEmit`).
- Next recommended step: Apply the same auth helper to remaining protected API routes.
- Risks/blockers: `apps/api/package.json` has a separate unstaged change adding `@supabase/supabase-js`; it is intentionally excluded from this commit.
- Commit: not committed

### Stage 6.2 — @/* path alias — 2026-06-15
- Files created: none
- Files changed: apps/api/tsconfig.json, apps/api/app/api/review/route.ts
- What was implemented: @/* → ./src/* alias; auth import switched off relative path
- Verified by: tsc --noEmit pass
- Next recommended step: roll verifyBearerToken out to remaining generation routes
- Risks/blockers: npx is unavailable on PATH in this shell; verification passed with the repository's local TypeScript compiler via the bundled Node runtime. tsconfig.providers.json remains unchanged.
- Commit: 853b1901b93773b9af088c3add7d96c82fc42f2b

---

## CONVENTION — API route auth (established Stage 6.2)

Every new `/api/*` route that touches user data or runs generation MUST:
- call `verifyBearerToken(request)` from `@/lib/auth` as the first statement in the handler
- return `{ error: "Unauthorized" }` with status 401 when it returns null
- run the auth check before input parsing and before any env/feature flag checks
- never expose token contents, stack traces, or Supabase internals in responses
- use JWT Bearer only — no cookies (mobile cannot use cookies)

Public exceptions (MUST NOT receive the Bearer guard):
- `/api/health` — health check, must return unauthenticated 200
- any future webhook or cron route — these authenticate via their own secret/signature, not Bearer

Current route status:
- `/api/review` — guarded ✅
- `/api/health` — intentionally public ✅

---

### 2026-06-19 Stage 5a grounding fix — Phase 1 (deterministic floor)
- Changed: `packages/engine/src/stage3-generate.ts`, `packages/engine/src/stage4-verify.ts`, `packages/engine/src/stage5-retry.ts`, `packages/engine/src/stage5a-grounding.ts`, `packages/engine/src/types.ts`, `packages/engine/evals/stage5a-grounding.eval.ts`, `packages/engine/evals/pipeline.eval.ts`, `packages/engine/evals/stage6-assemble.eval.ts`, `packages/engine/scripts/live-run.ts`, `docs/ai/handoff.md`
- Root cause: token-presence fabrication check flagged glue words (false-positive storm); real omissions/drift were buried. The comparison span is clean UTF-8; corruption was limited to PowerShell live-log capture.
- Phase 1 fix: extraction-first sourceCore; stopword-aware content-token check; LIST_COVERAGE_THRESHOLD omission gate; no encoding normalization needed. NO LLM judge.
- Verification: typecheck PASS; build PASS; eval PASS (202/202); eval:stage5a PASS (12/12); phase1FabricationFails=unavailable (OPENAI_API_KEY unset)
- Next: Phase 2 — entailment judge for the N flagged claims (sized from a future live run); Phase 3 — specific-reason retry + judge cap.
- Risks: Phase 1 flags faithful synonym paraphrase as fabrication by design; mitigated by extraction-first generator until Phase 2.

### 2026-06-19 Stage 5a grounding fix — Phase 1.1 (list adherence + collect-and-continue)
- Changed: `packages/engine/src/stage3-generate.ts`, `packages/engine/src/generate.ts`, `packages/engine/src/stage5-retry.ts`, `packages/engine/scripts/live-run.ts`, `packages/engine/evals/stage3-generate.eval.ts`, `packages/engine/evals/stage5a-grounding.eval.ts`, `packages/engine/evals/pipeline.eval.ts`, `packages/engine/evals/stage5-retry.eval.ts`, `packages/engine/evals/fixtures/pipeline-retry.json`, `packages/engine/evals/fixtures/stage5-basic.json`, `packages/engine/evals/fixtures/stage5-policy.json`, `docs/ai/live-output-it-security-after-grounding.txt`, `docs/ai/handoff.md`
- Root cause: extraction-first prompt failed on list-only sections - model elaborated instead of extracting, causing fabrication + 0/N omission, and a meta-commentary explanation tripped the instruction-leakage guard and aborted the run.
- Fix: hard list-adherence rule (keyPoints = source items verbatim; descriptions to enrichment); anti-meta explanation rule; collect-and-continue on validation failures with infra-error boundary preserved.
- Verification: typecheck PASS; build PASS; eval PASS (208/208); eval:stage5a PASS (14/14). LIVE: complete run = yes; phase1FabricationFails=45; per-section grounding = Introduction 1, What is IT Security 1, Goal of IT Security 1, Domains of IT Security 0.4, What is Cybersecurity? 1, What is Cybersecurity all about? 0.25, Importance of cybersecurity 0.88, Challenges of Cybersecurity 0.7, Impact of a Security Breach 0.4, Types of Attackers 0.79, Definition of Terms 0.25, Types of Cybersecurity Threats 0, Types of Malware 0, Symptoms of Malware 0, Methods of Infiltration 0, Methods to Deny Service 0, Blended Attacks 0, Impact Reduction 0.25.
- Next: Phase 2 (entailment judge) - NOW UNBLOCKED because N=45 is known; size judge cost against N. Re-confirm list omissions resolved before adding judge (judge can't fix non-extraction).
- Risks: PS5 stderr trap on live runs - always use `$ErrorActionPreference='Continue'`. Consider a committed run script so the working invocation isn't re-derived.

### 2026-06-19 Stage 5a grounding fix — Phase 1.2
- Changed: `packages/engine/src/source-blocks.ts`, `packages/engine/src/source-items.ts`, `packages/engine/src/index.ts`, `packages/engine/src/schemas.ts`, `packages/engine/src/stage3-generate.ts`, `packages/engine/src/stage4-verify.ts`, `packages/engine/src/stage5-retry.ts`, `packages/engine/src/stage5a-grounding.ts`, `packages/engine/evals/fixtures/stage3-request.json`, `packages/engine/evals/fixtures/stage4-status.json`, `packages/engine/evals/pipeline.eval.ts`, `packages/engine/evals/stage3-generate.eval.ts`, `packages/engine/evals/stage5a-grounding.eval.ts`, `docs/ai/live-output-it-security-after-grounding.txt`, `docs/ai/handoff.md`
- Root cause: Stage 1 preserved source items, but Stage 3 still summarized/replaced list-heavy sections. Non-empty explanation schema forced filler into grounded core. Real-topic examples and denylisted prompt vocabulary contaminated output.
- Fix: cleaned repeated-heading suffixes from detected items; allowed empty sourceCore.explanation; passed/enforced cleaned detected items in Stage 3; aligned Stage 3 span offsets with Stage 1 duplicate-block handling; replaced real-topic examples with fake-domain examples; removed prompt/denylist collisions.
- Verification: typecheck PASS; build PASS; eval PASS (213/213); eval:stage5a PASS (16/16); live OpenAI strict schema accepted the required string with empty string allowed.
- Live result: complete run=yes; phase1FabricationFails=0; formerly zero-list sections=Types of Cybersecurity Threats 7/7, Types of Malware 10/10, Symptoms of Malware 11/11, Methods of Infiltration 19/19, Methods to Deny Service 12/12, Blended Attacks 5/5, Impact Reduction 7/7; Domains of IT Security remained 11/11.
- Next: Phase 2 only after this N is known and list extraction is clean. Phase 2 should add entailment judging only for remaining lexical false positives, not for omissions or prompt contamination. This IT Security fixture now has N=0, so validate broader fixtures before adding judge cost.
- Risks: OpenAI strict schema compatibility for empty explanation is live-verified; UI/assembly has no direct explanation renderer and treats the required empty string safely while keyPoints/enrichment remain available.

### 2026-06-21 Stage 5a grounding fix — Phase 1.3
- Changed: added a shared default-visible text extractor; Stage 5 now validates title, sourceCore.explanation, and every sourceCore.keyPoint; Stage 3 normalizes title to the planned heading and enrichment to null; Stage 6 strips enrichment again during assembly.
- Policy: IT Security sourceCore grounding remains closed. Default reviewer output is source-faithful, and outside knowledge is not part of the default assembled reviewer output.
- Regression coverage: unsupported malware definitions, attack consequences, and invented example scenarios in enrichment are excluded; unsupported visible titles fail with field-specific diagnostics; existing list-adherence regressions remain passing.
- Verification: engine typecheck PASS; build PASS; eval PASS (219/219); Stage 5a PASS (16/16); student-visible faithfulness PASS (6/6).
- Live validation: not rerun in this phase; no live OpenAI calls were made.

### 2026-06-21 Phase 1.4 live visible-grounding validation
- Live output: `docs/ai/live-output-it-security-after-visible-grounding.txt`
- Audit: `docs/ai/live-output-it-security-after-visible-grounding-audit.md`
- Result: coverage 18/18; grounding 1.00; grounding issues 0; phase-1 fabrication failures 0; leakage issues 0.
- Default-visible verdict: all 18 assembled cards have `enrichment: null`; no unsupported visible outside knowledge was found.
- Readability: 17 list-heavy sections use empty explanations with complete source key points; no section is empty.
- Verification: engine typecheck PASS; build PASS; eval PASS (219/219).

### 2026-06-22 Phase 1.4 live visible-grounding revalidation
- Live output: `docs/ai/live-output-it-security-after-visible-grounding-20260622-053615.txt`
- Result: coverage 18/18; grounding 1.00; grounding issues 0; phase-1 fabrication failures 0; leakage issues 0.
- Default-visible verdict: all 18 assembled cards have `enrichment: null`; no unsupported visible outside knowledge was found.
- Readability: the source-backed `Blended Attacks` title remains restored; 17 list-heavy sections use empty explanations with 3-19 source key points, and no section is empty.
- Verification: engine typecheck PASS; build PASS; eval PASS (219/219).

### 2026-06-23 05:25 +08:00 Phase 1.5 cross-fixture live visible-grounding validation
- Fixtures: Digital Components (`live-digital-components`) and Arnis M1 (`live-arnis-m1`).
- Live outputs: `docs/ai/live-output-digital-components-after-visible-grounding-20260623-052054.txt` and `docs/ai/live-output-arnis-after-visible-grounding-20260623-052149.txt`.
- Digital Components automated result: coverage 18/18, score 1.00; grounding 1.00; grounding issues 0; phase-1 fabrication failures 0; leakage issues 0; all 18 enrichment values null.
- Digital Components manual verdict: FAIL. The source phrase `3.3V on 3.3 board` became separate default-visible key points `3V on` and `3 board)`, changing the technical meaning despite the passing grounding report. Repeated duplicate-heading sections are also weak as a study outline.
- Arnis M1 result: coverage 8/8, score 1.00; grounding 1.00; grounding issues 0; phase-1 fabrication failures 0; leakage issues 0; all 8 enrichment values null; no unsupported default-visible outside knowledge found.
- Arnis M1 readability: no section is empty; seven explanations are empty and the heading card is title-only, while source key points preserve the history, techniques, equipment, rules, and Filipino martial-arts context. The evolvement section is dense but source-faithful.
- Verification: engine typecheck PASS; build PASS; eval PASS (219/219).
- Remaining issue: add a regression for decimal-bearing source text so sentence/item extraction does not split `3.3V` into misleading standalone visible fragments. No engine, prompt, schema, mobile, auth, or provider changes were made in this validation task.

### 2026-06-23 Phase 1.6 generalized source-token fidelity
- Digital Components live validation exposed a deterministic list-marker bug: decimal fragments inside `3.3V on 3.3 board` were interpreted as numbered-item boundaries and then copied into visible key points by the Stage 3 source-item guard.
- Fixed source-item extraction so explicit bullet lists do not reinterpret numeric punctuation inside their items, ordered markers require following whitespace, and leading token punctuation such as `.env.local` is preserved.
- Added shared source-token fidelity validation for numeric identity, measurements, math, chemistry, laws/dates, networking/software tokens, code, ranges/ratios/dimensions, abbreviations, table rows, numbered headings, and OCR-looking source text.
- Stage 5 now rejects punctuation-stripped, symbol-stripped, or number-mutated visible variants with field-specific grounding failures instead of accepting content-word substring matches.
- The fix is deterministic extraction and grounding logic across subject domains. Stage 3 prompts, OpenAI schemas, provider behavior, mobile, auth, API, database, and shared packages were unchanged.
- Added 23 cross-domain fidelity evals, including the Digital Components live fixture regression.
- Verification: engine typecheck PASS; build PASS; targeted Stage 0/1/3/5a/pipeline/fidelity suites PASS; aggregate eval PASS (242/242). No live OpenAI calls were made.

### 2026-06-23 06:55 +08:00 Phase 1.7 Digital Components live token-fidelity validation
- Fixture: Digital Components (`digital-components`; source ID `live-digital-components`).
- Live output: `docs/ai/live-output-digital-components-after-token-fidelity-20260623-065246.txt`.
- Result: coverage 18/18, score 1.00; grounding 1.00; grounding issues 0; phase-1 fabrication failures 0; leakage issues 0.
- Token-fidelity verdict: PASS. The default-visible key point preserves `3.3V on 3.3 board` intact; no standalone `3V on`, `3 board`, or `3 board)` key point is present.
- Default-visible verdict: all 18 enrichment values are null; no unsupported visible text was found.
- Readability: all 18 sections are non-empty and the 76 source-backed key points remain useful as a compact outline. Explanations remain limited: 9 are empty and 9 are heading-like placeholders.
- Verification: engine typecheck PASS; build PASS; aggregate eval PASS (242/242); source-token fidelity eval PASS (23/23).
- Remaining issue: explanation quality and repeated generic `Digital Software Coding` sections remain weak, but no Phase 1.7 coverage, grounding, leakage, enrichment, or token-fidelity failure remains.

### 2026-06-23 08:18 +08:00 Phase 1.8 final three-fixture live validation sweep
- Fixtures: IT Security (`it-security`; source ID `live-it-security`), Digital Components (`digital-components`; source ID `live-digital-components`), and Arnis M1 (`arnis-m1`; source ID `live-arnis-m1`).
- Live outputs: `docs/ai/live-output-it-security-final-sweep-20260623-081451.txt`, `docs/ai/live-output-digital-components-final-sweep-20260623-081534.txt`, and `docs/ai/live-output-arnis-final-sweep-20260623-081615.txt`.
- IT Security: coverage 18/18, score 1.00; grounding 1.00 with 0 issues and 0 phase-1 fabrication failures; leakage issues 0; all 18 enrichment values null. Risky list sections remain source-faithful, the title is `Blended Attacks`, and no unsupported malware definitions, attack consequences, DoS flood examples, or fabricated blended-attack scenario appeared.
- Digital Components: coverage 18/18, score 1.00; grounding 1.00 with 0 issues and 0 phase-1 fabrication failures; leakage issues 0; all 18 enrichment values null. `3.3V on 3.3 board`, `pinMode`, `digitalWrite`, `digitalRead`, HIGH/LOW, INPUT/OUTPUT, ADC/PWM, hardware component names, and the reference URL remain intact; no standalone corrupted decimal fragments or electronics explanation creep appeared.
- Arnis M1: coverage 8/8, score 1.00; grounding 1.00 with 0 issues and 0 phase-1 fabrication failures; leakage issues 0; all 8 enrichment values null. `R.A. 9850`, `December 11, 2009`, historical/evolvement content, `3 MAIN GROUPS`, courtesy/salutation, strike names, and padded-stick sport content remain intact; no unsupported origin, safety, or martial-arts additions appeared.
- Default-visible/token-fidelity verdict: PASS for all three fixtures. Every visible sourceCore string was found in its fixture source, no section was empty, and no unsupported outside knowledge was found.
- Readability: the reviewers remain usable as compact source-faithful outlines. IT Security has 17 empty explanations; Digital Components has 9 empty and 9 heading-like explanations; Arnis has 7 empty explanations and one heading-like explanation. Digital Components retains generic repeated coding sections, and the source-derived Arnis evolvement item remains dense.
- Verification: engine typecheck PASS; build PASS; aggregate eval PASS (242/242); source-token fidelity eval PASS (23/23).
- Remaining issues: presentation quality only; no Phase 1.8 coverage, grounding, leakage, enrichment, unsupported-text, or token-fidelity failure remains.

### 2026-06-24 01:57 +08:00 Phase 1.4 live OpenAI validation
- Fixture: IT Security (`it-security`; source ID `live-it-security`).
- Live output: `docs/ai/live-output-phase14.txt`; JSON artifact: `docs/ai/live-output-phase14.json`.
- Coverage result: PASS, 18/18 sections covered, score 1.00, 0 weak sections, 0 failed sections.
- Grounding result: PASS, score 1.00, grounding issues 0, phase-1 fabrication failures 0.
- Leakage result: PASS, leakage issues 0, failed leakage sections 0.
- Enrichment verdict: PASS. All 18 assembled section items have `enrichment: null`; `enrichment` appears only as an internal JSON field key, not as visible content.
- Visible-content verdict: PASS. No unsupported visible outside knowledge found; `Blended Attacks` is unchanged from the previous IT Security final sweep and remains source-faithful. Explanations remain presentation-weak after enrichment removal: 17 of 18 are empty, but source-backed key points are present.
- Verification: engine typecheck PASS; build PASS; aggregate eval PASS (242/242). Mobile typecheck was intentionally not run.
