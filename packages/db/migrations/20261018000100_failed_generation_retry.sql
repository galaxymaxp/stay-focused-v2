-- MR3: function-only policy change. No backfill or mutation of existing rows.
-- Apply separately before publishing the API/client retryability projection.
create or replace function public.retry_processing_job(
  p_user_id uuid,
  p_job_id uuid,
  p_idempotency_key text,
  p_requested_at timestamptz default now()
)
returns setof public.processing_jobs
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_original public.processing_jobs%rowtype;
  v_existing public.processing_jobs%rowtype;
  v_retry public.processing_jobs%rowtype;
  v_active_limit integer;
  v_source public.processing_job_sources%rowtype;
  v_asset_id uuid;
  v_item text;
begin
  p_idempotency_key := nullif(btrim(p_idempotency_key), '');

  select * into v_existing
  from public.processing_jobs job
  where job.user_id = p_user_id
    and job.idempotency_key = p_idempotency_key;

  if found then
    if v_existing.retry_of_job_id is distinct from p_job_id then
      raise exception using errcode = 'P0001', message = 'processing_job_idempotency_conflict';
    end if;
  end if;

  select * into v_original
  from public.processing_jobs job
  where job.id = p_job_id
    and job.user_id = p_user_id
  for update;

  if not found then
    return;
  end if;

  -- Keep the exact accepted source; surviving text cannot override deletion.
  select * into v_source from public.processing_job_sources
  where id = v_original.source_snapshot_id and user_id = p_user_id for share;
  if not found then
    raise exception using errcode = 'P0001', message = 'processing_job_not_retryable';
  end if;

  v_asset_id := v_source.document_asset_id;
  if coalesce(v_original.source_version_id, v_source.source_version_id) is not null then
    select coalesce(v_asset_id, source.document_asset_id) into v_asset_id
    from public.source_versions source
    where source.id = coalesce(v_original.source_version_id, v_source.source_version_id)
      and source.user_id = p_user_id;
    if not found then
      raise exception using errcode = 'P0001', message = 'processing_job_not_retryable';
    end if;
  end if;
  if v_asset_id is not null then
    perform 1 from public.document_assets asset
    where asset.id = v_asset_id and asset.user_id = p_user_id
      and asset.deleted_at is null and asset.upload_status = 'available' for share;
    if not found then
      raise exception using errcode = 'P0001', message = 'processing_job_not_retryable';
    end if;
  end if;
  if nullif(btrim(v_source.source_text), '') is null and
    (v_source.storage_bucket is null or v_source.storage_object_path is null) then
    raise exception using errcode = 'P0001', message = 'processing_job_not_retryable';
  end if;

  if v_source.metadata->>'reviewerArtifactId' is not null then
    perform 1 from public.generated_artifacts artifact
    join public.source_versions version on version.id = artifact.source_version_id and version.user_id = p_user_id
    left join public.document_assets asset on asset.id = version.document_asset_id and asset.user_id = p_user_id
    where artifact.id::text = v_source.metadata->>'reviewerArtifactId'
      and artifact.user_id = p_user_id and artifact.deleted_at is null
      and (version.document_asset_id is null or
        (asset.id is not null and asset.deleted_at is null and asset.upload_status = 'available'));
    if not found then
      raise exception using errcode = 'P0001', message = 'processing_job_not_retryable';
    end if;
  end if;

  -- Canvas snapshots retain source identity; deleted items cannot be resurrected.
  if v_source.metadata ? 'canvasItemIds' then
    if jsonb_typeof(v_source.metadata->'canvasItemIds') <> 'array' or
      jsonb_array_length(v_source.metadata->'canvasItemIds') = 0 then
      raise exception using errcode = 'P0001', message = 'processing_job_not_retryable';
    end if;
    for v_item in select jsonb_array_elements_text(v_source.metadata->'canvasItemIds') loop
      if v_item is null or v_item !~ '^(file|page|assignment|announcement):[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' then
        raise exception using errcode = 'P0001', message = 'processing_job_not_retryable';
      end if;
      if v_item ~ '^file:[0-9a-fA-F-]{36}$' then
        perform 1 from public.canvas_files where id = substring(v_item from 6)::uuid
          and user_id = p_user_id and availability_status = 'available' for share;
      elsif v_item ~ '^page:[0-9a-fA-F-]{36}$' then
        perform 1 from public.canvas_pages where id = substring(v_item from 6)::uuid
          and user_id = p_user_id for share;
      elsif v_item like 'assignment:%' then
        perform 1 from public.canvas_assignments where id = split_part(v_item, ':', 2)::uuid
          and user_id = p_user_id for share;
      elsif v_item like 'announcement:%' then
        perform 1 from public.canvas_announcements where id = split_part(v_item, ':', 2)::uuid
          and user_id = p_user_id for share;
      else
        raise exception using errcode = 'P0001', message = 'processing_job_not_retryable';
      end if;
      if not found then
        raise exception using errcode = 'P0001', message = 'processing_job_not_retryable';
      end if;
    end loop;
  end if;

  if v_existing.id is not null then
    return next v_existing;
    return;
  end if;

  if v_original.status <> 'failed' or not (
    v_original.retryable or (
      ((v_original.job_type = 'reviewer_generation'
        and coalesce(v_original.error_code, '') in ('generation_failed', 'reviewer_validation_failed')) or
       (v_original.job_type = 'quiz_generation' and coalesce(v_original.error_code, '') = 'quiz_generation_failed'))
      and v_original.stage in ('generating_sections', 'verifying_coverage', 'retrying_sections', 'assembling_reviewer')
    )
  ) then
    raise exception using errcode = 'P0001', message = 'processing_job_not_retryable';
  end if;

  select max_active_jobs_per_user into strict v_active_limit
  from public.processing_policy_config
  where id = 'default';

  if (
    select count(*)
    from public.processing_jobs job
    where job.user_id = p_user_id
      and job.status in ('queued', 'running', 'cancellation_requested')
  ) >= v_active_limit then
    raise exception using errcode = 'P0001', message = 'processing_job_active_limit_reached';
  end if;

  insert into public.processing_jobs (
    user_id,
    job_type,
    status,
    stage,
    status_message,
    source_metadata,
    source_snapshot_id,
    source_version_id,
    artifact_type,
    generation_policy_version,
    engine_version,
    schema_version,
    provider_id,
    settings_fingerprint,
    language,
    output_mode,
    reuse_mode,
    idempotency_key,
    request_fingerprint,
    retry_of_job_id,
    created_at,
    accepted_at,
    scheduled_for,
    priority_class,
    expires_at
  ) values (
    v_original.user_id,
    v_original.job_type,
    'queued',
    case
      when v_original.job_type = 'document_extraction' then 'inspecting_document'
      else 'preparing_source'
    end,
    'Waiting to start',
    v_original.source_metadata,
    v_original.source_snapshot_id,
    v_original.source_version_id,
    v_original.artifact_type,
    v_original.generation_policy_version,
    v_original.engine_version,
    v_original.schema_version,
    v_original.provider_id,
    v_original.settings_fingerprint,
    v_original.language,
    v_original.output_mode,
    'fresh',
    p_idempotency_key,
    v_original.request_fingerprint,
    v_original.id,
    p_requested_at,
    p_requested_at,
    p_requested_at,
    150,
    p_requested_at + case
      when v_original.job_type = 'document_extraction' then interval '30 minutes'
      else interval '45 minutes'
    end
  ) returning * into v_retry;

  return next v_retry;
end;
$$;

revoke all on function public.retry_processing_job(uuid, uuid, text, timestamptz)
  from public, anon, authenticated;
grant execute on function public.retry_processing_job(uuid, uuid, text, timestamptz)
  to service_role;
