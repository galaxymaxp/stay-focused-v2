# ADR-021: Canvas source provenance and PDF revision retention

Date: 2026-10-13
Status: Accepted in code; migration and rollout pending owner execution.

## Context

Fresh Canvas PDFs were prepared by `startReviewerGeneration` without refreshing
their material descriptor. The stale `not_prepared` descriptor bypassed existing
deferred PDF admission and created a preview-text job without the worker's
page-numbered source blocks. Manual and automatic admission share this adapter.
Preparation failure remains `409 not_ready`. Preview limits are 20,000 characters
per source and 90,000 combined, enforced by rejection rather than truncation;
there is no established partial-source generation finding.

Ingestion cleanup checked only current `canvas_files` storage references. A new
revision could therefore remove the exact old bytes referenced by an immutable
reviewer snapshot. Failed-update rollback also removed the just-uploaded key
unconditionally. Keys are content-addressed by owner, local file ID and SHA-256,
so an upsert can overwrite an already accepted current or historical revision.

## Decision

Refresh the owned PDF descriptor after successful preparation and enter the
existing deferred path. The worker's `page-N` blocks remain the only PDF block
builder. The worker persists `reviewerSourceBlocks[].pageNumber` and
`reviewerSourceSnapshotId` into canonical source metadata before generation.
Non-PDF admission and already-prepared PDFs preserve their existing behavior.

The forward-only migration
`20261013000200_canvas_source_provenance_retention.sql` adds a service-only
`claim_canvas_object_cleanup_v1(bucket, key)` RPC. It takes a transaction advisory
lock derived from the bucket/key, checks current file and immutable snapshot
references, and persists an exclusive cleanup claim only when neither exists.
Snapshot insertion and new current-file object references acquire the same lock
through triggers, reject an active claim, and require the exact object in
`storage.objects`. The snapshot trigger covers the existing snapshot RPC and
other insert writers without replacing their owner/context validation.
Indexes support current-object and owner/file/hash reference lookups.

A transaction-scoped advisory lock alone is insufficient: it releases when the
RPC commits, before the separate Storage HTTP removal. PostgreSQL documents that
transaction locks end with the transaction in its
[advisory lock documentation](https://www.postgresql.org/docs/current/explicit-locking.html#ADVISORY-LOCKS).
The durable claim bridges that gap. If snapshot acceptance wins, cleanup keeps
the object. If cleanup wins, subsequent acceptance fails safely instead of
accepting a reference to bytes scheduled for deletion. A final reference check
also handles a reentrant insertion by another trigger in the claim transaction.

Only the first claimant can remove the object. After successful Storage removal,
`finish_canvas_object_cleanup_v1` releases the claim only if Storage metadata
confirms absence. Missing or uncertain remove responses leave the claim in place.
Claims never expire automatically: a timeout could allow a late HTTP delete to
remove a restored version. This favors preservation and safe admission denial
over recovery of an uncertain object. Investigating such claims is later owner
operations work; this slice adds no retrying deletion worker or remote recovery.

All definer functions have a fixed `public, pg_temp` search path. Public, anon
and authenticated execution is revoked. Only service-role callers can claim or
finish cleanup; the RLS-enabled claim table denies client access and direct
service mutation. Existing ownership/RLS/context constraints remain in force.

Old-object cleanup and rollback use the same reference-aware claim. Rollback
first records whether the key existed before upload and removes only a provably
new, unreferenced object. An existence error is treated as pre-existing. Claim,
remove and finish errors fail closed with fixed safe log codes; logs contain no
object keys, academic content or raw provider errors. A failed remove retains
the durable claim as well as any surviving bytes.

## Accepted-revision reads

`resolveSnapshotPdfObject` reads an owned file/PDF snapshot item and its owned,
unedited snapshot. It derives the private key solely from the accepted owner,
`source_row_id` and `stored_content_sha256`, then checks Storage availability.
It never reads the current file revision, refetches from Canvas, backfills or
substitutes newer bytes. Missing, invalid, foreign or edited provenance and
provider failures return `source_revision_unavailable`. The locator is internal
server code; no endpoint or UI consumes it yet. VL1.1 will use it later.

## Verification and consequences

Local database execution covers unreferenced removal, current and historical
references, insertion while the cleanup advisory lock is held, a committed claim
blocking late admission, absent bytes, exclusive claims and service-only grants.
PGlite is single-connection: the insertion interleaving is deterministic using a
database trigger, not a claim that two physical sessions were exercised. A local
Docker engine was unavailable; physical multi-session blocking and deployed
Storage behavior remain UNVERIFIED (owner to confirm).

Distinct accepted historical revisions remain stored while their snapshot items
exist. Duplicate content keys share one object. Unreferenced old revisions remain
cleanup candidates; uncertain deletions can retain extra objects and claim rows.
Expected growth is the sum of distinct referenced historical revision sizes plus
these fail-closed leftovers; live byte counts were not inspected. No scheduled
garbage collection or existing-object repair is introduced.

The Canvas prerequisites are ready for VL1.1 STEP 0 to be rerun after gates and
owner rollout. Visual Learning UI/rendering is separate. VL0 local-upload
provenance remains a separate item, and user-edited sources remain excluded.

## Local uploads (VL0c)

Implemented locally on 2026-10-13; owner rollout and live acceptance remain pending.
The sources route reads only the worker's existing `page-N` blocks from
`processing_job_results.payload.sourceBlocks`, filtered by the authenticated
owner and the normalized parent's `extraction_result_id`. No new table, column,
completion migration or second block builder is needed. The normalized source
remains immutable; provenance is stored on the newly accepted child revision.

The child carries `metadata.reviewerSourceBlocks` and
`pageProvenance: "extracted"` only when the accepted trimmed-text SHA-256 equals
the normalized parent's `content_sha256`. The existing strict structured-block
reader validates the evidence; page IDs must match their positive page numbers
(at most 100), with no duplicate IDs. Explicit blank pages retain their gaps;
no page text is invented. Only ID, kind, order, page number and text are copied,
in the same metadata shape used by Canvas.

Edited text carries no blocks and `pageProvenance: "edited"`. Missing/malformed
evidence, database errors and thrown read failures carry no blocks and
`pageProvenance: "unavailable"`, without failing acceptance. Inherited page blocks
are removed before this decision. Idempotent replay returns the original accepted
revision without modifying it or retrying provenance. There is no backfill;
old local revisions retain today's unavailable page-citation behavior.

Existing Study Assist and page-mapping readers consume the accepted metadata
without a parser change. VL0c left camera/image acquisition, Canvas paths, the
snapshot renderer and mobile controls unchanged. VL1.2 subsequently adds local
PDF From page previews using the same renderer; see ADR-020 phase 1b.

Owner answer 6 supersedes the earlier VL0 STEP 0.5 stop: **accepted, deferred to
VL1.2**. Local provenance depends on text already used by the kept reviewer,
not PDF bytes. `preserve_artifacts` continues to honor document deletion and
can remove the original bytes after seven days. No deletion/cleanup behavior or
byte-availability assumption is added. Fely's 2026-10-13 VL1.2 option 1 decision
is **respect the delete**: no local retention change, including when reviewers
are preserved. Deleted/cleanup-pending assets or missing Storage objects return
`source_revision_unavailable`; mobile keeps cited page text and calm unavailable
copy. Canvas retention remains the separate policy above. Live rows, retained bytes and the count of
old revisions without blocks are **UNVERIFIED (owner to confirm)**.
