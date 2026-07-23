# ADR-013: Production processing worker deployment target

Status: recommended and configuration-ready; not deployed

## Recommendation

Keep the Next.js API on its existing Vercel project and deploy one separate
Railway service for the continuously polling Node worker. Start on the paid
Hobby plan with one replica, concurrency 2, serverless sleep disabled, and an
`Always` restart policy. Move to Pro or a second replica only after measured
queue age/provider capacity justifies it.

This is the smallest change to the current architecture: Postgres remains the
queue, Supabase remains the source of truth, and the worker runs the same
`claim_processing_jobs_v2` lease boundary already verified locally. Railway's
current paid plans support configurable restart policy; Hobby has a USD 5
minimum that includes the first USD 5 of usage. The repository includes
`railway.worker.json` with the exact start command and restart behavior.

## Considered targets

| Target | Fit | Decision |
|---|---|---|
| Railway service | continuous arbitrary Node command, paid `Always` restart, usage caps/alerts, simple monorepo deploy | recommended |
| Render background worker | purpose-built continuous worker and zero-downtime deploys, but no inbound health checks on background workers and no free worker tier | viable fallback |
| Fly Machine without services | low-cost small VM and explicit restart policies, but more container/lifecycle/region operations for this team | viable when deeper infrastructure control is wanted |
| Vercel Function | current function duration is shorter than the 30-45 minute job envelope and cannot own a continuous poll loop | rejected |
| Vercel Workflow | durable steps may be a future fit, but adopting it changes execution/replay semantics and needs a separate migration and fault-injection validation | deferred |

Official references:

- Railway [pricing](https://railway.com/pricing), [restart
  policy](https://docs.railway.com/deployments/restart-policy), and
  [configuration reference](https://docs.railway.com/config-as-code/reference)
- Render [background workers](https://render.com/docs/background-workers) and
  [health checks](https://render.com/docs/health-checks)
- Fly [Machine lifecycle guidance](https://fly.io/docs/machines/guides-examples/managing-machines-with-the-api/)
  and [resource pricing](https://fly.io/docs/about/pricing/)
- Vercel [function duration limits](https://vercel.com/docs/functions/configuring-functions/duration)

## Railway service settings

- Source: this Git repository and production branch.
- Config file: `/railway.worker.json`.
- Root/build context: repository root, because the API imports other npm
  workspaces.
- Install/build: Railway Railpack with the root `package-lock.json`.
- Start: `npm run worker --workspace @stay-focused/api`.
- Replicas: 1 initially.
- Region: the closest available region to the Supabase project/provider path.
- Restart: `Always`; deploys must allow SIGTERM graceful drain.
- Serverless sleep: disabled. A database-polling worker has no inbound request
  that could reliably wake it.
- Resource and monthly usage limits: set both alert and hard ceiling before
  enabling production traffic.

Required secrets:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `OPENAI_API_KEY`
- `GOOGLE_CLOUD_PROJECT_ID` and `GOOGLE_CLOUD_CREDENTIALS_JSON` (or the
  equivalent supported Google project/credential pair)

Operational values:

- `PROCESSING_WORKER_CONCURRENCY=2`
- `PROCESSING_WORKER_BUILD_REVISION=<deployed git SHA>`

No Expo public variable, Supabase anonymous key, Canvas user token, source
content, or local credential file belongs in this service.

## Deploy and rollback checklist

1. Apply and verify all Supabase migrations before starting the new worker
   image.
2. Run the full repository verification matrix and `worker:once` against the
   target development environment.
3. Configure Railway secrets, cost ceilings, one replica, and the config file.
4. Deploy with no user traffic and confirm a fresh
   `processing_worker_heartbeats` row updates while idle.
5. Submit one extraction and one reviewer job from a non-sensitive fixture;
   confirm terminal publication, artifact provenance, and aggregate metrics.
6. Simulate termination during a claimed job, wait past the lease, and confirm
   recovery by the replacement process without duplicate artifacts.
7. Enable production traffic gradually and alert on heartbeat age, oldest
   queued age, failure/rate-limit spikes, cleanup backlog, and usage ceilings.

Rollback is to stop the Railway service and redeploy the previous worker image.
Do not roll back an already-applied additive migration. Jobs remain durable in
Supabase and can be resumed by the last compatible worker. The worker/API
release must keep backward-compatible readers during mixed-version deployment.

## Cleanup scheduling

The same platform may run
`npm run cleanup:processing --workspace @stay-focused/api -- --execute` on a
daily schedule, with the explicit cleanup confirmation secret set only on that
scheduled service. Run dry-run first and alert on backlog before enabling
deletion. Never attach cleanup execution to a request route or the continuously
polling worker startup.

## Remaining blocker

No Railway project or production secrets were available in this task, so no
external deployment was created. Production readiness remains partial until
the checklist above is executed and observed.
