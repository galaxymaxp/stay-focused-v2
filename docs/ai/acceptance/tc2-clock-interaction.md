# TC2 quiet Today clock ? frozen local acceptance (2026-10-24)

Scope: TC2 STEP 0?4, local tests/gates/docs/scoped commits only. No questions,
services, environment files, remote SQL, push, rollout or devices. The newer
owner roadmap Decisions/TC2 wins; TP1 excluded. UX3 local PASS is committed.

## Baseline

Branch overnight/2026-10-15_feedback, HEAD 3d2b804f. Tracking github/main:
ahead 6 / behind 27 (local refs only). Author galaxymaxp <omgraythekid@gmail.com>.
Preserve all unrelated owner paths. Git log and status:

```text
3d2b804f docs(mobile): close LM1 local options verification
2305e847 fix(mobile): open course options on long press
51a8e326 docs(mobile): freeze LM1 course options acceptance
58fbf6a0 docs(queue): close QN1 local verification
05102204 fix(queue): contain failure cards and group repeated attempts
394d4fa6 docs(queue): freeze QN1 failure card acceptance
5f6acd27 docs(readiness): record passing FS8 validation receipt
05017922 docs(readiness): close FS8 blocker supersession acceptance
?? UI/
?? apps/mobile/.gitignore
?? supabase/.temp/
```

## STEP 0 ? confirmed source trace (baseline line numbers)

Web: today-screen.tsx:86?90 reads clockWindow.path via useResource, :151?159
change saves, :160?188 plan immediately previews, :344?348 onCommit runs both.
DayRingClock.tsx:300?333 finish snaps and commits; :379?427 movement only changes
local draft; :441?466 keyboard steps commit. Clock options typed Save uses the
same onCommit. Handle tap/release commits snapped range; scheduled-block tap
opens the item. Cancel restores draft without committing. Movement already local.
use-today-clock-window.ts:31?38 save replaces saved range; :40 computes path with
selection.override. Changing an overnight end changes endsAt; changing wrapping
can remove endsAt or change selected date. hooks.ts:19 identity includes path,
:32?146 effect reloads on path change; focus/online/visibility and 60s poll also
load (:120?122). The screen window effect :120?132 resets range/preview when saved
window changes, including immediately after commit.

Mobile: TodayScreen.tsx:78?87 reads useExperience(clockWindow.path,60000),
:215?223 change saves, :224?259 immediately plans, :311?315 commits both.
useTodayClockWindow.ts:37?44 save changes range/path as on web. useExperience.ts:
60 identity includes path, :75?145 effect loads on path, active, focus, sync
version and explicit refresh changes; polling repeats at 60s. DayRingClock.tsx:
305?341 movement only publishes local draft; :243?277 release commits after snap;
:354?363 accessibility step calls BOTH onChange and onCommit, so the screen saves
twice. ClockOptions typed Save calls onCommit. Expanded adjustment buttons call
change only (save but no preview). Cancel/termination does not commit.

Neither platform clock calls Canvas sync or Library refresh. SnapshotStatus uses
shared saved-snapshot.ts:82: refreshing => ?Syncing??, so a Today URL reload
looks like sync. Web useCanvasRefresh has auto=false on Today (:95); actual sync
is explicit Sync now, canvas-refresh.tsx:46?91. Mobile CanvasSyncProvider.tsx:166
sync starts jobs; :294?309 app activation resumes/polls existing jobs; successful
sync increments dataVersion to reload screens. These are separate legitimate
flows, with no gesture call site.

Server: apps/api/app/api/today/route.ts:5?16 verifies through experienceReadRoute
and calls getTodayScreen. service.ts:165 builds persisted owner-scoped read
models; no Canvas collection. apps/api/app/api/experience/[...path]/route.ts:
111?125 validates authenticated planning requests and dispatches preview/replan.
task-planning-service.ts:30?54 preview imports ALREADY SYNCED assignment rows and
refreshes task estimates, then generates deterministic proposals; this is planner
work, not Canvas collection. :57?95 apply persists sessions. No API change needed.

Served FS10 revision, production/database/Scheduler state: UNVERIFIED (owner to
confirm). Repository evidence supports admission; no code contradiction found.

