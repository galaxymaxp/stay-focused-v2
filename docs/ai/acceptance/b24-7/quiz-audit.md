# B24.7 Quiz audit

Starting V2: `main`, `9033781040705829db717e05e7acc2a95f98a0f5`.
V1 was inspected read-only at `_reference/stay-focused-v1`, commit
`d26decf3f82d61f2e8dd6ba2444c6c156473163a`. No V1 files changed.

Repository-wide searches covered quiz, quiz maker, questions, multiple choice,
true false, attempts, scores, weak areas/topics, assessment, answer key,
distractor, study quiz, practice test and quiz result across apps, packages,
migrations, tests and docs. Canvas `quiz_id` is a Canvas assignment relationship,
not a student-generated Quiz or an attempt engine.

| Capability | V1 | V2 before B24.7 | Decision | Notes |
|---|---|---|---|---|
| Source-grounded question authoring | `lib/deep-learn-quiz.ts` derives MCQ, identification, formula and short-answer items from saved study packs | ABSENT | PRESERVE + IMPROVE | Preserve source fidelity and academic filtering; author against prepared underlying materials, independently verify keys. |
| Academic/noise filtering | Administrative metadata filter; limited answer-bank/identification/formula counts | Reviewer structure and selective block preparation | REUSE | Prepared block text, source headings and exact material selection. Remove repeated/noise regions. |
| Question deduplication | Normalized prompt-plus-answer string | No Quiz set validator | PRESERVE + IMPROVE | Normalized prompt/concept checks and independent semantic/set verification. |
| Answer-key isolation | `ModuleQuickQuiz.tsx` receives answer/explanation in client props | No Quiz unanswered DTO | REPLACE | Explicit public projection and separate service-only key table. |
| Attempt feedback | Local quick-quiz interaction, reveal/check and restart | ABSENT | REPLACE | Owner-scoped Postgres attempt history, draft answers, finalization lock, immediate feedback. |
| Persistent study output | `actions/study-outputs.ts`, Library routes and `study_outputs` | Reviewer/Activity Library, Quiz category placeholder | REUSE | Add persisted Quiz artifact reader, no generation on reopen. |
| Weak areas | No suitable durable owner-scoped topic-result engine found | ABSENT | REPLACE | Deterministic actual-answer aggregation and source/Reviewer targets. |
| Source provenance | Study-pack snippets and exact-source wording | Canvas prepared blocks, page/slide metadata, Reviewer source snapshots | REUSE | Reviewer relationship resolves original materials; generated prose never establishes correctness. |
| Provider | Older Deep Learn generation code | Strict Structured Outputs through server provider adapter | REUSE | Existing OpenAI adapter, same configured server path; no direct client. |
| Durable work | V1 queued study work | Processing jobs, leases, checkpoints, Vercel Workflow | REUSE | Add one job type and one workflow branch; no second queue. |
| UI | `ModuleQuickQuiz`, `ModuleQuizWorkspace`, `MakeQuizPackButton` | Existing mobile screens | DEFER | No Quiz UI, navigation, animations or visual redesign in this phase. |
| Free response/matching/ordering | Some V1 short-answer behavior | No safe grading contract | DEFER | This phase scores only single-select, multi-select and true/false. |

Useful V1 precedents include source snippets in explanations, formula reuse,
minimum-five-question readiness and avoiding administrative metadata. V1's
generated study prose and browser-delivered keys were not copied as security or
correctness foundations.
