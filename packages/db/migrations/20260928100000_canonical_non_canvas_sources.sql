-- B37.1a: retain the existing source_versions identity for all imported material.
-- Owner and source binding remain enforced by composite foreign keys and the Quiz trigger.
create unique index source_versions_owner_import_key
  on public.source_versions (user_id, (metadata ->> 'importKey'))
  where metadata ? 'importKey';

alter table public.quizzes alter column course_id drop not null;
alter table public.quizzes add column source_version_id uuid;
alter table public.quizzes add constraint quizzes_source_owner_fkey
  foreign key (source_version_id, user_id)
  references public.source_versions(id, user_id) on delete restrict;
create index quizzes_source_owner_idx on public.quizzes(user_id, source_version_id)
  where source_version_id is not null;
alter table public.quizzes add constraint quizzes_source_context_check
  check (course_id is not null or source_version_id is not null);

create or replace function public.check_quiz_ownership()
returns trigger language plpgsql set search_path = '' as $$
begin
  if (new.course_id is not null and not exists (
    select 1 from public.canvas_courses course
    where course.id = new.course_id and course.user_id = new.user_id
  )) or (new.course_id is null and new.source_version_id is null)
  or (new.source_version_id is not null and not exists (
    select 1 from public.source_versions source
    where source.id = new.source_version_id and source.user_id = new.user_id
  )) or (new.reviewer_artifact_id is not null and not exists (
    select 1 from public.generated_artifacts artifact
    join public.generated_artifact_versions version
      on version.id = artifact.latest_version_id
     and version.artifact_id = artifact.id
     and version.user_id = artifact.user_id
     and version.artifact_type = 'reviewer'
    where artifact.id = new.reviewer_artifact_id
      and artifact.user_id = new.user_id
      and artifact.artifact_type = 'reviewer'
      and artifact.deleted_at is null
      and (new.source_version_id is null or version.source_version_id = new.source_version_id)
      and jsonb_typeof(version.payload -> 'reviewer') = 'object'
  )) or (new.generation_id is not null and not exists (
    select 1 from public.processing_jobs job
    where job.id = new.generation_id and job.user_id = new.user_id
      and job.job_type = 'quiz_generation'
  )) then
    raise exception 'quiz_not_found';
  end if;
  return new;
end
$$;

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
  v_source_version_id uuid;
  v_snapshot_id text;
begin
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_user_id::text, 927)
  );

  select version.source_version_id, source.metadata ->> 'reviewerSourceSnapshotId'
  into v_source_version_id, v_snapshot_id
  from public.generated_artifacts artifact
  join public.generated_artifact_versions version
    on version.id = artifact.latest_version_id
   and version.artifact_id = artifact.id
   and version.user_id = artifact.user_id
   and version.artifact_type = 'reviewer'
  join public.source_versions source
    on source.id = version.source_version_id
   and source.user_id = version.user_id
  where artifact.id = p_reviewer_artifact_id
    and artifact.user_id = p_user_id
    and artifact.artifact_type = 'reviewer'
    and artifact.deleted_at is null
    and jsonb_typeof(version.payload -> 'reviewer') = 'object';
  if v_source_version_id is null then
    raise exception 'quiz_source_unavailable';
  end if;
  if p_course_id is null then
    if v_snapshot_id is not null or not exists (
      select 1 from public.source_versions source
      where source.id = v_source_version_id and source.user_id = p_user_id
        and source.metadata ->> 'sourceType' in ('text', 'camera', 'local_file')
    ) then
      raise exception 'quiz_source_unavailable';
    end if;
  elsif not exists (
    select 1 from public.canvas_courses course
    join public.reviewer_source_snapshots snapshot
      on snapshot.course_id = course.id and snapshot.user_id = course.user_id
    where course.id = p_course_id and course.user_id = p_user_id
      and snapshot.id::text = v_snapshot_id and snapshot.was_edited = false
  ) then
    raise exception 'quiz_source_unavailable';
  end if;

  if jsonb_typeof(p_input) <> 'object'
    or p_input ->> 'reviewerArtifactId' is distinct from p_reviewer_artifact_id::text
    or p_input ->> 'sourceType' is distinct from 'reviewer'
    or p_input -> 'sourceIds' is distinct from jsonb_build_array(p_reviewer_artifact_id::text)
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
    source_version_id,
    metadata
  ) values (
    p_user_id,
    'text',
    'Reviewer quiz',
    'text/plain',
    p_reviewer_artifact_id::text,
    char_length(p_reviewer_artifact_id::text),
    v_source_version_id,
    jsonb_build_object(
      'quizInput', p_input,
      'courseId', p_course_id,
      'reviewerArtifactId', p_reviewer_artifact_id,
      'sourceVersionId', v_source_version_id
    )
  ) returning id into v_source_id;

  insert into public.processing_jobs(
    user_id,
    job_type,
    stage,
    source_snapshot_id,
    source_version_id,
    idempotency_key,
    request_fingerprint,
    source_metadata,
    expires_at
  ) values (
    p_user_id,
    'quiz_generation',
    'preparing_source',
    v_source_id,
    v_source_version_id,
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
