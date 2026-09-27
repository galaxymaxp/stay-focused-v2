# B38 Google generation cutover readiness (2026-09-27)

**READY FOR CUTOVER — WAITING FOR VERCEL DEPLOYMENT CAPACITY.** Google generation, Quiz, terminal redelivery and short-lived Vercel dispatch credentials passed. Production still routes through Vercel Workflow. No Vercel production deployment, backend switch, Android build or EAS build was made. The active API `/api/health` returned 200 with version `2.0.0`. The user-reported Vercel Functions Storage pressure was about 10 GB / 10 GB; `vercel usage` returned `Costs not found (404)` on this Hobby team, and the available project API did not expose a current deployment-storage meter. Capacity therefore was not positively verified, so the one permitted production cutover deployment was not attempted.

## Starting state and B37 blockers

Branch `b25-3-3-ai-first` at `60895a6b084445a82674ee83a2ef362bac7cee6d`, clean. The unrelated sibling checkout was untouched. B37 had passed text/scanned PDF, DOCX, PPTX and Canvas Page Reviewers, Activity, retry, cancellation, private worker and Supabase persistence. Its fresh Quiz failed, terminal duplicate replay was not run, Vercel dispatcher identity was open, and the worker was revision `generation-worker-00001-7pz`.

| Blocker | Starting status | B38 result |
|---|---|---|
| Quiz | Failed source-validation contract | Fresh five-question Quiz succeeded and reopened |
| Terminal replay | Not run | Quiz and B37 text PDF terminal dispatches acknowledged with unchanged persisted state |
| Vercel → Google auth | Open | Vercel OIDC → Google workload identity federation → scoped dispatcher SA; authenticated enqueue passed |
| Worker image freshness | Review | Rebuilt and redeployed from current allowlisted source; revision recorded below |

## Quiz failure and bounded repair

B37 job `b4fa35f0-8c23-4544-af53-8788e81e6043` used an existing owner-linked VPN instructional Reviewer, not a course outline. Its saved source checkpoint held ten instructional regions, approximately 8,000 characters, with stable IDs and owner linkage. Both OpenAI responses had the requested five questions and schema fields, but question 5 was marked `multi_select` with **one** correct option. The second response was a repair and failed the same `q5:answer_key` rule. The first used combination choices (each choice described a set of statements), which naturally require one selected combination; the repair still supplied only one answer. The cited source supported the underlying VPN facts. The observed defect was a prompt/type mismatch, rather than fabricated facts, missing source assembly, or a Cloud Run serialization change. The same shared generation and validation functions are used by the existing Vercel path. Saved provider responses arrived intact; the existing validator correctly rejected them.

The prompt now requires independently assessable multi-select options, at least two supported correct choices, and a single-select question when only one option is supported. A combination-choice question is explicitly single-select. A regression test checks both the instruction and rejection of the failing shape. `validateQuizSet` and source-reference enforcement remain unchanged; no unsupported output is admitted to make acceptance pass.

## Fresh Google Quiz and Library acceptance

After explicit owner approval for one instructional-source Quiz, fresh job `de2694fe-29c1-4c32-9dac-ccf4028ff85d` ran through the actual Cloud Tasks queue and private Cloud Run worker. It used the Vercel OIDC federation dispatcher in a controlled server harness, loaded the owner-linked VPN Reviewer source, made one OpenAI provider call, passed the existing source validator, persisted once in Supabase, and reached `succeeded` with `attempt_count=1`. The worker claimed it at 06:32:11 UTC and completed at 06:32:33 UTC. The first authenticated enqueue attempt returned a generic failure during IAM propagation; the same queued job was resumed after credential verification, without creating a second job.

Result count is one; `quizzes` has one owner-matching row `a4930fba-e8d9-4221-aae7-74537eb7abad`; Queue state is completed; the Library lists and reopens `quiz:a4930fba-e8d9-4221-aae7-74537eb7abad` as a Quiz. Quiz identity is stored in `quizzes`, so zero `generated_artifact_versions` rows is expected. The acceptance harness initially assumed a Quiz version row and reported an integrity failure **after the job had succeeded**. That assertion was corrected to the actual data model, and a read-only evidence rerun passed. Manual review of all five saved questions against the source regions found supported answers, explanations and distractors; the multi-select question has three independently supported correct options. No old Quiz output was used as acceptance evidence.

## Terminal duplicate delivery

The replay harness creates a new task with the exact terminal `jobId` and `dispatchId`, observes its authenticated acknowledgement, and snapshots status, attempts, source ID, result IDs, artifact IDs and checkpoint timestamps/provider-call counts before and after. It does not create a new generation job.

| Completed job | Acknowledged | Provider calls | Result/artifact rows | Durable state |
|---|---|---|---|---|
| B38 Quiz `de2694fe-29c1-4c32-9dac-ccf4028ff85d` | Yes | 1 → 1 | 1 result, 1 Quiz → same IDs | `succeeded`, attempt 1, source ID and all checkpoints unchanged |
| B37 text PDF `b3aa9304-dec3-419c-b804-ec75025f84c9` | Yes | 1 → 1 | 1 result, 1 Reviewer version → same IDs | `succeeded`, attempt 2, source ID and all checkpoints unchanged |

The text PDF replay also showed no extraction/OCR checkpoint change. These snapshots prove zero new recorded provider calls, results, artifacts, source attachments or status mutations for these terminal redeliveries.

## Vercel authentication and Google IAM

