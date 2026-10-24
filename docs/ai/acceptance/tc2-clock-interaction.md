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
