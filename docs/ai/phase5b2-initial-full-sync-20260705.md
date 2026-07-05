# Phase 5B.2 Initial Full Academic Graph Synchronization - 2026-07-05

## Scope

Phase 5B.2 adds a manually triggered, synchronous Canvas academic graph
synchronization path from the authenticated user's stored Canvas connection
into the Phase 5B.1 academic graph.

Phase 5A remains closed. Phase 5B.1 remains closed. This phase does not add
scheduled jobs, background workers, mobile screens, automatic app-launch sync,
incremental cursors, webhooks, source snapshots, grade sync, submissions,
files, announcements, discussions, planner items, or reviewer generation from
Canvas content.

## Route And Flow

- Route: `POST /api/canvas/sync`
- Orchestrator: `apps/api/src/lib/canvas-sync.ts`
- Normalization boundary: `apps/api/src/lib/canvas-sync-normalize.ts`
- Sync-run migration: `202607050005_add_canvas_academic_sync.sql`
- Course snapshot RPC: `replace_canvas_course_academic_snapshot`
- Connection RPC repair: `202607050006_fix_canvas_connection_rpc_ambiguity.sql`

The route uses the existing bearer-token boundary, derives ownership from the
authenticated Supabase user, loads only that user's Canvas connection, decrypts
the Canvas PAT only inside the API process, constructs the existing
`CanvasClient`, starts a protected sync run, fetches active courses, fetches a
complete snapshot for each course, persists each complete course through the
atomic RPC, records progress, and finalizes the run.

## Bounded Concurrency

- Courses: 2
- Module-item collection: 3
- Page-detail collection: 3

The orchestrator uses small explicit limiters and does not run unbounded
`Promise.all` over courses, modules, or Pages. Automated tests verify the
bounded limits and deterministic aggregate behavior.

## Transaction Boundary

Persistence is atomic per course, not one transaction for the entire Canvas
account. A course is replaced only after all required collections for that
course have been fetched successfully:

- modules
- module items for every module
- Page summaries
- Page detail for every Page
- assignment groups
- assignments

The RPC validates ownership and relationships inside the database, preserves
stable internal UUIDs for existing rows, updates `first_synced_at` only on
first insertion, updates `last_synced_at` on every successful course
synchronization, and prunes stale child rows only after validation succeeds.

## Stale-Child Policy

A successful complete course snapshot may remove stale modules, module items,
Pages, assignment groups, and assignments for that course only. Empty but
successfully fetched collections intentionally clear stale child rows.

Incomplete course snapshots are never persisted. Failed module-item retrieval,
Page-detail retrieval, assignment retrieval, or RPC persistence leaves the
previous course graph unchanged. Courses absent from the active-course listing
are not deleted.

## Partial Runs

One course failure does not erase another successfully synchronized course.
The run is marked:

- `succeeded` when every discovered course persists
- `partial` when at least one course persists and at least one course fails
- `failed` when no course persists or setup fails

Responses return only aggregate counts and sanitized failure codes. They do not
return course names, module names, Page titles, Page bodies, assignment names,
assignment descriptions, PATs, authorization headers, database errors, stack
traces, or raw Canvas responses.

## Sync-Run Persistence

`canvas_sync_runs` records the owning user, Canvas connection, mode, status,
started/completed/heartbeat timestamps, discovered/succeeded/failed course
counts, resource counts, sanitized failure code, and sanitized failure summary.
Only `full` mode is allowed in this phase. Status values are `running`,
`succeeded`, `partial`, and `failed`.

Active-run protection prevents overlapping non-stale runs for the same Canvas
connection. The lease is 30 minutes; stale abandoned runs can be superseded.
RLS is enabled, direct `anon` and `authenticated` grants are revoked, and RPC
execution is restricted to the service-role API boundary.

## Automated Tests

Fresh focused pre-validation passed before live testing:

- Canvas package: typecheck PASS, build PASS, tests PASS 30/30
- DB package: typecheck PASS
- API: typecheck PASS, build PASS, tests PASS 158/158
- Mobile: typecheck PASS, tests PASS 76/76

Final verification after documentation passed:

- Root typecheck: PASS, 5 cached and 2 fresh workspace tasks
- Root build: PASS after deleting only generated `apps/api/.next` output for
  the known OneDrive readlink issue; 6 cached and 1 fresh workspace tasks
