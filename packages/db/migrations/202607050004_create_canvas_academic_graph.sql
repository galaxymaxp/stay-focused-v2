create table if not exists public.canvas_courses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  canvas_connection_id uuid not null,
  canvas_course_id text not null,
  name text not null,
  course_code text,
  workflow_state text,
  enrollment_term_id text,
  account_id text,
  start_at timestamptz,
  end_at timestamptz,
  time_zone text,
  public_syllabus boolean,
  syllabus_body text,
  canvas_updated_at timestamptz,
  first_synced_at timestamptz not null default now(),
  last_synced_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint canvas_courses_connection_user_fkey
    foreign key (canvas_connection_id, user_id)
    references public.canvas_connections (id, user_id)
    on delete cascade,
  constraint canvas_courses_canvas_identity_unique
    unique (user_id, canvas_connection_id, canvas_course_id),
  constraint canvas_courses_id_user_connection_unique
    unique (id, user_id, canvas_connection_id),
  constraint canvas_courses_canvas_course_id_not_blank
    check (char_length(btrim(canvas_course_id)) > 0),
  constraint canvas_courses_name_not_blank
    check (char_length(btrim(name)) > 0),
  constraint canvas_courses_course_code_not_blank
    check (course_code is null or char_length(btrim(course_code)) > 0),
  constraint canvas_courses_enrollment_term_id_not_blank
    check (enrollment_term_id is null or char_length(btrim(enrollment_term_id)) > 0),
  constraint canvas_courses_account_id_not_blank
    check (account_id is null or char_length(btrim(account_id)) > 0)
);

create table if not exists public.canvas_modules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  canvas_connection_id uuid not null,
  course_id uuid not null,
  canvas_module_id text not null,
  name text not null,
  position integer,
  unlock_at timestamptz,
  item_count integer,
  require_sequential_progress boolean,
  published boolean,
  prerequisite_module_ids text[] not null default '{}'::text[],
  canvas_state text,
  first_synced_at timestamptz not null default now(),
  last_synced_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint canvas_modules_course_owner_fkey
    foreign key (course_id, user_id, canvas_connection_id)
    references public.canvas_courses (id, user_id, canvas_connection_id)
    on delete cascade,
  constraint canvas_modules_canvas_identity_unique
    unique (course_id, canvas_module_id),
  constraint canvas_modules_id_user_connection_course_unique
    unique (id, user_id, canvas_connection_id, course_id),
  constraint canvas_modules_canvas_module_id_not_blank
    check (char_length(btrim(canvas_module_id)) > 0),
  constraint canvas_modules_name_not_blank
    check (char_length(btrim(name)) > 0),
  constraint canvas_modules_position_non_negative
    check (position is null or position >= 0),
  constraint canvas_modules_item_count_non_negative
    check (item_count is null or item_count >= 0)
);

create table if not exists public.canvas_module_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  canvas_connection_id uuid not null,
  course_id uuid not null,
  module_id uuid not null,
  canvas_module_item_id text not null,
  title text not null,
  position integer,
  indent integer,
  item_type text not null,
  canvas_content_id text,
  page_url text,
  external_url text,
  html_url text,
  new_tab boolean,
  published boolean,
  completion_requirement jsonb,
  content_details jsonb,
  first_synced_at timestamptz not null default now(),
  last_synced_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint canvas_module_items_module_owner_fkey
    foreign key (module_id, user_id, canvas_connection_id, course_id)
    references public.canvas_modules (id, user_id, canvas_connection_id, course_id)
    on delete cascade,
  constraint canvas_module_items_canvas_identity_unique
    unique (module_id, canvas_module_item_id),
  constraint canvas_module_items_canvas_module_item_id_not_blank
    check (char_length(btrim(canvas_module_item_id)) > 0),
  constraint canvas_module_items_title_not_blank
    check (char_length(btrim(title)) > 0),
  constraint canvas_module_items_item_type_not_blank
    check (char_length(btrim(item_type)) > 0),
  constraint canvas_module_items_position_non_negative
    check (position is null or position >= 0),
  constraint canvas_module_items_indent_non_negative
    check (indent is null or indent >= 0),
  constraint canvas_module_items_completion_requirement_object
    check (
      completion_requirement is null
      or jsonb_typeof(completion_requirement) = 'object'
    ),
  constraint canvas_module_items_content_details_object
    check (content_details is null or jsonb_typeof(content_details) = 'object')
);

