create table if not exists public.canvas_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  base_url text not null,
  canvas_user_id text not null,
  canvas_user_name text not null,
  canvas_user_email text,
  token_ciphertext text not null,
  token_iv text not null,
  token_auth_tag text not null,
  encryption_version text not null,
  status text not null default 'active',
  last_verified_at timestamptz not null,
  last_error_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint canvas_connections_user_unique unique (user_id),
  constraint canvas_connections_base_url_not_blank check (char_length(btrim(base_url)) > 0),
  constraint canvas_connections_canvas_user_id_not_blank check (char_length(btrim(canvas_user_id)) > 0),
  constraint canvas_connections_canvas_user_name_not_blank check (char_length(btrim(canvas_user_name)) > 0),
  constraint canvas_connections_status_check check (status in ('active')),
  constraint canvas_connections_encryption_version_not_blank check (char_length(btrim(encryption_version)) > 0)
);

create index if not exists canvas_connections_user_updated_idx
  on public.canvas_connections (user_id, updated_at desc);

create table if not exists public.canvas_capabilities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  canvas_connection_id uuid not null references public.canvas_connections(id) on delete cascade,
  capability text not null,
  status text not null,
  tested_at timestamptz,
  safe_error_code text,
  course_id text,
  integration_version text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint canvas_capabilities_capability_not_blank check (char_length(btrim(capability)) > 0),
  constraint canvas_capabilities_status_check check (
    status in (
      'available',
      'permission_denied',
      'not_enabled',
      'not_supported',
      'temporarily_failed',
      'not_tested'
    )
  ),
  constraint canvas_capabilities_safe_error_code_length check (
    safe_error_code is null or char_length(safe_error_code) <= 80
  ),
  constraint canvas_capabilities_course_id_length check (
    course_id is null or char_length(course_id) <= 120
  )
);

create index if not exists canvas_capabilities_user_idx
  on public.canvas_capabilities (user_id, canvas_connection_id, capability);

create unique index if not exists canvas_capabilities_connection_capability_global_idx
  on public.canvas_capabilities (canvas_connection_id, capability)
  where course_id is null;

create unique index if not exists canvas_capabilities_connection_capability_course_idx
  on public.canvas_capabilities (canvas_connection_id, capability, course_id)
  where course_id is not null;

create or replace function public.set_canvas_connections_updated_at()
returns trigger
language plpgsql
security invoker
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.set_canvas_capabilities_updated_at()
returns trigger
language plpgsql
security invoker
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists canvas_connections_set_updated_at on public.canvas_connections;
create trigger canvas_connections_set_updated_at
before update on public.canvas_connections
for each row
execute function public.set_canvas_connections_updated_at();

drop trigger if exists canvas_capabilities_set_updated_at on public.canvas_capabilities;
create trigger canvas_capabilities_set_updated_at
before update on public.canvas_capabilities
for each row
execute function public.set_canvas_capabilities_updated_at();

alter table public.canvas_connections enable row level security;
alter table public.canvas_capabilities enable row level security;

revoke all on table public.canvas_connections from anon;
revoke all on table public.canvas_connections from authenticated;
revoke all on table public.canvas_capabilities from anon;
revoke all on table public.canvas_capabilities from authenticated;
