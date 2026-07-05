# Phase 5A Canvas Foundation - 2026-07-05

## Starting Commit

- Branch: `main`
- Starting commit: `a60e599 fix(library): complete live RLS validation`
- Dirty files before work: `apps/api/next-env.d.ts`,
  `apps/mobile/expo-env.d.ts`, and untracked `apps/mobile/.gitignore`

## Roadmap Changes

- Replaced broad Phase 5 Canvas Integration wording with Phase 5A through
  Phase 5F.
- Added Future Phase - Grade Goal Planner with confidence states.
- Added Future Phase - Student Intelligence Features.
- Preserved Phase 5A as secure connection and capability discovery only.

## ADRs Created

- `docs/architecture/ADR-006-canvas-academic-graph.md`
- `docs/architecture/ADR-007-capability-based-canvas-integration.md`
- `docs/architecture/ADR-008-canvas-credential-storage.md`
- `docs/architecture/ADR-009-grade-data-separation.md`

## Capability Matrix

- File: `docs/canvas/canvas-source-capability-matrix.md`
- Groups: connection, course, learning structure, activities, files and media,
  grades and performance, communication and activity.
- Permission-dependent capabilities include modules, files, grades, quizzes,
  captions, conversations, history, external tools, and outcomes.
- External limitations: Google Drive and Microsoft files may require separate
  integrations, external tools may expose only launch links, and successful
  course access does not prove support for other endpoints.

## Migration

- File: `packages/db/migrations/202607050002_create_canvas_connections.sql`
- Tables: `canvas_connections` and `canvas_capabilities`
- RLS: enabled on both tables.
- Direct grants: revoked from `anon` and `authenticated` so encrypted Canvas
  credential fields remain server-only.
- Remote application: applied during Phase 5A.1 using `npx supabase` and the
  ignored local Supabase CLI project. Remote migration history now includes
  `202607050002`, and read-only verification passed for table presence, RLS,
  encrypted columns, and no direct `anon`/`authenticated` access to encrypted
  credential fields.

## Encryption Design

- API environment variable: `CANVAS_TOKEN_ENCRYPTION_KEY`
- Required key length: decoded key must be exactly 32 bytes.
- Algorithm: AES-256-GCM through Node `crypto`.
- Token storage fields: ciphertext, IV, authentication tag, and encryption
  version.
- Decryption fails closed for corrupted ciphertext, corrupted authentication
  tag, unsupported version, and invalid key.

## API Routes

- `GET /api/canvas/connection`
- `PUT /api/canvas/connection`
- `DELETE /api/canvas/connection`
- `GET /api/canvas/courses`
- `GET /api/canvas/capabilities`

All routes use Supabase bearer JWT auth and safe JSON responses. Encrypted
credential columns are not returned.

## Mobile States

- Disconnected: Canvas URL field, secure personal access token field,
  permission-dependent access statement, and Connect Canvas action.
- Connected: Canvas user name, Canvas host, last verified timestamp, courses,
  refresh action, disconnect action, and compact capability summary.
- Token handling: token is not persisted separately and is cleared from
  component state after connect attempts.

## Automated Verification

- `npm run typecheck --workspace @stay-focused/canvas`: passed
- `npm run build --workspace @stay-focused/canvas`: passed
- `npm run test --workspace @stay-focused/canvas`: passed; 20/20
- `npm run typecheck --workspace @stay-focused/db`: passed
- `npm run typecheck --workspace apps/api`: passed
- `npm run test --workspace apps/api`: passed; 110/110
- `npm run typecheck --workspace apps/mobile`: passed
- `npm run test --workspace apps/mobile`: passed; 70/70
- `npm run typecheck`: passed after broad build regenerated Next `.next/types`
- `npm run build`: passed
- `npm run test --workspaces --if-present`: passed; API 110/110, mobile 70/70,
  Canvas 20/20, OCR 14/14
- `git diff --check`: passed with CRLF warnings only
- Targeted secret scan: no real Canvas tokens, encryption keys, Supabase
  service-role keys, OpenAI keys, or Google credential values found in changed
  files

Phase 5A.1 verification:

- `node --test scripts/phase5a-live-canvas-validation.test.mjs`: passed; 5/5
- Direct live Canvas validation script: passed with sanitized output only
- Supabase migration dry-run: passed; only
  `202607050002_create_canvas_connections.sql` was pending
- Supabase migration push: passed; remote migration history includes
  `202607050001` and `202607050002`
- Remote schema checks: passed; 13/13 checks for Canvas tables, RLS, encrypted
  columns, and direct grant restrictions
- Required package and workspace verification commands: passed after Phase 5A.1
  changes

## Live Canvas Result

- Live Canvas validation: passed during Phase 5A.1 through the server-side
  `scripts/phase5a-live-canvas-validation.mjs` harness.
- Existing ignored local credential names detected: `CANVAS_BASE_URL` and
  `CANVAS_PERSONAL_ACCESS_TOKEN`.
- Requested aliases missing: `CANVAS_ACCESS_TOKEN`,
  `CANVAS_LIVE_BASE_URL`, and `CANVAS_LIVE_PERSONAL_ACCESS_TOKEN`.
- Profile: PASS; Canvas ID normalized to a string and only a sanitized hash was
  recorded.
- Courses: PASS; 17 courses returned, with no private course names committed.
- Pagination: not exercised live because the course count did not require a
  second page; automated Canvas tests cover pagination and cross-origin
  rejection.
- Capability probes: enrollments, modules, assignment groups, and planner all
  returned `available`.
- Token safety: PASS; only sanitized summaries and safe error codes were
  printed or committed.

## Protected API Result

- Protected Canvas API flow: pending.
- Blocker: `CANVAS_TOKEN_ENCRYPTION_KEY` is missing from the local API
  environment. It must decode to exactly 32 bytes before live Canvas connection
  persistence can be validated.
- Do not create a permanent fallback key silently, and do not use a temporary
  test key for live database persistence.

## Known Permission-Dependent Capabilities

- Modules, module items, Pages, files, assignments, submissions, grades,
  grading periods, rubrics, outcomes, quizzes, planner, calendar, captions,
  conversations, history, and external tools.

## Next Phase 5B Task

After protected Phase 5A API validation is complete, Phase 5B is academic graph
synchronization for modules, Pages, activities, dates, assignment groups,
announcements, discussions, and quiz metadata.
