# Current State

Last refreshed: 2026-07-04, Asia/Manila.

## Repository Baseline

- Branch: `main`
- Local baseline before Phase 3B: `6e91231 feat(ocr): add provider-agnostic OCR API boundary`
- Upstream status at refresh: `main...origin/main`, with no reported ahead or behind count
- Working tree before Phase 3A edits: clean

## Working Vertical Slice

The current product slice is:

```text
Sign in
-> paste source text, import a gallery image, or take a camera photo
-> review and edit source text
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

Phase 3A also adds a protected server OCR route:

```text
Bearer-authenticated multipart image upload
-> MIME and size validation
-> provider-agnostic OCR interface
-> server-only Google Cloud Vision adapter
-> normalized pages, blocks, and lines
-> safe JSON response
```

Phase 3B adds the mobile client gallery call path, and Phase 3C extends the
same path to camera capture: selected or captured PNG/JPEG images can be
previewed, uploaded to `POST /api/ocr/extract`, and converted into editable
source text. The reviewer engine receives only the final edited text through
the existing reviewer route. Live iPhone Expo Go validation has passed against
the local Next.js API over LAN with server-only Google Cloud Vision OCR.

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
- Provider-agnostic OCR contracts and deterministic normalization in
  `@stay-focused/ocr`.
- API-only Google Cloud Vision OCR adapter with injected fake-client tests.
- Protected `POST /api/ocr/extract` route for PNG/JPEG multipart image uploads.
- Expo gallery image selection and camera capture with preview, explicit text
  extraction, editable OCR text review, retry, and clear-image handling.
- Manual pasted text remains available as a separate source mode.

## Current Verification Baselines

Verified in this documentation refresh:

- OCR package normalization tests: 10 passed, 0 failed
- Google OCR fake-client tests: 10 passed, 0 failed
- OCR API route tests: 14 passed, 0 failed
- Reviewer smoke-runner tests: 51 passed, 0 failed
- API route and adapter tests: 43 passed, 0 failed
- Engine build: passed
- Engine evaluations: 266 passed, 0 failed
- API typecheck: passed
- Mobile typecheck: passed
- Mobile OCR client and source-flow tests: 37 passed, 0 failed
- Deterministic OCR web smoke: passed with mocked OCR response and real
  reviewer generation
- Phase 3C live iPhone camera/image OCR validation: passed with local Expo Go
  -> Next.js API over LAN -> server-only Google Cloud Vision -> editable OCR
  text review -> reviewer generation. Reviewer Ready appeared, source-faithful,
  coverage, and clean-output validation passed, and the generated reviewer
  contained at least one section and key point. See
  `docs/ai/phase3c-camera-ocr-validation-20260704.md`.

Latest recorded unattended smoke during Phase 3A verification:

- `npm run smoke:reviewer:web`: passed
- Local HEAD before Phase 3A commit: `00d3e8f`
- Authentication: persisted session
- Reviewer POST: HTTP 200
- Source-faithful, coverage, and clean-output statuses: passed

## Known Local Test Command

```sh
npm run smoke:reviewer:web
npm run smoke:ocr:web
```

The smoke runner starts or reuses the API and Expo Web, authenticates or restores
a persisted session, submits the fictional study-habits fixture, verifies
reviewer output and validation statuses, and cleans up runner-owned services.
The OCR web smoke uses the same auth/session infrastructure, injects a
non-production fictional image fixture, mocks only the OCR response, verifies
editable extracted text, and then generates a reviewer through the real reviewer
route. It does not validate live Google OCR.

## Current Limitations

- Gallery import and camera capture support PNG/JPEG images and editable
  extracted-text review.
- Google OCR credential paths are machine-specific local configuration and
  must remain server-only.
- Scanned-PDF OCR is not implemented.
- Reviewer persistence and the Study Library are not implemented.
- Canvas LMS integration is not implemented beyond the package boundary.
- Task generation and study schedule generation are not implemented.
- Google and Microsoft OAuth helper functions exist, but completed mobile OAuth
  redirect flows are not validated as finished product features.
- Production deployment and iPhone production readiness are pending.

## Immediate Next Task

Phase 3D: scanned PDF ingestion.

## Known Risks

- OneDrive-backed generated Next output can create stale reparse-point artifacts;
  the smoke runner clears the generated `apps/api/.next/server` directory before
  runner-owned API startup.
- OpenAI cost, rate limits, and serverless latency can affect reviewer
  generation.
- OCR layout preservation is critical because reviewer quality depends on line,
  heading, and list boundaries.
- The server OCR contract is proven with fake clients, the Expo Web OCR flow is
  proven with a mocked OCR response, and live iPhone Google OCR has passed on a
  correctly configured local API. Future live OCR remains dependent on
  machine-specific server credential setup, LAN reachability, and device state.
- Scanned-PDF support is more complex than single-image OCR and should build on
  the completed image OCR path.
- Mobile OAuth redirect completion still needs validation before it is claimed
  as complete.
- Secrets must remain server-only; mobile env files may contain only public
  `EXPO_PUBLIC_` values.
- Captured images, screenshots, credential files, OCR test artifacts, tokens,
  and private document OCR output must stay out of committed files.

## Documentation Ownership

- Canonical current-state document: `docs/current-state.md`
- Canonical roadmap document: `docs/roadmap.md`
- Canonical current-sprint document: `docs/ai/current_sprint.md`
- AI handoff: `docs/ai/handoff.md`
