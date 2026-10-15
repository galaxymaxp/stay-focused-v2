# SP2 preparation and Library data path

Date: 2026-10-15. Status: **PASS for the unattended local code scope**.
Branch: `overnight/2026-10-15_feedback`. Baseline: `482cb6e`.

Finite scope: SP2 STEP 0-5, local gates, documentation and local commits only.
SP2b findings 4/7/8/10/13, rollout, devices, remote SQL/services, environment
files, Scheduler, queue capacity/regions and push are excluded. The complete
SP2 prompt (including its overriding UNATTENDED rules), SP0 audit, external
roadmap SP2 section, root policy, AUTOPILOT and current planning checkpoints
were read. Supabase/Postgres skills informed local SQL; the prompt's absolute
no-service rule overrides their remote documentation/query workflows.

## Baseline and source reconciliation

FRESH: expected branch, SP0 first status line PASS, tracked tree clean: **3/3**.
QD1 is PASS. GA1 is STOPPED on independent prerequisites, not an SP2 dependency;
no GA1 implementation exists to overwrite. SP1/CQ1/QD1 remain covered by full
workspace regressions. Initial unrelated `UI/`, `apps/mobile/.gitignore` and
`supabase/` remain untouched and excluded from staging. No fetch was performed.
Initial HEAD was 24 commits ahead of the locally recorded `github/main`.

Re-opened locations at baseline `482cb6e` (audit line drift only):

| Finding | Current location at inspection | Result |
|---|---|---|
| 1 | `canvas-reviewer-sources.ts:414-419`; `canvas-preparation/admission.ts:12`; `client-status.ts:22` under `apps/api/src/lib` | N+1 matches audit; candidate and visible passes both resolve evidence. |
| 2 | `experience/repository.ts:31,36`; `experience/service.ts:55,198,236,248` | Whole-owner body/version/source reads match audit. |
| 5 | `apps/web/src/features/library.tsx:77` | SP1 changed persistence but still waits for every page. |
| 6 | `experience/service.ts:78,199,239` | Duplicate course ownership read and serial independent groups remain. |
| 9 | `apps/mobile/src/app-shell/AppLifecycle.tsx:40`; `useLocalLibrary.ts:99`; `librarySync.ts:90`; `artifactStore.ts:324` | **Skip additional hydration implementation:** existing owner/version/schema checks already skip unchanged bodies; both callers share catch-up. Add explicit regression proof and improve its server detail dependency through finding 2. |

No code contradiction changing the prescribed fix was found. Historical audit
findings outside this finite SP2 scope were not started.

## Implementation and acceptance matrix

| Requirement | Owning layer / proof | Result |
|---|---|---|
| Owner-bound summary-only lists, DB filters/paging, current versions only | New invoker views + repository; SQL/service equivalence and 240-row page walk | PASS |
| Exact detail, safe foreign not-found, retained superseded detail | Summary/version exact lookup; SQL ownership/service tests | PASS |
| E2, origin, supersession, quiz summaries, past-course Library | Stored generated estimate + SQL parity with shared estimator/previous service | PASS |
| Visible material badges without full bodies | Owner/course/visible-ID mapping view, including multi-item snapshot mapping | PASS |
| Bounded preparation reads reused across both passes | Unmocked source-list + projection tests; stable chunking, safety-bound rejection, stale/foreign/missing evidence | PASS |
| Parallel independent Library reads; one course validation | Parallel visible/hidden queries; parallel fallback groups; exact owned course passed into assembly | PASS |
| Website page one before unresolved later pages; failure retention | Hook tests, duplicate IDs, nonadvancing cursor, SP1 snapshot/account switch | PASS |
| Skip unchanged mobile bodies; preserve explicit not-found deletion/bounds | Existing store/catch-up plus strengthened regression; focused 38 tests | PASS |
| Required fresh serial gates | See final gate record below | PASS |

Implementation commits:

- `f0c7173 perf(api): project Library summaries and read exact reviewer versions`
- `eeae99b perf(api): batch revision-fenced material preparation projections`
- `6fb2d79 perf(web): publish Library pages during background refresh`
- `2092b34 fix(api): order preparation controls by their material primary key`
- `426edf3 test(api): exercise filtered exact reads through the SQL adapter`
- `14a45ae test(api): verify summary bytes and isolate preparation fixtures`
- `97a6934 fix(web): retain saved Library cards during partial refreshes`

[ADR-031](../../architecture/ADR-031-library-summary-projections.md) defines
the new projection contract. New migration file:
`20261015040000_experience_library_projections.sql`, **not applied**. The stored
generated estimate backfills once without updating immutable payloads. It
requires a version-table rewrite at owner rollout. Existing RLS, explicit
grants, owner joins, server JWT verification and server-only service role remain.
Tightening the previously open-ended Views type also exposed a missing type for
the existing `section_external_visual_requests` table; its existing schema is
now typed, without changing that table or its behavior.

