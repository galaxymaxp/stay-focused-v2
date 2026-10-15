# SP0 speed audit (2026-10-15)

Most avoidable waiting is on the read path: uncached screen loads wait for network/auth, course lists check preparation one material at a time, and Library/detail reads load whole owner histories before filtering.

## Scope and evidence

- **PASS, local docs-only audit.** Inspected implementation at `89dd1b8` on
  `overnight/2026-10-15_feedback`, based on released main `079986c`.
  F0S status was PASS and `git status --porcelain --untracked-files=no` was empty.
  Unrelated untracked `UI/`, `apps/mobile/.gitignore`, and `supabase/` were preserved.
- Read the full SP0 prompt, the external tester-feedback roadmap (including
  SP0/SP1/CQ1/SP2), root policy and AUTOPILOT. The prompt's F0S baseline supersedes
  the external roadmap's older F0/base-hash description. Scope ends at this audit;
  SP1/CQ1/SP2 are inputs, not implemented here.
- **FRESH** local web build, synthetic service measurements, a resource-hook
  measurement, and existing mobile SQLite/Library tests are recorded below.
  No production request, provider call, database SQL, migration, deployment,
  Scheduler action, environment-file edit, or push was performed.
- Costs in **calls** follow actual control flow. Example milliseconds using `D`
  mean one database/Auth round trip; `C` means one Canvas request. Neither is a
  measured production RTT. Synthetic timings include local scheduling and JSON
  accounting, exclude auth, HTTP, Storage, Canvas, OCR, AI and rendering.
- All deployed-region/settings checks, actual CIT17 counts/timings, response
  sizes, cold starts, and physical/browser first-content timings are
  **UNVERIFIED (owner to confirm)**. There is no claim that a measured local
  bottleneck accounts for a known percentage of production time.

## Ranked findings

### SP2 local implementation follow-up (2026-10-15)

The original evidence/cost table below remains the SP0 baseline. SP2 closes
only this run's server data-path findings; SP2b's 4/7/8/10/13 are untouched.

- **1 DONE**: `eeae99b`, corrected control ordering `2092b34`. Reuse complete
  source inventory and current revision receipts/controls across candidate and
  visible projections. Synthetic preparation reads **700 -> 2**, DB JSON bytes
  **75,400 -> 4** with empty receipts/controls; stable paging fails closed.
- **2 DONE**: `f0c7173`. Owner-bound summary views, generated stored E2 estimate,
  DB filtering/pagination, exact current reviewer version and visible material
  badges. Same SP0 Library fixture: **18 -> 2 reads, 18,900,915 -> 44,277 bytes**;
  detail **11 -> 2 reads, 18,879,565 -> 78,702 bytes**, excluding freshness.
- **5 DONE**: `6fb2d79`, saved-card retention `97a6934`. Publish accepted pages
  immediately, append stable identities, keep saved cards during partial
  refresh failures and persist only complete traversals. A first uncached
  240-card visit shows cards after **1 instead of 3 responses**; total stays 3.
- **6 DONE**: `f0c7173`. Independent visible/hidden reads and legacy read groups
  run in parallel; workspace passes its already validated course. SP0 empty
  inventory fixture **10 -> 1 reads, 18,879,782 -> 221 bytes**.
- **9 SKIPPED additional implementation (already fixed)**: current body/schema/
  timestamp checks already avoid unchanged downloads in both catch-up callers.
  `f0c7173` strengthens its regression and fixes the shared detail dependency;
  unchanged bodies make **0 detail requests before and after**. Retain the
  300-attempt / 60-second bounds and explicit not-found deletion.

See [SP2 acceptance](../ai/acceptance/sp2-library-data-path.md) for methods,
exact gates, failures, migration/ADR-031, and owner work. These are local
synthetic read/byte counts, not production latency; overlapping savings must
not be added. New migration `20261015040000_experience_library_projections.sql`
is a file only. Findings 11/12 remain owner decisions: no region, capacity,
queue, concurrency, service or Scheduler change was made.

Rank reflects demonstrated amplification and reach, not a production latency
percentile. `code-only` identifies a bounded implementation direction; its target
item is explicit. `trade-off` requires an owner decision and belongs in SP2's
DECISIONS-NEEDED inputs. No trade-off is implemented by this audit.

