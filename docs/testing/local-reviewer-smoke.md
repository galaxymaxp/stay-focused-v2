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

## Authentication

Default order:

1. Reuse a valid persisted browser session.
2. Sign in through the user-facing form when both variables are set:
   `SMOKE_TEST_EMAIL` and `SMOKE_TEST_PASSWORD`.
3. Stop with `AUTH_REQUIRED` when neither method is available.

The browser session is stored under:

```txt
.local/smoke/reviewer-web/
```

The root `.gitignore` excludes `.local/`, so browser storage stays local. The
runner validates that the restored browser profile reaches the authenticated
reviewer screen before using it. If the saved session has expired and no smoke
credentials are configured, the command reports `AUTH_REQUIRED` with setup
instructions.

For a first visible sign-in, set `SMOKE_TEST_EMAIL` and
`SMOKE_TEST_PASSWORD` in your local shell, then run:

```powershell
npm run smoke:reviewer:web -- --headed
```

The command uses those variables only from the process environment and does not
print their values. A successful credential sign-in persists the local browser
session for later runs.

To remove only the ignored local smoke browser state before running:

```powershell
npm run smoke:reviewer:web -- --reset-session
```

## Service Ports

- API: `http://localhost:3000`
- API health: `http://localhost:3000/api/health`
- Expo Web: `http://localhost:8081`

The API is reused when the health endpoint passes. If port `3000` is occupied
but the health endpoint does not pass, the runner fails with a port-use
diagnostic instead of terminating an unknown process.

Expo Web is reused when `http://localhost:8081` is reachable. When the runner
starts Expo Web itself, it sets this process-only override:

```txt
EXPO_PUBLIC_API_BASE_URL=http://localhost:3000
```

The override is not written to committed env files.

## Options

```txt
--headed
--keep-services
--reset-session
--help
```

- `--headed` opens the browser visibly.
- `--keep-services` leaves only runner-started services running.
- `--reset-session` removes `.local/smoke/reviewer-web/` before running.
- `--help` prints usage without starting services or reading credentials.

## Smoke Fixture

The runner uses a deterministic fictional OCR-style fixture embedded in the
runner:

```txt
Pretend OCR Sample - Study Habits
```

It does not read personal files, class material, security-related material, or
external OCR output.

## Troubleshooting

- `AUTH_REQUIRED`: sign in once with `--headed`, or set
  `SMOKE_TEST_EMAIL` and `SMOKE_TEST_PASSWORD` in the shell.
- `API_PORT_IN_USE`: something is listening on port `3000`, but
  `/api/health` is not passing. Stop that process or move it before rerunning.
- `EXPO_PORT_IN_USE`: something is listening on port `8081`, but the Expo Web
  page is not reachable. Stop that process or run the compatible Expo Web
  server yourself.
- `BROWSER_UNAVAILABLE`: run `npm install`, then
  `npx playwright install chromium` if the browser binary is missing.
- UI errors such as network, configuration, authentication, or reviewer
  validation failures are reported by safe code and HTTP status when available.
  The runner does not print tokens, cookies, browser storage, passwords, or
  secret environment values.

## Localhost vs Phone Testing

Expo Web runs in the laptop browser, so `http://localhost:3000` points to the
laptop API. Physical-phone Expo Go testing is different: on a phone,
`localhost` points to the phone, so the mobile app must use the laptop LAN
address, for example `http://<laptop-lan-ip>:3000`.

Use this smoke command for laptop browser coverage. Use the mobile device
runbook when validating a physical phone.
