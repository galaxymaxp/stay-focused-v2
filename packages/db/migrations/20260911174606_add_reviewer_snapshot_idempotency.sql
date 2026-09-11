-- A durable Reviewer result owns one immutable Canvas source snapshot. Make
-- automatic persistence replay-safe so a mobile process can die after the
-- server commit and retry the same logical save without creating a duplicate.
-- PostgreSQL permits multiple NULL values, so non-Canvas reviewers keep their
-- existing insert behavior.
with ranked_canvas_saves as (
  select
    id,
    row_number() over (
      partition by user_id, source_snapshot_id
      order by updated_at desc, created_at desc, id desc
    ) as duplicate_rank
  from public.reviewers
  where source_snapshot_id is not null
)
delete from public.reviewers reviewer
using ranked_canvas_saves ranked
where reviewer.id = ranked.id
  and ranked.duplicate_rank > 1;

create unique index if not exists reviewers_owner_source_snapshot_unique
  on public.reviewers (user_id, source_snapshot_id);
