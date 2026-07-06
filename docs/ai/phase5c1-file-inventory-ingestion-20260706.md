# Phase 5C.1 - Canvas File Inventory And Bounded Ingestion Foundation

Date: 2026-07-06, Asia/Manila.

## Summary

Phase 5C.1 is a backend-only Canvas file foundation. It inventories Canvas file
metadata during the protected Canvas sync, discovers bounded references from
module items and HTML bodies, and stores selected eligible files through a
separate protected ingestion route.

It does not parse, OCR, transcribe, summarize, preview, or generate reviewers
from Canvas file contents.

Implemented flow:

```text
POST /api/canvas/sync
-> Canvas course file metadata inventory
-> module/page/assignment/announcement file-reference discovery
-> service-role-only metadata persistence

POST /api/canvas/files/ingest
-> authenticated Stay Focused user
-> owned Canvas file row ids
-> fresh Canvas file metadata lookup
-> bounded authorized download for eligible files only
-> content signature validation
-> private Supabase Storage object write
-> sanitized per-file terminal result
```

## Security Boundaries

- Canvas personal access tokens remain API-only and encrypted at rest.
- Canvas file downloads are performed server-side only.
- The Canvas bearer token is sent only to the connected Canvas origin. It is
  stripped before accepted off-origin HTTPS file redirects.
- File redirect targets reject userinfo, unsupported schemes, HTTP off-origin
  redirects, localhost, loopback, private/link-local IPv4, private/link-local
  IPv6, redirect loops, excessive redirects, and hostnames that resolve to
  rejected private addresses in the API runtime.
- Per-file download size is capped at the existing OCR PDF ceiling, 10 MiB.
- One ingestion request is capped at 3 files and 15 MiB aggregate stored bytes.
- Missing or understated `Content-Length` is still bounded by streaming reads.
- Only PDF, PNG, JPEG, plain text, and Markdown enter binary storage in this
  phase. Media, unsupported formats, locked/unavailable files, dangerous MIME
  types, dangerous extensions, and archive/container formats are metadata-only
  or blocked.
- Downloaded content must match basic file signatures or text-safety checks
  before storage.
- Stored objects live in the private `canvas-source-files` bucket.
- `anon` and `authenticated` roles are denied direct access to
  `canvas-source-files` storage objects through restrictive policies.
- API responses do not include Canvas filenames, download URLs, storage object
  keys, hashes, raw Canvas errors, tokens, or file bytes.

## Database And API Changes

- Added migration
  `202607060003_add_canvas_file_ingestion_foundation.sql`.
- Added follow-up migration
  `202607060004_add_canvas_file_ingestion_fk_indexes.sql` after Supabase
  performance advisors identified new Phase 5C.1 foreign-key index warnings.
- Added `canvas_files`, `canvas_file_references`, and
  `canvas_file_ingestion_results`.
- Added service-role-only RPCs:
  - `replace_canvas_course_files_inventory`
  - `record_canvas_file_ingestion_result`
- Extended `canvas_sync_runs.resource_counts` with `files` and
  `fileReferences`.
- Extended `@stay-focused/canvas` with file metadata methods and bounded binary
  download support.
- Extended `POST /api/canvas/sync` to inventory file metadata after successful
  course graph and announcement fetches.
- Added `POST /api/canvas/files/ingest` for selected owned file-row ids.
- Extended mobile sync response parsing for aggregate file counts without
  adding UI.

## Remote Validation

Remote Supabase migration, schema, advisor, RPC, grant, and Storage validation
completed on 2026-07-06 through the existing ignored linked Supabase workflow.

- Remote migration history includes `202607060003` and `202607060004`.
- File tables, columns, indexes, uniqueness constraints, foreign keys, RLS,
  service-role access, RPC search paths, and direct grant restrictions passed
  the focused verification harness.
- The private `canvas-source-files` bucket exists and remains non-public.
- Anonymous object read/upload, public URL access, authenticated arbitrary
  upload, and authenticated cross-user object access were denied.
