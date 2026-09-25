# Knowledge Core design QA

Latest follow-up: [glow/palette/shape refinement](docs/ai/acceptance/b38-2-1/ribbon-glow-refinement.md). Opaque, shader-deformed ribbon bodies remove the original transparent facets; luminous edges and palette flow are now implemented. Original findings below are baseline findings: satin-like material, crossing seams and weak shell/refraction still prevent glass-artifact approval. Fresh tests 576/576, typecheck and lint pass; seven new realme captures are recorded.

Status: **BLOCKED — visual approval / production integration**, 2026-09-26.

Scope: B38.2.1 development prototype only. The latest motion requirement is implemented and physically checked: Complete stays slowly alive; Error stops, with Reduced Motion/background exceptions.

## Evidence

- [Selected concept versus realme implementation](docs/ai/acceptance/b38-2-1/device/source-vs-device.png)
- [All physical states and themes](docs/ai/acceptance/b38-2-1/device/contact-sheet.png)
- [Full audit, verification and measurements](docs/ai/acceptance/b38-2-1/generation-core-prototype.md)

## Open findings

| Priority | Finding | Acceptance needed |
| --- | --- | --- |
| P1 | Transparent ribbon intersections look faceted/plastic, not glass or liquid | Stable overlapping material and coherent inner form across rotating poses |
| P1 | Thin bubble shell lacks refraction and grounding light | Convincing shell thickness, separation and environmental lighting on realme |
| P1 | UC accent becomes surface paint; dark ribbons wash out | Neutral base with accent illumination rather than dominant pink surfaces |
| P2 | Fine edge/seam aliasing, discernible fragment cycles | Cleaner edges and less obvious intake repetition |
| P2 | UI frame statistics do not establish actual GL pacing | Direct GL-frame timing, signed-build and sustained memory/thermal evidence |

## Passed functional checks

Six states, four themes, fixed status/visual composition, actual 3D interior movement, continuous slow completion, stopped failure, stopped Reduced Motion simulation, return from background and mobile automated gates. React lifecycle review added pause/resume cleanup, system Reduced Motion and 44-point control targets.

These functional checks do not override the open visual findings. Verdict: PARTIAL.
