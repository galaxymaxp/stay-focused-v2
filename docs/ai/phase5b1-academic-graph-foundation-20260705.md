# Phase 5B.1 Academic Graph Foundation - 2026-07-05

## Scope

Phase 5B.1 adds the database and typed Canvas API foundation for academic graph
synchronization. It does not implement synchronization orchestration,
background jobs, mobile screens, planner data, announcements, discussions,
quiz-question content, reviewer generation from Canvas content, destructive
stale-record cleanup, or incremental cursor logic.

Phase 5A remains closed. Canvas personal access tokens are still encrypted with
AES-256-GCM, stored per user, and accessible only through the service-role API
boundary.

## Entity Graph

```text
canvas_connections
`-- canvas_courses
    |-- canvas_modules
    |   `-- canvas_module_items
    |-- canvas_pages
    |-- canvas_assignment_groups
    `-- canvas_assignments
        `-- optional canvas_assignment_groups reference
```

## Migration

- File: `packages/db/migrations/202607050004_create_canvas_academic_graph.sql`
- Tables: `canvas_courses`, `canvas_modules`, `canvas_module_items`,
  `canvas_pages`, `canvas_assignment_groups`, and `canvas_assignments`
- Local sync metadata on every graph table: `first_synced_at`,
  `last_synced_at`, `created_at`, and `updated_at`
- Canvas resource timestamps are separate fields such as `canvas_created_at`
  and `canvas_updated_at`

## Ownership Model

Every academic row is owned by `user_id` and `canvas_connection_id`. Child rows
also carry `course_id`. Composite foreign keys enforce that a child cannot
reference a course, module, or assignment group owned by another user or Canvas
connection.

Important constraints:

- Courses reference `canvas_connections(id, user_id)`.
- Modules reference `canvas_courses(id, user_id, canvas_connection_id)`.
- Module items reference
  `canvas_modules(id, user_id, canvas_connection_id, course_id)`.
- Pages and assignment groups reference
  `canvas_courses(id, user_id, canvas_connection_id)`.
- Assignments reference their owning course and, when present, an assignment
  group in the same user, connection, and course.

## Canvas Identity

- Courses are unique by `(user_id, canvas_connection_id, canvas_course_id)`.
- Modules are unique by `(course_id, canvas_module_id)`.
- Module items are unique by `(module_id, canvas_module_item_id)`.
- Pages are unique by `(course_id, canvas_page_url)`, with a partial unique
  index on `(course_id, canvas_page_id)` when Canvas returns a Page ID.
- Assignment groups are unique by `(course_id, canvas_assignment_group_id)`.
- Assignments are unique by `(course_id, canvas_assignment_id)`.

## RLS And Grants

RLS is enabled on every new academic graph table. Owner-scoped policies exist
for `select`, `insert`, `update`, and `delete`, using
`(select auth.uid()) = user_id`.

Direct `anon` and `authenticated` table grants are revoked to preserve the
Phase 5A service-role persistence boundary. `service_role` has DML grants for
server-side synchronization code. Phase 5A encrypted credential table grants
remain revoked.

## Canvas Client Methods

`@stay-focused/canvas` now exposes typed methods for:

- `listCourses()`
- `listModules(courseId)`
- `listModuleItems(courseId, moduleId)`
- `listPages(courseId)`
- `getPage(courseId, pageUrl)`
- `listAssignmentGroups(courseId)`
- `listAssignments(courseId)`

IDs and Page URL slugs are URL-encoded. The client continues to use bearer
authorization only on the direct Canvas request, `redirect: "manual"`, and
same-origin pagination validation.

## Pagination Behavior

All collection methods use the shared Link-header pagination helper. The helper
aggregates pages in order, rejects cross-origin next links, propagates later
page failures, rejects repeated next links, and rejects page-limit exhaustion
instead of returning a partial prefix.

## Automated Test Evidence

- `npm run typecheck --workspace @stay-focused/canvas`: PASS
- `npm run test --workspace @stay-focused/canvas`: PASS, 30 tests
- `npm run typecheck --workspace @stay-focused/db`: PASS

Canvas tests cover one-page and multi-page listing, endpoint encoding, module
item polymorphic fields, Page-detail slug encoding, assignments with nullable
dates, later-page failure propagation, repeated-link loop protection, redirect
rejection, and cross-origin pagination rejection.

## Remote Verification

- `npx supabase db push --dry-run`: PASS; only
  `202607050004_create_canvas_academic_graph.sql` was pending.
- `npx supabase db push`: PASS; migration applied remotely.
- `npx supabase migration list`: PASS; remote history includes
  `202607050004`.
- `scripts/phase5b1-academic-graph-verification.sql`: PASS against the linked
  remote project. The script inserts fake User A/User B graph data inside a
  transaction, verifies uniqueness and cross-owner rejection behavior, checks
  cascade behavior, checks RLS/grants/FKs/indexes, then rolls back.
- Read-only remote check: PASS for new table existence, RLS, revoked direct
  client grants, ownership constraints, required indexes, and unchanged Phase
  5A Canvas grant/RLS protections.
- Non-fatal CLI warning: Supabase could not cache the pg-delta catalog because
  Docker Desktop was unavailable. The remote migration and verification queries
  completed successfully.

## Deferred Work

Phase 5B.2 should implement initial full academic graph synchronization using
these tables and client methods. Deferred scope still includes scheduled jobs,
background workers, mobile course screens, sync-start API routes,
announcements, discussions, planner data, quiz metadata, files/media ingestion,
incremental cursors, destructive stale cleanup, source snapshots, reviewer
generation from Canvas content, grades, submissions, and grade planning.

## Known Risks

- Canvas endpoint availability still varies by user, role, course, and
  institution.
- The schema stores graph metadata and HTML fields when synchronization later
  writes them; future import flows must avoid sending private Canvas content to
  reviewer generation without explicit user action and provenance.
- Canvas OAuth remains future work before broad public production
  authorization.
