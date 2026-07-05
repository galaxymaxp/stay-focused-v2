# Phase 5B.3B Incremental Sync Foundation - 2026-07-06

## Scope

Phase 5B.3B adds deterministic incremental persistence for the existing manual
Canvas academic graph synchronization route.

Phase 5B.3A remains closed. This phase does not add secondary Canvas
resources, scheduled sync, background workers, Canvas webhooks, endpoint
validators, ETag or Last-Modified requests, mobile synchronization screens, or
reviewer generation from Canvas content.

## Conservative Design

Incremental mode still fetches the complete required Canvas snapshot for each
discovered course before deciding whether the database graph can be left
unchanged. Canvas does not provide one uniform reliable cursor across courses,
modules, module items, Pages, assignment groups, and assignments, so this phase
does not claim reduced Canvas request count, bandwidth, or network duration.

The implemented optimization is database-side: unchanged course snapshots avoid
the expensive graph replacement RPC, pruning, and graph timestamp churn.

## Route Contract

- Route: `POST /api/canvas/sync`
- Default mode: `full`
- Optional request body: `{ "mode": "incremental" }`
- Supported modes: `full`, `incremental`
- Malformed JSON: `400 invalid_json`
- Oversized body: `413 payload_too_large`
- Unsupported mode: `400 invalid_request`

The route still derives ownership from the authenticated Supabase bearer token.
Request-body ownership fields are ignored and cannot select another user or
Canvas connection.

## Fingerprint Design

- Module: `apps/api/src/lib/canvas-sync-fingerprint.ts`
- Algorithm: SHA-256 over a canonical versioned payload
- Version: `canvas-course-snapshot-v1`
- Input: normalized persistence payload only, never raw Canvas responses

The fingerprint includes persisted course graph content:

- normalized course fields
- modules
- module items
- Pages and Page bodies
- assignment groups
- assignments

Canonicalization sorts object keys, sorts collections by durable Canvas
identity, and preserves the differences between absent values, `null`, `false`,
zero, empty strings, and empty arrays. Local synchronization timestamps,
internal UUIDs, user IDs, connection IDs, PATs, authorization data, Canvas URLs,
and raw errors are excluded.

Fingerprint values are private change-detection data. They are not returned by
the public API, logged, documented with real values, or treated as an
authorization boundary.

## Database Migration

Migration:
`202607050008_add_canvas_incremental_sync_state.sql`

New table:
`canvas_course_sync_states`

The state table stores one row per user, Canvas connection, and Canvas course
identity. It records the last successful snapshot fingerprint and version,
last checked/changed/success timestamps, consecutive failure count, a sanitized
last failure code, and optional linkage to the internal course row.

The table does not store course names, course codes, Page titles, assignment
titles, module titles, HTML content, PATs, Canvas URLs, raw Canvas responses,
raw error bodies, or authorization headers.

Security posture:

- composite connection/user ownership is enforced
- optional internal course references must belong to the same user and
  connection
- RLS is enabled
- direct `public`, `anon`, and `authenticated` table grants are revoked
- service-role DML remains the persistence boundary

## RPCs

- `begin_canvas_sync_run_with_mode`
- `replace_canvas_course_academic_snapshot_with_sync_state`
- `record_canvas_course_snapshot_unchanged`
- `record_canvas_course_snapshot_failed`

The changed-course wrapper performs graph replacement and state advancement in
one database transaction. If graph persistence fails, the fingerprint does not
advance. If state persistence fails, the graph replacement rolls back.

The unchanged-course RPC validates ownership and records safe state metadata
without touching academic graph rows. The failed-course RPC increments failure
metadata without advancing the last successful fingerprint.

Direct public, anon, and authenticated execution is revoked; service-role
execution is granted.

## Synchronization Behavior

Full mode fetches complete snapshots, persists successful courses through the
graph replacement path, updates state after successful persistence, records
successful courses as changed, and preserves failed-course graphs and state.

Incremental mode fetches the same complete snapshots, normalizes and
fingerprints them, compares against the last successful state, and then:

- persists when no prior fingerprint exists
- persists when the fingerprint version changes
- persists when the fingerprint changes
- records unchanged and skips graph replacement when the fingerprint and
  version match
- preserves the previous graph and successful fingerprint on fetch failure

For API summaries, `succeeded = changed + unchanged`. Full mode reports
unchanged as zero. Incremental mode reports unchanged courses separately from
failed courses.

## Known Page Limitation

The four known Page-listing failures remain safely classified as permanent
Canvas/resource limitations:

- final code: `canvas_course_pages_failed`
- category: resource not found
- HTTP class: 4xx
- retryable: false

