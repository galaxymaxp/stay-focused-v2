# ADR-031: Owner-bound Library summary projections

Status: Accepted for SP2 local code scope, 2026-10-15. Migration application and rollout are owner steps.

Library pages previously loaded every owned reviewer payload/source, draft and
quiz before filtering. Exact reviewer reads repeated that history scan. SP2
adds service-role-only, security-invoker summary views with explicit owner joins.
The API binds all predicates to the server-verified bearer identity. It applies
type/course/supersession filters and stable updated-time/ID pagination in the
database, and reads exact current version payloads only for detail requests.

Reviewer estimates use a stored generated column on immutable versions. Its
function mirrors shared E2 parsing, including malformed-input nulls, evidence,
key points and Unicode whitespace. This computes once at insertion/backfill
without changing payloads or weakening the immutable-version trigger. SQL
equivalence tests compare the shared estimator and the previous service output.

Summary contracts exclude source text, question bodies, draft bodies, provider
metadata and private paths. They retain automatic origin, past-course labels,
superseded reviewer IDs and quiz attempt summaries. A separate material mapping
view handles multi-source snapshots and reads badges only for visible IDs.
Older superseded artifacts remain addressable by exact ID and quiz references.

All views revoke public/anon/authenticated access and grant SELECT only to
service_role; invoker security preserves underlying RLS and grants. Every join
checks ownership even when the service role bypasses RLS. No shared user cache
or authorization change is introduced. Existing in-memory repository adapters
retain the prior assembly path for equivalence testing.

Migration `20261015040000_experience_library_projections.sql` must be applied
before deploying the API. Its stored-column backfill rewrites the version table;
the owner should schedule it appropriately and inspect the live plan/size. No
remote SQL, migration application, deployment or live plan check was performed.
