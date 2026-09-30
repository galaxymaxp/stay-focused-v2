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

Vercel dry-run confirmed the linked production project `galaxymaxps-projects/stay-focused-v2-prototype` and excluded `apps/mobile/.gitignore` and `tmp/`. Automatic approval review initially rejected `vercel deploy --prod`; the user subsequently gave explicit authorization. Production deployment `dpl_7CiWZrgZAf9ersa5bFsegVfnMbnn` is READY on `https://stay-focused-v2-prototype.vercel.app`; health returned 200 and a signed-out Canvas request returned 401. Cloud Build `e2b75c8a-f927-4008-a5d4-bd43bf39cebb` succeeded from allowlisted staged source. Private Cloud Run revision `generation-worker-00014-qxb` is Ready and serves 100% of traffic; anonymous health returned 403. The existing Cloud Tasks `generation` queue is running.

The first Android preview OTA group `643d4eec-a06f-4722-9747-af3dbf87bdd0` had no `EXPO_PUBLIC_API_BASE_URL`, because `eas update` did not inherit the preview build's API address. Generate misleadingly said “Please sign in again” despite the preserved session and local Library. No sign-out was performed. Corrected preview OTA group `5b5953b3-f3f8-49ad-8b2a-13f929d270a4`, Android update `01a0ef99-599e-7e9f-88dc-509cae198f4b`, was published with the production API address. Expo logs on the realme showed the update download and a subsequent launch with no newer update; Generate then loaded the authenticated Canvas course list.

On the corrected update, launch and opening Generate left the live job count at 462, zero active, with newest job still at 23:48:57 UTC on September 29. The prior 28 automatic jobs were produced while older mobile JavaScript was active during initial connection and update activation; they are not B38 passive navigation results. A manual CC6 Sync Again at 23:59:57 UTC created one content job (`210fb032-2509-438e-b2bc-81d02fb3934f`) and one grades job (`6a6194fd-4da1-49dd-ba43-f6329ee02c3e`). Both succeeded, each with one worker attempt and a distinct Google dispatch ID. A manual CIT17 Sync Again at 00:01:02–00:01:07 UTC created one content job (`331f083d-e2c8-4f9e-a6d9-0b5b40c330b2`) and one grades job (`3fd9d275-3fc5-48c6-9399-23675bff3d8f`). Both succeeded with one attempt and one dispatch ID each. CC6 content completed 9/9 units; CIT17 completed 23/23. The course list returned to “Synced” after completion. At 12:58 UTC on September 30, the database still had exactly 466 jobs, zero active, and no jobs newer than the CIT17 request.

The realme temporarily disconnected from ADB during a user-requested pause and then had no default network. After the user restored ADB and Wi-Fi, a manual SOC SCI 103N Sync Again created exactly one content job (`9212be73-18fc-465e-ac0f-fcc46e35e99c`) and one grades job (`18ed5fb7-63f6-4380-a714-1d50f19b7087`) at 13:07 UTC on September 30. Both reached `succeeded`, each with one worker attempt, one Google dispatch ID, and null `workflow_run_id`. Grades completed 3/3 units with a success outcome. Content completed 13/13 units with a partial outcome: the stored result names `canvas_course_files_failed` and `canvas_course_pages_failed`, while modules, individual pages, assignments, and announcements were persisted. The mobile course status returned to “Synced” and Generate surfaced that some Canvas areas are not shared with students. The partial is the documented Canvas access limitation, not a dispatch or admission failure.

| Physical gate on corrected preview OTA | Job count before → after | Result |
| --- | ---: | --- |
| Launch and open Generate with authenticated course list | 462 → 462 | Pass; zero automatic jobs |
| Enter/exit Generate course, open Tasks and Library | 468 → 468 | Pass; zero automatic jobs after the three manual course syncs |
| Open Today and Announcements | 468 → 468 | Pass; zero automatic jobs |
| Force-stop/relaunch after manual sync, then open Generate, Tasks, Library and Canvas connection | 468 → 468 | Pass; zero automatic jobs, signed-in account and Canvas connection retained |

CIT17 Generate showed three instructional PDFs under Lecture Presentations and no empty “FINAL PROJECT GROUPING” Page. Its assignments remained in Tasks: four completed items each displayed “Submitted.” Announcements loaded separately in Today and the full list. The SOC SCI 103N “New Class Room S 408” detail opened, showed “Open in Canvas,” and closed with Done. After relaunch, the same CIT17 PDFs, Tasks data and saved Library course cards appeared. The three target courses' module, Page, file, assignment, and announcement counts matched their pre-sync baseline; no duplicate content rows appeared. The final live job count at 13:15 UTC was 468 with zero active, newest job still the SOC SCI grades request at 13:07:16 UTC. No 14-job batch recurred.

## Verdict

**PASS — Google Canvas sync is stable, idempotent, and physical acceptance passed.** The next task is to make a missing preview OTA API address show a configuration error instead of a misleading sign-in message, and to put the preview API address in the EAS update environment. The corrected B38 update already contains the production address; this follow-up prevents recurrence in later updates.
