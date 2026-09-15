# B25.3.2 production Quiz candidate convergence

Date: 2026-09-15. Implementation commit: `79e54ddc8b892b4872f60ce7a336de968918a496`. No push. No B26 work.

## Starting state

`main`, HEAD `adee0b6`, 49 ahead / 0 behind recorded `origin/main`. `git fsck --full` exited 0 with seven dangling blobs and no corruption. The original repository is `C:/Projects/stay-focused-v2`; the similarly named directory under Documents is a different incomplete repository and was not modified.

Pre-existing tracked changes were the two Canvas workflow test files, `apps/mobile/expo-env.d.ts`, mobile auth/session and processing/cache/outbox persistence files, the three current-status documents and root `package.json`. Untracked mobile persistence tests/helper, design/reference directories, B25.2/B8/pre-UI acceptance artifacts and `supabase/` were preserved. A SHA-256 inventory verified all 126 pre-existing changed/untracked files remained byte-identical before implementation commit. The original generated Expo declaration was restored after build.

Starting production was `dpl_3UxRUwZDy5iGgkX1j8HnLpJBqpnD`, commit `bd5eb15`, READY. The canonical alias was healthy. The Vercel connector returned 404 for this account; the already authenticated CLI verified the correct existing project without changing accounts or project settings.

## Architecture audit and B25.3.1 failure

The pre-edit call-path audit is in [architecture-audit.md](architecture-audit.md). Admission resolves source ownership, persists an idempotent job, dispatches the existing Workflow, and calls `processQuizJob` inside the Quiz processing step. Source assembly creates exact regions; `makeQuizPlan` splits and samples support, reserves unused support and allocates stable slots. The previous generator authored one question per slot, applied deterministic and independent semantic gates, and repaired through four phases. Only accepted questions reached the completion RPC.

B25.3.1 accepted q4 and exhausted q1/q2/q3/q5. Its retained symbolic trace repeatedly showed academic-value/answer-restatement/wording-recognition failures, with option/grounding instability and difficulty mismatch. Historical rejected wording was not retained and is not reconstructed. Correct feedback could not select a valid alternative that the single-candidate architecture had never generated.

## Candidate-convergence architecture

- Source-derived cue detection admits conceptual recall, comparison, cause/effect, relationship, sequence, classification and conditional application. Definition-only evidence cannot authorize application/comparison or unsupported medium reasoning. Existing hard-reasoning bounds remain. Cues are planning affordances, not semantic proof; every generated question still requires exact quotes and skeptical independent validation.
- Each pending slot receives up to two deterministic blueprints, each bound to its actual support, evidence owner, hashed source-concept identifier, affordance, difficulty, intent and prohibited patterns. Source-concept IDs in diagnostics are hashes, not source excerpts. Planning rejects duplicate intent and balances archetypes against other planned/accepted blueprints. Existing evenly sampled support selection and question/set duplicate gates remain.
- Authoring requests two alternatives in one call per pending slot, one for each available blueprint, in stable order. Pools are capped at two; no third candidate is accepted. If only one genuinely compatible new blueprint remains, only that bounded alternative is eligible. Internal alternative audit IDs are mapped back to the original stable slot ID before acceptance.
- Every structurally valid alternative receives the existing independent verifier, with proposed keys and requested difficulty withheld. All prior semantic checks remain mandatory; the additional `blueprintFollowed` check rejects surface rewrites and unsupported intent. Exact source quotes, answer equality, complete option support/refutation, academic value and secrecy gates remain strict. Alternatives for one slot are not incorrectly treated as multiple persisted questions.
- Selection requires all gates to pass. Exact grounding and academic-value results are boolean hard requirements, so surviving candidates tie on those dimensions. Selection then favors requested reasoning compatibility and concept diversity, with original candidate order as the final tie-break. There is no provider selector call. Candidate/set conflicts are checked against immutable accepted questions and the selected winners.
- The four phases remain initial pool, direct correction with structured findings, new same-support intent, and final replan using unused compatible support where available. Failed intents are excluded from later reauthoring. Lack of reserve support for one slot no longer prevents other pending slots using their available reserve; a remaining novel compatible same-support intent can use the final bounded phase. Exhaustion remains truthful.
- Maximum four author-adapter calls and four verifier-adapter calls per unresolved slot; at most eight candidates per slot. Calls batch pending slots. The unchanged OpenAI adapter allows one HTTP transport retry per call, so the transport upper bound is twice the adapter count. A pool with no eligible blueprint does not consume an author call.
- v4 checkpoints atomically store accepted questions, active allocation, next phase, per-slot call counters, symbolic findings and blueprint history. The phase budget is reserved before the network call, so Workflow resume cannot reset it. Full rejected questions, keys, option analyses and verifier reasoning remain ephemeral. Student DTOs and persistence paths receive only the exact complete accepted set. v3 checkpoints cannot mix with v4 state.

