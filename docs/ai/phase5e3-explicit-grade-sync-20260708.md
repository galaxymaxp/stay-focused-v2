# Phase 5E.3 Explicit Per-Course Grade Synchronization

Implementation date: 2026-07-08, Asia/Manila.

## 1. Starting Repository State

- Branch: `main`
- Starting commit: `469ef9d23da7ceae9490013c20a79e13b4223562`
- Ahead/behind at start: `main...origin/main`, no ahead/behind markers
- Dirty files at start: `apps/api/next-env.d.ts`,
  `apps/mobile/expo-env.d.ts`, and `apps/mobile/.gitignore`
- Unrelated files preserved: those three files were not edited, staged,
  formatted, or reverted.
- Planning inputs read: Phase 5E plan, Phase 5E.1 foundation report, and Phase
  5E.2 Canvas client report.

## 2. Existing Architecture Reused

- Server-only Canvas connection loading and PAT decryption helpers from
  `apps/api/src/lib/canvas-routes.ts`.
- Existing service-role Supabase client expectations and RPC style.
- Existing selected-course preference table and ownership model.
- Existing Canvas client GET-only methods from Phase 5E.2:
  `listCourseAssignments`, `listOwnCourseSubmissions`, and
  `getOwnCourseGradeSummary`.
- Existing deterministic fingerprint style: version prefix plus canonical
  serialization and SHA-256.

## 3. Files Changed

- `apps/api/src/lib/canvas-grade-sync.ts`
- `apps/api/src/lib/canvas-grade-sync-normalize.ts`
- `apps/api/src/lib/canvas-grade-sync-fingerprint.ts`
- `apps/api/src/lib/canvas-grade-sync.test.ts`
- `apps/api/src/lib/canvas-grade-sync-normalize.test.ts`
- `packages/db/migrations/202607080005_add_canvas_grade_sync_rpcs.sql`
- `packages/db/src/types.ts`
- `scripts/phase5e3-grade-sync-verification.sql`
- `docs/ai/phase5e3-explicit-grade-sync-20260708.md`
- `README.md`
- `docs/current-state.md`
- `docs/roadmap.md`
- `docs/ai/current_sprint.md`
- `docs/ai/handoff.md`

## 4. Canvas Read Methods Used

The internal service calls only:

- `listCourseAssignments`
- `listOwnCourseSubmissions`
- `getOwnCourseGradeSummary`

All are GET-only. No `student_ids[]`, submission bodies, comments, attachments,
rubrics, preview URLs, unposted grades, mutations, uploads, or grade-edit
operations are requested or added.

## 5. Authorization And Selection

The service accepts a verified Stay Focused `userId` and an internal
`canvas_courses.id`. Before Canvas calls it loads the user's connection, checks
the internal course belongs to that user and connection, checks the course is
selected through `canvas_course_sync_preferences`, checks the connection is
active, and decrypts the PAT only inside the server-only boundary. Unselected,
missing, cross-user, cross-connection, and unusable-connection cases fail before
Canvas client creation.

## 6. Synchronization Families

| Family | Success Behavior | Failure Preservation |
| --- | --- | --- |
| Assignment/submission snapshot | Fetch complete assignments and own submissions, normalize one row per assignment, upsert safe assignment metadata, upsert current submission rows, and mark authoritative absences. | Does not call the snapshot RPC; prior rows and visible values remain. |
| Course grade summary | Upserts one visible/hidden/unavailable summary row. Hidden or unavailable authoritative values clear stored visible values. | Prior summary row remains unchanged. |
| Per-course sync state | Begin rejects active overlap or recovers stale running state; finish records succeeded, partial, or failed with family states and safe failure categories. | Failed finish is reported as a safe storage failure; no raw SQL is returned. |

## 7. Assignment/Submission Join

The assignment response is the authoritative set for the family. Each returned
Canvas assignment is matched to an internal `canvas_assignments` row under the
same user, connection, and course. Missing local assignments are safely upserted
with the existing academic graph columns required for ownership and display
context. Submission evidence is joined by Canvas assignment id; duplicate
assignment or submission identities reject the family. Submission evidence for
assignments outside the authoritative assignment set is ignored and not
persisted.

