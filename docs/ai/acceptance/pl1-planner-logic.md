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
  startAt/endAt, reviewer.id and course.id. Task target IDs are absent; exact
  time/kind/title/course matching is the legacy status equivalent. Ambiguous
  matches never claim completion. API plan proposals lack task courseId and
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

## STEP 4 implementation and safe equivalents

Both Today adapters expose skip/remove/putBack/moveUp, takenOut, previousPlan,
restorePrevious and windowSource/welcome dismissal for PL2. Existing per-item
checks invoke Remove/Put back; no new UI controls or redesign. Sheet color
usages touched here are monochrome; existing clock renderers/gestures unchanged.

Candidates are loaded once per owner/date visit. Clock releases recompute their
availability locally and actions use the cached candidates: no sync, Library
refetch or new candidate request. The sheet reuses the cached data as well.
Apply writes a snapshot only after replan succeeds, using the actual saved
session response (including its actual times), then reconciles as before.

Canvas local admission changes assignment UUIDs into task UUIDs. A selection-only
optional planningTargets mapping now carries task ID, stable selection alias and
course ID where needed. No titles or provider data are added. Legacy omitted
selection and ordinary personal-task/reviewer-only response shapes are unchanged;
the existing exact legacy-equivalence assertion still passes. Exclusions use
the stable assignment key and also recognize projected task keys. Move-up uses
aliases without duplicating the same selected target. This necessary API/shared
metadata is the closest safe equivalent to the prompt's assumed plan metadata.

Previous-plan status uses exact session time/kind plus reviewer identity or task
title/course because Today has no task target ID. Duplicate/ambiguous evidence
never marks Done. Older snapshots show weekday/window and no today status.
Restore clears exclusions for the explicitly restored targets and queues their
manual selection in the current window. Targets no longer eligible remain
subject to the existing safe not-found API denial; no ownership/validation is
weakened. Split sessions deduplicate to the strict one-entry-per-target contract.

FRESH focused final: shared helpers/status 17/17; mobile hooks/sheet/quiet 33/33;
web hooks/quiet 25/25; mobile screens 102/102; actual Chromium sheet 9/9;
API planning 29/29. No production/provider calls. Typechecks pass for shared,
web and mobile; API and full gates follow in STEP 5.

First failures retained under tmp/overnight/PL1/gates: step4-web-types and
step4-mobile-types failed on union inference in persisted-session flatMap;
explicit ProposedStudySession[] annotation repaired both. Initial mobile
screens: 90 passed/12 failed (new candidate endpoint missing in legacy fixture);
first fixture rerun retained the same counts because a CRLF replacement missed
the fixture initializer. Corrected fixture: 101 passed/1 failed (one remaining
implicit-selection expectation); final 102/102. Candidate reads are explicitly
counted separately and TC2 asserts zero candidate reads during gestures/release,
one date save plus one last-used save, one quiet preview, zero sync/refetch.
API first attempt 28 passed/1 failed (metadata unnecessarily added to ordinary
personal/reviewer selections); mapping narrowed to only tasks needing it, exact
existing shape assertion preserved, rerun 29/29. First web lint had one new
candidate-memo warning; fixed with useMemo, final root lint will verify.

Reviewed React components/hooks with the installed React best-practices skill:
stable memoized candidate data, owner/date cleanup, no new listeners/dependencies,
existing controls/accessibility preserved. API typecheck first failed on the
test-local Plan type missing optional metadata (2 errors); extended that type
with the shared planningTargets contract, rerun FRESH PASS. Mobile first lint
also found two duplicate-import warnings in Today; imports merged.
