# B38 Canvas sync admission and repeat delivery

## Starting point

- Branch `b25-3-3-ai-first`, starting HEAD `7628358`.
- B37 Google dispatch was committed as `46e66a8` before B38 edits. Canvas no longer imports `workflow/api`.
- Starting untracked `apps/mobile/.gitignore` and `tmp/` were neither edited nor staged.
- Device connected for inspection: realme RMX3151, Android 13, serial `PB6DWWEIHAUCMZOR`.

## Trigger map

| Trigger | Before | After | Intent |
| --- | --- | --- | --- |
| Sync status button | Content and grades for selected courses | Same | Explicit |
| Canvas course Sync / Sync Again | Content and grades for tapped course | Same | Explicit |
| Grade screen Sync / Retry | Grade job | Same | Explicit |
| Sign-in, session restore, launch | `CanvasSyncProvider.resume` started account sync if last success was older than six hours | Restore selection/data and reconcile accepted jobs | Passive |
| App foreground | Same stale-data account sync | Poll/reconcile existing jobs | Passive |
| Today focus | Account sync, at most every three minutes | Refresh Today read models | Passive |
| Generate pull-to-refresh | Account sync plus course GET | Course GET only | Passive data refresh |
| Tasks pull-to-refresh | Account sync plus activity GET | Activity GET only | Passive data refresh |
| Generate, Tasks, Library, course detail mount | Persisted read-model GET; no direct sync call | Same | Passive |
| Pending accepted intent after lost response | Resubmit same idempotency key | Same | Recovery of explicit request |

An account sync starts two jobs per selected course. Production showed 14 new jobs at 12:55 UTC on September 29, seven content and seven grades. The initiating code paths are the provider's launch/foreground stale check and Today's focus effect; Generate's mount has no sync call, although its refresh callback did. No request-origin field or client call stack was persisted with those jobs, so the exact event responsible for the 12:55 batch cannot be distinguished retrospectively. The code paths capable of producing it are removed.

## Admission and failed repeat

The live `canvas_sync_jobs_one_active_per_course_type` partial unique index covers `(user_id, course_id, job_type)` for queued, running, and cancellation-requested jobs. Concurrent different-key requests already serialized to one job, but the losing API request returned 409. The repository now fetches and returns that active job. The deterministic Cloud Task name treats a duplicate enqueue 409 as acceptance of the original task. Failed, expired, and succeeded jobs do not occupy the partial index, so a later explicit refresh can create a new job.

CC6 content job `8252e7d3-0059-4965-8de3-cd91513b192d`, dispatch `08e50de6-5d5a-4966-b0a4-899ce35aa928`, was created at 12:48:45, dispatched at 12:48:46, claimed at 12:48:47 and failed at 12:49:02 UTC. It had one claim and zero units, so Canvas was not reached. Cloud Run acknowledged its delivery after about 15.6 seconds. Production Vercel logs show a 504 runtime timeout on `/api/internal/canvas/sync-token` during the same interval. Those logs do not carry a job ID for the token request, so timeout is strongly supported but not individually correlated. The worker's 15-second token request deadline matched the failure interval. Its deadline is now 35 seconds, and transient handoff failures receive one bounded retry; a denied 4xx response does not retry. Token failures now record a distinct safe code and stage-only log.

## Routing

The CIT17 Page “FINAL PROJECT GROUPING” is published and is not a front page, but its stored body is zero bytes. Generate now excludes any Page whose normalized body has no meaningful content. The rule does not depend on the title. File eligibility and assignment/announcement separation remain in place.

## Verification and physical gate

Focused Canvas API, worker, token-route and routing tests passed (214/214); focused mobile sync and screen tests passed (78/78). DB/API/mobile typechecks, changed-file lint, API production build, Android Expo export (3,422 modules), and `git diff --check` passed. The first API build and mobile lint attempts failed because sandbox permissions denied parent-directory reads; reruns with that access passed.

Vercel dry-run confirmed the linked production project `galaxymaxps-projects/stay-focused-v2-prototype` and excluded `apps/mobile/.gitignore` and `tmp/`. Automatic approval review rejected `vercel deploy --prod` as a consequential production change without separately recognized explicit authorization and instructed against a workaround. No B38 Vercel, Cloud Run, or EAS update was deployed. The realme still has old mobile code, so no new relaunch/navigation/manual acceptance sequence was run against it. Production baseline was 434 Canvas jobs, zero active, newest created at 12:55:45 UTC. Announcement physical close/open and the three one-course-at-a-time manual sync gates remain unverified.
