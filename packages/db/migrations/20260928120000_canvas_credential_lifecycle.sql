-- Keep the stable connection/owner identity and every dependent academic row.
alter table public.canvas_connections
  alter column token_ciphertext drop not null,
  alter column token_iv drop not null,
  alter column token_auth_tag drop not null,
  alter column encryption_version drop not null;
alter table public.canvas_connections drop constraint canvas_connections_status_check;
alter table public.canvas_connections add constraint canvas_connections_status_check
  check (status in ('active', 'reconnect_required', 'disconnected'));
alter table public.canvas_connections add constraint canvas_connections_credentials_match_status
  check (
    (status = 'disconnected' and token_ciphertext is null and token_iv is null
      and token_auth_tag is null and encryption_version is null)
    or (status in ('active', 'reconnect_required') and token_ciphertext is not null
      and token_iv is not null and token_auth_tag is not null and encryption_version is not null)
  );

create function public.guard_canvas_connection_identity_v1()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  if new.id is distinct from old.id or new.user_id is distinct from old.user_id
    or new.base_url is distinct from old.base_url
    or new.canvas_user_id is distinct from old.canvas_user_id then
    raise exception 'canvas_account_change_requires_separate_import';
  end if;
  return new;
end;
$$;
create trigger canvas_connection_identity_immutable
  before update on public.canvas_connections for each row
  execute function public.guard_canvas_connection_identity_v1();

create function public.stop_inactive_canvas_sync_v1()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_job record;
begin
  if new.status <> 'active' and old.status = 'active' then
    for v_job in select id from public.canvas_sync_jobs
      where user_id = new.user_id and canvas_connection_id = new.id
        and status in ('queued', 'running')
    loop
      perform public.request_canvas_sync_job_cancellation_v1(new.user_id, v_job.id);
    end loop;
  end if;
  return new;
end;
$$;
create trigger canvas_connection_stop_sync
  after update of status on public.canvas_connections for each row
  execute function public.stop_inactive_canvas_sync_v1();

-- Lock the connection while accepting/retrying a job; reject inactive credentials.
create function public.guard_canvas_sync_active_connection_v1()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_status text;
begin
  if new.status in ('queued', 'running', 'succeeded') then
    select status into v_status from public.canvas_connections
      where id = new.canvas_connection_id and user_id = new.user_id for share;
    if v_status is distinct from 'active' then
      raise exception 'canvas_reconnect_required';
    end if;
  end if;
  return new;
end;
$$;
create trigger canvas_sync_active_connection
  before insert or update of status on public.canvas_sync_jobs for each row
  execute function public.guard_canvas_sync_active_connection_v1();

-- A request already in flight must not promote/prune a snapshot after disconnect.
-- The share lock serializes each academic write with credential state changes.
-- Account deletion can still cascade after the parent connection is removed.
create function public.guard_canvas_academic_sync_v1()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_status text; v_connection_id uuid; v_user_id uuid;
begin
  if tg_op = 'DELETE' then
    v_connection_id := old.canvas_connection_id; v_user_id := old.user_id;
  else
    v_connection_id := new.canvas_connection_id; v_user_id := new.user_id;
  end if;
  select status into v_status from public.canvas_connections
    where id = v_connection_id and user_id = v_user_id for share;
  if found and v_status <> 'active' then raise exception 'canvas_reconnect_required'; end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;
do $$
declare v_table text;
begin
  foreach v_table in array array['canvas_courses','canvas_modules','canvas_module_items',
    'canvas_pages','canvas_assignments','canvas_assignment_groups','canvas_announcements',
    'canvas_files','canvas_file_references','canvas_planner_items']
  loop
    execute format('create trigger canvas_academic_sync_requires_active before insert or update or delete on public.%I for each row execute function public.guard_canvas_academic_sync_v1()', v_table);
  end loop;
end;
$$;

create function public.disconnect_canvas_connection_v1(p_user_id uuid)
returns void language sql security definer set search_path = '' as $$
  update public.canvas_connections set status = 'disconnected',
    token_ciphertext = null, token_iv = null, token_auth_tag = null,
    encryption_version = null, last_error_code = null
  where user_id = p_user_id;
$$;

-- An old request must not invalidate a newly replaced token.
create function public.mark_canvas_reconnect_required_v1(
  p_user_id uuid, p_connection_id uuid, p_expected_updated_at timestamptz
)
returns void language sql security definer set search_path = '' as $$
  update public.canvas_connections set status = 'reconnect_required',
    last_error_code = 'canvas_authentication_failed'
  where id = p_connection_id and user_id = p_user_id and status = 'active'
    and updated_at = p_expected_updated_at;
$$;

revoke all on function public.guard_canvas_connection_identity_v1() from public, anon, authenticated;
revoke all on function public.stop_inactive_canvas_sync_v1() from public, anon, authenticated;
revoke all on function public.guard_canvas_sync_active_connection_v1() from public, anon, authenticated;
revoke all on function public.guard_canvas_academic_sync_v1() from public, anon, authenticated;
revoke all on function public.disconnect_canvas_connection_v1(uuid) from public, anon, authenticated;
revoke all on function public.mark_canvas_reconnect_required_v1(uuid, uuid, timestamptz) from public, anon, authenticated;
grant execute on function public.disconnect_canvas_connection_v1(uuid) to service_role;
grant execute on function public.mark_canvas_reconnect_required_v1(uuid, uuid, timestamptz) to service_role;