| # | Finding | Where (file:line) | Est. cost (ms or calls) | Fix | Class |
|---|---|---|---|---|---|
| 1 | Preparation N+1 happens **before** pagination, then again on the visible materials | `apps/api/src/lib/canvas-reviewer-sources.ts:415`; `apps/api/src/lib/canvas-preparation/admission.ts:12`; `apps/api/src/lib/canvas-preparation/client-status.ts:29` | Simple File/Page without attachments: 3 serial reads per candidate plus 4 reads per visible item. N=100, page=100 => **700 reads**, of which 300 are sequential before the visible-page pass. At illustrative D=20 ms, that prefix alone is 6,000 ms. Larger attachment evidence adds calls. | SP2: batch current source evidence, revision-matched preparation receipts and controls, reuse the same results for both projections. Keep complete candidate ordering/counts and revision/owner/connection fences; do not just move the old loop behind a smaller slice. | code-only |
| 2 | Library, reviewer detail and material badges read every owner's artifact/version/source, including full bodies | `apps/api/src/lib/experience/repository.ts:39`; `apps/api/src/lib/experience/service.ts:54`, `:197`, `:235`, `:247` | Library minimum 14 table-page reads across 3 serial groups; every 200 rows adds pages. Synthetic 240-reviewer example: **18 reads / 18,900,915 DB JSON bytes** to return 38,123 bytes of summaries; one detail: 11 reads / 18,879,565 bytes for 78,742 bytes returned. | SP2: owner-bound summary projections and DB-side pagination/filtering; exact-id detail lookup; fetch only current relevant versions. Preserve review estimates, supersession, automatic origin and quiz attempt summaries. Avoid shipping source text/provider metadata to list consumers. | code-only |
| 3 | Most new screen visits have no saved-first read; mobile Tasks has a cache but consults it only after connection failure | `apps/mobile/src/features/redesign/useExperience.ts:43`, `:77`; `apps/web/src/lib/hooks.ts:14`; `apps/mobile/src/services/localLibrary/offlineActivityCache.ts:10` | Five mobile and six web hook probes had **no content after 104-121 ms** with response held. Slow failed GET can wait for the 15,000 ms client timeout before mobile Tasks reads SQLite. | SP1: persist owner-scoped screen snapshots, read before network, keep them on refresh errors and clear on sign-out; preserve first-ever skeletons. Use existing Library local-first behavior as the starting point. | code-only |
| 4 | Opening Courses performs live Canvas inventory and DB writes before returning saved course state | `apps/api/src/lib/canvas-course-selection.ts:112`, `:128`, `:149`, `:159`, `:199`, `:215`, `:505`; `apps/api/src/lib/experience/http.ts:40` | Auth + activity RPC, connection read, all Canvas course pages, course upsert, preferences, optional missing-course read, sync states, all scoped run history. At least 5 DB operations after auth on nonempty live inventory, plus Canvas pages. A timeout on a Canvas page is 15,000 ms before fallback. | SP2: make the screen's initial response use stored inventory; reconcile live inventory in the existing sync path. Parallelize independent preference/state/run reads once identity/course ids are available; retain explicit connection/selection validation. SP1 handles local first paint. | code-only |
| 5 | Website Library hides the first page until **all** pages finish; server repeats whole-history construction per page | `apps/web/src/features/library.tsx:92`; `apps/api/src/lib/experience/service.ts:235` | `ceil(visible artifacts / 100)` sequential requests, maximum 20; only then `setState`. Synthetic 240-card case implies 3 requests, each rebuilding full owner history. | SP2: publish each accepted page into the visible list and append later pages; preserve stable ordering, identity, supersession and error handling. SP1 supplies the persistent initial snapshot. | code-only |
| 6 | Independent Library groups execute serially; workspace reads course inventory twice | `apps/api/src/lib/experience/service.ts:75`, `:238` | Library 8-table wave -> 2-table wave -> 4-table wave rather than parallel waves; roughly 2D avoidable for small tables. Workspace adds 1D by rereading all courses for ownership. | SP2: parallelize independent groups and pass an already owner-validated course into materials assembly. This is an interim improvement; it does not solve finding 2. | code-only |
| 7 | Today requests overlapping activity data; separate request auth repeats two sequential service calls | `apps/mobile/src/features/redesign/TodayScreen.tsx:74`; `apps/web/src/features/today/today-screen.tsx:79`; `apps/api/src/lib/auth.ts:5`; `apps/api/src/lib/experience/task-state.ts:8` | 4 screen data requests in parallel: Today 7, activities 7, announcements 2 data reads, capabilities 0; **8 extra auth/activity calls**, minimum 24 service calls total, excluding header/sync work. These are parallel requests, not a 4-request frontend waterfall. | SP2: return the overlapping activity/capability read models together or reuse a request-scoped activity context. Keep server verification of the bearer JWT and the server-derived activity semantics. Do not cache authorization by an unverified owner id. | code-only |
| 8 | Website Today statically imports Three.js on its first content path | `apps/web/src/features/day-clock/DayRingClock.tsx:13`; `apps/web/src/features/day-clock/DayOrb.tsx:3`; mobile counterpart `apps/mobile/src/features/redesign/DayOrb.tsx:4` | FRESH Next output: **315 kB** First Load JS for Today vs shared 103 kB; other main routes 181-198 kB. Mobile Three.js module is 1,292,907 raw bytes, not its Metro contribution. | SP2: defer ornamental rendering behind an initial still frame while useful content loads; preserve layout, motion preference and interaction. Confirm real route/Metro savings after implementation. | code-only |
| 9 | Background library hydration multiplies the expensive exact-detail path | `apps/mobile/src/app-shell/AppLifecycle.tsx:40`; `apps/mobile/src/services/localLibrary/librarySync.ts:80`; `apps/mobile/src/features/redesign/useLocalLibrary.ts:91` | Up to 300 detail attempts / 60,000 ms per catch-up, serial, plus quiz answer-key calls. Each reviewer currently invokes finding 2; list paging also repeats it. It does **not** block an existing local Library body. | SP2: first fix exact-id reads and list projections (finding 2); avoid refetching unchanged bodies using existing version checks. Preserve catch-up bounds and explicit not-found deletion. | code-only |
| 10 | Public read routes import preparation/generation/document machinery even for tiny GETs | `apps/api/app/api/experience/[...path]/route.ts:5`; `apps/api/src/lib/experience/http.ts:4`; `apps/api/src/lib/canvas-reviewer-sources.ts:1`; `apps/api/src/lib/activity-maker/office-extraction.ts:1`; `apps/api/src/lib/ocr/pdfjs-runtime.ts:3` | Cold module load risk: Office zip/XML and PDF.js including worker code reachable through read imports. Cold-start ms **UNVERIFIED**; no claim a PDF parser executes during every GET. | SP2: split lightweight read/projection dependencies from write/preparation handlers and lazily load those handlers. Verify built server traces after the split. | code-only |
| 11 | API configured in iad1; repo evidence places DB and worker in Tokyo | `apps/api/vercel.json:5`; `docs/ai/acceptance/b37/google-cloud-generation-foundation.md:15`; `apps/api/src/lib/processing-jobs/google-cloud.ts:27` | Every serial DB/Auth step crosses that region boundary **if current deployments match**. D and current project region **UNVERIFIED**. Findings 1/2 amplify this; moving regions cannot repair their query count. | Owner decision for SP2: measure deployed routing/RTT first, then decide API region (including API-to-Canvas, Google token brokerage and student geography); no automatic move or new paid resource. | trade-off |
| 12 | Preparation, sync, source images and interactive generation share the configured Cloud Tasks queue and Cloud Run service | `apps/api/src/lib/canvas-preparation/dispatch.ts:8`; `apps/api/src/lib/canvas-sync-jobs/google-dispatch.ts:27`; `apps/api/scripts/google-cloud-worker.ts:15`; `docs/ai/acceptance/b38/google-generation-cutover-readiness.md:49` | One shared queue/service configuration in code. Historical settings: 2 concurrent tasks, 1/s, worker concurrency 1, 0-2 instances. With two long preparations active, a new interactive generation can wait for a slot. Current limits and wait ms **UNVERIFIED**. | Owner decision for SP2: choose bounded priority/reservation or separate queues/capacity, with cost and provider quotas measured. Do not raise concurrency, remove 200/25 guards or add services unattended. | trade-off |
| 13 | Generation detail waits for one status endpoint before starting another, while header/Queue also poll jobs | `apps/web/src/features/queue.tsx:295`; `apps/web/src/components/queue-button.tsx:42`; `apps/mobile/src/app-shell/AppActivityProvider.tsx:45` | Website detail adds one full API round trip before generation view; two 3 s detail polls plus header polling can overlap. Each call repeats auth/activity; completed Open also resolves the generation view. | SP2: use a shared owner-scoped job/status read source and return the necessary safe generation projection with it, avoiding sequential duplicate status reads. QD1 can reuse that source for its header dropdown. Preserve extraction-job handling, retries and persisted-result verification. | code-only |

## Screen inventory and time to first content

Paths below distinguish the actual student website (`apps/web`) from the mobile
Expo Web preview. React Query/SWR are absent from app package manifests and these
data paths. Both use custom hooks, without a general persistent screen query cache.

