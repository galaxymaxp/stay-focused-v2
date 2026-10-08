-- Forward-only metadata polling and transactional email events.
create table public.notification_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email_enabled boolean not null default true,
  announcement_email boolean not null default true,
  new_assignment_email boolean not null default true,
  due_date_change_email boolean not null default true,
  deadline_7_day boolean not null default true,
  deadline_3_day boolean not null default true,
  deadline_due_today boolean not null default true,
  reminder_time time not null default '08:00' check (reminder_time <> '00:00'::time),
  timezone text not null default 'UTC',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create function public.validate_notification_preferences_v1() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  if not exists (select 1 from pg_catalog.pg_timezone_names where name = new.timezone) then
    raise exception 'invalid_notification_timezone';
  end if;
  new.updated_at = now(); return new;
end; $$;
create trigger validate_notification_preferences before insert or update on public.notification_preferences
for each row execute function public.validate_notification_preferences_v1();
alter table public.notification_preferences enable row level security;
revoke all on public.notification_preferences from public, anon, authenticated;
grant select, insert, update on public.notification_preferences to authenticated;
grant all on public.notification_preferences to service_role;
create policy notification_preferences_read_own on public.notification_preferences for select to authenticated using ((select auth.uid()) = user_id);
create policy notification_preferences_insert_own on public.notification_preferences for insert to authenticated with check ((select auth.uid()) = user_id);
create policy notification_preferences_update_own on public.notification_preferences for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- Stable Canvas identity survives local snapshot pruning/reimport. Revision also
-- distinguishes A -> B -> A deadlines; timestamptz ignores formatting differences.
create table public.canvas_notification_assignment_state (
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id uuid not null references public.canvas_courses(id) on delete cascade,
  canvas_assignment_id text not null,
  due_at timestamptz,
  due_revision integer not null default 1,
  primary key (course_id, canvas_assignment_id)
);
insert into public.canvas_notification_assignment_state(user_id, course_id, canvas_assignment_id, due_at)
select user_id, course_id, canvas_assignment_id, due_at from public.canvas_assignments;
create index canvas_notification_assignment_user_idx on public.canvas_notification_assignment_state(user_id);

create table public.notification_outbox (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id uuid not null references public.canvas_courses(id) on delete cascade,
  canvas_assignment_id text,
  canvas_announcement_id text,
  type text not null check (type in ('announcement','new_assignment','due_date_change','deadline_7_day','deadline_3_day','deadline_due_today')),
  due_revision integer,
  dedupe_key text not null unique,
  payload jsonb not null check (jsonb_typeof(payload) = 'object'),
  scheduled_for timestamptz not null default now(),
  sent_at timestamptz,
  failed_at timestamptz,
  skipped_at timestamptz,
  first_attempt_at timestamptz,
  retry_count integer not null default 0,
  last_error text,
  lease_owner uuid,
  lease_expires_at timestamptz,
  message_id text,
  created_at timestamptz not null default now()
);
create index notification_outbox_pending_idx on public.notification_outbox(scheduled_for, created_at)
where sent_at is null and failed_at is null and skipped_at is null;
create index notification_outbox_user_idx on public.notification_outbox(user_id, created_at desc);
alter table public.notification_outbox enable row level security;
revoke all on public.notification_outbox from public, anon, authenticated;
grant select on public.notification_outbox to authenticated;
grant all on public.notification_outbox to service_role;
create policy notification_outbox_read_own on public.notification_outbox for select to authenticated using ((select auth.uid()) = user_id);
-- Seed receipts for announcements already imported; edits must not become new
-- announcement emails after deployment. Future scheduled posts are not seeded.
insert into public.notification_outbox(user_id,course_id,canvas_announcement_id,type,dedupe_key,payload,skipped_at,last_error)
select a.user_id,a.course_id,a.canvas_announcement_id,'announcement',a.user_id||':'||a.course_id||':announcement:'||a.canvas_announcement_id,
  jsonb_build_object('course',coalesce(c.course_code,c.name),'title',a.title),now(),'existing_announcement_baseline'
