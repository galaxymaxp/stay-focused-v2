# SP2b Courses, Today, read-route and job-status speed

Date: 2026-10-15. Status: **PASS for the unattended local code scope**.
Branch: `overnight/2026-10-15_feedback`. Baseline: `41377cc` (SP2 PASS).

Finite scope: SP0 findings **4, 7, 8, 10, 13**, local code/tests/builds,
documentation and local commits. The UNATTENDED rules take precedence: rollout
and device checks are entirely skipped; no service calls, remote SQL/migration
application, Scheduler, environment-file edits, deployment or push. Findings
11/12 remain owner decisions, and GA1 remains STOPPED independently. SP1 saved
snapshots, CQ1 past courses, QD1 Queue and SP2 projections remain in use.

## Baseline and interruption recovery

STEP 0 recorded the expected branch, SP2 PASS and clean tracked tree at `41377cc`.
Resume re-read the complete prompt, progress file, latest 15 commits, status and
diff. STEP 1-4 were already committed and were not repeated. The unfinished
STEP 5 client/shared files were inspected and completed with their missing API
response. Initial unrelated `UI/`, `apps/mobile/.gitignore` and `supabase/` were
preserved and excluded from staging. Locally recorded upstream is `github/main`;
no fetch was performed. Next.js/React and Supabase owner-isolation guidance
informed review; the unattended ban overrides remote documentation/query steps.
There is no new schema, migration, runtime region, queue or service setting.

Reopened audit locations (paths without a prefix are under `apps/api/src/lib`):

| Finding | At baseline `41377cc` | Implemented location |
|---|---|---|
| 4 | `canvas-course-selection.ts:100`; `experience/http.ts:31` | Stored-first branch `canvas-course-selection.ts:119`; parallel assembly `:286`; `experience/http.ts:8` |
| 7 | mobile `TodayScreen.tsx:75`; web `today-screen.tsx:80`; `auth.ts:4`; `experience/task-state.ts:5` | mobile `:68`; web `:77`; `experience/service.ts:158`; shared bearer verification remains `auth.ts:4` |
| 8 | web `DayRingClock.tsx:13`, `DayOrb.tsx:3`; mobile `DayOrb.tsx:4` | web `DayRingClock.tsx:14`, `DeferredDayOrb.tsx:9`; mobile unchanged |
| 10 | API experience catch-all `route.ts:3,20`; `experience/http.ts:4`; `canvas-reviewer-sources.ts:1` | catch-all `route.ts:3,17`; `experience/read-http.ts:1`; lightweight `quiz/read-model.ts`, `activity-maker/read-model.ts`, Office metadata/messages modules |
| 13 | web `queue.tsx:195`, `components/queue-button.tsx:12`; mobile `AppActivityProvider.tsx:10` | `api/jobs/route.ts:139`; `experience/service.ts:320`; web `queue-items.ts:151`; mobile `useQueueItems.ts:272` |

QD1 already shared mobile header/Queue list polling; that part was retained.
Website detail still performed two sequential requests and mobile detail had a
separate generation poller, so finding 13 still required implementation.
No code contradiction requiring a changed scope or owner decision was found.

Implementation commits (documentation checkpoint follows separately):

- `7a79a3a perf(api): open Courses from stored owner inventory`
- `7dfcd13 perf(today): bundle activity reads within one verified request`
- `5cb63ad perf(web): defer Today WebGL until useful content paints`
- `8151f68 perf(api): isolate read models from document and generation imports`
- `99de167 perf(queue): share owner-scoped status and generation detail reads`
- `8db0f3b test(sp2b): reconcile Today fixtures and shared polling effects`
- `19028c5 fix(mobile): follow generation screen focus in shared job reads`

## Implementation and acceptance

