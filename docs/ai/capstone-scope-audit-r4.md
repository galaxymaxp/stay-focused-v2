# Stay Focused V2 — R4 Capstone Scope Audit

Audit date: 2026-08-27, Asia/Manila

Baseline commit: `cd070eb059134c23a95c136cfb47530d0393c90b`

Mode: audit, verification, and planning only

## Executive conclusion

Stay Focused V2 already has a credible, hosted, mobile-first technical core:
authenticated reviewer generation, source-faithful Stage 0-6 validation,
image/PDF OCR, durable Vercel Workflow processing, a user-owned Study
Library, encrypted per-user Canvas access, durable incremental Canvas content
and grade synchronization, and an EAS Android build path.

The product is not yet capstone-complete because its stated schedule-first
promise is not implemented. There is no user task model, study-session model,
task API, planning engine, or mobile task/calendar experience. That is the one
P0 product gap. Remaining work should extend the stable system around this
gap, then close narrowly defined offline, device, deployment, privacy, and
defense-evidence debt.

Readiness counts:

- P0: 1
- P1: 7
- P2: 4
- Post-capstone groups: 7

## 1. Audit method and evidence precedence

Evidence was evaluated in this order:

1. current Git state and implementation;
2. current deterministic tests and the R2/R3 accepted baseline;
3. deployment and application configuration;
4. newest explicit hosted/live/device acceptance records;
5. roadmap and historical handoff records.

R4 did not rerun paid OpenAI generation or the complete R3 suite. The R3
results are accepted baseline evidence. R4 freshly inspected code, routes,
configuration, migrations, tests, and documentation; fetched `origin`; checked
Git integrity; and confirmed the hosted V2 `/api/health` endpoint.

### Documentation contradictions

- `docs/current-state.md` and `docs/ai/current_sprint.md` still identify
  `codex/hosted-processing-prototype` at `1848805` as authoritative. R3
  superseded that statement: `main` at `cd070eb` is authoritative.
- `docs/thesis/overview.md` describes OCR, Study Library, Canvas, scheduling,
  and deployment as future work and still cites 266 engine cases. Actual code
  and the R3 baseline prove OCR, Study Library, Canvas, deployment, and 290
  deterministic cases; only task/study scheduling remains absent from that
  product list.
- ADR-018 records the original 40-page durable-document foundation. Current
  code separates limits: durable jobs allow 100 total PDF pages and at most 40
  OCR-required pages, while synchronous/Canvas paths remain at 40 total pages.
- Older records describing a continuously hosted worker as missing were
  superseded by Vercel Workflow implementation and hosted acceptance.

These contradictions do not invalidate the implementation, but canonical and
thesis documentation must be corrected before defense.

## 2. Git and remote preservation

- Repository: `C:\Projects\stay-focused-v2`
- Branch: `main`
- Starting HEAD: `cd070eb059134c23a95c136cfb47530d0393c90b`
- Working tree at audit start: clean
- `git fsck --full`: PASS (FRESH)
- `git diff --check`: PASS (FRESH)
- Recovery branches and annotated tag: present and still peel to `e5f3255`
- `origin/main` after `git fetch --prune`: `bad5b55`
- Relationship before the R4 documentation commit: local `main` 35 ahead,
  0 behind; no remote-only commits
- Remote change since R3: none

REMOTE PRESERVATION: SAFE_TO_PUSH

Recommended command after reviewing the R4 documentation commit:

```powershell
git push origin main
```

No push was performed by R4.

## 3. Actual mobile product surface

The mobile app is a single Expo Router entry with an authenticated in-memory
view coordinator. The signed-in surfaces are reviewer generation, Study
Library, Processing, Courses, Canvas reviewer source selection, and Canvas
grades.

### Implemented

- Email/password Supabase sign-in, session restoration, auth-state updates,
  refresh, and sign-out.
- Manual text, gallery image, camera image, and PDF source selection.
- Durable image/PDF extraction and durable reviewer generation with truthful
  pre-acceptance and post-acceptance states.
- Foreground polling, app-foreground reconciliation, cancellation, retry, and
  account-scoped multi-job history.
- Reviewer preview and save/list/open/rename/delete Study Library flow.
- Canvas PAT connection, disconnect, capability display, course discovery,
  selected-course management, manual content synchronization, sync health,
  source preparation/selection/preview/editing, reviewer generation, and
  read-only grades.
