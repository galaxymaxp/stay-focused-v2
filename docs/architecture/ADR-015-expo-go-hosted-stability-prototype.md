# ADR-015: Expo Go hosted stability prototype

Status: superseded by ADR-016 for the no-spend Vercel Workflow prototype

ADR-016 replaces the immediate Railway deployment choice. Railway
configuration remains a supported alternative; it is not required for the
current prototype.

## Decision

The immediate iPhone prototype uses Expo Go while both the authenticated
Next.js API and continuously running processing worker are hosted as separate
Railway services. This is a prototype deployment choice, not a requirement
that the eventual production API remain on Railway.

The API service uses `railway.api.json`, builds the API workspace, starts the
production Next.js server, and exposes `/api/health`. The worker continues to
use `railway.worker.json`, one always-on replica, bounded concurrency, database
leases, and graceful shutdown. Supabase remains the durable queue, private
source store, result store, and authorization boundary.

The mobile JavaScript is published as an EAS Update and opened in Expo Go.
The preview EAS environment supplies a stable Railway HTTPS origin through
`EXPO_PUBLIC_API_BASE_URL`; local development retains `auto` so the current
Metro LAN host is derived without a hardcoded address.

## Acceptance boundary

- Uploading must finish and the API must return HTTP 202 before the user is
  told that switching apps is safe.
- After acceptance, neither Expo Go suspension, polling loss, network loss,
  nor laptop shutdown may cancel hosted work.
- Returning to the foreground or reopening Expo Go reconciles the durable job
  and retrieves its result.
- The published preview must not depend on a running Metro server.
- The API and worker must be deployed from the same compatible commit and
  migrations must be applied before either begins accepting prototype traffic.

## Notifications

Remote push is not part of this iPhone prototype because there is no paid Apple
Developer membership. Expo Go hides completion-notification controls rather
than offering an action that cannot succeed. The database outbox, Expo sender,
and native-build registration code remain available for a later Android APK or
Apple-enabled build. No local notification may claim server completion without
checking the server.

## Deployment inputs

The Railway API needs the existing Supabase public configuration plus its
server-side Supabase credentials. The worker needs Supabase service access and
the configured OCR/generation provider credentials. Secrets are entered in the
Railway dashboard and never committed or printed.

The EAS preview environment contains only public mobile configuration:

- `EXPO_PUBLIC_API_BASE_URL=https://<railway-api-domain>`
- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`

Linking the Expo project adds the public EAS project ID and Updates URL. Those
values cannot be generated locally without authenticating the owning Expo
account.

## Stability gate

Before sharing the Expo Go preview, verify the full automated matrix, API
production build, Expo export, Railway health, worker heartbeat, direct staged
uploads, idempotency, cancellation, ownership, result-before-success ordering,
and expired-lease recovery. Run a non-sensitive hosted fixture first and the
private multi-page PDF only as a final sanitized live fixture.

A 24-hour soak is an operational acceptance gate rather than a blocking build
step. During the soak, heartbeat age and queue age must remain healthy, no job
may remain permanently running, and logs must not contain private source
content.