## 8. Canonical Status Precedence

The final implemented order follows the approved planning report while allowing
submitted or graded evidence to override a closed lock window:

1. `unknown`
2. `excused`
3. `unavailable`
4. `locked`
5. `missing`
6. `graded_hidden`
7. `graded`
8. `submitted_late`
9. `submitted`
10. `late_unsubmitted`
11. `available`
12. `upcoming`
13. `no_due_date`

Rules: `excused` overrides missing and late; visible score `0` is graded; an
empty visible grade string is stored as visible; hidden grade is not zero;
missing is never inferred from due dates; locked does not override submitted or
graded evidence; unsupported or contradictory evidence becomes `unknown`;
timestamps are parsed and compared as absolute instants.

## 9. Visibility Mapping

Canvas visibility wrappers map directly to database states:

- `visible`: store the value, including numeric zero and empty grade string.
- `hidden`, `unavailable`, `unknown`, `not_applicable`: store `null`.

Authoritative hidden/unavailable responses clear previous visible values.
Request failures do not touch previous rows.

## 10. Fingerprints

Fingerprint versions:

- `canvas-grade-assignment-submission-v1`
- `canvas-grade-assignment-submission-snapshot-v1`
- `canvas-course-grade-summary-v1`

Fingerprints use canonical serialization with sorted keys, sorted
assignment/submission rows by Canvas assignment identity, normalized nulls, and
version-prefix hashing. They exclude local timestamps, database IDs,
credentials, raw Canvas payloads, private submission content, and raw errors.
Changed status or visible-grade values change the relevant fingerprint;
reordered Canvas responses do not.

## 11. Persistence RPCs

| RPC | Purpose | Boundary | Absence Behavior | Grants |
| --- | --- | --- | --- | --- |
| `begin_canvas_course_grade_sync` | Start one grade sync, reject active overlap, recover stale running state. | One course state row. | None. | `service_role` execute only. |
| `replace_canvas_course_assignment_submission_snapshot` | Atomic assignment metadata upsert plus assignment/submission snapshot replacement. | One selected owned course family. | Marks missing prior rows `unavailable` with `absent_after_sync_at`; no academic graph pruning. | `service_role` execute only. |
| `upsert_canvas_course_grade_summary` | Upsert exactly one visible/hidden/unavailable summary row. | One selected owned course summary. | N/A. | `service_role` execute only. |
| `finish_canvas_course_grade_sync` | Record succeeded, partial, or failed state and safe family counts. | One course state row. | Preserves prior success timestamp unless the authoritative assignment/submission family succeeds. | `service_role` execute only. |

All RPCs are `security definer`, set `search_path = public, pg_temp`, avoid
dynamic SQL, validate input shapes, and fully qualify table references.

## 12. Idempotency

Repeated identical assignment/submission snapshots preserve stable row IDs and
`first_synced_at`, advance checked/synced timestamps, avoid duplicate rows, and
return unchanged diagnostics when fingerprints match. Summary upserts preserve
the summary row identity and `first_synced_at`. Historical attempts and grade
history are not stored.

## 13. Partial-Failure Behavior

- Assignment request failure: summary may persist; assignment/submission rows
  are preserved.
- Submission request failure after assignment success: no authoritative
  assignment/submission replacement occurs.
- Summary request failure after assignment success: assignment/submission rows
  persist and overall status is partial.
- Persistence failure: failed family reports `canvas_storage_failed` and avoids
  exposing SQL text.
- Complete failure: prior synchronized data is preserved and sync state records
  a safe failed category.

## 14. Sync-State Transitions

`begin` creates or updates a running state for the selected owned course. A
non-stale running state rejects overlap. A stale running state is marked failed
with `stale_sync_recovered` before a new run starts. `finish` records
`succeeded`, `partial`, or `failed`, family states, aggregate counts,
fingerprint metadata, `last_checked_at`, and `last_successful_sync_at` only
when the assignment/submission family succeeded.

## 15. Privacy And Logging

The service result and logger metadata contain only operation label, status,
duration, aggregate counts, and safe failure codes. They exclude assignment
titles, course names, grade values, score values, Canvas IDs, internal row IDs,
user IDs, connection IDs, access tokens, URLs, raw errors, SQL messages, raw
Canvas payloads, submission bodies, comments, attachments, rubrics, grader
data, preview URLs, and unposted grade values.

