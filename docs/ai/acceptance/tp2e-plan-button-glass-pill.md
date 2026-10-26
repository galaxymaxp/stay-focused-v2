# TP2e Plan glass pill: RR1c verification FAILED

Local run 2026-10-26 on `overnight/2026-10-15_feedback`. Product implementation
remains `c8cfb180`; the sole subsequent non-documentation change is the
owner-authorized test commit **T = e52276f3**. **FAILED at STEP 1** under
RR1c answer 7 and the unattended gate rule. The Plan contract correction passes,
but full verification is incomplete and the roadmap is not release-ready.
No completion commit X or supersession entry was created.

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

RR1b (historical docs-only `4f06f193`) passed 33 tests and failed nine dark
minimum-row-luminance assertions at the stale .01 floor. The owner approved
TP2e's liquid-lit, near-black empty glass and explicitly authorized the one-file
test correction. T keeps the light-mode `expect(sm.minRowLuminance).toBeGreaterThan(.01)`
assertion unchanged. Dark mode requires finite minimum-row luminance > 0 and
maximum-row luminance > **.05**. All step-fraction, hue-sample, hue-distance,
error, silhouette, glyph, press, fallback and other assertions remain unchanged.
No renderer/product code or deadline was changed.

The pre-commit calibration passed **26/26**, including every dark rest/wave
sample. RR1b supplies nine rest-only dark observations (it failed before wave
capture); fresh RR1c supplies all **18 observations across nine dark cases and
both waves**. The lowest observed maximum-row luminance across all 27 samples
is **0.11052663233035252**; half is **0.05526331616517626**. The chosen **.05** floor
is below that half-minimum. Post-T Plan verification separately passes 26/26.
Complete observations are pinned locally in `luminance-calibration.json`;
calibration captures are preserved separately from post-T captures.

| Dark case | RR1b rest max | RR1c calibration rest max | RR1c calibration wave max |
| --- | --- | --- | --- |
| 1280-dark-gold | 0.11380908944399647 | 0.11380908944399647 | 0.11306921658160952 |
| 1280-dark-green | 0.1115979013340506 | 0.1115979013340506 | 0.1107917987286249 |
| 1280-dark-pearl | 0.13626019160175398 | 0.13626019160175398 | 0.13537237711522881 |
| 390-dark-gold | 0.11354912442396285 | 0.11354912442396285 | 0.11273531399656607 |
| 390-dark-green | 0.11127295201951852 | 0.11127295201951852 | 0.11052663233035252 |
| 390-dark-pearl | 0.13599280021686005 | 0.13599280021686005 | 0.13504918406072014 |
| 768-dark-gold | 0.11380908944399647 | 0.11380908944399647 | 0.11306921658160952 |
| 768-dark-green | 0.1115979013340506 | 0.1115979013340506 | 0.1107917987286249 |
| 768-dark-pearl | 0.13626019160175398 | 0.13626019160175398 | 0.13537237711522881 |

## Fresh results and exact commands

Logs are under `tmp/overnight/RR1c/gates/`; `gates.json` has the required
`[{name, command, exit, log}]` shape and retains the failure. `receipts.jsonl`
records start/end times; `counts.json` and `failure-summary.json` record results.
Calibration precedes T; every other application test below ran freshly at T.

