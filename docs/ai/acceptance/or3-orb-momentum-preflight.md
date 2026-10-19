# OR3 orb interaction preflight

Status: **STOPPED before STEP 1**, 2026-10-19. This is a requirements
checkpoint, not completed orb implementation. Baseline `a68072f` on
`overnight/2026-10-15_feedback`; branch retained. No product file changed.

The full `tmp/overnight/prompts/OR3.md` was read, including its overriding
UNATTENDED rules. No question was sent to the absent owner. The material
requirements conflict below needs owner judgment under AUTOPILOT's baseline
and blocker rules; UNATTENDED rule 4 supplies the checkpoint/status/handoff
procedure. No permission to silently replace the specified physics or weaken
the required tests is inferred. This is an internal specification conflict,
not a production-access blocker or a contradiction in the ring implementation.

## Blocking conflict

OR3 requires exponential velocity decay `exp(-dt / 1.4)` and a stop below
`0.01 rad/s`, with the same friction during a held pause and after release.
Its Tests section also requires a **6 rad/s** flick to stop between **2.5 and
5 seconds**, and a **1 rad/s** drag to stop **under 2 seconds**.

For that exponential, `v(t) = v0 * exp(-t / tau)`, so the cutoff crossing is
`t = tau * ln(v0 / 0.01)`. With `tau = 1.4`:

| Initial velocity | Cutoff crossing | Required test | Compatible |
| --- | --- | --- | --- |
| 6 rad/s | 8.955701517 s | 2.5-5 s | No |
| 1 rad/s | 6.447238260 s | under 2 s | No |

Discrete frame sampling can only cross the threshold later. EMA sampling
cannot resolve this conflict because the tests specify the starting release
velocities. An extra speed-dependent brake, shortened tail, earlier cutoff,
or a different time constant would change the specified friction model.
Keeping the cutoff and pure exponential, both timing tests require roughly
`0.390812489 <= tau < 0.434294482`; `tau = 0.4` yields 2.558771862 s and
1.842068074 s. That is materially different from the requested 1.4 s.

**Exact owner question for a later attended run:** Should OR3 preserve the
specified `exp(-dt / 1.4)` friction and `0.01 rad/s` cutoff and revise the
stopping-time tests to approximately 8.96 s / 6.45 s, or preserve the required
2.5-5 s / under-2 s stopping tests and authorize a roughly 0.4 s time constant
(or explicitly specify a different braking model)?

## STEP 0 findings and resume map

- Tracked entry tree was clean. Existing untracked `UI/`,
  `apps/mobile/.gitignore`, `supabase/.temp/` and ignored `tmp/` were preserved.
  Cached upstream comparison: 2 behind / 33 ahead; no fetch.
- Read AUTOPILOT, current planning context, newest handoff, OR1b, TC1b and OR2
  handoffs, ADR-048, the shared model/tests and both platform orb adapters,
  samplers, bodies, auras, DayOrb and KnowledgeCore code. Inspected both ring
  move paths and TodayScreen's touch pause. Preflight is partial because of
  this requirements stop; implementation and full acceptance did not begin.
- Both DayRingClock components already create `orbInteraction` and pass it to
  the orb. The existing move callbacks can reach that handle without Today
  restructuring; no ring-path STOP condition was found.
- Body liquid uses `liquid(uSpin * x)`; light emission uses world-space
  `x - uLight` and `oc - uLight * uRadius`. Today supplies `tones.position`;
  KnowledgeCore defaults to the centered light. The sampler applies inverse
  drag pose only to liquid coordinates. Any tracking implementation must
  account for that distinction rather than rotating an aura alone and
  asserting the body light moved.
- Both aura adapters accept `offset` and `color` on every existing frame.
  Mobile's current SVG is declarative and fixed at 50%/50%, using `tones.aura`.
  Installed react-native-svg Shape exposes `setNativeProps`, so native ref
  updates warrant investigation before the approved removal fallback. No
  honest tracking attempt or final glow/removal decision is claimed here.
