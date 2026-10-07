# Shared Quiz learning progress — implementation record

Date: 2026-10-07. Checkout: C:\Projects\stay-focused-v2. Branch: main.
Starting HEAD: d00a543f36e74ce840a9e58a31633e5f8f42dbc9. The pre-existing web migration audit exists at `docs/ai/web-migration-audit-2026-10-07.md` and remains untracked/unchanged.

## Existing contract trace

- Generation persists public `quizzes` and private `quiz_keys` separately through the existing completion RPC.
- `quizView` in `apps/api/src/lib/quiz/service.ts` previously returned attempt count and nullable score aggregates only. `readQuiz` loads owned Quiz/attempt rows. The new pure helper replaces its aggregate logic.
- `ExperienceService.quizRecords` in `apps/api/src/lib/experience/service.ts` uses the same `quizView` for Library list/detail. Artifact `status: completed` continues to mean generated successfully. Library learning fields are the identical shared Quiz summary.
- `start_quiz_attempt`, `save_quiz_answer` and `complete_quiz_attempt` remain the persistence path. Existing statuses are `in_progress`, `completed`, `abandoned`; no new database states are invented. Drafts have `finalizedAt: null`; only intentionally checked answers produce feedback.
- Quiz history GET maps owned rows through typed `quizAttemptSummary`; completion POST remains guarded by the existing database requirement that every question be finalized.
- Mobile uses bearer-authenticated `experienceRequest`. Library's existing `useExperience` refetches on focus, with no generation or direct table reads.

## Public contract and authoritative rules

`QuizSummary extends QuizLearningProgress`, so both Quiz and Library expose the same flat fields: `learningState`, `answeredCount`, `questionCount`, `activeAttemptId`, `attemptCount`, `completedAttemptCount`, `latestCompletedAt`, `latestScore`, `bestScore`. Existing count/percentage names avoid duplicate DTOs and aliases. `QuizAttemptSummary` reuses attempt identity/status/time fields and nullable `percentage`.

Derivation: `apps/api/src/lib/quiz/learning-progress.ts`. Filter owner and Quiz first. Active attempt wins, then any completed history, then abandoned-only, else not-started. Multiple active attempts select newest start, then lexicographically greatest ID; history completion ordering uses completion timestamp then greatest ID. No input array is mutated. For legacy missing completion times, ordering falls back to start time while the public completion timestamp remains null.

Answered count uses distinct known public question IDs with nonempty persisted selections on the selected attempt: active, otherwise latest completion, otherwise latest abandonment. Empty drafts and unknown/duplicate question IDs do not inflate it. Drafts are progress, not finalized work. Starting a retry retains prior completion aggregates; an abandoned retry never erases completion. Persisted completed status is authoritative; nullable scores are never converted to fabricated zero. Zero remains a valid percentage everywhere. Neither progress derivation nor Library queries private keys.

## Acceptance evidence

| Case | Evidence |
| --- | --- |
| Untouched, partial, completed, 0%, abandoned, retries, multiple completions/active ties | `quiz/learning-progress.test.ts`: 10 tests, including null/zero and input-order invariance |
| Owner isolation and public history timestamp | `quiz/security.test.ts`: authenticated history GET, foreign owner/Quiz exclusion, no private keys, 0% and completedAt |
| Real persistence and Library refresh | `quiz/database.test.ts`: Postgres generation fixture then start, draft, finalized 0% completion, retry, abandonment and owner denial; Library rereads persist without regeneration/duplication |
| Reviewer/Activity unchanged | `experience/experience.test.ts`: exact before/after comparison of non-Quiz Library items |
| Mobile states, timestamps, history failures/retry, draft saves/resume, serialized writes, current-attempt refresh, route reset, return-to-Library focus reload | `redesign/quizLearning.test.ts`: 16 behavioral screen tests using real refresh hooks |
| Shared serialization | `shared/src/experience.test.ts`: generated status separate from untouched Quiz learning progress |

## Verification (all final runs FRESH)

