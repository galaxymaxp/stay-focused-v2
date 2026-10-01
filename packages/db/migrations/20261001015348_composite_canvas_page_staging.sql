create or replace function public.stage_deferred_canvas_reviewer_pdf_v1(
  p_job_id uuid,
  p_canvas_file_id uuid,
  p_expected_content_sha256 text,
  p_expected_byte_size bigint
)
returns setof public.processing_jobs
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_job public.processing_jobs%rowtype;
  v_source public.processing_job_sources%rowtype;
  v_file public.canvas_files%rowtype;
  v_placeholder_version_id uuid;
  v_item_id text;
  v_item_count integer;
  v_primary_id text;
  v_page public.canvas_pages%rowtype;
begin
  select * into v_job
  from public.processing_jobs job
  where job.id = p_job_id
  for update;

  if not found
    or v_job.job_type <> 'reviewer_generation'
    or (coalesce(auth.role(), '') <> 'service_role' and auth.uid() is distinct from v_job.user_id) then
    raise exception using errcode = 'P0001', message = 'processing_job_source_stage_rejected';
  end if;

  select * into strict v_source
  from public.processing_job_sources source
  where source.id = v_job.source_snapshot_id
    and source.user_id = v_job.user_id
  for update;

  v_item_id := 'file:' || p_canvas_file_id::text;
  if jsonb_typeof(v_source.metadata -> 'canvasItemIds') is distinct from 'array' then
    raise exception using errcode = 'P0001', message = 'processing_canvas_source_identity_invalid';
  end if;
  v_item_count := jsonb_array_length(v_source.metadata -> 'canvasItemIds');
  v_primary_id := v_source.metadata -> 'canvasItemIds' ->> 0;
  if (v_source.metadata ->> 'canvasDeferredResolutionVersion') <> 'canvas-reviewer-source-v1'
    or v_item_count not in (1, 2)
    or (v_source.metadata -> 'canvasItemIds' ->> (v_item_count - 1)) is distinct from v_item_id
    or (v_item_count = 1 and v_primary_id is distinct from v_item_id)
    or (v_item_count = 2 and (v_primary_id is null or v_primary_id !~ '^page:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'))
    or nullif(v_source.metadata ->> 'canvasCourseId', '') is null then
    raise exception using errcode = 'P0001', message = 'processing_canvas_source_identity_invalid';
  end if;

  select * into v_file
  from public.canvas_files file
  where file.id = p_canvas_file_id
    and file.user_id = v_job.user_id
    and file.course_id::text = (v_source.metadata ->> 'canvasCourseId')
  for share;

  if not found
    or v_file.availability_status <> 'available'
    or v_file.ingestion_status not in ('stored', 'unchanged')
    or v_file.ingestion_eligibility <> 'eligible_document'
    or coalesce(v_file.stored_content_type, v_file.content_type) <> 'application/pdf'
    or v_file.storage_bucket <> 'canvas-source-files'
    or nullif(btrim(v_file.storage_object_key), '') is null
    or v_file.current_sha256 !~ '^[a-f0-9]{64}$'
    or v_file.current_sha256 is distinct from lower(p_expected_content_sha256)
    or v_file.stored_byte_count is distinct from p_expected_byte_size
    or v_file.stored_byte_count <= 0
    or v_file.stored_byte_count > 10485760 then
    raise exception using errcode = 'P0001', message = 'processing_canvas_pdf_not_ready';
  end if;

  if v_item_count = 2 then
    select * into v_page
    from public.canvas_pages page
    where 'page:' || page.id::text = v_primary_id
      and page.user_id = v_job.user_id
      and page.course_id = v_file.course_id
      and page.canvas_connection_id = v_file.canvas_connection_id
    for share;
    if not found or not exists (
      select 1 from public.canvas_file_references reference
      where reference.user_id = v_job.user_id
        and reference.canvas_connection_id = v_file.canvas_connection_id
        and reference.course_id = v_file.course_id
        and reference.file_id = v_file.id
        and reference.reference_type = 'page'
        and reference.referenced_row_id = v_page.id
    ) then
      raise exception using errcode = 'P0001', message = 'processing_canvas_source_identity_invalid';
    end if;
  end if;

  if v_source.source_kind = 'pdf' then
    if v_source.storage_bucket is distinct from v_file.storage_bucket
      or v_source.storage_object_path is distinct from v_file.storage_object_key
      or v_source.content_sha256 is distinct from v_file.current_sha256 then
      raise exception using errcode = 'P0001', message = 'processing_canvas_source_identity_invalid';
    end if;
    return next v_job;
    return;
  end if;

  if v_job.status <> 'queued'
    or v_job.workflow_dispatched_at is not null
    or v_job.lease_owner is not null then
    raise exception using errcode = 'P0001', message = 'processing_job_source_stage_rejected';
  end if;

  v_placeholder_version_id := v_source.source_version_id;
  update public.processing_job_sources source
  set
    source_kind = 'pdf',
    mime_type = 'application/pdf',
    storage_bucket = v_file.storage_bucket,
    storage_object_path = v_file.storage_object_key,
    source_text = null,
    byte_size = v_file.stored_byte_count,
    source_character_count = null,
    page_count = null,
    source_version_id = null,
    content_sha256 = v_file.current_sha256
  where source.id = v_source.id
    and source.user_id = v_job.user_id;

  update public.processing_jobs job
  set
    source_version_id = null,
    source_metadata = jsonb_build_object(
      'displayName', v_source.display_name,
      'sourceKind', 'pdf',
      'mimeType', 'application/pdf',
      'byteSize', v_file.stored_byte_count
    ),
    updated_at = now()
  where job.id = v_job.id
  returning * into v_job;

  delete from public.source_versions version
  where version.id = v_placeholder_version_id
    and version.user_id = v_job.user_id
    and not exists (
      select 1 from public.processing_job_sources source
      where source.source_version_id = version.id
    )
    and not exists (
      select 1 from public.processing_jobs job
      where job.source_version_id = version.id
    );

  return next v_job;
