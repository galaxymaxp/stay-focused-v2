# ADR-026: Durable eager Canvas material preparation

Date: 2026-10-14
Status: Accepted in code; migrations and rollout pending owner execution.

## Context

Canvas preparation previously meant only storing the original. Extraction and
canonical source blocks were built later by preview or Reviewer generation.
Students could open a synchronized lesson before its complete source was usable.
Automatic reviewers could prepare inline or admit a preview-text fallback.

The owner authorized preparation of every eligible new or changed material,
without a per-user cost cap. The existing selection boundary remains: exclude
announcements, deadline-bearing/submittable work, administrative material and
attachment-only files outside modules. Activity Maker retains its separately
validated attachment permissions. EP2 owns backfill and EP3 owns mobile UI changes.

## Decision

### Exact revisions and originals

One `canvas_material_preparations` row identifies an owner, course, material and
exact revision. A File revision uses the synchronized metadata fingerprint.
A Page revision hashes its complete raw HTML and the ordered IDs/fingerprints
of every resolved instructional attachment. Provider timestamps alone are
insufficient. Admission verifies owner, active connection, selected course and
current evidence, then atomically returns the existing row for an identical
revision. New revisions cancel active older work; historical prepared results
remain immutable.

Original reuse requires `stored`/`unchanged`, a valid original identity and an
exact fresh metadata fingerprint. The existing inventory RPC preserves those
states only when its previous and incoming fingerprints match. Changed metadata
sets `not_requested`, so retained bytes are downloaded again. Ingestion writes
use a compare-and-set on the fingerprint. Page attachment refreshes apply the
same invalidation. Deferred extraction must match the staged hash, size, bucket
and key before accepting current-source provenance. No extra ingested-fingerprint
column was needed.

All original replacement, failure and rollback cleanup keeps ADR-021's
`cleanupCanvasObjectIfUnreferenced` claim protocol. Preparation does not queue
Canvas originals for generic processing cleanup. A snapshot's historical bytes
remain retained; absence of proven identity denies reuse rather than relabeling
older bytes as current.

### Store, worker and acceptance

Forward-only migrations `20261014000000_canvas_material_preparation.sql` and
`20261014000100_canvas_preparation_orchestration.sql` add revision jobs, private
evidence/results, per-material attempt/suppression controls, sync receipts and
discovery recovery. Job states are `pending`, `running`, `prepared`, `failed`
and `cancelled`. Jobs have dispatch identities, lease tokens, cycle/lifetime
attempt counters, bounded execution deadlines, safe reasons and result IDs.

Mutation and RPC execution are service-only. RLS permits owner reads of safe
receipts/controls/guard state. Source text, extraction, private locators,
dispatch identities and fencing tokens are absent from owner-readable job
columns; evidence/results and batch receipts remain service-only. Explicit
grants cover each table/function, including helper RPCs.

`/tasks/canvas-preparation` claims a fenced job and obtains a Canvas token through
the existing Google IAM broker. The broker accepts only an opaque preparation
job/dispatch/worker/lease reference with a live lease/deadline and owned active
connection/selected course. It derives owner/course from the claimed row. The
worker receives no Canvas encryption key. Tokens never enter task payloads,
database rows or logs.

Dispatch awaits Cloud Tasks acceptance through the existing ADC helper, with a
stable task name per job/dispatch. Duplicate task acceptance reconnects the same
receipt. The acceptance timestamp is persisted afterward, permitting recovery
from interruption between enqueue and receipt persistence. Pending queue waits
have a bounded 24-hour deadline; claimed execution has 25 minutes and renewable
90-second leases. No `after()` scheduler is used for preparation.

The worker reuses ingestion, stored-file extraction, HTML/Office/text structuring
and the existing pure `buildCanvasPdfPageBlocks` helper. Extraction and complete
expected-page evidence, including explicit blanks, are persisted before
`prepared`. Missing, duplicate, failed or out-of-range pages deny publication.
Canvas PDF validation uses the existing `getConfiguredDocumentMaxPdfPages()`
default through `validatePdfOcrBytes`, preserving 40 total pages. Local durable
uploads remain 100 total / 40 OCR-required pages.

Completion verifies the live lease and exact source evidence while locking source
rows. Cancelled or changed work publishes no result. Reads verify the current
revision and original hash/size before returning persisted evidence. The worker
acknowledges only after durable completion and reconciliation; duplicate terminal
delivery re-runs reconciliation without extraction.

Provider failures carry a safe reason and full `Retry-After` into `available_at`
and the task schedule. The Canvas client keeps its existing five-minute
synchronous delay field and adds the full provider cooldown for durable work,
including binary downloads. There is one retry per admitted cycle, at most three
automatic attempts per material across cycles. Explicit student Retry resets
automatic accounting/suppression; lifetime accounting remains cumulative.

### Sync guard and recovery

