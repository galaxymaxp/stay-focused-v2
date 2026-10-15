-- ADR-026. Safe receipts are owner-readable; source evidence/results are service-only.
create table public.canvas_material_preparation_controls (
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id uuid not null references public.canvas_courses(id) on delete cascade,
  material_id text not null check (length(material_id) between 6 and 200),
  automatic_attempts integer not null default 0 check (automatic_attempts between 0 and 3),
  suppressed boolean not null default false,
  primary key (user_id, course_id, material_id)
);
create table public.canvas_material_preparations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id uuid not null references public.canvas_courses(id) on delete cascade,
  canvas_connection_id uuid not null references public.canvas_connections(id) on delete cascade,
  material_id text not null check (length(material_id) between 6 and 200),
  source_type text not null check (source_type in ('file','page','page-attachment')),
  revision_fingerprint text not null check (revision_fingerprint ~ '^[a-f0-9]{64}$'),
  state text not null default 'pending' check (state in ('pending','running','prepared','failed','cancelled')),
  cycle_key text not null check (length(cycle_key) between 1 and 200),
  cycle_attempts integer not null default 0 check (cycle_attempts between 0 and 2),
  lifetime_attempts integer not null default 0 check (lifetime_attempts >= 0),
  dispatch_id uuid not null default gen_random_uuid(),
  dispatched_at timestamptz,
  worker_id text,
  lease_token uuid,
  lease_expires_at timestamptz,
  deadline_at timestamptz not null default now() + interval '25 minutes',
  available_at timestamptz not null default now(),
  reason_code text check (reason_code is null or reason_code ~ '^[a-z_]{1,80}$'),
  original_sha256 text check (original_sha256 is null or original_sha256 ~ '^[a-f0-9]{64}$'),
  original_byte_size bigint check (original_byte_size is null or original_byte_size >= 0),
  result_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, course_id, material_id, revision_fingerprint),
  foreign key (user_id,course_id,material_id) references public.canvas_material_preparation_controls on delete cascade
);
create table public.canvas_material_preparation_evidence (
  job_id uuid primary key references public.canvas_material_preparations(id) on delete cascade,
  -- Only row IDs and revision digests; never credentials or private object paths.
  evidence jsonb not null check (jsonb_typeof(evidence) = 'array' and jsonb_array_length(evidence) between 1 and 8)
);
create table public.canvas_material_preparation_results (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null unique references public.canvas_material_preparations(id) on delete cascade,
  payload jsonb not null,
  created_at timestamptz not null default now()
);
alter table public.canvas_material_preparations add foreign key (result_id)
  references public.canvas_material_preparation_results(id) on delete set null;

create table public.canvas_preparation_syncs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id uuid not null references public.canvas_courses(id) on delete cascade,
  sync_id uuid references public.canvas_sync_jobs(id) on delete set null,
  cycle_key text not null check (length(cycle_key) between 1 and 200),
  enqueued_count integer not null default 0 check (enqueued_count between 0 and 200),
  batch_index integer not null default 0,
  prepared_total integer not null default 0,
  failed_total integer not null default 0,
  last_terminal_total integer not null default 0,
  deferred_count integer not null default 0,
  guard_state text not null default 'running' check (guard_state in ('running','completed','deferred','tripped')),
  signal text check (signal in ('repeat','no_progress')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id,course_id,cycle_key)
);
create table public.canvas_preparation_sync_items (
  sync_id uuid not null references public.canvas_preparation_syncs(id) on delete cascade,
  job_id uuid not null references public.canvas_material_preparations(id) on delete cascade,
  receipt_id uuid not null default gen_random_uuid(),
  batch_index integer,
  outcome text check (outcome in ('prepared','failed','stalled','cancelled')),
  primary key (sync_id,job_id),
  unique (receipt_id)
);
create index canvas_preparation_course_open on public.canvas_material_preparations(user_id,course_id,state,available_at);
create index canvas_preparation_sync_open on public.canvas_preparation_syncs(user_id,course_id,guard_state);
create index canvas_preparation_items_job on public.canvas_preparation_sync_items(job_id);

