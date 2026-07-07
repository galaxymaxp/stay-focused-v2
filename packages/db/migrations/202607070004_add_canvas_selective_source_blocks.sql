create extension if not exists pgcrypto;

alter table public.canvas_source_preview_sessions
  add column if not exists selected_block_manifest jsonb not null default '[]'::jsonb;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'canvas_source_preview_sessions_selected_block_manifest_array'
      and conrelid = 'public.canvas_source_preview_sessions'::regclass
  ) then
    alter table public.canvas_source_preview_sessions
      add constraint canvas_source_preview_sessions_selected_block_manifest_array
      check (
        jsonb_typeof(selected_block_manifest) = 'array'
        and jsonb_array_length(selected_block_manifest) <= 250
      );
  end if;
end;
$$;

create table if not exists public.canvas_source_structure_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  canvas_connection_id uuid not null,
  course_id uuid not null,
  source_count integer not null,
  source_manifest jsonb not null,
  block_count integer not null,
  block_manifest jsonb not null,
  structure_version text not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  constraint canvas_source_structure_sessions_id_user_unique
    unique (id, user_id),
  constraint canvas_source_structure_sessions_id_owner_course_unique
    unique (id, user_id, canvas_connection_id, course_id),
  constraint canvas_source_structure_sessions_source_count_limit
    check (source_count between 1 and 8),
  constraint canvas_source_structure_sessions_source_manifest_array
    check (
      jsonb_typeof(source_manifest) = 'array'
      and jsonb_array_length(source_manifest) = source_count
    ),
  constraint canvas_source_structure_sessions_block_count_limit
    check (block_count between 1 and 400),
  constraint canvas_source_structure_sessions_block_manifest_array
    check (
      jsonb_typeof(block_manifest) = 'array'
      and jsonb_array_length(block_manifest) = block_count
    ),
  constraint canvas_source_structure_sessions_version_length
    check (
      char_length(btrim(structure_version)) > 0
      and char_length(structure_version) <= 80
    ),
  constraint canvas_source_structure_sessions_expiry_window
    check (
      expires_at > created_at
      and expires_at <= created_at + interval '24 hours'
    )
);

create index if not exists canvas_source_structure_sessions_user_created_idx
  on public.canvas_source_structure_sessions (user_id, created_at desc);

create index if not exists canvas_source_structure_sessions_expires_idx
  on public.canvas_source_structure_sessions (expires_at);

drop trigger if exists canvas_source_structure_sessions_validate_owner
  on public.canvas_source_structure_sessions;
create trigger canvas_source_structure_sessions_validate_owner
before insert on public.canvas_source_structure_sessions
for each row
execute function public.validate_canvas_source_preview_session_owner();

drop trigger if exists canvas_source_structure_sessions_no_update
  on public.canvas_source_structure_sessions;
create trigger canvas_source_structure_sessions_no_update
before update on public.canvas_source_structure_sessions
for each row
execute function public.prevent_source_provenance_update();

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'reviewer_source_snapshot_items_id_snapshot_owner_unique'
      and conrelid = 'public.reviewer_source_snapshot_items'::regclass
  ) then
    alter table public.reviewer_source_snapshot_items
      add constraint reviewer_source_snapshot_items_id_snapshot_owner_unique
      unique (id, source_snapshot_id, user_id);
  end if;
end;
$$;

create table if not exists public.reviewer_source_snapshot_blocks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source_snapshot_id uuid not null,
  source_snapshot_item_id uuid not null,
  ordinal integer not null,
  source_ordinal integer not null,
  block_ordinal integer not null,
  block_kind text not null,
  block_text text not null,
  block_sha256 text not null,
  heading_level integer,
  list_depth integer,
  list_style text,
  table_structure jsonb,
  page_number integer,
  slide_number integer,
  module_position integer,
  parser_version text,
  ocr_version text,
  created_at timestamptz not null default now(),
  constraint reviewer_source_snapshot_blocks_snapshot_owner_fkey
    foreign key (source_snapshot_id, user_id)
    references public.reviewer_source_snapshots (id, user_id)
    on delete cascade,
  constraint reviewer_source_snapshot_blocks_item_context_fkey
    foreign key (source_snapshot_item_id, source_snapshot_id, user_id)
    references public.reviewer_source_snapshot_items (
      id,
      source_snapshot_id,
      user_id
    )
    on delete cascade,
  constraint reviewer_source_snapshot_blocks_snapshot_ordinal_unique
    unique (source_snapshot_id, ordinal),
  constraint reviewer_source_snapshot_blocks_kind_allowed
    check (
      block_kind in (
        'heading',
        'paragraph',
        'list_item',
        'table',
        'quote',
        'code'
      )
    ),
  constraint reviewer_source_snapshot_blocks_ordinal_limit
    check (ordinal between 1 and 250),
  constraint reviewer_source_snapshot_blocks_source_ordinal_limit
    check (source_ordinal between 1 and 8),
  constraint reviewer_source_snapshot_blocks_block_ordinal_limit
    check (block_ordinal between 1 and 400),
  constraint reviewer_source_snapshot_blocks_text_length
    check (
      char_length(btrim(block_text)) > 0
      and char_length(block_text) <= 20000
    ),
  constraint reviewer_source_snapshot_blocks_sha256_format
    check (block_sha256 ~ '^[a-f0-9]{64}$'),
  constraint reviewer_source_snapshot_blocks_heading_level
    check (heading_level is null or heading_level between 1 and 6),
  constraint reviewer_source_snapshot_blocks_list_depth
    check (list_depth is null or list_depth >= 0),
  constraint reviewer_source_snapshot_blocks_list_style
    check (list_style is null or list_style in ('ordered', 'unordered')),
  constraint reviewer_source_snapshot_blocks_table_structure
    check (table_structure is null or jsonb_typeof(table_structure) = 'object'),
  constraint reviewer_source_snapshot_blocks_page_number
    check (page_number is null or page_number > 0),
  constraint reviewer_source_snapshot_blocks_slide_number
    check (slide_number is null or slide_number > 0),
  constraint reviewer_source_snapshot_blocks_module_position
    check (module_position is null or module_position >= 0),
  constraint reviewer_source_snapshot_blocks_parser_version_length
    check (
      parser_version is null
      or (
        char_length(btrim(parser_version)) > 0
        and char_length(parser_version) <= 80
      )
    ),
  constraint reviewer_source_snapshot_blocks_ocr_version_length
    check (
      ocr_version is null
      or (
        char_length(btrim(ocr_version)) > 0
        and char_length(ocr_version) <= 80
      )
    )
);

