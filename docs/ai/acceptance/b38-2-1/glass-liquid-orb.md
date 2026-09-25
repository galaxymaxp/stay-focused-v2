# Knowledge Core — liquid inside a glass ball

2026-09-26 redirection after [living ribbons](living-ribbons.md). Development lab only.

## Owner direction, in order

1. The ribbon version was "not hitting quite as expected". The owner referenced the Dribbble shot *Orb AI Motion* (Lalit for theosm™). The page could not be viewed: Dribbble serves a bot challenge to automated requests, so nothing here copies it.
2. "Don't like the ribbons as much anymore … either an orb with liquid inside or the orb's surface is waving or distorting." Both were prototyped as switchable lab styles.
3. "Neither style looks right, but … the liquid inside while having it inside a glass ball." The Wave style and the style switch were removed.
4. After the glass rebuild: "looks better, just remove the spotlight reflection." The softbox highlight was removed.
5. "Remove the particles and it's good." The Reading-state fragments (the last particles in the scene) were removed. So were the scene lights that only lit them, and the now-unused `intake` and `order` profile values. Reading is now distinguished by its spin, flow and shimmer. Rechecked on the device: Reading and Generating animate (218k–274k changed pixels between frames), Error holds at 0, and no GL errors.

## What it is now

- `orbBody.ts`: one clear, rigid glass sphere (radius 0.95), drawn as premultiplied-alpha glass. The page behind it shows through.
  - Each pixel follows the view ray, refracted at an index of 1.45, through the ball, and takes 5 samples of a swirling liquid field on the way. The field is sheets folded by two layers of sine flow.
  - The liquid is held inside a smaller volume, so a clear band of glass shows at the edge.
  - A light at the centre lights the liquid and shows through it.
  - Glass cues: a thin Fresnel rim, a dim studio reflection with a cool rim light (no spotlight), and a soft caustic on the far lower side.
- `orbAura.ts`: the wavering glow (same irregular rhythms as before), now drawn only outside the ball so it cannot fog the glass.
- `KnowledgeCore.tsx`: ribbons, particles, the old shell and the pulsar orb are removed.
  - Spin (now at most 0.9 rad/s, about one turn every 7 s) turns the liquid field.
  - State liveliness sets the liquid's turbulence.
  - A touch briefly stirs the liquid.
- Deleted: `livingRibbon.ts`, `coreOrb.ts` and their tests. New tests: `orbBody.test.ts`, `orbAura.test.ts`.

State behaviour is unchanged. Complete keeps moving slowly. Error is the only stop. Reduced Motion drifts at 10% of the clock with a steady glow.

## Device evidence (realme RMX3151, Expo Go, dev bundle)

| Scenario | Changed core-region pixels between frames |
| --- | --- |
| Generating dark | 191k–293k |
| Generating light | 107k–146k |
| Complete dark | 49k–128k: moving, slower flow |
| Reduced Motion | 2k–7k: slow drift |
| Error (two samples, 4 s apart) | 0 |

The Generating and Complete ranges overlap because liquid changes fill much of the ball's area even at a slower flow.

Screenshots in `device/glass-orb/`. `06-before-spotlight-removed` shows the version the owner said looked better, before the highlight was taken out.

## Performance

`dumpsys gfxinfo`, about 5 s windows. Expo GL renders through a TextureView, so these frames include the orb.

| Scenario | Frames | Janky | UI p50 / p90 / p99 | GPU p50 / p90 |
| --- | ---: | ---: | --- | --- |
| Generating, 7 samples | 308 | 1 (0.32%) | 18 / 21 / 22 ms | not captured |
| Generating, 5 samples (kept) | 307 | 2 (0.65%) | 17 / 21 / 23 ms | 13 / 18 ms |
| Complete, 5 samples | 310 | 1 (0.32%) | 9 / 21 / 24 ms | 5 / 18 ms |
| Touch (7 samples) | 360 | 1 (0.28%) | 18 / 21 / 24 ms | not captured |

Delivery holds at about 60 fps with very little jank. However, the per-pixel liquid is the heaviest renderer so far: GPU p50 is about 13 ms while generating, against about 4–5 ms for the ribbon scene. Headroom within the 16.7 ms budget is small, so a longer thermal soak and a release build are needed before production. GL mtrack 11,692 KB; thermal status 0; no GL, shader, fatal or OOM log matches.

## Checks

Mobile typecheck PASS. Tests PASS, 55 files / 582 tests. Lint 0 errors (four unrelated warnings). `git diff --check` PASS.

## Remaining flaws

- The liquid reads as soft grey fog more than defined liquid. The centre light is faint in several frames.
- In light mode the ball reads close to a white sphere; the glass edge is its main definition.
- GPU cost, as above.

Verdict: **PARTIAL.** The direction is chosen by the owner and refinement continues.
