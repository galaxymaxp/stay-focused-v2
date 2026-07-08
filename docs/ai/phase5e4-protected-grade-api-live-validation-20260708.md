# Phase 5E.4 Protected Grade API Live Validation

Validation date: 2026-07-08, Asia/Manila.

## Scope

This was a validation-first closeout of the protected Canvas grade API routes:

- `POST /api/canvas/courses/:courseId/grades/sync`
- `GET /api/canvas/courses/:courseId/grades`
- `GET /api/canvas/courses/:courseId/grades/:assignmentId`
- `GET /api/canvas/courses/:courseId/grades/summary`
- `GET /api/canvas/courses/:courseId/grades/sync-status`

No mobile service, UI, background job, cron, queue, polling, notification,
automatic synchronization, or schema change was added.

## Starting State

| Check | Result |
| --- | --- |
| Branch | `main` |
| Starting commit | `ff55a6ffbbe8d4a2a4c1fd404957c06d36dbeb9f` |
| Ahead/behind | `0/0` against `origin/main` |
| Dirty files at start | `apps/api/next-env.d.ts`, `apps/mobile/expo-env.d.ts`, `apps/mobile/.gitignore` |
| Unrelated files preserved | Yes; not edited, staged, restored, or committed |

## Implementation Inspection

| Boundary | Result |
| --- | --- |
| Route specificity | PASS; `summary`, `sync`, and `sync-status` are static route folders beside `[assignmentId]` |
| Authentication | PASS; every route uses `requireCanvasAuth` |
| Selected-course enforcement | PASS after fix; sync now preflights the same selected-course ownership boundary before Canvas sync |
| Assignment detail scoping | PASS; assignment and submission reads include user, connection, course, and assignment scope |
| Explicit safe column selection | PASS; read model uses named column lists, not `select("*")` |
| Visible wrappers | PASS; hidden/non-visible wrapper values are returned as `null` |
| GET route isolation | PASS; GET routes do not import the sync service, Canvas client, PAT decryption, Storage, OCR, OpenAI, or reviewer generation |
| Sanitized errors | PASS; raw SQL/internal details were not exposed |

## Environment Readiness

| Name | Status |
| --- | --- |
| `SUPABASE_URL` | present |
| `SUPABASE_SERVICE_ROLE_KEY` | present |
| `SUPABASE_ANON_KEY` alias | present |
| `SMOKE_TEST_EMAIL` | present |
| `SMOKE_TEST_PASSWORD` | present |
| `CANVAS_TOKEN_ENCRYPTION_KEY` | present |

Secrets printed: no.

## Live Readiness

| Check | Result |
| --- | --- |
| API health | PASS |
| Real Supabase bearer token | PASS |
| Active encrypted Canvas connection | PASS; count `1` |
| Selected course availability | PASS; selected count `2` |
| Unselected owned course availability | PASS; safe boundary case available |
| Grade data readiness | PASS; selected course with synchronized assignment/submission rows available |
| Live assignment/submission count | `18` assignments, `18` submission rows |
| Course-grade summary row count | `1` |

## Live Route Results

| Method | Route | HTTP result | Contract result | Notes |
| --- | --- | ---: | --- | --- |
| `POST` | `/api/canvas/courses/:courseId/grades/sync` | `200` | PASS | No body; sanitized aggregate |
| `POST` | `/api/canvas/courses/:courseId/grades/sync` | `200` | PASS | Empty JSON object; repeat sync remained bounded |
| `GET` | `/api/canvas/courses/:courseId/grades` | `200` | PASS | Default limit `50`, returned count `18` |
| `GET` | `/api/canvas/courses/:courseId/grades?limit=1&offset=0` | `200` | PASS | Returned count `1` |
| `GET` | `/api/canvas/courses/:courseId/grades?limit=1&offset=1` | `200` | PASS | Returned count `1`, no adjacent duplicate |
| `GET` | `/api/canvas/courses/:courseId/grades?limit=100&offset=0` | `200` | PASS | Returned count `18` |
| `GET` | `/api/canvas/courses/:courseId/grades/:assignmentId` | `200` | PASS | Detail used `assignment-1` label only |
| `GET` | `/api/canvas/courses/:courseId/grades/summary` | `200` | PASS | Static route resolved correctly |
| `GET` | `/api/canvas/courses/:courseId/grades/sync-status` | `200` | PASS | Static route resolved correctly |

Every successful response returned `Cache-Control: no-store`.

## Authentication And Ownership

| Check | Result | Notes |
| --- | --- | --- |
| Missing bearer token | PASS | All five routes returned `401` |
| Invalid bearer token | PASS | All five routes returned `401` |
| Unknown valid course UUID | PASS after fix | All five routes returned safe `404 canvas_course_not_found` |
| Owned but unselected course | PASS after fix | Sync returned `400 canvas_course_not_selected`; GET routes returned the same safe rejection |
| Selected owned course | PASS | Sync, list, detail, summary, and status permitted |
| Cross-course assignment reuse | PASS | Returned `404 canvas_assignment_not_found` |

## Sync Validation

| Check | Result | Notes |
| --- | --- | --- |
| Only explicit sync route calls Canvas | PASS | Code inspection and tests |
| No request body | PASS | `200`, sanitized aggregate |
| Empty JSON object | PASS | `200`, sanitized aggregate |
| Unknown field | PASS | `400 invalid_request` |
| Malformed body | PASS | `400 invalid_json` |
| Oversized body | PASS | `413 payload_too_large` |
| Repeat synchronization | PASS | Assignment/submission/summary/sync-state counts remained bounded |
| Sync private-data scan | PASS | No titles, course names, scores, grades, Canvas IDs, user IDs, connection IDs, tokens, fingerprints, or raw payloads |

