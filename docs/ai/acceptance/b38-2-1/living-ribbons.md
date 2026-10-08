# Knowledge Core — living ribbons

2026-09-26 follow-up to the [wavering orb light](orb-light-waver.md). Owner request: "can you make [the ribbons] move organic? like they're alive". Development lab only.

## Before

Each ribbon was a nearly rigid closed band. Its shape drifted slowly, and most of the visible motion was whole-band rotation, which read as mechanical.

## What changed (`livingRibbon.ts`, `KnowledgeCore.tsx`)

The ribbon surface is still evaluated on the GPU from one closed curve. It now carries several travelling motions:

- **Swimming:** waves travel along each ribbon and push it out of its plane, like an undulating fin.
- **Breathing body:** the ribbon swells and narrows in travelling bands.
- **Rolling twist:** twist travels along the length instead of the band turning rigidly.
- **Changing width:** width varies in travelling bands along the ribbon.
- **Cupping:** the cross-section cups and flattens over time.
- **Ruffle:** a soft ruffle runs along the edges.

Waves along the loop use whole-number frequencies, so the ribbon stays seamless. Their speeds are unrelated, so the motion does not settle into a visible loop.

A new eased `uLife` amount (0.35 + 0.65 × activity; 0.15 under Reduced Motion) scales these motions. It eases like spin and shimmer, so a state or Reduced Motion change never snaps the shape. Speed still comes from the shared animation clock: full while generating, 28% once complete, 10% under Reduced Motion, and stopped on Error.

The first device pass was too crumpled at full strength (sharp folds, lost silhouettes, orb buried). Amplitudes were cut by about a third and wave speeds by about a quarter.

The vertex shader now computes each position's frame once and reuses it for the across-ribbon normal sample. That is 6 curve evaluations per vertex instead of 9. The mesh is 128 × 12 segments (previously 128 × 10).

## Device evidence (realme RMX3151, Expo Go, dev bundle)

Changed pixels between consecutive core-region screenshots:

| Scenario | Changed pixels |
| --- | --- |
| Generating dark | 143k–161k |
| Generating light | 126k–146k |
| Idle UC light | 110k–123k |
| Complete dark (two samples, 4 s apart) | 45k–55k: alive and calm |
| Reduced Motion (two samples, 4 s apart) | 29k–34k: slow drift |
| Error (two samples, 4 s apart) | 0 |

Screenshots in `device/living-ribbons/`. `02-generating-sequence` shows eight consecutive frames after tuning. These captures predate the shader restructure, which changed only the mesh density along the ribbon (160 → 128); the shape math is identical.

## Performance

`dumpsys gfxinfo`, about 5 s windows, Android UI-frame timing (not direct GL FPS).

| Scenario | Frames | Janky | p50 / p90 / p95 / p99 |
| --- | ---: | ---: | --- |
| Idle dark | 307 | 3 (0.98%) | 7 / 13 / 22 / 24 ms |
| Generating dark (after restructure) | 306 | 3 (0.98%) | 7 / 21 / 22 / 23 ms |
| Complete dark (after restructure) | 306 | 3 (0.98%) | 7 / 19 / 23 / 25 ms |
| Generating + 6 taps | 357 | 3 (0.84%) | 9 / 21 / 23 / 26 ms |

p90 rose from about 10 ms in earlier runs to about 20 ms. A back-to-back A/B with the previous commit (`f11c3fb`, stashed) under the same conditions shows it was not caused by the ribbons:

| Build | Generating | Complete |
| --- | --- | --- |
| Previous commit | 3.38% janky, p90 21 ms | 0.98% janky, p90 20 ms |
| Living ribbons | 1.32% janky, p90 12 ms | 0.65% janky, p90 21 ms |

The shift is in the device or session state. Its cause is not identified. GL mtrack 12,160 KB; thermal status 0, skin 34.1 °C; no GL, shader, fatal or OOM log matches.

## Checks

Mobile typecheck PASS. Tests PASS, 55 files / 582 tests (the ribbon test now also checks that the body and glow passes share `uLife`). Lint 0 errors (four unrelated warnings). `git diff --check` PASS.

## Remaining flaws

- At some angles the three ribbons bunch into a dense mass and hide the orb.
- Edge glow can outline a fold sharply where a ribbon ruffles toward the camera.
- Tuned from still frames and pixel-change samples; the live feel still needs the owner's judgement.

Verdict: **PARTIAL**, pending the owner's live approval.
