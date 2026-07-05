create table if not exists public.canvas_sync_course_results (
  id uuid primary key default gen_random_uuid(),
  sync_run_id uuid not null
    references public.canvas_sync_runs (id)
    on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  canvas_connection_id uuid not null,
  course_fingerprint text not null,
  status text not null,
  failure_code text,
  failed_operation text,
  failure_category text,
  http_status_class text,
  retryable boolean,
  retry_count integer not null default 0,
  duration_ms integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint canvas_sync_course_results_connection_user_fkey
    foreign key (canvas_connection_id, user_id)
    references public.canvas_connections (id, user_id)
    on delete cascade,
  constraint canvas_sync_course_results_run_fingerprint_key
    unique (sync_run_id, course_fingerprint),
  constraint canvas_sync_course_results_status_allowed
    check (status in ('succeeded', 'failed')),
  constraint canvas_sync_course_results_fingerprint_not_blank
    check (
      char_length(btrim(course_fingerprint)) > 0
      and char_length(course_fingerprint) <= 128
    ),
  constraint canvas_sync_course_results_failure_code_allowed
    check (
      failure_code is null
      or failure_code in (
        'canvas_course_fetch_failed',
        'canvas_course_modules_failed',
        'canvas_course_module_items_failed',
        'canvas_course_pages_failed',
        'canvas_course_page_detail_failed',
        'canvas_course_assignment_groups_failed',
        'canvas_course_assignments_failed',
        'canvas_course_response_invalid',
        'canvas_course_persistence_failed',
        'canvas_course_persist_failed',
        'canvas_sync_normalization_failed'
      )
    ),
  constraint canvas_sync_course_results_operation_allowed
    check (
      failed_operation is null
      or failed_operation in (
        'modules',
        'module_items',
        'pages',
        'page_detail',
        'assignment_groups',
        'assignments',
        'response_parsing',
        'persistence',
        'unknown'
      )
    ),
  constraint canvas_sync_course_results_category_allowed
    check (
      failure_category is null
      or failure_category in (
        'authentication_failure',
        'permission_denied',
        'resource_not_found',
        'rate_limited',
        'server_error',
        'network_error',
        'timeout',
        'malformed_response',
        'pagination_rejected',
        'redirect_rejected',
        'persistence_failure',
        'normalization_failure',
        'unknown'
      )
    ),
  constraint canvas_sync_course_results_http_status_class_allowed
    check (
      http_status_class is null
      or http_status_class in ('none', '1xx', '2xx', '3xx', '4xx', '5xx')
    ),
  constraint canvas_sync_course_results_retry_count_non_negative
    check (retry_count >= 0),
  constraint canvas_sync_course_results_duration_non_negative
    check (duration_ms >= 0),
  constraint canvas_sync_course_results_status_failure_consistency
    check (
      (
        status = 'succeeded'
        and failure_code is null
        and failed_operation is null
        and failure_category is null
        and http_status_class is null
        and retryable is null
      )
      or (
        status = 'failed'
        and failure_code is not null
        and failed_operation is not null
        and failure_category is not null
        and http_status_class is not null
        and retryable is not null
      )
    )
);

create index if not exists canvas_sync_course_results_run_idx
  on public.canvas_sync_course_results (sync_run_id);
create index if not exists canvas_sync_course_results_user_run_idx
  on public.canvas_sync_course_results (user_id, sync_run_id);
create index if not exists canvas_sync_course_results_connection_run_idx
  on public.canvas_sync_course_results (canvas_connection_id, sync_run_id);
create index if not exists canvas_sync_course_results_status_code_idx
  on public.canvas_sync_course_results (status, failure_code);

create or replace function public.set_canvas_sync_course_results_updated_at()
returns trigger
language plpgsql
security invoker
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists canvas_sync_course_results_set_updated_at
  on public.canvas_sync_course_results;
create trigger canvas_sync_course_results_set_updated_at
before update on public.canvas_sync_course_results
for each row
execute function public.set_canvas_sync_course_results_updated_at();

alter table public.canvas_sync_course_results enable row level security;