- Processing completion notification enable/test/disable controls on eligible
  app-specific physical builds.

### Partial or missing

- No dashboard, task list, study plan, calendar, study-session model, or task
  generation exists.
- Navigation state is not route-addressable and resets to reviewer generation
  after app recreation; there is no primary tab structure or settings screen.
- Google/Microsoft OAuth helpers exist in the auth service, but the login UI
  explicitly says those methods are coming later.
- Study Library always lists and opens through the API. The offline artifact
  cache is exposed only through Processing for reviewer results previously
  fetched and cached there.
- Offline reviewer-generation drafts can queue after a connection failure;
  offline document upload staging is not implemented.
- No user-facing account deletion flow exists, although database ownership and
  cascading cleanup foundations exist.

## 4. Reviewer and AI readiness

| Reviewer capability | Classification | Evidence |
|---|---|---|
| Source normalization | DETERMINISTICALLY VALIDATED | Stage 0 implementation and aggregate 290/290 R3 eval |
| Outline detection | DETERMINISTICALLY VALIDATED | Stage 1 implementation/evals |
| Generation planning and schema choice | DETERMINISTICALLY VALIDATED | Stage 2 implementation/evals |
| Section generation | DETERMINISTICALLY VALIDATED | Stage 3 fake-provider/schema tests |
| Coverage verification | DETERMINISTICALLY AND LIVE VALIDATED | Stage 4 plus R2 18/18 coverage |
| Grounding/student-visible faithfulness | DETERMINISTICALLY AND LIVE VALIDATED | Stage 5a plus R2 grounding 1.00, zero issues |
| Leakage protection | DETERMINISTICALLY AND LIVE VALIDATED | Leakage guard plus R2 zero leakage issues |
| Bounded retry | DETERMINISTICALLY VALIDATED | Stage 5 retry and pipeline evals |
| Final assembly | DETERMINISTICALLY AND LIVE VALIDATED | Stage 6 plus R2 18 assembled sections |
| Enrichment policy | DETERMINISTICALLY AND LIVE VALIDATED | Default visible enrichment is excluded/null |
| Authenticated OpenAI integration | LIVE VALIDATED | R2 committed `gpt-4o` output and metrics |
| Native-text PDFs | IMPLEMENTED; HOSTED VALIDATED BELOW FINAL DEVICE LIMIT MATRIX | Page inspection preserves native text and avoids OCR fan-out |
| Scanned/mixed PDFs | DETERMINISTICALLY AND LIVE VALIDATED | OCR tests, historical physical OCR, and 32-page mixed hosted evidence |
| Durable hosted processing | IMPLEMENTED AND HOSTED VALIDATED | Vercel Workflow, persisted results, disconnect/reload/cancel acceptance |

The R2 live reviewer is source-faithful and complete but intentionally terse:
17 list-oriented sections have empty explanations under the anti-fabrication
policy. That is presentation quality, not a correctness failure, and does not
justify destabilizing the grounding architecture before capstone.

Remaining AI risks are validation breadth and demonstration predictability,
not a missing pipeline: retain the committed R2 result, use approved
non-sensitive fixtures, record expected latency/failure handling, and avoid
prompt/schema changes unless a concrete defect is reproduced.

## 5. Canvas readiness

### Authentication and authorization

- Users connect with their own Canvas personal access token.
- The API validates the bearer JWT, validates the Canvas token server-side,
  and stores it with AES-256-GCM under a server-only key.
- Canvas and synchronization persistence is owner-scoped; worker mutation
  boundaries use service-role-only operations or guarded owner/service RPCs.
- PAT authorization is sufficient for a controlled capstone demonstration.
  It is not a broadly deployable institutional OAuth model.

### Content and grades

- Course discovery, selected-course preferences, modules, module items, pages,
  assignment groups, assignments, announcements, files, own submissions, and
  grade summaries have implemented typed and persistence boundaries.
- Content and grade synchronization are separate, user-initiated durable jobs.
- Vercel Workflow executes persisted incremental units with leases, bounded
  retries, durable `Retry-After` waits, cancellation checkpoints, and safe
  promotion.
