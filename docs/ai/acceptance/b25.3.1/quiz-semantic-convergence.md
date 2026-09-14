# B25.3.1 real-material Quiz semantic convergence

Date: 2026-09-15. Branch `main`. Starting HEAD `820c346638480f57532b82a7b792752457394e21`; the ready Generation-orb work was preserved first as `0a0d754`, and the Quiz implementation is `bd5eb15`. Existing unrelated dirty work was preserved. No push, schema migration, validation weakening, or B26 work occurred.

## 1. Starting state

The initial branch was `main`. `git status --short` contained pre-existing mobile persistence, Canvas workflow-test, package, design/reference, acceptance-output, and documentation work. None was reset, cleaned, stashed, or overwritten. `git log --oneline -15` began at `820c346`; `git fsck --full` reported only existing dangling blobs and no repository corruption.

## 2. Failed-slot trace

The historical B25.3 run used five mixed questions with `single_select` and `true_false`. Its deployed implementation retained accepted questions but did not persist rejected candidate JSON, verifier reasoning, or per-round structured feedback. Consequently the requested literal chain of initial question → repaired wording → final rejected wording is not recoverable without inventing data, and private source text is intentionally absent.

| Historical slot | Assigned support | Requested type / difficulty | Recoverable findings |
|---|---|---|---|
| `q1` | One unique exact source-support unit | `single_select` / easy | Terminal `academicValue`; aggregate earlier-round diagnostics included option/distractor, distinctness, leakage, explanation-grounding, and key findings but did not attribute each one to this slot. |
| `q5` | One unique exact source-support unit | `single_select` / medium | Terminal `academicValue` and `difficulty_mismatch`; the same attribution limit applies to earlier rounds. |

The assigned evidence text and stable support identifiers were not logged. The old repair call received flat string feedback, discarded the rejected candidate between rounds, and repeated materially similar prompts. That proves the need for structured feedback and escalating reauthoring, but cannot reconstruct never-persisted question text.

The post-change production run provides a complete symbolic trace without source or answer content:

| Phase | Accepted | Pending-slot findings |
|---|---:|---|
| Initial authoring | 1/5 (`q4`) | `q1`: `academicValue`, `difficulty_mismatch`; `q2`: same; `q3`: `distractorsWrong`, `sourceSufficient`, `plausibleOptions`, `difficulty_mismatch`, `option_analysis_invalid`; `q5`: `distractorsWrong`, `sourceSufficient`, `plausibleOptions`, `option_analysis_invalid`. |
| Direct correction | 1/5 | `q1`: `academicValue`, `difficulty_mismatch`; `q2`: `keyCorrect`, `explanationGrounded`, `academicValue`, `difficulty_mismatch`, `option_analysis_invalid`, `answer_key_mismatch`; `q3`: local `wording_only_recognition`; `q5`: `distractorsWrong`, `academicValue`, `option_analysis_invalid`. |
| Full reauthor, same support | 1/5 | `q1`: local `answer_restatement`; `q2`: `academicValue`, `difficulty_mismatch`; `q3`: distractor, ambiguity, grounding, source-sufficiency, external-fact, self-containment, difficulty, and option-analysis findings; `q5`: `academicValue`. |
| Alternate unused support | 1/5 | `q1`: `academicValue`, `difficulty_mismatch`; `q2`: same; `q3`: local `wording_only_recognition`; `q5`: `academicValue`. |
| Terminal | 1/5 | `repair_exhausted`; `q1`, `q2`, `q3`, and `q5` pending. |

## 3. Root cause

The historical convergence path converted rich validator failures to broad strings, did not retain a failed candidate for direct correction, used the same repair shape each round, and re-audited already accepted questions. Mixed-set concentration repair could also request a new reasoning level while the slot allocation still demanded its original difficulty. The local answer-restatement heuristic matched useful application wording too broadly.

