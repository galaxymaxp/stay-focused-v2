# PL2 planner UI — acceptance

Status: PASS (local unattended code scope). Finite unattended local scope: STEP 0–5, gates, docs and
local commits only. No remote calls, environment-file edits, rollout, device
checks, pushes, migrations or releases. PL1 prerequisite is PASS in
`tmp/overnight/PL1.status` and repository implementation.

## Baseline / STEP 0

Branch `overnight/2026-10-15_feedback`, HEAD `0150b476`, upstream github/main
(ahead 7, behind 32; local observation only). Owner identity:
galaxymaxp <omgraythekid@gmail.com>. Dirty baseline, preserved and never staged:
`?? UI/`, `?? apps/mobile/.gitignore`, `?? supabase/.temp/`. `tmp/` stays ignored.

```text
0150b476 docs(today): close PL1 planner logic verification
d0bd46b9 fix(today): keep exclusions through sheet resets
ac0ba4fc fix(plan): preserve startup defaults and split-block order
d9d03849 feat(today): skip, remove, put back, move up and previous-plan data
767c5b46 feat(today): automatic plan proposal with first-run 8-10 PM window
a8baa121 feat(today): device stores for plan overrides and last plan
d6cda5ee feat(plan): shared window, override and snapshot helpers
37ce7307 docs(release): record RR1d readiness supersessions
```

Read root AGENTS.md, CLAUDE.md, AUTOPILOT.md, current planning documents and
newest handoff sections; mobile PlanningSheet, PlanPreview, TodayScreen; web
planning-sheet, plan-preview, today-screen and today-calendar; adjacent tests,
PL1 planner hooks/stores/shared helpers and imported primitives/theme/tokens.
Approved roadmap and all three HTML/style references are in the owner folder
`C:/Users/Fely Max Dilinila/Claude/Projects/Stay Focused/overnight/roadmaps/`.
The repo-relative reference is absent; use those original files read-only.
Decisions D1–D15 are final. FS12/live served revision and remote database,
Scheduler and provider state: UNVERIFIED (owner to confirm).

Below-clock inventory (D8):

| Platform / component | Classification / disposition |
| --- | --- |
| Mobile PlanningControl / PlanButton | Keep button wired; replace sheet body |
| Mobile PlanPreviewLoading / PlanPreview | Old proposal bar/actions: replace inside sheet |
| Mobile Notice (apply/preview/candidate) | Other: keep |
| Mobile Up Next, TodayTimeline, Later Today | Old scheduled-session lists: replace with sheet timeline; retain non-session task navigation/deadlines |
| Mobile hidden Undo/list, Due soon, TodayCalendar | Other: keep; pin/hide remain for tasks |
| Mobile announcements / expanded calendar | Other: keep |
| Web PlanningControl / PlanButton | Keep button wired to inline Adjust; remove unused dialog |
| Web loading / PlanPreview | Old proposal bar/actions: replace in plan column |
| Web notices / failed-read retry / day loader | Other: keep after plan |
| Web Up Next, TodayTimeline, Later Today | Old scheduled-session lists: replace with plan timeline/Up next; retain non-session task navigation |
| Web Overdue / Done, Due soon, hidden Undo/list | Other: keep after plan |
| Web TodayCalendar / announcements | Other: keep after plan |

Existing plan/ring tones are `blue`, `violet`, `green`, `orange`, assigned by
`planToneFor` and `planTaskIds` (mobile PlanPreview, web day-clock/timeline).
Existing course identity tones remain valid. Reuse this palette only for course
dots and fit segments. Content/check/button states use neutral text/surface/
separator tokens. Clock renderer/gestures and PlanButton implementation are
excluded. Existing mobile Sheet, SegmentedControl and Library drag organizer
are reused; no dependency planned.

## Acceptance matrix

