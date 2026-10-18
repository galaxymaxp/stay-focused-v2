# MR3: Try again after failed generation

**Verdict: PASS for the finite unattended code scope. Owner migration, rollout
and device acceptance remain excluded and NOT RUN.**

Date: 2026-10-18. Baseline: `73bafb1`, branch
`overnight/2026-10-15_feedback`. Scope: unattended STEP 0-5, local tests,
gates, documentation and commits only. Rollout/device checks are owner steps.

## STEP 0 evidence (baseline lines)

- WG2 `0eaffa9`, `bb2395f`, `7112770` and FX1b `37fcd16`, `dfbf466`,
  `a10642b`, `b750224` are in local history. Dirty paths preserved:
  untracked `UI/`, `apps/mobile/.gitignore`, `supabase/.temp/`.
- `apps/api/app/api/jobs/[jobId]/retry/route.ts:35`: validates a supplied key;
  :43 finds live retry; :50 preserves Quiz capacity 422; :54 calls retry RPC;
  :61 dispatches acceptance; :71 maps non-retryable to safe 409.
- `apps/api/src/lib/processing-jobs/repository.ts:269` calls
  `retry_processing_job`. Latest definition:
  `packages/db/migrations/20260723084329_reusable_processing_assets.sql:1562`.
  :1584 replays a same-key child or rejects a conflicting parent;
  :1605 requires failed AND retryable; :1613 preserves active limits;
  :1669 copies source_snapshot_id/source_version_id, original settings and
  fingerprint; :1680 starts a fresh generation budget. It does not clone bytes.
- `apps/api/src/lib/processing-jobs/manual-reviewer-source.ts:24` short-circuits
  resolved text; the attach RPC stores exact extraction on the shared source.
  `deferred-canvas-reviewer.ts:39` only extracts unresolved PDF sources;
  `deferred-canvas-composite.ts:31` only resolves deferred metadata. Attached
  sources replace deferred metadata. Source reuse itself needs no migration.
  MR3 adds a function-only migration for safe historical retry eligibility and
  deletion denial, with no backfill or updates to existing rows. OWNER MUST APPLY
  `20261018000100_failed_generation_retry.sql` before API/client rollout.
- `ai-reviewer.ts:49` converts contract/coverage failures to generation_failed.
  `operations.ts` failure sites: :114/:749/:878 retain WorkerJobError policy;
  :149/:166 PDF validation false; :236 Quiz generation-only true, capacity false;
  :263 Activity false (outside MR3); :341 incomplete inspection true;
  :412 OCR limit false; :489 extraction-specific policy;
  :691/:810 incomplete extraction only true; :712/:819 empty text false;
  :840/:869 Canvas preparation false; :882 Reviewer generation false;
  :913 interrupted workflow true except cancellation; :998 forwards known policy.
- `google-cloud.ts:131` dispatch failure true; :164-168 interrupted/provider
  failures true with automaticRetryable unchanged.
- `GenerationScreen.tsx:125` gates retry on failed/error.retryable; :126 retry
  submits to existing endpoint; :193/:220 show Retry and generic validation copy.
  `CanvasSourceReviewerScreen.tsx:1430` makes a new key; :2477-2484 gates Retry
  but always offers choose-another. `QueueContents.tsx:155` retries existing job.
  Web `queue.tsx:155/:214` gates retry, :275 choose-another copy, :339 Retry.
  `experienceApi.ts:35` directs Quiz failures to another material.
- SQL deletion policy (:1803 soft_delete_document_asset) marks the document
  unavailable but leaves immutable text. MR3 must explicitly deny retry from
  this tombstone as well as missing/foreign sources, even when text survives.
- Real stage enum: `packages/db/src/types.ts:449-467`. Shared helper will use
  those names, including verifying_coverage (no invented validation stage).

## Failure policy

| Code | Stage | Retryable before | After MR3 | Reason |
| --- | --- | --- | --- | --- |
| generation_failed (Reviewer contract/coverage) | generating_sections | false | true | Exact stored source; new job and model call budget; validation stays strict |
| reviewer_validation_failed | verifying_coverage / assembling_reviewer | false | true | Existing local worker assembly validation; new generation keeps all checks |
| quiz_generation_failed | generating_sections | workflow true; local worker false | true | Align local worker with workflow manual retry; preserve automatic policy |
| processing_workflow_failed | current persisted stage | true | true | Interrupted work; source remains stored |
| google_generation_interrupted / google_generation_retryable_failure | current persisted stage | true | true | Existing manual retry; automatic policy unchanged |
| google_generation_dispatch_failed | preparing_source | true | true | Existing acceptance recovery |
| processing_provider_failed / provider_rate_limited | current persisted stage | true | true | Existing local-worker provider recovery |
| document_extraction_incomplete | extraction stages | true | true | Existing complete-page verification still required |
| page/OCR limits, unreadable/unsupported/empty/oversized source | extraction/preparation | false | false | Same source cannot fix source constraints |
| quiz_source_capacity_exceeded | preparation/generation | false | false | Existing 422 with supported maximum |
| unavailable/deleted/foreign source, insufficient_source, not_ready | preparation | false | false | Source access and readiness must be respected |

