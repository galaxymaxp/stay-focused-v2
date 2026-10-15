-- O3: keep both versions when device edits replace a newer online draft.
alter table public.activity_drafts add column last_offline_edit_id uuid;

create table public.activity_draft_copies (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 draft_id uuid not null references public.activity_drafts(id) on delete cascade,
 content jsonb not null check (jsonb_typeof(content)='object' and octet_length(content::text)<=200000),
 revision integer not null check (revision>0),
 reason text not null check (reason in ('offline_conflict')),
 created_at timestamptz not null default now()
);
create index activity_draft_copies_owner_recent on public.activity_draft_copies(user_id,draft_id,created_at desc);
alter table public.activity_draft_copies enable row level security;
revoke all on public.activity_draft_copies from anon,authenticated;
grant select,delete on public.activity_draft_copies to authenticated;
grant all on public.activity_draft_copies to service_role;
create policy activity_draft_copies_select on public.activity_draft_copies for select to authenticated using(user_id=(select auth.uid()));
create policy activity_draft_copies_delete on public.activity_draft_copies for delete to authenticated using(user_id=(select auth.uid()));

-- Preserve every protected field and the +1 revision rule. The new marker can
-- change only through privileged writes (no authenticated column grant).
create or replace function public.protect_activity_draft() returns trigger language plpgsql set search_path='' as $$
begin
 if (new.user_id,new.activity_id,new.course_id,new.canvas_connection_id,new.generation_id,new.activity_type,new.specification,new.sources,new.warnings,new.created_at) is distinct from (old.user_id,old.activity_id,old.course_id,old.canvas_connection_id,old.generation_id,old.activity_type,old.specification,old.sources,old.warnings,old.created_at) then
  raise exception 'activity_draft_conflict';
 end if;
 if new.revision<>old.revision+1 then raise exception 'activity_draft_conflict'; end if;
 new.updated_at=now(); new.status='edited'; return new;
end $$;

create function public.save_offline_activity_draft(p_draft_id uuid,p_base_revision integer,p_content jsonb,p_client_edit_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare owner uuid := auth.uid(); d public.activity_drafts%rowtype; copy_id uuid; conflicted boolean;
begin
 if owner is null then raise exception 'activity_draft_not_found'; end if;
 select * into d from public.activity_drafts where id=p_draft_id and user_id=owner for update;
 if not found then raise exception 'activity_draft_not_found'; end if;
 if p_client_edit_id is null or p_base_revision is null or p_base_revision<1 or p_content is null or jsonb_typeof(p_content)<>'object' or octet_length(p_content::text)>200000 then raise exception 'invalid_request'; end if;
 if d.last_offline_edit_id=p_client_edit_id then
  return jsonb_build_object('draft',to_jsonb(d),'conflict',false,'copyId',null,'replayed',true);
 end if;
 conflicted := d.revision<>p_base_revision;
 if conflicted then
  insert into public.activity_draft_copies(user_id,draft_id,content,revision,reason)
  values(owner,d.id,d.content,d.revision,'offline_conflict') returning id into copy_id;
 end if;
 update public.activity_drafts set content=p_content,revision=revision+1,last_offline_edit_id=p_client_edit_id where id=d.id returning * into d;
 delete from public.activity_draft_copies where id in (
  select id from public.activity_draft_copies where user_id=owner and draft_id=d.id
  order by created_at desc,revision desc,id desc offset 5
 );
 return jsonb_build_object('draft',to_jsonb(d),'conflict',conflicted,'copyId',copy_id,'replayed',false);
end $$;
revoke all on function public.save_offline_activity_draft(uuid,integer,jsonb,uuid) from public,anon;
grant execute on function public.save_offline_activity_draft(uuid,integer,jsonb,uuid) to authenticated;
