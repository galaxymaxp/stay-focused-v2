# ADR-027: Owner-scoped saved-first screens

Date: 2026-10-15
Status: Implemented locally for SP1; rollout/device acceptance remains owner work.

## Context

Testers reported slow opens. SP0 found that most main screen hooks wait for
network/auth even when the account has already seen the data. Mobile Library
already has a safe owner-scoped local-first store; Tasks reads its existing
SQLite copy only after connection failure. Website resources live only in
memory. A slow refresh must not remove content that is already available.

## Decision

Use the shared `SavedSnapshot<T>` envelope: `ownerUserId`, exact query `key`,
`savedAt`, `schemaVersion`, and the existing response DTO in `data`. An absent
owner, different owner/key, invalid timestamp, null payload or schema mismatch
is a miss. Successful empty lists remain successful saved data. Keys retain
Today's local date and UTC offset, course identity and material page offset.

Mobile appends a `screen_snapshots` table to the existing device Library
database through local migration 8, without changing any previous migration.
The table has a composite owner/query primary key and participates in the
existing `purgeOwner`. Explicit sign-out also invokes the snapshot service
cleanup from AuthProvider's allSettled list. That service increments an owner
epoch before awaiting storage and clears owner-bound course material maps;
late responses from an old epoch cannot write snapshots back after cleanup.

Website uses one IndexedDB database, `stay-focused-screen-snapshots`, with an
owner/query tuple serialized into every key. Reads validate both key and
envelope ownership. Explicit sign-out awaits owner cleanup, auth account
transitions purge the departing owner, and owner epochs fence delayed writes.
Open/transaction errors, private-mode failures and unavailable IndexedDB are
silent cache misses and preserve the online resource behavior. No SWR or
React Query dependency is introduced.

For Today, Courses, course workspace/material pages, Tasks/Work and Library,
read saved data before issuing the first request. First-ever loads keep their
existing skeletons. Subsequent requests keep visible content and scroll
containers mounted. Surviving stable ids keep their positions, changed items
update in place, and new ids append. Material pages preserve their exact offsets;
incomplete refreshes keep saved page evidence. Mobile Library continues using
its existing owner-scoped summaries, exact bodies, catch-up and offline draft/
quiz safeguards. Website saves the complete Library traversal only after all
pages succeed; failed/partial list evidence never deletes saved Library work.

Show a small static status line using existing tokens: “Syncing…” then
“Updated just now” and relative time; failure shows “Couldn't refresh · Retry”
with the saved timestamp. Retry is explicit and nonblocking. There are no new
animated transitions, so Reduce Motion needs no special transition fallback.

Reviewer responses are persisted separately from the currently displayed
revision. A changed response is held as a pending update; the student sees
“Updated — tap to refresh” and must explicitly accept it. Reopening uses the
latest saved response. An authenticated exact-item not-found can still remove
that detail. Prose is not enriched or rewritten. Signed source visuals remain
in their existing permission-aware paths, outside these screen snapshots.

## Consequences and verification

Saved opens no longer depend on a slow successful or failed network response.
This does not make cached capabilities authoritative or prove that a sync/job
was accepted: server bearer verification, RLS, generation admission, cancellation
and durable 202 semantics are unchanged. Cache isolation is a local privacy
boundary; it never substitutes for server authorization. Browser/device storage
can be evicted or disabled, so first-load skeletons remain necessary.

No server migration, API contract change, provider call or deployment is needed
for the code change. Browser Library still waits for complete pagination on a
first-ever load; progressive server/list optimization remains SP2's scope.
Current acceptance and exact gate results are recorded in
[SP1 acceptance](../ai/acceptance/sp1-cached-first-screens.md).

This ADR uses the repository's established `docs/architecture/ADR-*` location;
the prompt's illustrative `docs/adr` directory does not exist.
