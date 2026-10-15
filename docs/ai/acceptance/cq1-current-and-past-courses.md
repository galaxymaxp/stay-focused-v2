# CQ1 current and past courses

## STEP 0 (2026-10-15)

Baseline: `overnight/2026-10-15_feedback`, HEAD `33824ca`; SP0 status PASS;
tracked tree clean. Unrelated untracked `UI/`, `apps/mobile/.gitignore`, and
`supabase/` preserved. Read AUTOPILOT, current planning, the external roadmap's
full CQ1 section, and SP0 Inputs for CQ1. No live services are permitted.

Canvas `client.ts:193` already requests term/concluded/sections and normalizes
enrollment state, workflow state, course end, conclusion and term dates
(`packages/canvas/src/types.ts:13`, `client.ts:1325`). The routine active list at
`client.ts:186` does not request that evidence. Storage has workflow, term ID,
course start/end (`202607050004_create_canvas_academic_graph.sql:1`); snapshot
promotion (`202607050005_add_canvas_academic_sync.sql:818`) persists those fields.
Later migrations do not add the missing term dates/conclusion/enrollment state.
Inventory upserts at `apps/api/src/lib/canvas-course-selection.ts:488`.

CIT17 Default Term courses/counts, payload coverage, deployed revisions, database
rows and Scheduler state: **UNVERIFIED (owner to confirm)**.

Surface inventory (baseline file:line; re-exports lead to features):

| Surface | Owning path |
|---|---|
| Mobile Courses | `apps/mobile/app/(app)/(tabs)/courses/index.tsx:1` → `apps/mobile/src/features/redesign/GenerateScreen.tsx:53` |
| Mobile connection/course selection | `apps/mobile/src/features/sync/CanvasSyncScreen.tsx:67` |
| Mobile Today / Tasks | `apps/mobile/src/features/redesign/TodayScreen.tsx:74`; `TasksScreen.tsx:44` |
| Mobile calendar | `apps/mobile/src/features/redesign/TodayCalendar.tsx:28` consumes the Today activity list; mobile study sessions use `apps/mobile/app/(app)/study-session.tsx:23` |
| Mobile Queue / legacy processing | `apps/mobile/app/(app)/generation-queue.tsx:1` → `GenerationScreen.tsx:282`; `processing.tsx:1` → `features/processing/ProcessingScreen.tsx` |
| Website courses / connection | `apps/web/src/features/generate.tsx:53`; `canvas.tsx:66` |
| Website Today / Tasks / schedule / Queue | `apps/web/src/features/today/today-screen.tsx:79`; `tasks.tsx:22`; `schedule.tsx:192`; `queue.tsx:295` |
| Shared activity/calendar/planner filter | `apps/api/src/lib/experience/task-state.ts:5`; `mappers.ts:75`; `task-planning-repository.ts:201` |
| Courses API | `apps/api/app/api/experience/[...path]/route.ts:32`; `apps/api/app/api/canvas/courses/route.ts:18` |
| Queue API | `apps/api/app/api/jobs/route.ts:101`; `apps/api/src/lib/processing-jobs/repository.ts:142` |
| Sync API / checkpoint worker | `apps/api/app/api/canvas/sync/route.ts:38`; `apps/api/app/api/canvas/courses/[courseId]/sync/route.ts:53`; `apps/api/src/lib/canvas-sync-jobs/unit-executor.ts:57`; `finalize.ts:128` |
| Routine polling / email / push | `apps/api/src/lib/notifications/canvas-poll.ts:42`; `canvas-email.ts:35`; `repository.ts:132`; `worker.ts:8` |
| Eager preparation / automatic reviewers | `apps/api/src/lib/canvas-preparation/orchestration.ts:26`; `backfill.ts:143`; `apps/api/src/lib/auto-reviewers/after-sync.ts:6` |
| Library (retain all courses) | `apps/api/src/lib/experience/service.ts:235`; mobile `LibraryScreen.tsx:174`; web `library.tsx:79` |

No unanticipated course source makes filtering unsafe. Existing RLS on
`canvas_courses` remains the owner boundary; override must not be overwritten by
Canvas upserts. Nothing prepared/generated is deleted.

## Acceptance matrix

