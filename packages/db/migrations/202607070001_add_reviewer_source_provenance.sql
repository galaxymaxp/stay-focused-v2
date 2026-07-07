create extension if not exists pgcrypto;

create table if not exists public.canvas_source_preview_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  canvas_connection_id uuid not null,
  course_id uuid not null,
  original_preview_text text not null,
  original_preview_sha256 text not null,
  suggested_title text not null,
  source_count integer not null,
  source_manifest jsonb not null,
  normalization_version text not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  constraint canvas_source_preview_sessions_id_user_unique
    unique (id, user_id),
  constraint canvas_source_preview_sessions_id_owner_course_unique
    unique (id, user_id, canvas_connection_id, course_id),
  constraint canvas_source_preview_sessions_preview_length
    check (char_length(original_preview_text) <= 90000),
  constraint canvas_source_preview_sessions_sha256_format
    check (original_preview_sha256 ~ '^[a-f0-9]{64}$'),
  constraint canvas_source_preview_sessions_title_length
    check (
      char_length(btrim(suggested_title)) > 0
      and char_length(suggested_title) <= 120
    ),
  constraint canvas_source_preview_sessions_source_count_limit
    check (source_count between 1 and 8),
  constraint canvas_source_preview_sessions_manifest_array
    check (
      jsonb_typeof(source_manifest) = 'array'
      and jsonb_array_length(source_manifest) = source_count
    ),
  constraint canvas_source_preview_sessions_version_length
    check (
      char_length(btrim(normalization_version)) > 0
      and char_length(normalization_version) <= 80
    ),
  constraint canvas_source_preview_sessions_expiry_window
    check (
      expires_at > created_at
      and expires_at <= created_at + interval '24 hours'
    )
);

create index if not exists canvas_source_preview_sessions_user_created_idx
  on public.canvas_source_preview_sessions (user_id, created_at desc);

create index if not exists canvas_source_preview_sessions_expires_idx
  on public.canvas_source_preview_sessions (expires_at);

create or replace function public.validate_canvas_source_preview_session_owner()
returns trigger
language plpgsql
security invoker
as $$
begin
  if not exists (
    select 1
    from public.canvas_courses course
    where course.id = new.course_id
      and course.user_id = new.user_id
      and course.canvas_connection_id = new.canvas_connection_id
  ) then
    raise exception using errcode = 'P0001', message = 'canvas_preview_session_invalid';
  end if;

  return new;
end;
$$;

drop trigger if exists canvas_source_preview_sessions_validate_owner
  on public.canvas_source_preview_sessions;
create trigger canvas_source_preview_sessions_validate_owner
before insert on public.canvas_source_preview_sessions
for each row
execute function public.validate_canvas_source_preview_session_owner();

create table if not exists public.reviewer_source_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  preview_session_id uuid not null,
  canvas_connection_id uuid not null,
  course_id uuid not null,
  source_mode text not null,
  source_title text not null,
  original_preview_sha256 text not null,
  exact_source_text text not null,
  exact_source_sha256 text not null,
  source_count integer not null,
  was_edited boolean not null,
  normalization_version text not null,
  created_at timestamptz not null default now(),
  constraint reviewer_source_snapshots_preview_owner_fkey
    foreign key (
      preview_session_id,
      user_id,
      canvas_connection_id,
      course_id
    )
    references public.canvas_source_preview_sessions (
      id,
      user_id,
      canvas_connection_id,
      course_id
    )
    on delete restrict,
  constraint reviewer_source_snapshots_id_user_unique
    unique (id, user_id),
  constraint reviewer_source_snapshots_dedupe_unique
    unique (user_id, preview_session_id, exact_source_sha256, source_title),
  constraint reviewer_source_snapshots_mode_allowed
    check (source_mode = 'canvas'),
  constraint reviewer_source_snapshots_title_length
    check (
      char_length(btrim(source_title)) > 0
      and char_length(source_title) <= 120
    ),
  constraint reviewer_source_snapshots_exact_text_length
    check (char_length(exact_source_text) <= 100000),
  constraint reviewer_source_snapshots_original_sha256_format
    check (original_preview_sha256 ~ '^[a-f0-9]{64}$'),
  constraint reviewer_source_snapshots_exact_sha256_format
    check (exact_source_sha256 ~ '^[a-f0-9]{64}$'),
  constraint reviewer_source_snapshots_source_count_limit
    check (source_count between 1 and 8),
  constraint reviewer_source_snapshots_version_length
    check (
      char_length(btrim(normalization_version)) > 0
      and char_length(normalization_version) <= 80
    )
);