- Complete traversal is required before deletion inference; failed/partial
  evidence preserves last-known-good state.
- Mobile displays course/scope health, nullable progress, partial outcomes,
  cancellation, retry/sync-again, source selection, and read-only grades.

### Validation levels

| Area | Foundation | Local | Hosted | Android |
|---|---|---|---|---|
| PAT connection/course discovery | Yes | Validated | Validated | Auth/API connectivity only |
| Content synchronization | Yes | Validated | Validated, including partial/idempotency/cancel | Full flow not recorded |
| Grade synchronization | Yes | Validated | Validated | Full flow not recorded |
| Incremental/resumable units | Yes | Deterministic/runtime validated | Validated | Full interruption flow not recorded |
| Canvas-to-reviewer source flow | Yes | Protected/live validated | Backend deployed | Final Android defense path not recorded |

Conditional-request support was audited, but current Canvas endpoint families
did not produce useful 304/body reduction. Incremental persistence still
avoids unnecessary graph replacement. This is not a capstone blocker.

## 6. Durable processing lifecycle

The implemented lifecycle is:

```text
mobile chooses image/PDF or reviewed text
→ authenticated upload intent/TUS or reviewer request
→ immutable source and idempotent processing job persisted
→ HTTP 202 only after durable acceptance and Workflow dispatch
→ Vercel Workflow claims the job and persists checkpoints
→ native PDF inspection and bounded OCR, or Stage 0-6 reviewer generation
→ transactional source/artifact/result publication before success
→ mobile foreground polling or launch/foreground reconciliation
→ result retrieval, reviewer cache, preview, and optional Study Library save
```

Cancellation prevents result publication, retry is bounded, status payloads
exclude raw source/provider data, and the mobile app does not assume timers run
in the background. This architecture is implemented, locally tested, hosted
validated, and should not be replaced.

Remaining demonstration risks:

- final Android validation has not exercised the 41-100 native-page and
  over-40-OCR-page cases;
- offline upload staging does not exist, so source bytes must reach durable
  acceptance while the app remains connected;
- a final deployed-revision record and app-build/device matrix are still
  needed after capstone changes;
- cleanup is bounded but deterministic hosted scheduling remains operational
  hardening rather than a core demo dependency.

## 7. Offline behavior

### Available without a network after prior use

- auth/session material needed for restoration is stored through the existing
  secure session boundary;
- active processing references and last-known safe status metadata;
- locally queued reviewer-generation drafts after a network failure;
- bounded reviewer artifact payloads that were previously retrieved and
  cached through the durable Processing flow;
- the Processing screen can open those cached reviewer results offline.

### Network required

- authentication verification/refresh when the session needs the server;
- Study Library listing, opening, rename, delete, and save;
- Canvas connection, discovery, refresh, content sync, grade sync, and source
  preparation;
- OCR upload and server-side extraction;
- OpenAI reviewer generation;
- document upload acceptance and server job status refresh;
- extracted source result retrieval.

The current implementation supports an honest claim of limited offline access
to previously cached durable reviewer results. It does not support a claim of
an offline Study Library, offline Canvas, or offline OCR. For capstone, the
smallest useful closure is to surface already cached reviewers in the Study
Library and prove one airplane-mode reopen path; broad offline course packs and
background upload are post-capstone.

## 8. Notification audit

| Notification capability | State | Capstone decision |
|---|---|---|
| Processing extraction/reviewer completion push | IMPLEMENTED, DEVICE DELIVERY NOT FINALLY VALIDATED | Keep as the only required notification slice if demonstrated |
| Notification permission/device registration | IMPLEMENTED | Validate on final app-specific Android build |
| Server test notification | IMPLEMENTED | Use for acceptance |
| Expo ticket/receipt processing and invalid-token handling | IMPLEMENTED AND DETERMINISTICALLY TESTED | Preserve |
| Notification-tap navigation to Processing | IMPLEMENTED | Validate on device |
| Canvas sync completion notifications | MISSING | Not required for capstone |
| Study-session/task reminders | MISSING | P2 or post-capstone unless defense scope explicitly promises reminders |
| Local reminder scheduling/preferences | MISSING | Do not build a broad notification platform for capstone |

Minimum notification scope: validate the existing generic processing
completion notification on the final Android preview build. Task scheduling
must remain useful in-app without requiring a reminder platform.

