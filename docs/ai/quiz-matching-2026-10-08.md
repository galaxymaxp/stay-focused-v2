# Matching Quiz implementation and acceptance

## Cloud rollout restriction — 2026-10-08

Fresh production inspection establishes a different legacy Matching,
canonical-source and pair-weighted/assisted scoring contract. **Do not apply
this checkpoint's Matching replacement or deploy its API directly to that
target.** The historical migration ordering below is not authorization to
replace those live RPCs. Existing saved quizzes, attempts, scores and supported
clients require a reviewed preservation/version boundary and coordinated
rollout on the actual deployed lineage. See the
[compatibility assessment and handoff](acceptance/b25.3.3/cloud-matching-compatibility.md).
No production migration or adapter was applied in this cloud run.

Completed: 2026-10-08 (Asia/Manila); started 2026-10-07. Checkout: C:\Projects\stay-focused-v2. Branch: main.
Starting HEAD: e11c2d21d91ba0eec8c10fd0e5cd007f0179c799, the verified shared Quiz learning-progress commit.

## Starting state and scope

The initial index was empty. There were 16 modified tracked files and 111 untracked leaf files (127 total). Only the three current-state/sprint/roadmap documents overlap this task. The initial files were backed up and SHA-256 inventoried outside the checkout. Baseline focused verification was FRESH: API Quiz 182 passed / 3 skipped; QuizScreen 16 passed; all three typechecks passed. The previous task's full baseline (959 API / 497 mobile / 45 shared) was historical evidence, not rerun as a full baseline before editing.

This implements Matching in the existing Quiz architecture. No web scaffold, new AI architecture, intentional incomplete submission, Reviewer/Activity generation, Canvas ingestion, OCR, auth, provider configuration, dependencies or unrelated acceptance assets were changed.

## Architecture trace

- Shared public contracts: `packages/shared/src/quiz.ts`.
- Generation: `quiz/sources.ts` validates the request; `makeQuizPlan`, `quizSchema`, `validateCandidate`, `generateQuiz` in `quiz/generation.ts` plan, author, validate and independently audit. `quiz/blueprints.ts` selects relationship affordances; `quiz/matching.ts` validates sides/maps and orders items. The existing API OpenAI adapter forwards the strict nested JSON schema without conversion.
- Persistence: `startQuizGeneration` and `processQuizJob` in `quiz/service.ts` use the existing durable job/checkpoint/result path. `complete_quiz_processing_job` persists a learner whitelist to `quizzes.questions` and the key/evidence to private `quiz_keys.questions`.
- Reads: `readQuiz` → `quizView` → `learnerQuestion`. `ExperienceService.quizRecords` reuses the same projection for Library.
- Attempts: `startAttempt` / `start_quiz_attempt`; `saveAnswer` / `save_quiz_answer` for drafts and finalized answers. `attemptView` normalizes legacy choice rows and exposes feedback only for finalized questions.
- Scoring: `completeAttempt` / `complete_quiz_attempt` enforce all questions finalized and calculate percentage; `evaluateAnswer` / `resultView` serialize question results and existing topic feedback.
- History/reopen: `attemptHistoryRows`, `quizAttemptSummary`, `readAttempt` use owner-scoped existing paths. Progress derives through `deriveQuizLearningProgress`.
- Mobile: existing `QuizScreen.tsx` and bearer-authenticated `experienceRequest`; `MatchingQuestion.tsx` is a renderer within that screen, not a second Quiz experience. `GenerateScreen.tsx` permits Matching in its existing request.

## Contract

Public Matching question: `{ id, type: 'matching', prompt, leftItems: [{id,label}], rightItems: [{id,label}], difficulty, selectionInstruction }`. Both sides have 2–6 items, equal size, globally unique opaque IDs, nonempty human-readable labels and unique normalized labels per side. No correctness, explanation, evidence or verifier output is public.