create index if not exists reviewer_source_snapshot_blocks_snapshot_idx
  on public.reviewer_source_snapshot_blocks (source_snapshot_id, ordinal);

create index if not exists reviewer_source_snapshot_blocks_item_idx
  on public.reviewer_source_snapshot_blocks (source_snapshot_item_id);

create index if not exists reviewer_source_snapshot_blocks_user_idx
  on public.reviewer_source_snapshot_blocks (user_id, created_at desc);

drop trigger if exists reviewer_source_snapshot_blocks_no_update
  on public.reviewer_source_snapshot_blocks;
create trigger reviewer_source_snapshot_blocks_no_update
before update on public.reviewer_source_snapshot_blocks
for each row
execute function public.prevent_source_provenance_update();

create or replace function public.create_reviewer_source_snapshot(
  p_user_id uuid,
  p_preview_session_id uuid,
  p_source_title text,
  p_exact_source_text text,
  p_exact_source_sha256 text,
  p_was_edited boolean
)
returns table (id uuid)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_session public.canvas_source_preview_sessions%rowtype;
  v_snapshot public.reviewer_source_snapshots%rowtype;
  v_expected_block_count integer;
  v_inserted_block_count integer;
begin
  if p_user_id is null
    or p_preview_session_id is null
    or nullif(btrim(p_source_title), '') is null
    or p_exact_source_text is null
    or p_exact_source_sha256 !~ '^[a-f0-9]{64}$'
  then
    raise exception using errcode = 'P0001', message = 'source_snapshot_invalid';
  end if;

  select *
  into v_session
  from public.canvas_source_preview_sessions session
  where session.id = p_preview_session_id
    and session.user_id = p_user_id;

  if v_session.id is null then
    raise exception using errcode = 'P0001', message = 'canvas_preview_session_not_found';
  end if;

  if v_session.expires_at <= now() then
    raise exception using errcode = 'P0001', message = 'canvas_preview_session_expired';
  end if;

  insert into public.reviewer_source_snapshots (
    user_id,
    preview_session_id,
    canvas_connection_id,
    course_id,
    source_mode,
    source_title,
    original_preview_sha256,
    exact_source_text,
    exact_source_sha256,
    source_count,
    was_edited,
    normalization_version
  )
  values (
    p_user_id,
    p_preview_session_id,
    v_session.canvas_connection_id,
    v_session.course_id,
    'canvas',
    left(btrim(p_source_title), 120),
    v_session.original_preview_sha256,
    p_exact_source_text,
    p_exact_source_sha256,
    v_session.source_count,
    coalesce(p_was_edited, false),
    v_session.normalization_version
  )
  on conflict on constraint reviewer_source_snapshots_dedupe_unique
  do nothing
  returning *
  into v_snapshot;

  if v_snapshot.id is null then
    select *
    into v_snapshot
    from public.reviewer_source_snapshots snapshot
    where snapshot.user_id = p_user_id
      and snapshot.preview_session_id = p_preview_session_id
      and snapshot.exact_source_sha256 = p_exact_source_sha256
      and snapshot.source_title = left(btrim(p_source_title), 120);
  else
    insert into public.reviewer_source_snapshot_items (
      user_id,
      source_snapshot_id,
      ordinal,
      source_type,
      source_title,
      source_row_id,
      canvas_connection_id,
      course_id,
      canvas_course_id,
      canvas_source_object_id,
      module_id,
      module_item_id,
      file_id,
      file_kind,
      mime_type,
      page_count,
      canvas_updated_at,
      local_synced_at,
      normalized_content_sha256,
      stored_content_sha256,
      parser_version,
      ocr_version
    )
    select
      p_user_id,
      v_snapshot.id,
      manifest.ordinal,
      manifest.source_type,
      manifest.source_title,
      manifest.source_row_id,
      manifest.canvas_connection_id,
      manifest.course_id,
      manifest.canvas_course_id,
      manifest.canvas_source_object_id,
      manifest.module_id,
      manifest.module_item_id,
      manifest.file_id,
      manifest.file_kind,
      manifest.mime_type,
      manifest.page_count,
      manifest.canvas_updated_at,
      manifest.local_synced_at,
      manifest.normalized_content_sha256,
      manifest.stored_content_sha256,
      manifest.parser_version,
      manifest.ocr_version
    from jsonb_to_recordset(v_session.source_manifest) as manifest(
      ordinal integer,
      source_type text,
      source_title text,
      source_row_id uuid,
      canvas_connection_id uuid,
      course_id uuid,
      canvas_course_id text,
      canvas_source_object_id text,
      module_id text,
      module_item_id text,
      file_id text,
      file_kind text,
      mime_type text,
      page_count integer,
      canvas_updated_at timestamptz,
      local_synced_at timestamptz,
      normalized_content_sha256 text,
      stored_content_sha256 text,
      parser_version text,
      ocr_version text
    );

    v_expected_block_count :=
      jsonb_array_length(coalesce(v_session.selected_block_manifest, '[]'::jsonb));

    if v_expected_block_count > 0 then
      with inserted_blocks as (
        insert into public.reviewer_source_snapshot_blocks (
          user_id,
          source_snapshot_id,
          source_snapshot_item_id,
          ordinal,
          source_ordinal,
          block_ordinal,
          block_kind,
          block_text,
          block_sha256,
          heading_level,
          list_depth,
          list_style,
          table_structure,
          page_number,
          slide_number,
          module_position,
          parser_version,
          ocr_version
        )
        select
          p_user_id,
          v_snapshot.id,
          item.id,
          block.ordinal,
          block.source_ordinal,
          block.block_ordinal,
          block.block_kind,
          block.block_text,
          block.block_sha256,
          block.heading_level,
          block.list_depth,
          block.list_style,
          block.table_structure,
          block.page_number,
          block.slide_number,
          block.module_position,
          block.parser_version,
          block.ocr_version
        from jsonb_to_recordset(v_session.selected_block_manifest) as block(
          ordinal integer,
          source_ordinal integer,
          block_ordinal integer,
          block_kind text,
          block_text text,
          block_sha256 text,
          heading_level integer,
          list_depth integer,
          list_style text,
          table_structure jsonb,
          page_number integer,
          slide_number integer,
          module_position integer,
          parser_version text,
          ocr_version text
        )
        join public.reviewer_source_snapshot_items item
          on item.source_snapshot_id = v_snapshot.id
         and item.user_id = p_user_id
         and item.ordinal = block.source_ordinal
        returning 1
      )
      select count(*) into v_inserted_block_count
      from inserted_blocks;

      if v_inserted_block_count <> v_expected_block_count then
        raise exception using errcode = 'P0001', message = 'source_snapshot_failed';
      end if;
    end if;
  end if;

  if v_snapshot.id is null then
    raise exception using errcode = 'P0001', message = 'source_snapshot_failed';
  end if;

  return query select v_snapshot.id;
