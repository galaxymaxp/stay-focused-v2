# ADR-018: Durable processing jobs

Status: accepted foundation; production worker deployment pending

## Decision

Document extraction and reviewer generation are server-owned jobs. A mobile
request authenticates, validates and stages the source, creates a database job,
and returns HTTP 202 only after the source snapshot and job are durable. The
mobile connection is no longer the lifetime of the work.

The initial implementation uses Supabase Postgres as the queue and durable
state store, a private Supabase Storage bucket for uploaded PDFs/images, and a
separate Node worker process. It deliberately does not start an unawaited
promise in a Next.js route. The local worker command is:

```text
npm run worker --workspace @stay-focused/api
```

`worker:once` claims one bounded batch and then drains it, which is useful for
safe development and scheduled execution. A continuously available production
worker has not been deployed by this change, so the production reliability
classification remains partial until that deployment exists.

## Why

iOS may suspend Expo's JavaScript runtime shortly after the user switches apps.
A fetch connection can also disappear because of radio changes, process
eviction, authentication refresh, development reload, an intermediary timeout,
or a serverless request deadline. Extending a 120-second mobile timeout would
leave all of those ownership failures intact. Polling is an observation
mechanism; it cannot be the executor.

After HTTP 202, closing the connection, pausing polling, switching apps, or
losing the phone network does not mutate the server job. Only the authenticated
cancel endpoint records cancellation.

## Data model and ownership

The migration creates:

- `processing_job_sources`: immutable text snapshots or private Storage object
  references. Uploaded bytes never appear in list/status responses.
- `processing_jobs`: status, stage, real unit counts, safe message, timestamps,
  attempts, idempotency identity, result reference, and lease metadata.
- `processing_job_results`: a result payload and metrics inserted before the
  job can become `succeeded`.
- `processing_job_events`: notification-ready terminal events with no private
  source content.

IDs are random UUIDs. RLS restricts direct job reads to `auth.uid() = user_id`.
Authenticated users receive only `select` on the jobs table and no mutation
grant. Source/result/event tables remain service-only despite ownership RLS.
All writes, claims, heartbeats and finalization use service-role-only security
definer functions with explicit `search_path` and revoked public execution.
API routes repeat the ownership predicate even though they use a service role.

Do not put access tokens, provider credentials, complete source text, uploaded
bytes, complete reviewers, or provider payloads in job logs or status data.
Returned errors use stable codes and curated safe messages.

## State machine

Top-level states are:

```text
queued -> running -> succeeded
                  -> queued (bounded retry/backoff)
                  -> failed
                  -> cancellation_requested -> cancelled
queued -> cancelled
queued/running -> expired
```

Only a queued job can be claimed. Only its active lease owner can write worker
progress or finalize it. `succeeded`, `failed`, `cancelled`, and `expired` are
terminal. Completion inserts the result, links it, and changes the status in a
single database transaction. A cancellation request changes a running job away
from `running`, so result finalization is rejected even if an external provider
call returns afterward.

Extraction stages are `accepting_upload`, `inspecting_document`,
`extracting_native_text`, `preparing_ocr_chunks`, `extracting_ocr`,
`verifying_pages`, `assembling_text`, and `storing_result`.

Reviewer stages are `preparing_source`, `normalizing_source`,
`detecting_outline`, `planning_sections`, `generating_sections`,
`verifying_coverage`, `retrying_sections`, `assembling_reviewer`, and
`storing_reviewer`.

The UI shows stages and actual page/section counts. It does not convert stages
into a fabricated percentage.

## Idempotency and retries

Creation requires an 8-200 character safe idempotency key. Its scope is one
authenticated user. The server also stores a SHA-256 request fingerprint. A
replay of the same key and fingerprint returns the original job; the same key
with different work returns `processing_job_idempotency_conflict`. Equal source
content with different keys is intentionally not deduplicated.

Keys are retained with their jobs for at least the 30-day idempotency window.
The unique key is not reusable while the retained job exists. Routine retention
cleanup can delete expired historical jobs after product policy defines the
required result-retention period.

