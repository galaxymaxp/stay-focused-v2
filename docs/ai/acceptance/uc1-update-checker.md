# UC1 update checker acceptance

Finite scope: UC1 STEP 0 through STEP 6, local tests/gates, docs and local
commits only. Baseline `7506d51`, branch `overnight/2026-10-15_feedback`.
No remote service operations, deployments, SQL, environment edits or push.
UC2/UC3 and rollout/device checks are excluded.

| Requirement | Owning layer | Required local proof | Result |
| --- | --- | --- | --- |
| Parse release body/tag, APK mapping, runtime/minimum comparison, 12h throttle | shared | Focused unit cases | FRESH PASS 12/12 |
| Public route, 5s timeout, 10m cache, stale fallback, empty 204 | API | Mocked route + middleware tests | FRESH PASS 7/7 |
| Persistent version dismissal, last result/check time, manual bypass, offline silence | mobile store | Injected storage/network service tests | FRESH PASS store 11/11; API client 3/3 |
| One Today banner, online-only unsupported sheet, Settings About | mobile UI | Component tests, typecheck/lint/build | FRESH PASS notice/About 4/4; primitive suite 11/11, including two new dismissal cases |
| Launch/resume triggers | app lifecycle | Lifecycle/component tests | FRESH PASS 8/8, including two new update lifecycle cases |
| Full prompt gates | repository | Exact commands/counts below | FRESH PASS 8/8 prompt gates; additional forced root build 8/8, zero cached |

Live state is UNVERIFIED (owner to confirm). FS2/UC0 ignored local records
report PASS; this run does not repeat or verify their remote actions.

## Implementation

- `71e7a51 feat(shared): parse and compare public app releases`
- `d24112c feat(api): serve cached public app release metadata`
- `e239af3 feat(mobile): persist and throttle public update checks`
- `092fde0 fix(shared): keep blank release runtime metadata absent`
- `e48b8c5 fix(mobile): preserve update checks across lifecycle races`
- `8375004 feat(mobile): show native update banner and required sheet`
- `62085d3 feat(mobile): add version and update checks to Settings About`
- `1ffcd06 feat(mobile): check app releases on launch and foreground`

See [ADR-050](../../adr/ADR-050-app-update-checker.md). No native dependencies,
runtime/build-number changes, authentication-policy changes or migrations.
Health's hardcoded `2.1.0` is out of scope and unchanged.

## Verification commands

All results below are FRESH for the final relevant implementation paths (code
tip `1ffcd06`); shared/API checks preceded later mobile-only commits. Logs are ignored
under `tmp/overnight/UC1.*.log`. Exact command variation for the API suite is
limited to two workers to bound local database-test resource use.

| Command | Result |
| --- | --- |
| `npm run typecheck -- --force` | PASS, 8/8 tasks, zero cached (final run) |
| `npm run lint -- --force` | PASS, 8/8 tasks, zero cached; six existing warnings, zero errors (final run) |
| `npm run test --workspace @stay-focused/shared` | PASS, 576/576 tests, 55 files; source plus existing emitted test copies |
| `npm run test --workspace @stay-focused/api -- --maxWorkers=2` | PASS, 2404 passed / 3 intentional live skips, 210 files |
| `npm run test --workspace @stay-focused/mobile` | PASS, 1503/1503 tests, 157 files |
| `npm run build --workspace @stay-focused/api` | PASS, 36/36 static pages; latest-release is dynamic, no build-time GitHub fetch |
| `npm run build --workspace @stay-focused/mobile -- --platform android` | PASS, one local Android bundle exported; no publication |
| `git diff --check` | PASS, zero whitespace errors; repeated after final documentation |
| Additional `npm run build -- --force --env-mode=loose` | PASS, 8/8 tasks, zero cached; API/web and local Android/iOS/web exports |

Workflow/provider contract suites are NOT APPLICABLE: no workflow, provider or
generation changes. Rollout/device acceptance is NOT RUN by explicit scope.

## Failed attempts and limitations

- First mobile workspace typecheck failed: one SupportedStorage async-return
  mismatch. The adapter now normalizes the existing maybe-async storage API.
- Second mobile workspace typecheck failed: two React `act` callbacks returned
  VitestUtils. Both now return void. Forced root typecheck then passed 8/8,
  zero cached, including the final concurrency changes.
- First forced root lint failed: 7/8 tasks passed, zero cached; two new test
  `react/no-children-prop` errors, plus six existing warnings. Test props now
  follow the repository's createElement pattern. Fresh rerun passed 8/8,
  zero cached, with the same six existing warnings.
- First full mobile suite failed at collection in `screens.test.ts` after the
  new update hook imported an unmocked native Expo module (`__DEV__` unavailable
  in Node): 1 failed / 156 passed files, 1,406 passing tests. Added an inert
  update-service mock to this broad screen suite; dedicated tests exercise the
  actual update behavior. Rerun passed 1,501/1,501; after adding two concurrency
  regressions the final run passed 1,503/1,503 across 157 files.
- No nondeterministic flakes observed. Exploratory reads of nonexistent test
  paths and one Windows wildcard rg input were corrected without code changes.
- Tests use process-local TEMP/TMP inside `tmp/overnight/uc1-test-temp`. Live
  API test flags are explicitly disabled; requests in new tests use fake
  fetch implementations. No environment file was edited. Build commands use
  offline/no-telemetry process flags. Generated output and logs remain ignored.
- A required-update sheet releases within the existing ten-second health
  interval plus its bounded five-second request when connectivity disappears;
  an offline-restored session or background transition hides it immediately.
- Cache is per process, not shared across instances. Live release/deployment,
  production rate behavior, remote-ref freshness and physical device state are
  **UNVERIFIED (owner to confirm)**.

## Owner steps remaining

- **Rollout - NOT RUN, skipped entirely:** deploy API, ship mobile through the
  existing OTA process (no new native module). No push or remote command ran.
- **Device checks - NOT RUN, skipped entirely:** About shows version/code and
  OTA/built-in state; current real release reports up to date; when a real newer
  native release exists, verify Download, per-version dismissal and notes;
  minimum-supported behavior must release offline Library. Do not fake a release.
- UC2 download page/showcase links and UC3 publishing automation are separate
  next slices and were not started.

Final outcome: **PASS for the finite UC1 local code scope**. All eight prompt
gates and the additional forced root build pass. Generated API/web Next.js
declarations were inspected and restored; staged diff hygiene passes. Final
documentation commit/hash is recorded in Git and `tmp/overnight/UC1.status`.
