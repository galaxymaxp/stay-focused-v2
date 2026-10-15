-- CQ1: bounded classification evidence and manual owner choice. Apply separately.
alter table public.canvas_courses
  add column concluded boolean,
  add column enrollment_states text[],
  add column term_name text,
  add column term_start_at timestamptz,
  add column term_end_at timestamptz,
  add column course_state_override text
    check (course_state_override in ('current', 'past'));

-- These columns inherit canvas_courses owner RLS and existing explicit grants.
-- Only the authenticated API writes the override; Canvas upserts omit it.
-- SQL background claims use the same evidence as shared/isPastCourse.
create function public.is_past_canvas_course_v1(c public.canvas_courses)
returns boolean language sql stable security invoker set search_path = '' as $$
  select case when c.course_state_override is not null then c.course_state_override = 'past'
    else coalesce(c.concluded, false)
      or lower(btrim(coalesce(c.workflow_state, ''))) in ('completed', 'concluded')
      or exists (select 1 from unnest(c.enrollment_states) s where lower(btrim(s)) in ('completed', 'concluded'))
      or coalesce(c.end_at < now(), false) or coalesce(c.term_end_at < now(), false)
    end
$$;
revoke all on function public.is_past_canvas_course_v1(public.canvas_courses) from public, anon, authenticated;
grant execute on function public.is_past_canvas_course_v1(public.canvas_courses) to service_role;

create or replace function public.claim_canvas_notification_course_v1(p_worker_id uuid) returns setof public.canvas_courses
language plpgsql security invoker set search_path = '' as $$
declare v_course uuid;
begin
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext('canvas-notification-course-claim'));
  if (select count(*) from public.canvas_notification_poll_state where lease_expires_at>now())>=2 then return; end if;
  insert into public.canvas_notification_poll_state(course_id)
    select c.id from public.canvas_courses c join public.canvas_course_sync_preferences p on p.course_id=c.id and p.selected
      join public.canvas_connections conn on conn.id=c.canvas_connection_id and conn.status='active'
    where not public.is_past_canvas_course_v1(c) on conflict do nothing;
  select s.course_id into v_course from public.canvas_notification_poll_state s
    join public.canvas_courses c on c.id=s.course_id
    join public.canvas_connections conn on conn.id=c.canvas_connection_id and conn.status='active'
    join public.canvas_course_sync_preferences p on p.course_id=c.id and p.selected
    where s.next_poll_at<=now() and (s.lease_expires_at is null or s.lease_expires_at<now())
      and not public.is_past_canvas_course_v1(c)
    order by s.next_poll_at,s.course_id limit 1 for update of s skip locked;
  if v_course is null then return; end if;
  update public.canvas_notification_poll_state set lease_owner=p_worker_id,lease_expires_at=now()+interval '90 seconds',next_poll_at=now()+interval '5 minutes' where course_id=v_course;
  return query select * from public.canvas_courses where id=v_course;
end; $$;
create or replace function public.count_canvas_notification_poll_backlog_v1() returns integer
language sql stable security invoker set search_path = '' as $$
  select count(*)::integer from public.canvas_notification_poll_state s
    join public.canvas_courses c on c.id=s.course_id and not public.is_past_canvas_course_v1(c)
    join public.canvas_connections conn on conn.id=c.canvas_connection_id and conn.status='active'
    join public.canvas_course_sync_preferences p on p.course_id=c.id and p.selected
    where s.next_poll_at<=now();
$$;


create or replace function public.claim_canvas_preparation_backfill_courses_v1(p_worker_id text,p_limit integer)
returns setof public.canvas_preparation_backfill_courses
language plpgsql security invoker set search_path=public,pg_temp as $$
begin
  if p_worker_id is null or length(p_worker_id) not between 1 and 200 then return; end if;
  insert into public.canvas_preparation_backfill_courses(course_id,user_id)
    select c.id,c.user_id from public.canvas_courses c
    join public.canvas_connections x on x.id=c.canvas_connection_id and x.user_id=c.user_id and x.status='active'
    where not public.is_past_canvas_course_v1(c) and exists(select 1 from public.canvas_course_sync_preferences p where p.course_id=c.id and p.user_id=c.user_id and p.selected)
    on conflict do nothing;
  return query with candidates as (
    select b.course_id from public.canvas_preparation_backfill_courses b
    join public.canvas_courses c on c.id=b.course_id and c.user_id=b.user_id
    join public.canvas_connections x on x.id=c.canvas_connection_id and x.user_id=c.user_id and x.status='active'
    where not public.is_past_canvas_course_v1(c) and (b.lease_expires_at is null or b.lease_expires_at<=now())
      and exists(select 1 from public.canvas_course_sync_preferences p where p.course_id=c.id and p.user_id=c.user_id and p.selected)
    order by b.last_visited_at,b.course_id limit least(20,greatest(0,p_limit)) for update of b skip locked
  ), claimed as (
    update public.canvas_preparation_backfill_courses b set lease_owner=p_worker_id,lease_expires_at=now()+interval '90 seconds'
      from candidates c where b.course_id=c.course_id returning b.*
  ) select * from claimed order by last_visited_at,course_id;
end $$;
revoke all on function public.claim_canvas_preparation_backfill_courses_v1(text,integer) from public,anon,authenticated;
grant execute on function public.claim_canvas_preparation_backfill_courses_v1(text,integer) to service_role;