end;
$$;

create or replace function public.cleanup_expired_canvas_source_structure_sessions(
  p_before timestamptz default now()
)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_deleted integer;
begin
  delete from public.canvas_source_structure_sessions session
  where session.expires_at < p_before;

  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$$;

alter table public.canvas_source_structure_sessions enable row level security;
alter table public.reviewer_source_snapshot_blocks enable row level security;

revoke all on table public.canvas_source_structure_sessions from public;
revoke all on table public.canvas_source_structure_sessions from anon;
revoke all on table public.canvas_source_structure_sessions from authenticated;
grant select, insert, delete on table public.canvas_source_structure_sessions
  to service_role;

revoke all on table public.reviewer_source_snapshot_blocks from public;
revoke all on table public.reviewer_source_snapshot_blocks from anon;
revoke all on table public.reviewer_source_snapshot_blocks from authenticated;
grant select, insert, delete on table public.reviewer_source_snapshot_blocks
  to service_role;

revoke all on function public.cleanup_expired_canvas_source_structure_sessions(
  timestamp with time zone
) from public;
revoke all on function public.cleanup_expired_canvas_source_structure_sessions(
  timestamp with time zone
) from anon;
revoke all on function public.cleanup_expired_canvas_source_structure_sessions(
  timestamp with time zone
) from authenticated;
grant execute on function public.cleanup_expired_canvas_source_structure_sessions(
  timestamp with time zone
) to service_role;