| Command | Final result | Notes |
| --- | --- | --- |
| `npm ls vitest @vitest/utils --depth=1` | PASS | Initial missing/incomplete local `@vitest/utils` installation was pre-existing; repaired by `npm install --ignore-scripts --no-audit --no-fund`; locked versions remain 4.1.9 |
| `npm run test -w @stay-focused/api -- src/lib/quiz src/lib/experience` | PASS | 274 passed, 3 skipped; 9 files passed, 1 skipped |
| `npm run test -w @stay-focused/api` | PASS | 959 passed, 4 skipped; 83 files passed, 1 skipped |
| `npm run test -w @stay-focused/mobile` | PASS | 497 passed in 41 files |
| `npm run test -w @stay-focused/shared` | PASS | 45 passed in 6 files |
| `npm run typecheck -w @stay-focused/shared -w @stay-focused/api -w @stay-focused/mobile` | PASS | All three workspaces |
| `npm run lint -w @stay-focused/api -w @stay-focused/mobile` | PASS | Both workspaces |
| `git diff --check`, staged diff check | PASS | No whitespace errors |
| Device / production / whole-web readiness | NOT RUN | Outside this focused local slice; existing opt-in live tests remain skipped |

Initial implementation checks exposed three introduced test-only mistakes: an HTTP assertion omitted the existing success envelope, an Activity fixture omitted required section metadata, and its generation ID used null despite the typed schema. Each was fixed; focused/full tests and all typechecks subsequently passed. There are no remaining failures or tooling blockers. No dependency version, lockfile, migration, production configuration, generation engine or web scaffold changes.

## Git preservation

Initial inventory contained 16 modified tracked files and 111 untracked files (127 files hashed/backed up). Only the three current-state documentation files overlap. Their existing contents remain byte-for-byte intact around a new inserted section; the index contains HEAD plus this task's section only. All other baseline files retain their original SHA-256. The root package manifest's pre-existing edits and lockfile were preserved. The prior audit and acceptance/design assets remain untracked. The scoped commit is `fix(quiz): add shared learning progress projection`; it contains only this task's source, tests and documentation.

## Starting dirty inventory

The following paths were already dirty before this task (tracked modifications and untracked leaf files). They are not newly introduced work:

```text
apps/api/workflow-tests/canvas-sync-runtime-fixture.ts
apps/api/workflow-tests/canvas-sync-runtime.workflow.test.ts
apps/mobile/expo-env.d.ts
apps/mobile/src/auth/sessionStore.ts
apps/mobile/src/services/activeProcessingJobStore.test.ts
apps/mobile/src/services/activeProcessingJobStore.ts
apps/mobile/src/services/completedArtifactCache.test.ts
apps/mobile/src/services/completedArtifactCache.ts
apps/mobile/src/services/processingDraftStore.ts
apps/mobile/src/services/processingJobsApi.test.ts
apps/mobile/src/services/processingOutboxStore.test.ts
apps/mobile/src/services/processingOutboxStore.ts
docs/ai/current_sprint.md
docs/current-state.md
docs/roadmap.md
package.json
apps/mobile/.gitignore
apps/mobile/src/auth/sessionStore.test.ts
apps/mobile/src/services/localStoreQueue.ts
apps/mobile/src/services/persistenceConcurrency.test.ts
docs/ai/acceptance/b25.2/build-harness.cjs
docs/ai/acceptance/b25.2/capture-manifest.json
docs/ai/acceptance/b25.2/capture.cjs
docs/ai/acceptance/b25.2/comparison-manifest.json
docs/ai/acceptance/b25.2/compose.cjs
docs/ai/acceptance/b25.2/dark-comparison-v2.png
docs/ai/acceptance/b25.2/dark-comparison.png
docs/ai/acceptance/b25.2/final-comparison.md
docs/ai/acceptance/b25.2/iterations/cycle-1/capture-manifest.json
docs/ai/acceptance/b25.2/iterations/cycle-1/comparison-manifest.json
docs/ai/acceptance/b25.2/iterations/cycle-1/dark-comparison-v2.png
docs/ai/acceptance/b25.2/iterations/cycle-1/light-comparison-v2.png
docs/ai/acceptance/b25.2/iterations/cycle-1/screenshots/web/generate-dark.png
docs/ai/acceptance/b25.2/iterations/cycle-1/screenshots/web/generate-light.png
docs/ai/acceptance/b25.2/iterations/cycle-1/screenshots/web/generation-dark.png
docs/ai/acceptance/b25.2/iterations/cycle-1/screenshots/web/generation-light.png
docs/ai/acceptance/b25.2/iterations/cycle-1/screenshots/web/library-dark.png
docs/ai/acceptance/b25.2/iterations/cycle-1/screenshots/web/library-light.png
docs/ai/acceptance/b25.2/iterations/cycle-1/screenshots/web/queue-dark.png
docs/ai/acceptance/b25.2/iterations/cycle-1/screenshots/web/queue-light.png
docs/ai/acceptance/b25.2/iterations/cycle-1/screenshots/web/tasks-dark.png
docs/ai/acceptance/b25.2/iterations/cycle-1/screenshots/web/tasks-light.png
docs/ai/acceptance/b25.2/iterations/cycle-1/screenshots/web/today-dark.png
docs/ai/acceptance/b25.2/iterations/cycle-1/screenshots/web/today-light.png
docs/ai/acceptance/b25.2/iterations/cycle-2/capture-manifest.json
docs/ai/acceptance/b25.2/iterations/cycle-2/comparison-manifest.json
docs/ai/acceptance/b25.2/iterations/cycle-2/dark-comparison-v2.png
docs/ai/acceptance/b25.2/iterations/cycle-2/interaction-checks.json
docs/ai/acceptance/b25.2/iterations/cycle-2/light-comparison-v2.png
docs/ai/acceptance/b25.2/iterations/cycle-2/screenshots/interactions/material-sheet-dark.png
docs/ai/acceptance/b25.2/iterations/cycle-2/screenshots/navigation/generate-dark.png
docs/ai/acceptance/b25.2/iterations/cycle-2/screenshots/navigation/generate-light.png
docs/ai/acceptance/b25.2/iterations/cycle-2/screenshots/navigation/library-dark.png
docs/ai/acceptance/b25.2/iterations/cycle-2/screenshots/navigation/library-light.png
docs/ai/acceptance/b25.2/iterations/cycle-2/screenshots/navigation/tasks-dark.png
docs/ai/acceptance/b25.2/iterations/cycle-2/screenshots/navigation/tasks-light.png
docs/ai/acceptance/b25.2/iterations/cycle-2/screenshots/navigation/today-dark.png
docs/ai/acceptance/b25.2/iterations/cycle-2/screenshots/navigation/today-light.png
docs/ai/acceptance/b25.2/iterations/cycle-2/screenshots/web/generate-dark.png
docs/ai/acceptance/b25.2/iterations/cycle-2/screenshots/web/generate-light.png
docs/ai/acceptance/b25.2/iterations/cycle-2/screenshots/web/generation-dark.png
docs/ai/acceptance/b25.2/iterations/cycle-2/screenshots/web/generation-light.png
docs/ai/acceptance/b25.2/iterations/cycle-2/screenshots/web/library-dark.png
docs/ai/acceptance/b25.2/iterations/cycle-2/screenshots/web/library-light.png
docs/ai/acceptance/b25.2/iterations/cycle-2/screenshots/web/queue-dark.png
docs/ai/acceptance/b25.2/iterations/cycle-2/screenshots/web/queue-light.png
docs/ai/acceptance/b25.2/iterations/cycle-2/screenshots/web/tasks-dark.png
docs/ai/acceptance/b25.2/iterations/cycle-2/screenshots/web/tasks-light.png
docs/ai/acceptance/b25.2/iterations/cycle-2/screenshots/web/today-dark.png
docs/ai/acceptance/b25.2/iterations/cycle-2/screenshots/web/today-light.png
docs/ai/acceptance/b25.2/iterations/cycle-3/capture-manifest.json
docs/ai/acceptance/b25.2/iterations/cycle-3/comparison-manifest.json
docs/ai/acceptance/b25.2/iterations/cycle-3/dark-comparison-v2.png
docs/ai/acceptance/b25.2/iterations/cycle-3/evidence-verification.json
docs/ai/acceptance/b25.2/iterations/cycle-3/light-comparison-v2.png
docs/ai/acceptance/b25.2/iterations/cycle-3/navigation-preview.png
docs/ai/acceptance/b25.2/iterations/cycle-3/screenshots/web/generate-dark.png
docs/ai/acceptance/b25.2/iterations/cycle-3/screenshots/web/generate-light.png
docs/ai/acceptance/b25.2/iterations/cycle-3/screenshots/web/generation-dark.png
docs/ai/acceptance/b25.2/iterations/cycle-3/screenshots/web/generation-light.png
docs/ai/acceptance/b25.2/iterations/cycle-3/screenshots/web/library-dark.png
docs/ai/acceptance/b25.2/iterations/cycle-3/screenshots/web/library-light.png
docs/ai/acceptance/b25.2/iterations/cycle-3/screenshots/web/queue-dark.png
docs/ai/acceptance/b25.2/iterations/cycle-3/screenshots/web/queue-light.png
docs/ai/acceptance/b25.2/iterations/cycle-3/screenshots/web/tasks-dark.png
docs/ai/acceptance/b25.2/iterations/cycle-3/screenshots/web/tasks-light.png
docs/ai/acceptance/b25.2/iterations/cycle-3/screenshots/web/today-dark.png
docs/ai/acceptance/b25.2/iterations/cycle-3/screenshots/web/today-light.png
docs/ai/acceptance/b25.2/light-comparison-v2.png
docs/ai/acceptance/b25.2/light-comparison.png
docs/ai/acceptance/b25.2/navigation-preview.png
docs/ai/acceptance/b25.2/reproduction/README.md
docs/ai/acceptance/b25.2/reproduction/build-harness.cjs
docs/ai/acceptance/b25.2/reproduction/build-navigation.cjs
docs/ai/acceptance/b25.2/reproduction/capture.cjs
docs/ai/acceptance/b25.2/reproduction/compose.cjs
docs/ai/acceptance/b25.2/reproduction/interaction-check.cjs
docs/ai/acceptance/b25.2/reproduction/verify-evidence.cjs
docs/ai/acceptance/b25.2/screenshots/web/generate-dark.png
docs/ai/acceptance/b25.2/screenshots/web/generate-light.png
docs/ai/acceptance/b25.2/screenshots/web/generation-dark.png
docs/ai/acceptance/b25.2/screenshots/web/generation-light.png
docs/ai/acceptance/b25.2/screenshots/web/library-dark.png
docs/ai/acceptance/b25.2/screenshots/web/library-light.png
docs/ai/acceptance/b25.2/screenshots/web/queue-dark.png
docs/ai/acceptance/b25.2/screenshots/web/queue-light.png
docs/ai/acceptance/b25.2/screenshots/web/tasks-dark.png
docs/ai/acceptance/b25.2/screenshots/web/tasks-light.png
docs/ai/acceptance/b25.2/screenshots/web/today-dark.png
docs/ai/acceptance/b25.2/screenshots/web/today-light.png
docs/ai/acceptance/b25.2/visual-audit.md
docs/ai/acceptance/b8/reviewer-e2e-acceptance.md
docs/ai/acceptance/pre-ui/pre-ui-persistence-readiness.md
docs/ai/web-migration-audit-2026-10-07.md
docs/design/references/README.md
docs/design/references/stay_focused_v2_app_showcase.png
docs/design/references/stay_focused_v2_ui_showcase.png
docs/design/references/v2-redesign/MANIFEST.txt
docs/design/references/v2-redesign/README.md
docs/design/references/v2-redesign/component-map.md
docs/design/references/v2-redesign/design-tokens.md
docs/design/references/v2-redesign/implementation-rules.md
docs/design/references/v2-redesign/motion-system.md
docs/design/references/v2-redesign/screens.md
docs/design/references/v2-redesign/ui-vision.md
supabase/.temp/cli-latest
supabase/.temp/linked-project.json
```

## Outcome and next task

PASS — shared Quiz learning progress and Library projection are implemented and verified.
Next recommended task: Matching-question contract + renderer + persistence + scoring. Not started here. Separate historical generation acceptance and broader web readiness remain as documented.
