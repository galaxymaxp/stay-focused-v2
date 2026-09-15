# B25 — UI redesign foundation

## B25.3.3 AI-first production rollout (2026-09-16)

Reviewer, Quiz and Activity now use the AI-first boundary. Live-material comparison and deterministic regression pass; deployment dpl_9yAtq2sy2YYRfYjoqytHCL6aWUa4 is READY and healthy. Physical acceptance is blocked on device sign-in and selected Activity assignment. B25 remains PARTIAL; B26 may not begin. See [current acceptance](../b25.3.3/architecture-simplification.md).

Date: 2026-09-13. Implementation checkout: `C:/Projects/stay-focused-v2`, branch `main`.
Starting HEAD: `061aed3ac9c12a4df55f56b2525317d2cfa61297` (B24.7 Quiz backend). Starting origin comparison: 37 ahead, 0 behind. `git fsck --full` exited 0 with seven dangling blobs. No fetch, remote mutation, reset, clean, stash or push.

## Design authority

The user relocated the approved sources to `docs/design`. Read all seven Markdown files in `docs/design/references/v2-redesign`: README.md, component-map.md, design-tokens.md, implementation-rules.md, motion-system.md, screens.md, ui-vision.md. Also read the parent references README. Inspected the referenced `stay_focused_v2_ui_showcase.png` and `stay_focused_v2_app_showcase.png` in the parent references directory. No alternate design-directory search was required. No sources were copied, extracted, reorganized, rewritten or added by B25.

Locked direction: exactly Today / Generate / Tasks / Library; neutral black and graphite dark mode; independent warm light mode; prominent interactive clock; Canvas order; hidden minimal Generation and Queue. Markdown controls behavior when reference imagery conflicts with it.

## Delivered foundation

- Central themes, semantic tokens, typography, radii, 48-point controls, surfaces, row links, modal sheet and motion timings. Appearance persists System/Light/Dark. Legacy deep screens use the same theme.
- Today uses the existing Today DTO and deterministic planner preview/replan. Real timed records supply ring segments. Ring holds activate after 300 ms, give a 10 ms vibration, and drag in 15-minute increments. Accessible adjustable actions and explicit time buttons provide alternatives. Apply is explicit. No client scheduling algorithm.
- Generate loads courses and paginated materials, preserving contiguous backend module order. Selecting material opens an immediate action sheet. Reviewer and Quiz require both material and global capabilities; unavailable actions explain why. Existing Canvas sync, source-section selection, grades, text/camera/file intake remain reachable.
- Generation intents persist per owner before navigation. Admission survives leaving the screen and retries reuse an idempotency key. Only confirmed server admission gets background-safe wording. Queue reconciles server jobs and unresolved local intents, paginates history, opens saved results and offers only server-authorized retries.
- Tasks uses backend Now/Next/Later, assignment detail/resources, existing completion editing, and Activity Maker through the same durable Generation route.
- Library opens persisted Reviewer, Quiz and Activity Output contracts. Basic reading, one-question quiz practice, feedback/results/weak areas, revision-checked draft saving and unsaved-edit protection are included. Opening never generates again.
- Fixed the existing Library route allowlist to admit `quiz:` and `activity:` artifact aliases already supported by its owner-scoped service. No planner, model, generation engine, database schema or provider runtime changes.

## Backend readiness

| Capability | Repository availability | UI treatment / deployment boundary |
| --- | --- | --- |
| Today | Implemented | Fetch Today; useful loading/error/empty states |
| Reviewer | Implemented | Capability-gated generation and persisted reading |
| Quiz | B24.7 implemented locally | Material/global gate, practice/results; hosted migration/API rollout not verified |
| Activity Maker | B24.6 implemented locally | Assignment capability gate; hosted migration/API rollout not verified |
| Queue/jobs | Implemented | Server jobs are authority; local intents recover uncertain admission |
| Library | Implemented | GET saved outputs; quiz/activity alias route fix included |
| Planner | Implemented | Existing preview/replan only |
| Calendar | Unavailable per current contracts | No fabricated classes; draws only records supplied by Today |

