# Phase 5E.2 Canvas Grade Client Support

Implementation date: 2026-07-08, Asia/Manila.

## 1. Starting Repository State

- Branch: `main`
- Starting commit: `9f1be8486e8a3a872e27b22be38da04d1117952f`
- Ahead/behind at start: `0/0` against `origin/main`
- Dirty files at start: `apps/api/next-env.d.ts`,
  `apps/mobile/expo-env.d.ts`, and `apps/mobile/.gitignore`
- Unrelated files preserved: those three files were not edited, staged,
  formatted, or reverted.
- Planning input:
  `docs/ai/phase5e-grades-submissions-plan-20260708.md`
- Phase 5E.1 input:
  `docs/ai/phase5e1-grades-submissions-foundation-20260708.md`

## 2. Official Canvas References Checked

Official Instructure documentation only:

- Assignments API:
  `https://developerdocs.instructure.com/services/canvas/resources/assignments`
- Submissions API:
  `https://developerdocs.instructure.com/services/canvas/resources/submissions`
- Courses API:
  `https://developerdocs.instructure.com/services/canvas/resources/courses`
- Enrollments API:
  `https://developerdocs.instructure.com/services/canvas/resources/enrollments`
- Assignment Groups API:
  `https://developerdocs.instructure.com/services/canvas/resources/assignment_groups`

Relevant documented details checked:

- `GET /api/v1/courses/:course_id/assignments` returns assignment metadata,
  including points, grading type, submission types, publish state,
  hide-in-gradebook, allowed attempts, and manual posting fields when
  available.
- `GET /api/v1/courses/:course_id/students/submissions` returns the calling
  user's own submissions when `student_ids[]` is omitted.
- Submission response examples include unsafe fields such as body, comments,
  preview URLs, user IDs, grader IDs, rubric assessment, and submission
  history; Phase 5E.2 intentionally discards them.
- `GET /api/v1/courses/:course_id/enrollments` supports `user_id`; using
  `user_id=self` is the conservative own-enrollment grade-summary path.
- Course grade data is Canvas-provided only. Unposted grade fields exist in
  Canvas enrollment grade objects but are not requested or returned.

## 3. Existing Client Architecture Reused

Phase 5E.2 reuses the existing `@stay-focused/canvas` infrastructure:

- normalized Canvas base URL handling
- bearer-token authorization
- request timeout
- safe JSON parsing
- shared paginated JSON traversal
- `Link` header next-page parsing
- cross-origin pagination rejection
- repeated pagination-link rejection
- maximum page limits
- redirect rejection with `redirect: "manual"`
- normalized `CanvasClientError` categories
- existing retry metadata classification via safe HTTP error mapping

No second HTTP client abstraction was added.

## 4. Methods Added Or Extended

| Method | Endpoint | HTTP | Pagination | Normalized result | Privacy boundary |
| --- | --- | --- | --- | --- | --- |
| `listCourseAssignments(courseId)` | `/api/v1/courses/:course_id/assignments?per_page=50` | `GET` | Shared Canvas pagination | `CanvasGradeAssignment[]` | Does not request submission, rubric, comments, attachments, or visibility includes; unsafe raw assignment fields are not returned |
| `listOwnCourseSubmissions(courseId)` | `/api/v1/courses/:course_id/students/submissions?per_page=50` | `GET` | Shared Canvas pagination | `CanvasOwnSubmission[]` | Omits `student_ids[]`; returns only allowlisted submission evidence and visible wrappers |
| `getOwnCourseGradeSummary(courseId)` | `/api/v1/courses/:course_id/enrollments?per_page=50&user_id=self&type[]=StudentEnrollment` | `GET` | Shared Canvas pagination | `CanvasCourseGradeSummary` | Own student enrollment only; unposted fields, enrollment IDs, user profile data, URLs, and raw grades object are discarded |

The existing `listAssignments(courseId)` method remains for the earlier
academic graph sync path and now tolerates optional assignment metadata fields
such as allowed attempts, hide-in-gradebook, and manual posting when Canvas
returns them. The Phase 5E path uses the stricter safe contract above.

## 5. Exact Request Parameters

`listCourseAssignments(courseId)`:

- `per_page=50`
- no `include[]`
- no body

`listOwnCourseSubmissions(courseId)`:

- `per_page=50`
- no `student_ids[]`
- no `include[]`
- no `grouped`
- no body

`getOwnCourseGradeSummary(courseId)`:

- `per_page=50`
- `user_id=self`
- `type[]=StudentEnrollment`
- no `include[]`
- no body

## 6. Normalized Assignment Contract

`CanvasGradeAssignment` contains:

- `canvasAssignmentId`
- `title`
- `assignmentGroupId`
- `pointsPossible`
- `gradingType`
- `submissionTypes`
- `dueAt`
- `unlockAt`
- `lockAt`
- `published`
- `muted`
- `omitFromFinalGrade`
- `allowedAttempts`
- `allowedAttemptsUnlimited`
- `hideInGradebook`
- `postManually`
- `quizId`
- `discussionTopicId`
- `assignmentVisible`

Rules:

- Canvas assignment IDs and related IDs must be bounded valid Canvas-style
  identifiers.
- Titles must be non-empty and bounded.
- `pointsPossible` must be null or a finite non-negative number.
- Dates must be null, omitted, or parseable Canvas timestamp strings.
- `allowed_attempts = -1` becomes `allowedAttempts: null` and
  `allowedAttemptsUnlimited: true`.
- Omitted optional booleans remain `null`; they are not coerced to `false`.
- `assignment_visibility` arrays are not returned. If present, they only set a
  coarse `assignmentVisible: true` without exposing student IDs.

## 7. Normalized Submission Contract

`CanvasOwnSubmission` contains:

- `canvasAssignmentId`
- `workflowState`
- `submissionType`
- `submittedAt`
- `gradedAt`
- `postedAt`
- `attempt`
- `late`
- `missing`
- `excused`
- `secondsLate`
- `latePolicyStatus`
- `assignmentVisible`
- `gradeMatchesCurrentSubmission`
- `score`
- `grade`

Rules:

- The stable Phase 5E identity is assignment identity plus the owning
  course/user context in later persistence.
- Canvas submission IDs are not exposed.
- Unknown workflow strings are preserved only as bounded text; Phase 5E.3 will
  derive database status.
- `attempt` and `secondsLate` must be null or non-negative safe integers.
- Omitted `late`, `missing`, and `excused` flags remain `null`; they are not
  turned into `false`.
- `score` and `grade` use explicit visibility wrappers.

## 8. Visible Course Grade Contract

`CanvasCourseGradeSummary` contains:

- `currentScore`
- `currentGrade`
- `finalScore`
- `finalGrade`

Rules:

- Values come only from Canvas-provided visible enrollment grade fields.
- Only `StudentEnrollment` rows are considered.
- `TeacherEnrollment`, `ObserverEnrollment`, and unsupported enrollment types
  are ignored.
- Missing grade objects return unavailable wrappers.
- Unposted current/final score and grade fields are ignored even when fixtures
  include them.

## 9. Visibility And Omitted-Field Rules

Visibility wrappers use:

- `visible`: a finite number or bounded string was returned by Canvas.
- `hidden`: Canvas omitted the value in a context where grade evidence exists,
  or omitted a field inside an otherwise present course grade object.
- `unavailable`: Canvas explicitly returned `null`, or no own grade object is
  available.
- `unknown`: Canvas omitted an optional submission score/grade with no grade
  evidence.
- `not_applicable`: reserved in the type contract for future provider evidence;
  not inferred in Phase 5E.2.

Important field-presence behavior:

- Score `0` is visible.
- Empty grade string is visible.
- Present `null` is not the same as an omitted field.
- Numeric strings, `NaN`, infinity, objects, and oversized grade strings are
  rejected as sanitized malformed Canvas responses.
- Absent grade values are never converted to zero, `"0"`, or `"ungraded"`.

## 10. Unsafe Fields Discarded

Normalized Phase 5E.2 results exclude:

- submission body text
- submission comments
- submission attachments
- submitted file metadata
- preview URLs
- submission URLs
- grade URLs
- Canvas user IDs
- grader IDs
- media comments
- rubric assessments
- rubric data
- submission history
- anonymous IDs
- anonymous-grading metadata
- moderated-grading metadata
- unposted grade fields
- raw Canvas response objects
- access tokens
- authorization headers

## 11. Pagination Behavior

Assignments, own submissions, and own grade summary enrollment reads all use
the shared paginated request implementation.

Verified behavior:

- one-page success
- multiple-page traversal
- all pages included
- cross-origin next links rejected
- repeated next links rejected
- page limits enforced
- redirects rejected
- malformed paginated response shapes rejected
- initial query parameters preserved
- no partial prefix returned when pagination security fails

