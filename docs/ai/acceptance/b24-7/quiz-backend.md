# B24.7 Quiz backend

Quiz generation is authenticated and owner-scoped. The request accepts
`sourceType: material | reviewer`, `sourceIds`, optional `reviewerId`, an integer
question count from 5 through 20, `easy | medium | hard | mixed`, and an optional
nonempty unique subset of `single_select | multi_select | true_false`.
Unknown fields are rejected, including client user/course/provider/model.
Generation JSON is capped at 4096 bytes; answer JSON at 2048 bytes.

## Sources and execution

Material IDs refer to owned Canvas files, pages, assignments or announcements.
Up to four explicitly selected materials must belong to the same course and
connection. Files reuse B24.6 preparation; each selected material uses existing
Canvas structured extraction. Combined source text is capped at 120,000
characters. Empty, unsupported or insufficient content fails safely.

A saved Reviewer ID resolves its owned source snapshot and original material
relationships. A missing or edited snapshot, missing material, foreign source or
unrelated Reviewer/material pairing is rejected. Current prepared material is
the correctness authority. Reviewer prose is used only to find exact, unique
matching section titles for navigation. Unmatched sections yield source-only
navigation; no invented Reviewer section is emitted.

`POST /api/experience/quizzes` requires an `Idempotency-Key`, derives owner and
course, persists a `quiz_generation` job using existing queue quotas, and invokes
the existing dispatch adapter. HTTP 202 is the background-safe boundary.
Generation uses existing server `createServerOpenAIProvider()` and strict
Structured Outputs with Quiz-only pinned `gpt-5.4-2026-03-05`. Existing Reviewer/Activity
model defaults and the provider adapter are unchanged. The pinned model supports
the existing Responses/Structured Outputs contract ([official model reference](https://developers.openai.com/api/docs/models/gpt-5.4)). The existing worker and Vercel Workflow both
handle the new type. Private `quiz:plan:v1` and `quiz:accepted:v1` checkpoints
preserve source text and verified candidates across interruptions. Validation
maps to the product `generating` state; saving maps to `finalizing`. Existing
queued/preparing/completed/failed/cancellation states and no-fake-percent behavior
are retained.

Provider authoring has an initial pass and at most two targeted repair passes.
Deterministic failures stop automatic retries. Transient provider/storage errors
use existing recovery. The completion RPC locks the job and requires the live
lease, matching worker, running status, source/course/Reviewer identity and exact
question count. Cancelled/cancelling/expired-lease work publishes nothing.

## Persistence and access

Forward-only `20260912110000_quiz_maker.sql` follows
`20260912100000_activity_maker.sql`. Neither migration is applied to hosted
Supabase by this task. Tests execute the actual migration in local PGlite
Postgres. Supabase CLI was unavailable in the task environment, so the new file
uses the repository's established timestamp/name convention.

- `quizzes`: immutable learner question JSON, owner/course/material/Reviewer
  relationships, generation reference and timestamps.
- `quiz_keys`: service-only answer keys, exact evidence, verified source plan,
  source hash and policy/provider provenance. No anon/authenticated grants or
  client RLS policy, including for the Quiz owner.
- `quiz_attempts`: durable owner/Quiz relationship, idempotent start key,
  selected answers/finalization timestamps, status and completion score.

All tables enable RLS. Quiz and attempt rows grant owner-only SELECT to
authenticated clients; direct client writes are revoked. The mutating RPCs are
service-role-only, use a fixed empty search path and explicit owner predicates.
The API obtains the owner solely from verified JWT identity. Composite Quiz/key
and Quiz/attempt FKs, source-owner trigger checks, indexes and cascades enforce
relationships. Auth-account/course deletion removes Quiz and dependent data;
Reviewer deletion clears its optional relationship. Routine generation retention
clears `generation_id` while retaining saved Quiz, private provenance and attempts.

The SQL completion RPC explicitly reconstructs every learner question and option
using an allow-list. Processing results contain only `{quizId}`. No question key
or evidence is copied into generic job results or Library summaries.

This grant/RLS separation follows the [Supabase RLS documentation](https://supabase.com/docs/guides/database/postgres/row-level-security).

## Routes

All routes below require verified bearer JWTs and use private/no-store responses.
Paths share `/api/experience`.

| Route | Method | Purpose |
|---|---|---|
| `/quizzes` | POST | Admit durable generation; idempotency key required |
| `/generations/:id` | GET | Product generation state and saved artifact target |
| `/quizzes/:id` | GET | Load persisted learner-safe questions and summary |
| `/quizzes/:id/attempts` | POST | Start/reconnect an attempt by idempotency key |
| `/quizzes/:id/attempts` | GET | Attempt history, dates and completed scores |
| `/quiz-attempts/:id` | GET | Resume selected answers and finalized-only feedback |
| `/quiz-attempts/:id/answers/:questionId` | PATCH | Save selection or finalize with immediate feedback |
| `/quiz-attempts/:id/complete` | POST | Complete only after every question is finalized |
| `/quiz-attempts/:id/abandon` | POST | Preserve incomplete history without scoring it |
| `/quiz-attempts/:id/result` | GET | Completed deterministic results and weak areas |
| `/library?type=quiz` | GET | Saved Quiz summaries with attempt counts/scores |
| `/library/quiz:<uuid>` | GET | Open `quiz:<uuid>` artifact without generation |

Answer body: `{selectedOptionIds: string[], finalize: boolean}`. Draft selections
may change. A finalized answer cannot change, including after a retry or a
different concurrent request. If a finalization response is lost, resume the
attempt to retrieve its persisted feedback. Completing an already completed
attempt is idempotent. A new start key creates a new history row.

## Scoring and weak areas

Every question is one point. Correctness requires an exact set match, including
multi-select; partial selections, extra selections and selecting all choices
receive zero credit. No LLM participates in scoring. Percentage is rounded to
two decimals. SQL completion score and API result calculation are cross-tested.

Results require all questions finalized. They include correct/incorrect counts,
total, percentage, each question's feedback and topic performance. For a topic
with at least two questions, accuracy below 60% produces `weak_area`. One missed
question in a one-question topic produces `missed_topic`. Exactly 60% is not
weak. Perfect, draft and abandoned attempts produce no invented weakness report.
Source IDs/regions/pages/slides and verified Reviewer section IDs accompany
feedback. A whole-source topic with one miss and 80% accuracy is not called weak.

Library summaries contain course/source relationships, Reviewer ID, count,
difficulty, creation/update timestamps, attempt count, latest completed score
and best score. The details/history endpoints expose dates. No trend or
motivation metric is inferred from a single attempt.

## Shared contracts and capabilities

`Quiz`, `QuizSummary`, `QuizQuestion`, `QuizQuestionOption`,
`QuizGenerationRequest`, `QuizGenerationState`, `QuizAttempt`,
`QuizAttemptAnswer`, `QuizResult`, `QuizQuestionResult`, `QuizWeakArea`,
`QuizSourceReference`, `QuizTopicPerformance`, `QuizDifficulty` and
`QuizQuestionType` live in shared contracts. The old placeholder summary is
replaced; Library gains optional Quiz summary metadata and processing job types
gain `quiz_generation`. Authoring/evidence/verifier types remain server-only.

Reviewer, Activity Maker and Quiz are available in the new code. Material-level
Quiz capability follows owner-scoped material reads and readiness; empty,
unsupported and unprepared materials expose safe unavailable reasons. Source
assembly/quality gates make the final usability decision. This code requires
pending migrations and deployment before these capabilities are live.
