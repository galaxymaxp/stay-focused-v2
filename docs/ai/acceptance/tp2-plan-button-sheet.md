# TP2 Plan button and planning sheet

Status: PASS (local). Finite scope: TP2 STEP 0–6, local gates, docs and scoped
commits only. Rollout and Device checks are NOT RUN. Author: galaxymaxp
<omgraythekid@gmail.com>. No provider/service calls, deployment, remote SQL,
Scheduler, email, env-file edits, push or native release is authorized.

## Baseline / STEP 0 (before code edits)

Branch `overnight/2026-10-15_feedback`, HEAD `6456d91a`. FRESH
`git merge-base --is-ancestor 3948a5fe HEAD` and the same for TC2 `dd3276f3`:
both exit 0. TP1b closure is in `8eae9fa7`/`d2a45bb2`; acceptance reports
`tp1-planning-content.md` and `tc2-clock-interaction.md` record LOCAL PASS.

`git log --oneline -8`:

```text
6456d91a docs(web): record WEB-A4 release readiness and FULLSEND handoff
543c87d8 docs(web): record WEB-A3 website repairs
614138c7 fix(web): keep saved drafts current after reload and restore copy
628e29f0 docs(web): freeze WEB-A3 repair acceptance
97053ea8 docs(web): record WEB-A2 browser verification and defects
fd382594 test(web): align browser harness with current website and contracts
d2a45bb2 docs(today): record TP1b status validation note
8eae9fa7 docs(today): close TP1b evidence verification
```

`git status --short`: only `?? UI/`, `?? apps/mobile/.gitignore`,
`?? supabase/.temp/`. Preserve these and all `tmp/` paths; never stage them.
Read root AGENTS.md, AUTOPILOT.md, newest planning/handoff records and both
owner roadmaps in full. TP2 Decisions supersede TP1 placement/preferences.
Planning docs reference FS11 whereas TP2 calls FS10 the served baseline;
live served revision is UNVERIFIED (owner to confirm). This is historical
documentation, not a source-code prerequisite contradiction.

## Inventory

| Piece | Existing implementation / reuse |
| --- | --- |
| Today | `apps/web/src/features/today/today-screen.tsx`; `apps/mobile/src/features/redesign/TodayScreen.tsx` |
| Clock / menu | Web `features/day-clock/DayRingClock.tsx`, `clock-options.tsx`; mobile `features/redesign/DayRingClock.tsx`, `ClockOptions.tsx`; TP1 radio groups exist |
| Liquid / glass | Web/mobile `DayOrb.tsx`, shared `orb-ambient-renderer.ts`, `clock-glass-renderer.ts`, `clock-glyphs.ts`; clock font fallback and glass digit shading exist; time-glyph atlas is specialized |
| Blocks | Both `DayRingClock.tsx` draw proposed/accepted 6px colored arcs, **no logos or kind icons**; web `today/plan-preview.tsx`, mobile `PlanPreview.tsx` draw linear blocks with kind icons. Course identity details use web `components/course.tsx`, mobile `design/courseIdentity.ts` |
| Planner | `packages/shared/src/task-planning.ts`, `plan-content.test.ts`; API `task-planning-service.ts`, `task-planning-repository.ts`, `app/api/experience/[...path]/route.ts`; bearer auth and typed reviewer persistence already exist |
| Latest wins | Shared `quiet-preview.ts`; web `use-quiet-planner.ts`, mobile `useQuietPlanner.ts`; reuse 400ms coalescer |
| Containers / controls | Mobile `design/primitives.tsx` Sheet (one ScrollView, Android back, opaque surface), SegmentedControl; web existing popover/dialog patterns and standard checkbox/segmented CSS |
| Reorder | Mobile `useLibraryOrganizer.ts`/`libraryOrder.ts`; web `app-model/libraryOrder.ts` has pure move/ordering helpers but no general web drag component. Reuse the native organizer; shared constrained moves follow Library's ordering semantics, with HTML5 drag events on web. No dependency needed |
| Course order | API `experience/mappers.ts` `orderGenerateCourses`; Library uses shared `library-sort.ts` grouping plus local sort preference. Candidates must use stored current courses without provider inventory refresh; reuse stored-course state and existing course summary/order semantics |
| Mode sync | Web `components/shell.tsx` mounts `plan-mode-sync.tsx`; mobile `app/_layout.tsx` mounts `PlanModePreferencesSync.tsx`. Remove mounts as well as Today consumption; retain compatibility implementation/API |

No TP2 migration was needed. Existing TP1 migration remains untouched and unapplied.

## Implementation decisions and safe equivalents

