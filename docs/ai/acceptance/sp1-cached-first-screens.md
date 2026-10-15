# SP1 saved-first screens — local acceptance (2026-10-15)

Scope: STEP 0–4, local gates, documentation and local commits only, on
`overnight/2026-10-15_feedback`, starting at `68e40d0`. No later tester-feedback
item is included. The unattended rules prohibit remote services, deployment,
remote SQL/migration application, Scheduler actions, environment-file changes
and pushes. Rollout and Device checks are owner work.

## Baseline verification

STEP 0 passed: required branch, SP0 status PASS, and empty tracked porcelain.
Unrelated untracked `UI/`, `apps/mobile/.gitignore`, and `supabase/` remain intact.
Read the complete SP1 prompt, external roadmap SP1 section, root AGENTS/AUTOPILOT,
current planning checkpoints and SP0's Inputs for SP1 before implementation.

Baseline references at `68e40d0`:

- Routes: `apps/mobile/app/(app)/(tabs)/today.tsx:1`,
  `courses/index.tsx:1`, `courses/[courseId]/index.tsx:1`, `work/index.tsx:1`,
  `library/index.tsx:1`, and `apps/mobile/app/(app)/artifact.tsx:1` all exist
  and re-export their implemented screens.
- `apps/mobile/src/services/localLibrary/localArtifactDatabase.ts:12` opens
  the device store; `:32` exposes `purgeLocalLibraryForOwner`.
  `apps/mobile/src/services/completedArtifactCache.ts:93` reads owner-bound
  completed copies. `apps/mobile/src/auth/AuthProvider.tsx:192` signs out;
  `:196` owns the existing allSettled cleanup list.
- Website routes exist under `apps/web/app/(app)/today`, `canvas`, `tasks`,
  `generate` and `library`, including course and artifact details.
  `apps/web/src/components/providers.tsx:28` owns the custom auth/API context;
  `apps/web/src/lib/hooks.ts:6` owns the custom resource hook. There is no
  React Query/SWR integration.

SP0 saved-data inventory:

| Screen | Mobile before SP1 | Website before SP1 |
|---|---|---|
| Today | Clock/preferences, no agenda snapshot wired in | Preferences only |
| Courses | Server rows, process-local display state | Process-local resources |
| Course workspace | Server inventory; unscoped process-local material/offset maps | Process-local workspace/pages |
| Tasks/Work | SQLite summaries/details, read only after connection error | No persistent responses |
| Library | Owner-scoped SQLite summaries/bodies/catch-up | All-pages memory loader |
| Reviewer | Exact saved body read first; remote success replaced it | No persistent body; Assist localStorage only |

No live production check was attempted. Deployment/revision, database and
Scheduler state, actual first-content latency and physical behavior are
**UNVERIFIED (owner to confirm)**; these are not code contradictions.

## Acceptance matrix

| Requirement | Owning layer | Proof/result |
|---|---|---|
| Versioned owner/query/time/data contract; successful empty response is data | Shared + SQLite + IndexedDB | Shared snapshot tests; device store tests; real local-browser IndexedDB tests |
| Saved content renders before an unresolved request | Mobile useExperience/useLocalArtifact/useLocalLibrary; web useResource | Deferred-response rendered probes and existing Library tests |
| Failure retains content, Retry and last-updated status | Both resource hooks and status components | Rendered status tests, retry success assertions |
| Sign-out wipes owner cache and delayed writes cannot restore it | Mobile allSettled cleanup; web auth provider and IndexedDB | Provider sign-out tests, epoch fencing and owner-only purge tests |
| Account switch never renders former owner's state | Identity-bound hooks and stores | Already-mounted account-switch probes, mismatch store tests |
| Changed reviewer never replaces the current reading revision | Mobile useLocalArtifact; web held resource | Original revision remains until explicit applyUpdate on both apps |
| Later course pages preserve exact owner/course/offset | Both material-page hooks | Saved-page hydration and concurrent-page regression on both apps |
| IndexedDB failure preserves online behavior | Website adapter | Real browser with throwing IndexedDB; resource miss/online test |
| Stable ids and existing scroll containers | Shared merge + screen lists | Shared merge/group tests; derived course positions retained before explicit pin/filter controls; no new scroll reset or transition |

## Implementation

Shared `SavedSnapshot<T>` carries only owner, query key, saved time, schema
version and the existing response DTO. Exact query keys preserve date, timezone,
course and page identity. A schema or owner mismatch is a miss.

