-- Canonical Reviewer HTTP reads use the caller's authenticated Supabase
-- session. The existing owner-only RLS policies remain the authorization
-- boundary; this migration supplies the table-level SELECT privilege needed
-- for PostgreSQL to evaluate those policies.

revoke all on table public.generated_artifacts from anon, authenticated;
revoke all on table public.generated_artifact_versions from anon, authenticated;
revoke all on table public.source_versions from anon, authenticated;

grant select on table public.generated_artifacts to authenticated;
grant select on table public.generated_artifact_versions to authenticated;
grant select on table public.source_versions to authenticated;
