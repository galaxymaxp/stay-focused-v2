# TP2e Plan glass pill: RR1d verification: LOCAL PASS

Verified freshly on 2026-10-26 at HEAD `6ec8e4e3`, branch
`overnight/2026-10-15_feedback`. Product implementation remains `c8cfb180`;
test-only T `e52276f3` is retained unchanged. RR1d makes no product/test edits.
The complete shared/mobile/web suites pass **3339 passed / 0 failed / 0 skipped**
across **364 files**. Focused overlaps add 59 passes, for **3398 executed
test passes / 0 failures / 0 skips**. All required local gates below pass.

## Implementation inspected

TP2e's `git show --stat c8cfb180` lists exactly 11 files:

| File | TP2e change |
| --- | --- |
| packages/shared/src/orb-body-renderer.ts | One liquid-ball slice scaled to .75/.32/.7, opposite glow, liquid-lit dark walls/edges/reflections and hollow shading; removes slab centre glint while retaining the sphere program. |
| packages/shared/src/plan-glass-renderer.ts | Bevel .1, depth .3, fit .95, straight-on camera and half-height corner clamp. |
| packages/shared/src/plan-glass-renderer.test.ts | Verifies thicker geometry, fit and radius clamp. |
| packages/shared/src/plan-liquid.test.ts | Verifies the liquid mapping, absent centre glint and liquid-lit shader, preserving the exact sphere fragment digest. |
| apps/mobile/src/features/redesign/planPill.ts | Shared native pill radius 26 for the 52px button. |
| apps/mobile/src/features/redesign/PlanButton.tsx | Uses native pill radius. |
| apps/mobile/src/features/redesign/PlanButtonFallback.tsx | Uses the same native pill radius. |
| apps/mobile/src/features/redesign/PlanGlassView.tsx | Passes the native pill radius into the shared GL frame. |
| apps/mobile/src/features/redesign/PlanButton3d.test.ts | Asserts the 26px native pill radius. |
| apps/web/app/globals.css | Uses 24px radius on the 48px web button. |
| apps/web/src/features/today/plan-glass.browser.test.ts | Updates pill-radius assertions and test wording; retains the row-luminance assertion. |

## RR1b failure and resolution

Historical RR1b `4f06f193` failed nine stale .01 dark minimum-row assertions.
Owner-authorized T `e52276f3` keeps the light .01 assertion and every other
assertion intact; dark minimum is finite/>0 and peak is >.05, matching TP2e's
liquid-lit near-black empty glass. RR1c's 27 observations (nine RR1b rest,
18 fresh rest/wave) have lowest peak **.11052663233035252**, half
**.05526331616517626**; .05 is below that half. The exact per-case observations
remain in `tmp/overnight/RR1c/luminance-calibration.json`. Both RR1c calibration
and post-T focused runs passed 26/26. RR1d freshly confirms 26/26 again.

## RR1c failure and resolution

Historical RR1c retained T and failed at course-options with 0 passes / three
timeouts / three unhandled ENOENT errors. Its temporary JavaScript filesystem
redirect expected a missing RR1c entry.js while native esbuild wrote the normal
ignored LM1 path. Failure docs `6ec8e4e3` and all failed logs remain intact.
RR1d removes the temporary collector from execution, uses normal repository
configuration and filesystem paths, and passes course-options 3/3 plus the
complete web suite. No filesystem monkey-patching, redirection, test-contract,
deadline or product change is used. Historical failures are not erased.

## Fresh results and exact commands

Every command below ran serially; all exits are zero. Evidence:
`tmp/overnight/RR1d/gates.json` has exactly [{name, command, exit, log}];
`receipts.jsonl` pins execution times and `counts.json` records parsed counts.
Full shared **900/90 files**, mobile **1732/186 files**, web **707/88
files** (75 unit files and 13 isolated browser files). Shared's normal suite
includes generated dist test mirrors; counts describe executed cases rather
than claiming distinct source cases. No standalone orb-body-renderer.test.ts
exists: plan-liquid exercises createOrbBody and pins the sphere fragment;
orb-appearance/orb-ambient supply 17 additional focused regressions.

