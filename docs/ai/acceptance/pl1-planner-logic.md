# PL1 planner logic acceptance

Status: IN PROGRESS. Finite scope: PL1 steps 0-5 only; local code, tests, gates,
docs and atomic local commits. No rollout, device checks, remote services,
SQL, deployment, env-file changes or push. PL2-PL4 remain outside this run.

## Baseline and inventory (STEP 0)

2026-10-27; branch overnight/2026-10-15_feedback; HEAD 37ce7307.
Recent commits (git log --oneline -8):
```
37ce7307 docs(release): record RR1d readiness supersessions
6a8b02ec docs(today): verify TP2e glass pill at HEAD
6ec8e4e3 docs(today): record RR1c verification gate failure
e52276f3 test(today): match Plan glass dark luminance to TP2e liquid-lit design
4f06f193 docs(today): record RR1b TP2e gate failure
b383cd79 docs(release): record RR1 readiness supersessions
c8cfb180 feat(today): render the Plan button as an orb-lit glass pill
1e982730 docs(queue): close QL1c local verification
```
Initial git status --short: only ?? UI/, ?? apps/mobile/.gitignore,
?? supabase/.temp/. Preserve these paths and tmp/; never stage them.
Git identity galaxymaxp <omgraythekid@gmail.com>. Upstream github/main is
32 commits ahead in the local remote-tracking record; no fetch performed.

Read: AGENTS.md, CLAUDE.md, AUTOPILOT.md; current planning file leading entries
and newest handoff; full PL1 prompt and approved external roadmap D1-D15;
all six HTML mockup sources (inline layout/style). Read required shared
planning-sheet/task-planning implementation and both Today screens, window
hooks, quiet hooks, planning-session modules, mobile planMode and sessionStore.

- Web free-time-store uses readLocalPreference/writeLocalPreference at
  sf.today.free-time.<date>; mobile useTodayClockWindow uses sessionStore
  (SecureStore on native; localStorage on web), same date key.
- Both window hooks reconcile today/previous-date overnight windows on
  lifecycle events; commits save locally without changing snapshot bounds.
- Both quiet planners use createQuietPreview, identity owner:date, request
  hash plus selection hash, invalidate on drag/date/unmount, serial latest-wins.
- Device selection/draft is process-only createPlanningSessionMemory, scoped
  owner:date, reset on reload/date/owner. Candidates currently load only when
  sheet opens. Default All/Both/smart excludes recently opened reviewers.
- TodayItem has kind study_session, id, status planned/completed/skipped,
  startAt/endAt, reviewer.id or task.id, course.id; it exposes enough to match
  snapshot targets and start times. API plan proposals lack task courseId and
  original selection metadata: retain those locally from candidates/request.
- Existing preview/apply uses planner preview/replan; apply reconciles Today.
  No override/action should add a Canvas sync or Library/Today refetch.
- Existing below-clock content: Plan control, free-time/help text (web),
  loading/note/PlanPreview; day work/timeline/calendar/announcements retained.

FS12 served baseline, live revision/database/Scheduler/provider state:
UNVERIFIED (owner to confirm). Local records end at RR1d; this is not a live
production contradiction and does not authorize remote checking.

## Acceptance matrix

| Decision | Layer / proof | Result |
| --- | --- | --- |
| D3 | shared resolver + platform stores; saved > around > last > 20-22; validation; no implicit date save | pending |
| D4 | both Today adapters; ready/idle/no saved session guard; one automatic request per key; latest-wins | pending |
| D5 | shared overrides/order; device/date persistence; action payload/store tests; existing sheet checks | pending |
| D6 data | skipped-first takenOut with stable candidate order | pending |
| D7 | last successful apply snapshot; timeline statuses; manual restore | pending |
| D9 helper | course code/title cleanup for piped and non-piped names | pending |
| D10 data | windowSource and device welcome dismissal | pending |
| D1/D2/D15 | no clock/visual redesign, no new amber, local-only changes | pending |
| compatibility | omitted-selection and old-client suites remain green | pending |

## Verification

NOT RUN yet. Fresh serial gates required by PL1; exact commands, counts,
first failures and reruns will be recorded here. Synthetic fixtures only.
Visual, native GL, physical and production evidence UNVERIFIED.

## Owner steps remaining

Rollout and Device checks NOT RUN, skipped entirely: FULLSEND after PL4;
fresh install should land on an 8-10 PM proposal without taps. Confirm live
FS12/revision/database/Scheduler/provider state and physical behavior.
Vercel CLI is absent; strongly recommend npm i -g vercel for future authorized
env/deploy/log tooling. Installation NOT RUN and outside this local-only run.

STEP 1 FRESH focused shared: 35 passed / 0 failed / 0 skipped, 2 files.
First attempt: 21 passed, 1 suite collection failure (synthetic timestamps lacked
timezone); fixture corrected to localMinuteIso, no validation weakened.
Local move helper accepts optional request selection metadata; API unchanged.
Split targets deduplicate for strict API selection validation.

STEP 2 FRESH: shared store 3/3, web stores 10/10, mobile store/window 7/7.
Snapshots include an additive ownerId tag in the same device key; foreign-owner
titles are denied. All keys and snapshot fields otherwise follow D7. No new
server contract, database or provider access. Storage failures are best-effort.

STEP 3 focused hooks FRESH PASS: web 7/7, mobile 7/7 (1 file each).
Includes first-run exactly-once, last/saved/around priority, readiness guards,
existing planned overlap suppression, override/kind payloads, release preview
and stale candidate responses. Both Today screens now consume these adapters.
