-- Matching uses existing JSONB tables. Replace only choice-specific RPC logic.
-- No table, column, RLS or legacy answer changes. All functions remain service-only.
begin;

create or replace function public.complete_quiz_processing_job(p_job_id uuid,p_worker_id text,p_result_type text,p_payload jsonb,p_metrics jsonb default '{}')
returns setof public.processing_jobs language plpgsql security definer set search_path='' as $$
declare j public.processing_jobs%rowtype; s public.processing_job_sources%rowtype; qid uuid; rid uuid; public_questions jsonb; item jsonb;
begin
 select * into j from public.processing_jobs where id=p_job_id for update;
 if not found or j.job_type<>'quiz_generation' or p_result_type<>'quiz_generation' or j.status<>'running' or j.lease_owner is distinct from p_worker_id or j.lease_expires_at is null or j.lease_expires_at<=now() then raise exception 'processing_job_completion_rejected'; end if;
 select * into strict s from public.processing_job_sources where id=j.source_snapshot_id and user_id=j.user_id;
 if p_payload->>'courseId' is distinct from s.metadata->>'courseId' or p_payload->>'reviewerId' is distinct from s.metadata->>'reviewerId' or jsonb_array_length(p_payload->'questions') is distinct from (s.metadata->'quizInput'->>'questionCount')::int then raise exception 'quiz_generation_failed'; end if;
 -- Matching public JSON must be independently safe even if a worker is faulty.
 for item in select value from jsonb_array_elements(p_payload->'questions') loop
  if item->>'type' not in ('single_select','multi_select','true_false','matching') then raise exception 'quiz_generation_failed'; end if;
  if item->>'type'='matching' then
   if jsonb_typeof(item->'leftItems') is distinct from 'array' or jsonb_typeof(item->'rightItems') is distinct from 'array' or jsonb_typeof(item->'correctPairs') is distinct from 'array' then raise exception 'quiz_generation_failed'; end if;
   if jsonb_array_length(item->'leftItems') not between 2 and 6 or jsonb_array_length(item->'rightItems')<>jsonb_array_length(item->'leftItems') or jsonb_array_length(item->'correctPairs')<>jsonb_array_length(item->'leftItems') then raise exception 'quiz_generation_failed'; end if;
   if exists(select 1 from jsonb_array_elements((item->'leftItems')||(item->'rightItems')) i where jsonb_typeof(i) is distinct from 'object' or jsonb_typeof(i->'id') is distinct from 'string' or coalesce(i->>'id','') !~ '^[a-zA-Z0-9_-]{1,30}$' or jsonb_typeof(i->'label') is distinct from 'string' or length(btrim(coalesce(i->>'label',''))) not between 1 and 1000 or i->>'label'=i->>'id') then raise exception 'quiz_generation_failed'; end if;
   if (select count(distinct i->>'id') from jsonb_array_elements((item->'leftItems')||(item->'rightItems')) i)<>2*jsonb_array_length(item->'leftItems') or (select count(distinct lower(btrim(i->>'label'))) from jsonb_array_elements(item->'leftItems') i)<>jsonb_array_length(item->'leftItems') or (select count(distinct lower(btrim(i->>'label'))) from jsonb_array_elements(item->'rightItems') i)<>jsonb_array_length(item->'rightItems') then raise exception 'quiz_generation_failed'; end if;
   if exists(select 1 from jsonb_array_elements(item->'correctPairs') p where jsonb_typeof(p) is distinct from 'object' or not exists(select 1 from jsonb_array_elements(item->'leftItems') l where l->>'id'=p->>'leftItemId') or not exists(select 1 from jsonb_array_elements(item->'rightItems') r where r->>'id'=p->>'rightItemId')) or (select count(distinct p->>'leftItemId') from jsonb_array_elements(item->'correctPairs') p)<>jsonb_array_length(item->'leftItems') or (select count(distinct p->>'rightItemId') from jsonb_array_elements(item->'correctPairs') p)<>jsonb_array_length(item->'rightItems') then raise exception 'quiz_generation_failed'; end if;
  end if;
 end loop;
 -- Build the public projection here as well: a faulty worker cannot copy a key
 -- or hidden evidence field into owner-readable JSON.
 select jsonb_agg(case when q->>'type'='matching' then
  jsonb_build_object('id',q->'id','type','matching','prompt',q->'prompt','difficulty',q->'difficulty','selectionInstruction','Match each item to one answer.',
   'leftItems',(select jsonb_agg(jsonb_build_object('id',i->'id','label',i->'label') order by ordinal) from jsonb_array_elements(q->'leftItems') with ordinality as t(i,ordinal)),
   'rightItems',(select jsonb_agg(jsonb_build_object('id',i->'id','label',i->'label') order by ordinal) from jsonb_array_elements(q->'rightItems') with ordinality as t(i,ordinal)))
  else jsonb_build_object('id',q->'id','type',q->'type','prompt',q->'prompt','options',
   (select jsonb_agg(jsonb_build_object('id',o->'id','text',o->'text')) from jsonb_array_elements(q->'options') o),
   'difficulty',q->'difficulty','selectionInstruction',case when q->>'type'='multi_select' then 'Select all correct answers.' else 'Choose one answer.' end) end order by ordinal)
 into public_questions from jsonb_array_elements(p_payload->'questions') with ordinality as t(q,ordinal);
 insert into public.quizzes(user_id,course_id,reviewer_id,generation_id,title,source_material_ids,question_count,difficulty,questions)
 values(j.user_id,(s.metadata->>'courseId')::uuid,(s.metadata->>'reviewerId')::uuid,j.id,p_payload->>'title',p_payload->'materialIds',(s.metadata->'quizInput'->>'questionCount')::int,s.metadata->'quizInput'->>'difficulty',public_questions) returning id into qid;
 insert into public.quiz_keys values(qid,j.user_id,p_payload->'questions',p_payload->'provenance');
 insert into public.processing_job_results(job_id,user_id,source_snapshot_id,result_type,payload,metrics)
 values(j.id,j.user_id,j.source_snapshot_id,'quiz_generation',jsonb_build_object('quizId',qid),p_metrics) returning id into rid;
 update public.processing_jobs set status='succeeded',stage='storing_result',status_message='Complete',result_id=rid,completed_at=now(),updated_at=now(),lease_owner=null,lease_expires_at=null,heartbeat_at=null where id=j.id returning * into j;
 return next j;