Mobile appends local SQLite migration 8; historical migrations are untouched.
The new table participates in the existing Library owner purge and the new
explicit snapshot cleanup in AuthProvider. Tasks also reads its pre-existing
offline adapter before network. Library keeps its existing offline body/draft/
answer-key rules. Material maps are owner-bound and cleared on sign-out.

Website uses one IndexedDB database with owner in every serialized key. It
falls back silently when storage throws or is unavailable. Explicit sign-out
awaits cleanup; auth transitions purge the departing owner. Epochs fence old
network writes. Library persists only a complete successful traversal; partial
or failed list evidence never deletes saved Library work. Confirmed exact-item
not-found still removes that detail copy.

Both apps use the existing tokens and a static small status line. Saved content
survives background loading/failure. Surviving ids retain positions and new ids
append. Open reviewers keep their revision until “Updated — tap to refresh”.
Source visuals remain separate from these snapshots. No API/authentication,
generation, cancellation, RLS or provider behavior changes are included.

## Development verification and failed attempts

FRESH focused results: initial shared snapshot 4/4 (a fifth derived-group case was added during review); final mobile focused 19/19 across
4 files; final web focused 10/10 across 3 files (including four real IndexedDB
tests in a local-only browser). Full serial suites subsequently passed mobile
**1,036/1,036 in 105 files**, shared **223/223 in 19 files**, and web **94/94 in
16 files**, FRESH with no skipped tests. Forced typecheck and lint passed
**8/8 tasks each, zero cached**; lint has zero errors/five existing warnings.
All required local builds passed; the final gate table below supersedes the interim checkpoint.
All test TEMP/TMP paths are repository-local `.local/test-temp`.

Draft failures retained: two mobile parse/typecheck attempts found an accidental
duplicate edit tail, then passed after repair; the later pagination edit had the
same script/line-ending defect and was repaired. Initial Library focused run was
8 passed/1 failed because it expected new work to prepend; its assertion now
requires stable existing order. Initial web focused run passed four IndexedDB
tests but could not parse the JSX status component; a workspace Vitest JSX
transform fixes it. Draft mobile lint had one test-children error/two new hook
dependency warnings; web lint had one test-children error. Those edits are fixed.
These are deterministic development failures, not observed flakes.
The documentation finalizer initially rejected its freshness guard because
PowerShell had encoded build logs as UTF-16. It made no documentation writes
before that guard; decoding the log correctly established the recorded 8/8,
zero-cached result and the finalizer then completed.

The first full serial mobile gate stopped at **1,032 passed / 4 failed** in
**102 passed / 3 failed files** (1,036 tests, 105 files total). Two tests assumed
the old SQLite version 7; they now assert `LOCAL_LIBRARY_SCHEMA_VERSION` while
retaining all body/draft/key/practice preservation assertions. Two screen tests
used positional header-child indexes; the Page stand-in now mounts header
content and those tests find the rendered SearchField/SegmentedControl. The
focused repair suite passed **77/77 across 3 files**, FRESH. Full gates restarted
serially after that repair. First failure evidence is retained in ignored
`tmp/overnight/evidence/SP1-first-test-mobile-failed.log`.

## Owner steps remaining

Preview OTA and website deployment, then the skipped RB3 SP1 device/browser
checks: close/reopen with saved Today; airplane-mode refresh failure/Retry;
sign-out and a second account; hold an open reviewer during refresh. Confirm
production/deployed revision and real first-content latency. No remote migration
is required by SP1; its only schema addition is on-device SQLite.

## Final gate results

Status: **PASS for the unattended local scope**, code `15811de`. All final commands ran serially with repository-local TEMP/TMP; telemetry disabled and Expo offline. Turbo reports remote caching disabled.

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

Local code commits:

- `2bb62ba feat(shared): add owner-bound saved snapshot contract`
- `eb6ac80 feat(mobile): render saved screens before background refresh`
- `2bfbff3 feat(web): persist owner-scoped saved-first screens in IndexedDB`
- `44f2683 fix(cache): retain derived course positions during refresh`
- `15811de fix(cache): reconcile pagination status and schema regressions`

The documentation commit records this report; its hash is recorded after committing in `tmp/overnight/SP1.status`. Build-generated API/web `next-env.d.ts` changes are restored to the pre-run tracked contents. No generated validation artifact or `tmp/` path is committed. ADR-027 is placed in the existing `docs/architecture` ADR folder (`docs/adr` is absent).
