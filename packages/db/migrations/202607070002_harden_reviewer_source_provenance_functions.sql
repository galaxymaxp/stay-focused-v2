alter function public.validate_canvas_source_preview_session_owner()
  set search_path = public, pg_temp;

alter function public.prevent_source_provenance_update()
  set search_path = public, pg_temp;
