# Phase 5D Protected Live-Validation Report

Validation date: 2026-07-08 Asia/Manila.

## 1. Starting state

* Branch: `main`
* Starting commit: `6ce4946`
* Ahead/behind: `main...origin/main`, no ahead/behind markers
* Dirty files: `apps/api/next-env.d.ts`, `apps/mobile/expo-env.d.ts`, `apps/mobile/.gitignore`
* Latest migration: `202607080002_harden_source_relationship_grants.sql`
* Unrelated files left untouched: `apps/api/next-env.d.ts`, `apps/mobile/expo-env.d.ts`, `apps/mobile/.gitignore`

## 2. Environment readiness

| Variable name | Present | Required | Notes |
| ------------- | ------: | -------: | ----- |
| `SUPABASE_URL` | Yes | Yes | Server Supabase URL. |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Yes | Server protected database access. |
| `SUPABASE_ANON_KEY` | Yes | Yes | User-scoped Supabase client alias. |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | No | Accepted public URL alias. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | No | Accepted public anon-key alias. |
| `EXPO_PUBLIC_SUPABASE_URL` | Yes | No | Accepted mobile URL alias. |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Yes | No | Accepted mobile anon-key alias. |
| `SMOKE_TEST_EMAIL` | Yes | Yes | Existing smoke-test identity. |
| `SMOKE_TEST_PASSWORD` | Yes | Yes | Existing smoke-test identity. |
| `CANVAS_TOKEN_ENCRYPTION_KEY` | Yes | Yes | Stored Canvas connection decrypt path. |
| `CANVAS_BASE_URL` | Yes | No | Reconnect fallback only; not used. |
| `CANVAS_PERSONAL_ACCESS_TOKEN` | Yes | No | Reconnect fallback only; not used. |
| `CANVAS_ACCESS_TOKEN` | No | No | Fallback alias only. |
| `CANVAS_LIVE_BASE_URL` | No | No | Fallback alias only. |
| `CANVAS_LIVE_PERSONAL_ACCESS_TOKEN` | No | No | Fallback alias only. |
| `GOOGLE_CLOUD_PROJECT_ID` | No | No | OCR avoided. |
| `GOOGLE_CLOUD_PROJECT` | Yes | No | OCR avoided. |
| `GOOGLE_CLOUD_CREDENTIALS_JSON` | Yes | No | OCR avoided. |
| `GOOGLE_APPLICATION_CREDENTIALS` | No | No | OCR avoided. |
| `OPENAI_API_KEY` | Yes | No | Reviewer generation avoided. |
| `SUPABASE_PROJECT_REF` | Yes | Yes | Supabase CLI migration verification. |
| `SUPABASE_ACCESS_TOKEN` | Yes | Yes | Supabase CLI migration verification. |
| `SUPABASE_DB_PASSWORD` | Yes | Yes | Supabase CLI migration verification. |

## 3. Protected authentication

| Check | Result | Notes |
| ----- | ------ | ----- |
| Supabase authentication | PASS | Existing smoke-test user signed in; no identity values recorded. |
| Server database access | PASS | Service-role access reached protected tables. |
| Canvas connection access | PASS | Stored encrypted connection reused as `connection-1`. |
| Encryption/decryption path | PASS | Sync used the stored encrypted connection; token columns stayed server-only. |
| Secrets absent from output | PASS | Harness output and API logs were scanned for token, bearer, key, source-text, and filename patterns. |

## 4. Remote database verification

| Check | Result | Notes |
| ----- | ------ | ----- |
| Migration history | PASS | Supabase CLI local/remote list aligned through `202607080002` using the tracked migration set. |
| Relationship storage | PASS | Phase 5D.3 SQL verifier passed 18/18 checks. |
| RLS | PASS | Phase 5D.1, 5D.2, 5D.3, and preserved Canvas policy checks passed. |
| Direct client grants | PASS | Private provenance, structure, relationship, and earlier Canvas direct grants remain restricted. |
| Service-role grants | PASS | Required service-role table/RPC grants are present. |
| Ownership constraints | PASS | Same-owner and cross-user rejection checks passed. |
| Same-snapshot constraints | PASS | Same-snapshot acceptance and cross-snapshot rejection checks passed. |
| Immutability | PASS | Snapshot, block, and relationship update rejection checks passed. |
| Existing policies preserved | PASS | Earlier Canvas RLS/direct grants and private Canvas source-file bucket policies passed 4/4 checks. |
| SQL verifier | PASS | Phase 5D.1 16/16, Phase 5D.2 18/18, Phase 5D.3 18/18. |