Common prerequisite: mobile `apps/mobile/app/(app)/_layout.tsx:25` waits for
session restore before mounting screens; web `apps/web/src/components/shell.tsx:40`
shows “Restoring your session” while providers call `getSession`
(`apps/web/src/components/providers.tsx:87`). Do not display a previous owner's
cache before establishing the current owner. A mounted screen can retain some
in-memory data during refresh; that is not persistence across a remount/restart.

API route owners: `/api/today` is `apps/api/app/api/today/route.ts:5`;
`/api/experience/{capabilities,courses,courses/:id,courses/:id/materials,activities,library,library/:id,generations/:id}`
are dispatched by `apps/api/app/api/experience/[...path]/route.ts:19`;
`/api/jobs` is `apps/api/app/api/jobs/route.ts:101`; job detail/result/cancel/retry
live under `apps/api/app/api/jobs/[jobId]/`. The catch-all handler uses the
service/repository paths in the next section, not queries inside `packages/db`.

| Screen / platform | Entry -> feature (file:line) | Before first response and ordered waits | Saved content and local proof |
|---|---|---|---|
| Today / mobile | `apps/mobile/app/(app)/(tabs)/today.tsx:1` -> `apps/mobile/src/features/redesign/TodayScreen.tsx:68` | Greeting/clock/shell plus work skeleton `:357` and announcements skeleton `:433`. After auth restore, Today + capabilities + announcements + activities start independently (`:74-85`); Today populates when its own response arrives. Sync provider runs alongside, not an awaited prerequisite. | No persisted Today snapshot wired in; preferences/clock lock are not day content. Hook stayed empty at 121.30 ms, populated at 122.47 ms only after test released response. |
| Today / web | `apps/web/app/(app)/today/page.tsx:1` -> `apps/web/src/features/today/today-screen.tsx:75` | Shell/clock, “Loading your day” at `:392`; same four independent reads `:79-94`, with 60 s polling for Today/activities/announcements. | No persisted overview. Hook empty at 111.77 ms / content at 112.83 ms after release. |
| Courses / mobile | `apps/mobile/app/(app)/(tabs)/courses/index.tsx:1` -> `apps/mobile/src/features/redesign/GenerateScreen.tsx:53` | Course skeleton `:128`; one `/api/experience/courses` response, internally gated on live inventory (finding 4). | No saved courses query snapshot. Empty 104.56 ms / content 104.99 ms. |
| Courses / web | `apps/web/app/(app)/generate/page.tsx:1` -> `apps/web/src/features/generate.tsx:53` | Header and `State` loader around courses resource; one `/api/experience/courses` response with same backend waterfall. | No saved query snapshot. Empty 104.46 ms / content 104.80 ms. |
| Course workspace / mobile | `apps/mobile/app/(app)/(tabs)/courses/[courseId]/index.tsx:1` -> `apps/mobile/src/features/redesign/GenerateScreen.tsx:191` | Navigation title may use route params; materials skeleton `:256`. One `/api/experience/courses/:id` gates materials. More pages are explicit sequential `/materials?offset=` requests (`:238`). Initial preparation refresh every 10 s, at most 18 loads (`:194`). | Module-level `openedMaterials` / offsets (`:39`) can seed a material detail during this process; they do not restore a course list and are not an owner-keyed durable screen cache. Empty 109.12 ms / content 109.53 ms. |
| Course workspace / web | `apps/web/app/(app)/generate/[courseId]/layout.tsx:1` -> `apps/web/src/features/generate.tsx:254` | `CourseWorkspace` loads `/api/experience/courses/:id` (`:262`), then context shows materials. Deep-linked material beyond first page scans `/materials?offset=` **after** workspace (`:451-478`); this is a frontend waterfall. Material preparing view can refresh whole workspace every 5 s, max 60 (`:442`). | Parent context preserves data while mounted; no reload persistence. Empty 107.82 ms / content 108.39 ms. |
| Tasks / mobile | `apps/mobile/app/(app)/(tabs)/work/index.tsx:1` -> `apps/mobile/src/features/redesign/TasksScreen.tsx:44` | Skeleton `:56`, one `/api/experience/activities?utcOffsetMinutes=`; a course grouping is client filtering of that list. Activity detail uses `/activities/:id` (`:214`), with an offline detail adapter. | SQLite activity summaries/details exist; `useExperience` reads them only in the connection-error catch (`useExperience.ts:77`). Probe supplied cache adapter: zero reads while pending at 109.09 ms; content 110.02 ms after release. `personal-tasks.tsx:1` is a separate older manual Work screen, not the main Tasks tab. |
| Tasks / web | `apps/web/app/(app)/tasks/page.tsx:1` -> `apps/web/src/features/tasks.tsx:20` | Loader until `/api/experience/activities` (`:22`); 60 s poll. Detail (`:264`) starts activity and, for a manual task, `/api/tasks/:id` in parallel. | No saved activities query snapshot. Empty 106.06 ms / content 106.38 ms. |
| Library / mobile | `apps/mobile/app/(app)/(tabs)/library/index.tsx:1` -> `apps/mobile/src/features/redesign/LibraryScreen.tsx:174` | SQLite open/migrate -> summaries and stats in parallel -> render saved cards, **then** pending draft sync and remote catch-up (`useLocalLibrary.ts:68-94`). Skeleton only until local read, or when no saved work and refreshing (`LibraryScreen.tsx:212`). | Existing owner-keyed local-first path. FRESH 9-test suite includes “renders device-saved work before the cloud answers” at `useLocalLibrary.test.ts:109`. First-ever body download remains network-bound. |
| Library / web | `apps/web/app/(app)/library/page.tsx:1` -> `apps/web/src/features/library.tsx:79` | Shell/loader, then serial `/api/experience/library?limit=100&offset=` pages (`:100`), then one publication to state (`:108`). Isolated unchanged hook measurement: first page remained hidden at 109.08 ms while second page was held; content appeared at 109.44 ms after release. | No browser Library body/list cache. Same hook mounted can retain earlier items during a refresh; fresh navigation/reload starts empty. |
| Reviewer / mobile | `apps/mobile/app/(app)/artifact.tsx:1` -> `apps/mobile/src/features/redesign/LibraryScreen.tsx:359` -> `apps/mobile/src/features/reviewer/ReviewerReader.tsx:86` | SQLite exact detail first (`useLocalLibrary.ts:156`), then `/api/experience/library/:artifactId`; skeleton `LibraryScreen.tsx:401` only if no body. Figures/visuals/snapshots arrive separately after prose; source images wait for near visibility (`ReviewerReader.tsx:393`). | Saved body renders without cloud (existing test `useLocalLibrary.test.ts:180`). The current hook can replace data on remote success (`useLocalLibrary.ts:172`); SP1 must hold reader revision stable and offer explicit refresh instead. |
| Reviewer / web | `apps/web/app/(app)/library/[id]/page.tsx:1` -> `apps/web/src/features/library.tsx:485` | `/api/experience/library/:id` through `useResource` gates prose (`:488`). Reader then requests figures and visuals (`reviewer/reviewer-reader.tsx:67`); per-section source figure/snapshot requests are lazy (`section-visual.tsx:64`). They do not gate prose. | Study Assist has an owner-keyed localStorage cache, but no cached reviewer body. Generic reviewer hook empty 108.50 ms / content 109.16 ms. |
| Queue / mobile | `apps/mobile/app/(app)/generation-queue.tsx:1` -> `apps/mobile/src/features/redesign/GenerationScreen.tsx:282` | `/api/jobs?scope=all&limit=50` every 5 s, skeleton `:333`; local **unaccepted** generation intents load independently at `:290`. Generation detail uses `/api/experience/generations/:id` every 3 s (`:97`); local recovery resolves missing id first. Legacy `/processing` uses `features/processing/ProcessingScreen.tsx`. | Intents/recovery references survive locally; they are not an authoritative saved jobs list. Queue hook empty 106.91 ms / content 107.23 ms. |
| Queue / web | `apps/web/app/(app)/queue/page.tsx:1` -> `apps/web/src/features/queue.tsx:43` | `/api/jobs?scope=all&limit=50` every 5 s; older history on demand (`:147`). `/generation/:id` first waits for `/api/jobs/:id`, then starts `/api/experience/generations/:id` (`:295-300`), both poll every 3 s: **waterfall** for generation view. | Browser generation idempotency keys are not job content. Queue empty 107.23 ms / content 107.54 ms. Header independently polls `/api/jobs` at 5 s active / 30 s idle (`components/queue-button.tsx:11`). |

