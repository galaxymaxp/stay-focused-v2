alter table public.reviewer_source_snapshot_items
  drop constraint if exists reviewer_source_snapshot_items_page_count_limit;

alter table public.reviewer_source_snapshot_items
  add constraint reviewer_source_snapshot_items_page_count_limit
  check (page_count is null or page_count between 1 and 40)
  not valid;

alter table public.reviewer_source_snapshot_items
  validate constraint reviewer_source_snapshot_items_page_count_limit;
