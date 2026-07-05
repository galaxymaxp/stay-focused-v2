# Phase 5A Canvas Hardening - 2026-07-05

## Starting State

- Branch: `main`
- Starting commit: `81a8d86 docs(canvas): complete protected Phase 5A validation`
- Ahead/behind: 0 ahead, 0 behind
- Dirty baseline: `apps/api/next-env.d.ts`,
  `apps/mobile/expo-env.d.ts`, and untracked `apps/mobile/.gitignore`
- Audit source verdict: PASS WITH CONDITIONS

## Findings Closed

| Finding | Severity | Fix | Result |
| --- | --- | --- | --- |
| F1 strict Base64 | MEDIUM | Added canonical padded Base64 validation for `CANVAS_TOKEN_ENCRYPTION_KEY`; stored ciphertext, IV, and authentication-tag fields now decode strictly and fail closed. | Closed |
| F2 atomic persistence | MEDIUM | Added `202607050003_harden_canvas_connection_persistence.sql` and `replace_canvas_connection_with_capabilities` RPC. | Closed |
| F3 two-user evidence | MEDIUM | Added realistic User A/User B route tests backed by a user-scoped in-memory database. | Closed |
| F4 redirect policy | LOW | Canvas client now uses `redirect: "manual"` and rejects all redirects with `canvas_redirect_rejected`. | Closed |
| F5 README | LOW | README now states Phase 5A is implemented, live validated, hardened, and Phase 5B-ready. | Closed |
| F6 ADR numbering | LOW | Renamed the later duplicate Fast Testing Surfaces ADR to ADR-011. | Closed |
| F7 request tests | LOW | Added malformed JSON, oversized body, URL/PAT length, content type, unsafe URL, type, empty, non-object, missing-field, and extra-field tests. | Closed |

## Strict Base64 Policy

- `CANVAS_TOKEN_ENCRYPTION_KEY`: canonical padded Base64 after trimming
  surrounding environment whitespace.
- Key decoded length: exactly 32 bytes.
- Ciphertext: canonical Base64, non-empty.
- IV: canonical Base64, exactly 12 decoded bytes.
- Authentication tag: canonical Base64, exactly 16 decoded bytes.
- Unsupported encryption version, malformed payload fields, tampered
  ciphertext, and tampered tags fail closed without echoing submitted values.

## Atomic Persistence Design

- API route: `PUT /api/canvas/connection`.
- RPC: `public.replace_canvas_connection_with_capabilities`.
- Transaction behavior: upsert the user connection, delete that user's old
  snapshot for the same connection, insert the complete new capability
  snapshot, and return safe connection columns in one PostgreSQL transaction.
- Failure behavior: a database error rolls back the connection replacement and
  capability replacement together.
- Ownership hardening: `canvas_connections` has unique `(id, user_id)`;
  `canvas_capabilities` has a composite `(canvas_connection_id, user_id)`
  foreign key referencing it with cascade delete preserved.
- Public execution: revoked from `public`, `anon`, and `authenticated`; granted
  to `service_role` for the server-side workflow.

## Database Verification

- `npx supabase db push --dry-run`: PASS; only
  `202607050003_harden_canvas_connection_persistence.sql` was pending.
- `npx supabase db push`: PASS; migration applied remotely.
- `npx supabase migration list`: PASS; remote history includes `202607050003`.
- Read-only remote checks: PASS for RPC existence, revoked public execution,
  service-role execution, validated capability ownership constraint, no
  ownership mismatch, RLS enabled, direct table grants revoked, and encrypted
  column access revoked.
- Non-fatal CLI warning: Docker Desktop was unavailable for pg-delta catalog
  caching after push; remote migration and read-only checks still passed.

## Authorization Evidence

- Automated two-user authorization validation: PASS.
- Live second-user authorization validation: not run.
- User A can read User A's Canvas connection.
- User B receives disconnected state while User A has a connection.
- User B cannot list courses using User A's stored PAT.
- User B cannot read User A's capability rows.
- User B disconnect attempts do not delete User A's connection.
- User B replacement creates/mutates only User B data; User A data remains
  unchanged.

## Redirect Policy

- Authenticated Canvas fetches use `redirect: "manual"`.
- Same-origin redirects are rejected.
- Cross-origin redirects are rejected.
- Authorization is not sent to the redirect target.
- Redirect errors do not include the token or redirect URL.

## Verification Results

- `npm run typecheck --workspace @stay-focused/canvas`: PASS.
- `npm run build --workspace @stay-focused/canvas`: PASS.
- `npm run test --workspace @stay-focused/canvas`: PASS; 22/22.
- `npm run typecheck --workspace @stay-focused/db`: PASS.
- `npm run typecheck --workspace apps/api`: PASS.
- `npm run build --workspace apps/api`: PASS.
- `npm run test --workspace apps/api`: PASS; 146/146.
- `npm run typecheck --workspace apps/mobile`: PASS.
- `npm run test --workspace apps/mobile`: PASS; 70/70.
- `npm run build`: PASS; Turbo 3 cached, 7 total.
- `npm run typecheck`: PASS on rerun after the root build regenerated
  `.next/types`; Turbo 5 cached, 7 total. The first parallel attempt raced with
  Next type generation and failed on missing `.next/types` artifacts.
- `npm run test --workspaces --if-present`: PASS; API 146/146, mobile 70/70,
  Canvas 22/22, OCR 14/14.

## Remaining Limitations

- Live second-user Canvas authorization validation was not run.
- Live Canvas pagination remains not exercised because the validating account
  did not require a second page.
- Canvas OAuth is not implemented and remains the future production
  authorization phase.
- Phase 5B academic graph synchronization has not begun.

## Readiness

Phase 5A hardening complete. Phase 5A quality conditions closed. Phase 5B ready
to begin when requested.
