# TP2e Plan glass pill: RR1b verification FAILED

Fresh local verification on 2026-10-26, branch `overnight/2026-10-15_feedback`,
HEAD `b383cd79`; latest implementation `c8cfb180`. The later RR1 commit
changes only documentation. **FAILED at STEP 1**, not release-ready.
RR1b's unattended gate-failure rule and owner answer 5 require recording the
failure and ending without product edits. No completion commit X was created.

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

No application source, assertion, deadline, dependency or environment file was
edited during RR1b. This report records verification of the accepted source;
it does not certify TP2e from historical TP2d or QL1c gates.

## Fresh results and exact commands

All logs below are under `tmp/overnight/RR1b/gates/`; exact commands and exits
are also in `tmp/overnight/RR1b/gates.json` and `receipts.jsonl`.

| Command | Evidence label and result |
| --- | --- |
| npm run test --workspace @stay-focused/shared -- --maxWorkers=1 src/plan-glass-renderer.test.ts src/plan-liquid.test.ts src/orb-body-renderer.test.ts | FRESH PASS, 9 passed / 0 failed / 0 skipped, 2 files, exit 0; focused-shared-final.log. There is no standalone orb-body-renderer.test.ts; plan-liquid.test.ts exercises createOrbBody and pins the exact sphere fragment. |
| npm run test --workspace @stay-focused/mobile -- --maxWorkers=1 src/features/redesign/PlanButton3d.test.ts | FRESH PASS, 7 passed / 0 failed / 0 skipped, 1 file, exit 0; focused-mobile.log. |
| npm run test --workspace @stay-focused/web -- --maxWorkers=1 src/features/today/plan-glass.browser.test.ts | FRESH FAIL, 17 passed / 9 failed / 0 skipped, 1 failed file, exit 1; focused-web.log. |
| Shared / mobile / web full suites | NOT RUN, 0 full suites; mandatory stop on the focused TP2e failure. |
| npm run typecheck -- --force | NOT RUN, 0 tasks. |
| npm run lint -- --force | NOT RUN, 0 tasks. |
| npm run build --workspace @stay-focused/api | NOT RUN, 0 builds. |
| npm run build --workspace @stay-focused/web | NOT RUN, 0 builds. |
| Offline Android JS/assets export | NOT RUN, 0 exports. |
| npm run build -- --force --concurrency=1 --env-mode=loose | NOT RUN, 0 tasks. |
| git diff --check / git diff --cached --check | FRESH PASS, 2/2 commands, exit 0, for the scoped documentation checkpoint; diff-final.log / cached-diff.log; initial working diff also passed (3/3 hygiene commands total). |
| Readiness validator --before FS12 / node --test fullsend/readiness.test.js | NOT RUN, 0 validator runs / 0 readiness tests; STEP 1 gate failure precedes STEP 4. |
| Workflow/provider/live suites | NOT APPLICABLE / NOT RUN; product behavior unchanged and remote calls prohibited. |

Total executed test cases: **33 passed / 9 failed / 0 skipped**. Application
checks: 2 passing commands and 1 failing command. Before the corrected shared
run, two launches failed to load the preload because backslashes in the quoted
Windows NODE_OPTIONS path were consumed. Each exited 1 with **0 tests run**;
both logs (focused-shared.log and focused-shared-retry.log) are preserved.
Forward-slash preload quoting corrected the launcher; no test was modified.
No cached result is claimed. No browser timeout or timing flake occurred in
this run. Low free memory (~199 MiB) was observed, but all nine failures are
numeric assertion failures, not deadlines.

## Gate blocker

Every dark-mode pearl/gold/green case at **390, 768 and 1280px** fails the
unchanged `expect(sm.minRowLuminance).toBeGreaterThan(.01)` at
`apps/web/src/features/today/plan-glass.browser.test.ts:166`.
Observed dark minimum-row luminance ranges from **0.0008619318695220024** to
**0.0014481439699167338**, below the required **0.01**. The 390px values are
pearl .0014227378693412844, gold .0009354441131291228 and green
.0008619318695220024. This assertion fails before the wave capture for each
dark case. All nine light-mode pairs and the eight other test cases pass.

