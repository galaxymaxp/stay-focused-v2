-- Durable batch receipts; one 200-item budget per sync/poll cycle, never per HTTP request.
alter table public.canvas_preparation_sync_items add column drained_to_sync uuid references public.canvas_preparation_syncs(id);
alter table public.canvas_preparation_syncs add column inventory_complete boolean not null default true;
alter table public.canvas_preparation_syncs add column batch_evaluated boolean not null default false;
alter table public.canvas_material_preparations add column prepared_dispatch_id uuid;
create function public.prepare_canvas_material_preparation_dispatch_v1(p_job_id uuid,p_dispatch_id uuid)
returns setof public.canvas_material_preparations language plpgsql security invoker set search_path=public,pg_temp as $$
declare j public.canvas_material_preparations;
begin
  select * into j from public.canvas_material_preparations where id=p_job_id for update;
  if not found or j.state<>'pending' or j.dispatch_id<>p_dispatch_id then return; end if;
  if j.prepared_dispatch_id is distinct from j.dispatch_id then
    update public.canvas_material_preparations set prepared_dispatch_id=dispatch_id,deadline_at=greatest(now(),available_at)+interval '24 hours'
      where id=j.id returning * into j;
  end if;
  return next j;
end $$;
revoke all on function public.prepare_canvas_material_preparation_dispatch_v1(uuid,uuid) from public,anon,authenticated;
grant execute on function public.prepare_canvas_material_preparation_dispatch_v1(uuid,uuid) to service_role;
create table public.canvas_preparation_discoveries (
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id uuid not null references public.canvas_courses(id) on delete cascade,
  material_id text not null check(material_id ~ '^(file|page):[a-f0-9-]{36}$'),
  cycle_key text not null,
  available_at timestamptz not null default now(),
  reason_code text check(reason_code is null or reason_code='source_discovery_unavailable'),
  state text not null default 'pending' check(state in ('pending','failed')),
  primary key(user_id,course_id,material_id)
);
alter table public.canvas_preparation_discoveries enable row level security;
revoke all on public.canvas_preparation_discoveries from public,anon,authenticated;
grant all on public.canvas_preparation_discoveries to service_role;
grant select on public.canvas_preparation_discoveries to authenticated;
create policy canvas_preparation_discoveries_owner on public.canvas_preparation_discoveries for select to authenticated using(user_id=(select auth.uid()));
create index canvas_preparation_discoveries_pending on public.canvas_preparation_discoveries(user_id,course_id,available_at) where state='pending';

-- Commit the wakeup with sync success, before the worker's post-sync callback.
create function public.canvas_preparation_sync_wakeup_v1() returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
begin
  if new.status='succeeded' and new.job_type='course_content' and old.status is distinct from new.status then
    insert into public.canvas_preparation_syncs(user_id,course_id,sync_id,cycle_key,inventory_complete)
      values(new.user_id,new.course_id,new.id,'sync:'||new.id::text,false) on conflict do nothing;
  end if;
  return new;
end $$;
revoke all on function public.canvas_preparation_sync_wakeup_v1() from public,anon,authenticated;
create trigger canvas_preparation_sync_wakeup after update of status on public.canvas_sync_jobs
  for each row execute function public.canvas_preparation_sync_wakeup_v1();

create function public.record_canvas_preparation_discovery_failure_v1(p_user_id uuid,p_course_id uuid,p_material_id text,p_cycle_key text,p_delay_seconds integer)
returns void language plpgsql security invoker set search_path=public,pg_temp as $$
declare previous_cycle text; attempts integer;
begin
  if not exists(select 1 from public.canvas_courses where id=p_course_id and user_id=p_user_id) then return; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_user_id::text||':'||p_course_id::text||':'||p_material_id,0));
  select cycle_key into previous_cycle from public.canvas_preparation_discoveries where user_id=p_user_id and course_id=p_course_id and material_id=p_material_id and reason_code is not null;
  insert into public.canvas_material_preparation_controls(user_id,course_id,material_id) values(p_user_id,p_course_id,p_material_id) on conflict do nothing;
  if previous_cycle is distinct from p_cycle_key then
    update public.canvas_material_preparation_controls set automatic_attempts=least(3,automatic_attempts+1)
      where user_id=p_user_id and course_id=p_course_id and material_id=p_material_id;
  end if;
  select automatic_attempts into attempts from public.canvas_material_preparation_controls where user_id=p_user_id and course_id=p_course_id and material_id=p_material_id;
  insert into public.canvas_preparation_discoveries(user_id,course_id,material_id,cycle_key,available_at,reason_code,state)
    values(p_user_id,p_course_id,p_material_id,p_cycle_key,now()+make_interval(secs=>greatest(300,p_delay_seconds)),
      'source_discovery_unavailable',case when attempts>=3 then 'failed' else 'pending' end)
    on conflict(user_id,course_id,material_id) do update set cycle_key=excluded.cycle_key,available_at=excluded.available_at,reason_code=excluded.reason_code,state=excluded.state;