### Existing caches and freshness boundaries

- Mobile SQLite is `stay-focused-library.db`, lazily opened with WAL at
  `apps/mobile/src/services/localLibrary/localArtifactDatabase.ts:11`.
  `schema.ts:12` keys artifacts by `(owner_user_id, artifact_id)`; `schema.ts:66`
  adds activity snapshots. It also stores assists, quiz practice/answer keys and
  draft edits. Artifact read/version policy is in `artifactStore.ts`; sign-out
  purge is `localArtifactDatabase.ts:35`. O1/O2c/O3 facilities are reusable, not a
  general saved Today/courses/jobs store.
- Mobile `useExperience.ts:51` resets state on path/client change; its client
  depends on access token. Refresh generally retains mounted data, while a token
  identity change can blank it. Only callers passing an offline adapter can fall
  back to storage, and only on connection error. Today does not pass the activity
  cache adapter even though Tasks does.
- Expo Web `localArtifactDatabase.web.ts:8` returns null. It is not IndexedDB and
  is not the separate `apps/web` website. SP1 needs a website query snapshot store.
- Website `useResource` is per-hook state, no request deduplication or persistent
  cache; refresh failure sets data to null (`apps/web/src/lib/hooks.ts:44`).
  `useSavedLibrary` instead retains same-owner mounted cards on failure
  (`apps/web/src/features/library.tsx:116`). Preferences in `src/lib/list-preferences.ts`
  and idempotency identity in `src/lib/generation.ts:5` do not contain screen data.
  Owner-scoped Study Assist cache is `src/features/reviewer/assist-store.ts:57`.
- H3 owner-read headers are intact: `apps/api/src/lib/experience/http.ts:13`
  and `apps/api/app/api/jobs/route.ts:704` send `Cache-Control: private, no-store`.
  Website fetches also use `cache: 'no-store'` (`apps/web/src/lib/api.ts:57`).
  These protect authenticated HTTP responses; SP1 should add explicit owner-scoped
  application persistence rather than relaxing shared/CDN caching or storing
  signed private image URLs indefinitely.

## API and database cost

`packages/db/src/index.ts:1` exports the typed client/types; migrations are under
`packages/db/migrations`. Runtime reads for these screens are implemented in
`apps/api/src/lib/experience/repository.ts:35`. Every `rows(table, owner)` uses
`select('*').eq('user_id', owner).order('id').range(offset, offset+199)`, walks up
to 50 pages, and fails at the bound instead of silently truncating. If there are
`n < 10,000` rows, a complete table read costs `floor(n/200)+1` requests (including
an empty terminator when n is exactly divisible by 200). Keep completeness and
owner isolation when tightening reads.

Every `experienceRoute` and jobs GET first calls `verifyBearerToken`: remote
`auth.getUser(token)` -> awaited `record_canvas_api_activity_v1` RPC
(`apps/api/src/lib/auth.ts:24-31`). Add these **two serial service requests** to the
data counts below. The RPC conditionally writes once an hour, but the round trip
occurs on each successful verification. No JWT verification change is proposed.

