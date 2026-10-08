# Knowledge Core — wavering orb light and Reduced Motion drift

2026-09-26 follow-up to the [neutron-star centre](neutron-star-core.md). Development lab only; production generation is unchanged.

## Owner direction, in order

1. "You took the neutron star too literally. The rotation is fine." The beams and sharp magnetic hot spots are removed. Rotation and the state-linked spin are unchanged.
2. The glow should pulse, as if it comes from the orb. A travelling light-front pulse was built and checked on the device (centre brightness range 43/255 across 14 frames).
3. "On second thought I don't like the pulsating, but I like the lighting. Have it be like wawwwawwwawaaww instead." The pulse is replaced by a continuous, irregular waver. The lighting model is kept.
4. Reduced Motion: "yes I want the slow drift instead" of freezing.

## What the light does now

- **Orb** (`coreOrb.ts`, renamed from `neutronStar.ts`): a white-hot centre with a cool limb. Broad soft lobes and faint currents turn with it, so the spin stays readable without looking like a pulsar.
- **Waver:** the overall brightness follows three overlapping rhythms (`orbShimmerLevel`: 2.1, 3.7 and 5.9 rad per clock unit). They never line up, so there is no regular beat.
- **Corona edge:** wavers around the orb like a flame instead of holding a perfect circle.
- **Ribbons:** still lit only on faces turned toward the orb. Patches of that light drift across them in different directions, and the edge glow wavers with them.
- **Shell rim:** catches the orb's light and wavers slightly.

Shimmer speed eases with momentum, like spin.

| State | Spin | Shimmer speed | Loop |
| --- | ---: | ---: | --- |
| Idle | 0.22 | 0.30 | running |
| Reading | 0.50 | 0.55 | running |
| Generating | 1.00 | 1.00 | running |
| Finalizing | 0.55 | 0.50 | running |
| Complete | 0.12 | 0.20 | running indefinitely |
| Error | 0 (winds down) | 0, light out | stops |
| Reduced Motion | ≤0.06 (~40 s / turn) | 0, steady glow | **running: slow drift** |

Reduced Motion now runs the whole scene at no more than 10% of the normal clock (`REDUCED_MOTION_RATE`) instead of freezing it. The light stays steady, because wavering light is the kind of motion the setting exists to avoid. Error remains the only stopped state, including when Reduced Motion is on.

## Device evidence (realme RMX3151, Expo Go, dev bundle)

Changed pixels between consecutive screenshots of the core region:

| Scenario | Changed pixels |
| --- | --- |
| Generating dark | 117k–152k |
| Generating light | 119k–148k |
| Complete dark (two samples, 4 s apart) | 53k–58k |
| Complete UC dark | 52k–56k |
| Reduced Motion (two samples, 4 s apart) | 21k–22k: drifting, not frozen |
| Error (two samples, 4 s apart) | 0 |

Screenshots in `device/orb-waver/`: `01-generating-dark`, `02-generating-dark-later`, `03-generating-light`, `04-complete-uc-dark`, `05-complete-dark`, `06-error-dark`, `07-reduced-motion-drift`. The waver itself is motion and is best judged live; screen recording is unavailable on this ROM.

## Performance

`dumpsys gfxinfo`, about 5 s windows. Android UI-frame timings, not direct GL FPS.

| Scenario | Frames | Janky | p50 / p90 / p95 / p99 |
| --- | ---: | ---: | --- |
| Idle dark | 303 | 5 (1.65%) | 7 / 11 / 20 / 22 ms |
| Generating dark | 302 | 4 (1.32%) | 8 / 10 / 21 / 22 ms |
| Complete dark | 301 | 6 (1.99%) | 8 / 11 / 21 / 23 ms |
| Reduced Motion drift | 307 | 2 (0.65%) | 7 / 9 / 19 / 21 ms |
| Generating + 6 taps | 353 | 7 (1.98%) | 9 / 12 / 22 / 23 ms |
| 7 rapid state deep links | 686 | 28 (4.08%) | 7 / 20 / 22 / 48 ms |

Jank is a little higher than the neutron-star run (0–0.6%) and p95 rose to about 20 ms. It is still in line with the original prototype's 1.35–2.04%. Samples are short development-build windows, so the difference is not established as a regression. GL mtrack 13,028 KB; total PSS 429,004 KB; thermal status 0, skin 34.1 °C. No `THREE.`, shader, `GL_INVALID`, fatal or OOM log matches.

## Checks

| Check | Result |
| --- | --- |
| Mobile typecheck | PASS |
| Mobile tests | PASS, 55 files / 582 tests (drift policy, shimmer policy and bounds, orb spin/stop, disposal) |
| Mobile lint | PASS, 0 errors; same four unrelated warnings |
| `git diff --check` | PASS |

## Remaining flaws

- The orb is still often hidden behind the front ribbons; its light carries the effect in those moments.
- Light mode glows less than dark; additive light can only tint the pale background.
- The strength of the waver was tuned from stills and brightness samples, not a recording. It needs the owner's live judgement.
- The shell still reads as a thin bubble, and some ribbon crossings still show seams.

Verdict: **PARTIAL.** The requested behaviour is implemented and confirmed on the device, pending the owner's live visual approval.