end $$;
revoke all on function public.record_canvas_preparation_discovery_failure_v1(uuid,uuid,text,text,integer) from public,anon,authenticated;
grant execute on function public.record_canvas_preparation_discovery_failure_v1(uuid,uuid,text,text,integer) to service_role;

-- The fencing token is service-only, even though mutations also require service grants.
revoke select on public.canvas_material_preparations from authenticated;
grant select(id,user_id,course_id,canvas_connection_id,material_id,source_type,revision_fingerprint,state,
  cycle_key,cycle_attempts,lifetime_attempts,deadline_at,available_at,reason_code,original_sha256,
  original_byte_size,result_id,created_at,updated_at) on public.canvas_material_preparations to authenticated;

create function public.register_canvas_preparation_sync_v1(p_user_id uuid,p_course_id uuid,p_sync_id uuid,p_cycle_key text,p_job_ids uuid[])
returns uuid language plpgsql security invoker set search_path=public,pg_temp as $$
declare s uuid; j uuid; added integer:=0; inserted integer;
begin
  if cardinality(p_job_ids)>20000 or not exists(select 1 from public.canvas_courses where id=p_course_id and user_id=p_user_id)
    or (p_sync_id is not null and not exists(select 1 from public.canvas_sync_jobs where id=p_sync_id and user_id=p_user_id and course_id=p_course_id and status='succeeded')) then return null; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_user_id::text||':'||p_course_id::text||':preparation-sync',0));
  insert into public.canvas_preparation_syncs(user_id,course_id,sync_id,cycle_key) values(p_user_id,p_course_id,p_sync_id,p_cycle_key)
    on conflict(user_id,course_id,cycle_key) do nothing;
  select id into s from public.canvas_preparation_syncs where user_id=p_user_id and course_id=p_course_id and cycle_key=p_cycle_key;
  foreach j in array p_job_ids loop
    if not exists(select 1 from public.canvas_material_preparations where id=j and user_id=p_user_id and course_id=p_course_id) then raise exception 'preparation_owned_job_required'; end if;
    insert into public.canvas_preparation_sync_items(sync_id,job_id) values(s,j) on conflict do nothing;
    get diagnostics inserted=row_count; added=added+inserted;
  end loop;
  if added>0 then
    update public.canvas_preparation_syncs set batch_evaluated=case when guard_state='completed' then true else batch_evaluated end,
      guard_state=case when guard_state='completed' then 'running' else guard_state end where id=s;
  end if;
  return s;
end $$;

