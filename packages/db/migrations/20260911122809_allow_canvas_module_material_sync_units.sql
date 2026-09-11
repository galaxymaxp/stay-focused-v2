-- B21 module-first discovery schedules exact resource resolver units after
-- listing module items. Keep the database allowlist aligned with the runtime
-- CanvasSyncUnitKind union so discovered units can be persisted atomically.

alter table public.canvas_sync_job_units
  drop constraint if exists canvas_sync_job_units_kind_allowed;

alter table public.canvas_sync_job_units
  add constraint canvas_sync_job_units_kind_allowed
  check (
    unit_kind in (
      'modules_page',
      'module_items_page',
      'module_page_detail',
      'module_assignment',
      'module_file',
      'pages_page',
      'page_detail',
      'page_detail_reuse',
      'assignment_groups_page',
      'assignments_page',
      'announcements_page',
      'files_page',
      'grade_assignments_page',
      'submissions_page',
      'grade_summary_page'
    )
  ) not valid;

alter table public.canvas_sync_job_units
  validate constraint canvas_sync_job_units_kind_allowed;
