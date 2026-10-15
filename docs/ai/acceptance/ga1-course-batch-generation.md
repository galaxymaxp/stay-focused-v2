# GA1 course batch generation: STEP 0 stop

Date: 2026-10-15. Status: **STOPPED**, before product edits.
Inspected HEAD: `65c9150`, branch `overnight/2026-10-15_feedback`.

The full GA1 prompt and external feedback roadmap were read. Its UNATTENDED
rules require stopping on a code contradiction, recording the exact owner
question, committing safe work and writing the status; no question was sent.

## Baseline

- FRESH local inspection: expected branch matches; `tmp/overnight/QD1.status`
  first line is `PASS`; `git status --porcelain --untracked-files=no` is empty.
- HEAD is 22 commits ahead of the locally recorded `github/main`; no fetch was
  performed. Unrelated untracked `UI/`, `apps/mobile/.gitignore`, and `supabase/`
  were preserved and excluded from staging.
- Git identity matches the requested author; no product or migration file changed.

## Contradictions requiring the stop

1. **EP1 has no durable explicit Reviewer wait-for-prepared job.**
   `apps/api/src/lib/experience/generation.ts:44` reads preparation; at line 47,
   missing evidence admits preparation then throws `409 not_ready` at line 49.
   It does not create a Reviewer job or persist the student's generation intent.
   `apps/api/src/lib/experience/generation.test.ts:37` explicitly expects that
   behavior for pending/running/failed/cancelled/missing preparation and asserts
   that neither normal nor deferred Reviewer creation runs (line 41).
   `apps/api/src/lib/canvas-preparation/orchestration.ts:107` wakes only the
   existing automatic admission adapter after completion. That adapter skips
   past courses (`auto-reviewers/after-sync.ts:13`) and respects automatic opt-out
   and baseline exclusions. ADR-026's Consumers section confirms pending means
   unavailable/not-ready; only AG1 candidates wait. Reusing this path would lose
   explicit batch requests for older materials, disabled Auto and past courses.
   A new durable explicit intent/resumption mechanism is necessary to meet GA1.
2. **E2 estimates study time, not generation time.**
   `packages/shared/src/reviewer-estimate.ts:20` documents estimation from the
   saved reviewer body; line 21 accepts a finished payload, line 25 rejects
   absent sections, and lines 58-63 compute reading/recall/orientation time.
   `docs/roadmap.md:733` identifies E2 as the review-time estimate. It cannot
   supply the requested pre-generation wall-clock estimate from material IDs.
   Calling its output generation time would misrepresent what it measures.

Exact owner questions (recorded for morning, not sent):

- May GA1 add a durable explicit batch-intent receipt/resumer, independent of
  Auto preference/baseline and allowed for an explicitly opened past course,
  while keeping every eventual Reviewer inside the existing server quotas?
- For the confirmation line, should GA1 introduce a separately labelled coarse
  generation-duration estimate, or change the required wording to omit minutes
  until a supported estimate exists? E2 remains a saved-reviewer study estimate.

## AG1/AG2 coverage and visibility

This is a **coverage gap**, with visibility also limited to admitted jobs; no
live tester account was inspected. It is not safe to assume all material has
already been generated.

- `auto-reviewers/admission.ts:88` requires a complete bounded inventory.
  Lines 53-60 restrict candidates to available/ready File/Page sources or
  preparable File/Page sources. Unsupported/ineligible material is excluded.
- Lines 152-171 baseline the first complete inventory without generating its
  backlog. Lines 64-68 require a valid updated timestamp newer than baseline;
  old or unversioned sources do not become new automatic candidates.
- Line 132 honors the Auto off switch; `after-sync.ts:13` skips past courses.
- Admission lines 15-18 cap three/run, five/rolling day, three attempts and a
  90-second run budget; lines 179, 191 and 236 enforce those restrictions.
- Lines 225-234 skip an existing mapped reviewer and leave unprepared candidates
  pending without spending a generation attempt. This existing-reviewer lookup
  is material presence, not proof of exact current revision freshness:
  `auto-reviewers/reviewed-materials.ts:9` uses
  `experience/service.ts:374`, whose map contains artifact ID/update time and
  source-row identity, without comparing current material revision evidence.
- Lines 249-263 defer quota failures and continue past individual source failures.
- `poll-trigger.ts:13` discovers only newly seen File/Page module items from a
  complete previous inventory; missing previous evidence yields no new items.
  Lines 43-52 reserve a capped content sync and use a six-hour-window sync key;
  polling does not generate the semester backlog itself.

Paths above without a prefix are under `apps/api/src/lib/`.