| Decision | Owning layer / proof | Result |
| --- | --- | --- |
| D1 monochrome | Touched UI neutral tokens; git grep assertion | FRESH PASS: explicit git grep plus reviewed primitive diff; screenshots |
| D6 tray | Default open, conditional rendering, exact Put back key | FRESH PASS: mobile sheet and Today browser Remove/Put back/reasons |
| D7 Previous | Snapshot summary/status timeline/restore/empty tests | FRESH PASS: mobile and browser empty/populated/status/restore-after-edit |
| D8 mobile sheet / web columns | DOM order, 1280 and 390 layout, retained-content inventory | FRESH PASS: browser DOM order, 1280/390 wrapping/screenshots; mobile renderer; native visuals UNVERIFIED |
| D9 fit / timeline / adjust | Actual plan totals/segments, clean course rows, accordion, remove/restore/manual drag/a11y | FRESH PASS: shared fit/alias/tone tests, mobile sheet and browser controls/navigation |
| D10 welcome | First-run only; dismissal persistence; clock move permanently dismisses | FRESH PASS: both welcome suites, hook tests and persistent browser dismiss/clock move |
| D11 skeleton | Exact shapes, no-cache only, reduced motion/static and busy semantics | FRESH PASS: no cached candidates/plan coverage, busy semantics and Reduce Motion tests |
| D2 / D15 invariants | Clock/PlanButton source unchanged; no remote/release actions | FRESH PASS: Git confirms clock/PlanButton source unchanged; no remote actions |

## Verification

Completed fresh focused checks and serial prompt gates. Failed first attempts,
reruns, exact counts, cache results and limitations are recorded below.
Local evidence goes under ignored `tmp/overnight/PL2/`.

## Owner steps remaining

- Rollout NOT RUN, skipped entirely: owner FULLSEND after PL4.
- Device checks NOT RUN, skipped entirely: Realme + website look check against
  approved mockups, native accessibility/motion/performance.
- Confirm UNVERIFIED live production/served revision/database/Scheduler state.

## PL2b interruption recovery / STEP 5

Resumed on the same branch at `ed1c98bc`. PL2.progress and Git establish that
steps 0-4 were complete; no committed implementation step was redone. There
was no PL2b.progress on entry. The 11 tracked dirty paths belonged to PL2
closeout and were inspected and retained. Unrelated owner paths remain intact.

The resumed slice completes course-keyed fit/timeline/tray tones, Canvas
assignment alias matching for item checks, clearing edited local settings on
Previous restore, measured mobile drag header heights, planner sheet sizing,
neutral retained artwork and suppression of the remaining duplicate session
list in expanded mobile controls. Added focused shared fit/identity tests and
mobile/browser restore-after-edit coverage. No dependency was added.

The unused web planning-sheet implementation and its dialog-only browser suite
were removed in dcd783ae; only Today imported the implementation. Replacement
Today browser tests exercise inline Adjust, courses, accordions, Remove/Put
back, keyboard manual ordering and Up next navigation on the actual Today
component. Existing PlanButton and clock implementations remain unchanged.

### Retained failed first attempts and reruns

Evidence: ignored `tmp/overnight/PL2/gates/`, `receipts.jsonl` and `gates.json`.
Earlier failed attempts belong to the interrupted PL2 run and remain recorded:

| Attempt | Exact result | Cause / resolution |
| --- | --- | --- |
| mobile-sheet-step1 / rerun | each 5 passed, 2 failed / 7 | Ambiguous renderer label selector and replacement-character punctuation in expected status; explicit checkbox selector and correct text |
| mobile-sheet-step1-fixed | 6 passed, 1 failed / 7 | Tray reason encoding mismatch; corrected exact punctuation; final 7/7 |
| web-step2-focused | 6 passed, 5 failed / 11 | Announcement Node fixture needed the new Today planner boundary mocked; final 11/11 |
| web-step2-browser | 0 passed, 4 skipped; suite setup failed | Generator imported from wrong shared entry; correct task-planning import |
| web-step2-browser-rerun | 0 passed, 4 failed / 4 | Fixture actually yields four fit segments; asserted actual plan; final 4/4 |
| web-welcome-step3 | 24 passed, 1 failed / 25 | Slider fixture used obsolete accessible name; corrected to Free time ends; final 25/25 |
| mobile-skeleton-step4 | 23 passed, 1 failed / 24 | Loading branch still rendered old text; replaced that branch with PlannerSkeleton; final 24/24 |
| web-skeleton-step4 | 5 passed, 1 failed / 6 | Loading query fixture also intercepted the candidates request; isolate preview loading; final 6/6 |
| pl2b-web-focused | 7 passed, 1 failed / 8 | Assertion read requests before the quiet planner debounce; wait for the manual preview request; rerun 8/8 |
| pl2b-typecheck first | 7/8 tasks, 0 cached; one TS2769 | Pending skeleton test Promise inferred unknown; explicitly typed PlanningCandidates; rerun 8/8 |
| pl2b-web-unit first | 556 passed, 9 failed / 565 in 78 files | Clock interaction fixture mocked the removed standalone preview boundary; mock TodayPlanner instead, preserving every clock/save/no-refetch assertion; rerun 565/565 |

