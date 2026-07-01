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

For laptop browser / Expo Web:

```txt
EXPO_PUBLIC_API_BASE_URL=http://localhost:3000
```

For iPhone Expo Go:

```txt
EXPO_PUBLIC_API_BASE_URL=http://<LAN_IP>:3000
```

## 3. Final mobile validation

- Use Expo Go on iPhone only for smoke testing.

## 4. Future V1 replacement

- Build a real browser app later using Next.js, after mobile/reviewer flow is
  stable.
