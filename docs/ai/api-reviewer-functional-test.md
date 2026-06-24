# API reviewer functional timeout test

`npm run validate:api-reviewer --workspace @stay-focused/engine` recreates the Expo Go reviewer-generation request path without UI rendering or Expo automation.

The script sends OCR-style fixture text through the same API route and mobile request shape used by the app: OCR fixture text -> authenticated POST to `/api/reviewer/generate` -> engine pipeline -> API reviewer response. It uses a 120,000 ms client timeout and writes diagnostics to `docs/ai/api-reviewer-functional-output.json` and `docs/ai/api-reviewer-functional-audit.md`.

The script automatically loads repo-root `.env.local`. Existing PowerShell or
process environment variables take precedence over values from `.env.local`.

Required configuration:

- API base URL: `API_BASE_URL`, `EXPO_PUBLIC_API_BASE_URL`, or `NEXT_PUBLIC_API_BASE_URL`

Authentication can use either:

- `SUPABASE_ACCESS_TOKEN` as an optional manual fallback, or
- Supabase email/password sign-in using:
  - Supabase URL: `EXPO_PUBLIC_SUPABASE_URL`, `SUPABASE_URL`, or `NEXT_PUBLIC_SUPABASE_URL`
  - Supabase anon key: `EXPO_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_ANON_KEY`, or `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - Test user email: `TEST_SUPABASE_EMAIL`, `TEST_USER_EMAIL`, or `email`
  - Test user password: `TEST_SUPABASE_PASSWORD`, `TEST_USER_PASSWORD`, or `pass`

Repo-root `.env.local` example:

```dotenv
API_BASE_URL=http://localhost:3000
EXPO_PUBLIC_SUPABASE_URL=...
EXPO_PUBLIC_SUPABASE_ANON_KEY=...
email=...
pass=...
```

PowerShell example:

```powershell
$env:API_BASE_URL="http://localhost:3000"
$env:EXPO_PUBLIC_SUPABASE_URL="<your project url>"
$env:EXPO_PUBLIC_SUPABASE_ANON_KEY="<your anon key>"
$env:TEST_SUPABASE_EMAIL="<test user email>"
$env:TEST_SUPABASE_PASSWORD="<test user password>"
npm run validate:api-reviewer --workspace @stay-focused/engine
```
