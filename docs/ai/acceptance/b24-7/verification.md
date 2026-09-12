# B24.7 verification

## Starting state and scope

Target `C:/Projects/stay-focused-v2`, branch `main`, starting HEAD
`9033781040705829db717e05e7acc2a95f98a0f5`; 36 ahead, 0 behind `origin/main`.
`git fsck --full` passed with three dangling blobs, no corrupt or missing objects.
V1 reference was inspected read-only. No UI work, hosted migrations, API deployment,
push, provider-adapter rewrite, Activity behavior change or Reviewer-engine change.

Twenty pre-existing files were hashed before work. They comprised the following
tracked/untracked work (untracked acceptance directories contain the listed files):

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
- `docs/ai/acceptance/b8/reviewer-e2e-acceptance.md`
- `docs/ai/acceptance/pre-ui/pre-ui-persistence-readiness.md`

All 20 hashes still matched before adding B24.7 status sections. The final commit
stages only new B24.7 content in the three status documents; original dirty content
is preserved and remains unstaged. Generated Next environment declaration drift
from this task's builds is excluded and restored only after checking its exact diff.

## Fresh baseline

The actual target ran `npm run verify:pre-ui` from the starting checkout plus its
pre-existing dirty work. Results were FRESH, not copied from B24.6 expectations.

| Suite | Baseline result |
|---|---|
| API | 768 passed, 1 opt-in live test skipped; 77 files |
| Mobile | 443 passed; 35 files |
| Canvas | 73 passed |
| OCR | 27 passed |
| Shared | 44 passed; 22 distinct source tests also discovered in generated output |
| Engine tests/evals | 606 passed, including 157 architecture assertions |
| Existing Workflow runtime | 1 passed |
| Root typecheck | 7/7, zero cached |
| Root lint | 7/7, zero cached, zero warnings |
| Root build | 7/7, zero cached |

## Final deterministic verification

`npm run verify:pre-ui` passed fresh after the typed test-case correction.

| Suite | Result | Count / scope |
|---|---|---|
| API | FRESH PASS | 906 passed; 3 opt-in live tests skipped; 81 files |
| Quiz-specific deterministic | FRESH PASS | 137 tests in 4 files, included in API total |
| Mobile | FRESH PASS | 443 |
| Canvas | FRESH PASS | 73 |
| OCR | FRESH PASS | 27 |
| Shared | FRESH PASS | 44 executions / 22 distinct source tests |
| Engine tests/evals | FRESH PASS | 606, including 157 architecture assertions |
| Existing Workflow runtime | FRESH PASS | 1; Quiz-specific checkpoint/lease behavior tested separately in API suite |
| Provider contract | FRESH PASS | 18; no adapter implementation changes |
| Root typecheck | FRESH PASS | 7/7, zero cached |
| Root lint | FRESH PASS | 7/7, zero cached, zero warnings |
| Root build | FRESH PASS | 7/7, zero cached |
| New migration/RLS/transactions | FRESH PASS | 21 deterministic SQL cases included in Quiz/API counts |
| Hosted migration/RLS/production smoke | NOT RUN | Explicitly outside B24.7; pending rollout |
| UI/browser/APK | NOT APPLICABLE | Backend-only task; no UI implementation |

Quiz regression evidence covers owned sources and Reviewer relationships,
explicit request limits, exact 5/10/15/20 counts, source-plan checkpoints, resume
without repeated generation, missing-slot repairs, all semantic rejection gates,
independent difficulty classification and option-by-option analysis. Mocked
verdicts prove control flow, not academic quality.

Local PGlite executes the actual new SQL migration following the actual Activity
migration and durable queue table definitions. Auth and other external prerequisite
tables are synthetic. Real SQL cases exercise owner/foreign roles, SELECT RLS,
no key-table grants even to owners, denied client mutation RPCs, relationship
checks, row-lock finalization, exact-set scores, numeric DTO normalization,
idempotent starts/completion, historical attempts, retention and account cascade.
This is local Postgres evidence, not a hosted Supabase acceptance claim.

## Failures retained and corrections

1. Initial isolated-checkout dependency resolution could not find Workflow, and
   ancestor filesystem permissions later blocked esbuild/ESLint resolution. The
   final checks run in the actual target with elevated filesystem access.
2. Initial exact-evidence output used block IDs instead of full source-topic IDs.
   The schema now constrains IDs to the frozen plan's enum and explicitly asks
   for verbatim quote text including math spacing and delimiters.
3. A subsequent live run timed out without new provider response artifacts. It
   was not counted as a pass or as evidence of academic quality.
4. Real local SQL returned a numeric percentage as text. Quiz summaries and
   attempt history now explicitly normalize numeric values. SQL/API regression
   asserts a numeric latest/best score.
5. Typecheck found the optional structured-document title and then the Vitest
   tuple inference for an empty-array rejection case. Added a safe title fallback
   and object-wrapped cases, without weakening TypeScript.
6. Early live mechanics passed but manual question review found missing question
   premises, erroneous Statistics arithmetic, implausible IT distractors and
   recall questions labeled hard. Those outputs were rejected as academic
   acceptance evidence. The verifier now withholds keys and requested difficulty,
   derives every defensible option, explains supported/contradicted options,
   checks learner self-containment/arithmetic, and independently classifies
   actual difficulty. Wrong or incomplete questions still fail closed.
7. Strengthened GPT-4o runs rejected both five-question mixed fixtures after the
   bounded repair budget. No final Quiz was published by those failed runs.
   This led to evaluating a Quiz-only pinned model through the unchanged adapter,
   rather than relaxing academic validation or changing other feature models.
