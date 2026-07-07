alter table public.reviewer_source_snapshots
  add constraint reviewer_source_snapshots_id_owner_course_unique
  unique (id, user_id, canvas_connection_id, course_id);

alter table public.reviewer_source_snapshot_items
  add constraint reviewer_source_snapshot_items_snapshot_context_fkey
  foreign key (source_snapshot_id, user_id, canvas_connection_id, course_id)
  references public.reviewer_source_snapshots (
    id,
    user_id,
    canvas_connection_id,
    course_id
  )
  on delete cascade;

create index if not exists reviewer_source_snapshot_items_snapshot_context_idx
  on public.reviewer_source_snapshot_items (
    source_snapshot_id,
    user_id,
    canvas_connection_id,
    course_id
  );