alter table public.canvas_material_preparation_controls enable row level security;
alter table public.canvas_material_preparations enable row level security;
alter table public.canvas_material_preparation_evidence enable row level security;
alter table public.canvas_material_preparation_results enable row level security;
alter table public.canvas_preparation_syncs enable row level security;
alter table public.canvas_preparation_sync_items enable row level security;
revoke all on public.canvas_material_preparation_controls, public.canvas_material_preparations,
  public.canvas_material_preparation_evidence, public.canvas_material_preparation_results,
  public.canvas_preparation_syncs, public.canvas_preparation_sync_items from public, anon, authenticated;
grant select on public.canvas_material_preparation_controls, public.canvas_material_preparations,
  public.canvas_preparation_syncs to authenticated;
grant all on public.canvas_material_preparation_controls, public.canvas_material_preparations,
  public.canvas_material_preparation_evidence, public.canvas_material_preparation_results,
  public.canvas_preparation_syncs, public.canvas_preparation_sync_items to service_role;
create policy canvas_material_preparations_owner on public.canvas_material_preparations
  for select to authenticated using (user_id = (select auth.uid()));
create policy canvas_material_preparation_controls_owner on public.canvas_material_preparation_controls
  for select to authenticated using (user_id = (select auth.uid()));
create policy canvas_preparation_syncs_owner on public.canvas_preparation_syncs
  for select to authenticated using (user_id = (select auth.uid()));

-- Lock every exact source row while verifying publication. Hash raw Page HTML,
-- not just updated_at, and verify every attached file's revision separately.
create function public.canvas_preparation_evidence_current_v1(p_user_id uuid, p_course_id uuid, p_evidence jsonb)
returns boolean language plpgsql security invoker set search_path = public, pg_temp as $$
declare e jsonb; f public.canvas_files; p public.canvas_pages;
begin
  if jsonb_typeof(p_evidence) <> 'array' or jsonb_array_length(p_evidence) not between 1 and 8 then return false; end if;
  for e in select value from jsonb_array_elements(p_evidence) order by value->>'id' loop
    if e->>'type' = 'file' then
      select * into f from public.canvas_files where id=(e->>'id')::uuid and user_id=p_user_id and course_id=p_course_id for share;
      if not found or f.availability_status <> 'available' or f.content_version_fingerprint <> e->>'revision' then return false; end if;
    elsif e->>'type' = 'page' then
      select * into p from public.canvas_pages where id=(e->>'id')::uuid and user_id=p_user_id and course_id=p_course_id for share;
      if not found or encode(sha256(convert_to(coalesce(p.body_html,''),'UTF8')),'hex') <> e->>'revision' then return false; end if;
    else return false;
    end if;
  end loop;
  return true;
end $$;

