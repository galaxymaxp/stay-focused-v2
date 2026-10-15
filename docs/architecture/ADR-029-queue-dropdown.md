# ADR-029: Queue in the header

Date: 2026-10-15
Status: Implemented locally for QD1; rollout and device acceptance remain owner work.

## Context

Testers found a dedicated Queue page heavy. Checking generation should keep the
current screen visible. SP0 also found independent header and Queue polling.
SP1 saved-first screens and CQ1 past-course exclusion must remain intact.

## Decision

Each platform has one owner-scoped Queue source. Mobile's AppActivityProvider
owns `useQueueSource` and exposes the same jobs through QueueItemsContext;
existing activity consumers retain their interface. Web's header owns one
`useQueueItems` instance. Both read the existing authenticated, course-filtered
`/api/jobs?scope=all&limit=50` projection. Poll every five seconds while queued,
running or stopping, otherwise every thirty seconds, only while the app/page is
active/visible. Concurrent wake events do not start another in-flight request.
Refresh replaces the poll cycle and aborts the prior request. Late responses and
account changes cannot publish another owner's jobs. Failures retain the latest
known jobs and offer explicit Refresh; job status is never inferred from intent.

Grouping reuses the previous Queue page's generating, queued, attention and
completed sections and hidden-entry preferences. Completed entries are ordered
by completion/update time and limited to five in the existing bounded job window.
Running entries show the server's measured units or progress message. The badge
is the generating count; queued work still drives the activity orb. An unseen
failed/expired job adds a quiet dot, acknowledged when Queue is open. Seen IDs
are in-memory, owner-scoped state. Cancelled jobs remain attention entries and
never contribute an error dot or published result.

Mobile uses one app-shell transparent native Modal under the header, measured
from the pressed Queue control. Outside tap, explicit Close and Android Back
dismiss it. It has no slide/scale animation, uses existing tokens/hit targets,
and keeps the Knowledge Core orb's existing Reduce Motion behavior. The Auto
chip already present on mobile is retained. Pending unaccepted local requests
still resolve course attribution, exclude past courses, reconnect with their
original identity, and can be cleared. Those requests are not accepted jobs.

Web uses a button and anchored, scrollable nonmodal dialog. Native button
activation provides Enter/Space, `aria-expanded` and `aria-controls` describe
state, opening focuses the dialog, and Escape, outside pointer or leaving its
focus region closes it and restores button focus. Existing CSS tokens and
prefers-reduced-motion apply. Web had no Queue Auto chip, so none was added.

`/generation-queue` remains a mobile compatibility route: return to the previous
screen, or POST_SIGN_IN_ROUTE on cold start, and open the shell dropdown.
`/queue` redirects to `/today?queue=open`; the header consumes only that parameter
and preserves other parameters/hash. Generation detail opens Queue in place;
settings and legacy crumbs target the new intent URL. The distinct mobile
`/processing` screen and its notification/deep-link payload remain unchanged.

Retry retains mobile `newRequestKey` and web
`generationKey(owner, "retry:<id>", {})`. Synchronous action locks prevent a
double tap from posting twice. Keys are retained after failure. Successful Open
still resolves the persisted generation/artifact before navigating; extraction
and active-job targets retain their previous platform-specific behavior.

## Consequences and verification

The Queue list is no longer a page. Its cards/actions remain shared with the
overlay, without a second list poller. No API, shared contract, database,
migration, provider, auth, notification or deployment change is required.
This work does not alter SP1 snapshots, Reviewer prose, durable acceptance,
quotas, result persistence, cancellation guarantees or CQ1 server filtering.

Mocked component/hook tests cover grouping parity, bounded history, badge/dot,
polling, owner isolation, Retry/Open, dismissal, focus and compatibility routes.
Exact fresh gates and failed first attempts are recorded in
[QD1 acceptance](../ai/acceptance/qd1-queue-dropdown.md).
Physical realme/website behavior and deployed revisions are
**UNVERIFIED (owner to confirm)**; Rollout and Device checks were entirely skipped.