The first typecheck log is retained as `pl2b-typecheck-first-failed.log`;
the successful rerun has `pl2b-typecheck.log`. A local `node -e` log-summary
helper initially hit Windows argument-quoting syntax and was replaced with
a file-based helper; no product test or gate was affected by that helper.

Review also found and repaired a mobile no-cache edge case: while candidate
loading is pending, cached proposed/saved blocks now render the fit and timeline
with apply disabled, rather than replacing those blocks with a skeleton. The
dedicated cached-plan regression joins the full final mobile suite. Only absent
content gets the skeleton; errors remain explicit. Three PL2 byte-order marks
and an unused tone-helper import were removed after the initial green lint
(11 warnings); closing lint verifies the resulting warning count.

The browser fixture freezes both new Date() and Date.now() to its synthetic
evening, keeping Previous status assertions independent of the wall clock.
The final browser rerun covers that deterministic fixture as well.

## Final fresh gates and commits

shared **946/97 files**, mobile **1759/189**, web **727/91** (565 unit + 162 Chromium): **3432 passed / 0 failed / 0 skipped**. All 13 current browser files were run separately and serially
under the normal repository Vitest config (RR1d command pattern; ambient uses
its established threads pool). No tests were deleted or skipped to pass.
The old web sheet/dialog suite was replaced by actual Today inline coverage.

| Gate | Final result / freshness |
| --- | --- |
| Forced root typecheck | FRESH PASS 8/8 tasks, 0 cached |
| Forced root lint | FRESH PASS 8/8 tasks, 0 cached; 7 existing warnings, 0 errors |
| Shared suite | FRESH PASS 946/946, 97 files |
| Mobile suite (after cached-plan repair) | FRESH PASS 1759/1759, 189 files |
| Web unit suite | FRESH PASS 565/565, 78 files |
| Web Chromium suites | FRESH PASS 162/162, 13 files |
| Direct API build | FRESH PASS 1/1 |
| Direct web build | FRESH PASS 1/1 |
| Offline Android JS/assets export | FRESH PASS 1/1 |
| Forced serial root build | FRESH PASS 8/8 tasks, 0 cached |
| Working/staged diff hygiene | FRESH PASS before each scoped commit |

Exact commands (run serially with repo-local TEMP/TMP/TMPDIR, local npm/Turbo
caches, EXPO_NO_DOTENV=1, offline/telemetry flags, credential-stripped children
and loopback-only Node/browser network guards):

```text
npm run typecheck -- --force
npm run lint -- --force
npm run test --workspace @stay-focused/shared -- --maxWorkers=1
npm run test --workspace @stay-focused/mobile -- --maxWorkers=1
npm run test --workspace @stay-focused/web -- --maxWorkers=1 --exclude **/*.browser.test.ts
npm run test --workspace @stay-focused/web -- --maxWorkers=1 src/components/course-options.browser.test.ts
npm run test --workspace @stay-focused/web -- --maxWorkers=1 src/features/day-clock/ambient.browser.test.ts --pool=threads --reporter=verbose
npm run test --workspace @stay-focused/web -- --maxWorkers=1 src/features/day-clock/glass-clock.browser.test.ts
npm run test --workspace @stay-focused/web -- --maxWorkers=1 src/features/day-clock/orb-load.browser.test.ts
npm run test --workspace @stay-focused/web -- --maxWorkers=1 src/features/generation-screen.browser.test.ts
npm run test --workspace @stay-focused/web -- --maxWorkers=1 src/features/knowledge-core/orbBody.browser.test.ts
npm run test --workspace @stay-focused/web -- --maxWorkers=1 src/features/password-reset.browser.test.ts
npm run test --workspace @stay-focused/web -- --maxWorkers=1 src/features/queue-failures.browser.test.ts
npm run test --workspace @stay-focused/web -- --maxWorkers=1 src/features/queue-orb.browser.test.ts
npm run test --workspace @stay-focused/web -- --maxWorkers=1 src/features/today/plan-glass.browser.test.ts
npm run test --workspace @stay-focused/web -- --maxWorkers=1 src/features/today/today-planner.browser.test.ts
npm run test --workspace @stay-focused/web -- --maxWorkers=1 src/lib/hide-on-scroll.browser.test.ts
npm run test --workspace @stay-focused/web -- --maxWorkers=1 src/lib/screen-snapshots.browser.test.ts
npm run build --workspace @stay-focused/api
npm run build --workspace @stay-focused/web
npm run build --workspace @stay-focused/mobile -- --platform android --max-workers 1 --output-dir ../../tmp/overnight/PL2/android-export
npm run build -- --force --concurrency=1 --env-mode=loose
```

