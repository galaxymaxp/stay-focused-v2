# ADR-040: Library sort orders and per-device choices

Status: Accepted for LS1 local code scope, 2026-10-16. Rollout and physical checks remain owner steps.

Both clients use the same pure shared comparators. Top-level labels map to:
Recently added = each course's newest createdAt descending (not updatedAt);
Course = code A-Z, falling back to name; Title A-Z = course name;
Recently opened = latest server/local item-open timestamp descending, never-opened last.
Personal & other sorts last for Course/Title, and participates normally in date sorts.
Ties use stable course keys; locale-aware title/code comparison ignores case.

Within a course: Canvas order (default) compares moduleIndex then itemIndex;
unpositioned work follows by createdAt ascending. Recently added uses createdAt
descending. Title A-Z uses a case-insensitive locale-aware comparator. Stable ID
ties apply to every order. Existing arrangeList first partitions pins and hidden
work; each visible partition is sorted independently, then pinned precedes rest.
Pin order elsewhere stays unchanged. Explicit sorting follows snapshot grouping,
so a remembered snapshot position cannot suppress the selected order.

The optional sourcePosition comes from existing synced canvas_modules.position
and canvas_module_items.position. Server enrichment resolves a sourceMaterialId
through owner/course/connection-matched file, page or assignment metadata.
Repeated sources use the earliest valid numeric module/item pair. All reads
paginate completely with a fail-safe ceiling; failure never publishes partial
position evidence. No source text/private paths are selected or returned. Manual,
mixed, missing and historical unplaced sources get null. No migration, new table,
new Canvas sync or provider call is introduced. Existing bearer authentication,
trusted owner binding, RLS and grants remain unchanged.

Mobile and web keep sort.library / sort.libraryCourse in the existing
sf.list-preferences.v1.<owner> store. Old/unknown values default to recent/canvas.
Since Library lastOpenedAt is never written server-side, successful reviewer,
quiz and draft displays record owner-specific local timestamps there, capped at
300 IDs. Mobile waits for initial preference loading before merging updates;
serialized writes preserve rapid changes. Browser reads/writes tolerate unavailable
storage. Sort updates operate only on already-loaded summaries and never refresh.
Local timestamps and choices do not sync between devices. No dependency, native
module, new token, backend write or shared-reviewer change is needed.