- The candidates read uses Generate's exact stored inventory mapping and
  `orderGenerateCourses`, with no live-inventory fallback. Tasks include owned
  synchronized future assignments awaiting a task row. Reading candidates is
  read-only; Build admits only selected assignments through the existing
  idempotent local import RPC. Their owned assignment UUID remains a valid
  selection alias across preview, release and apply. No Canvas sync, Library
  endpoint refetch, provider estimation or generation is triggered.
- Selection mode, course scope and ordered typed item IDs are carried unchanged
  from the UI preview request into apply. Smart mode uses TP1's selected-set
  ordering/split. Manual mode walks the ordered selection and stops after work
  exhausts the windows. Shared not-fit accounting includes reviewers and the
  unplaced portion of tasks; both sheet summaries execute that same planner.
- Device-process memory preserves the last built choice through navigation for
  the current owner/date. New owner/date or a JS reload clears it. Draft edits
  and Reset are applied only by Build; closing without Build leaves the active
  choice intact. Both UI mode-sync mounts are removed; compatibility APIs,
  stores, tests, columns and endpoints remain for older clients.
- The orb is a spherical WebGL scene, and its glass atlas contains canonical
  time glyphs only (no lowercase `lan`). The rectangular button uses layered
  SVG liquid with the fixed `#d7aa38` accent, glass shell highlights and the
  clock's Inter font/weight/tracking plus glass-style highlights. This is the
  permitted closest safe equivalent to the digit shader, without another
  WebGL context or changes to the clock renderer. The shell never morphs or
  changes color. Only the internal layer tilts for 600ms. Reduced Motion uses
  a static fill and 0.85 opacity feedback. Native motion uses the native driver;
  foreground/focus and web visibility/focus govern flow lifetime.
- Both ring implementations already draw only 6px colored arcs, without any
  logo/icon nodes. They remain color-only: the shared fit rule rejects marks of
  the existing icon dimensions at those thicknesses at all tested clock sizes.
  The variable-width linear proposed blocks now measure their real display
  dimensions, omit unfit kind marks before render and remeasure on resize.
  Existing accepted linear Today/Schedule entries are fixed rows with course
  dots, not duration-sized logo blocks. No new clipped mark is introduced.
- Reuse: native Sheet (one ScrollView, back/swipe dismissal), SegmentedControl,
  Library organizer and its move semantics; web dialog/popover patterns and
  native checkboxes. No dependency or migration added. Native Sheet gains
  optional header metadata/Close text and disables sheet-drag dismissal while
  a list reorder owns the gesture; defaults for other sheets are preserved.

## Failed first attempts and corrections

All attempts below are retained under `tmp/overnight/TP2/` (never staged).
Assertions were not weakened.

| Attempt | Result / correction |
| --- | --- |
| Initial helper invocation | PowerShell `-w` was interpreted as an ambiguous script flag; switched to an explicit argument array. No suite ran. The `python` Store alias was unavailable; used installed `py -3`. |
| `mobile-typecheck-first.log` | 4 TypeScript errors: Copy did not forward live-region or ellipsis props; added precisely typed optional props. Rerun exit 0. |
| `browser-first.log` | 3 passed / 5 failed: UTC fixture sessions were rendered against local-hour preview bounds, hiding all marks. Corrected the fixture's timezone, preserving its icon-fit assertion; rerun 8/8 PASS. |
| `browser-rerun.log` | Node preload path lost Windows separators; normalized the guard path to forward slashes. No suite ran. |
| `typecheck-first-root.log` | 5 successful / 8 total, 0 cached; web failed with 2 test typing errors (`AnimationEffect` not narrowed to KeyframeEffect, implicit callback type). Added the correct runtime/type narrowing. |
| `typecheck-final.log` | 6 successful / 8 total, 0 cached; mobile failed with 2 errors: a new optional sheet gesture prop was mistakenly declared on Page. Moved it to Sheet and removed the unintended Page edit. Subsequent root runs 8/8, 0 cached. |
| `native-visual-first.log` | `npm exec node` attempted tool resolution; the local guard blocked outbound registry traffic before dispatch. Invoked the already installed Node directly. No remote service call occurred. |
| `native-visual-rerun.log` | Isolated collector pulled the native theme/audio boundary and lacked WAV loaders (4 bundle errors). Corrected the collector's theme boundary to its synthetic state shim. |
| `native-visual-rerun2.log` | RNW omitted checkbox checked-state attributes. Added explicit ARIA checked values alongside native accessibility state; retained the false-state assertion. Final collector 8/8 PASS. |
| `lint-gate.log` | 8/8 tasks passed, 0 cached, but 37 warnings included new test import-order/duplicate-type-import warnings. Reordered owned test imports and consolidated Today types; final lint below is authoritative. |
| `mobile-full.log` | 1,714 passed / 1 failed / 0 skipped, 181 files passed / 1 failed. The required-update Sheet must retain `onScroll: undefined` when nondismissible with no caller. Restored that exact default; unchanged assertion plus planning sheet focused rerun: 20/20 PASS. |
| `web-full-final.log` | 656 passed / 5 failed / 0 skipped, 83 files passed / 1 failed. The announcement-read Node harness lacked the new planning-control DOM boundary. Added the same component mock used for its other unrelated Today controls; every existing announcement assertion is unchanged. Focused rerun 5/5 PASS; full rerun below. All 8 planning browser checks passed in this first full run. |
| First UI staged diff check | Exit 2, one new blank line at EOF in planning-sheet.browser.test.ts:221. Removed only the extra trailing blank line; staged diff check rerun PASS before the UI commit. No executable source or assertion changed after the passing suites/builds. |

