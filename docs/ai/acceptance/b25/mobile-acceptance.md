# B25 mobile acceptance

Date: 2026-09-13. Working tree includes pre-existing persistence/workflow hardening; those changes are not part of the B25 commits. Counts below describe this actual working tree, not a clean HEAD-only checkout.

## Fresh verification

Command: `npm run verify:pre-ui` (tests, real Workflow runtime test, forced typecheck, forced lint, forced build). Baseline and final runs exited 0. The final full run used zero cached tasks in every Turbo stage.

| Suite | Baseline FRESH | Final FRESH |
| --- | --- | --- |
| API | 906 passed, 3 skipped | 908 passed, 3 skipped |
| Mobile | 443 passed | 474 passed |
| Canvas | 73 passed | 73 passed |
| Engine | 606 passed | 606 passed |
| OCR | 27 passed | 27 passed |
| Shared | 44 passed | 44 passed |
| Workflow runtime | 1 passed | 1 passed |
| Typecheck | 7/7, 0 cached | 7/7, 0 cached |
| Lint | 7/7, 0 cached | 7/7, 0 cached |
| Build | 7/7, 0 cached | 7/7, 0 cached |

Final total: 2,133 passed, three existing skipped API tests. B25 adds 31 mobile tests and two API route cases. Mobile exports Android, iOS and web. Following the last opaque-sheet color refinement, mobile lint and Expo export were repeated successfully; no full-suite claim depends on cached output.

Evidence logs (not committed): `%TEMP%/stay-focused-b25-baseline.log`, `%TEMP%/stay-focused-b25-final2.log`, `%TEMP%/stay-focused-b25-mobile-lint.log`, `%TEMP%/stay-focused-b25-mobile-final-build.log`.

Behavior coverage includes exact tabs; fail-closed capability gates; Canvas grouping/order; real state messages; ring snapping, midnight boundaries, hold/haptic and accessible adjustments; planner preview without silent apply; owner-separated durable intents/idempotent recovery; safe authenticated HTTP handling; Library open without generation; theme policy and ambient lifecycle eligibility. Tests use mocked native/HTTP boundaries and do not certify physical interactions.

## Actual runtime / device evidence

- Expo web startup: FRESH, renders sign-in with configured public auth settings and no application error. No credentials entered or account bypass added.
- Isolated visual comparison: FRESH, real screen components in RN Web at 390 x 844 CSS pixels, both palettes, contract-test fixture adapters. Today/Generate/Generation/Queue/Tasks/Library inspected; material selection opens the sheet, unavailable Quiz is disabled, and opaque sheet hides underlying text. See deviations.md for evidence paths and limitations.
- Physical device: ADB-authorized realme RMX3151, Android 13. Expo Go and installed app detected; local Metro reverse/launch attempted. `dumpsys window` continued to report NotificationShade and `mDreamingLockscreen=true`. User unlock was requested. Phone remained locked at the last check.
- Authenticated native acceptance, haptic feel, TalkBack, font scaling, frame timing, background/force-stop/relaunch, actual artifact generation and hosted backend availability: BLOCKED / NOT RUN. No claim that a screenshot or build substitutes for these checks.

## Failed first attempts / limitations

Initial compile checks exposed stale generated route types, legacy theme helper scope and test mock types; all were corrected before final passing gates. Metro initially missed a newly added theme module because it was started before file creation; a normal watcher restart resolved this. An early preview lacked public auth configuration; the preview process received only existing public values, with no environment file edits. Formatting one route glob failed to match because of parentheses; it did not affect runtime or verification. Test runs themselves had no unresolved failures or recorded flakes. Build emitted harmless existing NO_COLOR/FORCE_COLOR warnings. Dependency installation reported 39 audit findings; broad dependency remediation was not included.

## Scoped file manifest

These are the 72 files changed by B25. The three current-state documents contain only B25 insertions in its commit; their earlier dirty content remains in the working tree. Approved design sources and existing unrelated dirty files are excluded.

