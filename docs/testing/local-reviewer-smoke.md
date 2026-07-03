# Local Expo Web Reviewer Smoke

Use this command from the repository root to run the real Expo Web reviewer UI
against the local API:

```powershell
npm run smoke:reviewer:web
```

The smoke runner starts only the local services it needs, reuses compatible
services that are already running, and cleans up services that it started unless
`--keep-services` is passed.

## Prerequisites

- Dependencies installed from the repository root.
- Local API environment configured for `apps/api`.
- Public mobile Supabase environment configured for `apps/mobile`.
- Local API provider credentials configured for live reviewer generation.
- A Supabase test account that can sign in with email and password.

Do not put service-role keys, provider keys, passwords, access tokens, browser
storage, or cookies in source files.

## One-Time Credential Setup

The default command uses this credential order:

1. Existing process environment variables:
   `SMOKE_TEST_EMAIL` and `SMOKE_TEST_PASSWORD`.
2. The ignored root file `.env.smoke.local`.
3. No credentials, which returns `AUTH_REQUIRED` unless a valid persisted
   browser session already exists.

To avoid exporting variables repeatedly, copy the committed template once:

```powershell
Copy-Item .env.smoke.example .env.smoke.local
```

Then edit `.env.smoke.local` locally:

```txt
SMOKE_TEST_EMAIL=
SMOKE_TEST_PASSWORD=
```

Use only local smoke-account values. The runner never prints these values, and
`.env.smoke.local` remains ignored.

If both variables are available, credentials are `READY`. If exactly one is
available, the runner returns `SMOKE_CREDENTIALS_INCOMPLETE`. If neither is
available and no valid persisted session is found, it returns `AUTH_REQUIRED`.

## Persistent Browser Profile

The dedicated Playwright profile is stored under:

```txt
.local/smoke/reviewer-web/
```

The root `.gitignore` excludes `.local/`, so browser storage, screenshots,
traces, and diagnostics stay local. A successful credential sign-in leaves the
account signed in so later Codex sessions can reuse the persisted profile.

To reset only this smoke profile before a run:

```powershell
npm run smoke:reviewer:web -- --reset-session
```

To prove the profile can be reused without reading any configured credentials:

```powershell
npm run smoke:reviewer:web -- --session-only
```

`--session-only` ignores process environment variables and `.env.smoke.local`.
It returns `AUTH_REQUIRED` if the persisted session is missing or invalid.

## Options

```txt
--headed
--keep-services
--reset-session
--session-only
--help
```

- `--headed` opens the browser visibly.
- `--keep-services` leaves only runner-started services running.
- `--reset-session` removes `.local/smoke/reviewer-web/` before running.
- `--session-only` uses only the persisted browser session.
- `--help` prints usage without starting services or reading credentials.

## Service Ports And Cleanup

- API: `http://localhost:3000`
- API health: `http://localhost:3000/api/health`
- Expo Web: `http://localhost:8081`

The API is reused only when the health endpoint returns the expected Stay
Focused V2 payload. Expo Web is reused only when the page looks like the Stay
Focused app. If a port is occupied by something incompatible, the runner reports
the port-use failure instead of terminating an unknown process.

When the runner starts API or Expo, it records those services as
`started-by-runner`. Reused services are recorded as `reused`, and services not
reached before a failure are `not-started`. Cleanup terminates only the owned
process tree, never every Node process, then waits for the owned port to be
released. If a runner-owned port remains bound, cleanup reports
`CLEANUP_PORT_STILL_BOUND`.

Before starting a runner-owned API process, the command removes only the
generated Next.js dev output directory at `apps/api/.next/server/app`. This
keeps stale OneDrive-backed reparse-point build artifacts from making Next.js
exit during startup, while preserving the rest of `.next`.

An immediate repeat is supported:

```powershell
npm run smoke:reviewer:web
npm run smoke:reviewer:web
```

