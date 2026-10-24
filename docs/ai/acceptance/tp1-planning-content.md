# TP1 Today "Plan with" content choice — frozen local acceptance (2026-10-24)

Scope: TP1 STEP 0–4, local code/tests/gates/docs/scoped commits only. No
questions, services, environment files, remote SQL or migration application,
push, rollout or devices. The newer owner roadmap
(`2026-10-24-queue-cards-mobile-menu-clock-planner.md`, Decisions → TP1) wins over
the older TP1 brief. The owner note "put the reviewer/task option inside menu on
today clock for minimalism" supersedes the old E3 "reviewer blocks not now"
deferral for this feature only; no automatic new-module scheduling and no
reviewer generation is added. Prerequisite TC2 local PASS is committed
(dd3276f3 / c219d14c) and its coalesced preview path is reused.

## Baseline

Branch overnight/2026-10-15_feedback (matches the prompt), HEAD c219d14c.
Tracking github/main: ahead 9 / behind 27 (local refs only). Author galaxymaxp
<omgraythekid@gmail.com>. Unrelated owner paths preserved and never staged.

```text
c219d14c docs(today): close TC2 local clock verification
dd3276f3 fix(today): keep clock gestures local and preview after quiet
3972501d docs(today): freeze TC2 clock interaction acceptance
3d2b804f docs(mobile): close LM1 local options verification
2305e847 fix(mobile): open course options on long press
51a8e326 docs(mobile): freeze LM1 course options acceptance
58fbf6a0 docs(queue): close QN1 local verification
05102204 fix(queue): contain failure cards and group repeated attempts
?? UI/
?? apps/mobile/.gitignore
?? supabase/.temp/
```

## STEP 0 — confirmed source trace (baseline)

- **Clock menu.** Web `apps/web/src/features/day-clock/clock-options.tsx` is the
  TC1 "Clock options" dialog (Lock clock switch, typed free time, Save) rendered
  by `DayRingClock.tsx:607`. Mobile `apps/mobile/src/features/redesign/ClockOptions.tsx`
  is the measured native Modal with the same rows, rendered by `DayRingClock.tsx:477`.
  Neither has any planning-content control; there is no other clock menu.
- **Planner contract.** `packages/shared/src/task-planning.ts`:
  `StudyPlanningRequest { planningRange, availability, taskIds? }` with a strict
  key allow-list in `validateStudyPlanningRequest`; `generateDeterministicStudyPlan`
  orders tasks by due, priority, created, id and fills availability windows with
  ≤90 min sessions; output sessions are task-only (`taskId`, `taskTitle`).
- **Handlers.** `apps/api/app/api/experience/[...path]/route.ts:111–129` validates
  and dispatches `planner/preview` → `previewOwnedStudyPlan`, and both
  `planner/apply` and `planner/replan` → `applyOwnedStudyPlan`
  (`apps/api/src/lib/task-planning-service.ts`). Apply recomputes the plan
  server-side from the same request, hashes it and persists it through
  `apply_study_plan_v1` (`task-planning-repository.ts:persistOwnedStudyPlan`).
  Legacy `/api/study-plan/{preview,apply}` reuse the same validator/service.
- **Clients.** Web `today-screen.tsx` / mobile `TodayScreen.tsx` call
  `useQuietPlanner(owner:date)` (TC2) with `planningRequest(date, start, end)` from
  `freeTimePlanningRange`: the planning range is the **whole local day**
  (00:00 → max(24:00, end)), availability is the free time. Apply posts the
  stored `previewRequest` to `planner/replan`.
- **Persistence.** `study_sessions` (`20260827155438_task_study_plan_foundation.sql`,
  `20260828173643_replace_planned_study_sessions_on_replan.sql`) has
  `task_id uuid NOT NULL` with the owner FK `(task_id, user_id) → tasks`. It
  **cannot** hold a typed reviewer target. `apply_study_plan_v1` only accepts
  owned pending tasks. A forward-only migration is therefore required (decision
  fallback): nullable `block_kind` / `reviewer_artifact_id`, a new
  `apply_study_plan_v2`, no edit to applied migrations.
- **Reads.** Today (`ExperienceService.getTodayOverview` → `composeToday`) reads
  `study_sessions` with `select('*')` and maps each to a `study_session` item.
  Schedule/session detail read `/api/study-sessions` (`listOwnedStudySessions`,
  explicit column list). Session PATCH only changes the session row; it never
  completes a task. Web/mobile `activityFor` match study sessions to activities by
  course+title (`workKey`), which reviewer blocks must bypass.
- **Study-time estimate (E2).** `estimateReviewerMinutes` (shared) and the stored
  generated column `generated_artifact_versions.review_minutes`, exposed as
  `summary.reviewMinutes` in `experience_library_v1` (null when unavailable).