Fresh Chromium/SwiftShader evidence is retained under
`tmp/overnight/RR1b/test-artifacts/TP2d/`: **31 PNGs, 18 paired-case metrics
files, 27 rest/wave metric samples**. The PNG total includes 27 rest/wave
captures, one actual-press image and three comparison composites; incomplete dark wave evidence
is not claimed as passing. Requested 390/1280 light/dark rest captures exist.
The 390 dark pearl capture was visually inspected locally. This is browser
harness evidence, not physical-device or live-site acceptance.

TP2e intentionally introduced darker liquid-lit glass. RR1b cannot decide
that this replaces an unchanged acceptance threshold, weaken the assertion,
or repair product code. A separately scoped fix item must reconcile the
implementation with the accepted contract and rerun the full fresh gates.

## Readiness evidence and scope

STEP 0 confirms the correct branch, QL1c/TP2e PASS prerequisites and docs-only
RR1 commit. QL1c's chain cannot use its old proof unchanged: TP2e alters
`apps/web/app/globals.css`, which was also changed by the QL1 partial chain.
The approved QL1/QL1b successors therefore need the fresh X-ending chain,
as do TP2c and RR1. **No supersession entry was added** because the fresh gate
failed before acceptance completion. STEP 2 completion, STEP 3 and STEP 4
are NOT RUN. RR1b is FAILED, not the allowed ready self-reference outcome.

The external manifest was backed up to
`readiness-evidence.json.bak-20261026-110051-pre-rr1b` and remains byte-identical
to that backup (SHA-256
`b744f47cfebc88ca2118d6d003e3e8bef3a6870799e6de59ea354ee2c612da12`).
All **14** prerequisite/original status/progress files remain byte-identical
to their inventory pins; all **23** untracked owner artifacts remain unchanged
and already match their exact leftLocal pins. No tracked change was waived.
Local evidence: `step0-findings.json`, `counts.json`, `failure-summary.json`,
`gates.json`, `receipts.jsonl` and the gate logs under RR1b.

Validation used repo-local TEMP/TMP/TMPDIR and npm/Turbo caches, telemetry off,
EXPO_NO_DOTENV=1, EXPO_OFFLINE=1, env-file exclusion and a loopback-only Node
network guard. JavaScript filesystem writes were redirected under RR1b;
the native Sharp writer bypassed that redirect as documented below. No remote service, database, deployment,
Scheduler/email, push, env-file edit, OTA/EAS, native build/install or device
action occurred. No readiness test fixture was created outside the repo.

## Evidence-write deviation

Sharp's native `toFile` bypassed the JavaScript filesystem redirection and
overwrote exactly these three ignored historical comparison composites:
`tmp/overnight/TP2d/pearl-comparison.png`, `gold-comparison.png` and
`green-comparison.png`. Their old bytes were not snapshotted and cannot be
restored from this run. These originals must no longer be cited as historical
TP2d imagery. The fresh images were copied into RR1b's capture folder and
their paths, timestamps and SHA-256 hashes are recorded in
`tmp/overnight/RR1b/evidence-write-deviation.json`. A modification-time audit
found no other changed files in TP2d's root; prior raw capture byte digests were
not collected, so this is not a pre/post hash proof for those raw captures.
All 14 status/progress pins, manifest bytes and 23 owner artifact pins remain
unchanged. No readiness supersession refers to these overwritten composites.
This is an accidental evidence-write scope deviation, recorded without
attempting to fabricate a restoration or historical PASS.

## Owner steps remaining

- Check-in: queue the TP2e gate-fix item, then rerun RR1b's affected full suites,
  required fresh gates, committed acceptance and supersession verification.
- Rollout: **NOT RUN**, skipped entirely; FS12 FULLSEND must rerun readiness
  after successful repair/acceptance and a stable runner boundary.
- Device checks: **NOT RUN**, skipped entirely; website/Realme Plan and Queue
  appearance, Reduce Motion, native presentation and physical performance.
- Live revision/database/Scheduler/provider state, native GL, other real
  browsers/assistive technology and physical performance are
  **UNVERIFIED (owner to confirm)**.
- Vercel CLI is absent. Strongly recommend `npm i -g vercel` for future
  separately authorized env/deploy/log tooling; installation NOT RUN.

Endpoint: RR1b only. No FS12, release or FULLSEND work started.
