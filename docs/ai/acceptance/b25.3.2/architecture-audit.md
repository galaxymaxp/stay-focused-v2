# B25.3.2 pre-edit architecture audit

Starting implementation: `adee0b6`, main, 49 ahead / 0 behind recorded origin/main.
Original dirty work remains in C:/Projects/stay-focused-v2. Implementation uses an isolated worktree.

Actual call path, inspected before implementation:

1. `quiz/service.ts:startQuizGeneration` resolves owned sources, admits the idempotent RPC job and dispatches the existing durable workflow.
2. The processing workflow invokes the claimed-job processor, which calls `processQuizJob`. `quiz/sources.ts` assembles exact prepared source/Reviewer regions after ownership checks.
3. `generation.ts:makeQuizPlan` splits regions into exact support units, deduplicates source text, samples coverage, reserves unused units and assigns stable slots (id, topicId, type, difficulty). `supportAffordsDifficulty` bounds requested reasoning using source cues.
4. `generateQuiz` builds an author prompt containing pending allocation, assigned source, safe accepted context and cumulative structured repair feedback. The pinned provider returns one candidate per slot.
5. `validateCandidate` checks shape, type, difficulty label, options/key cardinality, exact quote grounding and deterministic academic/leakage gates. `conflictingQuestionFindings` checks duplicate evidence/concepts/questions and cross-question leakage.
6. A separate provider verifier receives learner prompts/options/evidence and explanations, with proposed keys withheld. Every semantic boolean, option entailment/refutation, independently solved key and difficulty is checked. Mixed-set concentration repair changes active allocation.
7. Accepted questions are frozen. Four phases are initial, direct correction, full same-support reauthor, alternate unused compatible support. Exhaustion fails the exact-count contract.
8. Service checkpoints `quiz:plan:v3` and `quiz:accepted:v3` store source plan and accepted questions. Rejected wording/keys and feedback stay in process memory. Phase/call budget is currently reset when generation resumes; updated allocation is not checkpointed atomically with accepted questions.
9. Service rechecks source ownership, returns the complete payload to the existing completion RPC, which persists before success. Learner DTO mapping strips keys/explanations/provenance. Attempts and scoring remain server-authoritative.

The B25.3.1 trace establishes repeated semantic failure codes for q1/q2/q3/q5, not recoverable literal candidate text. No historical wording is inferred. The implementation has no evidence-intent blueprint, candidate pool or selection stage, so a valid alternative cannot be selected within a phase.