## 5. Canvas synchronization

* Opaque connection: `connection-1`
* Opaque course: `course-1`
* Sync result: `partial`
* Retry count: `0`
* Terminal error category: sanitized secondary failure summary; selected-course result category `none`
* Sanitized counts:

| Metric | Count |
| ------ | ----: |
| Courses | 1 |
| Modules | 1 |
| Module items | 4 |
| Pages | 38 |
| Assignments | 0 |
| Announcements | 11 |
| File metadata | 0 |
| Prepared sources | 0 |

## 6. Phase 5D.1 validation

| Check | Result | Notes |
| ----- | ------ | ----- |
| Structure session | PASS | Source loading proceeded from synchronized database state. |
| Supported source categories | PASS | Live list represented `page` and `announcement`; tests cover other categories. |
| Unsupported sources | PASS | Two unavailable sources were summarized without private details. |
| Selective preview | PASS | Preview returned only selected source/block counts. |
| Snapshot | PASS | One immutable snapshot created and removed. |
| Snapshot items | PASS | Two immutable items created and removed. |
| Source blocks | PASS | Two selected blocks copied into immutable storage. |
| Ordering | PASS | Structure and selected-preview ordering remained deterministic. |
| Raw Canvas IDs exposed | PASS | No raw Canvas IDs were recorded in validation output. |
| Hashes exposed | PASS | No hashes were recorded in validation output. |
| Relationship rows exposed | PASS | Relationship rows stayed private. |
| Automatic sync triggered | PASS | Source list, structure, preview, reviewer detail, and source-status checks did not trigger sync. |

## 7. Phase 5D.2 validation

| Check | Result | Notes |
| ----- | ------ | ----- |
| Reviewer ownership | PASS | Saved reviewer belonged to the smoke-test identity. |
| Snapshot linkage | PASS | Reviewer save accepted the owned snapshot. |
| Snapshot-item linkage | PASS | Snapshot contained two owned items. |
| Source-block linkage | PASS | Snapshot contained two selected blocks. |
| Immutable provenance | PASS | SQL verifiers covered immutable snapshot, block, and relationship rows. |
| Safe mobile summary | PASS | Detail summary exposed counts and version lists only. |
| Protected provenance detail | PASS | Detail route required bearer auth and returned safe provenance. |
| Unauthorized reviewer rejection | PASS | Invalid bearer token returned 401. |
| Cross-user ownership rejection | PASS | Covered by rollback SQL verifier and route tests. |
| Historical reviewer compatibility | PASS | SQL verifier covers historical no-block/no-relationship snapshots. |

## 8. Duplicate validation

| Check | Result | Live count | Notes |
| ----- | ------ | ---------: | ----- |
| Stable same-source groups | PASS | 0 | Live selected sources had no same-source group. |
| Exact full-content groups | PASS | 0 | Live selected sources had no exact duplicate group. |
| Canonical sources | PASS | 0 | Automated tests cover canonical submitted-order behavior. |
| Duplicates unselected by default | PASS | 0 | Automated tests cover unselected later exact duplicates. |
| Manually included duplicates | PASS | 0 | Live had no duplicate to include; automated tests cover manual selection. |
| Empty-content candidates excluded | PASS | 0 | Live source list excluded unavailable/empty content from selection. |
| No fuzzy or AI matching | PASS | 0 | Implementation/tests use exact identity and normalized SHA-256 only. |
| Hashes/raw identities exposed | PASS | 0 | No hashes or raw identities were recorded. |