| Command | Result and retained log |
| --- | --- |
| `npm run test --workspace @stay-focused/shared -- --maxWorkers=1 src/plan-glass-renderer.test.ts src/plan-liquid.test.ts src/orb-body-renderer.test.ts` | FRESH PASS, exit 0; 9 passed / 0 failed / 0 skipped; 2 files; [focused-shared.log](../../../tmp/overnight/RR1d/gates/focused-shared.log) |
| `npm run test --workspace @stay-focused/mobile -- --maxWorkers=1 src/features/redesign/PlanButton3d.test.ts` | FRESH PASS, exit 0; 7 passed / 0 failed / 0 skipped; 1 file; [focused-mobile.log](../../../tmp/overnight/RR1d/gates/focused-mobile.log) |
| `npm run test --workspace @stay-focused/web -- --maxWorkers=1 src/features/today/plan-glass.browser.test.ts` | FRESH PASS, exit 0; 26 passed / 0 failed / 0 skipped; 1 file; [focused-web.log](../../../tmp/overnight/RR1d/gates/focused-web.log) |
| `npm run test --workspace @stay-focused/shared -- --maxWorkers=1 src/orb-appearance.test.ts src/orb-ambient.test.ts` | FRESH PASS, exit 0; 17 passed / 0 failed / 0 skipped; 2 files; [focused-orb-body.log](../../../tmp/overnight/RR1d/gates/focused-orb-body.log) |
| `npm run test --workspace @stay-focused/shared -- --maxWorkers=1` | FRESH PASS, exit 0; 900 passed / 0 failed / 0 skipped; 90 files; [shared.log](../../../tmp/overnight/RR1d/gates/shared.log) |
| `npm run test --workspace @stay-focused/mobile -- --maxWorkers=1` | FRESH PASS, exit 0; 1732 passed / 0 failed / 0 skipped; 186 files; [mobile.log](../../../tmp/overnight/RR1d/gates/mobile.log) |
| `npm run test --workspace @stay-focused/web -- --maxWorkers=1 --exclude **/*.browser.test.ts` | FRESH PASS, exit 0; 544 passed / 0 failed / 0 skipped; 75 files; [web-unit.log](../../../tmp/overnight/RR1d/gates/web-unit.log) |
| `npm run test --workspace @stay-focused/web -- --maxWorkers=1 src/components/course-options.browser.test.ts` | FRESH PASS, exit 0; 3 passed / 0 failed / 0 skipped; 1 file; [web-browser-01-retry.log](../../../tmp/overnight/RR1d/gates/web-browser-01-retry.log) |
| `npm run test --workspace @stay-focused/web -- --maxWorkers=1 src/features/day-clock/glass-clock.browser.test.ts` | FRESH PASS, exit 0; 14 passed / 0 failed / 0 skipped; 1 file; [web-browser-02.log](../../../tmp/overnight/RR1d/gates/web-browser-02.log) |
| `npm run test --workspace @stay-focused/web -- --maxWorkers=1 src/features/day-clock/orb-load.browser.test.ts` | FRESH PASS, exit 0; 7 passed / 0 failed / 0 skipped; 1 file; [web-browser-03-retry.log](../../../tmp/overnight/RR1d/gates/web-browser-03-retry.log) |
| `npm run test --workspace @stay-focused/web -- --maxWorkers=1 src/features/generation-screen.browser.test.ts` | FRESH PASS, exit 0; 13 passed / 0 failed / 0 skipped; 1 file; [web-browser-04.log](../../../tmp/overnight/RR1d/gates/web-browser-04.log) |
| `npm run test --workspace @stay-focused/web -- --maxWorkers=1 src/features/knowledge-core/orbBody.browser.test.ts` | FRESH PASS, exit 0; 5 passed / 0 failed / 0 skipped; 1 file; [web-browser-05.log](../../../tmp/overnight/RR1d/gates/web-browser-05.log) |
| `npm run test --workspace @stay-focused/web -- --maxWorkers=1 src/features/password-reset.browser.test.ts` | FRESH PASS, exit 0; 20 passed / 0 failed / 0 skipped; 1 file; [web-browser-06.log](../../../tmp/overnight/RR1d/gates/web-browser-06.log) |
| `npm run test --workspace @stay-focused/web -- --maxWorkers=1 src/features/queue-failures.browser.test.ts` | FRESH PASS, exit 0; 32 passed / 0 failed / 0 skipped; 1 file; [web-browser-07.log](../../../tmp/overnight/RR1d/gates/web-browser-07.log) |
| `npm run test --workspace @stay-focused/web -- --maxWorkers=1 src/features/queue-orb.browser.test.ts` | FRESH PASS, exit 0; 13 passed / 0 failed / 0 skipped; 1 file; [web-browser-08.log](../../../tmp/overnight/RR1d/gates/web-browser-08.log) |
| `npm run test --workspace @stay-focused/web -- --maxWorkers=1 src/features/today/plan-glass.browser.test.ts` | FRESH PASS, exit 0; 26 passed / 0 failed / 0 skipped; 1 file; [web-browser-09.log](../../../tmp/overnight/RR1d/gates/web-browser-09.log) |
| `npm run test --workspace @stay-focused/web -- --maxWorkers=1 src/features/today/planning-sheet.browser.test.ts` | FRESH PASS, exit 0; 8 passed / 0 failed / 0 skipped; 1 file; [web-browser-10.log](../../../tmp/overnight/RR1d/gates/web-browser-10.log) |
| `npm run test --workspace @stay-focused/web -- --maxWorkers=1 src/lib/hide-on-scroll.browser.test.ts` | FRESH PASS, exit 0; 4 passed / 0 failed / 0 skipped; 1 file; [web-browser-11.log](../../../tmp/overnight/RR1d/gates/web-browser-11.log) |
| `npm run test --workspace @stay-focused/web -- --maxWorkers=1 src/lib/screen-snapshots.browser.test.ts` | FRESH PASS, exit 0; 4 passed / 0 failed / 0 skipped; 1 file; [web-browser-12.log](../../../tmp/overnight/RR1d/gates/web-browser-12.log) |
| `npm run test --workspace @stay-focused/web -- --maxWorkers=1 src/features/day-clock/ambient.browser.test.ts --pool=threads --reporter=verbose` | FRESH PASS, exit 0; 14 passed / 0 failed / 0 skipped; 1 file; [web-browser-13.log](../../../tmp/overnight/RR1d/gates/web-browser-13.log) |
| `npm run typecheck -- --force` | FRESH PASS, exit 0;  Tasks:    8 successful, 8 total; Cached:    0 cached, 8 total;   Time:    2m37.899s ; [typecheck.log](../../../tmp/overnight/RR1d/gates/typecheck.log) |
| `npm run lint -- --force` | FRESH PASS, exit 0;  Tasks:    8 successful, 8 total; Cached:    0 cached, 8 total;   Time:    3m27.718s ; [lint.log](../../../tmp/overnight/RR1d/gates/lint.log) |
| `npm run build --workspace @stay-focused/api` | FRESH PASS, exit 0; 1 build passed / 0 failed / 0 skipped; 38/38 static pages; [api-build.log](../../../tmp/overnight/RR1d/gates/api-build.log) |
| `npm run build --workspace @stay-focused/web` | FRESH PASS, exit 0; 1 build passed / 0 failed / 0 skipped; 23/23 static pages; [web-build.log](../../../tmp/overnight/RR1d/gates/web-build.log) |
| `npm run build --workspace @stay-focused/mobile -- --platform android --max-workers 1 --output-dir ../../tmp/overnight/RR1d/android-export` | FRESH PASS, exit 0; 1 export passed / 0 failed / 0 skipped; 4355 modules, 47 assets, 1 bundle; [android-export.log](../../../tmp/overnight/RR1d/gates/android-export.log) |
| `npm run build -- --force --concurrency=1 --env-mode=loose` | FRESH PASS, exit 0;  Tasks:    8 successful, 8 total; Cached:    0 cached, 8 total;   Time:    18m24.803s ; [root-build-retry.log](../../../tmp/overnight/RR1d/gates/root-build-retry.log) |
| `git diff --check` | FRESH PASS, exit 0; 1 command passed / 0 failed / 0 skipped; [diff.log](../../../tmp/overnight/RR1d/gates/diff.log) |
| `git diff --cached --check` | FRESH PASS, exit 0; 1 command passed / 0 failed / 0 skipped; [cached-diff.log](../../../tmp/overnight/RR1d/gates/cached-diff.log) |

