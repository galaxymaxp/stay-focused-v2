# Local Testing

Use three testing surfaces, from fastest to most final.

## 1. Engine/API testing

- Use engine evals, live scripts, and API route checks.

## 2. Fast UI testing

- Use Expo Web in the laptop browser.

```bash
npm run dev --workspace apps/api
npm run web --workspace apps/mobile
```

Recommended public mobile env file:

```txt
apps/mobile/.env.local

EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
EXPO_PUBLIC_API_BASE_URL=
```

Do not put Canvas personal access tokens, `CANVAS_TOKEN_ENCRYPTION_KEY`,
service-role keys, or provider secrets in mobile env files.

API/server Canvas env groups:

```txt
# Optional developer live validation only; use a developer-owned Canvas account.
CANVAS_BASE_URL=
CANVAS_PERSONAL_ACCESS_TOKEN=

# Compatibility aliases supported only by the live-validation harness.
CANVAS_ACCESS_TOKEN=
CANVAS_LIVE_BASE_URL=
CANVAS_LIVE_PERSONAL_ACCESS_TOKEN=

# Required before stored per-user Canvas connections can be persisted.
# Must decode to exactly 32 bytes and is owned by the Stay Focused deployment.
CANVAS_TOKEN_ENCRYPTION_KEY=
```

For laptop browser / Expo Web:

```txt
EXPO_PUBLIC_API_BASE_URL=http://localhost:3000
```

For the reusable authenticated reviewer smoke, use:

```bash
npm run smoke:reviewer:web
```

See `docs/testing/local-reviewer-smoke.md` for persisted-session behavior,
credential variable names, and safe troubleshooting.

Expo Web runs on a different origin from the API. For reviewer generation,
verify the browser-shaped preflight if the UI shows `network_error`:

```powershell
curl.exe -i -X OPTIONS http://localhost:3000/api/reviewer/generate `
  -H "Origin: http://localhost:8081" `
  -H "Access-Control-Request-Method: POST" `
  -H "Access-Control-Request-Headers: authorization, content-type"
```

Expected: HTTP `204` with `Access-Control-Allow-Origin:
http://localhost:8081`, `Access-Control-Allow-Methods: POST, OPTIONS`, and
`Access-Control-Allow-Headers: authorization, content-type`.

For iPhone Expo Go:

```txt
EXPO_PUBLIC_API_BASE_URL=http://<LAN_IP>:3000
```

## 3. Final mobile validation

- Use Expo Go on iPhone only for smoke testing.

## 4. Future V1 replacement

- Build a real browser app later using Next.js, after mobile/reviewer flow is
  stable.