Persisted content-sync success atomically creates an incomplete discovery wakeup.
The post-sync adapter reads the complete existing File/Page/placement eligibility
inventory independently of AG1 baseline, existing reviewers or its off switch.
Discovery failures persist a retryable backlog with bounded attempt accounting;
an incomplete inventory never becomes a plausible completed admission set.
Preparation failure never rewrites the persisted sync outcome.

The database ledger assigns batches of 25 and at most 200 jobs per sync or
subsequent poll cycle. Each batch boundary compares prepared+failed totals.
Expired assigned jobs record `stalled`, permitting a no-progress signal without
counting the timeout itself as productive terminal work. Intentional new enqueue
receipts for a material/revision already prepared/failed trip `repeat`; delivery
of an existing receipt is idempotent. Either signal persists `tripped` and
per-material suppression, preserves completed results and stops later batches.
Logs contain only material IDs and the fixed signal.

Overflow remains in unassigned durable receipts. A subsequent complete metadata
poll drains those receipts into its own bounded cycle without requiring a new
module item. Polling also recovers interrupted discovery and dispatch. All open
ledger/backlog reads use stable bounded pagination and fail closed on errors.
Guard inspection sends no email or notification.

### Consumers

Manual Prepare/ingest routes, Reviewer admission, Activity Maker and usable-content
readers share preparation admission and persisted result lookup. Existing response
shapes remain compatible: pending preparation is unavailable/not-ready, never
reported as a completed usable source. Existing mobile readiness mapping is
retained; EP3 owns the Prepare-button replacement.

AG1 candidates wait without spending generation attempts until their current
descriptor is prepared. Completion wakes pending candidates through the existing
leased admission path. Baseline, three-per-run, five-per-day and three-attempt
Reviewer limits remain ADR-019's rules. Prepared PDF and Page composite generation
carry the preparation job ID, reuse extraction without a second OCR, and preserve
accepted snapshot/hash checks. Unprepared new material has no preview-text fallback.

## Verification and operational inspection

Local PGlite tests execute both migration files: idempotency, claims, retry/terminal
stop/explicit Retry, full cooldown deferral, fencing/cancellation, owner RLS and
service grants. The real source-list fixture discovers 230 eligible owned Files;
the actual guard SQL completes 200, defers 30 and drains 30 in the next poll cycle.
Worker/cache/broker/orchestration tests cover complete native/blank PDF evidence,
no repeated OCR, opaque tasks, acceptance recovery, incomplete inventories and
automatic-candidate wakeup. This is local evidence, not concurrent remote-session
or deployed integration validation. Final fresh gate counts are in the EP1e handoff.

After rollout, check-ins may read these safe owner-scoped columns (query shown
for the owner to run; no remote SQL was executed by EP1e):

```sql
select id, course_id, sync_id, cycle_key, guard_state, signal,
       enqueued_count, batch_index, prepared_total, failed_total,
       deferred_count, inventory_complete, updated_at
from public.canvas_preparation_syncs
where user_id = auth.uid()
order by updated_at desc;

select course_id, material_id, automatic_attempts, suppressed
from public.canvas_material_preparation_controls
where user_id = auth.uid() and suppressed;
```

Live migrations, revisions, credentials, queue/IAM, Scheduler, inventories,
retained originals and CIT17 OCR/cost are UNVERIFIED (owner to confirm). Apply
both new migrations, deploy API and Google worker, confirm queue/IAM, then watch
the first CIT17 sync. Rollout and device checks were entirely skipped. RB2 owns
the realme sync-to-Ready device check.

## Backfill

EP1 already prepares older eligible inventory on the next successful content
sync and retains overflow for poll draining. It does not independently seed
pre-migration materials without discovery rows, and notification polling skips
completed/not-due/leased courses and unsuccessful provider metadata. EP2 closes
those gaps through a separate stage of the existing poll invocation, independent
of notification course claims and metadata success. Admission and token access
still require an active owned connection and selected course; inactive/unselected
courses become reachable when those conditions return. Current cancelled
revisions can resume below the existing automatic-attempt/suppression limits;
historical prepared revisions remain immutable and are never re-admitted.

Migration `20261014000200_canvas_preparation_backfill.sql` adds only a course
visit cursor/lease. Mutations and its claim RPC are service-only/security-invoker,
with explicit grants. Owner RLS exposes course/owner/last-visit columns, excluding
lease identities. Claims include completed workflows, select at most 20 courses
by oldest durable visit then course ID, and use 90-second leases with SKIP LOCKED.
Only visited courses advance their cursor; unused claims release without changing
visit order, and a crashed lease expires. This gives later courses a turn even
when the global budget or invocation deadline prevents visiting every claim.