| Requirement | Proof | Result |
|---|---|---|
| Conclusion/end evidence and override both ways | shared rule tests + stored mapping | FRESH PASS: Shared rule + SQL evidence tests |
| Owner endpoint denies foreign course | API tests | FRESH PASS: Mutation/auth tests deny foreign owner |
| Today/Tasks/calendar/Queue/notifications omit past | API tests | FRESH PASS: Task-state/schedule, Queue, SQL/email filters |
| Routine skip; explicit course refresh once | API + frontend tests | FRESH PASS: Routine API + mobile/web refresh tests |
| Past courses collapsed on both apps | mobile/web tests | FRESH PASS: Mobile interaction tests + website code/build review |
| Library keeps labelled reviewers/quizzes | API/local Library tests | FRESH PASS: Exact Library list/detail regression; quiz suites |
| SP1 refresh removes moved courses/items | snapshot + frontend tests | FRESH PASS: Shared snapshot merge + existing owner cache suites |
| Required local gates | serial fresh suites/builds | FRESH PASS: Final serial gate table below |

Rollout and Device checks are owner steps and will not run unattended.

## Implementation

- Forward-only evidence/override migration `20261015030000`, plus atomic
  poll-sync reservation guard `20261015030100`. Neither was remotely applied.
  Existing owner RLS/grants are inherited, and automatic Canvas upserts omit the
  override. Term, conclusion and enrollment workflow evidence are persisted.
- Shared `isPastCourse` owns the TypeScript rule; SQL background claims use the
  same bounded evidence, verified in local PGlite. Default Term/unknown dates
  stay current. No section-date/name/age heuristic determines visibility.
- `PATCH /api/experience/courses/:id/state` accepts exactly one `override`
  property (`current`, `past`, null), caps the body, verifies the bearer, and
  updates only the owner's matching course/connection. Responses return state
  and override provenance without private metadata.
- Today/Tasks, calendar sessions and planning use existing activity eligibility;
  announcements, Queue, poll/backfill admission and notification fan-out also
  omit past courses. Queue resolves reviewer, quiz and assignment-job identities
  server-side, scans hidden history pages, and fails closed on read errors.
  Notification read failures remain retryable rather than consuming events.
- Mobile and website Courses and Canvas connection screens have collapsed Past
  sections and both move controls. Explicit past visits use one durable
  content/grades refresh pair; routine account refresh skips them. Older local
  unaccepted requests gain owner-scoped course attribution without submitting
  work or changing idempotency keys. Legacy processing per-id reconciliation
  uses the Queue projection. No prepared/generated content is deleted.
- Library remains unfiltered and labelled. SP1 response merging updates course
  state and removes excluded activities after successful refresh. Existing
  local-first/offline/owner cache suites remain mandatory regressions.
- [ADR-028](../../adr/ADR-028-current-and-past-courses.md) records the policy and
  owner-managed rollout order. The requested `docs/adr` path is used; numbering
  follows the existing architecture ADR-027.

## Development evidence and failed first attempts

All commands used repository-local TEMP/TMP; evidence logs/scripts remain
uncommitted in `tmp/overnight`. No remote service call, deployment, SQL against a
remote database, Scheduler change, environment-file edit, or push was performed.

- FRESH shared rule probe: **14/14** initially; snapshot refresh coverage was
  added afterward and is included in the final shared gate.
- FRESH initial API typecheck found four diagnostics: two existing fixture rows
  needed the new nullable columns, and readonly JSON needed proper narrowing.
  Those were repaired without weakening types or validation.
- FRESH focused SQL attempt 1: **46 passed/3 failed in 3 files**; the synthetic
  service role lacked its course-preference grant. Attempt 2: **24 passed/3
  failed in 1 file**; its connection grant was also missing. Correcting only
  those local fixture grants gave **27/27 in 1 file**. Actual table grants and
  owner policy were not broadened.
- FRESH focused API attempt 1: **202 passed/11 failed in 9 files**; orchestration
  fixtures lacked current-course evidence, one historical backfill fixture
  defaulted to completed, and the course-response assertion needed new fields.
  The repaired rerun passed **213/213 in 9 files**. New focused acceptance passed
  **145/145 in 4 files** (mutation/auth, active work/schedule, Library and Queue).
- FRESH first forced typecheck gate: **6 successful/8 tasks**, zero cached,
  mobile failed on a redundant comparison after TypeScript narrowing. Attempt 2:
  **7 successful/8 tasks**, zero cached, API found two new test typing errors
  (a fixture spread and a Library union). Attempt 3 passed **8/8**, zero cached;
  subsequent final forced typechecks also passed.
- FRESH first full API gate: **2,097 passed/19 failed/3 skipped, 180 files**.
  Seventeen sync adapter failures lacked the new inventory-upsert operation;
  one origin adapter lacked source attribution. The remaining unchanged
  `canvas-reviewer-sources.test.ts` first test timed out at 5 seconds under full
  suite load. Adapter repairs plus the new backend routine-skip test passed
  **80/80 in 3 files**, including that unchanged source suite. Full rerun passed
  **2,117/2,117 with 3 skips in 180 files**; the load-related timeout is recorded
  as a flake, not hidden or fixed by increasing timeouts.
