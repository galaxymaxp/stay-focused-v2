# Current State

Last refreshed: 2026-07-15, Asia/Manila.

## Product Recovery R6 - Partial Device Acceptance

R6 automated acceptance is complete, but real-device acceptance remains
partial because this runtime did not provide a controllable physical iPhone
Expo Go session. The API dev server started on port 3000, `/api/health`
returned `{"status":"ok","version":"2.0.0"}`, Metro started on port 8081, and
the Expo root returned HTTP 200. Root typecheck, lint, workspace tests,
reviewer web smoke tests, PDF OCR web smoke, R3 OCR validation, R4 Canvas
validation, R5 Canvas validation, and the root production build all passed with
the R5 totals intact: Canvas 69/69, OCR 25/25, engine 287/287, API 428/428,
mobile 154/154, and reviewer web smoke 51/51.

No R6 production defect was reproduced and no product code was changed. The
focused report is
`docs/ai/product-recovery-r6-device-acceptance-20260715.md`. Physical iPhone
normal text size, Dynamic Type, VoiceOver, LAN reachability, slow-network
interruption, destructive-navigation prompts, and Study Library handoff remain
deferred and must be observed before R6 can be marked complete.

## Product Recovery R5 — Canvas Source Selection and Reviewer UX

R5 is complete. The selected-course Canvas path is now a staged student flow:
open a synchronized course, choose one authoritatively ordered source, prepare
a file when needed, check and edit the exact usable text, generate through the
existing protected reviewer route, and save the immutable source snapshot to
Study Library. The normal mobile path no longer forces multi-source structure
and block-selection controls on a student creating a reviewer from one item.

Source descriptors now carry safe typed capability and proven module/item
placement. The API orders proven module sources by module and item position,
keeps unproven sources in a conservative ungrouped section, and exposes no
source body, raw Canvas identity, hash, URL, or Storage field. Bounded later
pages can be loaded only through continuous duplicate-free inventory merges.

Mobile request tokens, abort controllers, exact selection keys, fingerprint
bindings, single-flight locks, and destructive-navigation prompts clear or
ignore stale preparation, preview, generation, and save work. The UI follows
the bundled V1.2 parchment/gold/flat-content system, uses Lucide outline icons,
and announces progress and selected/disabled states without color-only meaning.

Protected R5 validation passed a selected-course inventory, stable ordering,
live usable Page resolution, a genuine preview edit, reviewer generation,
snapshot-bound save and cleanup, stored-file resolution, and controlled
unsupported/inaccessible/stale zero-reviewer-call gates. Measured durations
were 8,734 ms inventory, 5,450 ms text resolution, 5,362 ms file resolution,
and 8,320 ms reviewer generation. Full details are in
`docs/ai/product-recovery-r5-canvas-source-selection-reviewer-ux-20260715.md`.

## Product Recovery R4 — Canvas Usable-Content Resolution

R4 is complete. Canvas Page, Assignment, Announcement, stored Image/PDF, and
supported module-link resolution now pass through one typed terminal boundary:
`usable`, `empty`, `unsupported`, `inaccessible`, or `failed`. Reviewer source
contains only normalized instructional content; source titles, filenames,
module/item labels, IDs, and artificial page/source markers remain separate
provenance. Stored files reuse the secure ingestion/extraction path and exact
R3 completeness verifier without a second download or OCR implementation.

Protected Canvas reviewer generation now requires a preview session, course,
exact ordered item IDs, and deterministic resolution fingerprint. The server
rechecks selection, ownership/course boundaries, current synchronized HTML
hashes, and stored-file hash/readiness before creating a provider. Mobile uses
abort controllers and monotonic request tokens to clear or ignore stale source.
R4 protected validation passed for a real Page reviewer and real stored Image;
controlled unsupported, inaccessible, and incomplete sources made zero
reviewer calls. Full details are in
`docs/ai/product-recovery-r4-canvas-usable-content-resolution-20260713.md`.

## Repository Baseline

- Branch: `main`
- Phase 5A secure Canvas foundation baseline:
  `6ec6ee7 feat(canvas): begin secure sync foundation`
- Phase 4 live-validation baseline before documentation and route-fix commit:
  `2e945cf feat(library): implement Phase 4 study library persistence`
- Local baseline before Phase 3B: `6e91231 feat(ocr): add provider-agnostic OCR API boundary`
- Upstream status at refresh: `main...origin/main`, ahead 0 and behind 0
- Working tree before Phase 5A.1 validation contained unrelated generated/mobile
  files left untouched: `apps/api/next-env.d.ts`,
  `apps/mobile/expo-env.d.ts`, and untracked `apps/mobile/.gitignore`.

## Working Vertical Slice

The current product slice is:

```text
Sign in
-> paste source text, import a gallery image, take a camera photo, or import a PDF
-> review and edit source text
-> authenticated reviewer API
-> OpenAI generation
-> coverage, grounding, and leakage validation
-> reviewer preview
-> save to Study Library
-> list, open, rename, or delete saved reviewers
```

The Expo app supports email/password Supabase sign-in, restores sessions, and
sends the session bearer token to `POST /api/reviewer/generate`. The Next.js API
route verifies that token with Supabase, validates the pasted-text request,
creates the server-only OpenAI provider, runs the Stage 0 through Stage 6 engine
pipeline, and returns a reviewer preview payload. Expo Web is the fast
laptop-browser regression surface for this mobile flow.

The Canvas reviewer slice is also complete for already synchronized selected
courses:

```text
Courses
-> selected synchronized Canvas course
-> choose supported Page, assignment-description, announcement, or ready PDF/image sources
-> prepare one eligible PDF/image when needed
-> choose structured content blocks
-> preview and edit combined source text/title
-> protected preview session
-> existing reviewer API
-> immutable source snapshot after successful generation
-> reviewer preview
-> save to Study Library
-> safe provenance summary in reviewer detail
-> manual source-health check and regeneration-readiness summary
```

Phase 3A also adds a protected server OCR route:

```text
Bearer-authenticated multipart image upload
-> MIME and size validation
-> provider-agnostic OCR interface
-> server-only Google Cloud Vision adapter
-> normalized pages, blocks, and lines
-> safe JSON response
```

Phase 3B adds the mobile client gallery call path, and Phase 3C extends the
same path to camera capture: selected or captured PNG/JPEG images can be
previewed, uploaded to `POST /api/ocr/extract`, and converted into editable
source text. The reviewer engine receives only the final edited text through
the existing reviewer route. Live iPhone Expo Go validation has passed against
the local Next.js API over LAN with server-only Google Cloud Vision OCR.

Phase 3D adds scanned-PDF ingestion as a validated synchronous small-batch MVP:

```text
Bearer-authenticated multipart PDF upload
-> PDF signature, size, parseability, encryption, and 1-5 page validation
-> Google Vision synchronous batchAnnotateFiles with inline PDF bytes
-> strict verification of exactly one terminal result for every page
-> normalized page-ordered text only when the document is complete
-> editable extracted-text review
-> existing reviewer generation route
```

PDF files stay server-bound, Google credentials remain server-only, Cloud
Storage is not used, and PDFs over five pages are rejected instead of silently
truncated. Live iPhone Expo Go validation has passed against the local Next.js
API over LAN with server-only Google Cloud Vision PDF OCR.

Product Recovery Phase R3 makes page completeness an enforced source boundary
for manual and Canvas-backed OCR. `@stay-focused/ocr` now verifies the trusted
expected page count, exact unique coverage of `1..N`, page range, terminal page
status, explicit blank pages, failures, deterministic order, and source
eligibility. Missing, duplicate, malformed, out-of-range, or failed pages
return sanitized incomplete-document metadata with no assembled source;
reviewer generation cannot start from that result. The five-page PDF limit is
centralized and retained because the current inline synchronous Google Vision
`files:annotate` method supports at most five pages per request. R3 is complete
in `docs/ai/product-recovery-r3-full-document-ocr-20260713.md`.