create function public.admit_canvas_material_preparation_v1(
  p_user_id uuid, p_course_id uuid, p_material_id text, p_source_type text,
  p_revision text, p_evidence jsonb, p_cycle_key text, p_manual_retry boolean default false
) returns setof public.canvas_material_preparations
language plpgsql security invoker set search_path = public, pg_temp as $$
declare c public.canvas_courses; j public.canvas_material_preparations; ctrl public.canvas_material_preparation_controls;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_user_id::text || ':' || p_course_id::text || ':' || p_material_id, 0));
  select * into c from public.canvas_courses where id=p_course_id and user_id=p_user_id;
  if not found or not exists(select 1 from public.canvas_connections where id=c.canvas_connection_id and user_id=p_user_id and status='active')
    or not exists(select 1 from public.canvas_course_sync_preferences where course_id=c.id and user_id=p_user_id and selected)
    or not public.canvas_preparation_evidence_current_v1(p_user_id,p_course_id,p_evidence) then return; end if;
  insert into public.canvas_material_preparation_controls(user_id,course_id,material_id) values(p_user_id,p_course_id,p_material_id) on conflict do nothing;
  select * into ctrl from public.canvas_material_preparation_controls where user_id=p_user_id and course_id=p_course_id and material_id=p_material_id for update;
  select * into j from public.canvas_material_preparations where user_id=p_user_id and course_id=p_course_id and material_id=p_material_id and revision_fingerprint=p_revision for update;
  -- Reconnecting active/prepared work, including manual HTTP redelivery, spends no attempt.
  if found and j.state in ('pending','running','prepared') then return next j; return; end if;
  if p_manual_retry then
    update public.canvas_material_preparation_controls set automatic_attempts=0,suppressed=false
      where user_id=p_user_id and course_id=p_course_id and material_id=p_material_id;
  elsif ctrl.suppressed or ctrl.automatic_attempts >= 3 then
    if j.id is not null then return next j; end if; return;
  end if;
  if j.id is not null then
    if j.cycle_key=p_cycle_key then return next j; return; end if;
    update public.canvas_material_preparations set state='pending',cycle_key=p_cycle_key,cycle_attempts=0,
      dispatch_id=gen_random_uuid(),dispatched_at=null,worker_id=null,lease_token=null,lease_expires_at=null,
      deadline_at=now()+interval '25 minutes',available_at=now(),reason_code=null,updated_at=now() where id=j.id returning * into j;
  else
    insert into public.canvas_material_preparations(user_id,course_id,canvas_connection_id,material_id,source_type,revision_fingerprint,cycle_key)
      values(p_user_id,p_course_id,c.canvas_connection_id,p_material_id,p_source_type,p_revision,p_cycle_key) returning * into j;
    insert into public.canvas_material_preparation_evidence(job_id,evidence) values(j.id,p_evidence);
  end if;
  -- A new exact revision invalidates active older work; historical prepared results remain immutable.
  update public.canvas_material_preparations set state='cancelled',reason_code='source_revision_changed',lease_token=null,updated_at=now()
    where user_id=p_user_id and course_id=p_course_id and material_id=p_material_id and id<>j.id and state in ('pending','running');
  return next j;
end $$;

create function public.claim_canvas_material_preparation_v1(p_job_id uuid,p_dispatch_id uuid,p_worker_id text,p_lease_token uuid)
returns setof public.canvas_material_preparations language plpgsql security invoker set search_path=public,pg_temp as $$
declare j public.canvas_material_preparations; ctrl public.canvas_material_preparation_controls;
begin
  select * into j from public.canvas_material_preparations where id=p_job_id;
  if not found then return; end if;
  perform pg_advisory_xact_lock(hashtextextended(j.user_id::text || ':' || j.course_id::text || ':' || j.material_id,0));
  select * into j from public.canvas_material_preparations where id=p_job_id for update;
  if not found or j.dispatch_id<>p_dispatch_id or j.state not in ('pending','running') or j.available_at>now() or j.deadline_at<=now()
    or (j.state='running' and j.lease_expires_at>now()) then return; end if;
  select * into ctrl from public.canvas_material_preparation_controls where user_id=j.user_id and course_id=j.course_id and material_id=j.material_id for update;
  if ctrl.suppressed or ctrl.automatic_attempts>=3 or j.cycle_attempts>=2 then
    update public.canvas_material_preparations set state='failed',reason_code='preparation_attempts_exhausted',updated_at=now() where id=j.id;
    return;
  end if;
  update public.canvas_material_preparation_controls set automatic_attempts=automatic_attempts+1
    where user_id=j.user_id and course_id=j.course_id and material_id=j.material_id;
  update public.canvas_material_preparations set state='running',cycle_attempts=cycle_attempts+1,lifetime_attempts=lifetime_attempts+1,
    worker_id=p_worker_id,lease_token=p_lease_token,lease_expires_at=least(now()+interval '90 seconds',deadline_at),updated_at=now()
    where id=j.id returning * into j;
  return next j;
end $$;

create function public.heartbeat_canvas_material_preparation_v1(p_job_id uuid,p_lease_token uuid)
returns boolean language sql security invoker set search_path=public,pg_temp as $$
  with changed as (update public.canvas_material_preparations set lease_expires_at=least(now()+interval '90 seconds',deadline_at),updated_at=now()
    where id=p_job_id and state='running' and lease_token=p_lease_token and lease_expires_at>now() and deadline_at>now() returning id)
  select exists(select 1 from changed);
$$;