end $$;

create or replace function public.save_quiz_answer(p_user_id uuid,p_attempt_id uuid,p_question_id text,p_selected jsonb,p_finalize boolean)
returns setof public.quiz_attempts language plpgsql security definer set search_path='' as $$
declare a public.quiz_attempts%rowtype; q jsonb; old_answer jsonb; selected jsonb; answer jsonb;
begin
 select * into a from public.quiz_attempts where id=p_attempt_id and user_id=p_user_id for update;
 if not found then raise exception 'quiz_attempt_not_found'; end if;
 if a.status<>'in_progress' then raise exception 'quiz_attempt_completed'; end if;
 select value into q from public.quiz_keys k,jsonb_array_elements(k.questions) where k.quiz_id=a.quiz_id and k.user_id=p_user_id and value->>'id'=p_question_id;
 if q is null then raise exception 'quiz_question_not_found'; end if;
 select value into old_answer from jsonb_array_elements(a.answers) where value->>'questionId'=p_question_id;
 if old_answer->>'finalizedAt' is not null then raise exception 'quiz_answer_already_finalized'; end if;
 if q->>'type'='matching' then
  if p_finalize is null or jsonb_typeof(p_selected) is distinct from 'object' or p_selected->>'type' is distinct from 'matching' then raise exception 'quiz_answer_invalid'; end if;
  if exists(select 1 from jsonb_object_keys(p_selected) k where k not in ('type','pairs')) or jsonb_typeof(p_selected->'pairs') is distinct from 'array' then raise exception 'quiz_answer_invalid'; end if;
  selected=p_selected->'pairs';
  if jsonb_array_length(selected)>6 or (p_finalize and jsonb_array_length(selected)<>jsonb_array_length(q->'leftItems')) then raise exception 'quiz_answer_invalid'; end if;
  if exists(select 1 from jsonb_array_elements(selected) p where jsonb_typeof(p) is distinct from 'object') then raise exception 'quiz_answer_invalid'; end if;
  if exists(select 1 from jsonb_array_elements(selected) p where (select count(*) from jsonb_object_keys(p))<>2 or jsonb_typeof(p->'leftItemId') is distinct from 'string' or jsonb_typeof(p->'rightItemId') is distinct from 'string' or not exists(select 1 from jsonb_array_elements(q->'leftItems') i where i->>'id'=p->>'leftItemId') or not exists(select 1 from jsonb_array_elements(q->'rightItems') i where i->>'id'=p->>'rightItemId')) then raise exception 'quiz_answer_invalid'; end if;
  if (select count(distinct p->>'leftItemId') from jsonb_array_elements(selected) p)<>jsonb_array_length(selected) or (select count(distinct p->>'rightItemId') from jsonb_array_elements(selected) p)<>jsonb_array_length(selected) then raise exception 'quiz_answer_invalid'; end if;
  select coalesce(jsonb_agg(value order by value->>'leftItemId'),'[]'::jsonb) into selected from jsonb_array_elements(selected);
  answer=jsonb_build_object('questionId',p_question_id,'type','matching','pairs',selected,'finalizedAt',case when p_finalize then to_jsonb(now()) else 'null'::jsonb end);
 else
 if p_finalize is null or p_selected is null or jsonb_typeof(p_selected)<>'array' or jsonb_array_length(p_selected)>6 or (p_finalize and jsonb_array_length(p_selected)=0) then raise exception 'quiz_answer_invalid'; end if;
 if exists(select 1 from jsonb_array_elements(p_selected) v where jsonb_typeof(v)<>'string') then raise exception 'quiz_answer_invalid'; end if;
 select coalesce(jsonb_agg(v order by v),'[]') into selected from (select distinct value v from jsonb_array_elements(p_selected)) d;
 if jsonb_array_length(selected)<>jsonb_array_length(p_selected) or (q->>'type'<>'multi_select' and jsonb_array_length(selected)>1) or exists(select 1 from jsonb_array_elements_text(selected) v where not exists(select 1 from jsonb_array_elements(q->'options') o where o->>'id'=v)) then raise exception 'quiz_answer_invalid'; end if;
 answer=jsonb_build_object('questionId',p_question_id,'selectedOptionIds',selected,'finalizedAt',case when p_finalize then to_jsonb(now()) else 'null'::jsonb end);
 end if;
 update public.quiz_attempts set answers=(select coalesce(jsonb_agg(value),'[]') from jsonb_array_elements(a.answers) where value->>'questionId'<>p_question_id)||jsonb_build_array(answer) where id=a.id returning * into a;
 return next a;