Phase 4 adds user-owned reviewer persistence:

```text
Validated reviewer output
-> authenticated reviewer CRUD API
-> caller-scoped Supabase client
-> reviewers table protected by RLS
-> Study Library list/open/rename/delete
```

The mobile app can save a generated reviewer after the existing reviewer
pipeline succeeds. Saved reviewers reopen in the existing `ReviewerPreview`
without regeneration. The library stores reviewer output and a small
allowlisted source-metadata object; raw pasted source text, OCR text, uploaded
images, PDFs, file paths, credentials, and private OCR artifacts are not stored
by the save flow.

Live Phase 4 validation is complete. The Supabase migration was already
applied, the `public.reviewers` table exists, RLS remains enabled, and the
owner SELECT, INSERT, UPDATE, and DELETE policies were verified to use
`auth.uid() = user_id`. Two distinct authenticated users were validated through
the local API without service-role reviewer CRUD: owner create/list/open worked,
cross-user list/open/rename/delete denial returned safe
`404 reviewer_not_found` responses, reverse isolation passed, and both
fictional validation rows were deleted by their owners.

Phase 5A adds the first Canvas foundation slice:

```text
Courses surface
-> Canvas URL and user-generated personal access token entry
-> protected Canvas connection API
-> Canvas profile validation
-> AES-256-GCM encrypted token storage
-> safe connection metadata
-> course discovery
-> initial capability registry
-> disconnect
```

Phase 5A uses personal access tokens generated by individual Canvas users.
There is no school-wide Canvas token. Each token belongs only to the user who
generated it, inherits only that user's Canvas permissions, cannot access
school-wide data, and cannot bypass locked, hidden, unpublished, or
permission-restricted content. The Canvas token is submitted only to the
protected API, encrypted before persistence with `CANVAS_TOKEN_ENCRYPTION_KEY`,
stored for that Stay Focused user only, and never returned to mobile. The
mobile token field uses secure text entry, is not written to AsyncStorage or
SecureStore, and is cleared from component state after a connect attempt. The
Phase 5A capability probe is small and permission-aware: profile, courses,
enrollments, modules for one course, assignment groups for one course, and
planner can be tested while most future capabilities remain `not_tested`.

Phase 5A.1 direct live Canvas validation passed from a server-side Node script
using one developer-owned personal access token from existing local Canvas
credential names without exposing values. Profile validation, course listing,
and the small capability probes passed against the Canvas HTTPS host; 17
courses were returned for that token. Those results prove only that user's
available Canvas capabilities and do not prove institution-wide access.
Capability availability may differ per user, course, role, or institution. The
live course count did not require a second pagination page, so live pagination
was not exercised, while automated Canvas tests still cover ordered pagination
and cross-origin pagination rejection. The Phase 5A Supabase migration is now
applied remotely and verified for table presence, RLS, and no direct
`anon`/`authenticated` access to encrypted credential columns. The protected
Phase 5A API lifecycle is now complete and live validated after configuring a
real app-owned `CANVAS_TOKEN_ENCRYPTION_KEY` in the ignored API-local
  environment file. The key is canonical padded Base64 and must decode to
  exactly 32 bytes; the encryption helper accepts surrounding environment
  whitespace but rejects non-canonical or malformed key material when
  encrypting or decrypting.

Protected lifecycle validation passed on `http://localhost:3000` with the
established smoke-test Stay Focused user and finished disconnected:

```text
API health
-> Supabase bearer authentication
-> PUT /api/canvas/connection with the user's submitted Canvas PAT
-> encrypted per-user persistence
-> GET /api/canvas/connection
-> GET /api/canvas/courses from the stored credential
-> GET /api/canvas/capabilities
-> invalid replacement PAT preserves the valid connection
-> DELETE /api/canvas/connection
-> final disconnected state
```

The protected connect response returned 17 courses and 25 capability records
without PAT, ciphertext, IV, authentication tag, or encryption-version fields.
Server-side persistence checks confirmed one row for the selected user,
populated ciphertext/IV/authentication-tag/encryption-version fields, no
plaintext PAT column, ciphertext not equal to the submitted PAT, and capability
rows scoped to the same user and connection. Disconnect removed the connection
and dependent capability rows, left saved reviewers unchanged, and the final
status returned `connection: null`.

Phase 5A.2 hardening closed the independent audit conditions. Stored
ciphertext, IV, and authentication-tag fields now use strict canonical Base64
decoding and fail closed when malformed. `PUT /api/canvas/connection` persists
the connection and full capability snapshot through the atomic
`replace_canvas_connection_with_capabilities` RPC, and the database enforces
capability ownership with a composite `(canvas_connection_id, user_id)` foreign
key. Automated two-user route tests now prove User B receives disconnected or
empty states for User A's Canvas data and cannot delete or mutate User A's
connection or capabilities. The Canvas client rejects HTTP redirects with
`canvas_redirect_rejected` and uses `redirect: "manual"` for authenticated
requests. Live second-user Canvas validation remains not run.

Phase 5B.1 adds the academic graph foundation for future Canvas
synchronization. The remote migration
`202607050004_create_canvas_academic_graph.sql` is applied and verified. It
creates `canvas_courses`, `canvas_modules`, `canvas_module_items`,
`canvas_pages`, `canvas_assignment_groups`, and `canvas_assignments` with
stable Canvas identities, synchronization metadata, composite ownership
constraints across `user_id`, `canvas_connection_id`, and `course_id`, RLS, and
revoked direct `anon`/`authenticated` grants. The `@stay-focused/canvas` client
now has typed methods for courses, modules, module items, Pages, Page detail,
assignment groups, and assignments. This phase does not implement full
synchronization, scheduled jobs, background workers, mobile course screens,
announcements, discussions, planner data, quiz metadata, files/media ingestion,
incremental sync, or reviewer generation from Canvas content.

Phase 5B.2 adds the first complete manually triggered academic graph
synchronization path:

```text
POST /api/canvas/sync
-> authenticated Supabase user
-> user-owned encrypted Canvas connection
-> API-only PAT decryption
-> active Canvas courses
-> complete per-course graph snapshot
-> atomic per-course database replacement
-> sanitized sync-run summary
```

The synchronization remains synchronous and manual. It has no scheduled job,
background worker, cron, webhook, mobile screen, automatic app-launch call, or
notification path. Persistence is atomic per course, not one transaction for
the whole Canvas account. A partial account sync may commit successful courses
while preserving failed courses. A successful complete course snapshot may
prune stale child resources for that course only; incomplete snapshots do not
prune anything. Courses missing from the active-course response are not
deleted.

Remote migrations `202607050005_add_canvas_academic_sync.sql` and
`202607050006_fix_canvas_connection_rpc_ambiguity.sql` are applied and
verified. The repair migration keeps the Phase 5A connection replacement RPC
usable after live validation exposed an ambiguous `user_id` conflict target;
the historical migration was not edited. Live validation recreated the
encrypted stored Canvas connection through `PUT /api/canvas/connection` using
the established smoke-test user and ignored local Canvas credentials, then ran
`POST /api/canvas/sync` twice. Both sync calls returned HTTP 200 with a
documented partial status: 17 courses discovered, 13 succeeded, 4 failed with
sanitized `canvas_course_fetch_failed`, 27 modules, 311 module items, 459
Pages, 18 assignment groups, and 25 assignments. The second run preserved
internal identities, kept `first_synced_at` stable, advanced `last_synced_at`,
introduced no duplicate identities, and left zero running sync rows. The
encrypted Canvas connection remains stored for later Canvas phases.