## Acceptance matrix

| Requirement | Owning layer / proof | Initial result |
| --- | --- | --- |
| Drag movement has no IO/remount | Real clock gestures + request/storage counters, both platforms | Local movement exists; commit churn repair needed |
| One save/commit, 400ms quiet preview | Screen/scheduler counters | Immediate preview; mobile step saves twice |
| Latest range/date/owner wins | Deferred success/error/finally and cleanup | Only date guarded; busy drops newer commits |
| Stable Today URL through commits | Actual window hooks + resource counters | Overnight URL changes |
| Focus/poll never interrupts drag | Resource/window hooks; draft assertions | No drag guard |
| Explicit refresh/rollover/reconnect | Lifecycle tests; apply reconciliation | Preserve behavior |
| Typed/keyboard/accessible/lock/cancel/overnight | Real component entry points, synthetic fixtures | Extend coverage |
| Fresh suites and serial gates | Exact logs/counts, failures retained | Pending |
| Docs/progress/local commits/status | Explicit paths, no tmp staged | Pending |

Baseline/final instrumented counts and gates follow below. No physical smoothness,
authenticated visual or production claim is implied.

## Implementation (STEP 1-3)

- Shared `createQuietPreview` (packages/shared/src/quiet-preview.ts) owns the
  400ms quiet timer. Every new commit or drag start invalidates the pending timer
  and any in-flight response at input time, so only the latest preview can land
  (success, error and idle are all dropped when stale).
- Web `use-quiet-planner.ts` / mobile `useQuietPlanner.ts` scope previews to
  `owner:date`; owner change, date change, unmount and drag start cancel queued
  work. Preview no longer sets the screen `busy` flag, so the clock is never
  disabled or remounted by a preview. Apply/discard/done keep their behavior.
- Both clocks now commit on release before the snap animation settles, then
  report `onAdjustingChange(false)`. Cancel restores the base without committing.
  Mobile's accessibility step no longer calls `onChange` and `onCommit` (it used
  to save twice); the screen passes a no-op `onChange` because the clock owns its
  draft. Expanded mobile ±15 buttons now save once and queue the quiet preview.
- `useTodayClockWindow` (both platforms) keeps two snapshots: `saved` (the live
  range the screen shows) and `readSaved` (the bounds used to build the Today
  request key). Commits update `saved` and persistence only, so an overnight
  commit no longer changes `endsAt` and no longer refetches Today. `readSaved`
  catches up on focus/activation, rollover and explicit `reconcile()` (called
  after a successful Apply).
- `setAdjusting` is a ref shared with the read hooks. While held: web
  `useResource` skips focus/visibility/poll loads; mobile `useExperience` skips
  loads and reschedules its poll; the mobile Today focus resync and the clock
  window's focus/rollover updates are skipped; a midnight/overnight-tail
  rollover that fires mid-drag is deferred until release. Saved-window effects
  never overwrite the range being edited.
- Explicit refresh (SnapshotStatus), reconnect (`online`), focus/activation when
  not dragging, date rollover and Canvas sync completion (`dataVersion`) keep
  their previous behavior. No API, data, auth, schema or provider change.

Deviation: none from the Decisions. Mobile screen tests mock `useExperience`,
so mobile "Today refetch" is proven two ways: the screen proves the request key
never changes (distinct Today keys = 1), and the real `useExperience` hook test
proves paused focus/poll loads are skipped and lifecycle/explicit loads remain.

## STEP 4: instrumented before/after counts (FRESH, synthetic local)

A temporary probe drove the real clock entry points (pointer/pan responder,
keyboard/accessibility actions, typed ClockOptions) with request, storage and
mount counters. It ran against HEAD sources ("before", files swapped in from
`git show HEAD:` then restored byte-identical by `cmp`) and against the final
working sources ("after"). The probe was then deleted; permanent assertions
live in the tests listed below. Raw rows: ignored tmp/overnight/tc2-counts-*.jsonl.
Settle time after each scenario: 1s (focus row: 61s).

Web (saves / previews / Today reads / clock remounts):