end $$;

create or replace function public.complete_quiz_attempt(p_user_id uuid,p_attempt_id uuid,p_abandon boolean default false)
returns setof public.quiz_attempts language plpgsql security definer set search_path='' as $$
declare a public.quiz_attempts%rowtype; n int; correct int;
begin
 select * into a from public.quiz_attempts where id=p_attempt_id and user_id=p_user_id for update;
 if not found then raise exception 'quiz_attempt_not_found'; end if;
 if a.status='completed' and not p_abandon then return next a;return; end if;
 if a.status<>'in_progress' then raise exception 'quiz_attempt_completed'; end if;
 if p_abandon then update public.quiz_attempts set status='abandoned' where id=a.id returning * into a;return next a;return;end if;
 select question_count into strict n from public.quizzes where id=a.quiz_id and user_id=p_user_id;
 if (select count(*) from jsonb_array_elements(a.answers) where value->>'finalizedAt' is not null)<>n then raise exception 'quiz_result_unavailable'; end if;
 select count(*) into correct from public.quiz_keys k,jsonb_array_elements(k.questions) q,jsonb_array_elements(a.answers) ans
 where k.quiz_id=a.quiz_id and k.user_id=p_user_id and q->>'id'=ans->>'questionId'
 and case when q->>'type'='matching' then
  (select jsonb_agg(jsonb_build_array(p->>'leftItemId',p->>'rightItemId') order by p->>'leftItemId') from jsonb_array_elements(q->'correctPairs') p)
  =(select jsonb_agg(jsonb_build_array(p->>'leftItemId',p->>'rightItemId') order by p->>'leftItemId') from jsonb_array_elements(ans->'pairs') p)
 else (select jsonb_agg(value order by value) from jsonb_array_elements(q->'correctOptionIds'))=ans->'selectedOptionIds' end;
 update public.quiz_attempts set status='completed',completed_at=now(),percentage=round(100.0*correct/n,2) where id=a.id returning * into a;
 return next a;
end $$;

revoke all on function public.complete_quiz_processing_job(uuid,text,text,jsonb,jsonb),public.save_quiz_answer(uuid,uuid,text,jsonb,boolean),public.complete_quiz_attempt(uuid,uuid,boolean) from public,anon,authenticated;
grant execute on function public.complete_quiz_processing_job(uuid,text,text,jsonb,jsonb),public.save_quiz_answer(uuid,uuid,text,jsonb,boolean),public.complete_quiz_attempt(uuid,uuid,boolean) to service_role;

commit;
