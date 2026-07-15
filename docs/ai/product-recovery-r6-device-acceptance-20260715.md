# Product Recovery Phase R6 - Real-Device Product Acceptance

Date: 2026-07-15, Asia/Manila.

## Starting State

- Branch: `main`.
- Starting commit: `1fea36189d356488229a2bcf86474a1d3ddb8b9d`
  (`feat(canvas): recover source selection reviewer UX`).
- Ahead/behind: `0/0` against `origin/main`.
- Dirty files at start: `apps/api/next-env.d.ts`,
  `apps/mobile/expo-env.d.ts`, `.vscode/`, and
  `apps/mobile/.gitignore`.
- Expected R5 baseline confirmed at `HEAD`.
- The four known unrelated dirty paths were not edited, staged, or committed
  by R6.

## Environment And Service Readiness

| Purpose | Command |
| --- | --- |
| API development server | `npm run dev --workspace apps/api` |
| Expo mobile development server | `npm run dev --workspace apps/mobile` |
| Authenticated mobile/web smoke | `npm run smoke:ocr-pdf:web` |
| Canvas R5 protected validation | `npm run validate:canvas:r5` |
| Reviewer web smoke validation | `npm run test:reviewer-web-smoke` |
| OCR PDF smoke validation | `npm run smoke:ocr-pdf:web` |

Required environment-variable names only:

- API/Supabase: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`,
  `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
  `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`.
- Mobile/API routing: `EXPO_PUBLIC_API_BASE_URL`.
- Reviewer generation: `OPENAI_API_KEY`.
- OCR: `GOOGLE_CLOUD_PROJECT_ID`, `GOOGLE_CLOUD_PROJECT`,
  `GOOGLE_CLOUD_CREDENTIALS_JSON`, `GOOGLE_APPLICATION_CREDENTIALS`.
- Canvas: `CANVAS_TOKEN_ENCRYPTION_KEY`, `CANVAS_LIVE_BASE_URL`,
  `CANVAS_BASE_URL`, `CANVAS_LIVE_PERSONAL_ACCESS_TOKEN`,
  `CANVAS_ACCESS_TOKEN`, `CANVAS_PERSONAL_ACCESS_TOKEN`.
- Smoke authentication: `TEST_SUPABASE_EMAIL`, `TEST_SUPABASE_PASSWORD`,
  `SUPABASE_ACCESS_TOKEN`.

Service readiness observed locally:

- Ports 3000 and 8081 were not listening before R6 startup.
- API dev server started on port 3000, loaded ignored `.env.local`, and
  `/api/health` returned `{"status":"ok","version":"2.0.0"}`.
- Metro started on port 8081, loaded the mobile ignored `.env.local`, and the
  Expo root returned HTTP 200.
- A full `npm run build` exported Web, iOS, and Android bundles successfully.
- No production secret values were printed in committed documentation.

Physical-device readiness not observed:

- No connected physical iPhone or controllable Expo Go session was available to
  this agent.
- LAN reachability from iPhone to the API was therefore deferred.

## Physical Acceptance Results

| Journey or behavior | Evidence type | Result | Notes |
| --- | --- | --- | --- |
| Sign-in and course entry | Deferred | Deferred | Requires physical iPhone/Expo Go session. |
| Source inventory | Automated verification | Passed | R5 protected validation loaded `course-sample-1`; inventory stable. |
| Ready-source flow | Automated verification | Passed | `usable-source-1` resolved, edited, generated, saved, and cleaned up. |
| File-source flow | Automated verification | Passed | `file-source-1` resolved through stored image or complete PDF path. |
| Preview editing | Automated verification | Passed | R5 validation exercised an edited preview before generation. |
| Generation | Automated verification | Passed | Reviewer generated through protected route; one accepted call. |
| Save handoff | Automated verification | Passed | Snapshot-bound save and owner cleanup passed in R5 validation. |
| Course/source invalidation | Automated verification | Passed | Mobile tests cover stale and dependent-state clearing. |
| Destructive navigation | Code inspection only | Deferred | Logic exists from R5; physical prompt behavior not observed. |
| Duplicate prevention | Automated verification | Passed | R5 validation accepted one duplicate request attempt. |
| Sign-out/session loss | Automated verification | Passed | Mobile tests cover sign-out and teardown clearing; no physical session-loss observation. |

## Accessibility Results

| Check | Evidence type | Result | Notes |
| --- | --- | --- | --- |
| Normal text size | Deferred | Deferred | Requires iPhone setting observation. |
| Large Dynamic Type | Deferred | Deferred | Requires iPhone setting observation. |
| Maximum practical Dynamic Type | Deferred | Deferred | Requires iPhone setting observation. |
| VoiceOver labels | Code inspection only | Deferred | R5 added labels and states; no VoiceOver run occurred. |
| VoiceOver reading order | Code inspection only | Deferred | Structure was inspected during R5; device reading order not observed. |
| Selected-state announcement | Automated verification | Passed | Mobile tests and R5 code cover radio-style selected state. |
| Loading and error announcements | Code inspection only | Deferred | Polite live-region/state props exist; no VoiceOver observation. |
| Touch targets | Code inspection only | Deferred | R5 code uses 44px minimums; physical touch comfort not observed. |
| Color independence | Code inspection only | Deferred | R5 uses labels/icons plus color; physical check deferred. |
| TalkBack | Deferred | Deferred | No Android device was available. |

