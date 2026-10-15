# ADR-034: Saved explicit course Reviewer requests

Date: 2026-10-16
Status: Accepted for GA1b local code scope; rollout remains owner-operated.
Supersedes the prerequisite deferral in ADR-030 following the owner's GA1b answers.

One course action creates the normal per-material Reviewers. It does not create
a combined course Reviewer. Confirmation says "Generate N reviewers", with a
skipped-material list; E2 continues to estimate study time from saved content.

`course_reviewer_requests` retains explicit owner/course/material/revision intent
independently of the automatic-reviewer baseline, preference and current-course
filter. The unique owner/material/preparation revision reconnects concurrent and
overlapping requests. A stable owner/course/material-set hash groups progress;
atomic membership links preserve progress for overlapping selections. Requests
are private: owner SELECT RLS, no anonymous access, server-only mutation grants,
owner-bound course and processing-job foreign keys. Private revision/connection
evidence is never returned to clients.

Use the new forward migration at the prompt's explicitly requested path:
`supabase/migrations/20261016010000_course_reviewer_batch_requests.sql`.
Earlier tracked migrations remain in `packages/db/migrations`; this file must
follow `20261015050100` and all preparation/quota prerequisites. No old migration
is edited or copied, and no migration is applied by the unattended run.

The API confirms ownership and complete inventory, checks the saved Reviewer's
source status and exact material component membership, and skips only current
matches. Both clients submit the exact IDs displayed at confirmation. A later
sync cannot expand that accepted set. Unprepared sources retain intent and use
explicit `manual:` preparation admission, including past courses. Preview text
is never accepted as preparation evidence.

Preparation completion resumes matching requests before the automatic adapter;
the existing global metadata-poll runner recovers open requests across owners
and past courses. The runner takes a bounded work slice with deadline checks;
deferred requests rotate using their update time. It creates normal jobs through
`startReviewerGeneration` with deterministic request IDs and expected prepared
revision, and awaits durable dispatch. No new Scheduler or worker service is
introduced. Production scheduling and ingress remain unverified owner concerns.

The normal transaction-serialized processing-job trigger remains the final
active/hourly/queued/daily quota authority. A new AFTER INSERT fence locks the
request, verifies prepared/current evidence, and links the job atomically.
Cancellation takes the same row lock through its conditional update: either a
pending cancellation wins and insertion is rejected, or admission wins and the
pending action reports a conflict. It never labels a running job cancelled.
Normal job Retry remains normal, and the insertion trigger follows its new ID
for batch progress. Job cleanup may clear the nullable job reference without
blocking the existing cleanup process.

Quota failures retain intent. Timed caps report the server's first possible
retry threshold; active/queue capacity has no promised finish time. Every later
attempt checks actual quotas again. Terminal preparation failure/cancellation
or changed accepted evidence fails the request without automatic retry loops.
Explicit Retry may retry preparation; a changed revision must be requested from
the course again. Initial evidence-discovery failure is not accepted as durable
source intent and is counted honestly as unable to start; other items continue.

Queue includes private request summaries alongside its existing normal jobs,
with waiting, quota, failed, Cancel and Retry controls. A server-created private
batch marker permits explicitly requested past-course jobs through the CQ1
Queue filter; routine Auto/sync and other past-course work remain filtered.
Shared Queue readers retain owner isolation, adaptive polling, normal Retry/Open
and QD1 overlays. New controls use existing tokens and add no animation.

SP1 saved screens, CQ1 routine filtering and retained Library, SP2/SP2b read
paths, SH1 share snapshots, source fidelity, OCR limits and job success/result
publication rules remain unchanged. Local verification and remote limitations
are recorded in the GA1b acceptance report.
