# ADR-017: Incremental, Resumable Canvas Synchronization

Date: 2026-07-28

Status: Accepted

## Context

Phase 5F.1 moved selected-course content and grade synchronization behind an
HTTP 202 server-owned job boundary. A single durable workflow step still had
too much work: large courses could repeat full traversals after interruption,
provider rate limits were difficult to honor without occupying a function, and
the app could not explain which course areas were current.

Canvas is an external source with partial visibility. A missing page after a
timeout, permission response, pagination loop, or truncated traversal is not
proof that a previously synchronized item was deleted.

## Decision

`canvas_sync_jobs` remains the owner-scoped logical job. Service-owned
`canvas_sync_job_units` divide it into deterministic list-page, item-detail,
announcement, file, assignment, submission, and grade-summary operations.
Successful provider responses are committed to private staging before later
units are made available.

Vercel Workflow carries only job and unit identifiers. Every provider step
performs at most one Canvas request with the existing 15-second request
timeout. Atomic claims enforce no more than three active provider units per
Canvas connection and no more than two for grade jobs. Units use 90-second
leases; expired work is reclaimable.

Canvas 408, 429, and 5xx responses are retryable. A provider unit receives one
initial call and three bounded retries. `Retry-After` seconds and HTTP dates are
clamped between one second and five minutes and scheduled with durable Workflow
sleep, never an in-function delay. Parent jobs have three attempts and a
30-minute attempt deadline.

Cancellation is checked before claim, before provider access, after provider
access, and before promotion. Provider work already in flight may finish, but
its result cannot be staged or promoted after an accepted cancellation.
Promotion is a serialized short commit boundary; cancellation is no longer
accepted after that boundary begins.

## Incremental evidence and promotion

Stable identifiers, source `updated_at` values, normalized fingerprints, and
the previous item state are change hints. Missing timestamps never establish
that an item is unchanged. Page detail is reused only when all available
evidence agrees and the prior full detail still exists.

Modules, module items, pages, assignment groups, and assignments form one
atomic content core. Announcements, files, and grades are independently atomic.
A successful scope may advance while another keeps its last-known-good
snapshot and is marked stale or needing attention.

Deletion is inferred only after the entire scope traversal is authoritative.
Failure, timeout, permission denial, pagination repetition, or page-limit
exhaustion prevents deletion inference. Safe metadata is retained for locked,
unpublished, external, unsupported, and permission-limited items.

The job execution status and domain outcome are separate. A job may succeed
with `success`, `unchanged`, or usable `partial`; complete lack of a usable
promotion fails the job.

## Persistence, authorization, and retention

Units, staging, scope health, and item evidence have RLS enabled with direct
anonymous and authenticated access revoked. Service-role code exclusively
mutates them. Authenticated clients receive aggregate health through
owner-checked API routes.

Private staging and cursors are deleted immediately after success or
cancellation. Failed staging expires after 24 hours and is purged in bounded
batches during future plan initialization; an operational scheduled invocation
can later make the exact purge time deterministic. Sanitized unit audit
metadata remains for the existing 30-day job/idempotency window.

Retry keeps the same logical job and increments its job attempt on claim.
Compatible successful units with unexpired staging are reused. Expired staging
or a checkpoint-version mismatch rebuilds the plan.

## Mobile behavior

Expo Go keeps only safe active-job references and reconciliation metadata.
Totals remain nullable until discovery is complete. The course UI shows
overall and content, announcements, files, and grades health; `partial` is
displayed as completed with areas needing attention.

Synchronization remains explicitly manual. Backgrounding, reload, lost
polling, and temporary phone disconnection do not cancel an accepted job.
Native background upload and remote push remain outside this phase.

## Consequences

The workflow performs more small database transactions and Workflow steps, but
can recover at deterministic boundaries and avoids replaying successful Canvas
work. Last-known-good academic data is favored over destructive inference.
Operational dashboards can use aggregate job and scope health without exposing
private academic content.