The API uses `@vercel/oidc` to obtain a request-scoped Vercel token. `google-auth-library` exchanges it through Google STS and impersonates `generation-dispatcher@stay-focus-492811.iam.gserviceaccount.com`. No JSON private key is used for generation dispatch. The existing OCR credential remains separate. The WIF pool is `vercel-generation`; provider `vercel` accepts issuer `https://oidc.vercel.com/galaxymaxps-projects`, audience `https://vercel.com/galaxymaxps-projects`, exact Vercel team/project IDs, and only production or development environment claims. The service-account trust binding is restricted to the exact **production** subject `owner:galaxymaxps-projects:project:stay-focused-v2-prototype:environment:production`. A temporary development-subject grant enabled the controlled live dispatch test and was removed afterward; final policy inspection found only the production WIF subject.

The dispatcher has `roles/cloudtasks.enqueuer` on the `generation` queue and `roles/iam.serviceAccountUser` on `generation-invoker@stay-focus-492811.iam.gserviceaccount.com` only. It has no project-wide grant. Cloud Tasks attaches that invoker identity to the private Run request. The invoker alone has `roles/run.invoker` on `generation-worker`; the worker runs as `generation-worker@stay-focus-492811.iam.gserviceaccount.com` with scoped Secret Manager access. The controlled authenticated enqueue passed end to end: Vercel-origin token → STS → dispatcher impersonation → Cloud Tasks → OIDC Run 204 → successful worker claim → completed Quiz. Production subject trust is configured but production API generation routing is still Vercel Workflow.

The nine nonsecret production Vercel environment **identifiers** are configured: `GOOGLE_CLOUD_PROJECT_ID`, `GOOGLE_GENERATION_REGION`, `GOOGLE_GENERATION_QUEUE`, `GOOGLE_GENERATION_WORKER_URL`, `GOOGLE_TASKS_INVOKER_EMAIL`, `GOOGLE_WIF_PROJECT_NUMBER`, `GOOGLE_WIF_POOL_ID`, `GOOGLE_WIF_PROVIDER_ID`, `GOOGLE_GENERATION_DISPATCHER_EMAIL`. `GENERATION_BACKEND=google-cloud` was not set. The existing `PROCESSING_EXECUTION_BACKEND` and other production secrets were not changed.

## Infrastructure, security and verification

Project `stay-focus-492811`, Tokyo `asia-northeast1`; Cloud Tasks queue `generation`; Cloud Run service `generation-worker`, final revision `generation-worker-00003-s2b` serving 100% of traffic. Cloud Build `10cd1325-a99c-4a26-a919-0d0a9659433f` succeeded from the final allowlisted source, and the deployed image is pinned to `sha256:2ec82af74cbf6d8833608f7fd530bc7d1390a52956536cc6652a200e7715eb8c`. The staging excludes `.env`, `.local`, `.vercel`, `node_modules`, generated output and secret files. Secret Manager contains `generation-openai-api-key`, `generation-supabase-url`, and `generation-supabase-service-role`; access is worker-only, bound at secret version 1. Enabled relevant APIs include Artifact Registry, Cloud Build, Cloud Tasks, Cloud Run, IAM Credentials, STS, Secret Manager and Vision. Cloud Run is configured for 1 CPU, 2 GiB, concurrency 1, 0–2 instances, 1800-second timeout. On the final revision, anonymous `/health` returned 403 and the terminal duplicate Cloud Task returned 204; the Quiz replay remained unchanged. Its 12 current log entries contained no configured secret value, bearer token, private key, or OpenAI key pattern. Queue payloads contain only job and dispatch UUIDs, not source text or credentials. The owner ID is derived server-side from the durable job and owner-linked Supabase rows.

| Gate | Result | Evidence |
|---|---|---|
| Google generation, Quiz, duplicate replay, persistence | Pass | Above; B37 format matrix remains historical evidence |
| Retry, cancellation, idempotency | Pass | B37 lease/cancellation controls plus B38 terminal replay |
| Authenticated dispatch and private worker | Pass | WIF live enqueue, Run 204, anonymous 403, scoped IAM |
| Secrets, owner scope, payload, logs | Pass | Secret bindings and IAM, durable owner rows, small queue body, bounded log scan |
| API tests | Pass | 97 files, 983 passed, 3 existing opt-in skips |
| Provider contract, Canvas, engine evals | Pass | 19 contracts, 73 Canvas tests, 606 evals with `node --import tsx` |
| Root typecheck and lint | Pass | 7/7 each; lint has four preexisting mobile import-order warnings |
| API production build and diff check | Pass | Build completed; `git diff --check` clean |
| Vercel deployment capacity | **Unverified** | CLI usage 404, no current meter; user-reported pressure near 10/10 GB |

The unmodified `npm run eval` command still hits the documented Node 24 ESM/TypeScript import-resolution error; invoking the compiled eval runner with `node --import tsx` passed 606/606. This is the same runner workaround recorded in B37 and is unrelated to the B38 change.

## Cutover decision and rollback

Gates 1–16 pass on the recorded B37/B38 evidence. Gate 17, verified deployment capacity, is open. Thus no production routing change, Vercel deployment, or production smoke test was attempted. The running production API and Vercel Workflow remain intact. Once capacity is positively confirmed, deploy one intentional production version with `GENERATION_BACKEND=google-cloud`, check `/api/health`, and run one small real instructional generation through the production API to the completed Library artifact. If that smoke fails, set `GENERATION_BACKEND=vercel` on the rollback deployment; retain Google resources and all evidence. Do not delete the current production deployment or Workflow code.

No database migration was added in B38. No EAS or Android build was consumed.
