# TP1 Today "Plan with" — LOCAL PASS (2026-10-25)

Verified local implementation: 5,631 tests passed, all required build/typecheck/lint gates passed, and scoped source is committed. Release, migration application and physical checks remain owner steps. The original frozen baseline and initial matrix are retained below; final receipts follow them.

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

## Direct recovery (2026-10-25 Manila)

Owner request: continue the roadmap blocker, then hand the result back to
Autopilot. Runner status was idle, Manual Pause OFF; source HEAD 6c4de7e5 on
the expected branch. The existing TP1 checkpoint identified completed contract
and planner work, with unfinished UI and no implementation commit. Its backup
engine log reports a session limit and an untrusted-workspace warning; no
account, trust or runner setting was changed. The historical FAILED record is
preserved. WEB-A1/PBR supersessions were already verified by the FS8 repair and
FS10 release; no repeat of that old audit or release is needed.

Completed the mobile clock-menu radios, per-owner cached/durable preference
sync, mode-scoped quiet previews, typed preview labels/icons, saved-reviewer
navigation and explicit online reader-open reports. Reviewer session actions
only PATCH the session. Same-title reviewers/tasks now have distinct Today
grouping identities. Both presentation mirrors remain identical after their
documented import rewrite. Reviewed and retained the existing API/shared/web
work; tightened the unapplied migration's nullable-kind CHECK so a null kind
cannot carry only a reviewer target (PostgreSQL otherwise accepts NULL checks).

The checkpoint below was recorded while verification was in progress; the final
verified result follows it. It made no rollout claim. The implementation freeze is staged tree
`0779f3ea36ed98e253e14a16192df95286f77a29`; 54 owned source/test/migration paths
and SHA-256 values are recorded in `tmp/overnight/TP1/direct-source-freeze.json`.
The initial tree was frozen during the final API suite. The final freeze was
refreshed after a strict mock-type correction in the mobile plan-mode test;
Git confirms that is the only difference between the two trees. API/shared/web
bytes remained identical, and the full mobile suite and serial gates were
rerun on the refreshed freeze before committing.

The synthetic browser fixture renders actual ClockOptions/PlanPreview sources
and source-extracted primitives, with synthetic theme/haptic/icon boundaries
and a React Native Web adapter. It is not an authenticated application, native
or production test. Twenty viewport/theme/motion menu cases and four empty
mode cases passed (24 total), with zero page errors and zero outbound requests;
screenshots were inspected. Native radio accessibility state is verified in
component tests; RNW does not reflect that native state in this fixture's DOM.

Additional limitation: last-opened exclusion is based on explicit online
reader reports from new clients; offline-only reads closed before reconnect,
and old APK reads, cannot populate server history. No background prefetch or
download is incorrectly counted as a deliberate open.

## Final direct recovery result — LOCAL PASS (2026-10-25 Manila)

TP1 is **LOCAL PASS**: the Today clock menu now chooses Reviewers, Tasks or
Reviewers & tasks on web and mobile. The default is both, synced per owner with
durable offline preference writes; API callers omitting mode retain tasks-only
planning. Reviewer candidates follow the current-course/24-hour/order/estimate
rules and the mixed 60% first task budget. Typed reviewer blocks persist,
reopen their saved reviewer and never complete a task. Same-title task/reviewer
identities stay separate. No new reviewer generation or automatic module scheduling.

Implementation `3948a5fec54066f81acb9fccba3c92438e2cd13f` (tree `5184fb0d20be017a62b842afce5c2851431fbf1d`) completes
the interrupted TP1 work frozen at 6c4de7e5. Original runner TP1 FAILED remains
historical; no terminal status was rewritten. [Acceptance](tp1-planning-content.md).

FRESH final suites: **5,631 passed / 0 failed / 3 existing live skips**:
shared 772/77 files, API 2508/218,
mobile 1703/180, web 648/82.
Forced typecheck/lint/serial root build each 8/8, 0 cached (7 warnings, 0 errors: six existing warnings and one unused parameter in the TP1 synthetic API fixture); direct API/web builds
and offline Android JS/assets export PASS. Twenty viewport/theme/motion menu
fixtures plus four empty-mode cases PASS (24), zero page errors/outbound calls.
First failures and collector limitations are retained in the acceptance report.

**Owner steps remaining:** apply the forward migration
`20261024000100_today_plan_content.sql` with the next separately authorized
release, then verify all three modes on the website and Realme. Rollout/Device
checks NOT RUN; production/authenticated/native state remains UNVERIFIED.
Offline-only or old-client reviewer reads do not populate server open history.
Endpoint TP1 only. Hand back the committed evidence through the supervisor
boundary for TP1b closure; no successor feature or release is started here.
Unrelated owner paths and the historical OX2/OX1 hold remain.

### Final acceptance

