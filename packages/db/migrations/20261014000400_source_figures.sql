-- VL2: exact-original raster figures, never direct client Storage access.
-- Retain immutable revisions; no cleanup on current Canvas revision replacement.
create table public.source_figures (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source_kind text not null check (source_kind in ('canvas_file', 'local_pdf')),
  source_row_id uuid not null,
  original_sha256 text not null check (original_sha256 ~ '^[a-f0-9]{64}$'),
  page_number integer check (page_number between 1 and 100),
  slide_number integer check (slide_number between 1 and 100),
  block_id text,
  position integer not null check (position between 0 and 1999),
  width integer not null check (width between 1 and 10000),
  height integer not null check (height between 1 and 10000),
  byte_size integer not null check (byte_size between 1 and 5242880),
  sha256 text not null check (sha256 ~ '^[a-f0-9]{64}$'),
  storage_path text not null check (storage_path ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}[.](png|jpg)$'),
  created_at timestamptz not null default now(),
  check (num_nonnulls(page_number, slide_number, block_id) = 1),
  check (block_id is null or block_id ~ '^block-[1-9][0-9]{0,3}$'),
  unique (user_id, source_kind, source_row_id, original_sha256, sha256, position)
);
create index source_figures_revision_idx on public.source_figures
  (user_id, source_kind, source_row_id, original_sha256);
alter table public.source_figures enable row level security;
revoke all on public.source_figures from public, anon, authenticated;
grant select (id, user_id, source_kind, source_row_id, page_number, slide_number,
  block_id, position, width, height, byte_size, created_at)
  on public.source_figures to authenticated;
grant select, insert on public.source_figures to service_role;
create policy source_figures_owner_select on public.source_figures
  for select to authenticated using ((select auth.uid()) = user_id);
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('source-figures', 'source-figures', false, 5242880, array['image/png', 'image/jpeg'])
on conflict (id) do nothing;
-- No authenticated/anon Storage policy. The owned API returns short-lived URLs.
