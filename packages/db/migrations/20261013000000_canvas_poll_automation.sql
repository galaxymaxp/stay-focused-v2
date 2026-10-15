-- AG2: local schema only; activity, complete poll evidence and bounded admission.
create table public.canvas_auto_reviewer_activity (
  user_id uuid primary key references auth.users(id) on delete cascade,
  last_active_at timestamptz not null
);
create table public.canvas_auto_reviewer_poll_marks (
  course_id uuid primary key references public.canvas_courses(id) on delete cascade,
  last_seen_module_item_ids jsonb not null check (jsonb_typeof(last_seen_module_item_ids) = 'array'),
  updated_at timestamptz not null default now()
);
create table public.canvas_auto_reviewer_poll_requests (
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id uuid not null references public.canvas_courses(id) on delete cascade,
  bucket bigint not null,
  reserved_at timestamptz not null default now(),
  primary key (user_id, course_id, bucket)
);
create index canvas_auto_reviewer_poll_requests_recent_idx
  on public.canvas_auto_reviewer_poll_requests(user_id, reserved_at desc);
create index canvas_auto_reviewer_poll_requests_course_idx
  on public.canvas_auto_reviewer_poll_requests(course_id, reserved_at desc);
create index canvas_auto_reviewer_candidates_job_idx
  on public.canvas_auto_reviewer_candidates(user_id, processing_job_id)
  where processing_job_id is not null;

alter table public.canvas_auto_reviewer_activity enable row level security;
alter table public.canvas_auto_reviewer_poll_marks enable row level security;
alter table public.canvas_auto_reviewer_poll_requests enable row level security;
revoke all on public.canvas_auto_reviewer_activity, public.canvas_auto_reviewer_poll_marks,
  public.canvas_auto_reviewer_poll_requests from public, anon, authenticated;
grant all on public.canvas_auto_reviewer_activity, public.canvas_auto_reviewer_poll_marks,
  public.canvas_auto_reviewer_poll_requests to service_role;

create function public.record_canvas_api_activity_v1(p_user_id uuid)
returns void language sql security invoker set search_path = '' as $$
  insert into public.canvas_auto_reviewer_activity as activity(user_id, last_active_at)
  values (p_user_id, now())
  on conflict(user_id) do update set last_active_at = excluded.last_active_at
    where activity.last_active_at <= now() - interval '1 hour';
$$;

-- Serialize across courses for a user. Reservations conservatively count even
-- when subsequent admission/dispatch fails, so retries cannot overspend caps.
create function public.reserve_canvas_poll_sync_v1(p_user_id uuid, p_course_id uuid)
returns boolean language plpgsql security invoker set search_path = '' as $$
declare v_now timestamptz := now(); v_bucket bigint;
begin
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_user_id::text, 130));
  if not exists (
    select 1 from public.canvas_courses c
    join public.canvas_connections conn on conn.id = c.canvas_connection_id and conn.user_id = p_user_id and conn.status = 'active'
    join public.canvas_course_sync_preferences pref on pref.course_id = c.id and pref.user_id = p_user_id and pref.selected
    where c.id = p_course_id and c.user_id = p_user_id
  ) then return false; end if;
  if exists(select 1 from public.canvas_auto_reviewer_preferences where user_id = p_user_id and not enabled)
    or not exists(select 1 from public.canvas_auto_reviewer_activity
      where user_id = p_user_id and last_active_at >= v_now - interval '7 days')
    then return false; end if;
  if exists(select 1 from public.canvas_auto_reviewer_poll_requests
      where user_id = p_user_id and course_id = p_course_id and reserved_at > v_now - interval '6 hours')
    or (select count(*) from public.canvas_auto_reviewer_poll_requests
      where user_id = p_user_id and reserved_at > v_now - interval '24 hours') >= 3
    then return false; end if;
  v_bucket := floor(extract(epoch from v_now) / 21600)::bigint;
  insert into public.canvas_auto_reviewer_poll_requests(user_id, course_id, bucket, reserved_at)
    values(p_user_id, p_course_id, v_bucket, v_now) on conflict do nothing;
  return found;
end;
$$;
revoke all on function public.record_canvas_api_activity_v1(uuid),
  public.reserve_canvas_poll_sync_v1(uuid,uuid) from public, anon, authenticated;
grant execute on function public.record_canvas_api_activity_v1(uuid),
  public.reserve_canvas_poll_sync_v1(uuid,uuid) to service_role;
