-- FILE ONLY: owner applies during rollout. Private objects are API-managed.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('profile-avatars', 'profile-avatars', false, 2097152,
        array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Match the existing private source bucket's restrictive denial. This also
-- denies access if an unrelated permissive Storage policy exists.
create policy profile_avatars_clients_no_access on storage.objects
  as restrictive for all to anon, authenticated
  using (bucket_id <> 'profile-avatars')
  with check (bucket_id <> 'profile-avatars');

create table public.user_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  avatar_path text,
  avatar_updated_at timestamptz,
  -- Durable retirement list: a failed Storage delete is retried by the next request.
  avatar_cleanup_paths text[] not null default '{}',
  constraint user_profiles_avatar_owner check (
    avatar_path is null or avatar_path ~ ('^' || user_id::text || '/avatar-[0-9a-f-]{36}\.png$'))
);
alter table public.user_profiles enable row level security;
revoke all on public.user_profiles from public, anon, authenticated;
grant select (user_id, avatar_path, avatar_updated_at) on public.user_profiles to authenticated;
grant all on public.user_profiles to service_role;
create policy user_profiles_select_own on public.user_profiles for select to authenticated
  using ((select auth.uid()) = user_id);
-- No Storage policy for clients: upload/sign/read/delete all use the authenticated API
-- and the server-only service client, as with source snapshots.

-- Compare-and-swap prevents overlapping devices from retiring a newer avatar.
create function public.commit_profile_avatar_v1(p_user_id uuid, p_expected_path text, p_path text)
returns boolean language plpgsql security invoker set search_path = '' as $$
declare changed integer;
begin
  insert into public.user_profiles(user_id) values (p_user_id) on conflict do nothing;
  update public.user_profiles set avatar_path = p_path, avatar_updated_at = clock_timestamp(),
    avatar_cleanup_paths = case when avatar_path is not null then
      array_append(avatar_cleanup_paths, avatar_path) else avatar_cleanup_paths end
    where user_id = p_user_id and avatar_path is not distinct from p_expected_path;
  get diagnostics changed = row_count;
  return changed = 1;
end;
$$;
revoke all on function public.commit_profile_avatar_v1(uuid,text,text) from public, anon, authenticated;
grant execute on function public.commit_profile_avatar_v1(uuid,text,text) to service_role;

create function public.finish_profile_avatar_cleanup_v1(p_user_id uuid, p_paths text[])
returns void language sql security invoker set search_path = '' as $$
  update public.user_profiles set avatar_cleanup_paths = array(
    select path from unnest(avatar_cleanup_paths) path where not (path = any(p_paths)))
    where user_id = p_user_id;
$$;
revoke all on function public.finish_profile_avatar_cleanup_v1(uuid,text[]) from public, anon, authenticated;
grant execute on function public.finish_profile_avatar_cleanup_v1(uuid,text[]) to service_role;
