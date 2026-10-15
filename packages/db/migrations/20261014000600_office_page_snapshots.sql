-- VL2.1: immutable, owner-private rendering of an exact Canvas PPTX revision.
create table public.office_pdf_conversions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source_file_id uuid not null,
  canvas_connection_id uuid not null,
  course_id uuid not null,
  revision_fingerprint text not null check (revision_fingerprint ~ '^[a-f0-9]{64}$'),
  original_sha256 text not null check (original_sha256 ~ '^[a-f0-9]{64}$'),
  pdf_sha256 text not null check (pdf_sha256 ~ '^[a-f0-9]{64}$'),
  byte_size integer not null check (byte_size between 5 and 20971520),
  page_count integer not null check (page_count between 1 and 100),
  storage_path text not null check (storage_path = user_id::text || '/' || id::text || '.pdf'),
  created_at timestamptz not null default now(),
  foreign key (source_file_id, user_id, canvas_connection_id, course_id)
    references public.canvas_files(id, user_id, canvas_connection_id, course_id),
  unique (user_id, source_file_id, revision_fingerprint, original_sha256)
);
alter table public.office_pdf_conversions enable row level security;
revoke all on public.office_pdf_conversions from public, anon, authenticated;
grant select, insert on public.office_pdf_conversions to service_role;
insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values ('office-source-pdfs', 'office-source-pdfs', false, 20971520, array['application/pdf'])
on conflict (id) do nothing;
-- No direct client Storage policies. Historical conversion bytes are retained.

alter table public.reviewer_source_snapshot_items add column office_revision_fingerprint text
  check (office_revision_fingerprint is null or office_revision_fingerprint ~ '^[a-f0-9]{64}$');
-- Server-derived at acceptance only. Old snapshots remain unbound, without backfill.
create function public.bind_office_snapshot_revision_v1() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  new.office_revision_fingerprint := null;
  if new.source_type = 'file' and new.file_kind is null
    and new.mime_type = 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
    and new.parser_version = 'canvas-office-structured-v2' then
    select f.content_version_fingerprint into new.office_revision_fingerprint
      from public.canvas_files f where f.id = new.source_row_id and f.user_id = new.user_id
      and f.canvas_connection_id = new.canvas_connection_id and f.course_id = new.course_id
      and f.current_sha256 = new.stored_content_sha256 for share;
  end if;
  return new;
end;
$$;
revoke all on function public.bind_office_snapshot_revision_v1() from public, anon, authenticated;
grant execute on function public.bind_office_snapshot_revision_v1() to service_role;
create trigger bind_office_snapshot_revision before insert on public.reviewer_source_snapshot_items
  for each row execute function public.bind_office_snapshot_revision_v1();

-- Preserve the entire existing PDF/local validation and accounting implementation.
alter function public.reserve_source_page_snapshot_origin_v1(uuid, uuid, uuid, integer, text)
  rename to reserve_source_page_snapshot_pdf_origin_v1;
create function public.reserve_source_page_snapshot_origin_v1(
  p_user_id uuid, p_source_version_id uuid, p_snapshot_item_id uuid, p_page_number integer, p_origin text
) returns setof public.source_page_snapshots language plpgsql security definer
set search_path = public, pg_temp as $$
declare
  v_item public.reviewer_source_snapshot_items%rowtype;
  v_row public.source_page_snapshots%rowtype;
begin
  if p_snapshot_item_id is null or not exists (
    select 1 from public.reviewer_source_snapshot_items i where i.id = p_snapshot_item_id
    and i.user_id = p_user_id and i.file_kind is null
    and i.mime_type = 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  ) then
    return query select * from public.reserve_source_page_snapshot_pdf_origin_v1(
      p_user_id, p_source_version_id, p_snapshot_item_id, p_page_number, p_origin);
    return;
  end if;
  if p_origin is null or p_origin not in ('student', 'system') then
    raise exception using errcode = 'P0001', message = 'snapshot_origin_invalid';
  end if;
  perform pg_advisory_xact_lock(hashtextextended('page-snapshot:' || p_user_id::text, 0));
  select i.* into v_item from public.reviewer_source_snapshot_items i
    join public.reviewer_source_snapshots s on s.id = i.source_snapshot_id and s.user_id = i.user_id
    join public.source_versions v on v.id = p_source_version_id and v.user_id = i.user_id
    join public.office_pdf_conversions c on c.user_id = i.user_id and c.source_file_id = i.source_row_id
      and c.canvas_connection_id = i.canvas_connection_id and c.course_id = i.course_id
      and c.revision_fingerprint = i.office_revision_fingerprint and c.original_sha256 = i.stored_content_sha256
    where i.id = p_snapshot_item_id and i.user_id = p_user_id
      and s.source_mode = 'canvas' and not s.was_edited and s.source_count = 1
      and i.source_type = 'file' and i.file_kind is null
      and i.mime_type = 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
      and i.parser_version = 'canvas-office-structured-v2'
      and v.revision_kind <> 'user_edited'
      and v.metadata ->> 'reviewerSourceSnapshotId' = s.id::text
      and p_page_number between 1 and c.page_count;
  if not found then raise exception using errcode = 'P0001', message = 'snapshot_source_invalid'; end if;
  if not exists (select 1 from public.reviewer_source_snapshot_blocks b
    where b.source_snapshot_item_id = v_item.id and b.user_id = p_user_id
      and b.parser_version = 'canvas-office-structured-v2'
      and b.page_number = p_page_number and b.slide_number = p_page_number) then
    raise exception using errcode = 'P0001', message = 'snapshot_source_invalid';
  end if;
  select * into v_row from public.source_page_snapshots
    where user_id = p_user_id and source_version_id = p_source_version_id and page_number = p_page_number;
  if found then return next v_row; return; end if;
  if p_origin = 'student' and (select count(*) from public.source_page_snapshots where user_id = p_user_id and origin = 'student'
      and created_at > now() - interval '24 hours') >= 20 then
    raise exception using errcode = 'P0001', message = 'snapshot_render_limit_reached';
  end if;
  insert into public.source_page_snapshots(user_id, source_version_id, source_snapshot_id, source_snapshot_item_id, page_number, origin)
    values (p_user_id, p_source_version_id, v_item.source_snapshot_id, v_item.id, p_page_number, p_origin)
    returning * into v_row;
  return next v_row;
end;
$$;
revoke all on function public.reserve_source_page_snapshot_origin_v1(uuid, uuid, uuid, integer, text) from public, anon, authenticated;
grant execute on function public.reserve_source_page_snapshot_origin_v1(uuid, uuid, uuid, integer, text) to service_role;
