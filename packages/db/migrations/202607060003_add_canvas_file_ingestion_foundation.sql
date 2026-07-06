alter table public.canvas_sync_runs
  alter column resource_counts set default
    '{"modules":0,"moduleItems":0,"pages":0,"assignmentGroups":0,"assignments":0,"plannerItems":0,"announcements":0,"files":0,"fileReferences":0}'::jsonb;

create table if not exists public.canvas_files (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  canvas_connection_id uuid not null,
  course_id uuid not null,
  canvas_course_id text not null,
  canvas_file_id text not null,
  folder_id text,
  display_name text not null,
  filename text,
  content_type text,
  size_bytes bigint,
  locked boolean,
  hidden boolean,
  hidden_for_user boolean,
  visibility_level text,
  media_class text,
  media_entry_id text,
  canvas_created_at timestamptz,
  canvas_updated_at timestamptz,
  canvas_modified_at timestamptz,
  lock_at timestamptz,
  unlock_at timestamptz,
  metadata_fingerprint text not null,
  content_version_fingerprint text not null,
  ingestion_eligibility text not null,
  ingestion_status text not null default 'not_requested',
  current_sha256 text,
  stored_content_type text,
  stored_byte_count bigint,
  storage_bucket text,
  storage_object_key text,
  availability_status text not null default 'available',
  first_synced_at timestamptz not null default now(),
  last_synced_at timestamptz not null default now(),
  last_successful_inventory_at timestamptz,
  last_successful_ingestion_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint canvas_files_connection_user_fkey
    foreign key (canvas_connection_id, user_id)
    references public.canvas_connections (id, user_id)
    on delete cascade,
  constraint canvas_files_course_owner_fkey
    foreign key (course_id, user_id, canvas_connection_id, canvas_course_id)
    references public.canvas_courses (
      id,
      user_id,
      canvas_connection_id,
      canvas_course_id
    )
    on delete cascade,
  constraint canvas_files_identity_unique
    unique (course_id, canvas_file_id),
  constraint canvas_files_id_owner_unique
    unique (id, user_id, canvas_connection_id, course_id),
  constraint canvas_files_canvas_id_not_blank
    check (char_length(btrim(canvas_file_id)) > 0),
  constraint canvas_files_course_id_not_blank
    check (char_length(btrim(canvas_course_id)) > 0),
  constraint canvas_files_display_name_not_blank
    check (char_length(btrim(display_name)) > 0),
  constraint canvas_files_size_non_negative
    check (size_bytes is null or size_bytes >= 0),
  constraint canvas_files_stored_size_non_negative
    check (stored_byte_count is null or stored_byte_count >= 0),
  constraint canvas_files_metadata_fingerprint_not_blank
    check (
      char_length(btrim(metadata_fingerprint)) > 0
      and char_length(metadata_fingerprint) <= 128
    ),
  constraint canvas_files_content_fingerprint_not_blank
    check (
      char_length(btrim(content_version_fingerprint)) > 0
      and char_length(content_version_fingerprint) <= 128
    ),
  constraint canvas_files_sha256_format
    check (current_sha256 is null or current_sha256 ~ '^[a-f0-9]{64}$'),
  constraint canvas_files_storage_pair_consistency
    check (
      (storage_bucket is null and storage_object_key is null)
      or (storage_bucket is not null and storage_object_key is not null)
    ),
  constraint canvas_files_eligibility_allowed
    check (
      ingestion_eligibility in (
        'eligible_document',
        'eligible_image',
        'metadata_only_media',
        'metadata_only_unsupported',
        'blocked_security',
        'blocked_size',
        'blocked_locked',
        'blocked_unavailable'
      )
    ),
  constraint canvas_files_ingestion_status_allowed
    check (
      ingestion_status in (
        'not_requested',
        'stored',
        'unchanged',
        'metadata_only',
        'blocked',
        'failed',
        'unavailable'
      )
    ),
  constraint canvas_files_availability_status_allowed
    check (availability_status in ('available', 'missing', 'unavailable'))
);

