# B25.2.1 Generation orb animation repair

Date: 2026-09-14. Repository: `C:/Projects/stay-focused-v2`, branch `main`, starting HEAD `820c346`. Scope is limited to the Generation orb, its tests, physical evidence, and correction of prior orb-motion claims. Generation routes, polling, persistence, and backend behavior are unchanged. No B26 work was started.

## 1. Previous orb implementation

The previous orb was a layered SVG, not a static image. Its gradient body, light paths, orbit ellipses, and decorative points were nevertheless all static. One wrapper applied a 3.2-second breathing opacity/scale cycle and ±2° rotation. Touch compressed that wrapper and allowed bounded parallax. The result was technically animated container movement, but its internal light composition did not move and the physical presentation read as a still illustration.

## 2. Why it appeared static

The entire object moved as one unit, with only 4% opacity change, 5% scale range, and 4° total rocking. The highlighted regions, color balance, trails, and orbit details retained the same relationship to each other in every frame. Slow, synchronized wrapper motion therefore provided almost no visual evidence of a living object.

## 3. New animation architecture

The component remains React Native `Animated` plus `react-native-svg`; no image loop, shader, 3D engine, or new dependency was added. Six composited layers now move independently using native-driven transform and opacity values:

- a 7.5-second breathing halo;
- a softly irregular SVG body with opposing `scaleX`/`scaleY`, translation, rotation, and breathing scale;
- a 13-second pink/violet/blue spectrum wash that crossfades and drifts inside the body;
- independently drifting clipped light paths and rim highlights;
- an 18-second continuous orbital-light rotation with a sparse arc and restrained light points;
- a touch-light layer used only for interaction feedback.

All ping-pong channels use eased forward/reverse phases, while the 360° orbit is visually continuous at its reset. No React state or layout dimension changes per frame.

## 4. Touch behavior

Press/hold springs to 94% scale and increases the white/pink touch-light opacity. Release springs back. A completed tap adds a short 3.5% pulse before settling. Termination springs back without a pulse. The responder has no callback into generation admission, polling, cancellation, or navigation.

## 5. Focus/background lifecycle

Ambient motion starts only when all three conditions are true: `running`, route focused, and app active. Blur, background, terminal generation, and unmount stop the composite animation and each underlying value. Interaction values also reset on blur/background. On the physical device, navigating away and resetting frame statistics produced only one rendered frame during the next 10 seconds; sending Expo Go to Home produced zero frames during a second 10-second sample. Returning to Generation restarted visible motion.

## 6. Reduced motion

When reduced motion is enabled, no ambient loop starts. The orb holds a balanced static phase. Interaction scaling and tap pulse are suppressed; immediate light feedback may still show while pressed. Focused tests assert the static transform and absence of an ambient composite.

## 7. Physical-device result

Device: realme RMX3151, Android 13, authorized as ADB `device`. The actual Expo Generation route rendered the repaired composition. A non-producing acceptance ID kept the orb in its loading/generating presentation without creating or mutating a backend job; a safe unavailable notice appears below the core composition because no authenticated fixture result was supplied.

A 20-second active sample reported 1,177 rendered frames, 6 janky frames (0.51%), and 11/13/13/14 ms at p50/p90/p95/p99. Five Expo Go development-runtime samples used 54.8–62.0% of one core-equivalent while active; the matching off-route samples fell to 3.7–24.0%. Battery temperature moved from 28.7°C to 28.6°C. Tap and hold responded without visible lag. No crash, red screen, layout jump, runaway off-route animation, or obvious heat increase was observed. The device image does not expose private course material.

## 8. Visual comparison and evidence

Compared with `docs/design/references/v2-redesign/` and the approved showcase images, the repaired orb preserves the sparse centered Generation hierarchy and restrained pink/violet/blue palette. Its luminous body remains a little more geometric and larger than the reference's finer wispy field, but the independent highlight drift, deformation, color breathing, and orbital detail now produce the required living-object character. The effect remains calm rather than reading as a spinner, particle burst, or reactor.

Evidence:

- `device/generation-orb-frame-a.png` — active ambient phase on the real device;
- `device/generation-orb-pressed.png` — physical hold/compression state;
- `device/generation-orb-released.png` — settled state after release.

The device does not provide the Android `screenrecord` binary, so the evidence uses still interaction states plus frame statistics and automated lifecycle assertions rather than a recorded clip.

## 9. Tests

Focused orb tests: 4 passed. They cover focused/running lifecycle, background/inactive behavior, terminal state, reduced motion, press/release/tap behavior, and unmount cleanup. Full Mobile suite: 481 passed in 40 files. Mobile typecheck passed. Mobile ESLint passed with zero warnings.

## 10. Files changed

- `apps/mobile/src/features/redesign/GenerationOrb.tsx`
- `apps/mobile/src/features/redesign/GenerationOrb.test.ts`
- `docs/ai/acceptance/b25/motion-validation.md`
- `docs/ai/acceptance/b25.2/final-comparison-v2.md`
- this report and the three device evidence images

## 11. Git result

No commit or push was requested or performed. Existing unrelated dirty work was preserved. Generated Metro state and the temporary local acceptance server are disposable and excluded from the repository.
