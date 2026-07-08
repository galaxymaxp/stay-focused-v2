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

## 22. Remote Verification Condition Closure

Closure date: 2026-07-08, Asia/Manila.

Previous blocking condition: the earlier run could not execute linked Supabase
checks because this checkout had no linked project ref and the CLI returned
`LegacyProjectNotLinkedError`.

Starting repository state:

- Branch: `main`
- Starting commit: `d033436`
- Ahead/behind at start: `0/0` against `origin/main`
- Dirty files at start: `apps/api/next-env.d.ts`,
  `apps/mobile/expo-env.d.ts`, and `apps/mobile/.gitignore`
- Unrelated files preserved: those three files were not edited, staged,
  formatted, or reverted.

Supabase linking:

- Restored through an ignored temporary Supabase CLI workdir populated from the
  canonical `packages/db/migrations` tree.
- Correct existing project confirmed from ignored local Supabase configuration
  and matching local Supabase URL shape.
- No new Supabase project was created.
- No project ref, database password, access token, service-role key,
  connection string, or environment value was committed or recorded here.

Migration verification and application:

| Check | Result | Notes |
| --- | --- | --- |
| Pre-application migration history | PASS | Local and remote histories matched through `202607080004`; `202607080005` was pending remotely; no unexplained remote-only migrations or earlier unapplied local migrations were present. |
| Initial dry run | PASS | Proposed only `202607080005_add_canvas_grade_sync_rpcs.sql`. |
| Migration apply | PASS | Applied `202607080005_add_canvas_grade_sync_rpcs.sql` remotely. |
| Post-application migration history | PASS | Remote history included `202607080005`. |
| Initial final dry run | PASS | Remote database was up to date after `202607080005`. |
| Repair dry run | PASS | Proposed only `202607080006_harden_canvas_grade_sync_rpc_function_references.sql`. |
| Repair migration apply | PASS | Applied `202607080006` remotely. |
| Final migration history | PASS | Local and remote histories matched through `202607080006`. |
| Final dry run | PASS | Remote database is up to date. |

The Supabase CLI emitted the known non-fatal Docker catalog-cache warning after
both remote pushes. Migration application completed successfully despite that
local Docker cache warning.

RPC inventory:

| Function | Signature | Return type |
| --- | --- | --- |
| `begin_canvas_course_grade_sync` | `(uuid, uuid, uuid, timestamptz, integer)` | `SETOF canvas_course_grade_sync_states` |
| `replace_canvas_course_assignment_submission_snapshot` | `(uuid, uuid, uuid, timestamptz, jsonb, text, text)` | `TABLE(assignments_inserted integer, assignments_updated integer, assignments_unchanged integer, assignments_marked_absent integer, persisted_count integer)` |
| `upsert_canvas_course_grade_summary` | `(uuid, uuid, uuid, timestamptz, jsonb)` | `TABLE(summaries_inserted integer, summaries_updated integer, summaries_unchanged integer, visible_field_count integer)` |
| `finish_canvas_course_grade_sync` | `(uuid, uuid, uuid, timestamptz, text, text, text, text, integer, integer, integer, text, text, text, text)` | `SETOF canvas_course_grade_sync_states` |

Remote RPC security verification queried PostgreSQL catalogs (`pg_proc`,
`pg_namespace`, function definitions, ACLs, and effective function privileges):

| Function | Owner | Security mode | Search path | Public | Anon | Authenticated | Service role | Result |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `begin_canvas_course_grade_sync` | `postgres` | `security definer` | `public, pg_temp` | no execute | no execute | no execute | execute | PASS |
| `replace_canvas_course_assignment_submission_snapshot` | `postgres` | `security definer` | `public, pg_temp` | no execute | no execute | no execute | execute | PASS |
| `upsert_canvas_course_grade_summary` | `postgres` | `security definer` | `public, pg_temp` | no execute | no execute | no execute | execute | PASS |
| `finish_canvas_course_grade_sync` | `postgres` | `security definer` | `public, pg_temp` | no execute | no execute | no execute | execute | PASS |

Additional RPC checks:

- No unexpected overload exists for any Phase 5E.3 RPC.
- No callable public, anon, or authenticated variant exists.
- `anon` and `authenticated` role-call probes failed before function-body
  dispatch with permission denial.
- `service_role` executed the begin, replace, upsert, and finish RPC sequence
  successfully against rollback-only fictional rows.
- RPC definitions contain no dynamic SQL and do not use raw `sqlerrm` or
  `sqlstate` output.
- Phase 5E.3 table references are schema-qualified.
- Repair migration `202607080006` qualified the pgcrypto call as
  `extensions.digest(...)` in
  `replace_canvas_course_assignment_submission_snapshot`.

Remote table security verification:

- RLS remains enabled on `canvas_assignment_submissions`,
  `canvas_course_grade_summaries`, and `canvas_course_grade_sync_states`.
- `public`, `anon`, and `authenticated` have no direct `select`, `insert`,
  `update`, or `delete` privilege on those tables.
- `service_role` has only the intended `select`, `insert`, `update`, and
  `delete` privileges on those tables; it does not have `truncate`,
  `references`, or `trigger`.
- Composite ownership FKs remain present for connection/user, course/user/
  connection, and assignment/user/connection/course relationships.
- Uniqueness constraints remain present for one current submission row per
  assignment, one grade summary per course, and one sync-state row per course.
- Catalog checks found no raw submission body, comment, attachment payload,
  rubric assessment, grader identity, preview URL, raw JSON payload, or
  unposted-grade storage column.

Rollback-safe SQL verifier:

- Script: `scripts/phase5e3-grade-sync-verification.sql`
- Check count: 17
- Result: PASS, 17/17 checks passed
- Rollback result: PASS
- Fictional cleanup result: PASS, zero fictional verifier rows remained in
  `auth.users`, `canvas_connections`, `canvas_courses`,
  `canvas_course_sync_preferences`, `canvas_assignments`,
  `canvas_assignment_submissions`, `canvas_course_grade_summaries`, and
  `canvas_course_grade_sync_states`.

Verifier coverage included same-owner persistence, cross-user rejection,
cross-course assignment rejection, duplicate assignment rejection, idempotent
snapshot persistence, stable row identity and `first_synced_at`,
authoritative absence marking, visible-to-hidden replacement, begin/finish sync
state transitions, overlap rejection, stale running recovery, failed-run
cleanup, service-role execute, public/anon/authenticated execute denial, and
schema-qualified Phase 5E.3 RPC function references.

Advisor review:

| Advisor | Result | Classification |
| --- | --- | --- |
| Security advisors | PASS with warnings | No new Phase 5E.3/5E.3A blockers. Remaining warnings are historical mutable-search-path functions, public `rls_auto_enable()` execute posture, and disabled leaked-password protection. |
| Performance advisors | PASS with warnings | No new Phase 5E.3/5E.3A blockers. Remaining warnings are historical `reviewers` RLS init-plan items. |

Repair:

- Repair required: yes.
- Defect: `replace_canvas_course_assignment_submission_snapshot` contained an
  unqualified `digest(...)` function call inside a security-definer RPC.
- Impact: remote catalog verification showed the RPC did not satisfy the
  Phase 5E.3A requirement that function references be schema-qualified.
- Repair: added forward-only migration
  `202607080006_harden_canvas_grade_sync_rpc_function_references.sql` to
  qualify the call as `extensions.digest(...)` and reassert service-role-only
  execute grants.
- Verifier update: `scripts/phase5e3-grade-sync-verification.sql` now checks
  that Phase 5E.3 RPC function references are schema-qualified.
- Verification result: PASS after applying `202607080006` remotely.

Local regression verification:

| Command | Result | Notes |
| --- | --- | --- |
| `npm --workspace apps/api run typecheck` | PASS | API TypeScript check passed. |
| `npm --workspace apps/api run test` | PASS | 347 API tests passed. |
| Focused Phase 5E.3 tests | PASS | `npx vitest run src/lib/canvas-grade-sync-normalize.test.ts src/lib/canvas-grade-sync.test.ts`, 32 tests. |
| `npm --workspace @stay-focused/db run typecheck` | PASS | DB package typecheck passed. |
| `npm --workspace @stay-focused/canvas run test` | PASS | 69 Canvas tests passed. |
| `npm --workspace apps/api run lint` | PASS | API ESLint passed. |
| `npm --workspace apps/api run build` | PASS | Next production build passed. |
| `npm run lint` | PASS | 7/7 workspace lint tasks passed. |
| `npm run typecheck` | PASS | Final rerun passed 7/7 workspace typecheck tasks; an earlier concurrent run failed while `apps/api` build was regenerating `.next/types`. |
| `git diff --check` | PASS | Exit 0 with existing CRLF conversion warnings only. |

Explicit non-execution:

- No Canvas request ran.
- No Canvas PAT was decrypted.
- No real grade synchronization ran.
- No public API route, mobile code, notification, background job, local grade
  calculation, submission mutation, or reviewer integration was added.

Final Phase 5E.3 verdict:

```text
PASS - Phase 5E.3 remote verification condition is closed
```

Phase 5E.3 is complete and remotely verified. Migration `202607080005` is
applied remotely, repair migration `202607080006` is applied remotely, RPC
execution is service-role-only, RLS and direct table grants remain hardened, the
rollback-safe verifier passed, no fictional rows remain, no Canvas call or real
academic-data synchronization occurred, and Phase 5E.4 is next.