create table if not exists public.canvas_pages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  canvas_connection_id uuid not null,
  course_id uuid not null,
  canvas_page_id text,
  canvas_page_url text not null,
  title text not null,
  body_html text,
  published boolean,
  front_page boolean,
  editing_roles text,
  lock_info jsonb,
  unlock_at timestamptz,
  lock_at timestamptz,
  canvas_created_at timestamptz,
  canvas_updated_at timestamptz,
  first_synced_at timestamptz not null default now(),
  last_synced_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint canvas_pages_course_owner_fkey
    foreign key (course_id, user_id, canvas_connection_id)
    references public.canvas_courses (id, user_id, canvas_connection_id)
    on delete cascade,
  constraint canvas_pages_url_unique unique (course_id, canvas_page_url),
  constraint canvas_pages_canvas_page_id_not_blank
    check (canvas_page_id is null or char_length(btrim(canvas_page_id)) > 0),
  constraint canvas_pages_canvas_page_url_not_blank
    check (char_length(btrim(canvas_page_url)) > 0),
  constraint canvas_pages_title_not_blank
    check (char_length(btrim(title)) > 0),
  constraint canvas_pages_lock_info_object
    check (lock_info is null or jsonb_typeof(lock_info) = 'object')
);

create unique index if not exists canvas_pages_canvas_page_id_unique_idx
  on public.canvas_pages (course_id, canvas_page_id)
  where canvas_page_id is not null;

create table if not exists public.canvas_assignment_groups (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  canvas_connection_id uuid not null,
  course_id uuid not null,
  canvas_assignment_group_id text not null,
  name text not null,
  position integer,
  group_weight numeric,
  rules jsonb,
  integration_data jsonb,
  first_synced_at timestamptz not null default now(),
  last_synced_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint canvas_assignment_groups_course_owner_fkey
    foreign key (course_id, user_id, canvas_connection_id)
    references public.canvas_courses (id, user_id, canvas_connection_id)
    on delete cascade,
  constraint canvas_assignment_groups_canvas_identity_unique
    unique (course_id, canvas_assignment_group_id),
  constraint canvas_assignment_groups_id_user_connection_course_unique
    unique (id, user_id, canvas_connection_id, course_id),
  constraint canvas_assignment_groups_canvas_assignment_group_id_not_blank
    check (char_length(btrim(canvas_assignment_group_id)) > 0),
  constraint canvas_assignment_groups_name_not_blank
    check (char_length(btrim(name)) > 0),
  constraint canvas_assignment_groups_position_non_negative
    check (position is null or position >= 0),
  constraint canvas_assignment_groups_rules_object
    check (rules is null or jsonb_typeof(rules) = 'object'),
  constraint canvas_assignment_groups_integration_data_object
    check (integration_data is null or jsonb_typeof(integration_data) = 'object')
);

create table if not exists public.canvas_assignments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  canvas_connection_id uuid not null,
  course_id uuid not null,
  assignment_group_id uuid,
  canvas_assignment_id text not null,
  canvas_assignment_group_id text,
  name text not null,
  description_html text,
  position integer,
  points_possible numeric,
  grading_type text,
  submission_types text[] not null default '{}'::text[],
  due_at timestamptz,
  unlock_at timestamptz,
  lock_at timestamptz,
  published boolean,
  muted boolean,
  omit_from_final_grade boolean,
  anonymous_grading boolean,
  html_url text,
  quiz_id text,
  discussion_topic_id text,
  canvas_created_at timestamptz,
  canvas_updated_at timestamptz,
  first_synced_at timestamptz not null default now(),
  last_synced_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint canvas_assignments_course_owner_fkey
    foreign key (course_id, user_id, canvas_connection_id)
    references public.canvas_courses (id, user_id, canvas_connection_id)
    on delete cascade,
  constraint canvas_assignments_assignment_group_id_fkey
    foreign key (assignment_group_id)
    references public.canvas_assignment_groups (id)
    on delete set null,
  constraint canvas_assignments_assignment_group_owner_fkey
    foreign key (assignment_group_id, user_id, canvas_connection_id, course_id)
    references public.canvas_assignment_groups (
      id,
      user_id,
      canvas_connection_id,
      course_id
    ),
  constraint canvas_assignments_canvas_identity_unique
    unique (course_id, canvas_assignment_id),
  constraint canvas_assignments_canvas_assignment_id_not_blank
    check (char_length(btrim(canvas_assignment_id)) > 0),
  constraint canvas_assignments_canvas_assignment_group_id_not_blank
    check (
      canvas_assignment_group_id is null
      or char_length(btrim(canvas_assignment_group_id)) > 0
    ),
  constraint canvas_assignments_name_not_blank
    check (char_length(btrim(name)) > 0),
  constraint canvas_assignments_position_non_negative
    check (position is null or position >= 0),
  constraint canvas_assignments_points_possible_non_negative
    check (points_possible is null or points_possible >= 0)
);

