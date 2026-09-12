-- B24.6: one additional job type in the existing durable queue, plus editable drafts.
alter table public.processing_jobs drop constraint processing_jobs_type_check;
alter table public.processing_jobs add constraint processing_jobs_type_check check (job_type in ('document_extraction','reviewer_generation','activity_generation'));
alter table public.processing_job_results drop constraint processing_job_results_type_check;
alter table public.processing_job_results add constraint processing_job_results_type_check check (result_type in ('document_extraction','reviewer_generation','activity_generation'));
alter table public.processing_jobs drop constraint processing_jobs_stage_matches_type_check;
alter table public.processing_jobs add constraint processing_jobs_stage_matches_type_check check (
 (job_type='document_extraction' and stage in ('accepting_upload','inspecting_document','extracting_native_text','preparing_ocr_chunks','extracting_ocr','verifying_pages','assembling_text','storing_result')) or
 (job_type='reviewer_generation' and stage in ('preparing_source','normalizing_source','detecting_outline','planning_sections','generating_sections','verifying_coverage','retrying_sections','assembling_reviewer','storing_reviewer')) or
 (job_type='activity_generation' and stage in ('preparing_source','generating_sections','storing_result'))
);

create table public.activity_drafts (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 activity_id uuid not null,
 course_id uuid not null,
 canvas_connection_id uuid not null,
 generation_id uuid not null,
 activity_type text not null check (activity_type in ('research','essay','reflection','question_answer','worksheet','lab_report','case_analysis','technical_activity','programming','presentation','documentation','calculation','custom')),
 content jsonb not null check (jsonb_typeof(content)='object' and octet_length(content::text)<=200000),
 specification jsonb not null check (jsonb_typeof(specification)='object'),
 sources jsonb not null check (jsonb_typeof(sources)='array'),
 warnings jsonb not null default '[]'::jsonb check (jsonb_typeof(warnings)='array'),
 status text not null default 'draft' check (status in ('draft','edited')),
 revision integer not null default 1 check (revision>0),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(generation_id,user_id),
 foreign key(activity_id,user_id,canvas_connection_id,course_id) references public.canvas_assignments(id,user_id,canvas_connection_id,course_id) on delete cascade,
 foreign key(generation_id,user_id) references public.processing_jobs(id,user_id) on delete no action deferrable initially deferred
);
create index activity_drafts_owner_activity on public.activity_drafts(user_id,activity_id,created_at desc);
create index activity_drafts_owner_updated on public.activity_drafts(user_id,updated_at desc);
alter table public.activity_drafts enable row level security;
revoke all on public.activity_drafts from anon,authenticated;
grant select,insert,delete on public.activity_drafts to authenticated;
grant update(content,revision,status) on public.activity_drafts to authenticated;
grant all on public.activity_drafts to service_role;
create policy activity_drafts_select on public.activity_drafts for select to authenticated using (user_id=(select auth.uid()));
create policy activity_drafts_insert on public.activity_drafts for insert to authenticated with check (user_id=(select auth.uid()) and exists(select 1 from public.processing_jobs j where j.id=generation_id and j.user_id=(select auth.uid()) and j.job_type='activity_generation' and j.status='succeeded'));
create policy activity_drafts_update on public.activity_drafts for update to authenticated using (user_id=(select auth.uid())) with check (user_id=(select auth.uid()));
create policy activity_drafts_delete on public.activity_drafts for delete to authenticated using (user_id=(select auth.uid()));

create function public.protect_activity_draft() returns trigger language plpgsql set search_path='' as $$
begin
 if (new.user_id,new.activity_id,new.course_id,new.canvas_connection_id,new.generation_id,new.activity_type,new.specification,new.sources,new.warnings,new.created_at) is distinct from (old.user_id,old.activity_id,old.course_id,old.canvas_connection_id,old.generation_id,old.activity_type,old.specification,old.sources,old.warnings,old.created_at) then
  raise exception 'activity_draft_conflict';
 end if;
 if new.revision<>old.revision+1 then raise exception 'activity_draft_conflict'; end if;
 new.updated_at=now(); new.status='edited'; return new;
end $$;
create trigger protect_activity_draft before update on public.activity_drafts for each row execute function public.protect_activity_draft();

