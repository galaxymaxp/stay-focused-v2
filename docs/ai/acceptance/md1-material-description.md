# MD1 material descriptions - PASS locally via MD1b

MD1b supersedes the historical STOP below. Finite scope: STEP 0, steps 1-6,
local tests/gates, documentation and local commits. Rollout and Device checks
are skipped entirely. The full MD1b prompt and both external roadmaps were
read; its owner answers resolve the prior hook-count/manual-flow questions.

## MD1b baseline and preflight (2026-10-18)

Baseline HEAD `b7ff2d2`, branch `overnight/2026-10-15_feedback`; no switch.
Locally recorded `github/main`: behind 0 / ahead 60. Remotes `github`
(GitHub), `origin` (local path). No fetch; remote-ref freshness is
**UNVERIFIED (owner to confirm)**. Author retained as
`galaxymaxp <omgraythekid@gmail.com>`. Untracked `UI/`,
`apps/mobile/.gitignore`, `supabase/.temp/` are unrelated and preserved.

```text
b7ff2d2 docs: close QZ1
0880274 feat(web): question jump dialog
8df68cc feat(mobile): tap question number to jump
3eb0be0 feat(shared): quiz question states helper
8bf6b2d docs: checkpoint MD1 preflight stop
665c156 docs: close WD1
3817695 feat(mobile): draft editor instructions section
30a009e feat(web): draft aside shows activity instructions
```

The prior MD1 progress, Git history/status, acceptance and handoff were read;
committed work was reused. No description implementation existed at baseline.
Current planning files, AUTOPILOT and ADRs 005/026/037 were inspected.

| STEP 0 check | FRESH local finding |
| --- | --- |
| Canvas hooks | Exactly two in `worker.ts`: prepared terminal redelivery and successful completion, after persisted preparation. Owner explicitly accepts two. |
| Stable revision | `canvas_material_preparation_results.id` is the job's `result_id`; immutable payload belongs to `job_id`. Jobs uniquely key owner/course/material/revision_fingerprint. `readPreparedResult` checks current evidence, revision fingerprint, original SHA-256 and byte size. |
| Manual extraction | Upload intents stage metadata. `manual-reviewer-source.ts` attaches exact text/blocks and a source version under the accepted job's lease; PDF/image finalization shares attachment. No Canvas prepared-result row. Preserve MR2/ADR-037 immediate generation. |
| Provider | Task estimate, Study Tools and AI-first Quiz defaults all equal `gpt-5.4-2026-03-05`; configured cheapest is a tie, not a live-price comparison. Reuse typed `GenerationProvider.generate` and existing Responses schema adapter with low reasoning effort. No new SDK. Runtime overrides not inspected. |
| Guard and quota | Existing 200-per-sync cap, 25-per-batch repeat/no-progress guard remain. Description admission denies suppressed/tripped work. `processing_policy_config.max_daily_generation_jobs` supplies a separate bounded micro-action allowance and existing exhausted Reviewer/Quiz/Activity allowance also denies admission. No OCR or new processing job. |
| Read and UI | `LearningMaterial` mapper and material-page reads, mobile Generate Reviewer Surface and web detail actions confirmed. One batched owner/course/page lookup adds metadata; no N+1. |
| Manual display | The final surface audit confirmed original manual filenames in personal Library cards. Add cached descriptions beneath those existing labels on both clients, with one owner-scoped source-version lookup per Library page. No pre-generation flow. |
| Migration | Latest `supabase/migrations/` is `20261016010000_course_reviewer_batch_requests.sql`; latest across both directories is `20261018000100_failed_generation_retry.sql`. New file `packages/db/migrations/20261018000200_material_descriptions.sql` sorts after both. File only, never applied remotely. |

No code contradiction meets MD1b's two remaining STOP conditions. Production
revision, database rows/applied migrations and Scheduler state are
**UNVERIFIED (owner to confirm)**. No remote service, remote SQL, deployment,
Scheduler, email, environment-file edit or push is authorized/performed.

## MD1b acceptance matrix - PASS locally

| Requirement | Owning layer / proof | Current result |
| --- | --- | --- |
| Stable once-per-revision cache, owner-only reads/service writes | New SQL, strict DB types, PGlite execution/RLS/claim tests | FRESH PASS focused |
| Empty, bounded source-only prompt, plain text <=240, failure isolation | API description unit tests and actual provider adapter contract | FRESH PASS focused and provider contract |
| Guards, daily allowance, cancelled/stale source safety | Actual local PostgreSQL functions | FRESH PASS focused |
| Both post-prepared hooks; ack unaffected | Worker tests including terminal redelivery | FRESH PASS focused |
| Manual exact source attachment; generation does not await description | Manual chain regression with unresolved/rejected metadata promise | FRESH PASS focused |
| Owner-bound page lookup; missing/outage metadata -> null | Mapper/service/repository tests | FRESH PASS focused |
| Mobile/web optional description above Generate | Existing screen/component tests; Generate remains enabled | FRESH PASS focused |
| Manual descriptions beneath existing Library filenames | Owner-scoped version/hash batch read plus both existing card components | FRESH PASS focused; final gate rerun recorded below |
| Required fresh serial gates | Exact commands/counts below | FRESH PASS 10/10 |
| Docs and atomic local commits | ADR-046, three planning files, handoff, scoped staging | PASS; documentation closure commit follows |
| Rollout and Device checks | Owner only | NOT RUN, skipped entirely |

## MD1b final evidence and closure

**FRESH PASS: 10/10 prompt gate commands**, executed serially against the
final implementation:

| Command | FRESH result |
| --- | --- |
| `npm run typecheck -- --force` | 8/8 tasks, 0 cached |
| `npm run lint -- --force` | 8/8 tasks, 0 cached; 0 errors, 6 existing warnings |
| `npm run test --workspace @stay-focused/api -- --maxWorkers=2` | 2350 passed / 3 skipped, 204 files; live cases disabled process-locally |
| `npm run test --workspace @stay-focused/shared` | 476/476 passed, 46 files (existing compiled test copies included) |
| `npm run test --workspace @stay-focused/web` | 308/308 passed, 44 files |
| `npm run test --workspace @stay-focused/mobile` | 1410/1410 passed, 143 files |
| `npm run build --workspace @stay-focused/api` | 1/1 build, 35/35 static pages |
| `npm run build --workspace @stay-focused/web` | 1/1 build, 19/19 static pages |
| `npm run build --workspace @stay-focused/mobile -- --platform android` | 1/1 local export, 1 Android bundle; EXPO_OFFLINE=1 |
| `git diff --check` | PASS, 0 whitespace errors; staged check also PASS |

Additional AUTOPILOT `npm run build -- --force --env-mode=loose`:
**FRESH PASS, 8/8 tasks, 0 cached**, including Android/iOS/web exports.
Loose mode preserves process-local offline/no-telemetry flags in child builds.
Additional provider contract: **FRESH PASS 20/20, 0 failed (fake provider clients only)**. Workflow regression:
**NOT APPLICABLE: no Workflow runtime/step changes; no tracked workflow test sources exist; changed attachment hook covered by API/manual/worker regressions**. Neither calls a live provider.

Focused initial API checks: **114/114** (5 files); manual chain **9/9**;
mobile screens **92/92**; web material state **15/15**. Final description/SQL
edge cases: **26/26** (2 files), including original SHA/size changes, all three
generation quota types, RLS/RPC grants and cancellation.

The first full API run passed **2344 tests / 3 skipped** (204 files). Review
then expanded the generation-quota check, original-byte identity fence and
markdown handling; typecheck/lint/API gates were rerun fresh. A final surface
audit found manual filenames on existing personal Library cards, so the owner's
manual-display requirement was completed there with a batched source-version
lookup. All prompt gates and the root build were then rerun serially against
the complete implementation. Manual display focused checks: API **15/15**,
web Library **14/14**, mobile screens **94/94**. The first focused manual-display
mobile run had **93 passed / 1 failed** because its fixture omitted the personal
Library route; adding `courseKey: personal` fixed it. No nondeterministic
flakes; no assertions/timeouts/validation weakened. The first full API gate
after manual display had **2349 passed / 1 failed / 3 skipped** (204 files):
adding null metadata changed the legacy summary shape when no description
existed. The implementation now leaves absent optional metadata absent;
the unchanged 240-reviewer SQL baseline assertion passes. Final gates were
rerun fresh and serially after that repair. Existing six lint
warnings and Vite/Expo advisories remain. Read-only searches initially used
Windows wildcard/nonexistent illustrative paths and returned path errors;
exact-path discovery established the final evidence. Early oversized combined
reads were followed by full separate prompt/roadmap/source reads.

Implementation commits:

- `0f2e2d8 feat(db): add material description cache migration file`
- `7ef8fa5 feat(api): describe exact material revisions after extraction`
- `5865036 feat(mobile): show material descriptions above Generate`
- `2afa3bb feat(web): show material descriptions above Generate`
- `efd2883 feat: show manual material descriptions in Library`

Closing commit: `docs: close MD1b`, authored with
`galaxymaxp <omgraythekid@gmail.com>`; resulting hash is in Git and
`tmp/overnight/MD1b.status`, without amending for a self-reference.
Local final refs: behind 0 / ahead 66 relative to locally recorded github/main;
remote freshness is not claimed. Logs live under `tmp/overnight/MD1b-*` and
are not committed.

**UNVERIFIED (owner to confirm):** production revisions, database rows/applied
migrations, Scheduler state, remote-ref freshness and real browser/phone/provider
behavior. No remote service operation, deployment, remote SQL/migration,
Scheduler change, email, environment-file edit or push was performed.
Unrelated untracked `UI/`, `apps/mobile/.gitignore`, `supabase/.temp/` are
preserved. Temporary logs, generated build outputs and validation artifacts are
excluded from commits; Next-generated declarations were inspected/restored.

**Owner steps remaining**

- **Rollout - NOT RUN, skipped entirely:** apply
  `packages/db/migrations/20261018000200_material_descriptions.sql`, optionally
  set `MATERIAL_DESCRIPTION_MODEL`, deploy API / Google worker / web, and
  publish mobile OTA/APK in the next owner fullsend. The Vercel CLI is missing;
  installing `npm i -g vercel` is strongly recommended for the owner's later
  deployment tooling. No installation or CLI use occurred here.
- Existing prepared materials need worker redelivery/re-preparation to acquire
  metadata. Broad existing-material coverage needs an owner backfill decision;
  no backfill was written or run. Normal Generate reads never call the model.
- **Device checks - NOT RUN, skipped entirely:** phone/browser prepared
  PDF/PPTX/Canvas-page description above Generate; missing description adds
  nothing; Generate still works; completed manual uploads show cached descriptions
  beneath their existing personal Library filenames. Provider quality/latency and physical/browser
  behavior remain owner acceptance.
- Manual uploads retain ADR-037 immediate generation. Existing personal Library
  cards show cached descriptions beneath the original filename on mobile/web.
  Optional manual metadata is started without awaiting it and may be lost when
  a worker exits; no background completion guarantee is claimed.
- Future only: cross-student reuse for identical files; owner isolation remains.


## Historical MD1 STOP (retained evidence)

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