Automatic worker retries are attempts on the same job. They use exponential,
bounded backoff and stop at `max_attempts` or the job deadline. A user Retry
creates a child job linked through `retry_of_job_id` and reuses the immutable
source snapshot, so a prior result can never be silently overwritten.

## Worker leases and recovery

Claims use one `UPDATE` over candidates selected with `FOR UPDATE SKIP LOCKED`.
This prevents two workers from owning one queued job. The default worker
concurrency is 2 and is capped at 4. A claim has a 90-second lease; the worker
renews it every 25 seconds. Progress and finalization require the matching
worker ID and an unexpired lease.

Recovery runs on startup and during the polling loop. An abandoned running job
with attempts left is requeued after its lease expires. An exhausted job fails
terminally. An expired cancellation request becomes cancelled. A job past its
overall deadline becomes expired. Restart simulation for local development is:

1. start the API and worker;
2. accept a job and stop the worker process;
3. wait past the lease;
4. restart the worker and observe the same job requeued/claimed.

Graceful shutdown stops new claims and waits for claimed tasks. External
provider requests may not be immediately interruptible; cancellation is checked
between safe pipeline units, and database finalization still rejects a
cancelled job.

## API

The authenticated endpoint family is:

| Endpoint | Method | Behavior |
|---|---|---|
| `/api/jobs` | POST | Stage source, persist job, return 202 |
| `/api/jobs` | GET | List the user's active jobs without raw source |
| `/api/jobs/:jobId` | GET | Read owned status/stage/progress |
| `/api/jobs/:jobId/result` | GET | Read an owned successful result |
| `/api/jobs/:jobId/cancel` | POST | Record explicit cancellation |
| `/api/jobs/:jobId/retry` | POST | Create an idempotent child retry |

Extraction creation uses multipart form data. Reviewer creation uses JSON and
an immutable source-text snapshot. Canvas preview identity is validated and its
existing reviewer source snapshot is linked before the reviewer job is
accepted.

## Timeout hierarchy

Every layer has a named constant rather than one unexplained end-to-end number:

- source upload from mobile: 60 seconds; user must stay until acceptance;
- reviewer job creation: 20 seconds on mobile, 45-second route budget;
- status polling: 10 seconds;
- result retrieval: 15 seconds on mobile;
- OCR provider call: 45 seconds;
- generation provider call: 120 seconds;
- worker lease/heartbeat: 90/25 seconds;
- extraction deadline: 30 minutes;
- reviewer deadline: 45 minutes.

A polling/result timeout is retryable and never cancels a job. Provider timeout
and overall deadline codes are distinct. The provider SDK has a bounded retry
count, while job retry policy remains in the durable queue.

## Mobile reconciliation

SecureStore through the existing session storage abstraction keeps only job ID,
type, source display metadata, created time, last status, last check time, and
owner user ID. It does not keep bearer tokens, uploads, source text, or a whole
reviewer as temporary job state.

On app mount and each transition to foreground, the app restores local job
references, asks the server for active jobs, reconciles status, and retrieves a
successful result. Foreground polling runs every three seconds and stops when
the app is backgrounded. No JavaScript timer is assumed to run in the
background. Signing out does not affect the worker; signing back into the same
account restores access, while another account cannot read either local or
server-owned references.

Before 202 the UI says `Uploading source...` or that reviewer acceptance is in
progress and asks the user to keep Stay Focused open. After 202 it explicitly
says processing continues on the server and the user may switch apps.

## Extraction and normalization

The existing subject-neutral extraction engine remains authoritative. Native
PDF text is retained page-by-page, scanned pages use provider-safe five-page
OCR chunks, mixed documents merge in original order, blank pages stay explicit,
and missing/failed/duplicate page output fails completeness checks. The product
document limit remains 40 pages and the upload limit remains 10 MiB.

Normalization removes an exact top/bottom line only when it repeats on at least
three readable pages, appears on at least 60% of them, and has stable page-edge
placement. Evidence and removed-line fingerprints are retained in diagnostics.
Body repetition alone is not deleted. The normalizer preserves ordering,
headings, lists, short acronyms, terminology, citations and URLs, and performs
no domain spelling correction. No production rule contains IT Security,
institution, malware, networking, or fixture-specific vocabulary.