Preparation reuses the already complete owner/connection-bound source inventory;
one pure current-evidence calculation mirrors admission's read-only rules.
Receipt queries constrain material IDs and current fingerprints, controls use
their actual material primary key for ordering, and all chunk/page reads have
stable order and an explicit 10,000-row fail-closed bound. No Canvas call or
preparation write is added to this read path. The singleton mutation/admission
path retains its independent current-source validation.

## Deterministic before/after measurements

FRESH, local only. The service probe reuses SP0's **unchanged fixture declarations**:
one course, 240 synthetic reviewers (~78 KB each), empty drafts/quizzes/material
inventory, unknown freshness. It calls the real service/repository against a
throwing-network synthetic PostgREST adapter and counts each returned DB page's
JSON bytes. SQL/PGlite tests separately execute the real views and compare the
old and new service outputs, including nonempty quizzes and supersession.
Neither measurement is a production RTT, gzip size or database query plan.

| Finding / measure | Before reads | After reads | Before DB JSON bytes | After DB JSON bytes | HTTP requests before -> after |
|---|---:|---:|---:|---:|---|
| 1: 100 candidate + 100 visible preparation checks, empty receipts/controls | 700 | 2 | 75,400 | 4 | 1 -> 1 |
| 2: Library page, 100 summaries | 18 | 2 | 18,900,915 | 44,277 | 1 -> 1 |
| 2: exact reviewer, freshness excluded in both | 11 | 2 | 18,879,565 | 78,702 | 1 -> 1 |
| 5: complete 240-card website Library walk | 54 | 6 | 56,702,745 | 105,692 | 3 -> 3 total; **3 -> 1 before first cards** |
| 6: workspace with empty material inventory | 10 | 1 | 18,879,782 | 221 | 1 -> 1 |
| 9: unchanged already hydrated reviewer | 0 detail reads | 0 detail reads | 0 | 0 | 0 -> 0; existing skip retained |

The website first-content comparison is an uncached remote visit. SP1 saved
snapshots still render with **zero network responses** before and after SP2.
Findings 2/5/6 overlap: do not add these savings together. Library and reviewer
response JSON remains exactly **38,123** and **78,742** bytes in the unchanged
SP0 fixture. Workspace remains **893** bytes. The workspace probe excludes real
materials inventory/preparation as SP0 did; nonempty visible badges add one
bounded query per 100 unique material IDs. All counts exclude the unchanged two
auth/activity service calls, Storage, Canvas, OCR, model calls and rendering.

Preparation's before probe uses the same simple File evidence 100 times to
isolate the old 3N + 4n control flow. After reuses that evidence and measures two
empty-page responses; preloaded inventory bytes are excluded on both sides.
Committed tests additionally use **100 distinct files**, 201 distinct files in
three complete chunks, current/stale receipts, linked pages and missing/duplicate
attachment evidence. Unchanged hydration is an existing fix, so no new savings
are attributed to it. Catch-up retains 300 attempts / 60 seconds and explicit
not-found deletion; changed-version tests make exactly one detail request.

Local scripts/logs are uncommitted in `tmp/overnight/SP2.*`. TEMP/TMP point into
`.local/test-temp`; no cleanup outside the repository occurred.

## Fresh gates and failures

- `npm run typecheck -- --force`: **FRESH PASS, 8/8, 0 cached**.
- `npm run lint -- --force`: **FRESH PASS, 8/8, 0 cached**, zero errors, five existing mobile warnings and one existing web warning.
- `npm run test --workspace @stay-focused/api`: **FRESH PASS, 2,130 passed / 3 existing skips, 182/182 files**.
- `npm run test --workspace @stay-focused/mobile`: **FRESH PASS, 1,057/1,057, 110/110 files**, zero skips.
- `npm run test --workspace @stay-focused/web`: **FRESH PASS, 118/118, 21/21 files**, zero skips.
- Shared tests: **NOT APPLICABLE**, no shared source changed.
- `npm run build --workspace @stay-focused/api`: **FRESH PASS, 1/1 build, 34/34 static pages**.
- `npm run build --workspace @stay-focused/web`: **FRESH PASS, 1/1 build, 19/19 static pages, 28 routes**; repeated after final web retention fix.
- `npm run build --workspace @stay-focused/mobile -- --platform android`: **FRESH PASS, 1/1 export, 1 Android bundle / 35 assets**.
- `npm run build -- --force`: **FRESH PASS, 8/8 tasks, 0 cached**; final rerun after web retention fix, 1m55.1s. The earlier run also passed 8/8.
- `git diff --check`; `git diff --cached --check`: **FRESH PASS, 0 errors each**.