- Trusted server upload/download with a rollback-safe temporary object passed.
- Direct Data API client mutation was denied for `anon` and `authenticated`.
- Service-role RPC calls with mismatched random owner inputs were rejected.
- Earlier Canvas protections remained present.
- Supabase security advisors produced no unresolved new Phase 5C.1 security
  findings.
- Supabase performance advisors found new Phase 5C.1 foreign-key index
  warnings; migration `202607060004` fixed them. Remaining advisor items are
  pre-existing historical findings or fresh unused-index noise immediately
  after migration application.

## Protected Live Metadata Results

The protected live sync was run against a local production build
(`next start`) with the existing stored encrypted Canvas connection.

Runtime status:

- Route: `POST /api/canvas/sync`
- Configured `maxDuration`: 60 seconds
- Other runtime override: none found in `vercel.json` or `apps/api/next.config`
- Measurement environment: local production build
- First live duration: 72.294 seconds
- Second live duration: 65.355 seconds
- Duration within configured budget: no
- Dominant runtime stage: existing academic graph and Page/announcement work;
  file inventory is metadata-only and uses bounded course concurrency.
- Runtime change made in this phase: no duration increase; the deployment
  target and plan support were not verified.
- Production-runtime verdict: locally functional and data-safe, but not
  production-runtime safe while the synchronous route exceeds its configured
  budget.

First live sync:

- HTTP 200, status `partial`
- Courses discovered: 17
- Academic graph courses succeeded: 13
- Academic graph courses failed: 4
- File inventory courses succeeded: 6
- File inventory courses failed: 7
- Files discovered: 52
- Files inserted: 52
- Files updated: 0
- Files unchanged: 0
- Files deactivated: 0
- File references: 15
- Module file references: 13
- HTML file references: 2
- Metadata-only files: 21
- Blocked files: 2
- Retry attempts: 0
- Sanitized failures: `canvas_course_pages_failed`,
  `canvas_announcement_persistence_failed`, and `canvas_course_files_failed`
- Running sync rows after completion: 0

Second live sync:

- HTTP 200, status `partial`
- Duration: 65.355 seconds
- Files discovered: 52
- Files inserted: 0
- Files updated: 0
- Files unchanged: 52
- File references: 15
- File references inserted/deleted: 0/0
- Duplicate Canvas file identities: 0
- Duplicate references: 0
- Existing stored object pointers preserved: yes
- Failed course data preserved: yes
- Existing graph behavior unchanged: yes
- Running sync rows after completion: 0

## Protected Ingestion Results

Candidate aggregate categories after metadata sync:

- Eligible PDFs: 4
- Eligible images: 25
- Eligible text/Markdown: 0
- Metadata-only media: 14
- Metadata-only unsupported: 7
- Blocked for size: 2
- Blocked for lock/visibility/security: 0
- Invalid metadata: 0

First protected ingestion selected one eligible document, one eligible image,
and one metadata-only/unsupported item by internal row id inside the harness.
No ids, filenames, URLs, object keys, hashes, or private content were printed
or committed.

- HTTP 200
- Requested: 3
- Succeeded/stored: 2
- Unchanged: 0
- Metadata-only: 1
- Blocked/failed/unavailable: 0
- Aggregate bytes stored: 92,950
- SHA-256 recorded for stored items: 2
- Private stored objects verified: 2
- Public access denied for stored objects: 2
- Metadata-only item created no Storage object.
- OCR/extraction invoked: no
- Sanitized result counts: `stored: 2`, `metadata_only_unsupported: 1`

Second protected ingestion submitted the same logical stored rows and
metadata-only candidate:

- HTTP 200
- Requested: 3
- Succeeded/stored: 0
- Unchanged: 2
- Metadata-only: 1
- Blocked/failed/unavailable: 0
- Aggregate bytes stored: 0
- Stable object pointers: 3 of 3
- Changed object pointers: 0
- Object versions before/after: 2/2
- Duplicate object versions: 0
- Remaining running sync rows: 0