create function public.advance_canvas_preparation_sync_v1(p_sync_id uuid)
returns setof public.canvas_material_preparations language plpgsql security invoker set search_path=public,pg_temp as $$
declare s public.canvas_preparation_syncs; n integer; prepared integer; failed integer; waiting integer; deferred integer;
begin
  select * into s from public.canvas_preparation_syncs where id=p_sync_id for update;
  if not found or s.guard_state not in ('running','deferred') then return; end if;
  if not s.inventory_complete then return; end if;
  -- A bounded job deadline makes an abandoned worker observable on completion/poll.
  update public.canvas_preparation_sync_items i set outcome='stalled'
    from public.canvas_material_preparations j where i.sync_id=s.id and i.job_id=j.id and i.batch_index is not null and i.outcome is null
      and j.state in ('pending','running') and j.deadline_at<=now();
  update public.canvas_material_preparations j set state='failed',reason_code='preparation_deadline_exceeded',lease_token=null,updated_at=now()
    where exists(select 1 from public.canvas_preparation_sync_items i where i.sync_id=s.id and i.job_id=j.id and i.outcome='stalled') and j.state in ('pending','running');
  update public.canvas_preparation_sync_items i set outcome=j.state
    from public.canvas_material_preparations j where i.sync_id=s.id and i.job_id=j.id and i.batch_index is not null and i.outcome is null
      and j.state in ('prepared','failed','cancelled');
  select count(*) filter(where outcome='prepared'),count(*) filter(where outcome='failed'),
    count(*) filter(where batch_index is not null and outcome is null),count(*) filter(where batch_index is null and drained_to_sync is null)
    into prepared,failed,waiting,deferred from public.canvas_preparation_sync_items where sync_id=s.id;
  update public.canvas_preparation_syncs set prepared_total=prepared,failed_total=failed,deferred_count=deferred,updated_at=now() where id=s.id;
  if waiting>0 then
    -- Reconnect every current batch receipt; dispatch is idempotent and awaited.
    return query select j.* from public.canvas_preparation_sync_items i join public.canvas_material_preparations j on j.id=i.job_id
      where i.sync_id=s.id and i.batch_index=s.batch_index and i.outcome is null and j.state='pending' order by j.id;
    return;
  end if;
  if s.enqueued_count>0 and not s.batch_evaluated and prepared+failed<=s.last_terminal_total and s.guard_state='running' then
    update public.canvas_preparation_syncs set guard_state='tripped',signal='no_progress' where id=s.id;
    update public.canvas_material_preparation_controls c set suppressed=true where exists(
      select 1 from public.canvas_preparation_sync_items i join public.canvas_material_preparations j on j.id=i.job_id
      where i.sync_id=s.id and i.batch_index=s.batch_index and j.user_id=c.user_id and j.course_id=c.course_id and j.material_id=c.material_id);
    return;
  end if;
  if s.enqueued_count>=200 or deferred=0 then
    update public.canvas_preparation_syncs set guard_state=case when deferred>0 then 'deferred' else 'completed' end,
      last_terminal_total=prepared+failed,batch_evaluated=true where id=s.id;
    return;
  end if;
  update public.canvas_preparation_sync_items set batch_index=s.batch_index+1 where sync_id=s.id and job_id in (
    select job_id from public.canvas_preparation_sync_items where sync_id=s.id and batch_index is null and drained_to_sync is null
    order by job_id limit least(25,200-s.enqueued_count));
  get diagnostics n=row_count;
  update public.canvas_preparation_syncs set enqueued_count=enqueued_count+n,batch_index=batch_index+1,
    last_terminal_total=prepared+failed,deferred_count=deferred-n,guard_state='running',batch_evaluated=false,updated_at=now() where id=s.id;
  return query select j.* from public.canvas_preparation_sync_items i join public.canvas_material_preparations j on j.id=i.job_id
    where i.sync_id=s.id and i.batch_index=s.batch_index+1 and i.outcome is null order by j.id;
end $$;

-- A new intentional enqueue receipt differs from a redelivered existing receipt.
create function public.reenqueue_canvas_preparation_sync_item_v1(p_sync_id uuid,p_job_id uuid,p_receipt_id uuid)
returns boolean language plpgsql security invoker set search_path=public,pg_temp as $$
declare i public.canvas_preparation_sync_items; j public.canvas_material_preparations;
begin
  perform 1 from public.canvas_preparation_syncs where id=p_sync_id for update;
  select * into i from public.canvas_preparation_sync_items where sync_id=p_sync_id and job_id=p_job_id;
  if not found then return false; end if;
  if i.receipt_id=p_receipt_id then return true; end if;
  if i.outcome in ('prepared','failed') then
    select * into j from public.canvas_material_preparations where id=p_job_id;
    update public.canvas_preparation_syncs set guard_state='tripped',signal='repeat',updated_at=now() where id=p_sync_id;
    update public.canvas_material_preparation_controls set suppressed=true where user_id=j.user_id and course_id=j.course_id and material_id=j.material_id;
    return false;
  end if;
  return true;
end $$;

create function public.drain_canvas_preparation_sync_v1(p_sync_id uuid,p_cycle_key text)
returns uuid language plpgsql security invoker set search_path=public,pg_temp as $$
declare s public.canvas_preparation_syncs; target uuid;
begin
  select * into s from public.canvas_preparation_syncs where id=p_sync_id for update;
  if not found or s.guard_state<>'deferred' then return null; end if;
  target=public.register_canvas_preparation_sync_v1(s.user_id,s.course_id,null,p_cycle_key,array[]::uuid[]);
  insert into public.canvas_preparation_sync_items(sync_id,job_id)
    select target,i.job_id from public.canvas_preparation_sync_items i join public.canvas_material_preparations j on j.id=i.job_id
    join public.canvas_material_preparation_controls c on c.user_id=j.user_id and c.course_id=j.course_id and c.material_id=j.material_id
    where i.sync_id=s.id and i.batch_index is null and i.drained_to_sync is null and not c.suppressed
    on conflict do nothing;
  update public.canvas_preparation_syncs set batch_evaluated=case when guard_state='completed' then true else batch_evaluated end,
    guard_state=case when guard_state='completed' then 'running' else guard_state end where id=target;
  update public.canvas_preparation_sync_items set drained_to_sync=target where sync_id=s.id and batch_index is null and drained_to_sync is null;
  update public.canvas_preparation_syncs set deferred_count=0,guard_state='completed',updated_at=now() where id=s.id;
  return target;
