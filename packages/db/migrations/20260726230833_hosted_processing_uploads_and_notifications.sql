create table public.processing_upload_intents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending',
  source_kind text not null,
  display_name text not null,
  mime_type text not null,
  expected_byte_size bigint not null,
  storage_bucket text not null,
  storage_object_path text not null,
  job_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  expires_at timestamptz not null,
  accepted_at timestamptz,
  constraint processing_upload_intents_status_check
    check (status in ('pending', 'accepted', 'expired')),
  constraint processing_upload_intents_source_kind_check
    check (source_kind in ('pdf', 'image')),
  constraint processing_upload_intents_mime_type_check
    check (mime_type in ('application/pdf', 'image/png', 'image/jpeg')),
  constraint processing_upload_intents_byte_size_check
    check (expected_byte_size between 1 and 10485760),
  constraint processing_upload_intents_display_name_check
    check (char_length(display_name) between 1 and 180),
  constraint processing_upload_intents_storage_path_unique unique (storage_bucket, storage_object_path),
  constraint processing_upload_intents_id_user_unique unique (id, user_id)
);

alter table public.processing_upload_intents
  add constraint processing_upload_intents_job_owner_fkey
  foreign key (job_id, user_id)
  references public.processing_jobs(id, user_id)
  on delete set null (job_id);

create index processing_upload_intents_owner_status_idx
  on public.processing_upload_intents (user_id, status, created_at desc);
create index processing_upload_intents_expiry_idx
  on public.processing_upload_intents (expires_at)
  where status = 'pending';
create index processing_upload_intents_job_owner_idx
  on public.processing_upload_intents (job_id, user_id);

alter table public.processing_upload_intents enable row level security;
revoke all on table public.processing_upload_intents from anon, authenticated;
grant select, insert, update, delete
  on table public.processing_upload_intents to service_role;

create table public.push_notification_devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  installation_id uuid not null,
  expo_push_token text not null,
  platform text not null,
  project_id text not null,
  permission_status text not null,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_registered_at timestamptz not null default now(),
  invalidated_at timestamptz,
  constraint push_notification_devices_owner_installation_unique
    unique (user_id, installation_id),
  constraint push_notification_devices_token_unique unique (expo_push_token),
  constraint push_notification_devices_id_user_unique unique (id, user_id),
  constraint push_notification_devices_platform_check
    check (platform in ('ios', 'android')),
  constraint push_notification_devices_permission_check
    check (permission_status in ('granted', 'denied', 'undetermined')),
  constraint push_notification_devices_project_check
    check (char_length(project_id) between 1 and 100),
  constraint push_notification_devices_token_check
    check (char_length(expo_push_token) between 20 and 300)
);

create index push_notification_devices_owner_enabled_idx
  on public.push_notification_devices (user_id, enabled, updated_at desc);

alter table public.push_notification_devices enable row level security;
revoke all on table public.push_notification_devices from anon, authenticated;
grant select, insert, update, delete
  on table public.push_notification_devices to service_role;

create table public.processing_notification_deliveries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  processing_event_id uuid references public.processing_job_events(id) on delete cascade,
  device_id uuid not null,
  delivery_key text not null unique,
  notification_kind text not null,
  status text not null default 'queued',
  attempt_count integer not null default 0,
  next_attempt_at timestamptz not null default now(),
  lease_owner text,
  lease_expires_at timestamptz,
  expo_ticket_id text,
  receipt_due_at timestamptz,
  safe_error_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  sent_at timestamptz,
  delivered_at timestamptz,
  failed_at timestamptz,
  constraint processing_notification_deliveries_device_owner_fkey
    foreign key (device_id, user_id)
    references public.push_notification_devices(id, user_id)
    on delete cascade,
  constraint processing_notification_deliveries_kind_check
    check (notification_kind in (
      'test',
      'extraction_ready',
      'reviewer_ready',
      'processing_needs_attention'
    )),
  constraint processing_notification_deliveries_status_check
    check (status in (
      'queued',
      'sending',
      'ticketed',
      'delivered',
      'failed',
      'invalid_device'
    )),
  constraint processing_notification_deliveries_attempt_check
    check (attempt_count between 0 and 10),
  constraint processing_notification_deliveries_key_check
    check (char_length(delivery_key) between 1 and 300)
);