- **Saved reviewers.** `experience_library_v1` (`artifact_type='reviewer'`,
  `superseded=false`) lists the latest successful version of each non-deleted
  reviewer with `course`, `createdAt`, `reviewMinutes`; current/past exclusion is
  `isPastStoredCourse` over `canvas_courses`.
- **Last opened.** No server-side tracking exists: every summary carries
  `lastOpenedAt: null`; mobile `completedArtifactCache` keeps a device-local
  timestamp only. Detail GETs are also used for offline caching/recovery
  (`deviceLibrary.ts`, `generationRecovery.ts`), so they are not "opens".
  A minimal owner-scoped `reviewer_opens` table plus an explicit
  `POST /api/experience/library/artifact:<id>/opened` from the reader is added.
- **Orb color sync.** `/api/profile/preferences` (GET/PATCH `{orbColor}`, strict
  single-key parser used by shipped clients), `user_profiles.orb_color`, shared
  `OrbPreferenceSync` (600 ms debounced PATCH, durable per-owner pending value,
  refresh on start/focus/foreground/online/15 s). Adding a key to that response
  would break shipped 2.4.0 parsers, so the mode uses a sibling endpoint
  `/api/profile/planner-preferences` and column `user_profiles.plan_mode`, with
  the same queue (generalised, orb behaviour unchanged).

Served FS10 revision, applied migrations and production rows: **UNVERIFIED
(owner to confirm)**. Repository evidence contains no contradiction of the
prompt's assumptions.

## Decisions applied (from the roadmap) and deviations

Applied exactly: menu-only placement ("Plan with" radio group); default
`reviewers_tasks` for users who never chose, synced per user like orb color;
omitted mode = today's tasks-only behaviour and response shape; candidate rule,
24 h opened skip, ordering, one block per reviewer per day; block length
clamp(estimate, 10, 45) else 20; combined = tasks first up to 60 % of free-time
budget, then reviewers, remainder to whichever kind still has candidates; empty
copy "No saved reviewers to plan yet." / "No open tasks to plan."; no fallback to
the excluded kind; reviewer tap opens the saved reviewer; finishing a reviewer
block never completes a task.

Closest-safe deviations (recorded, not questions):

1. **Per day.** The server has no time zone. The Today planning range is already
   the whole local day, so "one block per reviewer per day" = once per plan, and
   a reviewer whose block in that range survives the replan (completed/skipped)
   is not planned again.
2. **Opened tracking.** Starts with this release (new table, reader POST); older
   APKs never report opens, so their opens are not excluded.
3. **Combined mode with no candidates of either kind** shows "No open tasks or
   saved reviewers to plan." (both decided strings would be inaccurate alone).
4. **Reviewer blocks are contiguous** (one block, never split); a reviewer that
   fits no remaining window is skipped (reviewers are optional review, so they
   are not reported as "didn't fit" work).
5. **Older APKs** reading a reviewer block see a degraded "study session"
   (reviewer title, no task). They cannot complete a task from it (session-only
   PATCH); their title-based activity matching is an existing older-client limit.

## Acceptance matrix

| Requirement | Owning layer / proof | Initial result |
| --- | --- | --- |
| Validated optional mode; omitted = tasks-only, unchanged shape | shared validator + API route tests | Missing |
| Same mode for preview and apply; invalid mode 400 | API route + service tests | Missing |
| Per-user mode storage synced web↔mobile; default reviewers_tasks | migration column, preferences route, shared sync, both clients | Missing |
| Reviewer blocks persisted with real identity (kind + reviewer id) | forward-only migration + PGlite contract + repository tests | Model cannot hold it |
| Candidate rule, 24 h skip, ordering, one per day | shared selector + repository tests | Missing |
| Block length clamp / default 20 | shared planner tests | Missing |
| Combined 60 % split, remainder, no overbook/duplicates | shared planner tests | Missing |
| Empty copy, never falls back | shared copy + client tests | Missing |
| Mode change invalidates previews; stale mode/range/date dropped | quiet planner identity + screen tests | Range/date only (TC2) |
| "Plan with" radio group in clock menu, no new visible control | web/mobile ClockOptions tests | Missing |
| Reviewer/task icon on plan blocks | PlanPreview/Today/Schedule tests | Missing |
| Reviewer block opens saved reviewer; never completes a task | Today/session navigation tests | Missing |
| Reviewer blocks survive reload; Today and Schedule | API read model + client tests | Missing |
| Keyboard/screen reader/reduced motion | native radios, a11y roles/states, tests | Missing |
| End-to-end three modes with synthetic owned data | API acceptance test (route → service → planner → persistence fake) | Missing |
| Fresh suites and serial gates | exact logs/counts | Pending |
| Docs/progress/local commits/status | explicit paths, no tmp staged | Pending |

Physical device, authenticated website, applied migration and production state
remain UNVERIFIED until the owner performs them. Results follow below.
