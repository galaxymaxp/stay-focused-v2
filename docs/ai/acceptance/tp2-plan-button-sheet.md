# TP2 Plan button and planning sheet

Status: IN PROGRESS. Finite scope: TP2 STEP 0–6, local gates, docs and scoped
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
| Reorder | Mobile `useLibraryOrganizer.ts`/`libraryOrder.ts`; web Library organizer uses pointer/drag order utilities. Reuse move semantics; no dependency needed |
| Course order | API `experience/mappers.ts` `orderGenerateCourses`; Library uses shared `library-sort.ts` grouping plus local sort preference. Candidates must use stored current courses without provider inventory refresh; reuse stored-course state and existing course summary/order semantics |
| Mode sync | Web `components/shell.tsx` mounts `plan-mode-sync.tsx`; mobile `app/_layout.tsx` mounts `PlanModePreferencesSync.tsx`. Remove mounts as well as Today consumption; retain compatibility implementation/API |

No migration expected. Existing TP1 migration remains untouched and unapplied.

## Acceptance matrix (frozen before implementation)

| Requirement | Owning layer | Required local evidence | Result |
| --- | --- | --- | --- |
| Optional selection, legacy byte identity and old mode requests | Shared/API | Validator + service/route regression | PENDING |
| Owned courses/items; invalid kinds/duplicates safe denial | API/shared | Synthetic owned fixtures and rejection cases | PENDING |
| Candidate course grouping/estimates/opened history/free minutes | API | Read-only synthetic repository tests; no sync/refetch | PENDING |
| Smart selected TP1 ordering/60%; manual exact order; not-fit totals | Shared | Planner cases for courses, kinds, opted-in reviewers and over budget | PENDING |
| Clock menu cleanup and no UI preference sync | Both | Component/source tests and affected suites | PENDING |
| Fixed glass Plan button, slosh, reduced motion and lifecycle pause | Both | Component/browser proof; frame-rate comparison if available | PENDING |
| Single opaque sheet, defaults, empty states, Select/Include/summary | Both | Component + synthetic browser cases at mobile/desktop widths | PENDING |
| Group/row reorder, no cross-course movement, accessible moves/reset | Both/shared | Pure reducer + component/browser tests | PENDING |
| Build/close/session/date/reload behavior, active clock selection/races | Both/shared | Integration and latest-wins regression | PENDING |
| Logo/icon measurement at boundaries, full/tiny blocks and resize | Shared/both | Pure helper + rendered linear block cases | PENDING |
| Keyboard/focus/Escape/screen-reader semantics, Android dismissal | Both | Component/browser checks; native assistive technology UNVERIFIED | PENDING |
| Full affected suites and required serial fresh gates | All affected | Exact counts/logs; first failures retained | PENDING |

## Verification receipts

Pending. All live, authenticated, physical-device and production checks are
UNVERIFIED (owner to confirm). Synthetic local fixtures only.

## Owner steps remaining

- Rollout NOT RUN: release via the next separately authorized FULLSEND.
- Device checks NOT RUN: website and Realme button/slosh, defaults/two-tap
  build, course selection, each Include mode, over-budget summary, manual
  reorder/Reset, small blocks with no half logos, native assistive technology.
- Confirm served revision, applied TP1 migration and production state.