Phase 5B.3A is complete. Remote migration
`202607050007_add_canvas_sync_course_results.sql` adds sanitized per-course
sync diagnostics through `record_canvas_sync_course_result`, with RLS enabled,
direct `anon`/`authenticated` grants revoked, and public RPC execution revoked.
The hardened sync path keeps the Phase 5B.2 synchronous manual route and
per-course atomic transaction boundary, adds two bounded retries for transient
Canvas failures, respects capped `Retry-After`, and does not retry
non-retryable Canvas 4xx, malformed, redirect, pagination, or persistence
failures. Two hardened live syncs returned HTTP 200 partial results: 17 courses
discovered, 13 succeeded, and 4 failed with sanitized
`canvas_course_pages_failed` Page-listing `resource_not_found` 4xx diagnostics,
zero retry attempts, 27 modules, 311 module items, 459 Pages, 18 assignment
groups, and 25 assignments. Duplicate identities remained 0, internal
identities remained stable, first-sync timestamps remained stable, last-sync
timestamps advanced for successful courses, and zero sync rows remained
running. Phase 5B.3A remains closed.

Phase 5B.3B is complete. Remote migration
`202607050008_add_canvas_incremental_sync_state.sql` adds
`canvas_course_sync_states`, expands sync modes to `full` and `incremental`,
expands course-result statuses to `succeeded`, `unchanged`, and `failed`, and
adds service-role-only RPCs for mode-aware run creation, changed-course graph
replacement plus sync-state advancement, unchanged-course state recording, and
failed-course state recording. Incremental mode computes a versioned
deterministic fingerprint from the normalized persistence payload after
fetching the complete required Canvas snapshot. Matching fingerprints skip
database graph replacement and pruning while advancing safe sync-state
metadata. Changed snapshots persist atomically; failed fetches preserve the
previous graph and last successful fingerprint.

Remote rollback verification passed through
`scripts/phase5b3b-incremental-sync-verification.sql`. Live validation used the
existing encrypted Canvas connection and aggregate-only output. One full run
returned HTTP 200 partial in 50.725 seconds with 17 courses discovered, 13
changed/succeeded, 0 unchanged, 4 failed with sanitized
`canvas_course_pages_failed`, 27 modules, 311 module items, 459 Pages, 18
assignment groups, 25 assignments, and 13 graph replacements. Two immediate
incremental runs returned HTTP 200 partial in 47.502 seconds and 46.750
seconds with 13 unchanged, 0 changed, 4 failed, 0 graph replacements for
unchanged courses, advanced state checks, preserved failed fingerprints, stable
unchanged graph timestamps, deterministic fingerprints, 0 duplicate identities,
and 0 running sync rows. Incremental mode does not yet reduce Canvas network
requests because it still fetches complete snapshots before comparison.
Secondary Canvas resources remain deferred.

Phase 5B.3C1 is complete as a live capability audit only. A local ignored
harness used the stored encrypted Canvas connection through the API-side
service-role/decryption boundary and audited active courses, modules, module
items, Pages, Page details, assignment groups, and assignments. Production
synchronization behavior was not changed, no sync runs were created, and no
graph state was modified. ETags were present and stable on all audited
endpoint families, but `Last-Modified` was absent and every primary
conditional request returned HTTP 200 with a full body rather than 304. The
baseline and conditional passes both transferred 154,503 response-body bytes,
so observed body-byte reduction was 0%. One paginated Page collection included
a later page, confirming that any future pagination-safe strategy would need
independent per-page validator and pagination state. The four known
Page-listing failures remained `canvas_course_pages_failed`,
`resource_not_found`, non-retryable, not 304, and did not advance graph or
fingerprint state. Phase 5B.3C1 recommends no production conditional-fetch
support for the currently synchronized endpoint families.

Phase 5B.4A is complete as a backend-only planner-item and announcement sync
slice. It adds typed Canvas client methods for planner items and announcements,
normalizes both resource families into bounded payloads with deterministic
fingerprints, and persists them through service-role-only snapshot RPCs into
`canvas_planner_items` and `canvas_announcements`. The sync uses ordinary GET
requests, preserves the existing redirect/pagination/retry protections, and
uses one captured run timestamp with a rolling 30-day past and 120-day future
window. Planner pruning is authoritative only after a complete user/context
planner snapshot is fetched; announcement pruning is authoritative only after a
complete per-course announcement snapshot is fetched.

Remote migrations `202607060001_add_canvas_planner_announcements.sql` and
`202607060002_harden_canvas_planner_announcement_triggers.sql` are applied.
Remote rollback verification passed through
`scripts/phase5b4a-planner-announcements-verification.sql`, covering tables,
indexes, foreign keys, uniqueness, RLS, restricted grants, service-role-only
RPC execution, controlled search paths, cross-user denial, safe scoped pruning,
and unchanged earlier Canvas protections. Protected live validation used the
existing encrypted Canvas connection and aggregate-only output. The first run
returned HTTP 200 `partial` in 72.370 seconds, discovered 17 courses, preserved
13 successful course graphs and 4 Page-listing failures, inserted 37 planner
items and 19 announcements, and left zero running sync rows. The second run
returned HTTP 200 `partial` in 63.048 seconds, classified 37 planner items and
19 announcements as unchanged, produced zero duplicate identities, zero
unnecessary updates, zero unexpected pruning, stable failure categories, and
zero running sync rows. Four announcement persistence scopes remain partial for
the same unavailable course graphs and are reported with sanitized
`canvas_announcement_persistence_failed` diagnostics while preserving stored
data.

Phase 5C.1 is remotely and live validated as a backend-only secure Canvas file
inventory and bounded ingestion foundation. The Canvas sync route now
inventories course file metadata for successful course graphs and records file
references from module items, Page HTML, assignment HTML, and announcement
HTML. The protected `POST /api/canvas/files/ingest` route accepts selected
owned `canvas_files` row ids, re-fetches Canvas file metadata, downloads only
eligible files within strict byte and redirect limits, validates basic content
signatures, writes eligible bytes to the private `canvas-source-files` bucket,
and records sanitized per-file terminal results. Remote migrations
`202607060003` and `202607060004` are applied; the follow-up migration fixed
new Phase 5C.1 foreign-key index advisor findings. Private Storage, direct
grant denial, RPC ownership rejection, protected live ingestion, and second-run
object stability passed. This phase does not parse, OCR, transcribe, preview,
or generate reviewers from Canvas file contents. The synchronous
`POST /api/canvas/sync` route measured 72.294 seconds and 65.355 seconds in
local production-build validation against `maxDuration = 60`, so Phase 5C.1 is
not claimed production-runtime safe yet.

Phase 5C.2A1 is complete. Canvas course listing is now a selectable inventory
instead of an instruction to synchronize every visible shell. Courses are
classified for presentation as likely current, past or concluded, other or
uncertain, or unavailable using Canvas metadata rather than course-name
keywords. Eligible courses from the first three categories can be selected;
unavailable courses are disabled with a safe reason. Academic-unit
synchronization limit: none.

Selected-course preferences are stored in
`canvas_course_sync_preferences` behind service-role-only RPCs, composite
ownership constraints, RLS, revoked direct client grants, and controlled
function search paths. Deselecting a course disables future normal
synchronization but does not delete synchronized graph data, file metadata,
stored objects, or sync history. Normal mobile sync now calls independent
`POST /api/canvas/courses/:courseId/sync` requests with maximum concurrency
two. The course-scoped route reuses the existing single-course sync engine for
course-owned resources and excludes user-wide planner synchronization.

Remote migration `20260706113150_add_canvas_course_sync_preferences.sql` is
applied and verified through
`scripts/phase5c2a1-course-selection-verification.sql`. Protected live
validation used the existing stored encrypted Canvas connection and returned
76 course shells: 15 likely current, 59 past or concluded, 2 other or
uncertain, and 0 unavailable. Two likely-current courses were selected,
persisted, restored after reload, synchronized independently, deselected, and
reselected with aggregate-only output. First selected-course sync returned one
`success` in 6.052 seconds and one `partial` in 8.492 seconds; the second run
completed in 5.833 seconds and 7.849 seconds with zero duplicate identities,
zero unnecessary updates, zero unexpected pruning, and zero running course
sync rows. The partial course reported sanitized `canvas_course_files_failed`
while preserving previous data. The account-wide route was not called by the
normal selected-course flow.