- `apps/api/app/api/experience/[...path]/route.ts`
- `apps/api/src/lib/experience/http.test.ts`
- `apps/mobile/app/(app)/(tabs)/_layout.tsx`
- `apps/mobile/app/(app)/(tabs)/courses/index.tsx`
- `apps/mobile/app/(app)/(tabs)/library.tsx`
- `apps/mobile/app/(app)/(tabs)/today.tsx`
- `apps/mobile/app/(app)/(tabs)/work.tsx`
- `apps/mobile/app/(app)/_layout.tsx`
- `apps/mobile/app/(app)/activity.tsx`
- `apps/mobile/app/(app)/appearance.tsx`
- `apps/mobile/app/(app)/artifact.tsx`
- `apps/mobile/app/(app)/canvas-settings.tsx`
- `apps/mobile/app/(app)/generation-queue.tsx`
- `apps/mobile/app/(app)/generation.tsx`
- `apps/mobile/app/(app)/personal-tasks.tsx`
- `apps/mobile/app/(app)/quiz.tsx`
- `apps/mobile/app/(app)/saved-reviewers.tsx`
- `apps/mobile/app/(app)/study-session.tsx`
- `apps/mobile/app/_layout.tsx`
- `apps/mobile/package.json`
- `apps/mobile/src/app-shell/RestoringState.tsx`
- `apps/mobile/src/app-shell/UpcomingSurface.tsx`
- `apps/mobile/src/components/Button.tsx`
- `apps/mobile/src/components/Card.tsx`
- `apps/mobile/src/components/Screen.tsx`
- `apps/mobile/src/components/TextField.tsx`
- `apps/mobile/src/design/primitives.tsx`
- `apps/mobile/src/design/theme.tsx`
- `apps/mobile/src/design/themeTokens.ts`
- `apps/mobile/src/design/tokens.ts`
- `apps/mobile/src/features/auth/SignInScreen.tsx`
- `apps/mobile/src/features/auth/SignUpScreen.tsx`
- `apps/mobile/src/features/courses/CanvasGradeScreen.tsx`
- `apps/mobile/src/features/courses/CanvasSourceReviewerScreen.tsx`
- `apps/mobile/src/features/courses/CoursesScreen.tsx`
- `apps/mobile/src/features/library/StudyLibraryScreen.tsx`
- `apps/mobile/src/features/processing/ProcessingScreen.tsx`
- `apps/mobile/src/features/redesign/DayRingClock.tsx`
- `apps/mobile/src/features/redesign/GenerateScreen.tsx`
- `apps/mobile/src/features/redesign/GenerationOrb.tsx`
- `apps/mobile/src/features/redesign/GenerationScreen.tsx`
- `apps/mobile/src/features/redesign/LibraryScreen.tsx`
- `apps/mobile/src/features/redesign/QuizScreen.tsx`
- `apps/mobile/src/features/redesign/TasksScreen.tsx`
- `apps/mobile/src/features/redesign/TodayScreen.tsx`
- `apps/mobile/src/features/redesign/presentation.test.ts`
- `apps/mobile/src/features/redesign/presentation.ts`
- `apps/mobile/src/features/redesign/screens.test.ts`
- `apps/mobile/src/features/redesign/useExperience.ts`
- `apps/mobile/src/features/reviewer/ReviewerGenerateScreen.tsx`
- `apps/mobile/src/features/reviewer/ReviewerPreview.tsx`
- `apps/mobile/src/features/settings/SettingsScreen.tsx`
- `apps/mobile/src/features/work/TaskEditor.tsx`
- `apps/mobile/src/features/work/TaskEditorScreen.tsx`
- `apps/mobile/src/features/work/TaskRow.tsx`
- `apps/mobile/src/features/work/WorkScreen.tsx`
- `apps/mobile/src/features/work/WorkView.tsx`
- `apps/mobile/src/navigation/appRoutes.test.ts`
- `apps/mobile/src/navigation/appRoutes.ts`
- `apps/mobile/src/services/experienceApi.test.ts`
- `apps/mobile/src/services/experienceApi.ts`
- `apps/mobile/src/services/generationRecovery.test.ts`
- `apps/mobile/src/services/generationRecovery.ts`
- `docs/ai/acceptance/b25/design-system.md`
- `docs/ai/acceptance/b25/deviations.md`
- `docs/ai/acceptance/b25/mobile-acceptance.md`
- `docs/ai/acceptance/b25/motion-validation.md`
- `docs/ai/acceptance/b25/ui-redesign-foundation.md`
- `docs/ai/current_sprint.md`
- `docs/current-state.md`
- `docs/roadmap.md`
- `package-lock.json`
