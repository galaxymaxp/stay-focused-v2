# Phase 5B.3A Course Recovery Hardening - 2026-07-06

## Scope

Phase 5B.3A hardens the manually triggered Canvas academic graph
synchronization added in Phase 5B.2. It replaces generic course-fetch failures
with operation-specific diagnostics, adds bounded transient retries, and stores
sanitized per-course sync outcomes.

Phase 5B.2 remains closed. This phase does not add incremental sync, scheduled
sync, background workers, Canvas webhooks, secondary Canvas resources, files,
submissions, grades, reviewer generation, mobile UI, or automatic app-launch
sync.

## Previous Pattern

The Phase 5B.2 live account repeatedly returned:

- 17 courses discovered
- 13 courses succeeded
- 4 courses failed
- Generic failure code: `canvas_course_fetch_failed`
- No duplicate identities
- No running sync rows left behind

The failed course snapshots were not persisted, and successful courses committed
through the existing atomic per-course RPC.

## Implementation

- Error boundary: `packages/canvas/src/client.ts` now distinguishes
  `canvas_not_found` and `canvas_network_error`, preserves safe HTTP status, and
  records parsed `Retry-After` metadata without response bodies.
- Orchestrator: `apps/api/src/lib/canvas-sync.ts`
- Normalization boundary: unchanged in `apps/api/src/lib/canvas-sync-normalize.ts`
- Diagnostic migration:
  `202607050007_add_canvas_sync_course_results.sql`
- Diagnostic RPC: `record_canvas_sync_course_result`
- Verification script: `scripts/phase5b3a-recovery-verification.sql`

Persisted course diagnostics contain only the owning user/connection/run,
status, a server-side course fingerprint, sanitized failure code, failed
operation, failure category, HTTP status class, retryability, retry count, and
duration. They do not store course names, Canvas course IDs, Page titles, Page
bodies, assignment names, assignment descriptions, URLs, PATs, authorization
headers, raw Canvas responses, or stack traces.

## Retry Policy

- Maximum retries: 2 after the initial attempt
- Retryable: 429, 5xx Canvas unavailable responses, network failure, timeout
- Non-retryable: 400/401/403/404, malformed response, redirect rejection,
  pagination rejection, ownership failures, and persistence failures
- Backoff: bounded exponential backoff
- `Retry-After`: honored when valid and capped at 2 seconds
- Timeout: Canvas requests retain a finite AbortController timeout

Retries happen before persistence. A course snapshot still reaches the database
only after every required collection succeeds.

## Concurrency

Phase 5B.2 limits are preserved:

- Courses: 2
- Module-item requests: 3 global
- Page-detail requests: 3 global

No unbounded request fan-out was added.

## Live Results

First hardened live run:

- HTTP result: 200
- Status: `partial`
- Duration: 52.318 seconds
- Courses discovered: 17
- Courses succeeded: 13
- Courses failed: 4
- Courses recovered by retry: 0
- Total retry attempts: 0
- Sanitized failure counts: `canvas_course_pages_failed`: 4
- Modules: 27
- Module items: 311
- Pages: 459
- Assignment groups: 18
- Assignments: 25
- Remaining running runs: 0

Second hardened live run:

- HTTP result: 200
- Status: `partial`
- Duration: 50.622 seconds
- Courses discovered: 17
- Courses succeeded: 13
- Courses failed: 4
- Courses recovered by retry: 0
- Total retry attempts: 0
- Sanitized failure counts: `canvas_course_pages_failed`: 4
- Remaining running runs: 0

The four failed courses are now classified as Page-listing failures with
`resource_not_found`, HTTP 4xx, non-retryable, and retry count 0. The failures
were stable across both runs and no generic `canvas_course_fetch_failed` result
remained.

## Atomicity Evidence

- Duplicate graph identities after the second run: 0
- Internal identities stable on the second run: yes
- `first_synced_at` stable on the second run: yes
- `last_synced_at` advanced for successful courses: yes
- Failed course snapshots were not persisted.
- Incomplete course fetches cannot prune existing graph rows.
- The run remained partial: successful courses committed, failed courses were
  preserved.

## Remote Verification

- Remote migration history includes `202607050007`.
- `scripts/phase5b3a-recovery-verification.sql` passed against the linked
  remote project.
- Verification covers diagnostic ownership constraints, sync-run relationship,
  valid status constraints, valid failure-code storage, upsert duplicate
  prevention, RLS, revoked direct `anon`/`authenticated` grants, service-role
  RPC execution, public RPC execution revocation, cascade behavior via the
  sync-run relationship, and unchanged earlier Canvas table protections.

## Automated Verification

Focused and final verification:

- `npm run typecheck --workspace @stay-focused/canvas`: PASS, fresh
- `npm run build --workspace @stay-focused/canvas`: PASS, fresh
- `npm run test --workspace @stay-focused/canvas`: PASS, fresh, 33/33
- `npm run typecheck --workspace @stay-focused/db`: PASS, fresh
- `npm run typecheck --workspace apps/api`: PASS, fresh
- `npm run build --workspace apps/api`: PASS, fresh
- `npm run test --workspace apps/api`: PASS, fresh, 160/160
- `npm run typecheck --workspace apps/mobile`: PASS, fresh
- `npm run test --workspace apps/mobile`: PASS, fresh, 76/76
- `npm run typecheck`: PASS, 7/7 workspaces; 4 fresh and 3 cached
- `npm run build`: PASS, 7/7 workspaces; 4 fresh and 3 cached
- `npm run test --workspaces --if-present`: PASS, API 160/160, mobile 76/76,
  Canvas 33/33, OCR 14/14
- `git diff --check`: PASS with line-ending warnings only

## Security Review

- PAT remains decrypted only inside the API process.
- No environment-token fallback was added.
- Retry diagnostics do not include PATs, bearer tokens, authorization headers,
  Canvas URLs, raw response bodies, stack traces, or private academic content.
- The API response returns aggregate failure counts only.
- The diagnostic table stores a non-reversible course fingerprint rather than
  raw Canvas course identifiers.
- Redirect rejection and same-origin pagination protections remain active.
- Public RPC execution remains revoked.
- Direct Canvas table grants remain revoked.

## Runtime Observation

The hardened live runs completed in 52.318 seconds and 50.622 seconds, within
the current synchronous route window for this observed account. Because the
four failures are non-retryable, retry hardening did not add runtime during live
validation. Larger accounts or transient Canvas outages may still require
resumable or background synchronization in a later phase.

## Deferred Work

- Phase 5B.3B incremental academic graph synchronization foundation
- Secondary Canvas resources
- Recovery and resume semantics for larger accounts
- Scheduled/background synchronization
- Mobile synchronization UI
- Canvas OAuth production authorization
