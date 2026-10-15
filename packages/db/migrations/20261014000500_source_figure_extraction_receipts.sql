-- Empty/unsupported materials also need a durable unchanged-revision receipt.
create table public.source_figure_extractions (
  user_id uuid not null references auth.users(id) on delete cascade,
  source_kind text not null check (source_kind in ('canvas_file', 'local_pdf')),
  source_row_id uuid not null,
  revision_fingerprint text not null check (revision_fingerprint ~ '^[a-f0-9]{64}$'),
  original_sha256 text not null check (original_sha256 ~ '^[a-f0-9]{64}$'),
  figure_count integer not null check (figure_count between 0 and 60),
  created_at timestamptz not null default now(),
  primary key (user_id, source_kind, source_row_id, revision_fingerprint, original_sha256)
);
alter table public.source_figure_extractions enable row level security;
revoke all on public.source_figure_extractions from public, anon, authenticated;
grant select, insert on public.source_figure_extractions to service_role;
