# Phase 5E.6 Mobile Grade Protected Live Validation

Validation date: 2026-07-13, Asia/Manila.

## 1. Starting State

- Branch: `main`
- Starting commit: `a63193af95c31ae083b4c206faf0315b8e1401db`
- Baseline commit message: `feat(mobile): add Canvas grade experience`
- Ahead/behind at start: `0/0`
- Dirty files at start: `apps/api/next-env.d.ts`,
  `apps/mobile/expo-env.d.ts`, untracked `apps/mobile/.gitignore`, and
  untracked `.vscode/`
- Baseline match: yes, direct Phase 5E.5 baseline
- Unrelated files preserved: yes

## 2. Environment Readiness

Presence only; no values were printed.

| Variable | Result |
| --- | --- |
| `SUPABASE_URL` | present |
| `SUPABASE_SERVICE_ROLE_KEY` | present |
| `CANVAS_TOKEN_ENCRYPTION_KEY` | present |
| `EXPO_PUBLIC_SUPABASE_URL` | present |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | present |
| `EXPO_PUBLIC_API_BASE_URL` | present |
| `SMOKE_TEST_EMAIL` | present |
| `SMOKE_TEST_PASSWORD` | present |

Sanitized aggregate readiness:

- Supabase authentication: available for the smoke account
- Encrypted Canvas connection count: 1
- Selected course count: 2
- Selected courses sampled: 2
- Selected courses with synchronized assignments: 1
- Existing synchronized assignment count in sample before live sync: 18
- Existing synchronized summary rows in sample: 2
- Running grade sync count before validation: 0
- Secrets printed: no

## 3. Automated Baseline

| Command | Result | Notes |
| --- | --- | --- |
| `npm --workspace apps/mobile run typecheck` | PASS | Mobile TypeScript |
| `npm --workspace apps/mobile run lint` | PASS | Mobile ESLint |
| `npm --workspace apps/mobile run test` | PASS | 8 files, 126 tests |
| `npm --workspace apps/api run typecheck` | PASS | API TypeScript |
| `npm --workspace apps/api run test` | PASS | 34 files, 383 tests |
| `npm --workspace apps/api run build` | PASS | Next build includes protected grade routes |
| `npm run typecheck` | PASS | 7/7 workspaces |
| `npm run lint` | PASS | 7/7 workspaces |
| `git diff --check` | PASS | Exit 0; line-ending warnings only on known generated env type files |

## 4. Live Service Startup

- API command: local Next dev server bound to `0.0.0.0:3000`
- API localhost health: PASS, safe payload matched `{ "status": "ok", "version": "2.0.0" }`
- API LAN health: PASS, same safe payload
- Expo Web command: Expo Web on port `8081` with LAN API base
- Expo localhost web: PASS
- Expo LAN status: PASS, packager status running
- Startup note: one generated `.next` diagnostic artifact caused a local
  `readlink` failure. Only generated `apps/api/.next` output was removed before
  restart; no source file was changed.

## 5. Protected API Preflight

One owned selected course with synchronized assignments was validated as
`course-1`; one assignment was validated as `assignment-1`.

| Method | Route label | HTTP result | Parser/shape result | Privacy result |
| --- | --- | ---: | --- | --- |
| GET | sync-status | 200 | accepted | no-store; 0 forbidden keys |
| GET | summary | 200 | accepted | no-store; 0 forbidden keys; 0 wrapper violations |
| GET | list page | 200 | accepted | no-store; 0 forbidden keys; 0 wrapper violations |
| GET | detail | 200 | accepted | no-store; 0 forbidden keys; 0 wrapper violations |

Additional protected pagination preflight:

- `limit=1&offset=0`: 200, one item
- `limit=1&offset=1`: 200, one item
- Adjacent duplicate internal assignment: no
- Pagination shape: accepted

## 6. Expo Web Request Validation

Automated smoke command:

```text
npm run smoke:canvas-grades:web -- --keep-services
```

Session-only command:

