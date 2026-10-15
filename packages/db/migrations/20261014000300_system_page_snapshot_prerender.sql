-- VL1.3: system pre-renders share exact source identity, without student quota.
-- Existing rows retain student accounting; idempotent reuse never changes origin.
alter table public.source_page_snapshots
  add column origin text not null default 'student' check (origin in ('student', 'system'));
create index source_page_snapshots_student_owner_created_idx
  on public.source_page_snapshots(user_id, created_at) where origin = 'student';

-- Shared validation and owner lock keep both reservation paths identical.
create or replace function public.reserve_source_page_snapshot_origin_v1(
  p_user_id uuid, p_source_version_id uuid, p_snapshot_item_id uuid, p_page_number integer, p_origin text
) returns setof public.source_page_snapshots language plpgsql security definer
set search_path = public, pg_temp as $$
declare
  v_item public.reviewer_source_snapshot_items%rowtype;
  v_source public.source_versions%rowtype;
  v_row public.source_page_snapshots%rowtype;
begin
  if p_origin is null or p_origin not in ('student', 'system') then
    raise exception using errcode = 'P0001', message = 'snapshot_origin_invalid';
  end if;
  perform pg_advisory_xact_lock(hashtextextended('page-snapshot:' || p_user_id::text, 0));
  if p_snapshot_item_id is null then
    select v.* into v_source from public.source_versions v
      join public.source_versions parent on parent.id = v.parent_source_version_id and parent.user_id = v.user_id
      join public.extraction_results e on e.id = v.extraction_result_id and e.user_id = v.user_id
      join public.document_assets a on a.id = v.document_asset_id and a.user_id = v.user_id
      where v.id = p_source_version_id and v.user_id = p_user_id
        and v.revision_kind = 'user_edited' and parent.revision_kind = 'normalized'
        and parent.document_asset_id = v.document_asset_id and parent.extraction_result_id = v.extraction_result_id
        and parent.content_sha256 = v.content_sha256
        and v.metadata ->> 'sourceType' = 'local_file'
        and v.metadata ->> 'mimeType' = 'application/pdf'
        and v.metadata ->> 'pageProvenance' = 'extracted'
        and e.document_asset_id = a.id and e.status = 'succeeded' and e.page_count between 1 and 100
        and a.mime_type = 'application/pdf' and a.upload_status = 'available' and a.deleted_at is null
        and p_page_number between 1 and e.page_count;
    if not found then raise exception using errcode = 'P0001', message = 'snapshot_source_invalid'; end if;
    if jsonb_typeof(v_source.metadata -> 'reviewerSourceBlocks') is distinct from 'array' then
      raise exception using errcode = 'P0001', message = 'snapshot_source_invalid';
    end if;
    if jsonb_array_length(v_source.metadata -> 'reviewerSourceBlocks') = 0 or exists (
      select 1 from jsonb_array_elements(v_source.metadata -> 'reviewerSourceBlocks') b
      where jsonb_typeof(b -> 'pageNumber') is distinct from 'number'
        or (b ->> 'pageNumber')::numeric <> trunc((b ->> 'pageNumber')::numeric)
        or (b ->> 'pageNumber')::numeric not between 1 and 100
        or b ->> 'id' is distinct from 'page-' || (b ->> 'pageNumber')
        or jsonb_typeof(b -> 'text') is distinct from 'string' or length(trim(b ->> 'text')) = 0
    ) or (select count(*) <> count(distinct b ->> 'id')
      from jsonb_array_elements(v_source.metadata -> 'reviewerSourceBlocks') b)
      or not exists (select 1 from jsonb_array_elements(v_source.metadata -> 'reviewerSourceBlocks') b
        where (b ->> 'pageNumber')::numeric = p_page_number) then
      raise exception using errcode = 'P0001', message = 'snapshot_source_invalid';
    end if;
  else
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
  end if;
  select * into v_row from public.source_page_snapshots
    where user_id = p_user_id and source_version_id = p_source_version_id and page_number = p_page_number;
  if found then return next v_row; return; end if;
  if p_origin = 'student' and (select count(*) from public.source_page_snapshots where user_id = p_user_id and origin = 'student'
      and created_at > now() - interval '24 hours') >= 20 then
    raise exception using errcode = 'P0001', message = 'snapshot_render_limit_reached';
  end if;
  insert into public.source_page_snapshots(user_id, source_version_id, source_snapshot_id, source_snapshot_item_id, page_number, origin)
    values (p_user_id, p_source_version_id, v_item.source_snapshot_id, v_item.id, p_page_number, p_origin)
    returning * into v_row;
  return next v_row;
