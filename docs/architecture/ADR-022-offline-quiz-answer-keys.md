# ADR-022: Owner-scoped quiz answer keys on the device

Date: 2026-10-13
Status: Accepted; implemented locally in O2b/O2c. Rollout and device acceptance pending.

## Context

O1 stores learner quiz bodies and unfinished practice locally but requires a
connection for answer reveal and scoring. Fely selected option 1 on 2026-10-13:
answer keys may be stored on the device for the signed-in student's own quizzes.
This supersedes the earlier server-only device-key policy; it does not change
the learner quiz body or grant direct Data API access to private quiz keys.

## Decision

- Store keys separately in owner-scoped SQLite `quiz_answer_keys`, identified by
  owner, quiz and version. Purge them on sign-out and offline-copy removal;
  refresh them when the accepted quiz version changes.
- Serve only grading/reveal data through an authenticated owner-only endpoint;
  deny other owners with 404. Keep learner bodies free of keys and provenance.
- Hydrate keys in O1's existing batches. Key failure must not block the body.
  Introduce no AI calls or jobs; missing keys retain the connection-required state.
- Extract the TypeScript grader into a pure `packages/shared` module used by API
  feedback/results and mobile reveal/provisional results without changing existing
  API results. PostgreSQL `complete_quiz_attempt` remains the independent persisted
  authority for `quiz_attempts.percentage`, History and Library. Do not change the
  SQL function or add a database migration.
- Enforce parity with fixture tables for all six types: sorted exact-set equality,
  one point per ordinary question, no multi-select partial credit, NFKC/lowercase/
  punctuation normalization and accepted aliases for typed corrections,
  one point per correct Matching pair, no assisted recall credit, and two-decimal
  percentages. Compare frozen pre-extraction TypeScript responses unchanged and
  run the same fixtures against the unchanged SQL function in local PGlite.
- Replay offline answers, reveals and completion through existing attempt
  endpoints. The server regrades and its result replaces the offline result;
  any discrepancy logs only a safe code. Use the secondary caption
  "Scored offline · will sync" for pending results. Persist the server attempt ID
  before replay; send assisted reveals before finalization and later reveals after
  finalization. Accept already completed server attempts after interrupted sync.

## Resolution of the O2 prerequisite

Repository inspection found two existing graders. TypeScript
`apps/api/src/lib/quiz/service.ts` calculates feedback and result scores, while
`complete_quiz_attempt` in
`packages/db/migrations/20260928131513_matching_blocks.sql` independently
calculates and persists `quiz_attempts.percentage`. History and Library use that
persisted score. Moving only TypeScript to shared leaves the SQL grader intact.

O2 stopped before implementation because its original one-implementation rule
contradicted the no-migration scope. The owner's O2b answers replace that rule:
share TypeScript, preserve all API results, keep SQL authoritative for persistence,
and test parity rather than refactor SQL. A TS/SQL fixture discrepancy is recorded
with file/line evidence while preserving server-wins; it does not authorize a SQL
change. An extraction that changes an existing API result remains a STOP.

O2b committed the shared module and owner-only endpoint. O2c completes mobile
storage with an appended device-only SQLite schema entry (version 6), bounded O1
hydration and retry, body-revision guards, purge/removal/cancellation protection,
offline check/reveal/results and server-authoritative replay. Publication identity
is the generation ID, falling back to the immutable quiz ID for retained legacy
quizzes whose generation was removed. Keys stay separate from learner bodies.

## Consequences

Answer keys are now stored only for the signed-in owner's saved quizzes. Missing
or invalid keys retain the existing connection-required behavior. Offline scores
are provisional until replay adopts the server result; discrepancy logging contains
only `offline_score_mismatch`. No AI calls, jobs, cloud migration or deployment are
introduced. Local fixture parity is verified; deployed SQL and parity on real
student data remain UNVERIFIED (owner to confirm on device check). One API deploy,
one preview OTA and physical airplane-mode/restart/reconnect acceptance remain
owner steps. See the O2c footer in `docs/ai/handoff.md` for exact gate results.