Phase 5C.2A2 is complete. Selected synchronized courses can expose a protected
source list made from existing synchronized Page bodies, assignment
descriptions, announcement messages, and unavailable file metadata. The source
list verifies the active owned Canvas connection, internal course ownership,
selected-course preference, and course synchronization state, then returns only
bounded descriptors without source bodies, raw HTML, Canvas URLs, signed URLs,
Storage object keys, raw Canvas IDs, or credential fields.

The protected preview route accepts ordered internal source descriptor ids,
rejects duplicates, unknown ids, cross-course ids, unavailable files, and
over-limit selections, and assembles editable plain text with deterministic
source boundaries. HTML normalization uses `parse5`, removes executable and
hidden content, strips URL/token-shaped strings, and preserves useful block,
list, and table boundaries. Preview does not call Canvas, decrypt the PAT, call
Storage, run OCR, call OpenAI, or generate a reviewer. Mobile now adds
`Create reviewer from Canvas` for saved selected synchronized courses,
sections sources into Pages, Assignments, Announcements, and Files, preserves
selected order, lets students edit the preview text/title, calls the existing
reviewer-generation service with only `sourceText` and `sourceTitle`, and saves
through the existing Study Library with minimal `sourceMode: "canvas"`
metadata. No migration or persistent Canvas provenance table was added.

Phase 5D.1 is implemented, remotely verified, and protected-live validated as
the first bounded Phase 5D slice. Canvas preview now creates a short-lived
private preview session with the exact original assembled preview text, hash,
ordered source manifest, and parser/OCR version identifiers. Successful Canvas
reviewer generation validates the owned preview session, sends only final
`sourceText` and `sourceTitle` to the reviewer engine, then creates or reuses an
immutable source snapshot with the exact edited text, original preview hash,
edit state, and ordered source items. Canvas reviewer save requires an owned
snapshot with matching metadata, and reviewer detail returns only a safe
provenance summary. Historical and non-Canvas reviewers remain valid without
fake backfill. Protected live validation completed on 2026-07-08 with
aggregate opaque output only.

Phase 5D.2 is implemented, remotely verified, and protected-live validated as
the structured selective import slice. Canvas sources can now be normalized
into private short-lived HTML/OCR block manifests, returned to mobile as safe
public selectors, selected by the student before preview, and assembled
server-side into the existing editable preview boundary. Selected block
manifests are copied into immutable reviewer source snapshot blocks after
successful generation, reviewer detail summaries expose only selected-block
counts, and the reviewer engine/provider boundary still receives only
`sourceText` and `sourceTitle`. Protected live validation completed on
2026-07-08 with a selected source/block preview and immutable snapshot import.

Phase 5D.3 is implemented, remotely verified, and protected-live validated as
the duplicate relationship, source freshness, and regeneration-readiness slice.
Structure and preview sessions now preserve a private relationship manifest
with code-defined duplicate-analysis versioning. The API detects same Canvas
source identity, exact normalized-content duplicates, and repeated Canvas
references while returning only opaque session-scoped duplicate groups and
broad reference categories to mobile. Later exact-content duplicates remain
visible but are unselected by default. Snapshot creation copies relationship
provenance into immutable `reviewer_source_snapshot_item_relationships` rows.
Saved Canvas reviewers have a protected manual source-status endpoint that
compares immutable snapshot items against current synchronized Pages,
assignments, announcements, and prepared PDF/image file metadata without
Canvas calls, PAT decryption, Storage reads, OCR, or OpenAI. Missing rows
become `missing_after_sync` only with later authoritative sync evidence;
partial, failed, old, or ambiguous evidence remains `unknown`. The Study
Library shows a source-health and readiness card but does not regenerate
reviewers. Protected live validation completed on 2026-07-08 with the live
selected reviewer returning `current` and `ready_current`.

## Completed Capabilities

- Monorepo foundation with API, mobile, engine, DB, Canvas, and shared packages.
- Provider-agnostic reviewer engine covering normalization, outline detection,
  planning, generation, coverage verification, grounding validation, bounded
  retry, leakage protection, and deterministic assembly.
- Default visible reviewer content is source-faithful; unsupported enrichment is
  excluded from default assembly.
- Extractive fallback for short OCR-style prose inside the engine.
- API-layer OpenAI provider boundary and server-only provider factory.
- Protected reviewer API route using Supabase bearer authentication.
- Local Expo Web CORS handling for `POST /api/reviewer/generate`.
- Expo reviewer generation screen and preview screen.
- Supabase email/password sign-in and session restore.
- Automated reviewer web smoke runner with persisted browser session, output
  assertions, safe service startup, and runner-owned cleanup.
- Provider-agnostic OCR contracts and deterministic normalization in
  `@stay-focused/ocr`.
- API-only Google Cloud Vision OCR adapter with injected fake-client tests.
- Protected `POST /api/ocr/extract` route for PNG/JPEG multipart image uploads.
- Expo gallery image selection and camera capture with preview, explicit text
  extraction, editable OCR text review, retry, and clear-image handling.
- Protected `POST /api/ocr/extract-pdf` route for one synchronous PDF upload,
  with a 10 MiB upload cap, 1-5 page validation, encrypted/malformed PDF safe
  errors, and Google Vision `batchAnnotateFiles` PDF OCR.
- Expo PDF selection through `expo-document-picker`, filename/type/size display,
  page-count display after server validation, editable extracted-text review,
  retry, and clear-PDF handling.
- Mocked PDF OCR web smoke with a fictional in-memory PDF fixture and real
  reviewer generation.
- Product Recovery R3 strict full-document extraction with explicit
  `text_extracted`/`blank`/`failed` page states, complete/incomplete/failed
  document states, exact page coverage verification, sanitized diagnostics,
  mobile stale-source clearing, and a hard reviewer-generation readiness gate.
- Manual pasted text remains available as a separate source mode.
- Supabase `reviewers` migration with timestamps, source metadata, reviewer
  JSON output, section count, and owner-scoped RLS policies.
- Typed reviewer persistence shapes in `@stay-focused/db`.
- Protected `GET /api/reviewers`, `POST /api/reviewers`,
  `GET /api/reviewers/[id]`, `PATCH /api/reviewers/[id]`, and
  `DELETE /api/reviewers/[id]` routes using verified bearer auth and
  user-scoped Supabase access.
- Next.js App Router typing for reviewer `[id]` route params now matches the
  Promise-based context expected by route handlers.
- Mobile Study Library list, open, rename, delete, refresh, create-new, and
  save-after-generation flows.
- Save-to-library flow preserves editable OCR-before-reviewer behavior and
  does not persist raw source text or OCR/upload bytes.
- Structured Phase 5 Canvas roadmap covering Phase 5A through Phase 5F, the
  future Grade Goal Planner, and later student intelligence features.
- Canvas source capability matrix documenting permission-dependent Canvas
  capabilities and external-integration limitations.
- ADR-006 through ADR-010 for Canvas academic graph synchronization,
  capability-based integration, Canvas credential storage, and grade-data
  separation, plus Canvas authentication phases.
- ADR-011 for fast testing surfaces; this resolves the former duplicate
  ADR-004 numbering while preserving ADR-004 for the engine pipeline.
- `@stay-focused/canvas` client with strict URL normalization, bearer auth,
  explicit redirect rejection, safe pagination, timeout support,
  cross-origin pagination rejection,
  normalized typed errors, course discovery, current-profile validation, and
  independent capability probes.
- Supabase Canvas connection/capability migration foundation with no plaintext
  Canvas token storage, atomic connection/capability replacement, database
  ownership consistency for capability rows, and no direct authenticated grants
  over encrypted credential fields.