## 9. Repeated-reference validation

| Check | Result | Live count or categories | Notes |
| ----- | ------ | ------------------------ | ----- |
| Module references | PASS | 0 | Automated coverage verifies unambiguous module-only handling. |
| Page references | PASS | 0 | Broad category only. |
| Assignment references | PASS | 0 | Broad category only. |
| Announcement references | PASS | 0 | Broad category only. |
| File relationships private | PASS | 0 | Relationship table inaccessible to direct mobile clients. |
| Same-snapshot ownership | PASS | SQL PASS | Phase 5D.3 verifier covers same-snapshot constraints. |
| Snapshot reuse | PASS | SQL PASS | Phase 5D.3 verifier covers no duplicate relationship rows. |
| Ordering | PASS | SQL/API PASS | Deterministic ordering covered by verifier and route tests. |

## 10. Source-status result

| State | Live count | Automated coverage when zero | Notes |
| ----- | ---------: | ---------------------------- | ----- |
| Current | 2 | N/A | Live status returned `current`. |
| Changed | 0 | API source-status service tests | Covered without editing Canvas content. |
| Unavailable | 0 | API source-status service tests | Covered without editing Canvas content. |
| Unsupported | 0 | API source-status service and mobile parser tests | Covered without broader parser work. |
| Missing after sync | 0 | API source-status service tests | Covered with authoritative later-sync fixtures. |
| Unknown | 0 | API source-status service tests | Covered with ambiguous/historical fixtures. |

* Overall status: `current`
* Regeneration readiness: `ready_current`
* Explicit synchronization triggered: No
* Canvas called: No
* Credential decrypted: No
* Storage objects read: No
* OCR invoked: No
* OpenAI invoked: No
* Reviewer regenerated: No

## 11. Side-effect comparison

| Metric | Before | After | Expected | Result |
| ------ | -----: | ----: | -------: | ------ |
| Sync-job count | 24 | 24 | 24 | PASS |
| Latest sync marker | Present unchanged | Present unchanged | Unchanged | PASS |
| Prepared-source count | 3 | 3 | 3 | PASS |
| OCR invocation count | not observable with existing instrumentation | not observable with existing instrumentation | No invocation by route design/tests | PASS |
| Reviewer-generation count | not observable with existing instrumentation | not observable with existing instrumentation | No invocation by route design/tests | PASS |
| Storage read count | not observable with existing instrumentation | not observable with existing instrumentation | No object read by route design/tests | PASS |

## 12. Authorization and privacy

| Assertion | Result | Notes |
| --------- | ------ | ----- |
| Another user cannot access reviewer | PASS | Covered by route tests and invalid-token live rejection. |
| Another user cannot access snapshot | PASS | SQL ownership verifier and direct-client checks passed. |
| Relationship rows inaccessible to direct mobile clients | PASS | Anonymous and user-scoped direct selects returned no relationship rows. |
| Protected route output contains only approved fields | PASS | Source-status safe-key check passed. |
| Strict parsers reject private fields | PASS | Mobile parser tests passed. |
| Logs contain no secret values | PASS | API validation logs scanned clean. |
| Logs contain no private source content | PASS | API validation logs scanned clean. |

## 13. Cleanup

* Temporary records created: 1 reviewer, 1 source snapshot, 2 snapshot items, 2 snapshot blocks, 1 preview session, 1 structure session
* Temporary records removed: 1 reviewer, 1 source snapshot with dependent rows, 1 preview session, 1 structure session
* Connection final state: unchanged stored connection
* Before/after sanitized counts:

| Metric | Before | After cleanup |
| ------ | -----: | ------------: |
| Reviewers | 0 | 0 |
| Preview sessions | 0 | 0 |
| Structure sessions | 0 | 0 |
| Snapshots | 0 | 0 |
| Snapshot items | 0 | 0 |
| Snapshot blocks | 0 | 0 |
| Snapshot relationships | 0 | 0 |
| Sync runs | 23 | 24 |
| Courses | 76 | 76 |
| Modules | 27 | 27 |
| Module items | 311 | 311 |
| Pages | 459 | 459 |
| Assignments | 25 | 25 |
| Announcements | 19 | 19 |
| Files | 52 | 52 |
| File references | 15 | 15 |
| Prepared files | 3 | 3 |