create index if not exists reviewer_source_snapshots_user_created_idx
  on public.reviewer_source_snapshots (user_id, created_at desc);

create index if not exists reviewer_source_snapshots_preview_idx
  on public.reviewer_source_snapshots (preview_session_id);

create table if not exists public.reviewer_source_snapshot_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source_snapshot_id uuid not null,
  ordinal integer not null,
  source_type text not null,
  source_title text not null,
  source_row_id uuid,
  canvas_connection_id uuid not null,
  course_id uuid not null,
  canvas_course_id text not null,
  canvas_source_object_id text,
  module_id text,
  module_item_id text,
  file_id text,
  file_kind text,
  mime_type text,
  page_count integer,
  canvas_updated_at timestamptz,
  local_synced_at timestamptz,
  normalized_content_sha256 text not null,
  stored_content_sha256 text,
  parser_version text,
  ocr_version text,
  created_at timestamptz not null default now(),
  constraint reviewer_source_snapshot_items_snapshot_owner_fkey
    foreign key (source_snapshot_id, user_id)
    references public.reviewer_source_snapshots (id, user_id)
    on delete cascade,
  constraint reviewer_source_snapshot_items_snapshot_ordinal_unique
    unique (source_snapshot_id, ordinal),
  constraint reviewer_source_snapshot_items_source_type_allowed
    check (source_type in ('page', 'assignment', 'announcement', 'file')),
  constraint reviewer_source_snapshot_items_file_kind_allowed
    check (file_kind is null or file_kind in ('pdf', 'image')),
  constraint reviewer_source_snapshot_items_ordinal_limit
    check (ordinal between 1 and 8),
  constraint reviewer_source_snapshot_items_title_length
    check (
      char_length(btrim(source_title)) > 0
      and char_length(source_title) <= 180
    ),
  constraint reviewer_source_snapshot_items_canvas_course_not_blank
    check (char_length(btrim(canvas_course_id)) > 0),
  constraint reviewer_source_snapshot_items_mime_length
    check (mime_type is null or char_length(mime_type) <= 127),
  constraint reviewer_source_snapshot_items_page_count_limit
    check (page_count is null or page_count between 1 and 5),
  constraint reviewer_source_snapshot_items_normalized_hash_format
    check (normalized_content_sha256 ~ '^[a-f0-9]{64}$'),
  constraint reviewer_source_snapshot_items_stored_hash_format
    check (stored_content_sha256 is null or stored_content_sha256 ~ '^[a-f0-9]{64}$'),
  constraint reviewer_source_snapshot_items_parser_version_length
    check (
      parser_version is null
      or (
        char_length(btrim(parser_version)) > 0
        and char_length(parser_version) <= 80
      )
    ),
  constraint reviewer_source_snapshot_items_ocr_version_length
    check (
      ocr_version is null
      or (
        char_length(btrim(ocr_version)) > 0
        and char_length(ocr_version) <= 80
      )
    )
);

create index if not exists reviewer_source_snapshot_items_snapshot_idx
  on public.reviewer_source_snapshot_items (source_snapshot_id, ordinal);

create index if not exists reviewer_source_snapshot_items_user_idx
  on public.reviewer_source_snapshot_items (user_id, created_at desc);

alter table public.reviewers
  add column if not exists source_snapshot_id uuid;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'reviewers_id_user_unique'
      and conrelid = 'public.reviewers'::regclass
  ) then
    alter table public.reviewers
      add constraint reviewers_id_user_unique unique (id, user_id);
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'reviewers_source_snapshot_owner_fkey'
      and conrelid = 'public.reviewers'::regclass
  ) then
    alter table public.reviewers
      add constraint reviewers_source_snapshot_owner_fkey
      foreign key (source_snapshot_id, user_id)
      references public.reviewer_source_snapshots (id, user_id)
      on delete restrict;
  end if;
end;
$$;