create function public.create_activity_processing_job(p_user_id uuid,p_activity_id uuid,p_idempotency_key text,p_material_ids jsonb)
returns setof public.processing_jobs language plpgsql security definer set search_path='' as $$
declare a public.canvas_assignments%rowtype; j public.processing_jobs%rowtype; sid uuid; fingerprint text; policy public.processing_policy_config%rowtype;
begin
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_user_id::text,927));
 select * into a from public.canvas_assignments where id=p_activity_id and user_id=p_user_id;
 if not found then raise exception 'activity_not_found'; end if;
 if jsonb_typeof(p_material_ids)<>'array' or jsonb_array_length(p_material_ids)>12 then raise exception 'invalid_request'; end if;
 fingerprint=encode(sha256(convert_to(p_activity_id::text||p_material_ids::text,'UTF8')),'hex');
 select * into j from public.processing_jobs where user_id=p_user_id and idempotency_key=p_idempotency_key;
 if found then
  if j.job_type<>'activity_generation' or j.request_fingerprint<>fingerprint then raise exception 'activity_draft_conflict'; end if;
  return next j; return;
 end if;
 select * into strict policy from public.processing_policy_config where id='default';
 if (select count(*) from public.processing_jobs where user_id=p_user_id and job_type='activity_generation' and status='queued')>=policy.max_queued_generation_jobs_per_user or
 (select count(*) from public.processing_jobs where user_id=p_user_id and job_type='activity_generation' and created_at>=date_trunc('day',now()))>=policy.max_daily_generation_jobs then raise exception 'processing_job_generation_limit_reached'; end if;
 insert into public.processing_job_sources(user_id,source_kind,display_name,mime_type,source_text,source_character_count,metadata)
 values(p_user_id,'text',left(a.name,180),'text/plain',p_activity_id::text,36,jsonb_build_object('activityId','canvas:'||p_activity_id::text,'materialIds',p_material_ids)) returning id into sid;
 insert into public.processing_jobs(user_id,job_type,stage,source_snapshot_id,idempotency_key,request_fingerprint,source_metadata,expires_at)
 values(p_user_id,'activity_generation','preparing_source',sid,p_idempotency_key,fingerprint,jsonb_build_object('displayName',left(a.name,180),'sourceKind','text','mimeType','text/plain'),now()+interval '30 minutes') returning * into j;
 return next j;
