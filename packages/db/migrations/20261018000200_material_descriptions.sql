-- MD1 / ADR-046. Separate safe metadata; never grant access to prepared payloads.
create table public.material_descriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  preparation_id uuid references public.canvas_material_preparations(id) on delete cascade,
  source_version_id uuid references public.source_versions(id) on delete cascade,
  revision_fingerprint text not null check (revision_fingerprint ~ '^[a-f0-9]{64}$'),
  description text check (char_length(description) between 1 and 240),
  description_model text,
  description_created_at timestamptz,
  description_status text not null check (description_status in ('ready','skipped_empty','failed')),
  created_at timestamptz not null default now(),
  check (num_nonnulls(preparation_id,source_version_id) = 1),
  check ((description_status = 'ready') = (description is not null)),
  unique (user_id, preparation_id, revision_fingerprint),
  unique (user_id, source_version_id, revision_fingerprint)
);
create index material_descriptions_preparation on public.material_descriptions(preparation_id);
create index material_descriptions_source on public.material_descriptions(source_version_id);
create index material_descriptions_daily on public.material_descriptions(user_id,created_at)
  where description_model is not null;
alter table public.material_descriptions enable row level security;
revoke all on public.material_descriptions from public,anon,authenticated;
grant select on public.material_descriptions to authenticated;
grant all on public.material_descriptions to service_role;
create policy material_descriptions_owner on public.material_descriptions for select to authenticated
  using (user_id = (select auth.uid()));

-- Same byte identity fence as readPreparedResult, including Page attachments.
create function public.material_description_preparation_current_v1(p_user_id uuid,p_preparation_id uuid)
returns boolean language sql security invoker set search_path = public,pg_temp as $$
  select exists (select 1 from public.canvas_material_preparations j
    join public.canvas_material_preparation_results r on r.id=j.result_id and r.job_id=j.id
    join public.canvas_material_preparation_evidence e on e.job_id=j.id
    where j.id=p_preparation_id and j.user_id=p_user_id and j.state='prepared'
      and jsonb_typeof(r.payload->'components')='array'
      and jsonb_array_length(r.payload->'components') between 1 and 8
      and public.canvas_preparation_evidence_current_v1(p_user_id,j.course_id,e.evidence)
      and not exists (select 1 from jsonb_array_elements(r.payload->'components') component
        where component->>'type'='file' and not exists (
          select 1 from public.canvas_files f where f.id=(component->>'id')::uuid
            and f.user_id=p_user_id and f.course_id=j.course_id and f.availability_status='available'
            and f.ingestion_status in ('stored','unchanged')
            and f.current_sha256=component->>'originalSha256'
            and f.stored_byte_count=(component->>'originalByteSize')::bigint)));
$$;

