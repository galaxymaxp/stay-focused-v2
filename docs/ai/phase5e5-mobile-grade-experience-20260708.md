# Phase 5E.5 Mobile Grade Experience

Implementation date: 2026-07-08, Asia/Manila.

## 1. Starting State

- Branch: `main`
- Starting commit: `68be019b1447067672a8ee023dd79f3f3a23a67c`
- Ahead/behind at start: `0/0` against `origin/main`
- Dirty files at start: `apps/api/next-env.d.ts`,
  `apps/mobile/expo-env.d.ts`, untracked `apps/mobile/.gitignore`, and
  untracked `.vscode/`
- Unrelated dirty files preserved: yes; generated/env/editor files were not
  intentionally edited, staged, reverted, or committed.

## 2. Files Changed

- `apps/mobile/app/index.tsx`
- `apps/mobile/src/features/courses/CoursesScreen.tsx`
- `apps/mobile/src/features/courses/CanvasGradeScreen.tsx`
- `apps/mobile/src/features/courses/canvasGradePresentation.ts`
- `apps/mobile/src/features/courses/canvasGradePresentation.test.ts`
- `apps/mobile/src/services/canvasApi.ts`
- `apps/mobile/src/services/canvasGradeApi.test.ts`
- `docs/ai/phase5e5-mobile-grade-experience-20260708.md`
- `docs/current-state.md`
- `docs/roadmap.md`
- `docs/ai/current_sprint.md`
- `docs/ai/handoff.md`

## 3. Mobile Routes And Screens Added

- Added a `canvas-grades` authenticated app view in `apps/mobile/app/index.tsx`.
- Added `CanvasGradeScreen`, a dedicated course grade surface over the protected
  Phase 5E.4 routes.
- Added an in-screen assignment detail view that always loads
  `GET /api/canvas/courses/:courseId/grades/:assignmentId`.
- Added a `Grades` action to selected, selectable Canvas courses only.

No Expo Router layout, auth provider, course selection behavior, source sync,
reviewer generation, or Study Library navigation was redesigned.

## 4. API Functions And Parsers Added

Mobile service functions added to `apps/mobile/src/services/canvasApi.ts`:

- `syncCanvasCourseGrades`
- `listCanvasCourseGrades`
- `getCanvasCourseGradeAssignment`
- `getCanvasCourseGradeSummary`
- `getCanvasCourseGradeSyncStatus`

Strict public mobile types mirror the protected API DTOs without importing
server-only files. Parsers reject unknown response shapes, extra keys,
invalid enum values, malformed timestamps, malformed pagination, missing
required fields, hidden/unavailable wrappers carrying non-null values, negative
attempts, and negative points possible.

## 5. Supported UI States

The screen represents:

- initial loading as `Loading synchronized grades...`
- never synchronized
- running sync
- succeeded sync
- partial sync
- failed sync
- stale synchronized data
- hidden grade/score wrappers
- unavailable and not-applicable grade wrappers
- unknown grade/score wrappers
- empty synchronized assignment list
- non-destructive network warning after data is already loaded
- retryable initial-load failure when no data is loaded

Every normalized assignment status has centralized label, copy, tone, and icon
metadata in `canvasGradePresentation.ts`.

## 6. Manual Synchronization Behavior

Grade synchronization is intentional and per course. Screen mount and ordinary
reload perform only GET requests:

- `GET /grades/sync-status`
- `GET /grades/summary`
- `GET /grades?limit=50&offset=0`

The only POST path is the explicit `Sync grades` button:

- `POST /grades/sync`

After sync completion, the screen refetches sync status, summary, and the first
assignment page. Failed sync preserves already loaded rows. Partial sync keeps
available data visible with an incomplete-data warning.

## 7. Pagination Behavior

- Initial page uses `limit=50&offset=0`.
- `Load more` requests the server-provided `nextOffset`.
- Incoming rows append in server order.
- Duplicate assignment IDs are skipped during append.
- Simultaneous load-more requests are disabled.
- Pagination resets on course changes and after successful or partial explicit
  sync.
- Load-more failures preserve already loaded rows.

## 8. Hidden-Grade Handling

Visible scores and grades display only when their wrapper state is `visible`.
Hidden, unavailable, unknown, and not-applicable wrappers show honest text.
The mobile app never converts hidden, missing, unavailable, or unknown values
to zero, never calculates a course total, and never estimates a grade.

## 9. Stale, Partial, Failed, And Offline Boundary

Stale data remains visible with last successful sync copy. Partial sync remains
visible with an incomplete-data warning. Failed sync keeps prior rows visible
when available and shows sanitized retry guidance.

No durable offline cache was added. The only offline-tolerant behavior is
ordinary in-memory React state while the screen remains mounted. The phase does
not add AsyncStorage grade persistence, SQLite, SecureStore grade data, query
persistence, background hydration, app-state sync, intervals, cron, or queues.

## 10. Automated Verification

| Command | Result | Notes |
| --- | --- | --- |
| `npm --workspace apps/mobile run typecheck` | PASS | Mobile TypeScript |
| `npm --workspace apps/mobile run lint` | PASS | Mobile ESLint |
| `npm --workspace apps/mobile run test` | PASS | 126 mobile tests, including grade parser and presentation coverage |
| `npm --workspace apps/api run typecheck` | PASS | API TypeScript |
| `npm --workspace apps/api run test` | PASS | 383 API tests |
| `npm --workspace apps/api run build` | PASS | Next build includes protected grade routes |
| `npm run typecheck` | PASS | 7/7 workspaces |
| `npm run lint` | PASS | 7/7 workspaces |
| `git diff --check` | PASS | Exit 0 with line-ending warnings only |

## 11. Deferred Work

- Phase 5E.6: protected live validation and hardening for the mobile grade
  experience.
- Phase 5F: resilient/background/resumable synchronization design.
- Future Grade Goal Planner: target grades, what-if grades, needed-score
  planning, assignment weighting, GPA planning, and local projections.
- Future Canvas work: rubrics, instructor feedback, comments, attachments,
  quiz details, submission uploads, notifications, schedule integration, and
  Canvas OAuth.

## 12. Final Verdict

Phase 5E.5 is implemented and locally validated. Phase 5E itself is not marked
complete until Phase 5E.6 protected live validation and hardening passes.

```text
PASS — Phase 5E.5 mobile grade experience complete
```

Next roadmap task: Phase 5E.6 — Protected live validation and hardening.