Review also caught two cases before closure: measured narrow titles now reserve
their filename extension in the middle ellipsis, and manual ordering discards
short windows skipped by an earlier reviewer so later tasks cannot backfill
before it across a busy gap. Both have shared regression coverage. Fresh final
typecheck/lint and full suites are rerun after these source corrections.

## Visual evidence and limits

Local artifacts are deliberately untracked, linked here for review:

- [Phone web default](../../../tmp/overnight/TP2/browser/390-light-default.png),
  [phone expanded](../../../tmp/overnight/TP2/browser/390-light-expanded.png),
  [desktop dark](../../../tmp/overnight/TP2/browser/1280-dark-default.png).
- [Mobile default](../../../tmp/overnight/TP2/native-390-light-true-default.png),
  [mobile dark expanded](../../../tmp/overnight/TP2/native-320-dark-false-expanded.png).
- Browser test `apps/web/src/features/today/planning-sheet.browser.test.ts`
  drives real web components, clock renderer and CSS over loopback fixtures.
  It covers two-tap defaults, reopen/opt-in, course selection, Include, Reset,
  focus trap/Escape/focus return, reload, fixed shell/slosh, static reduced
  motion, preview resize and cadence. Its eight cases passed before the final
  full-suite run; that run supplies the terminal result below.
- Native visual collector (`native-visual.cjs`, source hashes in
  `native-source.json`) uses actual PlanningControl/PlanningSheet/PlanButton,
  extracted current Sheet/controls, RNW/SVG adapters and synthetic theme/icons.
  The clock is a labelled placeholder; native font loading/haptics are isolated.
  **8 cases / 0 page errors / 0 outbound requests**, reviewed at 320/390 px,
  light/dark, reduced/full motion. This is layout evidence, not device proof.
- First headless cadence sample: 24 warmed frames each; paused median 83.3ms,
  flowing 83.5ms (SwiftShader). Final measurements are in
  `browser/button-clock-cadence.json`. No material headless cadence change;
  real GPU, app-frame-rate and native-device performance remain UNVERIFIED.

## Acceptance matrix (frozen before implementation)

| Requirement | Owning layer | Required local evidence | Result |
| --- | --- | --- | --- |
| Optional selection, legacy byte identity and old mode requests | Shared/API | Validator + service/route regression | PASS (local) |
| Owned courses/items; invalid kinds/duplicates safe denial | API/shared | Synthetic owned fixtures and rejection cases | PASS (local) |
| Candidate course grouping/estimates/opened history/free minutes | API | Read-only synthetic repository tests; no sync/refetch | PASS (local) |
| Smart selected TP1 ordering/60%; manual exact order; not-fit totals | Shared | Planner cases for courses, kinds, opted-in reviewers and over budget | PASS (local) |
| Clock menu cleanup and no UI preference sync | Both | Component/source tests and affected suites | PASS (local) |
| Fixed glass Plan button, slosh, reduced motion and lifecycle pause | Both | Component/browser proof; frame-rate comparison if available | PASS (local) |
| Single opaque sheet, defaults, empty states, Select/Include/summary | Both | Component + synthetic browser cases at mobile/desktop widths | PASS (local) |
| Group/row reorder, no cross-course movement, accessible moves/reset | Both/shared | Pure reducer + component/browser tests | PASS (local) |
| Build/close/session/date/reload behavior, active clock selection/races | Both/shared | Integration and latest-wins regression | PASS (local) |
| Logo/icon measurement at boundaries, full/tiny blocks and resize | Shared/both | Pure helper + rendered linear block cases | PASS (local) |
| Keyboard/focus/Escape/screen-reader semantics, Android dismissal | Both | Component/browser checks; native assistive technology UNVERIFIED | PASS (local) |
| Full affected suites and required serial fresh gates | All affected | Exact counts/logs; first failures retained | PASS (local) |

## Verification receipts

FRESH: shared 821/80 files; API 2517/218 files (3 existing live skips); mobile 1715/182 files; web 661/84 files. **5714 passed / 0 failed / 3 existing live skips**.

