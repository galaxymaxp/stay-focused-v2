-- Fair poll-owned visits, independent of notification due times/workflow state.
create table public.canvas_preparation_backfill_courses (
  course_id uuid primary key references public.canvas_courses(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  last_visited_at timestamptz not null default 'epoch',
  lease_owner text,
  lease_expires_at timestamptz
);
create index canvas_preparation_backfill_visit_order on public.canvas_preparation_backfill_courses(last_visited_at,course_id);
create index canvas_preparation_backfill_owner on public.canvas_preparation_backfill_courses(user_id);
alter table public.canvas_preparation_backfill_courses enable row level security;
revoke all on public.canvas_preparation_backfill_courses from public,anon,authenticated;
grant all on public.canvas_preparation_backfill_courses to service_role;
grant select(course_id,user_id,last_visited_at) on public.canvas_preparation_backfill_courses to authenticated;
create policy canvas_preparation_backfill_courses_owner on public.canvas_preparation_backfill_courses
  for select to authenticated using(user_id=(select auth.uid()));

create function public.claim_canvas_preparation_backfill_courses_v1(p_worker_id text,p_limit integer)
returns setof public.canvas_preparation_backfill_courses
language plpgsql security invoker set search_path=public,pg_temp as $$
begin
  if p_worker_id is null or length(p_worker_id) not between 1 and 200 then return; end if;
  insert into public.canvas_preparation_backfill_courses(course_id,user_id)
    select c.id,c.user_id from public.canvas_courses c
    join public.canvas_connections x on x.id=c.canvas_connection_id and x.user_id=c.user_id and x.status='active'
    where exists(select 1 from public.canvas_course_sync_preferences p where p.course_id=c.id and p.user_id=c.user_id and p.selected)
    on conflict do nothing;
  return query with candidates as (
    select b.course_id from public.canvas_preparation_backfill_courses b
    join public.canvas_courses c on c.id=b.course_id and c.user_id=b.user_id
    join public.canvas_connections x on x.id=c.canvas_connection_id and x.user_id=c.user_id and x.status='active'
    where (b.lease_expires_at is null or b.lease_expires_at<=now())
      and exists(select 1 from public.canvas_course_sync_preferences p where p.course_id=c.id and p.user_id=c.user_id and p.selected)
    order by b.last_visited_at,b.course_id limit least(20,greatest(0,p_limit)) for update of b skip locked
  ), claimed as (
    update public.canvas_preparation_backfill_courses b set lease_owner=p_worker_id,lease_expires_at=now()+interval '90 seconds'
      from candidates c where b.course_id=c.course_id returning b.*
  ) select * from claimed order by last_visited_at,course_id;
end $$;
revoke all on function public.claim_canvas_preparation_backfill_courses_v1(text,integer) from public,anon,authenticated;
grant execute on function public.claim_canvas_preparation_backfill_courses_v1(text,integer) to service_role;