| Requirement | Proof | Result |
|---|---|---|
| Optional validated mode; omitted tasks-only | shared plan-content + API planner-content acceptance | PASS |
| Preference default, owner isolation, offline retry and web/mobile exchange | planner preferences API + shared sync + native PlanModePreferencesSync tests | PASS |
| Current saved reviewer selection, 24h exclusion, ordering, estimates and budget | shared selector/planner + repository + API acceptance | PASS |
| Persistence, reload, repeat apply, overlaps and completion isolation | PGlite migration contract + API route/service/repository acceptance | PASS |
| Mode/range/date/owner stale response rejection | both quiet-planner and plan-mode suites | PASS |
| Menu-only choices, labelled radios, icons, empty states and navigation | both clock options and plan-mode suites + native reviewer session test | PASS |
| Same-title tasks and reviewers remain distinct | both presentation/plan-mode regressions and unchanged mirror test | PASS |
| Responsive themes and motion; browser keyboard interaction | 24-case local fixture and inspected screenshots; native/RNW limits above | PASS (synthetic only) |
| Required suites, fresh serial gates, documentation and commits | receipts below; final doc diff checks | PASS |
| Migration application, production, authenticated/native/Realme verification | owner release/device lane | NOT RUN / UNVERIFIED |

### Fresh gate receipts

The suites ran against the recovered implementation based on 6c4de7e5. The
54 source hashes in the freeze and final receipt match the implementation
commit tree above. The initial and final trees differ only in the mobile mock
comparison noted below; each affected suite has current byte custody. No
application source changed after the initial freeze, and no assertion was weakened.
The complete commands, timestamps and exits are in `tmp/overnight/TP1/commands.jsonl`.

| Command | Result (FRESH) | Local log | SHA-256 |
|---|---|---|---|
| `npm run test --workspace @stay-focused/shared -- --maxWorkers=2` | 772 passed; 0 skipped; 77 files | `tmp/overnight/TP1/shared-1792857855938.log` | `ef4d318a39ba556f6b7ed1a0b4a1acd2b953bd6f00f9a36a3405b8992a27c7a5` |
| `npm run test --workspace @stay-focused/api -- --maxWorkers=2` | 2508 passed; 3 skipped; 218 files | `tmp/overnight/TP1/api-1792858453579.log` | `3d5ce613da25877f15567083cf9f765b277fe6303cd67eafd7604a1af0e1d92b` |
| `npm run test --workspace @stay-focused/mobile -- --maxWorkers=1` | 1703 passed; 0 skipped; 180 files | `tmp/overnight/TP1/mobile-serial-1792859193770.log` | `a6552ba02b529e0eeb7de9c24c818cda0529c7661963c40d8539354a84741851` |
| `npm run test --workspace @stay-focused/web -- --maxWorkers=1` | 648 passed; 0 skipped; 82 files | `tmp/overnight/TP1/web-serial-1792858719741.log` | `d3fae4500e2d65fdda09e444b1f352a826168ca43be043260490ff0381f7191b` |
| `npm run typecheck -- --force` | 8/8; 0 cached | `tmp/overnight/TP1/typecheck-1792859076975.log` | `d3f15d48895a6a9a51425f9586e75ec43007b82cb8158dfc672a69b021cadd4c` |
| `npm run lint -- --force` | 8/8; 0 cached | `tmp/overnight/TP1/lint-1792859110033.log` | `e2fe0df67405f2936c8a4d2bda840816028a42e333a79067def27b945ad4dc65` |
| `npm run build --workspace @stay-focused/api` | exit 0 | `tmp/overnight/TP1/api-build-1792859309427.log` | `fbc337ddd26d074aed0299406a5ca31f2ea5a482fc832a0fc4efe5819f459a00` |
| `npm run build --workspace @stay-focused/web` | exit 0 | `tmp/overnight/TP1/web-build-1792859403215.log` | `f06f7c7ce7004eb6ac4966b8b0a1f033575b053c08861ee602c55ad03e0e57cd` |
| `npm run build --workspace @stay-focused/mobile -- --platform android` | exit 0 | `tmp/overnight/TP1/android-build-1792859464563.log` | `201c95e1c5e138accafdf5abf0f0d3d42742faecf2c2b34106d22e95d6f879d6` |
| `npm run build -- --force --concurrency=1 --env-mode=loose` | 8/8; 0 cached | `tmp/overnight/TP1/root-build-1792859585743.log` | `4f8cc04a3116869ae4a031bec47fd51807b35158d4b5cc0e04a0895d4bc507e6` |

### Failed first attempts and corrections

- Backup engine TP1.log/last-message: session limit plus workspace trust warning; original FAILED preserved. No trust/account settings changed.
- First direct typecheck: 7/8 successful, mobile had two TS2339 errors because SupportedStorage may return void; wrapped cache writes with Promise.resolve, then reran the full gate.
- First focused mobile: 8 passed / 1 failed; the existing overnight preview mock lacked the newly used ContentIcon export. Added the real component dependency to the mock; retained its positive-width assertion. Focused rerun 13/13.
- First full mobile: 1699 passed / 2 failed, both exact request assertions still omitted the new default mode. Updated them to require reviewers_tasks; no-sync/debounce assertions remain. Subsequent full passes 1702 and final 1703 include the added identity regression.
- First full web: 647 passed / 1 failed, the exact presentation mirror check caught the missing optional mode in the web copy. Synchronized that helper; the unchanged mirror assertion passes on the full rerun.
- Browser collector build initially referenced unavailable lucide-react; replaced only its icon adapter with explicit synthetic marks, no install. The next collector incorrectly expected RNW to reflect native accessibilityState as aria-checked. Native source roles/states remain tested; the fixture instead asserts actual selected planner mode and reports the RNW limitation. Final 24 cases pass.

