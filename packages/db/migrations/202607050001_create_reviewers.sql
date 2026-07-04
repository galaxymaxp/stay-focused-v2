create extension if not exists pgcrypto;

create table if not exists public.reviewers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  source_metadata jsonb not null default '{}'::jsonb,
  reviewer_output jsonb not null,
  section_count integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint reviewers_title_not_blank check (char_length(btrim(title)) > 0),
  constraint reviewers_title_length check (char_length(title) <= 120),
  constraint reviewers_section_count_non_negative check (section_count >= 0)
);

create index if not exists reviewers_user_updated_idx
  on public.reviewers (user_id, updated_at desc, created_at desc);

create or replace function public.set_reviewers_updated_at()
returns trigger
language plpgsql
security invoker
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists reviewers_set_updated_at on public.reviewers;

create trigger reviewers_set_updated_at
before update on public.reviewers
for each row
execute function public.set_reviewers_updated_at();

alter table public.reviewers enable row level security;

revoke all on table public.reviewers from anon;
grant select, insert, update, delete on table public.reviewers to authenticated;

drop policy if exists reviewers_select_own on public.reviewers;
create policy reviewers_select_own
on public.reviewers
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists reviewers_insert_own on public.reviewers;
create policy reviewers_insert_own
on public.reviewers
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists reviewers_update_own on public.reviewers;
create policy reviewers_update_own
on public.reviewers
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists reviewers_delete_own on public.reviewers;
create policy reviewers_delete_own
on public.reviewers
for delete
to authenticated
using (auth.uid() = user_id);