create index if not exists canvas_courses_user_synced_idx
  on public.canvas_courses (user_id, last_synced_at desc);
create index if not exists canvas_courses_connection_synced_idx
  on public.canvas_courses (canvas_connection_id, last_synced_at desc);

create index if not exists canvas_modules_user_synced_idx
  on public.canvas_modules (user_id, last_synced_at desc);
create index if not exists canvas_modules_connection_synced_idx
  on public.canvas_modules (canvas_connection_id, last_synced_at desc);
create index if not exists canvas_modules_course_position_idx
  on public.canvas_modules (course_id, position);

create index if not exists canvas_module_items_user_synced_idx
  on public.canvas_module_items (user_id, last_synced_at desc);
create index if not exists canvas_module_items_connection_synced_idx
  on public.canvas_module_items (canvas_connection_id, last_synced_at desc);
create index if not exists canvas_module_items_course_idx
  on public.canvas_module_items (course_id, module_id);
create index if not exists canvas_module_items_module_position_idx
  on public.canvas_module_items (module_id, position);
create index if not exists canvas_module_items_content_idx
  on public.canvas_module_items (course_id, item_type, canvas_content_id)
  where canvas_content_id is not null;

create index if not exists canvas_pages_user_synced_idx
  on public.canvas_pages (user_id, last_synced_at desc);
create index if not exists canvas_pages_connection_synced_idx
  on public.canvas_pages (canvas_connection_id, last_synced_at desc);
create index if not exists canvas_pages_course_idx
  on public.canvas_pages (course_id, updated_at desc);

create index if not exists canvas_assignment_groups_user_synced_idx
  on public.canvas_assignment_groups (user_id, last_synced_at desc);
create index if not exists canvas_assignment_groups_connection_synced_idx
  on public.canvas_assignment_groups (canvas_connection_id, last_synced_at desc);
create index if not exists canvas_assignment_groups_course_position_idx
  on public.canvas_assignment_groups (course_id, position);

create index if not exists canvas_assignments_user_synced_idx
  on public.canvas_assignments (user_id, last_synced_at desc);
create index if not exists canvas_assignments_connection_synced_idx
  on public.canvas_assignments (canvas_connection_id, last_synced_at desc);
create index if not exists canvas_assignments_course_position_idx
  on public.canvas_assignments (course_id, position);
create index if not exists canvas_assignments_course_due_idx
  on public.canvas_assignments (course_id, due_at)
  where due_at is not null;
create index if not exists canvas_assignments_user_due_idx
  on public.canvas_assignments (user_id, due_at)
  where due_at is not null;

create or replace function public.set_canvas_courses_updated_at()
returns trigger
language plpgsql
security invoker
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.set_canvas_modules_updated_at()
returns trigger
language plpgsql
security invoker
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.set_canvas_module_items_updated_at()
returns trigger
language plpgsql
security invoker
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.set_canvas_pages_updated_at()
returns trigger
language plpgsql
security invoker
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.set_canvas_assignment_groups_updated_at()
returns trigger
language plpgsql
security invoker
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.set_canvas_assignments_updated_at()
returns trigger
language plpgsql
security invoker
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists canvas_courses_set_updated_at on public.canvas_courses;
create trigger canvas_courses_set_updated_at
before update on public.canvas_courses
for each row
execute function public.set_canvas_courses_updated_at();

drop trigger if exists canvas_modules_set_updated_at on public.canvas_modules;
create trigger canvas_modules_set_updated_at
before update on public.canvas_modules
for each row
execute function public.set_canvas_modules_updated_at();

drop trigger if exists canvas_module_items_set_updated_at on public.canvas_module_items;
create trigger canvas_module_items_set_updated_at
before update on public.canvas_module_items
for each row
execute function public.set_canvas_module_items_updated_at();

drop trigger if exists canvas_pages_set_updated_at on public.canvas_pages;
create trigger canvas_pages_set_updated_at
before update on public.canvas_pages
for each row
execute function public.set_canvas_pages_updated_at();

drop trigger if exists canvas_assignment_groups_set_updated_at
  on public.canvas_assignment_groups;
create trigger canvas_assignment_groups_set_updated_at
before update on public.canvas_assignment_groups
for each row
execute function public.set_canvas_assignment_groups_updated_at();

drop trigger if exists canvas_assignments_set_updated_at
  on public.canvas_assignments;
create trigger canvas_assignments_set_updated_at
before update on public.canvas_assignments
for each row
execute function public.set_canvas_assignments_updated_at();