The second run should either start fresh compatible services or reuse services
that are still intentionally running.

## API And CORS Checks

Before opening the browser, the runner validates:

- `GET /api/health`
- `OPTIONS /api/reviewer/generate`

The CORS preflight uses origin `http://localhost:8081`, method `POST`, and
requested headers `authorization, content-type`. It must return HTTP `204`, the
exact Expo Web origin, `POST` and `OPTIONS` methods, and both requested
headers. Wildcard origins are rejected.

## Reviewer Fixture And Assertions

The runner uses the deterministic fictional fixture:

```txt
Pretend OCR Sample - Study Habits
```

It fills the reviewer UI, submits one generation request, and validates the
rendered output:

- `Reviewer Ready` is visible.
- The generated title contains `Pretend OCR Sample - Study Habits`.
- At least one reviewer section is visible.
- At least one key point is visible.
- Source-faithful status is passed.
- Coverage status is passed.
- Clean-output status is passed.
- Explanation text is nonempty.
- Known error states are not visible.

The command reports the reviewer POST HTTP status, section count, visible
key-point count, validation statuses, explanation presence, authentication mode,
session persistence, and cleanup result.

## Diagnostics

Browser failure artifacts are written under:

```txt
.local/smoke/reviewer-web/diagnostics/
```

Typical artifacts:

```txt
api.log
auth-failure.png
expo-web.log
trace.zip
safe-diagnostics.json
```

Diagnostics include metadata such as the current page URL, selector presence,
submit state, safe auth request metadata, HTTP status, safe visible error text,
whether the reviewer screen appeared, and elapsed authentication time. They do
not include request bodies, response bodies, headers, credentials, tokens,
cookies, storage state, or session objects. Before auth screenshots are saved,
the runner clears the email and password fields.

Service startup failures also include the spawned command, working directory,
child PID, exit code or signal, whether the port was ever bound, whether health
was attempted, safe stdout and stderr tails, and the local service log path. A
spawned process that exits before readiness is reported as
`started-then-exited`, not `not-started`.

## Failure Codes

Authentication:

```txt
AUTH_FORM_NOT_FOUND
AUTH_EMAIL_INPUT_NOT_FOUND
AUTH_PASSWORD_INPUT_NOT_FOUND
AUTH_SUBMIT_NOT_FOUND
AUTH_SUBMIT_DISABLED
AUTH_REQUEST_NOT_SENT
AUTH_REQUEST_REJECTED
AUTH_UI_ERROR
AUTH_NAVIGATION_TIMEOUT
AUTH_REVIEWER_SCREEN_NOT_FOUND
AUTHENTICATION_FAILED
AUTH_REQUIRED
SMOKE_CREDENTIALS_INCOMPLETE
```

API, Expo, and cleanup:

```txt
API_PORT_IN_USE
API_PROCESS_EXITED
API_HEALTH_TIMEOUT
API_HEALTH_MISMATCH
API_START_FAILED
EXPO_PORT_IN_USE
EXPO_PROCESS_EXITED
EXPO_READY_TIMEOUT
EXPO_START_FAILED
CLEANUP_PORT_STILL_BOUND
CORS_PREFLIGHT_FAILED
```

Reviewer generation:

```txt
REVIEWER_POST_FAILED
REVIEWER_PREVIEW_NOT_RENDERED
NETWORK_ERROR_VISIBLE
REVIEWER_VALIDATION_FAILED_VISIBLE
REVIEWER_GENERATION_FAILED_VISIBLE
```

## Localhost vs Phone Testing

Expo Web runs in the laptop browser, so `http://localhost:3000` points to the
laptop API. Physical-phone Expo Go testing is different: on a phone,
`localhost` points to the phone, so the mobile app must use the laptop LAN
address, for example `http://<laptop-lan-ip>:3000`.

Use this smoke command for laptop browser coverage. Use the mobile device
runbook when validating a physical phone.
