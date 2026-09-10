# B20 real mobile Reviewer end-to-end validation

Date: 2026-09-10 (Asia/Manila)

## Verdict

`PASS — B20 real mobile Reviewer end-to-end validation passed`

`YES — MOBILE REVIEWER DEMO FLOW READY`

The current `main` application completed the full authenticated Reviewer path on a physical realme RMX3151 running Android 13. Two real learner PDFs already on the phone went through Android Files selection, durable extraction, authenticated job submission, the production Reviewer workflow, result persistence, Android rendering, save, and Study Library reopen. A final cold-launch capstone run repeated the complete path without a debugging shortcut. No implementation repair was required.

Scope boundary: this acceptance proves the real PDF-upload Reviewer flow. It does not prove a Canvas-backed learner-material flow. The Canvas selection exercised during B20 exposed an announcement because the connected courses did not expose a selectable PDF, page, assignment, or module item.

## Starting state

- Branch: `main`
- Starting HEAD: `9313b3737acd414a2d8981159684107be6f3c191`
- Ahead/behind against `origin/main`: 27 ahead, 0 behind (`git rev-list` returned `0 27` for left/right)
- Working tree: only the pre-existing untracked `docs/ai/acceptance/b8/`
- `git fsck --full`: no corruption; the two previously known dangling blobs remained
- Frozen B19.3 baseline retained: engine 606/606, architecture 157/157, Reader 32/32, API 607/607

## Actual runtime path

The generic PDF flow starts at `apps/mobile/app/(app)/generate.tsx`, which mounts `apps/mobile/src/features/reviewer/ReviewerGenerateScreen.tsx`. The real Canvas entry is `apps/mobile/app/(app)/(tabs)/courses/[courseId]/reviewer.tsx`, which mounts `apps/mobile/src/features/courses/CanvasSourceReviewerScreen.tsx`.

`ReviewerGenerateScreen` reads the Supabase session from the mobile auth provider and calls `apps/mobile/src/services/processingJobsApi.ts`. That client sends `Authorization: Bearer <session access token>` and an `Idempotency-Key` to `POST /api/jobs`. The token was never printed.

`apps/api/app/api/jobs/route.ts` calls `apps/api/src/lib/auth.ts`, where `supabase.auth.getUser(token)` resolves the authenticated user. Canvas generation additionally validates the owner-filtered preview session in `apps/api/src/lib/reviewer-source-provenance.ts` and checks course, selected items, and resolution fingerprint in `apps/api/src/lib/canvas-reviewer-generation-gate.ts`. PDF uploads and generated source/result records are created for the verified user.

The route creates a durable Reviewer job through `apps/api/src/lib/processing-jobs/creation.ts` and `repository.ts`, then dispatches `apps/api/src/workflows/processing-job.ts`. The workflow prepares the source, invokes the existing `openai:gpt-4o` provider, verifies/retries, assembles, persists the result, and only then marks the job succeeded. State is stored in `processing_jobs`, `processing_job_sources`, and `processing_job_results`.

The app stores active owner-scoped job references locally, reconciles with the API on launch/resume, polls every three seconds while active, and fetches `/api/jobs/{jobId}/result` at terminal success. `apps/mobile/src/features/reviewer/ReviewerPreview.tsx` renders the result. `apps/mobile/src/features/library/StudyLibraryScreen.tsx` fetches and reopens saved reviewers without regeneration.

## Android and environment readiness

- Device: realme RMX3151
- Android: 13
- ADB: authorized `device`; serial omitted
- Package present before the build: `com.galaxymaxp.stayfocusedv2`
- Existing version: 2.0.0, versionCode 1
- Expo Go launch: passed; no crash, fatal red screen, or raw runtime error
- Selected API: deployed `https://stay-focused-v2-prototype.vercel.app`
- Production API was refreshed from exact starting HEAD and reached READY before phone validation

| Variable | Status | Use in selected flow |
| --- | --- | --- |
| `EXPO_PUBLIC_SUPABASE_URL` | PRESENT | Mobile authentication |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | PRESENT | Mobile authentication |
| `EXPO_PUBLIC_API_BASE_URL` | PRESENT | Deployed API |
| `SUPABASE_URL` | PRESENT | Production API |
| `SUPABASE_ANON_KEY` | PRESENT | Production API |
| `SUPABASE_SERVICE_ROLE_KEY` | PRESENT | Server persistence and owner-scoped operations |
| `OPENAI_API_KEY` | PRESENT | Reviewer provider |
| `PROCESSING_EXECUTION_BACKEND` | PRESENT | Durable workflow dispatch |
| `CANVAS_TOKEN_ENCRYPTION_KEY` | PRESENT | Existing Canvas connection |
| `GOOGLE_CLOUD_CREDENTIALS_JSON` | PRESENT | Production OCR configuration; not invoked for native-text PDFs |
| `GOOGLE_CLOUD_PROJECT` | PRESENT | Production OCR configuration; not invoked for native-text PDFs |
| `EXPO_PUBLIC_LOCAL_API_PORT` | NOT_REQUIRED_FOR_SELECTED_FLOW | Deployed API selected |

