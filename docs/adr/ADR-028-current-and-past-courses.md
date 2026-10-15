# ADR-028: Current and past courses

Date: 2026-10-15
Status: Implemented locally for CQ1; migration/rollout/device acceptance remains owner work.

## Context

Testers find previous courses overwhelming. SP0 established that Canvas already
returns term/conclusion/enrollment evidence, while stored inventory retained
only course dates and workflow state. Default Term has no trustworthy end date.
Course selection controls sync participation and cannot double as a manual
current/past choice. Existing generated study work must remain available.

## Decision

`packages/shared/src/course-state.ts` owns the TypeScript rule. A course is past
when Canvas explicitly concludes/completes its course or enrollment, or when a
course/term end timestamp is strictly before now. Missing or invalid dates do
not establish completion. Section dates, names, term IDs, old assignments and
inactivity do not classify a course as past. A nullable `current`/`past` override
on the owner-scoped `canvas_courses` row wins in both directions; null restores
automatic classification. Existing course RLS, foreign keys and explicit grants
remain in force. The authenticated API validates ownership before writing, uses
an owner/connection/id fence on update, and safely denies foreign/missing rows.

Forward-only migration `20261015030000_current_and_past_courses.sql` stores
bounded conclusion/enrollment/term evidence and the override. Canvas inventory
upserts explicitly omit the override. The existing routine active-course call
also requests term/concluded evidence. A second migration,
`20261015030100_past_course_poll_sync_guard.sql`, rechecks state at atomic poll
sync reservation, preserving activity/selection/ownership checks and caps.
Both are files only in this run; neither is applied remotely.

Course responses return `courseState` and `courseStateOverridden`. The old
classification remains an availability/sync hint. The new state determines
visibility. Both apps collapse a Past courses section below current courses,
including their connection/sync screens, and offer Move to past courses / Move
to current in course options. The current override restores ended courses to
the current group. Existing tokens and Reduce Motion behavior are reused.

Today, Tasks, calendar deadlines, scheduled Canvas sessions and planning share
the existing owner-scoped activity eligibility path. Announcements, Queue and
notification fan-out additionally filter past courses. Queue resolves course
identity only from server-owned source metadata/canonical assignment rows; it
never returns private source metadata. History scans through hidden pages rather
than treating a filtered empty page as the end. Read failures and safety bounds
fail closed. Legacy processing reconciliation asks for the Queue projection so
per-id reconciliation cannot resurrect hidden entries; direct generation/result
reads remain available. Older local unaccepted requests resolve missing course
attribution through existing authenticated activity/Library reads and keep their
original idempotency key. Unknown evidence remains visible and retryable.

Routine account sync, notification polling, poll-trigger admission, preparation
backfill, automatic preparation and automatic reviewers skip past courses. An
explicit past-course open or refresh uses one existing durable content/grades
sync pair. Web account refresh does not suppress that explicit visit; mobile
guards each open from repeated admission during polling. Accepted job lifecycle,
quotas, persistence, cancellation and provider pagination remain unchanged.

Library list/detail, saved Reviewer bodies, quizzes and prepared materials are
retained and course labels remain visible. No generated/prepared result is
deleted. SP1 successful-refresh merging replaces state on surviving ids and
removes excluded activity ids; historical cached responses remain readable until
refresh establishes current state. Optional DTO state fields support those older
owner-scoped snapshots and older servers during owner-managed rollout.

## Verification and consequences

See [CQ1 acceptance](../ai/acceptance/cq1-current-and-past-courses.md) for exact
fresh suite counts, first failures, gates, commits and owner steps. Local PGlite
executes the new migration and reservation logic with synthetic data. This does
not establish deployed schema, production course counts, physical-device behavior
or actual speed improvements. Default Term/CIT17 evidence is **UNVERIFIED (owner
to confirm)**. Rollout must apply both migrations before API/worker publication;
deployments, OTA and device/browser acceptance remain owner-present work.
