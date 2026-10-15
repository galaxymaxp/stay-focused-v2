-- VL1: lazy snapshots of the exact accepted, unedited Canvas PDF revision.
create table public.source_page_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source_version_id uuid not null,
  source_snapshot_id uuid not null,
  source_snapshot_item_id uuid not null,
  page_number integer not null check (page_number between 1 and 100),
  status text not null default 'pending' check (status in ('pending', 'ready', 'failed')),
  storage_path text,
  width integer,
  height integer,
  error_code text check (error_code in ('render_failed', 'source_revision_unavailable', 'render_limit_reached')),
  dispatch_id uuid not null default gen_random_uuid(),
  dispatched_at timestamptz,
  lease_token uuid,
  lease_expires_at timestamptz,
  attempt_count integer not null default 0 check (attempt_count between 0 and 3),
  created_at timestamptz not null default now(),
  unique (user_id, source_version_id, page_number),
  foreign key (source_version_id, user_id) references public.source_versions(id, user_id) on delete cascade,
  foreign key (source_snapshot_item_id, source_snapshot_id, user_id)
    references public.reviewer_source_snapshot_items(id, source_snapshot_id, user_id) on delete cascade,
  check ((status = 'ready' and storage_path is not null and width between 1 and 1400 and height between 1 and 10000)
    or (status <> 'ready' and storage_path is null and width is null and height is null)),
  check (storage_path is null or storage_path ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}[.]png$')
);
create index source_page_snapshots_owner_created_idx on public.source_page_snapshots(user_id, created_at);
alter table public.source_page_snapshots enable row level security;
revoke all on public.source_page_snapshots from public, anon, authenticated;
-- The private locator and dispatch/lease details are never direct client data.
grant select (id, user_id, source_version_id, page_number, status, width, height, created_at)
  on public.source_page_snapshots to authenticated;
grant all on public.source_page_snapshots to service_role;
create policy source_page_snapshots_owner_select on public.source_page_snapshots
  for select to authenticated using ((select auth.uid()) = user_id);

-- Each claim reserves one render, including retries. Serialized rolling 24h cap.
create table public.source_page_snapshot_render_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  snapshot_id uuid not null references public.source_page_snapshots(id) on delete cascade,
  created_at timestamptz not null default now()
);
create index source_page_snapshot_attempts_owner_created_idx
  on public.source_page_snapshot_render_attempts(user_id, created_at);
alter table public.source_page_snapshot_render_attempts enable row level security;
revoke all on public.source_page_snapshot_render_attempts from public, anon, authenticated;
grant select, insert on public.source_page_snapshot_render_attempts to service_role;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('source-page-snapshots', 'source-page-snapshots', false, 10485760, array['image/png'])
on conflict (id) do nothing;
-- No authenticated/anon Storage policy: the API signs owned, ready rows only.

create function public.reserve_source_page_snapshot_v1(
  p_user_id uuid, p_source_version_id uuid, p_snapshot_item_id uuid, p_page_number integer
) returns setof public.source_page_snapshots language plpgsql security definer
set search_path = public, pg_temp as $$
declare
  v_item public.reviewer_source_snapshot_items%rowtype;
  v_row public.source_page_snapshots%rowtype;
begin
  perform pg_advisory_xact_lock(hashtextextended('page-snapshot:' || p_user_id::text, 0));
  select i.* into v_item from public.reviewer_source_snapshot_items i
    join public.reviewer_source_snapshots s on s.id = i.source_snapshot_id and s.user_id = i.user_id
    join public.source_versions v on v.id = p_source_version_id and v.user_id = i.user_id
    where i.id = p_snapshot_item_id and i.user_id = p_user_id
      and s.source_mode = 'canvas' and not s.was_edited and s.source_count = 1
      and i.source_type = 'file' and i.file_kind = 'pdf'
      and v.revision_kind <> 'user_edited'
      and v.metadata ->> 'reviewerSourceSnapshotId' = s.id::text
      and p_page_number between 1 and i.page_count;
  if not found then raise exception using errcode = 'P0001', message = 'snapshot_source_invalid'; end if;
  select * into v_row from public.source_page_snapshots
    where user_id = p_user_id and source_version_id = p_source_version_id and page_number = p_page_number;
  if found then return next v_row; return; end if;
  if (select count(*) from public.source_page_snapshots where user_id = p_user_id
      and created_at > now() - interval '24 hours') >= 20 then
    raise exception using errcode = 'P0001', message = 'snapshot_render_limit_reached';
  end if;
  insert into public.source_page_snapshots(user_id, source_version_id, source_snapshot_id, source_snapshot_item_id, page_number)
    values (p_user_id, p_source_version_id, v_item.source_snapshot_id, v_item.id, p_page_number)
    returning * into v_row;
  return next v_row;
end;
$$;

create function public.claim_source_page_snapshot_v1(p_id uuid, p_dispatch_id uuid, p_lease_token uuid)
returns setof public.source_page_snapshots language plpgsql security definer
set search_path = public, pg_temp as $$
declare v_row public.source_page_snapshots%rowtype;
begin
  select * into v_row from public.source_page_snapshots where id = p_id and dispatch_id = p_dispatch_id;
  if not found then return; end if;
  perform pg_advisory_xact_lock(hashtextextended('page-snapshot:' || v_row.user_id::text, 0));
  select * into v_row from public.source_page_snapshots where id = p_id and dispatch_id = p_dispatch_id for update;
  if v_row.status <> 'pending' or v_row.lease_expires_at > now() then return next v_row; return; end if;
  if v_row.attempt_count >= 3 or (select count(*) from public.source_page_snapshot_render_attempts
      where user_id = v_row.user_id and created_at > now() - interval '24 hours') >= 20 then
    update public.source_page_snapshots set status = 'failed', error_code = 'render_limit_reached',
      lease_token = null, lease_expires_at = null where id = p_id returning * into v_row;
    return next v_row; return;
  end if;
  insert into public.source_page_snapshot_render_attempts(user_id, snapshot_id) values (v_row.user_id, p_id);
  update public.source_page_snapshots set lease_token = p_lease_token, lease_expires_at = now() + interval '5 minutes',
    attempt_count = attempt_count + 1 where id = p_id returning * into v_row;
  return next v_row;
end;
$$;

create function public.finish_source_page_snapshot_v1(
  p_id uuid, p_lease_token uuid, p_storage_path text, p_width integer, p_height integer, p_error_code text
) returns boolean language plpgsql security definer set search_path = public, pg_temp as $$
begin
  update public.source_page_snapshots set status = case when p_error_code is null then 'ready' else 'failed' end,
    storage_path = case when p_error_code is null then p_storage_path end,
    width = case when p_error_code is null then p_width end, height = case when p_error_code is null then p_height end,
    error_code = p_error_code, lease_token = null, lease_expires_at = null
    where id = p_id and status = 'pending' and lease_token = p_lease_token and lease_expires_at > now();
  return found;
end;
$$;
revoke all on function public.reserve_source_page_snapshot_v1(uuid, uuid, uuid, integer) from public, anon, authenticated;
revoke all on function public.claim_source_page_snapshot_v1(uuid, uuid, uuid) from public, anon, authenticated;
revoke all on function public.finish_source_page_snapshot_v1(uuid, uuid, text, integer, integer, text) from public, anon, authenticated;
grant execute on function public.reserve_source_page_snapshot_v1(uuid, uuid, uuid, integer) to service_role;
grant execute on function public.claim_source_page_snapshot_v1(uuid, uuid, uuid) to service_role;
grant execute on function public.finish_source_page_snapshot_v1(uuid, uuid, text, integer, integer, text) to service_role;