Named constants in `canvas-preparation/backfill.ts` bound each invocation:
`BACKFILL_PER_COURSE_BUDGET=25`, `BACKFILL_GLOBAL_BUDGET=50`,
`BACKFILL_ROUND_ROBIN_QUANTUM=5`, `BACKFILL_COURSES_PER_RUN=20`.
Metadata polling reserves `BACKFILL_POLL_RESERVE_MS=30000`; admission and dispatch
stop starting work within five seconds of its deadline. These are background
throttles, not a second runaway guard or per-user cost cap. Complete live
ledger/discovery reads and explicit student Retry acceptance recovery run first.
An earlier backfill ledger reserves a conservative 25 budget units for recovery;
that course seeds its next batch on a subsequent invocation. Live/student
requests and worker completions never drain backfill ledgers or discoveries.

The real complete source-list eligibility path is shared. An internal eligibility
scan omits only per-source presentation-status reads, batching owned control,
job and File-revision reads instead; public status behavior is unchanged. Exact
File evidence uses the existing revision fingerprint helper; Pages use the
existing body-plus-ordered-attachment evidence reader. Every bounded inventory
read fails closed. Prepared revisions, suppression and the three-attempt cap
are filtered before seed mutation. Incomplete inventory seeds/retires nothing
and logs only the course ID. Complete evidence can retire stale backfill wakeups
for prepared, capped, suppressed or no-longer-eligible materials, while retaining
jobs/results and failed/live-origin discoveries. Later eligible revisions can
be discovered again; this never infers source deletion from partial evidence.

Seeds use stable material-ID order and 200-row idempotent upserts into existing
`canvas_preparation_discoveries`, preserving failed records and Retry-After.
Cycles are `backfill:<five-minute-window>:<run-uuid>`, distinct from live syncs.
Five-material turns across the stable course order accumulate no more than 25
jobs per course, register receipts through `register_canvas_preparation_sync_v1`,
then remove admitted discoveries only after registration persists. Dispatch uses
`advancePreparationSync` and the existing batch/repeat/no-progress guard. A seed
crash resumes existing discoveries; admission before registration reconnects the
same exact job; registration before dispatch is recovered from its open ledger.
Deadline-limited dispatch leaves pending receipts for a later poll. No second
extraction/preparation implementation, new HTTP endpoint or Scheduler is added.

Logs contain counts and IDs only: actual inserted seeds, admitted jobs, pending
discovery counts and skipped-incomplete courses. Local real-discovery/PGlite tests
prove 230 old materials eventually publish 230 results without a new sync, the
five-material course is fully admitted in the first turn, global/course bounds,
live/Retry priority, exact prepared exclusion, cap/suppression, cancellation,
crash recovery, fail-closed retirement and owner/service grants. Extraction uses
a synthetic healthy local text payload in these orchestration proofs; existing
EP1 worker/OCR tests validate extraction separately. No provider workload, remote
concurrency, rollout or device acceptance is claimed. Exact FRESH gate counts
and failed first attempts are recorded in the EP2 handoff. Owner rollout applies
the new migration after EP1's migrations, deploys API/worker and watches backfill
counts/guard state; RB2 verifies an old never-opened material shows Ready.

## Client status

EP3 adds a safe `preparation` projection (`status`, fixed `reasonCode`) for the
current exact revision: prepared with a persisted result is Ready; pending,
running, deferred or not yet admitted is Preparing; failed/cancelled, exhausted
automatic attempts and guard suppression are Couldn't prepare. Suppression uses
`preparation_paused` with a short Retry explanation. Unsupported, empty and
unavailable remain explicit. A running third attempt stays Preparing until it
finishes. Older prepared revisions never make a newer revision Ready.

Legacy `capability`, file `preparationStatus`, `canPrepare` and shared `readiness`
remain for one release and replaced values are deprecated in code. Canvas clients
must opt in with `?preparationStatus=1`, because older mobile parsers reject
unknown descriptor fields. Experience material responses carry the additive
projection and gate both Reviewer and Quiz on Ready. No lease, dispatch identity,
private locator, evidence, result payload or raw provider reason is serialized;
owner RLS and grants are unchanged. Saved Reviewer snapshot freshness keeps its
separate historical-source contract.

Student Retry remains on existing manual admission/dispatch, never a separate
extraction path. Automatic-attempt/suppression reset happens only in the locked
admission RPC; cumulative lifetime attempts survive. Active and Ready redelivery
are no-ops. Mobile hides Retry on observed connection failure and never queues
it offline. An HTTP 202 represents accepted background work; request activity
alone does not report successful preparation.

Mobile material cards and both study screens show short status copy. Preparing
has no spinner or animation, including with Reduce Motion. Reads refresh on focus
and poll serially every ten seconds with an 18-read/poll bound per focus/refresh cycle,
stopping at Ready/failed, blur/background or offline evidence. Later material pages
use their saved page offset and loaded lists retain their pagination during quiet
refresh. Retry preserves single-flight/reconnection behavior and the separate
Reviewer job Retry recovery flow. Existing tokens/components only; no native
dependency or migration was added. Local gate counts are in the EP3 handoff;
API/preview OTA rollout and RB2 realme checks remain owner steps.