from public.canvas_announcements a join public.canvas_courses c on c.id=a.course_id
where a.published is distinct from false and (a.posted_at is null or a.posted_at<=now()) and (a.delayed_post_at is null or a.delayed_post_at<=now());
insert into public.notification_outbox(user_id,course_id,canvas_assignment_id,type,due_revision,dedupe_key,payload,skipped_at,last_error)
select a.user_id,a.course_id,a.canvas_assignment_id,'new_assignment',1,a.user_id||':'||a.course_id||':'||a.canvas_assignment_id||':new_assignment',
  jsonb_build_object('course',coalesce(c.course_code,c.name),'title',a.name,'due_at',a.due_at),now(),'existing_assignment_baseline'
from public.canvas_assignments a join public.canvas_courses c on c.id=a.course_id where a.published is distinct from false;
alter table public.canvas_notification_assignment_state enable row level security;
revoke all on public.canvas_notification_assignment_state from public, anon, authenticated;
grant all on public.canvas_notification_assignment_state to service_role;

create table public.canvas_notification_poll_state (
  course_id uuid primary key references public.canvas_courses(id) on delete cascade,
  last_polled_at timestamptz,
  next_poll_at timestamptz not null default now(),
  lease_owner uuid,
  lease_expires_at timestamptz,
  last_error text,
  fingerprints jsonb not null default '{}'::jsonb
);
create index canvas_notification_poll_due_idx on public.canvas_notification_poll_state(next_poll_at);
alter table public.canvas_notification_poll_state enable row level security;
revoke all on public.canvas_notification_poll_state from public, anon, authenticated;
grant all on public.canvas_notification_poll_state to service_role;

create function public.notification_email_enabled_v1(p_user_id uuid, p_type text) returns boolean
language sql stable security invoker set search_path = '' as $$
  select coalesce((select email_enabled and case p_type
    when 'announcement' then announcement_email when 'new_assignment' then new_assignment_email
    when 'due_date_change' then due_date_change_email when 'deadline_7_day' then deadline_7_day
    when 'deadline_3_day' then deadline_3_day when 'deadline_due_today' then deadline_due_today else false end
    from public.notification_preferences where user_id = p_user_id), true);
$$;
create function public.canvas_notification_timezone_v1(p_user_id uuid,p_course_id uuid) returns text
language sql stable security invoker set search_path = '' as $$
  select coalesce((select timezone from public.notification_preferences where user_id=p_user_id),
    (select tz.name from public.canvas_courses c join pg_catalog.pg_timezone_names tz on tz.name=c.time_zone where c.id=p_course_id and c.user_id=p_user_id),'UTC');
$$;

-- Trigger functions require definer rights because existing canonical sync RPCs
-- and owner writes cannot otherwise insert into the server-only outbox.
create function public.detect_canvas_assignment_email_v1() returns trigger
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
create trigger detect_canvas_assignment_email after insert or update on public.canvas_assignments for each row execute function public.detect_canvas_assignment_email_v1();

create function public.detect_canvas_announcement_email_v1() returns trigger
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
    from public.canvas_courses where id=new.course_id on conflict(dedupe_key) do nothing;
  return new;
end; $$;
create trigger detect_canvas_announcement_email after insert or update on public.canvas_announcements for each row execute function public.detect_canvas_announcement_email_v1();

create function public.canvas_notification_assignment_pending_v1(p_assignment_id uuid) returns boolean
language sql stable security invoker set search_path = '' as $$
  select not exists(select 1 from public.canvas_assignment_submissions s where s.assignment_id=a.id and s.user_id=a.user_id
    and s.absent_after_sync_at is null and (s.submitted_at is not null or s.excused=true or s.workflow_state in ('submitted','pending_review')
      or (s.workflow_state='graded' and s.missing is distinct from true)))
    and not exists(select 1 from public.tasks t where t.user_id=a.user_id and t.status='completed'
      and (t.canvas_assignment_row_id=a.id or (t.canvas_connection_id=a.canvas_connection_id and t.canvas_course_id=c.canvas_course_id and t.canvas_assignment_id=a.canvas_assignment_id)))
  from public.canvas_assignments a join public.canvas_courses c on c.id=a.course_id where a.id=p_assignment_id;
