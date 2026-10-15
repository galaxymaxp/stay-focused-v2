-- SP2: summary-only read contracts. No source text, question bodies, provider
-- metadata, prompts or private storage paths cross these views.
-- The estimate mirrors packages/shared/src/reviewer-estimate.ts; malformed
-- persisted reviewers have a NULL estimate, never a failed Library read.
create function public.experience_reviewer_minutes_v1(payload jsonb)
returns integer language plpgsql immutable security invoker set search_path = '' as $$
declare
  reviewer jsonb; section jsonb; item jsonb; core jsonb; point jsonb; evidence jsonb;
  prose text; words integer := 0; points integer := 0; sections integer;
begin
  reviewer := case when payload ? 'reviewer' then payload->'reviewer' else payload end;
  if jsonb_typeof(reviewer) is distinct from 'object' or jsonb_typeof(reviewer->'sections') is distinct from 'array' then return null; end if;
  sections := jsonb_array_length(reviewer->'sections');
  if sections = 0 then return null; end if;
  for section in select value from jsonb_array_elements(reviewer->'sections') loop
    if jsonb_typeof(section) is distinct from 'object' or jsonb_typeof(section->'items') is distinct from 'array' then return null; end if;
    for item in select value from jsonb_array_elements(section->'items') loop
      core := item->'sourceCore';
      if jsonb_typeof(item) is distinct from 'object' or jsonb_typeof(core) is distinct from 'object'
        or jsonb_typeof(core->'explanation') is distinct from 'string' or jsonb_typeof(core->'keyPoints') is distinct from 'array' then return null; end if;
      -- ECMAScript whitespace, including NBSP, Unicode spaces and BOM.
      prose := core->>'explanation';
      for point in select value from jsonb_array_elements(core->'keyPoints') loop
        if jsonb_typeof(point) is distinct from 'string' then return null; end if;
        if (point#>>'{}') ~ U&'[^\0009-\000D\0020\00A0\1680\2000-\200A\2028\2029\202F\205F\3000\FEFF]' then points := points + 1; end if;
        prose := prose || ' ' || (point#>>'{}');
      end loop;
      if core ? 'evidence' then
        if jsonb_typeof(core->'evidence') is distinct from 'array' then return null; end if;
        for evidence in select value from jsonb_array_elements(core->'evidence') loop
          if jsonb_typeof(evidence) is distinct from 'object' or jsonb_typeof(evidence->'text') is distinct from 'string' then return null; end if;
          prose := prose || ' ' || (evidence->>'text');
        end loop;
      end if;
      if item ? 'text' then
        if jsonb_typeof(item->'text') is distinct from 'string' then return null; end if;
        prose := prose || ' ' || (item->>'text');
      end if;
      words := words + (select count(*)::integer from regexp_matches(prose, U&'[^\0009-\000D\0020\00A0\1680\2000-\200A\2028\2029\202F\205F\3000\FEFF]+', 'g'));
    end loop;
  end loop;
  if words = 0 then return null; end if;
  return greatest(5, ceil((words / 200.0 + points / 4.0 + sections) / 5.0)::integer * 5);
end $$;
revoke all on function public.experience_reviewer_minutes_v1(jsonb) from public, anon, authenticated;
grant execute on function public.experience_reviewer_minutes_v1(jsonb) to service_role;

-- Immutable versions let us calculate E2 once at insert/backfill, rather than
-- parsing every saved body on every list request. The payload is unchanged.
alter table public.generated_artifact_versions add column review_minutes integer
  generated always as (case when artifact_type = 'reviewer' then public.experience_reviewer_minutes_v1(payload) else null end) stored;

create view public.experience_reviewer_summaries_v1 with (security_invoker = true) as
select a.user_id, 'artifact:' || a.id as id, a.id as artifact_id, v.id as version_id,
  v.generation_job_id, s.id as source_version_id, snap.id as snapshot_id, c.id as course_id,
  a.created_at, a.updated_at,
  case when si.item_count = 1 then si.material_id else null end as source_material_id,
  jsonb_build_object(
    'id', 'artifact:' || a.id, 'type', 'reviewer', 'title', a.safe_title,
    'course', case when c.id is not null then jsonb_build_object('id', c.id, 'code', c.course_code, 'name', c.name) else null end,
    'sourceId', coalesce(snap.id, s.id),
    'sourceType', case when s.metadata->>'sourceType' in ('canvas_file','canvas_page','canvas_mixed','text','camera','local_file') then s.metadata->>'sourceType' else null end,
    'sourceTitle', coalesce(snap.source_title, case when jsonb_typeof(s.metadata->'sourceTitle') = 'string' then s.metadata->>'sourceTitle' end),
    'sourceMaterialId', case when si.item_count = 1 then si.material_id else null end,
    'activityId', null, 'createdAt', a.created_at, 'updatedAt', a.updated_at,
    'lastOpenedAt', null, 'status', 'completed', 'relatedArtifactIds', '[]'::jsonb,
    'origin', case when exists(select 1 from public.canvas_auto_reviewer_candidates candidate
      join public.processing_jobs j on j.id = candidate.processing_job_id and j.user_id = candidate.user_id
      where candidate.user_id = a.user_id and candidate.processing_job_id = v.generation_job_id) then 'automatic' else 'manual' end,
    'reviewMinutes', v.review_minutes
  ) as summary
from public.generated_artifacts a
join public.generated_artifact_versions v on v.id = a.latest_version_id and v.artifact_id = a.id and v.user_id = a.user_id and v.artifact_type = 'reviewer'
join public.source_versions s on s.id = v.source_version_id and s.user_id = a.user_id
left join public.reviewer_source_snapshots snap on snap.id::text = s.metadata->>'reviewerSourceSnapshotId' and snap.user_id = a.user_id
left join public.canvas_courses c on c.id = snap.course_id and c.user_id = a.user_id
left join lateral (
  select count(*) as item_count, min(i.source_type || ':' || i.source_row_id) as material_id
  from public.reviewer_source_snapshot_items i where i.source_snapshot_id = snap.id and i.user_id = a.user_id
) si on true
where a.artifact_type = 'reviewer' and a.deleted_at is null;

-- Ranking excludes only older cards from the same material. Exact detail and
-- quiz references continue to address the older canonical artifact.
create view public.experience_library_v1 with (security_invoker = true) as
with reviewers as (
  select r.*, row_number() over (partition by user_id, course_id, coalesce(source_material_id, coalesce(snapshot_id,source_version_id)::text)
    order by updated_at desc, id collate "C" asc) as position
  from public.experience_reviewer_summaries_v1 r
)
select user_id, id, 'reviewer'::text as artifact_type, course_id, updated_at, summary, position > 1 as superseded
from reviewers
union all
select d.user_id, 'activity:' || d.id, 'activity_output', c.id, d.updated_at,
  jsonb_build_object('id', 'activity:' || d.id, 'type', 'activity_output', 'title', d.content->>'title',
    'course', case when c.id is not null then jsonb_build_object('id',c.id,'code',c.course_code,'name',c.name) else null end,
    'sourceId', 'canvas:' || d.activity_id, 'sourceTitle', d.content->>'title', 'activityId', 'canvas:' || d.activity_id,
    'createdAt', d.created_at, 'updatedAt', d.updated_at, 'lastOpenedAt', null, 'status', 'completed',
    'relatedArtifactIds', '[]'::jsonb, 'reviewMinutes', null), false
from public.activity_drafts d left join public.canvas_courses c on c.id = d.course_id and c.user_id = d.user_id
union all
select q.user_id, 'quiz:' || q.id, 'quiz', c.id, q.updated_at,
  jsonb_build_object('id', 'quiz:' || q.id, 'type', 'quiz', 'title', q.title,
    'course', case when c.id is not null then jsonb_build_object('id',c.id,'code',c.course_code,'name',c.name) else null end,
    'sourceId', case when q.course_id is not null then q.source_material_ids->>0 else q.source_version_id::text end,
    'sourceType', case when s.metadata->>'sourceType' in ('canvas_file','canvas_page','canvas_mixed','text','camera','local_file') then s.metadata->>'sourceType' else null end,
    'sourceTitle', case when jsonb_typeof(s.metadata->'sourceTitle') = 'string' then s.metadata->>'sourceTitle' else null end,
    'activityId', null, 'createdAt', q.created_at, 'updatedAt', q.updated_at, 'lastOpenedAt', null, 'status', 'completed',
    'relatedArtifactIds', case when q.reviewer_artifact_id is not null then jsonb_build_array('artifact:' || q.reviewer_artifact_id) else '[]'::jsonb end,
    'reviewMinutes', null, 'quiz', jsonb_build_object(
      'id',q.id,'title',q.title,'courseId',q.course_id,'reviewerArtifactId',q.reviewer_artifact_id,
      'sourceId',case when q.course_id is not null then q.source_material_ids->>0 else q.source_version_id::text end,
      'sourceMaterialIds',q.source_material_ids,'questionCount',q.question_count,'difficulty',q.difficulty,
      'createdAt',q.created_at,'updatedAt',q.updated_at,'attemptCount',history.attempt_count,
      'latestScore',latest.percentage,'bestScore',history.best_score,
      'activeAttempt',case when active.id is not null then jsonb_build_object('id',active.id,
        'currentQuestion',case when jsonb_typeof(active.study_state->'currentQuestion') = 'number' and (active.study_state->>'currentQuestion') ~ '^-?[0-9]+$'
          then (active.study_state->>'currentQuestion')::numeric else 0 end,
        'answeredCount',(select count(*) from jsonb_array_elements(active.answers) answer where coalesce(answer->>'finalizedAt','') <> ''),
        'skippedCount',case when jsonb_typeof(active.study_state->'skipped') = 'array' then jsonb_array_length(active.study_state->'skipped') else 0 end,
        'revealedCount',case when jsonb_typeof(active.study_state->'revealed') = 'array' then jsonb_array_length(active.study_state->'revealed') else 0 end) else null end)), false
from public.quizzes q
left join public.canvas_courses c on c.id = q.course_id and c.user_id = q.user_id
left join public.source_versions s on s.id = q.source_version_id and s.user_id = q.user_id
left join lateral (select count(*) as attempt_count, max(percentage) filter(where status = 'completed') as best_score
  from public.quiz_attempts a where a.quiz_id = q.id and a.user_id = q.user_id) history on true
left join lateral (select a.percentage from public.quiz_attempts a where a.quiz_id = q.id and a.user_id = q.user_id
  and a.status = 'completed' and a.percentage is not null order by a.completed_at desc, a.id desc limit 1) latest on true
left join lateral (select a.id, a.study_state, a.answers from public.quiz_attempts a where a.quiz_id = q.id and a.user_id = q.user_id
  and a.status = 'in_progress' order by a.started_at desc, a.id desc limit 1) active on true;

create view public.experience_material_reviewers_v1 with (security_invoker = true) as
select distinct on (r.user_id, i.course_id, i.source_type, i.source_row_id)
  r.user_id, i.course_id, i.source_type || ':' || i.source_row_id as material_id, r.artifact_id, r.updated_at
from public.experience_reviewer_summaries_v1 r
join public.reviewer_source_snapshot_items i on i.source_snapshot_id = r.snapshot_id and i.user_id = r.user_id and i.course_id = r.course_id
where i.source_row_id is not null
order by r.user_id, i.course_id, i.source_type, i.source_row_id, r.updated_at desc, r.id collate "C" asc;

revoke all on public.experience_reviewer_summaries_v1, public.experience_library_v1, public.experience_material_reviewers_v1 from public, anon, authenticated;
grant select on public.experience_reviewer_summaries_v1, public.experience_library_v1, public.experience_material_reviewers_v1 to service_role;