## 9. API, database, and security

### API surface

The Next.js API implements public health plus bearer-protected reviewer,
reviewer-library, source-version, OCR, upload-intent, processing-job,
notification-device, Canvas connection/course/source/sync/grade, and durable
job endpoints. Every stateful route inspected has an explicit bearer guard;
`/api/health` is intentionally public.

The root web page only renders `Stay Focused V2 API`. There is no student-facing
web application. Expo Web is developer/smoke tooling, and mobile remains the
capstone target. Web feature parity is not required.

The hosted endpoint `https://stay-focused-v2-prototype.vercel.app/api/health`
returned HTTP 200 with `{"status":"ok","version":"2.0.0"}` during R4.
That proves availability, not the exact deployed Git revision.

### Database and security

- The repository contains 41 ordered migration files with unique prefixes.
- Reviewers, Canvas data, processing data, reusable assets, private
  checkpoints, notification devices, and sync units have explicit ownership,
  RLS, grant, or service-only boundaries according to their exposure model.
- Protected routes verify a Supabase bearer JWT, then repeat owner predicates
  when using server-only clients.
- Canvas tokens are encrypted; OpenAI, Google, Supabase service-role, and
  Canvas encryption secrets remain server-only.
- Upload paths are owner-prefixed/private; result/status responses avoid source
  bodies, provider errors, credentials, and storage keys.
- Job creation is idempotent, cancellation blocks result publication, and
  account deletion/cleanup migrations reduce orphan risk.

No concrete cross-user exposure, leaked credential, unauthorized mutation, or
orphaning defect was found in R4. The genuine remaining database risk is
operational: four linked Canvas migrations were applied under remote-generated
version aliases. That history must be deliberately reconciled before adding
new capstone migrations; old applied files must not be edited.

## 10. Android and EAS readiness

- Expo SDK: 54 (`expo ~54.0.36`)
- React Native: 0.81.5
- EAS project ID, Android package, and iOS bundle identifier are committed.
- `preview` is an internal APK profile using the hosted V2 HTTPS API.
- `production` uses remote app-versioning, auto-increment, and the hosted V2
  URL; it still points to the prototype deployment and needs final environment
  provenance before release claims.
- `development` uses an app-specific development client and LAN `auto` API
  resolution.
- Camera/photo and notification plugins are declared; unnecessary Android
  record-audio permission is blocked.
- `package-lock.json` is tracked. R3 proved mobile typecheck/tests and the API
  build; earlier acceptance records prove an APK installed and email auth/API
  connectivity worked on Android.

Build configuration remains viable. R4 did not request or create a new EAS
build. Final capstone acceptance still needs a build from the final commit and
a recorded physical-device matrix.

## 11. Capstone requirement matrix

