-- B24.7 additive migration; apply AFTER 20260912100000_activity_maker.sql.
alter table public.processing_jobs drop constraint processing_jobs_type_check;
alter table public.processing_jobs add constraint processing_jobs_type_check check(job_type in ('document_extraction','reviewer_generation','activity_generation','quiz_generation'));
alter table public.processing_job_results drop constraint processing_job_results_type_check;
alter table public.processing_job_results add constraint processing_job_results_type_check check(result_type in ('document_extraction','reviewer_generation','activity_generation','quiz_generation'));
alter table public.processing_jobs drop constraint processing_jobs_stage_matches_type_check;
alter table public.processing_jobs add constraint processing_jobs_stage_matches_type_check check(
 (job_type='document_extraction' and stage in ('accepting_upload','inspecting_document','extracting_native_text','preparing_ocr_chunks','extracting_ocr','verifying_pages','assembling_text','storing_result')) or
 (job_type='reviewer_generation' and stage in ('preparing_source','normalizing_source','detecting_outline','planning_sections','generating_sections','verifying_coverage','retrying_sections','assembling_reviewer','storing_reviewer')) or
 (job_type='activity_generation' and stage in ('preparing_source','generating_sections','storing_result')) or
 (job_type='quiz_generation' and stage in ('preparing_source','planning_sections','generating_sections','verifying_coverage','storing_result')));

create table public.quizzes (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 course_id uuid not null references public.canvas_courses(id) on delete cascade,
 reviewer_id uuid references public.reviewers(id) on delete set null,
 generation_id uuid unique references public.processing_jobs(id) on delete set null,
 title text not null check(length(title) between 1 and 220),
 source_material_ids jsonb not null check(jsonb_typeof(source_material_ids)='array' and jsonb_array_length(source_material_ids) between 1 and 4),
 question_count integer not null check(question_count between 5 and 20),
 difficulty text not null check(difficulty in ('easy','medium','hard','mixed')),
 questions jsonb not null check(jsonb_typeof(questions)='array' and jsonb_array_length(questions)=question_count and octet_length(questions::text)<100000),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(id,user_id)
);
-- Keys, evidence and verification provenance are NEVER accessible via the Data API
-- to either anon or authenticated, including the quiz owner.
create table public.quiz_keys (
 quiz_id uuid primary key, user_id uuid not null,
 questions jsonb not null check(jsonb_typeof(questions)='array' and jsonb_array_length(questions) between 5 and 20 and octet_length(questions::text)<500000),
 provenance jsonb not null check(jsonb_typeof(provenance)='object'),
 foreign key(quiz_id,user_id) references public.quizzes(id,user_id) on delete cascade
);
create table public.quiz_attempts (
 id uuid primary key default gen_random_uuid(), user_id uuid not null, quiz_id uuid not null,
 request_key text not null check(length(request_key) between 8 and 128),
 status text not null default 'in_progress' check(status in ('in_progress','completed','abandoned')),
 answers jsonb not null default '[]' check(jsonb_typeof(answers)='array' and jsonb_array_length(answers)<=20),
 started_at timestamptz not null default now(), completed_at timestamptz, percentage numeric,
 unique(user_id,request_key), foreign key(quiz_id,user_id) references public.quizzes(id,user_id) on delete cascade,
 check((status='completed' and completed_at is not null and percentage between 0 and 100) or (status<>'completed' and completed_at is null and percentage is null))
);
create index quizzes_owner_updated on public.quizzes(user_id,updated_at desc);
create index quizzes_course on public.quizzes(course_id);
create index quizzes_reviewer on public.quizzes(reviewer_id);
create index quiz_attempts_history on public.quiz_attempts(user_id,quiz_id,started_at desc);
create index quiz_keys_owner on public.quiz_keys(user_id);
alter table public.quizzes enable row level security;
alter table public.quiz_keys enable row level security;
alter table public.quiz_attempts enable row level security;
revoke all on public.quizzes,public.quiz_keys,public.quiz_attempts from public,anon,authenticated;
grant select on public.quizzes,public.quiz_attempts to authenticated;
grant all on public.quizzes,public.quiz_keys,public.quiz_attempts to service_role;
create policy quizzes_owner on public.quizzes for select to authenticated using(user_id=(select auth.uid()));
create policy quiz_attempts_owner on public.quiz_attempts for select to authenticated using(user_id=(select auth.uid()));

create function public.check_quiz_ownership() returns trigger language plpgsql set search_path='' as $$
begin
 if not exists(select 1 from public.canvas_courses where id=new.course_id and user_id=new.user_id) or
 (new.reviewer_id is not null and not exists(select 1 from public.reviewers where id=new.reviewer_id and user_id=new.user_id)) or
 (new.generation_id is not null and not exists(select 1 from public.processing_jobs where id=new.generation_id and user_id=new.user_id and job_type='quiz_generation')) then raise exception 'quiz_not_found'; end if;
 return new;
