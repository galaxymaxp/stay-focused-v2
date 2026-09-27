-- B37: allow one durable Quiz to contain up to 100 learner items.
-- Public questions and private keys remain owner-isolated under the existing RLS/grants.
alter table public.quizzes drop constraint if exists quizzes_question_count_check;
alter table public.quizzes add constraint quizzes_question_count_check check (question_count between 5 and 100);
alter table public.quizzes drop constraint if exists quizzes_questions_check;
alter table public.quizzes add constraint quizzes_questions_check check (jsonb_typeof(questions) = 'array' and jsonb_array_length(questions) = question_count and octet_length(questions::text) < 1000000);
alter table public.quiz_keys drop constraint if exists quiz_keys_questions_check;
alter table public.quiz_keys add constraint quiz_keys_questions_check check (jsonb_typeof(questions) = 'array' and jsonb_array_length(questions) between 5 and 100 and octet_length(questions::text) < 2000000);
alter table public.quiz_attempts drop constraint if exists quiz_attempts_answers_check;
alter table public.quiz_attempts add constraint quiz_attempts_answers_check check (jsonb_typeof(answers) = 'array' and jsonb_array_length(answers) <= 100);
create or replace function public.create_quiz_processing_job(
  p_user_id uuid,
  p_course_id uuid,
  p_reviewer_artifact_id uuid,
  p_idempotency_key text,
  p_input jsonb
)
returns setof public.processing_jobs
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_job public.processing_jobs%rowtype;
  v_source_id uuid;
  v_fingerprint text;
  v_policy public.processing_policy_config%rowtype;
begin
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_user_id::text, 927)
  );

  if p_reviewer_artifact_id is null
    or not exists (
      select 1
      from public.canvas_courses course
      where course.id = p_course_id
        and course.user_id = p_user_id
    )
    or not exists (
      select 1
      from public.generated_artifacts artifact
      join public.generated_artifact_versions version
        on version.id = artifact.latest_version_id
       and version.artifact_id = artifact.id
       and version.user_id = artifact.user_id
       and version.artifact_type = 'reviewer'
      join public.source_versions source
        on source.id = version.source_version_id
       and source.user_id = version.user_id
      join public.reviewer_source_snapshots snapshot
        on snapshot.id = case
          when source.metadata ->> 'reviewerSourceSnapshotId'
            ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
          then (source.metadata ->> 'reviewerSourceSnapshotId')::uuid
          else null
        end
       and snapshot.user_id = source.user_id
      where artifact.id = p_reviewer_artifact_id
        and artifact.user_id = p_user_id
        and artifact.artifact_type = 'reviewer'
        and artifact.deleted_at is null
        and snapshot.course_id = p_course_id
        and snapshot.was_edited = false
        and jsonb_typeof(version.payload) = 'object'
        and jsonb_typeof(version.payload -> 'reviewer') = 'object'
    ) then
    raise exception 'quiz_source_unavailable';
  end if;

  if jsonb_typeof(p_input) <> 'object'
    or p_input ->> 'reviewerArtifactId' is distinct from p_reviewer_artifact_id::text
    or (p_input ->> 'questionCount')::int not between 5 and 100
    or length(p_idempotency_key) not between 8 and 128 then
    raise exception 'invalid_request';
  end if;

  v_fingerprint := encode(sha256(convert_to(p_input::text, 'UTF8')), 'hex');
  select * into v_job
  from public.processing_jobs
  where user_id = p_user_id and idempotency_key = p_idempotency_key;
  if found then
    if v_job.job_type <> 'quiz_generation'
      or v_job.request_fingerprint <> v_fingerprint then
      raise exception 'conflict';
    end if;
    return next v_job;
    return;
  end if;

  select * into strict v_policy
  from public.processing_policy_config
  where id = 'default';
  if (
    select count(*)
    from public.processing_jobs
    where user_id = p_user_id
      and job_type in ('reviewer_generation', 'activity_generation', 'quiz_generation')
      and status = 'queued'
  ) >= v_policy.max_queued_generation_jobs_per_user
  or (
    select count(*)
    from public.processing_jobs
    where user_id = p_user_id
      and job_type in ('reviewer_generation', 'activity_generation', 'quiz_generation')
      and created_at >= date_trunc('day', now())
  ) >= v_policy.max_daily_generation_jobs then
    raise exception 'rate_limited';
  end if;

  insert into public.processing_job_sources(
    user_id,
    source_kind,
    display_name,
    mime_type,
    source_text,
    source_character_count,
    metadata
  ) values (
    p_user_id,
    'text',
    'Reviewer quiz',
    'text/plain',
    p_reviewer_artifact_id::text,
    char_length(p_reviewer_artifact_id::text),
    jsonb_build_object(
      'quizInput', p_input,
      'courseId', p_course_id,
      'reviewerArtifactId', p_reviewer_artifact_id
    )
  ) returning id into v_source_id;

  insert into public.processing_jobs(
    user_id,
    job_type,
    stage,
    source_snapshot_id,
    idempotency_key,
    request_fingerprint,
    source_metadata,
    expires_at
  ) values (
    p_user_id,
    'quiz_generation',
    'preparing_source',
    v_source_id,
    p_idempotency_key,
    v_fingerprint,
    jsonb_build_object(
      'displayName', 'Reviewer quiz',
      'sourceKind', 'text',
      'mimeType', 'text/plain'
    ),
    now() + interval '2 hours'
  ) returning * into v_job;

  return next v_job;
