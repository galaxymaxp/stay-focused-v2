create extension if not exists pgcrypto;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'canvas_assignments_id_user_connection_course_unique'
      and conrelid = 'public.canvas_assignments'::regclass
  ) then
    alter table public.canvas_assignments
      add constraint canvas_assignments_id_user_connection_course_unique
      unique (id, user_id, canvas_connection_id, course_id);
  end if;
end;
$$;

create table if not exists public.canvas_assignment_submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  canvas_connection_id uuid not null,
  course_id uuid not null,
  assignment_id uuid not null,
  workflow_state text,
  normalized_status text not null default 'unknown',
  submitted_at timestamptz,
  graded_at timestamptz,
  posted_at timestamptz,
  attempt integer,
  submission_type text,
  grade_matches_current_submission boolean,
  late boolean,
  missing boolean,
  excused boolean,
  assignment_visible boolean,
  late_policy_status text,
  seconds_late integer,
  score numeric,
  grade text,
  score_visibility_state text not null default 'unknown',
  grade_visibility_state text not null default 'unknown',
  points_possible_at_sync numeric,
  first_synced_at timestamptz not null default now(),
  last_synced_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  absent_after_sync_at timestamptz,
  source_fingerprint text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint canvas_assignment_submissions_connection_user_fkey
    foreign key (canvas_connection_id, user_id)
    references public.canvas_connections (id, user_id)
    on delete cascade,
  constraint canvas_assignment_submissions_course_owner_fkey
    foreign key (course_id, user_id, canvas_connection_id)
    references public.canvas_courses (id, user_id, canvas_connection_id)
    on delete cascade,
  constraint canvas_assignment_submissions_assignment_owner_fkey
    foreign key (assignment_id, user_id, canvas_connection_id, course_id)
    references public.canvas_assignments (
      id,
      user_id,
      canvas_connection_id,
      course_id
    )
    on delete cascade,
  constraint canvas_assignment_submissions_identity_unique
    unique (user_id, canvas_connection_id, course_id, assignment_id),
  constraint canvas_assignment_submissions_workflow_state_allowed
    check (
      workflow_state is null
      or workflow_state in (
        'submitted',
        'unsubmitted',
        'graded',
        'pending_review'
      )
    ),
  constraint canvas_assignment_submissions_normalized_status_allowed
    check (
      normalized_status in (
        'unknown',
        'excused',
        'unavailable',
        'locked',
        'missing',
        'graded_hidden',
        'graded',
        'submitted_late',
        'submitted',
        'late_unsubmitted',
        'available',
        'upcoming',
        'no_due_date'
      )
    ),
  constraint canvas_assignment_submissions_late_policy_status_allowed
    check (
      late_policy_status is null
      or late_policy_status in ('late', 'missing', 'extended', 'none')
    ),
  constraint canvas_assignment_submissions_attempt_non_negative
    check (attempt is null or attempt >= 0),
  constraint canvas_assignment_submissions_seconds_late_non_negative
    check (seconds_late is null or seconds_late >= 0),
  constraint canvas_assignment_submissions_points_possible_safe
    check (
      points_possible_at_sync is null
      or (
        points_possible_at_sync::text not in ('NaN', 'Infinity', '-Infinity')
        and points_possible_at_sync >= 0
        and points_possible_at_sync <= 1000000
      )
    ),
  constraint canvas_assignment_submissions_score_safe
    check (
      score is null
      or (
        score::text not in ('NaN', 'Infinity', '-Infinity')
        and score between -1000000 and 1000000
      )
    ),
  constraint canvas_assignment_submissions_submission_type_length
    check (
      submission_type is null
      or (
        char_length(btrim(submission_type)) > 0
        and char_length(submission_type) <= 80
      )
    ),
  constraint canvas_assignment_submissions_grade_length
    check (grade is null or char_length(grade) <= 120),
  constraint canvas_assignment_submissions_visibility_states_allowed
    check (
      score_visibility_state in (
        'unknown',
        'visible',
        'hidden',
        'unavailable',
        'not_applicable'
      )
      and grade_visibility_state in (
        'unknown',
        'visible',
        'hidden',
        'unavailable',
        'not_applicable'
      )
    ),
  constraint canvas_assignment_submissions_score_visibility_consistency
    check (score is null or score_visibility_state = 'visible'),
  constraint canvas_assignment_submissions_grade_visibility_consistency
    check (grade is null or grade_visibility_state = 'visible'),
  constraint canvas_assignment_submissions_fingerprint_not_blank
    check (
      char_length(btrim(source_fingerprint)) > 0
      and char_length(source_fingerprint) <= 128
    )
);

