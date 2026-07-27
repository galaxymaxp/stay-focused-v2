# ADR-016: Vercel Workflow processing prototype

Status: implemented and database-migrated; hosted and physical-device
acceptance pending

## Decision

The no-spend prototype hosts the Next.js API and durable processing executor in
one new Vercel Hobby project named `stay-focused-v2-prototype`. The existing
Vercel project named `stay-focused` is V1 and is explicitly out of scope.
Supabase remains authoritative for jobs, private source objects, checkpoints,
results, ownership, cancellation, idempotency, and terminal events.

Vercel Workflow DevKit 4.3.1 supplies the durable orchestration boundary. API
creation returns HTTP 202 only after the source/job is persisted and Vercel has
accepted a workflow run. The workflow run ID is attached to the job for
operations and is never an authorization credential. A start failure becomes a
safe, retryable dispatch failure. Replaying the same user/idempotency key may
re-attempt only that dispatch failure on the same job; provider and processing
failures retain their established retry rules.

The polling Node worker remains available for local development and Railway,
but its claim and stale-recovery functions are restricted to
`execution_backend = 'database_worker'`. A Vercel Workflow claims exactly one
workflow-backed job atomically by ID. These executors cannot race each other.

## Durable execution and replay

The workflow contains bounded steps for claim, preparation, independent OCR
chunks or reviewer sections, verification/retry, and transactional
finalization. Each provider call stays below the Vercel Hobby function limit:
OCR calls use the existing 45-second timeout, reviewer calls use the existing
120-second timeout, and concurrency is bounded at two.

Private intermediate data is stored in the service-only
`processing_job_checkpoints` table, not in Workflow event arguments or the
status API. Checkpoint keys are unique per job/unit. Replayed steps return an
existing valid checkpoint instead of republishing partial work. The result
transaction remains the only path that marks a job succeeded.

Workflow step arguments contain safe identifiers and unit/page numbers, never
source text, upload bytes, prompts, provider payloads, or reviewer content.
Safe logs contain a job ID, stage, outcome, and counts. Errors returned to
clients remain curated machine codes and messages.

The first workflow step attaches its own run ID before attempting the atomic
lease claim. This closes the race where Vercel accepts and begins a run before
the creation request finishes attaching the returned run ID. If API-side
attachment fails after `start()` succeeds, the request still treats the work as
accepted because the workflow repairs the attachment itself.

## Extraction behavior

The workflow uses the existing subject-neutral extraction implementation:

- embedded text is inspected page-by-page;
- scanned pages are divided into provider-safe groups of at most five;
- native, scanned, mixed, and blank pages retain original page mapping;
- chunk checkpoints store real completed units and safe diagnostics;
- missing, failed, duplicate, or malformed page output cannot be published as a
  complete extraction;
- normalization uses repeated page-edge/layout evidence and retains removal
  diagnostics; it has no topic vocabulary or fixture-specific correction.

The configured document limit remains 40 pages and the source limit remains
10 MiB. Direct private Supabase resumable upload remains the Vercel-compatible
path for mobile sources; the user must keep the app open until upload and
acceptance finish.

## Reviewer behavior

The workflow invokes the established generalized Stage 0-6 engine. Preparation
persists normalization, outline, and generation planning. Each planned section
has an independent checkpoint. Verification persists coverage, grounding, and
leakage reports, then only invalid or missing sections enter bounded retry
steps. Assembly validates and stores the final reviewer transactionally before
success.

No IT Security heading, vocabulary, institution, or fixture-specific prompt was
introduced. The same code processes biology, history, mathematics, prose,
headings, lists, and mixed academic source structures.

## Cancellation, leases, and recovery

The workflow holds a five-minute database lease and refreshes it before, after,
and periodically during a step. Every safe unit boundary checks the current job
state. An explicit cancellation changes the job to
`cancellation_requested`; subsequent provider output cannot be finalized and
the failure boundary converts the job to `cancelled`. An already-running
external provider request may finish before the next cancellation check.

Vercel replays failed workflow steps. Supabase checkpoints make successful
units idempotent across those replays. Maximum job attempts and overall
extraction/reviewer deadlines remain database policy. The polling worker's
stale recovery intentionally ignores workflow-backed jobs because Vercel owns
their replay lifecycle.

## Mobile and Expo Go

The mobile app stores only safe, account-scoped active-job references. Polling
runs only in the foreground. Backgrounding, timer suspension, network loss,
reload, and force-quit do not request cancellation. On launch or foreground
return, the app reconciles with the authenticated API, restores a completed
result, removes the consumed local reference, and shows a truthful in-app
notice:

- `Your text extraction is ready`
- `Your reviewer is ready`

Expo Go does not receive remote push for this prototype. The notification
outbox/device architecture remains for a later Android development APK or
Apple-enabled build. The notice appears only after the server reports a
persisted result; it is not a speculative local notification.

Local development keeps `EXPO_PUBLIC_API_BASE_URL=auto`, which derives the
current Metro LAN host and avoids a committed IP. Hosted Expo Go uses the
explicit Vercel HTTPS origin supplied to Metro. A Metro tunnel carries the
JavaScript bundle, not a local API; the hosted API removes the changing Wi-Fi
address from the processing path.

## Timeout hierarchy

- resumable upload: client-visible timeout and one-hour intent;
- job creation/acceptance: short mobile request and 45-second API budget;
- status polling: 10 seconds;
- result retrieval: 15 seconds;
- OCR provider unit: 45 seconds;
- reviewer provider unit: 120 seconds;
- workflow database lease: 300 seconds, refreshed every 60 seconds;
- extraction job deadline: 30 minutes;
- reviewer job deadline: 45 minutes.

Polling or result-request timeouts never cancel server work. No mobile request
waits for total OCR or reviewer duration.

## Hosting and limitations

Workflow 4.x runs in Vercel's `iad1` workflow region. Fluid Compute should be
enabled on the new project. Server-only Supabase, OpenAI, and Google credentials
belong only in Vercel environment variables. No Workflow CLI token is needed in
the Vercel runtime.

Vercel Hobby is acceptable only for this personal, non-commercial prototype.
Workflow is still a platform dependency and hosted fault/replay behavior must
be observed before physical-device handoff. Hobby usage may pause the
prototype; it is not guaranteed production capacity.

Expo Go cannot prove native background upload, terminated-app callbacks, or
push delivery. A development APK is required for those Android capabilities;
Apple push requires Apple developer credentials. Force-quitting prevents local
observation until reopening but does not cancel a source that was already
uploaded and durably accepted.

Local fallback still requires the laptop, API, database worker, and network to
remain available. Hosted validation must prove that jobs finish with the laptop
API, Metro server, and local worker stopped.