## Acceptance matrix

| Requirement | Layer | Proof | Result |
| --- | --- | --- | --- |
| Safe generation retry, unchanged automatic policy | API | operation and local-worker regressions | FRESH PASS |
| Exact extraction reuse without upload/OCR | SQL + worker | local database and worker regressions | FRESH PASS |
| Deleted/unavailable source denied; conflicts preserved | API | route and local database regressions | FRESH PASS |
| Real stage phrases with unknown fallback | Shared | 31 new mapping/policy cases; 393 total tests | FRESH PASS |
| Try again, safe copy, duplicate protection/fresh accepted attempts | Mobile + web | component/action regressions | FRESH focused PASS; full gates below |
| Safe 409/422 removes retry action | All clients | API message + component regressions | FRESH focused PASS; full gates below |
| Fresh serial gates | Repository | exact counts below | FRESH PASS |

## Owner steps remaining

Rollout and Device checks NOT RUN, skipped entirely. Owner deploys reviewed API
and website and publishes mobile OTA, then checks a failed generation from the
SOC_SCI_103 upload retries without a new upload. Production revision, database
rows, Scheduler state and physical behavior: UNVERIFIED (owner to confirm).
No remote calls, deployment, remote SQL, Scheduler, email, environment-file edit or push.

## Implementation and focused evidence

The new function-only migration is mandatory for historical retry eligibility
and deletion denial. No migration was applied remotely. The local PGlite tests
execute migration SQL only in memory, with synthetic sources.

API/workflow/local-worker manual retry policies now agree for Reviewer and Quiz
generation failures. Automatic retry flags remain as before. The status
projection recognizes safe historical codes without updating stored rows.
The retry route rechecks a live child through the same RPC before returning it;
capacity remains a 422 with supportedMaximum. Missing/foreign ownership stays a
safe denial. Original request fingerprint, contract and source identity copy
unchanged. Source text/blocks are retained; fresh job checkpoints/call budgets
do not copy failed output. SQL locks source/document/Canvas rows during admission.

Shared plain-stage mapping covers every real stage and unknown/missing input.
Mobile Generation, Canvas card and Queue plus web Generation/Queue use Try again,
stage copy and safe-material text. View Queue remains secondary; Canvas
choose-another is secondary for non-retryable jobs. Synchronous tap locks prevent
duplicate submission, accepted child retries get new keys, and existing
ambiguous-request identities remain stable. Typed 409/422 denials suppress the
action even while polled data is stale. Existing expired-Queue handling remains.
No new design tokens, endpoint/DTO, polling path, dependency or native module.

Focused checks, all FRESH:

- API retry/worker/operation/database regressions: **49/49** (5 files), before
  the final five SQL cases were added.
- Mobile Generation/Queue/client: **27/27** (3 files), before the final two
  Queue denial cases were added. Canvas card: **2/2** (1 file).
- Web Generation/Queue/client: **20/20** (3 files).
- API repaired SQL/cache fixtures: **52/52** (2 files), including all final
  25 SQL cases and 27 owner-cache cases.

## Failed first attempts and limits

- Editing helper `python -` was unavailable; no edit ran. Replaced with Node.
  A multi-file patch had an unmatched test-context line and applied nothing;
  reapplied with the correct context.
- First two focused API attempts each had **29 passed**, **1 failed suite /
  4 passed files**, **20 skipped tests** (migration setup failed). A JavaScript
  string replacement expanded SQL regex dollar suffixes, corrupting the new
  uncommitted function draft. Repaired the function and removed duplicated
  trailing text. The third focused run passed **49/49**.
- The first final typecheck launch exited 1 before any tasks: NODE_OPTIONS had
  Windows backslashes in its quoted preloader path. Converted to forward slashes;
  retained `tmp/overnight/MR3-typecheck-preloader-failed.log`.
- First full API gate: **2304 passed / 2 failed / 3 existing live skips**,
  **199 passed / 2 failed files** of 201. The new Quiz case needed the real
  earlier Quiz admission constraints in its minimal SQL fixture. The owner-cache
  fixture needed a returned row from the new same-key RPC recheck. No production
  policy or cache assertion was weakened. Corrected focused run: **52/52**.
  Retained `tmp/overnight/MR3-api-gate-first-failed.log` and restarted all gates
  serially after the repairs.