| Command | Result and log |
| --- | --- |
| `npm run test --workspace @stay-focused/web -- --maxWorkers=1 src/features/today/plan-glass.browser.test.ts` | FRESH PASS, 26 passed / 0 failed / 0 skipped; 1 passing / 0 failing files; exit 0; calibration-web.log |
| `npm run test --workspace @stay-focused/shared -- --maxWorkers=1 src/plan-glass-renderer.test.ts src/plan-liquid.test.ts src/orb-body-renderer.test.ts` | FRESH PASS, 9 passed / 0 failed / 0 skipped; 2 passing / 0 failing files; exit 0; focused-shared.log |
| `npm run test --workspace @stay-focused/mobile -- --maxWorkers=1 src/features/redesign/PlanButton3d.test.ts` | FRESH PASS, 7 passed / 0 failed / 0 skipped; 1 passing / 0 failing files; exit 0; focused-mobile.log |
| `npm run test --workspace @stay-focused/web -- --maxWorkers=1 src/features/today/plan-glass.browser.test.ts` | FRESH PASS, 26 passed / 0 failed / 0 skipped; 1 passing / 0 failing files; exit 0; focused-web.log |
| `npm run test --workspace @stay-focused/shared -- --maxWorkers=1 src/orb-appearance.test.ts src/orb-ambient.test.ts` | FRESH PASS, 17 passed / 0 failed / 0 skipped; 2 passing / 0 failing files; exit 0; focused-orb-body.log |
| `npm run test --workspace @stay-focused/shared -- --maxWorkers=1` | FRESH PASS, 900 passed / 0 failed / 0 skipped; 90 passing / 0 failing files; exit 0; shared.log |
| `npm run test --workspace @stay-focused/mobile -- --maxWorkers=1` | FRESH PASS, 1732 passed / 0 failed / 0 skipped; 186 passing / 0 failing files; exit 0; mobile.log |
| `npm run test --workspace @stay-focused/web -- --maxWorkers=1 --exclude **/*.browser.test.ts` | FRESH PASS, 544 passed / 0 failed / 0 skipped; 75 passing / 0 failing files; exit 0; web-unit.log |
| `npm run test --workspace @stay-focused/web -- --maxWorkers=1 src/components/course-options.browser.test.ts` | FRESH FAIL, 0 passed / 3 failed / 0 skipped; 0 passing / 1 failing files; exit 1; web-browser-01.log |
| Remaining 12 web browser files | NOT RUN after mandatory stop; full web suite is incomplete. |
| npm run typecheck -- --force | NOT RUN, 0 tasks. |
| npm run lint -- --force | NOT RUN, 0 tasks. |
| npm run build --workspace @stay-focused/api | NOT RUN, 0 builds. |
| npm run build --workspace @stay-focused/web | NOT RUN, 0 builds. |
| npm run build --workspace @stay-focused/mobile -- --platform android --max-workers 1 --output-dir ../../tmp/overnight/RR1c/android-export | NOT RUN, 0 exports. |
| npm run build -- --force --concurrency=1 --env-mode=loose | NOT RUN, 0 tasks. |
| git diff --check / git diff --cached --check | FRESH PASS, 2/2 final documentation-checkpoint commands, exit 0; diff-final.log / cached-diff-final.log. T also had passing working/staged hygiene. |
| Readiness CLI --before FS12 / node --test fullsend/readiness.test.js | NOT RUN, 0 runs / 0 tests; STEP 1 failed before STEP 4. |
| API full / workflow / provider contract suites | NOT APPLICABLE to this test-only change; live flows NOT RUN. |

Application totals: **3,261 passed / 3 failed / 0 skipped**, including 26
pre-commit calibration passes. Post-T totals: **3,235 passed / 3 failed /
0 skipped**. These executed-case totals include focused/full overlap; they
are not a complete-web-suite PASS. Eight application commands pass; one fails.
Full shared: **900/90 files**; full mobile: **1732/186 files**; web unit partition:
**544/75 files**. Focused shared Plan: 9/2 files; additional orb regressions:
17/2; mobile PlanButton3d: 7/1; Plan browser: 26/1. No standalone
orb-body-renderer.test.ts exists; plan-liquid.test.ts exercises createOrbBody
and pins the exact sphere fragment; orb-appearance/orb-ambient add coverage.
No cached result is claimed and no failed attempt was discarded or retried.

## Gate blocker and evidence-write limitation