### First attempts retained

- web-browser-01: first exit 1, isolated retry exit 0. Full-suite serial partition failed only a 5000ms timeout at 320px (2 passed/1 failed); unchanged isolated --maxWorkers=1 retry passed 3/3 under RR1d answer 7. Logs: `tmp/overnight/RR1d/gates/web-browser-01.log`, `tmp/overnight/RR1d/gates/web-browser-01-retry.log`.
- web-browser-03: first exit 1 (6 passed / 1 failed / 0 skipped), isolated retry exit 0 (7 passed / 0 failed / 0 skipped). Timeout-only full-suite serial partition; one unchanged isolated --maxWorkers=1 retry under RR1d answer 7. Logs: `tmp/overnight/RR1d/gates/web-browser-03.log`, `tmp/overnight/RR1d/gates/web-browser-03-retry.log`.

All first attempts and retries remain in `receipts.jsonl`, `attempts.json`
and `all-counts.json`: **3406 passed / 2 failed / 0 skipped**
executed cases including repeated passes. The failed cases above were solely
timeouts and each unchanged isolated file passed with --maxWorkers=1, as
RR1d answer 7 permits. No failed assertion or unfinished gate is waived.
`gates.json` records the effective passing gate for each requirement; the
manifest additionally pins every failed log and the complete attempt ledger.