| Route / owning read | Queries and order (minimum one page per table unless stated) | Payload/cost implication |
|---|---|---|
| `/api/today` -> `ExperienceService.getTodayOverview`, `service.ts:135` | `task-state.ts:8`: assignments, tasks, courses, submissions, sync preferences in parallel; study sessions/plans concurrently with that context: **7** data calls | Full owner histories read, including assignment HTML/task notes; compose/filter date in memory. Browser/mobile receive a Today DTO, not raw tables. Duplicate activity context when activities endpoint also called. |
| `/experience/capabilities` -> catch-all `route.ts:23` | **0** data queries after auth | Small static capability DTO still incurs auth/activity and heavy route imports. |
| `/experience/announcements?limit=20` -> `service.ts:140` | Announcements + courses: **2** complete table reads; course/limit filtering after HTML normalization | **Full normalized `body`, attachments and links are returned in a list**, although Today needs preview. Limit caps returned items, not DB rows/body conversion. Split preview summary from exact announcement detail without breaking the announcement reader. |
| `/experience/activities` -> `service.ts:86` | 5-table activity context -> activity drafts + another courses read: **7** | Draft payloads are fetched/mapped just to set `hasGeneratedDraft`. Returns activity summaries, not full drafts. No SQL course/status filter; no list pagination. |
| `/experience/activities/:id` -> `service.ts:91` | Entire activity context -> for Canvas assignments, files + file references -> course material inventory if linked -> draft/courses reads | Exact activity costs scale with all owner rows and the materials path. Response intentionally includes instructions, resources, attachments and `courseMaterials`; use detail/summary boundaries carefully. Manual detail `/api/tasks/:id` additionally reads an owner-scoped task through task services. |
| `/experience/courses` -> `canvas-course-selection.ts:112` | Connection -> Canvas inventory -> upsert courses (or stored read) -> preferences -> optional missing course read -> sync states -> all scoped runs | Full `syllabus_body` read from DB/upsert although course screen returns summary. Run history is sorted, newest per course chosen in memory (`:615`), with no SQL per-course limit. No per-course N+1 here, but substantial serial work. |
| `/experience/courses/:id` and `/materials?offset=` -> `service.ts:54-78` | Workspace first reads all courses; materials validates with all courses again -> five full owner tables (artifacts, artifact versions, source versions, reviewer snapshots, snapshot items) in parallel with source inventory | Badges need material-to-reviewer identity, but version payloads and source text are fetched. Source inventory separately validates connection/course/preference -> sync status -> 7 course tables (`canvas-reviewer-sources.ts:1472`) -> preparation N+1 described above. Page limit 100 does not bound the pre-page work. Response is material summaries/preparation/badges; **not full material/reviewer bodies**. |
| `/experience/library?limit=&offset=` -> `service.ts:235` | Artifacts + versions + sources + snapshots + courses + snapshot items + auto candidates + jobs (**8**); then drafts + courses (**2**); then quizzes + attempts + courses + sources (**4**) | All bodies fetched before type/course/offset filtering; `estimateReviewerMinutes` scans every reviewer payload (`:229`). Quiz questions and attempt rows fetched to compute summaries, but questions are omitted from outgoing cards (`:187`). Returns summaries, no reviewer/draft bodies. Superseded-card filtering also scans prior records in memory. |
| `/experience/library/:id` -> `service.ts:247` | Reviewer: same **8** artifact tables, find one, then source freshness reads. Quiz: **4** tables, find one; draft: **2**, find one | Exact reviewer loads all versions/payloads. Freshness then reads artifact -> version -> source -> snapshot/items -> current rows and sync authority (`reviewer-source-status.ts:127`, `:617`). Source/connection ownership and safe not-found must survive optimization. |
| `/api/jobs?scope=all&limit=50[&cursor=]` -> `processing-jobs/repository.ts:169` | Owner-filtered, ordered `(created_at desc,id desc)`, limit 51 -> batch origin lookup for returned rows (`:23`) | Bounded server pagination; no per-job origin N+1. `select('*')` reads private job metadata internally but `toProcessingJobStatusView` projects safe status, not generated bodies. Active header uses status filter, limit 20 (`:142`). |
| `/api/jobs/:id`, `/result`, `/cancel`, `/retry` | Exact owner job lookup (`processing-jobs/repository.ts:124`); result path adds exact job result; mutations retain idempotent admission/cancellation | Status reads do not need body scans. UI Open actions can add `/experience/generations/:id`. POST/cancel/retry are interactive actions, not necessary for first content. |
| `/experience/generations/:id` -> `service.ts:254` | All processing jobs -> find one; if succeeded, whole reviewer/quiz/draft record path | Polling a running generation repeatedly reads job history; a successful reviewer adds 8-table assembly. Website detail makes this call only after `/jobs/:id`; mobile can call directly after recovery. |
| `/reviewers/:id/figures`, `/visuals`, `/sections/:sectionId/{figures,snapshot,external-visual}` | Exact artifact/version/source ownership checks in reviewer visual services, then per-section source/cache reads | Secondary reader enhancements, after prose. Source requests use lazy visibility. Older reviewer visual batches can auto-start with POST after GET, then poll up to 60 times at about 4 s (`apps/web/src/features/reviewer/section-visual.tsx:18`; mobile `apps/mobile/src/services/externalVisuals.ts:56`). Manual Find another is separate. Do not preload all source images or put private source images in general screen snapshots. |

### Index cross-check

The conspicuous cost is **over-reading/round trips**, not evidence that every
table lacks indexes. Existing migration definitions support these predicates:

| Access | Existing definition (file:line under `packages/db/migrations/`) | Assessment |
|---|---|---|
| Owner Canvas courses, pages, modules, assignments | `202607050004_create_canvas_academic_graph.sql:263`, `:268`, `:287`, `:301`, `:310`; course identity `:26`; course/page identity `:150` | Owner/date and course predicates are covered; `user_id + ORDER BY id` is not the same ordering as user/sync-date indexes. Fetching every row/body remains costly even with an index. |
| Files/references, preparation identity | `202607060003_add_canvas_file_ingestion_foundation.sql:197`, `:208`, `:210`; `20261014000000_canvas_material_preparation.sql:35`, `:79` | Exact `(user_id,course_id,material_id,revision_fingerprint)` already unique/indexed. Adding another receipt index cannot remove 3N/4n calls. |
| Tasks, plans, sessions, submissions | `20260827155438_task_study_plan_foundation.sql:57`, `:83`, `:106`; `202607080003_add_canvas_grades_submissions_foundation.sql:385` | Owner/status/due and date access exist. Move screen-specific predicates/order to DB before deciding extra indexes. |
| Canonical artifacts and versions | `20260723084329_reusable_processing_assets.sql:441`, `:447`, `:451`; `20260923000000_canonical_reviewer_artifacts.sql:21` | Source owner prefix and reuse indexes exist; artifact owner-created index is partial `deleted_at is null`, while current generic read omits that condition. Filter active artifacts in DB and follow exact latest ids. |
| Jobs + origin | `20260723084329_reusable_processing_assets.sql:464`; `20261013000000_canvas_poll_automation.sql:24` | Job history `(user_id,created_at desc,id desc)` matches cursor query; candidate `(user_id,processing_job_id)` supports batch labels. No missing index found for these hot list predicates. |
| Scoped sync history | `20260706113150_add_canvas_course_sync_preferences.sql:91`; `202607050005_add_canvas_academic_sync.sql:52` | Scoped-course/time and owner/time indexes exist. Query still returns the entire history before choosing latest per course. |
| Quiz/draft summaries | `20260912110000_quiz_maker.sql:42`, `:45`; `20260912100000_activity_maker.sql:33`, `:34` | Owner/update and owner/quiz/start history exist; list projection avoids bodies and limits attempts rather than adding redundant indexes. |

Potential missing **ordering** index: no matching `(user_id,id)` composite was
found for the generic `source_versions`/`generated_artifact_versions` page walk.
Existing owner-leading indexes can locate an owner's rows but need a different
sort. This is a candidate for EXPLAIN after query narrowing, not proof of an
expensive scan or an unconditional SP2 migration. Actual row counts, installed
indexes, query plans, planner choices and execution ms are **UNVERIFIED (owner to
confirm)**. No migration is needed for SP0; any future addition is forward-only.

### Local service measurements