Exact failing command:
`npm run test --workspace @stay-focused/web -- --maxWorkers=1 src/components/course-options.browser.test.ts`.
It exits **1** with **0 passed / 3 failed / 0 skipped**, one failed file and
**3 unhandled ENOENT errors**. All 320/768/1280 cases time out at their unchanged
5000ms deadline (course-options.browser.test.ts:37).

The temporary JavaScript filesystem redirect expects
`tmp/overnight/RR1c/test-artifacts/LM1/web-options/1792986222213/entry.js`,
which does not exist. esbuild's native writer instead creates the fresh ignored
`tmp/overnight/LM1/web-options/1792986222213/entry.js`. Its existence and SHA-256
are recorded in `esbuild-write-deviation.json`; a copy is retained under
`RR1c/esbuild-failure/`. The server's redirected read throws ENOENT, so the
browser never gets its script. This is an observed validation-tooling failure,
not evidence of a product regression. It is not a timeout-only failure eligible
for the prompt's isolated-retry allowance. The existing RR1b collector had not
reached this test. RR1c answer 7 covers any fresh non-luminance gate failure,
so the pipeline stops without repairing other tests, product code or collectors.

Before any browser run, copied **14,900 TP2d files** into
`tmp/overnight/RR1c/tp2d-backup/` and verified every SHA-256.
After all browser runs, **0/14900 historical files changed** against
those pins, including all three comparison composites. Calibration's native
Sharp writes produced byte-identical composites; the later temporary preload
also redirects Sharp.toFile into RR1c. No old composite was restored. The
backed-up comparison images were already RR1b-overwritten images and must not
be cited as original TP2d proof. `tp2d-before-hashes.json` and
`historical-audit.json` retain the full audit.

## Scope and readiness

STEP 0 is done; T is committed; STEP 1 is partial/FAILED. STEP 2 acceptance
completion X, STEP 3 manifest additions and STEP 4 validator/tests are NOT RUN.
QL1/QL1b still need an X-ending chain because TP2e changed their globals.css.
No historical PASS is promoted to current TP2e release verification.

Manifest backup: `readiness-evidence.json.bak-20261026032823-pre-rr1c`.
The manifest remains byte-identical, SHA-256
`b744f47cfebc88ca2118d6d003e3e8bef3a6870799e6de59ea354ee2c612da12`. All **16** original/prerequisite status/progress files
and **23** owner artifacts remain byte-identical; no tracked change was waived.
Inventory, planned-but-unrun commands and failure evidence remain under RR1c.
Prepared unused local scripts did not run STEP 2/3/4 or change the live queue,
runner or manifest. No other item's status/progress was edited.

Validation used repo-local TEMP/TMP/TMPDIR and caches, forward-slash preload
paths, EXPO_NO_DOTENV=1, EXPO_OFFLINE=1, telemetry off, env-file exclusion and
loopback-only Node/browser networking. No remote service, database/SQL,
deployment, Scheduler/email, env-file edit, push, OTA/EAS or device action ran.

## Owner steps remaining

- Correct the temporary collector's native esbuild output/read-path mismatch,
  then rerun the unfinished fresh gates at T, complete X and the five
  supersessions, and run the required readiness validator/tests. No product
  change or new owner decision is requested by this failure report.
- Rollout **NOT RUN**, skipped entirely: FS12 FULLSEND after successful local
  verification and readiness at a stable runner boundary.
- Device checks **NOT RUN**, skipped entirely: website/Realme Plan and Queue
  appearance in light/dark, Reduce Motion, native GL and physical performance.
- Live served revision/database/Scheduler/provider state, native GL/Realme,
  other browsers/assistive technology and physical FPS/power:
  **UNVERIFIED (owner to confirm)**.
- Vercel CLI is absent. Strongly recommend `npm i -g vercel` for future
  separately authorized env/deploy/log tooling; installation NOT RUN.

Endpoint: RR1c FAILED. No FS12, release, FULLSEND or next roadmap item started.
