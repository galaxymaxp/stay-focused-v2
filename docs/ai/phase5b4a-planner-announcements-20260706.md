# Phase 5B.4A Planner Items And Announcements

Date: 2026-07-06, Asia/Manila.

## Starting State

- Branch: `main`.
- Starting commit: `dc670a4 docs(canvas): audit conditional request support`.
- Repository sync: `main` matched `origin/main`, ahead 0 and behind 0.
- Known unrelated dirty files left untouched:
  `apps/api/next-env.d.ts`, `apps/mobile/expo-env.d.ts`, and
  `apps/mobile/.gitignore`.
- Existing live Canvas baseline: 17 courses discovered, 13 course graphs
  succeeding, and 4 stable Page-listing `resource_not_found` 4xx failures
  classified as `canvas_course_pages_failed`.

## Scope

Implemented backend synchronization for:

- user-specific Canvas planner items
- course announcements
- typed Canvas client retrieval
- normalization and deterministic source fingerprints
- service-role-only database persistence
- safe scoped pruning
- aggregate API diagnostics
- mobile service response parsing
- route, client, normalization, and database verification

Explicitly deferred:

- discussion entries and replies
- general discussion-topic synchronization
- quiz details and quiz-question metadata
- planner-note or planner-override mutation
- submission, grade, rubric, and feedback synchronization
- file, attachment, announcement-attachment, and media ingestion
- webhooks, scheduled sync, background jobs, resumable jobs, and queues
- mobile synchronization UI, source-selection UI, notifications, and reviewer
  generation from Canvas data
- conditional HTTP request logic

## Resource Contract

Planner items use ordinary authenticated `GET /api/v1/planner/items` requests
with repeated `context_codes[]`, deterministic `start_date` and `end_date`,
and the existing trusted pagination machinery. The sync only requests course
contexts from the successfully listed active Canvas courses. Non-course
contexts are skipped during normalization.

Announcements use ordinary authenticated `GET /api/v1/announcements` requests
one course at a time. This preserves course-level failure isolation when a
course denies or omits announcement access.

Both resources keep the existing timeout, redirect rejection, same-origin
pagination validation, bounded transient retry behavior, and safe error
normalization. Phase 5B.3C1 found no useful 304 behavior, so this phase did not
add ETag, Last-Modified, `If-None-Match`, or `If-Modified-Since` handling.

## Synchronization Window

The sync uses one captured timestamp for the entire run and a deterministic
rolling window:

- past range: 30 days
- future range: 120 days

This bounds Canvas reads and pruning authority while covering near-term student
planning and recent context. Historical rows outside the authoritative window
are preserved instead of being pruned merely because they are outside the
current request range.

## Schema Design

Migration `202607060001_add_canvas_planner_announcements.sql` adds:

- `canvas_planner_items`
- `canvas_announcements`
- `replace_canvas_planner_items_snapshot(...)`
- `replace_canvas_course_announcements_snapshot(...)`
- indexes, uniqueness constraints, RLS, restricted grants, and service-role
  execution boundaries

Migration `202607060002_harden_canvas_planner_announcement_triggers.sql` pins
the new trigger function search paths after Supabase advisors flagged the first
version of the new trigger functions.

Direct `anon` and `authenticated` table grants remain revoked for the new
tables. Public and client-role RPC execution is revoked. Persistence RPCs
validate sync-run ownership and execute with a controlled
`search_path = public, pg_temp`.

## Identity Models

Planner external identity is derived from:

```text
context code + plannable type + plannable id
```

The normalized planner row stores only the future scheduling and linking fields
needed by the app: course context when present, plannable type and ID, title,
dates, HTML URL, workflow state, planner visibility/completion state, minimal
submission-display booleans, and a source fingerprint. Arbitrary nested Canvas
payloads are not retained.

Announcement external identity is derived from:

```text
Canvas course ID + Canvas announcement ID
```

Announcement rows store normalized announcement-level content and metadata,
including HTML message storage for future source fidelity. Announcement titles
and bodies are never returned by the sync route and were not printed in live
validation or committed reports.

## Incremental Behavior

Both resources use deterministic SHA-256 fingerprints over normalized payloads.
Persistence records inserted, updated, unchanged, and pruned counts.
Unchanged rows preserve stable internal IDs and avoid unnecessary writes.

Planner replacement is authoritative only for the exact user, Canvas
connection, selected course-context scope, and sync window after the complete
paginated planner snapshot is fetched.

Announcement replacement is authoritative only for the exact user, Canvas
connection, course, and sync window after that course's complete announcement
snapshot is fetched.

## Atomicity And Failure Isolation

- Existing course graph persistence remains atomic per course.
- Planner fetch or persistence failure preserves previous planner rows and does
  not prune.
- Announcement fetch failure for one course preserves that course's stored
  announcements and does not affect another course.
- Announcement persistence failure for one course preserves that course's
  prior rows and does not affect the existing course academic graph.
- Planner and announcement failures are summarized with stable sanitized codes:
  `canvas_planner_items_failed`, `canvas_planner_persistence_failed`,
  `canvas_course_announcements_failed`, and
  `canvas_announcement_persistence_failed`.

## Automated Verification

Focused verification passed:

- `npm run typecheck --workspace @stay-focused/canvas`
- `npm run build --workspace @stay-focused/canvas`
- `npm run test --workspace @stay-focused/canvas` - 35/35 tests
- `npm run typecheck --workspace @stay-focused/db`
- `npm run typecheck --workspace apps/api`
- `npm run build --workspace apps/api`
- `npm run test --workspace apps/api` - 183/183 tests
- `npm run typecheck --workspace apps/mobile`
- `npm run test --workspace apps/mobile` - 79/79 tests

Full verification passed:

- `npm run typecheck` - 7/7 workspaces
- `npm run build` - 7/7 workspaces after clearing the generated
  `apps/api/.next` directory created by a known OneDrive/Next artifact issue
- `npm run test --workspaces --if-present` - API 183/183, mobile 79/79,
  Canvas 35/35, OCR 14/14
- `git diff --check` - passed with CRLF warnings only

## Database Verification

Remote migration workflow passed:

- dry-run listed only the pending Phase 5B.4A migration at each step
- `202607060001` applied remotely
- `202607060002` applied remotely
- remote history includes both migrations
- `scripts/phase5b4a-planner-announcements-verification.sql` passed every
  rollback fixture check

The verification script checked table, index, foreign-key, uniqueness, RLS,
grant, RPC execution, controlled search-path, duplicate prevention, scoped
pruning, cross-user denial, and earlier Canvas protections. Supabase advisors
showed no remaining warnings for the new Phase 5B.4A functions after
`202607060002`. Remaining advisor warnings were pre-existing and outside this
phase.

## Protected Live Validation

Live validation used the existing encrypted Canvas connection through
`POST /api/canvas/sync`. No PATs, bearer tokens, encryption keys, Canvas URLs,
Canvas IDs, course names, planner titles, announcement titles, announcement
bodies, instructor names, assignment names, raw response bodies, or raw errors
were printed or committed.

Initial protected baseline:

- courses: 13 persisted
- modules: 27
- module items: 311
- Pages: 459
- assignment groups: 18
- assignments: 25
- planner items: 0
- announcements: 0
- running sync rows: 0
- duplicate graph, planner, and announcement identities: 0

First protected run:

- HTTP 200
- status: `partial`
- duration: 72.370 seconds
- courses discovered: 17
- existing graph courses succeeded: 13
- existing graph courses failed: 4
- planner items discovered: 37
- planner inserted/updated/unchanged/pruned: 37/0/0/0
- announcements discovered: 27
- announcement courses succeeded/failed: 13/4
- announcements inserted/updated/unchanged/pruned: 19/0/0/0
- retry attempts: 0
- sanitized failure counts:
  `canvas_course_pages_failed: 4`,
  `canvas_announcement_persistence_failed: 4`
- remaining running sync rows: 0

Second protected run without changing Canvas content:

- HTTP 200
- status: `partial`
- duration: 63.048 seconds
- planner inserted/updated/unchanged/pruned: 0/0/37/0
- announcements inserted/updated/unchanged/pruned: 0/0/19/0
- stable planner identities: true
- stable announcement identities: true
- duplicate planner identities: 0
- duplicate announcement identities: 0
- unnecessary planner updates: 0
- unnecessary announcement updates: 0
- unexpected planner pruning: 0
- unexpected announcement pruning: 0
- failure categories stable: true
- existing failed course graphs preserved: true
- remaining running sync rows: 0

After the route summary was cleaned to remove internal diagnostic fields from
the response body, two additional protected validation passes confirmed the
same aggregate counts, strict response shape, stable identities, zero
duplicates, zero unnecessary updates, zero unexpected pruning, and zero running
sync rows.

## Failure Disposition

| Failure label | Operation | Category | Retryable | Data preserved | Final sanitized code |
| ------------- | --------- | -------- | --------- | -------------- | -------------------- |
| Known Page-listing limitation | Canvas Page listing | `resource_not_found` 4xx | false | yes | `canvas_course_pages_failed` |
| Announcement persistence for courses without stored graph rows | announcement persistence | `persistence_failure` | false | yes | `canvas_announcement_persistence_failed` |

The announcement persistence failures were limited to the same four courses
whose course graphs were not replaced because Page listing failed. Their
previous data was preserved and no pruning was run for those courses.

## Security Verification

- No PAT, encryption key, Supabase secret, bearer token, private academic
  content, announcement body, course name, or raw Canvas error body was staged.
- Route responses return aggregate counts and sanitized failure summaries only.
- Announcement titles and bodies are absent from live reports.
- Failed planner fetches cannot prune planner rows.
- Failed announcement fetches or persistence cannot prune announcement rows for
  that course.
- Redirect and pagination-origin protections remain covered by Canvas client
  tests.
- Earlier Canvas RLS, grant, ownership, and RPC protections remain intact.

## Permanent Limitations

The protected live account still has four stable, non-retryable Page-listing
limitations. Those are documented Canvas/resource limitations for this account,
not a successful empty-Page state and not an implementation signal to prune
existing graph data.

Four announcement persistence scopes also remained partial because those
announcement snapshots belonged to the same courses whose course graph rows are
absent after Page-listing failure. The implementation preserved data, reported
stable sanitized diagnostics, and continued other independent scopes.

## Verdict

PARTIAL - Phase 5B.4A implemented with documented permanent Canvas limitations.

Next roadmap task: Phase 5C - File, Attachment, And Media Ingestion.
