-- B37.1: navigation and assisted practice belong to an attempt, never the quiz artifact.
alter table public.quiz_attempts add column study_state jsonb not null default '{"currentQuestion":0,"skipped":[],"revealed":[],"assisted":[]}'::jsonb
  check (jsonb_typeof(study_state) = 'object');
alter table public.quiz_attempts add column updated_at timestamptz not null default now();

create function public.update_quiz_attempt_study_state(
  p_user_id uuid, p_attempt_id uuid, p_action text, p_question_id text, p_position integer
)
returns setof public.quiz_attempts language plpgsql security definer set search_path = '' as $$
declare a public.quiz_attempts%rowtype; n integer; ids jsonb; state jsonb;
begin
  select * into a from public.quiz_attempts where id = p_attempt_id and user_id = p_user_id for update;
  if not found then raise exception 'quiz_attempt_not_found'; end if;
  if a.status <> 'in_progress' then raise exception 'quiz_attempt_completed'; end if;
  select question_count into n from public.quizzes where id = a.quiz_id and user_id = p_user_id;
  if p_position is not null and (p_position < 0 or p_position >= n) then raise exception 'quiz_answer_invalid'; end if;
  if p_action not in ('navigate','skip','reveal') then raise exception 'quiz_answer_invalid'; end if;
  if p_action <> 'navigate' and not exists (
    select 1 from public.quiz_keys k, jsonb_array_elements(k.questions) q
    where k.quiz_id = a.quiz_id and k.user_id = p_user_id and q->>'id' = p_question_id
  ) then raise exception 'quiz_question_not_found'; end if;
  state = a.study_state;
  if p_position is not null then state = jsonb_set(state, '{currentQuestion}', to_jsonb(p_position)); end if;
  if p_action in ('skip','reveal') then
    -- The property name for a skip is plural; never infer it from client JSON.
    if p_action = 'skip' then
      select coalesce(jsonb_agg(distinct value), '[]'::jsonb) into ids
      from (select value from jsonb_array_elements_text(coalesce(state->'skipped','[]'::jsonb))
            union select p_question_id) s;
      state = jsonb_set(state, '{skipped}', ids);
    else
      select coalesce(jsonb_agg(distinct value), '[]'::jsonb) into ids
      from (select value from jsonb_array_elements_text(coalesce(state->'revealed','[]'::jsonb))
            union select p_question_id) s;
      state = jsonb_set(state, '{revealed}', ids);
      if not exists (select 1 from jsonb_array_elements(a.answers) answer
        where answer->>'questionId' = p_question_id and answer->>'finalizedAt' is not null) then
        select coalesce(jsonb_agg(distinct value), '[]'::jsonb) into ids
        from (select value from jsonb_array_elements_text(coalesce(state->'assisted','[]'::jsonb))
              union select p_question_id) s;
        state = jsonb_set(state, '{assisted}', ids);
      end if;
    end if;
  end if;
  update public.quiz_attempts set study_state = state, updated_at = now() where id = a.id returning * into a;
  return next a;
end $$;

create or replace function public.complete_quiz_attempt(p_user_id uuid,p_attempt_id uuid,p_abandon boolean default false)
returns setof public.quiz_attempts language plpgsql security definer set search_path = '' as $$
declare a public.quiz_attempts%rowtype; n int; correct int;
begin
  select * into a from public.quiz_attempts where id = p_attempt_id and user_id = p_user_id for update;
  if not found then raise exception 'quiz_attempt_not_found'; end if;
  if a.status = 'completed' and not p_abandon then return next a; return; end if;
  if a.status <> 'in_progress' then raise exception 'quiz_attempt_completed'; end if;
  if p_abandon then update public.quiz_attempts set status = 'abandoned', updated_at = now() where id = a.id returning * into a; return next a; return; end if;
  select question_count into n from public.quizzes where id = a.quiz_id and user_id = p_user_id;
  select count(*) into correct from public.quiz_keys k, jsonb_array_elements(k.questions) q,
    jsonb_array_elements(a.answers) ans
  where k.quiz_id = a.quiz_id and k.user_id = p_user_id and q->>'id' = ans->>'questionId'
    and ans->>'finalizedAt' is not null
    and not (coalesce(a.study_state->'assisted','[]'::jsonb) ? (q->>'id'))
    and (select jsonb_agg(value order by value) from jsonb_array_elements(q->'correctOptionIds')) = ans->'selectedOptionIds';
  update public.quiz_attempts set status = 'completed', completed_at = now(), updated_at = now(),
    percentage = round(100.0 * correct / n, 2) where id = a.id returning * into a;
  return next a;
end $$;

revoke all on function public.update_quiz_attempt_study_state(uuid,uuid,text,text,integer) from public, anon, authenticated;
grant execute on function public.update_quiz_attempt_study_state(uuid,uuid,text,text,integer) to service_role;