8. Source review found generic Solution and numbered calculation steps split
   from their parent academic heading. Source grouping now preserves these
   blocks together; a regression checks that formulas retain their context.
9. Mixed difficulty originally imposed a mandatory hard slot on every small set.
   Mixed now uses the auditor's actual classifications, with no more than
   ceil(80% of the count) at one level. Explicit difficulty requests remain strict.
   Regressions accept genuine easy/medium variation and reject all-recall sets.
10. Manual review of an otherwise passing IT run found list-position trivia and
   a later scenario revealed by an earlier procedural explanation. Added academic
   value verification, a deterministic list-position guard, long evidence-passage
   reuse detection and feedback limited to the assigned concept. These failures
   are not accepted as academic-quality passes.
11. A local targeted test invocation used the workspace parent once and failed
   before running tests (missing package.json); rerunning in the checkout passed.

## Live validation

FRESH LIVE PASS on both five-question fixtures after targeted repair. The final
run retained four validated Statistics questions and three IT Security questions
from earlier live authoring, regenerated only the three rejected slots, and
independently reverified each complete set with pinned `gpt-5.4-2026-03-05`.
That repair run made two provider calls per fixture (author + whole-set verifier),
then passed actual local SQL persistence, feedback, completion and Library reopen.
These four calls are the final repair run, not the total calls spent debugging.
Prior structural, timeout, quality and difficulty failures above remain part of
the acceptance history; this is a limited sample, not a generation success-rate
benchmark or a guarantee for every source.

| Check | Statistics | IT Security |
|---|---|---|
| Requested / completed count | 5 / 5 | 5 / 5 |
| Types | 2 single, 2 multi, 1 T/F | 2 single, 2 multi, 1 T/F |
| Actual difficulty | 2 easy, 3 medium | 4 easy, 1 medium |
| Grounding / keys | Exact evidence plus independent option analysis; manually checked | Same |
| Distractors / ambiguity | Related misconceptions; no alternate defensible key found in review | Related course categories and scenario confusions; no alternate defensible key found |
| Arithmetic | Weighted-mean procedure and grouped median rechecked | No numeric calculation |
| Self / cross-question leakage | Repaired answer-paraphrase defect; reviewed final set | Repaired list-position trivia and procedural reuse; reviewed final set |
| Attempt / feedback | Five finalized answers, one deliberately wrong | Same |
| Deterministic score | 4/5 = 80% in SQL and API | Same |
| Weak areas | One `missed_topic` with actual page/source references | None: one whole-source topic at 80% is not below 60% |
| Library | Persisted, listed and reopened; numeric latest score 80 | Same |

Manual review considered every final prompt, option, key and explanation against
its source and verifier report. Statistics retains five academic source headings.
The flat IT fixture has one coarse source region, so its weak-area granularity is
honestly the whole material. No Reviewer section mapping was invented for these
fixtures; exact Reviewer-title linking is covered by deterministic tests.

Source-derived questions, diagnostics, provider outputs, local database data and
credentials are excluded from Git. Environment variables required to explicitly
opt into the test are `B24_7_LIVE=1`, `B24_7_ENV_FILE`, `B24_7_STATS_FILE`, and
optionally `B24_7_LIVE_OUTPUT`. `B24_7_SEED_DIR` supplies already validated questions for a targeted repair
exercise; each complete repaired set is verified again. `B24_7_REPLAY_DIR` reuses saved live responses for
local persistence rechecks with zero new provider calls; a replay is never claimed
as a fresh generation.

The live runs use the existing Statistics prepared fixture and committed
`packages/engine/scripts/fixtures/it-security.txt`, five questions each, mixed
difficulty, two single-select, two multi-select and one true/false. The fixture
SQL uses synthetic local ownership and actual migration/RPCs. The Library check
calls the real Experience service with a SQL-backed repository adapter; it does
not claim an HTTP-to-hosted-database production test.

Initial provider execution was twice rejected by automatic approval review. The
user then explicitly approved sending these two fixtures to the existing OpenAI
provider using existing credentials and local-only persistence. Subsequent calls
executed under that approval. No credentials or source content were sent elsewhere.

## Remaining backend gaps

| Area | BLOCKS UI REDESIGN | CAN DEFER UNTIL LATER |
|---|---|---|
| Today | None found in existing backend contracts/tests | Calendar-provider integration remains unavailable |
| Learn | None found | Richer material counts/last-activity metadata; legacy DOC/PPT unsupported |
| Reviewer | None found | Hosted rollout and existing physical APK upgrade acceptance; no engine rewrite |
| Activity Maker | None in code | Apply pending Activity migration, deploy and run production smoke; export remains deferred |
| Quiz | None for the bounded implemented contracts | Hosted migration/deployment; broader repeated live quality/cost/latency evaluation; explicit hard/source suitability may fail safely; free response/matching/ordering deferred |
| Tasks | None found in existing task/planner contracts | Calendar sync and future planning features |
| Library | None in implemented Reviewer/Activity/Quiz readers | Richer trend metrics and cross-source topic granularity |

The flat-source fallback uses real regions rather than invented fine-grained
semantic topic labels. Four-material/120,000-character and 5–20-question bounds,
strict source/evidence gates and the existing provider timeout remain enforced.
A source or requested difficulty that cannot support a valid set fails safely.
The representative live samples validate the final bounded loop, not high-volume
production reliability. Mixed difficulty can include no hard question, but must
contain at least two actual levels and cap any one level at ceil(80% of count).

PASS — Quiz backend is ready and core backend capability is complete for the UI redesign

Next: B24.8 — Backend rollout readiness: apply pending migrations locally/hosted,
deploy API, perform Activity Maker + Quiz production smoke validation.
Then B25 — Apple-inspired 2026 design system + mobile app shell.
