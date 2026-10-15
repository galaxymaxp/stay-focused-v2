# AG2 execution contexts

Repository audit: 2026-10-13, initial audit HEAD `f79bc18`, resumed code HEAD `61adbae`. **STEP 0 complete; local implementation and gates PASS.**
R1.4 pending. Statements below describe repository code and deployment scripts;
live production state is UNVERIFIED (owner to confirm).

| Question | Vercel request route | Vercel cron route | Google sync worker | Google generation worker |
|---|---|---|---|---|
| Has `CANVAS_TOKEN_ENCRYPTION_KEY`? | Canvas decryption requires it; live presence unverified. | Poll decrypts with the same helper; live presence unverified. | Not provisioned by worker deploy script; uses Vercel token broker. | Same deployment, no encryption key provisioned; consumes staged generation input. |
| Has Supabase service role? | `createCanvasServiceClient` requires URL/service key; live presence unverified. | Same service client. | Supabase URL/service key provisioned as secrets by worker deploy script. | Same worker deployment and service client. |
| Can request content sync (function/client)? | Actual durable course route calls `createCanvasSyncJob(serviceClient, { userId, courseId, jobType: "course_content", idempotencyKey })`, then awaits `dispatchAcceptedCanvasSyncJob`. Named account route instead runs inline sync. | Calls the same functions with service client and claimed course user ID after successful complete module evidence. | Functions have no user-request dependency, but handler executes existing sync jobs rather than admitting them. | Same server code capability; generation handler does not admit content syncs. |
| Can dispatch Google tasks (environment/IAM)? | Task config requires `GOOGLE_CLOUD_PROJECT_ID`, `GOOGLE_GENERATION_REGION`, `GOOGLE_GENERATION_QUEUE`, `GOOGLE_TASKS_INVOKER_EMAIL`, `GOOGLE_GENERATION_WORKER_URL`. Vercel uses OIDC federation/dispatcher impersonation. | Same config and OIDC path in its HTTP request; live environment/IAM unverified. | Worker deploy supplies task config; dispatch uses worker ADC. AG1 awaits generation dispatch. | Same worker ADC/task config; handler executes accepted generation work. |
| Can `after()` run? | Next.js request lifecycle supports it; durable content-sync dispatch does not use it. | Next.js HTTP request lifecycle supports it; sync admission can await dispatch directly. | No Next.js request lifecycle. AG1 disables scheduling and awaits durable dispatch. | No Next.js request lifecycle; cannot rely on `after()`. |
| Max duration? | Durable course-sync route: 30 s. Named inline account-sync route: 60 s. | Route 300 s; internal deadline 260 s, reserving 65 s after metadata polling. | Cloud Run/Cloud Tasks configuration 1,800 s; sync loop budget 25 minutes. | Same Cloud Run/Cloud Tasks 1,800 s configuration. |
| User identity / ownership? | Server verifies Supabase bearer JWT; service-client admission filters course by user ID, then owner-scoped RPC admission. | Cron secret authorizes route; service-only course claim supplies stored user ID. Admission must use that owned course and identity. | Cloud Run IAM, job/dispatch IDs, claim RPC and worker lease fence work; broker returns only the claimed job token. | Cloud Run IAM and processing-job claim/dispatch fencing; result persistence uses claimed job owner. |

Vercel federation additionally requires `GOOGLE_WIF_PROJECT_NUMBER`,
`GOOGLE_WIF_POOL_ID`, `GOOGLE_WIF_PROVIDER_ID`, and
`GOOGLE_GENERATION_DISPATCHER_EMAIL`. IAM must allow federation/impersonation,
Cloud Tasks enqueue, invoker service-account use, and private Cloud Run invocation.
Scripts describe intended configuration; deployed grants are unverified.

## Admission path confirmed