create index if not exists reviewers_source_snapshot_idx
  on public.reviewers (source_snapshot_id)
  where source_snapshot_id is not null;

create or replace function public.prevent_source_provenance_update()
returns trigger
language plpgsql
security invoker
as $$
begin
  raise exception using errcode = 'P0001', message = 'source_provenance_immutable';
end;
$$;

drop trigger if exists canvas_source_preview_sessions_no_update
  on public.canvas_source_preview_sessions;
create trigger canvas_source_preview_sessions_no_update
before update on public.canvas_source_preview_sessions
for each row
execute function public.prevent_source_provenance_update();

drop trigger if exists reviewer_source_snapshots_no_update
  on public.reviewer_source_snapshots;
create trigger reviewer_source_snapshots_no_update
before update on public.reviewer_source_snapshots
for each row
execute function public.prevent_source_provenance_update();

drop trigger if exists reviewer_source_snapshot_items_no_update
  on public.reviewer_source_snapshot_items;
create trigger reviewer_source_snapshot_items_no_update
before update on public.reviewer_source_snapshot_items
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
  end if;

  if v_snapshot.id is null then
    raise exception using errcode = 'P0001', message = 'source_snapshot_failed';
  end if;

  return query select v_snapshot.id;
end;
$$;

create or replace function public.cleanup_expired_canvas_source_preview_sessions(
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
  delete from public.canvas_source_preview_sessions session
  where session.expires_at < p_before
    and not exists (
      select 1
      from public.reviewer_source_snapshots snapshot
      where snapshot.preview_session_id = session.id
    );

  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$$;

alter table public.canvas_source_preview_sessions enable row level security;
alter table public.reviewer_source_snapshots enable row level security;
alter table public.reviewer_source_snapshot_items enable row level security;

revoke all on table public.canvas_source_preview_sessions from public;
revoke all on table public.canvas_source_preview_sessions from anon;
revoke all on table public.canvas_source_preview_sessions from authenticated;
grant select, insert, delete on table public.canvas_source_preview_sessions
  to service_role;

revoke all on table public.reviewer_source_snapshots from public;
revoke all on table public.reviewer_source_snapshots from anon;
revoke all on table public.reviewer_source_snapshots from authenticated;
grant select, insert, delete on table public.reviewer_source_snapshots
  to service_role;

revoke all on table public.reviewer_source_snapshot_items from public;
revoke all on table public.reviewer_source_snapshot_items from anon;
revoke all on table public.reviewer_source_snapshot_items from authenticated;
grant select, insert, delete on table public.reviewer_source_snapshot_items
  to service_role;

revoke all on function public.prevent_source_provenance_update() from public;
revoke all on function public.prevent_source_provenance_update() from anon;
revoke all on function public.prevent_source_provenance_update() from authenticated;
grant execute on function public.prevent_source_provenance_update()
  to service_role;

revoke all on function public.validate_canvas_source_preview_session_owner()
  from public;
revoke all on function public.validate_canvas_source_preview_session_owner()
  from anon;
revoke all on function public.validate_canvas_source_preview_session_owner()
  from authenticated;
grant execute on function public.validate_canvas_source_preview_session_owner()
  to service_role;

revoke all on function public.create_reviewer_source_snapshot(
  uuid,
  uuid,
  text,
  text,
  text,
  boolean
) from public;
revoke all on function public.create_reviewer_source_snapshot(
  uuid,
  uuid,
  text,
  text,
  text,
  boolean
) from anon;
revoke all on function public.create_reviewer_source_snapshot(
  uuid,
  uuid,
  text,
  text,
  text,
  boolean
) from authenticated;
grant execute on function public.create_reviewer_source_snapshot(
  uuid,
  uuid,
  text,
  text,
  text,
  boolean
) to service_role;

revoke all on function public.cleanup_expired_canvas_source_preview_sessions(
  timestamp with time zone
) from public;
revoke all on function public.cleanup_expired_canvas_source_preview_sessions(
  timestamp with time zone
) from anon;
revoke all on function public.cleanup_expired_canvas_source_preview_sessions(
  timestamp with time zone
) from authenticated;
grant execute on function public.cleanup_expired_canvas_source_preview_sessions(
  timestamp with time zone
) to service_role;
