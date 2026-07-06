# Phase 5C.2A1 - Course Selection And Runtime-Safe Canvas Synchronization

Date: 2026-07-06, Asia/Manila.

## Summary

Phase 5C.2A1 adds the user-facing selected-course synchronization foundation.
Canvas course listing is now treated as an inventory, not as an instruction to
synchronize every visible shell. Students select eligible courses explicitly,
the selection is persisted separately from course inventory, and normal mobile
sync calls independent course-scoped API requests with maximum concurrency two.

Phase 5C.1 remains valid: file inventory and ingestion implementation,
remote migrations, database and Storage security, protected ingestion, stable
identities, and safe replacement all passed. Its remaining limitation was the
account-wide synchronous route duration. That limitation is an
application/runtime orchestration issue, not a Canvas file-availability issue.
The account-wide route remains locally functional for diagnostics and future
background-sync foundations, but it is not production-runtime safe under its
current 60-second budget.

## Implementation

- Added migration `20260706113150_add_canvas_course_sync_preferences.sql`.
- Added `canvas_course_sync_preferences` with ownership FKs, uniqueness, RLS,
  direct client grant revocation, and service-role-only preference RPCs.
- Extended `canvas_sync_runs` with course-scoped mode and `scope_course_id`.
- Added `GET /api/canvas/courses`, `GET/PUT /api/canvas/course-preferences`,
  and `POST /api/canvas/courses/:courseId/sync` contracts.
- Extended the Canvas client with inventory listing metadata:
  `term`, `concluded`, `sections`, and enrollment metadata.
- Added course classification:
  `likely_current`, `past_or_concluded`, `other_or_uncertain`, `unavailable`.
- Classification uses Canvas metadata, not course-name keywords. Name-only
  exclusion is not used.
- Unavailable courses are not selectable. Past/concluded and uncertain courses
  remain manually selectable.
- Academic-unit synchronization limit: none.
- Course-scoped sync reuses the existing single-course sync engine path for
  course-owned resources: course metadata, modules, module items, Pages,
  assignment groups, assignments, announcements, file metadata, and file
  references.
- Planner items remain excluded from course-scoped sync because they are
  user-wide. Planner sync stays in the account-wide diagnostic route until a
  dedicated planner strategy exists.
- Deselecting a course disables future normal synchronization but does not
  delete existing synchronized data, file metadata, stored objects, or sync
  history.

## Mobile Behavior

The Courses screen now displays selected courses plus likely-current,
past/concluded, uncertain, and unavailable groups. Eligible rows can be
selected with a checkbox-like control. Saving selection persists internal
course IDs. The normal sync button calls the selected-course orchestrator,
which posts one course-scoped request per saved course with maximum concurrency
two. One course failure does not stop remaining courses. Running, success,
partial, and failed terminal states are shown per course from server state.

The old `syncCanvasAcademicGraph()` service function remains for diagnostics,
but the normal mobile Courses screen uses `syncSelectedCanvasCourses()` and
does not call `POST /api/canvas/sync`.

## Remote Verification

Remote migration workflow used a temporary Supabase workdir copied from the
canonical `packages/db/migrations` tree.

- Dry-run listed only `20260706113150_add_canvas_course_sync_preferences.sql`.
- Remote push applied only `20260706113150`.
- Remote migration history includes `20260706113150`.
- Rollback-safe SQL verification passed through
  `scripts/phase5c2a1-course-selection-verification.sql`.
- Checks covered table/column/index/constraint presence, RLS, grant
  restrictions, public RPC revocation, service-role RPC execution, controlled
  function search paths, preference insert/deselect/reselect behavior,
  duplicate rejection, cross-user/connection mismatch rejection, course-scoped
  run start, same-course overlap rejection, different-course concurrency, stale
  course-run recovery, and full-sync scope rejection.
- Supabase advisors reported no new Phase 5C.2A1 findings. Remaining warnings
  are historical search-path/Auth/RLS advisor items unrelated to this migration.
- Destructive operations used: none.

## Protected Live Validation

Protected live validation used the existing stored encrypted Canvas connection,
the established smoke-test user, and a local production build on
`http://127.0.0.1:3000`. Output below is aggregate-only; no real course names,
Canvas IDs, filenames, URLs, object keys, private content, or credentials were
printed or committed.

