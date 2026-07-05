# ADR-007 - Capability-Based Canvas Integration

Date: 2026-07-05

Status: Accepted

## Context

Canvas permissions vary by institution, account, course, role, and feature
flag. A token that can read the current profile and courses may still be unable
to read modules, files, grades, quizzes, planner items, captions, conversations,
or external-tool content.

Treating a successful connection as proof that every endpoint works would create
false UI promises and unsafe assumptions for future reviewer, scheduling, and
grade-planning features.

## Decision

Stay Focused will probe and record Canvas capabilities independently. Capability
records store a normalized capability, status, test timestamp, safe error code,
and optional course context. Most capabilities can remain `not_tested` until a
later phase needs them.

The app reports partial support honestly. A permission error for one capability
does not fail the whole connection when the core profile/course validation has
succeeded.

## Consequences

- Mobile can show compact, honest summaries such as available, permission
  dependent, and not tested.
- Future sync jobs can decide what to attempt based on recorded capability
  states.
- Raw upstream Canvas responses and arbitrary debug payloads are not stored.
- Tests must prove capability failures stay isolated.