```text
npm run smoke:canvas-grades:web -- --session-only --keep-services
```

| User action | GET requests | POST sync requests | Result |
| --- | ---: | ---: | --- |
| Initial Grades mount | 3 | 0 | PASS |
| Idle wait | 0 | 0 | PASS |
| Reload view | 3 | 0 | PASS |
| Sync grades | 3 post-sync refresh GETs | 1 | PASS |
| Post-sync refresh | 3 | 0 additional | PASS |
| Assignment detail | 1 | 0 | PASS |

Protected web smoke evidence:

- Authentication: persisted session
- Selected grade entries observed: 4
- Assignment rows rendered after protected sync: 19 on first pass, 24 on
  session-only pass after live sync updated the synchronized data set
- Duplicate sync disabled while active: observed
- Detail GET count: 1
- Network warning during intercepted GET failure: visible
- Rows preserved during intercepted GET failure: passed
- Forbidden response key count in grade route responses: 0
- Wrapper violation count in grade route responses: 0

## 7. Course Summary Validation

No grade or score values were recorded.

| Wrapper | State classification | Render result |
| --- | --- | --- |
| Current score | visible | rendered |
| Current grade | unavailable | rendered as unavailable copy |
| Final score | visible | rendered |
| Final grade | unavailable | rendered as unavailable copy |

Confirmed:

- Hidden/unavailable values were not converted to zero.
- No local course total or weighted estimate appeared.
- Current and final wrappers stayed independent.

## 8. Assignment Experience

- Aggregate assignments rendered: 19 on first protected web pass; 24 on
  session-only pass after explicit sync
- Statuses observed in protected live data: `graded`, `graded_hidden`,
  `no_due_date`
- Detail route: protected detail GET used once for `assignment-1`
- Null-field behavior: detail rendered safe fields conditionally; no blank null
  labels were observed by the smoke flow
- Raw identifiers visible: no UUID or URL was visible in detail text
- Private content visible: no comments, bodies, attachments, rubric data,
  Canvas URLs, or raw identifiers were observed

## 9. Pagination

- Real UI pagination: not available; live first page did not expose `Load more`
  at default limit after sync
- Protected API pagination: PASS with `limit=1&offset=0` and
  `limit=1&offset=1`
- Fictional intercepted UI pagination: PASS, clearly separate from protected
  live evidence
- Duplicate result: PASS; intercepted duplicate was skipped and one new row was
  appended
- Ordering result: PASS; incoming fictional order was preserved after dedupe

## 10. Failure And Offline Behavior

| Scenario | Existing data preserved | UI result | Sync POST emitted |
| --- | --- | --- | --- |
| Initial network failure | N/A | covered by focused parser/presentation tests | 0 |
| Reload failure after load | yes | non-destructive warning visible | 0 |
| Load-more failure | yes | covered by focused presentation tests | 0 |
| Detail failure | N/A | covered by protected 404/direct regression checks | 0 |
| Recovery after network restore | yes | reload succeeded | 0 |

No durable offline cache, AsyncStorage grade persistence, SQLite, SecureStore
grade data, query persistence, background hydration, interval, app-state sync,
queue, cron, or background task was added.

## 11. Controlled Edge States

| State | Validation type | Result |
| --- | --- | --- |
| never synced | fictional deterministic component/test coverage | PASS |
| running | fictional deterministic presentation coverage | PASS |
| partial | protected live after sync plus fictional deterministic coverage | PASS |
| failed | fictional deterministic presentation coverage | PASS |
| stale | fictional deterministic web interception | PASS |
| empty authoritative list | fictional deterministic component/test coverage | PASS |
| hidden score | fictional deterministic web interception | PASS |
| hidden grade | protected live plus fictional deterministic web interception | PASS |
| unavailable score | fictional deterministic web interception | PASS |
| unavailable grade | protected live plus fictional deterministic web interception | PASS |
| unknown score | fictional deterministic web interception | PASS |
| unknown grade | fictional deterministic web interception | PASS |
| not applicable | fictional deterministic web interception | PASS |
| missing | fictional deterministic web interception | PASS |
| excused | fictional deterministic web interception | PASS |
| submitted late | fictional deterministic web interception | PASS |
| late unsubmitted | fictional deterministic web interception | PASS |
| locked | fictional deterministic web interception | PASS |
| unavailable assignment | fictional deterministic web interception | PASS |
| no due date | protected live plus fictional deterministic web interception | PASS |
| initial network failure | focused test coverage | PASS |
| reload failure after data loaded | protected web interception | PASS |
| load-more failure | focused test coverage | PASS |
| assignment detail 404 | protected direct request | PASS |
| malformed response | focused strict parser tests | PASS |