## Files changed

All implementation files are under `apps/api/src/lib/quiz/`: `blueprints.ts`, `convergence.test.ts`, `generation.ts`, `generation.test.ts`, `generation.live.test.ts`, `fixtures.ts`, `service.ts`, `durable.test.ts`.

## Deterministic validation

| Area | Result | Count / evidence |
|---|---|---|
| Baseline focused generation/durable | FRESH PASS | 106 |
| Baseline full Quiz | FRESH PASS | 157 passed, 3 opt-in skipped |
| Final focused generation/convergence/durable | FRESH PASS | 117 |
| Final full Quiz | FRESH PASS | 168 passed, 3 opt-in skipped |
| First candidate rejected, second valid | FRESH PASS | Five winners from second alternatives in one author + one verifier call |
| Both alternatives valid | FRESH PASS | Three identical deterministic runs; no selector call |
| All candidates fail | FRESH PASS | Cumulative findings; bounded exhaustion; no partial returned set |
| New semantic intent | FRESH PASS | Initial/direct pools fail, disjoint same-support blueprint intents converge in phase three |
| Evidence compatibility/diversity | FRESH PASS | Definition-only rejects application/comparison; five distinct source-concept/support IDs and at least four archetypes |
| Accepted immutability | FRESH PASS | q4 byte-identical; absent from pending/audit candidates; no keys in accepted author context |
| Durable resume | FRESH PASS | Repeated interrupted executions consume at most four author calls; completed resume restores active allocation without provider work |
| Exact count/security/scoring/persistence | FRESH PASS | Existing Quiz directory SQL and service tests retained |

No passing test was deleted. Historical malformed/coarse-plan expectations were updated where the planner now rejects duplicate intent before candidate verification or permits a genuinely new final same-support intent. The duplicate-evidence validator still has an explicit assertion on the historical coarse fixture. Mocked acceptance providers remain contract evidence, not proof of real academic quality.

## Live-provider validation

One of at most two permitted attempts was used. Model: unchanged `gpt-5.4-2026-03-05`. Result: FRESH PASS, 5/5, 63.331 seconds. Two author calls plus two verifier calls; 14 candidates total, 10 initial and four direct-repair candidates. Three slots accepted initially (q1/q3/q5); q2/q4 accepted after direct repair. No later blueprint/support transition was needed. No second live attempt was submitted.

The initial pool used comparison (q1), relationship (q2), conceptual recall (q3), cause/effect (q4), and sequence (q5). Initial rejected alternatives included academic value, blueprint compatibility, distractor/option support, distinctness and difficulty findings. All five selected candidates satisfied the unchanged strict gates. Only symbolic diagnostic/boolean summaries were retained outside the repository.

Compared with B25.3.1's failed 115.93-second attempt and passing 35.78-second final attempt, this run succeeded on the first permitted attempt but was slower than the previous passing sample. It used one repair phase, two author calls, and no terminal failure. Deterministic tests establish the useful new ability to choose a passing second alternative without repair; this single live sample does not establish a production reliability rate or general latency improvement.

## Regression

