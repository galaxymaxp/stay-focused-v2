# OR2 / BACKLOG P14b: orb interaction

**PASS for the finite code scope: 8/8 prompt gates and all code steps complete.**

Baseline 67e9dc4 on overnight/2026-10-15_feedback. Finite scope: STEP 0-7,
local tests/gates/docs/local commits. Rollout and Device checks excluded.

STEP 0: inspected OR1b/TC1b handoffs, day/generation/Queue hosts, shaders,
aura and storage; both shaders have extendable vertex stages, existing RN
responders suffice; no new native module or APK requirement. No code blocker.
Mobile DayOrb and its DayRingClock visual host currently use pointerEvents=none;
Today touch handlers pause rendering, and day-ring-touch owns ring gestures.
Mobile KnowledgeCore previously used a full-frame imagebutton Pressable.
Web host/readout/SVG pass through to a full-clock day-clock-touch overlay;
KnowledgeCore previously used a full-frame pointerdown parallax response.
New ball targets must preserve ring priority in the overlapping 92..102 band.
Existing theme accent is neutral; the palette's first gold uses the existing
light.findActive #F4C542 token, followed by dark green/violet/orange tokens.

| Requirement | Owning layer | Proof | Status |
| --- | --- | --- | --- |
| Tap/hold/scroll classification; sticky scroll | shared | pure transitions + adapter tests | FRESH PASS (local) |
| Inertia, bounded bulge, 600ms color, RM | shared + scenes | model/shader/lifecycle tests | FRESH PASS (local) |
| Ball target, ring priority, pause | mobile | mounted responder + existing ring tests | FRESH PASS (local) |
| Device color persistence | platform storage adapters | read/write/failure tests | FRESH PASS (local) |
| Pan-y; delayed pointer capture | web | mounted pointer tests | FRESH PASS (local) |
| Job colors win; no new focusable UI | renderers | state/markup tests and review | FRESH PASS (local) |
| No extra idle frame loop | scenes | existing lifecycle + new animation checks | FRESH PASS (local) |

Production/device state: UNVERIFIED (owner to confirm).

## Verification record

All checks are local. The existing non-loopback socket guard is preloaded in
Node children; Expo offline/no-telemetry and Next/Turbo no-telemetry flags are
process-local. No environment file is changed. Build scripts were inspected:
Next compilation and Expo export only, with no deploy/migrate/email script.

| Gate | Final local result |
| --- | --- |
| npm run typecheck -- --force | FRESH PASS 8/8 tasks, 0 cached |
| npm run lint -- --force | FRESH PASS 8/8 tasks, 0 cached; 0 errors, six existing warnings |
| npm run test --workspace @stay-focused/shared | FRESH PASS 520/520 tests, 50 files |
| npm run test --workspace @stay-focused/mobile | FRESH PASS 1473/1473 tests, 150 files |
| npm run test --workspace @stay-focused/web | FRESH PASS 348/348 tests, 51 files |
| npm run build --workspace @stay-focused/api | FRESH PASS, 35/35 static pages |
| npm run build --workspace @stay-focused/mobile -- --platform android | FRESH PASS, one local Android bundle |
| git diff --check / staged / baseline-to-HEAD | FRESH PASS, 0 whitespace errors |

Additional AUTOPILOT npm run build -- --force --env-mode=loose:
FRESH PASS 8/8 tasks, 0 cached, including web 19/19 static pages and local Android/iOS/web exports. Initial full root build passed 8/8 tasks, 0 cached;
final build includes the zero-bulge shader fast path added in final review.
Shared initially passed 511/511 before build; rebuilding emits the new nine-test
compiled copy, so the post-build suite passes 520/520. Compiled copies and
outputs remain excluded from Git. Mobile initially passed 1473/1473 (150 files);
web initially passed 347/347, then 348/348 after adding drag-direction coverage.
No live provider, workflow or API behavior is changed; separate provider,
workflow and API full suites are NOT APPLICABLE. API compilation still runs.

Focused proof: shared model 9/9; mobile shader/halo/target 15/15; mobile
state-precedence/Reduce Motion renderer 6/6; web shader/persistence/pointer/
deferred still 8/8 before final extra parity/direction/RM-demand tests.
The final full suites include all of these tests. Shader text and platform
sampler parity are checked; shader runtime appearance is not claimed.

Failed first attempts and repairs (not hidden):

- A local edit script had a nested-template syntax error; no edit ran. Its
  subsequent focused command found no test file (0 collected, exit 1).
  The script was corrected and the test file created.
- Initial new generation-renderer fixture: 0 pass / 6 fail. The body mock
  omitted ORB_RADIUS, used by the real aura, which caused the renderer's safe
  fallback and then Node's PNG-loader error. Exporting the real constant in
  the mock fixed setup; retry 6/6. No runtime workaround or assertion removal.
- First full web suite: 346 pass / 1 fail because the new parity test compared
  complete source files with different pre-existing formatting. Scoped it to
  the exact vertex/fragment shader text and complete sampler, as required;
  retry 347/347, followed by final 348/348 with added direction coverage.
- First forced lint passed 8/8 with 12 warnings (six new missing interaction
  dependencies). Stable handles and complete effect/callback dependencies
  remove the six introduced warnings; final six existing warnings remain.
- No assertion failure in the full mobile/shared suites, nondeterministic
  flake, skipped required test, weakened validation or suppressed rule.
  Existing Vite config, React test renderer and Metro color warnings remain.

Final review confirmed one pure shared model, ref-based per-frame state,
scratch Three matrices, original idle cadence and visibility policy, listener/
controller cleanup, native ring responder lifecycle forwarding, guarded local
storage, state-color priority, and no new focusable UI or native dependency.
The common zero-bulge branch retains original vertex/normal math and avoids
idle displacement calculations. No extra frame loop, blur or render pass.

Implementation commits: 586e5bf (model), 6da7225 (uniforms), 5483726 (mobile),
39acf35 (web). Final verification status and the documentation commit are recorded
in the handoff and tmp/overnight/OR2.status. Logs, exports and scripts under tmp are
local validation artifacts and are intentionally uncommitted.

## Owner steps remaining

- **Rollout - NOT RUN, skipped entirely:** owner Preview OTA and website preview.
  No deployment, migration application/remote SQL, Scheduler operation, provider
  call, email, environment-file edit, branch switch or push was performed.
- **Device checks - NOT RUN, skipped entirely:** Realme and desktop Today,
  generation and Queue generation view: tap color/bulge, 250ms hold-drag and
  inertia, quick vertical swipe scrolling, immediate overlapping ring handles,
  Reduce Motion instant color/no bulge/no inertia, persistence after restart,
  running/failed/done state colors, narrow layouts, background and foreground.
  Confirm actual gesture arbitration, glass displacement/shading and power.
- **UNVERIFIED (owner to confirm):** deployed/installed revisions, production
  database rows/applied migrations, Cloud Scheduler state, remote-ref freshness,
  authenticated browser use, physical appearance/compositing and power.
- Vercel CLI is absent. For later owner deployment tooling, installing
  npm i -g vercel is strongly recommended. No installation or CLI call ran.

[ADR-048](../../architecture/ADR-048-orb-interaction.md) records the model,
uniforms, existing gold-token choice and platform tradeoffs. This endpoint is
OR2 only; no later roadmap work or physical acceptance is implied.