## Slow-Network And Interruption Results

| Scenario | Result | Notes |
| --- | --- | --- |
| API unavailable | Deferred | Requires interactive device/app observation after API stop. |
| Inventory retry | Automated verification passed | Route/tests cover safe retry states; physical retry not observed. |
| Resolution retry | Automated verification passed | R4/R5 validations cover retryable/safe failed states. |
| Generation interruption | Automated verification passed | Mobile stale-token tests cover late generation response protection. |
| Source changed during request | Automated verification passed | R5 controlled stale scenario made zero reviewer calls. |
| Screen teardown | Automated verification passed | Mobile tests cover teardown abort/ignore behavior. |
| Repeated retry | Automated verification passed | Single-flight and duplicate prevention tests remain passing. |

## Defects Found And Fixes

None.

No production defect was reproduced because physical-device acceptance could not
be executed in this runtime. No product code was changed.

## State-Safety Results

| Scenario | Expected reset or protection | Result |
| --- | --- | --- |
| Course change | Clear all dependent reviewer state | Automated verification passed |
| Source change | Clear resolution, preview, output and save | Automated verification passed |
| Preview edit | Invalidate output and save binding | Automated verification passed |
| Retry | Clear old token, result and error | Automated verification passed |
| Late response | Ignore stale response | Automated verification passed |
| Session mismatch | Disable and reject | Automated verification passed |
| Sign-out | Clear reviewer state | Automated verification passed |
| Duplicate generation/save | Single-flight | Automated verification passed |

## Automated Verification

| Command | Result | Notes |
| --- | --- | --- |
| `npm run typecheck` | Passed | 7/7 workspaces |
| `npm run lint` | Passed | 7/7 workspaces |
| `npm run test --workspaces --if-present` | Passed | API 428/428, mobile 154/154, Canvas 69/69, OCR 25/25, engine 287/287 |
| `npm run test:reviewer-web-smoke` | Passed | 51/51 |
| `npm run smoke:ocr-pdf:web` | Passed | Authenticated persisted session; PDF OCR mocked; real reviewer route; 2 sections and 4 visible key points |
| `npm run validate:ocr:r3` | Passed | Complete/incomplete matrix; five-page reviewer HTTP 200 with coverage, grounding, leakage passed |
| `npm run validate:canvas:r4` | Passed | 7 API calls; non-usable reviewer calls 0; Page reviewer HTTP 200 |
| `npm run validate:canvas:r5` | Passed | 10 API calls; inventory stable; reviewer sections 1; non-usable/stale reviewer calls 0 |
| `npm run build` | Passed | 7/7 workspaces; API production build and Expo export completed |
| `git diff --check` | Passed | CRLF warnings only for known unrelated generated files |

## Files Changed

### Mobile

- None.

### API

- None.

### Tests

- None.

### Validation

- None.

### Documentation

- `docs/ai/product-recovery-r6-device-acceptance-20260715.md`
- `docs/current-state.md`
- `docs/roadmap.md`
- `docs/ai/current_sprint.md`
- `docs/ai/handoff.md`

### Configuration

- None.

### Database Or Migrations

- None.

## Security And Privacy Result

| Assertion | Result | Notes |
| --- | --- | --- |
| No credentials committed | Passed | Documentation names variables only. |
| No private academic content committed | Passed | Report uses safe labels only. |
| Evidence is aggregate-only | Passed | Counts, timings, and terminal states only. |
| Source text remains metadata-free | Passed | R4/R5 validations passed. |
| Unusable sources call no reviewer | Passed | R4 non-usable reviewer calls 0; R5 unsupported/inaccessible/stale reviewer calls 0. |
| Owner boundaries preserved | Passed | R5 save and cleanup route passed with owner scope. |
| Unrelated files excluded | Passed | Known dirty paths remained unstaged. |

## Git Result

- Commit: pending at report authoring time.
- Push: pending at report authoring time.
- Final ahead/behind: pending at report authoring time.
- Remaining dirty files expected after R6: the four pre-existing unrelated
  paths only.
- Local services: API and Metro were runner-started for R6 and should be
  stopped before final handoff.

## Deferred Scope

- Physical iPhone Expo Go normal text-size walkthrough.
- Physical iPhone Expo Go Dynamic Type walkthrough.
- Physical iPhone Expo Go VoiceOver walkthrough.
- Physical iPhone LAN reachability confirmation.
- Physical slow-network/API interruption observation.
- Physical destructive-navigation prompt observation.
- Physical Study Library handoff observation.
- Android TalkBack.

## Verdict

```text
PRODUCT RECOVERY PHASE R6 PARTIAL - Automated acceptance passed but required physical-device checks remain
```

Recommended next phase: complete the deferred physical iPhone Expo Go R6
acceptance pass before beginning any new product phase.
