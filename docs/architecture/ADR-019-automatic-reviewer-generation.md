# ADR-019: Automatic reviewer generation after Canvas content sync

Status: Accepted (implementation local; production and physical acceptance pending)
Date: 2026-10-12

## Context
Product direction v1.4 makes reviewer creation automatic: a student should not tap Generate per file.
Manual generation already runs server-side through `startReviewerGeneration`, which owns material
resolution, preparation, Page attachments, deferred PDFs, quotas, durable job creation and dispatch.

## Decision
- Trigger: after a `course_content` Canvas sync job completes (success, unchanged or partial), the
  Google worker runs automatic admission for that course. Admission never changes the sync result.
- Admission calls `startReviewerGeneration` with a deterministic idempotency key per
  (user, course, material, revision). No generation logic is duplicated.
- A candidate ledger (`canvas_auto_reviewer_candidates`) records every decision. The first run for a
  course records all eligible material as `baseline` and generates nothing, so enabling automation
  never spends the quota on a semester of old material.
- Limits: 3 admissions per run, 5 per user per 24 h, stop on the first quota response, 3 attempts per
  candidate. Remaining candidates wait for the next sync.
- A service-only, renewable owner lease serializes admission across courses, preventing concurrent
  sync completions from racing the daily count. Abandoned leases expire after ten minutes.
- Material that already has a reviewer is `skipped_existing`. Regeneration after a source revision
  stays a student action through the existing freshness indicator.
- Eligibility: Canvas `file` and `page` sources that `listCanvasReviewerSources` reports as available
  and either `ready` or `needs_preparation` with `canPrepare`. Assignments and announcements are never
  automatic, which matches content routing.
- Off switch: `canvas_auto_reviewer_preferences.enabled` (missing row = enabled). Disabling stops new
  admissions and deletes nothing.

## Consequences
- AG2's background trigger is now the five-minute metadata poll: after successful
  metadata apply, newly observed File/Page module-item IDs request one existing
  durable content-sync job with awaited Google dispatch. First poll baselines IDs;
  changed IDs and incomplete evidence never trigger. Finalize still runs AG1
  admission exactly as manual Sync does, using its brokered token.
- Poll requests require automation enabled and verified API activity within seven
  days (hourly conditional writes). Atomic service-only reservations serialize
  rolling caps of 1/course/6 hours and 3/user/24 hours; AG1's 3/run and 5/24-hour
  reviewer limits remain. Failed admissions consume a reservation conservatively.
  Gated observations advance marks and are not queued for later backfill.
- Queue/Library/header automation labels derive from owned candidate -> processing
  job -> canonical artifact-version receipts, with optional API fields.
- Email activation has a service-only, security-invoker stale-event guard. The
  owner skips pending events older than 24 hours before Scheduler activation.
  AG2 is locally verified; deployment, R1.4, live/device acceptance and website
  parity remain pending. Scheduler and deployed state are UNVERIFIED.
- Scanned PDFs consume the daily OCR page quota; the per-day cap bounds this.
- Automatic jobs appear in Queue through the existing active-job listing.
