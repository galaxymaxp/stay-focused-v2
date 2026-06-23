# Mobile Device Validation Runbook

This runbook validates the authenticated reviewer development flow with Expo Go
on a physical iPhone. It documents local setup only; it does not deploy, run live
OpenAI smoke tests, add OCR, or apply production migrations.

## Prerequisites

- Node.js and npm installed.
- Dependencies installed from the repository root.
- A Supabase project with email/password auth enabled for the test account.
- Expo Go installed on the iPhone.
- The laptop and iPhone on the same Wi-Fi network, with the laptop firewall
  allowing inbound connections to the API port.
- A server-only OpenAI API key for local API runtime.

## Environment Variables

Create local env files from the examples when needed. Do not commit local env
files and do not put server-only keys in the mobile env.

API env, normally in `apps/api/.env.local`:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
OPENAI_API_KEY
GOOGLE_CLOUD_PROJECT_ID
GOOGLE_CLOUD_CREDENTIALS_JSON
```

Required for this reviewer flow:

```text
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
OPENAI_API_KEY
```

Mobile env, normally in `apps/mobile/.env.local`:

```text
EXPO_PUBLIC_SUPABASE_URL
EXPO_PUBLIC_SUPABASE_ANON_KEY
EXPO_PUBLIC_API_BASE_URL
```

## Find the Device API URL

The iPhone cannot use `localhost` to reach the laptop. On the phone,
`localhost` means the phone itself.

Find the laptop Wi-Fi IPv4 address:

```powershell
Get-NetIPAddress -AddressFamily IPv4 |
  Where-Object { $_.IPAddress -notlike '127.*' -and $_.IPAddress -notlike '169.254.*' } |
  Sort-Object InterfaceMetric |
  Select-Object -First 8 InterfaceAlias,IPAddress,AddressState
```

On this validation machine, the Wi-Fi address was:

```text
192.168.68.102
```

For a local API running on port `3000`, set the mobile value to:

```text
EXPO_PUBLIC_API_BASE_URL=http://192.168.68.102:3000
```

If the laptop changes networks, re-run the command and update
`EXPO_PUBLIC_API_BASE_URL`.

Optional only: a tunnel such as ngrok can be used later when the phone cannot be
placed on the same network. In that case, use the HTTPS tunnel origin as
`EXPO_PUBLIC_API_BASE_URL`.

## Run the API Locally

From the repository root:

```powershell
npm run dev --workspace apps/api -- --hostname 0.0.0.0 --port 3000
```

Use `--hostname 0.0.0.0` for device validation so the API listens on the laptop
network interface. The local API route should be available at:

```text
http://<laptop-lan-ip>:3000/api/reviewer/generate
```

For laptop-only API work, this script also works:

```powershell
npm run dev --workspace apps/api
```

## Run the Expo App

From a second terminal at the repository root:

```powershell
npm run dev --workspace apps/mobile
```

After changing `apps/mobile/.env.local`, restart Expo so the
`EXPO_PUBLIC_` values are reloaded.

In the Expo terminal, choose the QR code that Expo Go can open, then scan it
with the iPhone camera or from Expo Go.

## Manual Device Validation Checklist

1. Start the API with `--hostname 0.0.0.0 --port 3000`.
2. Confirm the iPhone and laptop are on the same Wi-Fi network.
3. Set `EXPO_PUBLIC_API_BASE_URL` to `http://<laptop-lan-ip>:3000`.
4. Restart the Expo dev server after changing env values.
5. Open the app in Expo Go.
6. Sign in with a Supabase test account.
7. Open the reviewer generator screen.
8. Paste manual source text and optionally a title.
9. Tap `Generate reviewer`.
10. Confirm the app sends a POST request to `/api/reviewer/generate`.
11. Confirm a reviewer preview appears.
12. Confirm errors are understandable when config, network, or auth is wrong.

## Common Errors and Fixes

### Phone Cannot Reach API

Symptoms:

- The app shows a network failure before receiving a response.
- The API terminal shows no request.

Fixes:

- Use `http://<laptop-lan-ip>:3000`, not `http://localhost:3000`.
- Start the API with `--hostname 0.0.0.0 --port 3000`.
- Confirm the iPhone and laptop are on the same Wi-Fi network.
- Allow Node.js or the API port through the laptop firewall.
- Re-check the laptop IPv4 address after changing networks.

### Wrong Localhost Usage

`localhost` works from a laptop browser but not from Expo Go on a phone. On the
iPhone, `localhost` resolves to the iPhone. Replace it with the laptop LAN IP in
`EXPO_PUBLIC_API_BASE_URL`.

### Missing Supabase Env

Symptoms:

- The mobile app cannot initialize auth.
- Sign in fails before reaching reviewer generation.
- The API rejects tokens or cannot validate sessions.

Fixes:

- Set `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` in the
  mobile env.
- Set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in the API env.
- Restart both dev servers after env changes.

### Invalid Token or Unauthorized

Symptoms:

- Reviewer generation returns `Reviewer generation requires a valid session.`
- API responds with `unauthorized`.

Fixes:

- Sign out and sign back in on the phone.
- Confirm the mobile Supabase project matches the API Supabase project.
- Confirm the API is using the service role key for the same project.
- Check that the request includes `Authorization: Bearer <access-token>`.

### Missing OpenAI Key

Symptoms:

- API responds with `Reviewer provider is not configured.`

Fixes:

- Set `OPENAI_API_KEY` in the API env only.
- Restart the API dev server.
- Do not add `OPENAI_API_KEY` to the mobile env.

### API CORS or Network Issue

Expo Go uses React Native networking rather than browser CORS enforcement, so
most physical-device failures here are local network reachability issues. If a
browser-based client is added later, verify CORS separately.

For this flow:

- If the API terminal logs no request, investigate network, host binding, LAN IP,
  and firewall first.
- If the API terminal logs a request and returns JSON, use the response status
  and error code to debug auth, payload, or provider config.

## Non-Long-Running Verification

Run these commands from the repository root before manual device validation:

```powershell
npm run typecheck --workspace apps/mobile
npm run test --workspace apps/api
npm run typecheck --workspace apps/api
npm run typecheck --workspace @stay-focused/engine
npm run build --workspace @stay-focused/engine
npm run eval --workspace @stay-focused/engine
```

The API route tests cover `/api/reviewer/generate` contract behavior without
starting a long-running server. Do not run `smoke:openai` unless explicitly doing
live provider validation.
