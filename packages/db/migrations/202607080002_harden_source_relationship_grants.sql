revoke all on table public.reviewer_source_snapshot_item_relationships
  from service_role;

grant select, insert, delete on table public.reviewer_source_snapshot_item_relationships
  to service_role;
