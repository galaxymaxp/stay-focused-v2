# PL3 block actions — acceptance

Status: IN PROGRESS. Scope: STEP 0–4, local tests, gates, documentation and
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
| D12 web hover/focus/no-hover actions; 36px/10px, exact SVGs; first Move up disabled | Timeline/CSS + Chromium tests | Pending |
| D12 right Skip / left Remove; mirrored 104px reveal/release threshold; haptic | Existing SwipeRow + gesture tests | Pending |
| D12 Remove Undo restores via putBack; expires in 5s; accessible 52px bar | Sheet + fake-timer component tests | Pending |
| D12 mobile 350ms long press, lift, reorder manual proposal | Existing organizer + sheet/selection tests | Pending |
| D12 accessibility skip/remove/moveUp; Up next follows first block | Component and Chromium tests | Pending |
| D5 device-local actions, latest-wins; no candidate/Library refetch or Canvas sync | Existing hook request tests + integration assertions | Pending |
| D1 monochrome except existing course tones; D2 clock untouched | Diff review + styles | Pending |
| D15 local commits only; reduced motion and mobile targets >=44px | Diff review/tests | Pending |

## Verification

Pending fresh serial gates. Logs/artifacts belong only under ignored
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
