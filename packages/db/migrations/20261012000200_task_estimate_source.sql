-- E1: where a task's estimate came from, so automation never overwrites the student.
alter table public.tasks
  add column estimate_source text not null default 'default'
    check (estimate_source in ('default', 'heuristic', 'ai', 'user')),
  add column estimate_note text null
    check (estimate_note is null or char_length(estimate_note) <= 140),
  add column estimate_fingerprint text null
    check (estimate_fingerprint is null or char_length(estimate_fingerprint) = 64),
  add column estimated_at timestamptz null;

-- Manually created tasks were entered by the student.
update public.tasks set estimate_source = 'user' where source_type <> 'canvas';

create index tasks_estimate_pending_idx
  on public.tasks (user_id)
  where source_type = 'canvas' and estimate_source in ('default', 'heuristic');

create index tasks_estimated_at_idx
  on public.tasks (user_id, estimated_at)
  where estimate_source = 'ai';