end $$;

revoke all on function public.register_canvas_preparation_sync_v1(uuid,uuid,uuid,text,uuid[]),
  public.advance_canvas_preparation_sync_v1(uuid),public.reenqueue_canvas_preparation_sync_item_v1(uuid,uuid,uuid),
  public.drain_canvas_preparation_sync_v1(uuid,text) from public,anon,authenticated;
grant execute on function public.register_canvas_preparation_sync_v1(uuid,uuid,uuid,text,uuid[]),
  public.advance_canvas_preparation_sync_v1(uuid),public.reenqueue_canvas_preparation_sync_item_v1(uuid,uuid,uuid),
  public.drain_canvas_preparation_sync_v1(uuid,text) to service_role;

-- A component is reusable across Page/standalone consumers only at its exact
-- owned current original/revision. The parent Page's text is never returned here.
create function public.read_canvas_prepared_file_component_v1(p_user_id uuid,p_course_id uuid,p_file_id uuid,p_revision text)
returns jsonb language sql stable security invoker set search_path=public,pg_temp as $$
  select component from public.canvas_material_preparation_results r
    join public.canvas_material_preparations j on j.id=r.job_id and j.result_id=r.id,
    jsonb_array_elements(r.payload->'components') component,
    public.canvas_files f
  where j.user_id=p_user_id and j.course_id=p_course_id and j.state='prepared'
    and f.id=p_file_id and f.user_id=p_user_id and f.course_id=p_course_id and f.availability_status='available'
    and f.content_version_fingerprint=p_revision and f.ingestion_status in ('stored','unchanged')
    and component->>'type'='file' and component->>'id'=p_file_id::text and component->>'revision'=p_revision
    and component->>'originalSha256'=f.current_sha256
  order by r.created_at desc,r.id limit 1;
