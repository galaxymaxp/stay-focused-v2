# Knowledge Core — luminous, morphing ribbons

2026-09-26 follow-up to the user's request for glow, palette transitions and changing ribbon size/shape. Starting HEAD `afd4c37`, clean tree. Development lab only; production generation is unchanged.

## Delivered

- Replaced fixed ribbon meshes/materials with a GPU-evaluated periodic surface: continuously changing curvature, local twist (up to 0.4 radians) and width (±13%). Each ribbon has a different phase; the whole shell no longer breathes in scale.
- Normals are recomputed from the deformed surface in the vertex shader, so highlights follow the bending shape.
- Three-color gradients travel slowly along each ribbon, rather than flashing or cycling through a full rainbow. Default: blue/violet/teal; UC: rose/plum/peach. Light uses deeper colors and less glow. Theme changes ease into the new palette.
- A luminous edge plus a soft, expanded edge pass follows the same shape/clock. This is a bounded glow approximation, not an expensive full-screen bloom pipeline or true light transport.
- Opaque ribbon bodies use depth testing to remove the old transparent triangle/sorting artifacts. The outer shell remains translucent. The resulting material is closer to luminous satin than glass; this is not a claim that the original glass-artifact bar is met.
- Completion uses the existing nonzero 28% clock rate, including color flow and shape morphing. Error and Reduced Motion freeze rotation, palette flow and deformation; failure also dims/desaturates and removes the glow.
- React performance guidance kept animation outside React state updates. Geometry is shared between passes and explicitly disposed; a regression test checks clock sharing and cleanup. No dependency changes.

## Fresh verification

| Check | Result |
| --- | --- |
| Mobile typecheck | FRESH PASS |
| Mobile tests | FRESH PASS, 54 files / 576 tests |
| Mobile lint | FRESH PASS, 0 errors; same four unrelated import/first warnings |
| Diff check | FRESH PASS at commit gate |
| Realme rendering | FRESH: dark, light, UC dark, Complete, Reduced Motion and Error inspected |
| Reduced Motion | Four-second pair byte-identical |
| Error | Four-second core crops pixel-identical; whole screenshots differed due to status-bar clock |
| Complete | Four-second pair differs; same live clock continues without a stop timer |

Short generating-dark Android UI-frame sample: 305 frames, 0 janky frames, p50/p90/p95/p99 = 8/9/15/16 ms, high-input-latency and slow-UI counters both 0. This is only a five-second Expo Go UI sample, **not direct GL FPS**, a release benchmark or proof of sustained performance. Filtered recent logcat had no shader/GL/fatal/OOM matches; the existing Expo Go notifications warning remains. Long thermal/memory sampling was not repeated for this follow-up.

## Evidence and remaining acceptance

Screenshots in `device/ribbon-glow/`:

- `01-generating-dark.png`
- `02-generating-dark-later.png`
- `03-light.png`
- `04-uc-dark.png`
- `05-complete.png`
- `06-reduced.png`
- `07-error.png`

The previous capture set remains as historical baseline evidence. New screenshots show smoother, unbroken ribbons, visible luminous edging and separate color regions. Curved overlaps and changing silhouettes are visible across frames. Some crossing seams remain and the shell is still a thin bubble; no true refraction or grounding caustics. Overall B38.2.1 remains PARTIAL pending visual approval and direct/sustained render profiling. The requested glow/palette/morphing behavior is implemented. Phone left on Generating with controls for comparison.