FRESH command:
`node_modules/.bin/tsx.cmd --tsconfig apps/api/tsconfig.json tmp/overnight/SP0.measure.ts`.
Real `ExperienceService` ran against a synthetic typed repository (network throws),
one course, 240 synthetic reviewer/version/source triplets, about 78 kB per reviewer
payload, no assignments/quizzes/drafts. Materials dependency returned an empty
summary inventory; freshness returned unknown. Thus workspace numbers **exclude**
the actual materials N+1 and reviewer numbers **exclude** freshness cost. Page-call
counts and DB JSON byte accounting emulate the real 200-row repository walk;
they are not network captures. One sample per case, no percentile claim.

| Service | 0 ms injected delay: elapsed ms | 20 ms per emulated page: elapsed ms | Page calls | DB JSON bytes | Response JSON bytes |
|---|---:|---:|---:|---:|---:|
| Today | 2.61 | 32.75 | 7 | 233 | 319 |
| Activities | 0.36 | 53.54 | 7 | 452 | 2 |
| Announcements | 0.20 | 30.54 | 2 | 223 | 30 |
| Workspace | 33.37 | 139.13 | 10 | 18,879,782 | 839 |
| Library (100 summaries) | 120.25 | 249.20 | 18 | 18,900,915 | 38,123 |
| One reviewer | 101.85 | 164.11 | 11 | 18,879,565 | 78,742 |

The 0-delay JSON accounting adds CPU overhead; these numbers demonstrate read
amplification, not database server speed. Production payloads, gzip, counts and
RTTs must be measured separately without copying private academic content into logs.

## Canvas sync and preparation

### Durable manual/account refresh

1. Mobile `canvasAccountSync.ts:188` loads inventory then starts content and grade
   jobs for selected/selectable courses (`:184`, `:203`) with a single `Promise.all`
   over all course/job pairs: 2 x selected courses can be admitted at once, with
   no client admission concurrency limiter. Provider-unit limits are separate.
   API admission is under `apps/api/app/api/canvas/courses/[courseId]/sync/route.ts`
   and `.../grades/sync/route.ts`. Accepted durable job state returns **HTTP 202**;
   clients poll `canvas/sync-jobs/:id`. Do not equate local request intent with
   background-safe acceptance.
2. `apps/api/src/lib/canvas-sync-jobs/google-dispatch.ts:27` schedules the configured
   Google queue; `apps/api/scripts/google-cloud-worker.ts:15` handles `/tasks/canvas-sync`.
   Worker claims job, obtains a brokered owner token, initializes units and claims
   batches (`google-worker.ts:32`, `:88`, `:103`). Batch completion precedes next
   claim; at most 3 units requested at a time. Existing DB claims apply connection
   and grade concurrency limits (constants in `checkpoints.ts:29`).
3. **Canvas request budget per course:** content seeds 6 collections (modules,
   pages, assignment groups, assignments, announcements, files) at
   `checkpoints.ts:110`; grade job seeds 3 (grade assignments, own submissions,
   own grade summary) at `:102`. Each actual collection consumes all its pages.
   Module items add one paged collection per module; module-referenced pages,
   assignments and files add detail units (`unit-executor.ts:280-357`). Page
   listing adds one per-page DB reuse check; changed/missing-evidence pages get a
   Canvas detail call, unchanged pages read stored detail (`:360`, `:386`, `:678`).
   A module page detail is a distinct unit from a top-level page detail, so count
   actual deliveries rather than assuming perfect cross-path deduplication.
4. A lower-bound formula without retries is
   `sum(content collection page counts) + sum(module item page counts) + module
   detail calls + unreused page details + linked-file metadata calls`, plus
   `sum(3 grade collection page counts)` when grades run. Every nonempty initial
   collection costs at least one call, including empty-result checks. Assignment
   linked-file metadata is deduplicated **per assignment page**, fetched in batches
   of 3, bounded at 40 (`unit-executor.ts:480`). File bytes/OCR are later preparation,
   not the content list calls.
5. `packages/canvas/src/client.ts:41` defaults to 50 items/page, 10 pages, 15 s
   request timeout; inventory explicitly requests term/concluded/sections (`:193`).
   Durable units follow saved validated continuation cursors and enforce safety
   bounds; the metadata poll sets maxPages=50. Preserve complete pagination and
   explicit failure at bounds. Retryable units persist `availableAt` from backoff/
   Retry-After (`unit-executor.ts:536`); retries can add calls and long waits.
6. **DB write cost:** per-unit begin-attempt RPC, context reads, discovery validation,
   completion RPC storing successful payload and discovered work
   (`unit-executor.ts:65-119`; `checkpoints.ts:236-261`), plus claim/heartbeat/job-state
   work. Finalization reads complete staging then invokes existing snapshot
   persistence through a staged provider (`finalize.ts:116`, `:128`, `:183`).
   Content snapshot, announcements, files and grades are separate bounded
   persistence operations; content uses
   `replace_canvas_course_academic_snapshot_with_sync_state`
   (`canvas-sync.ts:2716`). Unchanged fingerprints can avoid replacement (`:1168`).
   Partial/failed evidence must retain prior data and never imply deletion.
7. **Preparation admission:** job completion is persisted **before** enqueue
   (`finalize.ts:249-258`). After a succeeded content job, complete source inventory
   is loaded -> discoveries upserted -> eligible pages/files admitted **serially** ->
   sync receipt registered -> admitted discoveries removed -> inventory complete
   recorded -> first dispatch batch (`canvas-preparation/orchestration.ts:26-51`).
   This inventory still defaults to preparation lookups for every candidate.
   Admission itself can look up current evidence twice, check controls, validate
   a prepared result, resolve Page attachments, and call the serialized admission
   RPC (`admission.ts:62-109`). This can occupy the sync worker after the UI sees
   sync succeeded; it is not proof all materials are prepared.
8. **200/25 guard:** `20261014000100_canvas_preparation_orchestration.sql:132-142`
   assigns at most 200 receipts per durable sync/poll cycle in batches of at most
   25, with progress/repeat guards. Those are dispatch/assignment limits, **not a
   cap on all inventory/admission DB reads**. `advancePreparationSync` dispatches
   returned jobs serially (`orchestration.ts:11`), each with prepare-dispatch RPC ->
   awaited Cloud Tasks acceptance -> dispatch receipt (`dispatch.ts:25`). Later
   completion/poll reconciliation advances/drains deferred cycles. Automatic
   reviewers run after sync and prepared completion; admission caps remain 3/run,
   5/day (`auto-reviewers/admission.ts:15`). No bypass proposed.

### Routine metadata poll and past courses

`apps/api/src/lib/notifications/canvas-poll.ts:42` reads connection then **serially**
fetches assignments -> submissions -> announcements -> modules and each module's
items (`:63-88`). Pages in every collection are completed. The shortest successful
course poll costs 4 collection requests plus module-items pages, retained-history
lookup, and one metadata-apply RPC (`:94`); retry/defer honors Retry-After.
Module results also reconcile preparation and may request a full content sync.
Poll claims at most 20 courses within the remaining deadline (`:117`), then
reserves work for preparation backfill.