- Live remote Supabase application of the Canvas migration, with both Canvas
  tables, RLS, and no direct `anon`/`authenticated` encrypted-column access
  verified.
- Server-side live Canvas validation with sanitized profile, course-count, and
  capability-status reporting.
- Protected `GET/PUT/DELETE /api/canvas/connection`,
  `GET /api/canvas/courses`, and `GET /api/canvas/capabilities` routes using
  Supabase bearer JWT authentication and safe response contracts.
- Mobile Courses surface for disconnected/connected Canvas states, course
  refresh, disconnect confirmation, and compact capability summary.
- Phase 5B.1 academic graph foundation with Canvas course, module, module item,
  Page, assignment-group, and assignment tables plus typed Canvas retrieval
  contracts and pagination tests.
- Phase 5B.2 manually triggered synchronous initial full Canvas academic graph
  synchronization with sync-run persistence, bounded concurrency, atomic
  per-course replacement, stale-child cleanup after complete snapshots,
  partial-run preservation, and mobile service support without UI.
- Phase 5B.3A course recovery hardening with sanitized per-course diagnostics,
  bounded transient retries, and permanent Page-listing failure classification.
- Phase 5B.3B deterministic incremental Canvas persistence with private
  versioned course fingerprints, sync-state rows, changed/unchanged/failed
  counts, and unchanged-course graph replacement avoidance.
- Phase 5B.4A backend Canvas planner-item and announcement synchronization
  with a bounded sync window, deterministic fingerprints, service-role-only
  persistence, safe scoped pruning, aggregate diagnostics, and mobile service
  parsing without UI.
- Phase 5C.1 backend Canvas file metadata inventory and bounded selected-file
  ingestion foundation with service-role-only metadata persistence, private
  storage, safe redirect handling, byte caps, content signature checks,
  aggregate mobile sync parsing without UI, remote Supabase validation,
  protected live ingestion validation, and a documented synchronous
  route-duration limitation.
- Phase 5C.2A1 selected-course Canvas synchronization with metadata-based
  classification, preference persistence, course-scoped sync runs, per-course
  mobile status, deselection retention, planner exclusion from course-scoped
  requests, protected live validation under 60 seconds per course, and no
  academic-unit synchronization limit.
- Phase 5C.2A2 Canvas source selection and reviewer handoff with protected
  source listing, ordered preview, safe HTML normalization, editable mobile
  preview, existing reviewer API reuse, existing Study Library save, minimal
  Canvas source metadata, and no file parsing/OCR.
- Phase 5C.2B Canvas PDF/image OCR sources with safe file descriptors,
  course-scoped preparation through the existing ingestion service, private
  Storage byte/hash/signature revalidation, server-only PDF/image OCR,
  one-file synchronous preview limit, ordered mixed-source assembly, mobile
  prepare/ready states, transient OCR output only, and no Canvas or OpenAI call
  during preview.
- Phase 5D.1 immutable Canvas source snapshots and exact reviewer provenance
  with private preview sessions, exact edited source-text snapshots, ordered
  source snapshot items, database-enforced reviewer/snapshot ownership, safe
  detail summaries, no historical reviewer backfill, and no provenance sent to
  OpenAI.

## Current Verification Baselines

Historical and latest verification include:

- Product Recovery R3 verification: OCR typecheck/build/tests passed with
  25/25 tests; engine typecheck/build/evals passed with 287/287; API
  typecheck/lint/build/tests passed with 391/391; mobile typecheck/lint/tests
  passed with 130/130; root typecheck and lint passed across 7/7 workspaces;
  reviewer smoke-runner tests passed 51/51; mocked PDF OCR browser smoke passed
  with reviewer HTTP 200. Protected real-Google OCR validation passed for a
  single-page image, two-page PDF, five-page PDF, blank-middle PDF, and
  controlled incomplete result. The five-page PDF processed and extracted
  5/5 pages in one provider call and 1.591 seconds; coverage, grounding, and
  leakage passed. The incomplete case made zero reviewer calls.

- Phase 5B.3B final verification: Canvas package typecheck/build/tests passed
  with 33/33 tests; DB package typecheck passed; API typecheck/build/tests
  passed with 176/176 tests; mobile typecheck/tests passed with 79/79 tests;
  root typecheck passed across 7/7 workspaces with 4 cached and 3 fresh; root
  build passed across 7/7 workspaces with 4 cached and 3 fresh; workspace
  tests passed with API 176/176, mobile 79/79, Canvas 33/33, and OCR 14/14;
  `git diff --check` passed with line-ending warnings only.
- Phase 5B.3B remote verification: `202607050008` is applied remotely, and
  `scripts/phase5b3b-incremental-sync-verification.sql` passed with rollback
  fixtures.
- Phase 5B.3B live validation: one full baseline and two incremental runs
  passed with aggregate-only output; unchanged incremental courses skipped
  graph replacement while complete Canvas snapshots were still fetched.
- Phase 5B.4A verification: Canvas typecheck/build/tests passed with 35/35
  tests; DB typecheck passed; API typecheck/build/tests passed with 183/183
  tests; mobile typecheck/tests passed with 79/79 tests; root typecheck passed
  across 7/7 workspaces with 4 fresh and 3 cached tasks; root build passed
  across 7/7 workspaces after clearing a generated API `.next` artifact from
  the known OneDrive/Next issue; workspace tests passed with API 183/183,
  mobile 79/79, Canvas 35/35, and OCR 14/14; `git diff --check` passed with
  CRLF warnings only.
- Phase 5B.4A remote verification: `202607060001` and `202607060002` are
  applied remotely, and
  `scripts/phase5b4a-planner-announcements-verification.sql` passed with
  rollback fixtures.
- Phase 5B.4A live validation: the first protected run inserted 37 planner
  items and 19 announcements; the second protected run classified those rows as
  unchanged with stable identities, zero duplicates, zero unnecessary updates,
  zero unexpected pruning, stable failure categories, preserved failed course
  graphs, and zero running sync rows.
- Phase 5C.1 verification: Canvas tests passed with 50/50 after adding
  download-security edge coverage; API tests passed with 184/184; mobile tests
  passed with 79/79; OCR tests passed with 14/14; root typecheck/build/tests
  passed across 7/7 workspaces. Remote migrations `202607060003` and
  `202607060004` are applied. Supabase security/performance advisors were
  reviewed, new Phase 5C.1 foreign-key index warnings were fixed, private
  Storage access controls passed, protected live ingestion stored two eligible
  files and one metadata-only result, and second-run ingestion stored zero
  additional bytes with stable object pointers.
- Phase 5C.2A1 verification: remote migration `20260706113150` is applied;
  rollback-safe SQL verification passed; Supabase advisors produced no new
  Phase 5C.2A1 findings; protected live selected-course validation passed with
  two selected likely-current courses, maximum concurrency two, first-run
  durations 6.052 seconds and 8.492 seconds, second-run durations 5.833
  seconds and 7.849 seconds, zero duplicate identities, zero unexpected
  pruning, zero running rows, server-authoritative terminal status restoration,
  and no account-wide route call from the normal flow.
- Phase 5C.2A2 verification: API typecheck/build/tests passed with 220/220
  tests; mobile typecheck/tests passed with 88/88 tests; Canvas package
  typecheck/build/tests passed with 52/52 tests; DB typecheck passed; OCR
  typecheck/build/tests passed with 14/14 tests; engine typecheck/build/evals
  passed with 266/266 evals. Protected live validation used opaque
  `live-course-1`: 49 source descriptors, 36 available Pages, 2 unavailable
  Pages, 11 available announcements, 0 available assignments, no source bodies
  in listing, ordered two-source preview with 3,467 characters, deterministic
  assembly, empty-source rejection, cross-course rejection, no URLs or
  credentials, no Canvas/Storage/OCR/OpenAI calls during preview, reviewer
  generation HTTP 200, Study Library save/list visibility, and smoke-reviewer
  cleanup. Expo Web smoke selected two sources, edited source text/title,
  preserved selection after back navigation, and reloaded preview.
