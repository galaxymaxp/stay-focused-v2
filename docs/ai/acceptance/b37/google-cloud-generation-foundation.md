# B37 Google Cloud generation foundation (2026-09-27)

**PARTIAL — Google Cloud foundation works but remaining blockers must be resolved before cutover.** This is distinct from the earlier B37 Reviewer Study Assist and artifact-convergence reports. No production Vercel routing or mobile build changed.

## Starting state and architecture

Canonical checkout: `b25-3-3-work`, branch `b25-3-3-ai-first`, HEAD `13db053fbf96d025e5efdd769c4dad1ee020d6a0`, clean, 95 ahead / 0 behind the local `origin/main` reference (no remote fetch). The sibling `stay-focused-v2` was a damaged/unborn checkout with 623 dirty entries and was untouched. Production `/api/health` returned 200. Exhausted Vercel Workflow quota and approximately 10 GB / 10 GB Functions Storage are user-reported constraints; no Vercel redeployment was attempted.

Authenticated Vercel routes in `apps/api/app/api/jobs/route.ts` and the Reviewer, Quiz and Activity routes verify the caller, enforce source eligibility, normalize eligible DOCX/PPTX/Page material, and persist owner-linked jobs and source references via `processing-jobs/creation.ts`. They remain on Vercel. The API queues heavy work through `workflow-dispatch.ts` and `workflow-start.ts`. `src/workflows/processing-job.ts` formerly contained the Vercel step operations: durable source preparation, per-page inspection, bounded OCR, ordered source assembly, Reviewer/Quiz/Activity generation, validation, source attachment, completion and Library persistence. They now call shared `processing-jobs/operations.ts`; Vercel step wrappers remain. The Google worker imports the same operations and `@stay-focused/engine`, not a copied generation engine.

The OCR path is `ocr/create-server-ocr-provider.ts` → `google-cloud-vision-provider.ts` / `pdf-native-text.ts` → `pdf-chunking.ts` / `extraction-service.ts` and `@stay-focused/ocr`. B32's scanned-PDF staging continues to keep image bytes out of the synchronous request. Inspection records every page; OCR uses bounded chunks with concurrency two and assembles source text in page order. The existing 100-total-page / 40-OCR-page limits and provenance rules remain. Reviewer uses `processing-jobs/ai-reviewer.ts`, Quiz `quiz/service.ts`, Activity `activity-maker/service.ts`, and the existing OpenAI provider/prompt/schema/repair pipeline. `processing-jobs/repository.ts` creates the service-side Supabase client; private Storage and owner-linked rows hold source bytes/versions, and `worker-repository.ts` calls atomic completion RPCs. Public DTOs and Queue/Library reads are unchanged. Existing leases, checkpoints and cancellation checkpoints are reused.

## Google discovery and resources

The pre-mutation gcloud account was authenticated to the existing **Stay Focus** project `stay-focus-492811`; billing was enabled. Supabase is in `ap-northeast-1`, so Google resources use `asia-northeast1`. `vision.googleapis.com`, Storage, Logging and Monitoring were already enabled. Existing OCR service account `cloud-vision-ai-user@stay-focus-492811.iam.gserviceaccount.com` and its working setup were preserved. Secret Manager was not enabled before B37. No second project was created.

| Resource | Name / configuration | Purpose |
|---|---|---|
| Newly enabled APIs | `run.googleapis.com`, `cloudtasks.googleapis.com`, `secretmanager.googleapis.com`, `artifactregistry.googleapis.com`, `cloudbuild.googleapis.com` | Only new services needed |
| Cloud Run | `generation-worker`, revision `generation-worker-00001-7pz`, Tokyo | Private Node worker; 1 CPU, 2 GiB, concurrency 1, max 2 instances, 1800 s timeout |
| Cloud Tasks | `generation`, Tokyo | One queue; 2 concurrent, 1/s, at most 10 deliveries, 60–300 s backoff, 3600 s retry window |
| Worker identity | `generation-worker@stay-focus-492811.iam.gserviceaccount.com` | Attached Cloud Run identity, scoped secrets and Vision use via ADC |
| Invocation identity | `generation-invoker@stay-focus-492811.iam.gserviceaccount.com` | Only identity with `roles/run.invoker` on the worker |
| Dispatch identity | `generation-dispatcher@stay-focus-492811.iam.gserviceaccount.com` | Queue enqueue permission and ability to attach invoker identity; not yet federated into Vercel |
| Build identity | `generation-builder@stay-focus-492811.iam.gserviceaccount.com` | Artifact Registry writer, build-log writer and build-input reader |
| Artifact Registry / build bucket | `generation` / `gs://stay-focus-492811-generation-builds` | Container image and reproducible build staging |
| Secret Manager | `generation-openai-api-key`, `generation-supabase-url`, `generation-supabase-service-role` | Server-only worker environment; transferred without printing values; worker-only accessor bindings |