$$;

create function public.queue_canvas_deadline_emails_v1(p_now timestamptz default now()) returns integer
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
  where a.published is distinct from false and a.due_at>p_now
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

create function public.claim_canvas_email_outbox_v1(p_worker_id uuid, p_limit integer default 10)
returns setof public.notification_outbox language plpgsql security invoker set search_path = '' as $$
begin
  -- A lost provider acknowledgment must not be blindly retried after Resend's
  -- 24h idempotency retention. Leave it failed for receipt investigation.
  update public.notification_outbox set failed_at=now(),last_error='delivery_receipt_uncertain'
    where first_attempt_at<now()-interval '23 hours' and sent_at is null and failed_at is null and skipped_at is null;
  return query update public.notification_outbox o set lease_owner=p_worker_id,lease_expires_at=now()+interval '60 seconds',
    first_attempt_at=coalesce(first_attempt_at,now()),retry_count=retry_count+1
    where id in (select id from public.notification_outbox where sent_at is null and failed_at is null and skipped_at is null
      and scheduled_for<=now() and (lease_expires_at is null or lease_expires_at<now())
      order by scheduled_for,created_at limit greatest(1,least(p_limit,20)) for update skip locked) returning o.*;
end; $$;

create function public.claim_canvas_notification_course_v1(p_worker_id uuid) returns setof public.canvas_courses
language plpgsql security invoker set search_path = '' as $$
declare v_course uuid;
begin
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext('canvas-notification-course-claim'));
  if (select count(*) from public.canvas_notification_poll_state where lease_expires_at>now())>=2 then return; end if;
  insert into public.canvas_notification_poll_state(course_id)
    select c.id from public.canvas_courses c join public.canvas_course_sync_preferences p on p.course_id=c.id and p.selected
      join public.canvas_connections conn on conn.id=c.canvas_connection_id and conn.status='active'
    where c.workflow_state is distinct from 'completed' on conflict do nothing;
  select s.course_id into v_course from public.canvas_notification_poll_state s
    join public.canvas_courses c on c.id=s.course_id
    join public.canvas_connections conn on conn.id=c.canvas_connection_id and conn.status='active'
    join public.canvas_course_sync_preferences p on p.course_id=c.id and p.selected
    where s.next_poll_at<=now() and (s.lease_expires_at is null or s.lease_expires_at<now())
      and c.workflow_state is distinct from 'completed'
    order by s.next_poll_at,s.course_id limit 1 for update of s skip locked;
  if v_course is null then return; end if;
  update public.canvas_notification_poll_state set lease_owner=p_worker_id,lease_expires_at=now()+interval '90 seconds',next_poll_at=now()+interval '5 minutes' where course_id=v_course;
  return query select * from public.canvas_courses where id=v_course;
end; $$;
create function public.count_canvas_notification_poll_backlog_v1() returns integer
language sql stable security invoker set search_path = '' as $$
  select count(*)::integer from public.canvas_notification_poll_state s
    join public.canvas_courses c on c.id=s.course_id and c.workflow_state is distinct from 'completed'
    join public.canvas_connections conn on conn.id=c.canvas_connection_id and conn.status='active'
    join public.canvas_course_sync_preferences p on p.course_id=c.id and p.selected
    where s.next_poll_at<=now();
$$;

-- Every internal RPC is service-only; definer trigger functions cannot be called
-- directly by clients. Users have owner-scoped preference and outbox access only.
revoke all on function public.validate_notification_preferences_v1(), public.detect_canvas_assignment_email_v1(), public.detect_canvas_announcement_email_v1(),
  public.notification_email_enabled_v1(uuid,text),public.canvas_notification_assignment_pending_v1(uuid),public.queue_canvas_deadline_emails_v1(timestamptz),
  public.claim_canvas_email_outbox_v1(uuid,integer),public.claim_canvas_notification_course_v1(uuid),public.canvas_notification_timezone_v1(uuid,uuid),public.count_canvas_notification_poll_backlog_v1() from public,anon,authenticated;
