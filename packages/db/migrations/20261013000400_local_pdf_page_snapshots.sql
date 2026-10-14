-- VL1.2: bind local snapshots directly to their immutable accepted source version.
-- Local uploads retain their existing deletion/cleanup policy. No retention change.
alter table public.source_page_snapshots
  alter column source_snapshot_id drop not null,
  alter column source_snapshot_item_id drop not null,
  add constraint source_page_snapshots_binding_pair
    check ((source_snapshot_id is null) = (source_snapshot_item_id is null));

create or replace function public.reserve_source_page_snapshot_v1(
  p_user_id uuid, p_source_version_id uuid, p_snapshot_item_id uuid, p_page_number integer
) returns setof public.source_page_snapshots language plpgsql security definer
set search_path = public, pg_temp as $$
declare
  v_item public.reviewer_source_snapshot_items%rowtype;
  v_source public.source_versions%rowtype;
  v_row public.source_page_snapshots%rowtype;
begin
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
revoke all on function public.reserve_source_page_snapshot_v1(uuid, uuid, uuid, integer) from public, anon, authenticated;
grant execute on function public.reserve_source_page_snapshot_v1(uuid, uuid, uuid, integer) to service_role;

-- Deletion may win after download/upload. Fence publication without changing deletion.
create or replace function public.finish_source_page_snapshot_v1(
  p_id uuid, p_lease_token uuid, p_storage_path text, p_width integer, p_height integer, p_error_code text
) returns boolean language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_error text := p_error_code;
  v_available_asset uuid;
begin
  if v_error is null and exists (
    select 1 from public.source_page_snapshots s where s.id = p_id and s.source_snapshot_item_id is null
  ) then
    select a.id into v_available_asset from public.source_page_snapshots s
      join public.source_versions v on v.id = s.source_version_id and v.user_id = s.user_id
      join public.document_assets a on a.id = v.document_asset_id and a.user_id = v.user_id
      where s.id = p_id and a.deleted_at is null and a.upload_status = 'available'
      for share of a;
    if not found then v_error := 'source_revision_unavailable'; end if;
  end if;
  update public.source_page_snapshots set status = case when v_error is null then 'ready' else 'failed' end,
    storage_path = case when v_error is null then p_storage_path end,
    width = case when v_error is null then p_width end, height = case when v_error is null then p_height end,
    error_code = v_error, lease_token = null, lease_expires_at = null
    where id = p_id and status = 'pending' and lease_token = p_lease_token and lease_expires_at > now();
  -- A deletion denial is definite: the worker removes its unreferenced upload.
  -- The failed row acknowledges the next delivery without another render.
  return found and (p_error_code is not null or v_error is null);
end;
$$;
revoke all on function public.finish_source_page_snapshot_v1(uuid, uuid, text, integer, integer, text) from public, anon, authenticated;
grant execute on function public.finish_source_page_snapshot_v1(uuid, uuid, text, integer, integer, text) to service_role;