- Workspace tests: PASS with API 158/158, mobile 76/76, Canvas 30/30, and OCR
  14/14
- `git diff --check`: PASS with line-ending warnings only

Coverage includes authentication, missing connections, user ownership,
request-body ownership override rejection, overlapping runs, stale-run
recovery, full sync, multi-course sync, empty collections, nullable dates, Page
HTML, assignment description HTML, quiz metadata fields, polymorphic module
items, second-page resources reaching persistence, fetch-failure preservation,
RPC-failure preservation, empty-snapshot cleanup, stale cleanup isolation,
idempotency, partial runs, bounded concurrency, and error sanitization.

## Remote Verification

- Remote migration history includes `202607050005`.
- Remote migration history includes `202607050006`.
- `scripts/phase5b2-full-sync-verification.sql` passed against the linked
  remote project.
- Verification covers sync-run ownership constraints, active-run protection,
  stale-run recovery, atomic course snapshot replacement, duplicate prevention,
  stable row IDs across upsert, child ownership enforcement, empty snapshot
  cleanup, malformed relationship rollback, cross-user mutation rejection,
  RLS, revoked direct grants, service-role RPC execution, public RPC execution
  revocation, unchanged Phase 5A posture, and unchanged Phase 5B.1 posture.

## Live Validation

Credential source path by filename only: `apps/api/.env.local`. Values were
not printed, logged, saved to documentation, or committed.

The established smoke-test user authenticated successfully. The protected
connection request used `PUT /api/canvas/connection`, validated Canvas before
persistence, discovered 25 capability records, returned 17 course summaries,
and persisted exactly one encrypted connection for the user. Ciphertext, IV,
and authentication tag were non-empty. No plaintext PAT was persisted.

First live sync:

- HTTP result: 200
- Status: `partial`
- Duration: 57.576 seconds
- Courses discovered: 17
- Courses succeeded: 13
- Courses failed: 4
- Modules: 27
- Module items: 311
- Pages: 459
- Assignment groups: 18
- Assignments: 25
- Sanitized failure code: `canvas_course_fetch_failed`
- Remaining running sync rows: 0

Second live sync:

- HTTP result: 200
- Status: `partial`
- Duration: 52.403 seconds
- Courses discovered: 17
- Courses succeeded: 13
- Courses failed: 4
- Resource counts stable: yes
- Duplicate identities: 0
- Internal identities stable: yes
- `first_synced_at` timestamps stable: yes
- `last_synced_at` timestamps advanced: yes
- Remaining running sync rows: 0

The four failed course snapshots were not persisted. The successful courses
were committed, duplicate identities remained absent, ownership was consistent,
orphans were absent, and the final Canvas connection remained stored for later
Canvas phases.

## Security Review

- PAT decrypted only inside the API process after connection persistence.
- Local Canvas PAT was used only to call the protected connection API.
- PAT was encrypted before persistence.
- Plaintext PAT was not stored.
- No environment-token fallback was introduced.
- Synchronization payloads do not accept client-supplied ownership fields.
- Ownership is derived from the authenticated user.
- The course snapshot RPC validates connection ownership.
- Cross-user sync is blocked.
- Failed course fetches cannot prune existing course data.
- Child replacement is atomic per course.
- Redirect and pagination protections remain active.
- Public RPC execution remains revoked.
- Direct Canvas table grants remain revoked.
- No private academic content was printed or committed.

## Serverless Runtime Observation

The route is synchronous and currently declares a 60-second API duration. The
observed account completed the first live sync in 57.576 seconds and the second
in 52.403 seconds, so the current synchronous design is acceptable for this
observed account but close to the limit. Larger accounts or institutions with
slower Canvas responses may require resumable or background synchronization in
a later phase.

## Deferred Scope

- Scheduled synchronization
- Background queues or workers
- Cron jobs
- Incremental cursors
- Canvas webhooks
- Announcements
- Discussions
- Planner items
- Files or attachments
- Submissions
- Grades
- Reviewer generation from Canvas
- Source snapshots
- Mobile synchronization screens
- Automatic sync on app launch
- Sync notifications
- Cross-course planning
- Deletion of courses missing from the active-course response

## Next Phase

Phase 5B.3 should add incremental synchronization, secondary Canvas resources,
and recovery hardening without weakening the Phase 5A credential boundary or
the Phase 5B.2 per-course atomic persistence model.
