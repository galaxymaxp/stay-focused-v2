# Mobile Device Validation Runbook

This runbook validates the authenticated reviewer plus gallery and camera OCR
development flow with Expo Go on a physical iPhone. It documents local setup
only; it does not deploy, run live OpenAI smoke tests outside reviewer
generation, add scanned-PDF OCR, or apply production migrations.

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

Required for live gallery/camera OCR validation:

```text
GOOGLE_CLOUD_PROJECT_ID
GOOGLE_CLOUD_CREDENTIALS_JSON
```

Application Default Credentials through `GOOGLE_APPLICATION_CREDENTIALS` and
`GOOGLE_CLOUD_PROJECT` can also be used by the API. Keep all Google values in
API/root local env files only. Never place them in `apps/mobile/.env.local`.

Mobile env, normally in `apps/mobile/.env.local`:

```text
EXPO_PUBLIC_SUPABASE_URL
EXPO_PUBLIC_SUPABASE_ANON_KEY
EXPO_PUBLIC_API_BASE_URL=auto
```

## Local API Address

The iPhone cannot use `localhost` to reach the laptop. On the phone,
`localhost` means the phone itself.

For same-network Expo Go and development-build testing, use:

```text
EXPO_PUBLIC_API_BASE_URL=auto
```

In development, the app reads the current Metro host from Expo and uses the
same laptop host on API port `3000`. Moving between Wi-Fi networks therefore
does not require changing an IP address in source or `.env.local`. If the API
uses another local port, set:

```text
EXPO_PUBLIC_LOCAL_API_PORT=<port>
```

Auto mode requires Expo LAN mode and phone-to-laptop network reachability. An
Expo tunnel carries the Metro bundle only; it does not expose the separate API.
When the phone cannot reach the laptop directly, expose the API with a trusted
HTTPS tunnel and set that explicit tunnel origin as
`EXPO_PUBLIC_API_BASE_URL`. Preview and production builds likewise require an
explicit deployed HTTPS API origin.

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

After changing `apps/mobile/.env.local`, fully reload the Expo app so changed
`EXPO_PUBLIC_` values are applied.

In the Expo terminal, choose the QR code that Expo Go can open, then scan it
with the iPhone camera or from Expo Go.

## Manual Device Validation Checklist

1. Start the API with `--hostname 0.0.0.0 --port 3000`.
2. Confirm the iPhone and laptop are on the same Wi-Fi network.
3. Keep `EXPO_PUBLIC_API_BASE_URL=auto` for Expo LAN development.
4. Fully reload Expo after changing env values.
5. Open the app in Expo Go.
6. Sign in with a Supabase test account.
7. Open the reviewer generator screen.
8. Paste manual source text and optionally a title.
9. Tap `Generate reviewer`.
10. Confirm the app sends a POST request to `/api/reviewer/generate`.
11. Confirm a reviewer preview appears.
12. Confirm errors are understandable when config, network, or auth is wrong.

## Manual Gallery OCR Checklist

Use only fictional or disposable test images. Do not use private notes,
personal photos, credentials, IDs, or school documents.

1. Start the API with Google OCR credentials available in the API environment.
2. Start Expo Go in LAN mode with `EXPO_PUBLIC_API_BASE_URL=auto`.
3. Sign in with a Supabase test account.
4. Open the reviewer generator screen.
5. Tap `Import image`.
6. Tap `Choose image` and allow photo-library access if prompted.
7. Select a PNG or JPEG image containing fictional study text.
8. Confirm the local preview and filename appear.
9. Tap `Extract text`.
10. Confirm the API receives `POST /api/ocr/extract`.
11. Confirm extracted text appears in the editable source field with line breaks.
12. Correct at least one OCR text detail.
13. Tap `Generate reviewer`.
14. Confirm the API receives `POST /api/reviewer/generate`.
15. Confirm Reviewer Ready appears with passed validation statuses.
16. Tap `Paste text` and confirm manual paste remains usable.
17. Confirm the selected image is not saved to storage or a database.

## Manual Camera OCR Checklist

Use only fictional or disposable paper notes. Do not photograph private notes,
personal documents, credentials, IDs, or school documents.

