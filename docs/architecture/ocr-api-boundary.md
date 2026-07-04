# OCR API Boundary

Last refreshed: 2026-07-04, Asia/Manila.

Phase 3A added the server-side OCR boundary before camera, gallery, or
scanned-PDF UI work. Phase 3B adds the first mobile client for that boundary:
gallery-selected PNG/JPEG images are previewed locally, uploaded to the
protected OCR route, and converted into editable source text before reviewer
generation. The boundary accepts authenticated image uploads, invokes a
server-only OCR provider, normalizes extracted text, and returns typed JSON that
preserves useful page, block, paragraph, and line structure.

## Package Boundary

`packages/ocr` is provider-agnostic. It exports:

- `OcrInput` and `OcrImageInput`
- `OcrPage`, `OcrBlock`, and `OcrLine`
- `OcrResult`
- `OcrProvider`
- `OcrProviderError`
- deterministic OCR text and layout normalization helpers

This package must not import Google Cloud SDKs, Supabase, Next.js, mobile code,
reviewer prompts, or engine internals.

Google Cloud Vision code lives only under `apps/api/src/lib/ocr`. The adapter
implements the provider-agnostic `OcrProvider` interface through an injected
client boundary, so tests use fake clients and normal test runs make no Google
requests.

## API Route

- Route: `POST /api/ocr/extract`
- Runtime: Next.js node runtime
- Auth: Supabase `Authorization: Bearer <token>` verified by the existing API
  auth helper before multipart parsing
- Request format: `multipart/form-data`
- File field: `image`
- Supported image types: `image/png`, `image/jpeg`
- Maximum image size: `5,242,880` bytes, or 5 MiB
- Scanned PDFs: out of scope until Phase 3D

The success response follows the existing API envelope style:

```json
{
  "ok": true,
  "data": {
    "text": "STUDY HABITS\nSet one clear goal before studying.",
    "pages": [],
    "mimeType": "image/png",
    "provider": "google-cloud-vision",
    "warnings": []
  }
}
```

The route never returns credentials, stack traces, internal file paths,
temporary names, uploaded bytes, raw Google responses, or Supabase internals.

## Mobile Client Flow

The Expo client uses `expo-image-picker` for gallery selection only. Camera
capture remains Phase 3C. The client:

- requests media-library access only when the user chooses an image
- restricts selection to one image
- accepts PNG/JPEG images and rejects unsupported MIME types when metadata is
  available
- rejects known oversized or empty files before upload
- previews only the local selected URI
- sends authenticated multipart form data to `POST /api/ocr/extract`
- does not manually set the multipart `Content-Type` boundary
- puts OCR text into an editable review field before reviewer generation
- sends only the edited source text and optional source title to
  `POST /api/reviewer/generate`

Images are not uploaded to Supabase Storage, saved to the database, logged,
persisted, or included in reviewer generation. The reviewer engine remains
unaware of whether the source text came from paste or OCR.

## Safe Error Codes

- `unauthorized`
- `unsupported_media_type`
- `invalid_image`
- `image_too_large`
- `empty_image`
- `ocr_not_configured`
- `ocr_provider_failed`
- `ocr_empty_result`
- `internal_error`

Provider failures are returned as safe typed errors. The Google adapter may see
provider-specific responses internally, but those raw objects are not included
in `OcrResult` or API responses.

## Normalization Rules

OCR normalization is deterministic only:

- CRLF and CR are normalized to LF.
- Null characters are removed.
- Trailing whitespace is trimmed from each line.
- Intentional blank lines inside extracted text are preserved.
- Repeated spaces inside lines are preserved.
- Pages, blocks, and lines keep stable ordering.
- Coordinates are used to sort out-of-order blocks or lines when available.
- Empty provider output is handled safely and mapped to `ocr_empty_result` by
  the server route.
- No AI rewriting, correction, summarization, or content fabrication occurs.

## Google Cloud Configuration

Server-only env names:

- `GOOGLE_CLOUD_PROJECT_ID`
- `GOOGLE_CLOUD_PROJECT`
- `GOOGLE_CLOUD_CREDENTIALS_JSON`
- `GOOGLE_APPLICATION_CREDENTIALS`

`GOOGLE_CLOUD_CREDENTIALS_JSON` supports escaped private-key newlines. The
factory also allows Application Default Credentials when a project or
credentials path is configured. Google credentials must never be placed in
Expo public env variables, committed files, logs, or API responses.

## Test Strategy

Normal tests use fake clients only:

- `@stay-focused/ocr` normalization tests cover headings, paragraphs, bullet
  lists, blank lines, Windows line endings, empty output, page boundaries,
  repeated spaces, trailing whitespace, and coordinate ordering.
- Google adapter tests inject fake Google clients and cover layout mapping,
  paragraph preservation, confidence, missing optional fields, empty output,
  malformed output, provider exceptions, safe wrapping, and raw-response
  leakage prevention.
- API route tests mock auth and OCR provider creation to cover auth rejection,
  missing files, MIME rejection, size rejection, empty files, valid PNG/JPEG,
  provider failures, missing configuration, and safe error bodies.
- Mobile OCR client tests cover multipart request construction, bearer auth,
  base URL normalization, success parsing, safe API error mapping, network
  failures, cancellation, and secret redaction.
- Mobile source-flow tests cover paste fallback, image mode, picker failures,
  selected image state, OCR loading/success/failure, line-break preservation,
  retry, clearing imported images, switching modes, and edited OCR text entering
  reviewer generation.
- `npm run smoke:ocr:web` uses Expo Web with a non-production fixture hook and a
  mocked OCR API response. It verifies the browser gallery-intake UI path,
  editable extracted text, and real reviewer generation without opening an
  operating-system file picker or requiring live Google OCR credentials.

Manual paste remains supported through the reviewer generation flow. Live Google
OCR and physical-device validation remain credential-dependent and are tracked
for Phase 3C with camera capture.