Incremental mode does not treat those courses as successful empty-Page courses,
does not advance successful fingerprints for them, and does not prune their
previous graph rows.

## Verification

Remote database verification passed with
`scripts/phase5b3b-incremental-sync-verification.sql`. The script uses
fictional users, connections, and academic data, then rolls back fixtures. It
verified state identity, same Canvas course identity across different
user/connection owners, cross-user and cross-connection rejection, internal
course reference ownership, changed persistence, unchanged recording, failure
metadata, rollback on invalid relationships, RLS, revoked direct grants,
revoked public RPC execution, service-role execution, and earlier Canvas
protections.

The remote migration history includes `202607050008`.

## Automated Verification

- `npm run typecheck --workspace @stay-focused/canvas`: PASS, fresh
- `npm run build --workspace @stay-focused/canvas`: PASS, fresh
- `npm run test --workspace @stay-focused/canvas`: PASS, fresh, 33/33
- `npm run typecheck --workspace @stay-focused/db`: PASS, fresh
- `npm run typecheck --workspace apps/api`: PASS, fresh
- `npm run build --workspace apps/api`: PASS, fresh
- `npm run test --workspace apps/api`: PASS, fresh, 176/176
- `npm run typecheck --workspace apps/mobile`: PASS, fresh
- `npm run test --workspace apps/mobile`: PASS, fresh, 79/79
- `npm run typecheck`: PASS, 7/7 workspaces, 4 cached and 3 fresh
- `npm run build`: PASS, 7/7 workspaces, 4 cached and 3 fresh
- `npm run test --workspaces --if-present`: PASS, fresh, API 176/176,
  mobile 79/79, Canvas 33/33, OCR 14/14
- `git diff --check`: PASS with line-ending warnings only

## Live Results

The existing encrypted Canvas connection remained stored. All live validation
used aggregate-only output.

Full baseline:

- HTTP result: 200
- Status: `partial`
- Duration: 50.725 seconds
- Courses discovered: 17
- Courses succeeded: 13
- Courses changed: 13
- Courses unchanged: 0
- Courses failed: 4
- Sanitized failure counts: `canvas_course_pages_failed`: 4
- Resources: 27 modules, 311 module items, 459 Pages, 18 assignment groups,
  25 assignments
- Graph replacements: 13
- Running sync rows after completion: 0

First incremental run:

- HTTP result: 200
- Status: `partial`
- Duration: 47.502 seconds
- Courses discovered: 17
- Courses succeeded: 13
- Courses changed: 0
- Courses unchanged: 13
- Courses failed: 4
- Sanitized failure counts: `canvas_course_pages_failed`: 4
- Graph replacements: 0
- State checks advanced: yes
- Failed fingerprints preserved: yes
- Unchanged graph timestamps stable: yes
- Running sync rows after completion: 0

Second incremental run:

- HTTP result: 200
- Status: `partial`
- Duration: 46.750 seconds
- Courses changed: 0
- Courses unchanged: 13
- Courses failed: 4
- Deterministic fingerprints: yes
- Duplicate identities: 0
- Internal identities stable: yes
- Unchanged graph timestamps stable: yes
- Failed graphs preserved: yes
- Running sync rows after completion: 0

Final state checks found one stored encrypted Canvas connection, 17 sync-state
rows, 13 successful state rows, 4 failed state rows, zero running sync rows,
zero duplicate identities, and zero orphan rows.

## Runtime Assessment

The full run completed in 50.725 seconds. The two incremental runs completed in
47.502 seconds and 46.750 seconds. Incremental mode reduced graph replacement
work from 13 replacements to 0 for unchanged successful courses. It did not
implement or measure reduced Canvas request volume; endpoint-level conditional
requests remain deferred.

## Security Review

- No PATs, encryption keys, bearer tokens, Supabase secrets, OpenAI keys,
  Google credentials, passwords, authorization headers, Canvas URLs, course
  names, Page titles/bodies, assignment names/descriptions, raw response
  bodies, stack traces, real Canvas IDs, internal UUIDs, or real fingerprint
  values are committed in this documentation or code change.
- PAT decryption remains inside the API boundary.
- No environment fallback was added.
- Fingerprints are never publicly returned and are not used for authorization.
- Failed fetches cannot advance successful fingerprint state or prune graph
  data.
- Unchanged recording cannot alter academic graph rows.
- Redirect and pagination protections remain active.
- Direct table grants and public RPC execution remain revoked.

## Deferred Work

- Phase 5B.3C endpoint conditional requests
- ETag and Last-Modified support
- secondary Canvas resources
- scheduled/background synchronization
- mobile synchronization UI
- reviewer generation from Canvas content
