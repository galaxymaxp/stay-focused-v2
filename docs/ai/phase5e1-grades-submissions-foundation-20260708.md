# Phase 5E.1 Grades and Submissions Foundation

Implementation date: 2026-07-08, Asia/Manila.

## 1. Starting Repository State

- Branch: `main`
- Starting commit: `5822d4a2337532d40524c5f46b9f1fa31b48b45a`
- Ahead/behind at start: `0/0` against `origin/main`
- Dirty files at start: `apps/api/next-env.d.ts`,
  `apps/mobile/expo-env.d.ts`, `apps/mobile/.gitignore`
- Unrelated files preserved: those three files were not edited, staged,
  formatted, or reverted.
- Planning input: `docs/ai/phase5e-grades-submissions-plan-20260708.md`

Current Supabase guidance checked before implementation:

- Supabase changelog entry for explicit grants and Data API exposure defaults.
- Supabase Row Level Security docs for RLS plus explicit grants.
- Supabase CLI docs/help for `migration list`, `db push`, `db query`,
  `db advisors`, and `migration repair`.

## 2. Files Changed

- `packages/db/migrations/202607080003_add_canvas_grades_submissions_foundation.sql`
- `packages/db/migrations/202607080004_harden_canvas_grade_trigger_search_path.sql`
- `packages/db/src/types.ts`
- `scripts/phase5e1-grades-submissions-verification.sql`
- `docs/ai/phase5e1-grades-submissions-foundation-20260708.md`
- `README.md`
- `docs/current-state.md`
- `docs/roadmap.md`
- `docs/ai/current_sprint.md`
- `docs/ai/handoff.md`

## 3. Migrations

`202607080003_add_canvas_grades_submissions_foundation.sql`

- Adds `canvas_assignment_submissions`.
- Adds `canvas_course_grade_summaries`.
- Adds `canvas_course_grade_sync_states`.
- Adds `canvas_assignments_id_user_connection_course_unique` so submission rows
  can enforce assignment ownership through a composite FK.
- Enables RLS, owner policies, direct client grant revocation, narrow
  `service_role` DML grants, indexes, constraints, and updated-at triggers.

`202607080004_harden_canvas_grade_trigger_search_path.sql`

- Replaces the three new trigger functions with pinned
  `search_path = public, pg_temp`.
- Reapplies function execute revocation for `public`, `anon`, and
  `authenticated`, with `service_role` execute.

## 4. Tables Added

| Table | Purpose | Primary identity | Ownership constraints | Uniqueness | Cascade behavior |
| --- | --- | --- | --- | --- | --- |
| `canvas_assignment_submissions` | Current read-only submission and visible assignment-grade state | `id uuid` | `(canvas_connection_id, user_id)`, `(course_id, user_id, canvas_connection_id)`, `(assignment_id, user_id, canvas_connection_id, course_id)` | `(user_id, canvas_connection_id, course_id, assignment_id)` | User, connection, course, and assignment deletes cascade |
| `canvas_course_grade_summaries` | Canvas-provided visible course-grade summary values only | `id uuid` | `(canvas_connection_id, user_id)`, `(course_id, user_id, canvas_connection_id)` | `(user_id, canvas_connection_id, course_id)` | User, connection, and course deletes cascade |
| `canvas_course_grade_sync_states` | Safe per-course Phase 5E freshness/sync state | `id uuid` | `(canvas_connection_id, user_id)`, `(course_id, user_id, canvas_connection_id)` | `(user_id, canvas_connection_id, course_id)` | User, connection, and course deletes cascade |

No assignment metadata fields such as `allowed_attempts`, hide-in-gradebook, or
manual-posting state were added. The Phase 5E parser contract is not finalized,
so those fields remain deferred.

## 5. Data Contracts

Normalized assignment statuses:

`unknown`, `excused`, `unavailable`, `locked`, `missing`, `graded_hidden`,
`graded`, `submitted_late`, `submitted`, `late_unsubmitted`, `available`,
`upcoming`, `no_due_date`.

Submission workflow states:

`submitted`, `unsubmitted`, `graded`, `pending_review`.

Late policy states:

`late`, `missing`, `extended`, `none`.

Grade and score visibility states:

`unknown`, `visible`, `hidden`, `unavailable`, `not_applicable`.

Grade sync statuses:

`never_synced`, `running`, `succeeded`, `partial`, `failed`.

Grade sync family states:

`not_started`, `succeeded`, `partial`, `failed`, `skipped`.

Grade sync failure categories:

`authentication_failure`, `permission_denied`, `resource_not_found`,
`rate_limited`, `server_error`, `network_error`, `timeout`,
`malformed_response`, `pagination_rejected`, `redirect_rejected`,
`persistence_failure`, `normalization_failure`, `partial_sync`, `unknown`.

## 6. Constraints And Privacy

- Attempts, seconds late, points possible, and aggregate counts are constrained
  to non-negative values.
- Numeric score fields reject non-finite values and are bounded.
- Grade text is bounded to 120 characters.
- Fingerprints follow the existing Canvas table convention: non-blank text up
  to 128 characters.