The owner corrected the inline-route reference on 2026-10-13. Use
`apps/api/app/api/canvas/courses/[courseId]/sync/route.ts` ->
`createCanvasSyncJob` in `canvas-sync-jobs/repository.ts` ->
`dispatchAcceptedCanvasSyncJob` in `canvas-sync-jobs/google-dispatch.ts`.
It returns HTTP 202 after awaited Cloud Tasks dispatch. Both functions accept a
service client; creation takes explicit user/course IDs and checks ownership.
Neither requires a user request or `after()`. No missing request-independent
admission capability was found. The prior route question is answered; continue.

## STEP 0 decisions (local code audit complete)

- Before AG2, `verifyBearerToken` verified tokens without recording authenticated API activity.
  Jobs, sync requests and preference edits are selective actions, not a reliable
  latest authenticated API activity signal. AG2 adds a service-only per-user activity
  table and an hourly conditional upsert after successful bearer verification.
- Metadata apply stores course `fingerprints` JSON. Poll hashes `payload.modules`
  for its modules scope, while items are in separate `payload.moduleItems`.
  Fingerprints do not retain item IDs, so cannot distinguish new File/Page items.
  Use the permitted service-only marks table. First successful module inventory
  baselines all IDs; subsequent complete inventories compare File/Page IDs.
  Failed module scopes never replace marks. Changed existing IDs are not new.
- AG1 candidate `processing_job_id` links to `processing_jobs`; canonical reviewer
  versions retain `generation_job_id`. Owner-filtered joins support optional
  `origin` in job status views and Library summaries without a jobs column.
  Mobile parsers accept additive fields; preserve and validate the optional enum.
- Cloud Scheduler state: **UNVERIFIED (owner to confirm)**. Current documents say
  Scheduler/Resend inactive; no remote check occurred.
- Live revisions, migration state, environment presence and IAM:
  **UNVERIFIED (owner to confirm)**. R1.4 remains pending.

Evidence: the routes/libraries named above, `notifications/canvas-poll.ts`,
`auth.ts`, `canvas-db.ts`, `processing-jobs/google-cloud.ts`,
`canvas-sync-jobs/google-worker.ts`, `auto-reviewers/admission.ts`,
`infra/google-generation/deploy.ps1`, and migrations
`20261003025905_canvas_notification_sync.sql` and
`20261012000000_canvas_auto_reviewers.sql`.

## Implemented behavior and limits

`canvas_auto_reviewer_poll_marks` stores all item IDs from each successful,
complete module inventory independently of hashed scope fingerprints. A missing
mark baselines current material; it requests nothing. Failed module scopes and
failed metadata applies never replace marks. Changes to existing IDs request
nothing. Other scope failures do not discard a complete modules scope.

`reserve_canvas_poll_sync_v1` uses a per-user transaction advisory lock and
server time to check owned selected courses on active connections, preferences,
7-day activity and rolling 6-hour/24-hour limits. A missing activity record fails
closed until a verified API request. Reservations conservatively consume budget
on admission/dispatch failure. Marks represent observed inventory even when an
owner is inactive, disables automation or hits a cap; these observations are not
queued for later backfill. A later new item or an explicit Sync can revisit
AG1's pending candidates. No preparation/generation occurs inside the poll.
The deterministic request key is `poll-sync:{courseId}:{6-hour bucket}`.

Origin comes from owner-filtered candidate receipts through the processing job
and canonical artifact version's `generation_job_id`. An optional status field
keeps older clients compatible; Mobile validates its enum. No job-origin column
or reviewer-text changes were added. The existing token broker and worker
admission/dispatch paths are reused without worker-code edits.

FRESH local gates: forced typecheck and lint 7/7 each (0 cached, 4 existing lint
warnings); API 1,450 passed/3 skipped; mobile 861 passed; API build 35 pages,
16 steps/1 workflow; Android export 1 bundle, 3,450 modules, 31 assets; diff check
0 errors. Live runtime claims remain UNVERIFIED (owner to confirm).