| Suite | Result | Count / notes |
|---|---|---|
| API, including Reviewer/Activity/Quiz/owner isolation | FRESH PASS | 944 passed, 4 opt-in skipped |
| Mobile including preserved dirty persistence tests | FRESH PASS | 481 |
| Canvas | FRESH PASS | 73 |
| Engine | FRESH PASS | 606 |
| OCR | FRESH PASS | 27 |
| Shared | FRESH PASS | 44 runner cases; 22 distinct source tests plus generated counterparts |
| Workflow runtime | FRESH PASS | 1 |
| Provider contract | FRESH PASS | 18 |
| Root typecheck | FRESH PASS | 7/7, zero cached |
| Root lint | FRESH PASS | 7/7, zero cached |
| Root build | FRESH PASS | 7/7, zero cached; 23 Workflow steps, two workflows |
| Diff hygiene | FRESH PASS | Scoped implementation diff clean |

Environment failures were investigated: initial worktree test invocation used an incorrect cwd; linked dependencies required an API dependency junction; sandbox ancestor-directory restrictions affected Workflow/ESLint; Metro could not resolve Expo Router through the temporary worktree's dependency links. Final gates ran successfully in the original repository's native dependency layout. Lint's actual `prefer-const` issue was fixed. Clean-tree mobile count was 449; the preserved main working tree adds 32 existing tests and passes 481. These count differences are not deleted tests.

## Production deployment

Commit `79e54ddc8b892b4872f60ce7a336de968918a496` was deployed from a fresh clean detached worktree to the existing `stay-focused-v2-prototype` project. Deployment `dpl_peVBgRctKVmGTfkNfQqTev74QCda` is READY. Canonical alias `https://stay-focused-v2-prototype.vercel.app` resolves to it. Health: `{"status":"ok","version":"2.0.0"}`. The remote build retained both durable workflows and their 23 steps. No migration, model change, project-setting change or push occurred.

## Real-material production Quiz

Exactly one authenticated five-question mixed Quiz was submitted through the existing physical app session against the same ready source as B25.3.1. Job `d038e85b-ae03-4853-aa2a-f663037415b0`; Workflow `wrun_01M2J4TSMPMWB6SPQXW8F0CTH0`; created 2026-09-15T09:02:10.124003Z. Result: **FAILED, 4/5 accepted (q1/q2/q4/q5), q3 pending**. Terminal diagnostic: `repair_exhausted`, finding `bounded_repair_attempts_exhausted`, public code `quiz_generation_failed`. Owner-scoped storage inspection found zero Quiz rows for this generation. No production retry was submitted.

| Slot | Support / blueprint | Candidates | Author / verifier calls | Result |
|---|---|---:|---:|---|
| q1 | unit-1, conceptual_recall | 2 | 1 / 1 | Initial second alternative accepted; first failed academicValue/blueprintFollowed |
| q2 | unit-17, conceptual_recall | 2 | 1 / 1 | Initial first alternative selected |
| q3 | unit-31 then alternate unit-2, conceptual_recall | 6 | 3 / 3 | Initial/direct/alternate pools failed; phase three skipped because no novel compatible blueprint remained |
| q4 | unit-47, conceptual_recall | 2 | 1 / 1 | Initial second alternative accepted; first failed academicValue/blueprintFollowed |
| q5 | unit-73, relationship then conceptual_recall | 6 | 3 / 3 | Initial/direct failed; first alternative from new phase-three intent accepted |

Support IDs share the existing material and assembled-region prefix; suffixes above avoid repeating private identifiers. There were 18 candidates: 10 initial, four direct, two same-support reauthor, two alternate-support. Four author batches and four verifier batches were consumed; per-slot counters above are not separate network requests. No provider selector call. Runtime diagnostics expose all four pools and terminal failure, but do not provide an isolated provider-duration measurement. No transport-retry count is inferred from adapter counters.

q3 initial findings were `wording_only_recognition`, `academicValue`, `blueprintFollowed`; direct correction added `distractorsWrong`, `option_analysis_invalid`, `plausibleOptions`, `answer_key_mismatch`. Phase three reported `compatible_blueprint_unavailable`. Alternate support existed and was used; final candidates repeated wording-recognition/academic-value failures and option/key defects. Direct correction deliberately reused initial intent. Later failed-intent exclusions prevented another same-support recall cycle, but changing support and concept hash did not prevent the same weak question archetype recurring. Exact rejected wording remains unavailable and was not retained.