Cloud Build `ead95d9f-abfa-4955-b79b-2785214da000` succeeded; deployed image digest is `sha256:6e44e0c1f3f96c572607c081f3783625724ab65a1b1eee1260b26ac622c6b655`. The configuration is reproduced by `infra/google-generation/bootstrap.ps1`, `Dockerfile`, `cloudbuild.yaml`, `deploy.ps1` and `scripts/stage-google-generation.mjs`. The build context allowlists source; no `.env` or credential file was staged. Cloud Run secret bindings pin version 1. The existing OCR credential JSON was neither copied nor changed; Cloud Run uses its attached identity for Vision.

## Dispatch, durability and security

`GENERATION_BACKEND=google-cloud` selects Cloud Tasks and `GENERATION_BACKEND=vercel` selects the existing Workflow; the current production default remains Vercel. `workflow-dispatch.ts` respects a persisted backend on accepted jobs. `google-cloud.ts` sends only `{jobId, dispatchId}` with a deterministic task name and OIDC token whose audience is the worker origin. The owner, type, source and all privileged data are read from Supabase, never trusted from a task body. The worker HTTP entry is `scripts/google-cloud-worker.ts`; there is no unauthenticated invocation grant. An anonymous `/health` request received 403. The Cloud Run IAM policy listed the invoker service account only. Secret values are absent from the task body and report.

Applied forward migration `20260927052634_google_cloud_generation_foundation.sql` to linked Supabase `xfdbwfqtorelmurncyql`. It adds `google_cloud` execution selection and a random `google_dispatch_id`, plus service-role-only prepare/claim RPCs. Live catalog checks confirmed their grants and existing RLS was unchanged. The claim RPC atomically fences owner-linked state, dispatch ID, lease and attempt count. Terminal or cancelled jobs acknowledge; a busy live lease returns a retriable response. Completion uses existing owner-safe RPCs and unique result/artifact relationships. The same source-attachment and Library mechanisms are used by both backends. Provider calls are reserved in a checkpoint before OpenAI; a validated response is saved. If a call's outcome is ambiguous, execution fails safely instead of repeating a possibly billable call. The worker checks cancellation and lease ownership before extraction/OCR, before provider calls and before completion. A queued cancel and a running cancel both produced no result.

The worker service account is limited to its attached role, three secret accessor bindings and `serviceusage.services.use` needed by Vision; the dispatcher has queue enqueuer, not broad Cloud Tasks admin. The builder has build-specific access. Live Supabase security advisors exposed pre-existing warnings only; no B37 RPC was flagged. No service-role credential is sent to mobile. No secret value was printed in this report or committed.

## Fresh direct-cloud acceptance

The direct harness `apps/api/scripts/google-generation-acceptance.ts` used existing authenticated backend tooling to create fresh durable jobs, enqueue real Cloud Tasks, poll the owner-visible status contract, and inspect result, source, checkpoints and Library reopen. The tested material contains actual instructional content; no historical output was counted as fresh evidence. Times below are submission-to-terminal wall time, including queue wait.

| Source / generation | Result | Duration | Evidence |
|---|---:|---:|---|
| Text PDF, VPN lesson → Reviewer | **PASS** | 217.3 s | `b3aa9304-dec3-419c-b804-ec75025f84c9`; 15 inspected pages, 1 extraction chunk, 1 provider call, 2 claims after controlled lease failure, exactly 1 result, Library reopen |
| Scanned PDF, 16-page Journaling lesson → Reviewer | **PASS** | 87.1 s | `c0028347-8cce-4f88-8ea7-961f095e35a2`; 16 inspected pages, 4 OCR chunks, 6,758 assembled characters, 1 provider call, exactly 1 result, Library reopen |
| FL100 instructional DOCX → Reviewer | **PASS** | 48.0 s | `66bcb3f1-7fb3-4a32-87f1-e1b934696dbd`; normalized source, 1 provider call, 1 result, Library reopen |
| Android-environment PPTX → Reviewer | **PASS** | 22.2 s | `7a497c6f-1cab-43cd-8b13-057efbf0b704`; normalized source, 1 provider call, 1 result, Library reopen |
| “The Systems Analyst” Canvas Page → Reviewer | **PASS** | 28.4 s | `b04102bd-082e-447d-9541-012c8f20f1da`; eligible Page source, 1 provider call, 1 result, Library reopen |
| Reviewer-derived VPN Quiz | **FAIL** | 29.8 s | `b4fa35f0-8c23-4544-af53-8788e81e6043`; two completed provider responses failed existing quiz source validation/repair; `quiz_generation_failed`, 0 artifacts |
| Android Versions assignment → Activity | **PASS** | 12.8 s | `7b2eea9e-43f6-4357-8868-765a67808f26`; assignment routed as Activity, 1 provider call, 1 result, Library reopen |