Those defects are repaired. The remaining production failure is narrower: the pinned author/verifier pair did not reliably follow the now-specific repair contract for this real lecture source. It repeated trivial-recognition or answer-restatement patterns for three slots and produced unstable option/grounding behavior for another even after full reauthor and alternate evidence. Exact-count enforcement correctly rejected the incomplete set rather than weakening the gates or persisting a partial Quiz.

## 4. Semantic repair changes

Repair feedback is now structured per slot: symbolic finding, finding-specific instruction, validator reason, requested and observed difficulty, option-level failures, and defensible option identifiers. The data remains in-memory/server-only and is never logged with prompts, source text, options, keys, or explanations.

Accepted context contains only question ID, topic, tested concept, and prompt, allowing `distinctConcept` guidance without exposing answer keys. Verification runs only on current candidates; accepted questions are immutable. Checkpoint policy and keys moved to v3 so old candidate state cannot mix with the new strategy.

## 5. Academic-value handling

The validator remains strict. Deterministic local rejection now covers pure list-position or formatting trivia, fragment completion, wording-only recognition, obvious answer restatement/definition paraphrase, and other stem wording that gives the answer away. Tests include meaningful supported concept/application passes and each requested failure shape. The repair instruction asks for a supported relationship, application, distinction, consequence, mechanism, or interpretation rather than a cosmetic paraphrase.

## 6. Difficulty handling

Source affordance now constrains difficulty assignment. Explicit medium/hard requests reject incompatible support; mixed planning assigns medium only to supports that can plausibly sustain it and does not force hard questions. If whole-set verification identifies a concentration problem, the active slot allocation is updated along with the repair request, eliminating contradictory target difficulty. The independent verifier still controls final observed-difficulty acceptance.

## 7. Repair escalation

Generation now has four bounded phases: initial authoring; direct correction with the full rejected question and cumulative findings; full reauthor from the same support without the old question; and full reauthor from a compatible unused reserve support unit. If no alternate exists, it returns the truthful `alternate_support_unavailable`/`repair_exhausted` path. It does not repeat one generic prompt.

## 8. Question-count decision

Exact question count remains required. The request contract permits 5–20, the persistence constraint requires the JSON question-array length to equal `question_count`, the completion RPC expects the exact input count, and mobile consumption assumes that count. B25.3.1 therefore did not silently return four questions for a five-question request; insufficient convergence remains a safe failure.

## 9. Deterministic validation

| Area | Result | Count/Notes |
|---|---|---|
| Focused Quiz generation/durable | PASS | 106 passed |
| Full Quiz directory | PASS | 157 passed, 3 opt-in skipped |
| Lecture-shaped regression | PASS | Five-slot mixed fixture; two initial academic-value/difficulty failures converge through targeted repair |
| Academic-value examples | PASS | Meaningful concept/application pass; formatting trivia, fragment completion, wording recognition, and answer restatement fail |
| Accepted-question immutability | PASS | Accepted candidates are excluded from later author/verifier rounds |
| Repair exhaustion | PASS | Alternate-support unavailable and bounded terminal behavior covered |

## 10. Live provider validation

- Model: pinned `gpt-5.4-2026-03-05`; production model configuration unchanged.
- Attempt 1: failed in 115.93 seconds. Four author rounds and three verifier calls exposed difficulty-allocation contradiction, non-cumulative feedback, and an over-broad local restatement heuristic. Evidence-based fixes were applied.
- Attempt 2: passed the complete safe lecture-style five-question flow in 35.78 seconds. The test runner suppressed the successful call-detail summary, so no unsupported underlying request count is claimed.
- Outcome: the maximum two validation attempts were used; no brute-force third attempt occurred.

## 11. Production deployment

With deterministic, full-build, and bounded synthetic-live validation green, commit `bd5eb151ec609c005bf1f24b7a550f354bd5cdd6` was deployed from a clean detached worktree to `galaxymaxps-projects/stay-focused-v2-prototype` after explicit user authorization. Deployment `dpl_3UxRUwZDy5iGgkX1j8HnLpJBqpnD` reached `READY`. Both production aliases resolve to it, and `https://stay-focused-v2-prototype.vercel.app/api/health` returned `{"status":"ok","version":"2.0.0"}`.

