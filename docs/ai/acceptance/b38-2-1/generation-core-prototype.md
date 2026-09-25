# B38.2.1 — Knowledge Core visual prototype

Latest revision: [luminous, morphing ribbons](ribbon-glow-refinement.md) adds glow, flowing three-color palettes and changing width/twist/curvature, with 576 passing tests. The original measurements, transparent-ribbon implementation and screenshots below are the historical baseline, not the latest renderer. Production approval remains PARTIAL.

Date: 2026-09-26. **PARTIAL — prototype works but visual/performance quality is not yet sufficient.**

The user's latest motion requirement is implemented: completion decelerates into continuous motion; failure stops. Reduced Motion and offscreen/background suspension remain intentional exceptions. This is a development lab, not a production generation replacement.

## Starting state and scope

- Repository: `b25-3-3-work`; branch: `b25-3-3-ai-first`; starting HEAD: `6709d26`.
- Initial working tree was clean. Existing B38.2 repairs were preserved.
- Physical device: realme RMX3151, Android 13, 1080×2412, 480 dpi (approximately 360 dp width), connected through ADB.
- Prototype runs in Expo Go with the local SDK 54 development bundle. The installed standalone app remains unchanged. No push, EAS update, backend call, real generation, migration, auth change, Queue persistence change, or production visual replacement was performed.

## Existing animation audit

`apps/mobile/src/features/redesign/GenerationVisual.tsx` owns the existing 280-point SVG field. It uses React Native Animated transforms with native-driver orbit/breathing loops, dashed ellipses, gradient lines, dots, a halo and a rounded page mark. Its only job inputs are `running` and `completed`; theme inputs come from `useTheme` (`active`, `colors`, `mode`, `reducedMotion`) and navigation focus. It pauses on reduced motion/inactivity and settles on completion.

`apps/mobile/src/features/redesign/GenerationScreen.tsx` owns confirmation, three-second GenerationView polling, persisted-artifact caching, Queue and result navigation. `apps/mobile/app/(app)/generation.tsx` hosts that screen. Reviewer, Quiz and Activity share the same visual path. Queue lifecycle and navigation do not belong in a renderer.

Weaknesses: planar rings and icon construction; no real volume, camera, internal occlusion or glass material; only binary activity/completion inputs. These files remain unchanged.

## Renderer investigation and decision

| Candidate | Strength | Finding / cost |
| --- | --- | --- |
| React Native Skia runtime effects | GPU fragment shading, gradients, masks, noise and displacement; can be coupled to Reanimated without React frame renders | Tried procedural shell and displaced concept-image approaches. The image remained a wobbling still and was explicitly rejected by the user. A convincing raymarched scene is possible but was not delivered or benchmarked here. |
| Expo GL + Three.js | Real geometry, perspective, depth, lighting and independent internal movement | Selected for the revised prototype. Native GL/JS bundle cost is higher; transparency sorting and material quality remain problems. |

The selected implementation uses `expo-gl ~16.0.10`, `three ^0.166.1` and `@types/three ^0.166.0`. It does not use expo-three, a bitmap, video, Skia or Reanimated. The attempted expo-three wrapper was removed after compatibility problems. There is no comparative release-build benchmark or measured bundle-size delta, so no claim that this is the fastest renderer.