create or replace function public.detect_canvas_assignment_email_v1() returns trigger
language plpgsql security definer set search_path = '' as $$
declare v_state public.canvas_notification_assignment_state; v_type text; v_key text; v_payload jsonb; v_old_due timestamptz;
begin
  if auth.uid() is not null and auth.uid() <> new.user_id then raise exception 'notification_owner_mismatch'; end if;
  insert into public.canvas_notification_assignment_state(user_id,course_id,canvas_assignment_id,due_at)
    values(new.user_id,new.course_id,new.canvas_assignment_id,new.due_at) on conflict do nothing;
  select * into v_state from public.canvas_notification_assignment_state
    where course_id=new.course_id and canvas_assignment_id=new.canvas_assignment_id for update;
  v_old_due := v_state.due_at;
  if v_state.due_at is distinct from new.due_at then
    update public.canvas_notification_assignment_state set due_at=new.due_at,due_revision=due_revision+1
      where course_id=new.course_id and canvas_assignment_id=new.canvas_assignment_id returning * into v_state;
    if new.published is distinct from false then v_type := 'due_date_change'; end if;
  elsif (tg_op='INSERT' or (tg_op='UPDATE' and old.published=false)) and new.published is distinct from false then
    v_type := 'new_assignment';
  end if;
  -- Invalidate queued old-version reminders atomically with the deadline change.
  update public.notification_outbox set skipped_at=now(),last_error='stale_deadline'
    where course_id=new.course_id and canvas_assignment_id=new.canvas_assignment_id
    and type like 'deadline_%' and sent_at is null and failed_at is null and skipped_at is null
    and (due_revision<>v_state.due_revision or new.published=false);
  if not exists(select 1 from public.canvas_courses c where c.id=new.course_id and c.user_id=new.user_id and not public.is_past_canvas_course_v1(c)) then return new; end if;
  if v_type is null or not public.notification_email_enabled_v1(new.user_id,v_type) then return new; end if;
  v_key := new.user_id||':'||new.course_id||':'||new.canvas_assignment_id||':'||v_type;
  if v_type='due_date_change' then v_key := v_key||':'||v_state.due_revision; end if;
  select jsonb_build_object('course',coalesce(course_code,name),'title',new.name,'due_at',new.due_at,'old_due_at',v_old_due,
    'timezone',public.canvas_notification_timezone_v1(new.user_id,new.course_id))
    into v_payload from public.canvas_courses where id=new.course_id;
  insert into public.notification_outbox(user_id,course_id,canvas_assignment_id,type,due_revision,dedupe_key,payload)
    values(new.user_id,new.course_id,new.canvas_assignment_id,v_type,v_state.due_revision,v_key,v_payload) on conflict(dedupe_key) do nothing;
  return new;
end; $$;
create or replace function public.detect_canvas_announcement_email_v1() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is not null and auth.uid() <> new.user_id then raise exception 'notification_owner_mismatch'; end if;
  if new.published=false or new.workflow_state in ('deleted','unpublished') or new.posted_at>now() or new.delayed_post_at>now()
    then return new; end if;
  insert into public.notification_outbox(user_id,course_id,canvas_announcement_id,type,dedupe_key,payload,skipped_at,last_error)
    select new.user_id,new.course_id,new.canvas_announcement_id,'announcement',
    new.user_id||':'||new.course_id||':announcement:'||new.canvas_announcement_id,
    jsonb_build_object('course',coalesce(course_code,name),'title',new.title),
    case when public.notification_email_enabled_v1(new.user_id,'announcement') then null else now() end,
    case when public.notification_email_enabled_v1(new.user_id,'announcement') then null else 'preference_disabled' end
    from public.canvas_courses where id=new.course_id and not public.is_past_canvas_course_v1(canvas_courses) on conflict(dedupe_key) do nothing;
  return new;
end; $$;
create or replace function public.queue_canvas_deadline_emails_v1(p_now timestamptz default now()) returns integer
language plpgsql security invoker set search_path = '' as $$
declare v_count integer;
begin
  insert into public.notification_outbox(user_id,course_id,canvas_assignment_id,type,due_revision,dedupe_key,payload,scheduled_for)
  select a.user_id,a.course_id,a.canvas_assignment_id,k.type,s.due_revision,
    a.user_id||':'||a.course_id||':'||a.canvas_assignment_id||':due:'||s.due_revision||':'||k.type,
    jsonb_build_object('course',coalesce(c.course_code,c.name),'title',a.name,'due_at',a.due_at,'timezone',tz.value),p_now
  from public.canvas_assignments a join public.canvas_courses c on c.id=a.course_id
  join public.canvas_connections conn on conn.id=a.canvas_connection_id and conn.status='active'
  join public.canvas_course_sync_preferences cp on cp.course_id=a.course_id and cp.selected=true
  join public.canvas_notification_assignment_state s on s.course_id=a.course_id and s.canvas_assignment_id=a.canvas_assignment_id
  left join public.notification_preferences p on p.user_id=a.user_id
  cross join lateral (select public.canvas_notification_timezone_v1(a.user_id,a.course_id) value) tz
  cross join (values ('deadline_7_day'),('deadline_3_day'),('deadline_due_today')) k(type)
  where not public.is_past_canvas_course_v1(c) and a.published is distinct from false and a.due_at>p_now
    and public.canvas_notification_assignment_pending_v1(a.id)
    and public.notification_email_enabled_v1(a.user_id,k.type)
    and (p_now at time zone tz.value)::time>=coalesce(p.reminder_time,'08:00'::time)
    and (p_now at time zone tz.value)::time>='00:01'::time
    and case k.type
      when 'deadline_7_day' then a.due_at<=p_now+interval '7 days'
      when 'deadline_3_day' then a.due_at<=p_now+interval '3 days'
      else (a.due_at at time zone tz.value)::date=(p_now at time zone tz.value)::date end
  on conflict(dedupe_key) do nothing;
  get diagnostics v_count=row_count; return v_count;
end; $$;
