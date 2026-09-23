-- B37: converge Quiz and Reviewer-management runtime paths on generated_artifacts.
-- The legacy reviewer_id column remains readable for historical Quiz rows.

alter table public.quizzes
  add column reviewer_artifact_id uuid;

alter table public.quizzes
  add constraint quizzes_reviewer_artifact_owner_fkey
  foreign key (reviewer_artifact_id, user_id)
  references public.generated_artifacts(id, user_id)
  on delete restrict;

alter table public.quizzes
  add constraint quizzes_reviewer_identity_unambiguous_check
  check (reviewer_id is null or reviewer_artifact_id is null);

create index quizzes_reviewer_artifact_idx
  on public.quizzes(reviewer_artifact_id)
  where reviewer_artifact_id is not null;

create index generated_artifacts_active_reviewer_source_idx
  on public.generated_artifacts(user_id, source_version_id, updated_at desc)
  where artifact_type = 'reviewer' and deleted_at is null;

create or replace function public.check_quiz_ownership()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not exists (
    select 1
    from public.canvas_courses course
    where course.id = new.course_id
      and course.user_id = new.user_id
  ) or (
    new.reviewer_artifact_id is not null
    and not exists (
      select 1
      from public.generated_artifacts artifact
      join public.generated_artifact_versions version
        on version.id = artifact.latest_version_id
       and version.artifact_id = artifact.id
       and version.user_id = artifact.user_id
       and version.artifact_type = 'reviewer'
      where artifact.id = new.reviewer_artifact_id
        and artifact.user_id = new.user_id
        and artifact.artifact_type = 'reviewer'
        and artifact.deleted_at is null
        and jsonb_typeof(version.payload) = 'object'
        and jsonb_typeof(version.payload -> 'reviewer') = 'object'
    )
  ) or (
    new.generation_id is not null
    and not exists (
      select 1
      from public.processing_jobs job
      where job.id = new.generation_id
        and job.user_id = new.user_id
        and job.job_type = 'quiz_generation'
    )
  ) then
    raise exception 'quiz_not_found';
  end if;
  return new;
end
$$;

drop function public.create_quiz_processing_job(uuid, uuid, uuid, text, jsonb);

create function public.create_quiz_processing_job(
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
    or (p_input ->> 'questionCount')::int not between 5 and 20
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
    now() + interval '30 minutes'
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
      select jsonb_agg(jsonb_build_object('id', option -> 'id', 'text', option -> 'text'))
      from jsonb_array_elements(question -> 'options') option
    ),
    'difficulty', question -> 'difficulty',
    'selectionInstruction', case
      when question ->> 'type' = 'multi_select' then 'Select all correct answers.'
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

create function public.rename_reviewer_artifact(
  p_artifact_id uuid,
  p_title text
)
returns setof public.generated_artifacts
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_artifact public.generated_artifacts%rowtype;
begin
  if v_user_id is null
    or char_length(btrim(p_title)) not between 1 and 120 then
    raise exception 'invalid_request';
  end if;
  update public.generated_artifacts
  set safe_title = btrim(p_title), updated_at = now()
  where id = p_artifact_id
    and user_id = v_user_id
    and artifact_type = 'reviewer'
    and deleted_at is null
  returning * into v_artifact;
  if not found then
    raise exception 'reviewer_not_found';
  end if;
  return next v_artifact;
end
$$;

create function public.delete_reviewer_artifact(p_artifact_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
begin
  if v_user_id is null then
    raise exception 'reviewer_not_found';
  end if;
  if exists (
    select 1
    from public.quizzes quiz
    where quiz.user_id = v_user_id
      and quiz.reviewer_artifact_id = p_artifact_id
  ) then
    raise exception 'reviewer_has_quizzes';
  end if;
  update public.generated_artifacts
  set deleted_at = now(), updated_at = now()
  where id = p_artifact_id
    and user_id = v_user_id
    and artifact_type = 'reviewer'
    and deleted_at is null;
  if not found then
    raise exception 'reviewer_not_found';
  end if;
  return true;
end
$$;

revoke all on function public.create_quiz_processing_job(uuid, uuid, uuid, text, jsonb)
  from public, anon, authenticated;
grant execute on function public.create_quiz_processing_job(uuid, uuid, uuid, text, jsonb)
  to service_role;

revoke all on function public.rename_reviewer_artifact(uuid, text)
  from public, anon, authenticated, service_role;
revoke all on function public.delete_reviewer_artifact(uuid)
  from public, anon, authenticated, service_role;
grant execute on function public.rename_reviewer_artifact(uuid, text)
  to authenticated;
grant execute on function public.delete_reviewer_artifact(uuid)
  to authenticated;
