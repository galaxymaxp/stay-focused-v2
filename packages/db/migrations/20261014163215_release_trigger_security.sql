-- Harden existing timestamp triggers; their only operation is new.updated_at = now().
alter function public.set_reviewers_updated_at() set search_path = pg_catalog;
alter function public.set_canvas_connections_updated_at() set search_path = pg_catalog;
alter function public.set_canvas_capabilities_updated_at() set search_path = pg_catalog;
alter function public.set_canvas_courses_updated_at() set search_path = pg_catalog;
alter function public.set_canvas_modules_updated_at() set search_path = pg_catalog;
alter function public.set_canvas_module_items_updated_at() set search_path = pg_catalog;
alter function public.set_canvas_pages_updated_at() set search_path = pg_catalog;
alter function public.set_canvas_assignment_groups_updated_at() set search_path = pg_catalog;
alter function public.set_canvas_assignments_updated_at() set search_path = pg_catalog;
alter function public.set_canvas_sync_runs_updated_at() set search_path = pg_catalog;
alter function public.set_canvas_sync_course_results_updated_at() set search_path = pg_catalog;
alter function public.set_canvas_course_sync_states_updated_at() set search_path = pg_catalog;
-- This event-trigger function is internal and is never a client RPC.
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
