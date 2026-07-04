# Current State

Last refreshed: 2026-07-04, Asia/Manila.

## Repository Baseline

- Branch: `main`
- Local baseline commit: `ebb79d8 fix(mobile): make reviewer web smoke fully unattended`
- Upstream status at refresh: `main...origin/main`, with no reported ahead or behind count
- Working tree before documentation edits: clean

## Working Vertical Slice

The current product slice is:

```text
Sign in
-> paste source text
-> authenticated reviewer API
-> OpenAI generation
-> coverage, grounding, and leakage validation
-> reviewer preview
```

The Expo app supports email/password Supabase sign-in, restores sessions, and
sends the session bearer token to `POST /api/reviewer/generate`. The Next.js API
route verifies that token with Supabase, validates the pasted-text request,
creates the server-only OpenAI provider, runs the Stage 0 through Stage 6 engine
pipeline, and returns a reviewer preview payload. Expo Web is the fast
laptop-browser regression surface for this mobile flow.

## Completed Capabilities

- Monorepo foundation with API, mobile, engine, DB, Canvas, and shared packages.
- Provider-agnostic reviewer engine covering normalization, outline detection,
  planning, generation, coverage verification, grounding validation, bounded
  retry, leakage protection, and deterministic assembly.
- Default visible reviewer content is source-faithful; unsupported enrichment is
  excluded from default assembly.
- Extractive fallback for short OCR-style prose inside the engine.
- API-layer OpenAI provider boundary and server-only provider factory.
- Protected reviewer API route using Supabase bearer authentication.
- Local Expo Web CORS handling for `POST /api/reviewer/generate`.
- Expo reviewer generation screen and preview screen.
- Supabase email/password sign-in and session restore.
- Automated reviewer web smoke runner with persisted browser session, output
  assertions, safe service startup, and runner-owned cleanup.

## Current Verification Baselines

Verified in this documentation refresh:

- Reviewer smoke-runner tests: 51 passed, 0 failed
- Reviewer API route tests: 19 passed, 0 failed
- Engine build: passed
- Engine evaluations: 266 passed, 0 failed
- API typecheck: passed
- Mobile typecheck: passed

Latest recorded credential-backed smoke at baseline `ebb79d8`:

- `npm run smoke:reviewer:web`: passed
- Immediate repeat smoke: passed
- Session-only smoke: passed
- Reviewer POST: HTTP 200
- Source-faithful, coverage, and clean-output statuses: passed

## Known Local Test Command

```sh
npm run smoke:reviewer:web
```

The smoke runner starts or reuses the API and Expo Web, authenticates or restores
a persisted session, submits the fictional study-habits fixture, verifies
reviewer output and validation statuses, and cleans up runner-owned services.

## Current Limitations

- User-facing source input is still primarily pasted text.
- Real image OCR is not implemented.
- Scanned-PDF OCR is not implemented.
- Reviewer persistence and the Study Library are not implemented.
- Canvas LMS integration is not implemented beyond the package boundary.
- Task generation and study schedule generation are not implemented.
- Google and Microsoft OAuth helper functions exist, but completed mobile OAuth
  redirect flows are not validated as finished product features.
- Production deployment and iPhone production readiness are pending.

## Immediate Next Task

Phase 3A: audit the existing source contracts and implement a provider-agnostic
Google Cloud OCR API boundary with fake-client tests. Prove the server OCR
contract before building mobile camera or gallery UI.

## Known Risks

- OneDrive-backed generated Next output can create stale reparse-point artifacts;
  the smoke runner currently clears only `apps/api/.next/server/app` before
  runner-owned API startup.
- OpenAI cost, rate limits, and serverless latency can affect reviewer
  generation.
- OCR layout preservation is critical because reviewer quality depends on line,
  heading, and list boundaries.
- Scanned-PDF support is more complex than single-image OCR and should wait
  until image OCR is stable.
- Mobile OAuth redirect completion still needs validation before it is claimed
  as complete.
- Secrets must remain server-only; mobile env files may contain only public
  `EXPO_PUBLIC_` values.

## Documentation Ownership

- Canonical current-state document: `docs/current-state.md`
- Canonical roadmap document: `docs/roadmap.md`
- Canonical current-sprint document: `docs/ai/current_sprint.md`
- AI handoff: `docs/ai/handoff.md`