- Mobile DayOrb pauses under `dayOrbTouch.active` unless its own gesture is
  rotating. Ring-driven motion must bypass that condition once implemented.
- Existing neutral is KnowledgeCore light body `#E6EAF1`, in both body files.
  Current palette is gold/green/violet/orange and persists numeric indices.

Existing tests to change on resume:

- Shared `orb-interaction.test.ts`: existing two-second settling expectation,
  650 ms bulge envelope, gold-first/numeric-index validation, tap crossfade
  baseline and color-index assertions. Add the complete OR3 EMA/pause/ring/
  cancellation/Reduce Motion/ripple/key-migration cases after physics resolves.
- Both `orbBody.test.ts`: zero/default bulge, bulge uniforms and reset to
  authoritative generation colors become ripple coverage.
- Mobile `orbInteraction.test.ts` and web `orbInteraction.test.ts`: numeric
  storage and tap expectations become key migration/default/cycle coverage;
  retain touch priority, scroll/cancel and shader/sampler parity assertions.
- Mobile `KnowledgeCore.test.ts`: bulge assertions and old reduced-motion
  green result change; retain generation-state precedence and one-frame sleep.
- Mobile `DayOrb.test.ts`: static time-of-day halo expectations must reflect
  tracking or the explicitly approved removal choice. Existing aura tests
  need idle-to-generation color-reset coverage. Ring integration tests must
  prove actual move inputs push spin while release snapping does not.

## Acceptance matrix

| Requirement | Owning layer | Proof needed | Current result |
| --- | --- | --- | --- |
| Physics and stopping times agree | Shared | Consistent formula and exact tests | STOPPED: incompatible requirements |
| Smoothed velocity / pause / cancellation | Shared | Pure model regressions | NOT RUN |
| Ring impulse and handle priority | Mobile + web | Move/release/cancel tests | NOT RUN; existing handle reachable |
| Traveling ripple and normals | Both shaders | Identical shader text, uniform/boundary tests | NOT RUN |
| Idle glow tracks color/light or removal | Both renderers | Frame/color/halo tests | NOT RUN; decision pending |
| Pearl and one-time legacy migration | Shared + both stores | Key/cycle/migration/race tests | NOT RUN |
| Interaction scheduling and Reduce Motion | Both renderers | Wake/settle/sleep tests | NOT RUN |
| Full local gates and local commits | Repository | OR3 commands, exact counts | Docs checkpoint only |

## Verification

`node tmp/overnight/OR3-momentum-preflight.mjs`: **FRESH**, exit 1;
**6/6 mathematical diagnostic assertions PASS**, **0/2 required timing bounds
compatible** with the specified formula. This is the retained first diagnostic
result, not a failed or passing product test suite. It imports only Node's
assert module and makes no network request. No test was weakened or retried.

All nine implementation test/typecheck/lint/build commands and the additional
AUTOPILOT root build are **NOT RUN** after this stop (0 tasks/tests/builds).
Documentation diff hygiene and pre-existing-byte preservation are verified
separately in the handoff. No current product verification claim is made.

## Owner steps remaining

- Resolve the exact physics question above; then resume STEP 1-5, tests and
  all implementation gates. No product work is complete or superseded.
- **Rollout - NOT RUN, skipped entirely:** owner reviews a later completed
  implementation and chooses website/mobile publication separately.
- **Device checks - NOT RUN, skipped entirely:** after implementation, owner
  checks hard/gentle flicks, ring edges/block and move-hold-move-release,
  traveling tap ripple, tracked glow or approved absence, fresh pearl default,
  preserved existing gold choice and Reduce Motion on Realme and desktop.
- **UNVERIFIED (owner to confirm):** deployed revisions, database/applied
  migrations, Cloud Scheduler state, remote-ref freshness and actual device/
  authenticated-browser behavior. No live access was attempted.

No remote calls, deployment, migration/SQL application, Scheduler changes,
email, environment-file access/edit, branch switch, push, or deletion outside
the repository occurred. All tmp diagnostics/progress/status stay uncommitted.