Private key: existing `StoredQuestion` union adds `StoredMatchingQuestion`, combining the shared public shape, existing explanation/topic/source metadata and `correctPairs: [{leftItemId,rightItemId}]`. It stays in the existing private key store. There is no second key table or client secret store.

Student answer: `{ type: 'matching', questionId, pairs: [{leftItemId,rightItemId}], finalizedAt }`. Choice answers retain `selectedOptionIds`; the optional legacy choice discriminator is normalized to `choice` in API projections. New PATCH bodies use `{type:'matching',pairs,finalize}`; legacy choice PATCH bodies remain accepted.

Drafts may have zero or some pairs. Every pair must reference known items; duplicate left/right assignments are invalid even in drafts. Finalization additionally requires every left item paired exactly once. Finalized answers cannot be edited. Quiz completion still requires every question finalized. A nonempty Matching draft counts as one answered question for progress, while feedback remains absent.

Scoring is exact question correctness: all pairs match the private bijection or the question is incorrect. Pair order is irrelevant. No partial credit or new percentage weighting was introduced. SQL completion and API feedback use the same identity-based policy.

Shuffle: SHA-256 ordering independently salts question ID, side name and item ID. It never reads the map, never assumes positional alignment and does not force a key-dependent rotation. Public order persists once and does not change during reload. Answers and feedback join by explicit IDs; visible output always uses persisted labels, with no machine-ID fallback.

## Why a forward migration is required

The tables already accept JSONB. Their existing write/complete RPCs do not: the worker completion function serializes `options`, answer saving requires a JSON array of selected option IDs, and completion compares only `correctOptionIds`. Thus the existing physical persistence/scoring path cannot process Matching by changing TypeScript alone.

`packages/db/migrations/20261007155114_quiz_matching.sql` replaces only those three function bodies. It retains owner checks, row locks, strict completion guard, security-definer empty search path and service-role-only execution. It creates no tables/columns and changes no RLS policies. DB completion independently whitelists learner-visible side fields, preventing a faulty worker from copying private key/evidence into public JSON. Existing choice records and choice RPC payloads remain valid.

The filename was created with the Supabase CLI migration command in an isolated temporary workdir. Apply it before API deployment. It was applied only in local PGlite Postgres integration tests; remote/production application is NOT RUN.

## Interaction and secrecy

The learner selects a left label then a right label. Active/paired states and the paired answer are visible. Selecting an occupied right answer releases its previous left assignment and preserves other pairs; the UI states this rule. Clear pairing removes only the active row. Long labels wrap; touch actions require no hover or drag-and-drop. Existing serialized save/retry handling prevents concurrent draft writes.

Check Answer on incomplete mappings shows an understandable message without sending a finalize request, scoring or erasing the draft. Checked and completed/reopened feedback joins submitted and correct IDs to public labels. Missing public labels fail validation. Public Quiz, Library, summary history and unfinalized feedback do not expose the private key. Only finalized-question feedback reveals correct pairs, as existing choice feedback reveals checked answers. Foreign owner reads/writes/results/history retain safe denial, and authenticated RLS excludes foreign attempts/private keys.

## Automated acceptance