revoke all on table public.canvas_sync_course_results from anon;
revoke all on table public.canvas_sync_course_results from authenticated;
grant select, insert, update, delete on table public.canvas_sync_course_results
  to service_role;

create or replace function public.record_canvas_sync_course_result(
  p_user_id uuid,
  p_canvas_connection_id uuid,
  p_sync_run_id uuid,
  p_course_fingerprint text,
  p_status text,
  p_failure_code text,
  p_failed_operation text,
  p_failure_category text,
  p_http_status_class text,
  p_retryable boolean,
  p_retry_count integer,
  p_duration_ms integer
)
returns table (
  id uuid,
  sync_run_id uuid,
  user_id uuid,
  canvas_connection_id uuid,
  course_fingerprint text,
  status text,
  failure_code text,
  failed_operation text,
  failure_category text,
  http_status_class text,
  retryable boolean,
  retry_count integer,
  duration_ms integer,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_result public.canvas_sync_course_results%rowtype;
begin
  if p_user_id is null
    or p_canvas_connection_id is null
    or p_sync_run_id is null
    or p_course_fingerprint is null
    or char_length(btrim(p_course_fingerprint)) = 0
  then
    raise exception using errcode = 'P0001', message = 'canvas_sync_course_result_invalid';
  end if;

  if p_retry_count is null
    or p_retry_count < 0
    or p_duration_ms is null
    or p_duration_ms < 0
  then
    raise exception using errcode = 'P0001', message = 'canvas_sync_course_result_invalid';
  end if;

  if not exists (
    select 1
    from public.canvas_sync_runs run
    where run.id = p_sync_run_id
      and run.user_id = p_user_id
      and run.canvas_connection_id = p_canvas_connection_id
  ) then
    raise exception using errcode = 'P0001', message = 'canvas_sync_run_missing';
  end if;

  insert into public.canvas_sync_course_results (
    sync_run_id,
    user_id,
    canvas_connection_id,
    course_fingerprint,
    status,
    failure_code,
    failed_operation,
    failure_category,
    http_status_class,
    retryable,
    retry_count,
    duration_ms
  )
  values (
    p_sync_run_id,
    p_user_id,
    p_canvas_connection_id,
    p_course_fingerprint,
    p_status,
    p_failure_code,
    p_failed_operation,
    p_failure_category,
    p_http_status_class,
    p_retryable,
    p_retry_count,
    p_duration_ms
  )
  on conflict on constraint canvas_sync_course_results_run_fingerprint_key
  do update set
    status = excluded.status,
    failure_code = excluded.failure_code,
    failed_operation = excluded.failed_operation,
    failure_category = excluded.failure_category,
    http_status_class = excluded.http_status_class,
    retryable = excluded.retryable,
    retry_count = excluded.retry_count,
    duration_ms = excluded.duration_ms
  returning *
  into v_result;

  return query
  select
    v_result.id,
    v_result.sync_run_id,
    v_result.user_id,
    v_result.canvas_connection_id,
    v_result.course_fingerprint,
    v_result.status,
    v_result.failure_code,
    v_result.failed_operation,
    v_result.failure_category,
    v_result.http_status_class,
    v_result.retryable,
    v_result.retry_count,
    v_result.duration_ms,
    v_result.created_at,
    v_result.updated_at;
end;
$$;

revoke all on function public.record_canvas_sync_course_result(
  uuid,
  uuid,
  uuid,
  text,
  text,
  text,
  text,
  text,
  text,
  boolean,
  integer,
  integer
) from public;
revoke all on function public.record_canvas_sync_course_result(
  uuid,
  uuid,
  uuid,
  text,
  text,
  text,
  text,
  text,
  text,
  boolean,
  integer,
  integer
) from anon;
revoke all on function public.record_canvas_sync_course_result(
  uuid,
  uuid,
  uuid,
  text,
  text,
  text,
  text,
  text,
  text,
  boolean,
  integer,
  integer
) from authenticated;
grant execute on function public.record_canvas_sync_course_result(
  uuid,
  uuid,
  uuid,
  text,
  text,
  text,
  text,
  text,
  text,
  boolean,
  integer,
  integer
) to service_role;
