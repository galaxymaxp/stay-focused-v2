-- SH1: private stored snapshots, publicly read only through the API allow-list.
create table public.reviewer_shares (
  user_id uuid not null references auth.users(id) on delete cascade,
  artifact_id uuid not null,
  token text not null unique check (token ~ '^[0-9a-f]{64}$'),
  snapshot jsonb not null check (jsonb_typeof(snapshot) = 'object' and octet_length(snapshot::text) <= 2097152),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  revoked_at timestamptz,
  primary key (user_id, artifact_id),
  foreign key (artifact_id, user_id) references public.generated_artifacts(id, user_id) on delete cascade
);
create index reviewer_shares_artifact_idx on public.reviewer_shares(artifact_id);
alter table public.reviewer_shares enable row level security;
revoke all on public.reviewer_shares from public, anon, authenticated;
grant select, insert, update on public.reviewer_shares to authenticated, service_role;
create policy reviewer_shares_owner_read on public.reviewer_shares for select to authenticated
  using ((select auth.uid()) = user_id);
create policy reviewer_shares_owner_create on public.reviewer_shares for insert to authenticated
  with check ((select auth.uid()) = user_id and exists (
    select 1 from public.generated_artifacts a where a.id = artifact_id
      and a.user_id = (select auth.uid()) and a.artifact_type = 'reviewer' and a.deleted_at is null));
create policy reviewer_shares_owner_update on public.reviewer_shares for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id and exists (
    select 1 from public.generated_artifacts a where a.id = artifact_id
      and a.user_id = (select auth.uid()) and a.artifact_type = 'reviewer' and a.deleted_at is null));

-- Serialize owner operations. Create is idempotent; update never revives a
-- revoked link. New sharing after revocation rotates the token permanently.
create function public.mutate_reviewer_share_v1(p_user_id uuid, p_artifact_id uuid,
  p_action text, p_token text, p_version_id uuid, p_snapshot jsonb)
returns setof public.reviewer_shares language plpgsql security invoker set search_path = '' as $$
declare r public.reviewer_shares%rowtype;
begin
  if p_action not in ('create', 'update', 'revoke') then raise exception 'invalid_request'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_user_id::text || ':' || p_artifact_id::text, 831));
  perform 1 from public.generated_artifacts a where a.id = p_artifact_id and a.user_id = p_user_id
    and a.artifact_type = 'reviewer' and a.deleted_at is null
    and (p_action = 'revoke' or a.latest_version_id = p_version_id) for share;
  if not found then raise exception 'not_found'; end if;
  select * into r from public.reviewer_shares where user_id = p_user_id and artifact_id = p_artifact_id for update;
  if p_action = 'revoke' then
    update public.reviewer_shares set revoked_at = coalesce(revoked_at, now()), updated_at = now()
      where user_id = p_user_id and artifact_id = p_artifact_id;
  elsif p_action = 'update' then
    if r.token is null or r.revoked_at is not null then raise exception 'not_found'; end if;
    update public.reviewer_shares set snapshot = p_snapshot, updated_at = now()
      where user_id = p_user_id and artifact_id = p_artifact_id;
  elsif r.token is null then
    insert into public.reviewer_shares(user_id, artifact_id, token, snapshot)
      values(p_user_id, p_artifact_id, p_token, p_snapshot);
  elsif r.revoked_at is not null then
    update public.reviewer_shares set token = p_token, snapshot = p_snapshot,
      created_at = now(), updated_at = now(), revoked_at = null
      where user_id = p_user_id and artifact_id = p_artifact_id;
  end if;
  return query select * from public.reviewer_shares where user_id = p_user_id and artifact_id = p_artifact_id;
end $$;
revoke all on function public.mutate_reviewer_share_v1(uuid,uuid,text,text,uuid,jsonb) from public, anon, authenticated;
grant execute on function public.mutate_reviewer_share_v1(uuid,uuid,text,text,uuid,jsonb) to service_role;