| Scenario | Before | After |
| --- | --- | --- |
| Fast single-handle drag (20 moves, 1ms) | 1 / 1 / 0 / 0 | 1 / 1 / 0 / 0 |
| Slow single-handle drag (20 moves, 100ms) | 1 / 1 / 0 / 0 | 1 / 1 / 0 / 0 |
| Whole-range drag (touch hold) | 1 / 1 / 0 / 0 | 1 / 1 / 0 / 0 |
| 3 consecutive drags, 100ms apart | 3 / **3** / 0 / 0 | 3 / **1** / 0 / 0 |
| Cancel | 0 / 0 / 0 / 0 | 0 / 0 / 0 / 0 |
| 3 keyboard steps + typed 22:00-04:00 | 4 / **4** / **1** / 0 | 4 / **1** / **0** / 0 |
| Typed overnight 22:00-04:00 | 1 / 1 / **1** / 0 | 1 / 1 / **0** / 0 |
| Focus + visibility + 61s poll while held | 0 / 0 / **2** / 0 | 0 / 0 / **0** / 0 |

Mobile (saves / previews / distinct Today request keys / explicit refresh / Canvas sync):

| Scenario | Before | After |
| --- | --- | --- |
| Fast single-handle drag | 1 / 1 / 1 / 0 / 0 | 1 / 1 / 1 / 0 / 0 |
| Slow single-handle drag | 1 / 1 / 1 / 0 / 0 | 1 / 1 / 1 / 0 / 0 |
| Whole-range drag (hold) | 1 / 1 / 1 / 0 / 0 | 1 / 1 / 1 / 0 / 0 |
| 3 consecutive drags, 100ms apart | 3 / **3** / 1 / 0 / 0 | 3 / **1** / 1 / 0 / 0 |
| Cancel | 0 / 0 / 1 / 0 / 0 | 0 / 0 / 1 / 0 / 0 |
| 3 screen-reader steps + typed 22:00-04:00 | **7** / **4** / **2** / 0 / 0 | **4** / **1** / **1** / 0 / 0 |
| Typed overnight 22:00-04:00 | 1 / 1 / 1 / 0 / 0 | 1 / 1 / 1 / 0 / 0 |

(Keys are counted from renders after setup. In the typed-only "before" run every
recorded render already carries the new overnight key, so the change shows as 1
distinct key; the sequential row, which renders the old key first, exposes it.) Gesture sync calls
were 0 before and after on both platforms: no clock path calls Canvas sync. The
"Syncing..." the owner saw was SnapshotStatus during the Today URL reload
(overnight key change), the immediate preview and the focus/visibility reloads,
all removed above. Result: 0 sync calls and 0 Today/Library refetches from
gestures; exactly 1 persistence per commit; 1 preview per quiet period.

Permanent proof (all FRESH, pass):

- web `clock-interaction.test.ts`: fast/slow single-handle, whole-range, tap,
  touch scroll candidate, cancel, keyboard + typed overnight, focus/visibility/
  poll suppression with reconnect/focus/explicit refresh retained; same clock
  instance and mount count.
- web/mobile `quiet-planner.test.ts`: exact 400ms coalescing, out-of-order slow
  resolve/reject dropped, stale after-completion response ignored, cancellation
  on owner/date/unmount/drag.
- web/mobile `today-clock-window.test.ts`: stable request key across commits
  (including overnight), rollover deferred while held, reconcile without another
  persistence.
- mobile `screens.test.ts` TC2 block: real pan-responder drags, cancel and
  accessibility steps with storage/request/path/refresh/sync counters.
- mobile `useExperience.test.ts`: paused focus/poll skipped; release, explicit
  refresh and activation reload.

## Attempts and failures (retained, none hidden)

Previous session (before interruption), guarded runner tmp/overnight/TC2/run.cjs:

- First forced typecheck exit 2: web DayRingClock `latest` ref initial value
  lacked `onAdjustingChange` (TS2741). Fixed; rerun 8/8.
- First mobile clock run: 2 failed / 105 passed (existing preview tests expected
  an immediate preview; they now advance the 400ms quiet period). Rerun 107/107.
