-- A soft-deleted reviewer disappears from Library, so its owner must not lose
-- the ability to end an active public link. Revoke in the same transaction.
create function public.revoke_deleted_reviewer_shares_v1()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  update public.reviewer_shares set revoked_at = coalesce(revoked_at, now()), updated_at = now()
    where user_id = new.user_id and artifact_id = new.id;
  return new;
end $$;
revoke all on function public.revoke_deleted_reviewer_shares_v1() from public, anon, authenticated;
grant execute on function public.revoke_deleted_reviewer_shares_v1() to service_role;
create trigger revoke_deleted_reviewer_shares
  after update of deleted_at on public.generated_artifacts
  for each row when (old.deleted_at is null and new.deleted_at is not null)
  execute function public.revoke_deleted_reviewer_shares_v1();
