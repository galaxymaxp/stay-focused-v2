# ADR-045: Optional mobile generation navigation

Date: 2026-10-18. Status: Accepted for GN1b's local mobile code scope.

Reviewer Generate and confirmed single Reviewer Remake save an intent before
admission finishes. Students should see progress after two seconds if they
remain on the screen, while keeping any destination they choose themselves.

Share `useGraceNavigation` between these two paths. It owns one timer, replaces
it on reschedule, and cancels permanently on blur, navigator state changes,
app inactivity, unmount or an explicitly blocking popout (Queue). It checks
focus, mount and AppState again before pushing. Cancellation never cancels
admission; only accepted HTTP 202 work is background-safe on the server.

Push `/generation` with the saved `intent` and no `start`. The observer reads
the persisted intent again on Queue updates and focus changes, so a late
admission connects to the job without calling acceptance again. The existing
Quiz auto-start path, manual saved-request confirmation and immediate batch
Queue popout retain their behavior. No animation or accessibility changes.

Lifecycle and boundary tests cover the hook and both entry points; generation
tests cover late observation with exactly one originating admission call.
No API, provider, schema, dependency or background-admission contract changes.