## Reusable implementation inventory

| Piece | Existing location and constraint |
| --- | --- |
| Owner-authenticated generation | `apps/api/app/api/experience/[...path]/route.ts:128` calls `startReviewerGeneration`, reads `idempotency-key` and returns 202 only after acceptance; `experience/http.ts:44` verifies the bearer token. |
| Material identity/idempotency | `experience/generation.ts:27` reconnects by owner/key, validates private course/material metadata and schedules normal dispatch. `auto-reviewers/admission.ts:75` hashes owner/course/material/revision for automatic keys; this is not an explicit batch receipt. |
| Source fidelity | `experience/generation.ts:44` requires exact prepared evidence; prepared PDFs/composites carry preparation identity, while other prepared sources retain structure/default selection/preview validation and immutable snapshots. No unprepared preview fallback. |
| Mobile generation | `apps/mobile/src/features/reviewer/ReviewerGenerateScreen.tsx:437` retains an in-flight guard and submission key; `features/courses/CanvasSourceReviewerScreen.tsx:356` refreshes preparation status. `canvasStudyWorkflow.ts:44` binds a job to accepted source IDs/session; `canvasBlockSelection.ts:114` keys selected blocks within a structure session. These are not course batch selection. |
| Course surfaces | Mobile `apps/mobile/app/(app)/(tabs)/courses/[courseId]/index.tsx:1` routes to `features/redesign/GenerateScreen.tsx:219`. Web material workspace is `apps/web/src/features/generate.tsx:263`, routed under `/generate/[courseId]`; the prompt's `/canvas/[courseId]` subtree currently contains Grades, not the material workspace. |
| Normal Queue jobs | QD1 already exposes normal generation jobs; retain its shared sources/Retry/Open and add batch summary only after the prerequisite design is resolved. ADR-029 remains accepted and unchanged. |
| Server quota | `packages/db/migrations/20260723090006_processing_quota_concurrency_hardening.sql:15` serializes admission by user with an advisory transaction lock; lines 25-89 enforce active/hourly/queued/daily limits. The trigger is attached by `20260723085823_processing_daily_page_quota.sql:53`. A batch can reuse normal job creation under this server enforcement. **The no-server-quota STOP condition is not triggered.** Live application of the migrations is unverified. |
| Study tools vs generation | `apps/api/src/lib/study-tools.ts:310` explicitly describes its in-memory limiter as not a durable quota; it must not be used to enforce batch admission. `experience/service.ts:55` composes material/reviewer data; it is not quota enforcement. |
| E2 | `packages/shared/src/reviewer-estimate.ts:21` is reusable for saved-reviewer study time only. |

## Acceptance and verification

| Requirement / suite | Result |
| --- | --- |
| STEP 0 local branch/QD1/tracked cleanliness | FRESH PASS, 3/3 prerequisites |
| STEP 0 implementation audit | FRESH, two prerequisite contradictions recorded; STEP 0 partial |
| STEP 1 API; STEP 2 mobile/web; STEP 3 tests | NOT RUN, stopped before implementation |
| Forced repository typecheck; forced lint | NOT RUN, 0 tasks each |
| API/mobile/shared/web test suites | NOT RUN, 0 tests each; no cached results claimed |
| API/web/Android builds | NOT RUN, 0 builds each |
| `git diff --check`; `git diff --cached --check` | FRESH PASS, 0 whitespace errors each (documentation checkpoint) |
| Rollout / Device checks | NOT RUN, entirely skipped by UNATTENDED rules |

Read-only discovery included Windows `rg` wildcard/path misses and one guessed
shared-file path that did not exist; corrected discovery located the real files.
No test or product gate failed, no flaky suite was run, and no earlier run's
test/build counts are used as GA1 verification. Product gates remain NOT RUN,
not green. No test-temp files were created.

## Owner steps remaining

Resolve the two recorded questions and revise the GA1 prerequisite assumptions,
then resume STEP 1-3, all fresh serial gates and atomic implementation commits.
After code acceptance, perform the entirely skipped Rollout: apply any new
migration through the Supabase connector (filename as name), deploy API/website
and publish preview OTA. Perform the Device checks: CIT17 Generate all skips
exact-current reviewers, shows an honest confirmation and quota remainder,
appears as normal QD1 jobs with summary, and preserves Retry, SP1 and CQ1.

Live revisions, database migrations/rows, Scheduler state, CIT17 inventory and
physical behavior are **UNVERIFIED (owner to confirm)**. No remote service call,
remote SQL, migration application, deployment, Scheduler action, environment-file
edit, push or file deletion occurred. No later roadmap work was started.
