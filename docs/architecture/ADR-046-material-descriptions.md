# ADR-046: Source-grounded material descriptions

Date: 2026-10-18
Status: Implementing MD1b locally; migration and rollout remain owner steps.

Prepared payloads stay immutable and service-only. A separate owner-scoped
`material_descriptions` table stores safe metadata for a preparation ID and
its exact revision fingerprint, or a manual source version and its text hash.
RLS permits only owner reads; explicit grants reserve writes and admission
RPCs for the service role. Source text and private paths never enter this table.

The existing `GenerationProvider.generate` / Responses JSON schema adapter
used by study-tools is reused, without a new SDK. `MATERIAL_DESCRIPTION_MODEL`
overrides the default `gpt-5.4-2026-03-05`: task-estimate, study-tools and quiz
defaults tie at that model in this checkout; this is not a live pricing claim.
Only the first 6,000 source characters across ordered components are sent as
untrusted data. Low reasoning effort, 600 output tokens, an eight-second
provider timeout and zero provider retries bound this supplementary work.
The result is plain text, one or two sentences and at most 240 Unicode code
points. Oversized responses prefer complete sentence boundaries.

Admission serializes by owner using the existing processing quota lock. An
atomic failed receipt reserves each revision before any provider call. Empty
text records `skipped_empty` without a provider call. Crashes, invalid output
and provider failures retain `failed`; only a new revision retries. Exhausted
guards/quotas skip without changing preparation or reviewer outcomes. The
existing 200-per-cycle, 25-per-batch preparation guard is not expanded or
restarted. Suppressed controls and tripped ledgers deny description admission.
Micro-actions get a separate daily allowance equal to the configured
`processing_policy_config.max_daily_generation_jobs` (currently 25), and skip
when the existing Reviewer/Quiz/Activity daily allowance is exhausted. They never create
processing jobs or consume reviewer admission slots.

Canvas calls the hook at both post-commit figure sites. Read-side description
lookup is one service-only, owner/course/material-page-scoped RPC (100 IDs),
validating current source evidence, original SHA-256/byte size (including Page
attachments) and matching the prepared revision. Missing
metadata or an unavailable description lookup leaves generation usable.
Web/mobile add optional nullable metadata and show nothing when absent.

Manual uploads preserve ADR-037 immediate generation. Their attachment path
starts bounded best-effort description work without awaiting it; no background
completion guarantee is made for this optional metadata. No existing selectable
manual-material detail/list surface exists: store the metadata only. Reviewer
source titles remain titles, not a new manual material flow.

Existing prepared revisions acquire descriptions only on preparation worker
redelivery/re-preparation. Backfill needs an owner decision; none is included.
Future only: cross-student reuse for identical files, preserving owner isolation
until separately designed and authorized.