- Stored score or grade values are allowed only when the matching visibility
  state is `visible`.
- Hidden, unknown, unavailable, and not-applicable states do not store hidden
  grade values.
- No local grade calculation, weighted estimate, What-If value, or unposted
  grade payload is stored.
- No submission body, comments, attachments, rubric assessment, grader
  identity, preview URL, raw Canvas JSON, Canvas response payload, anonymous
  grading metadata, or submitted file fields were added.

## 7. RLS And Grants

For all three tables:

- RLS is enabled.
- Four owner-scoped defense-in-depth policies exist for `authenticated`.
- Direct DML grants to `public`, `anon`, and `authenticated` are revoked.
- `service_role` has only `select`, `insert`, `update`, and `delete`.
- Trigger functions are not executable by `public`, `anon`, or
  `authenticated`.
- Direct authenticated read and mutation attempts are denied by the verifier.

## 8. SQL Verifier

`scripts/phase5e1-grades-submissions-verification.sql` is rollback-safe and
uses only fictional data.

It verifies:

- Tables, columns, types, nullability, indexes, constraints, policies, RLS, and
  grants.
- Allowed status/visibility contracts reject unsupported values.
- Non-negative constraints reject invalid values.
- Visibility consistency rejects hidden stored scores.
- Duplicate current-state rows are rejected.
- Cross-user connection, cross-user course, and cross-course assignment writes
  are rejected by FKs.
- Assignment, course, connection, and user deletes cascade safely.
- Direct `authenticated` access is unavailable.
- `service_role` access works.
- Privacy-sensitive columns are absent.
- All fictional rows are rolled back.

## 9. Validation Results

| Check | Command or method | Result | Notes |
| --- | --- | --- | --- |
| DB typecheck | `npm --workspace @stay-focused/db run typecheck` | PASS | Ran after type edits and after verifier hardening |
| DB build | `npm --workspace @stay-focused/db run build` | PASS | TypeScript declaration/build output succeeded |
| Migration dry-run | `npx supabase db push --dry-run --linked` | PASS | Final dry-run reports the remote database is up to date |
| Remote migration apply | Supabase connector for `202607080003`; CLI `db push` for `202607080004` | PASS | Connector initially wrote generated history version `20260707235803`; CLI repair marked it reverted and marked `202607080003` applied |
| Migration history | `npx supabase migration list --linked` | PASS | Local and remote aligned through `202607080004` |
| SQL verifier | `npx supabase db query --linked --file scripts/phase5e1-grades-submissions-verification.sql` | PASS | All checks passed; transaction rolled back |
| Fictional cleanup | Linked SQL count query | PASS | 0 fictional users, submissions, summaries, and sync states remain |
| Focused RLS/grants query | Linked SQL query | PASS | RLS true, 4 policies each, no direct client select, service-role DML true |
| Security advisors | `npx supabase db advisors --linked --type security --level warn --fail-on none` | PASS with existing warnings | No new Phase 5E trigger-function warning after `202607080004`; remaining warnings pre-existed |
| Performance advisors | `npx supabase db advisors --linked --type performance --level warn --fail-on none` | PASS with existing warnings | Remaining warnings are old `reviewers` RLS initplan items |
| Whitespace | `git diff --check` | PASS | Only existing CRLF warnings for generated files/types |

## 10. Remote Verification

- Target project was confirmed through the existing linked Supabase workdir.
- Remote migration history now includes `202607080003` and `202607080004`.
- The three new tables exist remotely.
- RLS, policies, grants, ownership FKs, uniqueness, privacy exclusions, and
  cascades passed the rollback-safe verifier.
- No fictional verification rows remain.
- Supabase advisors were reviewed. The new Phase 5E trigger functions were
  hardened; remaining advisor warnings are pre-existing and outside Phase 5E.1.

## 11. Explicit Exclusions

No Canvas data was fetched. No grades or submissions were imported.

This phase did not add:

- Canvas client methods
- Canvas HTTP requests
- synchronization services
- API routes
- mobile services or screens
- notifications
- cron, queues, or background jobs
- local grade calculation or weighted estimates
- What-If grades
- assignment submission, uploads, comments, grading, excusing, or late-policy
  edits
- reviewer generation or reviewer prompt integration
- durable mobile caching

## 12. Remaining Limitations

- The schema is ready for future service-role persistence, but no persistence
  RPC or sync service exists yet.
- Phase 5E.2 must add read-only Canvas client/parser support before any data
  can be normalized into these tables.
- Grade display APIs and mobile UI remain unimplemented.
- Existing non-Phase-5E Supabase advisor warnings remain documented but were
  not changed in this bounded task.

## 13. Git Result

- Commit message: `feat(canvas): add grades and submissions data foundation`
- Push target: `origin/main`
- Final commit SHA and push result are recorded in the Codex final response.

## 14. Verdict

Phase 5E.1 is complete because implementation, local validation, remote
migration application, migration-history alignment, rollback-safe SQL
verification, and security checks passed.

Next task: Phase 5E.2 - Canvas assignment/submission client support.
