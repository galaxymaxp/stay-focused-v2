-- ADR-019: automatic reviewer generation after Canvas content sync.

create table public.canvas_auto_reviewer_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  enabled boolean not null default true,
  updated_at timestamptz not null default now()
);

create table public.canvas_auto_reviewer_course_state (
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id uuid not null references public.canvas_courses(id) on delete cascade,
  baseline_at timestamptz not null default now(),
  primary key (user_id, course_id)
);

create table public.canvas_auto_reviewer_candidates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id uuid not null references public.canvas_courses(id) on delete cascade,
  material_id text not null check (char_length(material_id) between 3 and 200),
  material_revision text not null check (char_length(material_revision) between 1 and 100),
  status text not null check (status in (
    'baseline', 'pending', 'admitted', 'skipped_existing', 'deferred_quota', 'failed'
  )),
  processing_job_id uuid null references public.processing_jobs(id) on delete set null,
  failure_code text null check (failure_code is null or char_length(failure_code) <= 80),
  attempt_count integer not null default 0 check (attempt_count between 0 and 3),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, course_id, material_id, material_revision)
);

create index canvas_auto_reviewer_candidates_open_idx
  on public.canvas_auto_reviewer_candidates (user_id, course_id, status)
  where status in ('pending', 'deferred_quota');

create index canvas_auto_reviewer_candidates_admitted_idx
  on public.canvas_auto_reviewer_candidates (user_id, updated_at)
  where status = 'admitted';

alter table public.canvas_auto_reviewer_preferences enable row level security;
alter table public.canvas_auto_reviewer_course_state enable row level security;
alter table public.canvas_auto_reviewer_candidates enable row level security;

revoke all on public.canvas_auto_reviewer_preferences from anon, authenticated;
revoke all on public.canvas_auto_reviewer_course_state from anon, authenticated;
revoke all on public.canvas_auto_reviewer_candidates from anon, authenticated;

grant select, insert, update on public.canvas_auto_reviewer_preferences to authenticated;
grant select on public.canvas_auto_reviewer_course_state to authenticated;
grant select on public.canvas_auto_reviewer_candidates to authenticated;

create policy canvas_auto_reviewer_preferences_owner_select
  on public.canvas_auto_reviewer_preferences for select to authenticated
  using (user_id = (select auth.uid()));
create policy canvas_auto_reviewer_preferences_owner_insert
  on public.canvas_auto_reviewer_preferences for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy canvas_auto_reviewer_preferences_owner_update
  on public.canvas_auto_reviewer_preferences for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy canvas_auto_reviewer_course_state_owner_select
  on public.canvas_auto_reviewer_course_state for select to authenticated
  using (user_id = (select auth.uid()));
create policy canvas_auto_reviewer_candidates_owner_select
  on public.canvas_auto_reviewer_candidates for select to authenticated
  using (user_id = (select auth.uid()));

-- Explicit service grants support projects without default public grants.
grant all on public.canvas_auto_reviewer_preferences, public.canvas_auto_reviewer_course_state, public.canvas_auto_reviewer_candidates to service_role;
