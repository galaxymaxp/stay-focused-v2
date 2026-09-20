create or replace function public.attach_deferred_canvas_reviewer_source_v1(
  p_job_id uuid,
  p_worker_id text,
  p_source_text text,
  p_source_title text,
  p_source_metadata jsonb
)
returns setof public.processing_jobs
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_job public.processing_jobs%rowtype;
  v_source public.processing_job_sources%rowtype;
  v_source_version_id uuid;
  v_content_sha256 text;
  v_source_text text;
  v_source_title text;
begin
  v_source_text := nullif(btrim(p_source_text), '');
  v_source_title := left(nullif(btrim(p_source_title), ''), 180);
  if v_source_text is null or char_length(v_source_text) > 100000 then
    raise exception using errcode = 'P0001', message = 'processing_source_text_invalid';
  end if;
  if v_source_title is null then
    raise exception using errcode = 'P0001', message = 'processing_source_title_invalid';
  end if;
  if p_source_metadata is null or jsonb_typeof(p_source_metadata) <> 'object' then
    raise exception using errcode = 'P0001', message = 'processing_source_metadata_invalid';
  end if;

  select * into v_job
  from public.processing_jobs job
  where job.id = p_job_id
  for update;

  if not found
    or v_job.job_type <> 'reviewer_generation'
    or v_job.status <> 'running'
    or v_job.lease_owner is distinct from p_worker_id
    or v_job.lease_expires_at <= now() then
    raise exception using errcode = 'P0001', message = 'processing_job_source_attach_rejected';
  end if;

  select * into strict v_source
  from public.processing_job_sources source
  where source.id = v_job.source_snapshot_id
    and source.user_id = v_job.user_id
  for update;

  if (v_source.metadata ->> 'canvasDeferredResolutionVersion') <> 'canvas-reviewer-source-v1'
    or (v_source.metadata ->> 'canvasCourseId') is distinct from (p_source_metadata ->> 'canvasCourseId')
    or (v_source.metadata -> 'canvasItemIds') is distinct from (p_source_metadata -> 'canvasItemIds')
    or (p_source_metadata ->> 'canvasResolvedInWorkflowVersion') <> 'canvas-reviewer-source-v1'
    or nullif(p_source_metadata ->> 'reviewerSourceSnapshotId', '') is null then
    raise exception using errcode = 'P0001', message = 'processing_canvas_source_identity_invalid';
  end if;

  v_content_sha256 := encode(
    extensions.digest(convert_to(v_source_text, 'UTF8'), 'sha256'),
    'hex'
  );
  insert into public.source_versions (
    user_id,
    revision_kind,
    content_sha256,
    source_text,
    character_count,
    normalization_version,
    created_by,
    metadata
  ) values (
    v_job.user_id,
    'canvas_resolved',
    v_content_sha256,
    v_source_text,
    char_length(v_source_text),
    coalesce(v_source.normalization_version, 'document-normalization-v1'),
    'system',
    p_source_metadata
  ) returning id into v_source_version_id;

  update public.processing_job_sources source
  set
    source_kind = 'text',
    display_name = v_source_title,
    mime_type = 'text/plain',
    storage_bucket = null,
    storage_object_path = null,
    source_text = v_source_text,
    byte_size = null,
    source_character_count = char_length(v_source_text),
    metadata = p_source_metadata,
    source_version_id = v_source_version_id,
    content_sha256 = v_content_sha256
  where source.id = v_source.id
    and source.user_id = v_job.user_id;

  update public.processing_jobs job
  set
    source_version_id = v_source_version_id,
    source_metadata = jsonb_build_object(
      'displayName', v_source_title,
      'sourceKind', 'text',
      'mimeType', 'text/plain',
      'characterCount', char_length(v_source_text),
      'pageCount', v_source.page_count
    ),
    updated_at = now()
  where job.id = v_job.id
  returning * into v_job;

  return next v_job;
end;
$$;

revoke all on function public.attach_deferred_canvas_reviewer_source_v1(
  uuid,
  text,
  text,
  text,
  jsonb
) from public, anon, authenticated;

grant execute on function public.attach_deferred_canvas_reviewer_source_v1(
  uuid,
  text,
  text,
  text,
  jsonb
) to service_role;
