-- MR2: one accepted reviewer job owns extraction and generation. Forward only.
alter table public.processing_upload_intents drop constraint processing_upload_intents_source_kind_check;
alter table public.processing_upload_intents add constraint processing_upload_intents_source_kind_check
  check (source_kind in ('pdf','image','docx','pptx'));
alter table public.processing_upload_intents drop constraint processing_upload_intents_mime_type_check;
alter table public.processing_upload_intents add constraint processing_upload_intents_mime_type_check check (mime_type in (
  'application/pdf','image/png','image/jpeg',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation'));
alter table public.document_assets drop constraint document_assets_mime_type_check;
alter table public.document_assets add constraint document_assets_mime_type_check check (mime_type in (
  'application/pdf','image/png','image/jpeg',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation'));
alter table public.processing_job_sources drop constraint processing_job_sources_kind_check;
alter table public.processing_job_sources add constraint processing_job_sources_kind_check
  check (source_kind in ('pdf','image','text','docx','pptx'));
alter table public.processing_job_sources drop constraint processing_job_sources_location_check;
alter table public.processing_job_sources add constraint processing_job_sources_location_check check (
  (source_kind = 'text' and source_text is not null and storage_bucket is null and storage_object_path is null)
  or (source_kind in ('pdf','image','docx','pptx') and source_text is null and storage_bucket is not null and storage_object_path is not null));
update storage.buckets set allowed_mime_types = array[
  'application/pdf','image/png','image/jpeg',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation']
where id = 'processing-job-sources';

-- Reading stages remain visible on the same reviewer job in Queue.
do $$
declare definition text;
begin
  select pg_get_constraintdef(oid) into strict definition from pg_constraint
    where conrelid='public.processing_jobs'::regclass and conname='processing_jobs_stage_matches_type_check';
  alter table public.processing_jobs drop constraint processing_jobs_stage_matches_type_check;
  execute 'alter table public.processing_jobs add constraint processing_jobs_stage_matches_type_check check (' ||
    substring(definition from 7) || ' or (job_type = ''reviewer_generation'' and source_metadata ->> ''manualReviewerVersion'' = ''manual-reviewer-v1'' and stage in (''inspecting_document'',''extracting_native_text'',''preparing_ocr_chunks'',''extracting_ocr'',''verifying_pages'',''assembling_text'',''storing_result'')))';
end $$;

-- Extend the existing final admission trigger (also used by child Retry).
-- The public marker survives resolution, so earlier chains still count.
do $$
declare definition text;
begin
  definition := pg_get_functiondef('public.enforce_processing_daily_page_quota()'::regprocedure);
  if position('new.job_type = ''document_extraction''' in definition) = 0 then
    raise exception 'manual_reviewer_quota_contract_changed';
  end if;
  definition := replace(definition, 'new.job_type = ''document_extraction''',
    '(new.job_type = ''document_extraction'' or new.source_metadata ->> ''manualReviewerVersion'' = ''manual-reviewer-v1'')');
  definition := replace(definition, 'job.job_type = ''document_extraction''',
    '(job.job_type = ''document_extraction'' or job.source_metadata ->> ''manualReviewerVersion'' = ''manual-reviewer-v1'')');
  definition := replace(definition, 'coalesce(source.page_count, 1)',
    'coalesce(source.page_count, (source.metadata ->> ''manualPageCount'')::integer, 1)');
  execute definition;
end $$;

create or replace function public.create_manual_reviewer_job_v1(
  p_user_id uuid, p_upload_id uuid, p_idempotency_key text,
  p_content_sha256 text, p_page_count integer, p_contract jsonb
) returns setof public.processing_jobs
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  intent public.processing_upload_intents%rowtype;
  job public.processing_jobs%rowtype;
  placeholder_version uuid;
  asset_id uuid;
  fingerprint text;
  metadata jsonb;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_user_id::text, 927));
  select * into intent from public.processing_upload_intents
    where id = p_upload_id and user_id = p_user_id for update;
  if not found then raise exception 'upload_intent_not_found'; end if;
  if p_content_sha256 !~ '^[a-f0-9]{64}$' or p_content_sha256 is null
    or p_page_count is null or p_page_count not between 1 and 100 then
    raise exception 'processing_document_contract_invalid';
  end if;
  fingerprint := encode(extensions.digest(convert_to(
    p_upload_id::text || ':' || p_content_sha256 || ':' || p_page_count::text || ':' || p_contract::text,
    'UTF8'), 'sha256'), 'hex');
  select * into job from public.processing_jobs where user_id = p_user_id and idempotency_key = p_idempotency_key;
  if found then
    if job.request_fingerprint is distinct from fingerprint or job.job_type <> 'reviewer_generation' then
      raise exception 'processing_job_idempotency_conflict';
    end if;
    return next job; return;
  end if;
  if intent.status <> 'pending' or intent.expires_at <= now() or intent.storage_bucket <> 'processing-job-sources' then
    raise exception 'upload_intent_expired';
  end if;
  metadata := jsonb_build_object('manualReviewerVersion','manual-reviewer-v1',
    'manualPageCount',p_page_count,'sourceType',case when intent.source_kind='image' then 'camera' else 'local_file' end,
    'sourceTitle',intent.display_name);
  -- Reuse admission, generation contract validation and owner-wide quota locking.
  -- The placeholder and its version are replaced inside this transaction, before dispatch.
  select * into strict job from public.create_processing_job_v2(
    p_user_id, 'reviewer_generation', p_idempotency_key, fingerprint, 'text', intent.display_name, 'text/plain',
    null, null, 'manual-upload:' || p_upload_id::text || ':' || p_content_sha256,
    null, null, null,
    jsonb_build_object('displayName',intent.display_name,'sourceKind',intent.source_kind,'mimeType',intent.mime_type,
      'byteSize',intent.expected_byte_size,'pageCount',p_page_count,'manualReviewerVersion','manual-reviewer-v1'),
    metadata, p_contract || jsonb_build_object('reuseMode','fresh'), now() + interval '45 minutes');
  placeholder_version := job.source_version_id;
  insert into public.document_assets(user_id,original_file_name,safe_display_name,mime_type,byte_size,
    content_sha256,storage_bucket,storage_object_path)
    values(p_user_id,intent.display_name,intent.display_name,intent.mime_type,intent.expected_byte_size,
      p_content_sha256,intent.storage_bucket,intent.storage_object_path) returning id into asset_id;
  update public.processing_job_sources set source_kind=intent.source_kind,mime_type=intent.mime_type,
    source_text=null,source_character_count=null,source_version_id=null,content_sha256=p_content_sha256,
    byte_size=intent.expected_byte_size,page_count=p_page_count,storage_bucket=intent.storage_bucket,
    storage_object_path=intent.storage_object_path,document_asset_id=asset_id
    where id=job.source_snapshot_id and user_id=p_user_id;
  update public.processing_jobs set source_version_id=null where id=job.id returning * into job;
  delete from public.source_versions where id=placeholder_version and user_id=p_user_id;
  update public.processing_upload_intents set status='accepted',job_id=job.id,accepted_at=now(),updated_at=now()
    where id=p_upload_id and user_id=p_user_id;
  return next job;
end $$;
revoke all on function public.create_manual_reviewer_job_v1(uuid,uuid,text,text,integer,jsonb) from public,anon,authenticated;
grant execute on function public.create_manual_reviewer_job_v1(uuid,uuid,text,text,integer,jsonb) to service_role;

create or replace function public.attach_manual_reviewer_source_v1(
  p_job_id uuid, p_worker_id text, p_source_text text, p_source_blocks jsonb
) returns setof public.processing_jobs
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  job public.processing_jobs%rowtype;
  source public.processing_job_sources%rowtype;
  version_id uuid;
  content_hash text;
begin
  if p_source_text is null or length(btrim(p_source_text)) = 0 or length(p_source_text) > 100000
    or p_source_blocks is null or jsonb_typeof(p_source_blocks) <> 'array' then
    raise exception 'processing_source_text_invalid';
  end if;
  select * into job from public.processing_jobs where id=p_job_id for update;
  if not found or job.job_type <> 'reviewer_generation' or job.status <> 'running'
    or job.lease_owner is distinct from p_worker_id or job.lease_expires_at is null or job.lease_expires_at <= now() then
    raise exception 'processing_job_source_attach_rejected';
  end if;
  select * into strict source from public.processing_job_sources
    where id=job.source_snapshot_id and user_id=job.user_id for update;
  if (source.metadata ->> 'manualReviewerVersion') is distinct from 'manual-reviewer-v1' then
    raise exception 'processing_manual_source_identity_invalid';
  end if;
  -- Replay and child Retry use the persisted immutable text, never re-extract.
  if source.source_kind='text' then
    update public.processing_jobs set source_version_id=source.source_version_id,
      source_metadata=source_metadata || jsonb_build_object('characterCount',source.source_character_count),updated_at=now()
      where id=job.id returning * into job;
    return next job; return;
  end if;
  content_hash := encode(extensions.digest(convert_to(p_source_text,'UTF8'),'sha256'),'hex');
  insert into public.source_versions(user_id,document_asset_id,revision_kind,content_sha256,source_text,
    character_count,normalization_version,created_by,metadata)
    values(job.user_id,source.document_asset_id,'normalized',content_hash,p_source_text,length(p_source_text),
      coalesce(source.normalization_version,'document-normalization-v1'),'system',source.metadata)
    returning id into version_id;
  update public.processing_job_sources set source_kind='text',mime_type='text/plain',
    storage_bucket=null,storage_object_path=null,source_text=p_source_text,source_character_count=length(p_source_text),
    source_version_id=version_id,content_sha256=content_hash,
    metadata=source.metadata || jsonb_build_object('reviewerSourceBlocks',p_source_blocks,'reviewerSourceKind',
      case when source.source_kind='pptx' then 'presentation' else 'document' end)
    where id=source.id and user_id=job.user_id;
  update public.processing_jobs set source_version_id=version_id,
    source_metadata=source_metadata || jsonb_build_object('characterCount',length(p_source_text)),updated_at=now()
    where id=job.id returning * into job;
  return next job;
end $$;
revoke all on function public.attach_manual_reviewer_source_v1(uuid,text,text,jsonb) from public,anon,authenticated;
grant execute on function public.attach_manual_reviewer_source_v1(uuid,text,text,jsonb) to service_role;
