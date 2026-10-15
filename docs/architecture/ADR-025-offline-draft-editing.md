# ADR-025: Offline Draft editing with kept online versions

Date: 2026-10-13
Status: Accepted; database/API and mobile implementation committed locally.
O3c final gates passed FRESH. Rollout and device acceptance remain owner steps.

## Decision

Fely selected option 1, "keep both", on 2026-10-13. A student may edit a saved
Draft offline, keep the edit on the device, and upload it at the next existing
foreground or Library focus/refresh trigger that has a connection. No new
network-reconnect observer, connectivity dependency, retry history, or change
to the ten-second processing-outbox interval is introduced.

`activity_draft_copies` keeps the overwritten online content and revision when
an offline edit's base revision differs from the current Draft. The offline
content becomes current. A row-locking user-authenticated RPC performs both
writes in one transaction, checks ownership independently of RLS, validates
object JSON and the 200000-byte cap, and increments the protected revision.
The API retains `validateEditableContent` against the Draft's accepted sources.
Authenticated owners can select/delete their copies; they cannot insert/update
copies or directly change `last_offline_edit_id`. Anonymous access is revoked.

The nullable `last_offline_edit_id` marker provides idempotent response-loss
replay: the same edit ID returns the current Draft without another update or
copy. At most five copies remain per Draft, ordered by creation time and
revision to resolve timestamp ties. This is a bounded set of kept versions,
not a retry history. Draft/account deletion cascades server copies.

The mobile implementation appends SQLite schema version 7 with one
owner-scoped `pending_draft_edits` row per Draft. Later text overwrites preserve
the first base revision and edit ID. A sent snapshot is frozen for retries;
new text entered during a send is retained and receives a new ID/base only
after acknowledgement. Pending content overlays Library/detail reads, survives
restart, and is retained with its body when offline cloud copies are removed.
Deleting the Draft removes its pending edit. Sign-out aborts/drains replay
before purging owner rows, including pending edits and conflict receipts.

Replay is one bounded pass per authorized trigger, sequential across Drafts,
with an owner-scoped single-flight guard. It persists the confirmed Draft before
acknowledging the row. Connection failures stop the pass and retain work;
not-found removes the deleted Draft; validation failures retain text in
`needs_attention` until explicit retry. Additional attempts occur on pending
DraftEditor mount and after successful online Draft saves. Online PATCH remains
the normal save path until a pending edit exists.

The UI uses existing Notice, Action, Copy, inputs, sheets and tokens:
"Saved on this device · will sync", the kept-version notice, read-only online
versions, confirmed restore through optimistic PATCH, copy removal and explicit
needs-attention retry. Unsaved text remains protected by navigation prevention;
device-persisted edits permit leaving.

## Verification and remaining work

The actual PostgreSQL migration is verified locally in PGlite. Database/API
commits from O3b are retained unchanged; O3c commits the mobile work locally.
O3c first reproduced exactly the two O3b mobile failures (942 passed / 2 failed).
Fely's 2026-10-13 22:45 answer permitted only the quiz-key fixture's expected
version to change from 6 to 7 and a no-pending-device-store mock in the screen
harness. All other existing test assertions remain unchanged. The new, unshipped
version-7 table creation is idempotent because the older fixture leaves the O3
tables in place while setting version 5. A new real SQLite 6→7 upgrade test proves
exact preservation of artifact bodies, Drafts, Quiz keys and practice and
verifies the pending-edits table can store an edit.

The online Draft save failure was a missing native-store test double under fake
timers. With deterministic no-pending storage, the unchanged screen test verifies
the exact existing PATCH, device `storeConfirmed`, and no generation request.
The copies UI also safely rejects a malformed list response before setting state;
the new hook tests cover that case and online confirmation persistence.

Final O3c gates are FRESH PASS: forced typecheck and lint 7/7 tasks each, 0 cached
(lint: 0 errors, 4 existing import-order warnings); shared 133/133 tests; API
1,743 passed / 3 existing opt-in skips; mobile 946/946 tests in 92 files; API
build 34/34 pages with 16 workflow steps / 1 workflow; Android export 1 bundle,
3,463 modules / 31 assets; `git diff --check` 0 whitespace errors. Focused final
mobile verification passed 101/101 tests in 5 files. See the O3c handoff footer
for failed first attempts, commits, full gate counts and proposed updates to
the three RB1-owned current-state documents, which remain untouched.

Rollback to an older build would drop pending Draft edits through the existing
newer-schema reset behavior. Per the owner's explicit O3b answer, this behavior
is unchanged and is a known owner risk; no rollback-safe preservation is claimed.
Production revisions, remote schema/RLS/grants, deployed behavior and device
acceptance are UNVERIFIED (owner to confirm). Rollout and device checks remain
owner steps; no remote call, migration application, deployment or device check
was performed during O3c.