end $$;
create trigger check_quiz_ownership before insert or update on public.quizzes for each row execute function public.check_quiz_ownership();

create function public.create_quiz_processing_job(p_user_id uuid,p_course_id uuid,p_reviewer_id uuid,p_idempotency_key text,p_input jsonb)
returns setof public.processing_jobs language plpgsql security definer set search_path='' as $$
declare j public.processing_jobs%rowtype; sid uuid; fingerprint text; policy public.processing_policy_config%rowtype;
begin
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_user_id::text,927));
 if not exists(select 1 from public.canvas_courses where id=p_course_id and user_id=p_user_id) or
 (p_reviewer_id is not null and not exists(select 1 from public.reviewers where id=p_reviewer_id and user_id=p_user_id)) then raise exception 'quiz_source_unavailable'; end if;
 if jsonb_typeof(p_input)<>'object' or (p_input->>'questionCount')::int not between 5 and 20 or length(p_idempotency_key) not between 8 and 128 then raise exception 'invalid_request'; end if;
 fingerprint=encode(sha256(convert_to(p_input::text,'UTF8')),'hex');
 select * into j from public.processing_jobs where user_id=p_user_id and idempotency_key=p_idempotency_key;
 if found then
  if j.job_type<>'quiz_generation' or j.request_fingerprint<>fingerprint then raise exception 'conflict'; end if;
  return next j; return;
 end if;
 select * into strict policy from public.processing_policy_config where id='default';
 if (select count(*) from public.processing_jobs where user_id=p_user_id and job_type in ('reviewer_generation','activity_generation','quiz_generation') and status='queued')>=policy.max_queued_generation_jobs_per_user or
 (select count(*) from public.processing_jobs where user_id=p_user_id and job_type in ('reviewer_generation','activity_generation','quiz_generation') and created_at>=date_trunc('day',now()))>=policy.max_daily_generation_jobs then raise exception 'rate_limited'; end if;
 insert into public.processing_job_sources(user_id,source_kind,display_name,mime_type,source_text,source_character_count,metadata)
 values(p_user_id,'text','Course quiz','text/plain',p_course_id::text,36,jsonb_build_object('quizInput',p_input,'courseId',p_course_id,'reviewerId',p_reviewer_id)) returning id into sid;
 insert into public.processing_jobs(user_id,job_type,stage,source_snapshot_id,idempotency_key,request_fingerprint,source_metadata,expires_at)
 values(p_user_id,'quiz_generation','preparing_source',sid,p_idempotency_key,fingerprint,jsonb_build_object('displayName','Course quiz','sourceKind','text','mimeType','text/plain'),now()+interval '30 minutes') returning * into j;
 return next j;
end $$;

create function public.complete_quiz_processing_job(p_job_id uuid,p_worker_id text,p_result_type text,p_payload jsonb,p_metrics jsonb default '{}')
returns setof public.processing_jobs language plpgsql security definer set search_path='' as $$
declare j public.processing_jobs%rowtype; s public.processing_job_sources%rowtype; qid uuid; rid uuid; public_questions jsonb;
begin
 select * into j from public.processing_jobs where id=p_job_id for update;
 if not found or j.job_type<>'quiz_generation' or p_result_type<>'quiz_generation' or j.status<>'running' or j.lease_owner is distinct from p_worker_id or j.lease_expires_at is null or j.lease_expires_at<=now() then raise exception 'processing_job_completion_rejected'; end if;
 select * into strict s from public.processing_job_sources where id=j.source_snapshot_id and user_id=j.user_id;
 if p_payload->>'courseId' is distinct from s.metadata->>'courseId' or p_payload->>'reviewerId' is distinct from s.metadata->>'reviewerId' or jsonb_array_length(p_payload->'questions') is distinct from (s.metadata->'quizInput'->>'questionCount')::int then raise exception 'quiz_generation_failed'; end if;
 -- Build the public projection here as well: a faulty worker cannot copy a key
 -- or hidden evidence field into owner-readable JSON.
 select jsonb_agg(jsonb_build_object('id',q->'id','type',q->'type','prompt',q->'prompt','options',
   (select jsonb_agg(jsonb_build_object('id',o->'id','text',o->'text')) from jsonb_array_elements(q->'options') o),
   'difficulty',q->'difficulty','selectionInstruction',case when q->>'type'='multi_select' then 'Select all correct answers.' else 'Choose one answer.' end)) into public_questions from jsonb_array_elements(p_payload->'questions') q;
 insert into public.quizzes(user_id,course_id,reviewer_id,generation_id,title,source_material_ids,question_count,difficulty,questions)
 values(j.user_id,(s.metadata->>'courseId')::uuid,(s.metadata->>'reviewerId')::uuid,j.id,p_payload->>'title',p_payload->'materialIds',(s.metadata->'quizInput'->>'questionCount')::int,s.metadata->'quizInput'->>'difficulty',public_questions) returning id into qid;
 insert into public.quiz_keys values(qid,j.user_id,p_payload->'questions',p_payload->'provenance');
 insert into public.processing_job_results(job_id,user_id,source_snapshot_id,result_type,payload,metrics)
 values(j.id,j.user_id,j.source_snapshot_id,'quiz_generation',jsonb_build_object('quizId',qid),p_metrics) returning id into rid;
 update public.processing_jobs set status='succeeded',stage='storing_result',status_message='Complete',result_id=rid,completed_at=now(),updated_at=now(),lease_owner=null,lease_expires_at=null,heartbeat_at=null where id=j.id returning * into j;
 return next j;
