# ADR-008 - Canvas Credential Storage

Date: 2026-07-05

Status: Accepted

## Context

Phase 5A uses Canvas personal access tokens because they are the smallest
implementation path for validating Canvas connectivity and course discovery in
the capstone slice. Personal access tokens are sensitive server secrets and must
not be exposed to mobile bundles, persisted on the device, logged, or returned
from the API.

OAuth is a stronger production direction, but it requires Canvas developer-key
setup and institution approval that may not be available for the current local
vertical slice.

## Decision

Canvas personal access tokens are submitted only to the protected Stay Focused
API. The API validates the token against Canvas before persistence. Valid tokens
are encrypted with Node's built-in AES-256-GCM support using
`CANVAS_TOKEN_ENCRYPTION_KEY`, a random IV, an authentication tag, and an
encryption version.

Encrypted credentials remain server-only. Mobile does not permanently store the
Canvas token and receives only safe connection metadata. Canvas OAuth remains a
later production-hardening option.

## Consequences

- API routes that encrypt or decrypt Canvas tokens require the Node runtime.
- Decryption fails closed; there is no plaintext fallback and no generated
  permanent key.
- Replacement credentials are validated before the existing connection is
  changed.
- Live validation requires a safely configured HTTPS API and real Canvas
  credentials; mocked automated tests are sufficient for local implementation
  when those are unavailable.