Values, credentials, JWTs, user IDs, course IDs, source IDs, and device serials are intentionally absent from this report.

## Authentication and ownership

Signed-out behavior presented the normal sign-in screen. The user signed in on the phone, Supabase returned a usable session, and a later force-stop/cold Expo Go relaunch restored that session without another login. Successful phone-created jobs prove the access token reached the deployed route because `/api/jobs` only proceeds after `verifyBearerToken` resolves the user.

Two no-token calls were rejected with HTTP 401 and safe messages; neither started generation. A short-lived authenticated validation session then submitted a random nonexistent Canvas preview identity. The owner-filtered lookup returned HTTP 404 `canvas_preview_session_not_found`, created zero jobs, leaked no cross-user row, and returned no raw database error. Existing RLS/owner-scoping regression coverage remained green in the 607-test API suite.

## Real source selection

The existing Canvas connection and course list loaded on Android. A real synced IT Security course exposed a real announcement source, and selective preview displayed all nine blocks with clear selection state. After the user's learner-material feedback, all three available courses were freshly synchronized and inspected again. Every durable sync completed with a safe `partial` outcome: Canvas denied the Files scope (`canvas_permission_denied`) and did not expose the Pages resource (`canvas_resource_not_found`). One course exposed no source; the other two exposed announcements only. No synchronized PDF, page, assignment description, or module-item learner source was available, and no fake row was created.

Per the user's direction, the generation cases used two real PDFs already in Android Downloads through the product's existing upload flow:

| Case | Source | Shape | Pages | OCR | Canvas sync |
| --- | --- | --- | ---: | --- | --- |
| A | `3. VPNs.pdf` | Prose-heavy security lecture | 15 | Not required; native text | Not required |
| B | `5. Cryptography.pdf` | Longer formula/table-like security lecture | 55 | Not required; native text | Not required |

Both extraction requests were durable `document_extraction` jobs. Compatible native-text results were reused safely, persisted, and exposed through an explicit completed-result action.

## Android generation evidence

### Case A — VPNs

- Origin: physical phone UI
- Route: `POST /api/jobs`
- HTTP behavior: accepted durable job
- Backend: `vercel_workflow`
- Provider: `openai:gpt-4o`
- Status: queued/running, `preparing_source`, `retrying_sections`, `storing_reviewer`, succeeded
- Result: 5 sections, coverage 1.00, grounding 1.00, leakage passed
- Provider calls/retries: 3/3; unsafe output was replaced with source-only fallback rather than bypassing verification
- Android: completion alert, title/source line, grounded status, all sections, final comparison section, save, and reopen passed

### Case B — Cryptography

- Origin: physical phone UI
- Route: `POST /api/jobs`
- HTTP behavior: accepted durable job
- Backend: `vercel_workflow`
- Provider: `openai:gpt-4o`
- Status: queued/running, `preparing_source`, `retrying_sections`, `storing_reviewer`, succeeded
- Result: 14 sections from 55 pages; coverage 1.00, grounding 0.99, leakage passed
- Source scale: 11,356 submitted characters, 10,734 normalized characters
- Provider calls/retries: 3/3; verification remained active
- Android: completion alert, title/source line, grounded status, sections 1 through 14, final references, save, and Study Library association passed

Private timestamps, job identifiers, UI trees, screenshots, API records, and metrics are under `.local/b20/` and remain ignored.

## Loading, lifecycle, and duplicate submission

The phone showed distinct upload, accepted, waiting-to-start, preparing, improving-sections, completion, failed-network, and retry states. No blank screen, permanent spinner, raw JSON, stack trace, provider error, or fabricated percentage appeared. The UI disables submission while sending and also has an in-flight ref, active-job guard, and idempotency key. A rapid double tap during the first VPN run created exactly one Reviewer job.

An instant compatible extraction does not auto-open its terminal result. It shows a durable `Complete` card and `View completed result`; this requires a scroll and tap but does not strand the user or lose the result.

## Rendering inspection

Both readers showed the correct title, PDF source identity, section count, grounding label, ordered sections, explanations, key points, long lines, and final content. Full vertical scrolling, safe-area/footer behavior, back navigation, save, navigation away, and reopen passed. Long URLs and hashes wrapped without horizontal overflow or clipping. No ownership IDs, target IDs, schema fields, debug diagnostics, provider payload, or internal enrichment appeared.

The Cryptography source contained key expressions and table-like “Security Goal / Objective / Formula” material; the result remained readable, although source-only fallback flattened some of it into long key points. Neither real PDF contained a code sample, so the physical run could not exercise code styling. The fresh 32/32 Reader suite separately retained table cells, code whitespace, and formula text through the same presentation mapping. No catastrophic formula, code, or table rendering failure was observed.

## Negative paths

| Case | Result | Evidence |
| --- | --- | --- |
| Missing token | PASS | Both current Reviewer routes returned 401; zero data leakage or generation |
| Invalid/non-owned source | PASS | Authenticated random Canvas preview identity returned safe 404; zero jobs created |
| Duplicate submission | PASS | Rapid double tap created one Reviewer job |
| Network/API failure | PASS | With phone networking temporarily disabled, Android showed `Could not reach the API`, connection guidance, and `Retry extraction`; retry succeeded after the original network state was restored |