The DOCX and PPTX were normalized by existing API-side ingestion before queueing; the Cloud Run worker consumed their durable accepted jobs. The scanned PDF exercised the heavy post-acceptance inspection/OCR path inside Cloud Run. Successful persistence is not a claim about manual content quality beyond existing validation.

### Failure, cancellation and replay

The VPN run deliberately held a lease for the first delivery. Cloud Run logged 503 for the busy delivery; Cloud Tasks delivered it again and the job succeeded on attempt 2 with one provider call, one result and one artifact. The first harness observation incorrectly expected a Cloud Tasks `responseCount` for this `UNAVAILABLE` delivery and timed out with `acceptance_first_retry_not_observed`; subsequent durable state and Cloud Run request logs establish the retry. A separate terminal duplicate-delivery replay script was prepared but **not executed**: automatic approval review reached its usage limit and rejected the network action before it ran. Thus terminal replay remains unproven live; database fencing and focused automated tests cover it locally.

A queued cancellation `20d6808e-106c-46ea-9d87-121a03399030` reached `cancelled` with 0 claims/results. A running cancellation `23ba9af0-a8af-4a58-b27a-d4f86ce1e82d` reached `cancelled` after 1 claim with no provider checkpoint/result. A controlled malformed-source job `4c0fc214-ab7f-4a4b-a71c-c95c1a934015` reached `failed`, safe code `google_generation_interrupted`, retryable user message, 0 result and 0 provider calls. These failures did not expose secrets.

### Resource observations

The seven generation trials above made **8 claimed executions** (VPN twice; all other jobs once), plus one running-cancel and one malformed-source claim; the queued cancel made none. The sampled Cloud Run request-log window contains 5 task requests (3 × 204 and 2 × 503), so it is not a complete request count for the acceptance suite. Cloud Tasks enqueue operations cover the seven generation jobs plus three control jobs; the unexecuted replay added none. No provider call was needed for either cancellation or malformed-source test. Checkpoint counts show Reviewer 1 each on five successful sources, Quiz 2, Activity 1: **8 observable OpenAI invocations** total. The scanned PDF has 4 durable OCR chunks and 16 inspections; Google Vision billable call/page counts were not separately exported. Sampled worker RSS ranged 116.8–679.3 MiB, below the 2 GiB configuration; this is a sampled process measure, not peak platform memory. Google billing cost was not retrieved and no dollar estimate is asserted.

## Verification and remaining cutover conditions

| Command / suite | Result |
|---|---|
| Full API tests | 981 passed, 3 existing opt-in skips across 97 files |
| Google-specific tests | 27/27 pass, including claim/dispatch/provider fencing |
| Canvas suite | 73/73 pass |
| Provider contract suite | 19/19 pass |
| Engine evaluations | 606/606 pass with `node --import tsx`; plain `npm run test` has the existing Node 24 ESM/TS import resolution failure |
| Forced root typecheck and lint | 7/7 workspaces pass each; four existing mobile lint warnings |
| API production build | Pass, including Workflow compilation |
| `git diff --check` | Pass after final whitespace correction |

Current Vercel production routing and the deployed API were not changed. Google dispatch from **Vercel** is not production-ready: `google-cloud.ts` supports ADC/workload identity, but no Vercel-to-Google workload identity federation or equivalent credential path has been configured for `generation-dispatcher`. Direct acceptance used an authenticated local gcloud identity. The Cloud Run deployment is pinned to the built image; any subsequent source changes require rebuilding before production use. Vercel Functions Storage capacity still needs clearance for a B38 API deployment. Quiz has no successful fresh Google-backed run, and the controlled terminal replay was blocked. These conditions prevent `READY FOR B38 CUTOVER` and preserve the existing Vercel Workflow rollback path.

**Exact B38 action:** first obtain a fresh successful Quiz run through Cloud Tasks and verify its saved artifact; execute the terminal duplicate replay; configure and verify Vercel dispatch identity using workload identity federation without a static key; clear the Vercel deployment capacity issue; rebuild/deploy the reviewed image and recheck health/security. Only then switch `GENERATION_BACKEND` on a new Vercel deployment under the B37 cutover rules, with Vercel Workflow retained for rollback.