Inventory:

- Total course shells: 76
- Likely current: 15
- Past or concluded: 59
- Other or uncertain: 2
- Unavailable: 0
- Selectable: 76
- Name-only exclusion used: no
- Non-academic-looking shells automatically excluded: no

Selection:

- Courses selected: 2 likely-current courses with prior successful graph state
- Selection saved: yes
- Selection restored after reload: yes
- Cross-user preference attempt: denied safely with no data exposure
- Account-wide route called by normal selected-course harness: no

First selected-course synchronization:

| Course reference | HTTP | Result  | Duration | Budget | Within budget | Sanitized failures |
| ---------------- | ---: | ------- | -------: | -----: | ------------- | ------------------ |
| selected-course-1 | 200 | success | 6.052s | 60s | yes | none |
| selected-course-2 | 200 | partial | 8.492s | 60s | yes | `canvas_course_files_failed: 1` |

First-run aggregates:

- Maximum simultaneous course syncs: 2
- Modules: 3
- Module items: 32
- Pages: 51
- Assignment groups: 6
- Assignments: 18
- Announcements: 15
- File metadata rows: 18
- File references: 13
- Duplicate identities: 0
- Remaining running course sync rows: 0

Second selected-course synchronization:

| Course reference | Duration | Result  | Unchanged | Updated | Pruned | Terminal |
| ---------------- | -------: | ------- | --------: | ------: | -----: | -------- |
| selected-course-1 | 5.833s | success | 87 | 0 | 0 | yes |
| selected-course-2 | 7.849s | partial | 56 | 0 | 0 | yes |

Second-run stability:

- Duplicate identities: 0
- Unnecessary updates: 0
- Unexpected pruning: 0
- Previous data preserved: yes
- Remaining running rows: 0

Deselect/reselect:

- Deselect request: HTTP 200
- Deselected course excluded from saved selected-course list: yes
- Existing graph/file metadata preserved: yes
- Reselect request: HTTP 200
- Selection restored: yes
- Reselected course sync: HTTP 200 success in 5.754s
- Duplicate identities after deselect/reselect: 0
- Final running rows: 0

Runtime comparison:

- Account-wide route configured budget: 60s
- Latest known account-wide duration: 65.355s
- Longest selected-course request: 8.492s
- Shortest selected-course request: 5.754s
- Average selected-course request: 6.796s
- Every selected course within budget: yes
- Account-wide route called by mobile normal flow: no

Protected reload after validation restored two selected courses with terminal
`success`/`partial` statuses and no false running state.

## Verification

- `npm run typecheck --workspace @stay-focused/canvas`: passed.
- `npm run build --workspace @stay-focused/canvas`: passed.
- `npm run test --workspace @stay-focused/canvas`: passed, 52 tests.
- `npm run typecheck --workspace @stay-focused/db`: passed.
- `npm run typecheck --workspace apps/api`: passed.
- `npm run build --workspace apps/api`: passed.
- `npm run test --workspace apps/api`: passed, 199 tests.
- `npm run typecheck --workspace apps/mobile`: passed.
- `npm run test --workspace apps/mobile`: passed, 83 tests.
- `npm run typecheck`: passed across 7 workspaces.
- `npm run build`: passed across 7 workspaces.
- `npm run test --workspaces --if-present`: passed with API 199, mobile 83,
  Canvas 52, and OCR 14 tests.
- `git diff --check`: passed with CRLF warnings only.

## Limitations

- Course-scoped sync still fetches a fresh Canvas inventory during route-level
  availability validation. It remains within budget in live validation, but a
  later background/resumable design can reduce repeated setup work.
- One selected course returned `partial` because file metadata listing failed
  safely with sanitized `canvas_course_files_failed`. Its academic graph and
  announcements remained stable, and prior data was preserved.
- Planner items are intentionally excluded from course-scoped sync.
- This phase does not implement source selection, source preview, file parsing,
  OCR over Canvas files, reviewer generation from Canvas, background jobs,
  queues, scheduling, or Canvas OAuth.

## Verdict

PASS - Phase 5C.2A1 selected-course synchronization complete.

Next roadmap task: Phase 5C.2A2 - Canvas source selection and reviewer handoff.
