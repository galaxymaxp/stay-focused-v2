# ADR-047: Start-date ownership of overnight free time

Status: Accepted for TC1b local code scope, 2026-10-18.

The owner resolved TC1's preflight question on 2026-10-18: extend the server
Today projection and use one snapshot as the source of current, next, later,
timeline and progress on both clients. No client merges two snapshots.

A free-time window belongs to its local start date. Its stored minutes retain
the existing per-date keys: start 0..1439, end 0..1440; an end below the start
means the following morning. Equal endpoints and a full 24-hour window are
invalid. Shared helpers own duration, containment, clock labels, local calendar
arithmetic, planning boundaries and snapshot selection.

For October 17, 22:00-04:00, availability runs October 17 22:00 through October
18 04:00. The planning replacement range runs October 17 00:00 through October
18 04:00. A nonwrapped window retains the existing midnight-to-midnight range.
The existing planner validator and RPC already accept these increasing ISO
ranges; this change requires no migration, RPC or SQL change.

`GET /api/today` accepts optional `startsAt` and `endsAt` ISO timestamps with an
offset (including Z). Missing fields retain their existing default boundaries.
Validation happens before the bundle starts repository reads. The start must
be within the requested calendar date; the end must be at least its next
midnight and at most 24 hours beyond that midnight, strictly after the start.
Invalid overrides return 400 with a fixed, safe explanation. Bearer verification,
owner-scoped reads and request-local deduplication remain in place.

The approved trimmed-start example (October 18 `startsAt=04:00`) defines the
start-bound interpretation: the requested date remains the anchor, while a
previously owned morning may be excluded. Requiring every override to contain
00:00 would contradict that explicitly approved example.

Both clients read the current and previous date's existing free-time entries.
At 01:30 on October 18, the previous date is selected with `endsAt=04:00` and
the server includes the 01:00-02:00 session as current. At 04:00 the client
selects October 18 with `startsAt=04:00`, excluding that session from the new
date's timeline and progress. Timers switch at midnight and the wrapped end;
foreground/focus refresh also re-evaluates selection. The override is part of
the existing owner/path snapshot cache identity. A stale preview response is
discarded if its owning date changed while the request was pending.

Clock arcs and hit testing use clockwise duration across midnight. Whole-block
dragging retains duration; release snaps to the existing quarter-hour grid.
The sole corner control becomes Clock options, containing the existing lock
and typed free-time fields. Lock blocks dragging and accessible step adjustment;
typed saving uses the same storage/planner callback while locked. Mobile uses
the reviewer measured-Modal pattern and device-locale 12/24-hour fields without
a new native dependency; web uses browser time inputs and focus-restoring
Escape dismissal. Preview bars lift morning sessions into the start date's
coordinates and retain positive widths and real absolute time labels.

Local synthetic tests establish the read/planning and interaction contracts.
Production state and physical-device behavior remain owner verification;
TC1b authorizes no rollout or remote operation.
