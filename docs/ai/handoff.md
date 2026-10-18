# Stay Focused V2 - Local Agent Handoff

## Handoff — FULLSEND (2026-10-18)

What changed:
Published pinned WG1 653e8d8a2b9b43b7e607e103d9d1a09a25cd451c to main;
initial publication b55d5a50a45c2b561e44319342b25087425a67ce, native bump
90369428a7dd34e0e1410c850051003d41f8e003, final tested application main
dc162de3df634eea8b447f73ac67d758be75f4ee. PR #12 is MERGED. Includes
MR1/SA1/SA2/MR2/IM1b/RT1/INT1/EV1/RX1/IM2/WG1 and retained f3dd833 behavior.
WG2, WV1 and MD1 are not in this release. Existing worktrees were preserved.
Expo/Router patch alignment and npm-10-compatible lock repair were scoped
release fixes; Android is now 2.2.0, code 6, runtime 2.2.0-sdk57.

Verification (exact counts):
FRESH on dc162de: npm ci PASS (1,488 packages); Doctor 21/21; forced root
typecheck/lint/build 8/8 each, 0 cached; shared 350/40 files including emitted
copies, Canvas 75/1, OCR 27/3, engine 606/0 failures, API 2,268 pass + 3
existing live skips / 199 files, mobile 1,239/133, web 209/37, provider 20/20.
API/web pages 35/35 and 19/19; Android/iOS/web export, 68 assets. Six existing
lint warnings, no errors. Diff hygiene passes. GitHub CI 39069451068 SUCCESS.
First clean shared run had 175 source tests / 20 files before emission.
Doctor's unsupported --cwd invocation and initial two-package mismatch, the
first EAS npm-install failure, and superseded CI runs are recorded in acceptance.
No nondeterministic test flake observed. Repo-local test temp was used; generated
Next declarations restored after both builds; Windows TEMP was untouched.

Deployments (IDs, SHAs):
Supabase xfdbwfqtorelmurncyql: only 20261016000100_manual_reviewer_uploads.sql
applied before main. Read-only CLI migration fetch resolved historical aliases
in ignored staging without history repair; dry runs listed only the release
file. After push, 95 matching versions, zero pending. Both new RPCs exist and
remain service-role only; no existing row was deleted during application.
Google Cloud Build a524ee7e-ffce-442a-a006-b7949fd2adef SUCCESS;
asia-northeast1-docker.pkg.dev/stay-focus-492811/generation/worker:b55d5a5,
digest sha256:dac2af81c85519383f8c868fd218621315b45615dfe20ee4de3f0aa56988d364;
generation-worker-00028-f5t Ready, 100% traffic, dispatch configuration succeeds.
API dpl_2f7nfcr1Y5JJufzTZYmqu1s7276g READY at dc162de, health status ok.
Website dpl_EgAH83B3iJFhkHT5fWiN6PBHe5MN READY from clean b55d5a5 CLI upload,
aliased to stay-focused-ten.vercel.app, HTTP 200. Initial bounded API/web 5xx
and worker startup ERROR queries returned zero entries; no rollback.
EAS first build 3c6b9e1d-8285-4655-ac7c-4d49e66e561f failed npm installation;
repaired build 2ed33756-ef3b-4887-ac0a-fa0c59adf7ab FINISHED at dc162de.
APK: https://expo.dev/artifacts/eas/otDX0o3Lh-NYRtnGRygzbG4N_WSgdQxO-DiBmZGabjk.apk
adb install -r SUCCESS on RMX3151; versionName=2.2.0, versionCode=6. Owner
session and 75 saved offline items retained. Existing keystore reused; no OTA.
The final documentation-only commit SHA is recorded after commit in the external
result file/Git history; application source remains dc162de.

Live checks:
PASS: STEP 7.1 Export/Share same row, text Ask first What is this?, bulleted
answer in view; 7.2 tap-only source details, image Ask answer and pull-down close;
7.4 Library Sort and Wi-Fi-off cold restart with 75 items. Two generation
requests used (one image, one text), no follow-ups. Wi-Fi restored.
FAIL: 7.3 checked external reference stays blank; viewer closes on load.
FAIL: 7.4 Save image on a visibly loaded source figure returns its generic
failure alert on the new online APK; underlying cause unverified.
NOT RUN: 7.2 overflowing-viewer scroll (chosen figure fits viewport), 7.5
website desktop/390px/reviewer UI (Windows capture black, activation Access
denied 0x80070005), 7.6 Office upload (only local file is an administrative
learning-contract template, no suitable instructional Canvas source).
Neutral screenshots/XML are ignored under .local/fullsend-20261018/.

Next steps:
Repair and physically recheck the two image failures, then finish website,
overflowing-viewer and suitable-source Office checks. Keep WG2/WV1/MD1 excluded.
Before a later native release, increment the remote code or restore preview
autoIncrement; it is false for this code-6 retry. Any later authorized JS OTA
must pass apps/mobile/scripts/preview-update-preflight.mjs.

Blockers:
Windows browser interaction is unavailable (Access denied); suitable local
Office instructional input is absent. Image failures require scoped follow-up
diagnosis; no source-level fix or root cause is claimed.

Risks:
SHIPPED, with live acceptance PARTIAL. Gallery saving and the checked external
image are not accepted. Automated gates do not replace the remaining physical
or browser checks. Email delivery remains disabled; no purchase, destructive
SQL, signing/service credential rotation, branch deletion, force-push,
uninstall or app-data clear was performed.

[Full acceptance](acceptance/fullsend-20261018.md).

## B38.1 production generation quality acceptance (2026-09-24)

B38.1 passes. Fresh production outputs on the realme RMX3151 covered a CC16 Firewalls PDF Reviewer, its five-question Quiz, a CC17 Android Platform PPTX Reviewer, and a CC17 Android Versions assignment Activity Output. Inspecting the actual artifacts found no material unsupported Reviewer claims, source omissions, wrong Quiz answer, ambiguity, or invented instructor requirement; Queue/background and Library/relaunch persistence passed. The first PPTX attempt failed before provider execution because the strict response schema enumerated every long source block ID and exceeded the contract budget. Commit `1d992aa` bounds that provider schema while exact local source-reference validation remains intact. Regression 30/30 and all full gates pass. Production `dpl_EBwoR9gdNTvWBTMdezJD1ydqDXdk` is READY and healthy, and the repaired 32-topic PPTX Reviewer completed on `gpt-5.4-2026-03-05`. See `docs/ai/acceptance/b38-1/production-generation-quality-acceptance.md`. Next: B39 Full E2E / Demo Acceptance.

## B38.0 Generate course state and material loading repair (2026-09-24)

B38.0 passes. Generate's course list now comes from the Sync page inventory (`loadCanvasCourseInventory`, `allowStoredFallback` for Generate only): courses are grouped Current → Previous → Other, with synced first and newest term first. Only synced courses (selected, with a completed latest attempt) open materials; the others open `/canvas-settings?courseId=…`, which adds the course to the unsaved selection draft. The materials gate for unselected courses returns `409 course_not_synced` instead of 503. Implementation `b3f6973`, Vercel `dpl_BB4Zf1kh2cBmiyKn8733USYzkJCZ`, EAS preview update `d288a6ea-7a77-4d2d-b855-61c1eae2329f` (exported with dotenv disabled and the production API URL set explicitly). HIST 100 was genuinely unsynced; the old error was a mislabeled 400. See `docs/ai/acceptance/b38-0/generate-course-state-and-material-repair.md`. Next: B38 Production Generation Quality Acceptance.

## B37.1 production migration and runtime closure (2026-09-24)

B37 now passes. Production migration history was reconciled and both `20260923000000_canonical_reviewer_artifacts.sql` and `20260923010000_authenticated_canonical_reviewer_reads.sql` are live. Corrected Vercel deployment `dpl_2QUkcVoZADvJ3JfzegXSDXEjzrcp` is READY. Signed Android build `f0d6d63e-2607-45ee-b125-3b5d43ec2966` at `a7bfcee` passed authenticated gates, explicit-confirmation spend safety, one real durable canonical Quiz, Queue result opening without duplication, offline SQLite cold reopen, canonical management, disposable rename/delete without resurrection, and dependency-protected deletion. The legacy `reviewers` table is retained for historical compatibility, has zero rows, and has no active runtime read. Full automated gates pass. See `docs/ai/acceptance/b37/generated-artifact-convergence.md`. Next: B38 Generation Quality Acceptance; investigate large-PPTX `request_exceeds_context_budget` and cover the representative source matrix.

## B37 generated artifact model convergence (2026-09-23)

B37 is PARTIAL. Local code and migration converge current Reviewer runtime paths on `generated_artifacts`: exact material gate, clear `reviewerArtifactId` contracts, owner/type/current-version validated Quiz jobs, persisted Reviewer payload as the direct Quiz source, canonical Quiz persistence/Library links, canonical management/source status, dependency-restricted soft deletion, and post-success-only B35 SQLite removal. Navigation to a confirmation-required Queue item is now side-effect free; only the explicit single-flight confirmation accepts generation. All requested local suites/build/export/install gates pass. Production was not mutated: the linked Vercel target was verified, but the known Supabase migration-history alias mismatch is unresolved, no supported local Supabase workflow or authenticated dashboard exists, and a production environment pull was rejected for secret-exposure risk. Therefore production counts, migration, deploy, authenticated Quiz, Reviewer management/deletion, and physical spend acceptance remain open. See `docs/ai/acceptance/b37/generated-artifact-convergence.md`. Next: apply and verify B37 through an approved Supabase path, deploy, complete the production smoke, then begin B38 Generation Quality Acceptance. B38 must investigate `request_exceeds_context_budget` on large PPTX sources and cover PDF/scanned PDF/DOCX/PPTX/Canvas Page/Reviewer/Quiz/Activity Output.

## B36 signed physical UX + offline acceptance (2026-09-23)

B36 is PARTIAL. Signed preview APKs `0dc19cdd` (`f88b0c2`) and `245ccaec` (`1e81edd`) were built, installed, and accepted on the realme RMX3151 (Android 13). Both contain `libexpo-sqlite.so`; the preview signing identity is unchanged and no credential was created or rotated. B34's pending physical matrix and B35's local-first persistence both pass on device, including full airplane-mode reading of Reviewer, Quiz (read-only, no answer keys, no scoring, no submission), and Activity Output, plus reconnect with no duplicates. Two bounded layout defects were repaired in `1e81edd` and re-verified on the rebuilt APK. Two items are unreachable on this branch and were not repaired: Quiz generation and the supported Reviewer deletion flow, both because the Quiz gate, `quiz/sources.ts`, and "Manage saved Reviewers" still read the retired `reviewers` table (0 rows) while artifacts live in `generated_artifacts` (48 rows). Fixing that needs a migration plus an RPC signature change. No second test account exists, so cross-account isolation remains covered by automated tests; the logout purge itself passed on device. Note for operators: opening a Queue row marked "Request needs confirmation" submits it immediately, because `GenerationScreen` calls `acceptGeneration` from a mount effect. See `docs/ai/acceptance/b36/signed-physical-offline-acceptance.md`. Next: B37 Generation Quality Acceptance, starting with the legacy-`reviewers` retirement.

## B35 on-device artifact persistence (2026-09-22)

B35 passes. Completed Reviewers, Quizzes, and Activity outputs are stored on the device in an owner-scoped expo-sqlite store after the server has persisted them. The Library and artifact reader are local-first, with safe background reconciliation. Explicit sign-out purges that owner's local rows. Cloud architecture is unchanged. Adding expo-sqlite means a new native build is required before device acceptance; older binaries fall back to cloud-only reads. See `docs/ai/acceptance/b35/on-device-artifact-persistence.md`. Next: B36 Signed Physical UX + Offline Acceptance.

## B32 scanned-PDF runtime reliability (2026-09-20)

B32 is complete and accepted. READY production deployment `dpl_EekcdmCmpfdoobvYouekuXrUmMEd` moves scanned Canvas PDF download, per-page inspection, OCR, ordered source attachment, and reviewer context generation into durable workflow steps. Fresh 16-page Accounting job `a85bd672-2aed-401b-a37e-fd1c794d826f` completed all checkpoints, attached 6,757 characters, generated `Reviewer in Journaling and Basic Accounting`, and survived physical Android force-stop/relaunch Library retrieval. Full API and engine suites pass. Direct service-role DB metadata inspection was not available because the local Vercel environment pull returned secret references, so workflow logs and owner-authenticated device behavior are the persistence evidence. See `docs/ai/acceptance/b32/scanned-pdf-runtime-reliability-acceptance.md`. Next: B34 generation quality acceptance unless a new DOCX/PPTX defect reopens B33.

## B25.3.3 migration update (2026-09-16)

The user approved scoped provider transfers. Live comparison and production caller migration are complete; deterministic checks pass. Deployment dpl_9yAtq2sy2YYRfYjoqytHCL6aWUa4 is READY and healthy. Physical acceptance requires direct device sign-in and selected Activity assignment. See the current B25.3.3 acceptance report.

## B25.3.3 AI-first spike checkpoint (2026-09-15)

Standalone AI-first Reviewer, Quiz and Activity generators plus coherent context and thin contract tests are implemented in the isolated b25-3-3-ai-first branch. Production cutover, legacy retirement and real-material/device acceptance are pending private-source OCR/OpenAI authorization after an automatic approval rejection. B25 remains PARTIAL; B26 may not begin. See docs/ai/acceptance/b25.3.3/architecture-simplification.md.


> **HISTORICAL LOG — NOT AUTHORITATIVE CURRENT STATE**
>
> New agents should use `docs/current-state.md`, `docs/roadmap.md`, and
> `docs/ai/current_sprint.md`, then the relevant ADR. This tracked file is an
> append-only historical log and is not required default context. The older
> `handoff.example.md` records the former local-only convention; current policy
> keeps this log tracked as evidence while current state lives in the three
> concise documents above.

This handoff is tracked in the repository and must not contain secrets,
credential values, tokens, or machine-specific local paths beyond repository
paths.

## Current Status

- Product Recovery R6 is partial. Automated acceptance passed on 2026-07-15,
  but physical-device acceptance remains deferred because this agent did not
  have a controllable physical iPhone Expo Go session. The API dev server
  started on port 3000, `/api/health` returned the expected V2 payload, Metro
  started on port 8081, the Expo root returned HTTP 200, root typecheck/lint,
  workspace tests, reviewer web smoke tests, PDF OCR web smoke, R3/R4/R5
  protected validations, and root production build passed. Totals remained
  Canvas 69/69, OCR 25/25, engine 287/287, API 428/428, mobile 154/154, and
  reviewer web smoke 51/51. No R6 production defect was reproduced and no
  product code was changed. See
  `docs/ai/product-recovery-r6-device-acceptance-20260715.md`.
- Next task: finish Product Recovery Phase R6 on a physical iPhone with Expo
  Go. Do not claim R6 complete until normal text size, Dynamic Type, VoiceOver,
  LAN reachability, slow/interrupted API behavior, destructive-navigation
  prompts, duplicate prevention, sign-out/session cleanup, and Study Library
  handoff are actually observed with safe labels.
- Product Recovery R5 is complete. The selected-course Canvas reviewer path is
  now `choose source -> prepare/check -> exact editable preview -> generate ->
  reviewer ready -> immutable snapshot save`. Sources use authoritative module
  placement or conservative ungrouped fallback, safe capability labels, bounded
  continuous pagination, request-token/abort protection, exact generation/save
  bindings, single-flight locks, and discard confirmation. Protected validation
  passed the live Page, stored-file, generate, save, cleanup, and controlled
  zero-call scenarios. See
  `docs/ai/product-recovery-r5-canvas-source-selection-reviewer-ux-20260715.md`.
- Next task: Product Recovery Phase R6 — real-device product acceptance on
  iPhone/Expo Go, including Dynamic Type and screen-reader observation.
- Product Recovery R4 is complete. The authoritative Canvas usable-content
  boundary classifies synchronized Page/Assignment/Announcement content,
  protected stored Image/PDF OCR, and supported module links as `usable`,
  `empty`, `unsupported`, `inaccessible`, or `failed`. Source labels, titles,
  filenames, IDs, and page markers are no longer injected into reviewer text.
  Preview fingerprints plus current selected-course/item/hash checks run before
  Canvas reviewer provider creation, and mobile abort/token state prevents late
  results from restoring stale content. Protected validation passed for a real
  Page reviewer and real stored Image; non-usable fixtures made zero reviewer
  calls. See
  `docs/ai/product-recovery-r4-canvas-usable-content-resolution-20260713.md`.
- Product Recovery Phases R1 through R5 are complete. Focused reports include
  `docs/ai/product-recovery-r1-v1-audit-20260713.md`,
  `docs/ai/product-recovery-r2-reviewer-reliability-20260713.md`,
  `docs/ai/product-recovery-r3-full-document-ocr-20260713.md`,
  `docs/ai/product-recovery-r4-canvas-usable-content-resolution-20260713.md`, and
  `docs/ai/product-recovery-r5-canvas-source-selection-reviewer-ux-20260715.md`.
  R1 compared V1 as the behavioral benchmark with V2 as the architecture
  benchmark. V2's authentication, RLS, encrypted Canvas credentials, protected
  APIs, private source snapshots, provenance, tests, strict parsers, and
  grade/reviewer separation should remain. R2 added bounded field-aware repair,
  validated per-section extractive fallback, emergency source-outline recovery,
  safe quality metadata, and calm mobile fallback rendering. R3 added exact
  page coverage, explicit blank pages, sanitized completeness metadata, stale
  OCR source clearing, and a hard reviewer-generation gate. R4 established the
  authoritative content boundary and R5 recovered the student workflow. The
  next task is Product Recovery Phase R6 - real-device product acceptance.
- Baseline before this Phase 4 implementation:
  `0fdf1e4 docs: complete Phase 3D live PDF validation`.
- Phase 4 implementation commit: the commit containing this handoff update.
- Branch: `main`.
- Stay Focused V2 remains engine-first, evaluation-first, schedule-first, and
  mobile-primary through Expo/React Native.
- The current completed vertical slice is: sign in -> paste source text,
  import a gallery image, take a camera photo, or import a PDF -> review and
  edit source text -> authenticated reviewer API -> OpenAI generation ->
  coverage, grounding, and leakage validation -> reviewer preview -> save to
  Study Library -> list, open, rename, or delete saved reviewers.
- Phase 3A is implemented: provider-agnostic OCR contracts live in
  `@stay-focused/ocr`, Google Cloud Vision OCR wiring lives only under
  `apps/api/src/lib/ocr`, and `POST /api/ocr/extract` exposes a protected
  multipart PNG/JPEG OCR route.
- Expo Web is the fast laptop-browser development and regression surface for
  the mobile app, not a replacement for the mobile-primary product.
- User-facing source intake in the mobile app now supports manual paste,
  gallery-selected PNG/JPEG OCR, camera-captured PNG/JPEG OCR, and PDF OCR with
  editable extracted-text review. Physical-device live image OCR validation
  passed on an iPhone through Expo Go against the local Next.js API over LAN
  with server-only Google Cloud Vision OCR. Phase 3D PDF OCR live validation
  also passed on an iPhone through Expo Go against the local Next.js API over
  LAN with server-only Google Cloud Vision PDF OCR.
- Phase 4 adds reviewer persistence through a Supabase `reviewers` migration,
  owner-scoped RLS, authenticated reviewer CRUD API routes, and a mobile Study
  Library. The local implementation stores generated reviewer output and
  allowlisted metadata only; raw source text, OCR text, uploads, file paths,
  credentials, tokens, and private OCR artifacts are not persisted by the save
  flow.
- Phase 4 is now complete and live validated. The target Supabase project has
  the migration applied, schema/RLS/policies were verified, distinct users
  passed bidirectional owner isolation, safe `404 reviewer_not_found` denial
  passed, and fictional validation rows were cleaned up.
- Phase 5A Secure Canvas Connection and Capability Discovery is complete and
  live validated. It adds the staged Phase 5 roadmap, Canvas
  capability matrix, five Canvas ADRs, a strict `@stay-focused/canvas` client,
  per-user personal access token validation, AES-256-GCM encrypted token
  storage, `canvas_connections` and `canvas_capabilities` migration foundation,
  protected Canvas API routes, and a mobile Courses surface.
- Phase 5A uses personal access tokens generated by individual Canvas users.
  There is no school-wide Canvas token. Each token belongs only to the user who
  generated it and remains limited by that user's Canvas permissions.
- Phase 5A.1 direct server-side Canvas validation passed using one
  developer-owned personal access token from existing ignored local credential
  names without exposing values. Profile validation, course listing, and the
  small capability probes passed over Canvas HTTPS; 17 courses were returned for
  that token. These results prove only that user's available Canvas
  capabilities and do not prove institution-wide access. Live pagination was not
  exercised because the account did not require a second course page.
- Phase 5A.1 remote Supabase migration application passed through
  `npx supabase` using the ignored local Supabase CLI project. Migration
  history now includes `202607050002`, and read-only checks passed for both
  Canvas tables, RLS, encrypted columns, and no direct
  `anon`/`authenticated` encrypted-column access.
- Phase 5A protected API flow validation passed after configuring a real
  app-owned `CANVAS_TOKEN_ENCRYPTION_KEY` in the ignored API-local environment
  file. The hardened key format is canonical padded Base64 and must decode to
  exactly 32 bytes.
- Protected API validation passed on `http://localhost:3000`: API health,
  Supabase bearer authentication for the established smoke-test user,
  connect/status/courses/capabilities/disconnect, encrypted persistence checks,
  invalid replacement PAT preservation, reviewer-count preservation, and final
  disconnected state all passed. Course count was 17; capability count was 25
  with statuses `available` and `not_tested`.
- Phase 5A.2 hardening is complete. The audit returned PASS WITH CONDITIONS and
  the conditions are now closed: Base64 validation is strict and canonical,
  Canvas connection/capability persistence is atomic through
  `replace_canvas_connection_with_capabilities`, capability ownership is
  database-enforced with a composite foreign key, redirect responses are
  rejected with `canvas_redirect_rejected`, request validation tests cover
  malformed and oversized input, realistic automated two-user route tests prove
  user isolation, README status is current, and duplicate ADR numbering is
  resolved by renaming Fast Testing Surfaces to ADR-011.
- Remote migration `202607050003_harden_canvas_connection_persistence.sql` is
  applied. Read-only checks passed for migration history, RPC existence,
  revoked `anon`/`authenticated` execution, service-role execution, validated
  ownership constraint, RLS, revoked direct table grants, and revoked encrypted
  column access. The Supabase CLI again emitted a non-fatal Docker catalog-cache
  warning after push.
- Phase 5B.1 Academic Graph Foundation is complete and remotely verified. It
  adds `202607050004_create_canvas_academic_graph.sql`, the academic graph
  tables for courses, modules, module items, Pages, assignment groups, and
  assignments, composite ownership constraints across `user_id`,
  `canvas_connection_id`, and `course_id`, RLS, revoked direct client grants,
  service-role DML access, typed Canvas retrieval methods, and pagination
  regression tests.
- Phase 5B.2 Initial Full Academic Graph Synchronization is complete and live
  validated. It adds `POST /api/canvas/sync`, `canvas_sync_runs`, service-role
  sync-run RPCs, `replace_canvas_course_academic_snapshot`, explicit
  Canvas-to-DB normalization, bounded synchronous orchestration, atomic
  per-course replacement, stale-child cleanup after complete course snapshots,
  partial-run preservation, and mobile service support without UI.
- Remote migrations `202607050005_add_canvas_academic_sync.sql` and
  `202607050006_fix_canvas_connection_rpc_ambiguity.sql` are applied and
  verified. The `202607050006` repair was added after live validation exposed
  an ambiguous `user_id` conflict target in the existing Phase 5A connection
  replacement RPC; the historical migration was not edited.
- Phase 5B.2 live validation recreated the encrypted stored Canvas connection
  through `PUT /api/canvas/connection` using the established smoke-test user
  and ignored local credentials. The connection remains stored for later Canvas
  phases. Two protected `POST /api/canvas/sync` calls returned HTTP 200 with a
  documented partial result: 17 courses discovered, 13 succeeded, 4 failed with
  sanitized `canvas_course_fetch_failed`, 27 modules, 311 module items, 459
  Pages, 18 assignment groups, and 25 assignments. The second run preserved
  internal identities, kept first-sync timestamps stable, advanced last-sync
  timestamps, introduced no duplicate identities, and left zero running sync
  rows.
- Phase 5B.3A Course Recovery Hardening remains closed. The four permanent
  Page-listing failures are classified as sanitized
  `canvas_course_pages_failed` results, non-retryable, and not treated as
  successful empty-Page courses.
- Phase 5B.3B Incremental Academic Graph Synchronization Foundation is
  complete and live validated. It adds deterministic versioned course-snapshot
  fingerprints, `canvas_course_sync_states`, `full` and `incremental` route
  modes, changed/unchanged/failed counts, and service-role-only state RPCs.
  Incremental mode still fetches complete Canvas snapshots, but unchanged
  courses skip database graph replacement.
- Phase 5B.3C1 Conditional Request Capability Audit is complete as live
  validation only. Production sync behavior was not changed. The audit found
  stable ETags on the currently synchronized endpoint families, no
  `Last-Modified`, no 304 responses, and 0% body-byte reduction. Continue
  ordinary GET behavior for courses, modules, module items, Pages, Page
  details, assignment groups, and assignments.
- Phase 5B.4A Planner Item and Announcement Synchronization is complete as a
  backend-only slice with documented live Canvas limitations. It adds typed
  planner and announcement Canvas client methods, deterministic normalization
  and fingerprints, `canvas_planner_items`, `canvas_announcements`,
  service-role-only snapshot RPCs, safe scoped pruning, aggregate route
  diagnostics, and mobile service parsing without UI. It uses ordinary GET
  requests and a 30-day past and 120-day future sync window.
- Phase 5C.1 Secure Canvas File Inventory and Bounded Ingestion Foundation is
  remotely and live validated for backend behavior. It adds Canvas file
  metadata inventory during sync, module/Page/assignment/announcement
  file-reference discovery, a private `canvas-source-files` storage boundary,
  and protected `POST /api/canvas/files/ingest` for selected owned file-row
  ids. It stores only eligible selected files after fresh metadata, redirect,
  byte-limit, and signature checks. Remote migrations `202607060003` and
  `202607060004` are applied, Supabase advisors were reviewed, private Storage
  controls passed, and protected live ingestion plus second-run stability
  passed. It does not parse, OCR, preview, transcribe, or generate reviewers
  from Canvas file contents. The synchronous metadata sync route remains over
  its configured 60-second runtime budget in local production-build
  measurement, so production-runtime readiness is not claimed.
- Phase 5C.2A1 Course Selection and Runtime-Safe Canvas Synchronization is
  complete, remotely verified, and protected-live validated. It changes the
  normal mobile Canvas flow from account-wide synchronization to explicit
  selected-course synchronization. Course inventory is classified for
  presentation using Canvas metadata, preferences are stored in
  `canvas_course_sync_preferences` behind ownership-protected service-role
  RPCs, and the mobile Courses surface saves selected internal course IDs then
  syncs them through independent `POST /api/canvas/courses/:courseId/sync`
  requests with maximum concurrency two. Course-scoped sync reuses the shared
  single-course graph path, includes course-owned announcements and file
  metadata, excludes user-wide planner synchronization, preserves synchronized
  data on deselection, and keeps the account-wide route as a diagnostic and
  future maintenance foundation. Academic-unit synchronization limit: none.
- Phase 5C.2A2 Canvas Source Selection and Reviewer Handoff is complete,
  automated-verification passed, and protected-live validated. It adds selected
  synchronized course source listing, source preview, safe HTML-to-text
  normalization, editable mobile source preview, reuse of the existing reviewer
  generation API, and save-to-Study-Library handoff for stored Canvas Pages,
  assignment descriptions, and announcements. The preview endpoint reads only
  existing database rows and does not call Canvas, decrypt the Canvas token,
  call Storage, invoke OCR, or call OpenAI.
- Phase 5C.2B Canvas PDF/Image OCR Sources is complete, automated-verification
  passed, and protected-live validated for preparation, private Storage-backed
  OCR preview, edited reviewer handoff, and Study Library cleanup. It adds safe
  Canvas file-state descriptors, course-scoped preparation through the existing
  ingestion service, private byte/hash/signature revalidation, one OCR-backed
  file per preview, ordered mixed-source assembly, mobile prepare/ready states,
  no extracted-text persistence, and no Canvas/OpenAI calls during preview.
- Phase 5D.1 Immutable Source Snapshots and Exact Reviewer Provenance is
  implemented and remotely verified as the first bounded Phase 5D slice. It
  adds private short-lived preview sessions, immutable exact edited source
  snapshots, ordered source snapshot items, parser/OCR version identifiers,
  database-enforced same-owner reviewer linkage, Canvas save enforcement, and
  safe Study Library detail provenance summaries. The reviewer engine/provider
  boundary still receives only `sourceText` and `sourceTitle`.
- Phase 5D.2 Structured Normalized Blocks and Selective Import is implemented
  and remotely verified. It adds private short-lived Canvas source structure
  sessions, normalized HTML/OCR block manifests, safe public block selectors,
  bounded selected-block preview creation, selected-block immutable snapshot
  rows, mobile block-selection UI, and safe Study Library selected-block
  counts. The reviewer engine/provider boundary still receives only
  `sourceText` and `sourceTitle`.
- Phase 5D.3 Duplicate Relationships, Source Freshness, and Regeneration
  Readiness is implemented. It adds exact same-source and same-content
  duplicate summaries, repeated-reference categories, private immutable
  snapshot item relationship rows, a protected manual reviewer source-status
  endpoint, conservative missing-after-sync semantics, Study Library
  source-health UI, and readiness assessment without actual regeneration. The
  source-status path does not call Canvas, decrypt the PAT, read Storage,
  invoke OCR, or call OpenAI.
- Phase 5D.1 through Phase 5D.3 protected live validation completed on
  2026-07-08 with aggregate opaque output only. The run reused `connection-1`,
  synchronized `course-1`, loaded source structure, previewed selected blocks,
  created and removed one reviewer/snapshot validation set, verified
  source-status `current` and `ready_current`, confirmed no source-status
  sync/Canvas/decrypt/Storage/OCR/OpenAI/regeneration side effects, and
  preserved pre-existing data. See
  `docs/ai/phase5d-protected-live-validation-20260708.md`.
- Live second-user validation was not run because no separate second test-user
  credentials were available. Automated route tests cover user scoping for
  connection, courses, capabilities, and disconnect behavior.
- Canvas OAuth is not implemented. It is the intended production authorization
  path for broad multi-user deployment and requires an institution-approved
  Canvas Developer Key.
- Phase 5E planning is complete in
  `docs/ai/phase5e-grades-submissions-plan-20260708.md`, and Phase 5E.1 is
  complete in
  `docs/ai/phase5e1-grades-submissions-foundation-20260708.md`. Phase 5E.2 is
  complete in `docs/ai/phase5e2-canvas-grade-client-20260708.md`. Phase 5E.3
  is complete and remotely verified in
  `docs/ai/phase5e3-explicit-grade-sync-20260708.md`; migrations
  `202607080005_add_canvas_grade_sync_rpcs.sql` and
  `202607080006_harden_canvas_grade_sync_rpc_function_references.sql` are
  applied remotely, RPC execution is service-role-only, RLS/direct grants
  remain hardened, the rollback-safe verifier passed 17/17 checks, and no
  fictional rows remain. The recommended MVP remains strictly read-only
  selected-course assignment, submission, and visible grade state. Phase 5E.4
  is implemented in
  `docs/ai/phase5e4-protected-grade-api-20260708.md`; it exposes protected
  explicit grade sync plus DB-only list, detail, summary, and sync-status
  routes for owned selected courses. Only the sync route can call Canvas through
  the Phase 5E.3 service. Phase 5E.5 is complete and locally validated in
  `docs/ai/phase5e5-mobile-grade-experience-20260708.md`: selected courses now
  expose a mobile `Grades` entry point, grade reads are strict and GET-only on
  mount/reload, explicit `Sync grades` is the only grade POST, assignment
  pagination and detail are wired, and hidden grade wrappers are never shown as
  zero. Unofficial local grade estimates, durable grade caching, notifications,
  background jobs, submission writes, private submission-content return, and
  reviewer prompt use remain excluded. Phase 5E.6 is in progress in
  `docs/ai/phase5e6-mobile-grade-protected-live-validation-20260708.md`:
  automated baseline checks, protected API preflight, Expo Web protected smoke,
  session-only smoke, controlled fictional edge validation, authorization
  regression checks, and privacy scans passed. Physical iPhone Expo Go
  validation remains required before Phase 5E.6 and Phase 5E can be marked
  complete.
- Remaining secondary Canvas resources, broader parser families,
  stale/deleted-source comparison, Phase 5E.6 physical-device validation,
  background synchronization, task generation, and study schedule generation are
  still pending. Production endpoint validators remain unsupported for the audited
  endpoint families. Discussions, quiz metadata, announcement attachment
  content import, and broader Canvas resource support remain deferred.

## Environment and credentials

Credentials are supplied through ignored local environment files and managed
deployment/provider secret configuration. Future agents must inspect the
existing environment-variable names and project setup before running protected
integrations. Never print, log, commit, partially reveal, or copy secret values
into documentation.

Typical configuration locations:

- local development: ignored `.env.local` files at the root, `apps/api`, and
  `apps/mobile`
- Vercel: project environment variables
- Supabase: project configuration and secrets
- Google Cloud: configured OCR service credentials
- Canvas: encrypted connection or local protected environment configuration

Useful variable names confirmed in example files and code:
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_URL`,
`SUPABASE_SERVICE_ROLE_KEY`, `EXPO_PUBLIC_SUPABASE_URL`,
`EXPO_PUBLIC_SUPABASE_ANON_KEY`, `EXPO_PUBLIC_API_BASE_URL`, `OPENAI_API_KEY`,
`GOOGLE_CLOUD_PROJECT_ID`, `GOOGLE_CLOUD_PROJECT`,
`GOOGLE_CLOUD_CREDENTIALS_JSON`, `GOOGLE_APPLICATION_CREDENTIALS`,
`CANVAS_TOKEN_ENCRYPTION_KEY`, `CANVAS_BASE_URL`,
`CANVAS_PERSONAL_ACCESS_TOKEN`, `CANVAS_ACCESS_TOKEN`,
`CANVAS_LIVE_BASE_URL`, and `CANVAS_LIVE_PERSONAL_ACCESS_TOKEN`.

## Current Test Baselines

- Product Recovery R3: OCR typecheck/build/tests 25/25; engine
  typecheck/build/evals 287/287; API typecheck/lint/build/tests 391/391; mobile
  typecheck/lint/tests 130/130; root typecheck/lint 7/7 workspaces; reviewer
  smoke-runner tests 51/51; mocked PDF OCR browser smoke passed; protected
  real-OCR validation passed for single-page image, two-page PDF, five-page
  PDF, blank-middle PDF, and controlled incomplete input. Five-page extraction
  was 5/5 in one call and 1.591 seconds; incomplete input made zero reviewer
  calls.
- Reviewer smoke-runner tests: 51 passed, 0 failed.
- DB package typecheck: passed.
- OCR package typecheck/build/tests: passed; 14 tests passed, 0 failed.
- API typecheck/tests: passed; 94 tests passed, 0 failed.
- Engine build: passed.
- Engine evaluations: 266 passed, 0 failed.
- Mobile typecheck: passed.
- Mobile OCR client/picker/source-flow/library/Canvas service tests: 70 passed,
  0 failed.
- Canvas package typecheck/build/tests: passed; 30 tests passed, 0 failed after
  Phase 5B.1 endpoint and pagination coverage.
- DB package typecheck after Canvas migration/types: passed.
- API typecheck/tests including Canvas routes and encryption: passed; 146 tests
  passed, 0 failed.
- Direct live Canvas validation: passed through
  `scripts/phase5a-live-canvas-validation.mjs` with sanitized output only; 17
  courses were returned for the developer-owned personal access token used by
  that script.
- Remote Canvas migration verification: passed; both Canvas tables, RLS, and no
  direct encrypted-column access were verified.
- Phase 5A.2 remote hardening migration verification: passed; RPC, grants,
  ownership constraint, RLS, and direct grant restrictions verified.
- Phase 5B.1 remote migration verification: passed. Migration history includes
  `202607050004`; rollback SQL verification passed with fake User A/User B
  graph data; read-only checks confirmed new tables, RLS, composite ownership
  constraints, required indexes, revoked direct client grants, service-role DML
  grants, and unchanged Phase 5A protections.
- Phase 5B.2 remote migration verification: passed. Migration history includes
  `202607050005` and `202607050006`; rollback SQL verification passed for
  sync-run ownership constraints, active-run protection, stale-run recovery,
  atomic course replacement, duplicate prevention, stable IDs, rollback on
  malformed relationships, RLS, grants, public RPC revocation, service-role RPC
  execution, and unchanged Phase 5A and Phase 5B.1 protections.
- Phase 5B.2 live validation: passed with sanitized aggregate-only output.
  Protected connection recreation passed, two sync runs returned HTTP 200
  partial results, the final encrypted connection remained stored, duplicate
  identities were absent, internal identities were stable, first-sync
  timestamps were stable, last-sync timestamps advanced, and no sync run
  remained running.
- Phase 5B.3B verification: Canvas typecheck/build/tests passed with 33/33
  tests; DB typecheck passed; API typecheck/build/tests passed with 176/176
  tests; mobile typecheck/tests passed with 79/79 tests; root typecheck passed
  across 7/7 workspaces with 4 cached and 3 fresh; root build passed across
  7/7 workspaces with 4 cached and 3 fresh; workspace tests passed with API
  176/176, mobile 79/79, Canvas 33/33, and OCR 14/14; `git diff --check`
  passed with line-ending warnings only.
- Phase 5B.3C1 live audit: stored encrypted Canvas connection loaded and
  decrypted through the API-side boundary; 10 baseline GET requests and 10
  primary conditional requests were audited; all primary conditional requests
  returned HTTP 200 with full bodies, 0 returned 304, and body-byte reduction
  was 0%. No sync run remained running.
- Phase 5B.3C1 focused verification: Canvas typecheck/build/tests 33/33, API
  typecheck/build/tests 176/176, and mobile typecheck/tests 79/79 passed.
- Phase 5B.4A verification: Canvas typecheck/build/tests 35/35, DB typecheck,
  API typecheck/build/tests 183/183, mobile typecheck/tests 79/79, root
  typecheck 7/7, root build 7/7 after clearing a generated API `.next`
  artifact from the known OneDrive/Next issue, workspace tests API 183/183,
  mobile 79/79, Canvas 35/35, OCR 14/14, and `git diff --check` with CRLF
  warnings only.
- Phase 5B.4A remote verification: migrations `202607060001` and
  `202607060002` are applied remotely; rollback SQL verification passed
  through `scripts/phase5b4a-planner-announcements-verification.sql`.
- Phase 5B.4A live validation: first protected sync inserted 37 planner items
  and 19 announcements; second protected sync classified 37 planner items and
  19 announcements as unchanged with stable identities, zero duplicates, zero
  unnecessary updates, zero unexpected pruning, stable sanitized failure
  categories, preserved failed course graphs, and zero running sync rows.
- Phase 5C.1 verification: Canvas tests 50/50 and typecheck passed; API tests
  184/184 and typecheck passed; mobile tests 79/79 and typecheck passed; OCR
  tests 14/14 passed; root typecheck/build/tests passed across 7/7 workspaces.
  Remote migrations `202607060003` and `202607060004` are applied. Supabase
  security/performance advisors were reviewed; new Phase 5C.1 foreign-key
  index warnings were fixed. Protected live ingestion stored two eligible files
  and one metadata-only result, then a second ingestion stored zero additional
  bytes with stable object pointers.
- Phase 5C.2A1 verification: migration `20260706113150` is applied remotely;
  rollback-safe SQL verification passed; Supabase security/performance
  advisors produced no new Phase 5C.2A1 findings; Canvas package tests,
  API route tests, mobile service tests, workspace typechecks, production
  builds, and workspace tests passed. Protected live validation used aggregate
  output only: inventory returned 76 course shells, two likely-current courses
  were selected, first selected-course sync durations were 6.052 seconds and
  8.492 seconds, second selected-course sync durations were 5.833 seconds and
  7.849 seconds, deselect/reselect preserved data and identities, zero running
  rows remained, and the normal selected-course flow did not call the
  account-wide route.
- Phase 5C.2A2 verification: Canvas package typecheck/build/tests passed with
  52/52 tests; DB package typecheck passed; API typecheck/build/tests passed
  with Canvas source-list, preview, reviewer, and route coverage; mobile
  typecheck/tests passed with Canvas source API coverage; engine
  typecheck/build/eval passed with 266/266 evaluations; OCR typecheck/build/tests
  passed with 14/14 tests; root typecheck/build/workspace tests and
  `git diff --check` passed. Protected live validation used aggregate-only
  output: one opaque selected course exposed 49 descriptors, a two-source
  preview assembled 3,467 characters deterministically without Canvas,
  Storage, OCR, or OpenAI preview calls, the existing reviewer API returned HTTP
  200, a two-section reviewer was saved to Study Library, and the smoke item
  was cleaned up.
- Phase 5C.2B verification: Canvas package typecheck/build/tests 52/52; DB
  typecheck passed; OCR typecheck/build/tests 14/14; API typecheck/build/tests
  269/269; mobile typecheck/tests 92/92; engine typecheck/build/evals 266/266;
  root Turbo typecheck/build 7/7 with 5 cached and 2 fresh tasks; workspace
  tests API 269/269, mobile 92/92, Canvas 52/52, OCR 14/14. Protected live
  validation checked 2 selected synchronized courses, found 0 eligible PDFs and
  2 eligible images, prepared opaque `live-file-1`, reran preparation
  idempotently, previewed Page -> Image -> Announcement with 1 OCR-backed
  source and 62 extracted image characters, returned no private Storage or
  credential fields, generated and saved a reviewer from harmless edited text,
  verified Study Library visibility, and deleted the validation reviewer. An
  exploratory generation attempt including the very short/noisy live OCR
  preview text returned the existing `reviewer_validation_failed` response.
- Phase 5D.1 verification: migrations `202607070001`, `202607070002`, and
  `202607070003` are applied remotely; rollback-safe SQL verification passed
  through `scripts/phase5d1-source-provenance-verification.sql`; Canvas
  typecheck/build/tests 52/52; DB typecheck passed; OCR typecheck/build/tests
  14/14; API typecheck/build/tests 284/284; mobile typecheck/tests 93/93;
  engine typecheck/build/evals 266/266; root Turbo typecheck/build 7/7 with 4
  cached and 3 fresh tasks; workspace tests API 284/284, mobile 93/93, Canvas
  52/52, OCR 14/14. Supabase advisors showed no new Phase 5D.1 findings after
  the follow-up function search-path hardening migration; remaining warnings
  are historical. The rollback verifier also covers snapshot item context
  mismatch rejection. Phase 5D.1 protected live validation completed on
  2026-07-08.
- Phase 5D.2 verification: migration
  `202607070004_add_canvas_selective_source_blocks.sql` is applied remotely;
  rollback-safe SQL verification passed through
  `scripts/phase5d2-selective-blocks-verification.sql` with 18 PASS checks;
  shared typecheck/build passed; Canvas typecheck/build/tests 52/52; DB
  typecheck passed; OCR typecheck/build/tests 14/14; API typecheck/build/tests
  299/299; mobile typecheck/tests 95/95; engine typecheck/build/evals 266/266;
  root Turbo typecheck/build passed across 7/7 workspaces; workspace tests
  passed with API 299/299, mobile 95/95, Canvas 52/52, and OCR 14/14. Supabase
  advisors showed no new Phase 5D.2 findings; remaining warnings are
  historical. Phase 5D.2 protected live validation completed on 2026-07-08.
- Phase 5D.3 verification uses migrations
  `202607080001_add_canvas_source_relationships_freshness.sql` and
  `202607080002_harden_source_relationship_grants.sql`, plus rollback-safe SQL
  verifier
  `scripts/phase5d3-source-relationships-freshness-verification.sql`. Remote
  SQL verification passed with 18/18 checks. Automated verification passed with
  root typecheck/build across 7/7 workspaces, workspace tests API 315/315,
  mobile 98/98, Canvas 52/52, OCR 14/14, and engine evals 266/266. Supabase
  advisors were reviewed; remaining warnings are historical. Phase 5D.3
  protected live validation completed on 2026-07-08.
- Reviewer smoke-runner tests: 51 passed, 0 failed.
- Reviewer web smoke: passed with real reviewer generation.
- OCR web smoke: passed with mocked image OCR response and real reviewer
  generation.
- PDF OCR web smoke: passed with a fictional in-memory PDF fixture, mocked PDF
  OCR response, editable extracted text, and real reviewer generation.
- Phase 3C live iPhone camera/image OCR validation: passed with editable OCR
  text, reviewer generation, Reviewer Ready, source-faithful, coverage, and
  clean-output validation.
- Phase 3D live iPhone PDF OCR validation: passed with a fictional,
  image-only, two-page scanned PDF, editable OCR text, reviewer generation,
  Reviewer Ready, source-faithful, coverage, and clean-output validation.
- Phase 3D oversized-PDF validation: a separate PDF with more than five pages
  was rejected safely with the expected UI messages.
- Latest recorded unattended reviewer smoke during Phase 3A verification:
  passed on local HEAD `00d3e8f` before the Phase 3A commit, using a persisted
  session and returning HTTP 200 from the reviewer POST.
- Current unattended smoke command: `npm run smoke:reviewer:web`.
- Current OCR browser smoke commands: `npm run smoke:ocr:web` and
  `npm run smoke:ocr-pdf:web`.
- Live Study Library validation: passed with distinct users, bidirectional RLS
  isolation, safe item-operation 404s, owner cleanup, and no validation rows
  remaining.
- Final Phase 4 regression pass: DB typecheck, API typecheck/tests, mobile
  typecheck/tests, engine build/evals, OCR tests, and `git diff --check`
  passed. The reviewer `[id]` route typing fix changed App Router type shape
  only; runtime behavior was unchanged.

## Immediate Next Task

Phase 5A hardening is complete, Phase 5A quality conditions are closed, Phase
5B.1 academic graph foundation is complete, and Phase 5B.2 initial full
academic graph synchronization is complete and live validated. Phase 5B.3A
course recovery hardening is complete and live validated. Phase 5B.3B
incremental academic graph synchronization foundation is complete and live
validated. Phase 5B.3C1 conditional-request capability audit is complete and
does not support Phase 5B.3C2 implementation for the audited endpoints. The
Phase 5B.4A planner-item and announcement synchronization slice is complete
with documented live Canvas limitations. Phase 5C.1 file inventory and bounded
ingestion foundation is remotely and live validated with a documented
account-wide synchronous route-duration limitation. Phase 5C.2A1
selected-course synchronization is complete and runtime-safe in local
production validation. Phase 5C.2A2 Canvas source selection and reviewer
handoff is complete and live validated. Phase 5C.2B Canvas PDF/image OCR
sources are complete and live validated. Phase 5D.1 immutable source snapshots
and exact reviewer provenance, Phase 5D.2 structured normalized blocks and
selective import, and Phase 5D.3 duplicate relationships, source freshness,
and regeneration readiness are implemented, remotely verified, and
protected-live validated. Phase 5E planning is complete in
`docs/ai/phase5e-grades-submissions-plan-20260708.md`, and Phase 5E.1 is
complete in
`docs/ai/phase5e1-grades-submissions-foundation-20260708.md`. Phase 5E.2 is
complete in `docs/ai/phase5e2-canvas-grade-client-20260708.md`. Phase 5E.1 adds
only the normalized contract, schema, DB types, and rollback-safe SQL verifier.
Phase 5E.2 adds only read-only Canvas assignment metadata, own-submission, and
visible course-grade client methods with safe normalized provider contracts,
explicit visibility wrappers, shared pagination/error handling, omitted
`student_ids[]`, `user_id=self`, and unsafe-field discards. Phase 5E.3 adds the
internal explicit per-selected-course grade synchronization service,
Canvas-to-database normalization, deterministic fingerprints, service-role-only
RPC persistence, authoritative absence marking, partial-failure preservation,
and per-course grade sync state. Canvas access remains read-only and manual.
Remote Supabase verification is complete through `202607080006`, with
service-role-only RPC execution, hardened table grants/RLS, 17/17 rollback
verifier checks passing, and zero fictional rows remaining. Phase 5E.4 exposes
protected grade API routes for explicit selected-course sync plus DB-only list,
detail, summary, and sync-status reads. Phase 5E.4 protected live validation is
complete in `docs/ai/phase5e4-protected-grade-api-live-validation-20260708.md`;
the closeout fixed the sync route course-scope preflight so unknown valid
course UUIDs return safe `404` and owned but unselected courses return safe
`400` before Canvas synchronization. Phase 5E.5 is complete and locally
validated in `docs/ai/phase5e5-mobile-grade-experience-20260708.md`: mobile now
has selected-course `Grades`, strict parsers, GET-only loading/reload, explicit
per-course grade sync, course summary display, assignment pagination, protected
assignment detail, stale/partial/failed copy, and in-memory-only network
failure preservation. No background synchronization, durable grade cache,
notification, local grade calculation, submission mutation, private
submission-content return, or reviewer integration exists. Phase 5E.6 is in
progress in
`docs/ai/phase5e6-mobile-grade-protected-live-validation-20260708.md`:
automated baseline checks, protected API preflight, Expo Web protected smoke,
session-only smoke, controlled fictional edge validation, authorization
regression checks, and privacy scans passed. The next roadmap step is Phase
5E.6 physical iPhone Expo Go validation; Phase 5E is not complete until that
device checklist passes.
Product Recovery R3 is complete with exact OCR page completeness enforced for
all accepted documents. Product Recovery R4 - Canvas usable-content resolution
is the immediate product-recovery task. Phase 5E.6 remains in progress and is
not marked complete by R3.
Automatic repeated scanned-PDF header/footer detection remains a deferred
candidate.

## Known Blockers And Risks

- OneDrive-backed generated Next output can leave stale reparse-point artifacts;
  the smoke runner clears generated `apps/api/.next/server` before
  runner-owned API startup. A stale generated
  `apps/api/.next/types/cache-life.d.ts` reparse-point artifact was removed
  during Phase 4 verification before rerunning the PDF OCR smoke.
- OpenAI cost, rate limits, and serverless latency can affect reviewer
  generation.
- OCR layout preservation is a product risk because reviewer quality depends on
  line, heading, and list boundaries.
- Live Google OCR has passed on a correctly configured local API, but future
  live OCR remains credential-, LAN-, and device-dependent. Credential paths
  are machine-specific and must not be documented or committed.
- Scanned-PDF OCR is implemented and live-validated as a synchronous 1-5 page
  product boundary. Five is the inline Google Vision `files:annotate` limit,
  is centralized in `@stay-focused/ocr`, and is checked before provider work.
  Accepted documents require exact terminal coverage of every page. Larger
  PDFs require a separately planned asynchronous Cloud Storage architecture.
  Visible repeated headers and footers may still be extracted as source text
  until a later cleanup task adds automatic repeated header/footer detection.
- Reviewer persistence has a live cross-user RLS validation baseline. Future
  persistence changes should preserve owner-scoped access, safe 404 denial, and
  owner-only cleanup behavior.
- Phase 5A Canvas storage requires `CANVAS_TOKEN_ENCRYPTION_KEY`, which must be
  canonical padded Base64 and decode to exactly 32 bytes. Stored ciphertext, IV,
  and authentication-tag fields are strictly decoded and fail closed when
  malformed. Do not generate a permanent fallback key and do not log the key or
  Canvas tokens.
- The protected connect/status/courses/capabilities/disconnect flow has passed
  locally with a real app-owned ignored local key, not a temporary test key.
- Each Canvas personal access token is validated through the API, encrypted
  server-side, stored only for the authenticated Stay Focused user, and never
  returned to mobile. Mobile uses secure text entry and clears the token after
  connect attempts; it does not store the Canvas token in AsyncStorage or
  SecureStore.
- `CANVAS_PERSONAL_ACCESS_TOKEN` is developer-owned live-validation input only,
  not a shared application credential.
- `CANVAS_TOKEN_ENCRYPTION_KEY` is a deployment-owned encryption secret. It is
  not obtained from Canvas, the school, or the student.
- Canvas permissions vary by user, role, institution, and course. Course access
  for one token does not imply module, file, grade, quiz, caption,
  conversation, external-tool, or institution-wide access.
- Phase 5B.2 synchronization is synchronous and manual. The observed live
  account finished inside the current 60-second route duration, but the first
  run was close to the limit. Larger accounts may need resumable or background
  synchronization later.
- Phase 5B.2 persistence is atomic per course, not one transaction for the
  entire Canvas account. Partial account syncs may commit successful courses
  while preserving failed courses.
- No background or scheduled Canvas synchronization exists yet, and no mobile
  synchronization screen exists yet.
- Canvas OAuth is required before broad public production authorization can be
  presented as complete. It requires an institution-approved Canvas Developer
  Key and is not implemented.
- Mobile OAuth redirect completion is not yet validated as complete.
- Server secrets must stay out of mobile env files, browser bundles, logs, and
  committed files.
- Captured images, screenshots, credential files, OCR artifacts, tokens, and
  private document OCR output must stay out of committed files.

## Historical Snapshot Before 2026-07-04

The following undated snapshot is retained for history only. The current status
is the section above.

- Stay Focused V2 uses an engine-first, evaluation-first workflow.
- Stages 0 through 6 and the end-to-end pipeline are implemented with typed
  evaluation coverage.
- The API-layer OpenAI provider now includes an injected-client adapter and a
  server-only OpenAI SDK factory in commit `d8374e9`, present on `origin/main`.
- The current branch is `main` at `d8374e9`, matching `origin/main`.
- The latest full evaluation result is 219 passed and 0 failed.
- OpenAI adapter contract checks pass 18 cases with fake clients and no network
  access.
- Node.js `v24.16.0` and npm `11.13.0` are installed. The Node directory was
  added to the user PATH, and PowerShell CurrentUser execution policy is
  `RemoteSigned` so the official npm shim can run.
- API and engine typechecks/builds pass. Root workspace typecheck/build now run
  but stop in untouched mobile configuration due duplicate React types and a
  missing `react-native-web` dependency.
- The real OpenAI smoke test is implemented but was not run because it remains
  explicitly opt-in through `RUN_OPENAI_SMOKE=1`.
- Supabase JWT Bearer authentication is now enforced on `/api/review`.
- This handoff is local-only, ignored by Git, and was not committed.

### Historical Recent Completed Work

### Stage 0 - Domain Contracts and Source Normalization

- Added domain contracts and initial normalized source handling.
- Added the evaluation framework foundation and Stage 0 cases.
- Recorded verification: 14 passed, 0 failed.

### Stage 1 - Outline Detection

- Implemented deterministic outline detection.
- Added typed eval coverage for outline behavior.
- Recorded verification: Stage 0 14 passed; Stage 1 14 passed.

### Stage 2 - Generation Planning

- Implemented deterministic generation planning.
- Added plan-oriented eval cases.
- Recorded verification: Stage 0 14 passed; Stage 1 14 passed; Stage 2 24
  passed.

### Stage 3 - Provider Requests and Typed Outputs

- Implemented deterministic, source-grounded prompts.
- Added provider-agnostic schema selection with `gpt-4o` as the default model.
- Added plan, section, schema, and source metadata to provider requests.
- Added validation for returned output fields and identities.
- Wrapped provider failures with section context.
- Kept all provider access behind the `GenerationProvider` interface.
- Added plain serializable TypeScript descriptors for `ConceptCard`,
  `ProcessStep`, `ExampleCard`, and `ClaimCard`.
- Added 24 eval cases covering schema selection, prompts, metadata, valid
  outputs, invalid responses, missing inputs, source references, and provider
  failures.

### Stage 4 - Coverage Verification

- Implemented deterministic coverage verification using eval-first
  development.
- Added checks for schema alignment, required content, source coverage,
  scoring, statuses, ordering, and validation.
- Added Stage 4 to the aggregate eval runner.

### Stage 5 - Bounded Retry Handling

- Implemented eval-first bounded retries through the existing Stage 3 provider
  boundary.
- Preserved passed outputs and retried only retryable weak or failed sections.
- Re-ran Stage 4 coverage after generated retry candidates and stopped sections
  once they passed or reached the configured retry bound.
- Added fake-provider coverage for policy switches, provider failures, missing
  outputs, ordering, replacement behavior, and structural validation.
- Added Stage 5 to the aggregate eval runner.

### Stage 6 - Deterministic Reviewer Assembly

- Implemented deterministic reviewer assembly without a final provider or
  model pass.
- Preserved generation-plan order and all typed section output content.
- Added stable reviewer and reviewer-section IDs, deterministic metadata, and
  explicit weak-section opt-in.
- Added validation for output, coverage, plan, source, schema, and source-block
  relationships.
- Added Stage 6 to the aggregate eval runner with 30 cases.

### Pipeline Integration

- Wired `runPipeline` through normalization, outline detection, generation
  planning, initial generation, coverage verification, bounded retries, final
  verification, and reviewer assembly.
- Kept all provider calls behind `GenerationProvider` and used deterministic
  fake providers in integration evals only.
- Added integration coverage for schema routing, source order, request counts,
  retries, weak-section policy, metadata, deterministic IDs, and contextual
  failures.
- Added the pipeline integration suite to the aggregate eval runner.

### Engine Contract Documentation

- Added ADR-004 for the accepted Stage 0 through Stage 6 engine pipeline.
- Added an implementation-focused engine contract covering public types, stage
  boundaries, provider requests, schema family, verification, retries, and
  current limitations.
- Updated the repository README, capstone overview, and eval README with the
  completed pipeline status and capstone context.

### OpenAI Provider Adapter Boundary

- Added ADR-005 and implementation documentation for an API-layer OpenAI
  adapter behind `GenerationProvider`.
- Added an injected-client `OpenAIProvider` boundary without importing the
  OpenAI SDK or changing Stage 0 through Stage 6.
- Added 16 dependency-free fake-client contract checks for request mapping,
  structured output parsing, validation, and error wrapping.
- Added safe env templates and strengthened ignore rules for local env and
  credential files.
- Migrated matching V1 local values into ignored V2 root/API/mobile env files;
  Google Cloud project and credential values remain missing.

### Server OpenAI SDK Wiring

- Installed the OpenAI SDK in `apps/api` only.
- Added `createServerOpenAIProvider`, which reads the server-only
  `OPENAI_API_KEY` and constructs the real SDK client behind the existing
  `OpenAIResponsesClient` boundary.
- Preserved strict JSON Schema Responses API mapping and Stage 3 validation.
- Added an opt-in, one-call OpenAI smoke module guarded by
  `RUN_OPENAI_SMOKE=1`.
- Expanded fake-client provider contract coverage to 18 passing checks.
- Restored local Node/npm access without changing system PATH.

### Historical Active Branch / Commits

- Branch: `main`
- `d8374e9` - `feat(api): wire server openai provider`
- `a0233be` - `feat(api): design openai provider adapter boundary`
- `e2a665f` - `docs(engine): document completed pipeline contract`
- `cc5dac2` - `feat(engine): wire pipeline integration`
- `d54b4cb` - `feat(engine): implement stage 6 reviewer assembly`
- `25aabc4` - `feat(engine): implement stage 5 bounded retries`
- `612bfe0` - `chore: add local-only agent handoff template`
- `e0f79bf` - `feat(engine): implement eval-first stage 4 coverage verification`
- `a108a26` - `feat(engine): implement eval-first stage 3 provider requests`
- `5f50c89` - `feat(engine): implement eval-first stage 2 generation planning`
- `1aad79c` - `feat(engine): implement eval-first stage 1 outline detection`
- `4483503` - `test(engine): add dependency-free evaluation harness`
- `dfd6ae8` - `feat(engine): add domain contracts and stage 0 normalization`

`origin/main` currently points to `a0233be`, confirming that the OpenAI adapter
boundary commit was pushed.

### Historical Test / Verification Status

Latest full verification through pipeline integration on 2026-06-15:

- Stage 0: 14 passed
- Stage 1: 14 passed
- Stage 2: 24 passed
- Stage 3: 24 passed
- Stage 4: 21 passed
- Stage 5: 28 passed
- Stage 6: 30 passed
- Pipeline integration: 21 passed
- Total: 176 passed, 0 failed
- Direct TypeScript 5.8.3 source and eval typechecks passed.
- Direct TypeScript 5.8.3 source and eval builds passed.
- Each Stage 0 through Stage 6 suite and the pipeline suite passed
  independently.
- The aggregate eval runner passed.
- The failure exit-code check correctly returned `1`.
- `git diff --check` passed with exit code `0`.
- `npm install` passes with npm `11.13.0`.
- `npm run typecheck` starts successfully but fails in untouched mobile code
  because React Native JSX types resolve against incompatible duplicate React
  type definitions.
- `npm run build` starts successfully but fails in untouched mobile setup
  because Expo web export requires `react-native-web`.
- Verification used the bundled Codex Node.js runtime and the local temporary
  TypeScript 5.8.3 compiler package.
- The documentation session reran direct source/eval typechecks, both builds,
  and the full 176-case eval runner successfully.
- The adapter session reran the full 176-case engine eval runner and direct
  engine typechecks/builds successfully.
- API provider-specific TypeScript typecheck/build passed, and all 18 provider
  contract checks passed without a real API key or network call.
- The API Next.js production build passes.
- The OpenAI smoke test was not run because it is opt-in and
  `RUN_OPENAI_SMOKE=1` was not explicitly enabled.

### Historical Important Architecture Decisions

- Engine-first development continues.
- Evaluation-first development is the standard workflow for each engine stage.
- The provider boundary must remain isolated through `GenerationProvider`.
- Stage outputs must remain typed, serializable, and source-grounded.
- `packages/engine` must not contain UI coupling.
- Provider schema descriptors remain plain serializable TypeScript data rather
  than SDK-specific objects.
- Real model quality evaluation remains separate from deterministic engine
  contract evaluation.

### Historical Known Constraints

- New shells inherit `C:\Program Files\nodejs` from the user PATH. Existing
  long-lived parent processes may require a restart to observe the updated
  environment automatically.
- Google Cloud project ID and credentials are not available in the migrated
  local environment files.
- OpenAI token ceilings and serverless execution limits may affect future
  generation latency and should be monitored when real provider integration is
  added.
- `npm install` currently reports 12 moderate dependency vulnerabilities; no
  forced audit fix was applied because that could introduce unrelated breaking
  changes.

### Historical Blockers

- Root workspace typecheck is blocked by duplicate React type definitions in
  the existing mobile workspace.
- Root workspace build is blocked because the existing Expo web configuration
  does not include `react-native-web`.
- CRLF warnings appear during some Git checks but do not block verification.

### Historical Recommended Next Task

- Run the opt-in OpenAI smoke test in a deliberate credentialed session, then
  add a protected API route that constructs the server provider and invokes the
  unchanged engine pipeline.
- Resolve the separate mobile dependency/type mismatch before requiring clean
  root monorepo typecheck and build results.

## Session Log

### 2026-07-13 Product Recovery R3 full-document OCR completeness

- Started on `main` at
  `a1ffef95cdc99dc9f0845d6dd2779b2969466f37`, synced 0/0 with origin. The
  four declared unrelated dirty paths remained untouched and unstaged.
- Audited manual image/PDF OCR, Canvas stored-file OCR, mobile reviewer handoff,
  Google provider normalization, page-count and upload enforcement, and V1's
  read-only page-rendering behavior.
- Added one authoritative shared verifier for expected page count, exact unique
  coverage, range, valid terminal states, explicit blank pages, deterministic
  ordering, sanitized diagnostics, and assembled-source eligibility.
- Provider, extraction service, API routes, Canvas preparation, mobile parsing,
  source state, and reviewer start now all fail closed on incomplete OCR. A
  failed retry cannot reuse stale OCR text.
- Retained and centralized the five-page PDF limit because the current
  synchronous inline Google Vision method permits at most five pages per call;
  all over-limit rejection happens before the provider call.
- Automated verification passed: OCR 25/25, engine 287/287, API 391/391,
  mobile 130/130, reviewer smoke-runner 51/51, full typecheck/lint/build checks,
  and mocked PDF OCR browser smoke with reviewer HTTP 200.
- Protected fictional real-OCR validation passed for 1-page image, 2-page PDF,
  5-page PDF, blank-middle PDF, and controlled incomplete input. The 5-page
  case processed/extracted all 5 pages in one call and 1.591 seconds, with
  reviewer coverage/grounding/leakage passing. The incomplete case made zero
  reviewer calls.
- No OCR text, document title, private Canvas content, provider body, provider
  ID, upload, rendered page, credential, or local validation artifact was
  printed or committed.
- Full report:
  `docs/ai/product-recovery-r3-full-document-ocr-20260713.md`.

### 2026-07-06 Phase 5C.1 Canvas file inventory and bounded ingestion

- Baseline: `main` at `b6fecec`, synced with `origin/main` at start. Known
  unrelated dirty files remained untouched: `apps/api/next-env.d.ts`,
  `apps/mobile/expo-env.d.ts`, and `apps/mobile/.gitignore`.
- Added typed Canvas file metadata methods and a bounded binary download path
  in `@stay-focused/canvas`.
- Download hardening includes manual redirect handling, off-origin bearer-token
  stripping, unsafe redirect target rejection, timeout enforcement,
  content-length checks, and stream byte caps.
- Added a central Canvas file policy tied to existing OCR ceilings: 10 MiB per
  file, 3 selected files per ingestion request, and 15 MiB aggregate stored
  bytes.
- Added file metadata normalization and HTML reference discovery with `parse5`
  for module items, Pages, assignments, and announcements. The normalizer
  records references only; it does not fetch or extract file contents.
- Added migration
  `202607060003_add_canvas_file_ingestion_foundation.sql` for `canvas_files`,
  `canvas_file_references`, `canvas_file_ingestion_results`, service-role-only
  RPCs, and private `canvas-source-files` storage bucket posture.
- Added follow-up migration
  `202607060004_add_canvas_file_ingestion_fk_indexes.sql` after Supabase
  performance advisors identified new Phase 5C.1 foreign-key index warnings.
- Extended `POST /api/canvas/sync` with file inventory and aggregate file
  counts while preserving sanitized route output.
- Added protected `POST /api/canvas/files/ingest`, which accepts selected owned
  `canvas_files` row ids, re-fetches metadata, stores only eligible validated
  bytes, cleans up unreferenced old objects, and returns sanitized per-file
  statuses without filenames, URLs, object keys, hashes, or Canvas response
  bodies.
- Extended mobile Canvas sync response parsing for `files` and
  `fileReferences` counts without adding UI.
- Automated verification passed:
  - `npm test --workspace @stay-focused/canvas`: 50/50
  - `npm run typecheck --workspace @stay-focused/canvas`: passed
  - `npm run build --workspace @stay-focused/canvas`: passed
  - `npm run typecheck --workspace @stay-focused/db`: passed
  - `npm test --workspace apps/api`: 184/184
  - `npm run typecheck --workspace apps/api`: passed
  - `npm run build --workspace apps/api`: passed
  - `npm test --workspace apps/mobile`: 79/79
  - `npm run typecheck --workspace apps/mobile`: passed
  - `npm run typecheck --workspace @stay-focused/ocr`: passed
  - `npm run build --workspace @stay-focused/ocr`: passed
  - `npm test --workspace @stay-focused/ocr`: 14/14
  - `npm run typecheck`: 7/7 workspaces
  - `npm run build`: 7/7 workspaces
  - `npm run test --workspaces --if-present`: passed
- Remote migration/advisor/storage verification completed through the existing
  ignored linked Supabase workflow. Migration history includes `202607060003`
  and `202607060004`. Security advisors had no unresolved new Phase 5C.1
  security finding; performance advisors' new Phase 5C.1 foreign-key warnings
  were fixed by `202607060004`.
- Protected live metadata sync ran twice through a local production build. It
  discovered 52 files, inserted 52 on the first run, classified 52 as unchanged
  on the second run, recorded 15 references, produced no duplicate identities,
  preserved failed course data, and left zero running sync rows. The route
  measured 72.294 seconds and 65.355 seconds against `maxDuration = 60`, so
  production-runtime readiness remains partial.
- Protected live ingestion requested three selected internal rows, stored two
  eligible files, recorded one metadata-only result, stored 92,950 aggregate
  bytes, verified private objects, denied public access, and invoked no
  OCR/extraction. The second ingestion returned two unchanged and one
  metadata-only result, stored 0 bytes, produced no duplicate object versions,
  and left zero running sync rows.
- No PATs, bearer tokens, Canvas URLs, Canvas IDs, file names, storage object
  keys, hashes, file bytes, or raw Canvas responses were printed or committed.

### 2026-07-06 Phase 5B.4A Canvas planner-item and announcement synchronization

- Starting baseline: `main` at `dc670a4`, matching `origin/main` with ahead 0
  and behind 0. Known unrelated dirty files remained untouched:
  `apps/api/next-env.d.ts`, `apps/mobile/expo-env.d.ts`, and
  `apps/mobile/.gitignore`.
- Added typed Canvas client methods and types for planner items and
  announcements. Planner sync uses repeated course `context_codes[]`;
  announcement sync fetches one course at a time to preserve failure isolation.
- Added a deterministic rolling window of 30 days in the past and 120 days in
  the future, captured from one run timestamp.
- Added normalized planner and announcement payloads with deterministic
  fingerprints and without unrestricted nested Canvas payload retention.
- Added migrations `202607060001_add_canvas_planner_announcements.sql` and
  `202607060002_harden_canvas_planner_announcement_triggers.sql`.
- Added `canvas_planner_items`, `canvas_announcements`, and service-role-only
  snapshot RPCs with RLS, restricted grants, ownership checks, and controlled
  search paths.
- Extended `POST /api/canvas/sync` to persist planner items and per-course
  announcements after the existing course graph work, while preserving existing
  course graph atomicity and failure behavior.
- Extended mobile Canvas sync response parsing and tests. No mobile UI was
  added.
- Remote migration history includes `202607060001` and `202607060002`; remote
  rollback verification passed through
  `scripts/phase5b4a-planner-announcements-verification.sql`.
- Automated verification passed: Canvas typecheck/build/tests 35/35, DB
  typecheck, API typecheck/build/tests 183/183, mobile typecheck/tests 79/79,
  root typecheck 7/7, root build 7/7 after clearing a generated API `.next`
  artifact from the known OneDrive/Next issue, workspace tests API 183/183,
  mobile 79/79, Canvas 35/35, OCR 14/14, and `git diff --check` with CRLF
  warnings only.
- Protected live validation used the existing encrypted Canvas connection and
  aggregate-only output. No PATs, bearer tokens, Canvas URLs, Canvas IDs,
  course names, planner titles, announcement titles, announcement bodies,
  instructor names, assignment names, raw responses, internal UUIDs, or real
  fingerprint values were committed.
- First protected live run: HTTP 200 `partial`, 72.370 seconds, 17 courses
  discovered, 13 existing graph courses succeeded, 4 existing graph courses
  failed with sanitized `canvas_course_pages_failed`, 37 planner items
  discovered and inserted, 27 announcements discovered, 13 announcement courses
  succeeded, 4 announcement courses failed, 19 announcements inserted, 0 retry
  attempts, and 0 running sync rows.
- Second protected live run: HTTP 200 `partial`, 63.048 seconds, 37 planner
  items unchanged, 19 announcements unchanged, stable planner and announcement
  identities, 0 duplicate planner identities, 0 duplicate announcement
  identities, 0 unnecessary updates, 0 unexpected pruning, preserved failed
  course graphs, stable failure categories, and 0 running sync rows.
- Sanitized live failure counts remained `canvas_course_pages_failed: 4` and
  `canvas_announcement_persistence_failed: 4`.
- A final response-shape revalidation after hiding internal diagnostic fields
  repeated the protected sync twice and confirmed strict aggregate output,
  stable identities, zero duplicates, zero unnecessary updates, zero
  unexpected pruning, and zero running sync rows.
- Verdict: partial due documented permanent live Canvas limitations. The next
  roadmap task is Phase 5C file, attachment, and media ingestion.

### 2026-07-06 Phase 5B.3C1 Canvas conditional-request capability audit

- Starting baseline: `main` at `6401ee9`, matching `origin/main` with ahead 0
  and behind 0. Known unrelated dirty files remained untouched:
  `apps/api/next-env.d.ts`, `apps/mobile/expo-env.d.ts`, and
  `apps/mobile/.gitignore`.
- Created an ignored `.local` audit harness and kept all raw live artifacts out
  of git.
- Loaded the existing stored encrypted Canvas connection through the API-side
  service-role and token-decryption boundary. Connection availability,
  decryption success, and audit-client initialization passed.
- Production Canvas synchronization behavior was not changed. No migrations,
  sync runs, graph writes, validator persistence, raw response caching, or
  secondary Canvas resources were added.
- Audited active course listing, modules, module items, Pages, Page details,
  assignment groups, and assignments with 3 local course sample labels and no
  real course identity output.
- Baseline requests: 10; primary conditional requests: 10; controlled
  conditional subtests: 20.
- ETags were present and stable across all audited endpoint families.
- `Last-Modified` was absent across all audited endpoint families.
- If-None-Match requests returned HTTP 200 with full bodies for every audited
  endpoint. No 304 responses were observed.
- Baseline body bytes and conditional body bytes were both 154,503, so
  observed body-byte reduction was 0%.
- Baseline duration was 3.467 seconds; primary conditional duration was 3.993
  seconds.
- One paginated Page collection included a later page, proving future
  conditional design would require per-page validator and pagination state if
  useful 304 behavior is ever observed.
- Page-list validators cannot prove Page-detail body stability. Module-item
  lists, assignment groups, and assignments require separate state from
  neighboring collection families.
- The four known Page-listing failures remained
  `canvas_course_pages_failed`, `resource_not_found`, non-retryable, not 304,
  and did not advance graph or fingerprint state.
- Focused verification passed because production source was not changed:
  Canvas typecheck/build/tests 33/33, API typecheck/build/tests 176/176, and
  mobile typecheck/tests 79/79.
- Decision: Outcome C. Continue ordinary GET behavior for all currently
  synchronized endpoint families. Recommended next Canvas phase: Phase 5B.4
  secondary Canvas resource synchronization.

### 2026-07-06 Phase 5B.3B incremental academic graph synchronization foundation

- Starting baseline: `main` at `289f636`, matching `origin/main` with ahead 0
  and behind 0. Known unrelated dirty files remained untouched:
  `apps/api/next-env.d.ts`, `apps/mobile/expo-env.d.ts`, and
  `apps/mobile/.gitignore`.
- Added `202607050008_add_canvas_incremental_sync_state.sql` and updated
  `packages/db/src/types.ts`.
- Added `canvas_course_sync_states`, expanded sync modes to `full` and
  `incremental`, expanded course-result statuses to include `unchanged`, and
  kept the new table and RPCs behind the service-role boundary.
- Added deterministic versioned fingerprints over normalized persistence
  payloads in `apps/api/src/lib/canvas-sync-fingerprint.ts`. Fingerprints are
  private change-detection values, are not returned publicly, are not logged,
  and are not authorization controls.
- Updated `POST /api/canvas/sync` so missing bodies default to `full` and
  `{ "mode": "incremental" }` enables changed/unchanged comparison after the
  complete Canvas course snapshot has been fetched.
- Changed-course persistence uses
  `replace_canvas_course_academic_snapshot_with_sync_state` so graph
  replacement and fingerprint advancement happen atomically.
- Matching fingerprints call `record_canvas_course_snapshot_unchanged`, skip
  graph replacement, leave graph timestamps stable, and advance only safe
  sync-state metadata.
- Fetch failures call `record_canvas_course_snapshot_failed` best-effort,
  preserve previous graph rows, preserve the last successful fingerprint, and
  retain the Phase 5B.3A sanitized failure code.
- Remote migration push applied only `202607050008`; migration history includes
  `202607050008`.
- Remote rollback SQL verification passed through
  `scripts/phase5b3b-incremental-sync-verification.sql`.
- Automated verification passed: Canvas typecheck/build/tests 33/33, DB
  typecheck, API typecheck/build/tests 176/176, mobile typecheck/tests 79/79,
  root typecheck 7/7 with 4 cached and 3 fresh, root build 7/7 with 4 cached
  and 3 fresh, workspace tests API 176/176, mobile 79/79, Canvas 33/33, OCR
  14/14, and `git diff --check` with line-ending warnings only.
- Live validation used the existing encrypted Canvas connection and protected
  `POST /api/canvas/sync` flow. No PATs, bearer tokens, Canvas URLs, Canvas
  IDs, course names, Page titles/bodies, assignment names/descriptions, raw
  responses, internal UUIDs, or real fingerprint values were committed.
- Full live baseline: HTTP 200, `partial`, 50.725 seconds, 17 courses
  discovered, 13 changed/succeeded, 0 unchanged, 4 failed with sanitized
  `canvas_course_pages_failed`, 13 graph replacements, 0 running rows.
- First incremental live sync: HTTP 200, `partial`, 47.502 seconds, 17 courses
  discovered, 13 unchanged, 0 changed, 4 failed, 0 graph replacements, state
  checks advanced, failed fingerprints preserved, unchanged graph timestamps
  stable, 0 running rows.
- Second incremental live sync: HTTP 200, `partial`, 46.750 seconds, 13
  unchanged, 0 changed, 4 failed, deterministic fingerprints, duplicate
  identities 0, internal identities stable, failed graphs preserved, 0 running
  rows.
- Incremental mode reduced database replacement and pruning work for unchanged
  courses. It does not reduce Canvas request volume yet because complete
  snapshots are still fetched before comparison.
- At that time, the next recommended phase was Phase 5B.3C conditional Canvas
  fetching and network-efficiency hardening; Phase 5B.3C1 has since completed
  that audit and recommends moving to Phase 5B.4 instead.

### 2026-07-06 Phase 5B.3A Canvas course recovery hardening

- Starting baseline: `main` at `1cd23c1`, matching `origin/main` with ahead 0
  and behind 0. Known unrelated dirty files remained untouched:
  `apps/api/next-env.d.ts`, `apps/mobile/expo-env.d.ts`, and
  `apps/mobile/.gitignore`.
- Added `202607050007_add_canvas_sync_course_results.sql` and updated
  `packages/db/src/types.ts`.
- Added sanitized per-course diagnostics through
  `record_canvas_sync_course_result`, with RLS enabled, direct
  `anon`/`authenticated` grants revoked, and public RPC execution revoked.
- Extended Canvas error classification to distinguish resource-not-found and
  network failures while preserving redirect and same-origin pagination
  protections.
- Added operation-specific course sync failure codes and bounded transient
  retries: 2 retries after the initial attempt, bounded exponential backoff,
  capped `Retry-After`, finite request timeouts, and no retries for
  non-retryable 4xx, malformed responses, redirects, pagination rejection,
  ownership failures, or persistence failures.
- Remote migration push applied only `202607050007`; migration history includes
  `202607050007`. The CLI emitted the known non-fatal Docker catalog-cache
  warning after remote application.
- Remote rollback SQL verification passed through
  `scripts/phase5b3a-recovery-verification.sql`.
- Hardened live validation used the existing encrypted Canvas connection and
  protected `POST /api/canvas/sync` flow. No PATs, bearer tokens, Canvas URLs,
  Canvas IDs, course names, Page titles/bodies, assignment names/descriptions,
  or raw Canvas responses were printed or committed.
- First hardened live sync: HTTP 200, `partial`, 52.318 seconds, 17 courses
  discovered, 13 succeeded, 4 failed, 27 modules, 311 module items, 459 Pages,
  18 assignment groups, 25 assignments, 0 retry attempts, 0 running rows.
- Second hardened live sync: HTTP 200, `partial`, 50.622 seconds, same
  aggregate counts, 0 retry attempts, 0 running rows.
- The four previously generic failures are now
  `canvas_course_pages_failed`, operation `pages`, category
  `resource_not_found`, HTTP class 4xx, non-retryable, retry count 0. They are
  documented as permanent Canvas/resource limitations for the required
  Page-listing operation, not implementation defects.
- Duplicate identities remained 0, internal identities remained stable on the
  second run, first-sync timestamps remained stable, and last-sync timestamps
  advanced for successful courses.
- Next recommended phase: Phase 5B.3B incremental academic graph
  synchronization foundation.

### 2026-07-05 Phase 4 live Study Library RLS validation

- Starting baseline: `main` at `2e945cf`, matching `origin/main` with ahead 0
  and behind 0.
- Preserved the existing reviewer `[id]` route typing fix and test update.
  Root cause: Next.js App Router dynamic route params are Promise-based in the
  route context. Runtime behavior did not change.
- Reloaded `.env.smoke.local`, `.env.supabase.local`, `apps/api/.env.local`,
  and `apps/mobile/.env.local` in the validation process without printing
  credential values, emails, tokens, full user IDs, connection strings, or
  reviewer payloads.
- Confirmed the two live test accounts authenticated, their normalized emails
  differed, and their Supabase user IDs differed.
- Confirmed the target Supabase project already had migration
  `202607050001_create_reviewers.sql` applied.
- Verified `public.reviewers` exists, RLS remains enabled, and the owner
  SELECT, INSERT, UPDATE, and DELETE policies use `auth.uid() = user_id`.
- Started the local API on `http://localhost:3000` because no API was already
  listening there; `GET /api/health` returned 200.
- User A generated and saved one fictional reviewer through the authenticated
  API with allowlisted metadata and no client-supplied ownership, then listed
  and opened it successfully.
- User B's list excluded User A's reviewer. User B open, rename, and delete
  attempts returned safe `404 reviewer_not_found` responses without exposing
  owner identity, title, metadata, reviewer content, ownership, or row
  existence. User A retained access after User B's delete attempt.
- Reverse isolation passed: User B generated and saved one fictional reviewer,
  User B could list it, User A could not list or open it, and User B deleted
  it.
- Cleanup passed: User A deleted User A's validation reviewer; deleted rows no
  longer appeared in owner lists; opening either deleted reviewer returned safe
  `404 reviewer_not_found`; no fictional validation rows remained.
- Service-role reviewer CRUD was not used. Service/management access was used
  only for read-only schema, policy, and migration verification.
- Regression pass:
  `npm run typecheck --workspace @stay-focused/db`;
  `npm run typecheck --workspace apps/api`;
  `npm run test --workspace apps/api` (94/94);
  `npm run typecheck --workspace apps/mobile`;
  `npm run test --workspace apps/mobile` (66/66);
  `npm run build --workspace @stay-focused/engine`;
  `npm run eval --workspace @stay-focused/engine` (266/266);
  `npm run test --workspace @stay-focused/ocr` (14/14);
  `git diff --check` passed with line-ending warnings only.
- Reviewer web smoke was not rerun because the route fix was typing-only and
  runtime behavior did not change.
- Verdict: Phase 4 Study Library and Persistence completed and live validated.
  Next product phase: Phase 5 Canvas Integration.

### 2026-07-05 Phase 3D live iPhone PDF OCR validation

- Confirmed Phase 3D live physical-device validation passed using iPhone Expo
  Go against the local Next.js API over LAN with real server-only Google Cloud
  Vision credentials.
- Confirmed a fictional, image-only, two-page scanned PDF could be selected
  from the iPhone Files picker.
- Confirmed the app displayed the PDF filename, `APPLICATION/PDF`, file size,
  and detected page count of 2.
- Confirmed the protected PDF OCR request reached the API and Google Vision
  synchronous PDF OCR succeeded.
- Confirmed both PDF pages were extracted in preserved page order.
- Confirmed extracted text appeared in the editable review field and the user
  edited that text before generation.
- Confirmed reviewer generation used the edited OCR text as its source.
- Confirmed Reviewer Ready appeared, source-faithful passed, coverage passed,
  and clean output passed.
- Confirmed multiple reviewer sections and key points were generated.
- Confirmed the five-page limit using a separate PDF with more than five pages:
  the PDF was rejected safely and the UI displayed `PDF has too many pages` and
  `PDF OCR supports up to 5 pages per request.`
- Retained logs are not available for an exact HTTP status code, so no status
  code is claimed.
- Known limitation: visible scanned-PDF footer text such as `FICTIONAL OCR TEST
  DOCUMENT - PAGE 1 OF 2` and `FICTIONAL OCR TEST DOCUMENT - PAGE 2 OF 2` was
  correctly extracted by Google Vision and may become reviewer headings or
  sections. Users can remove this text in the editable OCR text field.
  Automatic repeated header/footer detection is deferred to a later cleanup
  task and was not implemented here.
- Verdict: COMPLETE - Phase 3D live PDF OCR validation passed.

### 2026-07-04 Phase 3D scanned PDF OCR ingestion

- Implemented synchronous small-batch scanned PDF OCR ingestion.
- Added Expo Document Picker PDF selection with one-file `application/pdf`
  intake, cache-copy enabled, filename/type/size display, page-count display
  after server validation, retry, and clear-PDF handling.
- Added `POST /api/ocr/extract-pdf` with Supabase bearer authentication,
  multipart field `pdf`, 10 MiB upload cap, `%PDF-` signature validation,
  `pdf-lib` parse/page-count validation, encrypted/malformed PDF safe errors,
  and a 1-5 page limit.
- Added Google Vision PDF OCR through synchronous `batchAnnotateFiles` with
  inline PDF bytes, `DOCUMENT_TEXT_DETECTION`, and explicit pages. No Cloud
  Storage, async operation, polling, or local PDF rasterization was added.
- Extended `@stay-focused/ocr` to accept PDF inputs while preserving the
  normalized document result shape used by image OCR.
- Added PDF-specific mobile API upload, safe error mapping, source-flow state,
  and editable extracted-text review before reviewer generation.
- Added mocked PDF OCR web smoke using a fictional in-memory PDF fixture and
  real reviewer generation.
- Verification passed: OCR package typecheck/build/test 14/14; API typecheck
  and tests 72/72; mobile typecheck and tests 61/61; smoke-runner tests 51/51;
  engine build and eval 266/266; reviewer web smoke passed; image OCR web smoke
  passed; PDF OCR web smoke passed.
- Existing paste, gallery-image, camera-image, and image OCR API regression
  paths remained covered by tests and smokes.
- Google credentials remain server-only. No credential files, env files,
  private PDFs, uploaded content, screenshots, tokens, or OCR output artifacts
  were committed.
- Verdict at implementation time: implemented; live validation recorded in the
  2026-07-05 session log entry above.

### 2026-07-04 Phase 3C live iPhone OCR validation

- Confirmed Phase 3C live physical-device validation passed using iPhone Expo
  Go against the local Next.js API over LAN.
- Confirmed camera/image intake reached the server-side OCR path and Google
  Cloud Vision extracted fictional study-habits text.
- Confirmed extracted OCR text remained editable and the edited text was used
  as the reviewer source.
- Confirmed Reviewer Ready appeared after reviewer generation.
- Confirmed source-faithful, coverage, and clean-output validation passed.
- Confirmed the generated reviewer contained at least one section and key
  point.
- The earlier live OCR failure was caused by a machine-specific
  `GOOGLE_APPLICATION_CREDENTIALS` path from another computer; after local
  credential configuration was corrected and the API restarted, live OCR
  succeeded. No credential path, filename, project ID, key, token, screenshot,
  photo, environment value, or captured image is recorded here.
- Google credentials remain server-only. No captured images, screenshots, OCR
  test artifacts, credential files, or private OCR output are committed.
- Verdict: COMPLETE - Phase 3C live camera/image OCR validation passed.
- Historical follow-up: Phase 3D scanned PDF ingestion is now complete.

### 2026-07-04 Phase 3C live iPhone OCR credential audit

- Confirmed local branch `main` is at
  `57b8811 feat(ocr): add camera capture source`, and `origin/main` contains
  that commit.
- Confirmed the camera implementation is already landed; no camera UI or OCR
  client redesign was attempted.
- Inspected OCR configuration by variable name and safe readiness metadata
  only. No credential values, paths, private keys, tokens, or OCR text were
  recorded.
- Result: `apps/api/.env.local` has no usable Google OCR credential
  configuration. Root env has a Google project value and a credential path, but
  the referenced file does not exist.
- Checked standard private credential locations on this machine and found no
  valid service-account JSON and no valid authorized-user ADC JSON.
- Per the Phase 3C task stop condition, physical iPhone validation was not
  claimed and the API/Expo phone environment was not started for live OCR.
- Required next action: create or place a valid Google OCR credential outside
  the repository and tracked files, configure the API process with
  `GOOGLE_APPLICATION_CREDENTIALS` plus project id or
  `GOOGLE_CLOUD_CREDENTIALS_JSON` plus project id, then rerun the iPhone
  checklist in `docs/dev/mobile-device-runbook.md`.
- Verdict: PARTIAL - camera implementation passes but live validation remains
  blocked by server-only Google credential setup.

### 2026-07-04 Phase 3B gallery OCR intake

- Added Expo SDK-compatible `expo-image-picker` to `apps/mobile`.
- Added `apps/mobile/src/services/ocrApi.ts` for typed authenticated
  multipart uploads to `POST /api/ocr/extract`, with PNG/JPEG validation,
  native/web form-data handling, abort support, safe error mapping, and secret
  redaction.
- Added gallery image selection and source-flow state helpers for permission
  denial, cancellation, selected-image preview, OCR loading, OCR success/failure,
  retry, clearing images, preserving manual paste, and using edited OCR text for
  reviewer generation.
- Updated `ReviewerGenerateScreen` with `Paste text` and `Import image` modes,
  selected-image preview, explicit `Extract text`, editable extracted-text
  review, character count, OCR status/error states, and stable OCR test IDs.
- Added mobile Vitest coverage: OCR client, gallery image mapping, and reviewer
  source-flow tests pass 32/32.
- Added `npm run smoke:ocr:web`, which uses a non-production Expo Web fixture
  hook, mocks only `POST /api/ocr/extract` with fictional OCR text, confirms
  authenticated multipart OCR upload, edits extracted text, then generates a
  reviewer through the real reviewer route.
- Updated the smoke runner generated-output cleanup to remove only
  `apps/api/.next/server` before runner-owned API startup, avoiding stale
  OneDrive-backed Next artifacts outside `.next/server/app`.
- Manual paste remains supported. Images are previewed only from local URIs and
  are not persisted, stored, logged, committed, or sent to the reviewer engine.
- Historical follow-up: live physical-device image OCR passed in Phase 3C, and
  scanned PDF OCR is now complete in Phase 3D.

### 2026-07-04 Phase 3A OCR server boundary

- Added `packages/ocr` with provider-agnostic OCR input/result types,
  `OcrProvider`, `OcrProviderError`, and deterministic normalization.
- Added an API-only Google Cloud Vision adapter with an injected fake-client
  boundary and no Google client construction during module import.
- Added a server OCR provider factory that reads Google Cloud configuration at
  runtime, normalizes escaped private-key newlines, supports Application
  Default Credentials, and keeps credential values out of responses.
- Added protected `POST /api/ocr/extract` with bearer auth, multipart parsing,
  PNG/JPEG MIME validation, a 5 MiB image limit, empty-file rejection, typed
  success responses, and safe error codes.
- Added docs for the OCR architecture, route, env names, supported image types,
  size limit, fake-test strategy, and Phase 3B handoff.
- Verification added in this phase: OCR package tests 10/10, Google OCR
  fake-client tests 10/10, OCR API route tests 14/14, API test suite 43/43,
  root typecheck PASS, root build PASS, API typecheck PASS, mobile typecheck
  PASS, engine build PASS, engine eval 266/266, and reviewer web smoke PASS.
- Manual paste remains supported. Mobile gallery selection, editable OCR text
  review, and scanned-PDF OCR remain pending.

### 2026-07-04 Documentation status and roadmap refresh

- Refreshed `README.md`, `docs/current-state.md`, `docs/roadmap.md`,
  `docs/ai/current_sprint.md`, supporting architecture/eval docs, capstone
  overview, and this handoff so they match local HEAD at baseline `ebb79d8`.
- Canonical current state is now `docs/current-state.md`; canonical roadmap is
  `docs/roadmap.md`; canonical current sprint is `docs/ai/current_sprint.md`.
- Current product state: Supabase email/password sign-in, protected reviewer
  API, OpenAI-backed reviewer generation, source-faithful validation, Expo
  reviewer preview, and unattended Expo Web smoke are complete locally.
- Current limitations: source input is still pasted text; OCR ingestion,
  scanned PDFs, Study Library persistence, Canvas sync, tasks, schedules,
  completed mobile OAuth redirects, deployment validation, and production
  readiness remain pending.
- Verification in this documentation refresh: smoke-runner unit tests 51/51,
  reviewer API route tests 19/19, engine build PASS, engine eval PASS 266/266,
  API typecheck PASS, mobile typecheck PASS.
- Current smoke command: `npm run smoke:reviewer:web`.
- Next engineering task: Phase 3A - audit source/OCR contracts, add a
  provider-agnostic OCR boundary, add fake Google OCR client tests, and expose a
  protected server OCR API contract before building camera or gallery UI.

### 2026-06-15 - Session 14 Supabase JWT Auth on /api/review

**Files created:**
- `apps/api/src/lib/auth.ts` — `verifyBearerToken(request)` helper using
  Supabase service-role client to validate `Authorization: Bearer <token>`
  headers. Returns the `User` object on success, `null` on any failure.
  Never exposes token contents, stack traces, or Supabase internals.

**Files changed:**
- `apps/api/app/api/review/route.ts` — Auth check now runs first, before
  `RUN_OPENAI_SMOKE` and all other checks. Returns `{ error: "Unauthorized" }`
  with HTTP 401 on any auth failure.
- `apps/api/package.json` — Added `@supabase/supabase-js: ^2.49.4` to
  `dependencies` (was already hoisted to root node_modules via `packages/db`;
  now declared explicitly in the API package).

**What was implemented:**
- JWT Bearer-only authentication for `/api/review` (no cookies, mobile-safe).
- Auth call order: auth → RUN_OPENAI_SMOKE guard → input validation → provider
  → pipeline.
- Status mapping: 401 (no/bad/expired token), 501 (smoke disabled), 400 (bad
  input), 500 (provider/pipeline failure).
- `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are read from `process.env`
  inside the helper; both are already configured in Vercel.

**Risks / edge cases noticed:**
- `@supabase/supabase-js` was not explicitly listed in `apps/api/package.json`
  before this session. It was accessible via hoisting from `packages/db`, but
  explicit declaration was added for correctness and deploy reliability.
- The `tsconfig.providers.json` scope does not include `src/lib/`, so the new
  auth helper is only compiled by the main `tsconfig.json`. This is intentional
  and consistent with existing route files.
- `persistSession: false` is passed to `createClient` to prevent any
  cookie/storage side effects in the server environment.
- If `SUPABASE_URL` or `SUPABASE_SERVICE_ROLE_KEY` are missing at runtime, the
  helper returns `null` (→ 401) rather than throwing, keeping error responses
  generic.

**Next recommended step:**
- Run `npm run build` in `apps/api` and verify the Next.js production build
  still passes with the new auth import.
- Test the deployed `/api/review` endpoint: confirm 401 without a token, 401
  with an invalid token, and 501 with a valid Supabase token (until
  `RUN_OPENAI_SMOKE=1` is enabled).
- Consider adding a mobile integration test that exercises the full auth +
  pipeline path once `RUN_OPENAI_SMOKE=1` is enabled in a staging environment.

### 2026-06-15 - Session 13 Server OpenAI SDK Wiring

- Diagnosed Node/npm as absent rather than only missing from PATH.
- Installed official Node.js LTS `v24.16.0` through `winget`; npm `11.13.0` is
  available.
- Added `C:\Program Files\nodejs` to the user PATH and set PowerShell
  CurrentUser execution policy to `RemoteSigned`; system PATH and machine
  policy were not changed.
- Installed `openai@6.42.0` in `apps/api` only.
- Added the server-only SDK factory while preserving the injected fake-client
  adapter and all engine contracts.
- Added an opt-in one-call smoke module; it was not run because
  `RUN_OPENAI_SMOKE=1` was not explicitly enabled.
- Provider contract checks pass 18 cases with no network access.
- Engine evals remain 176 passed, 0 failed.
- API and engine typechecks/builds pass; the API Next.js production build
  passes.
- Root workspace typecheck/build now execute but fail only in untouched mobile
  setup due duplicate React types and missing `react-native-web`.
- `npm install` passes. It reports 12 moderate dependency vulnerabilities; no
  forced audit remediation was applied.
- Committed and pushed the server SDK wiring as `d8374e9`.
- Next step: run the opt-in real OpenAI smoke test intentionally, then add a
  protected API route without changing engine contracts.
- `docs/ai/handoff.md` is ignored and local-only, so it was updated locally but
  not staged or committed.

### 2026-06-15 - Session 12 OpenAI Adapter Boundary

- Safely prepared V2 env files using matching V1 local env values.
- Created the root env example and confirmed the existing API/mobile examples
  contain empty values only.
- Designed the OpenAI provider adapter boundary and added ADR-005.
- Added provider adapter implementation documentation.
- Added an API-layer `OpenAIProvider` boundary with 16 fake-client contract
  checks and no network calls.
- Current engine eval total remains 176 passed, 0 failed.
- Direct TypeScript 5.8.3 engine and provider typechecks/builds passed.
- npm remains unavailable on `PATH`; `npm install`, `npm run typecheck`, and
  `npm run build` were blocked by the command-not-found error.
- Committed and pushed the adapter boundary as `a0233be`.
- Next step: fix Node.js/npm PATH before real SDK wiring, or add an opt-in real
  OpenAI smoke test only after npm works.
- `docs/ai/handoff.md` is ignored and local-only, so it was updated locally but
  not staged or committed.

### 2026-06-15 - Session 11 Engine Contract Documentation

- Added engine contract documentation.
- Added ADR-004 for the completed Stage 0 through Stage 6 pipeline.
- Updated the repository README, capstone overview, and eval README.
- Current eval total: 176 passed, 0 failed.
- Direct TypeScript 5.8.3 source/eval typechecks and builds passed.
- npm remains unavailable on `PATH`; `npm install`, `npm run typecheck`, and
  `npm run build` were blocked by the command-not-found error.
- Committed and pushed the documentation as `e2a665f`.
- Next step: design the provider adapter boundary for OpenAI integration
  without changing engine contracts.
- `docs/ai/handoff.md` is ignored and local-only, so it was updated locally but
  not staged or committed.

### 2026-06-15 - Session 10 Pipeline Integration

- Wired `runPipeline` end to end with fake-provider integration fixtures.
- Added a 21-case pipeline eval suite.
- The eval runner now covers Stage 0 through Stage 6 plus pipeline integration.
- Current eval totals: 176 passed, 0 failed.
- Direct TypeScript 5.8.3 source/eval typechecks and builds passed.
- npm remains unavailable on `PATH`; `npm install`, `npm run typecheck`, and
  `npm run build` were blocked by the command-not-found error.
- Committed and pushed pipeline integration as `cc5dac2`.
- Next step: add engine contract documentation and an ADR for the completed
  pipeline before provider integration.
- `docs/ai/handoff.md` is ignored and local-only, so it was updated locally but
  not staged or committed.

### 2026-06-15 - Session 9 Stage 6 Reviewer Assembly

- Implemented eval-first Stage 6 deterministic reviewer assembly.
- Added Stage 6 fixtures and a 30-case eval suite.
- The eval runner now covers Stage 0 through Stage 6.
- Current eval totals: 155 passed, 0 failed.
- Direct TypeScript 5.8.3 source/eval typechecks and builds passed.
- npm remains unavailable on `PATH`; `npm install`, `npm run typecheck`, and
  `npm run build` were blocked by the command-not-found error.
- Committed and pushed Stage 6 as `d54b4cb`.
- Next step: wire `runPipeline` end to end using fake-provider fixtures, then
  add integration evals.
- `docs/ai/handoff.md` is ignored and local-only, so it was updated locally but
  not staged or committed.

### 2026-06-15 - Session 8 Stage 5 Bounded Retries

- Implemented eval-first Stage 5 bounded retry handling.
- Added Stage 5 fixtures and a 28-case fake-provider eval suite.
- The eval runner now covers Stage 0, Stage 1, Stage 2, Stage 3, Stage 4, and
  Stage 5.
- Current eval totals: 125 passed, 0 failed.
- Direct TypeScript 5.8.3 source/eval typechecks and builds passed.
- npm remains unavailable on `PATH`; `npm install`, `npm run typecheck`, and
  `npm run build` were blocked by the command-not-found error.
- Committed and pushed Stage 5 as `25aabc4`.
- Next step: implement Stage 6 deterministic reviewer assembly.
- `docs/ai/handoff.md` is ignored and local-only, so it was updated locally but
  not staged or committed.

### 2026-06-15 - Current Progress Refresh

- Refreshed the local-only handoff with detailed Stage 0 through Stage 3
  progress and verification results.
- Verified that the exact Stage 3 commit is `a108a26`.
- Confirmed that `origin/main` includes Stage 4 at `e0f79bf`, which is newer
  than the supplied Stage 3 project snapshot.
- Confirmed the current branch is `main` and locally ahead by the handoff
  template commit `612bfe0`.
- Attempted the engine build and aggregate eval commands; both remain blocked
  by npm being unavailable on `PATH`.
- Confirmed `git diff --check` passes in the current workspace.

### Session 7 - Stage 4 Coverage Verification

- Implemented eval-first Stage 4 deterministic coverage verification.
- Added fixtures and eval coverage for schema alignment, required content,
  source coverage, scoring, statuses, ordering, and validation.
- Updated the aggregate eval runner to include Stage 4.
- Next task recorded at the time: Stage 5 bounded retry handling with fake
  providers.

### Session 6 - Stage 3 Provider Requests

- Implemented eval-first Stage 3 schema contracts and provider-request
  construction.
- Added provider-agnostic schema descriptors for four section output kinds.
- Added fake-provider evals for requests, valid outputs, validation, source
  isolation, and contextual provider errors.
- Updated the aggregate eval runner to include Stage 3.

### Session 5 - Stage 2 Generation Planning

- Implemented eval-first deterministic generation planning.
- Added cases for schema selection, target contracts, source references,
  ordering, deterministic IDs, and validation.

### Session 4 - Stage 1 Outline Detection

- Implemented eval-first deterministic outline detection.
- Added coverage for grouping, ordering, tags, confidence scores,
  deterministic IDs, and empty-source validation.

### Session 3 - Evaluation Harness

- Built a dependency-free evaluation harness for deterministic engine stages.
- Added Stage 0 success and expected-error cases with readable JSON fixtures.

### Session 2 - Stage 0 Normalization

- Implemented normalization for extracted text and block-like input.
- Added deterministic text-to-block normalization and stable source/block IDs.
- Preserved the engine boundary from raw file, OCR, storage, LMS, UI, and
  provider dependencies.

### Session 1 - Domain Types

- Implemented stable domain types for normalized sources, outlines, generation
  plans, outputs, coverage, reviewer output, and retries.
- Defined a provider-agnostic request boundary without importing an SDK.
- Updated stage signatures to use typed argument objects.

### Session 0 - Initial Architecture

- Initialized V2 as a Turborepo monorepo with npm workspaces.
- Chose an engine-first architecture with no UI dependency.
- Chose token-based JWT authentication instead of cookies.
- Separated mobile, API, engine, database, Canvas, and shared code into
  workspaces.

Vercel project created:
- Project name: stay-focused-v2-api
- Root directory: apps/api
- Preset: Next.js
- RUN_OPENAI_SMOKE=0
- /api/health expected live
- /api/review expected 501 until real provider is enabled

Design reference:
- Local folder: C:\Users\Fely Max Dilinila\OneDrive\Documents\Projects\stay-focused-v2\design

### Session: Stage 6.1 - JWT auth on /api/review

- Files created: `apps/api/src/lib/auth.ts`
- Files changed: `apps/api/app/api/review/route.ts`
- What was implemented: Bearer token verification via Supabase `getUser`, runs
  before all other checks, with a generic 401 response on failure.
- Next step: Apply the same auth helper to remaining generation routes.
- Risks/blockers: The app has no `@/*` TypeScript path alias, so the route uses
  the existing relative import style. Missing Supabase server environment
  variables intentionally produce the same generic 401 response.

### Stage 6.1 — Supabase JWT verification — 2026-06-15
- Files created: `apps/api/src/lib/auth.ts`
- Files changed: `apps/api/app/api/review/route.ts`, `docs/ai/handoff.md`
- What was implemented: Added a Supabase-backed Bearer token verifier and enforced authentication before all other `/api/review` checks, returning a generic 401 on failure without cookies or exposed internals.
- Verified by: API TypeScript check (`tsc --noEmit`).
- Next recommended step: Apply the same auth helper to remaining protected API routes.
- Risks/blockers: `apps/api/package.json` has a separate unstaged change adding `@supabase/supabase-js`; it is intentionally excluded from this commit.
- Commit: not committed

### Stage 6.2 — @/* path alias — 2026-06-15
- Files created: none
- Files changed: apps/api/tsconfig.json, apps/api/app/api/review/route.ts
- What was implemented: @/* → ./src/* alias; auth import switched off relative path
- Verified by: tsc --noEmit pass
- Next recommended step: roll verifyBearerToken out to remaining generation routes
- Risks/blockers: npx is unavailable on PATH in this shell; verification passed with the repository's local TypeScript compiler via the bundled Node runtime. tsconfig.providers.json remains unchanged.
- Commit: 853b1901b93773b9af088c3add7d96c82fc42f2b

---

## CONVENTION — API route auth (established Stage 6.2)

Every new `/api/*` route that touches user data or runs generation MUST:
- call `verifyBearerToken(request)` from `@/lib/auth` as the first statement in the handler
- return `{ error: "Unauthorized" }` with status 401 when it returns null
- run the auth check before input parsing and before any env/feature flag checks
- never expose token contents, stack traces, or Supabase internals in responses
- use JWT Bearer only — no cookies (mobile cannot use cookies)

Public exceptions (MUST NOT receive the Bearer guard):
- `/api/health` — health check, must return unauthenticated 200
- any future webhook or cron route — these authenticate via their own secret/signature, not Bearer

Current route status:
- `/api/review` — guarded ✅
- `/api/health` — intentionally public ✅

---

### 2026-06-19 Stage 5a grounding fix — Phase 1 (deterministic floor)
- Changed: `packages/engine/src/stage3-generate.ts`, `packages/engine/src/stage4-verify.ts`, `packages/engine/src/stage5-retry.ts`, `packages/engine/src/stage5a-grounding.ts`, `packages/engine/src/types.ts`, `packages/engine/evals/stage5a-grounding.eval.ts`, `packages/engine/evals/pipeline.eval.ts`, `packages/engine/evals/stage6-assemble.eval.ts`, `packages/engine/scripts/live-run.ts`, `docs/ai/handoff.md`
- Root cause: token-presence fabrication check flagged glue words (false-positive storm); real omissions/drift were buried. The comparison span is clean UTF-8; corruption was limited to PowerShell live-log capture.
- Phase 1 fix: extraction-first sourceCore; stopword-aware content-token check; LIST_COVERAGE_THRESHOLD omission gate; no encoding normalization needed. NO LLM judge.
- Verification: typecheck PASS; build PASS; eval PASS (202/202); eval:stage5a PASS (12/12); phase1FabricationFails=unavailable (OPENAI_API_KEY unset)
- Next: Phase 2 — entailment judge for the N flagged claims (sized from a future live run); Phase 3 — specific-reason retry + judge cap.
- Risks: Phase 1 flags faithful synonym paraphrase as fabrication by design; mitigated by extraction-first generator until Phase 2.

### 2026-06-19 Stage 5a grounding fix — Phase 1.1 (list adherence + collect-and-continue)
- Changed: `packages/engine/src/stage3-generate.ts`, `packages/engine/src/generate.ts`, `packages/engine/src/stage5-retry.ts`, `packages/engine/scripts/live-run.ts`, `packages/engine/evals/stage3-generate.eval.ts`, `packages/engine/evals/stage5a-grounding.eval.ts`, `packages/engine/evals/pipeline.eval.ts`, `packages/engine/evals/stage5-retry.eval.ts`, `packages/engine/evals/fixtures/pipeline-retry.json`, `packages/engine/evals/fixtures/stage5-basic.json`, `packages/engine/evals/fixtures/stage5-policy.json`, `docs/ai/live-output-it-security-after-grounding.txt`, `docs/ai/handoff.md`
- Root cause: extraction-first prompt failed on list-only sections - model elaborated instead of extracting, causing fabrication + 0/N omission, and a meta-commentary explanation tripped the instruction-leakage guard and aborted the run.
- Fix: hard list-adherence rule (keyPoints = source items verbatim; descriptions to enrichment); anti-meta explanation rule; collect-and-continue on validation failures with infra-error boundary preserved.
- Verification: typecheck PASS; build PASS; eval PASS (208/208); eval:stage5a PASS (14/14). LIVE: complete run = yes; phase1FabricationFails=45; per-section grounding = Introduction 1, What is IT Security 1, Goal of IT Security 1, Domains of IT Security 0.4, What is Cybersecurity? 1, What is Cybersecurity all about? 0.25, Importance of cybersecurity 0.88, Challenges of Cybersecurity 0.7, Impact of a Security Breach 0.4, Types of Attackers 0.79, Definition of Terms 0.25, Types of Cybersecurity Threats 0, Types of Malware 0, Symptoms of Malware 0, Methods of Infiltration 0, Methods to Deny Service 0, Blended Attacks 0, Impact Reduction 0.25.
- Next: Phase 2 (entailment judge) - NOW UNBLOCKED because N=45 is known; size judge cost against N. Re-confirm list omissions resolved before adding judge (judge can't fix non-extraction).
- Risks: PS5 stderr trap on live runs - always use `$ErrorActionPreference='Continue'`. Consider a committed run script so the working invocation isn't re-derived.

### 2026-06-19 Stage 5a grounding fix — Phase 1.2
- Changed: `packages/engine/src/source-blocks.ts`, `packages/engine/src/source-items.ts`, `packages/engine/src/index.ts`, `packages/engine/src/schemas.ts`, `packages/engine/src/stage3-generate.ts`, `packages/engine/src/stage4-verify.ts`, `packages/engine/src/stage5-retry.ts`, `packages/engine/src/stage5a-grounding.ts`, `packages/engine/evals/fixtures/stage3-request.json`, `packages/engine/evals/fixtures/stage4-status.json`, `packages/engine/evals/pipeline.eval.ts`, `packages/engine/evals/stage3-generate.eval.ts`, `packages/engine/evals/stage5a-grounding.eval.ts`, `docs/ai/live-output-it-security-after-grounding.txt`, `docs/ai/handoff.md`
- Root cause: Stage 1 preserved source items, but Stage 3 still summarized/replaced list-heavy sections. Non-empty explanation schema forced filler into grounded core. Real-topic examples and denylisted prompt vocabulary contaminated output.
- Fix: cleaned repeated-heading suffixes from detected items; allowed empty sourceCore.explanation; passed/enforced cleaned detected items in Stage 3; aligned Stage 3 span offsets with Stage 1 duplicate-block handling; replaced real-topic examples with fake-domain examples; removed prompt/denylist collisions.
- Verification: typecheck PASS; build PASS; eval PASS (213/213); eval:stage5a PASS (16/16); live OpenAI strict schema accepted the required string with empty string allowed.
- Live result: complete run=yes; phase1FabricationFails=0; formerly zero-list sections=Types of Cybersecurity Threats 7/7, Types of Malware 10/10, Symptoms of Malware 11/11, Methods of Infiltration 19/19, Methods to Deny Service 12/12, Blended Attacks 5/5, Impact Reduction 7/7; Domains of IT Security remained 11/11.
- Next: Phase 2 only after this N is known and list extraction is clean. Phase 2 should add entailment judging only for remaining lexical false positives, not for omissions or prompt contamination. This IT Security fixture now has N=0, so validate broader fixtures before adding judge cost.
- Risks: OpenAI strict schema compatibility for empty explanation is live-verified; UI/assembly has no direct explanation renderer and treats the required empty string safely while keyPoints/enrichment remain available.

### 2026-06-21 Stage 5a grounding fix — Phase 1.3
- Changed: added a shared default-visible text extractor; Stage 5 now validates title, sourceCore.explanation, and every sourceCore.keyPoint; Stage 3 normalizes title to the planned heading and enrichment to null; Stage 6 strips enrichment again during assembly.
- Policy: IT Security sourceCore grounding remains closed. Default reviewer output is source-faithful, and outside knowledge is not part of the default assembled reviewer output.
- Regression coverage: unsupported malware definitions, attack consequences, and invented example scenarios in enrichment are excluded; unsupported visible titles fail with field-specific diagnostics; existing list-adherence regressions remain passing.
- Verification: engine typecheck PASS; build PASS; eval PASS (219/219); Stage 5a PASS (16/16); student-visible faithfulness PASS (6/6).
- Live validation: not rerun in this phase; no live OpenAI calls were made.

### 2026-06-21 Phase 1.4 live visible-grounding validation
- Live output: `docs/ai/live-output-it-security-after-visible-grounding.txt`
- Audit: `docs/ai/live-output-it-security-after-visible-grounding-audit.md`
- Result: coverage 18/18; grounding 1.00; grounding issues 0; phase-1 fabrication failures 0; leakage issues 0.
- Default-visible verdict: all 18 assembled cards have `enrichment: null`; no unsupported visible outside knowledge was found.
- Readability: 17 list-heavy sections use empty explanations with complete source key points; no section is empty.
- Verification: engine typecheck PASS; build PASS; eval PASS (219/219).

### 2026-06-22 Phase 1.4 live visible-grounding revalidation
- Live output: `docs/ai/live-output-it-security-after-visible-grounding-20260622-053615.txt`
- Result: coverage 18/18; grounding 1.00; grounding issues 0; phase-1 fabrication failures 0; leakage issues 0.
- Default-visible verdict: all 18 assembled cards have `enrichment: null`; no unsupported visible outside knowledge was found.
- Readability: the source-backed `Blended Attacks` title remains restored; 17 list-heavy sections use empty explanations with 3-19 source key points, and no section is empty.
- Verification: engine typecheck PASS; build PASS; eval PASS (219/219).

### 2026-06-23 05:25 +08:00 Phase 1.5 cross-fixture live visible-grounding validation
- Fixtures: Digital Components (`live-digital-components`) and Arnis M1 (`live-arnis-m1`).
- Live outputs: `docs/ai/live-output-digital-components-after-visible-grounding-20260623-052054.txt` and `docs/ai/live-output-arnis-after-visible-grounding-20260623-052149.txt`.
- Digital Components automated result: coverage 18/18, score 1.00; grounding 1.00; grounding issues 0; phase-1 fabrication failures 0; leakage issues 0; all 18 enrichment values null.
- Digital Components manual verdict: FAIL. The source phrase `3.3V on 3.3 board` became separate default-visible key points `3V on` and `3 board)`, changing the technical meaning despite the passing grounding report. Repeated duplicate-heading sections are also weak as a study outline.
- Arnis M1 result: coverage 8/8, score 1.00; grounding 1.00; grounding issues 0; phase-1 fabrication failures 0; leakage issues 0; all 8 enrichment values null; no unsupported default-visible outside knowledge found.
- Arnis M1 readability: no section is empty; seven explanations are empty and the heading card is title-only, while source key points preserve the history, techniques, equipment, rules, and Filipino martial-arts context. The evolvement section is dense but source-faithful.
- Verification: engine typecheck PASS; build PASS; eval PASS (219/219).
- Remaining issue: add a regression for decimal-bearing source text so sentence/item extraction does not split `3.3V` into misleading standalone visible fragments. No engine, prompt, schema, mobile, auth, or provider changes were made in this validation task.

### 2026-06-23 Phase 1.6 generalized source-token fidelity
- Digital Components live validation exposed a deterministic list-marker bug: decimal fragments inside `3.3V on 3.3 board` were interpreted as numbered-item boundaries and then copied into visible key points by the Stage 3 source-item guard.
- Fixed source-item extraction so explicit bullet lists do not reinterpret numeric punctuation inside their items, ordered markers require following whitespace, and leading token punctuation such as `.env.local` is preserved.
- Added shared source-token fidelity validation for numeric identity, measurements, math, chemistry, laws/dates, networking/software tokens, code, ranges/ratios/dimensions, abbreviations, table rows, numbered headings, and OCR-looking source text.
- Stage 5 now rejects punctuation-stripped, symbol-stripped, or number-mutated visible variants with field-specific grounding failures instead of accepting content-word substring matches.
- The fix is deterministic extraction and grounding logic across subject domains. Stage 3 prompts, OpenAI schemas, provider behavior, mobile, auth, API, database, and shared packages were unchanged.
- Added 23 cross-domain fidelity evals, including the Digital Components live fixture regression.
- Verification: engine typecheck PASS; build PASS; targeted Stage 0/1/3/5a/pipeline/fidelity suites PASS; aggregate eval PASS (242/242). No live OpenAI calls were made.

### 2026-06-23 06:55 +08:00 Phase 1.7 Digital Components live token-fidelity validation
- Fixture: Digital Components (`digital-components`; source ID `live-digital-components`).
- Live output: `docs/ai/live-output-digital-components-after-token-fidelity-20260623-065246.txt`.
- Result: coverage 18/18, score 1.00; grounding 1.00; grounding issues 0; phase-1 fabrication failures 0; leakage issues 0.
- Token-fidelity verdict: PASS. The default-visible key point preserves `3.3V on 3.3 board` intact; no standalone `3V on`, `3 board`, or `3 board)` key point is present.
- Default-visible verdict: all 18 enrichment values are null; no unsupported visible text was found.
- Readability: all 18 sections are non-empty and the 76 source-backed key points remain useful as a compact outline. Explanations remain limited: 9 are empty and 9 are heading-like placeholders.
- Verification: engine typecheck PASS; build PASS; aggregate eval PASS (242/242); source-token fidelity eval PASS (23/23).
- Remaining issue: explanation quality and repeated generic `Digital Software Coding` sections remain weak, but no Phase 1.7 coverage, grounding, leakage, enrichment, or token-fidelity failure remains.

### 2026-06-23 08:18 +08:00 Phase 1.8 final three-fixture live validation sweep
- Fixtures: IT Security (`it-security`; source ID `live-it-security`), Digital Components (`digital-components`; source ID `live-digital-components`), and Arnis M1 (`arnis-m1`; source ID `live-arnis-m1`).
- Live outputs: `docs/ai/live-output-it-security-final-sweep-20260623-081451.txt`, `docs/ai/live-output-digital-components-final-sweep-20260623-081534.txt`, and `docs/ai/live-output-arnis-final-sweep-20260623-081615.txt`.
- IT Security: coverage 18/18, score 1.00; grounding 1.00 with 0 issues and 0 phase-1 fabrication failures; leakage issues 0; all 18 enrichment values null. Risky list sections remain source-faithful, the title is `Blended Attacks`, and no unsupported malware definitions, attack consequences, DoS flood examples, or fabricated blended-attack scenario appeared.
- Digital Components: coverage 18/18, score 1.00; grounding 1.00 with 0 issues and 0 phase-1 fabrication failures; leakage issues 0; all 18 enrichment values null. `3.3V on 3.3 board`, `pinMode`, `digitalWrite`, `digitalRead`, HIGH/LOW, INPUT/OUTPUT, ADC/PWM, hardware component names, and the reference URL remain intact; no standalone corrupted decimal fragments or electronics explanation creep appeared.
- Arnis M1: coverage 8/8, score 1.00; grounding 1.00 with 0 issues and 0 phase-1 fabrication failures; leakage issues 0; all 8 enrichment values null. `R.A. 9850`, `December 11, 2009`, historical/evolvement content, `3 MAIN GROUPS`, courtesy/salutation, strike names, and padded-stick sport content remain intact; no unsupported origin, safety, or martial-arts additions appeared.
- Default-visible/token-fidelity verdict: PASS for all three fixtures. Every visible sourceCore string was found in its fixture source, no section was empty, and no unsupported outside knowledge was found.
- Readability: the reviewers remain usable as compact source-faithful outlines. IT Security has 17 empty explanations; Digital Components has 9 empty and 9 heading-like explanations; Arnis has 7 empty explanations and one heading-like explanation. Digital Components retains generic repeated coding sections, and the source-derived Arnis evolvement item remains dense.
- Verification: engine typecheck PASS; build PASS; aggregate eval PASS (242/242); source-token fidelity eval PASS (23/23).
- Remaining issues: presentation quality only; no Phase 1.8 coverage, grounding, leakage, enrichment, unsupported-text, or token-fidelity failure remains.

### 2026-06-24 01:57 +08:00 Phase 1.4 live OpenAI validation
- Fixture: IT Security (`it-security`; source ID `live-it-security`).
- Live output: `docs/ai/live-output-phase14.txt`; JSON artifact: `docs/ai/live-output-phase14.json`.
- Coverage result: PASS, 18/18 sections covered, score 1.00, 0 weak sections, 0 failed sections.
- Grounding result: PASS, score 1.00, grounding issues 0, phase-1 fabrication failures 0.
- Leakage result: PASS, leakage issues 0, failed leakage sections 0.
- Enrichment verdict: PASS. All 18 assembled section items have `enrichment: null`; `enrichment` appears only as an internal JSON field key, not as visible content.
- Visible-content verdict: PASS. No unsupported visible outside knowledge found; `Blended Attacks` is unchanged from the previous IT Security final sweep and remains source-faithful. Explanations remain presentation-weak after enrichment removal: 17 of 18 are empty, but source-backed key points are present.
- Verification: engine typecheck PASS; build PASS; aggregate eval PASS (242/242). Mobile typecheck was intentionally not run.

### 2026-06-25 Expo Go reviewer generation stabilization
- Expo Go end-to-end reviewer generation passed against API URL `http://192.168.68.102:3000`.
- Organized reviewer fixture returned HTTP 200 through the Expo/API manual flow.
- Flattened Arduino OCR-style fixture returned HTTP 200 after around 32 seconds (`POST /api/reviewer/generate 200 in 32255ms`).
- Coverage, grounding, and leakage checks passed; assembled reviewer output kept `enrichment: null`.
- Remaining issue: OCR-style input quality and layout reconstruction are still rough and deferred to the OCR layout phase.
- Next recommended task: add OCR layout reconstruction before Stage 1 outline detection so flattened slide streams recover headings, bullets, and section boundaries before generation.

### 2026-07-01 Expo Web fast-testing workflow
- Added Expo Web as the fast laptop-browser testing surface for the existing mobile reviewer UI.
- Keep the testing surfaces ordered this way:
  1. Engine/API testing: use engine evals, live scripts, and API route checks.
  2. Fast UI testing: use Expo Web in the laptop browser.
  3. Final mobile validation: use Expo Go on iPhone only for smoke testing.
  4. Future V1 replacement: build a real browser app later using Next.js, after mobile/reviewer flow is stable.
- Local commands: `npm run dev --workspace apps/api` and `npm run web --workspace apps/mobile`.
- Use `EXPO_PUBLIC_API_BASE_URL=http://localhost:3000` for Expo Web and `EXPO_PUBLIC_API_BASE_URL=http://<LAN_IP>:3000` for iPhone Expo Go.

### 2026-07-01 Expo Web reviewer network_error troubleshooting
- Root cause found: Expo Web sends a browser preflight for `POST /api/reviewer/generate` because the request includes `Authorization` and JSON. The API route previously returned `204` for OPTIONS without local-web CORS headers, so browser fetch could fail before the request reached the POST handler and surface as `network_error`.
- Fix: `apps/api/app/api/reviewer/generate/route.ts` now exports an explicit OPTIONS handler and adds CORS headers to reviewer POST JSON responses for local browser origins (`localhost`, `127.0.0.1`, and `::1`). Non-local origins do not receive `Access-Control-Allow-Origin`.
- API port used: `http://localhost:3000`.
- Expo Web URL used: `http://localhost:8081`.
- CLI `/api/health` result: PASS, returned `{ "status": "ok", "version": "2.0.0" }`.
- Browser-shaped OPTIONS preflight result: PASS, returned `204` with `Access-Control-Allow-Origin: http://localhost:8081`, `Access-Control-Allow-Methods: POST, OPTIONS`, and `Access-Control-Allow-Headers: authorization, content-type`.
- Same-browser `/api/health`: opened in the user's normal browser for manual confirmation; Codex Chrome control was unavailable and only the in-app browser backend was exposed, so this was not observed by the agent.
- Signed-in reviewer generation: pending manual confirmation because credentials must be entered by the human and were not requested, logged, stored, or hardcoded.
- Reviewer preview/logout: pending manual confirmation with the same constraint.
- Verification: reviewer route test PASS (17/17); mobile typecheck PASS; API typecheck PASS; engine build PASS; engine eval PASS (264/264); `git diff --check` PASS with line-ending warnings only.

### 2026-07-23 generalized multi-page PDF extraction
- Split the Google synchronous provider boundary (5 pages per request) from the user-document boundary (40 pages, configurable downward), while retaining the 10 MiB upload limit.
- Added subject-neutral per-page inspection: usable embedded text stays local through PDF.js, confirmed blank pages remain explicit, and only scanned/unreadable pages are copied with `pdf-lib` into five-page OCR chunks.
- Added concurrency 2, local-to-original page remapping, deterministic merge order, chunk/page diagnostics, a 50-second document deadline, and a retryable timeout response. Missing, duplicate, failed, or malformed pages remain ineligible for reviewer generation.
- Mobile now reports the actual configured document limit, retains affected-page details for incomplete extraction, and no longer describes five pages as the product limit.
- Synthetic coverage includes 1/5/6/12-page scans, native, mixed, blank, failed/incomplete chunks, limit validation, provider-boundary enforcement, concurrency, and cross-domain reviewer checks for biology, history, and mathematics.
- Black-box fixture result: the 32-page example extracted completely in mixed mode (31 native pages, 1 OCR page, 1 OCR chunk, 6,622 characters); live reviewer generation produced 13 sections with coverage, grounding, and leakage all passing at 1.00/zero issues. Physical iPhone interaction was not performed in this run.

### 2026-07-23 durable processing-job foundation
- Added Supabase-backed extraction and reviewer jobs with strict states/stages, ownership RLS, private source snapshots, transactional result publication, idempotency fingerprints, cancellation, terminal events, leases, heartbeat, bounded retry/backoff, and stale-worker recovery.
- Added authenticated `/api/jobs` creation/status/result/cancel/retry routes. HTTP 202 is returned only after durable staging and persistence; no route launches an unawaited background promise.
- Added `npm run worker --workspace @stay-focused/api` plus bounded claim/heartbeat/recovery processing through the existing generalized OCR and Stage 0-6 reviewer engines.
- Mobile now persists safe active-job references, stops polling while backgrounded, reconciles on foreground/restart/sign-in, and treats handled timeout/network events without `console.error`. Both normal and Canvas reviewer flows use job creation rather than the 120-second request.
- Production logic remains subject-neutral; normalization removes only strongly evidenced repeated page-edge templates and retains audit metrics. No fixture-specific vocabulary or headings were added.
- Production status is PARTIAL until a continuously available worker is deployed. Expo Go can test switch-away/reconnect, but native background upload, push delivery, and terminated-app integration require an Expo/EAS development build.
- Architecture and limitations: `docs/architecture/ADR-018-durable-processing-jobs.md`.

### 2026-07-23 durable processing R2 reusable assets and multi-job operation
- Added owner-scoped `document_assets`, `extraction_results`, immutable `source_versions`, generic `generated_artifacts`, immutable `generated_artifact_versions`, cleanup queue/policy, exact reuse fingerprints, source-edit conflict detection, fair claims, quotas, rate-limit backoff, and transactional artifact publication.
- Applied eight additive development Supabase migrations from `20260723084329_reusable_processing_assets` through `20260723091627_processing_lifecycle_batching`; existing durable rows were backfilled, quota admission is serialized, cleanup is batch-bounded, and rolled-back fixtures verified account deletion/Storage queueing plus artifact soft-delete without source deletion.
- Added bounded all-job cursor retrieval, canonical source/result provenance routes, idle worker heartbeats, dry-run-first lifecycle/Storage cleanup tooling, and a privacy-safe aggregate operations report.
- Mobile now has a central multi-job Processing screen, independent actions, bounded account-scoped job history, idempotent offline reviewer outbox/drafts with sign-in/foreground/interval reconciliation, and a bounded native SecureStore artifact cache with stale/unsynced protection. Offline document-upload staging, immediate OS reachability callbacks, push delivery, and real two-device edit resolution remain pending.
- Production remains PARTIAL until the separate worker is deployed. Railway is the recommended initial target; configuration and rollout/rollback guidance are in `docs/architecture/ADR-013-processing-worker-deployment.md`.
- Full architecture, reuse/privacy boundaries, fairness, retention/deletion, offline/cache behavior, and known limitations: `docs/architecture/ADR-012-reusable-processing-assets.md`.

### 2026-07-23 R3 worker deployment acceptance audit
- Starting state: `main` at `fe8b61a`, 7 commits ahead of `origin/main`, with only the known unrelated dirty files (`apps/api/next-env.d.ts`, `apps/mobile/expo-env.d.ts`, `.vscode/`, `apps/mobile/.gitignore`).
- Migration consistency: linked Supabase project `stay-focused-v2` has all processing migrations through `20260723091627_processing_lifecycle_batching`; the matching migration files are tracked in local `HEAD`, and `origin/main` still lacks them.
- Baseline verification: shared/db/ocr/api/mobile/engine typechecks and tests passed; API and engine builds passed; engine eval passed (290/290); `worker:once`, dry-run cleanup, ops report, `git diff --check`, `git diff --stat`, and `git status --short` completed without functional regressions.
- Worker deployment status: Railway remains the recommended target and `railway.worker.json` is suitable for one continuous worker with `npm run worker --workspace @stay-focused/api` and `ALWAYS` restart, but Railway CLI/project credentials were unavailable, so no hosted worker was deployed.
- Worker heartbeat result: local `worker:once` started and stopped, and the ops report saw stopped heartbeat rows only; no hosted running heartbeat was observed.
- Cleanup deployment status: local dry-run reported zero due storage objects and zero eligible cleanup rows. Hosted dry-run and scheduled cleanup were not configured because hosting access was unavailable.
- Physical iPhone results: NOT RUN. No deployed or continuously reachable hosted worker was available, so background-switch, reload, temporary network loss, cancellation, multiple-job, offline-cache, and account-switch acceptance remain unproven on device.
- Security audit result: linked database RLS is enabled on processing/asset tables; owner-select policies use `auth.uid()` where exposed; worker claim/progress/finalization/recovery/cleanup RPCs are service-role only; source/artifact versions are immutable by trigger; idempotency and reuse are owner-scoped; safe logging emits job IDs, statuses, counts, and metrics rather than source text, reviewer text, prompts, tokens, local paths, or credentials.
- npm audit triage: `npm audit` still reports 21 findings (14 moderate, 6 high, 1 critical). The critical `tar` issue is transitive through Expo CLI tooling, not the API worker runtime. Production runtime follow-up is still recommended for `next` and `@google-cloud/vision` transitive packages (`protobufjs`, `brace-expansion`, `sharp`) before production traffic.
- Remaining blockers: hosted worker deployment credentials, hosted queue-processing acceptance, physical iPhone acceptance, cleanup scheduling, and explicit approval to push the branch with migrations to GitHub.
- Next task: deploy exactly one Railway worker from the current branch, configure server-only secrets, verify hosted heartbeat/queue/restart behavior with synthetic jobs, then run the physical iPhone background-switch suite before pushing `main`.

### 2026-07-23 R3A push-safety and dependency audit remediation
- Starting state: `main` at `89655dc`, 8 commits ahead of `origin/main`, with the same unrelated dirty files preserved (`apps/api/next-env.d.ts`, `apps/mobile/expo-env.d.ts`, `.vscode/`, `apps/mobile/.gitignore`).
- Push readiness: READY_TO_PUSH. The linked Supabase development project has migrations through `20260723091627_processing_lifecycle_batching`; every applied processing migration exists locally and is committed in `HEAD`, while `origin/main` still lacks the processing migration commits until push.
- Dependency audit before remediation: 21 findings (14 moderate, 6 high, 1 critical).
- Safe remediation applied: `next` moved within the current major to `15.5.21`; lockfile patched `protobufjs` to `7.6.5`, `brace-expansion` to fixed 1.x/2.x/5.x releases, `tar` to `7.5.21`, `undici` to `6.27.0`, `shell-quote` to `1.10.0`, and `js-yaml` to fixed 3.x/4.x releases where npm could resolve safely.
- Dependency audit after remediation: 15 findings (13 moderate, 2 high, 0 critical). The critical `tar` finding and OCR/provider `protobufjs` finding are resolved.
- Deferred findings: `next` still reports high through bundled `postcss@8.4.31` and optional `sharp@0.34.5`; npm's listed fix path is a breaking downgrade to `next@9.3.3`, and the latest current Next major still carries the flagged transitive dependency shape. Expo, `expo-constants`, `expo-linking`, `expo-router`, `@expo/*`, `xcode`, and `uuid` remain in the Expo 57 major-upgrade chain and were intentionally not forced.
- Expo major upgrade was avoided as requested.
- Verification result: shared/db/ocr/api/mobile/engine typechecks and tests passed; API and engine builds passed; engine eval passed (290/290); `worker:once`, cleanup dry-run, ops report, and `git diff --check` passed after dependency changes. `npm audit` remains nonzero only for the deferred findings above.
- Next task: evaluate a safe Next remediation path for the `postcss`/`sharp` advisories and plan the Expo 57 upgrade separately, then push `main` after explicit approval.

### 2026-07-27 durable processing completion repair and LAN portability
- Root cause of the pictured 32-page failures was the result-publication transaction, not OCR or the changed Wi-Fi: hardened database functions called `digest(...)` without the Supabase `extensions` schema and failed with SQLSTATE `42883` after all pages were processed.
- Applied migration `20260726214339_harden_processing_digest_and_retry_policy`, qualified the three affected digest calls, preserved service-only execution, and separated manual retry eligibility from same-job automatic retry. Deterministic database contract failures now stop without repeating costly OCR.
- Multipart jobs now send a validated display name separately, preserving filenames such as `Notes + Appendix.pdf` without transport encoding artifacts.
- Mobile local API resolution now supports `EXPO_PUBLIC_API_BASE_URL=auto`, derives the current Expo LAN host, keeps the API port configurable, and rejects the incorrect assumption that an Expo tunnel also exposes the API.
- Linked development Supabase validation passed: neutral 3-page extraction, idempotent duplicate creation, disconnect/reconciliation, source revision, reviewer generation, retry of the prior 32-page job (32/32, zero failed/blank pages), and explicit cancellation with no published result.
- Full OCR/API/mobile/engine checks passed; API, worker, and Expo were left running locally. Production remains PARTIAL because neither Vercel nor Railway was authenticated, so no hosted continuous worker or physical-iPhone acceptance run was completed.

### 2026-07-27 hosted uploads and completion-notification foundation
- Added private intent-authorized TUS uploads and a separate HTTP 202 acceptance boundary, so supported 10 MiB sources no longer pass through Vercel's smaller function request-body limit. Storage accepts only the signed-in user's unexpired intent path.
- Added service-controlled device registrations and a leased per-device notification outbox sourced from processing terminal events. The worker sends generic Expo messages, checks receipts, retries transport failures, and invalidates unregistered devices without logging private source content.
- Mobile now supports explicit notification permission, device registration, a server-verified test notification, notification-tap navigation, and an EAS iOS development-build configuration. Local `EXPO_PUBLIC_API_BASE_URL=auto` remains the Wi-Fi-portable development default; hosted builds require an HTTPS API origin.
- Applied linked development migration `20260726230833_hosted_processing_uploads_and_notifications`; service access, private bucket availability, claim RPC access, and anonymous denial passed. Existing database-advisor warnings are unrelated legacy functions/policies; no new-table warning was reported.
- Real push receipt and app-switch acceptance still require an EAS project/Apple credentials and a continuously deployed Railway worker. Architecture and limitations: `docs/architecture/ADR-014-hosted-processing-and-completion-notifications.md`.

## 2026-07-27 — Expo Go hosted stability prototype preparation

- Added a Railway production API service boundary alongside the existing
  durable worker, SDK-matched Expo Updates support, explicit EAS environments,
  and an Expo Go capability gate that hides unsupported push controls.
- Local `EXPO_PUBLIC_API_BASE_URL=auto` remains unchanged. Hosted Expo Go
  publication still requires Railway and Expo account authentication, a stable
  Railway HTTPS domain, EAS preview public variables, and a 24-hour soak before
  device acceptance.

## 2026-07-27 — Vercel Workflow no-spend prototype

- Replaced the prototype's continuously hosted Railway requirement with
  Vercel Workflow 4.3.1 while preserving Supabase as the job/source/result
  authority and retaining Railway/local polling-worker support.
- Added workflow run metadata, service-only durable checkpoints, atomic
  workflow-by-ID claims, backend-separated polling claims/recovery, replay-safe
  OCR chunks and reviewer sections, cancellation checks, and transactional
  result finalization.
- Added a truthful Expo Go foreground completion notice after a persisted
  extraction/reviewer result is reconciled. Local API resolution remains
  `auto`; hosted testing uses the new Vercel HTTPS origin.
- Applied and verified `vercel_workflow_processing` and
  `vercel_workflow_dispatch_recovery` on the linked `stay-focused-v2`
  Supabase project. Workflow RPCs are service-only and checkpoints deny direct
  anonymous/authenticated reads.
- The existing Vercel project `stay-focused` is V1 and was not changed. V2 must
  use a separate `stay-focused-v2-prototype` project.
- Local API/mobile/OCR/engine suites pass. Hosted Workflow replay, private live
  fixture, and physical iPhone switch-away validation remain pending until the
  new Vercel project is deployed.

## 2026-07-28 — resilience closeout and durable Canvas synchronization

- Physical iPhone Expo Go switch-away passed for PDF extraction and reviewer
  generation. Agent-led hosted V2 validation passed runtime recreation,
  disconnect-after-acceptance with later reconciliation, and explicit
  cancellation with no result publication. Keep a physical reload,
  network-loss, and cancellation spot-check on the next mobile release list.
- Added owner-scoped `course_content` and `course_grades` jobs with strict
  state/stage constraints, 30-day idempotency scope, workflow run metadata,
  bounded attempts, service-only mutation RPCs, explicit cancellation, and
  five-minute stale underlying-sync recovery.
- Canvas content and grade POST routes now return HTTP 202 only after job
  persistence and Vercel Workflow acceptance. Status, cancel, and retry routes
  enforce the authenticated owner and never return raw Canvas or grade content.
- Expo Go stores the intent before submission, reuses the same idempotency key
  after a lost response or runtime restart, reconciles accepted jobs on launch
  and foreground return, and exposes truthful in-app completion, Cancel, and
  Retry states. Background timers are not required.
- Applied `add_durable_canvas_sync_jobs` to the `stay-focused-v2` Supabase
  project only. Authenticated users can select through RLS but cannot update
  worker state; no new `canvas_sync_jobs` security advisory was reported.
- The existing V1 Vercel project remains untouched. Remaining acceptance is one
  hosted content job and one hosted grade job using a connected, non-sensitive
  Canvas test course.
- V2 production deployment and `/api/health` passed. The first hosted Canvas
  smoke found and fixed a missing Production `CANVAS_TOKEN_ENCRYPTION_KEY`
  without exposing or committing it. The rerun reached Canvas and then stopped
  safely because both the stored and local validation personal-access tokens
  are expired/revoked (`invalid_canvas_token`). A fresh Canvas test token is
  required for the remaining live content/grade smoke.

## 2026-07-28 — hosted Canvas durable-job acceptance passed

- The user refreshed the per-user Canvas personal access token through the
  mobile connection screen. No token, Canvas source content, grade content, or
  user identity was printed or committed.
- Hosted content job `24c20f16-2ad1-4fa2-8a14-a90eb226bd47` succeeded on its
  first attempt in 46.6 seconds. Replaying the same idempotency key returned
  that same job.
- Hosted grade job `55c36bf3-a892-4bf3-a8fb-182f81297beb` succeeded on its
  first attempt in 20.3 seconds.
- Cancellation job `00ec52c5-1df7-4e5a-86ff-39ded9a69984` reached `cancelled`
  with `cancellation_requested` recorded and no result published.
- Validation temporarily selected one likely-current course because the
  original selection was empty, then restored the original empty selection.
- Supabase confirms both successful result summaries were persisted before
  terminal completion and all three jobs have Workflow run references. Vercel
  runtime logs contained no error/fatal entries during the validation window.
- Phase 5F.1 is complete and hosted validated. Keep the physical Expo Go
  reload/network-loss/cancellation spot-check as a next-release reminder; plan
  Phase 5F.2 next around incremental checkpoints and user-visible sync health.

## 2026-07-28 — Phase 5F.2 incremental, resumable Canvas synchronization

- Added service-owned Canvas page/item units, private staging, scope health,
  item evidence, recoverable 90-second leases, atomic connection-level
  concurrency limits, same-job retry, and bounded stale-checkpoint cleanup.
- Refactored Vercel Workflow to one Canvas provider request per durable step.
  Rate-limit waits use Workflow scheduling, not function sleep; content jobs
  allow three active connection units and grade jobs allow two.
- Preserved last-known-good scope data. Core content is atomic; announcements,
  files, and grades advance independently. Incomplete traversals never infer
  deletion.
- Added owner-checked aggregate sync health APIs and Expo overall/scope health,
  nullable expanding totals, truthful partial outcomes, Sync again, and Cancel.
  Units, cursors, source bodies, provider messages, and private identifiers are
  never returned to mobile.
- Applied `canvas_incremental_resumable_sync` only to the V2 Supabase project.
  Schema/grant verification passed. Canvas/API/mobile/OCR tests, Workflow
  runtime tests, root typecheck/build, and reviewer eval 290/290 pass locally.
- The existing V1 Vercel project remains untouched. Deployment is restricted
  to `stay-focused-v2-prototype`.
- Keep the later physical Expo Go reload, temporary-network-loss, and explicit
  cancellation spot-check on the next mobile release checklist.
- Hosted V2 validation found and fixed a job-creation authorization regression:
  server routes use a service-role Supabase client after bearer verification,
  while the first guard read a legacy per-claim GUC. The forward repair now
  uses `auth.role()` for create, cancel, and retry and is applied only to V2.
- Post-repair content job `18d55d36-0026-4c90-89dc-52e9287abfe5` succeeded
  with outcome `partial`; one non-retryable page-list endpoint was unavailable,
  announcements remained healthy, last-known-good content/files were retained,
  and zero deletions were inferred. Grade job
  `eb6d966c-6d92-4d9a-a4b6-b48f8ab9d7f5` succeeded `unchanged`.
- Idempotent replay returned the same content job. Cancellation job
  `79ce6ab7-6346-4bf4-bc8e-de9c28cd191e` ended `cancelled`, recorded explicit
  cancellation, and published no result. All three terminal jobs had zero
  staging rows, zero running units, and zero private checkpoints retained.

## 2026-08-27 — R2 recovered baseline and live reviewer validation

- Active recovered repository: `C:\Projects\stay-focused-v2`, branch
  `recovery/r1-onedrive`, starting from R1 recovery commit `16a4742` outside
  OneDrive with a clean worktree and passing `git fsck --full`.
- The separately recovered environment was restored to the ignored repo-root
  `.env.local`. The direct live harness required only `OPENAI_API_KEY`; no
  environment values were printed, written to evidence, staged, or committed.
- Existing command: `npm run live-run --workspace @stay-focused/engine -- it-security`.
  It used the existing IT Security fixture and OpenAI `gpt-4o`; no new harness
  or generation behavior was added.
- Live artifacts:
  `docs/ai/live-output-it-security-r2-recovered-baseline.txt` and
  `docs/ai/live-output-it-security-r2-recovered-baseline.json`.
- Live result: PASS. Structured output parsed; coverage passed 18/18 at 1.00;
  grounding passed at 1.00 with 0 issues and 0 phase-1 fabrication failures;
  leakage passed with 0 issues; all 18 sections assembled; unsupported visible
  content was 0; all enrichment values were null and enrichment was not visible.
- Student-visible quality remained source-faithful and materially useful as an
  organized key-point reviewer. Seventeen list-oriented cards intentionally
  have empty explanations under the current anti-fabrication/list-only policy.
  `Domains of IT Security`, `Definition of Terms`, and the infiltration
  procedure remain structurally thin because the flattened source groups some
  adjacent list text, but no source topic text was lost and no outside facts
  were added.
- Verification before and after the provider run: engine typecheck PASS, build
  PASS, aggregate eval PASS (290/290). Relevant mobile verification: typecheck
  PASS and tests PASS (204/204). Public Supabase client construction passed
  without a network request or data mutation.
- Known API issue remains unchanged and non-blocking: one Canvas sync database
  contract assertion requires an LF substring while the clean Windows checkout
  supplies the equivalent CRLF SQL. The targeted file passed 11/12 assertions;
  runtime SQL content is intact.

## 2026-08-27 — R3 reconciled capstone development baseline

- Started from clean recovery branch `recovery/r1-onedrive` at validated R2
  commit `e5f3255`. `git fsck --full` passed, and local `main` matched
  `origin/main` at `bad5b55` before reconciliation.
- Preserved the validated recovery commit before moving `main`: backup branch
  `recovery/r2-validated-baseline`, annotated tag
  `recovery-r2-validated-baseline`, and the original
  `recovery/r1-onedrive` branch all retain `e5f3255`.
- History was unambiguous Case A: `bad5b55` was the merge base and an ancestor
  of the recovery branch. Recovery was 34 commits ahead and 0 behind both local
  and origin `main`; local `main` and `origin/main` had no unique commits.
- Reconciled with `git merge --ff-only recovery/r1-onedrive` while on `main`.
  The operation fast-forwarded `main` from `bad5b55` to `e5f3255` without a
  merge commit, conflict, rebase, reset, or other destructive rewrite.
- Post-reconciliation verification passed: engine typecheck/build and eval
  290/290; mobile typecheck and tests 204/204; OCR typecheck and tests 27/27;
  Canvas typecheck and tests 72/72; reviewer web smoke 51/51; DB
  typecheck/build; API typecheck/build; and API health HTTP 200 with
  `{"status":"ok","version":"2.0.0"}`.
- The full API suite remains 547/548 only because the pre-existing Windows CRLF
  checkout does not match one LF-only SQL substring assertion. Runtime SQL is
  unchanged, and this non-blocking line-ending test issue was not modified.
- The ignored repo-root `.env.local` remains present, untracked, and
  uncommitted. No secret values were printed or written. The R2 live OpenAI
  validation was not rerun; its committed passing artifacts remain the trusted
  provider evidence.
- `main` is now the trusted capstone development baseline. Next recommended
  task: audit the remaining capstone scope and define the final development
  sequence from this reconciled baseline.

## 2026-08-27 — R4 capstone scope audit and final development sequence

- Audited trusted `main` baseline `cd070eb` without changing application code,
  prompts, schemas, migrations, dependencies, or the known CRLF-sensitive
  assertion. Full report: `docs/ai/capstone-scope-audit-r4.md`.
- Remote preservation is `SAFE_TO_PUSH`: after a fresh fetch, `origin/main`
  remained `bad5b55`; local `main` was 35 commits ahead and 0 behind before
  this R4 documentation commit. No push was performed.
- The existing product core is capstone-credible and should be protected:
  email auth/session restore, Stage 0-6 reviewer validation, R2 live OpenAI
  evidence, image/PDF OCR, Study Library persistence, durable Vercel Workflow
  processing, encrypted owner-scoped Canvas access, hosted incremental content
  and grade sync, and the EAS Android preview path.
- Readiness gaps: P0 = 1, P1 = 7, P2 = 4. The sole P0 is the absent task and
  study-schedule vertical slice: no task/session schema, API, planning contract,
  or mobile agenda exists despite the schedule-first product promise.
- P1 work covers remote preservation, safe reconciliation of four linked
  migration version aliases before new schema, coherent cached-reviewer
  offline access, final physical-device acceptance, deployment-to-commit
  provenance, canonical/capstone reconciliation, and live-artifact privacy review.
- Final sequence: R5 task/study-plan domain foundation; R6 mobile task/schedule
  experience; R7 limited offline study access; R8 navigation/accessibility
  hardening; R9 final hosted/device acceptance; R10 capstone/privacy/demo
  hardening; R11 final release baseline.
- R4 fresh verification: clean starting Git state, preservation refs retained,
  `git fetch --prune`, `git diff --check`, and `git fsck --full` passed; hosted
  V2 `/api/health` returned HTTP 200 with version `2.0.0`. Expensive R3 suites
  and paid OpenAI generation were intentionally not rerun.
- Next recommended phase: R5 task and study-plan domain foundation, gated first
  by an approved normal push of `main` and deliberate linked-migration alias
  reconciliation without editing or replaying applied migrations.

## 2026-08-28 - R5 task and deterministic study-plan foundation

- R5 resumed from the interrupted working tree on `main`; original starting
  commit `31522d840fd415267b048408ba0317587d4cafab`. Implementation commit:
  `3b5f21f` (`feat(planning): add task and study-plan foundation`). No push was
  performed.
- Migration preflight retained the four Canvas differences as Case A
  metadata-only aliases. No historical migration was edited, no migration
  repair ran, and linked Supabase state was not mutated.
- Added forward-only migration
  `20260827155438_task_study_plan_foundation.sql` for owner-scoped `tasks`,
  `study_plans`, and `study_sessions`. It includes validation constraints,
  composite owner-safe foreign keys, supporting FK/query indexes, RLS CRUD
  policies, explicit grants, and service-only security-invoker import/apply
  RPCs.
- Manual task APIs cover create/list/read/update/complete/delete. Canvas import
  reads only persisted synchronized `canvas_assignments`/`canvas_courses`,
  performs no provider request, rejects missing/foreign assignment rows, and
  uses the partial unique key `(user_id, canvas_connection_id,
  canvas_course_id, canvas_assignment_id)` with `ON CONFLICT DO NOTHING`.
  Re-import returns the existing user-owned task and does not overwrite edits.
- The pure shared planner is deterministic-v1 and does not call OpenAI. It
  normalizes/clips/merges availability, orders work by deadline, priority,
  creation timestamp, then UUID, splits sessions at 90 minutes, marks late
  sessions, and returns explicit scheduled/unscheduled minutes when capacity is
  insufficient.
- Preview performs no persistence. Apply accepts only the normalized planning
  request, reloads owned pending tasks, reruns the planner, hashes normalized
  output, and atomically persists the plan plus validated sessions through
  `apply_study_plan_v1`; arbitrary client session records are not accepted.
- Study sessions persist across a fresh request/client context and support
  owner-scoped list/edit/delete. Both the route layer and database constraints
  reject invalid intervals and cross-owner task/plan/session relationships.
- The stateful persistence acceptance covers manual creation, owned Canvas
  import, user customization and idempotent re-import, non-mutating preview,
  apply, session edit, fresh-context task/session reads, completion/deletion,
  and all eight User A to User B denial attacks.
- Fresh verification: shared tests 30/30; targeted R5 API/database/acceptance
  11/11; shared, DB, and API typechecks pass; DB and API builds pass; protected
  reviewer deterministic regression 290/290. Full API is 558/559 only because
  the known pre-existing Windows CRLF-sensitive Canvas SQL assertion expects LF
  text. It was not modified and is not an R5 product defect.
- Local migration static/RLS contract validation passes. Local Supabase runtime
  validation is blocked because Supabase CLI and Docker are unavailable. No
  linked `db push` or runtime migration validation was attempted.
- Protected audit: no Stage 0-6 reviewer, OCR/PDF, durable processing, Canvas
  synchronization, auth architecture, Study Library, notification, or mobile/EAS
  behavior changed. The only lockfile change records the API workspace's
  existing shared-workspace dependency; no external package was added.
- Remaining R5 risk is runtime application/validation of the new migration in
  an approved environment. Recommended next phase: R6 - Mobile task and
  schedule experience.

## 2026-08-28 - R5 final validation clarification

- Git was authoritative when final validation resumed: both intended R5
  commits already existed, the working tree was clean, and no duplicate
  implementation or documentation commit was created.
- Fresh final validation reproduced shared 30/30 (planner 12/12), targeted R5
  API/database/acceptance 11/11, reviewer 290/290, and passing shared/DB/API
  typechecks plus DB/API builds. Full API remained 558/559 with only the known
  Windows CRLF-sensitive Canvas SQL assertion.
- Static SQL, repository-double, and stateful integration coverage do not
  substitute for executing the migration and owner-isolation matrix against a
  real linked Supabase project. No linked mutation was performed during final
  validation.
- Final verdict: PARTIAL — R5 implementation accepted but
  environment/migration runtime validation remains blocked.
- Corrected next task: R5.1 — Live Supabase migration and domain acceptance.
  R6 begins only after R5.1 accepts the database vertical slice.

## 2026-08-28 - R5.1 live Supabase acceptance

- Started from clean `main` at `20ae205`, 40 commits ahead and 0 behind
  `origin/main`; `git fsck --full` passed and both recovery branches plus the
  recovery tag remained present.
- Reverified the four Canvas Case A aliases against live tables, columns,
  constraints, indexes, RLS, policies, triggers, 26 functions, grants,
  retry/idempotency state, incremental state, durable jobs, and service-role
  authorization. Reconciled only `20260728022127` to `20260728094421`,
  `20260728024021` to `20260728104000`, `20260728131529` to
  `20260728201000`, and `20260728133821` to `20260728213700` with supported
  migration-history repair commands. No historical SQL ran or changed.
- The post-repair CLI 2.116.0 dry run proposed exactly
  `20260827155438_task_study_plan_foundation.sql`. The real push applied only
  that migration, and final linked history records `20260827155438`.
- Live schema verification passed for `tasks`, `study_plans`,
  `study_sessions`, `import_canvas_assignments_as_tasks_v1`, and
  `apply_study_plan_v1`, including ownership constraints, indexes, RLS,
  grants, security context, task reload, and atomic plan/session insertion.
- Dedicated User A/User B acceptance passed manual CRUD, persisted Canvas
  import with an unreachable `.invalid` provider URL, idempotent re-import,
  edit preservation, deterministic/non-mutating preview, atomic apply,
  invalid apply rollback, session edit/constraint/delete, and all eight API
  plus RLS/database attacks. Cleanup restored tasks/plans/sessions 0 to 0.
- The first live preview exposed an R5 defect: PostgreSQL microsecond
  `created_at` precision was rejected by a milliseconds-only ISO regex. The
  validator now accepts valid fractional precision and a regression covers the
  live format. The complete live suite then passed.
- Fresh verification: shared 31/31; targeted R5 11/11; DB typecheck/build,
  engine typecheck, API typecheck/build all pass. Full API remains 558/559 only
  for the known Windows CRLF Canvas assertion. No protected subsystem changed.
- R5.1 verdict: PASS. Next recommended task: R6 — mobile Tasks and Study
  Schedule integration.

## 2026-09-04 — Reviewer B14 explanatory repair

- Starting HEAD `f61e0dc`; only historical untracked B8 evidence was present.
- Added bounded missing-target prompts, usefulness-aware merge and deterministic
  imperative/code/fragment/explanation-dump checks. B14 12/12 and engine 437/437
  pass; API baseline remains 607/607 across 69 files.
- Exact B13 candidate replay remains withheld. Plan audit proves the frozen
  Python hierarchy has two heading-only and two code-only sections without
  source explanatory prose. No B14 provider or full B12 rerun was made after
  that stop condition; no evidence was invented and parser default is `legacy`.
- B14 verdict: FAIL. Next task is to reconcile heading-only planned sections
  with the source-faithful explanatory contract without borrowing or weakening
  gates. See `docs/ai/acceptance/b14/reviewer-explanatory-repair.md`.

## 2026-09-04 — Reviewer B15 evidence-supported section planning

- Started at `55547b2` on `main`, 10 ahead / 0 behind, with only the historical
  untracked B8 evidence present and the same two known dangling blobs.
- Stage 2 now classifies explicit source nodes as standalone, structural,
  typed-evidence or unsupported from local normalized/semantic evidence.
  Non-standalone nodes retain titles, reasons, manifests and exact evidence but
  make no provider/retry calls and do not require invented explanations.
- The source audit retains all 13 Python headings as 9 standalone, 2 typed and
  2 unsupported nodes; Statistics/MinerU is 9 standalone plus 1 unsupported;
  Statistics/Docling remains 11 standalone; Accounting is 5 standalone plus 1
  structural introduction. Manifest totals and owners remain 99, 232, 156 and
  46 respectively, with zero planning-time loss or reassignment.
- B15 12/12 and engine 449/449 pass; API remains 607/607. Root typecheck, lint
  and build pass, with only four established mobile import-order warnings.
- Fresh targeted provider validation still fails acceptance. Python reaches
  1.00 coverage/grounding and 99/99 targets but is withheld for instructional
  noise. Statistics/MinerU reaches 0.91/0.80 and 211/232,
  Statistics/Docling 0.97/0.81 and 152/156, and Accounting 0.76/0.88 and 35/46.
  All four are withheld with zero fabrication failures, so the full unchanged
  B12 rerun was not eligible.
- B15 verdict: FAIL. Next task is source-supported evidence completion and
  usefulness repair without changing B15 dispositions, evidence ownership,
  parser defaults or frozen B13/B14 gates. See
  `docs/ai/acceptance/b15/reviewer-section-planning.md`.

## 2026-09-05 — Reviewer B16 deterministic evidence architecture

- Started at `95fc5ac` on `main`, 12 ahead / 0 behind, with only historical B8
  untracked and the same two known dangling blobs.
- Required targets are assembled and identity-hashed before provider work. The
  provider schema contains only stable IDs and concise explanations; required
  key points are source-owned. Batches are capped at six sections / 36,000
  support characters with stable-ID isolation and source-order assembly.
- Stage 4 checks deterministic representation; Stage 5 performs explanation-
  only repair for manifest plans; Stage 5a validates source-owned evidence and
  model prose separately. Permanent quota failures do not retry.
- Runtime metrics cover total/planning/deterministic/provider/validation/
  assembly time, batch sizes, requests, and both retry classes. The durable
  workflow shares this batching boundary and keeps per-section checkpoints.
- Focused 26/26, engine 475/475, API 607/607, root typecheck/lint/build pass.
- Live acceptance stopped at Python because OpenAI returned 429 `no credits
  remaining`. Two initial batches, zero retries, and 5.432 s total preserved
  99/99 targets with zero issues, omissions, fabrications, or provider losses.
  This fallback is not provider-quality acceptance; remaining targets and full
  B12 were not run.
- Verdict: FAIL because frozen live acceptance is unresolved. Restore provider
  capacity and rerun the required B16 order before any B17 work. See
  `docs/ai/acceptance/b16/reviewer-deterministic-evidence-runtime.md`.

## B16.1 attempt 3 — working-provider validation, 2026-09-07

- One minimal `gpt-4o` readiness request succeeded; provider capacity AVAILABLE.
  The two earlier no-credit attempts remain in the continued validation report.
- Fresh original-prompt Python exposed a generic source-wording prompt contract
  mismatch. A synthetic regression was captured failing before the small prompt
  correction; grounding/usefulness rules, thresholds, ownership and retries did
  not change. Final Python uses four calls, 10.383 s, and two fallback explanations.
- All four target sets remain intact before/after provider work: 99/99, 232/232,
  156/156 and 46/46. Provider-owned targets, provider losses and factual retries
  are zero. Final case call counts are 4/2/3/1.
- Verdict FAIL: Statistics MinerU/Docling are withheld with two/four unresolved
  grounding omissions; MinerU also has structural noise. Python still falls back;
  Accounting has automated PASS but fragmentary prose/raw table dumps. Manual
  quality is not accepted, so the full frozen B12 rerun was NOT RUN.
- Fresh engine 476/476, architecture 27/27, API 607/607; root typecheck/lint/build
  PASS with three fresh/four cached tasks each and four existing lint warnings.
- Next task: reconcile the generic explanation/evidence presentation contract
  with existing validation rules using captured failures. No B17, default parser
  promotion, frozen-gate weakening, evidence-ownership change or push.
- Evidence: `docs/ai/acceptance/b16/live-provider-runtime-validation.md`.

## 2026-09-07 — B17 explanation and evidence presentation (local)

- Continued from `4cc7233c2102a3251945a1825e2f591bd158b166` on `main` in
  `C:/Projects/stay-focused-v2`. Implementation/tests committed locally as
  `39fb81211b0f8e48a24d6f29c41f4b9accdfbbb5`; accompanying documentation is in
  the subsequent `docs(ai): record B17 Reviewer presentation validation` commit.
- Added conservative source-owned typed evidence presentation, local prose
  selection, heading-only subject completion, exact duplication removal and
  reader/API support. Manifest identity and all frozen factual rules remain.
- Fresh engine 494/494, architecture 45/45, API 607/607 and reader 32/32 PASS.
  Root typecheck, lint and build each ran seven fresh tasks with zero cached;
  all PASS, with four unchanged lint warnings. Diff check/full fsck PASS;
  the two pre-existing dangling blobs remain.
- Final live Python/MinerU/Docling/Accounting preserve 99/232/156/46 targets
  with zero provider target losses or factual retries. Calls are 2/2/2/2;
  explanation retries 0/0/0/1; observed replacements 0/0/3/0. Accounting's
  extra retry is explicitly reported. All generation requests used gpt-4o.
- Verdict: FAIL — generic Reviewer quality defect remains. Every case fails
  manual usefulness; Statistics remains withheld for two/four independent
  source-item omissions. Required composite labels still repeat source
  passages and damaged cached code/table layout remains. Full frozen B12:
  NOT RUN — targeted prerequisites failed. Native screenshot acceptance was
  not run; complete projected text/payloads were reviewed.
- Next task: repair generic composite source-span/relationship presentation
  and its alignment with source-item evidence, then repeat the frozen four
  gates. Do not weaken factual checks or change model/parser defaults.
- Historical reports preserved; B16 receives an additive continuation link.
  Private source/provider captures and logs remain ignored in `.local/b17/`;
  pre-existing untracked B8 is untouched. No secrets staged and no push.
- Evidence: `docs/ai/acceptance/b17/reviewer-explanation-evidence-presentation.md`.


## B25.3.2 candidate convergence (2026-09-15)

Commit `79e54dd` adds source-compatible blueprints, two-candidate pools, deterministic selection, cumulative semantic-intent exclusions and v4 durable call bounds. Strict quality, secrecy, ownership and exact-count gates remain. Focused Quiz 117; full Quiz 168 passed / 3 skipped; API 944, Mobile 481, Canvas 73, Engine 606, OCR 27, Shared 44; Workflow 1, provider contract 18; fresh root typecheck/lint/build 7/7 each. One live fixture passed 5/5 in 63.331 seconds with two author/two verifier calls and 14 candidates. Deployment `dpl_peVBgRctKVmGTfkNfQqTev74QCda` is READY and canonical health is OK.

The single authenticated production attempt on the unchanged real lecture failed: job `d038e85b-ae03-4853-aa2a-f663037415b0`, Workflow `wrun_01M2J4TSMPMWB6SPQXW8F0CTH0`, 4/5 accepted, q3 pending, `repair_exhausted` / `bounded_repair_attempts_exhausted` / `quiz_generation_failed`. Eighteen candidates and four author/four verifier batches; no Quiz persisted and no retry submitted. q1/q4 accepted second alternatives; q5 converged after a new intent; q3 failed even with alternate support. The realme showed the Generation failure and opened Queue; Library/attempt/secrecy/score/result/reopen remain unaccepted.

B25.3.3 should preserve source context and precise evidence ownership, select supports with enough evidence for meaningful distractors, and plan full-set concept/difficulty feasibility before immutable acceptance. **PARTIAL — Quiz semantic convergence remains incomplete.** B26 may not begin. See [B25.3.2 report](acceptance/b25.3.2/quiz-candidate-convergence.md).


## W1 — Today/Schedule alignment + submitted-work filtering (website) — 2026-10-11

**Status:** PASS (local implementation and all six real-account checks; unreleased)
**Commits:**
- de3e99c fix(api): keep handed-in Canvas work out of the study planner
- 9d2ef46 feat(web): mark work done from Today, Schedule and Tasks, including paper submissions
- 1343428 fix(web): share free time between Today and Schedule and label unsaved plans

**Changed files:**
- apps/api/src/lib/task-planning-repository.ts
- apps/api/src/lib/task-planning-repository.planner-tasks.test.ts
- apps/web/src/lib/complete-work.ts
- apps/web/src/lib/complete-work.test.ts
- apps/web/src/features/tasks.tsx
- apps/web/src/features/today/today-screen.tsx
- apps/web/src/features/today/plan-preview.tsx
- apps/web/src/features/schedule.tsx
- apps/web/src/features/day-clock/free-time-store.ts
- apps/web/src/features/day-clock/free-time-store.test.ts
- docs/ai/handoff.md
- docs/current-state.md
- docs/ai/current_sprint.md
- docs/roadmap.md

**Adaptations from prompt:**
- STEP 0 stopped because C:/Projects/stay-focused-v2 was on dirty main at de09b9c.
  After owner authorization for isolation, used the existing separate
  C:/Projects/stay-focused-v2-website worktree on website/functional-v1 at the
  required 8942c3c tip. Its only dirty paths were untracked
  docs/ai/desktop-layout-mockup/ and docs/ai/website-screenshots/; both are
  untouched. The original dirty main checkout was not edited or switched.
- Reused isSubmittedCanvasSubmission from mappers: no runtime import cycle.
  Deduplicated linked assignment IDs before the owner-scoped read. No task
  statuses change during planner loading. Regression includes the requested
  four cases, graded-but-missing work, query ownership and safe storage failure.
- Api is already exported by apps/web/src/lib/api.ts and used by useAuth;
  imported that type. The import endpoint accepts exactly assignmentIds and
  returns TaskView[], which does not contain canvasAssignmentRowId. Used its
  existing response contract rather than inventing that field.
- Tasks rendered an icon instead of a button for unlinked Canvas activities.
  Replaced that conditional with a check button for all rows, disabled for
  submitted work. Matched linked rows to canonical activity summaries so
  Canvas submission status and course context survive the Tasks list mapping.
- Today's upcomingDeadlines begins tomorrow. Removing overdue alone would
  lose today's unscheduled deadlines, so today's active deadlines come from
  the existing urgent feed filtered to the local date, alongside today's
  timeline/current block. Prior-date overdue deadlines are separate.
- Today's Done action uses the existing busyRef guard, reports unavailable
  activity resolution, and invalidates a stale preview after completion.
  Schedule also invalidates its preview after completing a deadline.
- Schedule due chips were Link elements. Made each chip a div with a linked
  title and a sibling check button, avoiding nested interactive elements while
  retaining the existing classes and visual pattern.
- Free-time storage retains sf.today.free-time.<date>. Added bounds/integer
  checks and ignored invalid input so malformed data cannot seed clock state.
  Schedule treats Until 00:00 as the next midnight (1440 minutes), preserving
  Today's supported midnight-ending windows.
- Schedule previously planned/replaced only its narrow availability range;
  reused Today's existing planningRequest for the full-day replacement range
  and the same availability. Both still call the same server planner.
- Proposed plan was already the heading; added the unsaved line and placed
  Save to schedule/Discard directly below it, before the plan bar. Verified
  that the primary button needs no scrolling inside the card.
- Reconciled docs/roadmap.md as required by AGENTS.md, in addition to the two
  current-state documents requested in the prompt.

**Gates (FRESH/CACHED/NOT RUN):**
Baseline before edits, all FRESH:
- api typecheck: PASS
- web typecheck: PASS
- api tests (task-planning): PASS, 29 tests / 4 files
- web tests: PASS, 66 tests / 10 files

Final implementation, all FRESH:
- api typecheck: PASS
- api tests (task-planning): PASS, 32 tests / 5 files
- web typecheck: PASS
- web lint: PASS, zero reported warnings/errors
- web tests: PASS, 79 tests / 12 files
- git diff --check / staged diff check: PASS
- Root builds/gates: NOT RUN; this slice uses the explicitly requested API/web gates.

**Real-account verification (STEP 6):** FRESH, actual signed-in account,
local API http://127.0.0.1:3000 and website http://127.0.0.1:3100,
Asia/Manila, implementation HEAD 1343428. No mock backend was used.
1. PASS — The 5 Why Analysis appeared under Overdue, not Today's schedule.
2. PASS — Done removed it from Overdue; Tasks showed it under Completed.
3. PASS — Real pointer drags set Today to 9:30—11:30 PM; Schedule showed
   From 21:30 / Until 23:30 and Same free time as Today.
4. PASS — The real Today preview excluded The 5 Why Analysis.
5. PASS — Not saved yet and the zero planned blocks/Plans from Today hint
   were visible before saving. Save created two blocks at 9:30—10:30 PM and
   10:30—11:30 PM. Preview, saved API sessions, Today's timeline and
   Schedule's today column agreed on the work and times.
6. PASS — Reopen from Tasks restored the assignment to Overdue. It was
   completed again afterward because the owner had already handed it in.

Cleanup PASS: removed only the two session IDs and the new plan ID returned
by the test save; verified original session/plan sets and task fields against
snapshots. Restored local free-time and clock-lock preferences. No new task
imports occurred. The sole intended account change is The 5 Why Analysis
remaining completed. No Canvas synchronization or generation was started.
Private snapshots/screenshots/results are ignored under .local/w1/.

**Failed attempts and recovery:** API startup from the monorepo root initially
failed Workflow app-directory discovery; starting with the API package as cwd
resolved it. The launcher initially misread the first environment key due to a
UTF-8 BOM; stripping it restored browser configuration before sign-in. The
owner's first inability to sign in was superseded by successful sign-in after
that repair. A scripted drag initially set From past the old Until and was
correctly clamped; setting Until first passed. A browser assertion initially
compared equivalent ISO strings literally (+00:00 versus .000Z); comparing
parsed instants confirmed equal persisted times. None required application
changes, gate weakening, or mocked real-account results.

**Known limits:** Paper (on_paper) work stays unsubmitted in Canvas until
it is graded; students clear it with Done. Submitted filtering affects planner
candidates and does not automatically delete historical saved sessions.

**Next:** W2 — website desktop/16:9 layout, Library grid, Canvas course search,
draft editor (separate scope; not started).

**Risks/blockers:** No implementation/STEP 6 blockers remain. Commits are local;
no push or deployment was requested, so production has not received this W1
release. Content time estimates, grade estimator, generation on sync and
inactivity gating remain excluded.


## W2 - Website desktop layout (16:9, Library grid, Canvas search, draft editor, clear-day state) - 2026-10-11

**Status:** PASS locally. All mandatory W2 gates and requested viewport checks passed. No push or deployment.

**Commits:**

- e833536 style(web): full-width shell that fits 16:9 fullscreen and short laptop screens
- 3642654 style(web): equal-height Library course and item cards
- 2abe801 feat(web): search Canvas courses and separate other Canvas spaces
- 5ae9b6b feat(web): desktop draft editor with outline and auto-growing sections
- 7a520ba feat(web): clear-day illustration for empty Today sections
- 14b12c4 fix(web): stretch clear-day panels and center reading layouts

**Changed files:** apps/web/app/globals.css; apps/web/src/components/clear-day.tsx; apps/web/src/features/canvas.tsx; apps/web/src/features/library.tsx; apps/web/src/features/today/today-screen.tsx; apps/web/src/features/today/today-calendar.tsx. Documentation: this appended handoff plus docs/current-state.md, docs/roadmap.md and docs/ai/current_sprint.md. Runtime changes are confined to apps/web; no API changes.

**Adaptations from prompt:**

- Continued in the existing owner-authorized isolated checkout C:/Projects/stay-focused-v2-website, branch website/functional-v1. W1's commits were present at 0a1590a. The dirty main checkout and two unrelated untracked website evidence directories were preserved.
- DayRingClock uses .day-clock, already measured by ResizeObserver. Its desktop width is min(100%, 52vh, 420px), with the existing mobile clock rule preserved. No numeric-size hook or geometry change was needed. Mobile shell rules are repeated at the end so they win.
- Centered capped reading/work surfaces and Settings without widening their readable measures. Reviewer grid tracks use justify-content: center because margin alone cannot center fixed-size tracks inside a full-width grid.
- Library title tooltips use the full course name, while existing courseIdentity presentation remains unchanged.
- Canvas inventory already projected classification as string. Main grouping uses persisted course.selected plus likely_current/past_or_concluded, retaining selected uncertain/unavailable spaces in the main list. Pending checkbox edits and saved-only material/grade/sync actions remain unchanged. Groups move after saving, not while ticking a checkbox. Search includes names and codes across both groups; the N of M count includes other spaces, and those spaces open during a nonempty search.
- ArtifactScreen already rendered DraftEditor directly. Removed the editor's own .reader class, used stable section-index/slide-number anchors, and made the outline a sticky 300px aside at 1100px and above (single column through 1099px). Auto-sizing accounts for borders, content changes, width changes and loaded fonts; save/revision and leave guards are retained.
- ClearDay uses existing theme color tokens, root radius/easing tokens, a compact calendar variant and reduced-motion-safe ray animation. Up Next remains the existing actionable row. Existing mobile shell/column behavior is retained with the requested new search, outline and empty-state additions.

**Gates (FRESH):**

- Baseline at 0a1590a: npm run typecheck --workspace apps/web PASS (exit 0); npm run lint --workspace apps/web PASS (exit 0, no warnings); npm run test --workspace apps/web PASS, 79 tests in 12 files.
- Final implementation tree committed as 14b12c4: the same web typecheck and lint PASS (exit 0); web tests PASS, 79/79 across 12/12 files. No skipped or failing tests. git diff --check and staged diff hygiene PASS.
- Browser acceptance PASS on the final implementation tree: isolated localhost Next preview at 3411 and fictional API/Auth at 3403, existing Playwright Chromium. No Playwright installation. External requests were blocked; zero browser exceptions and zero paid/generation calls. Fictional task/selection/draft writes never touched the real account.
- Browser flows: name/code/case/whitespace search and zero matches, collapsed other spaces, selected uncertain space retained in main list, checkbox changes saved across search and reload, course sync; draft sections and slides resize without internal scrolling, long typing grows and shortening shrinks fields, outline anchors bypass the leave guard, cancelled navigation retains dirty content, two saves update revisions, and reload recovers saved text. Reduced motion disables the rays, normal motion enables cd-glow.
- React review: row and textarea components are declared outside their parents; hooks are unconditional; resize/font callbacks clean up; strict types, accessible labels, keyboard links and existing authentication boundaries are retained.

**Viewport check (FRESH):** Every cell includes no horizontal page scrolling. Desktop shells are centered at 1920/2560; screenshots are full-page captures.

| Page | 1366x768 | 1536x864 | 1920x1080 | 2560x1440 | 390x844 | Note |
| --- | --- | --- | --- | --- | --- | --- |
| Today | PASS | PASS | PASS | PASS | PASS | Clock and proposed-plan heading visible together on small laptop; empty Later fills its desktop row beside Due soon. |
| Schedule | PASS | PASS | PASS | PASS | PASS | Week view remains usable; narrow view keeps the existing internal week scroller without page overflow. |
| Library | PASS | PASS | PASS | PASS | PASS | Mixed one/two-line course names and personal cards fill equal-height rows; searched item cards also match row heights. |
| Library draft | PASS | PASS | PASS | PASS | PASS | Outline beside fields on desktop, above on mobile; existing long sections and slides have no textarea scrollbars. |
| Canvas | PASS | PASS | PASS | PASS | PASS | Search filters both groups; other spaces collapsed when search is clear; selection/actions retained. |

Light and dark Today were also captured and checked at all five sizes (10 additional captures). Tasks, Settings, Generate and Announcements passed the 1920x1080 sweep; Settings' capped grid is centered. Screenshot/report output is ignored under tmp/w2-screens/ via the local Git exclude. Do not commit those files. Reproduction scripts are ignored .local/w2-layout.mjs, .local/w2-body.mjs and .local/w2-fixture.mjs, derived from scripts/web-browser-check.mjs and its existing fixture.

**Failed attempts and recovery:** The first local harness startup had a CRLF-sensitive assembly error; repaired before browser checks. Its first browser attempt lacked the Due soon fixture needed for a two-column assertion; added fictional deadlines. The next run caught the stretch rule applied to the draft grid instead of .today-split: corrected the selector and restored draft align-items: start. The final complete run passed without weakening checks. These failures were local setup/layout issues, not flaky gate results.

**Known limits / follow-ups:** Visual acceptance uses Chromium and fictional local data, not a physical laptop or production deployment. Browser data is intentionally not real-account evidence. On 1366x768 the plan heading is above the fold; the entire plan can still extend below it. Very long drafts intentionally increase page height, with no textarea scroll. This work does not change backend estimates, grades, sync admission/automation or inactivity rules. The owner's real-account localhost preview was restored at port 3100 after the isolated checks; signed-in browser storage was not modified.

**Next:** Owner review on laptop + fullscreen; then feature prompts (content-based estimates, grade estimator, sync automation) when scheduled. No remaining W2 implementation blockers.

## W1/W2 - Owner-authorized main integration - 2026-10-11

**Scope:** The owner explicitly requested `push to main w1 w2`. Integration
starts from remote main `6319376` and merges W1/W2 tip `c05634f`, preserving
both histories. Worktree: `C:/Projects/stay-focused-v2-w1-w2-main`; branch:
`integration/w1-w2-main-20261011`. The original dirty main checkout and
unrelated website evidence directories are untouched. Normal main publication
follows the verified integration commit; no force push or manual deployment.

**Conflict decisions:** Retained main's canonical planner repository exactly:
it already filters submitted/completed work and deselected/ended/unavailable
courses through the shared activity model. Adapted W1's planner regression to
that model and added coverage for an explicitly reopened Canvas assignment
with an old submission timestamp. Tasks retains main's complete canonical
activity list and minute polling, adding W1's import-and-complete helper for
paper work. Today/Schedule preserve explicit content+grades refresh alongside
W1's Done actions, date-specific free time and unsaved-plan labels. Canvas
uses W2 search/grouping/extracted rows with main's bounded content+grades
CourseSync. Documentation combines both release records and the intervening
task-sync reliability/capstone changes.

**FRESH verification:**

- `npm run test --workspace apps/web`: PASS, 82 tests in 12 files.
- `npm run test --workspace apps/api -- src/lib/task-planning src/lib/experience`:
  PASS, 171 tests in 9 files.
- `npm run typecheck -- --force`: PASS, 8/8 packages, zero cached.
- `npm run lint -- --force`: PASS, 8/8 packages, zero cached; four existing
  mobile import-order warnings, no errors.
- Final `npm run build -- --force`: PASS, 8/8 packages, zero cached,
  including Next API/web production builds and Expo web/Android/iOS exports.
- Isolated browser suite: PASS, all 25 requested page/viewport checks, 10
  light/dark Today captures, four-page desktop sweep, Canvas search/selection
  persistence and content+grades Sync now, section/slide textarea growth,
  draft save/reload/dirty-navigation guards and reduced motion. Added an
  unlinked paper activity to the canonical Tasks fixture, clicked Complete,
  verified its import then completed-status PATCH, and verified it moved to
  Completed with Reopen available. Zero browser exceptions/paid calls.
  Screenshots of small-laptop Today and desktop Canvas were also inspected.

**Browser evidence:** Ignored `.local/w2-layout.mjs`, `.local/w2-fixture.mjs`
and `tmp/w2-screens/result.json` in the integration checkout. Fictional API/Auth
run on 3405/3413 with external requests blocked; this is not new real-account
or production acceptance. Temporary browser/server processes closed after
the suite. The signed-in owner preview and earlier W1 account state were not
used or modified during this integration.

**Failed setup attempts and recovery:** This new worktree initially lacked
nested Expo Router and Workflow installations for root typechecking; local
dependency links restored them, and the fresh complete rerun passed. The first
root build could not crawl the mobile dependency junction; copied only the
small existing nested mobile dependencies into the ignored worktree install.
The second build then found workspace links pointing outside Metro's watch
roots; added ignored mobile-local links to this checkout's unchanged packages.
No source/configuration changes, dependency upgrades or weakened checks were
used for these repairs. Next-generated API `next-env.d.ts` changes are excluded
from the release, as are dependency installs, build outputs and test evidence.

**Current-state reconciliation:** Updated `docs/current-state.md`,
`docs/roadmap.md` and `docs/ai/current_sprint.md` with this integration. Their
earlier W1/W2 local-only entries are historical checkpoints superseded by
the owner's main-release instruction. Estimators, sync automation and
inactivity gating remain separate future scopes.


## W2 - Website desktop layout and mobile parity (STEP 7) - 2026-10-11

**Status:** PASS locally, including physical Android acceptance. This supplements
the earlier website-only W2 entry with the revised prompt's mobile scope and
fresh website verification. No API changes, push or deployment.

**Commits:** Existing website implementation retained: `e833536`, `3642654`,
`2abe801`, `5ae9b6b`, `7a520ba`, `14b12c4`; previous website report `c05634f`.
New mobile commits on `b25-3-3-ai-first`, all authored by
`galaxymaxp <omgraythekid@gmail.com>`:

- `b87fe54` feat(mobile): group other Canvas spaces under course search
- `e1f5f3d` fix(mobile): let draft fields grow instead of scrolling inside
- `f42c43f` feat(mobile): clear-day illustration for empty Today sections
- `9ec9fa1` fix(mobile): keep growing draft fields above the keyboard

**Changed files:** New runtime/test changes are confined to mobile:
`src/features/sync/CanvasSyncScreen.tsx`, `canvasSyncPresentation.ts` and its
test; `src/features/redesign/DraftInput.tsx` and its test; `LibraryScreen.tsx`,
`TodayScreen.tsx`, `TodayCalendar.tsx`, `screens.test.ts`; `src/design/ClearDay.tsx`
and its test (all below `apps/mobile`). This website checkout records the
cross-repository result in `docs/ai/handoff.md`, `docs/current-state.md`,
`docs/ai/current_sprint.md` and `docs/roadmap.md`. No new website runtime edits
were necessary because its W2 implementation was already committed.

**Adaptations from prompt:**

- The named `C:/Projects/stay-focused-v2` checkout is dirty `main`. Continued
  website verification/docs in the existing `C:/Projects/stay-focused-v2-website`
  worktree on `website/functional-v1`, where W1 and all website W2 commits
  already exist. Preserved both unrelated website evidence directories.
- Mobile starts at `dace312` on `b25-3-3-ai-first`. All initial dirty
  README/docs/design paths, the deleted thesis overview and untracked paths
  remain untouched and unstaged. Its planning docs are dirty, so the required
  reconciliation is recorded here instead of overwriting mobile owner edits.
- Mobile course types already carry classification. Split after the existing
  search using selected/current/past as main and all others as other spaces.
  Preserve the main list's existing three-course disclosure, row controls,
  saved selection and sync behavior. Reuse the existing disclosure and motion
  helper; searching opens other spaces, clearing closes them, and manual
  toggling remains available. No API contract change.
- Current mobile Library is a two-column compact grid, rather than the
  prompt's older horizontal pager. No layout rewrite: physical CC17 title
  wraps completely over three lines; a longer Enterprise Architecture title
  retains the existing three-line ellipsis with its full accessible label.
- A shared top-level DraftInput owns each field's content-size height,
  including title, sections and slides. Minimum heights are 52 for title and
  96 for content; wrapped content uses ceil(height) + 16 and scrollEnabled=false.
  The outer Page remains the only scroller with handled keyboard taps. Native
  acceptance found Android edge-to-edge adjustResize insufficient, so added
  draft-only KeyboardAvoidingView (Android height / iOS padding). Existing
  save/autosave, revisions and leave guards are retained.
- ClearDay lives beside the shared design primitives. Theme aliases are
  separator/surfacePrimary/textMuted/textPrimary/amber; the rays use a separate
  SVG layer in an Animated.View for native opacity animation. Existing ambient
  motion duration is 3200ms per leg, opacity 0.35 to 0.7. Reduced motion,
  background and lost focus stop the loop; cleanup stops it on unmount.
  The optional planning action scrolls to the actual clock through Page's
  existing scrollRef. Compact calendar state uses the same drawing.

**Gates (FRESH):**

- Website at `c05634f`: typecheck PASS; lint PASS, zero warnings/errors;
  tests PASS, 79/79 in 12/12 files. This is both the current baseline and final
  runtime tree; no implementation changes were needed this turn.
- Mobile baseline `dace312`: typecheck PASS; lint PASS with four pre-existing
  import/first warnings; tests PASS, 784/784 in 76/76 files.
- Mobile final `9ec9fa1`: typecheck PASS; lint PASS, same four existing warnings
  in activeProcessingJobStore.test.ts, completedArtifactCache.test.ts,
  processingJobsApi.test.ts and processingOutboxStore.test.ts; tests PASS,
  791/791 in 78/78 files. Added grouping, growth/shrink/edit forwarding,
  ClearDay theme/motion lifecycle and Today action/keyboard wrapper coverage.
- Native arm64 local debug APK build PASS using the existing Android project,
  JDK 17 and installed SDK: 412 Gradle tasks (367 executed, 45 up-to-date).
  No Playwright installation, API edits, root builds or provider calls.
  Root suites/builds: NOT RUN; the prompt's scoped web/mobile gates passed.
- React review PASS: top-level components, unconditional hooks, cleaned-up
  animation, strict types, accessible disclosures/labels and decorative SVG.

**Viewport check (FRESH):** Re-ran ignored `.local/w2-layout.mjs` with installed
Playwright Chromium against isolated localhost web/API/Auth fixtures. Every
cell includes no horizontal page scroll; desktop shell centers at 1920/2560.

| Page | 1366x768 | 1536x864 | 1920x1080 | 2560x1440 | 390x844 | Note |
| --- | --- | --- | --- | --- | --- | --- |
| Today | PASS | PASS | PASS | PASS | PASS | Clock and top of proposed plan visible on laptop; clear state fills desktop row. |
| Schedule | PASS | PASS | PASS | PASS | PASS | Existing narrow week scroller stays inside the page. |
| Library | PASS | PASS | PASS | PASS | PASS | Long/short/personal course cards and item cards match row heights. |
| Library draft | PASS | PASS | PASS | PASS | PASS | Desktop outline beside fields; narrow outline above; fields have no inner scrollbars. |
| Canvas | PASS | PASS | PASS | PASS | PASS | Search filters names/codes and both groups; other spaces collapse with clear query. |

Ten additional light/dark Today captures and Tasks/Settings/Generate/Announcements
1920x1080 sweep PASS. Interaction checks PASS: Canvas selection persistence and
sync; no-match search; selected uncertain main group; draft loaded growth,
typing/shrink, anchor navigation, leave guard, two saved revisions/reload;
normal/reduced-motion rays. Zero browser exceptions and zero paid calls.
Report and screenshots remain ignored under `tmp/w2-screens/`.

**Mobile parity (STEP 7):** Full-width desktop shell is NOT APPLICABLE.
Library layout rewrite is NOT APPLICABLE; actual long titles checked as above.
Canvas grouping, growing draft fields/keyboard awareness, and normal/compact
clear-day states are applied. Physical check FRESH PASS on realme RMX3151,
Android 13, using a separate native local debug package
`com.galaxymaxp.stayfocusedv2.w2verification`, not Expo Go. The ignored Metro
harness mounts actual current screens, ThemeProvider, native navigation,
TextInputs and react-native-svg with isolated fictional auth/API/library/course
data; it does not authenticate or write to the real account.

| Physical check | Result | Evidence |
| --- | --- | --- |
| Canvas | PASS | Other spaces collapsed initially, selected uncertain in main; Career search opens matching group; clear collapses; disclosure opens. |
| Draft | PASS | Loaded long field has no inner native scroll; outer page reaches Next steps; real keyboard leaves focused field visible; additional typing grows it with scrollEnabled=false. |
| Today light/dark | PASS | Normal and compact sun/calendar/check drawings and text readable in both themes. |
| System Reduce Motion | PASS | Off/on checked in both themes through Android Accessibility Remove animations; actual ThemeProvider follows system state. Animation stop/start lifecycle also verified by tests. |
| Planning action | PASS | Plan your free time returns the outer page to the actual day clock. |
| Library titles | PASS | CC17 wraps fully; longer title uses existing ellipsis, without vertical clipping/overlap. |

Ignored native evidence: mobile `.local/w2-native/` screenshots, UI XML,
`device.cjs`, `device-more.cjs`, `result.json`, fixture/resolver files; build
log `.local/w2-native-build.log`, Metro log `.local/w2-native-metro-2.log`.
No screenshots, fixture configuration or APKs committed.

**Failed attempts and recovery:** New render-test type selectors initially
failed strict typing; changed to typed predicates. Existing screen mocks lacked
the new SVG Rect/G and absolute-fill style; added those mocks and reran the
full suite successfully. Native fixture startup initially omitted its Metro
watch folder, and an old launcher held a log file; fixed only ignored harness
setup. The physical keyboard overlap was a real defect, repaired in `9ec9fa1`
and rechecked. A post-autosave assertion looked for an offscreen field; scrolling
the outer page found the retained text. ADB WRITE_SECURE_SETTINGS was denied
for animation toggles, so used the actual Accessibility UI. Device briefly
disconnected during final checks; owner reconnected it, and remaining checks
and restoration passed. Early screenshots captured before a navigation/theme
update were replaced with captures after UI settles; final named reduce-true/
reduce-false and Library captures are the acceptance evidence. No gates were
weakened and no passing physical result is inferred from a unit test alone.

**Cleanup:** Original Remove animations Off / transition_animation_scale=1
restored and read back. Only the isolated W2 debug package was uninstalled;
existing signed app retained. Own remote screenshot/XML removed. The 8082
reverse was already absent after device reconnect; Metro stopped. Expo's
generated expo-env.d.ts comment was restored to its pre-check content.
Original web preview on port 3100 remained available; no real-account state
was changed by these fixture checks.

**Known limits / follow-ups:** Local Chromium and physical Android checks use
fictional data; they establish layout/native behavior, not production or
real-account API integration. iOS keyboard behavior is NOT RUN physically.
Long drafts intentionally increase outer page height. Existing mobile tile
truncation is retained. No backend estimate, grade, sync-automation/admission,
inactivity rule or generation-engine work is included. Commits are local.

**Next:** Owner review on laptop + fullscreen; then feature prompts
(content-based estimates, grade estimator, sync automation) when scheduled.

## W2 mobile parity main publication - 2026-10-11

**Scope:** Owner requested `push to main`. Fresh fetch found W1/W2 website
already on remote main at `7ef5a61`. Used the clean existing integration
worktree, preserving all original dirty checkouts. Imported the mobile branch
locally and cherry-picked only the four W2 commits; its older unrelated branch
history is excluded.

**Mainline commits:** `b87fe54` -> `f308faf` (Canvas grouping), `e1f5f3d` ->
`55b7cd0` (growing fields), `f42c43f` -> `815631d` (clear-day), `9ec9fa1` ->
`dc018c8` (keyboard avoidance). Report `3a59d3a` -> `2c022f4`. Runtime patches
applied cleanly; Today retains main's newer 60000ms task-refresh interval.
The four report files conflicted at their new sections: retained both existing
main integration and mobile-parity sections, without discarding history.

**FRESH gates at `2c022f4`:** web typecheck PASS, lint PASS, tests 82/82 in
12/12 files; mobile typecheck PASS, lint PASS (same four pre-existing import
warnings), tests 793/793 in 78/78 files. Diff hygiene PASS. No API, dependency,
schema or website runtime changes in this integration. Root build, new browser
and physical-device checks NOT RUN for this Git-only integration; previous
viewport/physical results remain historical evidence for the source patches.

**Publication:** Owner-authorized normal push of this verified integration to
`origin/main`, followed by a remote HEAD comparison. No force push, source
branch push, manual deployment, paid calls, private fixtures or environment
files. Original dirty mobile docs/design and website evidence directories
remain untouched. Next: owner laptop/fullscreen review.

## F0S - autopilot base moved to main `079986c` (2026-10-15)

**Status: PASS for the unattended F0S scope.** Created
`overnight/2026-10-15_feedback` directly at released GitHub main
`079986c2568d067ea49595f9b4862dac98db2fc0` (PR #10). Starting checkout was
`overnight/2026-10-13_0132` at `20b12c5`, with no tracked changes or existing
F0S progress/commits. The new branch did not exist. No committed work was redone.

**Fetch path:** added `github` as
`https://github.com/galaxymaxp/stay-focused-v2.git`, then successfully ran
`git fetch github main`. Local release-clone fallback was NOT RUN; stale
local-path `origin` is unchanged. Required ancestor `079986c` equals fetched
main. All 37 overnight-added migration paths exist there, including both named
visual migrations and `20261013000500_offline_activity_draft_copies.sql`.
STEP 2.3 added non-doc source paths absent from main: **none**.

**Untracked preservation:** 23 initial files: `UI/README.md`, ten screenshots
under each of `UI/screenshots/dark/` and `UI/screenshots/light/`,
`apps/mobile/.gitignore`, and `supabase/.temp/cli-latest`. None collide with a
tracked path in main; moved untracked files: **none**. All remain untouched.
Runner files under `tmp/` remain uncommitted.

**Install:** FRESH `npm ci --no-audit --no-fund` PASS (1,495 packages, 2m),
Node v24.16.0/npm 11.13.0; no lockfile/engine mismatch or fallback attempt.
Deprecation warnings were recorded. `package-lock.json` is unchanged.

**FRESH baseline gates at `079986c`, run serially:**

| Command | Result |
| --- | --- |
| `npm run typecheck -- --force` | PASS: 8/8 tasks, 0 cached |
| `npm run lint -- --force` | PASS: 8/8 tasks, 0 cached; 0 errors, 5 existing mobile import-order warnings |
| `npm test -w @stay-focused/shared` | PASS: 134 tests, 13 files |
| `npm test -w @stay-focused/canvas` | PASS: 75 tests, 1 file |
| `npm test -w @stay-focused/api -- --maxWorkers=4` | First run: 2,095 passed / 1 failed / 3 skipped, 178 passed / 1 failed files; unchanged full rerun PASS: 2,096 passed / 3 skipped, 179 files |
| `npm test -w @stay-focused/mobile` | PASS: 1,026 tests, 102 files |
| `npm test -w @stay-focused/web` | PASS: 84 tests, 13 files |
| `npm run build -- --force` | PASS: 8/8 tasks, 0 cached; API 34/34 pages, web 19/19 pages; Expo 68 assets, 8 web bundles, 1 Android bundle, 1 iOS bundle |
| `git diff --check` | PASS: 0 whitespace errors; also checked after generated-file restoration and documentation edits |

**Failed first attempt / flake:** API test
`src/lib/canvas-reviewer-sources.test.ts:157`, "lists only selected-course
descriptors without source bodies", exceeded its unchanged 5,000ms timeout
(5,665ms reported). The same full suite and four-worker cap passed on rerun;
no product code, test, timeout or validation setting was changed. Vite's existing
CommonJS/ESM config warning was recorded. The API's three skips remain explicit.
All tests used repository-local `.local/test-temp` via TEMP/TMP/TMPDIR; no
Windows Temp cleanup. Full local evidence: `tmp/overnight/F0S.*.log`, gate
results `F0S.gates.json`, and the separate `F0S.api-rerun.log`. Next.js generated
changes to both `next-env.d.ts` files were inspected and restored before commits.

**Commits:** `c2b1cec docs(ai): reconcile F0S released-main baseline` updates
current-state, roadmap and sprint as required by AGENTS.md. This footer is
committed alone as `docs(ai): record autopilot base on released main`; its final
hash and both commit subjects are recorded in `tmp/overnight/F0S.status`.
All commits use author `galaxymaxp <omgraythekid@gmail.com>`.

**UNVERIFIED (owner to confirm):** deployed revisions, live database/migration
rows, Scheduler and physical-device behavior. This run establishes a local Git
and validation baseline only. No Supabase, Vercel, Google Cloud, Canvas or Resend
call, deployment, remote SQL, Scheduler change, environment-file edit or push
occurred. Rollout and Device checks were skipped entirely; F0S defines no such
actions. **Owner steps remaining: none for F0S.** SP0 is the next separate item;
no later tester-feedback work was started.

## SP0 unattended speed audit (2026-10-15)

**Status: PASS for the docs-only local SP0 scope.** Read the full SP0 prompt,
including overriding UNATTENDED rules, the tester-feedback roadmap's full
SP0/SP1/CQ1/SP2 sections, root policy/AUTOPILOT and current planning state.
Starting branch `overnight/2026-10-15_feedback`, HEAD `89dd1b8`, F0S PASS,
tracked tree clean. Preserved unrelated untracked `UI/`,
`apps/mobile/.gitignore`, `supabase/`; no product code or migration was edited.

Deliverable: [SP0 speed audit](../architecture/sp0-speed-audit.md), covering Today,
Courses/course workspace, Tasks, Library, Reviewer and Queue/processing on mobile
and the student website, API/query costs, cache boundaries, complete Canvas sync,
EP1 admission/200/25 guard, bundles/hosting, and concrete SP1/CQ1/SP2 inputs.
Current-state/roadmap are reconciled and sprint has the requested tester-feedback
line. Older F0S "SP0 next" descriptions are superseded by these current entries.

**Top 5 findings:**

1. Course preparation status checks run sequentially before pagination, then
   repeat for the visible page: simple 100 File/Page candidates imply 300 serial
   reads plus 400 visible-page reads, excluding inventory/auth. Batch evidence,
   revision-matched receipts and controls without weakening identity checks.
2. Library/detail/material badge assembly loads full owner histories before
   filtering. Synthetic 240-reviewer Library case: 18 emulated table-page reads,
   18,900,915 DB JSON bytes for 38,123 bytes of summaries; one reviewer still
   reads 18,879,565 bytes. These are synthetic observations, not live wire sizes.
3. Main resource hooks wait for network on fresh visits. Mobile Tasks has SQLite
   snapshots but does not read them until connection failure; mobile Library and
   saved Reviewer already display local content before a remote answer.
4. Courses reads live Canvas inventory and writes course rows before returning
   saved course state. This introduces Canvas latency into ordinary navigation.
5. Website Library fetches all pages before publishing first content. Its isolated
   unchanged hook hid an available first page while page two was held for 100 ms.

Further findings include overlapping Today context/auth calls, serial Library
groups, background hydration amplification, duplicate job polling, static Three.js
on Today (315 kB First Load JS), heavy read-route imports, and owner decisions
about region/capacity. The stored course schema has course dates/workflow and
term id, but not term dates/concluded/enrollment evidence. CQ1 must keep undated
Default Term cases current absent explicit completion or manual override.

**Commits:**

- `588bbf1 docs(architecture): SP0 speed audit` — audit only.
- Companion local commit `docs(ai): reconcile SP0 audit checkpoint` — this
  handoff, sprint, current-state and roadmap; its final hash and both subjects
  are recorded in `tmp/overnight/SP0.status` after commit, avoiding a self-hash.

Both use author `galaxymaxp <omgraythekid@gmail.com>`. No push.

**Gates and measurements (FRESH, implementation baseline `89dd1b8`):**

| Command / evidence | Exact result |
| --- | --- |
| `npm run build -w @stay-focused/web` | PASS, exit 0; 1/1 build, compilation 3.6 s, 19/19 static pages, 28 route entries; every route size is in the audit |
| `npm run test -w @stay-focused/mobile -- src/features/redesign/useLocalLibrary.test.ts` | PASS, 9/9 tests, 1/1 file, test duration 195 ms / total 764 ms; TEMP/TMP under `.local/test-temp` |
| `node_modules/.bin/vitest.cmd run --config tmp/overnight/SP0.hooks.config.ts` | Final PASS, 2/2 tests, 1/1 file: 11 resource-hook cases plus website Library all-pages gate; test time 1.34 s / total 1.70 s |
| `node_modules/.bin/tsx.cmd --tsconfig apps/api/tsconfig.json tmp/overnight/SP0.measure.ts` | PASS, exit 0, 12/12 observations: six real service methods against synthetic typed rows, zero/20 ms injected page delays; no network clients |
| `node tmp/overnight/SP0.verify-docs.cjs` | PASS: 100/100 explicit audit file:line references exist/in range; staged paths all Markdown under docs (1/1 in audit commit, 4/4 in companion commit) |
| `git diff --check` | PASS, 0 whitespace errors on final owned docs |
| `git diff --cached --check` | PASS, 0 whitespace errors before each commit |
| Docs-only scope | PASS: 5 changed paths total, all docs Markdown; generated web `next-env.d.ts` inspected and restored |
| Root typecheck/lint/full suites/mobile build | NOT APPLICABLE, docs only; F0S baseline results were not relabeled as fresh SP0 results |
| Production, rollout, physical-device/browser live timings | NOT RUN under UNATTENDED rules; live claims UNVERIFIED (owner to confirm) |

**Failed attempts / tooling:** initial 1-test resource probes passed; one repeat
added JSON capture because console output was suppressed. Expanding the probe to
the full web Library module first produced **1 passed / 1 failed** on Vite JSX
import parsing, before Library assertions; only the temporary harness was changed
to extract the unchanged private hook in memory. Final 2/2 passed; product files,
timeouts and assertions were not weakened. Failed log is
`tmp/overnight/evidence/SP0-hook-measure-jsx-failed.log`. The normal Vite future
native-config CommonJS/ESM warning remains. No flake observed. Two attempted
Python helper commands could not start (Python unavailable); a later inline Node
reference-check command failed from PowerShell quote handling. File-based Node
helpers completed reconciliation/reference checking. Both Git diff gates were
green even in that combined inline-helper attempt. These tooling failures are
retained separately from the successful product build and tests.

Local scripts/logs/JSON stay under `tmp/overnight/` and are not committed. Audit
embeds measurements needed by future items. Progress is `SP0.progress` and final
machine status/commit list is `SP0.status`.

**UNVERIFIED (owner to confirm):** actual per-screen cold/warm first-content
timings, actual API payload sizes and query plans, CIT17 sync split into Canvas/
DB/preparation admission, CIT17 Default Term/date/enrollment counts, deployed
API/website/DB/worker regions/revisions, current Cloud Tasks/worker limits,
provider quotas, live backlog/cold starts and physical behavior. Tokyo DB/worker
versus iad1 API is repository/historical evidence, not a fresh service check.

**Owner steps remaining:** confirm those live measurements/classification facts;
decide SP2 region/capacity trade-offs. **Rollout** and **Device checks** were
skipped entirely and remain owner-present work for later RB3 (migration/deploy/
OTA as applicable, realme/website saved-first/offline/account isolation/current-
past/Queue/generation checks and before/after timings). SP0 itself requires no
rollout because it changes no product behavior. No Supabase, Vercel, Google Cloud,
Canvas or Resend call, remote SQL, deployment, Scheduler change, environment-file
edit or push occurred. Next separate item is SP1; this run stops at SP0.


## SP1 unattended saved-first screens (2026-10-15)

**Status: PASS for STEP 0-4, gates, docs and local commits.** Branch `overnight/2026-10-15_feedback`, starting `68e40d0`, tested code `15811de`. [Acceptance](acceptance/sp1-cached-first-screens.md) records STEP 0 file:line references, each screen's pre-SP1 saved data, the acceptance matrix and failures. [ADR-027](../architecture/ADR-027-cached-first-screens.md) uses the established ADR folder; the prompt's `docs/adr` does not exist.

Owner/query/schema-bound snapshots now hydrate both apps before network, including successful empty results and exact course material offsets. Mobile reuses SQLite Library/draft/answer-key behavior and adds a forward-only local table/purge; web uses one owner-keyed IndexedDB database with silent storage fallback. Status/Retry keeps data visible, derived group positions remain stable, and changed Reviewers require explicit acceptance. Auth cleanup is tested; epochs fence delayed writes. No API/provider/generation/RLS/cancellation behavior changes.

Commits (author `galaxymaxp <omgraythekid@gmail.com>`, local only):

- `2bb62ba feat(shared): add owner-bound saved snapshot contract`
- `eb6ac80 feat(mobile): render saved screens before background refresh`
- `2bfbff3 feat(web): persist owner-scoped saved-first screens in IndexedDB`
- `44f2683 fix(cache): retain derived course positions during refresh`
- `15811de fix(cache): reconcile pagination status and schema regressions`

The scoped documentation commit containing this footer is listed with its final hash in `tmp/overnight/SP1.status`; no self-hash amendment is needed.

| Command | Evidence/result |
|---|---|
| `npm run typecheck -- --force` | FRESH PASS: 8/8 tasks; zero cached; 28.111s |
| `npm run lint -- --force` | FRESH PASS: 8/8 tasks; zero cached; zero errors, five existing warnings; 32.18s |
| `npm run test --workspace @stay-focused/mobile` | FRESH PASS: 1,036/1,036 tests; 105/105 files; zero skips; 6.596s |
| `npm run test --workspace @stay-focused/shared` | FRESH PASS: 223/223 tests; 19/19 files; zero skips; 2.269s |
| `npm run test --workspace @stay-focused/web` | FRESH PASS: 94/94 tests; 16/16 files; zero skips; 2.96s |
| `npm run build --workspace @stay-focused/api` | FRESH PASS: 1/1 build; 73.15s |
| `npm run build --workspace @stay-focused/web` | FRESH PASS: 1/1 build; 19/19 static pages; 37.247s |
| `npm run build --workspace @stay-focused/mobile -- --platform android` | FRESH PASS: 1/1 local Android export; 63.626s |
| `npm run build -- --force` | FRESH PASS: 8/8 tasks; zero cached; 113.542s |
| `git diff --check` and `git diff --cached --check` | FRESH PASS before documentation commit |
| API test suite | NOT APPLICABLE / NOT RUN: no API source changed |

First full mobile gate stopped correctly at **1,032 passed/4 failed**, **102 passed/3 failed files** (1,036 tests/105 files). Two upgrade assertions hard-coded schema 7; they now assert the current schema while retaining body/draft/key/practice checks. Two screen assertions used header-child positions; the stand-in now renders header controls and tests find SearchField/SegmentedControl. Focused repair **77/77**; final full mobile **1,036/1,036**. Earlier draft parse/edit-tail, JSX transform, ordering assertion and lint failures are retained in the acceptance report; no flake observed. Initial forced typecheck/lint also passed 8/8 before final review, then were rerun fresh after the final edits. Logs remain ignored under `tmp/overnight/evidence/SP1-*`; TEMP/TMP stayed inside `.local/test-temp`. No tmp, credential, generated export or private fixture is committed. Unrelated `UI/`, `apps/mobile/.gitignore`, and `supabase/` remain untouched.

**UNVERIFIED (owner to confirm):** live/deployed revision, production first-content latency, live operational state and actual RB3 physical/browser behavior. There were no remote service calls, deployments, remote SQL/migration application, Scheduler changes, environment-file edits or pushes. The only migration is new on-device SQLite migration 8; historical migrations are unchanged. Current-state, roadmap, Tester feedback sprint and the external roadmap's SP1 status are reconciled.

**Owner steps remaining:** the entirely skipped Rollout (preview OTA and website deploy), followed by the entirely skipped Device checks/RB3: reopen saved Today, airplane-mode refresh/Retry with last-updated time, sign out and use a second account, and hold an open Reviewer while its new revision arrives. SP1 requires no remote migration. Next separate roadmap item is CQ1, not started here.

Tooling note: the finalizer's first freshness guard could not parse PowerShell's UTF-16 build log; no docs were written before that guard. Correct decoding confirmed the existing 8/8, zero-cached build result, and finalization succeeded. This was not a product gate failure.


## CQ1 unattended current and past courses (2026-10-15)

**PASS for the unattended CQ1 code scope (STEP 0-4, gates, docs and local commits).** Current courses show by default; past courses stay in collapsed sections on mobile and website with owner controls to move either way. Shared Canvas conclusion/enrollment/course/term evidence drives the automatic rule; Default Term without completion evidence stays current. Past-course work is omitted from Today, Tasks, calendar, Queue, notification fan-out, routine sync and eager preparation. Explicit opens/refreshes sync once; Library reviewers and quizzes remain labelled and available. Code tip: `6d8759e`; [acceptance](acceptance/cq1-current-and-past-courses.md), [ADR-028](../adr/ADR-028-current-and-past-courses.md).

Starting HEAD `33824ca`; branch `overnight/2026-10-15_feedback`. Resumed after interruption by rereading prompt/progress/Git and inspecting the uncommitted implementation; committed migration/shared work was preserved.

Commits (author `galaxymaxp <omgraythekid@gmail.com>`, local only):

- `a4554a9 feat(db): persist course state evidence and owner overrides`
- `39cf0ff feat(shared): classify current and past courses consistently`
- `5e1506e fix(db): guard past courses at atomic poll sync reservation`
- `6d8d51d test(shared): verify refreshed snapshots replace course state`
- `98024e8 feat(api): hide past-course work and skip routine sync`
- `132a315 feat(mobile): collapse past courses and retain Library access`
- `6d8759e feat(web): group past courses behind owner controls`

The documentation commit containing this footer is listed with its final hash in `tmp/overnight/CQ1.status`.

| Command | Evidence/result |
|---|---|
| `npm run typecheck -- --force` | FRESH PASS: 8/8 tasks; zero cached |
| `npm run lint -- --force` | FRESH PASS: 8/8 tasks; zero cached; zero errors/five existing warnings |
| `npm run test --workspace @stay-focused/api` | FRESH PASS: 2,120 passed; 3 skipped; 180/180 files |
| `npm run test --workspace @stay-focused/mobile` | FRESH PASS: 1,042/1,042 tests; 105/105 files; zero skips |
| `npm run test --workspace @stay-focused/shared` | FRESH PASS: 258/258 tests; 22/22 files; zero skips; source and generated JS copies |
| `npm run test --workspace @stay-focused/shared -- src` | FRESH PASS: 129/129 source tests; 11/11 files; zero skips |
| `npm run test --workspace @stay-focused/web` | FRESH PASS: 95/95 tests; 16/16 files; zero skips |
| `npm run test --workspace @stay-focused/canvas` | FRESH PASS: 75/75 tests; 1/1 file; zero skips |
| `npm run build --workspace @stay-focused/api` | FRESH PASS: 1/1 build |
| `npm run build --workspace @stay-focused/web` | FRESH PASS: 1/1 build; 19/19 static pages |
| `npm run build --workspace @stay-focused/mobile -- --platform android` | FRESH PASS: 1/1 local Android export |
| `npm run build -- --force` | FRESH PASS: 8/8 tasks; zero cached |
| `git diff --check; git diff --cached --check` | FRESH PASS: diff hygiene before documentation commit |

FRESH final serial verification: forced typecheck/lint/root build **8/8 tasks each, zero cached**; API **2,120 passed/3 skipped in 180 files**, mobile **1,042/1,042 in 105 files**, shared **258/258 in 22 files** (includes emitted JS copies; source-only **129/129 in 11 files**), web **95/95 in 16 files**, Canvas **75/75 in 1 file**. Standalone API/web/Android builds **1/1 each**. Lint: zero errors/five existing warnings. Repaired draft/first-gate failures and one earlier API timeout flake remain recorded in acceptance; the final serial run passed without retries.

The shared source-only run avoids counting emitted JS as distinct acceptance cases. First API full gate: 2,097 passed/19 failed/3 skipped; adapter repairs passed 80/80, then 2,117 passed/3 skipped. Added atomic reservation tests passed 10/10 and subsequent full API passed 2,120/3 skipped. One unchanged Canvas source test timed out at 5s under load; unchanged focused/full reruns passed, recorded as a flake. First mobile: 1,037 passed/3 failed; repaired fixtures plus behavior tests passed 58/58, final mobile 1,042/1,042. Draft typecheck/SQL/fixture/tooling failures are retained in acceptance. The additional root build was interrupted before completion and has now passed freshly.

Logs/helpers/progress stay under `tmp/overnight/`; test temp stays under `.local/test-temp`. No credentials, generated output, validation artifacts or private fixtures are committed. Generated Next ambient files are restored to their tracked contents after builds. Unrelated `UI/`, `apps/mobile/.gitignore` and `supabase/` remain untouched. Current-state, roadmap, sprint, acceptance, ADR and external roadmap CQ1 status are reconciled.

**Owner steps remaining:** apply migration files `20261015030000` then `20261015030100`, publish API/website/worker and preview OTA, then run the entirely skipped Rollout/Device checks on realme and website. CIT17 Default Term identities/counts, live course evidence, deployed revisions/database/Scheduler state, actual speed and physical behavior are **UNVERIFIED (owner to confirm)**. No remote service call, remote SQL/migration application, deployment, Scheduler action, environment-file edit or push occurred. Next separate roadmap item: QD1; this finite CQ1 run ends here.

Documentation reference check: FRESH PASS, 10/10 CQ1 local links. The first helper scanned historical roadmap sections and flagged an unrelated old RB1 link; limiting the helper to CQ1 additions passed without changing historical content.

## QD1 unattended header Queue - 2026-10-15

**Status: PASS for local code scope.** STEP 0-4, fresh serial gates, documentation
and local commits complete on `overnight/2026-10-15_feedback`. Queue is now a
header dropdown/popover over the current screen on both platforms. One owner-
scoped source per platform supplies jobs and counts, preserving 5 s active /
30 s idle foreground polling. Running-only badges, unseen failed/expired dots,
progress/Retry/Open and five recent completed entries reuse the existing grouping
and bounded history projection. Mobile retains Auto, pending intent recovery,
past-course filtering and outside/Back dismissal; web uses native button
activation, dialog focus, Esc/outside dismissal and focus return. Legacy Queue
routes open the overlay. The distinct processing notification/deep-link target,
SP1 saved-first screens and CQ1 current/past behavior remain intact.

Commits (author galaxymaxp <omgraythekid@gmail.com>, no push):

- `6beec6a` refactor(queue): share header data and bounded history grouping
- `c94d529` feat(mobile): open generation queue under the header
- `1183369` feat(web): replace the queue page with a header popover
- Documentation: `docs: record QD1 header queue acceptance` (this entry's scoped
  commit; final hash in `tmp/overnight/QD1.status` and Git log).

FRESH final serial gates: forced typecheck **8/8**, forced lint **8/8**, forced
root build **8/8**, all **0 cached**. Mobile tests **1,056/1,056 in 110 files**;
web **113/113 in 20 files**; **0 skipped**. Standalone API build **1/1, 34/34 static
pages**, web **1/1, 19/19 static pages**, Android export **1/1, 1 bundle/35 assets**.
Diff and staged-diff hygiene **0 errors**. Lint has **0 errors**, five existing
mobile warnings and one existing web Library warning. API/shared tests **NOT
APPLICABLE** (their source unchanged). Logs remain under tmp/overnight; tests use
repo-local TEMP/TMP. Next-generated declarations restored; no generated output
or private fixture committed.

Failures retained: first root typecheck **4/6 tasks, 0 cached, 12 TS diagnostics**;
second **4/6, 0 cached, 3 diagnostics**, fixed strict test callback/ref typing.
First lint **5/8, 0 cached, web 1 error/2 warnings**; fixed const/dependency and all
13 new mobile warnings revealed by an intermediate passing lint. The first lint
launch briefly overlapped typecheck; only the final sequential runner counts as
serial evidence. First expanded mobile focus run **20 passed/1 failed** (test-tree
serialization), next **21 passed/3 failed** (mock identity/memoization, including
one 5-second harness timeout); fixed, final focus runs **24/24 mobile**, **18/18
web**, then full suites passed. Earlier draft source-extraction/token/encoding
and local helper failures are documented in acceptance. No nondeterministic
product flake observed; no validation weakened or unrelated work overwritten.

Production revisions, live database/Scheduler state and physical behavior are
**UNVERIFIED (owner to confirm)**. Code/migrations/docs supported STEP 0; there was
no uncovered Queue notification dependency or source contradiction. No remote
service action, remote SQL/migration application, deployment, Scheduler change,
environment-file edit, push or deletion outside the repository occurred.

**Owner steps remaining:** Rollout and Device checks were entirely skipped.
Deploy website and publish preview OTA; check realme and website for running
count, dropdown over current screen, Retry/Open, old links, outside/Android Back,
Reduce Motion and website Enter/Space/Esc/focus return. Complete earlier CQ1
migration/API/worker owner rollout separately before combined RB3 acceptance.
QD1 needs no migration or API/worker deployment. No further approval question
is pending; this run ends at QD1 and does not start GA1.

[Acceptance](acceptance/qd1-queue-dropdown.md),
[ADR-029](../architecture/ADR-029-queue-dropdown.md). Reconciled current-state,
repo roadmap, current sprint and the external tester-feedback roadmap QD1 status.
Unrelated untracked UI/, apps/mobile/.gitignore and supabase/ were preserved.

Final docs hygiene first found one extra sprint EOF blank line; repaired, then
final diff/staged-diff checks passed with zero errors.

## GA1 unattended course batch generation (2026-10-15)

**Status: STOPPED at STEP 0**, as required by UNATTENDED rules 3/4 and
"Verify (STOP on any surprise)". Inspected HEAD `65c9150` on
`overnight/2026-10-15_feedback`; branch/QD1 PASS/clean tracked tree prerequisites
passed **3/3 FRESH**. Unrelated untracked UI/, apps/mobile/.gitignore and
supabase/ were preserved. No product code, migration or later step was started.

**Findings:** EP1 manual admission reads preparation then admits preparation and
throws `409 not_ready`, without creating a Reviewer job or durable explicit
intent (`apps/api/src/lib/experience/generation.ts:44`, line 49; existing test at
`generation.test.ts:37`). Completion wakes only automatic admission
(`canvas-preparation/orchestration.ts:107`), which skips Auto opt-out, baseline
material and past courses. E2's `packages/shared/src/reviewer-estimate.ts:21`
requires a saved reviewer and estimates study/recall time; it cannot supply
pre-generation wall-clock minutes. These contradict the requested reusable
prerequisites, rather than merely lacking live confirmation.

**AG1/AG2 coverage finding:** coverage is incomplete by design, not just hidden.
`apps/api/src/lib/auto-reviewers/admission.ts:152` baselines initial material;
line 64 requires a valid newer timestamp; lines 53-60 limit File/Page eligibility;
line 132 honors Auto off; lines 15-18/179/191/236 enforce three/run, five/rolling
day, three attempts and run budget. Lines 225-234 skip mapped existing material
and wait for preparation. Existing mapped-reviewer presence does not prove the
current revision is up to date (`experience/service.ts:374`). `after-sync.ts:13`
skips past courses. `poll-trigger.ts:13` only detects new File/Page module items
from complete prior evidence, and line 45 reserves a capped sync. QD1 shows
admitted jobs, not the ungenerated backlog. Live student inventory was not read.

**Quota:** server enforcement does exist. The transaction-serialized trigger in
`packages/db/migrations/20260723090006_processing_quota_concurrency_hardening.sql:15`
enforces active/hourly/queued/daily caps on normal job insertion. Reuse it;
`study-tools.ts:310` explicitly says its in-memory limiter is not a durable quota.
The no-server-quota STOP condition is not triggered. Full reuse inventory,
actual mobile/web course routes, ownership/idempotency and evidence are in
[GA1 audit](acceptance/ga1-course-batch-generation.md); ADR-030 is deferred.

**Exact questions for the owner (recorded, not sent during unattended work):**

1. May GA1 add a durable explicit batch-intent receipt/resumer independent of
   Auto preference/baseline, including explicitly opened past courses, while
   retaining server quotas for every eventual Reviewer?
2. Should confirmation use a new, separately labelled coarse generation-duration
   estimate, or omit minutes until supported? E2 remains a saved-reviewer
   study-time estimate and cannot honestly supply generation duration.

**Commits:** `2c0a02b docs: record GA1 prerequisite contradictions`; accompanying
`docs: checkpoint GA1 unattended stop` reconciles current-state/roadmap/sprint
and this footer. Exact final commit IDs are in `tmp/overnight/GA1.status`.
The external feedback roadmap's GA1 status is also updated locally.

**Gates/counts:** forced typecheck **NOT RUN (0 tasks)**; forced lint **NOT RUN
(0 tasks)**; API/mobile/shared/web tests **NOT RUN (0 tests each)**; API/web/Android
builds **NOT RUN (0 each)** because the mandatory stop preceded implementation.
`git diff --check` and `git diff --cached --check`: **FRESH PASS, 0 whitespace
errors each** for documentation. No cached product result is claimed; no suite
was run, no product gate failure or flake occurred. Read-only discovery had
Windows wildcard/path misses, resolved by locating real paths; no private
fixture/temp output was created. All tmp files remain uncommitted.

**UNVERIFIED (owner to confirm):** deployed API/web/worker revisions, applied
migration/database rows, Cloud Scheduler state, CIT17 material/reviewer counts
and physical behavior. Local absence of the explicit intent/generation estimator
is proven from code, not inferred from missing production access.

**Owner steps remaining:** resolve the two questions and revise prerequisites;
resume GA1 STEP 1-3, fresh serial gates and scoped API/mobile/web/docs commits.
Rollout and Device checks were entirely skipped: after code acceptance, apply
any new migration via Supabase connector (filename as name), deploy API/website,
publish preview OTA, then CIT17 Generate all on realme/website: skip current
reviewers, confirm honest count/time/quota remainder, normal QD1 jobs/summary,
independent Retry and SP1/CQ1 preservation. No remote service call, remote SQL,
migration application, deployment, Scheduler action, environment-file edit, push
or file deletion occurred. GA1 remains STOPPED; no later item was started.

## SP2 preparation and Library data path — unattended local PASS (2026-10-15)

**Status: PASS for STEP 0-5, gates, docs and local commits.** Inspected baseline
`482cb6e`, expected `overnight/2026-10-15_feedback`, SP0 PASS, tracked-clean:
FRESH **3/3 prerequisites**. QD1 PASS; GA1 STOPPED independently, not required.
The full prompt/UNATTENDED rules, SP0 audit and external SP2 section were read.
No question was asked. SP1/CQ1/QD1 remain covered; no GA1 implementation or SP2b
findings 4/7/8/10/13 were added. [Acceptance](acceptance/sp2-library-data-path.md)
contains the matrix, methods, full failures and owner work; [ADR-031](../architecture/ADR-031-library-summary-projections.md)
defines the projection contract.

Re-opened current locations at the inspected baseline (line drift from SP0):

| Finding | File:line at `482cb6e` |
|---|---|
| 1 | `apps/api/src/lib/canvas-reviewer-sources.ts:414,419`; `apps/api/src/lib/canvas-preparation/admission.ts:12`; `apps/api/src/lib/canvas-preparation/client-status.ts:22` |
| 2 | `apps/api/src/lib/experience/repository.ts:31,36`; `apps/api/src/lib/experience/service.ts:55,198,236,248` |
| 5 | `apps/web/src/features/library.tsx:77` (SP1 snapshot existed, all-pages gate remained) |
| 6 | `apps/api/src/lib/experience/service.ts:78,199,239` |
| 9 | `apps/mobile/src/app-shell/AppLifecycle.tsx:40`; `apps/mobile/src/features/redesign/useLocalLibrary.ts:99`; `apps/mobile/src/services/localLibrary/librarySync.ts:90`; `apps/mobile/src/services/localLibrary/artifactStore.ts:324` |

Findings 1/2/5/6 are DONE locally. Finding 9 skips additional implementation
because both callers already use owner/version/schema-bound catch-up; stronger
regressions prove unchanged copies make zero detail requests, changed copies
make one, and only explicit owner-authenticated not-found removes a copy.
Bounds stay 300 attempts / 60 seconds. Its expensive server dependency is fixed
by finding 2. No code contradiction requiring a stop was found.

Implementation commits (all author `galaxymaxp <omgraythekid@gmail.com>`):

- `f0c7173 perf(api): project Library summaries and read exact reviewer versions`
- `eeae99b perf(api): batch revision-fenced material preparation projections`
- `6fb2d79 perf(web): publish Library pages during background refresh`
- `2092b34 fix(api): order preparation controls by their material primary key`
- `426edf3 test(api): exercise filtered exact reads through the SQL adapter`
- `14a45ae test(api): verify summary bytes and isolate preparation fixtures`
- `97a6934 fix(web): retain saved Library cards during partial refreshes`

The documentation commit contains this footer; its finalized hash and every
commit above are recorded in `tmp/overnight/SP2.status` after commit. No push.

**Before/after:** same unchanged SP0 service fixture declarations and page/JSON
accounting, real service/repository with throwing-network synthetic adapter.
Separate PGlite tests execute the views and compare previous/new results for
estimates, origin, supersession, ordering, quizzes, drafts, exact details,
ownership and past-course retention. No production timing is claimed.

| Finding / measure | Reads before -> after | DB JSON bytes before -> after | HTTP requests before -> after |
|---|---|---|---|
| 1: 100 candidates + 100 visible statuses, no receipts/controls | 700 -> 2 | 75,400 -> 4 | 1 -> 1 |
| 2: Library page / 100 cards | 18 -> 2 | 18,900,915 -> 44,277 | 1 -> 1 |
| 2: exact reviewer, freshness excluded | 11 -> 2 | 18,879,565 -> 78,702 | 1 -> 1 |
| 5: full 240-card traversal | 54 -> 6 | 56,702,745 -> 105,692 | 3 -> 3 total; **3 -> 1 before uncached cards** |
| 6: empty-material workspace | 10 -> 1 | 18,879,782 -> 221 | 1 -> 1 |
| 9: unchanged hydrated body, existing fix retained | 0 -> 0 | 0 -> 0 | 0 -> 0 detail requests |

Do not add overlapping findings' savings. Library/reviewer/workspace response
JSON remains **38,123 / 78,742 / 893 bytes**. Auth/activity's two calls, freshness,
actual material inventory, Canvas, Storage, OCR/model work and rendering are
excluded as in SP0. Nonempty visible badges add one bounded query per 100 unique
IDs. Preparation reuses loaded source evidence; its isolated repeated File probe
excludes inventory bytes, while committed tests cover 100 distinct files and 201
across complete chunks. SP1 saved snapshots render after zero network responses
before and after; partial website refresh retains unseen saved cards until a
complete walk succeeds and never persists an incomplete snapshot.

**Final serial gates — FRESH PASS:**

| Exact command | Result |
|---|---|
| `npm run typecheck -- --force` | 8/8 tasks, 0 cached |
| `npm run lint -- --force` | 8/8 tasks, 0 cached; 0 errors, 5 existing mobile + 1 existing web warnings |
| `npm run test --workspace @stay-focused/api` | 2,130 passed / 3 existing skips, 182/182 files |
| `npm run test --workspace @stay-focused/mobile` | 1,057/1,057, 110/110 files, 0 skips |
| `npm run test --workspace @stay-focused/web` | 118/118, 21/21 files, 0 skips |
| Shared tests | NOT APPLICABLE: no shared source changed |
| `npm run build --workspace @stay-focused/api` | 1/1 build, 34/34 static pages |
| `npm run build --workspace @stay-focused/web` | 1/1 build, 19/19 static pages, 28 routes |
| `npm run build --workspace @stay-focused/mobile -- --platform android` | 1/1 export, 1 Android bundle / 35 assets |
| `npm run build -- --force` (AUTOPILOT) | 8/8 tasks, 0 cached |
| `git diff --check`; `git diff --cached --check` | 0 errors each |

Failures/flake preserved: temp baseline CJS top-level-await transform failed
before repair; first SQL suite **4 passed/1 timeout** led to storing estimates
instead of repeated body parsing; draft typecheck **7 errors** repaired with
typed filtering and the missing existing table type; preparation fixture
**55 passed/1 failed** on missing `.neq`, then repaired. After an initial full
API PASS, a repeat hit a first-import timeout (**2,129 passed/1 failed/3 skipped**,
6.543 seconds against 5-second budget). Its synthetic formatting adapter now
avoids loading mutation/dispatch modules; all assertions and unmocked batching
proof remain. Final full API **2,130 passed/3 skipped**, no further retry. This
load-sensitive timeout flake and earlier failures are in acceptance/logs.
Vitest retains its existing future native-config warning. No live/provider or
workflow smoke ran (NOT APPLICABLE to unchanged execution boundaries).

Next build-generated `next-env.d.ts` changes were restored to the verified clean
baseline and excluded from commits. TEMP/TMP were repo-local `.local/test-temp`.
Evidence/scripts under `tmp/` stay uncommitted. Initial unrelated `UI/`,
`apps/mobile/.gitignore`, and `supabase/` remain untouched. Final owned tracked
changes are committed; local ahead/behind uses recorded refs, with no fetch.

**Decisions for the owner:** finding 11 has repo API `iad1` versus historical DB
`ap-northeast-1` / worker `asia-northeast1`; serial DB calls cross regions if live
settings match. RTT/regions remain **UNVERIFIED (owner to confirm)**. Finding 12
shares one queue/service, historically **2 concurrent tasks, 1/s**, worker
**concurrency 1, 0-2 instances**; two long preparations can occupy both slots.
Current backlog, wait, cost and quotas are **UNVERIFIED (owner to confirm)**.
Measure before choosing region, reservation/priority or separated capacity; no
queue, region, concurrency, guard, service or Scheduler setting changed.

**Owner steps remaining:** Rollout and Device checks were **entirely skipped**.
Confirm prerequisites and apply `20261015040000_experience_library_projections.sql`
via Supabase connector (filename as name), before publishing API; schedule the
generated-estimate version-table backfill appropriately and inspect live plans.
Complete pending CQ1 prerequisites where needed, deploy API/website and preview
OTA, then CIT17/realme/website checks for Library/material speed against SP0,
saved/offline content, account isolation, explicit not-found, stable open-reader
revisions, supersession, quizzes, past courses and Queue. Resolve GA1's separate
questions before resuming batch generation. SP2 ends; SP2b is separate scope.

Production/deployed revisions, database rows/applied migrations, live indexes and
plans, Scheduler state, Canvas/CIT17 counts, real speed, capacity and physical
behavior are **UNVERIFIED (owner to confirm)**. No remote service call, remote
SQL/application, environment-file edit, deployment, Scheduler action, push or
outside-repository deletion occurred.

## SP2b remaining speed findings — unattended local PASS (2026-10-15)

**PASS, local code scope only.** Baseline `41377cc` (SP2 PASS), branch
`overnight/2026-10-15_feedback`. Resume inspected the prompt (UNATTENDED first),
progress, last 15 commits, status and diff; STEP 1-4 were already committed and
were not redone. Completed the interrupted STEP 5 client work and API contract,
STEP 6, serial gates and docs. [Full acceptance](acceptance/sp2b-read-path-speed.md),
[ADR-032](../architecture/ADR-032-today-and-job-read-context.md).

Implementation commits (this footer is the documentation checkpoint):

- `7a79a3a perf(api): open Courses from stored owner inventory`
- `7dfcd13 perf(today): bundle activity reads within one verified request`
- `5cb63ad perf(web): defer Today WebGL until useful content paints`
- `8151f68 perf(api): isolate read models from document and generation imports`
- `99de167 perf(queue): share owner-scoped status and generation detail reads`
- `8db0f3b test(sp2b): reconcile Today fixtures and shared polling effects`
- `19028c5 fix(mobile): follow generation screen focus in shared job reads`

Reopened current locations after baseline line drift; paths without prefixes are
under `apps/api/src/lib`:

| Finding | Baseline inspection -> final implementation |
|---|---|
| 4 | `canvas-course-selection.ts:100`, `experience/http.ts:31` -> stored branch `:119`, parallel `storedInventory:286`, `experience/http.ts:8` |
| 7 | mobile `TodayScreen.tsx:75`, web `today-screen.tsx:80` -> `:68` / `:77`; `experience/service.ts:158`; `auth.ts:4`, `experience/task-state.ts:5` remain verified server paths |
| 8 | web `DayRingClock.tsx:13`, `DayOrb.tsx:3` -> `DeferredDayOrb.tsx:9`; mobile `DayOrb.tsx:4` unchanged |
| 10 | experience catch-all `route.ts:3,20`, `experience/http.ts:4`, `canvas-reviewer-sources.ts:1` -> catch-all `route.ts:3,17`, `experience/read-http.ts:1` and lightweight quiz/activity/Office metadata modules |
| 13 | web `queue.tsx:195`, `queue-button.tsx:12`; mobile `AppActivityProvider.tsx:10` -> jobs `route.ts:139`, `experience/service.ts:320`, shared web/mobile Queue hooks |

QD1 already shared mobile header/list polling, so that existing portion was
retained. Website's two sequential detail requests and mobile's separate detail
poller still needed fixing. No contradictory code requiring a scope change or
owner decision was found. First-ever empty Courses inventory still uses the
existing live discovery and `classificationSource: canvas`; stored inventory
reports `stored`. Existing sync reconciliation, selection and CQ1 grouping stay.

**Before/after, FRESH local deterministic evidence:**

| Finding | Before | After |
|---|---|---|
| 4: stored Courses | 1+ Canvas pages; 1 upsert; at least 5 DB ops after auth | 0 Canvas; 0 writes; 4 data reads + connection read; last 3 parallel |
| 7: Today, single-page fixture | 4 requests; 16 data + 8 auth/activity calls | 1 request; 9 distinct table reads + 2 auth/activity calls; equivalent results |
| 8: website `/today` fresh First Load JS | 320 kB | 198 kB |
| 10: dedicated Today built NFT heavy package entries | 375 PDF.js path entries | 0; 79 total trace files |
| 13: detail + header | 2 sequential detail requests plus header polling; mobile extra detail poller | 1 shared Queue/detail request and poller |

Courses/Today counts are asserted by tests; builds/logs live uncommitted under
`tmp/overnight/SP2b.*`. The preserved trace baseline has 375 entries; STEP 0's
372 shorthand is superseded by that exact file count. Mobile Three.js remains
**1,292,907 raw bytes**, not a Metro bundle contribution: no behavior-neutral
chunk deferral was established in this scope. Dedicated Today sheds native/PDF
packaging; the mixed experience catch-all still packages dynamic write assets.
Static dependency graph tests verify both read entry points avoid heavy handlers.
No cold-start or production millisecond result is claimed.

The additive `detailId` response uses one verified owner, reuses page rows and
uses one exact scoped fallback for older/past-course direct links. CQ1 exclusions
still apply to Queue lists. Extraction status, Retry/Open, persisted-result
checks, cancellation without results and account cleanup are preserved. Mobile
retained screens release/reacquire detail on focus changes; active detail/list
poll every 3/5 seconds, idle every 30, with visibility/background handling.
Legacy endpoints remain compatible. Today retains SP1 snapshots and 60-second
web polling. No new migration, service, queue, region or concurrency change.

**Final serial gates:**

| Exact command | FRESH result |
|---|---|
| `npm run typecheck -- --force` | 8/8 tasks; 0 cached |
| `npm run lint -- --force` | 8/8 tasks; 0 cached; 0 errors; 5 existing mobile + 1 existing web warnings |
| `npm run test --workspace @stay-focused/api` | 2,146 passed / 3 existing skips; 183/183 files |
| `npm run test --workspace @stay-focused/mobile` | 1059/1059; 110/110 files; 0 skips |
| `npm run test --workspace @stay-focused/shared` | 260/260; 23/23 files; includes existing emitted copies |
| `npm run test --workspace @stay-focused/web` | 121/121; 22/22 files; 0 skips |
| `npm run build --workspace @stay-focused/api` | 1/1 build; 34/34 static pages |
| `npm run build --workspace @stay-focused/web` | 1/1 build; 19/19 static pages; 28 routes; `/today` 198 kB |
| `npm run build --workspace @stay-focused/mobile -- --platform android` | 1/1 export; 1 Android bundle / 35 assets |
| `npm run build -- --force` (AUTOPILOT) | 8/8 tasks; 0 cached |
| `git diff --check`; `git diff --cached --check` | 0 errors each |

Failures and attempts preserved: Step 2 focused API **117 passed / 1 failed**
(old inventory mock contract), repaired **118/118**. Step 4 focused suites
**427 passed / 1 failed / 3 skips** (tracing glob), repaired final imports **3/3**;
intermediate build's six unused-import warnings were removed. Resume Step 5
focused API **85 passed / 1 failed** (undefined fake client), repaired **89/89**.
Initial full mobile gate **1,056 passed / 2 failed**, stale separate-capability
fixtures repaired; focused interactions **58/58**, final full mobile **1059**.
Initial lint passed with three new hook dependency warnings, all repaired;
final lint retains only six existing warnings. Added a retained-screen focus
regression during final review; affected gates were rerun after it. No flaky
failure was observed. Python was unavailable before editing; used installed
Node. Existing Vitest/renderer and Metro color warnings remain in logs.

TEMP/TMP were repo-local `.local/test-temp`; final exports ran offline and
Next/Turbo telemetry was disabled. Generated `next-env.d.ts` changes were
inspected and restored to their clean baseline. Final owned changes are committed;
initial unrelated `UI/`, `apps/mobile/.gitignore`, `supabase/` remain untouched.
No temp artifact, credential or private fixture was staged. Live provider/workflow
smoke is NOT APPLICABLE to unchanged execution/provider contracts.

**Owner steps remaining:** Rollout and Device checks were **entirely skipped**.
Confirm pending SP2/CQ1 migration prerequisites before deployment, deploy
API/website and preview OTA, then CIT17 Courses/Today speed and clock/orb/reduced
motion checks, Queue Retry/Open/extraction/detail and navigation-return updates,
saved content, account isolation and past-course grouping. Findings 11/12 remain
owner region/capacity decisions; GA1 remains STOPPED pending its separate questions.
Production revisions, live rows/applied migrations, Scheduler, Canvas inventory,
real latency/cold starts, Metro contribution and physical behavior remain
**UNVERIFIED (owner to confirm)**. No remote service call, remote SQL/application,
environment-file edit, deployment, Scheduler action, push or outside-repository
deletion occurred. SP2b ends here; no further roadmap scope was started.

## SH1 — public reviewer snapshot links (2026-10-16)

**Status: PASS for the unattended local code scope.** STEP 0-5, tests, fresh
serial gates, documentation reconciliation and local commits are complete on
`overnight/2026-10-15_feedback`. Baseline `2ff66b0`; SP2 and SP2b status files
were PASS. SH0 and the external roadmap's SH1 section were read in full.
No code contradiction required a stop. GA1 batch generation remains excluded;
SP1/CQ1/QD1/SP2/SP2b behavior is retained. This finite SH1 run ends here.

Website and mobile owner controls create/copy/update/stop a frozen reviewer
link. Anonymous `/s/<token>` reads only the stored allow-list: reviewer text,
existing key terms, included quizzes/answers for local scoring, existing
matching assistance saved on the sharing device, attributed/licensed Wikimedia
references and numeric citations as text. It excludes account/Canvas/provider
metadata, source text, grades/tasks, course page snapshots and extracted figures.
The actual public HTTP handler has zero auth/model/write calls in fresh tests;
the public page bypasses auth/private caches, routes every AI control to sign-in
with a safe return, and scores without network/storage writes. Owner RLS,
256-bit tokens, same-link explicit updates, revocation, token rotation after
stop, soft-delete revocation and bounded best-effort IP/token limiting are
covered. Late mobile responses cannot copy/share the previous owner's link.
See [acceptance](acceptance/sh1-public-share-links.md) and
[ADR-033](../architecture/ADR-033-public-share-links.md).

Commits, author `galaxymaxp <omgraythekid@gmail.com>`:

- `f991d2b feat(db): store owner-isolated reviewer share snapshots`
- `cc1b502 feat(api): serve allow-listed reviewer snapshots by public token`
- `d087e09 fix(api): resolve share route test through the configured alias`
- `aa3cce8 feat(web): read shared reviewers and score included quizzes anonymously`
- `025bc1f feat(mobile): share reviewer links with copy and system sharing`
- `fe88b54 fix(db): revoke public links when a reviewer is deleted`
- `71b616b test(api): verify complete owner-bound share snapshot projections`
- `b9700e2 fix(mobile): discard late share actions after account changes`
- `bcf9ed7 fix(web): clear obsolete quiz corrections before shared scoring`
- `147db48 test(api): prove anonymous share handler has no model or write calls`
- Final `docs: close SH1 with fresh public sharing acceptance` checkpoint is
  this commit; the resolved complete commit list is in `tmp/overnight/SH1.status`.

FRESH final gates, executed serially:

| Gate | Exact result |
| --- | --- |
| `npm run typecheck -- --force` | 8/8 tasks; 0 cached |
| `npm run lint -- --force` | 8/8 tasks; 0 cached; 0 errors / 6 existing warnings |
| API full suite | 2,166 passed / 3 existing opt-in skips; 187 files |
| Mobile full suite | 1,068 passed; 112 files |
| Shared full suite | 264 passed; 25 files, includes emitted test copies |
| Web full suite | 150 passed; 24 files |
| Standalone API build | 1/1; 34/34 generated pages |
| Standalone website build | 1/1; 19/19 generated pages; public route included |
| Standalone Android export | 1/1; 1 bundle / 35 assets |
| `npm run build -- --force` | 8/8 tasks; 0 cached; mobile 8 web / 1 Android / 1 iOS bundles |
| Diff/staged whitespace checks | 0 errors |

Additional final API typecheck/lint passed 1/1 each after the actual-handler
test was added. Initial full API was 2,165 passed / 3 skips; the final additional
boundary assertion increased it to 2,166. Focused SQL 4/4, initial SH1 API 19/19,
web 11/11, mobile 56/56 and shared link checks 2/2 passed. Subsequent full suites
include the late-owner guard and all applicable O2 scoring fixtures.

Failed first attempts are retained in acceptance: draft strict API narrowing
and emphasis type errors; focused route fixture 15 passed / 1 failed because
GET had a body; TypeScript-only test import alias error; one unsupported mobile
Copy prop; five web parser diagnostics from one malformed href template. These
were repaired and affected checks rerun. Initial lint's four new test import
warnings were removed; final six warnings predate SH1. No nondeterministic flake
observed. Vitest configuration/renderer and Metro color warnings remain in logs.
The first npm lockfile update pruned unrelated entries; only the 12-line exact
clipboard dependency addition remains. Python was unavailable; Node performed
the local lockfile cleanup.

TEMP/TMP were repo-local `tmp/overnight/sh1-temp`; logs remain under ignored
`tmp/overnight/SH1-*`. Next/Turbo telemetry was disabled, exports ran offline,
and live Quiz flags were disabled. Generated API/web `next-env.d.ts` changes
were inspected and restored. No temp output, generated bundle, credential or
private fixture was staged. Initial untracked `UI/`, `apps/mobile/.gitignore`
and `supabase/` were left alone. Provider/workflow live smoke is NOT APPLICABLE
to unchanged provider execution; remote/device work is NOT RUN by instruction.

### Owner steps remaining

Rollout and Device checks were **entirely skipped**. Apply new migrations
`20261015050000_public_reviewer_shares.sql` then
`20261015050100_revoke_deleted_reviewer_shares.sql` after canonical/SP2
prerequisites. Deploy API/website; confirm the target preview binary includes
SDK 57 `expo-clipboard` 57.0.2, or build/install a compatible preview before OTA.
Confirm the website origin (`EXPO_PUBLIC_WEBSITE_URL`, default existing documented
`https://stay-focused-ten.vercel.app`) and trusted forwarded-IP behavior.
The Vercel CLI is unavailable; installing `npm i -g vercel` is recommended for
the later owner deploy/env/log session. No Vercel CLI command ran here.

Run CIT17 sharing from both platforms, open in a private browser window, read
and take every quiz format without signing in, verify saved assistance and
Wikimedia credit/license, absent course images, sign-in returns, explicit update
with stable token, Stop sharing and deletion killing the link. Check clipboard,
native sharing, account changes and existing SP1/CQ1/QD1/SP2/SP2b behavior on the
physical device. Production revisions, applied history/live rows, Scheduler,
origin/ingress, latency and physical behavior are **UNVERIFIED (owner to confirm)**.

No clean authorized path exists to save a viewer score against another owner's
quiz after sign-in; this scope returns to the link without a write. Viewer score
ownership/copying is a follow-up. Study Assist saved exclusively on another
device is unavailable to the sharing device; cross-device synchronization is
also a follow-up. Neither gap authorizes work beyond SH1.

No remote service call, remote SQL/migration application, environment-file edit,
deployment, Cloud Scheduler action, push or outside-repository deletion occurred.

## GA1b saved course batch generation - unattended local PASS (2026-10-16)

**Status: PASS for STEP 0-3, all fresh serial gates, documentation and scoped
local commits.** Resumed the uncommitted checkpoint at `d0eb70e` after rereading
UNATTENDED rules, progress, log/status/diff, AUTOPILOT and planning evidence.
Reused GA1 audit commits `2c0a02b`/`482cb6e`; no committed product work was redone.
The owner's answers authorize saved requests and omit generation minutes.

**What changed:** owner-authenticated preview/create and pending Cancel/Retry,
source-version-unique saved requests with owner SELECT RLS/server-only mutations,
atomic membership/admission/cancellation fences, exact-current Reviewer skip,
normal quota-bound per-material jobs, and completion/global-poll recovery.
Auto off and explicitly requested past courses use this path. Preparation
failure or changed evidence ends intent without a loop; preview text never
starts generation. Mobile/web have Generate all, selection/Select all,
"Generate N reviewers", skipped titles and honest quota/capacity messages.
QD1 includes waiting requests, Cancel/Retry, normal job Retry/Open and batch
progress. Existing tokens/static controls respect Reduce Motion.

**AG1/AG2 finding:** the gap is coverage, with visibility only for admitted jobs.
`auto-reviewers/admission.ts:53` filters File/Page eligibility, `:64` requires
newer timestamp evidence, `:132` honors Auto off and `:152` baselines old
material. Limits are three/run, five/rolling day, three attempts and run budget;
mapped reviewers/preparing material are skipped. `after-sync.ts:13` excludes
past courses and `poll-trigger.ts:13` only discovers new module File/Page IDs
from complete prior evidence. Explicit saved intent fills those gaps without
changing Auto. Reviewer presence alone does not prove source freshness.

**Reuse and resume:** `canvas-preparation/orchestration.ts:107` resumes matching
requests before Auto; `notifications/canvas-poll.ts:125` recovers open requests
before current-course eligibility. Every job uses `experience/generation.ts`
and the existing transaction-serialized processing quota trigger. Timed caps
return a possible retry threshold; capacity has no promised finish time.
No new Scheduler or service is introduced. Existing Reviewer/Canvas selection,
accepted source/preparation evidence, E2 saved study estimates and SP1/CQ1/QD1/
SP2/SP2b/SH1 behavior remain intact. Full source references and acceptance matrix:
[GA1b acceptance](acceptance/ga1b-saved-course-batch-generation.md),
[ADR-034](../architecture/ADR-034-course-batch-generation.md).

**Commits:**

- `6f247f0 feat(api): persist quota-bound course reviewer batch requests`
- `2782bc3 feat(mobile): generate course reviewers with saved batch progress`
- `7a73181 feat(web): add course reviewer batches and Queue request controls`
- Accompanying `docs: close GA1b with fresh batch generation acceptance`; final
  hash and every subject are in the uncommitted `tmp/overnight/GA1b.status`.

**Gates/counts, FRESH and serial:** `npm run typecheck -- --force`,
`npm run lint -- --force`, `npm run build -- --force`: **8/8 tasks each,
zero cached**. Lint has zero errors/six existing warnings (five mobile/one web).
`npm run test --workspace @stay-focused/api`: **2,187 passed/3 existing skips,
189 files**; mobile: **1,072/1,072 in 114**; shared: **269/269 in 27**, including
existing emitted copies; web: **154/154 in 26**. Each corresponding
`npm run build --workspace` command passes **1/1**: API 34/34 static pages,
web 19/19, mobile `-- --platform android` one bundle/35 assets. Diff/staged
whitespace checks pass with zero errors. All logs use repo-local TEMP/TMP and
remain under ignored `tmp/overnight/GA1b-*`.

**Failed attempts/limits:** first typecheck 7/8 successful, one strict readonly
JSON narrowing error repaired without weakening types; mobile first full suite
1,069 passed/3 fixture failures, repaired by isolating the new child, then all
1,072 pass. Two new import-order warnings were repaired. The interrupted first
web build had no completion result; resumed build passes with exit 0.
No nondeterministic flake observed. Local path/patch discovery misses were
resolved. Generated declarations/build outputs, tmp logs, unrelated UI/,
mobile `.gitignore` and Supabase CLI temp metadata are excluded from commits.

**UNVERIFIED (owner to confirm):** production API/web/worker revisions, applied
migration history/live rows, global polling/Scheduler state, CIT17 inventory,
real latency, ingress/native compatibility and physical behavior. These are
outside unattended scope, not claims established by passing fixture tests.

**Owner steps remaining:** Rollout and Device checks were entirely skipped.
Apply `supabase/migrations/20261016010000_course_reviewer_batch_requests.sql`
via the Supabase connector using its filename as name, after preparation/quota,
CQ1, SP2 and SH1 prerequisites. Deploy API/website/Google worker as appropriate,
confirm native preview compatibility and publish OTA. Confirm existing global
poll scheduling; this run does not create/change/resume Scheduler. On CIT17,
realme and website verify Generate all/selection, exact done skip, count/skipped
confirmation, quota remainder/threshold, waiting preparation, Auto off/past-course
completion, failed preparation/Retry, pending Cancel and normal Retry/Open with
batch progress. Recheck SP1/CQ1/QD1/SP2/SP2b/SH1. The external roadmap GA1 status
is reconciled locally; no later roadmap scope is started.

No remote service call, remote SQL/migration application, deployment, email,
Scheduler action, environment-file edit, push or outside-repository deletion
occurred. The finite GA1b code endpoint is complete.


## MR1 unattended long-source reviewer recovery (2026-10-16)

**Status: PASS for STEP 0-2, fresh serial local gates, docs and scoped commits.**
Finite MR1 only on overnight/2026-10-15_feedback, baseline ed67445; no later item
was started. Bounded 12k-24k output budget (26,325 chars ->23,744), ordered
whole-block recovery after known token exhaustion, two attempts per part,
quarantined gaps with typed partial metadata and owner-reader notice, durable
receipts/reservations on every reviewer backend, and correct saved call totals.
Content filtering, legacy unknown reasons, uncertain outcomes, cancellation,
source grounding, auth/RLS/isolation and SP1/CQ1/QD1/SP2/SP2b/SH1/GA1b are preserved.

Commits:

- 747ea4d fix(engine): recover truncated reviewers with ordered source parts
- 7c226ed fix(api): resume reviewer parts with counted provider transfers
- 307000e fix(reviewer): disclose partial generation on mobile and web

Documentation closure: this commit, subject
"docs: close MR1 with fresh long-source reviewer acceptance"; final hash in
uncommitted tmp/overnight/MR1.status. All commits use the requested author.

FRESH gate counts: forced typecheck/lint/root build 8/8 tasks each, zero cached;
API 2,206 passed / 3 existing skips in 191 files; mobile 1,072/1,072 in 114;
shared 272/272 in 28 (includes emitted copies); web 154/154 in 26; engine 606
passed/0 failed evaluations; AI-first unit 20/20 in 3; provider contract 20/20.
Standalone API/web/Android builds 1/1 each, 34/34 and 19/19 static pages, one
Android bundle/35 assets. Zero lint errors/six existing warnings. Diff and staged
checks pass with zero whitespace errors. test:workflow NOT APPLICABLE: no test
files in the configured workflow-tests tree; common durable paths are tested
in the API suite and Next builds 16 workflow steps/one workflow.

First attempts are retained in [acceptance](acceptance/mr1-long-source-reviewer.md):
temporary engine config launch failed before collection (bad module path), and
the extra standalone provider-contract gate failed before assertions because a
new engine runtime barrel import broke Node resolution. The provider keeps its
existing safe error boundary; engine-side recognition fixed the contract gate
to 20/20. Final serial suites/builds reran after repair. No assertion failures or
nondeterministic flakes. Python was unavailable before an editing command wrote
anything; Node completed the edits. [ADR-035](../architecture/ADR-035-long-source-reviewer-split.md)
records the decision. External 2026-10-16 MR1 roadmap and all three planning files
were reconciled; only the original unrelated untracked UI/, mobile .gitignore
and supabase/.temp/ remain. Generated Next ambient files were restored.

The supplied production checkpoint proves incomplete output but omitted its
reason; output exhaustion is an inference, not recovered production evidence.
The original reason/token usage, deployed revisions, applied database state,
Scheduler state, production latency and physical behavior are **UNVERIFIED
(owner to confirm)**. Code provenance with file:line is in acceptance.

**Owner steps remaining:** Rollout and Device checks skipped entirely. Deploy
API and Google worker; distribute website/mobile code for the safe partial
notice. Then re-upload the SOC SCI 103 midterm reviewer PDF as manual material on
the realme and website, inspect completeness/source order, and check Canvas,
partial notice, Queue/cancellation and preserved features. No migration is added
by MR1; existing prior rollout prerequisites remain owner steps. No Scheduler
creation/change/resume. No remote service/provider call, SQL/application, email,
environment-file edit, deployment, push or deletion outside the repo occurred.
This MR1 run ends here.


## SA1 Study Assist unattended handoff (2026-10-16)

Status: **PASS for STEP 0-5, fresh serial gates, documentation and local commits.** Organized answers share one safe parser across mobile, website and saved public snapshots. Prompt versions and cache keys change to v2; retained v1 text stays valid, and SH1 exact-content checks admit both known versions only. Presses reveal loading, completions reveal their answer unless user scrolling/newer intent suppresses it, Reduce Motion jumps, and What is this? is first of exactly four Ask chips. Test Me structure, grounding/length limits and prior SP1/CQ1/QD1/SP2/SP2b/SH1/GA1b/MR1 behavior are preserved.

Commits:

- `ad92609 feat(shared): add safe study answer format and reveal intent`
- `5bcf15e feat(api): organize study answers and preserve share compatibility`
- `051c649 feat(mobile): reveal and format study assist answers`
- `5041c1d feat(web): reveal and format study assist answers`

Documentation closure: this checkpoint; final hash is recorded in tmp/overnight/SA1.status (no self-amend required).

Gate counts: **FRESH** typecheck/lint/root build 8/8 each, 0 cached; API 2,208 passed/3 existing skips (191 files), mobile 1,082 (115), shared 296 (30, includes emitted copies), web 164 (27); standalone API/web/Android builds 1/1 each, 34/34 and 19/19 static pages, 1 Android bundle/35 assets; diff/staged whitespace checks 0 errors. Six existing lint warnings, zero errors. Engine tests **NOT APPLICABLE** (unchanged). Failed first attempts: forced typecheck 5/8 (React fixture unknown props); API 2,203 passed/4 failed/3 skips (SH1 hardcoded v1); mobile 1,064 passed/18 failed (two old harnesses missing native frame global). All repaired and rerun green. Earlier focused parser/cache-key and test-selector draft failures are recorded in the [acceptance report](acceptance/sa1-study-assist.md); no nondeterministic flake observed.

Production revisions, live database/Scheduler state, actual provider formatting, deployed compatibility and physical behavior are **UNVERIFIED (owner to confirm)**.

**Owner steps remaining:** Rollout and Device checks are skipped entirely. Coordinate API/website and compatible preview OTA publication for v2 prompts, then tap Explain and verify immediate loading/answer reveal, bulleted answers, first Ask chip, manual-scroll suppression, Reduce Motion and website focus/keyboard on realme and website. No service call, deployment, migration application, Scheduler change, environment-file edit or push occurred. No tmp files, generated output, credentials, private fixtures or owner untracked files are committed. SA2 remains separately scoped; SA1 stops here.


## SA2 Ask about an image unattended handoff (2026-10-16)

Status: **PASS for STEP 0-4, fresh serial gates, documentation and local commits.** Image-reference Ask fetches owner/current-section bytes on the server for snapshots, figures and stored Wikimedia visuals; no client bytes/URLs. Three MiB raster cap, section text, title/attribution, honest grounding and SA1 organized answers/reveal/session caching are retained. All inline/zoom controls open the existing Ask panel with a thumbnail, the exact four static chips, typed questions and two follow-ups. Offline controls are disabled with the existing message. Shared visuals route to sign-in with the original return link and zero model calls. Existing SP1/CQ1/QD1/SP2/SP2b/SH1/GA1b/MR1/SA1 behavior remains covered; no later item was started.

Commits:

- 3a03e34 feat(shared): add image references to Study Tools Ask
- 1e46ee3 feat(api): resolve owner images for vision study answers
- 99ba4f7 feat(mobile): open image questions in Study Assist
- c886fec feat(web): add image questions to reviewer surfaces

Documentation closure: this checkpoint; final hash is recorded in tmp/overnight/SA2.status and Git history (no self-amend).

Gate counts: **FRESH** forced typecheck/lint/root build 8/8 each, 0 cached; API 2,226 passed/3 existing live skips in 192 files; mobile 1,086 in 115; shared 324 in 34 (includes emitted copies, rerun after build; pre-build 322/33); web 168 in 28; provider contract 20/20. Standalone API/web/Android builds 1/1 each, 34/34 and 19/19 pages, one Android bundle/35 assets. Diff/staged whitespace checks 0 errors. Zero lint errors/six existing warnings. Engine/workflow suites **NOT APPLICABLE** (unchanged). Rollout/Device checks **NOT RUN**, skipped entirely.

Failed first attempts are preserved in [acceptance](acceptance/sa2-ask-about-image.md): initial typecheck 6/8, three mobile state-field errors; focused API 169 passed/1 failed (snapshot id assertion); mobile 52 passed/2 failed (old offline assertions); web 35 passed/1 failed (React test selector); first full API 2,225 passed/1 failed/3 skipped (pre-render id assertion). All repaired and rerun green, including full API after final prompt wording. Focused final API 170/170 before streaming-cap addition, mobile 57/57, web 39/39. No nondeterministic flake observed. Python was unavailable before edits, so Node was used. Existing Vite future-config and test-renderer deprecation warnings remain.

[ADR-036](../architecture/ADR-036-ask-about-image.md) records owner-scoped service-client retrieval, reference identity, cap and grounding. Private buckets/locator columns remain server-only, with explicit owner/current-source/citation checks. The baseline Study Tools route has a 20/minute warm-instance guard but no durable quota/cost ledger; SA2 preserves that path rather than claiming a new ledger. No migration, dependency, native module or worker change. The external roadmap and all three current planning files are reconciled. Generated Next ambient files are restored. Original untracked UI/, apps/mobile/.gitignore and supabase/.temp/ are untouched; no tmp, generated artifacts, credentials or private fixtures are committed.

Production revisions, live database/applied migrations, Scheduler, actual provider interpretation, deployed compatibility and physical behavior are **UNVERIFIED (owner to confirm)**.

**Owner steps remaining:** Rollout and Device checks skipped entirely. Coordinate API/website and compatible preview OTA publication for the v3 contract. On a reviewer with a page snapshot, figure and Wikimedia image, check inline/zoom Ask, What is this?, What does it mean?, Explain the parts, Why is it in this lesson?, typed questions/two follow-ups/repeat cache, grounding and organized answer reveal, manual scroll/Reduce Motion, offline disabled controls and shared-link sign-in return with zero viewer AI calls. Preserve prior rollout prerequisites. No remote service/provider call, SQL/migration application, deployment, Scheduler action, email, environment-file edit, push or deletion outside the repo occurred. MR2 remains separate; this finite SA2 run ends here.


## 2026-10-16 MR2 unattended closure - PASS locally

Status: **PASS for MR2 STEP 0-3, fresh serial gates, reconciled docs and local commits.** Manual PDF/photo/DOCX/PPTX picks now go directly through upload, extraction and reviewer generation under one job ID, with the existing Queue/generation screen. Paste is unchanged. Office uses the shared bounded extractor and expected ZIP parts at the Canvas cap; legacy DOC/PPT has conversion copy. Empty Office files are verified through the actual worker to fail with the exact message, zero generation calls and no result completion. Existing page/OCR/character bounds, quotas, owner checks, leases, immutable retries, cancellation and MR1 split/replay remain.

Commits:

- 36f19a1 feat(shared): define manual Office upload policy
- 9e42184 feat(api): chain manual file extraction into reviewer jobs
- 15c351d feat(mobile): create reviewers immediately from picked files
- e96c6be feat(web): create reviewers directly from manual uploads

Documentation closure is this checkpoint; its final hash and all five commits are recorded in tmp/overnight/MR2.status and Git history (no self-amend).

Gate counts: **FRESH** forced typecheck/lint/root build **8/8 each, zero cached**. API **2,257 passed / 3 existing live skips** in 197 files; mobile **1,098/1,098** in 117; shared **334/334** in 36 including emitted copies (pre-build 329/35); web **176/176** in 29; provider contract **20/20**. Standalone API/web/Android builds **1/1 each**, 34/34 and 19/19 pages, one Android bundle / 35 assets; API compiler 18 steps / 1 workflow. Diff and staged whitespace checks: zero errors. Six existing lint warnings, zero errors. Engine suite **NOT APPLICABLE** (unchanged). Dedicated workflow runtime command with --passWithNoTests exited 0 with zero sources: **NOT APPLICABLE**, not runtime acceptance; the five mocked workflow orchestration tests pass inside the API suite. Rollout/Device checks **NOT RUN**, skipped entirely.

[Acceptance](acceptance/mr2-manual-reviewer-upload-chain.md) records exact initial failures and repairs: package type unions/accessibility, forced typechecks 6/8 then 7/8, a short retry fixture key (16 passed/1 failed), workflow import (one failed suite), and the first full mobile gate (1,096 passed/2 failed) followed by an upload-envelope fixture correction (14 passed/1 failed; then 15/15). All affected final gates are fresh and green. No nondeterministic flake observed. [ADR-037](../architecture/ADR-037-manual-reviewer-upload-chain.md) records the job-chain/database contract. The PGlite harness uses PostgreSQL sha256 as its pgcrypto digest shim, not remote Supabase. The external MR2 roadmap was updated outside the checkout; all three repository planning files are reconciled. Generated Next ambient files were restored. Owner-untracked UI/, apps/mobile/.gitignore and supabase/.temp/ remain untouched; no tmp/generated/credential/private-fixture artifact is committed.

Production API/website/worker revisions, live database rows/applied migrations/catalog, Scheduler, actual provider behavior, deployed compatibility and physical behavior are **UNVERIFIED (owner to confirm)**.

**Owner steps remaining:** Rollout and Device checks skipped entirely. Apply the forward-only migration **20261016000100_manual_reviewer_uploads.sql**; coordinate API, website, Google worker and compatible preview OTA publication. Then device-check DOCX/PPTX straight from file to reviewer, photo straight to reviewer, PDF page/blank accounting, Queue/progress, reconnect after 202, empty-file and legacy conversion messages, cancellation and paste parity. Preserve prior rollout prerequisites. Vercel CLI is not installed; for the owner's later rollout, installing it with `npm i -g vercel` is strongly recommended for env pull/deploy/logs. No remote Supabase/Vercel/Google Cloud/Canvas/Resend call, remote SQL/migration application, Scheduler action, deployment, email, environment-file edit, push or deletion outside the repo occurred. IM1 remains separate; this finite MR2 run ends here.

## IM1 unattended checkpoint - STOPPED (2026-10-16)

**Status: STOPPED at STEP 0**, baseline c74d94f on overnight/2026-10-15_feedback; SA2 and MR2 status files both PASS. SDK 57-compatible expo-media-library 57.0.5 requires full read/write authorization for iOS album lookup/creation. IM1 requires write-only authorization plus the Stay Focused album. Both the current and legacy native implementations enforce the conflicting requirement. Per the UNATTENDED STOP rule, no later code step was performed. Inspection-only dependency/lockfile edits were reverted; no app code, native plugin, migration or dependency addition is committed.

**Exact question for the owner:** May IM1 request full photo-library access on iOS so it can save to the Stay Focused album, or should this slice explicitly limit named-album saving to Android and keep iOS save behavior deferred?

**Share root cause:** no Android-specific hide branch or canonical-ID loss was found. Server summaries normalize generation aliases to artifact: IDs, and device copies preserve them. The eager expo-clipboard import resolves a required native module at import time, so an older APK missing ExpoClipboard is a plausible cause; installed APK contents and physical diagnosis remain **UNVERIFIED (owner to confirm)**. Guarded clipboard loading/system-share fallback is still pending after the STEP 0 stop.

**Commits:** no implementation commits. This footer, acceptance evidence and reconciled planning files form the local documentation checkpoint, planned subject: docs: record IM1 permission contradiction and unattended stop. Its resulting hash is written to tmp/overnight/IM1.status and IM1.progress after commit, following the repository convention against self-referential commit hashes. The external roadmap IM1 status is also updated.

**Gate counts:** FRESH git diff --check and git diff --cached --check: 0 whitespace errors (verified immediately before commit). Typecheck, lint, API/mobile/shared/web suites and API/web/Android builds: **NOT RUN**, 0 tasks/tests/builds executed, because the run stopped before implementation. No test flake or failed test attempt. npm package inspection succeeded; an unavailable Python cleanup command made no changes, then Node restored the two dependency files. Initial PowerShell source-search glob errors were corrected. No passing historical SA2/MR2 suite is claimed as IM1 evidence.

**Owner steps remaining:** resolve the exact question, then resume STEP 1?4, add the native module ADR and complete all fresh serial gates. **Rollout and Device checks were skipped entirely:** new preview APK (clipboard + media-library native modules), website publication, then realme gallery saves for snapshot/figure/Wikimedia and Android Share/offline/denial/settings/clipboard-fallback checks. Deployed revisions, live database/applied migrations/Scheduler/provider state and real gallery/device behavior are **UNVERIFIED (owner to confirm)**. No Supabase/Vercel/Google Cloud/Canvas/Resend call, remote SQL, migration application, deployment, Scheduler action, environment-file edit, email or push occurred. Existing owner untracked paths were left alone; no later roadmap item was started.

Full file:line inventory and native-source evidence: [IM1 acceptance](acceptance/im1-image-save-share.md).


## IM1b unattended local completion (2026-10-16)

**Status: PASS for code STEP 0-4, fresh serial gates, documentation and local commits.** Reused IM1 STEP 0 evidence at b972c5e; branch overnight/2026-10-15_feedback and SA2/MR2 PASS were confirmed with a clean tracked baseline. Owner answered the previous permission STOP. Mobile/shared implementation is **1959a0e feat(mobile): save reviewer images and guard native sharing**; website is **d8544f9 feat(web): download owner reviewer images from zoom viewers**. This footer and reconciled docs form the final docs checkpoint, subject **docs: close IM1b local image save and share acceptance**; its exact resulting hash is in tmp/overnight/IM1b.status/progress (no self-referential hash amendment).

Save is in each existing owner zoom viewer beside Ask. SDK-compatible media-library 57.0.5 uses write-only photo permission; Android direct named-directory creation saves into Stay Focused without a read-permission lookup, while iOS saves add-only directly into Photos with no album calls. Cache/download checks and cleanup precede insertion; denial offers Open settings. Mobile/web share safe title/section/kind names, adding Wikimedia source title and attribution/license confirmation. Shared pages gain no private Save control. ADR-038 records permissions, platform difference and APK requirement.

**Share root cause:** there is no Android hide branch or canonical-ID loss in supported owner online/device-copy paths. Eager expo-clipboard native loading was a plausible missing-module failure in an older APK, not a confirmed device diagnosis. Guarded lazy import handles module evaluation failure, copy rejection and false; both Share link and Copy use the system sheet fallback with **Link ready to share**, retaining the visible link. SH1 owner/server-ID gating and offline device-copy notice/disabled state remain. No prior SP1/CQ1/QD1/SP2/SP2b/SH1/GA1b/MR1/SA1/SA2/MR2 behavior is intentionally changed.

**Gate counts (all FRESH, serial commands):** npm run typecheck -- --force **8/8, 0 cached**; npm run lint -- --force **8/8, 0 cached, 0 errors, 6 existing warnings**; npm run test --workspace @stay-focused/api **2257 passed / 3 existing live skips, 197 files**; mobile **1119 passed, 120 files**; shared **337 passed, 37 files including existing emitted copies**; web **179 passed, 30 files**. npm run build --workspace @stay-focused/api **1/1, 34/34 pages**; web **1/1, 19/19 pages**; mobile -- --platform android **1/1, 1 bundle / 35 assets**. AUTOPILOT npm run build -- --force **8/8, 0 cached**. git diff --check and git diff --cached --check **0 whitespace errors** at commit checkpoints. TEMP/TMP were repo-local; validation logs/artifacts are uncommitted under tmp/overnight.

**First attempts preserved:** focused mobile 50 passed/5 failed (missing Download icon in an existing mock), then 81 passed/1 failed (new assertion stringified circular React props). First full mobile 1117 passed/1 failed (new system-share mock returned undefined instead of its Promise contract); corrected full pass 1118, then final false-return coverage yields 1119. First lint introduced test import-order warnings; corrected closure has only six existing warnings. Installed native-source review avoided Android album lookup's read requirement. Unrelated npm lock churn was removed. Some PowerShell glob-based read searches required directory-scoped retries; no mutation resulted. No nondeterministic test flake. Focused web 32/32 and shared filename 3/3 also passed. Full suite/build results are distinct from production/device acceptance.

**UNVERIFIED (owner to confirm):** deployed revisions, installed APK contents, actual photo permissions/gallery behavior, iOS behavior, physical Share diagnosis, live database/applied migrations/Scheduler and providers. No Supabase/Vercel/Google Cloud/Canvas/Resend call, remote SQL, migration application, deployment, Scheduler action, environment-file edit, email or push occurred. No new migration; no later roadmap item started. Owner untracked UI/, apps/mobile/.gitignore and supabase/.temp/ were left alone. Root planning files and external IM1 roadmap are reconciled; historical IM1 STOP evidence is retained and superseded by the owner answer.

**Owner steps remaining:** **Rollout and Device checks were skipped entirely.** Build/install a new preview APK containing expo-clipboard and expo-media-library (OTA alone cannot add native modules), publish the website, then check on realme: page snapshot/figure/Wikimedia saves reach Stay Focused, attribution, Share visibility, offline disabled copy, denied permission/Open settings and missing-clipboard fallback. Verify iOS uses only add-only permission and Photos without an album/full-access prompt. Prior slices' separate rollout debt remains unchanged.

Evidence: [IM1b acceptance](acceptance/im1b-image-save-share.md), [ADR-038](../architecture/ADR-038-reviewer-image-gallery-saving.md), [original IM1 STEP 0](acceptance/im1-image-save-share.md).

## RT1 topic levels and Expound complete locally (2026-10-16)

**PASS for unattended RT1 STEP 0-4, fresh serial gates, docs and local commits.** Each mobile/website topic has compact Original / Simplify / Explain simply controls and collapsible Expound. Canonical content stays unchanged; Original is immediate and has no model action. Server-read, owner-scoped sections feed source-only SA1 formatted answers and grounding labels. Persistent owner/exact-content caches support offline reuse; uncached controls show the existing offline reason. Reading choices last only for the session; canonical search restores Original. Shared snapshots remain unchanged, so shared topic controls route to sign-in and make no model calls.

Study Tools' existing 20/minute warm-instance admission and provider configuration are reused. New bounded server dedup/cache is per warm instance (400 entries / 30 minutes), not a durable global quota/cache. Context is capped at 18,000 characters without truncation; results at 6,000 characters. No migration, dependency or native module is added. All prior SP1/CQ1/QD1/SP2/SP2b/SH1/GA1b/MR1/SA1/SA2/MR2/IM1b local regressions remain green.

FRESH forced typecheck/lint/root build **8/8 each, zero cached**; API **2,268 passed / 3 existing live skips** (199 files), mobile **1,129** (122), shared **345** (39 including existing emitted copies), web **188** (32). Standalone API/web/Android builds **1/1 each**, 35/35 and 19/19 pages, one Android bundle / 35 assets. Zero lint errors, six existing warnings. Repaired first attempts are recorded in acceptance; no nondeterministic flake. Implementation commits: **959424e**, **d0db258**, **dc4f381**, **06b9385**, **f1b09f1**, **ba81163**.

**Owner steps remaining:** Rollout and Device checks were skipped entirely. Publish API/website and compatible preview update, then check topic levels, instant Original/cache switching, organized Expound/collapse, offline, canonical search, manual scrolling/Reduce Motion and shared sign-in routing on realme. Predecessor IM1b APK and MR2 migration/worker rollout remain owner work. Deployed revisions, actual provider output, live database/applied migrations/Scheduler and physical behavior are **UNVERIFIED (owner to confirm)**. No remote service call, deployment, migration application, environment-file edit, Scheduler action, email or push occurred. This finite run ends at RT1; LS1/RB4 were not started.

[Acceptance](acceptance/rt1-topic-levels.md); [ADR-039](../architecture/ADR-039-topic-level-study-tools.md).

Commits:

- 959424e feat(shared): define section topic levels and cached assistance
- d0db258 feat(api): generate owner-scoped cached topic explanations
- dc4f381 test(shared): verify topic cache and Original contracts
- 06b9385 test(api): verify topic isolation caching and admission
- f1b09f1 feat(mobile): add cached topic levels and collapsible Expound
- ba81163 feat(web): add topic levels Expound and shared sign-in controls

The docs closure commit is this entry’s containing commit; its final hash is recorded in tmp/overnight/RT1.status. See acceptance for exact commands, gate evidence, repaired first attempts and owner-only remaining checks.

## 2026-10-16 LS1 Library sorting - unattended PASS

Status: **PASS for code STEP 0-3, fresh serial gates, documentation and local commits**. Shared deterministic sorts, owner-scoped synced Canvas sourcePosition, per-device sort/open history, and compact accessible mobile/browser controls are complete. Pins stay first; sorting uses loaded summaries and never refreshes. No migration, dependency or native module added.

Commits: d027f2b (shared), 45c6d19 (API), 451eabb (mobile), c5f1f6b (web). This documentation closure commit is recorded after creation in tmp/overnight/LS1.status; no push.

FRESH: npm run typecheck -- --force, npm run lint -- --force and npm run build -- --force each **8/8 tasks / 0 cached**; tests --workspace @stay-focused/api **2,280 passed / 3 existing live skips / 200 files**, @stay-focused/mobile **1,136 / 123**, @stay-focused/shared **358 / 41 including emitted copies**, @stay-focused/web **195 / 34**. Standalone API/web/Android builds **1/1 each** (35/35 pages, 19/19 pages, 1 Android bundle / 35 assets). Diff/staged checks FRESH exit 0. Zero lint errors, six existing warnings. All repaired failures/counts and one interrupted run are preserved in [LS1 acceptance](acceptance/ls1-library-sorting.md); no nondeterministic flake. [ADR-040](../architecture/ADR-040-library-sort-orders.md). Generated ambient declarations restored; owner untracked UI/, apps/mobile/.gitignore and supabase/.temp/ untouched. No remote service call, deploy, remote SQL/migration application, env-file edit, Scheduler action, email or push occurred.

### Owner steps remaining

Rollout and Device checks were skipped entirely (NOT RUN). Publish API/website and compatible preview update, then validate Library/course orders, Canvas positions, pins, reviewer/quiz/draft recently-opened changes and restart persistence on mobile and browser. Older summaries fall back to unpositioned creation order until refreshed. LS1 has no native/migration addition; inherited IM1b APK and MR2 migration/worker rollout remain owner work. Deployed revisions, actual synced positions, database/applied migrations, Scheduler and physical behavior are **UNVERIFIED (owner to confirm)**. No next slice/RB4 was started.


## INT1 unattended local integration - PASS (2026-10-17)

Finite scope: INT1 STEP 0-3, fresh serial gates, docs and local commits. Branch overnight/2026-10-15_feedback; initial HEAD a967460, 35 local commits beyond ed67445. Fetch github succeeded first try; PR #12=8fcdf16, main=ed67445, visual-readiness=f3dd833; merge-base ed67445. Tracked tree was clean; owner's UI/, apps/mobile/.gitignore and supabase/.temp/ are preserved.

Commits: efad5c9 (merge PR #12); 979f120 (only f3dd833, -x); 2ddb9a8 (combined proof); 21e685a (exact PR #12 grouping test restored); closing docs: close INT1 commit contains this footer (exact final hash is in Git and ignored tmp/overnight/INT1.status). All authors galaxymaxp <omgraythekid@gmail.com>; no push.

Merge conflicts: LibraryScreen.tsx and LibrarySortControl.tsx take PR #12's mobile behavior; mobile/web listPreferences.ts use identical PR #12 DTOs; useListPreferences.ts retains PR #12 callbacks plus initial-hydration protection; screens.test.ts is the unchanged PR #12 suite. docs/current-state.md and docs/roadmap.md keep both histories with current local-combination status; current_sprint auto-merged both histories. Cherry-pick conflicts: ExternalVisual.test.ts combines existing Ask/Save tests and diagnostic redaction coverage; all three current planning docs retain their integrated versions. Nonconflicting release acceptance history is retained. Full per-path account is in acceptance.

Library decision: PR #12 wins: pill beside update status; compact selected 48-point rows; all six exact options/values mirrored by one website select with contextual filtering; owner/course preferences, complete/offline cached material sequences, unlinked work last, Sort disabled during selection, alphabetical displayed cleaned course titles. Removed LS1 separate sort/open logic and unused sourcePosition server field/projection/tests. Stored prefs from either line parse safely. Other MR1/SA1/SA2/MR2/IM1b/RT1 behavior remains, including first What is this? and image Ask across both platforms. f3dd833's figure heartbeat/15-second read, redacted diagnostics and included cold-notification fixes remain.

FRESH gate counts: root forced typecheck/lint/build 8/8 each, zero cached; shared 350/350 (40 files); API 2,268 pass + 3 existing live skips (199); mobile 1,202/1,202 (130); web 203/203 (35); Canvas 75/75 (1); OCR 27/27 (3); engine 606/606 evaluations, zero failures. Lint zero errors/six existing warnings. API/web pages 35/35 and 19/19; Android/iOS/web exports, 68 assets. Generated next-env.d.ts files restored. FRESH diff and staged-diff hygiene pass. Root gates tested production code at 2ddb9a8; subsequent test-only restoration 21e685a has fresh mobile typecheck/lint/full tests. Database tests NOT APPLICABLE (no script). No CACHED acceptance claim.

Failed attempts retained: preliminary typecheck 5 successful/8, zero cached, failed on in-progress stale LS1 references/missing hook; repaired 8/8. Website focused attempt 14 pass/2 fail (new tests used hidden identities), corrected to displayed titles then 16/16. Full mobile first attempt 1,201 pass/1 fail (old LS1 grouping contract), restored exact PR #12 test then 1,202/1,202. Extra EOF blank fixed before merge. Initial python alias/writer launch errors made no edits; Node writers succeeded. Existing Vite CommonJS/configLoader warning remains. No nondeterministic flake observed. Ten initially audited PR #12 files plus restored libraryPresentation now all match PR #12; focused image/Ask mobile 81 and web 32 tests passed. No validation artifacts, credentials or private fixtures committed.

UNVERIFIED (owner to confirm): PR #12 CI green at 8fcdf16/run 39035996757 and Realme OTA are supplied historical evidence; live CI was not queried. Nothing beyond the reported Realme OTA is deployed. Deployed API/web/worker revisions, actual provider/device behavior, database rows/applied migrations and Scheduler are unverified. Only git fetch contacted a remote; no Supabase/Vercel/Google/Canvas/Resend call, remote SQL, migration application, deploy, environment-file edit, Scheduler action, email or push occurred.

**Owner steps remaining:** Rollout and Device checks skipped entirely; finish later roadmap slices before RB5 owner release/device acceptance. The old codex-fullsend-20261016.md is untouched. INT1's external roadmap status and current-state/roadmap/sprint are reconciled; EV1 and later items were not started. No unanswered owner decision blocks this completed code scope. Acceptance: docs/ai/acceptance/int1-local-integration.md. Progress/status/logs are ignored under tmp/overnight/INT1*.

## EV1 unattended mobile external references - PASS (2026-10-17)

Status: PASS for the finite unattended EV1/N2 code scope: STEP 0-2, fresh serial gates, documentation and local commits. Branch overnight/2026-10-15_feedback; baseline 2bf02f8. The expected untracked UI/, apps/mobile/.gitignore and supabase/.temp/ are preserved. No later roadmap item, including IM2, was started.

Commits: 239a0ab test(mobile): reproduce missing external references; a9c1d7f fix(mobile): match website external reference visibility. Closing docs: docs: close EV1, the commit containing this footer (final hash in Git and ignored tmp/overnight/EV1.status). All authors galaxymaxp <omgraythekid@gmail.com>; no push.

Root cause in code: mobile coupled external visibility to source discovery and snapshot eligibility instead of displayed source URLs, with a batch-wide parser failure capable of hiding every valid reference. Snapshot/figure components now report actual inline images; the reader uses that state for precedence without waiting for a snapshot probe. A malformed section is omitted without discarding validated peers or cancelling batch polling. The exact EXTERNAL_VISUAL_LABEL, attribution and EXTERNAL_IMAGE_HEADERS remain, along with strict URL/license/dimension/attempt validation, owner/auth/offline guards, source-first behavior, bounded batch polling and explicit replacement. Temporary reviewer.* runtime/load diagnostics were removed. Caption visibility and image viewer behavior are unchanged. No API/web/shared code or serializer, migration, dependency or native module changed.

FRESH gate counts: forced root typecheck/lint/build 8/8 each, zero cached; mobile 1,209/1,209 tests in 130 files; focused reproduction regression 87/87 in 5 files; standalone API and Android builds 1/1 each. API/web builds generate 35/35 and 19/19 pages; Android export one bundle/35 assets; root Android/iOS/web exports include 68 assets. Lint has zero errors/six existing warnings. Diff and staged-diff hygiene PASS. Generated Next declarations restored. API/web/shared tests NOT APPLICABLE (unchanged workspaces/serializers). No CACHED acceptance claims.

Failed attempts: deliberate red reproduction at 239a0ab had 7 failed/80 passed in 4 failing/1 passing files, then 87/87 green after the fixes. Every verification gate passed on its first gate attempt; no nondeterministic flake was observed. The unavailable Python launcher during doc preparation was replaced with Node. Existing Vite configLoader/CommonJS and Expo color-environment warnings remain. Full STEP 0 candidates, serializer comparison and acceptance matrix: docs/ai/acceptance/ev1-mobile-external-references.md. Logs/progress/status are ignored under tmp/overnight/EV1*; no validation output or private fixture is committed.

UNVERIFIED (owner to confirm): deployed revisions, actual stored visual rows, applied migrations, database/Scheduler state, provider/image egress and physical-device root cause. The offline code evidence proves display/parser failures; it cannot establish which occurred on Realme. No deployment, remote service/SQL call, migration application, environment-file edit, Scheduler action, email, fetch or push occurred.

**Owner steps remaining:** Rollout and Device checks were skipped entirely (NOT RUN). Publish the reviewed mobile fix through the owner's normal release flow. RB5 on Realme: open a reviewer section without a course image and with a found Commons visual; verify the image, exact external label and attribution, then confirm source-image precedence and offline behavior. Confirm actual deployed versions and the live state listed above. No unanswered owner question or approval request blocks this completed code-only slice. Stop at EV1; IM2 and later work remain untouched.

## RX1 unattended reviewer header - PASS (2026-10-17)

Status: PASS for RX1/N3 STEP 0-2, fresh serial gates, documentation and local
commits. Baseline 7d503dd after INT1 and EV1, branch
overnight/2026-10-15_feedback. Initial tracked tree was clean; expected untracked
UI/, apps/mobile/.gitignore and supabase/.temp/ remain untouched. This run ends
at RX1; no later roadmap slice was started.

Commits: 0ce5db6 feat(mobile): put reviewer Export and Share in one row;
docs: close RX1 is the closing commit containing this footer (final hash in Git
and ignored tmp/overnight/RX1.status). Both use the required author
galaxymaxp <omgraythekid@gmail.com>. No push.

Chosen layout is the explicit prompt order: title -> equal-width secondary
Export/Share row -> review-time/topics metadata -> Generate Quiz hero -> hint.
Generate Quiz retains its primary styling. ReviewerHeader is used by the live
reader and tested with the actual Action/Copy/Share trigger against inert native
hosts. Optional Action wrapper style and ShareReviewerMenu triggerStyle preserve
the menu, owner key, offline state, clipboard fallback and sharing behavior.
Export fills the row for non-artifact IDs. Both targets stay at least 48 points;
font scale below 2 keeps one row, 2+ stacks full-width buttons. Labels have no
line limit or fixed height. Source text and accessibility defaults are unchanged;
focus order is Export then Share. No dependency, native module or migration added.
Website already places Share, Save to file and Generate Quiz in div.row with
display:flex, so STEP 2 requires no website change or web test.

FRESH serial gate counts:

- npm run typecheck -- --force: 8/8 tasks, zero cached on retry.
- npm run lint -- --force: 8/8 tasks, zero cached; zero errors, six existing
  warnings (five mobile import-order warnings, one web unused useMemo).
- npm run test --workspace @stay-focused/mobile: 1,216/1,216 tests, 131/131 files.
  Header/Share/missing-clipboard suites have 14 tests, including seven new header
  cases; the initial focused run also passed 14/14 in 3 files.
- npm run build --workspace @stay-focused/api: PASS, 35/35 pages.
- npm run build --workspace @stay-focused/mobile -- --platform android: PASS,
  one Android bundle and 35 assets.
- npm run build -- --force (AUTOPILOT.md): 8/8 tasks, zero cached; API/web pages
  35/35 and 19/19, Android/iOS/web exports with 68 assets.
- git diff --check and git diff --cached --check: PASS. Generated API/web
  next-env.d.ts changes inspected and restored. No CACHED acceptance claim.

First failed gate attempt is retained: forced typecheck exited 2 with 7/8 tasks
successful, zero cached, one mobile test-only TS2322. The test fixture inferred
string metadata and rejected null; ComponentProps<typeof ReviewerHeader> fixes
the fixture without weakening production types. Fresh retry passed. All later
gates passed on their first attempts. No nondeterministic flake observed. Existing
Vite configLoader/CommonJS and Expo color-environment warnings remain. Web/API/
shared tests are NOT APPLICABLE because those workspaces did not change. Final
gates tested the exact code tree committed at 0ce5db6; later edits are docs only.
Full acceptance: [RX1 report](acceptance/rx1-reviewer-header.md). Planning files
are reconciled; logs/progress/status remain ignored under tmp/overnight/RX1*.

UNVERIFIED (owner to confirm): deployed revisions and physical narrow-screen,
large-font and screen-reader behavior. Native-host render assertions establish
the layout contract, not measured Yoga/device acceptance. No deployment, remote
service/SQL call, migration application, environment-file edit, Scheduler action,
email, fetch or push occurred.

### Owner steps remaining

Rollout and Device checks were skipped entirely (NOT RUN). Release the reviewed
mobile change through the normal owner flow. RB5 on Realme: open a reviewer and
confirm Export/Share are equal buttons directly under the title, metadata follows
the row and Generate Quiz remains primary. Verify narrow/320 dp and large-font
layout, Export-before-Share focus order, existing export/share behavior, offline
Share disabling and full-width Export for non-artifact reviewers. Confirm the
actual deployed revision. No unanswered owner question blocks local closure.


## IM2 unattended reviewer images (2026-10-17)

Status: **PASS for the finite unattended IM2/N4 code scope, fresh serial gates,
documentation and local commits.** Baseline 1a9d3f9 after INT1/EV1/RX1; branch
overnight/2026-10-15_feedback. Initial tracked tree was clean. Expected untracked
UI/, apps/mobile/.gitignore and supabase/.temp/ are preserved. Endpoint is IM2;
no later roadmap slice was started. The referenced overnight roadmap file was
missing locally; the full prompt supplied the scope without a code contradiction.

Commits (author galaxymaxp <omgraythekid@gmail.com>, no push):

- 93dea65 feat(mobile): show image details on opening the viewer
- 13833e9 feat(mobile): scroll and pull down to close image viewers
- 11fb0ee feat(web): reveal image details in scrollable dialogs
- 739d80b test(mobile): retain reader contracts with the shared image viewer
- 311cc58 fix(mobile): isolate image touches from the reader scrubber
- docs: close IM2 is the documentation commit containing this footer; final
  hash is in Git and ignored tmp/overnight/IM2.status.

Chosen reveal pattern: **opening an image reveals its details inside the viewer**
on every mobile/web surface; no Details toggle. Grounding labels stay visible.
External title, credit/Own work, license, Commons/source and legal-license link
are hidden before opening and directly reachable when open. Thumbnail accessible
names and 48-point mobile targets remain; Ask/Save keep exact targets, attribution,
headers, permission policy and offline behavior. Source precedence remains intact.

Mobile shares a full-screen ImageViewer Modal with scrollable image/details/actions.
ZoomablePage retains pinch/double-tap/bounded pan, permits native scroll takeover
at zoom 1, and keeps zoomed pans away from dismissal. A downward gesture starting
at top/zoom 1 closes at 120 dp, or at least 24 dp with velocity >=0.9 dp/ms.
Pinch, upward/horizontal intent, leaving the top, cancellation and stale flick
velocity prevent dismissal. All raw touch phases stop before reaching the reader
edge scrubber. Android back/Close remain available; Reduce Motion removes Modal
animation, translation and spring. Web dialog and enlarged image scroll at all
slider zooms; native Esc is unprevented, Close/backdrop close, and close clears
details. Bounds/target checks preserve clicks inside the content and padding.
No dependency, native module, API/schema/migration or provider change.
[ADR-041](../architecture/ADR-041-reviewer-image-viewer.md) records the pattern.

FRESH final serial gates, tested code 311cc58:

- npm run typecheck -- --force: 8/8 tasks, zero cached.
- npm run lint -- --force: 8/8 tasks, zero cached; zero errors, six existing
  warnings (five mobile import-order, one web unused useMemo).
- npm run test --workspace @stay-focused/mobile: 1,239/1,239 tests, 133/133 files.
- npm run test --workspace @stay-focused/web: 204/204 tests, 35/35 files.
- npm run build --workspace @stay-focused/api: PASS, 1/1 build, 35/35 pages.
- npm run build --workspace @stay-focused/mobile -- --platform android: PASS,
  1/1 export, one Android bundle and 35 assets.
- npm run build -- --force (AUTOPILOT): 8/8 tasks, zero cached; API/web 35/35
  and 19/19 pages; Android/iOS/web exports, 68 assets.
- git diff --check, git diff --cached --check and full task diff: PASS.
  Generated API/web next-env.d.ts changes inspected and restored.

Failed attempts retained: focused mobile 49 passed/1 failed (old always-visible
attribution expectation), web 3 passed/1 failed (React children array comparison),
root lint 7/8 tasks (new test's react/no-children-prop), full mobile 130 passing
files/3 import failures with 1,186 collected tests passing (native safe-area context
needed stubs). All repaired within scope. StudyAssistSheet's attribution assertion
now checks hidden text; all source precedence/discovery/offline assertions remain.
SourceFigures permits responder takeover at zoom 1 and rejects it when zoomed.
Retries passed; no nondeterministic flake observed. A preliminary all-green cycle
was repeated after the explicit touch boundary; final acceptance uses no cached
results. Existing Vite CommonJS/config-loader and Expo color-env warnings remain.
API/shared tests NOT APPLICABLE (unchanged). Preparation tool/path errors and the
full matrix are in [IM2 acceptance](acceptance/im2-reviewer-images.md). Planning
files are reconciled. Logs/progress/status are ignored under tmp/overnight/IM2*.

UNVERIFIED (owner to confirm): deployed revisions, native/browser interaction,
physical gesture arbitration/accessibility, DB rows/applied migrations and Scheduler
state. Local native-host assertions and native dialog semantics are not physical
or real-browser acceptance. No deploy, push, fetch, remote service/SQL call,
migration application, environment-file edit, Scheduler action or email occurred.

### Owner steps remaining

Rollout and Device checks were skipped entirely (NOT RUN). Release the reviewed
mobile/website changes using the normal owner flow; IM2 adds no native module,
while inherited IM1b still needs its compatible native gallery baseline. RB5 on
Realme: caption/details only after tap; external-reference/course grounding always
visible; license/source links directly reachable; tall content/actions scroll;
pull-down only at top and zoom 1; pinch/double-tap/zoomed pan; Android back/Close;
Reduce Motion; no viewer interaction with reader edge swipe/scrubber; Ask/Save.
Website: confirm scrolling at all zoom levels and Esc/Close/backdrop dismissal.
Confirm deployed revisions. No unanswered owner question blocks local closure.


## WG1/N5 unattended website Generate layout - PASS (2026-10-18)

Status: **PASS for the finite local code scope**. STEP 0-2, tests, fresh serial
gates, documentation and local commits are complete on
`overnight/2026-10-15_feedback`; baseline fdf1937 includes required 1a9d3f9.
Only the three allowed unrelated untracked paths were present and are retained.

Commits:
- ace4cb2 fix(web): repair Generate layout and course options
- f485a2f test(web): check Generate layout at five viewport widths
- docs: close WG1 (the documentation commit containing this footer; its final
  hash is recorded in tmp/overnight/WG1.status).

Generate search and connection link wrap; header actions clear the title;
breadcrumb links/current text truncate on one line; batch controls use shared
button sizing and pane padding; row cards stretch equally; detail metadata wraps.
Generate/Canvas share a secondary Course options disclosure, with aria-expanded,
Escape returning focus, outside pointer/focus dismissal and the unchanged move
request. Open popovers do not change card height; Canvas list overflow permits
its final popover action to remain clickable.

Sync status choice: **CanvasRefreshStatus below the heading** is the single
in-flight message while global refresh runs. A per-course busy button retains
its spinner, disabled and aria-busy state, without duplicate Syncing text. Local
sync text is visible when global refresh is idle. No transport/polling, selection,
auth, API, mobile, dependency, schema or migration semantics changed.

FRESH final gates, serial, code f485a2f:
- npm run typecheck -- --force: 8/8 tasks, zero cached.
- npm run lint -- --force: 8/8 tasks, zero cached; zero errors, six existing warnings.
- npm run test --workspace @stay-focused/web: 209/209 tests, 37/37 files.
- npm run build --workspace @stay-focused/api: 1/1, 35/35 pages.
- npm run build --workspace @stay-focused/web: 1/1, 19/19 pages.
- npm run build -- --force (AUTOPILOT): 8/8 tasks, zero cached; API/web
  35/35 and 19/19 pages, Android/iOS/web exports and 68 assets.
- git diff --check and git diff --cached --check: PASS.

FRESH focused render/batch tests: 8/8 (3 files), retaining course-batch.test.ts.
FRESH local Playwright: 20/20 Generate/course/material/Canvas viewport checks at
1440, 1024, 768, 390 and 360 px; 10/10 mocked existing move-course requests;
170 intercepted API requests, zero unexpected requests/runtime errors. Distinct
text-control intersections, horizontal page scroll, equal card heights, button
padding/height, stable disclosure geometry, Esc/outside click, aria-expanded,
single sync and final Canvas popover clickability pass. Screenshots/report/logs
are ignored under .local/wg1/; rerun: node apps/web/scripts/wg1-layout-check.mjs.

Failed first attempts retained: focused render 2 failed/6 passed (Next Link
needed a Node-renderer mock); isolated web typecheck TS2769 (test callback
returned boolean). Two initial browser runs stopped after one passed check on
same-heading font-range false positives; checker now compares distinct text
nodes and clips actual overflow bounds. All repaired before final gates, with
no nondeterministic flake. Python launcher was unavailable for an edit attempt;
Node applied the edits. No final gate failed. Generated API/web next-env.d.ts
changes were inspected and restored. Existing Vite notice/lint warnings remain.
API/mobile/shared unit tests NOT APPLICABLE (unchanged).

UNVERIFIED (owner to confirm): deployed revision, owner phone/browser acceptance,
live DB rows/applied migrations and Scheduler state. Referenced overnight roadmap
file is missing; complete WG1 prompt supplies scope without a code contradiction.
No remote Supabase/Vercel/Google/Canvas/Resend call, deployment, SQL/migration
application, environment-file edit, Scheduler change, email or push occurred.
All browser API/auth responses were fictional and intercepted; fallback origins
are loopback. No question blocks local closure. Planning files are reconciled.
See [WG1 acceptance](acceptance/wg1-generate-layout.md).

### Owner steps remaining

**Rollout and Device checks skipped entirely (NOT RUN).** Owner reviews/publishes
the website through the normal release flow, confirms the deployed revision and
performs RB5 Generate at narrow phone-browser and resized desktop widths. Check
search/link wrapping, breadcrumb/action separation, batch controls, course cards,
Course options on Generate/Canvas, detail metadata and single sync progress.
This run ends at WG1; no later roadmap task was started.


## FX1 unattended checkpoint ? STOPPED (2026-10-18)

**Status: STOPPED during STEP 0, before application edits.** FX1's unattended
rule 3 requires a stop if code contradicts a prompt assumption. The proposed
format/size explanation says the server stores original Commons files, but
`commons.ts:73` already selects `info.thumburl`, line 75 uses thumbnail
dimensions and line 91 requests 1200 px thumbnails. Existing tests assert raw
SVG/oversize/foreign-host rejection and thumbnail-host normalization. This is
code evidence, not proof that the device failure has been fixed. Both reported
FULLSEND failures remain unresolved; no root cause is claimed.

**Commits:** fetched expected `github/main` 0d7bfed and merged it without
conflicts as **cb4df08** ? `merge: bring fullsend 2026-10-18 release fixes from main`.
The subsequent `docs: record FX1 diagnostic stop` checkpoint contains this
footer and reconciled current state/roadmap/sprint/FULLSEND acceptance. Its
actual hash is recorded in `tmp/overnight/FX1.status` and Git history after
commit, rather than recursively embedded here. Both use author galaxymaxp
<omgraythekid@gmail.com>. No push. Unrelated UI/, apps/mobile/.gitignore and
supabase/.temp/ remain untracked and untouched.

**FRESH verification:** post-merge `npm ci` exit 0, **1,488 packages added,
1,497 audited** with repo-local TEMP/TMP. npm reported **33 advisories
(11 moderate, 22 high)** and deprecation warnings; no dependency repair was
attempted. Documentation `git diff --check` and staged diff check pass
(exit 0). Gate counts: **0/7 application commands run**; forced root
typecheck/lint/build and shared/API/mobile/web suites are each **NOT RUN**
because the mandatory earlier STOP overrides them. No test counts or fresh
application acceptance are claimed. No test flake observed; suites did not run.
First documentation-edit attempt could not start because Python is unavailable;
the Node.js retry succeeded. No application checks failed.

**Evidence and UNVERIFIED:** source-figure and snapshot image bytes use
600-second signed storage URLs, with no bearer header needed for those bytes;
external bytes use the allow-listed Commons image plus the stale 2.1.0
User-Agent. Save hides HTTP/MIME/empty/module/native exceptions; its native
write is awaited before cleanup. Android's current initial-file album path and
iOS add-only decision are recorded in ADR-038. Actual failed HTTP response,
stored historical image URL shape, native exception and APK module resolution
are **UNVERIFIED (owner to confirm)**. `adb devices` found no phone; the
requested read-only log dump waited for a device and was interrupted, yielding
**zero records, BLOCKED**. This absence is not the STOP reason. Live deployed
revision/database/Scheduler state is **UNVERIFIED (owner to confirm)**. No
Supabase/Vercel/Google Cloud/Canvas/Resend request, remote SQL, migration,
Scheduler action, deployment, email or environment-file edit occurred. The
requested 2026-10-17 roadmap file was not found; no replacement was invented.

**Exact owner question:** Given that current Commons selection already requests
bounded thumbnails and stores thumburl, should FX1 resume under a revised scope
that investigates the actual failed image response and save failure stage,
preserves ADR-038's write-only/add-only permission constraints, and changes
image selection or the Android media path only when evidence supports it?

### Owner steps remaining

Resolve that scope question, complete STEP 0 and both repairs, then execute
all tests and fresh serial gates. **Rollout and Device checks were skipped
entirely (NOT RUN).** After a reviewed JS/TS repair, run the preview-update
preflight before separately authorized OTA to runtime 2.2.0-sdk57, plus API
deployment if applicable. A native change needs a new APK with deliberate
versionCode 7 (preview autoIncrement is false). On Realme, recheck saving
figures, page snapshots and external images, plus external card/viewer loading.
FULLSEND browser, overflowing-viewer and suitable-source Office checks remain.

[FX1 file:line evidence and hypothesis verdicts](acceptance/fx1-image-diagnosis.md).


## FX1b unattended repair — 2026-10-18

## FX1b image repair complete locally (2026-10-18)

**PASS for the finite unattended code scope; device acceptance remains pending.**
Owner's revised FX1b scope supersedes the earlier diagnostic STOP. Commons
already selected bounded thumbnails from its first implementation; no legacy
conversion is needed. New GIF candidates are skipped. The native User-Agent
uses expo-constants/app config (currently 2.2.0) and the existing contact URL.
Mobile and web external-image failures retain the viewer and display
Image couldn't load, Retry and Open on Commons; safe failure logs contain no URL.

Save returns/logs typed permission, download, HTTP-status, MIME, empty-file,
media-write and missing-module stages with specific messages. Source saves
refresh signed URLs through existing bearer-protected reads after permission,
match the exact figure/snapshot identity, and fail safely if it changed.
SDK 57 explicitly supports the current Android initial-file album call, so
ADR-038's Android write-only and iOS add-only paths remain; cleanup follows
the awaited native write. These fixes do not establish the actual phone exception.

**FRESH final gates:** forced root typecheck/lint/build **8/8 tasks each,
zero cached**; shared **350/350** (40 files), API **2273/2273** (199 files, 3 existing live skips), mobile **1263/1263** (134 files), web **211/211** (37 files); zero test failures. All seven application gates
ran serially with repo-local TEMP/TMP. Diff and staged-diff hygiene PASS.
Lint retains six existing warnings. First lint attempt failed on a new web
JSX apostrophe (5/8 tasks complete, one error); fixed and the serial sequence
restarted. Focused mobile first attempt had 141 pass/1 fail from an invalid
test fixture; corrected, then 142/142 passed. First full mobile run had 1,243
passing tests and two failed suites (132 passing files) because indirect imports
needed an expo-constants Node mock; fixed before restarting the final sequence.
No nondeterministic flake observed.

**Owner steps remaining:** Rollout and Device checks skipped entirely (NOT RUN).
Publish reviewed JS/TS changes and the GIF API rule, then recheck figure,
snapshot and external saves plus external card/viewer rendering on Realme.
ADB evidence is BLOCKED (zero devices); actual native cause/module resolution,
failed image/response and production/database/Scheduler state are **UNVERIFIED
(owner to confirm)**. No remote service call, deployment, SQL, migration,
Scheduler action, email, environment-file edit or push occurred. The absent
2026-10-17 roadmap file was skipped; unrelated untracked work is preserved.
This run ends at FX1b; FULLSEND's other live checks remain pending.

[FX1 diagnosis and FX1b outcome](acceptance/fx1-image-diagnosis.md).


### Commits

```text
37fcd16 fix(api): serve raster Commons thumbnails for external visuals
dfbf466 fix(mobile): save images through fresh owner reads and report failure stage
a10642b fix(mobile): show retry when an external image fails
```

The final docs: close FX1 commit contains this footer; its post-commit hash
is in tmp/overnight/FX1b.status and Git history. Author galaxymaxp
<omgraythekid@gmail.com>; branch overnight/2026-10-15_feedback; no push.
Existing merge cb4df08 and dependency install were not repeated. Read-only
fetch confirms github/main 0d7bfed. Unrelated UI/, apps/mobile/.gitignore,
supabase/.temp/ preserved. Runtime/build/native configuration is unchanged.

**Evidence:** Commons already chose thumburl (original hypothesis closed);
new GIF exclusion commons.ts:78-81, dynamic native User-Agent
services/externalVisuals.ts:9, retained card/viewer failure states
ExternalVisual.tsx:18-23,39-51 and section-visual.tsx:59-62,145-170.
saveImage.ts:25-78 adds stage-only diagnostics and awaits writes before cleanup;
SourceFigures.tsx:95 and SourcePageSnapshot.tsx:129 refresh expirable URLs
via existing owner-scoped reads, requiring the same accepted image identity.
Installed SDK source explicitly supports initialAssetLocalUri
(src/legacy/MediaLibrary.ts:768-815, Android MediaLibraryModule.kt:155-170,
albums/CreateAlbum.kt:50-66); Android media path stays as ADR-038 specifies.
Local legacy imports and forced bundle export pass; APK contents and actual
device exception/HTTP response remain **UNVERIFIED (owner to confirm)**.

### Owner steps remaining

**Rollout and Device checks — NOT RUN, skipped entirely.** Run mobile preview
preflight before an authorized OTA to 2.2.0-sdk57; publish API GIF filtering and
website error state. Recheck Save for a figure, page snapshot and external image,
and external card/viewer rendering on Realme, plus iOS add-only Photos saving.
No native change was required; any later native release must deliberately
advance versionCode from 6 (preview autoIncrement is false). Complete remaining
FULLSEND browser/overflow/Office-source checks. Production revisions/database/
Scheduler/native causes are UNVERIFIED; zero ADB devices means log evidence is
BLOCKED. No deployment, remote service/SQL, migration, Scheduler, email,
environment-file edit or push occurred. The dated roadmap is absent and skipped.
Finite FX1b endpoint reached; no later roadmap work started.

## WG2/N6 unattended handoff - PASS (2026-10-18)

**Status: PASS for the finite code scope.** Baseline `b750224`, branch
`overnight/2026-10-15_feedback`; WG1 `653e8d8` verified as an ancestor. Completed
STEP 0-2, tests, fresh serial gates, docs and local commits. Initial tracked tree
was clean; only the allowed untracked UI/, apps/mobile/.gitignore and
supabase/.temp/ remain. The referenced overnight roadmap is absent (also noted
by WG1/FX1b); the full prompt supplies scope without a code contradiction.

Rows now show Reviewer ready in the existing meta line and accessible name for
the same server `reviewerArtifactId` mobile uses. Detail has primary Open
reviewer with the encoded Library artifact route, secondary confirmed Remake,
the exact requested confirmation copy and Ready fact. Cancel/Escape focus
return, owner/material identity, busy locking, retained saved reading on failure
and retry are covered. Generate without a Reviewer and Quiz remain unchanged.
Acceptance/return/focus revalidate existing resources, including saved later
material pages. No API, shared DTO, mobile, dependency, schema or migration change.

**generating state per material: not available from existing data**. General
ProcessingJobStatusView/source metadata/GenerationView have no material ID;
sourceVersionId is a different identifier. Optional batch requests map only
batch submissions and cannot establish the latest arbitrary direct remake.
The authorized fallback shows saved Reviewer state, without guessing by title.

**Commits**, author `galaxymaxp <omgraythekid@gmail.com>`:

- `0eaffa9 feat(web): show saved Reviewer state on Generate`
- `bb2395f test(web): cover generated Reviewer actions and refresh`
- `docs: close WG2` is the closing documentation commit; its final hash and all
  run commits are recorded in ignored `tmp/overnight/WG2.status`.

**Final gates, all FRESH and serial**, tested application tree committed above:

- `npm run typecheck -- --force`: PASS, **8/8 tasks, 0 cached**.
- `npm run lint -- --force`: PASS, **8/8 tasks, 0 cached**, zero errors and six
  existing warnings (five mobile import-order, one web Library unused import).
- `npm run test --workspace @stay-focused/web`: PASS, **224/224**, **38/38 files**;
  includes 13 WG2 regressions and unchanged WG1/course-batch tests.
- `npm run test --workspace @stay-focused/shared`: PASS, **350/350**, **40/40 files**.
- `npm run build --workspace @stay-focused/api`: PASS, **1/1**, **35/35** pages.
- `npm run build --workspace @stay-focused/web`: PASS, **1/1**, **19/19** pages.
- AUTOPILOT `npm run build -- --force`: PASS, **8/8 tasks, 0 cached**;
  API/web **35/35** and **19/19** pages; Android/iOS/web exports, **68 assets**.
- `git diff --check` and `git diff --cached --check`: PASS.

First typecheck failed with TS18046 in the new focus node mock, exit 2,
**4 successful/6 scheduled tasks, 0 cached**; fixed using an explicit props
type guard. Its rerun passed 8/8. First lint failed on the test's inline
children prop, exit 1, **5 successful/8 tasks, 0 cached**, one new error and one
existing web warning; fixed with a typed props fixture and restarted the serial
gates. Focused development tests passed **20/20**, then **21/21** after adding
Quiz coverage. No nondeterministic flake or skipped test in the required suites.
Existing Vite CommonJS/config-loader and build color-environment notices remain.

API/mobile unit suites and provider/workflow/live tests: NOT APPLICABLE to the
unchanged paths, NOT RUN. Logs/progress/status are ignored under tmp/overnight/.
Inspected and restored generated Next ambient declarations; no generated
artifacts, credentials or private fixtures are committed. Root export used
EXPO_OFFLINE=1; build telemetry was disabled.

### Owner steps remaining

**Rollout and Device checks - NOT RUN, skipped entirely.** Publish the reviewed
website change and perform RB5 Generate for Reviewer ready / Open reviewer /
confirmed Remake on phone and resized desktop. Deployed revision, live owner
acceptance, database and Scheduler state remain **UNVERIFIED (owner to confirm)**.
No remote service call, deployment, SQL/migration application, Scheduler action,
email, environment-file edit or push occurred. Unrelated work is preserved.
Finite endpoint WG2 reached; WV1/MD1 and other later work were not started.

Acceptance: [WG2 generated Reviewer state](acceptance/wg2-generated-reviewer-state.md).


## WV1/N7 unattended reviewer image load - PASS (2026-10-18)

Status: **PASS** for STEP 0-5, mocked tests, fresh serial gates, docs and local
commits on `overnight/2026-10-15_feedback`, baseline `7112770` (includes
`653e8d8`). Website
and mobile load all cached reviewer image URLs in one owner-scoped `/figures`
response on open. Bulk snapshot discovery checks the exact original once and
never renders. Missing snapshots use a three-request queue with read-only
bounded polling; source-image errors share one signed-URL refresh. Website
reserves image boxes, eagerly loads the first two images, and lazily loads the
rest with async decoding. IM2 Ask/Save/details, source priority, owner isolation
and offline/identity guards remain. Legacy routes are compatible; no migration
or dependency change.

Synthetic fixture: **7 -> 2 metadata requests**, first course URL **2 -> 1
sequential responses**; unrendered page **3 -> 2** with mocked immediate
completion. Earliest URL including stored external remains **1 -> 1**.
Production speed is unverified.


**FRESH PASS, serial:** forced root typecheck/lint/build **8/8 tasks each,
0 cached**; API **2283/2283** (201 files, three existing live skips),
web **227/227** (39 files), shared **362/362** (42 files),
mobile **1269/1269** (135 files); standalone API/web builds
**1/1 each**, **35/35** and **19/19** pages; mobile Android export **1/1**.
Root build also exports Android/iOS/web. Six existing lint warnings remain.
Shared's default result includes emitted tests; the separate source-only run
is **FRESH PASS, 181/181 tests in 21 files**.
Diff and staged-diff hygiene PASS. First-attempt failures and corrected fixture
mocks are retained in acceptance; no nondeterministic flake observed.

Local implementation commits:

- 3d54f97 feat(api): batch owner-scoped reviewer image discovery
- e5c1165 perf(web): load reviewer visuals on open
- 32a1714 perf(mobile): load reviewer visuals with the reader
- docs: close WV1 (this documentation/handoff commit; final hash in `tmp/overnight/WV1.status`).

First full API run: 2,281 pass, 1 fail, 3 live skips; corrected old route mock.
Next full mobile run: 1,246 pass, 22 fail across three reader files; corrected
old hook mocks and replaced obsolete scroll gating with offscreen propagation
coverage (focused 52/52 PASS). Initial type/fixture and preload-path failures
are also retained in acceptance. Final suites have zero failures. No flake
observed. Baseline exact fixture was reproduced from Git under ignored tmp,
1/1 PASS; no duplicate baseline code or generated validation artifact is staged.

### Owner steps remaining

**Rollout and Device checks - NOT RUN, skipped entirely.** Owner RB5: deploy
reviewed API/web and measure website image load speed on a real reviewer.
Publish the mobile change and verify cached/pending images, expired signatures,
offline behavior and IM2 controls on device. Deployment revision, production
rows, actual speed, device behavior and Scheduler state are **UNVERIFIED
(owner to confirm)**. No remote service call, deploy, remote SQL/migration,
Scheduler operation, email, environment-file edit or push occurred. Local
gate children blocked non-loopback sockets; live-test switches and telemetry
were disabled. Unrelated UI/, mobile .gitignore and supabase/.temp are preserved.
The absent overnight roadmap is recorded; the complete WV1 prompt supplied
scope. The finite endpoint is WV1; no later task was started.

Acceptance: [WV1](acceptance/wv1-reviewer-images.md).
ADR: [ADR-042](../adr/ADR-042-reviewer-visuals-single-load.md).

## OI1 unattended offline reviewer images - PASS (2026-10-18)

Status: **PASS** for STEP 0-8, tests, fresh serial local gates, docs and local
commits on overnight/2026-10-15_feedback, baseline 181c4b6. Recovery reread the
UNATTENDED rules, progress and Git state. All OI1 implementation was still
uncommitted; no committed FX1b/WV1 work was repeated. FX1b 37fcd16, dfbf466,
a10642b and b750224 are ancestors. Both code-level STOP conditions were absent:
the offline reviewer store and fresh owner-scoped image reads already exist.

Saving reviewer text now schedules images automatically without a gallery tap.
Private document files use stable owner/artifact/version keys, a SQLite v9
manifest, temporary-file validation/moves and a two-download background queue.
Failed work resumes with persisted backoff after restart. Text remains readable
through failures. Local snapshots, figures and external references retain their
labels and attribution. Readiness counts all non-capped images; bytes include
stored images. Reading-order caps are 40 MiB per reviewer and 500 MiB app-wide,
with one Some images need a connection line. Removal, explicit supersession,
replacement, authenticated source denial, clear and sign-out invalidate previews;
generation guards reject late publication. Failed discovery does not establish
deletion. Manual gallery saving and its tests remain. No new native dependency,
API, server auth/RLS or remote migration. **PAR1:** website has no offline mode;
website offline work is NOT APPLICABLE.

### STEP 0 inspection anchors

These file:line references describe the final implementation. Paths are relative
to the repository root. The existing text body remains
library_artifacts.payload_json; image files and manifest rows follow its lifecycle.

- `apps/mobile/src/features/reviewer/saveImage.ts:26` and `:51`: permission,
  lazy legacy filesystem download and manual gallery save; shared validation is
  `apps/mobile/src/services/studyImageFile.ts:14`. Fresh exact snapshot/figure
  owner reads are extracted at `studyImageFile.ts:32` and `:39`.
- `apps/mobile/src/features/reviewer/SourcePageSnapshot.tsx:14`, `:56`, `:134`:
  batch/local URI input and fresh snapshot read for manual save;
  `apps/mobile/src/features/reviewer/SourceFigures.tsx:44`, `:58`, `:98`: batch/local
  figures and fresh exact figure read. `apps/mobile/src/features/reviewer/ExternalVisual.tsx:14`,
  `:17`, `:54`: batch/replacement URI, local preference and attributed gallery
  save. Offline external URLs come from the same owner-scoped combined GET.
- `apps/mobile/src/services/localLibrary/artifactStore.ts:40`, `:47`, `:230`:
  OfflineStats, LocalArtifactStore and image-aware offlineReady. `:308` / `:511`
  save the body and initialize its manifest. `:474` handles a newer summary;
  `:359`, `:400`, `:415` own remove, clearBodies and purgeOwner cleanup.
- `apps/mobile/src/services/localLibrary/schema.ts:100`: appended v9 table;
  `:111` derives the schema version. Existing migrations are unchanged.
  `apps/mobile/src/services/localLibrary/localArtifactDatabase.ts:12`, `:32`:
  lazy SQLite open/migrate and sign-out drain/purge;
  `apps/mobile/src/services/localLibrary/localArtifactDatabase.web.ts:7`: no web store.
- `apps/mobile/src/services/localLibrary/offlineCatchUp.ts:41`, `:86`: startup
  catch-up and queue stop; `apps/mobile/src/services/localLibrary/librarySync.ts:41`,
  `:115`: reconciliation and post-text notification;
  `apps/mobile/src/services/localLibrary/deviceLibrary.ts:15`: schedules images
  through onDetailStored. Existing `apps/mobile/src/app-shell/AppLifecycle.tsx:40`
  triggers catch-up after session restore/foreground.
- `apps/mobile/src/features/redesign/useLocalLibrary.ts:88`: reads stats and
  subscribes to changes; `apps/mobile/src/features/redesign/LibraryScreen.tsx:190`,
  `:393`: offline caption and accessible Saved offline state;
  `apps/mobile/src/features/redesign/libraryPresentation.ts:18`: All N items
  caption consumes the updated image-aware counts.
- `apps/mobile/src/features/settings/OfflineStorageSettings.tsx:55`: stop work
  before clearBodies; `packages/shared/src/image-download.ts:1`: unchanged
  StudyImageDownload contract. New queue/cache entry points are
  `apps/mobile/src/services/localLibrary/offlineImageQueue.ts:11` and
  `apps/mobile/src/services/localLibrary/offlineImages.ts:63`.

### Commits and verification

- `c78e4b5 feat(mobile): save reviewer images with offline library`
- `docs: close OI1` is the closing docs/handoff commit; the final hash and both
  run commits are recorded in ignored tmp/overnight/OI1.status.

Author: galaxymaxp <omgraythekid@gmail.com> via --author. No push.
Final application tree: **c78e4b5**. All following gates are **FRESH**, serial:

- `npm run typecheck -- --force`: PASS, **8/8 tasks, 0 cached**.
- `npm run lint -- --force`: PASS, **8/8 tasks, 0 cached**, six existing warnings
  (five mobile import-order and one web unused import), zero errors.
- `npm run test --workspace @stay-focused/shared`: PASS, **362/362**, **42/42 files**.
- `npm run test --workspace @stay-focused/mobile`: PASS, **1301/1301**, **137/137 files**;
  includes unchanged saveImage tests, actual SQLite reopen, queue/concurrency,
  caps, cleanup, readiness and three local-image component regressions.
- `npm run test --workspace @stay-focused/api`: **NOT APPLICABLE**, unchanged API.
- AUTOPILOT `npm run build -- --force`: PASS, **8/8 tasks, 0 cached**; API
  **35/35** and website **19/19** pages; Android/iOS/web exports.
- `npm run build --workspace @stay-focused/api`: PASS, **1/1**, **35/35** pages.
- `npm run build --workspace @stay-focused/mobile -- --platform android`:
  PASS, **1/1 Android export**.
- `git diff --check` and `git diff --cached --check`: PASS.

First attempts are retained in acceptance: focused **93 pass / 6 fail**, then
**75 / 1**, corrected **137/137**; first mobile **1288 pass / 5 fail** across
four failed files, corrected focused **81/81**; early strict-type fixture
diagnostics **3, 3, 1**; final-review typecheck **7/8 tasks** with one TS18049,
then fixed. Two final regressions increased mobile from 1299 to 1301. A shared
run that overlapped lint was repeated serially. No nondeterministic flake.
Existing Vite CommonJS/config-loader and build color notices remain.

On recovery, one root-build invocation was deliberately aborted (exit 1, no
final task counts) to restore the previous non-loopback socket blocker and
Expo-offline/Turbo-telemetry flags. No provider operation was observed during
that invocation; remote activity/state was not verified. The passing resumed
builds use the blocker, offline flags, disabled telemetry and repo-local TEMP/TMP.
Logs are ignored under tmp/overnight/OI1.gates; generated Next ambient changes
were inspected/restored. No generated artifact, private fixture or credential
is committed. Unrelated UI/, apps/mobile/.gitignore and supabase/.temp/ remain.

### Owner steps remaining

**Rollout and Device checks - NOT RUN, skipped entirely.** Publish reviewed
mobile changes through the existing update process; no new native module or
versionCode change is required by OI1. Save a reviewer with snapshots, figures
and an external reference; use airplane mode, reopen and restart; verify all
saved images and attribution. Replace/remove the reviewer and clear/sign out;
confirm storage drops and previews disappear. Gallery copies remain independent.
Deployed/native revision, live database rows, Scheduler and physical results
are **UNVERIFIED (owner to confirm)**. No live provider check, deployment,
remote SQL/migration, Scheduler action, email, environment-file edit or push
was performed. The finite endpoint is OI1; no later task was started.

Acceptance: [OI1](acceptance/oi1-offline-reviewer-images.md).
ADR: [ADR-043](../adr/ADR-043-offline-reviewer-images.md).

---

## MR3 unattended failed-generation recovery - PASS (2026-10-18)

**Status: PASS for STEP 0-5, tests, requested local gates, docs and local
commits.** Baseline `73bafb1`, branch `overnight/2026-10-15_feedback`; WG2
`0eaffa9 bb2395f 7112770` and FX1b `37fcd16 dfbf466 a10642b b750224` are present.
Mobile Generation/Canvas/Queue and website Generation/Queue now offer Try again
for safe generation failures, show the persisted stage in plain words and say
Your material is safe. Stored extraction/source/version/settings are reused,
without a new upload/OCR when resolved. Duplicate taps are fenced; accepted
attempts get fresh keys, including a mounted original mobile Queue card.
Typed 409/422 rejection removes the action despite stale polling. Source checks,
quotas, automatic retry policy, source validation and cancellation remain.

**NEW MIGRATION FILE - OWNER APPLICATION REQUIRED BEFORE ROLLOUT:**
`packages/db/migrations/20261018000100_failed_generation_retry.sql` only replaces
the retry function and restates its restricted grant. It does not backfill or
update existing rows. Historical safe Reviewer/Quiz generation failures can
retry despite stored retryable=false. Deleted/unavailable document, Canvas and
Quiz Reviewer sources are denied even if immutable text survives. No migration
was applied remotely; local PGlite verification used synthetic, in-memory data.

### STEP 0 file:line record

- `apps/api/app/api/jobs/[jobId]/retry/route.ts:38` key validation; :45 live
  retry lookup; :48 same-key source recheck; :55 Quiz capacity 422; :59 retry;
  :66 dispatch; :78 non-retryable 409. `apps/api/src/lib/processing-jobs/repository.ts:270`
  calls retry_processing_job; :313 projects safe historical failure eligibility.
- Original copying/eligibility:
  `packages/db/migrations/20260723084329_reusable_processing_assets.sql:1562`
  (failed + retryable, same-key replay/conflict, source snapshot/version and
  contract copy). New function :48 checks source ownership, :125 admits the
  exact failed generation codes/stages, :185-186 copies the same source IDs.
  Resolved manual text short-circuits at
  `apps/api/src/lib/processing-jobs/manual-reviewer-source.ts:24`; resolved
  Canvas PDF/composite metadata also skips extraction. No source reuse rewrite.
- `apps/api/src/lib/processing-jobs/ai-reviewer.ts:49` emits generation_failed
  for contract/coverage failure. Reviewed every fail call in `operations.ts`:
  :114/:749/:878 forward WorkerJobError policy; :149/:166 PDF validation false;
  :236 Quiz generation only true, capacity false; :263 Activity false (outside
  MR3); :341 incomplete inspection true; :412 OCR limit false;
  :489 extraction-specific policy; :691/:810 incomplete extraction only true;
  :712/:819 empty text false; :840/:869 Canvas preparation false;
  :882 Reviewer generation only true after MR3; :913 interrupted true except
  cancellation; :998 forwards known policy. Local worker classification:
  `apps/api/src/lib/processing-jobs/processor.ts:501` (manual generation retry,
  same automatic policy); legacy validation at :513. Google dispatch and worker
  `apps/api/src/lib/processing-jobs/google-cloud.ts:131` and :164-168 remain true,
  with automaticRetryable unchanged.
- `apps/mobile/src/features/redesign/GenerationScreen.tsx:128` canRetry;
  :129 retryFailed; :204 stage; :207 action; :226 failed notice.
  `apps/mobile/src/features/courses/CanvasSourceReviewerScreen.tsx:1433`
  retries with a fresh key and lock; :2479 stage; :2505 action;
  :2510 non-retryable secondary path. `apps/mobile/src/features/queue/QueueContents.tsx:155`
  submits retry; :256 stage; :259 Try again. Aligned copy:
  `apps/mobile/src/services/experienceApi.ts:35`.
- `apps/web/src/features/queue.tsx:57` Queue retry policy; :183 label;
  :221 Generation canRetry; :283 stage/safe-material copy; :361 label.
  Real enum: `packages/db/src/types.ts:449`. Shared mapping/predicate:
  `packages/shared/src/processing-job-recovery.ts:1`.
  Before/after failure-code table and complete evidence:
  [MR3 acceptance](acceptance/mr3-failed-generation-retry.md) and
  [ADR-044](../adr/ADR-044-failed-generation-retry.md).

### Commits

- `84ab171 feat(shared): describe failed generation recovery`
- `71f3d25 fix(api): retry failed generation from stored sources`
- `55d4eb0 feat(web): try again on failed generation`
- `cb36f82 feat(mobile): try again on failed generation`

Author on every commit: `galaxymaxp <omgraythekid@gmail.com>`. Documentation
closure: `docs: record MR3 recovery and owner steps`; its final hash is in local
Git history and `tmp/overnight/MR3.status` (no self-hash amendment). No push.

### Gates and first attempts

**FRESH PASS, serial:** `npm run typecheck -- --force`, `npm run lint -- --force`
and `npm run build -- --force`: **8/8 tasks each, zero cached**. Lint has six
existing warnings. `npm run test --workspace @stay-focused/shared`: **393/393**
(43 files); `@stay-focused/api`: **2306 passed, 3 existing live skips**
(201 files); `@stay-focused/mobile`: **1311/1311** (138 files, no unhandled errors);
`@stay-focused/web`: **236/236** (40 files). Standalone
`npm run build --workspace @stay-focused/api`: **1/1**, **35/35** pages;
`npm run build --workspace @stay-focused/mobile -- --platform android`: **1/1**.
Root build also generates website **19/19** pages and Android/iOS/web exports.
`git diff --check` and scoped `git diff --cached --check`: PASS.

Additional diagnostic `npm run test:workflow --workspace @stay-focused/api`:
**BLOCKED as a standalone probe: exit 1, zero tests found**. Only .gitignore is
tracked in workflow-tests. Runtime graph/provider boundary is unchanged, so this
is NOT APPLICABLE to MR3's mandatory gates; no empty-suite bypass was used.
Existing API workflow/source-chain tests pass and the API build compiles the
workflow. Provider contract: NOT APPLICABLE (unchanged interface).

First attempts retained: two draft-migration setup failures each had 29 passing
tests, 20 skipped and 1 failed/4 passed files; corrected focused 49/49. First
final typecheck launch failed before tasks on Windows preloader path escaping;
corrected. First full API: **2304 passed/2 failed/3 skipped**, **199 passed/2 failed
files**; real Quiz constraints and the cache mock were repaired, then focused
**52/52** and full **2306** passed. First full mobile: **1306 passed/4 failed**,
**137 passed/1 failed files**, **1 unhandled rejection** from new assertion/mock
contamination; corrected focused **6/6**, then full **1310** passed. Final Queue
key review added a regression (**7/7** focused), then affected typecheck/lint,
mobile **1311**, Android and root builds were repeated. Earlier root build was
also green but is retained separately. No nondeterministic flake observed.
The unavailable Python helper and rejected no-op patch are recorded in acceptance.

### UNVERIFIED

Production/deployed revision, migration application, live database rows,
Scheduler state, SOC_SCI_103 failure/retry behavior and physical device behavior
are **UNVERIFIED (owner to confirm)**. No remote service call, deployment,
remote SQL/migration, Scheduler action, email, environment-file edit or push.
Checks used a local non-loopback socket blocker and disabled live test flags,
telemetry and Expo network access. Generated Next type files were restored;
untracked `UI/`, `apps/mobile/.gitignore`, `supabase/.temp/` remain untouched.

### Owner steps remaining

Rollout and Device checks are **NOT RUN**, skipped entirely.

1. Apply the reviewed function-only migration before publishing the new API and
   clients; deploy API and website and publish mobile OTA through owner tooling.
2. Re-upload SOC_SCI_103 on device; if generation fails, confirm Try again reports
   its stage and resumes from stored extraction without another upload/OCR.
   Check a non-retryable limit and safe capacity rejection as appropriate.
3. Vercel CLI is not installed. Strongly recommend `npm i -g vercel` for the
   later owner-controlled environment/deployment/log workflow; not run here.

MR3 is the finite endpoint. Planning files are reconciled; no later task started.

---

## WG3 unattended Generate home - STOPPED at STEP 0 (2026-10-18)

**Status: STOPPED; no WG3 implementation was started.** The complete prompt
`tmp/overnight/prompts/WG3.md` was read. Its UNATTENDED rule 4 requires stopping
at a STOP condition, and STEP 0.1 requires a clean tree apart from `tmp/`.
The initial checkout contains unrelated untracked `UI/README.md`, twenty
`UI/screenshots/{dark,light}/` images, `apps/mobile/.gitignore`, and
`supabase/.temp/cli-latest`. All were preserved without reading their contents,
staging, moving, deleting or committing them.

The actual branch is `overnight/2026-10-15_feedback`, whereas WG3 names
`overnight/2026-10-13_0132` and says to stay on it. Initial HEAD is
`9dae76f docs: record MR3 recovery and owner steps`; local ancestry confirms
WV1 `181c4b6` is included. No branch switch was attempted. Repository policy,
AUTOPILOT and current planning context were inspected. Component verification
and line-number collection in STEP 0.2 were NOT RUN after the stop condition.
Steps 1-7 remain NOT RUN; WG3 is not marked done in the planning files.

**Exact owner question for resumption:** Should WG3 run on the current
`overnight/2026-10-15_feedback` branch, and may its clean-tree prerequisite be
waived specifically for the preserved untracked `UI/`,
`apps/mobile/.gitignore`, and `supabase/.temp/` paths, or will you provide the
named branch with a tree clean apart from `tmp/`?

### Commits

Documentation-only checkpoint: `docs: record WG3 preflight stop`, author
`galaxymaxp <omgraythekid@gmail.com>`. The final hash is recorded in
`tmp/overnight/WG3.status` and local Git history; no self-hash amendment.
No implementation commit, push or remote operation was performed.

### Gate counts

Four execution gates are **NOT RUN (0/4 executed)** due to the mandatory STEP 0
stop: forced root typecheck, forced root lint, web tests and standalone API
build. Unit tests and Playwright are **NOT RUN (0 executed)**. The fifth gate,
`git diff --check`, is **FRESH PASS** for this documentation-only change;
`git diff --cached --check` is also checked before the checkpoint commit.
These hygiene checks establish no implementation acceptance. No failed test
attempt, skipped test, cached result or flake is claimed.

The Try-again padding cause is **UNVERIFIED**: the audit was not reached.
Production revision, database rows, Scheduler state, browser/device behavior
and all other live state are **UNVERIFIED (owner to confirm)**. No deployment,
remote SQL/migration, provider call, Scheduler change, email, environment-file
edit or push was performed.

### Owner steps remaining

1. Resolve the branch/clean-tree question above, then rerun WG3 beginning with
   the incomplete STEP 0. No code step or acceptance gate is complete.
2. Rollout is **NOT RUN**, skipped entirely: owner website deployment through
   the approved fullsend/Vercel production-from-main workflow (RB6).
3. Device checks are **NOT RUN**, skipped entirely: owner browser review of
   Generate home at desktop and phone widths after implementation and rollout.
4. Vercel CLI is not installed. Strongly recommend `npm i -g vercel` for the
   later owner-controlled environment, deployment and log workflow; not run here.


---

## RV1 unattended reviewer header - PASS (2026-10-18)

**Status: PASS for STEP 0-5, tests, fresh serial gates, docs and local commits.**
Baseline 1e53edd on overnight/2026-10-15_feedback. The complete RV1 prompt and
its overriding UNATTENDED rules governed this run. All seven code assumptions
hold. The referenced overnight roadmap file is absent; the complete prompt
provides scope. WG3 stopped before implementation. Original untracked UI/,
apps/mobile/.gitignore and supabase/.temp/ were preserved. No questions,
branch switch or later task.

Mobile title-row Reviewer actions uses a 48-point IconAction and the existing
Queue native Modal/anchor/outside/Android Back pattern, without animation.
Export stays available offline; Share retains its existing owner/offline guard,
fetching, sheet, mutation, clipboard and system sharing logic. Website reuses
the AccountMenu popover pattern with Escape/focus return, arrows/Tab and outside
dismissal; Share and Save to file are inside it, Generate Quiz remains visible.
Compact minutes/topics retain mobile automatic labels and web course/date.
Reviewer usages alone hide idle Updated, keeping Syncing, error/Retry and
update-available actions. RV1 supersedes RX1's button row. No existing reviewer
Save offline action was found; none was added. No reusable primitive, ADR,
dependency, native module, API change or migration.

### Commits

- `e4f5ee9` feat(shared): allow hiding idle snapshot freshness
- `0f500cd` feat(mobile): compact reviewer header and actions menu
- `6bef993` feat(web): compact reviewer header and actions menu

Closure: docs: close RV1 reviewer header (final hash in local Git and
tmp/overnight/RV1.status; no self-hash amendment).
All commits use galaxymaxp <omgraythekid@gmail.com> via --author. No push.

### Gate counts

**FRESH PASS, serial:** forced root typecheck/lint/build **8/8 tasks each,
0 cached**; mobile **1321/1321** (139 files), web **249/249** (42 files), shared
workspace **427/427** (44 files including existing compiled test copies).
Separate shared source-only **215/215** (22 files). Standalone API build
**1/1**, **35/35** pages; Android export **1/1**. Root build includes web
**19/19**, API **35/35** and Android/iOS/web exports. All eight mandatory gate
commands plus root build/source-only pass. Diff/staged-diff PASS. Six existing
lint warnings, no new lint errors. No nondeterministic flake observed.

First attempts retained: focused mobile **20 passed / 4 failed** from a
floating-point assertion (retry **24/24**); typecheck **5/8 tasks**, three
TS18046 errors in new test mock props (typed unknown props; retry **8/8**);
full mobile **1320 passed / 1 failed** from a missing safe-area mock (focused
retry **23/23**, full retry **1321/1321**). Preliminary passing lint overlapped
the end of typecheck; the complete chain was rerun serially. Initial Python
setup was unavailable; Node completed it. No product validation or acceptance
requirement was weakened.
API tests: NOT RUN (API unchanged, outside requested suites); provider/workflow
probes: NOT APPLICABLE. Generated Next declarations were restored; generated
artifacts, private fixtures, tmp and unrelated files were not staged.

Production revision, database rows, Scheduler and physical/browser behavior:
**UNVERIFIED (owner to confirm)**. No remote service operation, deployment,
remote SQL/migration, Scheduler change, email, environment-file edit or push.
Exact commands, counts, failed attempts and local logs:
[RV1 acceptance](acceptance/rv1-reviewer-header.md).

### Owner steps remaining

1. Rollout **NOT RUN**, skipped entirely: next owner RB6 fullsend with website
   deploy and reviewed mobile APK/OTA. No RV1 migration.
2. Device checks **NOT RUN**, skipped entirely: Realme menu Export/Share,
   offline disabled Share/working Export, compact meta/large text, outside/Back,
   no idle Updated, preserved Syncing/error/Retry/update-available and sharing.
3. Browser at **1440 and 390 px: NOT RUN**, skipped entirely: Share/Save menu,
   compact meta/course/date, Generate Quiz, Enter/Space, arrows/Tab,
   Escape/focus return and outside dismissal.
4. Vercel CLI is not installed. Strongly recommend npm i -g vercel for later
   owner-controlled environment, deployment and log work; not run here.

RV1 is the finite endpoint. Current state, roadmap and sprint are reconciled;
RX1 layout is explicitly superseded. WG3's STOP remains independent.

---

## WG3b unattended website Generate home - PASS (2026-10-18)

**Status: PASS for STEP 0-7, tests, required fresh serial gates, docs and local
commits. WG3 is done via WG3b**, superseding the docs-only preflight stop at
`1e53edd`. Baseline `4bd0d91`, branch `overnight/2026-10-15_feedback`;
`9dae76f` is an ancestor. Resumed after interruption by reading the overriding
UNATTENDED prompt, progress, log/status/diff and inspecting pending work.
No WG3b implementation was already committed, so none was repeated. The
referenced overnight roadmap is absent (already recorded by WG1); the complete
WG3b prompt provides the finite scope. No later task or branch switch.

Current course groups precede own material, collapsed Not synced and collapsed
Past; own material stays visible under search. Generate uses accessible
per-course corner ellipsis menus with desktop hover/focus and narrow/touch
visibility, Escape/focus return, arrows, Tab/outside dismissal. Canvas keeps
its labelled menu and move action. Card space prevents trigger/title/chevron
overlap. Not-synced Sync is secondary; the home has no primary action.
Generate alone suppresses State's snapshot labels and uses a tested pure
selector: in-progress before failed before updated, retaining disconnected
and unconfirmed states. Other callers keep their default snapshot behavior,
and initial loading/error recovery is preserved.

**Try again padding cause:** desktop density CSS replaces base `12px 16px`
padding with `0 14px`; Smart Selection also used compact `link-button`
`2px 4px` with no minimum height. All nine website action sites now use
`retry-button` to restore `12px 16px` and a 48px minimum. Existing tones,
handlers, retry eligibility and duplicate/busy guards are unchanged. No mobile
or API implementation, new dependency, migration, reusable architecture or ADR.

### Commits

- `0eb0aaa` feat(web): simplify Generate home and recovery actions
- Closure: `docs: close WG3b Generate home` (final hash in Git and
  `tmp/overnight/WG3b.status`; no self-hash amendment).

Both commits use `galaxymaxp <omgraythekid@gmail.com>` via `--author`. No push.
Only WG3b-owned web paths and documentation are staged. Original untracked
`UI/`, `apps/mobile/.gitignore` and `supabase/.temp/` remain untouched. The
pre-existing WG3b sprint header and acceptance draft were completed, preserving
other runs' content. Generated API Next declarations were inspected and
restored. Screenshots, validation output, tmp and private fixtures are excluded.

### Gate counts

**FRESH PASS, serial:**

- `npm run typecheck -- --force`: **8/8 tasks, 0 cached**.
- `npm run lint -- --force`: **8/8 tasks, 0 cached**, zero errors,
  six existing warnings (web 1, mobile 5).
- `npm test --workspace @stay-focused/web`: **265/265 tests, 42/42 files**,
  including Generate, generate-reviewer-state and generation recovery.
- `npm run build --workspace @stay-focused/api`: **1/1**, **35/35** static
  pages. No API implementation changes or remote service operation.
- `git diff --check` and `git diff --cached --check`: **PASS** for scoped
  implementation and documentation closure.
- `node apps/web/scripts/wg3-layout-check.mjs`: **35/35** page/viewport
  checks at 1440/1024/768/390 px plus 1440 px touch; **275** intercepted API
  requests, **5** checked move PATCH requests, **0** unexpected requests and
  **0** runtime errors. Fictional data only, fail-closed interception. Checks
  order/search/collapse, labels, primary count, menu keyboard/focus/visibility,
  single status and stale-failure priority, actual retry padding/recovery,
  Canvas compatibility and card/text geometry. Desktop/phone screenshots
  inspected; `.local/wg3/` remains uncommitted.
- Both browser harnesses' `node --check`: **2/2 PASS**.

First attempts retained: focused tests **32 passed / 2 failed**, corrected to
**34/34** (test-only counting/circular-child assertions); browser **0 complete /
1 failed** (checker treated text behind an opaque popover as a collision),
then **2 complete / timeout** (copied fixture job IDs), corrected to **35/35**;
typecheck **5/8 tasks** (one TS2739, new fixture missing two fields), explicit
nulls restored strict typing, final **8/8**; web **264 passed / 1 failed**,
41/42 files (exact className assertion), CSS-token assertion retains the
exactly-one-primary check, final **265/265**. No nondeterministic flake.
Existing non-failing Vite config-loader warning retained. Final chain restarted
serially after the last test edit and interruption. Exact evidence/log paths:
[WG3b acceptance](acceptance/wg3b-generate-home.md).

Mobile/Android build and tests: **NOT APPLICABLE**, website-only scope.
API tests: **NOT RUN**, API unchanged and outside requested suites.
Live provider/workflow probes: **NOT APPLICABLE**. Root build not required by
the WG3b gate list. No Supabase, Vercel, Google Cloud, Canvas or Resend call,
deployment, remote SQL/migration, Scheduler operation, email, environment-file
edit or push. Production revision, database rows, Scheduler and real-account
browser/device behavior: **UNVERIFIED (owner to confirm)**.

### Owner steps remaining

1. Rollout **NOT RUN**, skipped entirely: owner website deployment through
   RB6/fullsend and Vercel production from main. No WG3b migration.
2. Device checks **NOT RUN**, skipped entirely: after rollout review Generate
   with a real account at desktop and phone widths, including course order,
   hover/focus/touch menu, sync/failure/freshness line and recovery padding.
3. Confirm production revision, database/Scheduler state and real-account
   behavior; these remain **UNVERIFIED (owner to confirm)**.
4. Vercel CLI is not installed. Strongly recommend `npm i -g vercel` for later
   owner-controlled environment, deployment and log work; not run here.

Current state, roadmap and sprint are reconciled. WG3b is the finite endpoint;
no next roadmap item is authorized by this run.

## QU1 Queue popout redone - PASS locally (2026-10-18)

**Status: PASS for unattended STEP 0-5, tests, required fresh serial gates,
documentation and scoped local commits.** Branch
`overnight/2026-10-15_feedback`, baseline `cabd5b8`; no branch switch or push.
The finite endpoint is QU1. No later roadmap task was started.

Both apps use shared active-only batch summaries and one idle rule. Completed
outputs allow idle; running/queued/stopping jobs, visible attention items,
mobile pending intents, batch waiting/quota/failed requests and unfinished
summaries prevent it. Refresh is an accessible header icon beside Close, with
busy/disabled state during initial and cached-data refresh. The existing
pollers still deduplicate requests. Mobile retains outside tap and Android
Back; web retains outside pointerdown, Escape, blur and trigger focus return.
Existing Clear, QueueCard, batch Retry/Cancel and result-open actions remain.
Spacing/icons/colors come from the existing design system.

**4 of 4 diagnosis:** legitimate successful completion, not duplicate counting.
The screenshot defect was stale finished progress display. Code review also
found a separate count defect: terminal failed/cancelled requests and jobs
could leave progress unfinished forever, including after Clear. Terminal
attempts now settle progress while failures keep their independent attention
UI; Retry changes a request back to waiting and reopens progress. In-memory
API tests cover exact 4/4, overlapping membership, owner filtering, every job
status and retry reopening. No DTO/schema, grant/RLS, quota, job publication,
provider, dependency or migration change. No new ADR is needed.

### Commits

- `7eb50c2` feat(shared): add active batch summaries and idle queue rule
- `529d466` fix(api): settle terminal course batch progress
- `7f519a3` feat(mobile): compact queue popout with refresh icon
- `bc2e6b2` feat(web): compact queue popout with refresh icon
- `docs: close QU1` is the documentation closure commit containing this footer;
  its hash and all five commits are recorded in `tmp/overnight/QU1.status`.

All commits use author `galaxymaxp <omgraythekid@gmail.com>`. Only owned paths
are staged. Original untracked `UI/`, `apps/mobile/.gitignore`, `supabase/.temp/`
remain untouched. Build-generated API `next-env.d.ts` was restored; generated
outputs, local credentials, private fixtures and validation logs are not committed.

### Gate counts (all local, FRESH, serial)

- `npm run typecheck -- --force`: **8/8 tasks, 0 cached**, PASS.
- `npm run lint -- --force`: **8/8 tasks, 0 cached**, PASS; **0 errors,
  6 existing warnings** (five mobile import-order, one web unused import).
- Shared workspace tests: **446/446**, **44/44 files**, PASS; includes existing
  compiled copies and source tests. No separate source-only count is claimed.
- Web workspace tests: **278/278**, **42/42 files**, PASS.
- Mobile workspace tests: **1332/1332**, **139/139 files**, PASS.
- API workspace tests: **2315 passed, 3 skipped, 0 failed**, **201/201 files**, PASS.
- `npm run build --workspace @stay-focused/api`: **1/1**, **35/35** static pages,
  PASS after the final terminal-count change.
- `npm run build --workspace @stay-focused/mobile -- --platform android`:
  **1/1 export**, **1 Android bundle, 35 assets, 4262 modules**, PASS with Expo
  offline/telemetry disabled. This is a local export, not an APK or OTA release.
- Final scoped web typecheck/lint after the corrected fixture: **1/1 each**,
  PASS, one existing warning. Diff and each implementation staged-diff check:
  **0 whitespace errors**, PASS; docs staged check is part of closure.

First mobile attempt: **1324 passed / 8 failed**, **138/139 files**. New
assertions serialized mocked icon props with circular React Fiber references;
rendered-text assertions fixed that test-only defect. Initial lint passed
8/8 with eight warnings; two new duplicate imports were removed, final six
warnings are pre-existing. Initial API tests/build passed before final review;
the final API suite adds all terminal-status and retry coverage. A web test
fixture that combined a running badge with an empty list was corrected, then
the full web suite and scoped typecheck/lint passed. Non-failing Vite and Expo
color-environment notices remain. **No nondeterministic flake observed.**

Evidence, exact commands and acceptance matrix:
[QU1 acceptance](acceptance/qu1-queue-popout.md). Logs are ignored under
`tmp/overnight/QU1-*.log`; progress/status remain under `tmp/overnight/`.
Root aggregate/website production build: **NOT RUN**, outside QU1's explicit
gate list. Live provider/workflow probes: **NOT APPLICABLE**.

Production revision, actual database rows (including the screenshot's exact
batch), Scheduler state and real-account/device/browser behavior are
**UNVERIFIED (owner to confirm)**. Repository code/tests establish the display
and count diagnosis; no live production evidence is claimed. The referenced
`overnight/roadmaps/2026-10-18-web-desktop-mobile-polish-profiles.md` is absent;
the self-contained QU1 prompt and repository/current planning files establish
this scope. Named components were present and still had the old presentation;
existing web outside/Escape handling was preserved rather than duplicated.
No Supabase, Vercel, Google Cloud, Canvas or Resend call, deployment, remote SQL,
migration, Scheduler operation, email, environment-file edit or push occurred.

### Owner steps remaining

1. **Rollout - NOT RUN, skipped entirely:** owner website deployment and mobile
   OTA/APK. No QU1 migration is required. Coordinate rollout through the existing
   owner release procedure; no remote action was taken here.
2. **Device checks - NOT RUN, skipped entirely:** Android finished batch shows
   no N-of-N line and correct idle text; TalkBack says Refresh queue; refresh
   shows busy state/ignores repeated taps; outside tap and Android Back close.
   Web at 1440 and 390 px: same finished/partial/attention behavior, refresh
   label/busy state, outside/Escape/blur dismissal and trigger focus return.
3. Confirm production revision, database/Scheduler state and real-account
   behavior; these remain **UNVERIFIED (owner to confirm)**.
4. Vercel CLI is absent. Strongly recommend `npm i -g vercel` for later
   owner-controlled environment, deployment and log work; not run here.

Current state, roadmap and sprint are reconciled. QU1 stops here.


## RV2 unattended handoff - PASS locally (2026-10-18)

Status: **PASS** for finite STEP 0-4, tests, all required fresh serial gates,
docs and scoped local commits. Branch `overnight/2026-10-15_feedback`, baseline
`1064513`, tested implementation `ec580e9`. Both clients and signed-out web
now show one four-part pill. Expound retains independent expansion, full
button semantics and disabled rules; three levels keep their selection and
full accessibility labels. Original content and generation behavior remain.

Commits:

- `0b553dd feat(shared): compact topic level labels`
- `bf5febd feat(mobile): topic levels and expound in one pill`
- `fc1cb84 fix(mobile): preserve equal topic pill shares and hit bounds`
- `ec580e9 feat(web): topic levels and expound in one pill`
- Documentation closure: `docs: close RV2`; final hash and all commits are
  recorded in ignored `tmp/overnight/RV2.status` after the closure commit.

Narrow threshold: mobile **<380 measured row points**, leaving about 85pt
for text per segment at the boundary; web **<=400px viewport**. Short labels
are Original / Simpler / Simplest. Mobile visible segments are 32pt, with
vertical-only 6pt hit slop and 44pt parent bounds; no horizontal ScrollView.
Web uses equal shares, 44px targets, existing palette/radius/border tokens
and no overflow. Signed-out links retain the exact sign-in return path.

**FRESH PASS, serial:** forced root typecheck **8/8**, lint **8/8**, both
**0 cached**; shared **447/447** (44 files including existing compiled
copies), web **280/280** (42 files), mobile **1334/1334** (139 files); API
build **1/1**, **35/35** static pages; local Android export **1/1**;
diff/staged-diff **0 whitespace errors**. Six existing lint warnings. No
unit/gate failure or test skip. Isolated browser **24/24** at
1440/768/390/360px in light/dark, actual components/CSS, all network blocked,
zero unexpected requests/page errors. Screenshots at 360 light and 1440 dark
were inspected. This verifies component layout, not a deployed app flow.

Browser first attempts are retained: **0/24** before an equal-width assertion
caught padding affecting flex shares (layout corrected); **2/24** before a
wrong `returnTo` fixture expectation (existing helper uses `next`); **3/24**
before an encoded Windows screenshot path failed (harness now uses
fileURLToPath). Final **24/24** passed. No nondeterministic flake observed. Closure tooling initially exited 9009
because Python is unavailable; an equivalent Node helper completed docs
without an installation. No gate failure or partial doc edit resulted.
Exact commands/results and scope limits:
[RV2 acceptance](acceptance/rv2-topic-pill.md). Progress/logs/status and
screenshots remain ignored under `tmp/overnight/RV2*`.

### Owner steps remaining

1. **Rollout - NOT RUN, skipped entirely:** owner website deploy and mobile
   OTA/APK through the existing release process. No RV2 migration is needed.
2. **Device checks - NOT RUN, skipped entirely:** Realme Android at 360pt,
   compact/readable four-part pill, no scrolling, Expound opens/closes and
   TalkBack reads three level radios plus an expandable button. Real web at
   1440 and 390px.
3. Production revision, database rows, Scheduler state and real-account/device
   behavior are **UNVERIFIED (owner to confirm)**; no live check attempted.
4. Vercel CLI is absent. Strongly recommend `npm i -g vercel` for later owner
   environment/deployment/log work; no installation or CLI call was run.

No remote service call, deployment, remote SQL, migration application,
Scheduler action, email, environment-file edit or push occurred. API-generated
Next declarations were inspected and restored. Unrelated untracked paths were
preserved; no generated artifact, `tmp/` or `.local/` file was staged. Current
state, roadmap and sprint are reconciled. RV2 stops here.

## SH2 unattended handoff - STOPPED at STEP 0 (2026-10-18)

Status: **STOPPED**, per SH2 unattended rule 4 and STEP 0's instruction to
stop on code contradictions. SH2 is not implemented or complete. Baseline
`ef79f23`, branch `overnight/2026-10-15_feedback`; no branch switch. Local
upstream comparison: **37 ahead / 0 behind**, without fetching. Existing
untracked `UI/`, `apps/mobile/.gitignore`, `supabase/.temp/` are preserved.

Preflight evidence (baseline line numbers):

- `primitives.tsx:198`: Page exists; expected props at :200-241. Header title
  and subtitle at :288-293 share the row with back/leading/header actions,
  Queue and Profile controls. `headerBelow` is :302, outside the scroll area.
- Page's `onScroll` is passed directly to ScrollView at :307; native
  `RefreshControl` is :318. **Page has no `pull` helper or pull scroll handler.**
  The only `pull.onScroll` in the file is Sheet's at :564, from
  `useSheetDrag(dismiss, ...)` at :519. This observes scrolling for sheet
  drag-to-dismiss, not Page pull-to-refresh. Step 2 requires composing the
  Page hook with an existing pull handler that does not exist in Page.
  Reusing Sheet's handler would introduce unrelated dismissal semantics.
- `theme.tsx:30,85,98`: `useTheme()` exposes `reducedMotion`.
- `TodayScreen.tsx:289`: greeting is Page title; date is subtitle :290-294;
  SnapshotStatus is headerBelow :295-296.
- `TasksScreen.tsx:46,54`: Tasks and SnapshotStatus; course screen :100,124.
  The separate Tasks SyncStatus is currently scroll content at :58.
- `LibraryScreen.tsx:254`: LibraryCourseScreen; organizer onScroll :303;
  headerBelow :307 includes status, sort and filter/selection actions as well
  as offline caption :325. `libraryPresentation.ts:18-20` produces the caption;
  `useLibraryOrganizer.ts:138` observes offsets for drag organization.
- `ReviewerReader.tsx:268` updates anchors/metrics/scrubber; headerBelow :324
  includes snapshot status and ReviewerSearchBar. No existing shared
  hide-on-scroll header found by local design/web source inspection.

**Exact owner question for resumption (not asked during unattended run):**
May SH2 proceed by preserving Page's native RefreshControl unchanged and
composing the hide-on-scroll handler only with Page's existing caller
onScroll, treating the prompt's pull.onScroll reference as a Sheet-only
misidentification?

Title decision from STEP 0.3: keep the Today greeting/title row visible
because it shares the row with persistent header controls. On an approved
resume, only content below that row should collapse; the date currently in
subtitle would need moving into the collapsible region with SnapshotStatus.
No title/date layout changes were made. No animation method or thresholds
were implemented/chosen; the prompt's >24px beyond measured height, 8px
hysteresis and approximately 200ms easing remain proposed requirements.
Library's sort/filter/selection actions also need to stay visible when
isolating its offline caption. **PAR1:** no website hide-on-scroll header
found in inspected code; website implementation remains outside SH2 scope.

Verification and gate counts:

- **FRESH:** local STEP 0 source/Git inspection completed with the contradiction
  above. Initial upstream argument parsing failed once; quoted argument
  rerun succeeded with 37/0. This was metadata inspection, not a gate failure.
- **NOT RUN (0 executed):** `npm run typecheck -- --force`,
  `npm run lint -- --force`, `npm run test -w @stay-focused/shared`,
  `npm run test -w @stay-focused/mobile`,
  `npm run build --workspace @stay-focused/api`, and
  `npm run build --workspace @stay-focused/mobile -- --platform android`.
  Stopped before app edits; no test pass counts inferred from previous runs.
- **FRESH PASS (2/2, 0 whitespace errors):** documentation-only
  `git diff --check` and `git diff --cached --check`. No suite failure or flake.
- Production revision, database rows and Scheduler state are
  **UNVERIFIED (owner to confirm)**. No live check attempted.

Commits: one scoped documentation checkpoint, planned subject
`docs: record SH2 preflight stop`; the resulting hash is recorded in
`tmp/overnight/SH2.status` and `tmp/overnight/SH2.progress` after commit.
No implementation commits exist for SH2.

### Owner steps remaining

1. Resolve the handler question above, then resume SH2 implementation, tests
   and every required fresh serial gate before declaring code completion.
2. **Rollout - NOT RUN, skipped entirely:** mobile OTA/APK is Fely's, only
   after implementation and gates pass.
3. **Device checks - NOT RUN, skipped entirely:** Realme Today, Tasks,
   Library course and reviewer scroll down/up with no blank gap; persistent
   actions/tab bar; pull-to-refresh at top; instant Reduce Motion; reviewer
   search remains visible while typing/with query and after match jumps.
4. Confirm any needed live production state. Vercel CLI is absent; strongly
   recommend `npm i -g vercel` for later owner environment/deployment/log work.
   No installation or Vercel CLI command was run here.

No application code, dependency, migration, environment file or unrelated
work changed. No remote service call, deployment, remote SQL, Scheduler
operation, email or push occurred. Current state, roadmap and sprint record
this stop consistently; no later implementation step was entered.


## SH2b mobile hide-on-scroll - PASS (2026-10-18)

Status: **PASS - all finite unattended code steps and fresh gates complete
locally.** SH2 is done via SH2b; the owner's corrected Page/Sheet facts
resolve the earlier `d98e58b` stop. Baseline `d98e58b`, branch
`overnight/2026-10-15_feedback`. The earlier SH2 footer is historical.

Commits:

- `10347e2 feat(mobile): add hide-on-scroll header hook`
- `fb99de4 feat(mobile): hide secondary headers on scroll`
- This footer, acceptance report and planning reconciliation are committed
  as `docs: close SH2 mobile hide-on-scroll`; the resulting hash is recorded
  in `tmp/overnight/SH2b.status` and progress after commit.

One shared hook animates measured height and opacity to remove occupied
space; the natural inner measurement stays available when hidden. Existing
`motion.small` **180ms**, `Easing.inOut(Easing.quad)`; Reduce Motion sets
values instantly. Hide after downward travel beyond **measured height +
24pt** with **8pt accumulated hysteresis**; reveal on up, top/negative
overscroll, short refreshed content or a fitting resized viewport. Clamp
bottom offsets so elastic rebound/viewport enlargement cannot reopen it
accidentally. Stop interrupted/unmounted animations. Hidden descendants
use both accessibility exclusion properties and no pointer events.

Title decision (STEP 0.3): Today greeting stays in the title row because
Queue/Profile controls share that row; date moves from subtitle into the
collapsible SnapshotStatus region. Main and course Tasks status headers opt
in; main Tasks' existing Canvas sync line joins the collapsible region.
Library course isolates the offline caption, leaving sort/filter/selection
and status controls fixed via `headerBelowFixed`; organizer.onScroll still
runs. Reviewer snapshot/search collapses except when focused or a raw or
deferred query is active. This also holds it visible during match jumps.
Page calls hook then caller at 16ms; native RefreshControl is unchanged.
Back/header actions/tab bar remain visible. Sheet drag logic is untouched.
No new dependency, native module, schema, API or token; no ADR required.
**PAR1:** website has no hide-on-scroll header in inspected source.

Verification (final code, fresh and serial):

- **FRESH PASS:** `npm run typecheck -- --force`, **8/8 tasks, 0 cached**.
- **FRESH PASS:** `npm run lint -- --force`, **8/8 tasks, 0 cached**;
  zero errors, six existing warnings (five mobile import-order, one web unused import).
- **FRESH PASS:** `npm run test --workspace @stay-focused/shared`,
  **447/447**, **44 files**, including existing compiled copies.
- **FRESH PASS:** `npm run test --workspace @stay-focused/mobile`,
  **1365/1365**, **141 files**. Focused design/screens/Reviewer: **117/117**.
- **FRESH PASS:** `npm run build --workspace @stay-focused/api`, **1/1**,
  **35/35 static pages**. Generated `next-env.d.ts` restored to baseline.
- **FRESH PASS:** `npm run build --workspace @stay-focused/mobile -- --platform android`,
  **1/1 local export**. Expo offline and telemetry disabled in process env;
  environment files untouched. Generated exports remain ignored.
- **FRESH PASS:** `git diff --check` and `git diff --cached --check`,
  **2/2**, zero whitespace errors, including final documentation.
- All **7/7 required gate commands** passed; staged-diff checks also passed.
  API unit/provider suites were **NOT RUN / NOT APPLICABLE** to this mobile-only change.

Failed first attempts are retained: initial hook stub **15 passed / 2 failed**
(static interpolation stub corrected); initial mobile typecheck **1 error**
and combined focused tests **107 passed / 8 failed** (missing Today spacing
import corrected); initial forced lint **7/8 tasks**, **1 error / 8 total
warnings** (test element construction and two new import warnings corrected).
The next focused run passed **115/115**; two added bottom-offset regressions
bring the final focused total to **117/117**. Final root gates were repeated
for the final code. No nondeterministic flake. Existing Vite config-loader,
react-test-renderer and terminal color diagnostics do not indicate failures.
Documentation helper first attempts found Python unavailable; Node performed
the local edits successfully. Exact acceptance:
[SH2b report](acceptance/sh2b-hide-on-scroll.md).
Ignored raw logs/progress/status: `tmp/overnight/SH2b*`; none committed.

### Owner steps remaining

1. **Rollout - NOT RUN, skipped entirely:** Fely's mobile OTA/APK.
2. **Device checks - NOT RUN, skipped entirely:** Realme Today, Tasks,
   course Tasks, Library course and reviewer down/up with no blank gap;
   persistent actions/tab bar; existing pull-to-refresh at top; instant
   Reduce Motion; reviewer search while focused/typing/querying/match jumping;
   TalkBack hidden descendants and restoration at the top.
3. Production revision, database rows, Cloud Scheduler state and real-account/
   device behavior are **UNVERIFIED (owner to confirm)**. No live check attempted.
4. For later owner Vercel work, the CLI is absent; strongly recommend
   `npm i -g vercel` for environment/deployment/log tooling. No installation
   or Vercel CLI command was run in this unattended slice.

No remote service call, deployment, remote SQL/migration, Scheduler change,
email, environment-file edit or push. Unrelated `UI/`,
`apps/mobile/.gitignore`, `supabase/.temp/` and ignored temporary work are
preserved. Current state, roadmap and sprint are reconciled. SH2b is the
finite endpoint; no later roadmap work was started.

## OS1 Other source rows - STOPPED at STEP 0 (2026-10-18)

**Status: STOPPED, not implemented.** Baseline `c6584b5` on
`overnight/2026-10-15_feedback`; HEAD is after `ef79f23` and includes SH2b.
Local upstream tracking is `github/main`, ahead 41 at preflight; remote
freshness is **UNVERIFIED (owner to confirm)**. Initial dirty paths were
only unrelated untracked `UI/`, `apps/mobile/.gitignore`, `supabase/.temp/`;
all preserved. No branch switch, application edit or later task.

**Stop authority:** `tmp/overnight/prompts/OS1.md`, unattended rule 3:
"It is a STOP if the code itself contradicts what the prompt assumes."
Rule 4 requires a safe commit, handoff question, STOPPED status and end.
STEP 1 assumes an existing RowLink pressed surface tint that can be reused.
Actual `apps/mobile/src/design/primitives.tsx:399-459` has only pressed
opacity (`:451`, 0.7 versus 1) and scale (`usePressMotion`, `:96-114`),
with no background tint. A plain reuse cannot meet the specified tint.
Its props also lack `testID`; accessible button role/label and disabled/
selected state exist. This is a code contradiction, not a live-access block.

**Exact question for the owner (recorded, no answer requested overnight):**
May the resumed OS1 use a local source-row component with the existing
surface/text tokens, 48pt minimum target, icon before label, button role,
accessible label, original testIDs/handlers/disabled behavior, and a new
subtle pressed surface tint, since RowLink currently has opacity/scale
feedback only and no testID prop?

STEP 0 source findings (FRESH local inspection):

- `ReviewerGenerateScreen.tsx:116`: Other source Sheet. `:122-125`:
  chooser with three secondary Buttons, original text/camera/file testIDs,
  `changeMode("paste")`, `pick("camera")`, `pick("file")`; busy disables
  Camera/File. `:138-140`: default Buttons for Take photo / Choose photo /
  Choose PDF, DOCX or PPTX. Footer actions `:118-120` and Try again `:146`
  remain untouched.
- `Button.tsx:31`: default primary; `:112-118`: accent background and
  accentText. `:122-128`: secondary cardElevated background/textPrimary.
  `theme.tsx:106-112` and `tokens.ts:7-13` map those to surfaceElevated,
  accent/onAccent and textPrimary. `themeTokens.ts:6-13` light:
  secondary white `#FFFFFF` / text `#111111`, primary `#171717` / white;
  `:36-43` dark: secondary `#2C2C2E` / white, primary `#F5F5F5` / `#111111`.
  Thus light secondary and dark primary explain the filled white controls.
  Global Button remains unchanged.
- `RowLink` details above; `tokens.ts:66-67` defines hitTarget.min = 48.
  Existing lucide dependency and primitives imports are present.
- Web `own-material.tsx:85-87`: Source group, Paste text / Upload a file,
  aria-pressed from mode. Actual CSS is `apps/web/app/globals.css`, not
  `apps/web/src/app/globals.css` (harmless path drift). Shared `.segments`
  at `:589-611` uses transparent buttons and selected `var(--elevated)`;
  light `--elevated: #fff` at `:5`, dark `#2c2c2e` at `:57`. `:1159-1161`
  adds selected shadow. White/filled highlight confirmed; conditional web
  change is applicable but not started because STEP 0 stopped. Future
  override must use `.own-material .segments`. Existing Icon is
  `src/components/ui.tsx:6`; local `text-align-start.svg` and `file-text.svg`
  assets exist.

Acceptance / gate counts:

- Preflight assumption check: **FRESH, STOPPED**, 1 contradiction.
- Mobile chooser/in-mode rows, behavior/icon/busy tests, conditional web
  icons/selection tests: **NOT RUN**, no implementation.
- `npm run typecheck -- --force`, `npm run lint -- --force`, shared/mobile/
  web workspace tests, API build, Android export, web build: **NOT RUN**,
  **0/8 implementation gate commands**, stopped before editing code.
- `git diff --check`, `git diff --cached --check`: **FRESH PASS**, **2/2**,
  zero whitespace errors for this documentation checkpoint.
- No test failures or flakes; lookup attempts at OS1's stale CSS path and
  guessed theme/Icon/pressMotion/SH2 report paths were resolved by source
  discovery. No build or test attempt occurred. No cached result claimed.

Local commit: `docs: record OS1 preflight stop`, author
`galaxymaxp <omgraythekid@gmail.com>`, contains only current-state, roadmap,
current_sprint and this footer. Its final hash and subject are recorded in
`tmp/overnight/OS1.status` and `tmp/overnight/OS1.progress` after commit;
no tmp artifact is staged. No implementation commit was made.

### Owner steps remaining

1. Resolve the recorded RowLink assumption and issue corrected resume
   instructions; implement mobile rows and conditional scoped web treatment,
   then run every required fresh serial gate before claiming OS1 complete.
2. **Rollout - NOT RUN, skipped entirely:** Fely's mobile OTA/APK and any
   web deployment after implementation and acceptance.
3. **Device checks - NOT RUN, skipped entirely:** Realme light/dark Other
   source Text/Camera/Local File icon rows, subtle pressed tint without
   white fill; matching Take photo / Choose photo rows; Text opens editor.
4. Production revisions, database rows, Scheduler state and actual device/
   real-account behavior are **UNVERIFIED (owner to confirm)**. No live
   checks attempted. For later owner Vercel work, strongly recommend
   installing its absent CLI with `npm i -g vercel`; nothing installed here.

No remote service call, deployment, remote SQL/migration, Scheduler action,
email, environment-file edit or push. All three planning files reconcile
OS1 as STOPPED/pending. No ADR needed. Finite unattended endpoint reached
by the mandatory preflight stop; no implementation step was crossed.
