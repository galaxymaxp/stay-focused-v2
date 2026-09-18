alter table public.canvas_announcements
  add column if not exists author_name text,
  add column if not exists attachments jsonb not null default '[]'::jsonb;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'canvas_announcements_attachments_array'
      and conrelid = 'public.canvas_announcements'::regclass
  ) then
    alter table public.canvas_announcements
      add constraint canvas_announcements_attachments_array
      check (jsonb_typeof(attachments) = 'array') not valid;
  end if;
end
$$;

alter table public.canvas_announcements
  validate constraint canvas_announcements_attachments_array;

create or replace function public.replace_canvas_course_announcements_snapshot(
  p_user_id uuid,
  p_canvas_connection_id uuid,
  p_sync_run_id uuid,
  p_synced_at timestamptz,
  p_window_start_at timestamptz,
  p_window_end_at timestamptz,
  p_canvas_course_id text,
  p_announcements jsonb
)
returns table (
  announcements_inserted integer,
  announcements_updated integer,
  announcements_unchanged integer,
  announcements_pruned integer
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_course_id uuid;
  v_canvas_course_id text := nullif(btrim(p_canvas_course_id), '');
  v_synced_at timestamptz := coalesce(p_synced_at, now());
  v_window_start_at timestamptz := p_window_start_at;
  v_window_end_at timestamptz := p_window_end_at;
begin
  if p_user_id is null
    or p_canvas_connection_id is null
    or p_sync_run_id is null
    or v_canvas_course_id is null
    or v_window_start_at is null
    or v_window_end_at is null
    or jsonb_typeof(p_announcements) is distinct from 'array'
  then
    raise exception using errcode = 'P0001', message = 'invalid_canvas_announcement_snapshot';
  end if;

  if v_window_start_at > v_window_end_at then
    raise exception using errcode = 'P0001', message = 'invalid_canvas_announcement_window';
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

  drop table if exists pg_temp._canvas_sync_announcements;
  create temp table _canvas_sync_announcements on commit drop as
  select
    nullif(btrim(announcement.canvas_announcement_id), '') as canvas_announcement_id,
    nullif(btrim(announcement.canvas_course_id), '') as canvas_course_id,
    nullif(btrim(announcement.title), '') as title,
    announcement.message_html,
    announcement.posted_at,
    announcement.delayed_post_at,
    announcement.lock_at,
    announcement.todo_date,
    nullif(btrim(announcement.workflow_state), '') as workflow_state,
    announcement.published,
    announcement.locked,
    nullif(btrim(announcement.html_url), '') as html_url,
    nullif(btrim(announcement.author_name), '') as author_name,
    coalesce(announcement.attachments, '[]'::jsonb) as attachments,
    nullif(btrim(announcement.source_fingerprint), '') as source_fingerprint
  from jsonb_to_recordset(p_announcements) as announcement(
    canvas_announcement_id text,
    canvas_course_id text,
    title text,
    message_html text,
    posted_at timestamptz,
    delayed_post_at timestamptz,
    lock_at timestamptz,
    todo_date timestamptz,
    workflow_state text,
    published boolean,
    locked boolean,
    html_url text,
    author_name text,
    attachments jsonb,
    source_fingerprint text
  );

  if exists (
    select 1
    from pg_temp._canvas_sync_announcements
    where canvas_announcement_id is null
      or canvas_course_id is distinct from v_canvas_course_id
      or title is null
      or source_fingerprint is null
      or char_length(source_fingerprint) > 128
      or jsonb_typeof(attachments) is distinct from 'array'
  ) then
    raise exception using errcode = 'P0001', message = 'invalid_canvas_announcement';
  end if;

  if (
    select count(*) <> count(distinct canvas_announcement_id)
    from pg_temp._canvas_sync_announcements
  ) then
    raise exception using errcode = 'P0001', message = 'duplicate_canvas_announcement';
  end if;

  select count(*) into announcements_inserted
  from pg_temp._canvas_sync_announcements incoming
  where not exists (
    select 1
    from public.canvas_announcements existing
    where existing.course_id = v_course_id
      and existing.canvas_announcement_id = incoming.canvas_announcement_id
  );

  select count(*) into announcements_updated
  from pg_temp._canvas_sync_announcements incoming
  join public.canvas_announcements existing
    on existing.course_id = v_course_id
   and existing.canvas_announcement_id = incoming.canvas_announcement_id
  where existing.source_fingerprint is distinct from incoming.source_fingerprint;

  select count(*) into announcements_unchanged
  from pg_temp._canvas_sync_announcements incoming
  join public.canvas_announcements existing
    on existing.course_id = v_course_id
   and existing.canvas_announcement_id = incoming.canvas_announcement_id
  where existing.source_fingerprint = incoming.source_fingerprint;

  select count(*) into announcements_pruned
  from public.canvas_announcements existing
  where existing.course_id = v_course_id
    and coalesce(existing.posted_at, existing.delayed_post_at, existing.todo_date)
      between v_window_start_at and v_window_end_at
    and not exists (
      select 1
      from pg_temp._canvas_sync_announcements incoming
      where incoming.canvas_announcement_id = existing.canvas_announcement_id
    );

  delete from public.canvas_announcements existing
  where existing.course_id = v_course_id
    and coalesce(existing.posted_at, existing.delayed_post_at, existing.todo_date)
      between v_window_start_at and v_window_end_at
    and not exists (
      select 1
      from pg_temp._canvas_sync_announcements incoming
      where incoming.canvas_announcement_id = existing.canvas_announcement_id
    );

  insert into public.canvas_announcements (
    user_id,
    canvas_connection_id,
    course_id,
    canvas_course_id,
    canvas_announcement_id,
    title,
    message_html,
    posted_at,
    delayed_post_at,
    lock_at,
    todo_date,
    workflow_state,
    published,
    locked,
    html_url,
    author_name,
    attachments,
    source_fingerprint,
    first_synced_at,
    last_synced_at
  )
  select
    p_user_id,
    p_canvas_connection_id,
    v_course_id,
    v_canvas_course_id,
    canvas_announcement_id,
    title,
    message_html,
    posted_at,
    delayed_post_at,
    lock_at,
    todo_date,
    workflow_state,
    published,
    locked,
    html_url,
    author_name,
    attachments,
    source_fingerprint,
    v_synced_at,
    v_synced_at
  from pg_temp._canvas_sync_announcements
  on conflict on constraint canvas_announcements_identity_unique
  do update set
    title = excluded.title,
    message_html = excluded.message_html,
    posted_at = excluded.posted_at,
    delayed_post_at = excluded.delayed_post_at,
    lock_at = excluded.lock_at,
    todo_date = excluded.todo_date,
    workflow_state = excluded.workflow_state,
    published = excluded.published,
    locked = excluded.locked,
    html_url = excluded.html_url,
    author_name = excluded.author_name,
    attachments = excluded.attachments,
    source_fingerprint = excluded.source_fingerprint,
    last_synced_at = excluded.last_synced_at
  where canvas_announcements.source_fingerprint is distinct from excluded.source_fingerprint;

  return next;
end;
$$;