create table if not exists public.canvas_file_references (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  canvas_connection_id uuid not null,
  course_id uuid not null,
  file_id uuid not null,
  reference_type text not null,
  reference_identity text not null,
  referenced_row_id uuid,
  canvas_module_id text,
  canvas_module_item_id text,
  canvas_page_url text,
  canvas_assignment_id text,
  canvas_announcement_id text,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint canvas_file_references_file_owner_fkey
    foreign key (file_id, user_id, canvas_connection_id, course_id)
    references public.canvas_files (id, user_id, canvas_connection_id, course_id)
    on delete cascade,
  constraint canvas_file_references_identity_unique
    unique (
      user_id,
      canvas_connection_id,
      course_id,
      file_id,
      reference_type,
      reference_identity
    ),
  constraint canvas_file_references_type_allowed
    check (
      reference_type in (
        'module_item',
        'page',
        'assignment',
        'announcement',
        'typed_attachment'
      )
    ),
  constraint canvas_file_references_identity_not_blank
    check (char_length(btrim(reference_identity)) > 0)
);

create table if not exists public.canvas_file_ingestion_results (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  canvas_connection_id uuid not null,
  course_id uuid not null,
  file_id uuid not null,
  status text not null,
  result_code text not null,
  retryable boolean not null default false,
  bytes_stored bigint,
  created_at timestamptz not null default now(),
  constraint canvas_file_ingestion_results_file_owner_fkey
    foreign key (file_id, user_id, canvas_connection_id, course_id)
    references public.canvas_files (id, user_id, canvas_connection_id, course_id)
    on delete cascade,
  constraint canvas_file_ingestion_results_status_allowed
    check (
      status in (
        'stored',
        'unchanged',
        'metadata_only',
        'blocked',
        'failed',
        'unavailable'
      )
    ),
  constraint canvas_file_ingestion_results_code_not_blank
    check (
      char_length(btrim(result_code)) > 0
      and char_length(result_code) <= 120
    ),
  constraint canvas_file_ingestion_results_bytes_non_negative
    check (bytes_stored is null or bytes_stored >= 0)
);

create index if not exists canvas_files_user_synced_idx
  on public.canvas_files (user_id, last_synced_at desc);
create index if not exists canvas_files_connection_synced_idx
  on public.canvas_files (canvas_connection_id, last_synced_at desc);
create index if not exists canvas_files_course_idx
  on public.canvas_files (course_id, canvas_file_id);
create index if not exists canvas_files_ingestion_status_idx
  on public.canvas_files (user_id, ingestion_status, ingestion_eligibility);
create index if not exists canvas_files_content_hash_idx
  on public.canvas_files (current_sha256)
  where current_sha256 is not null;
create index if not exists canvas_file_references_file_idx
  on public.canvas_file_references (file_id);
create index if not exists canvas_file_references_course_type_idx
  on public.canvas_file_references (course_id, reference_type);
create index if not exists canvas_file_ingestion_results_file_created_idx
  on public.canvas_file_ingestion_results (file_id, created_at desc);

create or replace function public.set_canvas_files_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.set_canvas_file_references_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists canvas_files_set_updated_at on public.canvas_files;
create trigger canvas_files_set_updated_at
before update on public.canvas_files
for each row
execute function public.set_canvas_files_updated_at();

drop trigger if exists canvas_file_references_set_updated_at
  on public.canvas_file_references;
create trigger canvas_file_references_set_updated_at
before update on public.canvas_file_references
for each row
execute function public.set_canvas_file_references_updated_at();

alter table public.canvas_files enable row level security;
alter table public.canvas_file_references enable row level security;
alter table public.canvas_file_ingestion_results enable row level security;

revoke all on table public.canvas_files from public;
revoke all on table public.canvas_files from anon;
revoke all on table public.canvas_files from authenticated;
revoke all on table public.canvas_file_references from public;
revoke all on table public.canvas_file_references from anon;
revoke all on table public.canvas_file_references from authenticated;
revoke all on table public.canvas_file_ingestion_results from public;
revoke all on table public.canvas_file_ingestion_results from anon;
revoke all on table public.canvas_file_ingestion_results from authenticated;

grant select, insert, update, delete on table public.canvas_files to service_role;
grant select, insert, update, delete on table public.canvas_file_references
  to service_role;
