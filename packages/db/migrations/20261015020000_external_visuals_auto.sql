-- VL3.1: visuals load automatically on the website, so the per-owner daily cap rises
-- from 20 to 300 section searches. Each search is one Commons query set plus one vision call.
create or replace function public.reserve_section_external_visual_v1(p_user_id uuid,p_artifact_id uuid,p_version_id uuid,p_section_id text,p_find_another boolean)
returns uuid language plpgsql security invoker set search_path = '' as $$
declare v_attempt integer; v_token uuid;
begin
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_user_id::text, 830));
  if p_section_id !~ '^[a-zA-Z0-9_-]{1,220}$' or not exists (
    select 1 from public.generated_artifacts a join public.generated_artifact_versions v
      on v.id=a.latest_version_id and v.artifact_id=a.id and v.user_id=a.user_id
    where a.id=p_artifact_id and a.user_id=p_user_id and a.deleted_at is null
      and a.artifact_type='reviewer' and v.id=p_version_id
      and exists (select 1 from jsonb_array_elements(coalesce(v.payload->'reviewer',v.payload)->'sections') s where s->>'id'=p_section_id)
  ) then raise exception 'external_visual_not_found'; end if;
  select attempt_count into v_attempt from public.section_external_visuals
    where user_id=p_user_id and artifact_id=p_artifact_id and version_id=p_version_id and section_id=p_section_id;
  if v_attempt is not null and (not p_find_another or v_attempt >= 2) then return null; end if;
  if exists (select 1 from public.section_external_visual_requests where user_id=p_user_id
    and artifact_id=p_artifact_id and version_id=p_version_id and section_id=p_section_id and not released and expires_at>now())
    then raise exception 'external_visual_busy'; end if;
  if (select count(*) from public.section_external_visual_requests where user_id=p_user_id
    and reserved_at>now()-interval '24 hours') >= 300 then raise exception 'external_visual_daily_cap'; end if;
  insert into public.section_external_visual_requests(user_id,artifact_id,version_id,section_id,attempt)
    values(p_user_id,p_artifact_id,p_version_id,p_section_id,coalesce(v_attempt,0)+1) returning token into v_token;
  return v_token;
end $$;
revoke all on function public.reserve_section_external_visual_v1(uuid,uuid,uuid,text,boolean) from public,anon,authenticated;
grant execute on function public.reserve_section_external_visual_v1(uuid,uuid,uuid,text,boolean) to service_role;
