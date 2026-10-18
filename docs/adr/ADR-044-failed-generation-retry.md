# ADR-044: Manual retry from the accepted generation source

Date: 2026-10-18
Status: Implemented locally for MR3; migration and rollout pending owner action.

## Decision

A failed Reviewer or Quiz may offer **Try again** when a new generation from
the exact accepted source is safe. A model or validation failure is not a reason
to require another upload. Validation remains unchanged and results still persist
before success; cancellation never publishes a result. Automatic retry policy
and provider call ceilings remain unchanged.

| Code | Real stage | Before | After | Reason |
| --- | --- | --- | --- | --- |
| generation_failed | generating_sections | false | true | Reviewer model/contract/coverage failure; fresh job budget |
| reviewer_validation_failed | verifying_coverage / assembling_reviewer | false | true | Validation may succeed on a new generation without relaxing its checks |
| quiz_generation_failed | generating_sections | workflow true; local worker false | true | Same accepted topics/settings; fresh job budget |
| processing_workflow_failed | last persisted stage | true except cancellation | unchanged | Interrupted processing |
| google_generation_interrupted / google_generation_retryable_failure | last persisted stage | true | unchanged | Existing manual retry; automatic policy preserved |
| google_generation_dispatch_failed | preparing_source | true | unchanged | Existing dispatch recovery |
| processing_provider_failed / provider_rate_limited | last persisted stage | true | unchanged | Existing local-worker provider recovery |
| document_extraction_incomplete | extraction stage | true | unchanged | All expected pages must still pass verification |
| page/OCR limits, unreadable/unsupported/empty/oversized material | extraction/preparation | false | unchanged | Same source cannot fix its limits |
| quiz_source_capacity_exceeded | preparation/generation | false | unchanged | Existing capacity 422 and supported maximum |
| unavailable/deleted/foreign source, insufficient_source, not_ready | preparation | false | unchanged | No source resurrection or access bypass |

The shared predicate upgrades only exact historical failure codes at the real
generation stages: generating_sections, verifying_coverage, retrying_sections,
assembling_reviewer. Matching job types are mandatory. It never upgrades source
validation, extraction or cancellation failures. The database is authoritative
about source availability when an action is attempted.

**New function-only migration:**
`packages/db/migrations/20261018000100_failed_generation_retry.sql` replaces
retry_processing_job and restates its service-role-only grant. It does not
backfill or update existing rows. Apply it before publishing the new API/client
projection. It accepts safe legacy rows even when stored retryable=false,
copies the same source_snapshot_id/source_version_id and original contract,
and starts a fresh child job. Existing active-job and insert-trigger quota
admission remain. Same-key replay/conflict behavior remains, with availability
checked again before returning an accepted retry.

The function checks source ownership, normalized text or retained bytes,
source-version ownership, and document deletion/upload availability. Referenced
Quiz Reviewers must still exist and have an available source. Canvas item IDs
must remain owned, present and, for files, available. Row locks protect document
and Canvas deletion checks through retry insertion; document deletion already
refuses active processing jobs. Replaying a live retry also goes through the RPC
so an old acceptance cannot override deletion. No source bytes or private paths
enter responses.

Stored extraction reuse already exists: attached manual/Canvas sources contain
the exact text/blocks, so retry workers skip upload, PDF inspection, OCR and
source attachment. Generation checkpoints and provider reservations belong to
the new job; failed output is never copied as a successful result.

## Clients

One shared stage helper translates the actual enum to short failure phrases,
including **Stopped while building topics** and **Stopped while checking the
reviewer**. Unknown stages use **Stopped before finishing**. Clients obtain the
stage from the existing shared job/detail response; no new DTO or polling path.

Retryable failures show **Try again**, the stage phrase and **Your material is
safe.** Generation retains secondary View Queue. Canvas only offers secondary
Choose another material for a non-retryable failure. Existing tokens and button
classes remain. Synchronous locks reject duplicate taps; a newly accepted retry
gets a fresh idempotency key. Ambiguous requests keep their existing identity
where already supported by Queue/Generation recovery.

Typed processing_job_not_retryable (409) and Quiz capacity (422) responses use
safe allowlisted messages and suppress Try again despite stale polling data.
Canvas remembers a rejection for that job so polling cannot restore the action.

## Verification and owner steps

See [MR3 acceptance](../ai/acceptance/mr3-failed-generation-retry.md) for fresh
local SQL, operation, client and gate evidence, including failed first attempts.
Rollout and Device checks are NOT RUN. Production migration state, deployed
revision, Scheduler state and physical behavior are UNVERIFIED (owner to
confirm). No live provider call or remote write is authorized by this ADR.
