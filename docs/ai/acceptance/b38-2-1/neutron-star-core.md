# Knowledge Core — neutron-star centre

2026-09-26 follow-up. The user's request: the orb in the middle should shine like a neutron star and spin according to the generation state. Development lab only; production generation, Queue, API and schemas are unchanged.

Starting HEAD `afd4c37`. Inherited uncommitted work from the previous session (GPT-5.6 Sol): the staged [luminous ribbon](ribbon-glow-refinement.md) pass, followed by unstaged changes that made the ribbons achromatic silver, added a small matte centre sphere and a faint flat glow sprite. That palette change is kept. The matte sphere and flat sprite are replaced.

## What changed

- `neutronStar.ts` (new): a compact star (radius 0.19) whose centre burns white and whose limb is cool blue-white. Two magnetic hot spots sit on an axis tilted 0.62 rad from the spin axis. Surface currents are fixed in object space, so the rotation shows on the sphere itself. Two soft additive beams follow the magnetic axis and sweep as the star turns (a lighthouse effect). A tight corona is hidden by ribbons in front of the star. A faint wide halo scatters over the whole volume.
- `livingRibbon.ts`: ribbons receive light from the star's live view-space position. Only faces turned toward the star catch it, so the outer faces keep their silver shading and the inner faces glow. This gives real depth cues rather than a flat bloom.
- `coreModel.ts`: each state profile gains `spin`, and `coreSpinTarget()` gives the target speed.
- `KnowledgeCore.tsx`: spin eases with momentum between states. The render loop keeps running until the spin reaches its target, so Error winds the star down instead of cutting it off. A touch briefly heats the star. The scene is now rebuilt if its effect re-runs on a live GL context. Previously Fast Refresh (and StrictMode's effect replay) disposed the scene and left a frozen frame.

| State | Spin (share of 2.6 rad/s) | Star | Loop |
| --- | ---: | --- | --- |
| Idle | 0.22 (~11 s / turn) | warm glow, faint beams | running |
| Reading | 0.50 | brighter | running |
| Generating | 1.00 (~2.4 s / turn) | hottest, strongest beams and inner light | running |
| Finalizing | 0.55 | cooling | running |
| Complete | 0.12 (~20 s / turn) | calm, steady glow, slow beam sweep | **running indefinitely** |
| Error | 0 (winds down) | dormant grey, glow and beams out | stops after spin-down |
| Reduced Motion | 0 immediately | still glows, no rotation | stops (unchanged policy) |

Complete continues slow animation: **YES**. Error is the stopped state: **YES**. Reduced Motion still freezes all motion, as in the previous session. The handoff asked whether a very slow drift would be preferable there; that decision is left to the owner rather than changed silently.

## Device evidence (realme RMX3151, Expo Go, dev bundle)

Changed pixels between consecutive screenshots of the core region (threshold 12/255):

| Scenario | Changed pixels |
| --- | --- |
| Generating dark | 118k–138k per frame pair |
| Complete dark (two samples, about 6 s apart) | 39k–52k: clearly alive, far calmer |
| Generating → Error, back-to-back captures | 162k → 3.6k → 124 → 1 → 0 (graceful wind-down in about 1.5 s) |
| Error after settling | 0, 0, 0 |
| Reduced Motion after settling | 0, 0, 0 |

Screenshots in `device/neutron-star/`: `01-generating-dark`, `02-generating-dark-later`, `03-generating-light`, `04-generating-uc-light`, `05-generating-uc-dark`, `06-complete-dark`, `07-error-dark`, `08-reduced-motion-dark`.

## Performance

`dumpsys gfxinfo host.exp.exponent` over about 5 s windows. These are Android UI-frame timings, **not direct GL surface FPS**.

| Scenario | Frames | Janky | p50 / p90 / p95 / p99 |
| --- | ---: | ---: | --- |
| Idle dark | 306 | 0 (0.00%) | 7 / 9 / 10 / 18 ms |
| Generating dark | 301 | 0 (0.00%) | 7 / 9 / 10 / 18 ms |
| Complete dark | 308 | 1 (0.32%) | 7 / 9 / 9 / 18 ms |
| Generating + 6 taps on core | 354 | 2 (0.56%) | 9 / 10 / 10 / 17 ms |
| 7 rapid state deep links | 675 | 19 (2.81%) | 7 / 9 / 10 / 44 ms |

After the run: GL mtrack 10,704 KB, total PSS 416,145 KB, thermal status 0, skin 34.1 °C, battery 26.1 °C. CPU/GPU showed the same 47.936 °C value that earlier sessions identified as cached, so it is not reported as a measurement. Filtered logcat showed no `THREE.`, shader, `GL_INVALID`, fatal or OOM entries. No long soak was run.

## Checks

| Check | Result |
| --- | --- |
| Mobile typecheck | PASS |
| Mobile tests | PASS, 55 files / 580 tests (new: spin policy, star spin/stop, glow-off on failure, disposal) |
| Mobile lint | PASS, 0 errors; same four unrelated import/first warnings |
| `git diff --check` | PASS |

## Remaining flaws

- The star is often hidden behind the front ribbons (see `06-complete-dark`). The spin is then only readable through the lit inner faces and beams. Thinner or more open ribbons, or a slightly larger star, would help.
- Light mode shines noticeably less than dark. Additive light over a pale background can only tint it, so there the star reads as a cool-lit ball rather than a light source.
- Beams are subtle at phone size and mostly visible where they cross dark gaps.
- The shell still reads as a thin bubble, and ribbon crossings still show some seams (unchanged from earlier notes).
- Error drains the ribbons to mid-grey; this could be slightly darker to feel more dormant.

Verdict: **PARTIAL.** The neutron-star centre, state-linked spin, living Complete and stopped Error are implemented and confirmed on the device. Signature-quality approval and production integration remain open.