- Added atomic past-course reservation tests passed **10/10 in 1 file**. The
  subsequent full API run passed **2,120 tests with 3 skips in 180 files**.
- Initial helper commands had PowerShell brace/glob/CRLF matching errors before
  product checks; corrected local file-based helpers performed the edits.
  Those tooling errors are distinct from the suite failures above.

## Final serial gates

Status: **PASS for the local unattended scope**. Tested final code `6d8759e` on `overnight/2026-10-15_feedback`. Gates ran freshly and serially with repository-local TEMP/TMP.

| Command | Evidence/result |
|---|---|
| `npm run typecheck -- --force` | FRESH PASS: 8/8 tasks; zero cached |
| `npm run lint -- --force` | FRESH PASS: 8/8 tasks; zero cached; zero errors/five existing warnings |
| `npm run test --workspace @stay-focused/api` | FRESH PASS: 2,120 passed; 3 skipped; 180/180 files |
| `npm run test --workspace @stay-focused/mobile` | FRESH PASS: 1,042/1,042 tests; 105/105 files; zero skips |
| `npm run test --workspace @stay-focused/shared` | FRESH PASS: 258/258 tests; 22/22 files; zero skips; source and generated JS copies |
| `npm run test --workspace @stay-focused/shared -- src` | FRESH PASS: 129/129 source tests; 11/11 files; zero skips |
| `npm run test --workspace @stay-focused/web` | FRESH PASS: 95/95 tests; 16/16 files; zero skips |
| `npm run test --workspace @stay-focused/canvas` | FRESH PASS: 75/75 tests; 1/1 file; zero skips |
| `npm run build --workspace @stay-focused/api` | FRESH PASS: 1/1 build |
| `npm run build --workspace @stay-focused/web` | FRESH PASS: 1/1 build; 19/19 static pages |
| `npm run build --workspace @stay-focused/mobile -- --platform android` | FRESH PASS: 1/1 local Android export |
| `npm run build -- --force` | FRESH PASS: 8/8 tasks; zero cached |
| `git diff --check; git diff --cached --check` | FRESH PASS: diff hygiene before documentation commit |

The default shared suite also discovers ignored build output: final result is 258 tests in 22 files, with an additional source-only run proving 129 distinct source tests in 11 files. The earlier 243/21 result predated the interrupted build emitting the new course-state test. Generated copies and validation outputs are not committed.

The first full mobile gate had **1,037 passed/3 failed in 105 files**: previous-course grouping/pinning assertions and expected swipe actions needed the CQ1 behavior. Focused repair plus two new behavior tests passed **58/58**; full reruns passed **1,042/1,042**. The previous extra root build was interrupted without completion evidence; the resumed fresh forced build passed 8/8. No gate was assumed green from partial output.

Local implementation commits:

- `a4554a9 feat(db): persist course state evidence and owner overrides`
- `39cf0ff feat(shared): classify current and past courses consistently`
- `5e1506e fix(db): guard past courses at atomic poll sync reservation`
- `6d8d51d test(shared): verify refreshed snapshots replace course state`
- `98024e8 feat(api): hide past-course work and skip routine sync`
- `132a315 feat(mobile): collapse past courses and retain Library access`
- `6d8759e feat(web): group past courses behind owner controls`

The scoped docs commit is recorded with its final hash in `tmp/overnight/CQ1.status`. The final serial run needed no retry. Existing Vite configuration and build/runtime warnings remain non-fatal. Website collapsed-section rendering/keyboard behavior is code-reviewed and build-checked; real browser/device acceptance is NOT RUN by the unattended rules.

Documentation references: FRESH PASS, **10/10 CQ1 local links**. The first
reference-check helper accidentally scanned historical roadmap sections and
flagged an unrelated old RB1 link. Bounding it to the CQ1 additions passed;
no historical document was changed to silence that helper failure.

## Owner steps remaining

Rollout and Device checks were skipped entirely. The owner must apply both new
migration files in order (filename as migration name), publish API/website and
the existing Google worker code, and publish the preview OTA. Confirm CIT17
Default Term course identities/counts and actual evidence, deployed revisions,
database state and existing Scheduler state. Verify on the realme and website
that last-term courses start collapsed, disappear from Today/Tasks/calendar/
Queue/notifications and routine sync, move correctly both ways, refresh once on
explicit open, and retain working labelled reviewers/quizzes in Library. Actual
production speed and all such live/device observations are **UNVERIFIED (owner
to confirm)**. No Scheduler creation/resumption or paid resource is required by
this code slice.
