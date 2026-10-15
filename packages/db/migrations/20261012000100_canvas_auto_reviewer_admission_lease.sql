-- Serialize automatic admission across courses for the same owner.
create table public.canvas_auto_reviewer_admission_leases (
  user_id uuid primary key references auth.users(id) on delete cascade,
  run_id uuid not null,
  expires_at timestamptz not null
);
alter table public.canvas_auto_reviewer_admission_leases enable row level security;
revoke all on public.canvas_auto_reviewer_admission_leases from public, anon, authenticated;
grant all on public.canvas_auto_reviewer_admission_leases to service_role;

-- Ten minutes bounds abandoned runs. Renewal before each admission also
-- verifies ownership; the normal orchestrator budget remains 90 seconds.
create function public.claim_canvas_auto_reviewer_admission_v1(p_user_id uuid, p_run_id uuid)
returns boolean language sql security invoker set search_path = '' as $$
  with claimed as (
    insert into public.canvas_auto_reviewer_admission_leases as lease(user_id, run_id, expires_at)
    values (p_user_id, p_run_id, now() + interval '10 minutes')
    on conflict (user_id) do update
      set run_id = excluded.run_id, expires_at = excluded.expires_at
      where lease.expires_at <= now() or lease.run_id = excluded.run_id
    returning user_id
  ) select exists(select 1 from claimed);
$$;
create function public.release_canvas_auto_reviewer_admission_v1(p_user_id uuid, p_run_id uuid)
returns void language sql security invoker set search_path = '' as $$
  delete from public.canvas_auto_reviewer_admission_leases where user_id = p_user_id and run_id = p_run_id;
$$;
revoke all on function public.claim_canvas_auto_reviewer_admission_v1(uuid, uuid) from public, anon, authenticated;
revoke all on function public.release_canvas_auto_reviewer_admission_v1(uuid, uuid) from public, anon, authenticated;
grant execute on function public.claim_canvas_auto_reviewer_admission_v1(uuid, uuid) to service_role;
grant execute on function public.release_canvas_auto_reviewer_admission_v1(uuid, uuid) to service_role;