end;
$$;

revoke all on function public.stage_deferred_canvas_reviewer_pdf_v1(
  uuid,
  uuid,
  text,
  bigint
) from public, anon, authenticated;

grant execute on function public.stage_deferred_canvas_reviewer_pdf_v1(
  uuid,
  uuid,
  text,
  bigint
) to service_role;

-- A job accepted before source staging must not remain queued if staging fails.
create or replace function public.mark_canvas_reviewer_staging_failed_v1(p_job_id uuid)
returns setof public.processing_jobs
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_job public.processing_jobs%rowtype;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception using errcode = 'P0001', message = 'processing_job_source_stage_rejected';
  end if;

  update public.processing_jobs job
  set status = 'failed',
      status_message = 'Needs attention',
      failed_at = now(),
      updated_at = now(),
      error_code = 'processing_canvas_source_stage_failed',
      safe_error_message = 'The Canvas source could not be prepared. Try again.',
      retryable = false
  where job.id = p_job_id
    and job.job_type = 'reviewer_generation'
    and job.status = 'queued'
    and job.stage = 'preparing_source'
    and job.attempt_count = 0
    and job.workflow_dispatched_at is null
    and job.lease_owner is null
    and exists (
      select 1 from public.processing_job_sources source
      where source.id = job.source_snapshot_id
        and source.user_id = job.user_id
        and source.source_kind = 'text'
        and source.metadata ->> 'canvasDeferredResolutionVersion' = 'canvas-reviewer-source-v1'
    )
  returning * into v_job;

  if found then
    insert into public.processing_job_events(job_id, user_id, event_type, payload)
    values (v_job.id, v_job.user_id, 'job_failed',
      jsonb_build_object('errorCode', 'processing_canvas_source_stage_failed', 'retryable', false));
    return next v_job;
  end if;
end;
$$;

revoke all on function public.mark_canvas_reviewer_staging_failed_v1(uuid)
  from public, anon, authenticated;
grant execute on function public.mark_canvas_reviewer_staging_failed_v1(uuid)
  to service_role;