end
$$;


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
    'selectionInstruction', case
      when question ->> 'type' = 'multi_select' then 'Select all correct answers.'
      when question ->> 'type' = 'identification' then 'Type the term.'
      when question ->> 'type' = 'modified_true_false' then 'Mark true, or mark false and correct the wrong term.'
      when question ->> 'type' = 'matching' then 'Match the term to its meaning.'
      else 'Choose one answer.'
    end
  )) into v_public_questions
  from jsonb_array_elements(p_payload -> 'questions') question;

  insert into public.quizzes(
    user_id,
    course_id,
    reviewer_artifact_id,
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


create or replace function public.save_quiz_answer(p_user_id uuid,p_attempt_id uuid,p_question_id text,p_selected jsonb,p_finalize boolean)
returns setof public.quiz_attempts language plpgsql security definer set search_path='' as $$
declare a public.quiz_attempts%rowtype; q jsonb; old_answer jsonb; selected jsonb; answer jsonb;
begin
 select * into a from public.quiz_attempts where id=p_attempt_id and user_id=p_user_id for update;
 if not found then raise exception 'quiz_attempt_not_found'; end if;
 if a.status<>'in_progress' then raise exception 'quiz_attempt_completed'; end if;
 select value into q from public.quiz_keys k,jsonb_array_elements(k.questions) where k.quiz_id=a.quiz_id and k.user_id=p_user_id and value->>'id'=p_question_id;
 if q is null then raise exception 'quiz_question_not_found'; end if;
 select value into old_answer from jsonb_array_elements(a.answers) where value->>'questionId'=p_question_id;
 if old_answer->>'finalizedAt' is not null then raise exception 'quiz_answer_already_finalized'; end if;
 if p_finalize is null or p_selected is null or jsonb_typeof(p_selected)<>'array' or jsonb_array_length(p_selected)>6 or (p_finalize and jsonb_array_length(p_selected)=0) then raise exception 'quiz_answer_invalid'; end if;
 if exists(select 1 from jsonb_array_elements(p_selected) v where jsonb_typeof(v)<>'string') then raise exception 'quiz_answer_invalid'; end if;
 select coalesce(jsonb_agg(v order by v),'[]') into selected from (select distinct value v from jsonb_array_elements(p_selected)) d;
 if jsonb_array_length(selected)<>jsonb_array_length(p_selected) or exists(select 1 from jsonb_array_elements_text(selected) v where length(v)>200 or length(trim(v))=0) then raise exception 'quiz_answer_invalid'; end if;
 if q->>'type'='identification' then
   if jsonb_array_length(selected)<>1 then raise exception 'quiz_answer_invalid'; end if;
 elsif q->>'type'='modified_true_false' then
   if jsonb_array_length(selected) not between 1 and 2
     or (select count(*) from jsonb_array_elements_text(selected) v where exists(select 1 from jsonb_array_elements(q->'options') o where o->>'id'=v))<>1
     or (jsonb_array_length(selected)=2 and not exists(select 1 from jsonb_array_elements_text(selected) v join lateral jsonb_array_elements(q->'options') o on o->>'id'=v where lower(o->>'text')='false'))
   then raise exception 'quiz_answer_invalid'; end if;
 elsif (q->>'type'<>'multi_select' and jsonb_array_length(selected)>1)
   or exists(select 1 from jsonb_array_elements_text(selected) v where not exists(select 1 from jsonb_array_elements(q->'options') o where o->>'id'=v)) then
   raise exception 'quiz_answer_invalid';
 end if;
 answer=jsonb_build_object('questionId',p_question_id,'selectedOptionIds',selected,'finalizedAt',case when p_finalize then to_jsonb(now()) else 'null'::jsonb end);
 update public.quiz_attempts set answers=(select coalesce(jsonb_agg(value),'[]') from jsonb_array_elements(a.answers) where value->>'questionId'<>p_question_id)||jsonb_build_array(answer) where id=a.id returning * into a;
 return next a;
end $$;