create unique index processing_notification_event_device_unique
  on public.processing_notification_deliveries (processing_event_id, device_id)
  where processing_event_id is not null;
create index processing_notification_claim_idx
  on public.processing_notification_deliveries (next_attempt_at, created_at)
  where status in ('queued', 'sending');
create index processing_notification_receipt_idx
  on public.processing_notification_deliveries (receipt_due_at)
  where status = 'ticketed';

alter table public.processing_notification_deliveries enable row level security;
revoke all on table public.processing_notification_deliveries from anon, authenticated;
grant select, insert, update, delete
  on table public.processing_notification_deliveries to service_role;

create or replace function public.claim_processing_notification_deliveries(
  p_worker_id text,
  p_limit integer default 10,
  p_lease_seconds integer default 60,
  p_now timestamptz default now()
)
returns setof public.processing_notification_deliveries
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_worker_id is null
    or char_length(btrim(p_worker_id)) not between 1 and 200
    or p_limit not between 1 and 100
    or p_lease_seconds not between 15 and 600
  then
    raise exception 'processing_notification_claim_invalid';
  end if;

  return query
  with candidates as (
    select delivery.id
    from public.processing_notification_deliveries delivery
    where (
      delivery.status = 'queued'
      or (
        delivery.status = 'sending'
        and delivery.lease_expires_at <= p_now
      )
    )
      and delivery.next_attempt_at <= p_now
      and delivery.attempt_count < 10
    order by delivery.next_attempt_at, delivery.created_at
    for update skip locked
    limit p_limit
  )
  update public.processing_notification_deliveries delivery
  set status = 'sending',
      attempt_count = delivery.attempt_count + 1,
      lease_owner = btrim(p_worker_id),
      lease_expires_at = p_now + make_interval(secs => p_lease_seconds),
      updated_at = p_now
  from candidates
  where delivery.id = candidates.id
  returning delivery.*;
end;
$$;

create or replace function public.claim_processing_notification_receipts(
  p_worker_id text,
  p_limit integer default 100,
  p_lease_seconds integer default 60,
  p_now timestamptz default now()
)
returns setof public.processing_notification_deliveries
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_worker_id is null
    or char_length(btrim(p_worker_id)) not between 1 and 200
    or p_limit not between 1 and 300
    or p_lease_seconds not between 15 and 600
  then
    raise exception 'processing_notification_receipt_claim_invalid';
  end if;

  return query
  with candidates as (
    select delivery.id
    from public.processing_notification_deliveries delivery
    where delivery.status = 'ticketed'
      and delivery.receipt_due_at <= p_now
      and (
        delivery.lease_expires_at is null
        or delivery.lease_expires_at <= p_now
      )
    order by delivery.receipt_due_at
    for update skip locked
    limit p_limit
  )
  update public.processing_notification_deliveries delivery
  set lease_owner = btrim(p_worker_id),
      lease_expires_at = p_now + make_interval(secs => p_lease_seconds),
      updated_at = p_now
  from candidates
  where delivery.id = candidates.id
  returning delivery.*;
end;
$$;

revoke all on function public.claim_processing_notification_deliveries(
  text, integer, integer, timestamptz
) from public, anon, authenticated;
grant execute on function public.claim_processing_notification_deliveries(
  text, integer, integer, timestamptz
) to service_role;

revoke all on function public.claim_processing_notification_receipts(
  text, integer, integer, timestamptz
) from public, anon, authenticated;
grant execute on function public.claim_processing_notification_receipts(
  text, integer, integer, timestamptz
) to service_role;