end $$;

create function public.start_quiz_attempt(p_user_id uuid,p_quiz_id uuid,p_request_key text)
returns setof public.quiz_attempts language plpgsql security definer set search_path='' as $$
declare a public.quiz_attempts%rowtype;
begin
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_user_id::text,928));
 if not exists(select 1 from public.quizzes where id=p_quiz_id and user_id=p_user_id) then raise exception 'quiz_not_found'; end if;
 select * into a from public.quiz_attempts where user_id=p_user_id and request_key=p_request_key;
 if found then
  if a.quiz_id<>p_quiz_id then raise exception 'conflict'; end if;
  return next a; return;
 end if;
 insert into public.quiz_attempts(user_id,quiz_id,request_key) values(p_user_id,p_quiz_id,p_request_key) returning * into a;
 return next a;
end $$;

create function public.save_quiz_answer(p_user_id uuid,p_attempt_id uuid,p_question_id text,p_selected jsonb,p_finalize boolean)
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
 if p_finalize is null or p_selected is null or jsonb_typeof(p_selected)<>'array' or jsonb_array_length(p_selected)>6 or (p_finalize and jsonb_array_length(p_selected)=0) then raise exception 'quiz_answer_invalid'; end if;
 if exists(select 1 from jsonb_array_elements(p_selected) v where jsonb_typeof(v)<>'string') then raise exception 'quiz_answer_invalid'; end if;
 select coalesce(jsonb_agg(v order by v),'[]') into selected from (select distinct value v from jsonb_array_elements(p_selected)) d;
 if jsonb_array_length(selected)<>jsonb_array_length(p_selected) or (q->>'type'<>'multi_select' and jsonb_array_length(selected)>1) or exists(select 1 from jsonb_array_elements_text(selected) v where not exists(select 1 from jsonb_array_elements(q->'options') o where o->>'id'=v)) then raise exception 'quiz_answer_invalid'; end if;
 answer=jsonb_build_object('questionId',p_question_id,'selectedOptionIds',selected,'finalizedAt',case when p_finalize then to_jsonb(now()) else 'null'::jsonb end);
 update public.quiz_attempts set answers=(select coalesce(jsonb_agg(value),'[]') from jsonb_array_elements(a.answers) where value->>'questionId'<>p_question_id)||jsonb_build_array(answer) where id=a.id returning * into a;
 return next a;
end $$;

create function public.complete_quiz_attempt(p_user_id uuid,p_attempt_id uuid,p_abandon boolean default false)
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
 and (select jsonb_agg(value order by value) from jsonb_array_elements(q->'correctOptionIds'))=ans->'selectedOptionIds';
 update public.quiz_attempts set status='completed',completed_at=now(),percentage=round(100.0*correct/n,2) where id=a.id returning * into a;
 return next a;
end $$;

revoke all on function public.create_quiz_processing_job(uuid,uuid,uuid,text,jsonb),public.complete_quiz_processing_job(uuid,text,text,jsonb,jsonb),public.start_quiz_attempt(uuid,uuid,text),public.save_quiz_answer(uuid,uuid,text,jsonb,boolean),public.complete_quiz_attempt(uuid,uuid,boolean) from public,anon,authenticated;
grant execute on function public.create_quiz_processing_job(uuid,uuid,uuid,text,jsonb),public.complete_quiz_processing_job(uuid,text,text,jsonb,jsonb),public.start_quiz_attempt(uuid,uuid,text),public.save_quiz_answer(uuid,uuid,text,jsonb,boolean),public.complete_quiz_attempt(uuid,uuid,boolean) to service_role;