-- A failed reservation is deliberate: crashes/unknown provider outcomes never
-- cause another charge for this revision. No automatic retry or pending state.
create function public.claim_material_description_v1(
  p_user_id uuid, p_preparation_id uuid, p_source_version_id uuid,
  p_model text, p_empty boolean
) returns setof public.material_descriptions
language plpgsql security invoker set search_path = public,pg_temp as $$
declare revision text; allowance integer; receipt public.material_descriptions;
begin
  if num_nonnulls(p_preparation_id,p_source_version_id) <> 1 then return; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_user_id::text,927));
  if p_preparation_id is not null then
    select j.revision_fingerprint into revision from public.canvas_material_preparations j
      where j.id=p_preparation_id and j.user_id=p_user_id and j.state='prepared' and j.result_id is not null
      and public.material_description_preparation_current_v1(p_user_id,j.id)
      and not exists (select 1 from public.canvas_material_preparation_controls c
        where c.user_id=j.user_id and c.course_id=j.course_id and c.material_id=j.material_id and c.suppressed)
      and not exists (select 1 from public.canvas_preparation_sync_items i
        join public.canvas_preparation_syncs s on s.id=i.sync_id
        where i.job_id=j.id and s.guard_state='tripped');
  else
    select v.content_sha256 into revision from public.source_versions v
      where v.id=p_source_version_id and v.user_id=p_user_id
      and exists (select 1 from public.processing_jobs j
        join public.processing_job_sources s on s.id=j.source_snapshot_id and s.user_id=j.user_id
        where j.user_id=p_user_id and j.source_version_id=v.id
        and j.status in ('running','succeeded') and s.metadata->>'manualReviewerVersion'='manual-reviewer-v1');
  end if;
  if revision is null then return; end if;
  if exists (select 1 from public.material_descriptions d where d.user_id=p_user_id
    and d.preparation_id is not distinct from p_preparation_id
    and d.source_version_id is not distinct from p_source_version_id and d.revision_fingerprint=revision) then return; end if;
  if not p_empty then
    select max_daily_generation_jobs into allowance from public.processing_policy_config where id='default';
    -- Separate micro-action allowance never steals reviewer admission capacity.
    -- Also skip if that owner's existing generation allowance is exhausted.
    if allowance is null or nullif(btrim(p_model),'') is null or
      (select count(*) from public.processing_jobs where user_id=p_user_id
        and job_type in ('reviewer_generation','quiz_generation','activity_generation')
        and created_at>=date_trunc('day',now())) >= allowance or
      (select count(*) from public.material_descriptions where user_id=p_user_id
        and description_model is not null and created_at>=date_trunc('day',now())) >= allowance then return; end if;
  end if;
  insert into public.material_descriptions(user_id,preparation_id,source_version_id,revision_fingerprint,
    description_model,description_status,description_created_at)
    values(p_user_id,p_preparation_id,p_source_version_id,revision,
      case when p_empty then null else p_model end,case when p_empty then 'skipped_empty' else 'failed' end,now())
    on conflict do nothing returning * into receipt;
  if receipt.id is not null then return next receipt; end if;
end $$;

-- One owner-scoped lookup for a material page; stale/removed source evidence
-- cannot make a historical description appear on the current material.
-- Read through the same bytes fence as admission/publication.
create function public.read_material_descriptions_v1(p_user_id uuid,p_course_id uuid,p_material_ids text[])
returns table(material_id text,description text)
language sql security invoker set search_path = public,pg_temp as $$
  select j.material_id,d.description from public.material_descriptions d
    join public.canvas_material_preparations j on j.id=d.preparation_id and j.user_id=d.user_id
    where cardinality(p_material_ids)<=100 and d.user_id=p_user_id and j.course_id=p_course_id
      and j.material_id=any(p_material_ids) and d.revision_fingerprint=j.revision_fingerprint
      and d.description_status='ready' and public.material_description_preparation_current_v1(p_user_id,j.id);
$$;
create function public.finish_material_description_v1(p_id uuid,p_user_id uuid,p_description text)
returns boolean language plpgsql security invoker set search_path = public,pg_temp as $$
begin
  update public.material_descriptions d set description=p_description,description_status='ready',description_created_at=now()
    where d.id=p_id and d.user_id=p_user_id and d.description_status='failed' and (
      exists (select 1 from public.canvas_material_preparations j
        where j.id=d.preparation_id and j.user_id=d.user_id and j.state='prepared' and j.result_id is not null
          and j.revision_fingerprint=d.revision_fingerprint
          and public.material_description_preparation_current_v1(d.user_id,j.id))
      or exists (select 1 from public.processing_jobs j where j.user_id=d.user_id
        and j.source_version_id=d.source_version_id and j.status in ('running','succeeded'))
    );
  return found;
end $$;
revoke all on function public.material_description_preparation_current_v1(uuid,uuid),
  public.finish_material_description_v1(uuid,uuid,text),public.claim_material_description_v1(uuid,uuid,uuid,text,boolean),
  public.read_material_descriptions_v1(uuid,uuid,text[]) from public,anon,authenticated;
grant execute on function public.material_description_preparation_current_v1(uuid,uuid),
  public.finish_material_description_v1(uuid,uuid,text),public.claim_material_description_v1(uuid,uuid,uuid,text,boolean),
  public.read_material_descriptions_v1(uuid,uuid,text[]) to service_role;