## 12. Real-material production Quiz

One authenticated ready lecture PDF from the owner account was selected on the physical device. Exactly one five-question mixed Quiz was submitted. Production job `3530a671-…` ran on the new deployment and workflow run `wrun_01M2GQYE8GHAPJ94DEVSDCHDBC` reached the Quiz processing step. It ended non-retryably with `quiz_generation_failed`: 1 accepted, 4 pending, terminal `repair_exhausted`. No second production Quiz was submitted.

The device left Generation through its Queue action after server admission was confirmed. Queue loaded the owner-scoped history and showed the newest Quiz as `Couldn’t finish`; opening it displayed the safe generic failure state.

## 13. Quiz attempt/results

Not run. Because no complete Quiz was persisted, Library open, pre-submit leakage inspection, answering, submit, deterministic score, result persistence, and result reopen could not be accepted. Claiming those steps would be inaccurate.

## 14. Physical-device result

The connected realme RMX3151 on Android 13 remained ADB-authorized and restored the authenticated Expo application. Course/material selection, Generation, the animated orb, navigation to Queue, owner-scoped Queue history, and terminal error detail rendered and remained responsive. The complete success route stopped at generation failure, so physical Quiz completion is unaccepted.

Redacted-safe screenshots are retained outside the repository at:

- `C:/Users/Fely Max Dilinila/Documents/Projects/stay-focused-b25.3.1-evidence/failed-detail.png`
- `C:/Users/Fely Max Dilinila/Documents/Projects/stay-focused-b25.3.1-evidence/queue-needs-attention.png`

## 15. Regression

Reviewer, Activity Maker, Canvas, OCR, engine, shared contracts, durable Workflow runtime, Quiz persistence/scoring, and owner-isolation automation remained green. The change did not alter Reviewer/Activity provider behavior, API authorization, answer-key secrecy, or scoring. The production failure adds a concrete regression target for the next explicitly authorized semantic-convergence slice; private material and failed provider output were not copied into fixtures.

## 16. Verification

All results below are fresh after the final implementation change:

| Gate | Result |
|---|---|
| API | PASS — 933 passed, 4 skipped; 81 files passed, 1 skipped |
| Mobile | PASS — 481 passed; 40 files |
| Canvas | PASS — 73 passed |
| Engine | PASS — 606 passed |
| OCR | PASS — 27 passed |
| Shared | PASS — 44 passed |
| Workflow runtime | PASS — 1 passed |
| Provider contract | PASS — 18 passed |
| Forced root typecheck | PASS — 7/7 workspaces, zero cached |
| Forced root lint | PASS — 7/7 workspaces, zero cached |
| Forced root build | PASS — 7/7 workspaces, zero cached; 23 steps, 2 workflows |
| Diff hygiene | PASS — scoped `git diff --check` |

## 17. Files changed

Implementation commit `bd5eb15` changes:

- `apps/api/src/lib/quiz/generation.ts`
- `apps/api/src/lib/quiz/generation.test.ts`
- `apps/api/src/lib/quiz/generation.live.test.ts`
- `apps/api/src/lib/quiz/fixtures.ts`
- `apps/api/src/lib/quiz/service.ts`
- `apps/api/src/lib/quiz/durable.test.ts`

The closure documentation commit adds this report and reconciles the B25 acceptance/current-state files. Unrelated pre-existing dirty paths remain outside both scoped commits.

## 18. Git result

Orb implementation: `0a0d754 fix(mobile): animate Generation orb composition`. Quiz implementation: `bd5eb15 fix(api): improve Quiz semantic repair convergence`. One documentation commit records this final evidence. No push was performed.

## 19. Final B25 verdict

**PARTIAL — Quiz semantic convergence remains incomplete**

B26 was not started. B25 cannot close until a real production material produces a complete persisted Quiz that can be taken, scored, and reopened under the existing strict validation contract.