$$;
revoke all on function public.read_canvas_prepared_file_component_v1(uuid,uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.read_canvas_prepared_file_component_v1(uuid,uuid,uuid,text) to service_role;

create function public.invalidate_canvas_preparation_binding_v1(p_job_id uuid,p_user_id uuid)
returns void language plpgsql security invoker set search_path=public,pg_temp as $$
begin
  update public.canvas_material_preparations j set state='cancelled',reason_code='source_revision_changed',updated_at=now()
    where j.id=p_job_id and j.user_id=p_user_id and j.state='prepared' and exists(
      select 1 from public.canvas_material_preparation_results r,jsonb_array_elements(r.payload->'components') component
      left join public.canvas_files f on f.id=(component->>'id')::uuid and f.user_id=p_user_id and f.course_id=j.course_id
      where r.id=j.result_id and component->>'type'='file' and (f.id is null or f.ingestion_status not in ('stored','unchanged') or f.current_sha256 is distinct from component->>'originalSha256'));
end $$;
revoke all on function public.invalidate_canvas_preparation_binding_v1(uuid,uuid) from public,anon,authenticated;
grant execute on function public.invalidate_canvas_preparation_binding_v1(uuid,uuid) to service_role;
create or replace function public.claim_canvas_material_preparation_v1(p_job_id uuid,p_dispatch_id uuid,p_worker_id text,p_lease_token uuid)
returns setof public.canvas_material_preparations language plpgsql security invoker set search_path=public,pg_temp as $$
declare j public.canvas_material_preparations; ctrl public.canvas_material_preparation_controls;
begin
  select * into j from public.canvas_material_preparations where id=p_job_id;
  if not found then return; end if;
  perform pg_advisory_xact_lock(hashtextextended(j.user_id::text || ':' || j.course_id::text || ':' || j.material_id,0));
  select * into j from public.canvas_material_preparations where id=p_job_id for update;
  if not found or j.dispatch_id<>p_dispatch_id or j.state not in ('pending','running') or j.available_at>now()
    or (j.state='running' and j.lease_expires_at>now()) then return; end if;
  if j.deadline_at<=now() then
    update public.canvas_preparation_sync_items set outcome='stalled' where job_id=j.id and batch_index is not null and outcome is null;
    update public.canvas_material_preparations set state='failed',reason_code='preparation_deadline_exceeded',lease_token=null,updated_at=now() where id=j.id;
    return;
  end if;
  select * into ctrl from public.canvas_material_preparation_controls where user_id=j.user_id and course_id=j.course_id and material_id=j.material_id for update;
  if ctrl.suppressed or ctrl.automatic_attempts>=3 or j.cycle_attempts>=2 then
    update public.canvas_material_preparations set state='failed',reason_code='preparation_attempts_exhausted',updated_at=now() where id=j.id;
    return;
  end if;
  update public.canvas_material_preparation_controls set automatic_attempts=automatic_attempts+1
    where user_id=j.user_id and course_id=j.course_id and material_id=j.material_id;
  update public.canvas_material_preparations set state='running',cycle_attempts=cycle_attempts+1,lifetime_attempts=lifetime_attempts+1,
    worker_id=p_worker_id,lease_token=p_lease_token,deadline_at=now()+interval '25 minutes',lease_expires_at=now()+interval '90 seconds',updated_at=now()
    where id=j.id returning * into j;
  return next j;
end $$;


create or replace function public.finish_canvas_material_preparation_v1(p_job_id uuid,p_lease_token uuid,p_payload jsonb,p_reason text,p_retryable boolean,p_retry_after_seconds integer default 0)
returns boolean language plpgsql security invoker set search_path=public,pg_temp as $$
declare j public.canvas_material_preparations; ev jsonb; r uuid; e jsonb; component jsonb; f public.canvas_files; attempts integer;
begin
  select * into j from public.canvas_material_preparations where id=p_job_id for update;
  if not found or j.state<>'running' or j.lease_token<>p_lease_token or j.lease_expires_at<=now() or j.deadline_at<=now() then return false; end if;
  if p_reason is not null then
    select automatic_attempts into attempts from public.canvas_material_preparation_controls where user_id=j.user_id and course_id=j.course_id and material_id=j.material_id;
    update public.canvas_material_preparations set state=case when p_retryable and cycle_attempts<2 and attempts<3 then 'pending' else 'failed' end,
      available_at=now()+make_interval(secs=>greatest(0,p_retry_after_seconds)),
      deadline_at=greatest(deadline_at,now()+make_interval(secs=>greatest(0,p_retry_after_seconds))+interval '25 minutes'),
      dispatch_id=gen_random_uuid(),dispatched_at=null,
      reason_code=p_reason,worker_id=null,lease_token=null,lease_expires_at=null,updated_at=now() where id=j.id;
    return true;
  end if;
  select evidence into ev from public.canvas_material_preparation_evidence where job_id=j.id;
  if p_payload is null or p_payload->'version' is distinct from '1'::jsonb or jsonb_typeof(p_payload->'components') is distinct from 'array' or jsonb_array_length(p_payload->'components')<>jsonb_array_length(ev)
    or not public.canvas_preparation_evidence_current_v1(j.user_id,j.course_id,ev) then
    update public.canvas_material_preparations set state='cancelled',reason_code='source_revision_changed',lease_token=null,updated_at=now() where id=j.id;
    return false;
  end if;
  for e in select value from jsonb_array_elements(ev) loop
    select value into component from jsonb_array_elements(p_payload->'components') where value->>'id'=e->>'id' and value->>'type'=e->>'type';
    if component is null or component->>'revision' is distinct from e->>'revision' or jsonb_typeof(component->'blocks') is distinct from 'array' then return false; end if;
    if e->>'type'='file' then
      select * into f from public.canvas_files where id=(e->>'id')::uuid and user_id=j.user_id and course_id=j.course_id for share;
      if f.ingestion_status not in ('stored','unchanged') or f.current_sha256 is distinct from component->>'originalSha256' then return false; end if;
    end if;
  end loop;
  insert into public.canvas_material_preparation_results(job_id,payload) values(j.id,p_payload) on conflict(job_id) do nothing returning id into r;
  if r is null then
    select id into r from public.canvas_material_preparation_results where job_id=j.id and payload=p_payload;
    if not found then
      update public.canvas_material_preparations set state='failed',reason_code='source_revision_ambiguous',lease_token=null,updated_at=now() where id=j.id;
      return false;
    end if;
  end if;
  update public.canvas_material_preparations set state='prepared',result_id=r,reason_code=null,lease_token=null,lease_expires_at=null,
    original_sha256=case when j.source_type='file' then p_payload->'components'->0->>'originalSha256' end,
    original_byte_size=case when j.source_type='file' then (p_payload->'components'->0->>'originalByteSize')::bigint end,
    updated_at=now() where id=j.id;
  return true;
end $$;