Full receipts/logs: tmp/overnight/PL2/receipts.jsonl, pl2b-summary.json and
gates/pl2b-*.log; failed first logs retain explicit first-failed copies. The
root build uses inherited OS CPU affinity 1, unchanged Metro/repository config.
Generated Next declarations were restored to pre-gate bytes before the closing
typecheck. Validation output stays under ignored tmp/ or existing build outputs.
No source or test change follows these final successful checks.

Code commits from the interrupted run and continuation:

```text
0621d075 feat(today-mobile): redesigned plan sheet (proposed/previous, tray, nested smart order)
dcd783ae feat(today-web): two-column Today with Up next, timeline and adjust panel
8b15376f feat(today): first-run window note
ed1c98bc feat(today): skeleton loading for the planner
48170548 fix(today): finish planner parity and cached plan loading
```

The scoped docs closeout commit follows; its hash is in Git and
tmp/overnight/PL2b.status/progress. No applied migration or remote history changed.

### Monochrome and invariant assertion

```powershell
git grep -n -E 'amber|accent' -- apps/mobile/src/features/redesign/PlanningSheet.tsx apps/mobile/src/features/redesign/PlanPreview.tsx apps/mobile/src/features/redesign/PlannerSkeleton.tsx apps/mobile/src/features/redesign/TodayScreen.tsx apps/mobile/src/features/redesign/TodayWelcome.tsx apps/mobile/src/design/ClearDay.tsx apps/web/src/features/today/today-screen.tsx apps/web/src/features/today/today-planner.tsx apps/web/src/features/today/plan-preview.tsx apps/web/src/features/today/planner-skeleton.tsx apps/web/src/features/today/today-welcome.tsx apps/web/src/features/today/planner.css
git diff --quiet 0150b476 -- apps/mobile/src/features/redesign/DayRingClock.tsx apps/mobile/src/features/redesign/PlanButton.tsx apps/web/src/features/day-clock/DayRingClock.tsx apps/web/src/features/today/plan-button.tsx
```

FRESH: grep exit 1 (zero matches), invariant diff exit 0. General shared
primitives retain pre-existing neutral accent tokens in unrelated exports;
reviewed changed Sheet/SegmentedControl/SkeletonBlock code adds none. The
monochrome palettes already define accent as neutral. No broad design-system
rewrite was needed. Tone-only color remains the existing blue/violet/green/orange
palette. Planner styles are flat; existing navigation and clock rendering stay.

### Visual evidence and safe equivalents

Local Chromium captures at 1280/390 px in both themes and phone-width skeleton:
tmp/overnight/PL2/browser/today-{1280,390}-{light,dark}.png and
skeleton-390-dark.png. Desktop light, phone dark and skeleton were visually
inspected; all four layout cases assert bounds/wrapping/DOM order. Native
mobile screenshot/gesture fidelity and physical Realme checks remain
**UNVERIFIED (owner to confirm)**; Node renderer coverage does not prove them.

Approved dark mockup values map to equivalent existing theme tokens for both
themes. Native minimum controls use 44 px targets (including existing segmented
control hitSlop); native timeline time columns use 44 px for readability.
The mobile sheet reuses Sheet with planner appearance and a custom header;
Include stays inline and one scroll container is shared with the existing
organizer. Web manual order uses HTML drag plus keyboard/Move actions.
No new OPEN decision or dependency. PL3 block gestures/actions and PL4 Plan
pill remain explicitly outside PL2. Native mockups' block action icons belong
to PL3; the existing Plan button belongs to PL4.

Rollout and Device checks remain NOT RUN owner steps as listed above. Live
FS12/served revision, production database/Scheduler/provider state remain
UNVERIFIED; no production access was attempted.