| Capability | Current state | Evidence | Capstone required? | Remaining work |
|---|---|---|---|---|
| Email authentication/session restore | Complete | Auth provider/service; installed Android auth passed | Yes | Final-build spot-check only |
| Google/Microsoft OAuth | Foundation only | Helpers exist; login UI says coming later | No | Post-capstone unless defense scope changes |
| Reviewer pipeline | Deterministically and live validated | 290/290; R2 `gpt-4o` 18/18 | Yes | Preserve; demo fixture/latency plan |
| Manual/image/camera source intake | Complete | Mobile flow, OCR tests, historical physical validation | Yes | Final-build smoke |
| Native PDF processing | Implemented/hosted; final device matrix partial | Durable 100-total/40-OCR policy | Yes | Android 41-100 native-page acceptance |
| Scanned/mixed PDF OCR | Complete with bounded limits | OCR 27/27; live mixed and physical evidence | Yes | Android safe >40-OCR rejection |
| Durable processing jobs | Hosted validated | Workflow/checkpoint/cancel/reconcile implementation | Yes | Final deployed-revision/device evidence |
| Processing multi-job UX | Complete | Processing screen and 204/204 mobile baseline | Yes | Final device smoke |
| Study Library | Complete online | Owner-scoped CRUD and live cross-user evidence | Yes | Final device smoke |
| Offline reviewer access | Partial | Cache works through Processing; Library is API-only | Yes, limited claim | Surface cached reviewers in Library and test airplane-mode open |
| Canvas connection | Complete for controlled PAT use | Encrypted owner PAT; live/hosted acceptance | Yes | Final device spot-check |
| Canvas course/content sync | Complete, hosted validated | Durable incremental/resumable jobs | Yes | Final Android flow evidence |
| Canvas assignments/modules/announcements/files | Implemented in sync/source model | Typed client, DB, APIs, source selection | Yes | Use as planning inputs; no broad parser expansion |
| Canvas submissions/grades | Complete read-only slice | Hosted grade jobs and mobile grade screen | Desirable/defense demo | Final Android spot-check |
| Task management | Missing | No schema/API/mobile task feature | Yes | R5/R6 implementation |
| Study scheduling | Missing | No schedule/session/planner implementation | Yes | R5/R6 implementation |
| Completion notifications | Implemented, device acceptance partial | Expo device registration, worker delivery/receipt code | Desirable | Final Android test notification and completion delivery |
| Study/task reminders | Missing | No scheduling/preferences code | No minimum requirement | P2/post-capstone |
| Android preview build | Configured and previously installed | `eas.json`, app config, acceptance record | Yes | Build final commit and run device matrix |
| Hosted API | Available | R4 HTTP 200; Workflow code/deployment | Yes | Deploy final main and record revision/env separation |
| Student-facing web UI | Missing by design | API root only; Expo Web is tooling | No | Post-capstone only if product scope changes |
| RLS/owner authorization | Strong implemented baseline | 41 migrations, route guards, contract/live tests | Yes | Migration alias gate; final cross-user regression |
| Thesis/demo evidence | Partial/outdated | Thesis/current-state documents contradict code/R3 | Yes | Reconcile narrative, privacy, demo script, results |

## 12. Real remaining gaps

### P0 — Capstone blocker

#### P0.1 Task and study-schedule vertical slice is absent

- Affected area: product domain, database, API, mobile navigation and UI.
- Evidence: no task/session tables, routes, services, or screens; Phase 6 is
  explicitly pending; the current authenticated app opens the reviewer screen.
- Why it matters: the project describes itself as schedule-first and promises
  Canvas-informed actionable study work. Without this slice, the capstone demo
  proves reviewer/Canvas infrastructure but not the stated productivity app.
- Smallest acceptable fix: owner-scoped tasks plus deterministic study-session
  planning from manual tasks, saved reviewer context, and visible selected
  Canvas assignment deadlines. Provide create/edit/complete/delete, a bounded
  plan preview/apply flow, and a simple agenda. Do not add an AI planning prompt
  or rebuild Canvas/reviewer infrastructure.
- Acceptance: a signed-in student creates or imports a task, generates a
  deterministic plan around a due date and availability, edits/completes it,
  restarts the app, and sees the same owner-scoped task/session state; a second
  user cannot access it.
- Likely packages: `packages/db`, `packages/shared`, `apps/api`, then
  `apps/mobile`.
- Dependencies: remote preservation and migration-alias preflight.

### P1 — Required before final defense

#### P1.1 Preserve reconciled `main` remotely

- Evidence: local `main` is 35 commits ahead before the R4 commit and no push
  was authorized.
- Minimum: review R4, then perform a normal `git push origin main`.
- Acceptance: `origin/main` equals the approved local commit; ahead/behind is
  `0 0`; recovery refs remain local unless separately approved for push.

#### P1.2 Reconcile linked migration version aliases before new schema work

- Evidence: four linked Canvas changes use generated remote versions rather
  than the committed filenames; current instructions forbid editing applied
  migrations.
- Minimum: audit linked migration history and apply an approved metadata repair
  or forward-only reconciliation that makes a dry run recognize all 41 changes.
- Acceptance: local/linked histories map deliberately, no existing migration
  is reapplied or edited, and a new test migration can be planned safely.
- Dependency: P1.1 and explicit user approval for linked-project metadata work.

#### P1.3 Consolidate limited offline reviewer access

- Evidence: cached durable reviewer payloads open in Processing, but Study
  Library list/open is network-only.
- Minimum: expose owner-scoped cached reviewer metadata/payloads in Study
  Library with explicit offline/stale labels and no offline mutation promise.
- Acceptance: after one online retrieval, airplane mode plus app restart can
  list/open that reviewer; another account cannot see it; uncached reviewers
  are honestly unavailable.

