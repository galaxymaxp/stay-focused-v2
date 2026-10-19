-- FILE ONLY: owner applies during rollout, after profile_avatars.
alter table public.user_profiles
  add column orb_color text null,
  add column orb_color_updated_at timestamptz null,
  add constraint user_profiles_orb_color_key
    check (orb_color in ('pearl', 'gold', 'green', 'violet', 'orange'));

-- Existing RLS and service-only writes remain in force. No cleanup-path grant.
grant select (user_id, avatar_path, avatar_updated_at, orb_color)
  on public.user_profiles to authenticated;

-- Timestamp the actual row write, including conflicting upserts, in DB time.
create function public.stamp_profile_orb_color_v1()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  new.orb_color_updated_at := clock_timestamp();
  return new;
end;
$$;
revoke all on function public.stamp_profile_orb_color_v1() from public, anon, authenticated;
grant execute on function public.stamp_profile_orb_color_v1() to service_role;
create trigger user_profiles_stamp_orb_color
  before insert or update of orb_color on public.user_profiles
  for each row execute function public.stamp_profile_orb_color_v1();