alter table public.canvas_courses enable row level security;
alter table public.canvas_modules enable row level security;
alter table public.canvas_module_items enable row level security;
alter table public.canvas_pages enable row level security;
alter table public.canvas_assignment_groups enable row level security;
alter table public.canvas_assignments enable row level security;

revoke all on table public.canvas_courses from anon;
revoke all on table public.canvas_courses from authenticated;
revoke all on table public.canvas_modules from anon;
revoke all on table public.canvas_modules from authenticated;
revoke all on table public.canvas_module_items from anon;
revoke all on table public.canvas_module_items from authenticated;
revoke all on table public.canvas_pages from anon;
revoke all on table public.canvas_pages from authenticated;
revoke all on table public.canvas_assignment_groups from anon;
revoke all on table public.canvas_assignment_groups from authenticated;
revoke all on table public.canvas_assignments from anon;
revoke all on table public.canvas_assignments from authenticated;

grant select, insert, update, delete on table public.canvas_courses to service_role;
grant select, insert, update, delete on table public.canvas_modules to service_role;
grant select, insert, update, delete on table public.canvas_module_items to service_role;
grant select, insert, update, delete on table public.canvas_pages to service_role;
grant select, insert, update, delete on table public.canvas_assignment_groups to service_role;
grant select, insert, update, delete on table public.canvas_assignments to service_role;

drop policy if exists canvas_courses_select_own on public.canvas_courses;
create policy canvas_courses_select_own
on public.canvas_courses
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists canvas_courses_insert_own on public.canvas_courses;
create policy canvas_courses_insert_own
on public.canvas_courses
for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists canvas_courses_update_own on public.canvas_courses;
create policy canvas_courses_update_own
on public.canvas_courses
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists canvas_courses_delete_own on public.canvas_courses;
create policy canvas_courses_delete_own
on public.canvas_courses
for delete
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists canvas_modules_select_own on public.canvas_modules;
create policy canvas_modules_select_own
on public.canvas_modules
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists canvas_modules_insert_own on public.canvas_modules;
create policy canvas_modules_insert_own
on public.canvas_modules
for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists canvas_modules_update_own on public.canvas_modules;
create policy canvas_modules_update_own
on public.canvas_modules
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists canvas_modules_delete_own on public.canvas_modules;
create policy canvas_modules_delete_own
on public.canvas_modules
for delete
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists canvas_module_items_select_own
  on public.canvas_module_items;
create policy canvas_module_items_select_own
on public.canvas_module_items
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists canvas_module_items_insert_own
  on public.canvas_module_items;
create policy canvas_module_items_insert_own
on public.canvas_module_items
for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists canvas_module_items_update_own
  on public.canvas_module_items;
create policy canvas_module_items_update_own
on public.canvas_module_items
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists canvas_module_items_delete_own
  on public.canvas_module_items;
create policy canvas_module_items_delete_own
on public.canvas_module_items
for delete
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists canvas_pages_select_own on public.canvas_pages;
create policy canvas_pages_select_own
on public.canvas_pages
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists canvas_pages_insert_own on public.canvas_pages;
create policy canvas_pages_insert_own
on public.canvas_pages
for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists canvas_pages_update_own on public.canvas_pages;
create policy canvas_pages_update_own
on public.canvas_pages
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists canvas_pages_delete_own on public.canvas_pages;
create policy canvas_pages_delete_own
on public.canvas_pages
for delete
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists canvas_assignment_groups_select_own
  on public.canvas_assignment_groups;
create policy canvas_assignment_groups_select_own
on public.canvas_assignment_groups
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists canvas_assignment_groups_insert_own
  on public.canvas_assignment_groups;
create policy canvas_assignment_groups_insert_own
on public.canvas_assignment_groups
for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists canvas_assignment_groups_update_own
  on public.canvas_assignment_groups;
create policy canvas_assignment_groups_update_own
on public.canvas_assignment_groups
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists canvas_assignment_groups_delete_own
  on public.canvas_assignment_groups;
create policy canvas_assignment_groups_delete_own
on public.canvas_assignment_groups
for delete
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists canvas_assignments_select_own
  on public.canvas_assignments;
create policy canvas_assignments_select_own
on public.canvas_assignments
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists canvas_assignments_insert_own
  on public.canvas_assignments;
create policy canvas_assignments_insert_own
on public.canvas_assignments
for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists canvas_assignments_update_own
  on public.canvas_assignments;
create policy canvas_assignments_update_own
on public.canvas_assignments
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists canvas_assignments_delete_own
  on public.canvas_assignments;
create policy canvas_assignments_delete_own
on public.canvas_assignments
for delete
to authenticated
using ((select auth.uid()) = user_id);