Fictional rows were intercepted in Playwright only and were not written to
Supabase or Canvas.

## 12. Authorization Regression Checks

| Scenario | Result |
| --- | --- |
| expired or invalid session | 401 `unauthorized`, sanitized |
| unselected course | 400 `canvas_course_not_selected`, sanitized |
| unknown owned-context course | 404 `canvas_course_not_found`, sanitized |
| assignment reused with another course | 404 `canvas_assignment_not_found`, sanitized |
| deleted or unavailable assignment | 404 `canvas_assignment_not_found`, sanitized |
| malformed response | invalid-response handling covered by parser tests |
| network timeout | retryable sanitized network error covered by parser tests |
| aborted request | stale request prevention covered by presentation tests |

Rejected identifiers were not printed.

## 13. Physical iPhone Validation

Status: `MANUAL VALIDATION REQUIRED`.

Codex did not directly observe the physical iPhone. The API and Expo services
were LAN-reachable from the development machine, but device checklist outcomes
were not supplied during this task. Phase 5E.6 must remain in progress until
the physical Expo Go checklist and device network-failure check are observed
and recorded.

| Check | Result | Notes |
| --- | --- | --- |
| app opens in Expo Go | MANUAL VALIDATION REQUIRED | Not observed by Codex |
| existing session restores or sign-in succeeds | MANUAL VALIDATION REQUIRED | Not observed by Codex |
| Courses screen opens | MANUAL VALIDATION REQUIRED | Not observed by Codex |
| selected course shows Grades | MANUAL VALIDATION REQUIRED | Not observed by Codex |
| tapping Grades opens correct screen | MANUAL VALIDATION REQUIRED | Not observed by Codex |
| loading state readable | MANUAL VALIDATION REQUIRED | Not observed by Codex |
| course summary fits | MANUAL VALIDATION REQUIRED | Not observed by Codex |
| hidden/unavailable copy readable | MANUAL VALIDATION REQUIRED | Not observed by Codex |
| assignments scroll | MANUAL VALIDATION REQUIRED | Not observed by Codex |
| status labels readable | MANUAL VALIDATION REQUIRED | Not observed by Codex |
| assignment detail opens | MANUAL VALIDATION REQUIRED | Not observed by Codex |
| detail content scrolls | MANUAL VALIDATION REQUIRED | Not observed by Codex |
| back navigation returns to list | MANUAL VALIDATION REQUIRED | Not observed by Codex |
| Reload view works | MANUAL VALIDATION REQUIRED | Not observed by Codex |
| Reload view does not POST | MANUAL VALIDATION REQUIRED | Needs device/network trace or manual confirmation |
| Sync grades progress visible | MANUAL VALIDATION REQUIRED | Not observed by Codex |
| duplicate sync taps blocked | MANUAL VALIDATION REQUIRED | Not observed by Codex |
| successful sync returns usable content | MANUAL VALIDATION REQUIRED | Not observed by Codex |
| raw identifiers/errors not visible | MANUAL VALIDATION REQUIRED | Not observed by Codex |
| touch targets practical | MANUAL VALIDATION REQUIRED | Not observed by Codex |
| Dynamic Type/long text usable | MANUAL VALIDATION REQUIRED | Not observed by Codex |
| rotation/resizing does not corrupt state | MANUAL VALIDATION REQUIRED | Not observed by Codex |
| device API-failure preservation | MANUAL VALIDATION REQUIRED | Not observed by Codex |

