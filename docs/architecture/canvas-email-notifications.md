# Frequent Canvas sync and email notifications

Google Cloud Scheduler → POST Vercel `/api/cron/canvas-sync` every five minutes → existing Canvas client and normalizers → canonical Supabase Canvas tables → transactional notification outbox → email worker → existing Resend sender.

This route runs metadata synchronization and email delivery only. It does not start reviewer generation, download files, run OCR, or dispatch the existing Cloud Run worker. Explicit student content/grade synchronization remains available through the existing system.

## Scheduling and deployment

The linked production project was read-only inspected on October 3, 2026: Vercel Hobby, Fluid Compute enabled, root `apps/api`. Hobby Vercel Cron cannot run every five minutes ([Vercel cron limits](https://vercel.com/docs/cron-jobs/usage-and-pricing)), so use one Google Cloud Scheduler HTTP job. The route declares a 300-second maximum and reserves time for delivery; Fluid Compute on Hobby supports this duration ([function duration](https://vercel.com/docs/functions/configuring-functions/duration)).

In Google Cloud Console, enable the Cloud Scheduler API, create a job named `stay-focused-canvas-sync`, and set:

| Setting | Value |
| --- | --- |
| Frequency | `*/5 * * * *` |
| Scheduler timezone | `Etc/UTC` (user reminder timezone is separate) |
| Target | HTTP |
| URL | `https://<production-domain>/api/cron/canvas-sync` |
| Method | `POST` |
| Header | `Authorization: Bearer <CRON_SECRET>` |
| Body | `{}` |
| Attempt deadline | 300 seconds |
| Retry policy | Up to 3 retries, 30-second minimum backoff, 300-second maximum backoff |

Use the production domain accessible to Scheduler. If deployment protection is enabled, configure an approved protection bypass separately; the cron bearer secret is still mandatory. Do not put secrets in source control, Mobile, tickets, or logs. See [Google's HTTP job setup](https://docs.cloud.google.com/scheduler/docs/creating).

Enable by resuming this job after rollout verification. Disable by pausing it in Cloud Scheduler; revoke or rotate `CRON_SECRET` to stop authenticated calls immediately. Pausing the job stops this route's polling, reminder materialization, and delivery. Existing manual sync can still detect events into the outbox. A user's global switch stops that user's emails, not canonical data synchronization.

Required server environment variable names:

- `CRON_SECRET`
- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `CANVAS_TOKEN_ENCRYPTION_KEY`

Canvas credentials come from the existing encrypted per-user connection; no global Canvas token is required. Resend sender/domain verification is a separate provider setup step. Production inspection found Supabase and Canvas encryption variables, but none of the three cron/Resend variables. Local runtime values were unavailable. No secret values were retrieved or committed.

Apply `20261003025905_canvas_notification_sync.sql` before deploying API or Mobile changes. Keep the Scheduler paused until migration, configuration, sender verification, and controlled acceptance pass. Migration is additive and does not overwrite preferences. It seeds skipped baseline receipts for already imported published announcements/assignments to avoid reimport mail storms.

## Canonical synchronization

Polls claim selected courses on active Canvas connections in oldest-due order using database leases and `SKIP LOCKED`. An advisory lock caps concurrent course polls at two globally. Each invocation processes sequential requests, up to 20 courses, within its execution budget. Each course has a 40-second provider budget and a 90-second lease. Inactive/disconnected and completed courses are excluded.

The existing Canvas client validates and completely paginates each collection. Assignments, modules, module item/material metadata, own submission state, and announcements are independent scopes. Announcements cover at least the recent 30 days, the current course start when present, and the oldest retained post, so edits to older imported announcements remain visible. Canvas announcement date filters use posting dates rather than edit dates; there is no assumed `updated_since` API. Collections are bounded at the client's supported 50 pages and by the time budget. Exceeding either bound fails the scope without interpreting partial evidence as deletion.

Existing normalizers and canonical identities are reused. The metadata RPC compares typed fields, including timestamps, and only updates changed rows. Fingerprints record each successful scope's observed state. Published assignments/modules/items absent from a completely traversed collection are deactivated, preserving local relationships. Absent announcements are deactivated only inside a successfully completed posting window; historical or delayed posts outside that evidence remain intact. Assignment updates older than the stored Canvas `updated_at` are ignored. No page body or file content history is processed by this poll.

One failed scope/course preserves its rows and does not stop other courses. Provider requests retry at most twice for 429/temporary 5xx. Short `Retry-After` waits are honored; long waits defer the course, retaining the original provider cooldown. Timeouts and provider failures use safe error codes. Raw tokens, academic payloads, and provider error text are not logged.

`coursesAwaitingPoll` reports eligible backlog. Five minutes is the trigger cadence, not a guaranteed per-course freshness SLA under overload, provider throttling, or oversized courses. Before activation, measure the real selected-course workload and require zero sustained backlog; do not silently increase concurrency. This bounded Vercel implementation is intended for the current small deployment.

## Events, reminder timing, and preferences

Assignment/announcement triggers create events in the same transaction as canonical updates, including updates from existing manual sync. The outbox has a database `UNIQUE(dedupe_key)`. New assignment/announcement keys use the owner's canonical course plus Canvas object identity, surviving local prune/reimport. Announcement edits update data without repeating mail. Future delayed posts become eligible when their posting time arrives. Disabled announcement events are recorded as skipped so later edits do not turn them into new-post emails.

Assignment state retains the previous `timestamptz` due date and a monotonically increasing revision. Equivalent timezone formats are equal. Every actual deadline change, including removal or A → B → A, advances the revision, optionally queues a change email, and invalidates pending reminders from prior revisions.

Each reminder key contains assignment identity, due revision, and threshold. It is emitted once when eligible:

- `deadline_7_day`: `0 < time_until_due <= 7 days`.
- `deadline_3_day`: `0 < time_until_due <= 3 days`.
- `deadline_due_today`: due-date calendar day in the user's timezone, while still before the deadline.

All three respect the saved local reminder time (default 08:00); midnight is not accepted. Eligibility starts at that time and is checked on the next five-minute invocation. First discovery or a shortened deadline can put an assignment inside multiple windows at once; every enabled threshold is independently eligible once. Deadlines before the configured reminder time do not receive a late due-today email. No overdue reminder is added.

Timezone comes from the saved notification preference, otherwise the existing course timezone if valid, otherwise UTC. First Settings load saves the device's IANA timezone when a preference row does not exist. Users can adjust it. Course/UTC fallback applies until Settings has established the user's preference; no unknown timezone is guessed.

Reliable submitted, pending-review, excused, or graded/nonmissing Canvas evidence suppresses reminders, as do the owner's completed imported Tasks. Unknown/unavailable submission evidence retains existing Task semantics; it is never treated as an invented completion. Completion and the current due revision are checked again before delivery.

Settings independently saves global email, announcement, new assignment, due-date-change, 7-day, 3-day, and due-today switches, plus reminder time/timezone. Defaults are enabled. Updates modify only supplied fields; disabling global email retains individual switches. Reloading/restarting retrieves persisted values through the verified bearer-auth API. Missing/offline settings show retryable UI rather than pretending a save succeeded.

## Durable delivery

Delivery claims one outbox event at a time with a 60-second lease. Before each email it rereads global/type preferences, course selection, connection state, publication, submission/completion, current deadline, and the verified Supabase account email. It also rechecks the saved local reminder time and due-today calendar day, deferring early retries without consuming a send attempt. Queued events invalidated by current state are marked skipped. No arbitrary test-recipient mechanism was introduced.

The existing Resend sender receives a stable event ID and sends short plain-text course/title/deadline content, including old/new dates for changes and the existing `stayfocused` links to Today or Announcements. Emails contain no Canvas tokens or internal IDs. Payload/date formatting is stable across retries.

Successful sends persist `sent_at` and the provider receipt. Temporary failures retry with exponential backoff (up to six attempts), safe error codes, and released leases; permanent failures stop. If a provider accepted an email but receipt persistence was interrupted, the stable Resend idempotency key protects the retry. Because [Resend retains keys for 24 hours](https://resend.com/docs/dashboard/emails/idempotency-keys), unfinished attempts older than 23 hours fail as `delivery_receipt_uncertain` rather than risking another email. Investigate provider receipts before any manual requeue. This is explicit handling of the external-send/database-commit ambiguity, not a claim of distributed exactly-once delivery.

## Database security and acceptance

Four new RLS-enabled tables: `notification_preferences`, `notification_outbox`, `canvas_notification_assignment_state`, `canvas_notification_poll_state`. Authenticated users can select/insert/update only their own preferences and read only their own outbox. They cannot write outbox/state or execute internal worker RPCs. Anonymous roles receive no grants. Server operations use the existing server-only service role. Definer event triggers have a fixed empty search path, an owner check, and no client execute grant.

Local acceptance executes the actual migration against PGlite/Postgres canonical table DDL, tests RLS under authenticated/anonymous roles, and tests authorized/unauthorized Request handlers and mocked provider delivery. Full API/mobile suites, typecheck/lint, and production API build must pass. These local checks do not substitute for a live Canvas/provider or physical-device test.

Before enabling the job: migrate, configure variables by name, deploy API and Mobile, verify the Resend sender, use only the existing developer-controlled safe recipient for a real delivery check, reject an unauthorized production POST, run an authorized POST twice against unchanged Canvas state, confirm canonical/outbox counts and receipts do not grow, check Settings across restart/login, and confirm workload/backlog and retry behavior. No real emails, production migration, deployment, or Scheduler job were performed for this implementation task.

## Local verification record (October 3, 2026)

All checks below were FRESH; no cached success is counted. Commands run from the repository root unless indicated.

| Command | Result |
| --- | --- |
| `npm test --workspace @stay-focused/api` | 118 files passed; 1,259 tests passed, 3 existing skips |
| `npm test --workspace @stay-focused/mobile` | 76 files; 784 tests passed |
| `npm test --workspace @stay-focused/api -- src/lib/notifications/canvas-notifications.database.test.ts` | 20 migration/RLS/integration tests passed |
| `npm run typecheck -- --force` | 7/7 workspace tasks passed, 0 cached |
| `npm run typecheck --workspace @stay-focused/api` | Passed again after the final regression test |
| `npm run lint -- --force` | 7/7 workspace tasks passed, 0 cached; four pre-existing Mobile import-order warnings, zero errors |
| `npm run lint --workspace @stay-focused/api` | Passed again after the final regression test |
| `npm run build --workspace @stay-focused/api` | Next.js production build passed |
| `npm run build --workspace @stay-focused/mobile -- --platform android` | Android export passed |
| `npm test --workspaces --if-present` | API/Mobile/Canvas/OCR/shared passed (Canvas 73, OCR 27, shared 50); native engine runner failed |
| `npm test --workspace @stay-focused/engine` | Native Node 24 runner remains blocked by the existing extensionless shared `quiz-capacity` import |
| `npx tsx dist/evals/run-evals.js` (from `packages/engine`, after build) | Same engine evaluations passed: 606, zero failures |
| `git diff --cached --check` | Passed after removing whitespace in the new migration |
| Live Canvas, real Resend email, production migration/deployment, Scheduler execution, physical Settings restart/login | NOT RUN; required before activation |

Earlier failed checks were repaired: Supabase schema inference required row type aliases; mobile settings needed the existing theme color name and API response envelope; Next.js rejected a helper exported from a route, which was moved to its own module; the migration submission conflict target needed the canonical composite unique key; the integration poll exposed a pagination cap of 50; and the final regression test needed a typed query result. An initial new root-barrel export caused a native engine import error; it was removed in favor of the explicit notification-preferences subpath. The unmodified root barrel still fails native Node on `quiz-capacity`, while the TypeScript runner passes. No unresolved notification test failure or flake remains.

## Task-only changed files

+- `apps/api/.env.example`
- `apps/api/app/api/cron/canvas-sync/route.ts`
- `apps/api/app/api/cron/canvas-sync/route.test.ts`
- `apps/api/app/api/notification-preferences/route.ts`
- `apps/api/app/api/notification-preferences/route.test.ts`
- `apps/api/src/lib/notifications/canvas-email.ts`
- `apps/api/src/lib/notifications/canvas-email.test.ts`
- `apps/api/src/lib/notifications/canvas-poll.ts`
- `apps/api/src/lib/notifications/canvas-poll.test.ts`
- `apps/api/src/lib/notifications/canvas-notifications.database.test.ts`
- `apps/api/src/lib/notifications/cron-auth.ts`
- `apps/api/src/lib/transactional-email.ts`
- `apps/mobile/src/features/settings/SettingsScreen.tsx`
- `apps/mobile/src/features/settings/NotificationSettings.tsx`
- `apps/mobile/src/services/notificationPreferencesApi.ts`
- `apps/mobile/src/services/notificationPreferencesApi.test.ts`
- `packages/db/migrations/20261003025905_canvas_notification_sync.sql`
- `packages/db/src/types.ts`
- `packages/shared/package.json`
- `packages/shared/src/notification-preferences.ts`
- `docs/architecture/canvas-email-notifications.md`
- `docs/current-state.md`
- `docs/roadmap.md`
- `docs/ai/current_sprint.md`
