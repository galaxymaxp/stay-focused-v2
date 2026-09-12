# B24.6 verification

Date: 2026-09-12. Repository: `C:/Projects/stay-focused-v2`, branch `main`.

## Starting state

HEAD `2389ccc8386096f3cf97db5cc86537fa63939184`. Local `origin/main...HEAD`: 0 behind / 35 ahead, without fetching or pushing. `git fsck --full` passed with three pre-existing dangling blobs (`e69de29…`, `625ec44…`, `20a8d94…`), not repository corruption.

Fresh baseline: API 710, mobile 443, Canvas 73, OCR 27, shared 44, engine 606. Engine architecture assertions (157) are included in 606, not additional. Shared’s configured discovery runs 44 tests across six files; that is not a claim of 44 distinct source cases.

Pre-existing modified files, preserved and excluded except for separately staged B24.6 additions to the three current-state documents:

```text
apps/api/workflow-tests/canvas-sync-runtime-fixture.ts
apps/api/workflow-tests/canvas-sync-runtime.workflow.test.ts
apps/mobile/src/auth/sessionStore.ts
apps/mobile/src/services/activeProcessingJobStore.test.ts
apps/mobile/src/services/activeProcessingJobStore.ts
apps/mobile/src/services/completedArtifactCache.test.ts
apps/mobile/src/services/completedArtifactCache.ts
apps/mobile/src/services/processingDraftStore.ts
apps/mobile/src/services/processingJobsApi.test.ts
apps/mobile/src/services/processingOutboxStore.test.ts
apps/mobile/src/services/processingOutboxStore.ts
docs/ai/current_sprint.md
docs/current-state.md
docs/roadmap.md
package.json
```

Pre-existing untracked paths: `apps/mobile/src/auth/sessionStore.test.ts`, `apps/mobile/src/services/localStoreQueue.ts`, `apps/mobile/src/services/persistenceConcurrency.test.ts`, `docs/ai/acceptance/b8/`, `docs/ai/acceptance/pre-ui/`. No reset, clean, stash or push was used. Temporary copies, logs and live fixtures remain outside the repository. The auto-generated Next type-reference change from the build was restored to its starting content.

## Fresh checks

| Suite | Result | Count / notes |
|---|---|---|
| API | FRESH PASS | 768 passed, 1 opt-in live test skipped, 77 files |
| Mobile | FRESH PASS | 443 passed, 35 files |
| Canvas | FRESH PASS | 73 passed |
| OCR | FRESH PASS | 27 passed |
| Shared | FRESH PASS | 44 passed, 6 discovered files |
| Engine build/evals | FRESH PASS | 606 assertions; zero failures; includes 157 architecture assertions |
| Activity database/RLS | FRESH PASS | 13 deterministic tests included in API; actual new migration executed in PGlite Postgres |
| Live provider + local persistence | FRESH PASS | Earlier dedicated run: 13 passed (12 then-existing deterministic tests plus live test); both document and Q&A verified |
| Existing Workflow runtime | FRESH PASS | 1; exercises existing Canvas Workflow runtime, not an Activity hosted deployment |
| Existing provider contract | FRESH PASS | 18 |
| Root typecheck | FRESH PASS | 7/7 tasks, zero cache hits |
| Root lint | FRESH PASS | 7/7 tasks, zero cache hits, zero warnings |
| Root production build | FRESH PASS | 7/7 tasks, zero cache hits; API routes and Workflow compilation plus mobile exports |
| `git diff --check` | FRESH PASS | Checked working and staged changes |
| `git fsck --full` | FRESH PASS | Same three starting dangling blobs |
| Hosted migration / hosted RLS / deployed Activity worker | NOT RUN | No hosted database mutation or deployment |
| New UI / device APK acceptance | NOT APPLICABLE | No UI changes in this backend task |

Commands: `npm.cmd test`; `npm.cmd run test:workflow --workspace @stay-focused/api`; `npm.cmd run provider:contract --workspace @stay-focused/api`; forced root `typecheck`, `lint`, `build`. Logs are local at `C:/Users/Fely Max Dilinila/Documents/Projects/b24-6-*.log` and are not committed.