- First mobile TC2 counter run: 5 failed (a11y step saved twice; control lookup
  helper). Product double-save fixed; rerun pass.
- Two web interaction runs: 5 failed each (drag commit waited on snap animation
  so release saved 0; then `adjusting` class probe; focus reloads while held).
  Fixed in product code; third run pass. No assertion was weakened.

This resumed session:

- Focused web day-clock folder (parallel): 120 passed / 2 failed in 15 files.
  Both failures were the unchanged `orb-load.browser.test.ts` Slow-4G atlas vs
  chunk request-order check (expected 4 < 3, 5 < 4) under parallel CPU load.
  Alone: 7/7 PASS. Treated as a contention flake; nothing changed.
- First full mobile run: 1,687 passed / 6 failed (176/177 files):
  `announcementRead.test.ts` mocked `useTodayClockWindow` with the old return
  shape (no `adjusting`). Web `announcement-read.test.ts` had the same mock gap
  (5/5 failed when run focused). Both mocks now return the new hook contract with
  a stable hoisted ref; no assertion changed. Reruns 6/6 and 5/5.
- First full web run (default workers): 640 passed / 1 failed; 79/81 files
  (password-reset browser timeout and an orbBody browser suite-level failure,
  both unrelated). Serial rerun of both files 25/25; full serial suite PASS.
- Python is not installed; one scripted edit attempt failed before touching
  files and was redone with the editor.

## Final fresh gates

| Exact command | Result | Label |
| --- | --- | --- |
| `npm run test --workspace @stay-focused/shared` | 756 passed (756); 76 files | FRESH |
| `npm run test --workspace @stay-focused/mobile` | 1,693 passed (1,693); 177 files | FRESH |
| `npm run test --workspace @stay-focused/web -- --maxWorkers=1` | 641 passed (641); 81 files | FRESH |
| focused mobile: quiet-planner, today-clock-window, useExperience, screens | 123 passed (123); 4 files | FRESH |
| `npm run typecheck -- --force` | 8 successful / 8; 0 cached | FRESH |
| `npm run lint -- --force` | 8 successful / 8; 0 cached; 6 existing warnings, 0 errors | FRESH |
| `npm run build --workspace @stay-focused/api` | exit 0 | FRESH |
| `npm run build --workspace @stay-focused/web` | exit 0 | FRESH |
| `npm run build --workspace @stay-focused/mobile -- --platform android` (offline JS/assets export) | exit 0 | FRESH |
| `npm run build -- --force --concurrency=1 --env-mode=loose` | 8 successful / 8; 0 cached | FRESH |
| `git diff --check`; `git diff --cached --check` | pass at code and docs staging | FRESH |

Full affected suites: **3,090 passed / 0 failed / 0 skipped** (shared 756,
mobile 1,693, web 641). Gates ran serially through the guarded runner (loopback
network guard, environment files blocked, repo-local TEMP/TMP/TMPDIR and npm
cache, EXPO_NO_DOTENV/EXPO_OFFLINE, telemetry off). Both Next generated
`next-env.d.ts` files were rewritten by builds and restored byte-identical from
pre-build copies. API suite/workflow: NOT APPLICABLE (no API change).

| Acceptance row | Final result |
| --- | --- |
| Drag movement has no IO/remount | PASS (LOCAL) |
| One save/commit, 400ms quiet preview | PASS (LOCAL) |
| Latest range/date/owner wins | PASS (LOCAL) |
| Stable Today URL through commits | PASS (LOCAL) |
| Focus/poll never interrupts drag | PASS (LOCAL) |
| Explicit refresh/rollover/reconnect | PASS (LOCAL) |
| Typed/keyboard/accessible/lock/cancel/overnight | PASS (LOCAL); native assistive technology UNVERIFIED |
| Fresh suites and serial gates | PASS (LOCAL) |
| Docs/progress/local commits/status | PASS (LOCAL); identities in Git/TC2.status |

Implementation commit dd3276f3; freeze 3972501d. Physical smoothness on the
website and Realme, authenticated visuals, served FS10 revision and production
state: UNVERIFIED (owner to confirm). Device checks and rollout NOT RUN.