1. Start the API with Google OCR credentials available in the API environment.
2. Start Expo Go in LAN mode with `EXPO_PUBLIC_API_BASE_URL=auto`.
3. Sign in with a Supabase test account.
4. Open the reviewer generator screen.
5. Tap `Import image`.
6. Tap `Take photo` and allow camera access if prompted.
7. Photograph a PNG/JPEG-compatible study note with fictional text.
8. Accept the photo in the system camera UI.
9. Confirm the local preview and generated filename appear.
10. Tap `Extract text`.
11. Confirm the API receives `POST /api/ocr/extract`.
12. Confirm extracted text appears in the editable source field with line breaks.
13. Correct at least one OCR text detail.
14. Tap `Generate reviewer`.
15. Confirm the API receives `POST /api/reviewer/generate`.
16. Confirm Reviewer Ready appears with passed validation statuses.
17. Tap `Clear image` and confirm the captured image and OCR text are removed.
18. Confirm the captured image is not saved to storage or a database.

Scanned and mixed PDFs now use the durable `/api/jobs` flow. The user must keep
the app open until upload acceptance returns a job ID; after acceptance the
separate worker owns extraction.

## Durable Processing Mobile Checklist

1. Start the API on `0.0.0.0:3000`, the continuous worker, and Expo in LAN mode.
2. Confirm the app's API diagnostic resolves `auto` to the current Metro laptop
   host on port `3000`.
3. Select a disposable PDF and start extraction.
4. Keep the app open while it says `Uploading source...`.
5. After the app reports durable acceptance, switch to another app.
6. Return later and confirm the same job ID is reconciled, without a duplicate.
7. Confirm completed text is restored into the editable source field.
8. Start reviewer generation, wait for acceptance, and switch apps for longer
   than two minutes.
9. Return and confirm the same reviewer job is still running or its persisted
   result is available; a polling timeout must not cancel it.
10. Repeat once with an Expo reload, once with temporary Wi-Fi loss after
    acceptance, and once with explicit Cancel.

For laptop-hosted validation, accepted jobs continue only while the laptop is
awake, the API and worker processes remain running, and the database/providers
are reachable. If the phone leaves the laptop's LAN, `auto` cannot make the
local API publicly reachable; use a trusted HTTPS tunnel or a deployed API and
worker instead.

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
iPhone, `localhost` resolves to the iPhone. Use
`EXPO_PUBLIC_API_BASE_URL=auto` in Expo LAN development so the app derives the
current laptop host, or set an explicit reachable HTTPS API origin.

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

### Camera Permission Denied

Symptoms:

- The app shows `Camera access needed`.
- Tapping `Take photo` does not open the camera UI.

Fixes:

- Allow camera access from the iOS permission prompt.
- If access was denied earlier, open iOS Settings, find Expo Go, and enable
  Camera.
- Restart the Expo Go session after changing permissions.

### Missing OpenAI Key

Symptoms:

- API responds with `Reviewer provider is not configured.`

Fixes:

- Set `OPENAI_API_KEY` in the API env only.
- Restart the API dev server.
- Do not add `OPENAI_API_KEY` to the mobile env.

### Missing Google OCR Credentials

Symptoms:

- OCR extraction shows that OCR is not configured.
- API responds with `ocr_not_configured`.

Fixes:

- Set `GOOGLE_CLOUD_PROJECT_ID` and `GOOGLE_CLOUD_CREDENTIALS_JSON` in the API
  env, or configure Application Default Credentials for the API process.
- Restart the API dev server.
- Do not add Google credentials to any `EXPO_PUBLIC_` mobile variable.

### API CORS or Network Issue

Expo Go uses React Native networking rather than browser CORS enforcement, so
most physical-device failures here are local network reachability issues. Expo
Web CORS is covered by `npm run smoke:reviewer:web` and `npm run smoke:ocr:web`.

For this flow:

- If the API terminal logs no request, investigate network, host binding, LAN IP,
  and firewall first.
- If the API terminal logs a request and returns JSON, use the response status
  and error code to debug auth, payload, or provider config.

## Non-Long-Running Verification

Run these commands from the repository root before manual device validation:

```powershell
npm run typecheck --workspace apps/mobile
npm run test --workspace apps/mobile
npm run test --workspace apps/api
npm run typecheck --workspace apps/api
npm run typecheck --workspace @stay-focused/engine
npm run build --workspace @stay-focused/engine
npm run eval --workspace @stay-focused/engine
```

The API route tests cover `/api/reviewer/generate` and `/api/ocr/extract`
contract behavior without starting a long-running server. `npm run
smoke:ocr:web` verifies the Expo Web OCR client path with a mocked OCR response;
it does not validate live Google OCR. Do not run `smoke:openai` unless
explicitly doing live provider validation.
