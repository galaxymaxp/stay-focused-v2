-- GA1b explicit intent. Only the verified API may mutate admission state.
create table public.course_reviewer_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id uuid not null,
  canvas_connection_id uuid not null,
  material_id text not null check (material_id ~ '^(file|page):[0-9a-f-]{36}$'),
  revision text not null check (revision ~ '^[0-9a-f]{64}$'),
  batch_key text not null check (batch_key ~ '^[0-9a-f]{64}$'),
  batch_keys text[] not null default '{}',
  title text not null check (length(title) <= 500),
  state text not null default 'waiting' check (state in ('waiting','quota','admitted','failed','cancelled','skipped')),
  job_id uuid,
  next_available_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id,material_id,revision),
  foreign key(course_id,user_id,canvas_connection_id) references public.canvas_courses(id,user_id,canvas_connection_id) on delete cascade,
  foreign key(job_id,user_id) references public.processing_jobs(id,user_id) on delete set null (job_id)
);
create index course_reviewer_requests_owner_batch on public.course_reviewer_requests(user_id,batch_key);
create index course_reviewer_requests_open on public.course_reviewer_requests(updated_at,id) where state in ('waiting','quota');
create index course_reviewer_requests_course on public.course_reviewer_requests(course_id);
create index course_reviewer_requests_job on public.course_reviewer_requests(job_id);
alter table public.course_reviewer_requests enable row level security;
revoke all on public.course_reviewer_requests from public,anon,authenticated;
grant select on public.course_reviewer_requests to authenticated;
grant select,insert,update,delete on public.course_reviewer_requests to service_role;
create policy course_reviewer_requests_owner_read on public.course_reviewer_requests for select to authenticated
  using ((select auth.uid()) = user_id);

-- Overlapping selected sets share one request/job while each retains progress.
create function public.link_course_reviewer_batch_v1(p_user_id uuid,p_request_id uuid,p_batch_key text) returns boolean
language plpgsql security invoker set search_path = '' as $$
begin
  if p_batch_key !~ '^[0-9a-f]{64}$' then raise exception 'invalid_request'; end if;
  update public.course_reviewer_requests set batch_keys=array(
    select distinct unnest(batch_keys || array[p_batch_key]))
    where id=p_request_id and user_id=p_user_id;
  return found;
end $$;
revoke all on function public.link_course_reviewer_batch_v1(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.link_course_reviewer_batch_v1(uuid,uuid,text) to service_role;

-- The request row lock serializes pending cancellation with final job insertion.
-- This adds a fence to normal creation, leaving all its quota checks intact.
create function public.fence_course_reviewer_request_v1() returns trigger
language plpgsql security invoker set search_path = '' as $$
declare r public.course_reviewer_requests%rowtype;
begin
  if new.retry_of_job_id is not null then
    update public.course_reviewer_requests set job_id=new.id,updated_at=now()
      where job_id=new.retry_of_job_id and user_id=new.user_id and state='admitted';
    return new;
  end if;
  if new.idempotency_key not like 'course-batch:%' then return new; end if;
  select * into r from public.course_reviewer_requests
    where id::text = substring(new.idempotency_key from 14) and user_id = new.user_id for update;
  if r.id is null or r.state not in ('waiting','quota') or new.job_type <> 'reviewer_generation'
    then raise exception 'course_batch_request_closed'; end if;
  if not exists (select 1 from public.canvas_material_preparations p
      join public.canvas_material_preparation_evidence e on e.job_id=p.id
      where p.user_id=r.user_id and p.course_id=r.course_id and p.material_id=r.material_id
        and p.revision_fingerprint=r.revision and p.state='prepared'
        and public.canvas_preparation_evidence_current_v1(r.user_id,r.course_id,e.evidence))
    then raise exception 'course_batch_source_not_ready'; end if;
  update public.course_reviewer_requests set state='admitted',job_id=new.id,next_available_at=null,updated_at=now() where id=r.id;
  return new;
end $$;
-- AFTER insertion keeps the job foreign key valid; a failure rolls back creation.
create trigger course_reviewer_request_admission after insert on public.processing_jobs
  for each row execute function public.fence_course_reviewer_request_v1();
revoke all on function public.fence_course_reviewer_request_v1() from public,anon,authenticated;

-- Capacity blockers have no guaranteed finish time. Timed caps return the first
-- possible retry time; admission always checks the actual policy again.
create function public.course_reviewer_next_available_v1(p_user_id uuid) returns timestamptz
language sql stable security invoker set search_path = '' as $$
  select greatest(
    case when (select count(*) from public.processing_jobs where user_id=p_user_id and created_at>=now()-interval '1 hour') >= p.max_jobs_created_per_hour
      then (select min(created_at)+interval '1 hour' from public.processing_jobs where user_id=p_user_id and created_at>=now()-interval '1 hour') end,
    case when (select count(*) from public.processing_jobs where user_id=p_user_id and job_type='reviewer_generation' and created_at>=date_trunc('day',now())) >= p.max_daily_generation_jobs
      then date_trunc('day',now())+interval '1 day' end
  ) from public.processing_policy_config p where p.id='default';
$$;
revoke all on function public.course_reviewer_next_available_v1(uuid) from public,anon,authenticated;
grant execute on function public.course_reviewer_next_available_v1(uuid) to service_role;