* Pre-existing data preserved: Yes. The additional sync run is the expected explicit controlled synchronization record.

## 14. Automated verification

| Command | Result | Fresh/cached | Notes |
| ------- | ------ | ------------ | ----- |
| `npm run test --workspace apps/api` | PASS | Fresh | Focused first run. |
| `npm run test --workspace apps/mobile` | PASS | Fresh | Focused first run. |
| `npm run test --workspace @stay-focused/canvas` | PASS | Fresh | Focused first run. |
| `npm run typecheck --workspace @stay-focused/db` | PASS | Fresh |  |
| `npm run typecheck --workspace @stay-focused/shared` | PASS | Fresh |  |
| `npm run build --workspace @stay-focused/shared` | PASS | Fresh |  |
| `npm run test --workspace @stay-focused/shared --if-present` | PASS | Fresh | No test script required. |
| `npm run typecheck --workspace @stay-focused/canvas` | PASS | Fresh |  |
| `npm run build --workspace @stay-focused/canvas` | PASS | Fresh |  |
| `npm run test --workspace @stay-focused/canvas` | PASS | Fresh |  |
| `npm run typecheck --workspace @stay-focused/ocr` | PASS | Fresh |  |
| `npm run build --workspace @stay-focused/ocr` | PASS | Fresh |  |
| `npm run test --workspace @stay-focused/ocr` | PASS | Fresh |  |
| `npm run typecheck --workspace apps/api` | PASS | Fresh |  |
| `npm run build --workspace apps/api` | PASS | Fresh |  |
| `npm run test --workspace apps/api` | PASS | Fresh |  |
| `npm run typecheck --workspace apps/mobile` | PASS | Fresh |  |
| `npm run test --workspace apps/mobile` | PASS | Fresh |  |
| `npm run typecheck --workspace @stay-focused/engine` | PASS | Fresh |  |
| `npm run build --workspace @stay-focused/engine` | PASS | Fresh |  |
| `npm run eval --workspace @stay-focused/engine` | PASS | Fresh |  |
| `npm run typecheck` | PASS | Fresh invocation | Turbo-managed workspace run. |
| `npm run build` | PASS | Rerun after generated cleanup | Initial run hit a generated `.next` readlink artifact; after removing only `apps/api/.next`, the aggregate build passed. |
| `npm run test --workspaces --if-present` | PASS | Fresh invocation | Workspace test sweep passed. |
| `git diff --check` | PASS | Fresh | Later final git checks also required. |

## 15. Defects found and fixed

| Defect | Root cause | Fix | Regression test |
| ------ | ---------- | --- | --------------- |
| None | N/A | N/A | N/A |

## 16. Files changed

Task-related files:

* `docs/ai/phase5d-protected-live-validation-20260708.md`
* `docs/current-state.md`
* `docs/roadmap.md`
* `docs/ai/current_sprint.md`
* `docs/ai/handoff.md`

## 17. Git result

* Commit or commits: `docs(canvas): complete protected Phase 5D live validation`
* Push result: recorded in final task output
* Ahead/behind: recorded in final task output
* Remaining dirty files: known unrelated generated files only before commit
* Unrelated files untouched: `apps/api/next-env.d.ts`, `apps/mobile/expo-env.d.ts`, `apps/mobile/.gitignore`

## 18. Deferred scope

These remain deferred:

* reviewer regeneration
* source and block diff UI
* automatic source monitoring
* background synchronization
* queues and cron
* fuzzy duplicate detection
* broader file parsers
* Phase 5E grade and submission work
* Phase 5F resilient and background synchronization

## 19. Verdict

```text
PASS — protected Phase 5D.1–5D.3 live validation completed
```

Phase 5E planning is the next step. No Phase 5E implementation was started.
