# WD1 draft activity instructions (2026-10-18)

## Scope and baseline

Finite unattended scope: STEP 0-5, tests, fresh serial gates, documentation and
local commits. Rollout and Device checks are excluded owner steps. No remote
service calls, SQL/migrations, Scheduler operations, environment-file edits,
deployments, email or pushes are permitted. No later roadmap slice is authorized.

Branch: `overnight/2026-10-15_feedback`; baseline HEAD `fe660af`, 51 commits
ahead of the locally recorded `github/main` (remote freshness unverified).
Git author: `galaxymaxp <omgraythekid@gmail.com>`.
Initial dirty tree: untracked `UI/`, `apps/mobile/.gitignore`, `supabase/.temp/`;
preserve all. `tmp/` is ignored and must never be staged.

Baseline `git log --oneline -8`:

```text
fe660af docs: close WL1
ea9ffa9 feat(web): library sort menu button
341cf62 docs: close GN1 (GN1b)
29bbe1d feat(mobile): open generation progress after grace period
a387c59 feat(mobile): add cancellable grace navigation hook
8dffcd4 docs: record GN1 preflight stop
da57f05 docs: close OS1 (OS1b)
a8484f6 fix(web): subtle own-material source toggle
```

## STEP 0 findings — PASS (repository evidence)

- Web `library.tsx`: draft layout/body/aside, outline title and section/slide
  anchors, saved/unsaved status, warnings and Save match the prompt.
- Mobile `LibraryScreen.tsx`: exported DraftEditor uses useOfflineDraftEditor,
  appears in ArtifactScreen, and has no existing outline.
- ActivityDraft has activityId. ActivityDetail has instructions and inherited
  dueAt, with no points field. getActivityDetail uses the owner-filtered activity
  context and requireFound (404), normalizes Canvas HTML to plain text, and uses
  task notes for local tasks. Existing full assignment rows include nullable
  points_possible in the database type; exposing points needs no query/migration.
- Web Tasks uses useResource and dateLabel, with plain-text .instructions.
  Mobile ActivityScreen uses useExperience(path, 0, undefined,
  activityDetailOfflineCache). The cache is already exported; no cache change
  is needed. Both surfaces already have empty-instructions wording.
- Production revisions, database rows, Cloud Scheduler state, remote-ref
  freshness and device behavior: **UNVERIFIED (owner to confirm)**. No live
  checks are required for this code-only scope.
- No material contradiction or STOP condition found.

## Acceptance matrix

| Requirement | Layer | Proof | Result |
| --- | --- | --- | --- |
| Additive points from existing rows, null for local tasks | API/shared | Service tests | FRESH PASS |
| Instructions/due/points, literal text, empty and clamp toggle | Web | Component tests | FRESH PASS |
| Missing/error activity falls back to minimal 2+ item outline | Web | Editor tests | FRESH PASS |
| Default-collapsed accessible section above editor | Mobile | Editor tests | FRESH PASS |
| Offline cache used; unavailable uncached section hidden | Mobile | Hook/component tests | FRESH PASS |
| Fresh serial typecheck/lint/tests/builds/diff | Repository | Exact commands/counts | FRESH PASS, 10/10 prompt commands |

## Verification log

Preflight read command initially used Bash brace syntax in PowerShell and failed
to parse; corrected read-only command succeeded. No files changed by that attempt.

- FRESH focused API `npm run test --workspace @stay-focused/api --
  src/lib/experience/experience.test.ts`: **82/82**, 1 file.
- FRESH web `npm run test --workspace @stay-focused/web --
  src/features/draft-instructions.test.ts`: first **3 pass/5 fail** (artifact
  fixture omitted its summary); second **7 pass/1 fail** (mock did not accept
  null path); corrected test fixtures, final **8/8**, 1 file. No assertion,
  production validation or timeout was weakened.
- FRESH mobile `npm run test --workspace @stay-focused/mobile --
  src/features/redesign/DraftInstructions.test.ts
  src/features/redesign/screens.test.ts`: first **92 pass/2 fail** (incomplete
  activity fixture rejected by existing cache validation); complete typed fixture
  fixes it; final **94/94**, 2 files. Exercises the real useExperience hook,
  activityDetailOfflineCache and SQLite store, including online save/offline
  remount without a screen snapshot, owner isolation, zero points and emptiness.
- First forced root typecheck: **6 successful/8 total, 0 cached**, one test-only
  TS2345 error (native mock string passed to findByType). Changed selector to the
  repository's predicate pattern. Fresh full retry: **8/8, 0 cached**.
- Read-only diagnostics also encountered a missing optional app.config.ts and
  unsupported PowerShell wildcard paths; discovered app.json and read package
  scripts via Get-ChildItem instead. No runtime/build defect or file mutation.
- Resume inspected WD1 prompt/progress, the last 15 commits, status, staged and
  unstaged diffs, plus all new WD1 files. API/shared step 1 is already committed
  as `8aa10db` and was not reimplemented. Web/mobile steps 2-5 were preserved.
- Saved forced lint log confirms **FRESH PASS, 8/8 tasks, 0 cached**, zero errors
  and six existing warnings (one web unused useMemo; five mobile import-order).
- The pre-interruption full API log ends at suite startup with no test counts
  or completion result: **NOT RUN to completion**, not a passing gate. Resumed
  the full suite with two workers and process-local `B24_6_LIVE=0` and
  `B24_7_LIVE=0`; no environment file is read by those opt-in live tests.
- React skill review: hooks remain unconditional, instructions stay literal
  text, measured clamping follows content/resize and disconnects its observer,
  toggle states are accessible, the mobile hit target is at least 44pt, and
  existing owner-scoped fetching/cache, design tokens and editor controls stay
  intact. No new dependency, palette, query, migration or cache format.