Failed first/draft attempts are retained in local evidence:

1. The temp preparation baseline harness initially used top-level await with
   tsx's CJS output (2 transform errors). Wrapping main repaired it; final
   baseline is 700 reads / 75,400 bytes. This was not a product failure.
2. First SQL projection suite: **4 passed / 1 timed out** at the 5-second test
   limit (the measurement test continued to 32.456 seconds). Investigation
   exposed repeated payload estimate parsing in the first view design. The
   generated stored estimate removes that read cost; the comprehensive test has
   a 30-second local-SQL budget. Final focused run: **81/81**, including existing
   experience tests. The final full suite passes; the later separate fixture
   timeout and its repair are recorded below.
3. Draft API typecheck exposed **7 errors**: two generic filter typing errors
   and five errors from the previously missing external-visual request table
   type when Views became explicit. Narrowing the query union and adding the
   existing table's real type repaired them; final forced gate passes.
4. First preparation focused run: **55 passed / 1 failed**, because the new test
   adapter omitted `.neq`. Adding that actual query operation repaired it;
   focused projection rerun **5/5**, full API suite PASS.
5. Schema review caught controls ordered by nonexistent `id`; changed to their
   actual `material_id` primary key in `2092b34`, with stable-order tests updated.
   The SQL test adapter was also aligned with `.filter(...,'eq',...)` before the
   full suite. Neither mistake was hidden by weakening validation.
6. After the first full API PASS, added explicit preparation-byte and quiz/draft
   exact-detail assertions. The full repeat reported **2,129 passed / 1 failed /
   3 skipped**, 181 passed files / 1 failed file. The source-formatting fixture's
   first list assertion spent **6.543 seconds** loading its synthetic adapter's
   mutation/dispatch dependency graph and hit its existing 5-second limit. The
   fixture now supplies its synthetic receipts directly, with all assertions
   retained; real batching remains unmocked in the separate projection suite.
   **Final full rerun: 2,130 passed / 3 skipped, 182/182 files**, 60.59 seconds,
   without another retry. This load-sensitive timeout flake is not hidden.

Apart from that recorded timeout, no other nondeterministic flake was observed.
Vitest prints its existing future
native-config warning. No remote/provider/workflow smoke was run; worker/provider
execution was unchanged and those live flows are **NOT APPLICABLE** here.

Final review against ADR-027 added the partial-refresh saved-card regression:
cards beyond accepted page one stay visible if a later page fails, and are
reconciled only after a complete successful walk. Explicit supersession still
applies immediately. Final full web suite **118/118**; forced typecheck/lint
reruns **8/8 each, zero cached**, with the same six existing warnings. All build
reruns are serial. Next-generated `next-env.d.ts` edits are restored to their
clean baseline after builds and excluded from commits.

## Decisions for the owner

- SP0 finding 11: API repo region `iad1`, historical DB `ap-northeast-1` and
  worker `asia-northeast1`. Every serial DB step would cross that boundary if
  deployments match. Current regions/RTT **UNVERIFIED (owner to confirm)**;
  no local milliseconds are substituted. Measure before deciding a region move.
- SP0 finding 12: shared queue/service; historical queue **2 concurrent tasks,
  1/s**, worker **concurrency 1, 0-2 instances**. Two long preparations can occupy
  both task slots. Current limits/backlog/wait/cost/quotas **UNVERIFIED (owner to
  confirm)**. Decide reservation/priority or separated capacity separately.
  Queue settings, guards, regions, concurrency and services are unchanged.

## Owner steps remaining

Rollout and Device checks were **entirely skipped**. Confirm prerequisites and
apply the new migration through the Supabase connector using its filename as
the migration name before deploying the API; deploy API/website and preview OTA
(and any already pending prerequisite migrations/worker rollout from CQ1).
Confirm generated-estimate backfill size/locking and live query plans. On CIT17
and the realme/website compare Library/course material first-content against SP0;
verify saved/offline content, account isolation, explicit not-found, open-reader
revision handling, supersession, quiz progress, past courses and Queue behavior.
Resolve GA1's separate owner questions before claiming batch generation exists.

Production/deployed revisions, database rows/applied migrations, live indices and
plans, Scheduler state, Canvas/CIT17 counts, actual latency, queue capacity and
physical behavior remain **UNVERIFIED (owner to confirm)**. This is not a live
acceptance claim. No service call, remote SQL/application, environment-file edit,
deployment, Scheduler action, push or outside-repository deletion was performed.