create table if not exists public.canvas_course_grade_summaries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  canvas_connection_id uuid not null,
  course_id uuid not null,
  current_score numeric,
  current_score_visibility_state text not null default 'unknown',
  current_grade text,
  current_grade_visibility_state text not null default 'unknown',
  final_score numeric,
  final_score_visibility_state text not null default 'unknown',
  final_grade text,
  final_grade_visibility_state text not null default 'unknown',
  first_synced_at timestamptz not null default now(),
  last_synced_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  source_fingerprint text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint canvas_course_grade_summaries_connection_user_fkey
    foreign key (canvas_connection_id, user_id)
    references public.canvas_connections (id, user_id)
    on delete cascade,
  constraint canvas_course_grade_summaries_course_owner_fkey
    foreign key (course_id, user_id, canvas_connection_id)
    references public.canvas_courses (id, user_id, canvas_connection_id)
    on delete cascade,
  constraint canvas_course_grade_summaries_identity_unique
    unique (user_id, canvas_connection_id, course_id),
  constraint canvas_course_grade_summaries_visibility_states_allowed
    check (
      current_score_visibility_state in (
        'unknown',
        'visible',
        'hidden',
        'unavailable',
        'not_applicable'
      )
      and current_grade_visibility_state in (
        'unknown',
        'visible',
        'hidden',
        'unavailable',
        'not_applicable'
      )
      and final_score_visibility_state in (
        'unknown',
        'visible',
        'hidden',
        'unavailable',
        'not_applicable'
      )
      and final_grade_visibility_state in (
        'unknown',
        'visible',
        'hidden',
        'unavailable',
        'not_applicable'
      )
    ),
  constraint canvas_course_grade_summaries_current_score_safe
    check (
      current_score is null
      or (
        current_score::text not in ('NaN', 'Infinity', '-Infinity')
        and current_score between -1000000 and 1000000
      )
    ),
  constraint canvas_course_grade_summaries_final_score_safe
    check (
      final_score is null
      or (
        final_score::text not in ('NaN', 'Infinity', '-Infinity')
        and final_score between -1000000 and 1000000
      )
    ),
  constraint canvas_course_grade_summaries_grade_length
    check (
      (current_grade is null or char_length(current_grade) <= 120)
      and (final_grade is null or char_length(final_grade) <= 120)
    ),
  constraint canvas_course_grade_summaries_value_visibility_consistency
    check (
      (current_score is null or current_score_visibility_state = 'visible')
      and (current_grade is null or current_grade_visibility_state = 'visible')
      and (final_score is null or final_score_visibility_state = 'visible')
      and (final_grade is null or final_grade_visibility_state = 'visible')
    ),
  constraint canvas_course_grade_summaries_fingerprint_not_blank
    check (
      char_length(btrim(source_fingerprint)) > 0
      and char_length(source_fingerprint) <= 128
    )
);

create table if not exists public.canvas_course_grade_sync_states (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  canvas_connection_id uuid not null,
  course_id uuid not null,
  sync_status text not null default 'never_synced',
  last_checked_at timestamptz,
  last_completed_at timestamptz,
  last_successful_sync_at timestamptz,
  last_completed_snapshot_authoritative boolean not null default false,
  consecutive_failure_count integer not null default 0,
  last_failure_code text,
  last_failure_category text,
  synced_assignment_count integer not null default 0,
  synced_submission_count integer not null default 0,
  synced_course_grade_summary_count integer not null default 0,
  assignment_family_state text not null default 'not_started',
  submission_family_state text not null default 'not_started',
  course_grade_summary_family_state text not null default 'not_started',
  source_fingerprint text,
  fingerprint_version text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint canvas_course_grade_sync_states_connection_user_fkey
    foreign key (canvas_connection_id, user_id)
    references public.canvas_connections (id, user_id)
    on delete cascade,
  constraint canvas_course_grade_sync_states_course_owner_fkey
    foreign key (course_id, user_id, canvas_connection_id)
    references public.canvas_courses (id, user_id, canvas_connection_id)
    on delete cascade,
  constraint canvas_course_grade_sync_states_identity_unique
    unique (user_id, canvas_connection_id, course_id),
  constraint canvas_course_grade_sync_states_status_allowed
    check (
      sync_status in (
        'never_synced',
        'running',
        'succeeded',
        'partial',
        'failed'
      )
    ),
  constraint canvas_course_grade_sync_states_family_state_allowed
    check (
      assignment_family_state in (
        'not_started',
        'succeeded',
        'partial',
        'failed',
        'skipped'
      )
      and submission_family_state in (
        'not_started',
        'succeeded',
        'partial',
        'failed',
        'skipped'
      )
      and course_grade_summary_family_state in (
        'not_started',
        'succeeded',
        'partial',
        'failed',
        'skipped'
      )
    ),
  constraint canvas_course_grade_sync_states_failure_category_allowed
    check (
      last_failure_category is null
      or last_failure_category in (
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
        'partial_sync',
        'unknown'
      )
    ),
  constraint canvas_course_grade_sync_states_failure_code_safe
    check (
      last_failure_code is null
      or (
        last_failure_code ~ '^[a-z0-9_]+$'
        and char_length(last_failure_code) <= 80
      )
    ),
  constraint canvas_course_grade_sync_states_failure_consistency
    check (
      (last_failure_code is null and last_failure_category is null)
      or (last_failure_code is not null and last_failure_category is not null)
    ),
  constraint canvas_course_grade_sync_states_authoritative_consistency
    check (
      last_completed_snapshot_authoritative = false
      or (
        sync_status = 'succeeded'
        and last_successful_sync_at is not null
      )
    ),
  constraint canvas_course_grade_sync_states_counts_non_negative
    check (
      consecutive_failure_count >= 0
      and synced_assignment_count >= 0
      and synced_submission_count >= 0
      and synced_course_grade_summary_count >= 0
    ),
  constraint canvas_course_grade_sync_states_fingerprint_consistency
    check (
      (source_fingerprint is null and fingerprint_version is null)
      or (
        source_fingerprint is not null
        and fingerprint_version is not null
        and char_length(btrim(source_fingerprint)) > 0
        and char_length(source_fingerprint) <= 128
        and char_length(btrim(fingerprint_version)) > 0
        and char_length(fingerprint_version) <= 80
      )
    )
);

