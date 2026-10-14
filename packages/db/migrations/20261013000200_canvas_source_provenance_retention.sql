-- The claim survives the RPC transaction until Storage confirms deletion.
-- A check-only advisory lock would release before the separate HTTP remove.
create table public.canvas_object_cleanup_claims (
  bucket text not null check (bucket = 'canvas-source-files'),
  object_key text not null,
  claimed_at timestamptz not null default now(),
  primary key (bucket, object_key)
);
alter table public.canvas_object_cleanup_claims enable row level security;
revoke all on public.canvas_object_cleanup_claims from public, anon, authenticated, service_role;
grant select on public.canvas_object_cleanup_claims to service_role;

create index canvas_files_storage_reference_idx
  on public.canvas_files (storage_bucket, storage_object_key)
  where storage_object_key is not null;
create index reviewer_snapshot_stored_revision_idx
  on public.reviewer_source_snapshot_items (user_id, source_row_id, stored_content_sha256)
  where source_type = 'file' and stored_content_sha256 is not null;

create function public.claim_canvas_object_cleanup_v1(p_bucket text, p_key text)
returns boolean language plpgsql security definer
set search_path = public, pg_temp
as $$
begin
  if p_bucket is distinct from 'canvas-source-files' or p_key is null
     or p_key !~ '^canvas/[0-9a-f-]{36}/[0-9a-f-]{36}/[0-9a-f]{64}$' then
    return false;
  end if;
  perform pg_advisory_xact_lock(hashtextextended(p_bucket || '/' || p_key, 0));
  if exists (select 1 from public.canvas_files
             where storage_bucket = p_bucket and storage_object_key = p_key)
     or exists (select 1 from public.reviewer_source_snapshot_items
                where source_type = 'file' and stored_content_sha256 is not null
                  and user_id = split_part(p_key, '/', 2)::uuid
                  and source_row_id = split_part(p_key, '/', 3)::uuid
                  and stored_content_sha256 = split_part(p_key, '/', 4)) then
    return false;
  end if;
  -- Never give a second remover permission while the first HTTP call may run.
  insert into public.canvas_object_cleanup_claims(bucket, object_key)
    values (p_bucket, p_key) on conflict do nothing;
  if not found then return false; end if;
  -- Also fail closed if another trigger in this transaction added a reference
  -- while the claim was being inserted (the advisory lock is reentrant).
  if exists (select 1 from public.canvas_files
             where storage_bucket = p_bucket and storage_object_key = p_key)
     or exists (select 1 from public.reviewer_source_snapshot_items
                where source_type = 'file' and stored_content_sha256 is not null
                  and user_id = split_part(p_key, '/', 2)::uuid
                  and source_row_id = split_part(p_key, '/', 3)::uuid
                  and stored_content_sha256 = split_part(p_key, '/', 4)) then
    delete from public.canvas_object_cleanup_claims where bucket = p_bucket and object_key = p_key;
    return false;
  end if;
  return true;
end;
$$;

create function public.finish_canvas_object_cleanup_v1(p_bucket text, p_key text)
returns boolean language plpgsql security definer
set search_path = public, pg_temp
as $$
begin
  perform pg_advisory_xact_lock(hashtextextended(p_bucket || '/' || p_key, 0));
  -- Only called after successful Storage removal. Uncertain removals keep the
  -- claim indefinitely; no timeout can allow a late remove to delete new bytes.
  if exists (select 1 from storage.objects where bucket_id = p_bucket and name = p_key) then
    return false;
  end if;
  delete from public.canvas_object_cleanup_claims where bucket = p_bucket and object_key = p_key;
  return found;
end;
$$;

create function public.guard_canvas_object_reference_v1()
returns trigger language plpgsql security definer
set search_path = public, pg_temp
as $$
declare
  v_bucket text;
  v_key text;
begin
  if tg_table_name = 'reviewer_source_snapshot_items' then
    if new.source_type <> 'file' or new.stored_content_sha256 is null then
      if new.source_type = 'file' and new.file_kind = 'pdf' then
        raise exception using errcode = 'P0001', message = 'source_revision_unavailable';
      end if;
      return new;
    end if;
    v_bucket := 'canvas-source-files';
    v_key := 'canvas/' || new.user_id::text || '/' || new.source_row_id::text || '/' || new.stored_content_sha256;
  else
    if new.storage_bucket is distinct from 'canvas-source-files' or new.storage_object_key is null then
      return new;
    end if;
    -- Metadata-only updates of existing rows preserve today's behavior,
    -- including legacy rows whose object is already unavailable.
    if tg_op = 'UPDATE' then
      if new.storage_bucket is not distinct from old.storage_bucket
         and new.storage_object_key is not distinct from old.storage_object_key then
        return new;
      end if;
    end if;
    v_bucket := new.storage_bucket;
    v_key := new.storage_object_key;
  end if;
  perform pg_advisory_xact_lock(hashtextextended(v_bucket || '/' || v_key, 0));
  if exists (select 1 from public.canvas_object_cleanup_claims where bucket = v_bucket and object_key = v_key)
     or not exists (select 1 from storage.objects where bucket_id = v_bucket and name = v_key) then
    raise exception using errcode = 'P0001', message = 'source_revision_unavailable';
  end if;
  return new;
end;
$$;

-- A trigger covers every snapshot writer (including the existing snapshot RPC)
-- without copying or weakening its immutable owner/context validation.
create trigger reviewer_snapshot_canvas_object_reference
  before insert on public.reviewer_source_snapshot_items
  for each row execute function public.guard_canvas_object_reference_v1();
create trigger canvas_file_object_reference
  before insert or update of storage_bucket, storage_object_key on public.canvas_files
  for each row execute function public.guard_canvas_object_reference_v1();

revoke all on function public.claim_canvas_object_cleanup_v1(text, text) from public, anon, authenticated;
revoke all on function public.finish_canvas_object_cleanup_v1(text, text) from public, anon, authenticated;
revoke all on function public.guard_canvas_object_reference_v1() from public, anon, authenticated;
grant execute on function public.claim_canvas_object_cleanup_v1(text, text) to service_role;
grant execute on function public.finish_canvas_object_cleanup_v1(text, text) to service_role;
