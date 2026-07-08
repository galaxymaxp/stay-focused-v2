do $$
declare
  v_signature regprocedure :=
    'public.replace_canvas_course_assignment_submission_snapshot(uuid,uuid,uuid,timestamp with time zone,jsonb,text,text)'::regprocedure;
  v_definition text;
begin
  if to_regprocedure('extensions.digest(text,text)') is null then
    raise exception using
      errcode = 'P0001',
      message = 'canvas_grade_sync_digest_extension_missing';
  end if;

  select pg_get_functiondef(v_signature)
  into v_definition;

  if v_definition is null then
    raise exception using
      errcode = 'P0001',
      message = 'canvas_grade_sync_snapshot_rpc_missing';
  end if;

  if v_definition like '% digest(%'
    and v_definition not like '%extensions.digest(%' then
    v_definition := replace(v_definition, 'digest(', 'extensions.digest(');
    execute v_definition;
  end if;
end;
$$;

revoke all on function public.replace_canvas_course_assignment_submission_snapshot(
  uuid,
  uuid,
  uuid,
  timestamptz,
  jsonb,
  text,
  text
) from public;
revoke all on function public.replace_canvas_course_assignment_submission_snapshot(
  uuid,
  uuid,
  uuid,
  timestamptz,
  jsonb,
  text,
  text
) from anon;
revoke all on function public.replace_canvas_course_assignment_submission_snapshot(
  uuid,
  uuid,
  uuid,
  timestamptz,
  jsonb,
  text,
  text
) from authenticated;
grant execute on function public.replace_canvas_course_assignment_submission_snapshot(
  uuid,
  uuid,
  uuid,
  timestamptz,
  jsonb,
  text,
  text
) to service_role;