| Requirement | Proof | Result |
|---|---|---|
| Stored Courses: no Canvas/writes; first-ever live discovery; CQ1 and owner/connection isolation | `canvas-course-selection.test.ts`, eight cases including measured stored read counts | PASS |
| Today one verified bundle; same previous results, nine distinct table reads; no cross-request/owner cache | `experience.test.ts`, `http.test.ts`; every request verifies bearer before trusted reads | PASS |
| SP1 snapshot keys/date/timezone and 60-second web refresh | Existing hooks retained; full mobile/web regression suites | PASS |
| Static same-size orb before useful content/animation import; reduced motion | `deferred-day-orb.test.ts`, two cases; fresh Next bundle comparison | PASS |
| Read imports exclude preparation/generation/Office/PDF runtime; writes retain asset packaging | `read-imports.test.ts`, three cases over resolved static TypeScript graph and installed Next matcher; built Today trace | PASS |
| Queue/header/detail share one request/poller; concurrent refresh deduplication and owner reset | web/mobile Queue hook integration tests; shared reader two cases | PASS |
| Safe generation projection, exact owner fallback, extraction status, missing saved-result denial | jobs route six cases; generation service equivalence across reviewer/quiz/activity; existing Retry/Open and cancellation regressions | PASS |
| Required fresh serial gates | Final table below | PASS |

Courses uses saved CQ1 evidence without decrypting Canvas credentials when
inventory exists. The first-ever empty inventory keeps existing live discovery
and `classificationSource: canvas`; normal stored reads report `stored`.
Reconciliation stays in existing sync paths. Preference/state/run reads are
parallel after verified identity and course IDs are known.

Today adds optional capabilities/announcements/activity summaries to `/api/today`
and uses the same service methods as old endpoints. A request-local promise map
shares only the verified owner's table reads, with a fixed request time. It
never caches bearer authorization across requests. Old endpoints keep working.
[ADR-032](../../architecture/ADR-032-today-and-job-read-context.md) records both
additive read contracts.

WebGL is requested only after useful content is ready and two animation frames
have passed. The same-footprint still also covers failed chunk loads and reduced
motion; ring hit testing and interaction stay in the lightweight component.
Mobile remains unchanged: no behavior-neutral Metro chunk deferral was
established in this scope; installed Three.js measures
**1,292,907 raw bytes**, not its measured Metro contribution.

Read handlers statically use lightweight DTO/read-model modules. Preparation,
source validation and generation writes load their handlers dynamically. Today
also stops receiving blanket native/PDF tracing includes; all write and mixed
routes retain them, verified using installed Next's actual glob matcher. The
mixed experience catch-all deployment still packages its dynamic write assets;
we do not claim its entire deployed trace excludes PDFs. Static read imports
and the dedicated Today deployment trace are the measured improvements.

`GET /api/jobs?scope=all&limit=50&detailId=<id>` adds `detailId` and nullable
`detail: { job, generation }`. Existing list callers receive the old shape.
Reuse the owned row in the Queue page; older/past-course direct links use one
explicit owner-scoped lookup without inserting them into CQ1's Queue list.
Extraction detail contains status and a null generation. Generation projections
reuse existing state/error mappers and persisted artifact checks; completed
reviewer lookup reuses SP2's exact current-version projection. Missing/foreign
results give no Open target, and cancelled jobs publish none. The website shell
and mobile AppActivity provider own one reader/poller per owner, with abort on
cleanup, active-detail 3-second polling, list-only 5-second polling, idle 30-second
polling and background/visibility handling. Mobile retained generation screens
release/reacquire their detail subscription on focus changes. Duplicate concurrent refreshes join
one request. Completed Queue Open remains an explicit on-demand persisted-result
verification through the compatible legacy endpoint, without another poller.

## Deterministic before/after

All numbers are local measurements, not production RTT/cold starts. Counts use
single-page synthetic fixtures or source control flow and exclude unchanged
header/sync traffic. Large paginated datasets may require additional DB pages.