#### P1.4 Complete the physical-device acceptance debt

- Evidence: Android APK install/auth/API passed, but the long-document matrix,
  final Canvas flows, Dynamic Type/TalkBack/VoiceOver-equivalent checks,
  interruption/reconciliation, and notification delivery are not all recorded.
- Minimum: one bounded final Android matrix on the final build; retain iPhone
  checks only where iOS-specific behavior is claimed.
- Acceptance: named PASS/FAIL evidence for auth, task/schedule flow, reviewer,
  41-100 native-page processing, >40 OCR safe rejection, switch-away/restart,
  Canvas content/grade flow, offline cached reviewer, and completion push.
- Dependencies: R5-R8 implementation and final hosted deployment.

#### P1.5 Deploy and identify the final `main` revision

- Evidence: hosted health is 200, but it does not expose/establish exact R4 or
  future capstone revision; EAS production still targets a prototype URL.
- Minimum: deploy the final approved `main`, record deployment/revision and
  safe environment separation, and validate health plus one protected flow.
- Acceptance: deployment evidence maps URL to commit, secrets remain
  server-only, health passes, Workflow completes, and rollback is documented.

#### P1.6 Reconcile canonical/thesis/demo documentation

- Evidence: branch, commit, feature status, and engine-count contradictions in
  current-state, current sprint, roadmap, thesis, and ADR history.
- Minimum: update canonical current state/roadmap/sprint and thesis claims to
  match the final code and explicitly bound offline, Canvas PAT, and mobile-only
  scope.
- Acceptance: no document calls the old feature branch authoritative; the
  defense matrix and demo script cite current test/live/device evidence.

#### P1.7 Review committed live-artifact provenance and privacy

- Evidence: current-state documentation records unresolved provenance for
  tracked historical academic live-output artifacts.
- Minimum: inventory each artifact, classify it synthetic/authorized/private,
  retain only defense-appropriate evidence, and use forward commits for any
  approved redaction/removal.
- Acceptance: a privacy manifest identifies every retained live artifact and
  no secret, personal identifier, or unauthorized academic content is present.

### P2 — Polish

#### P2.1 Mobile navigation, settings, and account polish

Add stable primary navigation and a small settings/account surface after the
task/plan information architecture exists. Do not rewrite working feature
screens. Accept when back/restart behavior, sign-out, error focus, and core
screen reachability pass accessibility and device checks.

#### P2.2 Windows CRLF test portability

One API SQL contract assertion remains LF-sensitive while runtime SQL is
equivalent. Fix only after capstone behavior is stable by normalizing the test
input or matching line-ending-independently. Accept at 548/548 on Windows and
unchanged SQL content. R4 intentionally made no change.

#### P2.3 Deterministic cleanup scheduling and operations evidence

Bounded retention/cleanup foundations exist, but final scheduled operational
evidence is incomplete. Add only the smallest hosted invocation/monitoring
needed for a public deployment; this must not block a controlled defense demo.

#### P2.4 Targeted dependency advisory triage

Record a fresh audit near release and remediate only safe, relevant runtime
advisories. Avoid broad Expo/Next upgrades during the capstone sprint unless a
specific supported-version or exploitable-runtime issue requires them.

### Post-capstone

1. Institutional Canvas OAuth and PAT migration after a Developer Key exists.
2. Automatic/scheduled Canvas sync and Canvas-specific notifications.
3. Native background upload/relaunch support and offline document staging.
4. Full offline course packs, grades, assignments, and cross-device conflict
   resolution.
5. Grade Goal Planner, What-If grades, broader Canvas parsers/resources, and
   student-intelligence features.
6. Google/Microsoft login UI and complete native OAuth redirects.
7. Student-facing web parity, semantic search, analytics, and a general study
   reminder platform.

## 13. DO NOT DESTABILIZE

Unless a concrete reproducible defect is found, do not redesign or broadly
rewrite:

- Stage 0-6 reviewer normalization, planning, generation, coverage, grounding,
  leakage, retry, and assembly contracts;
- reviewer prompts, strict schemas, default no-enrichment policy, or R2 live
  validation harness/artifacts;
- native/scanned/mixed PDF inspection, page accounting, OCR chunking, and
  fail-safe completeness checks;