grant select, insert, update, delete on table public.canvas_file_ingestion_results
  to service_role;

drop policy if exists canvas_files_select_own on public.canvas_files;
create policy canvas_files_select_own
on public.canvas_files
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists canvas_file_references_select_own
  on public.canvas_file_references;
create policy canvas_file_references_select_own
on public.canvas_file_references
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists canvas_file_ingestion_results_select_own
  on public.canvas_file_ingestion_results;
create policy canvas_file_ingestion_results_select_own
on public.canvas_file_ingestion_results
for select
to authenticated
using ((select auth.uid()) = user_id);

create or replace function public.replace_canvas_course_files_inventory(
  p_user_id uuid,
  p_canvas_connection_id uuid,
  p_sync_run_id uuid,
  p_synced_at timestamptz,
  p_canvas_course_id text,
  p_files jsonb,
  p_references jsonb
)
returns table (
  files_inserted integer,
  files_updated integer,
  files_unchanged integer,
  files_deactivated integer,
  references_inserted integer,
  references_deleted integer,
  module_file_references integer,
  html_file_references integer,
  metadata_only_files integer,
  blocked_files integer
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_course_id uuid;
  v_canvas_course_id text := nullif(btrim(p_canvas_course_id), '');
  v_synced_at timestamptz := coalesce(p_synced_at, now());
begin
  if p_user_id is null
    or p_canvas_connection_id is null
    or p_sync_run_id is null
    or v_canvas_course_id is null
    or jsonb_typeof(p_files) is distinct from 'array'
    or jsonb_typeof(p_references) is distinct from 'array'
  then
    raise exception using errcode = 'P0001', message = 'invalid_canvas_files_inventory';
  end if;

  perform 1
  from public.canvas_sync_runs run
  where run.id = p_sync_run_id
    and run.user_id = p_user_id
    and run.canvas_connection_id = p_canvas_connection_id
    and run.status = 'running';

  if not found then
    raise exception using errcode = 'P0001', message = 'canvas_sync_run_missing';
  end if;

  select course.id
  into v_course_id
  from public.canvas_courses course
  where course.user_id = p_user_id
    and course.canvas_connection_id = p_canvas_connection_id
    and course.canvas_course_id = v_canvas_course_id;

  if v_course_id is null then
    raise exception using errcode = 'P0001', message = 'canvas_course_missing';
  end if;

  drop table if exists pg_temp._canvas_sync_files;
  create temp table _canvas_sync_files on commit drop as
  select
    nullif(btrim(file.canvas_file_id), '') as canvas_file_id,
    nullif(btrim(file.folder_id), '') as folder_id,
    nullif(btrim(file.display_name), '') as display_name,
    nullif(btrim(file.filename), '') as filename,
    nullif(btrim(file.content_type), '') as content_type,
    file.size_bytes,
    file.locked,
    file.hidden,
    file.hidden_for_user,
    nullif(btrim(file.visibility_level), '') as visibility_level,
    nullif(btrim(file.media_class), '') as media_class,
    nullif(btrim(file.media_entry_id), '') as media_entry_id,
    file.canvas_created_at,
    file.canvas_updated_at,
    file.canvas_modified_at,
    file.lock_at,
    file.unlock_at,
    nullif(btrim(file.metadata_fingerprint), '') as metadata_fingerprint,
    nullif(btrim(file.content_version_fingerprint), '') as content_version_fingerprint,
    nullif(btrim(file.ingestion_eligibility), '') as ingestion_eligibility,
    nullif(btrim(file.ingestion_status), '') as ingestion_status
  from jsonb_to_recordset(p_files) as file(
    canvas_file_id text,
    folder_id text,
    display_name text,
    filename text,
    content_type text,
    size_bytes bigint,
    locked boolean,
    hidden boolean,
    hidden_for_user boolean,
    visibility_level text,
    media_class text,
    media_entry_id text,
    canvas_created_at timestamptz,
    canvas_updated_at timestamptz,
    canvas_modified_at timestamptz,
    lock_at timestamptz,
    unlock_at timestamptz,
    metadata_fingerprint text,
    content_version_fingerprint text,
    ingestion_eligibility text,
    ingestion_status text
  );

  if exists (
    select 1
    from pg_temp._canvas_sync_files
    where canvas_file_id is null
      or display_name is null
      or metadata_fingerprint is null
      or content_version_fingerprint is null
      or char_length(metadata_fingerprint) > 128
      or char_length(content_version_fingerprint) > 128
      or size_bytes < 0
      or ingestion_eligibility not in (
        'eligible_document',
        'eligible_image',
        'metadata_only_media',
        'metadata_only_unsupported',
        'blocked_security',
        'blocked_size',
        'blocked_locked',
        'blocked_unavailable'
      )
      or ingestion_status not in (
        'not_requested',
        'stored',
        'unchanged',
        'metadata_only',
        'blocked',
        'failed',
        'unavailable'
      )
  ) then
    raise exception using errcode = 'P0001', message = 'invalid_canvas_file';
  end if;

  if (
    select count(*) <> count(distinct canvas_file_id)
    from pg_temp._canvas_sync_files
  ) then
    raise exception using errcode = 'P0001', message = 'duplicate_canvas_file';
  end if;

  select count(*) into files_inserted
  from pg_temp._canvas_sync_files incoming
  where not exists (
    select 1
    from public.canvas_files existing
    where existing.course_id = v_course_id
      and existing.canvas_file_id = incoming.canvas_file_id
  );

  select count(*) into files_updated
  from pg_temp._canvas_sync_files incoming
  join public.canvas_files existing
    on existing.course_id = v_course_id
   and existing.canvas_file_id = incoming.canvas_file_id
  where existing.metadata_fingerprint is distinct from incoming.metadata_fingerprint;

  select count(*) into files_unchanged
  from pg_temp._canvas_sync_files incoming
  join public.canvas_files existing
    on existing.course_id = v_course_id
   and existing.canvas_file_id = incoming.canvas_file_id
  where existing.metadata_fingerprint = incoming.metadata_fingerprint;

  select count(*) into metadata_only_files
  from pg_temp._canvas_sync_files
  where ingestion_eligibility in (
    'metadata_only_media',
    'metadata_only_unsupported'
  );

  select count(*) into blocked_files
  from pg_temp._canvas_sync_files
  where ingestion_eligibility like 'blocked_%';

  insert into public.canvas_files (
    user_id,
    canvas_connection_id,
    course_id,
    canvas_course_id,
    canvas_file_id,
    folder_id,
    display_name,
    filename,
    content_type,
    size_bytes,
    locked,
    hidden,
    hidden_for_user,
    visibility_level,
    media_class,
    media_entry_id,
    canvas_created_at,
    canvas_updated_at,
    canvas_modified_at,
    lock_at,
    unlock_at,
    metadata_fingerprint,
    content_version_fingerprint,
    ingestion_eligibility,
    ingestion_status,
    availability_status,
    first_synced_at,
    last_synced_at,
    last_successful_inventory_at
  )
  select
    p_user_id,
    p_canvas_connection_id,
    v_course_id,
    v_canvas_course_id,
    canvas_file_id,
    folder_id,
    display_name,
    filename,
    content_type,
    size_bytes,
    locked,
    hidden,
    hidden_for_user,
    visibility_level,
    media_class,
    media_entry_id,
    canvas_created_at,
    canvas_updated_at,
    canvas_modified_at,
    lock_at,
    unlock_at,
    metadata_fingerprint,
    content_version_fingerprint,
    ingestion_eligibility,
    ingestion_status,
    case
      when ingestion_eligibility = 'blocked_unavailable' then 'unavailable'
      else 'available'
    end,
    v_synced_at,
    v_synced_at,
    v_synced_at
  from pg_temp._canvas_sync_files
  on conflict on constraint canvas_files_identity_unique
  do update set
    folder_id = excluded.folder_id,
    display_name = excluded.display_name,
    filename = excluded.filename,
    content_type = excluded.content_type,
    size_bytes = excluded.size_bytes,
    locked = excluded.locked,
    hidden = excluded.hidden,
    hidden_for_user = excluded.hidden_for_user,
    visibility_level = excluded.visibility_level,
    media_class = excluded.media_class,
    media_entry_id = excluded.media_entry_id,
    canvas_created_at = excluded.canvas_created_at,
    canvas_updated_at = excluded.canvas_updated_at,
    canvas_modified_at = excluded.canvas_modified_at,
    lock_at = excluded.lock_at,
    unlock_at = excluded.unlock_at,
    metadata_fingerprint = excluded.metadata_fingerprint,
    content_version_fingerprint = excluded.content_version_fingerprint,
    ingestion_eligibility = excluded.ingestion_eligibility,
    ingestion_status = case
      when excluded.ingestion_status = 'not_requested'
        and canvas_files.current_sha256 is not null
        and canvas_files.content_version_fingerprint =
          excluded.content_version_fingerprint
        and excluded.ingestion_eligibility in (
          'eligible_document',
          'eligible_image'
        )
        then canvas_files.ingestion_status
      else excluded.ingestion_status
    end,
    availability_status = excluded.availability_status,
    last_synced_at = excluded.last_synced_at,
    last_successful_inventory_at = excluded.last_successful_inventory_at
  where canvas_files.metadata_fingerprint is distinct from excluded.metadata_fingerprint
     or canvas_files.availability_status is distinct from excluded.availability_status
     or canvas_files.ingestion_eligibility is distinct from excluded.ingestion_eligibility
     or canvas_files.ingestion_status is distinct from excluded.ingestion_status;

  select count(*) into files_deactivated
  from public.canvas_files existing
  where existing.course_id = v_course_id
    and existing.availability_status <> 'missing'
    and not exists (
      select 1
      from pg_temp._canvas_sync_files incoming
      where incoming.canvas_file_id = existing.canvas_file_id
    );

  update public.canvas_files existing
  set
    availability_status = 'missing',
    ingestion_eligibility = 'blocked_unavailable',
    ingestion_status = 'unavailable',
    last_synced_at = v_synced_at,
    last_successful_inventory_at = v_synced_at
  where existing.course_id = v_course_id
    and not exists (
      select 1
      from pg_temp._canvas_sync_files incoming
      where incoming.canvas_file_id = existing.canvas_file_id
    );

  drop table if exists pg_temp._canvas_sync_file_references;
  create temp table _canvas_sync_file_references on commit drop as
  select
    nullif(btrim(reference.canvas_file_id), '') as canvas_file_id,
    nullif(btrim(reference.reference_type), '') as reference_type,
    nullif(btrim(reference.reference_identity), '') as reference_identity,
    nullif(btrim(reference.canvas_module_id), '') as canvas_module_id,
    nullif(btrim(reference.canvas_module_item_id), '') as canvas_module_item_id,
    nullif(btrim(reference.canvas_page_url), '') as canvas_page_url,
    nullif(btrim(reference.canvas_assignment_id), '') as canvas_assignment_id,
    nullif(btrim(reference.canvas_announcement_id), '') as canvas_announcement_id
  from jsonb_to_recordset(p_references) as reference(
    canvas_file_id text,
    reference_type text,
    reference_identity text,
    canvas_module_id text,
    canvas_module_item_id text,
    canvas_page_url text,
    canvas_assignment_id text,
    canvas_announcement_id text
  );

  if exists (
    select 1
    from pg_temp._canvas_sync_file_references reference
    where reference.canvas_file_id is null
      or reference.reference_type not in (
        'module_item',
        'page',
        'assignment',
        'announcement',
        'typed_attachment'
      )
      or reference.reference_identity is null
      or not exists (
        select 1
        from pg_temp._canvas_sync_files file
        where file.canvas_file_id = reference.canvas_file_id
      )
  ) then
    raise exception using errcode = 'P0001', message = 'invalid_canvas_file_reference';
  end if;

  if (
    select count(*) <> count(distinct (
      canvas_file_id,
      reference_type,
      reference_identity
    ))
    from pg_temp._canvas_sync_file_references
  ) then
    raise exception using errcode = 'P0001', message = 'duplicate_canvas_file_reference';
  end if;

  drop table if exists pg_temp._canvas_sync_file_references_resolved;
  create temp table _canvas_sync_file_references_resolved on commit drop as
  select
    file.id as file_id,
    reference.*,
    case
      when reference.reference_type = 'module_item' then (
        select item.id
        from public.canvas_modules module
        join public.canvas_module_items item
          on item.module_id = module.id
        where module.course_id = v_course_id
          and module.canvas_module_id = reference.canvas_module_id
          and item.canvas_module_item_id = reference.canvas_module_item_id
        limit 1
      )
      when reference.reference_type = 'page' then (
        select page.id
        from public.canvas_pages page
        where page.course_id = v_course_id
          and page.canvas_page_url = reference.canvas_page_url
        limit 1
      )
      when reference.reference_type = 'assignment' then (
        select assignment.id
        from public.canvas_assignments assignment
        where assignment.course_id = v_course_id
          and assignment.canvas_assignment_id = reference.canvas_assignment_id
        limit 1
      )
      when reference.reference_type = 'announcement' then (
        select announcement.id
        from public.canvas_announcements announcement
        where announcement.course_id = v_course_id
          and announcement.canvas_announcement_id = reference.canvas_announcement_id
        limit 1
      )
      else null
    end as referenced_row_id
  from pg_temp._canvas_sync_file_references reference
  join public.canvas_files file
    on file.course_id = v_course_id
   and file.canvas_file_id = reference.canvas_file_id;

  select count(*) into references_inserted
  from pg_temp._canvas_sync_file_references_resolved incoming
  where not exists (
    select 1
    from public.canvas_file_references existing
    where existing.user_id = p_user_id
      and existing.canvas_connection_id = p_canvas_connection_id
      and existing.course_id = v_course_id
      and existing.file_id = incoming.file_id
      and existing.reference_type = incoming.reference_type
      and existing.reference_identity = incoming.reference_identity
  );

  select count(*) into references_deleted
  from public.canvas_file_references existing
  where existing.course_id = v_course_id
    and not exists (
      select 1
      from pg_temp._canvas_sync_file_references_resolved incoming
      where incoming.file_id = existing.file_id
        and incoming.reference_type = existing.reference_type
        and incoming.reference_identity = existing.reference_identity
    );

  delete from public.canvas_file_references existing
  where existing.course_id = v_course_id
    and not exists (
      select 1
      from pg_temp._canvas_sync_file_references_resolved incoming
      where incoming.file_id = existing.file_id
        and incoming.reference_type = existing.reference_type
        and incoming.reference_identity = existing.reference_identity
    );

  insert into public.canvas_file_references (
    user_id,
    canvas_connection_id,
    course_id,
    file_id,
    reference_type,
    reference_identity,
    referenced_row_id,
    canvas_module_id,
    canvas_module_item_id,
    canvas_page_url,
    canvas_assignment_id,
    canvas_announcement_id,
    first_seen_at,
    last_seen_at
  )
  select
    p_user_id,
    p_canvas_connection_id,
    v_course_id,
    file_id,
    reference_type,
    reference_identity,
    referenced_row_id,
    canvas_module_id,
    canvas_module_item_id,
    canvas_page_url,
    canvas_assignment_id,
    canvas_announcement_id,
    v_synced_at,
    v_synced_at
  from pg_temp._canvas_sync_file_references_resolved
  on conflict on constraint canvas_file_references_identity_unique
  do update set
    referenced_row_id = excluded.referenced_row_id,
    canvas_module_id = excluded.canvas_module_id,
    canvas_module_item_id = excluded.canvas_module_item_id,
    canvas_page_url = excluded.canvas_page_url,
    canvas_assignment_id = excluded.canvas_assignment_id,
    canvas_announcement_id = excluded.canvas_announcement_id,
    last_seen_at = excluded.last_seen_at;

  select count(*) into module_file_references
  from pg_temp._canvas_sync_file_references_resolved
  where reference_type = 'module_item';

  select count(*) into html_file_references
  from pg_temp._canvas_sync_file_references_resolved
  where reference_type in ('page', 'assignment', 'announcement');

  return next;
end;
$$;

create or replace function public.record_canvas_file_ingestion_result(
  p_user_id uuid,
  p_canvas_connection_id uuid,
  p_file_id uuid,
  p_status text,
  p_result_code text,
  p_retryable boolean,
  p_bytes_stored bigint
)
returns table (
  id uuid,
  user_id uuid,
  canvas_connection_id uuid,
  course_id uuid,
  file_id uuid,
  status text,
  result_code text,
  retryable boolean,
  bytes_stored bigint,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_file public.canvas_files%rowtype;
  v_result public.canvas_file_ingestion_results%rowtype;
begin
  if p_user_id is null
    or p_canvas_connection_id is null
    or p_file_id is null
    or nullif(btrim(p_status), '') is null
    or nullif(btrim(p_result_code), '') is null
    or p_bytes_stored < 0
  then
    raise exception using errcode = 'P0001', message = 'invalid_canvas_file_ingestion_result';
  end if;

  select *
  into v_file
  from public.canvas_files file
  where file.id = p_file_id
    and file.user_id = p_user_id
    and file.canvas_connection_id = p_canvas_connection_id;

  if v_file.id is null then
    raise exception using errcode = 'P0001', message = 'canvas_file_not_owned';
  end if;

  insert into public.canvas_file_ingestion_results (
    user_id,
    canvas_connection_id,
    course_id,
    file_id,
    status,
    result_code,
    retryable,
    bytes_stored
  )
  values (
    p_user_id,
    p_canvas_connection_id,
    v_file.course_id,
    p_file_id,
    p_status,
    left(btrim(p_result_code), 120),
    coalesce(p_retryable, false),
    p_bytes_stored
  )
  returning *
  into v_result;

  return query
  select
    v_result.id,
    v_result.user_id,
    v_result.canvas_connection_id,
    v_result.course_id,
    v_result.file_id,
    v_result.status,
    v_result.result_code,
    v_result.retryable,
    v_result.bytes_stored,
    v_result.created_at;
end;
$$;

revoke all on function public.replace_canvas_course_files_inventory(
  uuid,
  uuid,
  uuid,
  timestamp with time zone,
  text,
  jsonb,
  jsonb
) from public;
revoke all on function public.replace_canvas_course_files_inventory(
  uuid,
  uuid,
  uuid,
  timestamp with time zone,
  text,
  jsonb,
  jsonb
) from anon;
revoke all on function public.replace_canvas_course_files_inventory(
  uuid,
  uuid,
  uuid,
  timestamp with time zone,
  text,
  jsonb,
  jsonb
) from authenticated;
grant execute on function public.replace_canvas_course_files_inventory(
  uuid,
  uuid,
  uuid,
  timestamp with time zone,
  text,
  jsonb,
  jsonb
) to service_role;

revoke all on function public.record_canvas_file_ingestion_result(
  uuid,
  uuid,
  uuid,
  text,
  text,
  boolean,
  bigint
) from public;
revoke all on function public.record_canvas_file_ingestion_result(
  uuid,
  uuid,
  uuid,
  text,
  text,
  boolean,
  bigint
) from anon;
revoke all on function public.record_canvas_file_ingestion_result(
  uuid,
  uuid,
  uuid,
  text,
  text,
  boolean,
  bigint
) from authenticated;
grant execute on function public.record_canvas_file_ingestion_result(
  uuid,
  uuid,
  uuid,
  text,
  text,
  boolean,
  bigint
) to service_role;

insert into storage.buckets (id, name, public)
values ('canvas-source-files', 'canvas-source-files', false)
on conflict (id) do update set public = false;

drop policy if exists canvas_source_files_authenticated_no_access
  on storage.objects;
create policy canvas_source_files_authenticated_no_access
on storage.objects
as restrictive
for all
to authenticated
using (bucket_id <> 'canvas-source-files')
with check (bucket_id <> 'canvas-source-files');

drop policy if exists canvas_source_files_anon_no_access
  on storage.objects;
create policy canvas_source_files_anon_no_access
on storage.objects
as restrictive
for all
to anon
using (bucket_id <> 'canvas-source-files')
with check (bucket_id <> 'canvas-source-files');
