# ADR-014: Hosted processing uploads and completion notifications

Status: implemented foundation; hosted deployment and physical iPhone delivery
remain acceptance gates.

## Decision

Stay Focused uses a server-owned processing boundary:

1. The authenticated API creates a short-lived upload intent.
2. Mobile uploads directly to the private `processing-job-sources` Supabase
   Storage bucket using TUS, the user's short-lived Supabase session, and a
   Storage policy tied to the pending upload intent.
3. The app remains foregrounded until the API validates the completed object,
   creates the durable extraction job, and returns HTTP 202.
4. A continuously running worker claims jobs from Postgres. Mobile polling may
   stop, the network connection may disappear, and the app may be suspended
   without cancelling accepted work.
5. Terminal processing events are materialized into a service-owned push
   delivery outbox. The worker sends generic Expo Push Service messages and
   later checks receipts.

This avoids Vercel's request-payload boundary and avoids treating an unawaited
serverless promise or mobile timer as background execution.

## Upload boundary

- `POST /api/job-uploads` validates safe metadata and returns an upload ID,
  private object path, direct Storage endpoint, six MiB chunk size, and expiry.
- Storage authorizes only authenticated inserts whose unguessable object path
  matches that user's unexpired pending intent. The bucket enforces a 10 MiB
  limit and the supported neutral PDF/image MIME types.
- `POST /api/job-uploads/:uploadId/accept` verifies authentication and
  ownership, downloads the staged object server-to-server, checks exact byte
  size and PDF/image structure, and returns HTTP 202 only after durable job
  persistence.
- The existing job idempotency key scopes replays to the authenticated user.
  Losing the acceptance response does not create duplicate expensive work.
- Pending upload intents expire after one hour. The cleanup command marks them
  expired and queues unreferenced objects for bounded Storage deletion.
- Uploading is the one phase during which the first prototype asks the user to
  keep Stay Focused open. JavaScript-only background upload is not claimed.

## Push delivery

`push_notification_devices` stores enabled installation registrations.
`processing_notification_deliveries` is the per-device outbox. Both tables
have RLS enabled, no anonymous/authenticated table grants, and are accessed
through authenticated API ownership checks or the service role.

Delivery claims use `FOR UPDATE SKIP LOCKED`, bounded leases, attempt counts,
and unique event/device delivery keys. Tickets are not considered delivery:
the worker checks Expo receipts after fifteen minutes. `DeviceNotRegistered`
invalidates the device. Transport failures use bounded retry/backoff. Events
without an enabled device are closed without later private-content backfill.

Notification bodies are fixed, subject-neutral messages. They never include a
source name, OCR text, reviewer content, email, or credential. Notification
data contains only the Processing screen and safe job identifiers. Expo
delivery is at-least-once, so unique outbox keys and collapse IDs reduce but
cannot mathematically eliminate OS-level duplicate presentation.

## Mobile recovery and native requirements

The existing safe local job reference and foreground reconciliation remain the
source of mobile recovery. Notification taps open the Processing screen, whose
authenticated API calls enforce ownership before showing results.

Real iOS push requires an Expo/EAS development build, an EAS project ID, a
registered physical device, and Apple push credentials. Expo Go is sufficient
only for switch-away/reconnect testing where the server continues without
background JavaScript. Force-quitting does not cancel an accepted job.

The development build receives an HTTPS API origin through
`EXPO_PUBLIC_API_BASE_URL`. Local development may keep `auto`, which derives
the API host from the current Metro LAN host, so changing Wi-Fi does not
require editing a hardcoded TypeScript address.

## Deployment and operations

- Vercel hosts the authenticated Next.js API.
- Railway runs one continuously available worker using
  `railway.worker.json`; sleep must be disabled.
- Supabase is the durable queue, private source store, result store, event
  source, and notification outbox.
- Railway needs the existing processing/provider secrets plus the optional
  `EXPO_ACCESS_TOKEN` when Expo enhanced push security is enabled.
- Cleanup remains a separate dry-run-first scheduled command.
- Safe logs contain identifiers, stages, counts, ticket-safe error codes, and
  durations, never private academic content or provider payloads.

Local testing still depends on the laptop remaining awake, the API and worker
running, and network reachability. Hosted testing removes the changing LAN IP
from the iPhone-to-API path.
