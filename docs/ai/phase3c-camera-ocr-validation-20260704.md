# Phase 3C Camera OCR Validation

Date: 2026-07-04, Asia/Manila.

## Status

Camera capture implementation is complete and automated checks pass. Real
physical-device gallery/camera OCR validation is blocked by local environment
state, not by the Phase 3C client code:

- The target device is an iPhone, so ADB is not part of this validation path.
- The iPhone Expo Go flow requires someone to open the LAN Expo session on the
  phone; it cannot be driven from this workspace alone.
- The Google Application Default Credentials path configured in local env points
  to a missing file, so live Google Vision OCR returns a safe
  `ocr_provider_failed` response.
- A follow-up credential audit found no valid service-account or authorized-user
  ADC JSON file in the standard private locations checked on this machine.

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

## Follow-up Credential Audit

Latest local audit:

- Current branch: `main`.
- Current commit: `57b8811 feat(ocr): add camera capture source`.
- `origin/main` contains `57b8811`.
- Working tree before this audit was clean.
- `apps/api/.env.local` has no usable Google OCR credential configuration.
- Root env has a Google project value and a credential path, but the referenced
  credential file does not exist.
- `GOOGLE_CLOUD_CREDENTIALS_JSON` is not configured with parseable JSON.
- Standard private credential locations checked: no valid service-account JSON
  and no valid authorized-user ADC JSON were found.
- Phone health check was not run because the credential stop condition was met
  before starting the physical-device environment.

Latest minimum regression after the audit:

- `npm run typecheck --workspace apps/api`: passed.
- `npm run typecheck --workspace apps/mobile`: passed.
- `npm run smoke:reviewer:web`: passed with reviewer POST HTTP 200 and passed
  source-faithful, coverage, and clean-output statuses.
- `npm run smoke:ocr:web`: passed with mocked OCR response, authenticated
  multipart OCR POST HTTP 200, editable extracted text, reviewer POST HTTP 200,
  and passed source-faithful, coverage, and clean-output statuses.
- `git diff --check`: passed with line-ending warnings only.
- One transient OCR smoke startup attempt hit stale generated Next output under
  `.next`; clearing the generated API `.next` directory resolved it. No source
  code change was required.

## Required To Complete Physical Validation

1. Put valid Google OCR credentials in the API process environment, either as
   non-empty `GOOGLE_CLOUD_CREDENTIALS_JSON` plus project id or as a valid
   `GOOGLE_APPLICATION_CREDENTIALS` path plus project id.
2. Keep the credential file outside the repository, outside tracked files, and
   preferably outside OneDrive.
3. Keep `apps/mobile/.env.local` pointed at the laptop LAN API URL for the
   current Wi-Fi network.
4. Start the API with `--hostname 0.0.0.0 --port 3000`.
5. Start Expo and open the app on a physical phone.
6. Run both the gallery and camera OCR checklists in
   `docs/dev/mobile-device-runbook.md`.
