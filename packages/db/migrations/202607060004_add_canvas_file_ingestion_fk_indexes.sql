create index if not exists canvas_files_connection_user_idx
  on public.canvas_files (canvas_connection_id, user_id);

create index if not exists canvas_files_course_owner_fk_idx
  on public.canvas_files (
    course_id,
    user_id,
    canvas_connection_id,
    canvas_course_id
  );

create index if not exists canvas_file_references_file_owner_fk_idx
  on public.canvas_file_references (
    file_id,
    user_id,
    canvas_connection_id,
    course_id
  );

create index if not exists canvas_file_ingestion_results_file_owner_fk_idx
  on public.canvas_file_ingestion_results (
    file_id,
    user_id,
    canvas_connection_id,
    course_id
  );

create index if not exists canvas_file_ingestion_results_user_created_idx
  on public.canvas_file_ingestion_results (user_id, created_at desc);