## Assignment List And Pagination

| Check | Result | Notes |
| --- | --- | --- |
| Default limit | PASS | `50` |
| Maximum limit | PASS | `100` |
| Invalid limit/offset/unknown parameter | PASS | All safely rejected with `400` |
| Offset pagination | PASS | Adjacent `limit=1` pages returned no duplicate |
| Deterministic ordering | PASS | Due-date-first, due-date ascending, title secondary, internal assignment id final tie-breaker |
| DTO shape | PASS | Safe public DTO only |
| Unsafe-field scan | PASS | No forbidden keys or private values |

Returned titles were inspected only in memory for ordering and were not recorded.

## Assignment Detail

| Check | Result | Notes |
| --- | --- | --- |
| Owned assignment detail | PASS | `assignment-1` returned successfully |
| Unknown assignment | PASS | `404 canvas_assignment_not_found` |
| Cross-course reuse | PASS | `404 canvas_assignment_not_found` |
| Static route specificity | PASS | `summary` and `sync-status` hit static routes; `GET sync` returned static-route method rejection |
| Visible wrappers | PASS | Score `visible`, grade `visible` for the sampled detail |
| Unsafe-field scan | PASS | No submission row id, Canvas id, body, comment, attachment, rubric, URL, fingerprint, raw JSON, or unposted field |

No actual score or grade value was recorded.

## Summary And Sync Status

| Check | Result | Notes |
| --- | --- | --- |
| Summary route | PASS | Static route resolved |
| Summary wrappers | PASS | `currentScore: visible`, `currentGrade: hidden`, `finalScore: visible`, `finalGrade: hidden` |
| Hidden values | PASS | Hidden wrapper values were `null` |
| Sync-status route | PASS | Static route resolved |
| Sync status/family states | PASS | Valid sanitized states |
| Authoritative flag | PASS | Matched latest sync evidence |
| Timestamps | PASS | ISO/null shape checked; exact values not recorded |
| Stale threshold | PASS | Fresh explicit sync returned non-stale |
| Status read mutation | PASS | Two status reads returned identical sanitized status |
| Status GET isolation | PASS | No Canvas request path or PAT decryption path |

No actual score or grade value was recorded.

## Privacy And Isolation

| Check | Result | Notes |
| --- | --- | --- |
| Forbidden-key scan | PASS | Programmatic recursive key scan |
| Forbidden-value scan | PASS | Known private identifiers/credential material were not present |
| Serialized forbidden-token scan | PASS | Request-body validation wording was treated as safe non-academic text |
| GET Canvas request | PASS | No dependency path |
| GET PAT decryption | PASS | No dependency path |
| GET Storage/OCR/OpenAI/reviewer generation | PASS | No dependency path |
| GET database reads | PASS | Read model only |

## Defect Fixed

- Symptom: `POST /api/canvas/courses/:courseId/grades/sync` returned a safe
  aggregate `200` for a valid but unknown internal course UUID instead of the
  expected safe `404` route-boundary rejection.
- Root cause: the sync route validated UUID shape and then delegated directly
  to the sync service; context failures were serialized as failed sync
  aggregates before route-level course ownership/selection rejection.
- Fix: added `authorizeSelectedCanvasGradeCourse` in the grade read model and
  called it from the sync route before `syncCanvasCourseGrades`.
- Regression test: added sync-route coverage for unknown course `404` and
  unselected course `400` before synchronization.

## Automated Verification

| Command | Result | Notes |
| --- | --- | --- |
| `npm --workspace apps/api exec vitest run -- "src/lib/canvas-grade-read-model.test.ts" "app/api/canvas/courses/[courseId]/grades/route.test.ts" "app/api/canvas/courses/[courseId]/grades/[assignmentId]/route.test.ts" "app/api/canvas/courses/[courseId]/grades/summary/route.test.ts" "app/api/canvas/courses/[courseId]/grades/sync-status/route.test.ts" "app/api/canvas/courses/[courseId]/grades/sync/route.test.ts"` | PASS | 36 focused Phase 5E.4 tests |
| `npm --workspace apps/api run typecheck` | PASS | API TypeScript |
| `npm --workspace apps/api run lint` | PASS | API ESLint |
| `npm --workspace apps/api run test` | PASS | 383 API tests |
| `npm --workspace apps/api run build` | PASS | Next build included all five grade routes |
| `npm --workspace @stay-focused/canvas run test` | PASS | 69 Canvas tests |
| `npm --workspace @stay-focused/db run typecheck` | PASS | DB TypeScript |
| `npm run typecheck` | PASS | 7/7 workspaces |
| `npm run lint` | PASS | 7/7 workspaces |
| `git diff --check` | PASS | Exit 0; LF-to-CRLF warnings only |
| `git diff --cached --check` | PASS | Clean |

## Files Changed By This Closeout

- `apps/api/app/api/canvas/courses/[courseId]/grades/sync/route.ts`
- `apps/api/app/api/canvas/courses/[courseId]/grades/sync/route.test.ts`
- `apps/api/src/lib/canvas-grade-read-model.ts`
- `docs/ai/phase5e4-protected-grade-api-live-validation-20260708.md`
- `docs/ai/current_sprint.md`
- `docs/ai/handoff.md`
- `docs/current-state.md`
- `docs/roadmap.md`

## Verdict

```text
PASS WITH FIXES - Phase 5E.4 protected grade API live validation complete
```

Next roadmap task: Phase 5E.5 - Mobile grade experience.