## 16. Automated Test Coverage

- Normalization tests cover every canonical status, precedence, visible zero,
  visible empty grade string, hidden grade, no due-date handling, no due-date
  missing inference, submitted/late coexistence, lock behavior, malformed
  evidence, timezone-safe comparisons, duplicate rejection, ignored out-of-set
  submissions, visibility mapping, and deterministic fingerprints.
- Service tests cover successful selected-course sync, authorization failures
  before Canvas calls, overlap rejection before Canvas calls, assignment
  request failure, submission request failure after assignment success, summary
  failure after assignment success, storage failure, unchanged diagnostics, and
  privacy-safe result/log/persistence inputs.
- SQL verifier covers RPC metadata, grants, same-owner persistence,
  cross-user rejection, cross-course assignment rejection, duplicate input
  rejection, idempotent repeated snapshots, stable identities and first-sync
  timestamps, authoritative absence marking, visible-to-hidden replacement,
  sync-state transitions, overlap rejection, stale recovery, and rollback.

## 17. Validation Results

| Check | Result | Notes |
| --- | --- | --- |
| `npm --workspace apps/api run typecheck` | PASS | New service and tests typecheck. |
| Focused API tests | PASS | `npx vitest run src/lib/canvas-grade-sync-normalize.test.ts src/lib/canvas-grade-sync.test.ts`, 32 tests. |
| `npm --workspace apps/api run test` | PASS | 347 tests. |
| `npm --workspace apps/api run lint` | PASS | ESLint passed. |
| `npm --workspace apps/api run build` | PASS | Production build completed after lint cleanup. |
| `npm --workspace @stay-focused/db run typecheck` | PASS | DB type additions compile. |
| `npm --workspace @stay-focused/db run lint` | PASS | Package lint/typecheck passed. |
| `npm --workspace @stay-focused/db run build` | PASS | Build typecheck passed. |
| `npm --workspace @stay-focused/canvas run test` | PASS | 69 tests. |
| `npm --workspace @stay-focused/canvas run typecheck` | PASS | Canvas package typecheck passed. |
| `npm --workspace @stay-focused/canvas run lint` | PASS | Canvas package lint passed. |
| `npm --workspace @stay-focused/canvas run build` | PASS | Canvas package build passed. |
| `npm run typecheck` | PASS | 7/7 workspace tasks after API build regenerated Next generated types. |
| `npm run lint` | PASS | 7/7 workspace lint tasks. |
| `git diff --check` | PASS | Exit 0 with existing CRLF conversion warnings only. |
| `npx supabase db push --dry-run --linked` | BLOCKED | Supabase CLI reported no linked project ref in this checkout. |
| `npx supabase migration list --linked` | BLOCKED | `LegacyProjectNotLinkedError`: no linked project ref. |
| `npx supabase db query --linked --file scripts/phase5e3-grade-sync-verification.sql` | BLOCKED | `LegacyProjectNotLinkedError`: no linked project ref. |

## 18. Explicit Non-Implementation

Phase 5E.3 did not add public API routes, protected read models, mobile
services, mobile screens, dashboard/task views, background synchronization,
queues, cron, notifications, local grade calculation, weighted estimates,
What-If grades, submission actions, file uploads, comments, grade edits,
excusing assignments, late-policy mutation, rubric retrieval, instructor
feedback retrieval, submission body storage, submission attachments, quiz
attempts, peer reviews, external-tool launch content, reviewer generation, or
reviewer prompt integration.

## 19. Remaining Limitations

- The remote Supabase project is not linked in this checkout, so dry-run,
  migration listing, remote migration application, and remote SQL verifier were
  not run during implementation.
- Phase 5E.4 must add protected API route contracts before mobile can trigger
  or read grade synchronization.
- Phase 5E.5 must add mobile UI.
- Protected live end-to-end validation remains Phase 5E.6.

## 20. Git Result

Pending final commit and push from the implementation turn.

## 21. Verdict

Phase 5E.3 is implemented and locally validated, with remote database
verification remaining blocked by missing Supabase link configuration.
