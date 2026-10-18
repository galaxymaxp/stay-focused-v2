# MD1 material descriptions - STOPPED at preflight

Date: 2026-10-18. Scope: `tmp/overnight/prompts/MD1.md`, including its
overriding UNATTENDED rules. Both referenced external roadmaps were read in
full. No later roadmap item was started.

## Baseline

Branch: `overnight/2026-10-15_feedback`; HEAD: `665c156`.
Locally recorded `github/main`: behind 0 / ahead 55; no fetch was performed.
Git identity at HEAD: `galaxymaxp <omgraythekid@gmail.com>`.
Remotes: `github` (GitHub repository), `origin` (local repository).
Remote-ref freshness is **UNVERIFIED (owner to confirm)**.

`git log --oneline -8`:

```text
665c156 docs: close WD1
3817695 feat(mobile): draft editor instructions section
30a009e feat(web): draft aside shows activity instructions
8aa10db feat(api): expose assignment points in activity detail
fe660af docs: close WL1
ea9ffa9 feat(web): library sort menu button
341cf62 docs: close GN1 (GN1b)
29bbe1d feat(mobile): open generation progress after grace period
```

Initial dirty tree: only untracked `UI/`, `apps/mobile/.gitignore` and
`supabase/.temp/`. These are unrelated and preserved. No environment file
was opened or changed. Runtime implementation and existing migrations are
unchanged by this run.

## STOP finding and exact owner question

STEP 0 says **"verify (STOP on any surprise)"**. UNATTENDED rule 4 requires
recording a STOP, committing completed safe work and ending without asking
the unattended owner a question.

The required three `extractPreparedFigures` call sites do not exist in
`canvas-preparation/worker.ts`. There are exactly **two**, at lines 92 and
119: prepared terminal redelivery and successful completion. Both are
best-effort, post-commit calls with safe warnings. A repository-wide search
found no third production caller of that function. Local processing uses a
different function, `extractLocalPreparedFigures`, and a different job model.
This contradicts STEP 0.2's explicit confirmation requirement.

There is also a product-flow ambiguity for manual uploads. MR2 deliberately
starts `reviewer_generation` immediately after file selection/upload;
extraction runs inside that already accepted reviewer job. Web
`own-material.tsx:46` accepts the reviewer job and navigates to generation;
mobile `ReviewerGenerateScreen.tsx:56` calls `createManualReviewerJob` and
navigates to generation. The existing manual attachment hook can cache a
description after extraction, but cannot show it in a selectable material
detail pane **before** the first reviewer generation. This is more than
finding a separate extraction hook: the pre-generation manual detail flow
described by the goal is absent. ADR-037 explicitly records immediate
generation without the intermediate editor.

**Exact owner question (recorded, not sent):** May MD1 target the two actual
Canvas post-commit hook sites plus the separate manual source attachment
path, preserve MR2's immediate manual reviewer generation, and limit
pre-generation detail-pane display to Canvas materials; or should manual
uploads gain a separate preparation/detail/Generate flow first?

No code work continued past this preflight finding. STEP 0 is partial;
implementation steps 1-6 are **NOT RUN**. MD1 is not complete.

## Source findings retained for resumption

