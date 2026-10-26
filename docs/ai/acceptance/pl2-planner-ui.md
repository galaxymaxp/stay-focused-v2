# PL2 planner UI — acceptance

Status: IN PROGRESS. Finite unattended local scope: STEP 0–5, gates, docs and
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
| D1 monochrome | Touched UI neutral tokens; git grep assertion | PENDING |
| D6 tray | Default open, conditional rendering, exact Put back key | PENDING |
| D7 Previous | Snapshot summary/status timeline/restore/empty tests | PENDING |
| D8 mobile sheet / web columns | DOM order, 1280 and 390 layout, retained-content inventory | PENDING |
| D9 fit / timeline / adjust | Actual plan totals/segments, clean course rows, accordion, remove/restore/manual drag/a11y | PENDING |
| D10 welcome | First-run only; dismissal persistence; clock move permanently dismisses | PENDING |
| D11 skeleton | Exact shapes, no-cache only, reduced motion/static and busy semantics | PENDING |
| D2 / D15 invariants | Clock/PlanButton source unchanged; no remote/release actions | PENDING |

## Verification

Pending fresh focused checks and serial prompt gates. Record first failures,
reruns, exact passed/failed/skipped counts, task cache results and limitations.
Local evidence goes under ignored `tmp/overnight/PL2/`.

## Owner steps remaining

- Rollout NOT RUN, skipped entirely: owner FULLSEND after PL4.
- Device checks NOT RUN, skipped entirely: Realme + website look check against
  approved mockups, native accessibility/motion/performance.
- Confirm UNVERIFIED live production/served revision/database/Scheduler state.