create index if not exists canvas_assignment_submissions_user_status_idx
  on public.canvas_assignment_submissions (
    user_id,
    normalized_status,
    last_synced_at desc
  );
create index if not exists canvas_assignment_submissions_course_status_idx
  on public.canvas_assignment_submissions (
    course_id,
    normalized_status,
    last_synced_at desc
  );
create index if not exists canvas_assignment_submissions_assignment_idx
  on public.canvas_assignment_submissions (assignment_id);
create index if not exists canvas_assignment_submissions_connection_seen_idx
  on public.canvas_assignment_submissions (
    canvas_connection_id,
    last_seen_at desc
  );

create index if not exists canvas_course_grade_summaries_user_synced_idx
  on public.canvas_course_grade_summaries (user_id, last_synced_at desc);
create index if not exists canvas_course_grade_summaries_connection_synced_idx
  on public.canvas_course_grade_summaries (
    canvas_connection_id,
    last_synced_at desc
  );
create index if not exists canvas_course_grade_summaries_course_idx
  on public.canvas_course_grade_summaries (course_id);

create index if not exists canvas_course_grade_sync_states_user_checked_idx
  on public.canvas_course_grade_sync_states (user_id, last_checked_at desc);
create index if not exists canvas_course_grade_sync_states_connection_checked_idx
  on public.canvas_course_grade_sync_states (
    canvas_connection_id,
    last_checked_at desc
  );
create index if not exists canvas_course_grade_sync_states_course_idx
  on public.canvas_course_grade_sync_states (course_id);
create index if not exists canvas_course_grade_sync_states_status_idx
  on public.canvas_course_grade_sync_states (sync_status, last_checked_at desc);

create or replace function public.set_canvas_assignment_submissions_updated_at()
returns trigger
language plpgsql
security invoker
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.set_canvas_course_grade_summaries_updated_at()
returns trigger
language plpgsql
security invoker
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.set_canvas_course_grade_sync_states_updated_at()
returns trigger
language plpgsql
security invoker
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists canvas_assignment_submissions_set_updated_at
  on public.canvas_assignment_submissions;
create trigger canvas_assignment_submissions_set_updated_at
before update on public.canvas_assignment_submissions
for each row
execute function public.set_canvas_assignment_submissions_updated_at();

drop trigger if exists canvas_course_grade_summaries_set_updated_at
  on public.canvas_course_grade_summaries;
create trigger canvas_course_grade_summaries_set_updated_at
before update on public.canvas_course_grade_summaries
for each row
execute function public.set_canvas_course_grade_summaries_updated_at();

drop trigger if exists canvas_course_grade_sync_states_set_updated_at
  on public.canvas_course_grade_sync_states;
create trigger canvas_course_grade_sync_states_set_updated_at
before update on public.canvas_course_grade_sync_states
for each row
execute function public.set_canvas_course_grade_sync_states_updated_at();