The client does not silently deduplicate records. Phase 5E.3 persistence will
own stable identity upserts and duplicate handling.

## 12. Error Behavior

The implementation reuses `CanvasClientError` and existing safe codes:

- `canvas_unauthorized`
- `canvas_forbidden`
- `canvas_not_found`
- `canvas_rate_limited`
- `canvas_unavailable`
- `canvas_timeout`
- `canvas_network_error`
- `canvas_malformed_json`
- `canvas_invalid_response`
- `canvas_redirect_rejected`
- `canvas_pagination_rejected`
- `canvas_request_failed`

Public error messages do not include raw response bodies, access tokens,
private grade values, assignment titles, course names, user IDs, or Canvas URLs.

## 13. Test Coverage

Primary tests live in `packages/canvas/src/client.test.ts`.

| Suite or category | Result | Important cases covered |
| --- | --- | --- |
| Existing Canvas regression suite | PASS | Existing profile, courses, modules, Pages, assignment groups, assignments, planner, announcements, files, redirects, pagination, and error mapping still pass |
| Phase 5E assignments | PASS | Complete assignment response, missing optional fields, null dates, zero points, allowed attempts, unlimited attempts, hide-in-gradebook, manual posting, unsafe fields discarded, invalid numbers, oversized strings, paginated assignments |
| Phase 5E own submissions | PASS | Unsubmitted, submitted, late, missing, excused, graded positive score, visible zero score, empty visible grade string, hidden omitted score, null score, attempt 0 and 1, late with and without submitted evidence, grade mismatch, unsafe fields discarded, multiple pages |
| Phase 5E course grades | PASS | Visible current/final values, visible numeric zero, hidden omitted final grade, null fields, missing grade object, unsupported enrollment ignored, unposted fields discarded, malformed grade object |
| Request safety | PASS | Own submissions omit `student_ids[]`, grade summary uses `user_id=self`, no unsafe includes, all added requests use `GET`, no body sent, no mutation helpers added |
| Error and pagination safety | PASS | 401, 403, 404, 429, non-retryable 400, retryable 503, malformed JSON, timeout, redirect rejection, invalid pagination link |

## 14. Validation Commands And Results

| Command | Result | Notes |
| --- | --- | --- |
| `npm --workspace @stay-focused/canvas run typecheck` | PASS | `tsc --noEmit` |
| `npm --workspace @stay-focused/canvas run test` | PASS | 69 Canvas tests passed |
| `npm --workspace @stay-focused/canvas run build` | PASS | `tsc -p tsconfig.build.json` |
| `npm --workspace @stay-focused/canvas run lint` | PASS | Package lint script is `tsc --noEmit` |
| `npm run typecheck` | PASS | Turbo typecheck passed 7/7 workspaces |
| `git diff --check` | PASS with warnings | Only CRLF normalization warnings for existing/generated files and edited Canvas files |

## 15. Explicit Exclusions

Phase 5E.2 did not add:

- database migrations
- database writes
- Supabase RPCs
- synchronization orchestration
- grade fingerprint persistence
- API routes
- mobile services
- mobile screens
- notifications
- background jobs
- cron
- queues
- assignment submission
- file uploads
- submission comments
- grading
- grade edits
- excusing submissions
- late-policy changes
- rubric retrieval
- instructor feedback retrieval
- submission body storage
- submission attachment retrieval or downloading
- quiz attempt APIs
- peer-review APIs
- local grade calculations
- weighted estimates
- What-If grades
- reviewer generation
- reviewer prompt integration

## 16. Remaining Limitations

- No application route calls these new client methods yet.
- No synchronized import or persistence service exists yet.
- No mobile screen or API DTO exists yet.
- The course-grade method uses the conservative own-enrollment path rather
  than an all-course `include[]=total_scores` request.
- Assignment visibility is intentionally coarse because the Canvas
  `assignment_visibility` include contains student IDs and is not requested.
- `not_applicable` visibility states are reserved but not inferred by this
  client slice.
- Phase 5E.3 must map provider evidence into the database contracts from
  Phase 5E.1.

## 17. Git Result

- Planned commit message:
  `feat(canvas): add read-only grade client support`
- Push target: `origin/main`
- Final commit SHA, push result, final ahead/behind, and remaining dirty files
  are reported in the Codex final response.

## 18. Final Verdict

Phase 5E.2 is complete when the final git commit and push succeed. The
implemented code path is read-only, client-only, and covered by mocked tests.