- Resumed full `npm run test --workspace @stay-focused/api -- --maxWorkers=2`:
  **FRESH PASS, 2316 passed / 3 skipped**, 201 files, no failures. The three
  opt-in live cases remain disabled; tests use local/mocked data only.
- `npm run test --workspace @stay-focused/shared`: **FRESH PASS, 464/464**,
  44 files, no failures.
- `npm run test --workspace @stay-focused/web`: **FRESH PASS, 297/297**,
  43 files, no failures.
- `npm run test --workspace @stay-focused/mobile`: **FRESH PASS, 1401/1401**,
  143 files, no failures.
- `npm run build --workspace @stay-focused/api`: **FRESH PASS, 1/1 build**,
  35/35 static pages generated.
- `npm run build --workspace @stay-focused/web`: **FRESH PASS, 1/1 build**,
  19/19 static pages generated; existing unused-useMemo warning only.
- `npm run build --workspace @stay-focused/mobile -- --platform android`:
  **FRESH PASS, 1/1 export**, one Android bundle (4265 modules).
  Process-local EXPO_OFFLINE=1 and EXPO_NO_TELEMETRY=1; no publication.
- `git diff --check`: **FRESH PASS**, zero whitespace errors. Next-generated
  API/web declarations were inspected and restored to their clean baseline.
  Logs and generated outputs remain uncommitted.
- Additional AUTOPILOT `npm run build -- --force --env-mode=loose`:
  **FRESH PASS, 8/8 tasks, 0 cached**; API 35/35 pages, web 19/19 pages,
  mobile Android/iOS/web exports. Process-local EXPO_OFFLINE=1,
  EXPO_NO_TELEMETRY=1, NEXT_TELEMETRY_DISABLED=1 and TURBO_TELEMETRY_DISABLED=1
  were passed through loose mode so the offline/no-telemetry settings reach
  child build processes. No configuration or environment file was edited.
- All owned staged changes also pass `git diff --cached --check`. Evidence
  covers the code committed as `8aa10db`, `30a009e` and `3817695`; remaining
  changes are documentation only. Initial web commit used a command-local
  hooksPath override; inspection confirmed there are no configured/active
  hooks (only sample files). No Git configuration changed; later commits
  use normal hooks.

All **10/10 prompt gate commands** are green, run serially across the initial
session and this resume. Typecheck/lint logs establish fresh execution with
zero cached tasks; interrupted API startup was rerun instead of counted.
Vite's existing native/CommonJS config advisory and Expo's NO_COLOR/FORCE_COLOR
warning remain. No test assertions, timeouts, validation or configuration were
weakened. Full resumed test suites had zero failures/retries/flakes.

## Implementation and compatibility

- API/shared: optional nullable `ActivityDetail.pointsPossible` reads the
  already-loaded assignment's `points_possible`; local tasks and ungraded
  assignments return null, and zero points is retained. Owner filtering,
  requireFound denial and instruction normalization are unchanged.
- Web: the nonblocking aside uses Tasks' useResource/dateLabel pattern and
  literal .instructions text, with an eight-line measured clamp and accessible
  Show all/Show less. Empty text gets the established wording. Missing IDs,
  404s and errors use the caller's minimal outline only with two or more
  section/slide anchors; the Draft title link is removed. Editor IDs, saved
  status, warnings and Save logic remain unchanged.
- Mobile: a default-collapsed Instructions Surface sits above the title,
  using existing chevrons, Copy, spacing and theme colors. The button has
  expanded accessibility state and a 44pt minimum hit target. The existing
  useExperience hook and activityDetailOfflineCache provide owner-scoped
  online caching/offline restoration; unavailable uncached activity is hidden
  without blocking editing. No cache behavior or schema change.

The optional DTO field is backward compatible for older clients/servers.
No migration, new query, dependency or standalone ADR is needed; the required
three-line DTO decision note is included in the handoff footer.

## Closure - PASS for the finite unattended code scope

STEP 0-5, all required tests and 10/10 prompt gates, the additional AUTOPILOT
forced root build and local commits are complete. Current state, roadmap and
sprint are reconciled, and the handoff footer records results and owner steps.
No later roadmap task started. All commits use the required galaxymaxp author.

- `8aa10db feat(api): expose assignment points in activity detail`
- `30a009e feat(web): draft aside shows activity instructions`
- `3817695 feat(mobile): draft editor instructions section`
- `docs: close WD1` (this documentation commit; its final hash is recorded in
  ignored `tmp/overnight/WD1.status` and Git after commit).

Only task-owned source/tests and five documentation paths are committed.
Baseline untracked `UI/`, `apps/mobile/.gitignore` and `supabase/.temp/` are
preserved; generated artifacts, credentials, local fixtures and `tmp/` stay
excluded. Final local refs are ahead 55 / behind 0 relative to the locally
recorded `github/main`; remote freshness remains unverified, no fetch or push.

Production revisions, database rows, Scheduler state, remote-ref freshness
and browser/phone behavior are **UNVERIFIED (owner to confirm)**. No remote
service operation, deployment, SQL/migration, Scheduler change, email,
environment-file edit or push was run. Raw validation logs and final
progress/status remain ignored under `tmp/overnight/WD1*`.

## Owner steps remaining

- **Rollout - NOT RUN, skipped entirely:** Fely's API/web deployments and
  mobile OTA/APK. The Vercel CLI is missing in this session; installing it
  with `npm i -g vercel` is recommended for the owner's deployment tooling.
- **Device checks - NOT RUN, skipped entirely:** browser 1440/768px, open
  Canvas-linked Library drafts, verify Instructions/due/points and long-text
  expansion; unavailable activity shows minimal outline. Phone: Instructions
  starts collapsed, expands, and works offline after one online open.