## Defects, fixes, and regressions

No B20 demo-blocking implementation defect was found, so no product code, API code, engine code, build configuration, or tests were changed. The production model, OCR provider, parsers, frozen B12 material/caches, Stage verification, authentication, RLS, IDs, and package name remain unchanged.

Remaining findings:

- `DEMO_BLOCKING`: a capstone demonstration specifically requiring Canvas-backed learner material cannot currently execute with this connection. All available course syncs lack an accessible PDF/page/assignment/module-item source because Canvas denies Files and does not expose Pages. The separately validated real PDF-upload demo remains ready.
- `NON_BLOCKING_UX`: a terminal extraction reuse requires scrolling to and tapping `View completed result`.
- `NON_BLOCKING_PRESENTATION`: verified source-only fallback can preserve slide fragments and flatten table/formula-like structure into long key points.
- `DEFERRED_PRODUCT_WORK`: Canvas file ingestion supports PDF, plain text, and images. PPTX and DOCX parsing is not implemented.
- `DEFERRED_PRODUCT_WORK`: Expo Go warns that remote push notifications require a development build; the installable preview APK is the relevant runtime for that capability.
- `DEFERRED_PRODUCT_WORK`: EAS reported the existing Metro validation warning for `watcher.unstable_workerThreads`; it did not block local export or cloud submission.
- `UNRECOVERABLE_SOURCE`: none newly demonstrated beyond the frozen B19.3 classifications.
- `DEMO_BLOCKING`: none.

Tests added in B20: none.

## Fresh verification

| Suite | Result |
| --- | --- |
| Mobile typecheck | PASS |
| Mobile tests | 376/376 PASS |
| Mobile runtime | PASS on physical Android |
| Expo configuration | PASS |
| Engine typecheck/build/eval | 606/606 PASS |
| Architecture subset | 157/157 PASS |
| Reader | 32/32 PASS |
| API | 607/607 PASS |
| Root typecheck | 7/7 workspaces PASS, forced |
| Root lint | PASS with the four existing warnings |
| Root build | 7/7 workspaces PASS, forced |

API before/new/final: 607 / 0 / 607. Engine before/new/final: 606 / 0 / 606.

## Final uninterrupted capstone run and timing

After the negative checks, Expo Go was force-stopped and launched again. The session restored, Reviewer opened, `3. VPNs.pdf` was selected in Android Files, the durable extraction result was retrieved, `Generate reviewer` was tapped once, production processing remained visible, the result completed and rendered, it was saved as `VPNs Final`, the app navigated to Study Library, and the saved result reopened without a new job. Result: `PASS`.

The final run used the following observed breakdown:

| Stage | Duration |
| --- | ---: |
| Mobile submission/API acceptance | 2.879 s |
| Durable queue wait | 6.698 s |
| Provider generation | 8.579 s |
| Remaining verified worker execution/assembly | 32.266 s |
| Completion retrieval/render observation | 28.851 s |
| Total tap-to-visible | 79.429 s |

The last interval is conservative because it includes the external observation wait; the app polls active jobs every three seconds. The latency remained understandable during the demo because queued, preparing, improving, and completion states were visible throughout.

## Production API and APK

- Production API deployment used for validation: `dpl_DJ2T4QvQnxVF4pLLsEawTnefGHeV`
- Production API alias: `https://stay-focused-v2-prototype.vercel.app`
- Runtime Reviewer model: unchanged `gpt-4o`
- EAS profile: `preview`
- Distribution/artifact: internal APK
- App version: 2.0.0
- Android versionCode: 1; no increment was required
- Package: `com.galaxymaxp.stayfocusedv2`
- EAS build ID: `58c631c6-ef35-4822-b634-c8c32eea064c`
- EAS status: `FINISHED` at 2026-09-09T22:12:49.212Z
- APK URL: `https://expo.dev/artifacts/eas/HuRRjoOyl-ew_PDWGXUZcwOQ2hsHVV9fv9njifiRuQk.apk`
- Build/install page: `https://expo.dev/accounts/galaxymaxp/projects/stay-focused-v2/builds/58c631c6-ef35-4822-b634-c8c32eea064c`
- Downloaded artifact: 106,339,925 bytes; SHA-256 `4A6925BBB17B5B00DBCD94D113462F2404BF62E6D1B90470665B199575D15B7C`
- Install verification: PASS. `adb install -r` succeeded; package, version 2.0.0, versionCode 1, and target SDK 36 were confirmed. A cold standalone launch restored the authenticated session, opened Courses, and loaded the Reviewer entry screen with title input, PDF mode, and Import PDF action.

## Next task

Proceed with Canvas learner-material intake before Tasks: establish an authorized Files/Pages path for the connected Canvas account, validate one real course PDF or page through Android, then add bounded DOCX/PPTX parsing if those formats are required for the capstone. Do not reopen general Reviewer-engine polishing without a new demonstrated Reviewer blocker.
