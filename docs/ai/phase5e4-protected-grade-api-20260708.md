# Phase 5E.4 Protected Grade API

Implementation date: 2026-07-08, Asia/Manila.

## 1. Starting State

- Branch: `main`
- Starting commit: `5e5ccea39d8f0012c272b1028bb45e3c4273ce07`
- Ahead/behind at start: `0/0` against `origin/main`
- Dirty files at start: `apps/api/next-env.d.ts`,
  `apps/mobile/expo-env.d.ts`, and `apps/mobile/.gitignore`
- Unrelated files preserved: those three files were not edited, staged,
  formatted, or reverted.
- Phase 5E.3 and repair migrations were present locally through
  `202607080006_harden_canvas_grade_sync_rpc_function_references.sql`.

## 2. Existing Phase 5E Components Reused

- Phase 5E plan:
  `docs/ai/phase5e-grades-submissions-plan-20260708.md`
- Phase 5E.1 service-role-only grade tables and DB types.
- Phase 5E.2 read-only Canvas client contracts.
- Phase 5E.3 `syncCanvasCourseGrades` service, normalization, fingerprints,
  and service-role RPC persistence.
- Existing `requireCanvasAuth`, `jsonResponse`, `errorResponse`, CORS, and
  no-store response conventions.
- Existing service-role Supabase access pattern from Canvas routes.

## 3. Routes Added

| Method | Route | Canvas call | Database read | Purpose |
| --- | --- | --- | --- | --- |
| `POST` | `/api/canvas/courses/:courseId/grades/sync` | Yes, through `syncCanvasCourseGrades` only | Yes, inside the sync service authorization/persistence boundary | Explicitly sync one owned selected course |
| `GET` | `/api/canvas/courses/:courseId/grades` | No | Yes, local synchronized state only | Paginated assignment/submission grade list |
| `GET` | `/api/canvas/courses/:courseId/grades/:assignmentId` | No | Yes, local synchronized state only | One safe assignment/submission detail |
| `GET` | `/api/canvas/courses/:courseId/grades/summary` | No | Yes, local synchronized state only | Canvas-provided visible course-grade summary |
| `GET` | `/api/canvas/courses/:courseId/grades/sync-status` | No | Yes, local synchronized state only | Freshness and family status |

Static `summary`, `sync`, and `sync-status` route segments are separate folders
beside `[assignmentId]`, so they are not handled as assignment IDs.

## 4. Authentication Behavior

Every route calls `requireCanvasAuth` before reading request-owned data. Routes
never accept user IDs, connection IDs, or Canvas tokens from the request. Missing
or invalid bearer authentication returns the existing safe `401 unauthorized`
response shape.

## 5. Course And Assignment Authorization

The read model validates:

- route `courseId` is an internal UUID-like row id
- the authenticated user has an active local Canvas connection
- the course row belongs to that user and that connection
- the course is selected in `canvas_course_sync_preferences`
- the assignment detail id is an internal assignment row id
- detail assignment rows are scoped by user, connection, and requested course
- detail submission rows are scoped by user, connection, course, and assignment

Unknown, cross-user, cross-connection, and cross-course resources return safe
not-found responses without revealing ownership. Unselected courses return
`canvas_course_not_selected`.

## 6. Sync Route Behavior

`POST /api/canvas/courses/:courseId/grades/sync`:

- validates bearer auth
- validates a non-empty internal course id shape
- accepts no body or an empty JSON object only
- rejects malformed JSON, non-object bodies, unknown fields, and oversized
  bodies
- calls `syncCanvasCourseGrades` exactly once
- returns only aggregate status, counts, status counts, safe failure codes, and
  timestamps
- returns `Cache-Control: no-store`

The route does not instantiate a Canvas client, decrypt the PAT, query Canvas
endpoints, compute fingerprints, normalize statuses, or call grade persistence
RPCs directly. Complete, partial, rate-limited, timeout, upstream, storage, and
overlap outcomes surfaced by the service are returned as safe aggregate `200`
responses with `status: "succeeded" | "partial" | "failed"`. Route-level
request validation failures use `400`, `404`, or `413`.

## 7. DB-Only Read Model

New module:

- `apps/api/src/lib/canvas-grade-read-model.ts`

The read model uses only local Supabase tables:

- `canvas_connections`
- `canvas_courses`
- `canvas_course_sync_preferences`
- `canvas_assignments`
- `canvas_assignment_submissions`
- `canvas_course_grade_summaries`
- `canvas_course_grade_sync_states`

It uses explicit column selections and does not use `select("*")`. GET routes
do not import the Canvas client, decrypt the PAT, call the Phase 5E.3 sync
service, read Storage, call OCR, call OpenAI, or invoke reviewer generation.

## 8. Safe List DTO

