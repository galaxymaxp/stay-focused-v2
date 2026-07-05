do $$
begin
  if exists (
    select 1
    from public.canvas_capabilities capability
    join public.canvas_connections connection
      on connection.id = capability.canvas_connection_id
    where connection.user_id <> capability.user_id
  ) then
    raise exception 'Existing Canvas capability ownership mismatch prevents migration.';
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'canvas_connections_id_user_unique'
      and conrelid = 'public.canvas_connections'::regclass
  ) then
    alter table public.canvas_connections
      add constraint canvas_connections_id_user_unique unique (id, user_id);
  end if;
end;
$$;

alter table public.canvas_capabilities
  drop constraint if exists canvas_capabilities_canvas_connection_id_fkey;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'canvas_capabilities_connection_user_fkey'
      and conrelid = 'public.canvas_capabilities'::regclass
  ) then
    alter table public.canvas_capabilities
      add constraint canvas_capabilities_connection_user_fkey
      foreign key (canvas_connection_id, user_id)
      references public.canvas_connections (id, user_id)
      on delete cascade
      not valid;
  end if;
end;
$$;

alter table public.canvas_capabilities
  validate constraint canvas_capabilities_connection_user_fkey;

create or replace function public.replace_canvas_connection_with_capabilities(
  p_user_id uuid,
  p_base_url text,
  p_canvas_user_id text,
  p_canvas_user_name text,
  p_canvas_user_email text,
  p_token_ciphertext text,
  p_token_iv text,
  p_token_auth_tag text,
  p_encryption_version text,
  p_last_verified_at timestamptz,
  p_capabilities jsonb
)
returns table (
  id uuid,
  user_id uuid,
  base_url text,
  canvas_user_id text,
  canvas_user_name text,
  canvas_user_email text,
  status text,
  last_verified_at timestamptz,
  last_error_code text,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_connection public.canvas_connections%rowtype;
begin
  if p_user_id is null then
    raise exception 'Canvas connection user is required.';
  end if;

  if jsonb_typeof(p_capabilities) is distinct from 'array'
    or jsonb_array_length(p_capabilities) = 0 then
    raise exception 'Canvas capability snapshot is required.';
  end if;

  insert into public.canvas_connections (
    user_id,
    base_url,
    canvas_user_id,
    canvas_user_name,
    canvas_user_email,
    token_ciphertext,
    token_iv,
    token_auth_tag,
    encryption_version,
    status,
    last_verified_at,
    last_error_code
  )
  values (
    p_user_id,
    p_base_url,
    p_canvas_user_id,
    p_canvas_user_name,
    p_canvas_user_email,
    p_token_ciphertext,
    p_token_iv,
    p_token_auth_tag,
    p_encryption_version,
    'active',
    p_last_verified_at,
    null
  )
  on conflict (user_id) do update set
    base_url = excluded.base_url,
    canvas_user_id = excluded.canvas_user_id,
    canvas_user_name = excluded.canvas_user_name,
    canvas_user_email = excluded.canvas_user_email,
    token_ciphertext = excluded.token_ciphertext,
    token_iv = excluded.token_iv,
    token_auth_tag = excluded.token_auth_tag,
    encryption_version = excluded.encryption_version,
    status = excluded.status,
    last_verified_at = excluded.last_verified_at,
    last_error_code = excluded.last_error_code
  returning *
  into v_connection;

  delete from public.canvas_capabilities
  where canvas_connection_id = v_connection.id
    and user_id = p_user_id;

  insert into public.canvas_capabilities (
    user_id,
    canvas_connection_id,
    capability,
    status,
    tested_at,
    safe_error_code,
    course_id,
    integration_version
  )
  select
    p_user_id,
    v_connection.id,
    capability.capability,
    capability.status,
    capability.tested_at,
    capability.safe_error_code,
    capability.course_id,
    capability.integration_version
  from jsonb_to_recordset(p_capabilities) as capability(
    capability text,
    status text,
    tested_at timestamptz,
    safe_error_code text,
    course_id text,
    integration_version text
  );

  return query
  select
    v_connection.id,
    v_connection.user_id,
    v_connection.base_url,
    v_connection.canvas_user_id,
    v_connection.canvas_user_name,
    v_connection.canvas_user_email,
    v_connection.status,
    v_connection.last_verified_at,
    v_connection.last_error_code,
    v_connection.created_at,
    v_connection.updated_at;
end;
$$;

revoke all on function public.replace_canvas_connection_with_capabilities(
  uuid,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  timestamptz,
  jsonb
) from public;
revoke all on function public.replace_canvas_connection_with_capabilities(
  uuid,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  timestamptz,
  jsonb
) from anon;
revoke all on function public.replace_canvas_connection_with_capabilities(
  uuid,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  timestamptz,
  jsonb
) from authenticated;
grant execute on function public.replace_canvas_connection_with_capabilities(
  uuid,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  timestamptz,
  jsonb
) to service_role;

alter table public.canvas_connections enable row level security;
alter table public.canvas_capabilities enable row level security;

revoke all on table public.canvas_connections from anon;
revoke all on table public.canvas_connections from authenticated;
revoke all on table public.canvas_capabilities from anon;
revoke all on table public.canvas_capabilities from authenticated;