## What was tested

The Activity instruction fixtures cover research, reflection, Q&A, lab report, presentation, PDF/scanned-PDF/image instructions, sparse instructions with an attachment, custom teacher structure, programming, exact N answers, no conclusion and missing source information. These are deterministic contract fixtures, not fourteen separate live model evaluations.

Actual in-memory Office archives test DOCX heading/list/question/table order and PPTX relationship ordering, title/body association, empty fields, decorative-footer exclusion, hostile XML and active content. An owned DOCX archive also traverses private Storage validation into TaskSpecification. Actual native/scanned PDF byte fixtures and image fixtures traverse the existing extraction boundary into exact item/exclusion constraints; OCR results use the deterministic test provider. Native PDF confirms zero OCR calls. No new live OCR run was needed or claimed.

Security tests verify missing JWT denial, foreign assignment/material/attachment denial before provider access, server-derived course scope, exact module selection, foreign generation/draft/Library denial, bounded request bodies and persisted Library opening. SQL tests exercise SELECT/INSERT/UPDATE/DELETE ownership, anonymous denial, service-only RPC grants, protected metadata, revision conflicts, idempotency, cancellation/lease publication rejection, regeneration preserving edits, retention and account-deletion cascades.

PGlite tests use the original queue-table DDL and execute the complete B24.6 migration. Minimal auth, Canvas, policy and cleanup prerequisites are fixtures. They test real Postgres policies/constraints, but do not substitute for running the entire historical migration chain against hosted Supabase. Repository-owned grants and API defense-in-depth are both tested.

## Live validation

Explicit opt-in command from the repo root:

```powershell
$env:B24_6_LIVE='1'
npm.cmd run test --workspace @stay-focused/api -- src/lib/activity-maker/database.test.ts
```

The harness loads root `.env.local` only under this opt-in, calls the existing provider adapter, and never prints keys/prompts. The fixtures are a small non-sensitive biology reading, a two-heading synthetic teacher template (Diffusion/Osmosis), and two questions. The document and Q&A each passed deterministic and independent semantic instruction, grounding, citation and template checks with no missing-information warning.

Both results were saved with the migration’s completion RPC, reopened through the draft mapper under owner RLS, edited under authenticated column grants, and reopened again. A second generation record persisted the already validated provider content to verify separate-draft regeneration; the original student edit remained recoverable. This tests regeneration storage semantics without unnecessary extra provider calls. It is not a claim of a second live model regeneration or a production deployment test.

One generation and one verification request were made per fixture per run. The run was repeated once because the Q&A harness key `live-qa` violated the existing eight-character idempotency minimum after generation had already succeeded. The corrected harness passed both complete paths.

## Failed intermediate checks and fixes

- Initial typecheck exposed a generic Supabase source-query type, the expanded Library response union and notification job-type unions; all corrected without weakening types.
- Initial Activity fixtures exposed reflection wording/exact-answer classification and an obsolete unavailable-capability expectation; corrected.
- The existing worker claim test initially omitted `activity_generation`; updated to the new accepted type set.
- New database and Storage fixtures initially had duplicate prerequisite-column setup and an Office file incorrectly marked as an image; fixture errors fixed.
- Missing-lease fixture initially violated the existing paired-lease constraint; corrected to represent both missing lease fields.
- Initial lint had one type-only constant warning; replaced with a type alias. Final lint has no warnings.
- The live fixture key failure is recorded above. No validation rules were relaxed to make live output pass.

## Acceptance and rollout

**PASS — V1-informed Activity Maker backend is ready for the redesigned UI.** This is repository/backend acceptance, with deployment migration explicitly pending. V1 audit preceded implementation, the reference checkout remained clean at `d26decf3f82d61f2e8dd6ba2444c6c156473163a`, and no V1 commit was made.

Apply the new migration before API deployment. Deliberate scope limits: legacy DOC/PPT, CSV parity, complex Office layout/media, automatic refinement, binary/rendered exports and arbitrary ambiguous instruction interpretation. See [format limits](file-ingestion-matrix.md). Next implementation phase: **B24.7 — Quiz generation, attempts, results, weak-area mapping and Library persistence.**
