create or replace function public.soft_delete_generated_artifact(
  p_user_id uuid,
  p_artifact_id uuid,
  p_deleted_at timestamptz default now()
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.generated_artifacts as artifact
  set deleted_at = coalesce(artifact.deleted_at, p_deleted_at),
      updated_at = p_deleted_at
  where artifact.id = p_artifact_id
    and artifact.user_id = p_user_id;

  return found;
end;
$$;

revoke all on function public.soft_delete_generated_artifact(
  uuid,
  uuid,
  timestamptz
) from public, anon, authenticated;
grant execute on function public.soft_delete_generated_artifact(
  uuid,
  uuid,
  timestamptz
) to service_role;
