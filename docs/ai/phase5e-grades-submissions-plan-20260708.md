# Phase 5E Grades and Submissions Planning Report

Planning date: 2026-07-08, Asia/Manila.

This is a planning and readiness audit only. No Phase 5E migrations, Canvas
requests, API routes, mobile screens, submission actions, jobs, queues,
notifications, or source-code changes were implemented.

External Canvas references checked, official Instructure documentation only:

- [Assignments API](https://developerdocs.instructure.com/services/canvas/resources/assignments)
- [Submissions API](https://developerdocs.instructure.com/services/canvas/resources/submissions)
- [Enrollments API](https://developerdocs.instructure.com/services/canvas/resources/enrollments)
- [Courses API](https://developerdocs.instructure.com/services/canvas/resources/courses)
- [Assignment Groups API](https://developerdocs.instructure.com/services/canvas/resources/assignment_groups)

## 1. Starting state

* Branch: `main`
* Starting commit: `2f9f0a4`
* Ahead/behind: `main...origin/main`, no ahead/behind markers
* Dirty files: `apps/api/next-env.d.ts`, `apps/mobile/expo-env.d.ts`, `apps/mobile/.gitignore`
* Phase 5D status: complete and protected-live validated through Phase 5D.3
* Unrelated files preserved: `apps/api/next-env.d.ts`, `apps/mobile/expo-env.d.ts`, `apps/mobile/.gitignore`

## 2. Existing repository capabilities

| Area | Current capability | Reusable for Phase 5E | Gap |
| ---- | ------------------ | --------------------- | --- |
| Canvas connection | Per-user PAT connection, encrypted server-side token storage, capability probes, disconnect, strict URL/token handling | Use the same bearer-auth and API-only decryption boundary | No OAuth yet; grade/submission capabilities are currently mostly `not_tested` |
| Canvas client | Typed course, inventory, modules, module items, Pages, assignment groups, assignments, planner items, announcements, files, and downloads | Pagination, redirect rejection, normalized errors, retries through sync wrapper | No submission, total-score course include, or enrollment grade normalizers |
| Canvas assignments | `canvas_assignments` stores title, HTML description, group, points, grading type, submission types, due/unlock/lock dates, publish/mute/omit flags, quiz/discussion ids | Assignment rows are the natural parent for student submission state | No student submission row, grade visibility state, allowed attempts, post policy, or hide-in-gradebook field |
| Assignment groups | `canvas_assignment_groups` stores group weight and rules JSON | Can store visible weights/drop rules as Canvas metadata | Not enough for local grade calculation without broader grading-period/drop/hidden-grade logic |
| Planner items | `canvas_planner_items` stores due/planner dates and coarse submission booleans | Useful notification-readiness precedent and status hints | Not authoritative enough for scores, attempts, workflow state, grade display, or hidden-grade semantics |
| Sync orchestration | Manual account sync and selected-course sync, bounded concurrency, sanitized failures, retries, idempotent fingerprints, service-role RPC persistence | Phase 5E should reuse explicit selected-course sync style | Current course sync is source/content oriented and should not be overloaded with grade privacy assumptions |
| Database security | Canvas graph tables use `user_id`, `canvas_connection_id`, course FKs, RLS, direct grant revocation, service-role writes | Same ownership model should protect grades and submissions | New grade tables need their own RLS, grant, FK, uniqueness, and verifier coverage |
| API routes | Protected Canvas routes use `requireCanvasAuth`, no-store responses, sanitized errors, bounded JSON bodies | Same route shape fits read-only grade read routes and explicit sync route | No grade/submission read contracts or sync route yet |
| Mobile Courses | Current Courses screen connects Canvas, selects courses, syncs selected courses, opens Canvas reviewer flow | Natural entry point for a per-course grades/submissions surface | No course detail, dashboard, task, schedule, grade, or notification screen |
| Mobile parsing | `canvasApi.ts` has strict response parsers and unsafe-field rejection patterns | Reuse for grade/submission DTOs | No grade/submission parser contracts yet |
| Study Library | User-owned reviewer persistence, Canvas provenance, source-status readiness | Security and source-status patterns are reusable conceptually | Grades must remain separate from reviewer prompts and snapshots |
| Tasks/schedule/notifications | No task, schedule, calendar-planning, or notification delivery model exists | Planner fields can inform future design | Notification delivery and task generation remain deferred |
| Offline persistence | Mobile stores auth session in `expo-secure-store`; Canvas API data is not durably cached | Server DB-synchronized data can be read without calling Canvas | No bulk local cache, invalidation, or logout cleanup for grade data exists |

## 3. Existing roadmap findings

| Requirement | Status | Source document | Recommendation |
| ----------- | ------ | --------------- | -------------- |
| Phase 5E planning is next | Explicit active state | `README.md`, `docs/current-state.md`, `docs/roadmap.md`, `docs/ai/current_sprint.md`, `docs/ai/handoff.md` | Treat this audit as the close of planning; implementation has not started |
| Grades and submissions are Phase 5E | Explicit approved phase | `docs/roadmap.md`, `docs/canvas/canvas-source-capability-matrix.md` | Include read-only visible assignment/submission/grade state |
| Rubrics and feedback are in broad Phase 5E | Explicit broad roadmap item | `docs/roadmap.md`, `docs/canvas/canvas-source-capability-matrix.md`, ADR-009 | Defer from MVP; they are sensitive and need separate UX/security work |
| Current and final course score | Explicit broad Phase 5E item | `docs/roadmap.md`, Canvas matrix | Include only Canvas-provided visible values; do not locally calculate |
| Assignment-group weights/drop rules | Explicit broad Phase 5E data | `docs/roadmap.md`, Canvas matrix | Store as metadata, but do not use for estimates in MVP |
| Missing/late/excused | Explicit Phase 5E status fields | `docs/roadmap.md`, Canvas matrix | Include as Canvas-evidence-backed submission fields |
| Notifications | Deferred repeatedly | `README.md`, `docs/current-state.md`, `docs/roadmap.md`, `docs/ai/current_sprint.md` | Store notification-ready fields, but keep delivery deferred |
| Background sync, queues, cron | Deferred Phase 5F | `docs/roadmap.md`, current-state docs | Keep Phase 5E explicit/manual only |
| Grade planner and what-if grades | Future phase | `docs/roadmap.md`, ADR-009 | Exclude from Phase 5E MVP |
| Submission actions | Not approved | Safety boundary, Submissions API mutation docs | Exclude submitting, uploads, comments, grading, excusing, and late-policy edits |

## 4. Canvas data coverage

| Data category | Existing model | Existing sync | Needed | Recommendation |
| ------------- | -------------: | ------------: | -----: | -------------- |
| Assignments | Yes: `canvas_assignments` | Yes, selected-course sync | Yes | Reuse and minimally extend only if Phase 5E needs fields absent from current table |
| Assignment groups | Yes: `canvas_assignment_groups` | Yes | Yes | Reuse for display metadata and future planner inputs; no local weighted estimates |
| Modules | Yes | Yes | No | Keep separate; useful context only |
| Module items | Yes | Yes | No | Keep separate; no Phase 5E dependency |
| Course enrollments | Partial Canvas type only; no DB table | Course inventory includes limited enrollment/section metadata, not grades | Optional for visible course grade | Add course grade summary table from Canvas-provided visible grade fields only |
| Student submissions | No authoritative table | No | Yes | Add one server-controlled table keyed to assignment/course/user |
| Submission status | Planner booleans only | Planner sync only | Yes | Store workflow state and normalized status from submission evidence |
| Attempt number | No | No | Yes | Store nullable attempt count from submissions |
| Submitted timestamp | No | No | Yes | Store nullable `submitted_at` |
| Graded timestamp | No | No | Yes | Store nullable `graded_at` when returned |
| Workflow state | No true submission table | No | Yes | Store raw allowlisted Canvas workflow state plus normalized status |
| Late status | Planner boolean only | Planner sync only | Yes | Store from submission response; allow coexistence with submitted/graded |
| Missing status | Planner boolean only | Planner sync only | Yes | Store from submission response; do not infer from due date alone |
| Excused status | Planner boolean only | Planner sync only | Yes | Store from submission response; highest UI precedence |
| Score | No | No | Yes, if visible | Store visible score with field-presence/visibility state |
| Points possible | Yes | Yes | Yes | Reuse assignment field |
| Grade display | No | No | Yes, if visible | Store visible `grade` separately from numeric score |
| Grading type | Yes | Yes | Yes | Reuse assignment field |
| Due date | Yes | Yes | Yes | Reuse assignment field; avoid local missing inference without Canvas evidence |
| Lock date | Yes | Yes | Yes | Reuse for availability labels |
| Unlock date | Yes | Yes | Yes | Reuse for availability labels |
| Availability | Partial: published/unlock/lock, file states | Partial | Yes | Compute conservative `locked`/`unavailable` summaries from assignment and submission visibility |
| Feedback/comments | No | No | No for MVP | Defer; sensitive content and prompt-separation risk |
| Rubric data | No | No | No for MVP | Defer; broad roadmap but not needed for safe first slice |
| Attachments | File metadata exists for Canvas source files, not submission attachments | File inventory only | No for MVP | Defer; do not download submitted work |
| External-tool submissions | Assignment `submission_types` only | Assignment sync only | Status only | Display type/status only; do not launch or inspect tool content |
| Quiz-specific state | Assignment `quiz_id` and `online_quiz` type only | Assignment sync only | Status only | Display as Canvas/quiz item with Canvas-provided submission state; defer attempts/details |

## 5. Canvas endpoint plan

| Endpoint family | Purpose | Permission | Pagination | Sensitive fields | Target subphase |
| --------------- | ------- | ---------- | ---------- | ---------------- | --------------- |
| `GET /api/v1/courses/:course_id/assignments` | Refresh assignment metadata; can include current user's submission if `include[]=submission` is used | Assignment visibility for connected user | Yes | HTML description, Canvas IDs, URLs, rubric and override fields if included | 5E.2 |
| `GET /api/v1/courses/:course_id/students/submissions` | Preferred bulk read of calling user's submissions across assignments; omit `student_ids[]` so students can only get their own submissions | Submission visibility for current user | Yes | Body text, URLs, comments, attachments, user IDs, grader IDs, rubric data | 5E.2 |
| `GET /api/v1/courses` with `include[]=total_scores` or selected course equivalent | Optional Canvas-provided course grade summary | Grade visibility; ignored if final grades hidden | Yes for course list | Current/final score/grade, unposted values, enrollment data | 5E.2/5E.3 |
| `GET /api/v1/courses/:course_id/enrollments?user_id=self` | Fallback or verification for own enrollment grade object when needed | Own enrollment visibility and grade visibility | Yes | Enrollment IDs, grade URLs, hidden/unposted grade fields | 5E.2/5E.3 |
| `GET /api/v1/courses/:course_id/assignment_groups` | Existing endpoint for weights/rules metadata | Assignment group visibility | Yes | Group weights, drop rules | Existing/5E.3 |

Assignment responses can include the current user's submission when `submission`
is included, but the Phase 5E recommendation is to keep assignment metadata and
submission state as separate client methods and database records. Separate
submission requests give clearer pagination, partial-failure, and privacy
boundaries.

Grade data does not require enrollment data for per-assignment visible scores,
but Canvas-provided course grade summaries generally come through course
`total_scores` includes or enrollment grade objects. Fields may be absent when
the institution hides final grades, uses manual posting, has not graded the
assignment, restricts permissions, or omits optional response fields.

Never expose raw Canvas user IDs, grader IDs, preview URLs, submission bodies,
submission comments, rubric assessments, attachment details, anonymous-grading
metadata, unposted grade values, or raw response JSON directly to mobile in
the MVP.

## 6. Phase 5E product boundary

| Capability | Include | Defer | Reason |
| ---------- | ------: | ----: | ------ |
| Read-only assignment title | Yes | No | Required context for a student-facing list |
| Course association | Yes | No | Required for ownership and navigation |
| Due date | Yes | No | Already synchronized and needed for status/order |
| Availability window | Yes | No | Existing unlock/lock fields support conservative labels |
| Points possible | Yes | No | Already synchronized and needed beside visible scores |
| Submission status | Yes | No | Core Phase 5E value |
| Submitted timestamp | Yes | No | Core student-visible state |
| Attempt count | Yes | No | Useful and low-risk when Canvas returns it |
| Missing status | Yes | No | Must come from Canvas evidence, not local inference |
| Late status | Yes | No | Can coexist with submitted/graded |
| Excused status | Yes | No | Must override missing/late completion concerns |
| Score when visible | Yes | No | Only if Canvas returns a visible value |
| Grade when visible | Yes | No | Display Canvas-provided grade string only |
| Grading type | Yes | No | Already synchronized; needed to interpret score display |
| Locked/unavailable state | Yes | No | Needed to avoid misleading "missing" labels |
| Last synchronized timestamp | Yes | No | Required for stale/partial/unknown labels |
| Canvas-provided course current/final grade | Yes, conditional | No | Show only when Canvas returns visible values |
| Instructor comments | No | Yes | Sensitive feedback; needs separate consent and UX |
| Rubric details/assessments | No | Yes | Sensitive and can be large/ambiguous |
| Submission attachments/downloads | No | Yes | Avoid private submitted-content storage and downloads |
| File downloads from submissions | No | Yes | Not required for grades/status |
| External-tool launch data | No | Yes | Tool content is separate and permission-dependent |
| Quiz attempts/questions | No | Yes | Quiz APIs and visibility vary widely |
| Peer reviews | No | Yes | Separate workflow and visibility model |
| Group assignment details | Basic status only | Yes | Group membership/comment behavior needs separate handling |
| Anonymous/moderated grading metadata | No | Yes | Not student-useful in MVP and privacy-sensitive |
| Grade-change history | No | Yes | Not needed for current state; high privacy cost |
| Assignment submission from Stay Focused | No | Yes | Outside safety boundary |
| Notifications | No | Yes | Delivery belongs later |
| Background sync | No | Yes | Phase 5F |

## 7. Canonical status model

| Internal state | Evidence | Precedence | Mobile meaning |
| -------------- | -------- | ---------: | -------------- |
| `unknown` | No successful Phase 5E sync, stale/partial evidence, omitted required fields, or unsupported state | 1 when evidence is insufficient | Stay Focused cannot safely state the status |
| `excused` | Submission `excused=true` or equivalent visible Canvas status | 2 | This work does not need completion for the student |
| `unavailable` | Assignment not visible, Canvas says assignment is not visible, or authoritative sync removed it | 3 | The item cannot currently be inspected in Stay Focused |
| `locked` | Lock/unlock window says inaccessible and no overriding submission evidence | 4 | The item is not currently open |
| `missing` | Canvas submission status/late policy evidence says missing | 5 | Canvas marks the item missing |
| `graded_hidden` | Canvas indicates graded/workflow graded but score/grade fields are absent or hidden | 6 | Graded, but grade is not visible here |
| `graded` | Workflow/state or visible score/grade evidence says graded | 7 | A visible grade/score is available |
| `submitted_late` | Submission exists and `late=true` | 8 | Submitted after the applicable due date |
| `submitted` | `submitted_at` or workflow `submitted`/attempt evidence | 9 | Submitted, not visibly late/missing |
| `late_unsubmitted` | Canvas says `late=true` without submitted evidence and not missing | 10 | Canvas marks it late, but submission evidence is incomplete |
| `available` | Assignment is published/open and no submission/grade/problem evidence | 11 | Available to work on or inspect |
| `upcoming` | Due/unlock date is in the future and no submission/grade/problem evidence | 12 | Coming up later |
| `no_due_date` | No due date and no submission/grade/problem evidence | 13 | No Canvas due date is available |

Status rules:

- `late` and `submitted` can coexist; mobile should show `submitted_late`.
- `missing` can theoretically coexist with other Canvas evidence. The MVP must not "fix" it locally; if Canvas says missing and not excused, show missing with an evidence note.
- `excused` takes precedence over missing, late, and score absence.
- Assignments without due dates must not become missing from local time rules.
- Hidden grades are not zero, not ungraded, and not failed; show `graded_hidden` or `unknown`.
- Partial sync means missing/deleted/unavailable claims are unsafe unless the relevant course and submission snapshot completed authoritatively.
- External-tool and quiz items can show Canvas-provided status but must not claim unsupported internal details.
- Deleted or unpublished assignments become `unavailable` only after authoritative successful sync evidence; otherwise `unknown`.

Example transitions:

| From | Evidence | To |
| ---- | -------- | -- |
| `unknown` | First complete Phase 5E sync returns assignment without submission | `available`, `upcoming`, or `no_due_date` |
| `available` | Canvas returns `submitted_at` and attempt | `submitted` |
| `submitted` | Canvas returns `late=true` | `submitted_late` |
| `submitted_late` | Canvas returns visible score/grade | `graded` |
| `graded` | Canvas hides grade on later sync | `graded_hidden` |
| `missing` | Canvas later returns `excused=true` | `excused` |
| Any non-excused state | Latest relevant sync is partial/failed/stale | `unknown` for claims requiring fresh evidence |

Rules for `unknown`:

- Use when no Phase 5E sync has ever completed for the course.
- Use when Canvas omits fields needed to distinguish hidden, ungraded, and not supported.
- Use when latest sync failed before the relevant assignment/submission family.
- Use when local data is older than the chosen stale threshold.
- Use instead of `missing` when absence is based only on partial sync or due-date math.

## 8. Proposed database model

| Table or extension | Purpose | Ownership | Key constraints | RLS/grants |
| ------------------ | ------- | --------- | --------------- | ---------- |
| Extend `canvas_assignments` | Keep assignment metadata needed for grade UI, possibly `allowed_attempts`, `hide_in_gradebook`, `post_manually`, and field-presence metadata if returned | Existing `user_id`, `canvas_connection_id`, `course_id` | Existing unique `(course_id, canvas_assignment_id)`; preserve non-negative points | Existing RLS; direct grants remain revoked; service-role writes |
| `canvas_assignment_submissions` | Current read-only student submission and visible assignment-grade state | `user_id`, `canvas_connection_id`, `course_id`, `assignment_id` | Unique `(assignment_id, user_id)` or `(user_id, canvas_connection_id, course_id, canvas_assignment_id)`; FK to owned assignment/course/connection | RLS owner policies; revoke `anon`/`authenticated` direct grants; service-role write/read for API |
| `canvas_course_grade_summaries` | Optional Canvas-provided visible current/final course grade values | `user_id`, `canvas_connection_id`, `course_id` | Unique `(user_id, canvas_connection_id, course_id)`; no local calculated values | Same service-role-only posture; API returns safe display subset |
| `canvas_course_grade_sync_states` | Per-course Phase 5E freshness, partial/failure metadata, authoritative window, and stale labels | `user_id`, `canvas_connection_id`, `course_id` | Unique `(user_id, canvas_connection_id, course_id)`; failure codes allowlisted | Same service-role-only posture; API exposes sanitized state |
| Optional `canvas_grade_sync_runs` | Historical explicit sync runs if existing `canvas_sync_runs` should stay academic-graph-only | `user_id`, `canvas_connection_id`, optional `course_id` | One running grade sync per course; sanitized resource counts | Service-role-only; direct grants revoked |

Recommended `canvas_assignment_submissions` fields:

| Field group | Proposed fields |
| ----------- | --------------- |
| Identity | `id`, `user_id`, `canvas_connection_id`, `course_id`, `assignment_id`, `canvas_assignment_id`, optional internal-only `canvas_submission_user_id` |
| Status | `workflow_state`, `normalized_status`, `submitted_at`, `graded_at`, `posted_at`, `attempt`, `submission_type`, `grade_matches_current_submission` |
| Flags | `late`, `missing`, `excused`, `assignment_visible`, `late_policy_status`, `seconds_late` |
| Visible grade | `score`, `grade`, `score_state`, `grade_state`, `points_possible_at_sync` |
| Sync | `first_synced_at`, `last_synced_at`, `last_seen_at`, `absent_after_sync_at`, `source_fingerprint` |

Raw Canvas payload storage is not recommended. The repository pattern is typed,
normalized, allowlisted data plus sanitized diagnostics. Raw submission JSON can
contain private bodies, comments, URLs, user/grader IDs, attachments, and rubric
data that the MVP does not need.

Deletion behavior:

- Canvas disconnect cascades synchronized academic and grade records through
  connection ownership.
- User deletion cascades all grade/submission rows.
- Assignment row deletion cascades submission rows only after authoritative
  existing academic sync rules remove the assignment.
- Submission absence after complete Phase 5E sync should set
  `absent_after_sync_at` or remove the row through an authoritative scoped RPC;
  partial sync must not prune.
- Retention follows synchronized Canvas data retention until disconnect/account
  deletion; no separate grade-history retention in MVP.

## 9. Synchronization design

| Concern | Phase 5E behavior | Deferred Phase 5F behavior |
| ------- | ----------------- | -------------------------- |
| Trigger | Explicit per-selected-course sync only | Background, scheduled, queued, or app-launch sync |
| Canvas calls | Only the explicit sync route calls Canvas | Worker/queue orchestration |
| Read routes | DB-only synchronized state | Optional cache warming/read repair |
| Initial sync | Fetch assignment metadata, own submissions, optional visible course grade summary, then persist atomically per course/family | Multi-course resumable batches |
| Incremental sync | Support idempotent full refresh first; optionally use `submitted_since`/`graded_since` only after baseline correctness | True resumable checkpoints and delta strategy |
| Pagination | Use existing `requestPaginatedJson` with max pages and cross-origin next-link rejection | Larger-account pagination checkpoints |
| Retries | Reuse bounded retry policy and `Retry-After` cap | More robust job-level retry/backoff |
| Rate limits | Return sanitized `canvas_rate_limited`; preserve existing data | Queue pacing and adaptive throttling |
| Partial course failure | Persist completed independent family only if authoritative; label partial | Resume failed family later |
| Idempotency | Upsert by stable assignment/submission identity; fingerprint normalized payloads | Fine-grained per-item idempotency |
| Stale data | Expose `lastSuccessfulSyncAt`, `lastCheckedAt`, stale label | Background refresh and stale notification rules |
| Deletion/disappearance | Prune/mark absent only after complete authoritative snapshot for that family | Item-level tombstones and recovery |
| Grade visibility changes | Null visible grade fields and set state to hidden/unavailable when Canvas omits them | Historical visibility audit if needed |
| Submission updates | Replace current state; do not store full attempt history | Attempt history if a future product needs it |
| Manual refresh | Button per course; no automatic notification | Scheduled refresh/focus windows |
| Observability | Counts and safe failure codes only; no names, grades, titles, IDs, comments, or raw payloads in logs | Job dashboards with opaque ids |

State meanings:

| State | Meaning |
| ----- | ------- |
| Authoritative successful sync | Assignment and submission families completed and persistence succeeded |
| Partial sync | One family failed; preserved prior data and labeled affected summaries unknown/stale |
| Failed sync | No authoritative Phase 5E update for that course |
| Old sync | Last successful sync exists but is beyond stale threshold |
| Never synchronized | No Phase 5E state rows exist for the course |

## 10. API plan

| Method and route | Purpose | Canvas call or DB-only | Authorization | Response boundary |
| ---------------- | ------- | ---------------------- | ------------- | ----------------- |
| `POST /api/canvas/courses/:courseId/grades/sync` | Explicit Phase 5E sync for one selected owned course | Canvas call | Bearer auth, owned connection, selected course, service-role persistence | Aggregate counts, sanitized failures, no private titles/grades in logs |
| `GET /api/canvas/courses/:courseId/grades` | List synchronized assignments with submission/grade status | DB-only | Bearer auth and owned selected course | Safe DTOs, pagination, no raw Canvas IDs or URLs |
| `GET /api/canvas/courses/:courseId/grades/:assignmentId` | Assignment detail for one internal assignment row | DB-only | Bearer auth, owned course, owned assignment | Safe assignment/submission fields; no comments/body/attachments |
| `GET /api/canvas/courses/:courseId/grades/summary` | Course grade summary and sync state | DB-only | Bearer auth and owned course | Canvas-provided visible grade values only; no local estimates |
| `GET /api/canvas/courses/:courseId/grades/sync-status` | Freshness, partial, failed, stale, never-synced state | DB-only | Bearer auth and owned course | Sanitized status, timestamps, failure categories |

Safe error categories should match existing Canvas routes:

- `unauthorized`
- `canvas_connection_missing`
- `canvas_course_not_found`
- `canvas_course_not_selected`
- `canvas_permission_denied`
- `canvas_rate_limited`
- `canvas_timeout`
- `canvas_unavailable`
- `canvas_grade_sync_partial`
- `canvas_grade_sync_failed`
- `canvas_storage_failed`
- `invalid_request`

Response fields excluded from mobile:

- raw Canvas course, assignment, submission, user, grader, file, and rubric IDs
- raw Canvas URLs, preview URLs, signed URLs, submission bodies, comments, and attachments
- unposted grade fields unless a future phase explicitly designs for them
- raw endpoint error payloads, stack traces, SQL errors, fingerprints, hashes, and object keys

## 11. Mobile plan

| Surface | States supported | Offline behavior | Notes |
| ------- | ---------------- | ---------------- | ----- |
| Courses screen | Add `Grades` action for selected courses; show grade sync status | Shows DB-backed last sync when online; in-memory loaded state survives brief network loss | Keep source sync and grade sync visually distinct |
| Dedicated course Grades screen | loading, synced, no assignments, partial, stale, failed, never synced | No durable device cache in MVP; label server-cached data as last synced | Best first surface; avoids dashboard/task scope |
| Assignment detail | no due date, submitted, late, missing, excused, graded, hidden grade, locked, unavailable, unknown | Same as list | No raw Canvas identifiers or URLs |
| Dashboard/upcoming tasks | Not in MVP | N/A | Defer until task/schedule model exists |
| Schedule | Not in MVP | N/A | Phase 6 or later |
| Notification settings placeholder | Not in MVP | N/A | Delivery and settings deferred |

Minimum mobile states:

| State | Copy/behavior boundary |
| ----- | ---------------------- |
| Loading | Fetching synchronized grade data from Stay Focused |
| Synchronized | Shows last sync timestamp and status counts |
| No assignments | No synchronized Canvas assignments found for this course |
| No due date | Do not sort as missing; place after dated urgent items |
| Submitted | Show submitted timestamp/attempt when available |
| Late | Combine with submitted/graded if both are true |
| Missing | Only when Canvas evidence says missing |
| Excused | Override missing/late urgency |
| Graded | Show visible score/grade from Canvas |
| Grade hidden | Show grade unavailable; no estimate |
| Locked | Assignment not currently open |
| Unavailable | Canvas visibility says unavailable or authoritative removal |
| Partial sync | Show affected data may be incomplete |
| Stale data | Show last successful sync age |
| Sync failed | Preserve prior rows; show sanitized retry guidance |
| Offline cached data | In MVP, only already-loaded in-memory data; durable local cache deferred |
| Unknown | Use when evidence is insufficient |

## 12. Grade-display policy

* Canvas-provided grades: Show individual visible assignment `score`/`grade`
  and optional course current/final values only when Canvas returns them.
* Locally calculated grades: Excluded from Phase 5E MVP.
* Weighted estimates: Excluded from Phase 5E MVP.
* Hidden grades: Show unavailable/hidden; never coerce to zero or ungraded.
* Partial-sync behavior: Do not calculate totals or missing-work claims from
  partial evidence. Prefer `unknown` and stale/partial labels.

Phase 5E may claim:

- "Canvas shows this assignment as submitted/missing/late/excused/graded" when synchronized evidence exists.
- "Score/grade visible in Canvas" when Canvas returned the visible value.
- "Course grade unavailable" when Canvas hides or omits it.
- "Last synchronized at ..." from local sync metadata.

Phase 5E must not claim:

- unofficial current grade
- needed score to reach a target
- weighted progress
- assignment-group exactness
- missing status inferred only from due date
- hidden grade value
- notification readiness without freshness caveats

## 13. Notification readiness

| Required normalized field | Phase 5E stores it | Notification use | Safeguard |
| ------------------------- | -----------------: | ---------------- | --------- |
| `due_at` | Yes | Future due reminders | Do not notify when stale/partial evidence |
| `unlock_at`/`lock_at` | Yes | Availability windows | Do not notify locked/unavailable items as actionable |
| `normalized_status` | Yes | Suppress submitted/excused work | Unknown never becomes missing |
| `submitted_at` | Yes | Stop reminders after submission | Idempotent suppression by assignment |
| `missing` | Yes | Future missing-work recovery | Canvas evidence only; no partial-sync claims |
| `late` | Yes | Future late-work recovery | Can coexist with submitted |
| `excused` | Yes | Suppress reminders | Highest precedence |
| `course_time_zone` | Existing course field | Localized due copy | Preserve Canvas timezone when present |
| `last_successful_sync_at` | Yes | Staleness warning | Require freshness label in notification pipeline |
| `grade_visibility_state` | Yes | Avoid grade exposure | No lock-screen grade text by default |

Notification delivery is deferred. Future notification logic must not:

- notify from stale data without warning
- remind for submitted or excused work
- treat excused work as missing
- expose grades in lock-screen text by default
- repeatedly notify after status changes
- claim missing status from partial sync evidence

## 14. Security and privacy

| Requirement | Planned enforcement | Verification |
| ----------- | ------------------- | ------------ |
| Per-user Canvas connections | FK every grade table through `user_id` and `canvas_connection_id` | SQL verifier with User A/User B |
| Per-user course ownership | FK through `(course_id, user_id, canvas_connection_id)` | Cross-user insert/upsert rejection |
| Assignment visibility | Only selected owned courses; assignment DTO uses internal IDs | API route tests |
| Submission ownership | Omit `student_ids[]`; students only sync own submissions; DB rows scoped to Stay Focused user | Canvas client tests and live validation |
| Grade privacy | Service-role-only tables; API returns owner-scoped safe DTOs | RLS/grant checks and route tests |
| Canvas credentials | Existing encrypted storage, API-only decryption | Existing plus grade sync tests |
| Direct mobile reads | No direct table grants; mobile uses API | Grant verifier |
| Cross-user rejection | Owner-scoped reads and composite FKs | Two-user SQL/API tests |
| Logging | Counts and safe failure codes only | Log scan in live validation |
| Audit output | Opaque connection/course labels and aggregate counts | Protected live report checklist |
| Local caching | No durable grade cache in MVP; if later added, owner-scoped cleanup on logout/account switch | Mobile tests |
| Account deletion | Cascade through `auth.users` and connection FKs | SQL verifier |
| Disconnected Canvas | Disconnect removes synchronized grade rows through connection cascade | SQL verifier |
| Raw payloads | Do not store or return raw Canvas JSON | Schema review and parser tests |

## 15. Test and live-validation plan

| Layer | Required coverage | Completion gate |
| ----- | ----------------- | --------------- |
| Canvas client | Pagination, assignment parsing with/without included submission, own-submission parsing, visible/hidden score fields, missing optional fields, rate limits, retryable/non-retryable failures | Canvas package tests pass |
| Database | Ownership, uniqueness, RLS, revoked direct grants, service-role access, cross-user rejection, idempotent upserts, authoritative absence rules | Rollback-safe SQL verifier passes |
| API | Authentication, authorization, selected-course checks, request validation, safe fields, explicit sync, DB-only reads, partial sync, stale sync, hidden grades | API tests pass |
| Mobile | Strict parser accepts safe DTOs, rejects unsafe fields, renders missing/late/excused precedence, hidden grades, stale/partial/offline copy, sync errors | Mobile tests pass |
| Protected live validation | One opaque connection, one opaque selected course, sanitized assignment counts, sanitized status counts, no private names/grades/raw IDs, cleanup/no writes | Live report committed |

Protected live validation must not submit assignments, upload files, create
comments, alter grades, excuse work, call reviewer generation, send
notifications, or run background jobs.

## 16. Phase 5E subphases

### Phase 5E.1 - Data contract and database foundation

* Goal: Define normalized grade/submission DTOs and add server-controlled tables.
* Scope: migrations, DB types, SQL verifier, API shared types only if needed.
* Likely files: `packages/db/migrations/*phase5e*`, `packages/db/src/types.ts`, `scripts/phase5e-grades-submissions-verification.sql`, `apps/api/src/types/canvas.ts`, `docs/ai/*`.
* Migration impact: add `canvas_assignment_submissions`, `canvas_course_grade_summaries`, `canvas_course_grade_sync_states`, optional grade sync run table, and any minimal `canvas_assignments` extensions.
* Tests: SQL verifier for RLS, grants, FKs, uniqueness, cross-user rejection, upsert/absence semantics.
* Live validation: remote migration verification only; no Canvas live call required.
* Exclusions: Canvas client methods, API routes, mobile UI, submission actions, notifications.
* Completion criteria: schema is implementation-ready, service-role-only posture verified, and no source behavior changes exist.

### Phase 5E.2 - Canvas assignment/submission client support

* Goal: Add typed read-only Canvas client methods and parsers.
* Scope: own submissions, assignment include options, optional course/enrollment grade summary methods.
* Likely files: `packages/canvas/src/types.ts`, `packages/canvas/src/client.ts`, `packages/canvas/src/client.test.ts`.
* Migration impact: none.
* Tests: pagination, hidden/missing fields, grade visibility, workflow states, 429/5xx/4xx mapping, no mutation endpoints.
* Live validation: none required; official docs plus tests.
* Exclusions: persistence, API routes, mobile UI, submission uploads, grading/comment endpoints.
* Completion criteria: Canvas package typecheck/build/tests pass and exposed methods are read-only.

### Phase 5E.3 - Explicit synchronized import

* Goal: Persist assignment/submission/visible grade state for one selected course.
* Scope: sync service, normalization, fingerprints, service-role RPC calls, sanitized summaries.
* Likely files: `apps/api/src/lib/canvas-grade-sync.ts`, `apps/api/src/lib/canvas-grade-sync-normalize.ts`, tests, DB RPCs if not completed in 5E.1.
* Migration impact: may add/adjust RPCs and sync-state constraints.
* Tests: idempotency, partial family failure, stale preservation, hidden grades, absence handling, retry classification.
* Live validation: protected live can wait until 5E.6 unless remote DB verification needs data-free checks.
* Exclusions: read routes, mobile screens, background sync, notification delivery.
* Completion criteria: explicit service can sync fixture data into safe rows without returning private payloads.

### Phase 5E.4 - Protected API read model

* Goal: Add protected routes for explicit sync, DB-only list/detail/summary/status.
* Scope: route handlers, request validation, response DTOs, safe errors.
* Likely files: `apps/api/app/api/canvas/courses/[courseId]/grades/*`, `apps/api/src/lib/canvas-grade-read-model.ts`, `apps/api/src/types/canvas.ts`.
* Migration impact: none expected.
* Tests: auth, owner checks, selected-course checks, DB-only reads, unsafe field exclusion, pagination, stale/partial/hidden states.
* Live validation: route can be exercised with test data; no Canvas live required until 5E.6.
* Exclusions: mobile UI, notifications, background jobs, unofficial calculations.
* Completion criteria: mobile-safe contracts exist and Canvas calls happen only in sync route.

### Phase 5E.5 - Mobile assignment and grade experience

* Goal: Present read-only synchronized grades/submissions for a selected course.
* Scope: mobile API client parsers, Courses entry point, dedicated grades screen, state rendering.
* Likely files: `apps/mobile/src/services/canvasApi.ts`, tests, `apps/mobile/src/features/courses/*`, `apps/mobile/app/index.tsx`.
* Migration impact: none.
* Tests: strict parsing, state precedence, hidden grades, partial/stale/offline copy, unsafe-field rejection.
* Live validation: Expo Web smoke can use mocked/stubbed API data; protected live UI check in 5E.6.
* Exclusions: dashboard, schedule, notifications, local grade estimates, assignment submission actions.
* Completion criteria: student can open a selected course and inspect last-synced safe grade/submission state.

### Phase 5E.6 - Protected live validation and hardening

* Goal: Prove the read-only Phase 5E slice against one protected Canvas course with sanitized output.
* Scope: remote SQL verification, protected local API validation, optional Expo Web smoke, cleanup/no-write proof.
* Likely files: `docs/ai/phase5e-protected-live-validation-20260708.md`, validation scripts under ignored/local or committed sanitized helpers if useful.
* Migration impact: none expected unless hardening findings require follow-up migrations.
* Tests: full requested package suite plus live validation checklist.
* Live validation: required; one opaque connection/course, sanitized assignment/status counts, no private names/grades/raw IDs.
* Exclusions: no submission writes, uploads, grade edits, comments, notifications, background sync, reviewer generation.
* Completion criteria: validation report committed, cleanup passed, no unsafe output, no source-code side effects beyond approved implementation.

## 17. Risks

| Risk | Severity | Mitigation | Owning phase |
| ---- | -------- | ---------- | ------------ |
| Institution-specific hidden grades | High | Treat absent grade fields as hidden/unavailable; show no estimate | 5E.2-5E.5 |
| Assignment-group weighting complexity | High | Do not calculate local grades in MVP | 5E.1, future planner |
| Dropped scores/extra credit/grading periods | High | Store metadata only; exclude estimates | Future planner |
| Missing/inconsistent submission fields | Medium | Normalize field presence; use `unknown` when incomplete | 5E.2-5E.3 |
| Partial synchronization | High | Preserve prior data and label partial/unknown | 5E.3-5E.5 |
| Deleted/unpublished assignments | Medium | Mark unavailable only after authoritative evidence | 5E.3 |
| External-tool submissions | Medium | Display Canvas status only; no launch/content assumptions | 5E.5 |
| Quiz-specific state | Medium | Use assignment/submission state only; defer quiz attempts | Future |
| Timezone handling | Medium | Preserve Canvas timestamps/timezone; avoid local date-only missing inference | 5E.3-5E.5 |
| Large courses | Medium | Paginate, limit selected-course explicit sync, defer background/resumable | 5E.3, 5F |
| Rate limiting | Medium | Reuse retry/Retry-After handling and sanitized errors | 5E.3 |
| Cross-user grade exposure | High | Composite FKs, RLS, service-role-only, route tests | 5E.1-5E.4 |
| Offline stale data | Medium | Label sync age; no durable cache until designed | 5E.5/Future |
| False missing-work notifications | High | No notifications; future safeguards use freshness/status precedence | Future notifications |
| Background sync conflicts | Medium | Keep manual explicit sync; design Phase 5F later | 5F |
| Raw submission content leakage | High | Do not request/store comments/body/attachments in MVP | 5E.1-5E.4 |

## 18. Recommended MVP

Phase 5E MVP should be strictly read-only.

Include:

- selected-course explicit grade/submission sync
- assignment title, course association, due/unlock/lock dates, points possible, grading type, submission types
- current user's submission workflow state, submitted timestamp, attempt count, late/missing/excused flags, visible score/grade when returned
- conservative normalized status and precedence
- last sync/freshness/partial/failure metadata
- optional Canvas-provided visible course current/final grade summary

Defer:

- assignment submission, file upload, comments, grade edits, excusing, late-policy edits
- instructor comments, rubrics, feedback attachments, submission bodies, file downloads
- local grade estimates, weighted grade projections, grade-goal planner, What-If grades
- notification delivery, background sync, cron, queues
- quiz attempts/questions, external-tool content, peer review, full group assignment workflows

Course-grade summaries should be included only as Canvas-provided visible
values. Unofficial local grade calculation should be excluded. Notifications
should remain deferred. Background sync should remain Phase 5F.

## 19. First implementation task

Recommended next Codex task title:

```text
Phase 5E.1 - Canvas Grades and Submissions Data Contract and Database Foundation
```

Concise boundary:

Create only the normalized data contract, database migration(s), DB types, and
rollback-safe SQL verifier for read-only Canvas assignment submission and
visible grade state. Do not add Canvas client methods, API routes, mobile UI,
live Canvas calls, background jobs, notifications, or submission actions.

## 20. Files changed

Documentation files only:

* `docs/ai/phase5e-grades-submissions-plan-20260708.md`
* `docs/current-state.md`
* `docs/roadmap.md`
* `docs/ai/current_sprint.md`
* `docs/ai/handoff.md`

## 21. Git result

* Commit message: `docs(canvas): plan Phase 5E grades and submissions`
* Push target: `origin/main`
* Ahead/behind: final value reported after push
* Remaining dirty files: expected unrelated generated/mobile files only
* Unrelated files untouched: `apps/api/next-env.d.ts`, `apps/mobile/expo-env.d.ts`, `apps/mobile/.gitignore`

## 22. Verdict

```text
PASS — Phase 5E grades and submissions plan is implementation-ready
```
