# Phase 3C Camera OCR Validation

Date: 2026-07-04, Asia/Manila.

## Status

Camera capture implementation is complete and automated checks pass. Real
physical-device gallery/camera OCR validation is blocked by local environment
state, not by the Phase 3C client code:

- No Android device is attached over ADB.
- The iPhone Expo Go flow requires someone to open the LAN Expo session on the
  phone; it cannot be driven from this workspace alone.
- The Google Application Default Credentials path configured in local env points
  to a missing file, so live Google Vision OCR returns a safe
  `ocr_provider_failed` response.

## Completed Verification

- `npm run lint --workspace apps/mobile`: passed.
- `npm run typecheck --workspace apps/mobile`: passed.
- `npm run test --workspace apps/mobile`: 37 passed, 0 failed.
- `npm run test --workspace @stay-focused/ocr`: 10 passed, 0 failed.
- `npm run test --workspace apps/api`: 43 passed, 0 failed.
- `npm run test:reviewer-web-smoke`: 51 passed, 0 failed.
- `npm run typecheck --workspace apps/api`: passed.
- `npm run typecheck --workspace @stay-focused/ocr`: passed.
- `npm run typecheck --workspace @stay-focused/engine`: passed.
- `npm run build --workspace @stay-focused/engine`: passed.
- `npm run eval --workspace @stay-focused/engine`: 266 passed, 0 failed.
- `npm run smoke:ocr:web`: passed with mocked OCR response and real reviewer
  generation.

## Live OCR Attempt

The API was started on `0.0.0.0:3000`, a disposable PNG with fictional study
text was generated locally, a smoke Supabase session was exchanged for a bearer
token, and the image was posted as authenticated multipart form data to:

```text
POST /api/ocr/extract
```

Observed route behavior:

- Authenticated request reached the OCR route.
- Multipart image upload reached the server.
- With app-local Google OCR env values empty, the route returned
  `ocr_not_configured`.
- With root Google env injected, the route invoked the Google provider path and
  returned `ocr_provider_failed` because the configured credentials file was
  missing.

No uploaded image was persisted to Supabase Storage or a database.

## Required To Complete Physical Validation

1. Put valid Google OCR credentials in the API process environment, either as
   non-empty `GOOGLE_CLOUD_CREDENTIALS_JSON` plus project id or as a valid
   `GOOGLE_APPLICATION_CREDENTIALS` path plus project id.
2. Keep `apps/mobile/.env.local` pointed at the laptop LAN API URL for the
   current Wi-Fi network.
3. Start the API with `--hostname 0.0.0.0 --port 3000`.
4. Start Expo and open the app on a physical phone.
5. Run both the gallery and camera OCR checklists in
   `docs/dev/mobile-device-runbook.md`.
