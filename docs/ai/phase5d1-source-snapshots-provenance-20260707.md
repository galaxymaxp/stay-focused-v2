# Phase 5D.1 - Immutable Source Snapshots And Exact Reviewer Provenance

Date: 2026-07-07.

Phase 5D.1 adds the server-authoritative provenance foundation for Canvas
reviewer generation. It does not complete all Phase 5D selective-import work.

## Security Status

The previous Phase 5C.2B run reported that local credential values were printed
in tool output. The affected credential names requiring rotation are:

- `SUPABASE_SERVICE_ROLE_KEY`
- `OPENAI_API_KEY`
- Google OCR credential material from `GOOGLE_CLOUD_CREDENTIALS_JSON` or the
  file referenced by `GOOGLE_APPLICATION_CREDENTIALS`
- `CANVAS_PERSONAL_ACCESS_TOKEN`
- `CANVAS_TOKEN_ENCRYPTION_KEY`

SECURITY ACTION REQUIRED - previously printed local credentials must be rotated.

Local implementation, automated tests, and remote migration verification were
completed without printing credential values. Protected live validation was not
run because it would reuse app-level credentials whose rotation has not been
confirmed.

## Implemented Boundary

Canvas source preview now persists a short-lived private preview session after
the existing preview validation and assembly steps pass. The mobile response
adds only an opaque `previewSessionId`; it does not include the private
manifest, hashes, Canvas identities, Storage paths, or parser/OCR metadata.

Reviewer generation may submit `canvasPreviewSessionId` with the final edited
`sourceText` and `sourceTitle`. The route validates ownership and expiry, runs
the existing reviewer engine with only the edited text/title, and creates or
reuses an immutable source snapshot only after generation succeeds.

Study Library save for Canvas reviewers now requires an owned
`sourceSnapshotId` whose character count and metadata match the generated
reviewer. Non-Canvas saves remain compatible and historical reviewers are not
backfilled.

Saved reviewer detail can include a safe provenance summary: source count,
source mode, title, edit state, created time, source-type counts, and parser/OCR
version categories. It does not return raw source text, original preview text,
hashes, private Canvas ids, Storage fields, URLs, or credentials.

## Database

Migrations:

- `202607070001_add_reviewer_source_provenance.sql`
- `202607070002_harden_reviewer_source_provenance_functions.sql`
- `202607070003_enforce_snapshot_item_context.sql`

New private provenance tables:

- `canvas_source_preview_sessions`
- `reviewer_source_snapshots`
- `reviewer_source_snapshot_items`

The migration adds nullable `reviewers.source_snapshot_id` with a composite
same-owner foreign key to immutable source snapshots. Snapshot items also have
a composite context foreign key tying their copied connection and course values
to the parent snapshot. New private tables have RLS enabled, direct `anon` and
`authenticated` grants revoked, and service-role access only. Preview sessions
are short-lived and cleanup is provided as a service helper/RPC, not as a cron
or background job.

Immutable trigger coverage rejects updates to preview sessions, snapshots, and
snapshot items. Reviewer deletion and Canvas disconnect do not delete historical
source snapshots.

## Version Identifiers

Code-defined version constants are recorded server-side:

- `canvas-source-preview-v1`
- `canvas-html-visible-text-v1`
- `canvas-stored-file-extraction-v1`
- `canvas-stored-image-ocr-v1`
- `canvas-stored-pdf-ocr-v1`

These identifiers are fixed strings and do not derive from runtime package
versions, provider deployment names, credentials, or environment data.

## Verification

Automated verification passed:

- DB typecheck: passed.
- Canvas typecheck/build/tests: 52/52.
- OCR typecheck/build/tests: 14/14.
- API typecheck/build/tests: 284/284.
- Mobile typecheck/tests: 93/93.
- Engine typecheck/build/evals: 266/266.
- Root Turbo typecheck: 7/7 tasks, 4 cached and 3 fresh.
- Root Turbo build: 7/7 tasks, 4 cached and 3 fresh.
- Workspace tests: API 284/284, mobile 93/93, Canvas 52/52, OCR 14/14.

Remote database verification passed:

- Dry-run applied only `202607070001`, then only `202607070002`, then only
  `202607070003`.
- Migration history includes `202607070001`, `202607070002`, and
  `202607070003`.
- `scripts/phase5d1-source-provenance-verification.sql` passed against the
  linked remote database using rollback-only fictional data.
- Supabase security advisors showed no new Phase 5D.1 findings after the
  function search-path hardening migration. Remaining warnings are historical.
- Supabase performance advisors showed only historical reviewer RLS init-plan
  warnings.
- The Supabase CLI emitted the known non-fatal Docker catalog-cache warning
  after migration push.

Protected live validation:

- Not run.
- Blocked pending confirmed rotation of the previously exposed app-level
  credentials.

## Defects Found

- The initial SQL verifier used a fixed timestamp and its fixture preview
  session expired during the run. The verifier now uses `now()` inside the
  transaction.
- Supabase advisors flagged missing fixed `search_path` settings on new
  provenance trigger functions. A forward-only hardening migration sets
  `search_path = public, pg_temp`.
- Review found that snapshot item rows should have database-enforced connection
  and course context matching the parent snapshot. A forward-only hardening
  migration adds the composite context foreign key and verifier coverage.

## Remaining Phase 5D Work

- Structured normalized blocks.
- Block-level selective import.
- Module-order reconstruction.
- Table and bullet hierarchy model.
- Slide numbers.
- Deduplication.
- Repeated-source relationships.
- Stale-source comparison.
- Deleted-source handling.
- Unsupported-source reporting expansion.
- Broader file parsers.
