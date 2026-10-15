# GA1b saved course batch generation

Date: 2026-10-16. Baseline `d0eb70e` on `overnight/2026-10-15_feedback`.
Status: **PASS for the finite unattended code scope**, STEP 0-3, fresh serial
gates, documentation and scoped local commits. Rollout/device acceptance is
excluded and remains owner-operated.

Implementation commits: `6f247f0` API/shared/migration, `2782bc3` mobile,
`7a73181` web. The accompanying docs closure commit and all subjects are recorded
in `tmp/overnight/GA1b.status`; no tmp file is committed.

The complete GA1b prompt and external roadmap GA1 section were read. The owner
resolved both GA1 questions: explicit saved intent is in scope; generation
minutes must be omitted. The existing GA1 audit (`2c0a02b`, `482cb6e`) is reused,
not rerun or rewritten. QD1 and SH1 status files are PASS; both audit commits
are HEAD ancestors; tracked files were clean. Unrelated untracked `UI/`,
`apps/mobile/.gitignore` and pre-existing `supabase/.temp` are preserved.
Locally recorded upstream is `github/main`, initially 51 commits behind this
branch. No fetch, remote service call or environment-file edit was made.

## STEP 0 evidence and reuse

The AG1/AG2 issue is coverage, with visibility limited to admitted work:
`apps/api/src/lib/auto-reviewers/admission.ts:53` limits File/Page eligibility;
`:64` requires newer timestamp evidence; `:132` honors Auto off; `:152` baselines
the initial backlog. Lines 15-18, 179, 191 and 236 cap three/run, five/rolling
day, three attempts and run budget. Lines 225-234 skip mapped reviewers and
wait for preparation. `after-sync.ts:13` excludes past courses;
`poll-trigger.ts:13` only discovers new module File/Page IDs after complete prior
evidence. This cannot generate an explicitly requested baseline/off/past course.
The material-reviewer map proves presence, not freshness; GA1b additionally
checks current source status and exact component membership.

The completion hook is `apps/api/src/lib/canvas-preparation/orchestration.ts:107`
(explicit resume at 108-109, before the existing Auto adapter). Recovery is
`apps/api/src/lib/notifications/canvas-poll.ts:125`, before course eligibility.
`course-batch/service.ts:36`, `:54`, `:94` and `:134` own preview, registration,
per-request advancement and bounded recovery respectively (line positions may
move during final review). No Auto preference or baseline is read by this path.

Reuse the normal per-material generation API, preparation evidence, canonical
source snapshot/selection checks and existing Reviewer/Canvas source screens
and `canvasStudyWorkflow.ts`/`canvasBlockSelection.ts`; none becomes a combined
Reviewer. The material workspace routes are mobile `/courses/[courseId]` and
web `/generate/[courseId]`; `/canvas/[courseId]` is the Grades subtree. E2
`packages/shared/src/reviewer-estimate.ts:21` remains saved study time only.

Server quota exists: `packages/db/migrations/20260723090006_processing_quota_concurrency_hardening.sql:15`
serializes owner admission; lines 28/39/63/87 enforce active/hourly/queued/daily
caps. `study-tools.ts:310` is explicitly not a durable quota and is not used.
Live migration application is **UNVERIFIED (owner to confirm)**, not a STOP.

## Acceptance matrix

| Requirement | Owning evidence | Result |
|---|---|---|
| Current reviewer skip; exact accepted component set | API service tests, saved status + component comparison | FRESH PASS |
| Select all and only checked; honest count/skipped list; account isolation | shared and both client controls tests | FRESH PASS |
| Quota smaller than batch; honest next retry/capacity | API service + actual existing quota trigger in PGlite | FRESH PASS |
| Repeated/concurrent calls; overlapping sets | API stable receipt/key test; SQL unique receipt/fence/membership tests | FRESH PASS |
| Independent failure and normal job Retry | API request tests, SQL retry receipt update; existing Queue job tests | FRESH PASS |
| Saved preparation intent, Auto off and past course | API advancement tests; explicit completion/global recovery hooks | FRESH PASS |
| No preview generation; failed prep ends without loops | API no-start assertions and terminal-state tests | FRESH PASS |
| Pending cancel and owner isolation | API ownership/cancel tests; SQL RLS/grants/row fence tests | FRESH PASS |
| Queue waiting, Cancel/Retry and batch summary | both client Queue component tests | FRESH PASS |
| Fresh serial gates, documentation, scoped commits | command logs under ignored `tmp/overnight/GA1b-*`; closure/status ledger | FRESH PASS |