[Expo GL documentation](https://docs.expo.dev/versions/latest/sdk/gl-view/) confirms the OpenGL ES view and Expo Go support; it also distinguishes GL worklets from Three.js, which cannot simply run inside them. Here requestAnimationFrame and scene updates run on JS; shading/rasterization runs on GPU. This is **not** a UI-thread-only animation.

The user's [NeuraDesk reference](https://dribbble.com/shots/26482673-NeuraDesk-AI-Productivity-Workspace) describes a Blender object animated in After Effects. Its page text was inspected; its complete animation was not visually replayed. It is a direction reference, not evidence that this realtime prototype matches it.

## Construction and component architecture

- `coreModel.ts`: six named states, bounded activity/intake/order/completion/error profiles, accessible copy, theme selection, tested completion clock policy.
- `KnowledgeCore.tsx`: one retained scene, perspective camera, asymmetric deformed icosahedral shell, translucent inner mesh, three custom curved ribbon meshes, 90 small internal points and three attracted fragments.
- Shell: low-opacity Fresnel-style shader with directional highlights. Inner meshes: custom shader plus physical ribbon materials. Lighting: hemisphere, directional key and point accent. These are stylized approximations, **not true refraction, caustics or a liquid simulation**.
- `GenerationCoreLab.tsx`: fixed 320-point visual area, status/source/detail regions, six state buttons, four palettes and Reduced Motion simulation. Queue button is explicitly disabled in this simulation. No Queue or job imports.
- `/generation-core-lab` redirects away in production; Appearance exposes its entry only under `__DEV__`. Query presets permit repeatable captures without authentication or paid generation.
- Scene resources are created once and disposed on unmount/context replacement. State changes update refs and eased uniforms, not React on each frame. Reused colors avoid explicit per-frame Color allocation.
- App background/navigation blur suspend the frame loop; returning resumes its existing clock. The React best-practices review prompted explicit lifecycle cleanup, system Reduced Motion support and 44-point lab controls.
- Touch makes a small, decaying camera/material response; it does not drag the object. No gyroscope.

Example: `exp://127.0.0.1:8081/--/generation-core-lab?preset=complete-dark` over `adb reverse tcp:8081 tcp:8081`. Add `-capture` to hide controls; `-reduced` simulates Reduced Motion; UC keys are `uc_light` and `uc_dark`. Local server: `npx.cmd expo start --go --offline --port 8081`.

## Motion language

| State | Implemented behavior |
| --- | --- |
| Idle | Slow rotation, quiet internal drift and small deformation; no intake fragments. |
| Reading | Three fragments follow inward trajectories; internal activity increases. |
| Generating | Highest internal rotation/deformation, brighter points and material; limited intake. |
| Finalizing | Eases activity down and shape order up; intake fades out. |
| Complete | Cleaner/brighter edge and 2.5% scale resolution; eases clock to 28% speed, never to zero. Activity also drops to 0.04. No reset, confetti, bounce or completion timeout. |
| Error | Animation clock/rotation stop; material dims/desaturates through a short settling period; explanatory text remains. |

Profiles ease on the retained scene; intake and emissive strength also interpolate. Complete preserves the accumulated pose/time instead of remounting. Error and Reduced Motion retain a dimensional scene and allow bounded light settling. System Reduced Motion OR the simulation toggle suppresses continuous motion in every state. The physical OS setting itself was not changed.

## Real-job mapping proposal — not integrated

Source: `apps/api/src/lib/experience/mappers.ts:137` (`generationView`) and shared ProcessingJob stage types.

| Actual state / stage | Existing GenerationView | Proposed core |
| --- | --- | --- |
| `queued` | `queued` | Idle |
| Running `preparing_source`, `normalizing_source`, `detecting_outline`, `planning_sections` | `preparing` | Reading |
| Running `generating_sections`, `verifying_coverage`, `retrying_sections`; remaining running stages | `generating` | Generating |
| Running `assembling_reviewer`, `storing_reviewer` | `finalizing` | Finalizing |
| `succeeded` without an artifact ID | `finalizing` | Finalizing; never claim saved success early |
| `succeeded` with artifact ID | `completed` | Complete, continuously slow |
| `failed`, `expired` | `failed` | Error |
| `cancellation_requested`, `cancelled` | `cancelling`, `cancelled` | Needs a separately approved neutral cancellation treatment; do not falsely report failure or success |

No percentages or fabricated progress. Future integration should consume the existing GenerationView; job ownership, persistence and navigation stay in their current owners.

## Physical-device evidence

Fresh final-code capture set was inspected in full-screen samples and the contact sheet. All six states, four themes, Reduced Motion simulation and a return from the Android home screen rendered on the realme. The completed preview was left open with controls.

| Check | Result | Evidence / limitation |
| --- | --- | --- |
| Light / Dark | FUNCTIONAL; VISUAL PARTIAL | Legible composition, no clipping; dark shell is faint, light shell reads as a bubble. |
| UC Light / UC Dark | FUNCTIONAL; VISUAL PARTIAL | Theme tokens applied; pink/crimson occupies too much ribbon surface rather than just light accents. |
| Reading | FUNCTIONAL | Inward fragments appear; phase cycling is still discernible. |
| Generating | FUNCTIONAL | Independently changing interior silhouette, not image displacement. |
| Finalizing | FUNCTIONAL | Intake fades and activity/order settle on retained scene. |
| Complete | FUNCTIONAL | Two actual completed-state captures six seconds apart show changed interior pose. Tests lock a nonzero settled clock rate. No finite-duration stop is scheduled. |
| Error | FUNCTIONAL | Frames four seconds apart after settling were byte-identical; dim failure state visually inspected. |
| Reduced Motion | SIMULATION PASS | Generating frames four seconds apart after settling were byte-identical; scene remains layered. OS-toggle acceptance NOT RUN. |
| Touch | FUNCTIONAL | Five taps during generating did not interrupt the scene or navigation; bounded camera response implemented. |
| Background / resume | SMOKE PASS | Android Home and return reopened the live scene without a crash. Exact pose continuity was not instrumented. |

Comparison hashes for stopped-state pairs: Reduced Motion `bec42d9dd915d73ce8a7431c7724ba33d9c2bc52713aa32c8b92ddfbbc1e9538`; Error `102491680d7ed82f5c35957f0103e284adb42f555a6e4f7e0e5ae5a25348e077`. Reduced-motion hash pair includes a development warning toast later dismissed for the acceptance screenshot. Earlier sign-in/loading captures were replaced, not used as evidence.

## Performance

Fresh `adb shell dumpsys gfxinfo host.exp.exponent reset` followed by short samples on the final bundle. Steady-state windows were approximately five seconds after two seconds of settling. Transition sample included seven deep-link state changes, approximately two seconds apart. All samples are development Expo Go, not a release binary.

| Scenario | UI frames | Janky frames | p50 / p90 / p95 / p99 | High-input-latency / slow-UI counters |
| --- | ---: | ---: | --- | --- |
| Idle Light | 294 | 6 (2.04%) | 7 / 10 / 12 / 21 ms | 174 / 0 |
| Idle Dark | 297 | 4 (1.35%) | 7 / 10 / 18 / 22 ms | 209 / 0 |
| Reading Dark | 297 | 5 (1.68%) | 7 / 10 / 11 / 21 ms | 139 / 0 |
| Generating Dark | 298 | 5 (1.68%) | 7 / 12 / 22 / 23 ms | 193 / 0 |
| State transitions | 773 | 34 (4.40%) | 7 / 11 / 21 / 44 ms | 464 / 15 |
| Generating + five taps | 333 | 9 (2.70%) | 7 / 11 / 21 / 23 ms | 215 / 0 |

These measure Android window/UI frame timing, **not the independent GL surface's delivered FPS**. No direct GL FPS claim. Jank is below the older B38.2 17% sample, but the workflows differ; this is not proof of a like-for-like improvement. High input-latency counters remain unexplained and require focused tracing before approval.

Across the subsequent multi-state/theme capture run: total PSS 433,148 → 434,478 KB (~1.3 MiB increase); RSS 525,108 → 474,680 KB; GL mtrack 33,756 → 33,800 KB. Swap PSS increased 7,776 → 63,115 KB, so falling RSS must not be presented as a memory optimization. This bounded sample is not a leak test.

Current HAL temperatures: CPU/GPU 34.509 → 36.070°C, skin 28.055 → 29.419°C, battery 25.35 → 25.65°C. Thermal status remained 0. Separate cached 47.936°C readings were not treated as current measurements. No long-duration thermal/battery soak.

Filtered recent logcat found no `THREE.WebGL`, shader-error, `GL_INVALID`, `FATAL EXCEPTION` or `OutOfMemoryError` matches in the checked window. Expo Go reports its existing unsupported Android push-notification warning. No observed scene crash. No proof of zero warnings outside the sampled window. Metro's earlier full development bundle took about 21 seconds; isolated scene startup and release bundle delta are NOT MEASURED. Screen recording NOT RUN (device ROM lacks screenrecord).

## Visual-quality assessment and remaining flaws

**Production integration is blocked on visual quality.** The selected concept and actual device implementation are explicitly separated in `device/source-vs-device.png`.

- Depth: real perspective and changing front/back arrangement are present. Yet the thin shell reads as a bubble and the inner volume does not read as dense liquid.
- Material: ribbon crossings expose abrupt transparent facets and dark triangular gaps. They look like folded translucent plastic, not the selected glass artifact. This is the primary rejection.
- Lighting: restrained but not optically convincing. Fresnel approximations do not produce refraction, internal absorption, caustics or a grounding light/shadow. Deformed normals remain approximate.
- Motion: continuous, state-based and slower after completion; no still-image wobble. Short frame pairs cannot prove long-term non-repetition; intake paths visibly cycle.
- Identity: custom geometry differs from the old icon and common voice-assistant gradients, but currently still has a procedural-demo character.
- Edges: silhouette mostly holds at phone size; fine stair-stepping/transparency edges and seams remain visible. No claim of alias-free output.
- Bloom/banding: no heavy blur or postprocess bloom conceals detail; no prominent banding observed. Missing optical softness is not the same as achieving convincing glass.
- Color: not full rainbow, but UC variants become pink painted ribbons and dark neutral variants wash toward pale lavender.
- Composition: stable status region, no visual/text overlap, useful scale inside 320-point frame; material refinement is more urgent than layout.

Next action: refine the inner geometry/transparency and glass-lighting model against the selected concept on the realme, then repeat visual and direct GL-frame acceptance **before production integration**.

## Screenshot inventory

All paths relative to this report:

1. `device/01-idle-light.png`
2. `device/02-idle-dark.png`
3. `device/03-reading-dark.png`
4. `device/04-generating-dark.png`
5. `device/05-finalizing-dark.png`
6. `device/06-complete-dark.png`
7. `device/07-uc-light.png`
8. `device/08-uc-dark.png`
9. `device/09-reduced-motion.png`
10. `device/10-error-dark.png`
11. `device/contact-sheet.png` — labelled overview of actual captures.
12. `device/source-vs-device.png` — concept versus actual implementation; left panel is not a device capture.

## Automated verification

| Check | Result |
| --- | --- |
| `npm.cmd run typecheck --workspace @stay-focused/mobile` | FRESH PASS |
| `npm.cmd run test --workspace @stay-focused/mobile` | FRESH PASS, 53 files / 574 tests, including five core-model tests |
| `npm.cmd run lint --workspace @stay-focused/mobile` | FRESH PASS, 0 errors, four pre-existing import/first warnings in unrelated service tests |
| `git diff --check` and staged equivalent | FRESH PASS at commit gate |
| Release build / production integration / actual jobs | NOT RUN / deliberately out of scope |

First plain `npm` attempt was blocked by PowerShell script policy; `.cmd` succeeded without changing that policy. First sandboxed lint attempt failed when ESLint traversed the user directory for path-case checks; the approved unsandboxed retry produced the reported result. Ordinary online Expo startup failed to fetch; offline Metro plus ADB reverse succeeded. Do not erase these failed attempts from the acceptance history.

The initial staged diff check found an extra blank line at the new route's EOF; it was removed and the staged check passed before implementation commit `0ddd128` (`feat(mobile): prototype 3d generation knowledge core`). Documentation/evidence are committed separately. Nothing was pushed.

## Integration recommendation

Keep this as a dev-only prototype. Preserve the production SVG and all existing generation/Queue behavior. A production decision requires convincing materials, a neutral cancellation design, direct GL pacing, a longer memory/thermal run and a signed-build check. The latest continuous-completion behavior is accepted functionally; the signature visual is not yet approved.