### Review and handoff

React review covered stable keys, current request identities, effect cleanup, owner resets, independent task/reviewer navigation, accessible menu state and existing motion tokens. SQL review verified forward-only local changes, owner composite foreign keys, existing session RLS, explicit service-only grants/RPCs, fixed search paths and rollback-safe apply behavior. The live Supabase advisor/remote migration workflow is NOT RUN in this local-only task; PGlite executes the actual migration locally. See the [Supabase RLS reference](https://supabase.com/docs/guides/database/postgres/row-level-security).

`git diff --check` and `git diff --cached --check` are checked before the documentation commit. Task-owned paths are staged explicitly; UI/, apps/mobile/.gitignore, supabase/.temp/ and tmp/ remain excluded. Git author galaxymaxp <omgraythekid@gmail.com>. No push. Handoff publication and the retry status are recorded separately in the runner ledger; this report does not claim a queue admission before it happens.

Additional recorded gate attempt: the next typecheck had 7/8 tasks successful and one TS2367 in the new native plan-mode test because ReactTestInstance.type excludes synthetic host names at the type level. String(node.type) now compares the same mocked ContentIcon name without an unsafe type comparison; the reviewer-icon assertion is retained. Final full mobile and forced gates were rerun after this test-only correction.

Source custody distinguishes working-tree SHA-256 values (which preserve local CRLF bytes) from normalized Git blob hashes. Both are in the final receipt. The implementation commit exactly matches the frozen index tree; confirm source-only Git diff is empty before reusing receipts after a checkout or line-ending change.

Compatibility detail: omitted-mode planning keeps task-only allocation and the legacy preview shape. Study-session read/apply responses add optional kind metadata for task rows; those responses are additive rather than byte-identical. Existing clients consume typed data without a strict unknown-key rejection. The older-client reviewer-block limitation recorded above remains explicit.

Build hygiene: restored only the two Next-generated next-env.d.ts files to their verified pre-build Git contents after the checks. Their generated route-reference/comment changes are excluded from the feature commit.

## TP1b custody and closure receipt (2026-10-25 Manila)

**PASS for the unchanged-source local scope.** Implementation
`3948a5fec54066f81acb9fccba3c92438e2cd13f` and completion documentation
`8e5c7d536895d567951fefe04299fd55058e30bf` are ancestors of the closure.
All 54 working-file SHA-256 values match both local freeze/receipt manifests;
all 54 normalized Git blobs and their SHA-256 values match the implementation.
The source-only diff from that commit is empty. Its tree is
`5184fb0d20be017a62b842afce5c2851431fbf1d`. The initial-to-final tree difference
is only the recorded mobile mock-type comparison, with its assertion retained.

CACHED in TP1b (verified existing FRESH direct-run evidence): all ten gate-log
SHA-256 values match the committed table above and their successful exits in
`tmp/overnight/TP1/commands.jsonl`. Actual logs show shared 772/77 files,
API 2,508/218 (3 live skips), mobile 1,703/180, web 648/82: **5,631 passed,
0 failed, 3 skipped**. Typecheck, lint and serial root build each show 8/8,
0 cached; direct API/web builds and offline Android JS/assets export exited 0.
The seven lint warnings and all recorded failed attempts remain documented.
No application tests, builds or browser fixture were rerun by TP1b.

Mandatory LOCAL rows were reviewed against implementation and tests: planner
contract/selection/allocation, actual local PostgreSQL migration execution via
PGlite, persistence/reload and owner/old-schema behavior, both menu/sync/preview
and session surfaces, stale identities and same-title separation. The pinned
browser receipt hash matches: 20 menu cases plus four empty-mode cases, with
zero recorded page errors/outbound requests. Two retained narrow screenshots
were inspected again. Synthetic/RNW evidence establishes no native,
authenticated or production acceptance; all earlier limitations remain.

FRESH bookkeeping checks: `git diff --check` and
`git diff --cached --check` PASS. Original `TP1.status` remains FAILED;
`TP1b.status` records the new PASS and closure commit. Planning documents are
reconciled; no supervisor/queue setting was changed. This closes TP1 only.

**Owner steps remaining:** rollout and Device checks NOT RUN. Apply
`20261024000100_today_plan_content.sql` with a separately authorized release,
then verify all three modes on the website and Realme. Applied migration,
served revision, production/database/Scheduler/provider state, authenticated
and native behavior remain UNVERIFIED (owner to confirm). Old-client and
offline-only reads closed before reconnect still do not populate open history.

TP1b final status-validator attempt: the first read-only check rejected the
existing UTF-8 BOM before FAILED in historical TP1.status. Corrected the reader
to ignore the BOM in memory; the original file is untouched. This was a helper
assertion failure, not an application or diff-gate failure.