## Failure-Path Validation

Failure-path coverage uses committed automated tests, local route harnesses,
remote security checks, and non-corrupting live validation. No live
production-like row was deliberately corrupted.

- Download failure records sanitized terminal results without replacing a
  previous stored pointer.
- Oversized declared or streamed bodies are rejected before a stored result is
  created.
- Unsafe redirects are rejected without retrying the unsafe target, and error
  messages do not reveal tokens or signed URLs.
- Storage upload failure records a sanitized failure without writing a database
  pointer to a missing object.
- Database pointer update failure removes the newly uploaded object
  best-effort and preserves the previous authoritative pointer.
- Cleanup failure after a successful replacement is best-effort and sanitized;
  the valid new pointer remains authoritative.

## Verification

Automated checks completed during Phase 5C.1B:

- `npm run typecheck --workspace @stay-focused/canvas`: passed.
- `npm run build --workspace @stay-focused/canvas`: passed.
- `npm run test --workspace @stay-focused/canvas`: passed, 50 tests.
- `npm run typecheck --workspace @stay-focused/db`: passed.
- `npm run typecheck --workspace apps/api`: passed.
- `npm run build --workspace apps/api`: passed.
- `npm run test --workspace apps/api`: passed, 184 tests.
- `npm run typecheck --workspace apps/mobile`: passed.
- `npm run test --workspace apps/mobile`: passed, 79 tests.
- `npm run typecheck --workspace @stay-focused/ocr`: passed.
- `npm run build --workspace @stay-focused/ocr`: passed.
- `npm run test --workspace @stay-focused/ocr`: passed, 14 tests.
- `npm run typecheck`: passed across 7/7 workspaces.
- `npm run build`: passed across 7/7 workspaces.
- `npm run test --workspaces --if-present`: passed.
- `git diff --check`: passed with CRLF warnings only.

New coverage includes:

- Canvas file metadata endpoint normalization.
- Bounded binary download size checks.
- Missing and false-low `Content-Length` stream caps.
- Same-origin downloads.
- Off-origin HTTPS file redirect token stripping.
- HTTP, user-info, loopback, private IPv4, private IPv6, link-local, redirect
  loop, and private-DNS redirect rejection.
- Download streaming timeout handling.
- File inventory normalization across module items, Pages, assignments, and
  announcements.
- Mobile strict sync-summary parsing for file/resource counts.

## Limitations

- The protected live metadata sync remains synchronous and exceeded the
  configured 60-second route budget in local production-build measurement.
  This is an application/runtime limitation, not a Canvas file-availability
  limitation.
- The route was not validated in a deployed production-equivalent environment.
- Phase 5B.4A remains backend-complete but not yet a user-facing mobile
  workflow.
- The current app already delivers reviewer, OCR, and Study Library value, but
  the schedule-first product vision is not fully implemented.
- Canvas file bytes are stored only for selected eligible files; they are not
  parsed, OCRed, previewed, or used for reviewer generation yet.
- Parser/OCR expansion should be added only where needed for the narrow
  user-facing Canvas source-selection loop.

## Deferred

- Text extraction from stored Canvas files.
- OCR over Canvas files.
- PowerPoint, Word, spreadsheet, HTML, caption, and media parsers.
- Audio/video transcription.
- Mobile file-selection or source-selection UI.
- Editable Canvas source text handoff into reviewer generation.
- Reviewer generation from Canvas file contents.
- Background/resumable synchronization or ingestion jobs.

## Next Roadmap Task

Phase 5C.2A - User-Facing Canvas Sync And Source-Selection Loop:

1. Manual mobile Canvas sync action.
2. Last-sync status and safe aggregate counts.
3. Clear partial-failure messaging.
4. Narrow Canvas source-selection preview.
5. Editable source text before reviewer generation.

Parser or OCR work should be added only as required to make that narrow
source-selection flow work. Do not add new Canvas resource families before
Canvas provides visible student value in mobile.