- First full mobile gate: **1306 passed / 4 failed**, **137 passed / 1 failed
  files** of 138, **1 unhandled rejection**. The two new Queue tests attempted
  JSON serialization of React props with circular Fiber references. They failed
  before consuming their mock rejections, which contaminated the next two
  existing tests and left an unhandled mock promise. Read visible Copy/Notice
  children instead and reset request mocks between cases. Focused Queue:
  **6/6 PASS**. Retained `tmp/overnight/MR3-mobile-gate-first-failed.log`.
  Repeated forced typecheck/lint, then resumed serial gates at mobile. Shared
  and API code/tests were unchanged by this assertion-only repair; their fresh
  **393/393** and **2306/2306** (three live skips) results remain valid.
- The preparatory forced typecheck passed **8/8, zero cached** before final
  review. Only the later complete serial sequence will establish final closure.
- Final review found a mounted mobile Queue card retained its key after an
  accepted retry. Rotate it only after acceptance, retaining the key on an
  ambiguous request failure. Added the mounted-card regression: focused Queue
  **7/7 PASS**. Repeated forced typecheck/lint, full mobile tests, Android export
  and forced root build after this two-file mobile change. Shared/API/web
  implementation and test sources are unchanged, so their preceding FRESH results
  remain valid. The earlier root build passed **8/8, zero cached** and is retained
  as `tmp/overnight/MR3-root-build-before-key-review.log`; it is not the final
  build evidence for this last change.
- No nondeterministic flake observed. Live generation, deployment/migration state,
  SOC_SCI_103 behavior and physical-device acceptance are UNVERIFIED (owner to
  confirm); no private source was read or used as a fixture.

## Serial local gates

All checks run with repo-local TEMP/TMP, live test flags disabled, telemetry
disabled, Expo offline mode and a reviewed non-loopback socket blocker. Logs are
ignored under `tmp/overnight/MR3-final-*.log`. No result below claims deployment
or device acceptance. Failed first attempts are retained above.

| Command | Result | Evidence |
| --- | --- | --- |
| `npm run typecheck -- --force` | 8/8 tasks, 0 cached | FRESH PASS |
| `npm run lint -- --force` | 8/8 tasks, 0 cached; 6 existing warnings | FRESH PASS |
| `npm run test --workspace @stay-focused/shared` | 393/393 tests, 43 files | FRESH PASS |
| `npm run test --workspace @stay-focused/api` | 2306 passed, 3 existing live skips, 201 files | FRESH PASS |
| `npm run test --workspace @stay-focused/mobile` | 1311/1311 tests, 138 files; 0 unhandled errors | FRESH PASS |
| `npm run test --workspace @stay-focused/web` | 236/236 tests, 40 files | FRESH PASS |
| `npm run build --workspace @stay-focused/api` | 1/1 build, 35/35 pages | FRESH PASS |
| `npm run build --workspace @stay-focused/mobile -- --platform android` | 1/1 Android export | FRESH PASS |
| `npm run build -- --force` (AUTOPILOT) | 8/8 tasks, 0 cached; API 35/35, web 19/19, Android/iOS/web exports | FRESH PASS |
| `git diff --check` / `git diff --cached --check` | Both clean, including scoped commit staging | FRESH PASS |

Provider contract suite: NOT APPLICABLE (provider interface unchanged).
Rollout and Device checks: NOT RUN (unattended exclusions).

Additional diagnostic: `npm run test:workflow --workspace @stay-focused/api`
exited **1, zero tests discovered**, because `git ls-files apps/api/workflow-tests`
contains only `.gitignore` and no `*.workflow.test.ts` source. This is **BLOCKED
as a standalone runtime probe**, not a passing test. It is **NOT APPLICABLE to
the mandatory MR3 gate list** and the AUTOPILOT runtime/provider-boundary trigger
does not apply: no workflow graph, runtime integration or provider boundary was
changed. No empty-suite flag or invented test was used to turn it green. The
existing `manual-reviewer-workflow.test.ts`, Google delivery, lease, cancellation
and source-chain tests ran in the 2306-passing API suite. The API build also
compiled the unchanged workflow graph (18 steps, one workflow). The diagnostic
log is retained as `tmp/overnight/MR3-final-workflow.log`.

## Local implementation commits

- `84ab171 feat(shared): describe failed generation recovery`
- `71f3d25 fix(api): retry failed generation from stored sources`
- `55d4eb0 feat(web): try again on failed generation`
- `cb36f82 feat(mobile): try again on failed generation`

All use author `galaxymaxp <omgraythekid@gmail.com>`. No push. The documentation
closure commit records this report; its final hash is in Git history and the
ignored `tmp/overnight/MR3.status` so the report need not embed its own hash.