| Required check | Terminal result | Evidence |
| --- | --- | --- |
| npm run typecheck -- --force | FRESH PASS, 8/8 tasks, 0 cached | typecheck-final-harness.log |
| npm run lint -- --force | FRESH PASS, 8/8 tasks, 0 cached; 7 existing warnings / 0 errors | lint-final-harness.log |
| npm run test --workspace @stay-focused/shared -- --maxWorkers=1 | FRESH PASS, 821 tests / 80 files, 0 failures/skips | shared-final-source.log |
| npm run test --workspace @stay-focused/api -- --maxWorkers=1 | FRESH PASS, 2,517 tests / 218 files, 0 failures, 3 existing live skips | api-full-final.log |
| npm run test --workspace @stay-focused/mobile -- --maxWorkers=1 | FRESH PASS, 1,715 tests / 182 files, 0 failures/skips | mobile-full-final.log |
| npm run test --workspace @stay-focused/web -- --maxWorkers=1 | FRESH PASS, 661 tests / 84 files, 0 failures/skips | web-full-rerun.log |
| npm run build --workspace @stay-focused/api | FRESH PASS, exit 0, 38/38 static pages | api-build.log |
| npm run build --workspace @stay-focused/web | FRESH PASS, exit 0 | web-build.log |
| npm run build --workspace @stay-focused/mobile -- --platform android --output-dir ../../tmp/overnight/TP2/android-export | FRESH PASS, exit 0, Android HBC + metadata | android-export.log |
| npm run build -- --force --concurrency=1 --env-mode=loose | FRESH PASS, exit 0, 8/8 tasks, 0 cached | root-build.log |
| git diff --check; git diff --cached --check | FRESH PASS before scoped commits; repeated for completion docs | Git + diff receipts |
| Workflow/provider contract gates | NOT APPLICABLE: workflow/provider implementations unchanged | API suite includes existing boundary regressions |
| Production/rollout/device checks | NOT RUN; UNVERIFIED (owner to confirm) | Explicit unattended exclusion |

All log paths are relative to tmp/overnight/TP2. Listed verification commands ran serially with repo-local TEMP/TMP/TMPDIR, local npm/Turbo caches, EXPO_NO_DOTENV=1, EXPO_OFFLINE=1, telemetry disabled and a loopback-only Node/browser guard. Environment-file reads were excluded; no environment file was edited. Expo emitted its existing FORCE_COLOR/NO_COLOR warning. Existing lint warnings remain: five mobile test import warnings, web Library unused useMemo, and TP1 synthetic API fixture unused user parameter.

Next regenerated the two tracked next-env.d.ts framework declarations during
builds. Their generated changes were restored to the initially clean baseline
and excluded from commits; the final forced typecheck had already passed with
those baseline declarations. Validation outputs remain under ignored paths.

Headless clock cadence: paused 83.3ms median; flowing 83.4ms median (24/24 warmed frames). Native/GPU frame rate remains UNVERIFIED.

Native-layout collector: FRESH 8/8 cases, 0 page errors, 0 outbound requests (native-visual-verified.log, native-results.json, source hashes in native-source.json). The eight real web planning browser tests are included in the 661-test web suite and saved 390/768/1280 px evidence. No unresolved flake is claimed; deterministic first failures and all corrections are retained above.

Live served revision (FS10 in TP2 versus FS11 in newer repo history), applied TP1 migration, remote database/Scheduler/provider state, authenticated visuals, real browsers/Realme assistive technology, native drag/haptics and physical performance are **UNVERIFIED (owner to confirm)**.

## Commits and endpoint

Verified implementation head: 4a04eda1edaebcf6369a533a82889af5b2d3ce74 (tree 4557bd36213bf1604e002eb18c32f79805d5571a).

```text
630bb223 docs(today): freeze TP2 implementation acceptance
705013b5 feat(planner): add owned selections and planning candidates
ac428fed fix(planner): preserve selected work and chronological order
4a04eda1 feat(today): add Plan sheet and size-aware block marks
```

Completion documentation is the local commit with subject "docs(today): close TP2 local planning verification"; its exact hash is in Git and tmp/overnight/TP2.status (a commit cannot embed its own hash). Author for every TP2 commit: galaxymaxp <omgraythekid@gmail.com>. No tmp, generated validation output, credentials, private fixture or unrelated owner path was staged. Endpoint TP2 only; no successor or release started.

## Owner steps remaining

- Rollout NOT RUN: release via the next separately authorized FULLSEND.
- Device checks NOT RUN: website and Realme button/slosh, defaults/two-tap
  build, course selection, each Include mode, over-budget summary, manual
  reorder/Reset, small blocks with no half logos, native assistive technology.
- Confirm served revision, applied TP1 migration and production state.
