# PL3 block actions — acceptance

Status: PASS for the finite unattended local code scope. Scope: STEP 0–4, local tests, gates, documentation and
atomic commits only. No rollout, device checks, remote calls, migrations,
environment-file edits or pushes. Endpoint PL3; PL4 is excluded.

## Baseline and STEP 0

Branch: `overnight/2026-10-15_feedback`; HEAD `945fa4da`.
PL2 prerequisite: LOCAL PASS in all three canonical planning files.
`git log --oneline -8`:

```text
945fa4da docs(today): close PL2 planner UI verification
48170548 fix(today): finish planner parity and cached plan loading
ed1c98bc feat(today): skeleton loading for the planner
8b15376f feat(today): first-run window note
dcd783ae feat(today-web): two-column Today with Up next, timeline and adjust panel
0621d075 feat(today-mobile): redesigned plan sheet (proposed/previous, tray, nested smart order)
0150b476 docs(today): close PL1 planner logic verification
d0bd46b9 fix(today): keep exclusions through sheet resets
```

`git status --short`: only unrelated owner paths `UI/`,
`apps/mobile/.gitignore`, `supabase/.temp/` (all untracked). Preserve them.
Upstream github/main: ahead 13, behind 32; no fetch or integration authorized.

Read root AGENTS.md, CLAUDE.md, AUTOPILOT.md, current planning files and newest
handoff. Approved roadmap and inline mockup styles read from
`C:/Users/Fely Max Dilinila/Claude/Projects/Stay Focused/overnight/roadmaps/`:
`2026-10-27-today-planner-redesign.md`, `Web.dc.html`, `Gestures.dc.html`.

Inventory:

- Web `today-planner.tsx` composes `plan-preview.tsx` PlanTimeline, Up next,
  fit/tray and inline Adjust. Smart order already has HTML drag and keyboard
  ordering. Timeline intentionally uses Move up only; no new web drag.
- Mobile `PlanningSheet.tsx` composes `PlanPreview.tsx` PlanTimeline. Existing
  `useLibraryOrganizer` provides PanResponder hold/drag/drop, cancellation,
  scroll tracking and autoscroll. Reuse for timeline and existing Smart order.
