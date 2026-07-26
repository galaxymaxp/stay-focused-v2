update storage.buckets
set
  file_size_limit = 10485760,
  allowed_mime_types = array['application/pdf', 'image/png', 'image/jpeg']
where id = 'processing-job-sources';

create or replace function public.processing_upload_is_authorized(
  p_object_name text
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.processing_upload_intents intent
    where intent.user_id = (select auth.uid())
      and intent.storage_bucket = 'processing-job-sources'
      and intent.storage_object_path = p_object_name
      and intent.status = 'pending'
      and intent.expires_at > now()
  );
$$;

revoke all on function public.processing_upload_is_authorized(text)
  from public, anon, authenticated;
grant execute on function public.processing_upload_is_authorized(text)
  to authenticated;

drop policy if exists processing_upload_intent_insert
  on storage.objects;
create policy processing_upload_intent_insert
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'processing-job-sources'
    and public.processing_upload_is_authorized(name)
  );