The first forced root build was interrupted by the validation runner after
25m30s, with no completion and no new log output for 21m50s during Expo's
all-platform export. The machine exposed 16 processors; only the exact
confirmed RR1d root-build process tree was stopped. The unchanged npm root
command then ran freshly under Windows OS CPU affinity 1 (verified available
parallelism 1), retaining normal repository/Metro configuration. This repairs
validation-runner resource pressure without filesystem, module or config
patching. The interrupted command is not claimed as PASS; its original log,
target identity and adjustment remain in root-interruption.json, deviations.json
and the complete attempt ledger. The successful retry supplies the root gate.
Next-generated next-env.d.ts declarations were returned to their clean pre-run
bytes after builds and excluded from commits; generated-declarations.diff is
retained locally.

No cached result substitutes for a required fresh gate. Forced typecheck,
lint and root build each report 8/8 successful tasks, 0 cached. Seven existing
lint warnings, zero errors. Direct API/web builds and the offline Android
JS/assets export pass. Node 24.16.0, npm 11.13.0, Vitest 4.1.11.
Readiness CLI and readiness regression tests are recorded separately in the
final RR1d handoff after completion commit X; this report is committed proof
of the local TP2e gates. API full/workflow/provider-contract suites are
NOT APPLICABLE to this docs-only verification; live provider flows NOT RUN.

## WebGL and historical evidence

Fresh real Chromium/SwiftShader evidence: **36 captures / 18 rest-wave pairs**,
390/768/1280, light/dark, pearl/gold/green. Maximum measured hue difference
**3.7818 degrees** (limit 6), maximum step fraction
**0** (limit .6); minimum dark row
**0.0008619318695220024**, minimum dark peak **0.11052663233035252**.
The 30-frame fixed silhouette, shaded glyph, palette fade, press/color
isolation, Reduce Motion and fallback cases pass. Captures and all 36 metric
observations are preserved under `tmp/overnight/RR1d/plan-captures/` and
`plan-capture-summary.json`. These establish web rendering, not native GL.

Tests write their normal ignored paths. The immutable pre-RR1c backup remains
`tmp/overnight/RR1c/tp2d-backup/`, pinned by
`tmp/overnight/RR1c/tp2d-before-hashes.json`: **14900 files**
(the prompt's “140” count differs from the actual pins). RR1d's post-run audit
finds **60 changed / 0 added / 0 missing** historical paths;
all backup hashes match. No historical evidence is deleted or restored.
The backup includes composites already overwritten by RR1b and cannot
authenticate original TP2d visuals. Full changed/added lists and SHA-256
digests are retained in `tmp/overnight/RR1d/historical-audit.json`.
All 18 original status/progress and 23 owner-artifact pins remain unchanged.

## Readiness scope and endpoint

Completion X is `docs(today): verify TP2e glass pill at HEAD`. Six append-only
supersessions (TP2c, QL1, QL1b, RR1, RR1b, RR1c) end at c8cfb180, T, X,
without statusId. QL1/QL1b require this refreshed chain because TP2e changed
globals.css after QL1c. Each resolution pins original records, this committed
acceptance, gates and log bytes. The manifest is backed up with suffix
`-pre-rr1d`; its path/hash and unchanged original entries are recorded locally.
RR1d closes only after its readiness dry run has no blocker beyond its own
in-progress self-reference, all six supplemental proofs verify, and readiness
regressions pass. The handoff records these post-X results and exact commits.
Roadmap is ready for owner FULLSEND after that stable-boundary readiness check.

Validation uses repo-local TEMP/TMP/TMPDIR/caches, EXPO_NO_DOTENV=1,
EXPO_OFFLINE=1, telemetry off, stripped inherited service credentials and a
network-only loopback guard. No env file is edited or read by the agent;
Expo dotenv loading is disabled. No production service, remote SQL/migration,
deployment, Scheduler/email, OTA/EAS or push action occurs.

## Owner steps remaining

- Rollout **NOT RUN**, skipped entirely: owner FS12 FULLSEND must rerun live
  readiness at the stable runner boundary and its own fresh release gates.
- Device checks **NOT RUN**, skipped entirely: website/Realme Plan and Queue
  in light/dark, Reduce Motion, native GL and physical performance.
- Live served revision/database/Scheduler/provider state, native GL/Realme,
  other browsers/assistive technology and physical FPS/power:
  **UNVERIFIED (owner to confirm)**.
- Vercel CLI is absent. Strongly recommend `npm i -g vercel` for future
  authorized env/deploy/log tooling; installation NOT RUN.

Endpoint RR1d only. No FS12, release, FULLSEND or next roadmap item started.