- Existing `design/SwipeRow.tsx` is the app's PanResponder swipe utility,
  already used by Generate and Library. Reanimated 4.5.1 is installed;
  gesture-handler and draggable-flatlist are absent. Reuse the established
  utility rather than adding another gesture stack (safe equivalent to the
  prompt's library Swipeable). No dependency addition required.
- `design/haptics.ts` wraps installed expo-haptics with settings/fallbacks.
  No reusable toast/snackbar found; add a planner-specific Undo bar.
- Both useTodayPlan hooks already expose PL1 skip/remove/putBack/moveUp and
  latest-wins preview requests over cached candidates. Shared planning helpers
  retain canonical Canvas aliases, selection and device-local exclusions.

## Acceptance matrix

| Decision / requirement | Layer / evidence | Result |
| --- | --- | --- |
| D12 web hover/focus/no-hover actions; 36px/10px, exact SVGs; first Move up disabled | Timeline/CSS + Chromium tests | FRESH PASS |
| D12 right Skip / left Remove; mirrored 104px reveal/release threshold; haptic | Existing SwipeRow + gesture tests | FRESH PASS |
| D12 Remove Undo restores via putBack; expires in 5s; accessible 52px bar | Sheet + fake-timer component tests | FRESH PASS |
| D12 mobile 350ms long press, lift, reorder manual proposal | Existing organizer + sheet/selection tests | FRESH PASS |
| D12 accessibility skip/remove/moveUp; Up next follows first block | Component and Chromium tests | FRESH PASS |
| D5 device-local actions, latest-wins; no candidate/Library refetch or Canvas sync | Existing hook request tests + integration assertions | FRESH PASS |
| D1 monochrome except existing course tones; D2 clock untouched | Diff review + styles | FRESH PASS |
| D15 local commits only; reduced motion and mobile targets >=44px | Diff review/tests | FRESH PASS |

## Verification

Fresh serial gates completed; receipts follow. Logs/artifacts belong only under ignored
`tmp/overnight/PL3/`. Record exact commands, counts and failed first attempts.

## UNVERIFIED and Owner steps remaining

Live FS12/deployed revision/database/Scheduler/provider state:
**UNVERIFIED (owner to confirm)**. Local source agrees with PL2 prerequisite;
no live calls are permitted or needed.

Rollout **NOT RUN**, skipped entirely: owner FULLSEND after PL4.
Device checks **NOT RUN**, skipped entirely: Realme swipe feel, native
accessibility, gesture arbitration, Reduce Motion and visual/performance checks.
Other real browsers/assistive technology and native presentation remain
**UNVERIFIED (owner to confirm)**.

## Implementation checkpoint

- STEP 1: `1d70e50c`, web hover/focus/hover-none actions and exact SVG sizes.
- STEP 2: `ddc8b981`, planner SwipeRow variant and pinned five-second Undo.
- STEP 3: `7e08db36`, 350ms single-item organizer drag and manual selection.
- Review repair: saved task blocks previously exposed session IDs only. Add an
  optional explicit task identity in the existing Today mapper (no new query,
  persistence or migration), use it for exclusions/order, and support saved
  timeline Move up. Legacy cached task blocks without explicit identity disable
  unsupported actions instead of guessing from titles or sending session IDs.
- Safe equivalents: reuse established PanResponder SwipeRow and organizer, so
  no gesture-handler/draggable-flatlist dependency is added. Undo keeps the
  specified 52px bar and increases its button from the mockup's 36px to a 44px
  touch target. Web timeline intentionally uses Move up only.

## Retained first attempts (not hidden)

- Early mobile typecheck exposed seven JSX parse diagnostics from an incomplete
  edit; corrected before the swipe commit. Subsequent check passed.
- First focused swipe/sheet run: 7 passed, 1 failed collection suite (native
  lucide dependency reached React Native Flow syntax in Node). Added inert icon
  mocks to the two Node component fixtures; runtime icon imports are unchanged.
- Next focused run: 25 passed / 1 failed because the Undo test selected one
  Copy despite the title and button both being Copy nodes. Select the title
  explicitly; focused rerun passed 26/26 across four files.
- Mobile typecheck later caught three timer-test callbacks returning VitestUtils
  instead of void and two raw mocked PanResponder callback type mismatches.
  Correct void callbacks and capture typed PanResponderCallbacks in the mock.
  Final pre-gate mobile typecheck passed.
- Focused Chromium first attempt: 8 passed / 1 failed. Playwright clicked a
  hidden row action without first hovering its row; explicitly hover before
  the real click. Rerun: 9 passed / 0 failed / 0 skipped. Assertions retain
  hidden-at-rest, hover/focus, disabled-first and hover-none requirements.
- Initial full forced typecheck/lint: each 8/8 tasks, zero cached; lint has
  seven existing warnings and zero errors. Initial full shared suite: 952
  passed / 1 failed / 0 skipped across 98 files. The new saved-block fixture
  omitted required deepLinkTarget. Replaced the cast with a fully typed
  TodayItem fixture including the navigation target; no assertion weakened.
  Full serial gates restarted from the final code with credential stripping
  and loopback-only Node guards. The initial receipts remain in gates.json;
  the closing run uses gates-final.json and gate-final-*.log.
- Saved reviewer review also found the existing artifact: identity prefix;
  fa02dc47 normalizes only the action key and adds an exact regression.

Focused additional evidence: API experience/today-window 90/90 in two files;
mobile organizer/TodayPlan/sheet 29/29 in three files; saved-order hooks
18/18 each on web/mobile. Full-suite receipts below supersede overlapping
focused counts. No physical, live-provider or production acceptance is implied.

### Cancellation review repair

Final review found that the organizer's new single-item mode cleared edit
state on release but not on cancellation. d3633495 moves the cleanup into the
shared cancel path, so termination, touch cancellation and release all restore
ordinary taps. The existing real-organizer regression now asserts an immediate
ordinary tap after cancellation as well as after drop, with zero writes on
cancel. Full mobile, forced lint, offline Android export and forced serial
root build are rerun after this repair; closing typecheck follows them. Earlier
successful receipts remain retained and are superseded only for affected gates.

### Validation-output path deviation

The preliminary Today Chromium runs used the existing test's PL2/browser
output directory before the test was redirected to PL3/browser. They refreshed
its five synthetic Today/skeleton screenshot filenames (today-1280-light/dark,
today-390-light/dark, skeleton-390-dark). Historical screenshot bytes were not
pinned at PL3 startup and have not been guessed or restored. No validation
output is staged. All closing Today captures and new logs are isolated under
PL3; unrelated UI/, mobile .gitignore and supabase/.temp/ remain untouched.

## Closing fresh evidence

Final implementation at d3633495,
including the fully typed fixture repair. No source/test edits follow these
successful gates. Final scoped documentation commit follows.

| Suite / gate | FRESH result |
| --- | --- |
| Shared | 953 passed, 0 failed/skipped; 98 files |
| Mobile | 1772 passed, 0 failed/skipped; 191 files |
| Web unit | 567 passed, 0 failed/skipped; 78 files |
| Web Chromium (13 serial files) | 164 passed, 0 failed/skipped |
| Affected API experience/today-window | 90 passed, 0 failed/skipped; 2 files |
| Forced root typecheck, lint, root build | 8/8 tasks each, 0 cached |
| Closing typecheck after build declarations restored | 8/8 tasks, 0 cached |
| Direct API build, web build, offline Android export | 1/1 each |
| Working and staged diff checks | PASS, zero whitespace errors |

Lint retains seven pre-existing warnings and zero errors; no new warning.
Core shared/mobile/web total: 3456 passed, 0 failed, 0 skipped. API's 90
additional focused cases are not double-counted into that total.

Exact commands, run serially with repo-local TEMP/TMP/TMPDIR and npm/Turbo
caches, EXPO_NO_DOTENV=1, EXPO_OFFLINE=1, telemetry off, stripped credential
environment and loopback-only Node guards:

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
npm run build --workspace @stay-focused/mobile -- --platform android --max-workers 1 --output-dir ../../tmp/overnight/PL3/android-export
npm run build -- --force --concurrency=1 --env-mode=loose
npm run test --workspace @stay-focused/api -- --maxWorkers=1 src/lib/experience/experience.test.ts src/lib/experience/today-window.test.ts
npm run typecheck -- --force
git diff --check
git diff --cached --check
```

Receipts: tmp/overnight/PL3/gates-final.json, gates-repair.json, closing.json,
gate-final-*.log and gate-repair-*.log. Initial and superseded receipts remain
in gates.json and gates-before-cancel-repair.json.
Root build inherits OS CPU affinity 1 (RR1d/PL2 practice), without changing
repository or Metro configuration. Generated Next declarations are restored
to their pre-gate bytes before closing typecheck. All artifacts are ignored.
Browser fixtures are synthetic and route only to loopback. Native tests are
Node/component gesture proxies, not physical acceptance.

Web action controls are 36px with 10px radius and exact 14/15/13px SVGs;
the small web layout wraps controls below the title to prevent clipping.
Native controls retain >=44px touch targets. Reduced Motion suppresses lift
scale/rotation and planner swipe springs. Manual order remains target based;
split blocks deduplicate through the PL1 strict selection contract. No new
web timeline drag was introduced. D1 monochrome and D2 clock/pill invariant
were reviewed against 945fa4da (clock/pill diff exit 0).

Local Chromium Today captures: tmp/overnight/PL3/browser/ at 1280/390px in
both themes, plus the reduced-motion skeleton. Their layout assertions pass;
desktop dark and phone dark captures were visually inspected with no title
clipping or horizontal overflow. Native fidelity remains UNVERIFIED above.

Local commits:

```text
1d70e50c feat(today-web): hover actions on plan blocks
ddc8b981 feat(today-mobile): swipe to skip or remove with undo
7e08db36 feat(today-mobile): long-press reorder of plan blocks
4e266a13 fix(today): preserve saved block action identities
7d3133a3 test(today): prove block actions in local Chromium
fa02dc47 fix(today): normalize saved reviewer action keys
6ee0f5e1 test(today): use complete saved timeline fixtures
d3633495 fix(today-mobile): release edit state after cancelled block drag
```

Final scoped docs commit follows; exact hash is recorded in Git and
tmp/overnight/PL3.status/progress. No tmp files or owner paths are staged.