| Finding / method | Before | After |
|---|---|---|
| 4: initial stored Courses fixture | 1+ Canvas pages; 1 upsert; at least 5 DB operations after auth | 0 Canvas calls, 0 writes; 4 data reads + 1 connection read; final three data reads parallel |
| 7: one Today screen load | 4 HTTP requests; 16 data reads + 8 auth/activity calls | 1 HTTP request; 9 distinct table reads + 2 auth/activity calls; same read models |
| 8: fresh `/today` First Load JS | 320 kB at baseline | 198 kB in both Step 3 and final standalone builds |
| 8: mobile Three.js raw module | 1,292,907 bytes | 1,292,907 bytes; intentionally unchanged |
| 10: dedicated `/api/today` server NFT Office/PDF/fflate/XML package entries | 375 PDF.js package entries | 0; 79 total trace files |
| 13: generation detail plus header | 2 sequential detail HTTP requests plus separate header polling; mobile extra detail poller | 1 shared Queue/detail HTTP request and poller; 0 extra status reads for in-page detail, 1 scoped lookup if outside page |

Baseline logs: `tmp/overnight/SP2b.before-*`; Step 3 fresh web build:
`SP2b.step3-web-build.log`; Step 4 trace list and build: `SP2b.after-read-trace.txt`
and `SP2b.step4-api-build-final.log`. These local logs/scripts stay uncommitted.
Tests assert Courses/Today counts, response equivalence and concurrent requests;
no production timings or estimated milliseconds are substituted for observations.

## Final serial gates

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

TEMP/TMP point to repo-local `.local/test-temp`. Final builds set `EXPO_OFFLINE=1`
and disable Next/Turbo telemetry. Workflow/provider live smoke is NOT APPLICABLE:
execution/provider contracts are unchanged; existing route/admission/generation
regression tests and build cover the moved module boundaries.

Failures and earlier attempts remain recorded, not erased:

- Step 2 draft API tests: 117 passed / 1 failed (118); old inventory mock expected
  no `preferStored` option. Updated expected contract; focused rerun 118/118.
- Step 4 draft focused suites: 427 passed / 1 failed / 3 existing skips (431).
  Installed Next matcher exposed an incorrect tracing glob; repaired matcher
  coverage and package includes, final focused import suite 3/3. An intermediate
  build passed with six unused-import warnings from the split; those imports
  were removed before the final Step 4 build.
- Resume: Python command was unavailable before it could edit files; used the
  installed Node runtime. First Step 5 API focused run 85 passed / 1 failed (86):
  fake service client was undefined, repaired its setup. Final focused run 89/89
  across two files, including three added generation-reuse cases.
- Initial forced lint passed 8/8 with three new exhaustive-dependency warnings;
  destructured stable callbacks to remove all three, preserving only the six
  existing warnings in the final run. All forced typecheck attempts passed 8/8.
- Existing Vitest native-config deprecation warning remains. No nondeterministic flake was observed.
- First full mobile gate: **1,056 passed / 2 failed in 110 files**. Today ring/planner fixtures still supplied capabilities through the old separate endpoint; moved them into typed combined Today fixtures and asserted one source. Focused interaction rerun **58/58**. Product interaction assertions remain unchanged.

- Final review found retained mobile screens needed focus-bound detail subscriptions; added the guard and a return-navigation regression, then reran affected typecheck/lint/mobile/Android/root gates.

- Closure script initially rejected the UTF-16 PowerShell gate logs before changing docs; added BOM-aware log decoding. Gate results were unaffected.

## Owner steps remaining

Rollout and Device checks were **entirely skipped**. Confirm pending SP2/CQ1
migration prerequisites, then deploy API/website and preview OTA because mobile
changed. Check CIT17 Courses/Today first content, web orb layout/reduced motion
and clock interactions, Queue dropdown/Retry/Open, extraction jobs and generation
detail updates. Verify saved/offline content, account isolation and CQ1 grouping.
Resolve findings 11/12 region/capacity decisions separately; resolve GA1's owner
questions before any batch-generation work.

Production/deployed revisions, database rows/applied migrations, Scheduler,
Canvas inventory, cold-start milliseconds, real latency, real device behavior
and actual Metro contribution are **UNVERIFIED (owner to confirm)**. No remote
service, remote SQL/application, environment-file edit, deployment, Scheduler
action, push or outside-repository deletion was performed.
