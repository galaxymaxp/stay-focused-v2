create index document_assets_live_storage_path_idx
  on public.document_assets (storage_bucket, storage_object_path)
  where deleted_at is null;