- durable processing idempotency, HTTP 202 boundary, Vercel Workflow ownership,
  transactional result publication, cancellation, and reconciliation;
- Canvas PAT encryption, bearer verification, owner/service authorization,
  incremental/resumable unit model, safe partial promotion, and no-deletion-
  from-partial-evidence invariant;
- reviewer and Canvas RLS/ownership architecture or applied migrations;
- Study Library reviewer persistence/provenance contracts;
- existing EAS preview/development configuration and hosted API URL resolution;
- completion-notification delivery/receipt foundation;
- the known CRLF-sensitive test during feature phases.

## 14. Final development sequence

### R5 — Task and study-plan domain foundation

- Objective: implement the missing owner-scoped task/session domain and a
  deterministic planning contract.
- Scope: forward-only DB migration, RLS, typed models, CRUD/import APIs,
  deterministic plan preview/apply, Canvas assignment references, and tests.
- Non-goals: mobile UI, AI prompt changes, notifications, automatic Canvas
  sync, grade prediction, broad calendar integration.
- Prerequisites: approved remote push and linked migration-alias gate.
- Likely packages: `packages/db`, `packages/shared`, `apps/api`.
- Verification: typecheck/build; task/planner unit tests; API auth/validation;
  two-user owner-isolation; migration/RLS verification; existing API/Canvas/
  reviewer regression suites proportional to touched paths.
- Acceptance: persisted tasks/sessions and deterministic planning pass owner,
  idempotency, due-date, availability, overlap, timezone, and invalid-input
  cases without changing stable reviewer/Canvas behavior.
- Commit boundary: schema/domain/API only.
- Live/provider/device testing: linked Supabase validation required; OpenAI and
  physical device not required.

### R6 — Mobile task and schedule experience

- Objective: make the R5 domain usable as the schedule-first capstone slice.
- Scope: Tasks/Plan navigation, create/edit/complete/delete, selected Canvas
  deadline import, reviewer-linked study work, availability input, plan
  preview/apply, and simple agenda.
- Non-goals: full calendar platform, automatic sync, grade prediction, reminder
  platform, visual redesign of existing screens.
- Prerequisites: R5.
- Likely packages: `apps/mobile`, shared task types/services.
- Verification: mobile typecheck/tests, API contract tests, restart/session
  restoration, timezone/DST fixtures, accessibility labels, and one protected
  web smoke if useful.
- Acceptance: the complete P0 scenario works online across restart and accounts.
- Commit boundary: mobile/API integration and focused tests.
- Live/provider/device testing: protected hosted test desirable; no OpenAI call
  required; physical device deferred to R9.

### R7 — Limited offline study access

- Objective: make the truthful offline claim coherent.
- Scope: cached reviewer discovery/opening in Study Library, explicit cached/
  stale/unavailable copy, and read-only last-known task/agenda cache if small.
- Non-goals: offline Canvas, offline OCR, background upload, offline mutations
  requiring conflict resolution.
- Prerequisites: R6 information architecture.
- Likely packages: `apps/mobile` cache/library/task services.
- Verification: cache bounds, owner switch, eviction, stale state, airplane-mode
  restart, and online reconciliation tests.
- Acceptance: one previously downloaded reviewer and current agenda reopen
  offline without cross-account leakage or false freshness claims.
- Commit boundary: local cache and UI only.
- Live/provider/device testing: physical airplane-mode test required; no paid
  provider call.

### R8 — Navigation and accessibility hardening

- Objective: make existing and new surfaces coherent without redesigning core
  features.
- Scope: stable primary navigation, settings/account entry, destructive-state
  guards, Dynamic Type/TalkBack semantics, touch targets, loading/error focus,
  and small copy fixes.
- Non-goals: feature expansion, OAuth, new design system, engine/API rewrites.
- Prerequisites: R6 and R7 screen set stable.
- Likely packages: `apps/mobile` only unless a reproduced defect crosses a
  boundary.
- Verification: mobile tests/typecheck/lint, accessibility inspection, and
  physical Android walkthrough.
- Acceptance: all core screens are reachable/recoverable and the named R6
  physical acceptance debt is either passed or explicitly bounded.
- Commit boundary: mobile UX/accessibility only.
- Live/provider/device testing: physical Android required; iOS only for
  platform-specific claims.