- Phase 5C.2B verification: Canvas package typecheck/build/tests passed with
  52/52 tests; DB typecheck passed; OCR typecheck/build/tests passed with
  14/14 tests; API typecheck/build/tests passed with 269/269 tests; mobile
  typecheck/tests passed with 92/92 tests; engine typecheck/build/evals passed
  with 266/266 evals. Root Turbo typecheck and build passed across 7/7
  workspaces with 5 cached and 2 fresh tasks; workspace tests passed with API
  269/269, mobile 92/92, Canvas 52/52, and OCR 14/14. Protected live
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
  for private provenance tables, RLS, grants, ownership constraints,
  immutability, duplicate ordinal rejection, snapshot item context mismatch
  rejection, reviewer deletion, and Canvas disconnect preservation. Canvas
  typecheck/build/tests passed with 52/52 tests; DB
  typecheck passed; OCR typecheck/build/tests passed with 14/14 tests; API
  typecheck/build/tests passed with 284/284 tests; mobile typecheck/tests
  passed with 93/93 tests; engine typecheck/build/evals passed with 266/266
  evals. Root Turbo typecheck/build passed across 7/7 workspaces with 4 cached
  and 3 fresh tasks. Workspace tests passed with API 284/284, mobile 93/93,
  Canvas 52/52, and OCR 14/14. Supabase advisors showed no new Phase 5D.1
  security findings after the follow-up function search-path hardening
  migration; remaining warnings are historical. Phase 5D.1 protected live
  validation completed on 2026-07-08.
- Phase 5D.2 verification: migration
  `202607070004_add_canvas_selective_source_blocks.sql` is applied remotely.
  Rollback-safe SQL verification passed through
  `scripts/phase5d2-selective-blocks-verification.sql` for private structure
  sessions, selected preview manifests, immutable snapshot blocks, RLS, direct
  client grant revocation, service-role grants, owner isolation, expired
  cleanup, historical no-block preview compatibility, and snapshot reuse
  without duplicate blocks. Canvas typecheck/build/tests passed with 52/52
  tests; DB/shared/Canvas/OCR/API/mobile/engine typechecks passed; OCR
  typecheck/build/tests passed with 14/14 tests; API typecheck/build/tests
  passed with 299/299 tests; mobile typecheck/tests passed with 95/95 tests;
  engine typecheck/build/evals passed with 266/266 evals; root typecheck/build
  passed across 7/7 workspaces; workspace tests passed with API 299/299,
  mobile 95/95, Canvas 52/52, and OCR 14/14. Supabase advisors showed no new
  Phase 5D.2 findings; remaining warnings are historical. Phase 5D.2 protected
  live validation completed on 2026-07-08.
- Phase 5D.3 verification uses migrations
  `202607080001_add_canvas_source_relationships_freshness.sql` and
  `202607080002_harden_source_relationship_grants.sql`, plus rollback-safe SQL
  verifier
  `scripts/phase5d3-source-relationships-freshness-verification.sql` for
  relationship storage, RLS, grants, ownership constraints, same-snapshot
  constraints, uniqueness, immutability, snapshot reuse, and historical
  snapshot compatibility. Remote verification passed with 18/18 checks; root
  typecheck/build passed across 7/7 workspaces; workspace tests passed with API
  315/315, mobile 98/98, Canvas 52/52, and OCR 14/14; engine evals passed with
  266/266. Supabase advisors were reviewed, with remaining warnings historical.
  Phase 5D.3 protected live validation completed on 2026-07-08.
- Phase 5D protected live validation: completed for Phase 5D.1 through Phase
  5D.3 with aggregate opaque output only. The run reused stored
  `connection-1`, synchronized `course-1`, loaded source structure, previewed
  selected blocks, created and deleted one reviewer/snapshot validation set,
  verified source-status returned `current` and `ready_current`, confirmed no
  source-status sync/Canvas/decrypt/Storage/OCR/OpenAI/regeneration side
  effects, and preserved pre-existing data. See
  `docs/ai/phase5d-protected-live-validation-20260708.md`.

- DB package typecheck: passed
- OCR package typecheck: passed
- OCR package build: passed
- OCR package normalization tests: 14 passed, 0 failed
- Google OCR fake-client tests: included in API tests
- API route, reviewer library, OCR route, and adapter tests: 94 passed, 0 failed
- Reviewer smoke-runner tests: 51 passed, 0 failed
- Engine build: passed
- Engine evaluations: 266 passed, 0 failed
- API typecheck: passed
- Mobile typecheck: passed
- Mobile OCR client, picker, source-flow, and Study Library API tests: 66
  passed, 0 failed
- Canvas package typecheck/build/tests: passed; 22 tests passed, 0 failed
- API Canvas route/encryption tests: included in API tests; 146 passed, 0
  failed
- Mobile Canvas API service tests: included in mobile tests; 70 passed, 0
  failed
- DB package typecheck after Canvas migration/types: passed
- Root workspace typecheck: passed after broad build regenerated Next
  `.next/types`
- Root workspace build: passed
- Workspace tests with scripts: passed; API 146/146, mobile 70/70, Canvas 22/22,
  OCR 14/14
- `git diff --check`: passed with CRLF warnings only
- Live Supabase schema verification: migration already applied; table, RLS,
  and owner policies verified
- Live Supabase Study Library validation: passed with distinct users,
  bidirectional isolation, safe 404 item denial, owner cleanup, and no
  validation rows remaining
- Reviewer detail route typing fix: API typecheck and route tests passed; no
  runtime behavior changed
- `git diff --check`: passed with line-ending warnings only
- Reviewer web smoke: not rerun for this final typing-only route fix
- Deterministic OCR web smoke: latest recorded pass used mocked OCR response
  and real reviewer generation
- Deterministic PDF OCR web smoke: latest recorded pass used a fictional PDF
  fixture, mocked OCR response, editable extracted text, and real reviewer
  generation
- Phase 3C live iPhone camera/image OCR validation: passed with local Expo Go
  -> Next.js API over LAN -> server-only Google Cloud Vision -> editable OCR
  text review -> reviewer generation. Reviewer Ready appeared, source-faithful,
  coverage, and clean-output validation passed, and the generated reviewer
  contained at least one section and key point. See
  `docs/ai/phase3c-camera-ocr-validation-20260704.md`.
- Phase 3D live iPhone PDF OCR validation: passed with local Expo Go ->
  Next.js API over LAN -> server-only Google Cloud Vision synchronous PDF OCR
  -> editable OCR text review -> reviewer generation. A fictional, image-only,
  two-page scanned PDF was extracted in page order; edited OCR text was used as
  the reviewer source; Reviewer Ready appeared; source-faithful, coverage, and
  clean-output validation passed; and multiple reviewer sections and key points
  were generated. A separate PDF with more than five pages was rejected safely
  with the expected UI messages. See
  `docs/ai/phase3d-pdf-ocr-validation-20260704.md`.
- Phase 5A.1 direct live Canvas validation: passed from a server-side Node
  script using one developer-owned personal access token. Profile returned,
  Canvas IDs normalized to strings, 17 courses were listed for that token, and
  enrollments, modules, assignment groups, and planner probes were available for
  that user. These results do not prove institution-wide access. No token values
  or raw Canvas JSON were written to committed docs.
- Phase 5A.1 credential alias test: `node --test
  scripts/phase5a-live-canvas-validation.test.mjs` passed; 5/5.