alter table public.canvas_assignment_submissions enable row level security;
alter table public.canvas_course_grade_summaries enable row level security;
alter table public.canvas_course_grade_sync_states enable row level security;

revoke all on table public.canvas_assignment_submissions from public;
revoke all on table public.canvas_assignment_submissions from anon;
revoke all on table public.canvas_assignment_submissions from authenticated;
revoke all on table public.canvas_assignment_submissions from service_role;
revoke all on table public.canvas_course_grade_summaries from public;
revoke all on table public.canvas_course_grade_summaries from anon;
revoke all on table public.canvas_course_grade_summaries from authenticated;
revoke all on table public.canvas_course_grade_summaries from service_role;
revoke all on table public.canvas_course_grade_sync_states from public;
revoke all on table public.canvas_course_grade_sync_states from anon;
revoke all on table public.canvas_course_grade_sync_states from authenticated;
revoke all on table public.canvas_course_grade_sync_states from service_role;

grant select, insert, update, delete
  on table public.canvas_assignment_submissions
  to service_role;
grant select, insert, update, delete
  on table public.canvas_course_grade_summaries
  to service_role;
grant select, insert, update, delete
  on table public.canvas_course_grade_sync_states
  to service_role;

drop policy if exists canvas_assignment_submissions_select_own
  on public.canvas_assignment_submissions;
create policy canvas_assignment_submissions_select_own
on public.canvas_assignment_submissions
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists canvas_assignment_submissions_insert_own
  on public.canvas_assignment_submissions;
create policy canvas_assignment_submissions_insert_own
on public.canvas_assignment_submissions
for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists canvas_assignment_submissions_update_own
  on public.canvas_assignment_submissions;
create policy canvas_assignment_submissions_update_own
on public.canvas_assignment_submissions
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists canvas_assignment_submissions_delete_own
  on public.canvas_assignment_submissions;
create policy canvas_assignment_submissions_delete_own
on public.canvas_assignment_submissions
for delete
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists canvas_course_grade_summaries_select_own
  on public.canvas_course_grade_summaries;
create policy canvas_course_grade_summaries_select_own
on public.canvas_course_grade_summaries
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists canvas_course_grade_summaries_insert_own
  on public.canvas_course_grade_summaries;
create policy canvas_course_grade_summaries_insert_own
on public.canvas_course_grade_summaries
for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists canvas_course_grade_summaries_update_own
  on public.canvas_course_grade_summaries;
create policy canvas_course_grade_summaries_update_own
on public.canvas_course_grade_summaries
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists canvas_course_grade_summaries_delete_own
  on public.canvas_course_grade_summaries;
create policy canvas_course_grade_summaries_delete_own
on public.canvas_course_grade_summaries
for delete
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists canvas_course_grade_sync_states_select_own
  on public.canvas_course_grade_sync_states;
create policy canvas_course_grade_sync_states_select_own
on public.canvas_course_grade_sync_states
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists canvas_course_grade_sync_states_insert_own
  on public.canvas_course_grade_sync_states;
create policy canvas_course_grade_sync_states_insert_own
on public.canvas_course_grade_sync_states
for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists canvas_course_grade_sync_states_update_own
  on public.canvas_course_grade_sync_states;
create policy canvas_course_grade_sync_states_update_own
on public.canvas_course_grade_sync_states
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists canvas_course_grade_sync_states_delete_own
  on public.canvas_course_grade_sync_states;
create policy canvas_course_grade_sync_states_delete_own
on public.canvas_course_grade_sync_states
for delete
to authenticated
using ((select auth.uid()) = user_id);

revoke all on function public.set_canvas_assignment_submissions_updated_at()
  from public;
revoke all on function public.set_canvas_assignment_submissions_updated_at()
  from anon;
revoke all on function public.set_canvas_assignment_submissions_updated_at()
  from authenticated;
grant execute on function public.set_canvas_assignment_submissions_updated_at()
  to service_role;

revoke all on function public.set_canvas_course_grade_summaries_updated_at()
  from public;
revoke all on function public.set_canvas_course_grade_summaries_updated_at()
  from anon;
revoke all on function public.set_canvas_course_grade_summaries_updated_at()
  from authenticated;
grant execute on function public.set_canvas_course_grade_summaries_updated_at()
  to service_role;

revoke all on function public.set_canvas_course_grade_sync_states_updated_at()
  from public;
revoke all on function public.set_canvas_course_grade_sync_states_updated_at()
  from anon;
revoke all on function public.set_canvas_course_grade_sync_states_updated_at()
  from authenticated;
grant execute on function public.set_canvas_course_grade_sync_states_updated_at()
  to service_role;