There are already distinct filters, so “all past courses always sync” would be
incorrect. Main account sync filters **selected and selectable**, not current
classification (`apps/mobile/src/services/canvasAccountSync.ts:42`). Completed
courses can be selectable in inventory. Poll SQL excludes explicit
`workflow_state = 'completed'`
(`packages/db/migrations/20261003025905_canvas_notification_sync.sql:233`, `:250`),
but does not check stored course end dates or term ends. Ended courses still
marked available can therefore continue polling/preparing if selected. CQ1 must
make current/past semantics consistent across both paths without deleting saved
reviewers.

### Does sync block screens or interactive work?

- Mobile `CanvasSyncProvider` always renders children; it tracks accepted jobs
  and bumps `dataVersion` after terminal reconciliation (`:137`). Its 4 s job
  polling is separate from screen reads. Web `useCanvasRefresh` is similarly a
  status/refresh hook. Existing data is not inherently gated on sync completion.
  **Courses still blocks on live Canvas inventory**, and a first-ever course may
  have no usable stored materials. Those are different waits.
- Preparation/source image rendering/generation/sync dispatch use the same
  `googleTaskConfig()` parent and worker URL. They have independent durable
  tables/leases but no queue capacity reservation by interactive intent in that
  config. Preparation itself uses the same DB/Storage/Canvas token broker and
  underlying OCR/file extraction resources. Live provider quota usage is unknown.
- Interactive HTTP reads execute on the API, not behind the Cloud Tasks queue.
  They still share Supabase capacity with workers and can trigger expensive
  material status reads or explicit preparation/generation admission. Clients use
  Supabase HTTP calls rather than an app-held Postgres connection pool; shared
  backend load is a contention **risk**, not a measured connection-exhaustion
  diagnosis. Interactive generation is directly subject to the shared task queue.
- CIT17 full sync duration, split Canvas/DB/enqueue duration, page counts and
  backlog wait: **UNVERIFIED (owner to confirm)**. No deployed logs or rows were
  accessed. Owner measurement should time acceptance -> terminal job, separate
  post-terminal preparation admission, and record counts/durations only.

## Hosting and bundles

API repo config is `iad1` (`apps/api/vercel.json:5`). No `preferredRegion` export
was found under `apps/api/app/api` or `apps/web/app`; inspected API routes use
`runtime = 'nodejs'`, with no Edge route found. No website `vercel.json` region
override exists in tracked source. Website same-origin rewrites forward to the
configured API (`apps/web/next.config.ts:58`); static website location alone does
not locate the API functions.

Supabase project reference is `xfdbwfqtorelmurncyql` in repo documentation;
historical foundation report says `ap-northeast-1`, with Google resources in
`asia-northeast1` (`docs/ai/acceptance/b37/google-cloud-generation-foundation.md:15`).
This is documentary evidence, not fresh confirmation of the live project region.
Current deployed revisions, regions, plans, minimum instances, actual connection
limits, cold-start ms and request RTT are **UNVERIFIED (owner to confirm)**.
Cold module risk is described in finding 10; request duration exports are limits,
not measurements. No rollout tooling was invoked.

### FRESH website build

`npm run build -w @stay-focused/web` **PASS**, exit 0, Next.js 15.5.27; compilation
reported 3.6 s, 19/19 static pages generated, 28 route entries. No failed attempt.
Generated `apps/web/next-env.d.ts` was restored to its baseline content afterwards.
These are the build's reported sizes, not production network/browser timings:

| Route | Route size | First Load JS |
|---|---:|---:|
| `/` | 129 B | 103 kB |
| `/_not-found` | 129 B | 103 kB |
| `/announcements` | 173 B | 176 kB |
| `/announcements/[id]` | 174 B | 176 kB |
| `/auth/callback` | 2.92 kB | 166 kB |
| `/canvas` | 5.79 kB | 177 kB |
| `/canvas/[courseId]/grades` | 174 B | 178 kB |
| `/canvas/[courseId]/grades/[assignmentId]` | 173 B | 178 kB |
| `/generate` | 178 B | 182 kB |
| `/generate/[courseId]` | 176 B | 182 kB |
| `/generate/[courseId]/[id]` | 178 B | 182 kB |
| `/generate/new` | 18.3 kB | 189 kB |
| `/generation/[id]` | 177 B | 181 kB |
| `/icon.svg` | 0 B | 0 B |
| `/library` | 177 B | 198 kB |
| `/library/[id]` | 176 B | 198 kB |
| `/library/course/[courseKey]` | 177 B | 198 kB |
| `/queue` | 177 B | 181 kB |
| `/quiz/[id]` | 5.95 kB | 177 kB |
| `/release` | 166 B | 106 kB |
| `/schedule` | 3.72 kB | 179 kB |
| `/schedule/session/[id]` | 2.69 kB | 177 kB |
| `/settings` | 2.78 kB | 174 kB |
| `/sign-in` | 2.88 kB | 174 kB |
| `/sign-up` | 2.88 kB | 174 kB |
| `/tasks` | 175 B | 181 kB |
| `/tasks/[id]` | 177 B | 181 kB |
| `/today` | 136 kB | 315 kB |

Shared First Load JS: 103 kB (46.5 kB + 54.2 kB + 2.05 kB other chunks).
Today is the largest; Library includes reader/export-related modules. Queue's
Knowledge Core is already a dynamic import with SSR disabled
(`apps/web/src/features/queue.tsx:28`); do not claim that deferred Three.js chunk
is part of every route's First Load JS.

### Mobile startup static analysis

`apps/mobile/app/_layout.tsx:1` imports navigation, auth, theme and AppLifecycle;
authenticated layout adds CanvasSyncProvider/AppActivityProvider. AppLifecycle
starts offline catch-up/outbox reconciliation alongside initial screens. The
Today route statically imports DayRingClock -> DayOrb -> `three`, `expo-gl`, orb
geometry/shaders. Largest clearly identified optional visual dependency is
Three.js: installed `node_modules/three/build/three.module.js` **1,292,907 bytes**
(CommonJS build 1,303,714 bytes), raw/uncompressed source entry, **not** tree-shaken
or Hermes/Metro size. Navigation, React Native/Reanimated/SVG and Supabase are
also startup dependencies; no misleading additive size estimate is made.

Library/reader import ExportSheet -> studyExport -> pdfExport/docxExport/pptxExport
(`apps/mobile/src/features/reviewer/ReviewerReader.tsx:58`,
`apps/mobile/src/features/export/studyExport.ts:3`). Installed pdf-lib minified
distribution is 525,099 bytes and fflate CommonJS entry 91,005 bytes; they are size
signals for those routes, not proof all execute on the first Today frame.
SQLite is already dynamically loaded (`localArtifactDatabase.ts:17`). No EAS,
OTA or new mobile export was run. Current shipped mobile JS/bytecode size and
startup parse/render time are **UNVERIFIED (owner to confirm)**; do not reuse an
old F0S export size as a fresh SP0 measurement.

