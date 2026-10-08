-- B37.1: publish visible Matching pairs atomically with the Quiz.
-- Existing artifacts and attempts are untouched; correct pair associations remain private.
create or replace function public.complete_quiz_processing_job(
  p_job_id uuid,
  p_worker_id text,
  p_result_type text,
  p_payload jsonb,
  p_metrics jsonb default '{}'
)
returns setof public.processing_jobs
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_job public.processing_jobs%rowtype;
  v_source public.processing_job_sources%rowtype;
  v_quiz_id uuid;
  v_result_id uuid;
  v_public_questions jsonb;
begin
  select * into v_job
  from public.processing_jobs
  where id = p_job_id
  for update;
  if not found
    or v_job.job_type <> 'quiz_generation'
    or p_result_type <> 'quiz_generation'
    or v_job.status <> 'running'
    or v_job.lease_owner is distinct from p_worker_id
    or v_job.lease_expires_at is null
    or v_job.lease_expires_at <= now() then
    raise exception 'processing_job_completion_rejected';
  end if;

  select * into strict v_source
  from public.processing_job_sources
  where id = v_job.source_snapshot_id and user_id = v_job.user_id;
  if p_payload ->> 'courseId' is distinct from v_source.metadata ->> 'courseId'
    or p_payload ->> 'reviewerArtifactId' is distinct from v_source.metadata ->> 'reviewerArtifactId'
    or ((v_source.metadata ->> 'courseId' is null or p_payload ? 'sourceVersionId')
      and p_payload ->> 'sourceVersionId' is distinct from v_source.metadata ->> 'sourceVersionId')
    or ((v_source.metadata ->> 'courseId') is null and
      p_payload -> 'materialIds' is distinct from
        jsonb_build_array('source:' || (v_source.metadata ->> 'sourceVersionId')))
    or jsonb_array_length(p_payload -> 'questions') is distinct from
      (v_source.metadata -> 'quizInput' ->> 'questionCount')::int then
    raise exception 'quiz_generation_failed';
  end if;

  select jsonb_agg(jsonb_build_object(
    'id', question -> 'id',
    'type', question -> 'type',
    'prompt', question -> 'prompt',
    'options', (
      select coalesce(jsonb_agg(jsonb_build_object('id', option -> 'id', 'text', option -> 'text')), '[]'::jsonb)
      from jsonb_array_elements(question -> 'options') option
    ),
    'difficulty', question -> 'difficulty',
    'leftItem', question -> 'leftItem',
    'matchingPairs', case when jsonb_typeof(question -> 'matchingPairs') = 'array' then (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', pair -> 'id', 'leftItem', pair -> 'leftItem'
      ) order by ordinal), '[]'::jsonb)
      from jsonb_array_elements(question -> 'matchingPairs') with ordinality pairs(pair, ordinal)
    ) else '[]'::jsonb end,
    'selectionInstruction', case
      when question ->> 'type' = 'multi_select' then 'Select all correct answers.'
      when question ->> 'type' = 'identification' then 'Type the term.'
      when question ->> 'type' = 'modified_true_false' then 'Mark true, or mark false and correct the wrong term.'
      when question ->> 'type' = 'matching' then 'Match each term to one meaning.'
      else 'Choose one answer.'
    end
  )) into v_public_questions
  from jsonb_array_elements(p_payload -> 'questions') question;

  insert into public.quizzes(
    user_id,
    course_id,
    reviewer_artifact_id,
    source_version_id,
    generation_id,
    title,
    source_material_ids,
    question_count,
    difficulty,
    questions
  ) values (
    v_job.user_id,
    (v_source.metadata ->> 'courseId')::uuid,
    (v_source.metadata ->> 'reviewerArtifactId')::uuid,
    (v_source.metadata ->> 'sourceVersionId')::uuid,
    v_job.id,
    p_payload ->> 'title',
    p_payload -> 'materialIds',
    (v_source.metadata -> 'quizInput' ->> 'questionCount')::int,
    v_source.metadata -> 'quizInput' ->> 'difficulty',
    v_public_questions
  ) returning id into v_quiz_id;

  insert into public.quiz_keys
  values (v_quiz_id, v_job.user_id, p_payload -> 'questions', p_payload -> 'provenance');

  insert into public.processing_job_results(
    job_id,
    user_id,
    source_snapshot_id,
    result_type,
    payload,
    metrics
  ) values (
    v_job.id,
    v_job.user_id,
    v_job.source_snapshot_id,
    'quiz_generation',
    jsonb_build_object('quizId', v_quiz_id),
    p_metrics
  ) returning id into v_result_id;

  update public.processing_jobs
  set status = 'succeeded',
      stage = 'storing_result',
      status_message = 'Complete',
      result_id = v_result_id,
      completed_at = now(),
      updated_at = now(),
      lease_owner = null,
      lease_expires_at = null,
      heartbeat_at = null
  where id = v_job.id
  returning * into v_job;

  return next v_job;
end
$$;

revoke all on function public.complete_quiz_processing_job(uuid,text,text,jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.complete_quiz_processing_job(uuid,text,text,jsonb,jsonb) to service_role;
