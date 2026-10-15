-- VL3: external references are owner-private and never canonical source evidence.
create table public.section_external_visuals (
  user_id uuid not null references auth.users(id) on delete cascade,
  artifact_id uuid not null,
  version_id uuid not null,
  section_id text not null check (section_id ~ '^[a-zA-Z0-9_-]{1,220}$'),
  status text not null check (status in ('found', 'none')),
  source_url text check (source_url ~ '^https://commons[.]wikimedia[.]org/wiki/File:'),
  image_url text check (image_url ~ '^https://upload[.]wikimedia[.]org/'),
  title text check (length(title) between 1 and 500),
  credit text check (length(credit) between 1 and 2000),
  license text check (license in ('Public domain', 'CC0', 'CC BY', 'CC BY-SA')),
  license_url text check (license_url ~ '^https://(creativecommons[.]org|commons[.]wikimedia[.]org)/'),
  width integer check (width between 1 and 1200),
  height integer check (height between 1 and 10000),
  query text not null check (length(query) between 1 and 300),
  verdict text not null check (length(verdict) between 1 and 500),
  attempt_count integer not null check (attempt_count between 1 and 2),
  excluded_titles text[] not null check (cardinality(excluded_titles) <= 10),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, artifact_id, version_id, section_id),
  foreign key (artifact_id, user_id) references public.generated_artifacts(id, user_id) on delete cascade,
  foreign key (version_id, user_id) references public.generated_artifact_versions(id, user_id) on delete cascade,
  check ((status = 'none' and num_nonnulls(source_url,image_url,title,credit,license,license_url,width,height) = 0)
    or (status = 'found' and num_nonnulls(source_url,image_url,title,credit,license,license_url,width,height) = 8))
);
create index section_external_visuals_artifact_idx on public.section_external_visuals(artifact_id);
create index section_external_visuals_version_idx on public.section_external_visuals(version_id);
alter table public.section_external_visuals enable row level security;
revoke all on public.section_external_visuals from public, anon, authenticated;
grant select (user_id,artifact_id,version_id,section_id,status,source_url,image_url,title,credit,license,license_url,width,height,attempt_count,created_at,updated_at)
  on public.section_external_visuals to authenticated;
grant select, insert, update on public.section_external_visuals to service_role;
create policy section_external_visuals_owner_select on public.section_external_visuals
  for select to authenticated using ((select auth.uid()) = user_id);

-- Failed/retried provider calls still spend a daily reservation; never refund cost.
create table public.section_external_visual_requests (
  token uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  artifact_id uuid not null,
  version_id uuid not null,
  section_id text not null,
  attempt integer not null check (attempt between 1 and 2),
  reserved_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '120 seconds'),
  released boolean not null default false,
  foreign key (artifact_id,user_id) references public.generated_artifacts(id,user_id) on delete cascade,
  foreign key (version_id,user_id) references public.generated_artifact_versions(id,user_id) on delete cascade
);
create index section_external_visual_requests_owner_time_idx on public.section_external_visual_requests(user_id,reserved_at);
create index section_external_visual_requests_artifact_idx on public.section_external_visual_requests(artifact_id);
create index section_external_visual_requests_version_idx on public.section_external_visual_requests(version_id);
create index section_external_visual_requests_section_idx on public.section_external_visual_requests(user_id,artifact_id,version_id,section_id,expires_at) where not released;
alter table public.section_external_visual_requests enable row level security;
revoke all on public.section_external_visual_requests from public,anon,authenticated;
grant select,insert,update on public.section_external_visual_requests to service_role;

create function public.reserve_section_external_visual_v1(p_user_id uuid,p_artifact_id uuid,p_version_id uuid,p_section_id text,p_find_another boolean)
returns uuid language plpgsql security invoker set search_path = '' as $$
declare v_attempt integer; v_token uuid;
begin
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_user_id::text, 830));
  if p_section_id !~ '^[a-zA-Z0-9_-]{1,220}$' or not exists (
    select 1 from public.generated_artifacts a join public.generated_artifact_versions v
      on v.id=a.latest_version_id and v.artifact_id=a.id and v.user_id=a.user_id
    where a.id=p_artifact_id and a.user_id=p_user_id and a.deleted_at is null
      and a.artifact_type='reviewer' and v.id=p_version_id
      and exists (select 1 from jsonb_array_elements(coalesce(v.payload->'reviewer',v.payload)->'sections') s where s->>'id'=p_section_id)
  ) then raise exception 'external_visual_not_found'; end if;
  select attempt_count into v_attempt from public.section_external_visuals
    where user_id=p_user_id and artifact_id=p_artifact_id and version_id=p_version_id and section_id=p_section_id;
  if v_attempt is not null and (not p_find_another or v_attempt >= 2) then return null; end if;
  if exists (select 1 from public.section_external_visual_requests where user_id=p_user_id
    and artifact_id=p_artifact_id and version_id=p_version_id and section_id=p_section_id and not released and expires_at>now())
    then raise exception 'external_visual_busy'; end if;
  if (select count(*) from public.section_external_visual_requests where user_id=p_user_id
    and reserved_at>now()-interval '24 hours') >= 20 then raise exception 'external_visual_daily_cap'; end if;
  insert into public.section_external_visual_requests(user_id,artifact_id,version_id,section_id,attempt)
    values(p_user_id,p_artifact_id,p_version_id,p_section_id,coalesce(v_attempt,0)+1) returning token into v_token;
  return v_token;
end $$;

create function public.finish_section_external_visual_v1(p_token uuid,p_result jsonb)
returns boolean language plpgsql security invoker set search_path = '' as $$
declare r public.section_external_visual_requests%rowtype;
begin
  select * into r from public.section_external_visual_requests where token=p_token for update;
  if not found or r.released or r.expires_at<=now() then return false; end if;
  perform 1 from public.generated_artifacts where id=r.artifact_id and user_id=r.user_id
    and latest_version_id=r.version_id and deleted_at is null and artifact_type='reviewer' for share;
  if not found then return false; end if;
  if p_result is not null then
    insert into public.section_external_visuals(user_id,artifact_id,version_id,section_id,status,source_url,image_url,title,credit,license,license_url,width,height,query,verdict,attempt_count,excluded_titles)
    values(r.user_id,r.artifact_id,r.version_id,r.section_id,p_result->>'status',p_result->>'source_url',p_result->>'image_url',p_result->>'title',p_result->>'credit',p_result->>'license',p_result->>'license_url',
      (p_result->>'width')::integer,(p_result->>'height')::integer,p_result->>'query',p_result->>'verdict',r.attempt,
      array(select jsonb_array_elements_text(p_result->'excluded_titles')))
    on conflict (user_id,artifact_id,version_id,section_id) do update set
      status=excluded.status,source_url=excluded.source_url,image_url=excluded.image_url,title=excluded.title,credit=excluded.credit,
      license=excluded.license,license_url=excluded.license_url,width=excluded.width,height=excluded.height,query=excluded.query,
      verdict=excluded.verdict,attempt_count=excluded.attempt_count,excluded_titles=excluded.excluded_titles,updated_at=now();
  end if;
  update public.section_external_visual_requests set released=true where token=p_token;
  return true;
end $$;
revoke all on function public.reserve_section_external_visual_v1(uuid,uuid,uuid,text,boolean) from public,anon,authenticated;
revoke all on function public.finish_section_external_visual_v1(uuid,jsonb) from public,anon,authenticated;
grant execute on function public.reserve_section_external_visual_v1(uuid,uuid,uuid,text,boolean) to service_role;
grant execute on function public.finish_section_external_visual_v1(uuid,jsonb) to service_role;
