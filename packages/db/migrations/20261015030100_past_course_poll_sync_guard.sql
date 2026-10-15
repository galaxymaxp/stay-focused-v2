-- Recheck state at the atomic poll-sync reservation boundary, including an
-- override changed during a poll. Existing caps and owner/activity gates stay.
create or replace function public.reserve_canvas_poll_sync_v1(p_user_id uuid, p_course_id uuid)
returns boolean language plpgsql security invoker set search_path = '' as $$
declare v_now timestamptz := now(); v_bucket bigint;
begin
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_user_id::text, 130));
  if not exists (
    select 1 from public.canvas_courses c
    join public.canvas_connections conn on conn.id = c.canvas_connection_id and conn.user_id = p_user_id and conn.status = 'active'
    join public.canvas_course_sync_preferences pref on pref.course_id = c.id and pref.user_id = p_user_id and pref.selected
    where c.id = p_course_id and c.user_id = p_user_id and not public.is_past_canvas_course_v1(c)
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
revoke all on function public.reserve_canvas_poll_sync_v1(uuid,uuid) from public, anon, authenticated;
grant execute on function public.reserve_canvas_poll_sync_v1(uuid,uuid) to service_role;
