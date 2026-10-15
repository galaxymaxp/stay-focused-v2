-- Owner runs this guard while Scheduler is paused, immediately before activation.
create function public.skip_stale_canvas_email_events_v1(p_older_than interval default interval '24 hours')
returns integer language plpgsql security invoker set search_path = '' as $$
declare v_count integer;
begin
  if p_older_than is null or p_older_than <= interval '0 seconds' then
    raise exception 'invalid_stale_email_threshold';
  end if;
  update public.notification_outbox
    set skipped_at = now(), last_error = 'stale_before_activation', lease_owner = null, lease_expires_at = null
    where created_at < now() - p_older_than
      and sent_at is null and failed_at is null and skipped_at is null;
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;
revoke all on function public.skip_stale_canvas_email_events_v1(interval) from public, anon, authenticated;
grant execute on function public.skip_stale_canvas_email_events_v1(interval) to service_role;