| Check | Local evidence / result |
| --- | --- |
| Prepared result identity | `canvas_material_preparation_results(id, job_id, payload)`; job `result_id` points to it. The owner lives on `canvas_material_preparations.user_id`; the unique revision key is `(user_id, course_id, material_id, revision_fingerprint)`. |
| Revision validation | `repository.ts:28` reads only prepared jobs with a result, checks current evidence and the component revision fingerprint, then file `originalSha256` and byte size. Stable source evidence exists. |
| Existing results access | `20261014000000_canvas_material_preparation.sql` gives results/evidence service-role access only; no authenticated SELECT grant. Historical results remain immutable. Do not grant access to source payloads when adding safe description reads. Storage choice/ADR deferred. |
| Figure extraction | `source-figures/store.ts:69` reads and parses the persisted result, uses bounded material/operation budgets, and reports safe warnings. The two worker hooks follow durable preparation completion. |
| Manual uploads | `upload-intents.ts` stages upload metadata, not extraction. `manual-reviewer-source.ts` extracts Office content or reuses checkpointed PDF/image operations. `attach_manual_reviewer_source_v1` persists exact text/blocks and a source version under the running job's lease. No Canvas preparation job/result is created. |
| Models | `TASK_ESTIMATE_DEFAULT_MODEL`, `STUDY_TOOLS_DEFAULT_MODEL` and `AI_FIRST_QUIZ_MODEL` are all `gpt-5.4-2026-03-05`: a tie among the inspected configured defaults, not a live pricing comparison. Runtime overrides were not inspected. |
| Provider path | `generateStudyTool` uses the existing injected `GenerationProvider.generate`, with model, instructions, prompt, JSON schema, maxOutputTokens and `reasoningEffort: 'low'`. No new SDK/provider is needed. |
| Runaway guard | ADR-026 and `20261014000100_canvas_preparation_orchestration.sql` enforce a 200-job sync/poll cycle and batches of 25 with repeat/no-progress suppression. A description hook must not admit another preparation cycle or bypass suppression. |
| Quotas (partial inspection) | Study tools have a 20-request/60-second warm-instance burst guard, explicitly not a durable quota. ADR-037 and the manual-upload migration preserve extraction/generation daily and page admission quotas. A complete description quota design was not made after the STOP. |
| Read model | `LearningMaterial` is built from `CanvasReviewerSourceDescriptor` by `learningMaterial`; `ExperienceService.courseMaterialsForOwnedCourse` maps a page of Canvas descriptors. It does not list manual upload source versions. Description field/batched lookup are not implemented. |
| UI | Mobile detail has the Reviewer surface at `GenerateScreen.tsx:499-503`; web has Generate/Remake at `generate.tsx:680`. Neither was changed. |
| Migration paths | `supabase/migrations/` contains only tracked `20261016010000_course_reviewer_batch_requests.sql`. Preparation and manual-upload migrations are in `packages/db/migrations/`, not the directory assumed by STEP 0.2-3. |
| Latest migration | Latest in `supabase/migrations/`: `20261016010000_course_reviewer_batch_requests.sql`; latest across both tracked directories: `packages/db/migrations/20261018000100_failed_generation_retry.sql`. Any new migration must sort after the latter. No migration file was written or applied. |

## Acceptance and gates

| Requirement | Result |
| --- | --- |
| Full prompt and both source roadmaps read | FRESH PASS |
| Baseline inspected, unrelated work preserved | FRESH PASS |
| Required preflight assumptions confirmed | STOPPED: two hooks instead of three; manual pre-generation display needs scope clarification |
| Migration, description generation/cache, guard/quota behavior | NOT RUN: preflight STOP |
| Batched read, mobile/web description rendering | NOT RUN: preflight STOP |
| API/shared/web/mobile tests | NOT RUN: preflight STOP; 0 tests run |
| Forced root typecheck and lint | NOT RUN: preflight STOP |
| API build, web build, mobile Android export | NOT RUN: preflight STOP |
| `git diff --check` and staged diff hygiene | FRESH PASS: documentation-only checkpoint, zero whitespace errors |

Prompt gate commands: **1/10 run and passed** (diff hygiene); **9/10 NOT
RUN** because the preflight STOP occurs before implementation and gates.
First diff-hygiene attempt failed on one new blank line at EOF in the sprint
checkpoint; removed before the passing retry. No test failures or flakes
occurred because no tests were run. Read-only
search attempts using Windows wildcard paths returned path errors; subsequent
exact-path reads/repository-wide searches established the findings above.
Truncated combined reads were followed by separate full reads of the prompt,
worker, repository, upload code and both external roadmaps.

## Owner steps remaining

- Resolve the recorded preflight question and reauthorize a corrected MD1
  scope; implement steps 1-6 and run all fresh gates before marking MD1 done.
- **Rollout - NOT RUN, skipped entirely:** after implementation, apply the
  new migration, optionally set `MATERIAL_DESCRIPTION_MODEL`, deploy API /
  Google worker / web and publish mobile OTA/APK. No new migration exists
  from this stopped run. Existing prepared materials would need re-preparation
  or a separately approved backfill to acquire descriptions; no backfill was
  written or run.
- **Device checks - NOT RUN, skipped entirely:** phone and browser prepared
  PDF/PPTX/Canvas-page descriptions above Generate; absent description adds
  nothing and Generate remains usable. Clarify manual behavior first.
- Production revisions, database rows/applied migrations, Scheduler state,
  remote-ref freshness and physical/browser behavior are **UNVERIFIED (owner
  to confirm)**. No remote service call, deployment, SQL, Scheduler operation,
  email, environment-file edit or push was performed.
- Future only: cross-student reuse for identical file bytes; retain owner
  isolation in the current implementation.

The checkpoint commit is reported in `tmp/overnight/MD1.status` and Git;
`tmp/` is never committed. No ADR/storage decision was adopted at this STOP.