q5 initial/direct findings included `distractorsWrong`, `academicValue`, `blueprintFollowed`, `option_analysis_invalid`, `difficulty_mismatch`, `sourceSufficient`, `answer_key_mismatch`; switching from relationship to conceptual recall converged. q1/q2/q4 remained immutable throughout repairs.

The initial and final active allocations were all easy after source-compatible allocation of the mixed request. No unsupported difficulty was forced. This failed run does not establish successful mixed-set truthfulness: the exact-count failure occurs before final set acceptance. Initial selected supports had 300/142/53/63/60 characters; q3 alternate had 138. All inherited 23 source references from the assembled parent region. These metadata facts support investigating context loss and coarse evidence attribution; they do not prove that the entire original PDF lacks richer evidence.

Compared with B25.3.1, accepted slots increased from one to four, and two slots demonstrably benefited from selecting second alternatives without repair. Both production runs still failed, and both consumed all four phase positions. This is specific evidence that pooling helps, not a claim of reliable production convergence.

### Precise B25.3.3 recommendation

Preserve and select meaningful source context before further authoring changes. Replace isolated-line sampling with bounded context windows that retain a concept's definition, conditions, contrasts, examples and consequences together, each tied to exact original evidence owners. Score support for enough substantive evidence to construct a grounded stem plus refutable distractors; a 53-character fragment should not receive repeated pools merely because it is nonempty. Select alternate support for different supported understanding, rather than the next unused eligible unit alone.

Plan the complete five-slot concept/archetype/difficulty allocation before accepting immutable winners. Check mixed feasibility across the selected evidence and reserve pool, and retain truthful reallocation or explicit insufficient-evidence failure under the existing contract. Carry failure-pattern exclusions across alternate concept hashes so a support switch cannot masquerade as substantive intent diversity. Add a sanitized lecture fixture reproducing short fragments/coarse owner references, prove context assembly and complete-set feasibility deterministically, and serialize nested pool diagnostics as JSON so production logs preserve blueprint/result fields instead of `[Object]`. Keep the same strict gates, exact count, pinned model and bounded call budget. This is a recommendation only; B25.3.3 and B26 were not started.

## Quiz attempt/results and physical device

The authorized realme RMX3151 (Android 13) was unlocked and its existing authenticated app session used to select the original ready material and submit exactly one Quiz. The Generation screen rendered its orb and later displayed "This generation couldn't finish" with the public Quiz failure message. View Queue opened and refreshed. Orb motion was not measured in this task, and the failed job's Queue row was not separately inspected. No success-path device acceptance is claimed. Temporary screenshot and navigation XML were deleted; the task Metro helper and ADB forwarding were stopped.

Because 5/5 generation did not complete and no Quiz persisted, Library Quiz open, production pre-attempt secrecy inspection, answering, submit, expected/actual score, result persistence and result reopen were not performed and remain unaccepted. Automated secrecy/scoring/owner-isolation gates passed; they do not substitute for physical production acceptance.

## Security and quality invariants

Grounding, academic value, answer validation, distractor support/refutation, duplicates, truthful difficulty, answer-key secrecy, exact count, authoritative scoring and owner isolation remain intact under fresh automated regression. No validator was weakened, no incomplete set can persist, accepted questions remain immutable, and rejected content is not added to durable logs or checkpoints. Physical pre-attempt secrecy and production result persistence remain unaccepted because the one real-material generation failed.

## Final status

PARTIAL — Quiz semantic convergence remains incomplete

B26 may not begin. The implementation, live fixture and regression gates pass, but the single production attempt failed at 4/5. No retry was submitted.

## Closure

Implementation commit `79e54dd`; a separate documentation commit records this failed acceptance. No push. Both task-created temporary worktrees and temporary device navigation evidence were removed. All 126 pre-existing changed/untracked files passed the final hash comparison (the three status documents were compared after excluding only this task's inserted section). Existing unrelated changes remain outside the commits. Staged and unstaged `git diff --check` passed. `git fsck --full` exited 0 with 14 dangling blobs and no corruption; the extra unreachable blobs include superseded draft-document staging objects. The branch will be 51 ahead / 0 behind recorded origin/main after this separate documentation commit.