### R9 — Final hosted and device acceptance

- Objective: validate the exact capstone revision end to end.
- Scope: deploy final `main`, apply only approved forward migrations, build EAS
  preview APK, run auth/task-plan/reviewer/PDF/Canvas/offline/notification and
  interruption matrix, capture safe evidence, and verify rollback.
- Non-goals: speculative fixes, dependency majors, architecture changes.
- Prerequisites: R5-R8.
- Likely areas: deployment/EAS configuration and validation documentation;
  product code only for reproduced blockers.
- Verification: full deterministic baseline, workflow runtime, hosted health,
  protected synthetic flows, physical Android matrix, secret/privacy scan.
- Acceptance: every capstone-critical row has final-commit PASS evidence or an
  explicitly approved non-claim.
- Commit boundary: validation fixes separately; evidence/docs separately.
- Live/provider/device testing: required. Reuse R2 AI evidence unless final
  behavior changes require one controlled provider run.

### R10 — Thesis, privacy, and demo hardening

- Objective: make claims and evidence match the accepted product.
- Scope: canonical state/roadmap/sprint, thesis chapters, architecture delta,
  artifact privacy manifest, demo script, failure fallback, evaluation tables,
  and user/performance observations appropriate to the defense.
- Non-goals: product expansion.
- Prerequisites: R9.
- Likely areas: `docs/`, approved evidence assets.
- Verification: link/claim audit, evidence-to-commit mapping, privacy/secret
  scan, rehearsed bounded demo.
- Acceptance: no stale branch/status claims and every thesis claim maps to
  code plus deterministic/live/device evidence.
- Commit boundary: documentation/evidence only.
- Live/provider/device testing: demo rehearsal required; no new paid AI run by
  default.

### R11 — Final release baseline

- Objective: freeze a reproducible defense/release checkpoint.
- Scope: full regression, safe targeted advisory triage, optional CRLF test
  portability, clean clone/build verification, release notes/tag proposal, and
  remote backup confirmation.
- Non-goals: new features or major upgrades.
- Prerequisites: R10.
- Likely areas: tests/config/docs only as justified.
- Verification: all deterministic suites, API build/health, clean Android
  build reproducibility, `git diff --check`, `git fsck --full`, and exact
  ahead/behind audit.
- Acceptance: clean trusted commit with repeatable build/test instructions and
  no unresolved P0/P1 gaps.
- Commit boundary: narrowly scoped release hardening.
- Live/provider/device testing: only final smoke; reuse accepted evidence.

## 15. Next recommended implementation task

R5 — Task and study-plan domain foundation.

It addresses the only P0 gap while minimizing regression risk by staying below
the mobile UI and avoiding reviewer, OCR, Canvas synchronization, notification,
and auth rewrites. The prompt for R5 must begin with two stop gates: confirm the
approved `main` push, and confirm linked migration aliases can be reconciled
without editing or replaying applied migrations.

## 16. R4 verification record

| Check | Result | Freshness |
|---|---|---|
| Starting status/branch/HEAD | PASS | FRESH |
| `git fetch --prune` and remote relationship | PASS; 35 ahead/0 behind before R4 docs | FRESH |
| Recovery refs/tag | PASS | FRESH |
| `git fsck --full` | PASS | FRESH |
| `git diff --check` | PASS | FRESH |
| Hosted V2 `/api/health` | HTTP 200, version 2.0.0 | FRESH |
| Engine 290/290 | PASS | R3 BASELINE; NOT RERUN IN R4 |
| Mobile 204/204 | PASS | R3 BASELINE; NOT RERUN IN R4 |
| OCR 27/27 | PASS | R3 BASELINE; NOT RERUN IN R4 |
| Canvas 72/72 | PASS | R3 BASELINE; NOT RERUN IN R4 |
| Reviewer smoke 51/51 | PASS | R3 BASELINE; NOT RERUN IN R4 |
| API typecheck/build/health | PASS | R3 BASELINE plus fresh hosted health |
| API tests | 547/548, known CRLF-only assertion | R3 BASELINE; NOT RERUN IN R4 |
| Paid OpenAI generation | NOT RUN | Existing R2 evidence accepted |
| New EAS build/device test | NOT RUN | Configuration inspection only |
