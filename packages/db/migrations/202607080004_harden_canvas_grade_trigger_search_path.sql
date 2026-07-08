create or replace function public.set_canvas_assignment_submissions_updated_at()
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

create or replace function public.set_canvas_course_grade_summaries_updated_at()
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

create or replace function public.set_canvas_course_grade_sync_states_updated_at()
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

revoke all on function public.set_canvas_assignment_submissions_updated_at()
  from public;
revoke all on function public.set_canvas_assignment_submissions_updated_at()
  from anon;
revoke all on function public.set_canvas_assignment_submissions_updated_at()
  from authenticated;
grant execute on function public.set_canvas_assignment_submissions_updated_at()
  to service_role;

revoke all on function public.set_canvas_course_grade_summaries_updated_at()
  from public;
revoke all on function public.set_canvas_course_grade_summaries_updated_at()
  from anon;
revoke all on function public.set_canvas_course_grade_summaries_updated_at()
  from authenticated;
grant execute on function public.set_canvas_course_grade_summaries_updated_at()
  to service_role;

revoke all on function public.set_canvas_course_grade_sync_states_updated_at()
  from public;
revoke all on function public.set_canvas_course_grade_sync_states_updated_at()
  from anon;
revoke all on function public.set_canvas_course_grade_sync_states_updated_at()
  from authenticated;
grant execute on function public.set_canvas_course_grade_sync_states_updated_at()
  to service_role;
