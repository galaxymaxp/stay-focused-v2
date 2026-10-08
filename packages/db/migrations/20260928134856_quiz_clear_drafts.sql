-- B37.1: allow an unfinished text/correction draft to be cleared and replayed.
-- B37.1 matching blocks: stable pair IDs and one-to-one selections.
create or replace function public.save_quiz_answer(p_user_id uuid,p_attempt_id uuid,p_question_id text,p_selected jsonb,p_finalize boolean)
returns setof public.quiz_attempts language plpgsql security definer set search_path='' as $$
declare a public.quiz_attempts%rowtype; q jsonb; old_answer jsonb; selected jsonb; answer jsonb; pair_count integer;
begin
 select * into a from public.quiz_attempts where id=p_attempt_id and user_id=p_user_id for update;
 if not found then raise exception 'quiz_attempt_not_found'; end if;
 if a.status<>'in_progress' then raise exception 'quiz_attempt_completed'; end if;
 select value into q from public.quiz_keys k,jsonb_array_elements(k.questions) where k.quiz_id=a.quiz_id and k.user_id=p_user_id and value->>'id'=p_question_id;
 if q is null then raise exception 'quiz_question_not_found'; end if;
 select value into old_answer from jsonb_array_elements(a.answers) where value->>'questionId'=p_question_id;
 if old_answer->>'finalizedAt' is not null then raise exception 'quiz_answer_already_finalized'; end if;
 if p_finalize is null or p_selected is null or jsonb_typeof(p_selected)<>'array' or jsonb_array_length(p_selected)>6 or (p_finalize and jsonb_array_length(p_selected)=0) then raise exception 'quiz_answer_invalid'; end if;
 if exists(select 1 from jsonb_array_elements(p_selected) v where jsonb_typeof(v)<>'string') then raise exception 'quiz_answer_invalid'; end if;
 select coalesce(jsonb_agg(v order by v),'[]') into selected from (select distinct value v from jsonb_array_elements(p_selected)) d;
 if jsonb_array_length(selected)<>jsonb_array_length(p_selected) or exists(select 1 from jsonb_array_elements_text(selected) v where length(v)>200 or length(trim(v))=0) then raise exception 'quiz_answer_invalid'; end if;
 pair_count = case when jsonb_typeof(q->'matchingPairs')='array' then jsonb_array_length(q->'matchingPairs') else 0 end;
 if pair_count >= 3 then
   if (p_finalize and jsonb_array_length(selected)<>pair_count)
     or (select count(distinct split_part(v,':',1)) from jsonb_array_elements_text(selected) v)<>jsonb_array_length(selected)
     or (select count(distinct split_part(v,':',2)) from jsonb_array_elements_text(selected) v)<>jsonb_array_length(selected)
     or exists(select 1 from jsonb_array_elements_text(selected) v where
       not exists(select 1 from jsonb_array_elements(q->'matchingPairs') p where p->>'id'=split_part(v,':',1))
       or not exists(select 1 from jsonb_array_elements(q->'options') o where o->>'id'=split_part(v,':',2))
       or v<>split_part(v,':',1)||':'||split_part(v,':',2))
   then raise exception 'quiz_answer_invalid'; end if;
 elsif q->>'type'='identification' then
   if jsonb_array_length(selected) not in (0,1) then raise exception 'quiz_answer_invalid'; end if;
 elsif q->>'type'='modified_true_false' then
   if jsonb_array_length(selected)>0 and (jsonb_array_length(selected) not between 1 and 2
     or (select count(*) from jsonb_array_elements_text(selected) v where exists(select 1 from jsonb_array_elements(q->'options') o where o->>'id'=v))<>1
     or (jsonb_array_length(selected)=2 and not exists(select 1 from jsonb_array_elements_text(selected) v join lateral jsonb_array_elements(q->'options') o on o->>'id'=v where lower(o->>'text')='false'))
   ) then raise exception 'quiz_answer_invalid'; end if;
 elsif (q->>'type'<>'multi_select' and jsonb_array_length(selected)>1)
   or exists(select 1 from jsonb_array_elements_text(selected) v where not exists(select 1 from jsonb_array_elements(q->'options') o where o->>'id'=v)) then
   raise exception 'quiz_answer_invalid';
 end if;
 answer=jsonb_build_object('questionId',p_question_id,'selectedOptionIds',selected,'finalizedAt',case when p_finalize then to_jsonb(now()) else 'null'::jsonb end);
 update public.quiz_attempts set answers=(select coalesce(jsonb_agg(value),'[]') from jsonb_array_elements(a.answers) where value->>'questionId'<>p_question_id)||jsonb_build_array(answer),updated_at=now() where id=a.id returning * into a;
 return next a;
end $$;

revoke all on function public.save_quiz_answer(uuid,uuid,text,jsonb,boolean) from public, anon, authenticated;
grant execute on function public.save_quiz_answer(uuid,uuid,text,jsonb,boolean) to service_role;