end;
$$;

create or replace function public.reserve_source_page_snapshot_v1(
  p_user_id uuid, p_source_version_id uuid, p_snapshot_item_id uuid, p_page_number integer
) returns setof public.source_page_snapshots language sql security definer
set search_path = public, pg_temp as $$
  select * from public.reserve_source_page_snapshot_origin_v1(
    p_user_id, p_source_version_id, p_snapshot_item_id, p_page_number, 'student');
$$;

create or replace function public.reserve_source_page_snapshot_system_v1(
  p_user_id uuid, p_source_version_id uuid, p_snapshot_item_id uuid, p_page_number integer
) returns setof public.source_page_snapshots language sql security definer
set search_path = public, pg_temp as $$
  select * from public.reserve_source_page_snapshot_origin_v1(
    p_user_id, p_source_version_id, p_snapshot_item_id, p_page_number, 'system');
$$;

-- System attempts remain recorded and bounded to three claims per row.
create or replace function public.claim_source_page_snapshot_v1(p_id uuid, p_dispatch_id uuid, p_lease_token uuid)
returns setof public.source_page_snapshots language plpgsql security definer
set search_path = public, pg_temp as $$
declare v_row public.source_page_snapshots%rowtype;
begin
  select * into v_row from public.source_page_snapshots where id = p_id and dispatch_id = p_dispatch_id;
  if not found then return; end if;
  perform pg_advisory_xact_lock(hashtextextended('page-snapshot:' || v_row.user_id::text, 0));
  select * into v_row from public.source_page_snapshots where id = p_id and dispatch_id = p_dispatch_id for update;
  if v_row.status <> 'pending' or v_row.lease_expires_at > now() then return next v_row; return; end if;
  if v_row.attempt_count >= 3 or (v_row.origin = 'student' and (select count(*) from public.source_page_snapshot_render_attempts a
      join public.source_page_snapshots s on s.id = a.snapshot_id and s.user_id = a.user_id
      where a.user_id = v_row.user_id and s.origin = 'student'
        and a.created_at > now() - interval '24 hours') >= 20) then
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

revoke all on function public.reserve_source_page_snapshot_origin_v1(uuid, uuid, uuid, integer, text) from public, anon, authenticated;
grant execute on function public.reserve_source_page_snapshot_origin_v1(uuid, uuid, uuid, integer, text) to service_role;
revoke all on function public.reserve_source_page_snapshot_v1(uuid, uuid, uuid, integer) from public, anon, authenticated;
grant execute on function public.reserve_source_page_snapshot_v1(uuid, uuid, uuid, integer) to service_role;
revoke all on function public.reserve_source_page_snapshot_system_v1(uuid, uuid, uuid, integer) from public, anon, authenticated;
grant execute on function public.reserve_source_page_snapshot_system_v1(uuid, uuid, uuid, integer) to service_role;
revoke all on function public.claim_source_page_snapshot_v1(uuid, uuid, uuid) from public, anon, authenticated;
grant execute on function public.claim_source_page_snapshot_v1(uuid, uuid, uuid) to service_role;
-- VL1.2 finish/deletion fencing, RLS and owner column grants are unchanged.