- Phase 5A.1 Supabase migration validation: `npx supabase db push --dry-run`
  listed only `202607050002_create_canvas_connections.sql`; the remote push
  applied it; migration history then showed `202607050001` and `202607050002`;
  read-only checks passed for both Canvas tables, RLS, encrypted columns, and no
  direct `anon`/`authenticated` CRUD or encrypted-column select grants.
- Phase 5A protected API lifecycle validation: passed against the local API.
  API health passed, Supabase bearer authentication was acquired for an
  established smoke-test user, connect/status/courses/capabilities/disconnect
  passed, 17 courses were returned from the encrypted stored credential, 25
  capability records were returned with statuses `available` and `not_tested`,
  encrypted persistence checks passed, invalid replacement PAT preserved the
  valid connection, saved reviewers were unchanged, and the test finished with
  the user disconnected.
- Phase 5A.2 hardening verification: `202607050003` applied remotely; read-only
  checks passed for RPC existence, service-role-only execution, composite
  capability ownership, RLS, revoked direct table grants, and revoked encrypted
  column access. Automated two-user authorization validation: PASS. Live
  second-user authorization validation: not run.
- Phase 5B.1 verification: `202607050004` applied remotely; rollback SQL
  verification passed for fake User A/User B ownership, duplicate Canvas
  identity rejection, cross-owner relationship rejection, cascade behavior,
  RLS, grants, ownership constraints, and indexes. Canvas package tests passed
  with 30/30 cases after adding all new collection endpoints and pagination
  regression coverage.
- Phase 5B.2 verification: `202607050005` and `202607050006` applied remotely;
  rollback SQL verification passed for sync-run ownership constraints,
  active-run protection, stale-run recovery, atomic course snapshot
  replacement, duplicate prevention, stable row IDs across upsert, malformed
  relationship rollback, RLS, grants, RPC execution posture, and unchanged
  Phase 5A and Phase 5B.1 protections. Focused pre-live checks passed with
  Canvas 30/30, API 158/158, and mobile 76/76 tests. Live validation passed
  twice with sanitized aggregate-only output and a final stored connection.

Latest recorded unattended smokes during Phase 4 implementation:

- `npm run smoke:reviewer:web`: passed
- Authentication: persisted session
- Reviewer POST: HTTP 200
- Source-faithful, coverage, and clean-output statuses: passed
- `npm run smoke:ocr:web`: passed with mocked OCR response, editable extracted
  text, and real reviewer generation
- `npm run smoke:ocr-pdf:web`: passed with mocked PDF OCR response, editable
  extracted text, and real reviewer generation

## Known Local Test Command

```sh
npm run typecheck --workspace @stay-focused/db
npm run typecheck --workspace apps/api
npm run test --workspace apps/api
npm run typecheck --workspace apps/mobile
npm run test --workspace apps/mobile
npm run build --workspace @stay-focused/engine
npm run eval --workspace @stay-focused/engine
npm run test --workspace @stay-focused/ocr
npm run test:reviewer-web-smoke
npm run smoke:reviewer:web
npm run smoke:ocr:web
npm run smoke:ocr-pdf:web
```

The smoke runner starts or reuses the API and Expo Web, authenticates or restores
a persisted session, submits the fictional study-habits fixture, verifies
reviewer output and validation statuses, and cleans up runner-owned services.
The OCR web smoke uses the same auth/session infrastructure, injects a
non-production fictional image fixture, mocks only the OCR response, verifies
editable extracted text, and then generates a reviewer through the real reviewer
route. It does not validate live Google OCR.
The PDF OCR web smoke follows the same pattern with a fictional PDF fixture and
mocked PDF OCR response. It does not validate live Google PDF OCR.

## Current Limitations

- Gallery import and camera capture support PNG/JPEG images and editable
  extracted-text review.
- PDF import supports one server-bound PDF per request, 1-5 pages, and editable
  extracted-text review. Live iPhone PDF OCR validation has passed.
- Visible repeated headers and footers in scanned PDFs may be extracted as
  source text and can become reviewer sections. Users can remove them in the
  editable OCR text field; automatic repeated header/footer detection is
  deferred to a later OCR cleanup task.
- Google OCR credential paths are machine-specific local configuration and
  must remain server-only.
- Canvas LMS Phase 5A is complete, live validated, and audit-hardened: direct
  server-side Canvas validation with one developer-owned personal access token,
  remote Supabase migration/RLS validation, protected API connection lifecycle,
  strict encrypted payload validation, atomic connection/capability
  persistence, redirect rejection, and automated two-user authorization tests
  have passed. There is no school-wide Canvas credential. The live validation
  test finished disconnected.
- Phase 5B.1 academic graph foundation is complete.
- Phase 5B.2 initial full academic graph synchronization is complete as a
  manual synchronous route. Discussions, files or attachments, submissions,
  grades, rubrics, network-level conditional
  fetching, background sync, source snapshots, automatic sync, mobile sync
  screens, notifications, and reviewer generation from Canvas content remain
  deferred.
- Phase 5B.3A remains closed. Phase 5B.3B incremental persistence is complete:
  unchanged courses still fetch complete Canvas snapshots, but avoid database
  graph replacement. The four Page-listing failures remain safely classified
  permanent limitations.
- Phase 5B.3C1 conditional-request capability audit is complete. It did not
  change production sync. ETags were present, `Last-Modified` was absent, no
  304 responses were observed, and conditional requests produced no body-byte
  reduction. Continue ordinary GET behavior for the current endpoint families.
- Phase 5B.4A planner-item and announcement synchronization is complete for
  backend sync only. Phase 5C.1 file metadata inventory and bounded selected
  ingestion are remotely and live validated for backend routes only, with the
  synchronous route still over its configured runtime budget. No
  source-selection UI, file parsing/OCR, discussion synchronization,
  grade/submission sync, background sync, or reviewer generation from Canvas
  data exists yet.
- Phase 5C.2A1 selected-course synchronization is the normal mobile Canvas sync
  path. It is runtime-safe in local production validation, but it intentionally
  excludes planner items and still depends on Canvas endpoint availability per
  selected course. One live selected course remained partial because file
  metadata listing failed safely.
- Phase 5C.2A2 source selection is limited to one selected synchronized course
  at a time and only Pages, assignment descriptions, and announcements with
  readable synchronized text are selectable. Phase 5C.2B adds Canvas PDFs,
  PNGs, and JPEGs after explicit preparation through the existing secure
  ingestion boundary. Preview supports one OCR-backed file mixed with stored
  text sources, revalidates private stored bytes before OCR, returns no Storage
  keys or signed URLs, and does not persist extracted text. Phase 5D.1 adds
  immutable source snapshots and exact reviewer linkage for the Canvas reviewer
  path. Phase 5D.2 adds structured normalized blocks and selective import with
  selected-block snapshot provenance. Phase 5D.3 adds exact duplicate
  detection, repeated-reference indicators, immutable relationship provenance,
  and manual source-health checks for saved Canvas reviewers. It does not add
  source/block diff UI or actual reviewer regeneration. Broader parser
  families, source recommendations, cross-course bundles, background sync, and
  automatic reviewer generation remain deferred.
- Task generation and study schedule generation are not implemented.
- Google and Microsoft OAuth helper functions exist, but completed mobile OAuth
  redirect flows are not validated as finished product features.
- Production deployment and iPhone production readiness are pending.

## Immediate Next Task