## 14. Privacy And Isolation

| Check | Result | Notes |
| --- | --- | --- |
| Secret scan | PASS | Phase 5E.6 logs/diagnostics scanned with no token/email/password hits |
| Private academic value scan | PASS | Smoke output uses aggregate counts and classifications only |
| Forbidden response-key scan | PASS | 0 forbidden keys in protected grade responses |
| Grade-to-reviewer isolation | PASS | Code inspection found grade APIs isolated from reviewer generation/source preview/OCR/OpenAI paths |
| Diagnostic redaction | PASS | New smoke diagnostics write sanitized metadata only; no response bodies persisted |

The browser profile under `.local/smoke/canvas-grades-web` intentionally stores
the reusable local smoke session and remains ignored by Git.

## 15. Defects Found

No product defects were found.

Validation harness defects fixed:

- Symptom: smoke checked for Grades before connected Canvas courses finished
  loading.
  Root cause: harness waited for the Courses header only.
  Fix: wait for `canvas-connected-state`.
  Regression test: harness unit tests plus live smoke rerun.
  Live revalidation: PASS.
- Symptom: smoke clicked a selected course without synchronized assignment rows.
  Root cause: harness assumed the first selected course had grade rows.
  Fix: try selected Grades entries until one renders assignment rows, while
  asserting every initial open remains GET-only.
  Regression test: live smoke rerun.
  Live revalidation: PASS.
- Symptom: `--session-only` checked the reviewer smoke profile instead of the
  canvas-grades profile.
  Root cause: reused authentication helper without a harness-local session
  candidate check.
  Fix: check `.local/smoke/canvas-grades-web/browser-profile`.
  Regression test: session-only smoke rerun.
  Live revalidation: PASS.

## 16. Final Verification

| Command | Result | Notes |
| --- | --- | --- |
| `npm --workspace apps/mobile run typecheck` | PASS | Mobile TypeScript |
| `npm --workspace apps/mobile run lint` | PASS | Mobile ESLint |
| `npm --workspace apps/mobile run test` | PASS | 8 files, 126 tests |
| `npm --workspace apps/api run typecheck` | PASS | API TypeScript |
| `npm --workspace apps/api run lint` | PASS | API ESLint |
| `npm --workspace apps/api run test` | PASS | 34 files, 383 tests |
| `npm --workspace apps/api run build` | PASS | Next production build |
| `npm --workspace @stay-focused/canvas run test` | PASS | 1 file, 69 tests |
| `npm --workspace @stay-focused/db run typecheck` | PASS | DB TypeScript |
| `npm run typecheck` | PASS | 7/7 workspaces |
| `npm run lint` | PASS | 7/7 workspaces |
| `git diff --check` | PASS | Exit 0; line-ending warnings only |
| `npm run test:canvas-grades-web-smoke` | PASS | 8 node tests |
| `npm run smoke:canvas-grades:web -- --keep-services` | PASS | Protected web smoke |
| `npm run smoke:canvas-grades:web -- --session-only --keep-services` | PASS | Persisted-session smoke |

## 17. Files Changed

- `package.json`
- `scripts/canvas-grades-web-smoke.mjs`
- `scripts/canvas-grades-web-smoke.test.mjs`
- `docs/ai/phase5e6-mobile-grade-protected-live-validation-20260708.md`
- `docs/current-state.md`
- `docs/roadmap.md`
- `docs/ai/current_sprint.md`
- `docs/ai/handoff.md`

## 18. Verdict

Automated baseline, protected API preflight, protected Expo Web validation,
session-only web validation, controlled fictional edge validation, network
failure preservation, authorization checks, and privacy scans passed.

Physical iPhone validation remains unobserved and is required before Phase 5E.6
can be complete.

```text
IN PROGRESS - automated and web validation passed; physical-device validation remains
```
