do $migration$
declare
  v_function_name text;
  v_signature regprocedure;
  v_definition text;
begin
  if to_regprocedure('extensions.digest(bytea,text)') is null then
    raise exception using
      errcode = 'P0001',
      message = 'processing_digest_extension_missing';
  end if;

  foreach v_function_name in array array[
    'public.create_processing_job_v2(uuid,text,text,text,text,text,text,text,text,text,bigint,integer,integer,jsonb,jsonb,jsonb,timestamp with time zone)',
    'public.complete_processing_job_v2(uuid,text,text,jsonb,jsonb,timestamp with time zone)',
    'public.create_source_version_revision(uuid,uuid,text,text,boolean,timestamp with time zone)'
  ]
  loop
    v_signature := to_regprocedure(v_function_name);
    if v_signature is null then
      raise exception using
        errcode = 'P0001',
        message = 'processing_digest_target_function_missing';
    end if;

    select pg_get_functiondef(v_signature)
    into v_definition;

    if v_definition is null then
      raise exception using
        errcode = 'P0001',
        message = 'processing_digest_target_definition_missing';
    end if;

    if v_definition like '%digest(%'
      and v_definition not like '%extensions.digest(%' then
      v_definition := replace(v_definition, 'digest(', 'extensions.digest(');
      execute v_definition;
    end if;
  end loop;
end;
$migration$;

create or replace function public.fail_processing_job_v2(
  p_job_id uuid,
  p_worker_id text,
  p_error_code text,
  p_safe_error_message text,
  p_retryable boolean,
  p_automatic_retryable boolean,
  p_failed_at timestamptz default now()
)
returns setof public.processing_jobs
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_job public.processing_jobs%rowtype;
  v_manual_retryable boolean;
  v_should_retry boolean;
  v_retry_delay_seconds integer;
begin
  select * into v_job
  from public.processing_jobs job
  where job.id = p_job_id
  for update;

  if not found
    or v_job.lease_owner is distinct from p_worker_id
    or v_job.status not in ('running', 'cancellation_requested') then
    raise exception using errcode = 'P0001', message = 'processing_job_failure_rejected';
  end if;

  if v_job.status = 'cancellation_requested' then
    update public.processing_jobs job
    set
      status = 'cancelled',
      status_message = 'Cancelled',
      failed_at = null,
      retryable = false,
      error_code = null,
      safe_error_message = null,
      lease_owner = null,
      lease_expires_at = null,
      heartbeat_at = p_failed_at
    where job.id = v_job.id
    returning * into v_job;

    insert into public.processing_job_events (
      job_id,
      user_id,
      event_type,
      safe_label,
      delivery_key
    ) values (
      v_job.id,
      v_job.user_id,
      'job_cancelled',
      'Processing cancelled',
      v_job.id::text || ':job_cancelled'
    ) on conflict (delivery_key) do nothing;
    return next v_job;
    return;
  end if;

  v_manual_retryable := coalesce(p_retryable, false);
  v_should_retry :=
    v_manual_retryable
    and coalesce(p_automatic_retryable, false)
    and v_job.attempt_count < v_job.max_attempts
    and v_job.expires_at > p_failed_at;
  v_retry_delay_seconds := case
    when p_error_code = 'provider_rate_limited'
      then least(1800, greatest(60, 5 * power(2, greatest(v_job.attempt_count - 1, 0))::integer))
    else least(300, 5 * power(2, greatest(v_job.attempt_count - 1, 0))::integer)
  end;

  update public.processing_jobs job
  set
    status = case when v_should_retry then 'queued' else 'failed' end,
    status_message = case
      when v_should_retry and p_error_code = 'provider_rate_limited'
        then 'Waiting for provider capacity'
      when v_should_retry then 'Waiting to retry'
      else 'Needs attention'
    end,
    next_attempt_at = case
      when v_should_retry then p_failed_at + make_interval(secs => v_retry_delay_seconds)
      else job.next_attempt_at
    end,
    failed_at = case when v_should_retry then null else p_failed_at end,
    error_code = p_error_code,
    safe_error_message = p_safe_error_message,
    retryable = v_manual_retryable,
    lease_owner = null,
    lease_expires_at = null,
    heartbeat_at = p_failed_at
  where job.id = v_job.id
  returning * into v_job;

  if not v_should_retry then
    insert into public.processing_job_events (
      job_id,
      user_id,
      event_type,
      payload,
      safe_label,
      delivery_key
    ) values (
      v_job.id,
      v_job.user_id,
      'job_failed',
      jsonb_build_object(
        'errorCode', p_error_code,
        'retryable', v_manual_retryable,
        'automaticRetryable', coalesce(p_automatic_retryable, false)
      ),
      'Processing needs attention',
      v_job.id::text || ':job_failed'
    ) on conflict (delivery_key) do nothing;
  end if;

  return next v_job;
end;
$$;

revoke all on function public.create_processing_job_v2(
  uuid, text, text, text, text, text, text, text, text, text,
  bigint, integer, integer, jsonb, jsonb, jsonb, timestamptz
) from public, anon, authenticated;
grant execute on function public.create_processing_job_v2(
  uuid, text, text, text, text, text, text, text, text, text,
  bigint, integer, integer, jsonb, jsonb, jsonb, timestamptz
) to service_role;

revoke all on function public.complete_processing_job_v2(
  uuid, text, text, jsonb, jsonb, timestamptz
) from public, anon, authenticated;
grant execute on function public.complete_processing_job_v2(
  uuid, text, text, jsonb, jsonb, timestamptz
) to service_role;

revoke all on function public.create_source_version_revision(
  uuid, uuid, text, text, boolean, timestamptz
) from public, anon, authenticated;
grant execute on function public.create_source_version_revision(
  uuid, uuid, text, text, boolean, timestamptz
) to service_role;

revoke all on function public.fail_processing_job_v2(
  uuid, text, text, text, boolean, boolean, timestamptz
) from public, anon, authenticated;
grant execute on function public.fail_processing_job_v2(
  uuid, text, text, text, boolean, boolean, timestamptz
) to service_role;