Assignment list items include internal assignment id, title, due/unlock/lock
timestamps, points possible, grading type, submission types, normalized status,
workflow state, submitted/graded timestamps, attempt, late/missing/excused
flags, assignment visibility, visible score/grade wrappers, and last synced
timestamp.

Excluded: internal submission row id, Canvas assignment/course/submission IDs,
user id, connection id, source fingerprints, raw JSON, submission body,
comments, attachments, rubrics, grader identity, preview URLs, Canvas URLs, and
unposted grades.

## 9. Safe Detail DTO

Assignment detail extends the list item with submission type, posted timestamp,
seconds late, late-policy status, grade-matches-current-submission, points
possible at sync, and sync metadata. `allowedAttempts`, `hideInGradebook`, and
`postManually` remain `null` because the current database schema does not store
those fields.

No assignment HTML description, submission body, comments, attachments,
rubrics, preview URLs, Canvas URLs, raw JSON, fingerprints, or Canvas IDs are
returned.

## 10. Safe Summary DTO

Course summary returns only Canvas-provided visible wrappers:

- current score
- current grade
- final score
- final grade
- last synced timestamp
- sync metadata

Visible zero scores and visible empty grade strings are preserved. Hidden,
unavailable, unknown, and not-applicable states return `value: null`. Missing
summary rows return unknown wrappers, not zeroes. No local totals, weighted
estimates, What-If values, or unposted fields are calculated or exposed.

## 11. Safe Sync-Status DTO

Sync status returns:

- `status`
- summarized assignment/submission family state
- course-grade-summary family state
- authoritative assignment/submission boolean
- last checked timestamp
- last successful sync timestamp
- computed stale boolean
- sanitized failure code

It does not return grade values, assignment names, raw failure detail, SQL
errors, Canvas URLs, fingerprints, tokens, user IDs, or connection IDs.

## 12. Pagination Contract

The list route uses bounded offset pagination:

- default `limit`: `50`
- maximum `limit`: `100`
- default `offset`: `0`
- unknown query parameters are rejected
- negative, malformed, decimal, and oversized values are rejected
- Canvas IDs, user IDs, connection IDs, and arbitrary sort fields are not
  accepted

The response page includes `limit`, `offset`, `nextOffset`, and `hasMore`.

## 13. Ordering Rules

List ordering is deterministic:

1. assignments with due dates before assignments without due dates
2. due date ascending
3. assignment title ascending
4. internal assignment id ascending

The read route does not infer urgency, missing status, or grade totals. The
persisted normalized status is authoritative for display.

## 14. Stale Threshold

The server-side stale threshold is:

```ts
CANVAS_GRADE_SYNC_STALE_AFTER_MS = 24 * 60 * 60 * 1000;
```

It is used only to label synchronized data as stale. The read model does not
trigger synchronization, change persisted statuses, delete rows, infer missing
work, calculate urgency, or send notifications.

## 15. Error Mapping

Safe route/read-model errors:

- `401 unauthorized` for invalid bearer auth
- `400 invalid_request` for malformed query/body inputs
- `400 canvas_course_not_selected` for unselected owned courses
- `404 canvas_connection_missing` for missing inactive local connection state
- `404 canvas_course_not_found` for unknown, cross-user, or cross-connection
  courses
- `404 canvas_assignment_not_found` for unknown, cross-user, or cross-course
  assignment details
- `413 payload_too_large` for oversized sync request bodies
- `500 canvas_storage_failed` for local storage failures
- `500 canvas_grade_data_unavailable` for unexpected persisted status or
  visibility values

Raw Supabase errors, SQLSTATE values, stack traces, Canvas bodies, Canvas URLs,
course names, assignment titles in errors, grades, scores, tokens, and
fingerprints are not returned.

## 16. No-Store Behavior

All Phase 5E.4 routes use the existing `jsonResponse` helper and return:

```text
Cache-Control: no-store
```

No public caching, ISR, revalidation, or CDN caching was added.

## 17. Privacy Exclusions

Public DTOs exclude:

- Canvas assignment IDs
- Canvas course IDs
- Canvas submission IDs
- user IDs
- connection IDs
- internal submission row IDs
- submission bodies
- comments
- attachments
- rubrics
- grader IDs
- preview URLs
- Canvas URLs
- unposted grades
- raw JSON
- fingerprints
- access tokens
- encrypted credential columns
- SQL errors

## 18. Automated Test Coverage

Focused Phase 5E.4 tests:

| Suite | Result | Important coverage |
| --- | --- | --- |
| Read model | PASS | auth/selection scoping, DB-only query table set, explicit columns, list ordering, pagination, visible zero, visible empty grade, hidden residual suppression, detail not-found, summary no row, stale status, invalid persisted values |
| List route | PASS | auth, query validation, safe DTO, no-store, error propagation |
| Detail route | PASS | auth, owned detail response, safe not-found, no unsafe fields, no-store |
| Summary route | PASS | auth, visible wrappers, hidden values, selected-course failures, no-store |
| Sync-status route | PASS | auth, no grade/score values, sanitized failures, no-store |
| Sync route | PASS | auth, invalid course id, no body, empty object body, malformed JSON, unknown fields, oversized body, safe aggregate succeeded/partial/failed responses, exactly one service call, no-store |

Focused result: 35 tests passed across 6 files.

Full API result: 382 tests passed across 34 files.

## 19. Validation Results

| Command | Result | Notes |
| --- | --- | --- |
| `npx vitest run src/lib/canvas-grade-read-model.test.ts app/api/canvas/courses/[courseId]/grades/route.test.ts app/api/canvas/courses/[courseId]/grades/[assignmentId]/route.test.ts app/api/canvas/courses/[courseId]/grades/summary/route.test.ts app/api/canvas/courses/[courseId]/grades/sync-status/route.test.ts app/api/canvas/courses/[courseId]/grades/sync/route.test.ts` | PASS | 35 focused Phase 5E.4 tests |
| `npm --workspace apps/api run typecheck` | PASS | API TypeScript check |
| `npm --workspace apps/api run lint` | PASS | API ESLint |
| `npm --workspace apps/api run test` | PASS | 382 API tests |
| `npm --workspace apps/api run build` | PASS | Next build lists all five grade routes |
| `npm --workspace @stay-focused/canvas run test` | PASS | 69 Canvas tests |
| `npm --workspace @stay-focused/db run typecheck` | PASS | DB package typecheck |
| `npm run typecheck` | PASS | 7/7 workspaces |
| `npm run lint` | PASS | 7/7 workspaces |
| `git diff --check` | PASS | Exit 0 with existing CRLF warnings only |

## 20. Migration Impact

- Migration added: no
- Migration filename: not applicable
- Remote verification result: no Phase 5E.4 database change was required; remote
  migration alignment remains through `202607080006`.

## 21. Explicit Non-Implementation

Phase 5E.4 did not add:

- mobile service
- mobile UI
- Courses-screen navigation changes
- background synchronization
- cron, queues, or automatic app-launch sync
- notifications
- local grade calculations
- weighted estimates
- target-grade calculations
- What-If grades
- assignment submission
- file uploads
- submission comments
- grading, grade edits, excusing, or late-policy edits
- rubrics
- instructor feedback
- submission bodies
- submission attachments
- quiz attempts
- peer reviews
- reviewer generation
- reviewer prompt integration
- grade history
- attempt history

## 22. Remaining Limitations

- Mobile does not yet call these routes.
- Protected live validation remains a later Phase 5E.6 activity.
- The detail DTO returns `null` for allowed attempts, hide-in-gradebook, and
  manual posting because those fields are not stored in the current grade DB
  schema.
- Sync-route complete failures are returned as safe aggregate `200` responses
  when the Phase 5E.3 service completes and reports a failed result.
- Offset pagination is deterministic and bounded, but not cursor-based.

## 23. Files Changed

- `apps/api/app/api/canvas/courses/[courseId]/grades/route.ts`
- `apps/api/app/api/canvas/courses/[courseId]/grades/route.test.ts`
- `apps/api/app/api/canvas/courses/[courseId]/grades/[assignmentId]/route.ts`
- `apps/api/app/api/canvas/courses/[courseId]/grades/[assignmentId]/route.test.ts`
- `apps/api/app/api/canvas/courses/[courseId]/grades/summary/route.ts`
- `apps/api/app/api/canvas/courses/[courseId]/grades/summary/route.test.ts`
- `apps/api/app/api/canvas/courses/[courseId]/grades/sync/route.ts`
- `apps/api/app/api/canvas/courses/[courseId]/grades/sync/route.test.ts`
- `apps/api/app/api/canvas/courses/[courseId]/grades/sync-status/route.ts`
- `apps/api/app/api/canvas/courses/[courseId]/grades/sync-status/route.test.ts`
- `apps/api/src/lib/canvas-grade-read-model.ts`
- `apps/api/src/lib/canvas-grade-read-model.test.ts`
- `apps/api/src/types/canvas.ts`
- `README.md`
- `docs/current-state.md`
- `docs/roadmap.md`
- `docs/ai/current_sprint.md`
- `docs/ai/handoff.md`
- `docs/ai/phase5e4-protected-grade-api-20260708.md`

## 24. Git Result

- Commit message: `feat(canvas): add protected grade API`
- Push target: `origin/main`
- Final commit SHA, push result, final ahead/behind, and remaining dirty files
  are reported in the Codex final response after commit and push.

## 25. Final Verdict

```text
PASS - Phase 5E.4 protected grade API is complete
```