## Inputs for SP1

| Screen | Saved data today | Missing for immediate saved content |
|---|---|---|
| Today | Mobile preference/clock state; activity snapshots elsewhere, but not wired into Today. Website preference state only. | Owner/date/timezone-keyed Today overview + announcements/activity summaries; hydrate before requests. Do not treat a day clock preference as a saved agenda. |
| Courses | Server course rows and sync preferences; process-local display state. | Mobile persistent inventory snapshot and website IndexedDB snapshot. Stored term classification needs CQ1 evidence below. |
| Course workspace | Server source inventory, prepared receipts, local opened-material/offset maps. | Owner/course/page-keyed summary snapshots, durable first page and merged later pages; no full material source text/private signed URLs. Scope/clear existing maps when designing persistent cache. |
| Tasks | Mobile SQLite summaries/details with connection-error-only adapter. Website no content store. | Move mobile cache read ahead of network; persist website summaries/details; distinguish successful empty results from unavailable cache and preserve owner/offset identity. |
| Library | Mobile SQLite summaries/bodies, version checks, catch-up, owner purge. Website all-pages in-memory loader only. | Reuse mobile path; website owner cache and progressive pages. Keep list absence from becoming deletion; explicit owner-authorized not-found can evict exact items. |
| Reviewer | Mobile exact saved body, assists and other offline study state. Website Assist localStorage only. | Website exact-version body cache; on both platforms retain the open revision and show “Updated — tap to refresh” instead of swapping prose. Keep source visuals separate and permission-aware. |
| Queue/processing | Mobile generation intent/outbox and accepted-job recovery references; website idempotency identity. | Saved status summaries if desired, always reconciled against authoritative server jobs. A saved intent is not HTTP 202 acceptance. QD1 controls dropdown placement; no result for cancelled jobs. |

SP1 must test saved content before unresolved network, failed refresh retention,
account switch isolation and sign-out clearing. Keep first-ever skeletons and
nonblocking refresh status with last-updated time. Owner binding must precede
cache display on both platforms; preserve existing offline answer-key/draft rules.

## Inputs for CQ1

Canvas **already provides and the client parses** `concluded`, enrollment state,
term dates and section dates (`packages/canvas/src/types.ts:27`,
`packages/canvas/src/client.ts:1359`). `listCourseInventory` includes term/concluded/
sections (`client.ts:193`). Existing live classifier considers explicit concluded,
workflow completed, completed/concluded enrollment, course/term end date, or all
sections ended (`apps/api/src/lib/canvas-course-selection.ts:753`, `:968`).

**Stored course data is less rich.** The actual upsert stores workflow_state,
course start_at/end_at and enrollment_term_id (`canvas-course-selection.ts:488`);
`packages/db/migrations/202607050004_create_canvas_academic_graph.sql:2` has no
term-name/term-date, enrollment-state, section-date or concluded columns. No later
tracked migration adds that course evidence. A term **id alone cannot prove when
the term ended**. The stored fallback explicitly acknowledges this (`:726`) and
uses completed workflow or past **course** end date; otherwise it is uncertain
without dates. Source rows and saved reviewers must not be discarded for that.

Default Term / no dates: use explicit persisted completion/end evidence if
available, otherwise keep the course current until a user override moves it.
Do not classify by course-name/term-id ordering, old due dates, inactivity or the
word “Default”. CIT17 number of Default Term courses, actual enrollment/term
payloads and date coverage are **UNVERIFIED (owner to confirm)**. CQ1 can persist
the missing bounded classification evidence and per-user override using a new
forward-only migration; current `selected` preference is a sync selection,
not a separate manual current/past override. Preserve Library visibility for past
courses and align Today/Tasks/calendar/poll/notifications/admission filters.

## Verification and owner follow-up

- **FRESH PASS** `npm run build -w @stay-focused/web`: 1/1 build, exit 0,
  19/19 static pages, 28 routes; no build failure or retry.
- **FRESH PASS** `node_modules/.bin/vitest.cmd run --config tmp/overnight/SP0.hooks.config.ts`:
  final **2/2 tests**, 1/1 file: 11 actual resource-hook cases plus the website
  Library all-pages gate. The latter uses an in-memory transform extracting the
  unchanged private hook, without editing product source. Earlier 1-test probes
  passed; one repeat added file capture because console output was suppressed.
  First expanded 2-test run: **1 passed / 1 failed** on Vite parsing JSX from the
  full website module, before the Library assertion ran. Saved as
  `tmp/overnight/evidence/SP0-hook-measure-jsx-failed.log`; repaired only the temp
  harness to extract the hook without its unrelated JSX imports. Final rerun
  passed 2/2. No product behavior was changed to make it pass.
- **FRESH PASS** `npm run test -w @stay-focused/mobile -- src/features/redesign/useLocalLibrary.test.ts`:
  9/9 tests, 1/1 file; local-first behavior, refresh failure, owner isolation,
  missing/deleted detail and draft behavior. Test duration 195 ms; entire suite
  764 ms, not physical-device latency. TEMP/TMP pointed into `.local/test-temp`.
- **FRESH PASS** synthetic service probe: 12/12 observations (six services,
  two injected delays), exit 0, with throwing network fallback. No live fixture.
- Vitest printed a Vite future-native-config warning (ESM syntax loaded as
  CommonJS); final tests exited 0. No flake was observed; the harness failure and
  repair above remain recorded. Two attempted Python helper commands could not
  start because Python is unavailable; Node performed the document reconciliation
  and reference checks instead. A later inline Node reference-check helper failed
  on PowerShell argument quoting; the file-based helper passed. Neither helper
  failure was a product test or a failure of `git diff --check`.
- Required docs gate: `git diff --check`, with staged diff hygiene and a docs-only
  path check recorded in the SP0 handoff. Root typecheck/lint/full tests/mobile
  build are **NOT APPLICABLE** to this docs-only change; F0S counts are historical,
  not fresh SP0 gates.
- Local evidence/scripts remain uncommitted under `tmp/overnight/`; the audit
  includes the material measurements so later work does not require those files.

**Owner steps remaining:** confirm live API/DB/worker regions and queue limits;
collect sanitized per-screen cold/warm first-content and CIT17 sync/DB/enqueue
timings; confirm Default Term counts/evidence; decide region/capacity trade-offs.
Rollout and Device checks are intentionally skipped under the unattended rules;
retain owner-present deployment/migration/OTA and realme/website checks for the
later RB3 scope. SP0 itself changes no product behavior and requires no rollout.
