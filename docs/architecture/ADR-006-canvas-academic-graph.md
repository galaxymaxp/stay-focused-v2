# ADR-006 - Canvas Synchronization As An Academic Graph

Date: 2026-07-05

Status: Accepted

## Context

Canvas is not only a file repository. A course contains modules, module items,
Pages, assignments, discussions, announcements, quizzes, planner items,
calendar events, dates, files, external URLs, and external tools. Those objects
have order, nesting, lock state, completion state, and user-specific effective
dates.

Flattening Canvas into a list of files would lose the course structure students
actually study from and would make provenance too weak for future source
snapshots, scheduling, and grade planning.

## Decision

Stay Focused will synchronize Canvas as an academic graph. The integration will
store related Canvas entities and relationships, preserve module order and
source identity, and track provenance and effective dates. File ingestion is a
later layer over discovered graph nodes, not the root model.

Phase 5A establishes only connection, course discovery, and capability records.
Phase 5B and later phases will add the graph tables and synchronization logic.

## Consequences

- Canvas courses, modules, module items, assignments, Pages, files, discussions,
  announcements, quizzes, and planner/calendar objects can remain linked.
- Reviewer generation can later cite the exact source snapshot and graph
  context used to produce a reviewer.
- Background sync needs idempotent upserts and relationship-aware stale/delete
  handling.
- The initial Phase 5A schema stays intentionally small so unvalidated graph
  tables are not created prematurely.
