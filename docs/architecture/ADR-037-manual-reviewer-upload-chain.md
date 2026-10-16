# ADR-037: Manual files become one reviewer job

Date: 2026-10-16
Status: Implemented locally for MR2; rollout and physical acceptance remain owner steps.

## Context

Manual PDF/photo import previously completed a document-extraction job, asked
the student to edit the extracted text, then created a separate reviewer job.
Canvas already had bounded Office extraction and deferred reviewer sources.
Manual DOCX/PPTX import and removing the intermediate editor require server-owned
chaining, including after the client disconnects following HTTP 202.

## Decision

The existing authenticated resumable upload protocol remains. New clients accept
with `jobType: reviewer_generation`; Office always selects this path. Older
PDF/image extraction-only callers retain their existing acceptance behavior.
Shared picker policy adds DOCX/PPTX at the Canvas Office cap of 10 MiB; photos
remain 5 MiB and PDFs 10 MiB. Legacy DOC/PPT receives conversion instructions.
Server admission checks actual ZIP signatures and expected package parts with
bounded entry/expansion counts and active-content/path rejection. Extraction uses
the existing `extractOfficeStructure`, including ordered drafts, without a fork.

`create_manual_reviewer_job_v1` locks the owner and upload intent and atomically
creates one `reviewer_generation` job, an immutable private binary source and
document asset, and the accepted-intent receipt. It reuses v2 generation
admission and contracts. Its temporary text placeholder/source version is
replaced and deleted inside the same transaction, before dispatch. No worker can
generate from the placeholder. Fingerprints bind upload, bytes, page count and
generation contract; replay returns the same job. Dispatch recovery also runs
when reconnecting to an accepted intent.

The final admission trigger counts the chain in both extraction and generation
queue/daily quotas, plus the existing conservative page quota. The server-owned
`manualReviewerVersion` marker survives source resolution and child Retry.
The source's original page count also survives, preserving quota accounting.
Existing active/hourly admission, leases, deadlines, child retries, RLS, explicit
grants and owner-safe denial remain. The migration only extends existing
constraints/bucket MIME policy and adds service-role-only functions; it grants
no new client access.

Google/database workers prepare the source before calling the existing AI-first
reviewer function. Vercel Workflow explicitly orchestrates page inspection,
image/OCR chunks, attachment and generation as separate steps. All paths reuse
the existing extraction operations and their checkpoints. PDFs keep complete
page/blank-page verification and checkpoint evidence, the durable 100-total-page
cap and 40-OCR-page cap; Canvas/synchronous policies remain unchanged.

`attach_manual_reviewer_source_v1` requires a running job with the matching live
lease, locks its owned source, persists the exact text/ordered blocks and source
version, then changes the reference to resolved text. The accepted original
remains in its document asset. Replays never replace resolved text; a later child
of an older extraction failure reconnects its job to the saved version. Text is
limited to the existing manual 100,000 characters. Empty or placeholder-only
Office content, unreadable PDFs and empty photos fail with
`We couldn't read text from this file` before any generation call. Deterministic
failures stop; transient errors retain existing bounded recovery rules.

Generation continues through MR1's ordered-part/replay/budget implementation.
Only the final reviewer result is published, using the existing transactional
completion boundary, and cancellation forbids publication. One job supplies the
generation screen and existing QD1 Queue. Both clients submit immediately after
a pick and retain the pick's idempotency key/upload reference for an interrupted
acceptance retry. Before 202 they require the app/page to remain open; after 202,
the existing server reconciliation and Queue resume the same job. Paste-text
editing and explicit generation remain unchanged.

## Verification and limitations

See [MR2 acceptance](../ai/acceptance/mr2-manual-reviewer-upload-chain.md) for exact
fresh gates and failed-attempt history. Local PostgreSQL tests execute the new
migration with the existing base admission/completion/retry functions, including
both quota families, live lease fencing, immutable replay, cancellation and
service-role grants. The PGlite harness uses PostgreSQL `sha256(bytea)` as its
pgcrypto digest shim; deployment-specific pgcrypto/catalog state is unverified.
Mocked routes, real synthetic Office packages, orchestration and client tests
prove the local boundaries, not production/provider or physical-device behavior.
Rollout and Device checks were skipped entirely under the unattended rules.