| Case | Result and evidence |
| --- | --- |
| Choice regression/backward compatibility | PASS: all existing suites; database test creates choice quiz/draft under old RPCs, then migrates, reopens and completes at 100% |
| Valid/mixed generation and grounding | PASS: matching.test.ts uses actual generator/planner and independent synthetic provider audit; wrong key/missing pair analysis rejected |
| Invalid references, IDs, empty sides, labels/key shape | PASS: matching.test.ts rejects unknown/duplicate references, duplicate IDs, empty sides, missing/empty labels, unsupported evidence and choice fields on Matching |
| Public/private persistence and leakage | PASS: database.test.ts inspects actual stored public/private JSON; security.test.ts checks authenticated API reads; public label validation rejects ID fallback |
| Partial draft, edit, reload, finalization | PASS: database.test.ts persists/reloads/edits partial mappings; rejects incomplete finalization, duplicate left/right, unknown IDs, edits after finalize and premature completion |
| Correct/incorrect/mixed scoring | PASS: order-independent exact scoring; swapped and all-wrong mappings fail; mixed five-question attempt scores 4/5 = 80%; correct retry scores 100% |
| Retry/history/Library progress | PASS: independent retry attempts, stable finalized reload, three completed history rows, best score 100%, unchanged progress precedence and foreign Library denial |
| Owner isolation/existing choice secrecy | PASS: real SQL owner/RLS checks plus security API tests; foreign Quiz/draft/finalized/results/history access denied; existing choice security tests pass |
| Mobile full interaction and no raw-ID text | PASS: real QuizScreen tests render both sides/long labels, create two pairs, reject incomplete check, reassign/edit, remount/resume, finish/check, show readable feedback, advance, complete and reopen history; clear preserves unrelated pairs |
| Shared future-client contract | PASS: quiz.test.ts covers mixed union serialization, partial explicit pairs, legacy choice compatibility and separate result feedback |

## Verification

All final results below are FRESH. Existing opt-in skips are retained.

| Command | Result | Notes |
| --- | --- | --- |
| `npm run test -w @stay-focused/shared` | PASS | 48 passed, 7 files |
| `npm run test -w @stay-focused/api` | PASS | 982 passed / 4 skipped; 84 files passed, 1 skipped |
| `npm run test -w @stay-focused/mobile` | PASS | 499 passed, 41 files |
| `npm run test -w @stay-focused/api -- src/lib/quiz/generation.test.ts src/lib/quiz/convergence.test.ts src/lib/quiz/matching.test.ts` | PASS | 130 passed, 3 files |
| `npm run test -w @stay-focused/api -- src/lib/quiz/database.test.ts src/lib/quiz/security.test.ts src/lib/quiz/learning-progress.test.ts src/lib/quiz/durable.test.ts` | PASS | 75 passed / 2 skipped, 4 files |
| `npm run test -w @stay-focused/mobile -- src/features/redesign/quizLearning.test.ts src/features/redesign/screens.test.ts` | PASS | 26 passed, 2 files |
| `npm run typecheck -w @stay-focused/shared` | PASS | Strict TypeScript |
| `npm run typecheck -w @stay-focused/api` | PASS | Strict TypeScript |
| `npm run typecheck -w @stay-focused/mobile` | PASS | Strict TypeScript |
| `npm run lint -w @stay-focused/api` | PASS | No warnings |
| `npm run lint -w @stay-focused/mobile` | PASS | No warnings |
| `git diff --check`, `git diff --cached --check` | PASS | Working and staged whitespace checks |

Initial failures were introduced by this task and fixed: an SQL-generation script replacement mishandled a regex dollar sequence, producing invalid new SQL; union narrowing and readonly/generic annotations needed updates in test/helpers; two unused destructured fields triggered lint warnings. Corrected SQL is exercised by real Postgres transactions, and the final typechecks/lint/suites pass. No pre-existing failure or unresolved environment/tooling blocker remains.

NOT RUN: opt-in live-provider tests (existing choice-oriented harness), physical device, production deployment/migration and whole-web readiness. Deterministic contract/schema/SQL/API/mobile integration is the required acceptance for this slice; no new live harness was added. Real-source Matching generation convergence remains unproven by these synthetic provider tests.

## Git preservation

The three overlapping documents receive a new section; their original bytes remain intact. Only HEAD plus the new section is staged, leaving their pre-existing 25-line additions unstaged. All other initial dirty/untracked files retain their original SHA-256. An incidental Supabase CLI latest-version cache update was detected and restored from a prior backup that exactly matched this task's initial hash. Root package/dependency/lockfile and unrelated design/acceptance assets are untouched. The scoped commit message is `feat(quiz): add matching question support`.

## Outcome and next task

PASS — Matching questions are supported end-to-end.

Next recommended task: Intentional incomplete Quiz finalization / “Finish Anyway” semantics. Not started here. No incomplete-completion policy was added; all-question finalization remains required.