end $$;
revoke all on function public.create_activity_processing_job(uuid,uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.create_activity_processing_job(uuid,uuid,text,jsonb) to service_role;

create function public.complete_activity_processing_job(p_job_id uuid,p_worker_id text,p_result_type text,p_payload jsonb,p_metrics jsonb default '{}'::jsonb)
returns setof public.processing_jobs language plpgsql security definer set search_path='' as $$
declare j public.processing_jobs%rowtype; s public.processing_job_sources%rowtype; a public.canvas_assignments%rowtype; did uuid; rid uuid;
begin
 select * into j from public.processing_jobs where id=p_job_id for update;
 if not found or j.job_type<>'activity_generation' or p_result_type<>'activity_generation' or j.status<>'running' or j.lease_owner is distinct from p_worker_id or j.lease_expires_at is null or j.lease_expires_at<=now() then raise exception 'processing_job_completion_rejected'; end if;
 select * into strict s from public.processing_job_sources where id=j.source_snapshot_id and user_id=j.user_id;
 select * into a from public.canvas_assignments where id=substring(s.metadata->>'activityId' from 8)::uuid and user_id=j.user_id;
 if not found then raise exception 'activity_not_found'; end if;
 if p_payload->>'activityId' is distinct from s.metadata->>'activityId' or p_payload->>'courseId' is distinct from a.course_id::text then raise exception 'activity_not_found'; end if;
 insert into public.activity_drafts(user_id,activity_id,course_id,canvas_connection_id,generation_id,activity_type,content,specification,sources,warnings)
 values(j.user_id,a.id,a.course_id,a.canvas_connection_id,j.id,p_payload->>'type',p_payload->'content',p_payload->'specification',p_payload->'sources',p_payload->'warnings') returning id into did;
 insert into public.processing_job_results(job_id,user_id,source_snapshot_id,result_type,payload,metrics)
 values(j.id,j.user_id,j.source_snapshot_id,'activity_generation',jsonb_build_object('draftId',did),p_metrics) returning id into rid;
 update public.processing_jobs set status='succeeded',stage='storing_result',status_message='Complete',result_id=rid,completed_at=now(),updated_at=now(),lease_owner=null,lease_expires_at=null,heartbeat_at=null where id=j.id returning * into j;
 return next j;
end $$;
revoke all on function public.complete_activity_processing_job(uuid,text,text,jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.complete_activity_processing_job(uuid,text,text,jsonb,jsonb) to service_role;

-- Keep saved drafts and their generation provenance through routine retention.
create or replace function public.run_processing_lifecycle_cleanup(
  p_now timestamptz default now(),
  p_dry_run boolean default true
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_policy public.processing_policy_config%rowtype;
  v_eligible_events integer;
  v_eligible_failed_jobs integer;
  v_eligible_completed_jobs integer;
  v_deleted_events integer := 0;
  v_deleted_failed_jobs integer := 0;
  v_deleted_completed_jobs integer := 0;
  v_deleted_orphan_snapshots integer := 0;
begin
  select * into strict v_policy
  from public.processing_policy_config
  where id = 'default';

  select count(*) into v_eligible_events
  from public.processing_job_events as event
  where event.created_at <
      p_now - make_interval(days => v_policy.event_retention_days)
    and (
      event.delivered_at is not null
      or event.delivery_eligible = false
      or event.created_at <
        p_now - make_interval(days => v_policy.event_retention_days * 2)
    );

  select count(*) into v_eligible_failed_jobs
  from public.processing_jobs as job
  where job.status in ('failed', 'cancelled', 'expired')
    and job.updated_at <
      p_now - make_interval(days => v_policy.failed_job_retention_days)
    and job.idempotency_expires_at < p_now;

  select count(*) into v_eligible_completed_jobs
  from public.processing_jobs as job
  where job.status = 'succeeded'
    and not exists (select 1 from public.activity_drafts d where d.generation_id=job.id)
    and job.completed_at <
      p_now - make_interval(days => v_policy.completed_job_retention_days)
    and job.idempotency_expires_at < p_now;

  if not p_dry_run then
    with candidates as (
      select event.id
      from public.processing_job_events as event
      where event.created_at <
          p_now - make_interval(days => v_policy.event_retention_days)
        and (
          event.delivered_at is not null
          or event.delivery_eligible = false
          or event.created_at <
            p_now - make_interval(days => v_policy.event_retention_days * 2)
        )
      order by event.created_at, event.id
      limit 500
      for update skip locked
    )
    delete from public.processing_job_events as event
    using candidates
    where event.id = candidates.id;
    get diagnostics v_deleted_events = row_count;

    with candidates as (
      select job.id
      from public.processing_jobs as job
      where job.status in ('failed', 'cancelled', 'expired')
        and job.updated_at <
          p_now - make_interval(days => v_policy.failed_job_retention_days)
        and job.idempotency_expires_at < p_now
      order by job.updated_at, job.id
      limit 100
      for update skip locked
    )
    delete from public.processing_jobs as job
    using candidates
    where job.id = candidates.id;
    get diagnostics v_deleted_failed_jobs = row_count;

    with candidates as (
      select job.id
      from public.processing_jobs as job
      where job.status = 'succeeded'
    and not exists (select 1 from public.activity_drafts d where d.generation_id=job.id)
        and job.completed_at <
          p_now - make_interval(days => v_policy.completed_job_retention_days)
        and job.idempotency_expires_at < p_now
      order by job.completed_at, job.id
      limit 100
      for update skip locked
    )
    delete from public.processing_jobs as job
    using candidates
    where job.id = candidates.id;
    get diagnostics v_deleted_completed_jobs = row_count;

    with candidates as (
      select source.id
      from public.processing_job_sources as source
      where not exists (
        select 1
        from public.processing_jobs as job
        where job.source_snapshot_id = source.id
      )
      order by source.created_at, source.id
      limit 200
      for update skip locked
    )
    delete from public.processing_job_sources as source
    using candidates
    where source.id = candidates.id;
    get diagnostics v_deleted_orphan_snapshots = row_count;
  end if;

  return jsonb_build_object(
    'dryRun', p_dry_run,
    'eligibleEventRows', v_eligible_events,
    'eligibleFailedOrCancelledJobRows', v_eligible_failed_jobs,
    'eligibleCompletedJobRows', v_eligible_completed_jobs,
    'deletedEventRows', v_deleted_events,
    'deletedFailedOrCancelledJobRows', v_deleted_failed_jobs,
    'deletedCompletedJobRows', v_deleted_completed_jobs,
    'deletedOrphanSnapshotRows', v_deleted_orphan_snapshots,
    'storageCleanupBacklog', (
      select count(*)
      from public.processing_cleanup_queue as cleanup
      where cleanup.status in ('pending', 'failed')
        and cleanup.not_before <= p_now
    )
  );
end;
$$;

revoke all on function public.run_processing_lifecycle_cleanup(
  timestamptz,
  boolean
) from public, anon, authenticated;
grant execute on function public.run_processing_lifecycle_cleanup(
  timestamptz,
  boolean
) to service_role;