## Reviewer generation

The worker calls the same generalized Stage 0-6 pipeline. It persists source
characters, normalized characters, outline items, planned/final sections,
provider calls, retry count, stage timing, coverage, grounding, and leakage.
Cancellation is checked between stages and section calls. Coverage and
validation were not weakened to shorten execution.

## Expo and upload limitations

Expo Go can validate the important server-owned behavior: accept a job, switch
apps, let the laptop worker continue, reopen Expo Go, and reconcile. Expo Go
does not prove native background upload, background processing entitlements,
terminated-app callbacks, or production push delivery.

This implementation does not claim that a JavaScript upload survives iOS
backgrounding. The source must be fully staged and a job ID returned before the
UI says the user may leave. Reliable background `URLSession`, relaunch handling,
and richer OS integration require an Expo/EAS development build and dedicated
native configuration.

Terminal job events make push notifications possible without private content:
`Your text extraction is ready`, `Your reviewer is ready`, or a generic needs-
attention message. Push tokens, rotation, permission prompts, and delivery are
not implemented here and must be tested in a development build.

## Deployment and local limitations

For LAN testing, `EXPO_PUBLIC_API_BASE_URL` stays environment-driven. The
computer must remain awake, the Next.js API and separate worker must remain
running, the phone must reach the LAN address, and the database/provider must be
available. Force-quitting the app stops local observation but does not cancel a
job already accepted by the server.

Production requires a continuously available worker process or a verified
durable workflow runtime that invokes the same claim/lease boundary. Deploying
only the Next.js API is insufficient. Vercel request functions must not use
`void processJob()` after returning. Vercel Workflow DevKit is a possible future
durable executor, but it was not added to this foundation and should be adopted
only with production deployment and replay testing.

## July 2026 completion-repair validation

Two 32-page extraction jobs had reached `storing_result` and then exhausted
three attempts. The database functions used a deliberately restricted
`search_path`, while calling `digest(...)` without qualifying the extension
schema. In the linked Supabase project, `pgcrypto.digest` is installed as
`extensions.digest`, so result publication failed with SQLSTATE `42883`. The
phone connection and page extraction were healthy; the failure was inside the
transaction that publishes the result.

Migration `20260726214339_harden_processing_digest_and_retry_policy` qualifies
all three affected calls as `extensions.digest(...)` and preserves their fixed
security-definer search paths. It also separates:

- **manual retryability**, which controls whether the authenticated user may
  create a child retry after the service has been repaired; and
- **automatic retryability**, which controls whether the current worker should
  repeat an attempt without operator action.

Known database contract/configuration failures remain manually retryable but
are not automatically retried. This prevents a deterministic SQL error from
repeating expensive OCR or generation work. Transient repository/provider
failures retain bounded automatic retry behavior. Only a safe database code is
retained internally; raw database messages are not returned or logged.

Multipart extraction creation now carries an explicit validated `displayName`
field in addition to the file transport name. This prevents the platform
multipart encoder from turning a filename such as `Notes + Appendix.pdf` into
an encoded UI label, without guessing whether literal plus signs or percent
sequences should be decoded.

The repair was validated against the linked development project with:

- a neutral three-page extraction fixture covering biology, history, and
  mathematics, including replay of one idempotency key;
- deliberate client disconnect immediately after HTTP 202 followed by status
  and result reconciliation;
- source-revision publication and reviewer generation through the existing
  subject-neutral Stage 0-6 engine;
- a child retry of the previously failed 32-page extraction;
- explicit cancellation while a reviewer worker was running, with result
  publication rejected after cancellation; and
- remote catalog checks confirming fixed search paths and service-role-only
  execution for the repaired functions.

All of those checks passed locally. This does not change the production status:
the API, worker, and Expo server are running on the development laptop, but no
hosted continuous worker was deployed because the available Vercel and Railway
CLIs were not authenticated.