Phase 5A hardening is complete, Phase 5A quality conditions are closed, Phase
5B.1 academic graph foundation is complete, and Phase 5B.2 initial full
academic graph synchronization is complete and live validated. Phase 5B.3A
course recovery hardening is complete and live validated. Phase 5B.3B
incremental academic graph synchronization foundation is complete and live
validated. Phase 5B.3C1 conditional-request capability audit is complete and
does not support Phase 5B.3C2 implementation for the audited endpoints. Phase
5B.4A planner-item and announcement synchronization is complete with documented
live Canvas limitations. Phase 5C.1 file inventory and bounded ingestion is
remotely and live validated with a documented synchronous route-duration
limitation. Phase 5C.2A1 selected-course synchronization is complete and
runtime-safe in local production validation. Phase 5C.2A2 Canvas source
selection and reviewer handoff is complete and live validated. Phase 5C.2B
Canvas PDF and image extraction/OCR integration is complete and live validated
for preparation, private Storage OCR preview, edited reviewer handoff, and
Study Library cleanup. Phase 5D.1 immutable source snapshots and exact reviewer
provenance, Phase 5D.2 structured normalized blocks and selective import, and
Phase 5D.3 duplicate relationships, source freshness, and regeneration
readiness are implemented, remotely verified, and protected-live validated.
Phase 5E planning is complete in
`docs/ai/phase5e-grades-submissions-plan-20260708.md`, and Phase 5E.1 is
complete in
`docs/ai/phase5e1-grades-submissions-foundation-20260708.md`. Phase 5E.2 is
complete in `docs/ai/phase5e2-canvas-grade-client-20260708.md`. Phase 5E.1
adds only the Canvas grades/submissions data contract, database foundation, DB
types, and rollback-safe SQL verification. Phase 5E.2 adds only read-only
`@stay-focused/canvas` assignment, own-submission, and visible course-grade
client methods, normalized provider contracts, field-presence-aware visibility
wrappers, pagination coverage, and unsafe-field discards. Phase 5E.3 is
implemented in `docs/ai/phase5e3-explicit-grade-sync-20260708.md`: it adds an
internal explicit synchronization service for exactly one owned selected course,
Canvas-to-database normalization, conservative status derivation, deterministic
fingerprints, service-role-only RPC persistence, partial-failure preservation,
and per-course grade sync state. Canvas access remains read-only, manual, and
per selected course. Remote Supabase verification is complete:
`202607080005_add_canvas_grade_sync_rpcs.sql` is applied,
`202607080006_harden_canvas_grade_sync_rpc_function_references.sql` hardens the
security-definer RPC function reference, RPC execution is service-role-only,
RLS/direct grants remain hardened, the rollback-safe verifier passed 17/17
checks, and no fictional rows remain. Phase 5E.4 is implemented in
`docs/ai/phase5e4-protected-grade-api-20260708.md`: protected routes now expose
explicit selected-course grade sync, paginated assignment/submission list,
assignment detail, visible course summary, and sync-status reads. Only the sync
route can call Canvas through the Phase 5E.3 service; all GET routes are
database-only and return `Cache-Control: no-store`. Phase 5E.4 protected live
validation is complete in
`docs/ai/phase5e4-protected-grade-api-live-validation-20260708.md`; the closeout
fixed sync route course-scope preflight so unknown valid course UUIDs return
safe `404` and owned but unselected courses return safe `400` before Canvas
synchronization. Phase 5E.5 is complete and locally validated in
`docs/ai/phase5e5-mobile-grade-experience-20260708.md`: selected available
Canvas courses expose a `Grades` entry point, the mobile grade screen performs
GET-only loading and reloads, explicit per-course `Sync grades` is the only
grade POST, assignment pagination appends without duplicates, detail loads the
protected detail route, and hidden or unavailable grade wrappers are never
shown as zero. No background sync, durable grade cache, notification, local
grade calculation, submission action, private submission-content return, or
reviewer integration exists. Phase 5E.6 is in progress in
`docs/ai/phase5e6-mobile-grade-protected-live-validation-20260708.md`:
automated baseline checks, protected API preflight, Expo Web protected smoke,
session-only smoke, controlled fictional edge validation, authorization
regression checks, and privacy scans passed with sanitized aggregate evidence.
Physical iPhone Expo Go validation remains required before Phase 5E.6 and
Phase 5E can be marked complete.

Product Recovery Phase R1 is complete in
`docs/ai/product-recovery-r1-v1-audit-20260713.md`. The audit used V1 as the
behavioral benchmark and V2 as the architecture benchmark. It found that V2's
security, authentication, encrypted Canvas storage, protected APIs, typed
contracts, tests, provenance, and grade isolation should be preserved, but that
V2 is currently over-constrained for practical student use. The highest-impact
recovery areas are reviewer fallback reliability, full-document OCR with page
completeness, broader Canvas usable-content resolution, and a simpler student
workflow. Product Recovery Phase R2 is complete in
`docs/ai/product-recovery-r2-reviewer-reliability-20260713.md`: reviewer
generation now repairs and recovers per section, validates deterministic
extractive and emergency source-outline fallbacks, returns safe limited-quality
metadata, and renders recovered output normally. Product Recovery Phase R3 is
complete in
`docs/ai/product-recovery-r3-full-document-ocr-20260713.md`: every accepted OCR
document now requires exact terminal page coverage before source assembly or
reviewer generation. The next task is Product Recovery Phase R4 - Canvas
usable-content resolution. Repeated PDF header/footer cleanup remains a
separate deferred candidate.

## Known Risks

- OneDrive-backed generated Next output can create stale reparse-point artifacts;
  the smoke runner clears the generated `apps/api/.next/server` directory before
  runner-owned API startup. During Phase 4 verification, one stale
  `apps/api/.next/types/cache-life.d.ts` generated reparse-point artifact had to
  be removed manually before rerunning the PDF OCR smoke.
- OpenAI cost, rate limits, and serverless latency can affect reviewer
  generation.
- OCR layout preservation is critical because reviewer quality depends on line,
  heading, and list boundaries.
- The server OCR contract is proven with fake clients, the Expo Web OCR flow is
  proven with a mocked OCR response, and live iPhone Google OCR for images and
  PDFs has passed on a correctly configured local API. Future live OCR remains
  dependent on machine-specific server credential setup, LAN reachability, and
  device state.
- Scanned-PDF support is a synchronous 1-5 page product boundary. The limit is
  imposed by the current inline Google Vision `files:annotate` method and is
  checked before provider work. Documents inside the limit require exact page
  completeness; documents above it need a separately planned asynchronous
  Cloud Storage architecture. Visible repeated headers and footers may still
  need manual removal before generation until a later cleanup task adds
  automatic repeated header/footer detection.
- Reviewer persistence now has a live cross-user RLS validation baseline.
  Future persistence changes should preserve owner-scoped access, safe 404
  denial, and owner-only cleanup behavior.
- Canvas credential encryption depends on `CANVAS_TOKEN_ENCRYPTION_KEY` being
  present in deployed API environments. Do not create a fallback key silently.
  The local Phase 5A validation used a real app-owned ignored local key, not a
  temporary test key.
- Canvas permissions vary by user, role, school, and course. Course access for
  one personal access token does not prove access to modules, files, grades,
  quizzes, captions, conversations, external-tool content, or other users'
  courses.
- `CANVAS_TOKEN_ENCRYPTION_KEY` must be canonical padded Base64 and decode to
  exactly 32 bytes in the API environment before Canvas connections can be
  saved. Stored ciphertext, IV, and authentication-tag fields are decoded
  strictly and fail closed when malformed.
- `CANVAS_PERSONAL_ACCESS_TOKEN` is developer-owned live-validation input only;
  normal application connections use each authenticated user's submitted and
  encrypted Canvas credential.
- Canvas OAuth is the intended production authorization path for broad
  multi-user deployment, but it is not implemented and requires an
  institution-approved Canvas Developer Key.
- Mobile OAuth redirect completion still needs validation before it is claimed
  as complete.
- Secrets must remain server-only; mobile env files may contain only public
  `EXPO_PUBLIC_` values.
- Captured images, screenshots, credential files, OCR test artifacts, tokens,
  and private document OCR output must stay out of committed files.

## Documentation Ownership

- Canonical current-state document: `docs/current-state.md`
- Canonical roadmap document: `docs/roadmap.md`
- Canonical current-sprint document: `docs/ai/current_sprint.md`
- AI handoff: `docs/ai/handoff.md`