No hosted migration or deployment was performed. Existing backend acceptance documents still identify B24.6/B24.7 rollout as pending; local API coverage is not a live hosted acceptance claim.

## Acceptance status

PARTIAL — redesign foundation works but an issue blocks B26

Automated checks pass and isolated component renders have been compared with both-theme reference layouts. Authenticated physical acceptance remains open: authorized realme RMX3151 (Android 13) was connected but locked. Preview launch did not cross the lock screen. No native frame-rate, touch, haptic, font-scaling, TalkBack, restart or authenticated generation claim is made. Close that acceptance gate before treating B25 as signed off.

Recommended next phase after that gate: B26 — Reviewer, Quiz, Activity Maker, result screens, editor experience and advanced animation polish.

## Pre-existing work preserved

The three current-state documents received a separate B25 section; their earlier dirty content is preserved and excluded from B25 commits. All other paths below remain unstaged and unmodified by deliberate B25 edits. The moved design tree is user-provided, not a B25 deliverable.

- `apps/api/workflow-tests/canvas-sync-runtime-fixture.ts`
- `apps/api/workflow-tests/canvas-sync-runtime.workflow.test.ts`
- `apps/mobile/src/auth/sessionStore.ts`
- `apps/mobile/src/services/activeProcessingJobStore.test.ts`
- `apps/mobile/src/services/activeProcessingJobStore.ts`
- `apps/mobile/src/services/completedArtifactCache.test.ts`
- `apps/mobile/src/services/completedArtifactCache.ts`
- `apps/mobile/src/services/processingDraftStore.ts`
- `apps/mobile/src/services/processingJobsApi.test.ts`
- `apps/mobile/src/services/processingOutboxStore.test.ts`
- `apps/mobile/src/services/processingOutboxStore.ts`
- `docs/ai/current_sprint.md`
- `docs/current-state.md`
- `docs/roadmap.md`
- `package.json`
- `apps/mobile/src/auth/sessionStore.test.ts`
- `apps/mobile/src/services/localStoreQueue.ts`
- `apps/mobile/src/services/persistenceConcurrency.test.ts`
- `docs/ai/acceptance/b8/`
- `docs/ai/acceptance/pre-ui/`
- `docs/design/`


## B25.3.2 candidate convergence (2026-09-15)

Commit `79e54dd` adds source-compatible blueprints, two-candidate pools, deterministic selection, cumulative semantic-intent exclusions and v4 durable call bounds. Strict quality, secrecy, ownership and exact-count gates remain. Focused Quiz 117; full Quiz 168 passed / 3 skipped; API 944, Mobile 481, Canvas 73, Engine 606, OCR 27, Shared 44; Workflow 1, provider contract 18; fresh root typecheck/lint/build 7/7 each. One live fixture passed 5/5 in 63.331 seconds with two author/two verifier calls and 14 candidates. Deployment `dpl_peVBgRctKVmGTfkNfQqTev74QCda` is READY and canonical health is OK.

The single authenticated production attempt on the unchanged real lecture failed: job `d038e85b-ae03-4853-aa2a-f663037415b0`, Workflow `wrun_01M2J4TSMPMWB6SPQXW8F0CTH0`, 4/5 accepted, q3 pending, `repair_exhausted` / `bounded_repair_attempts_exhausted` / `quiz_generation_failed`. Eighteen candidates and four author/four verifier batches; no Quiz persisted and no retry submitted. q1/q4 accepted second alternatives; q5 converged after a new intent; q3 failed even with alternate support. The realme showed the Generation failure and opened Queue; Library/attempt/secrecy/score/result/reopen remain unaccepted.

B25.3.3 should preserve source context and precise evidence ownership, select supports with enough evidence for meaningful distractors, and plan full-set concept/difficulty feasibility before immutable acceptance. **PARTIAL — Quiz semantic convergence remains incomplete.** B26 may not begin. See [B25.3.2 report](../b25.3.2/quiz-candidate-convergence.md).