## Gate ledger

First forced typecheck: **FRESH FAILED, 7/8 tasks,
0 cached**, one strict readonly JSON narrowing error in `course-state.ts`.
Repaired without weakening types; next forced typecheck **FRESH PASS, 8/8,
0 cached**. Initial lint **FRESH PASS, 8/8, 0 cached, zero errors**; two new mobile
test import-order warnings were corrected, retaining the six baseline warnings.
Initial focused API tests passed 14/14, expanded to 18/18; mobile controls 3/3,
web controls 3/3. The first full mobile run had **1,069 passed / 3 failed in
114 files**: existing course-screen fixtures did not isolate the newly mounted
batch control. The fixtures now mock that child; no assertion was weakened.
The next full mobile run passed all 1,072 tests. No nondeterministic flake
observed. Discovery included Windows literal
path/wildcard misses, unavailable Python and patch-context mismatches; all
were resolved locally, with no destructive cleanup.

Final code verification, run serially with repo-local TEMP/TMP:

| Exact command | Result | Evidence under `tmp/overnight/` |
|---|---|---|
| `npm run typecheck -- --force` | FRESH PASS, 8/8 tasks, 0 cached | `GA1b-typecheck-final.log` |
| `npm run lint -- --force` | FRESH PASS, 8/8 tasks, 0 cached; 0 errors, 6 existing warnings (5 mobile, 1 web) | `GA1b-lint-final.log` |
| `npm run test --workspace @stay-focused/api` | FRESH PASS, 2,187 passed / 3 existing skips, 189 files | `GA1b-api-first.log` |
| `npm run test --workspace @stay-focused/mobile` | FRESH PASS, 1,072/1,072, 114 files | `GA1b-mobile.log` |
| `npm run test --workspace @stay-focused/shared` | FRESH PASS, 269/269, 27 files; includes existing emitted test copies | `GA1b-shared.log` |
| `npm run test --workspace @stay-focused/web` | FRESH PASS, 154/154, 26 files | `GA1b-web.log` |
| `npm run build --workspace @stay-focused/api` | FRESH PASS, 1/1 build, 34/34 static pages | `GA1b-api-build.log` |
| `npm run build --workspace @stay-focused/web` | FRESH PASS, 1/1 build, 19/19 static pages | `GA1b-web-build-resumed.log` |
| `npm run build --workspace @stay-focused/mobile -- --platform android` | FRESH PASS, 1/1 export, 1 Android bundle / 35 assets | `GA1b-mobile-build.log` |
| `npm run build -- --force` | FRESH PASS, 8/8 tasks, 0 cached; additional AUTOPILOT gate | `GA1b-root-build.log` |
| `git diff --check` and `git diff --cached --check` | FRESH PASS, 0 whitespace errors each | closure command output |

The interrupted first website build had compiled successfully but had no exit
result, so it is **NOT RUN to completion**, not accepted as a pass or a product
failure. The resumed build completed with exit 0. Review on resume covered
the uncommitted service, migration/RLS/admission fence, preparation and recovery
hooks, shared contracts, course controls and Queue integration; existing GA1
audit commits were not redone. Build-generated `next-env.d.ts` changes are
excluded. Remote/device acceptance is **NOT RUN** by explicit unattended scope.

## Owner steps remaining

Rollout and Device checks are entirely skipped. Apply the new batch migration
file using the Supabase connector with its filename as name, after pending CQ1,
SP2, SH1 and preparation/quota prerequisites. Deploy API/website/Google worker
code as appropriate and publish preview OTA with compatible native modules.
Confirm existing background poll scheduling; no Scheduler change is authorized
by this unattended run. Perform CIT17/realme/web Generate all/selection, exact
done skip, count/skipped confirmation, quota remainder/threshold, waiting
preparation, Auto off/past-course completion, failed preparation/Retry, pending
Cancel, normal Retry/Open and batch progress. Recheck SP1/CQ1/QD1/SP2/SP2b/SH1.

Deployed revisions, migration history/live rows, Scheduler, CIT17 inventory,
latency and physical behavior are **UNVERIFIED (owner to confirm)**. All tmp
logs, progress and status remain uncommitted. No remote SQL, migration apply,
deployment, remote provider/service call, email, environment-file edit, push,
Scheduler action or deletion outside the repository is part of this run.