create function public.finish_canvas_material_preparation_v1(p_job_id uuid,p_lease_token uuid,p_payload jsonb,p_reason text,p_retryable boolean,p_retry_after_seconds integer default 0)
returns boolean language plpgsql security invoker set search_path=public,pg_temp as $$
declare j public.canvas_material_preparations; ev jsonb; r uuid; e jsonb; component jsonb; f public.canvas_files; attempts integer;
begin
  select * into j from public.canvas_material_preparations where id=p_job_id for update;
  if not found or j.state<>'running' or j.lease_token<>p_lease_token or j.lease_expires_at<=now() or j.deadline_at<=now() then return false; end if;
  if p_reason is not null then
    select automatic_attempts into attempts from public.canvas_material_preparation_controls where user_id=j.user_id and course_id=j.course_id and material_id=j.material_id;
    update public.canvas_material_preparations set state=case when p_retryable and cycle_attempts<2 and attempts<3 then 'pending' else 'failed' end,
      available_at=now()+make_interval(secs=>greatest(0,least(86400,p_retry_after_seconds))),
      deadline_at=greatest(deadline_at,now()+make_interval(secs=>greatest(0,least(86400,p_retry_after_seconds)))+interval '25 minutes'),
      dispatch_id=gen_random_uuid(),dispatched_at=null,
      reason_code=p_reason,worker_id=null,lease_token=null,lease_expires_at=null,updated_at=now() where id=j.id;
    return true;
  end if;
  select evidence into ev from public.canvas_material_preparation_evidence where job_id=j.id;
  if p_payload is null or jsonb_typeof(p_payload->'components')<>'array' or jsonb_array_length(p_payload->'components')<>jsonb_array_length(ev)
    or not public.canvas_preparation_evidence_current_v1(j.user_id,j.course_id,ev) then
    update public.canvas_material_preparations set state='cancelled',reason_code='source_revision_changed',lease_token=null,updated_at=now() where id=j.id;
    return false;
  end if;
  for e in select value from jsonb_array_elements(ev) loop
    select value into component from jsonb_array_elements(p_payload->'components') where value->>'id'=e->>'id' and value->>'type'=e->>'type';
    if component is null or component->>'revision'<>e->>'revision' or jsonb_typeof(component->'blocks')<>'array' then return false; end if;
    if e->>'type'='file' then
      select * into f from public.canvas_files where id=(e->>'id')::uuid and user_id=j.user_id and course_id=j.course_id for share;
      if f.ingestion_status not in ('stored','unchanged') or f.current_sha256 is distinct from component->>'originalSha256' then return false; end if;
    end if;
  end loop;
  insert into public.canvas_material_preparation_results(job_id,payload) values(j.id,p_payload) returning id into r;
  update public.canvas_material_preparations set state='prepared',result_id=r,reason_code=null,lease_token=null,lease_expires_at=null,
    original_sha256=case when j.source_type='file' then p_payload->'components'->0->>'originalSha256' end,
    original_byte_size=case when j.source_type='file' then (p_payload->'components'->0->>'originalByteSize')::bigint end,
    updated_at=now() where id=j.id;
  return true;
end $$;

-- Service RPCs are never executable by public/client roles (including helpers).
revoke all on function public.canvas_preparation_evidence_current_v1(uuid,uuid,jsonb) from public,anon,authenticated;
revoke all on function public.admit_canvas_material_preparation_v1(uuid,uuid,text,text,text,jsonb,text,boolean) from public,anon,authenticated;
revoke all on function public.claim_canvas_material_preparation_v1(uuid,uuid,text,uuid) from public,anon,authenticated;
revoke all on function public.heartbeat_canvas_material_preparation_v1(uuid,uuid) from public,anon,authenticated;
revoke all on function public.finish_canvas_material_preparation_v1(uuid,uuid,jsonb,text,boolean,integer) from public,anon,authenticated;
grant execute on function public.canvas_preparation_evidence_current_v1(uuid,uuid,jsonb),
  public.admit_canvas_material_preparation_v1(uuid,uuid,text,text,text,jsonb,text,boolean),
  public.claim_canvas_material_preparation_v1(uuid,uuid,text,uuid),
  public.heartbeat_canvas_material_preparation_v1(uuid,uuid),
  public.finish_canvas_material_preparation_v1(uuid,uuid,jsonb,text,boolean,integer) to service_role;