grant execute on function public.notification_email_enabled_v1(uuid,text),public.canvas_notification_assignment_pending_v1(uuid),public.queue_canvas_deadline_emails_v1(timestamptz),
  public.claim_canvas_email_outbox_v1(uuid,integer),public.claim_canvas_notification_course_v1(uuid),public.canvas_notification_timezone_v1(uuid,uuid),public.count_canvas_notification_poll_backlog_v1() to service_role;

-- Scope arrays are supplied only after complete pagination. Null means failure:
-- preserve its canonical rows and never infer deletion from incomplete evidence.
create function public.apply_canvas_notification_metadata_v1(p_course_id uuid,p_worker_id uuid,p_payload jsonb,p_error text default null)
returns void language plpgsql security invoker set search_path = '' as $$
declare v_course public.canvas_courses; v_item jsonb;
begin
  select c.* into v_course from public.canvas_courses c
    join public.canvas_connections conn on conn.id=c.canvas_connection_id and conn.status='active'
    join public.canvas_course_sync_preferences pref on pref.course_id=c.id and pref.selected
    join public.canvas_notification_poll_state state on state.course_id=c.id and state.lease_owner=p_worker_id and state.lease_expires_at>now()
    where c.id=p_course_id for update of c,state;
  if v_course.id is null then raise exception 'notification_poll_lease_unavailable'; end if;

  if jsonb_typeof(p_payload->'assignments')='array' then
    for v_item in select value from jsonb_array_elements(p_payload->'assignments') loop
      insert into public.canvas_assignments as target (user_id,canvas_connection_id,course_id,canvas_assignment_id,canvas_assignment_group_id,name,description_html,position,points_possible,grading_type,submission_types,due_at,unlock_at,lock_at,published,muted,omit_from_final_grade,anonymous_grading,html_url,quiz_id,discussion_topic_id,canvas_created_at,canvas_updated_at,assignment_group_id)
        select r.user_id,r.canvas_connection_id,r.course_id,r.canvas_assignment_id,r.canvas_assignment_group_id,r.name,r.description_html,r.position,r.points_possible,r.grading_type,r.submission_types,r.due_at,r.unlock_at,r.lock_at,r.published,r.muted,r.omit_from_final_grade,r.anonymous_grading,r.html_url,r.quiz_id,r.discussion_topic_id,r.canvas_created_at,r.canvas_updated_at,r.assignment_group_id from jsonb_populate_record(null::public.canvas_assignments,v_item||jsonb_build_object(
          'user_id',v_course.user_id,'canvas_connection_id',v_course.canvas_connection_id,'course_id',v_course.id, 'assignment_group_id',(select id from public.canvas_assignment_groups where course_id=v_course.id and canvas_assignment_group_id=v_item->>'canvas_assignment_group_id'))) r

        on conflict (course_id,canvas_assignment_id) do update set canvas_assignment_group_id=excluded.canvas_assignment_group_id,name=excluded.name,description_html=excluded.description_html,position=excluded.position,points_possible=excluded.points_possible,grading_type=excluded.grading_type,submission_types=excluded.submission_types,due_at=excluded.due_at,unlock_at=excluded.unlock_at,lock_at=excluded.lock_at,published=excluded.published,muted=excluded.muted,omit_from_final_grade=excluded.omit_from_final_grade,anonymous_grading=excluded.anonymous_grading,html_url=excluded.html_url,quiz_id=excluded.quiz_id,discussion_topic_id=excluded.discussion_topic_id,canvas_created_at=excluded.canvas_created_at,canvas_updated_at=excluded.canvas_updated_at,assignment_group_id=excluded.assignment_group_id,last_synced_at=now()
        where row(target.canvas_assignment_group_id,target.name,target.description_html,target.position,target.points_possible,target.grading_type,target.submission_types,target.due_at,target.unlock_at,target.lock_at,target.published,target.muted,target.omit_from_final_grade,target.anonymous_grading,target.html_url,target.quiz_id,target.discussion_topic_id,target.canvas_created_at,target.canvas_updated_at,target.assignment_group_id) is distinct from row(excluded.canvas_assignment_group_id,excluded.name,excluded.description_html,excluded.position,excluded.points_possible,excluded.grading_type,excluded.submission_types,excluded.due_at,excluded.unlock_at,excluded.lock_at,excluded.published,excluded.muted,excluded.omit_from_final_grade,excluded.anonymous_grading,excluded.html_url,excluded.quiz_id,excluded.discussion_topic_id,excluded.canvas_created_at,excluded.canvas_updated_at,excluded.assignment_group_id)
          and (target.canvas_updated_at is null or excluded.canvas_updated_at is null or excluded.canvas_updated_at>=target.canvas_updated_at);
    end loop;
    update public.canvas_assignments set published=false,last_synced_at=now() where course_id=v_course.id and published is distinct from false
      and not exists(select 1 from jsonb_array_elements(p_payload->'assignments') incoming where incoming->>'canvas_assignment_id'=canvas_assignments.canvas_assignment_id);
  end if;

  if jsonb_typeof(p_payload->'modules')='array' then
    for v_item in select value from jsonb_array_elements(p_payload->'modules') loop
      insert into public.canvas_modules as target (user_id,canvas_connection_id,course_id,canvas_module_id,name,position,unlock_at,item_count,require_sequential_progress,published,prerequisite_module_ids,canvas_state)
        select r.user_id,r.canvas_connection_id,r.course_id,r.canvas_module_id,r.name,r.position,r.unlock_at,r.item_count,r.require_sequential_progress,r.published,r.prerequisite_module_ids,r.canvas_state from jsonb_populate_record(null::public.canvas_modules,v_item||jsonb_build_object(
          'user_id',v_course.user_id,'canvas_connection_id',v_course.canvas_connection_id,'course_id',v_course.id)) r

        on conflict (course_id,canvas_module_id) do update set name=excluded.name,position=excluded.position,unlock_at=excluded.unlock_at,item_count=excluded.item_count,require_sequential_progress=excluded.require_sequential_progress,published=excluded.published,prerequisite_module_ids=excluded.prerequisite_module_ids,canvas_state=excluded.canvas_state,last_synced_at=now()
        where row(target.name,target.position,target.unlock_at,target.item_count,target.require_sequential_progress,target.published,target.prerequisite_module_ids,target.canvas_state) is distinct from row(excluded.name,excluded.position,excluded.unlock_at,excluded.item_count,excluded.require_sequential_progress,excluded.published,excluded.prerequisite_module_ids,excluded.canvas_state);
    end loop;
    update public.canvas_modules set published=false,last_synced_at=now() where course_id=v_course.id and published is distinct from false
      and not exists(select 1 from jsonb_array_elements(p_payload->'modules') incoming where incoming->>'canvas_module_id'=canvas_modules.canvas_module_id);
  end if;

  if jsonb_typeof(p_payload->'moduleItems')='array' then
    for v_item in select value from jsonb_array_elements(p_payload->'moduleItems') loop
      insert into public.canvas_module_items as target (user_id,canvas_connection_id,course_id,canvas_module_item_id,title,position,indent,item_type,canvas_content_id,page_url,external_url,html_url,new_tab,published,completion_requirement,content_details,module_id)
        select r.user_id,r.canvas_connection_id,r.course_id,r.canvas_module_item_id,r.title,r.position,r.indent,r.item_type,r.canvas_content_id,r.page_url,r.external_url,r.html_url,r.new_tab,r.published,r.completion_requirement,r.content_details,r.module_id from jsonb_populate_record(null::public.canvas_module_items,v_item||jsonb_build_object(
          'user_id',v_course.user_id,'canvas_connection_id',v_course.canvas_connection_id,'course_id',v_course.id, 'module_id',(select id from public.canvas_modules where course_id=v_course.id and canvas_module_id=v_item->>'canvas_module_id'))) r

        on conflict (module_id,canvas_module_item_id) do update set title=excluded.title,position=excluded.position,indent=excluded.indent,item_type=excluded.item_type,canvas_content_id=excluded.canvas_content_id,page_url=excluded.page_url,external_url=excluded.external_url,html_url=excluded.html_url,new_tab=excluded.new_tab,published=excluded.published,completion_requirement=excluded.completion_requirement,content_details=excluded.content_details,module_id=excluded.module_id,last_synced_at=now()
        where row(target.title,target.position,target.indent,target.item_type,target.canvas_content_id,target.page_url,target.external_url,target.html_url,target.new_tab,target.published,target.completion_requirement,target.content_details,target.module_id) is distinct from row(excluded.title,excluded.position,excluded.indent,excluded.item_type,excluded.canvas_content_id,excluded.page_url,excluded.external_url,excluded.html_url,excluded.new_tab,excluded.published,excluded.completion_requirement,excluded.content_details,excluded.module_id);
    end loop;
    update public.canvas_module_items set published=false,last_synced_at=now() where course_id=v_course.id and published is distinct from false
      and not exists(select 1 from jsonb_array_elements(p_payload->'moduleItems') incoming where incoming->>'canvas_module_item_id'=canvas_module_items.canvas_module_item_id and incoming->>'canvas_module_id'=(select canvas_module_id from public.canvas_modules where id=canvas_module_items.module_id));
  end if;

  if jsonb_typeof(p_payload->'announcements')='array' then
    for v_item in select value from jsonb_array_elements(p_payload->'announcements') loop
      insert into public.canvas_announcements as target (user_id,canvas_connection_id,course_id,canvas_announcement_id,canvas_course_id,title,message_html,posted_at,delayed_post_at,lock_at,todo_date,workflow_state,published,locked,html_url,author_name,attachments,source_fingerprint)
        select r.user_id,r.canvas_connection_id,r.course_id,r.canvas_announcement_id,r.canvas_course_id,r.title,r.message_html,r.posted_at,r.delayed_post_at,r.lock_at,r.todo_date,r.workflow_state,r.published,r.locked,r.html_url,r.author_name,r.attachments,r.source_fingerprint from jsonb_populate_record(null::public.canvas_announcements,v_item||jsonb_build_object(
          'user_id',v_course.user_id,'canvas_connection_id',v_course.canvas_connection_id,'course_id',v_course.id)) r

        on conflict (course_id,canvas_announcement_id) do update set canvas_course_id=excluded.canvas_course_id,title=excluded.title,message_html=excluded.message_html,posted_at=excluded.posted_at,delayed_post_at=excluded.delayed_post_at,lock_at=excluded.lock_at,todo_date=excluded.todo_date,workflow_state=excluded.workflow_state,published=excluded.published,locked=excluded.locked,html_url=excluded.html_url,author_name=excluded.author_name,attachments=excluded.attachments,source_fingerprint=excluded.source_fingerprint,last_synced_at=now()
        where row(target.canvas_course_id,target.title,target.message_html,target.posted_at,target.delayed_post_at,target.lock_at,target.todo_date,target.workflow_state,target.published,target.locked,target.html_url,target.author_name,target.attachments,target.source_fingerprint) is distinct from row(excluded.canvas_course_id,excluded.title,excluded.message_html,excluded.posted_at,excluded.delayed_post_at,excluded.lock_at,excluded.todo_date,excluded.workflow_state,excluded.published,excluded.locked,excluded.html_url,excluded.author_name,excluded.attachments,excluded.source_fingerprint);
    end loop;
  end if;

  if jsonb_typeof(p_payload->'announcements')='array' and p_payload->>'announcement_window_start' is not null and p_payload->>'announcement_window_end' is not null then
    update public.canvas_announcements a set published=false,last_synced_at=now() where a.course_id=v_course.id and a.published is distinct from false
      and a.posted_at>=(p_payload->>'announcement_window_start')::timestamptz and a.posted_at<=(p_payload->>'announcement_window_end')::timestamptz
      and a.posted_at<=now() and (a.delayed_post_at is null or a.delayed_post_at<=now())
      and not exists(select 1 from jsonb_array_elements(p_payload->'announcements') incoming where incoming->>'canvas_announcement_id'=a.canvas_announcement_id);
  end if;
  -- A delayed post can mature without changing any canonical field. Detect it
  -- from a complete observed collection without forcing a redundant row update.
  if jsonb_typeof(p_payload->'announcements')='array' then
    insert into public.notification_outbox(user_id,course_id,canvas_announcement_id,type,dedupe_key,payload,skipped_at,last_error)
    select a.user_id,a.course_id,a.canvas_announcement_id,'announcement',
      a.user_id||':'||a.course_id||':announcement:'||a.canvas_announcement_id,
      jsonb_build_object('course',coalesce(v_course.course_code,v_course.name),'title',a.title),
      case when public.notification_email_enabled_v1(a.user_id,'announcement') then null else now() end,
      case when public.notification_email_enabled_v1(a.user_id,'announcement') then null else 'preference_disabled' end
    from public.canvas_announcements a where a.course_id=v_course.id and a.published is distinct from false
      and (a.workflow_state is null or a.workflow_state not in ('deleted','unpublished'))
      and (a.posted_at is null or a.posted_at<=now()) and (a.delayed_post_at is null or a.delayed_post_at<=now())
      and exists(select 1 from jsonb_array_elements(p_payload->'announcements') incoming where incoming->>'canvas_announcement_id'=a.canvas_announcement_id)
    on conflict(dedupe_key) do nothing;
  end if;
  if jsonb_typeof(p_payload->'submissions')='array' then
    for v_item in select value from jsonb_array_elements(p_payload->'submissions') loop
      insert into public.canvas_assignment_submissions as target (user_id,canvas_connection_id,course_id,workflow_state,submitted_at,excused,missing,source_fingerprint,assignment_id,absent_after_sync_at,last_seen_at)
        select r.user_id,r.canvas_connection_id,r.course_id,r.workflow_state,r.submitted_at,r.excused,r.missing,r.source_fingerprint,r.assignment_id,r.absent_after_sync_at,r.last_seen_at from jsonb_populate_record(null::public.canvas_assignment_submissions,v_item||jsonb_build_object(
          'user_id',v_course.user_id,'canvas_connection_id',v_course.canvas_connection_id,'course_id',v_course.id, 'assignment_id',(select id from public.canvas_assignments where course_id=v_course.id and canvas_assignment_id=v_item->>'canvas_assignment_id'), 'absent_after_sync_at',null, 'last_seen_at',now())) r
        where r.assignment_id is not null
        on conflict (user_id,canvas_connection_id,course_id,assignment_id) do update set workflow_state=excluded.workflow_state,submitted_at=excluded.submitted_at,excused=excluded.excused,missing=excluded.missing,source_fingerprint=excluded.source_fingerprint,absent_after_sync_at=excluded.absent_after_sync_at,last_seen_at=excluded.last_seen_at,last_synced_at=now()
        where row(target.workflow_state,target.submitted_at,target.excused,target.missing,target.source_fingerprint,target.absent_after_sync_at) is distinct from row(excluded.workflow_state,excluded.submitted_at,excluded.excused,excluded.missing,excluded.source_fingerprint,excluded.absent_after_sync_at);
    end loop;
  end if;

  update public.canvas_notification_poll_state set lease_owner=null,lease_expires_at=null,last_polled_at=now(),last_error=p_error,
    fingerprints=coalesce(p_payload->'fingerprints','{}'::jsonb) where course_id=p_course_id and lease_owner=p_worker_id;
end; $$;
revoke all on function public.apply_canvas_notification_metadata_v1(uuid,uuid,jsonb,text) from public,anon,authenticated;
grant execute on function public.apply_canvas_notification_metadata_v1(uuid,uuid,jsonb,text) to service_role;
