# ADR-052: Resolved orb sampling and bounded tap waves

Status: Accepted for OP2's owner-authorized local scope, 2026-10-20.

OP2 supersedes ADR-048's single restarted ripple and OA1's four procedural
ambient lobes/paper whitening. The owner asks for cumulative waves and a
backdrop that follows the visible body's dark and light structure.

The pure interaction model retains at most eight timestamped hemisphere
impulses. Each packet lasts 1.8 seconds, travels a great circle and has a smooth
attack/decay. Nonnegative squared-sine crests prevent half-period tap intervals
from cancelling earlier energy. A bounded shared energy gain strengthens the
retained fronts, with 120ms attack, 1.2s decay and the packet's smooth endpoint
envelope; expiration cannot create a gain jump. One CPU helper sets the same
GPU gain uniform. A single packet's amplitude is 0.045 world units; the sum uses
signed tanh saturation at 0.10. Both identical vertex shaders differentiate
the same saturated displacement to obtain normals. Constants come from the
shared model, not duplicated timing literals. Expired packets are pruned on
samples and input; at capacity the oldest is replaced. Time is absolute, so a
pause or a different frame rate cannot extend a wave. There are no model timers.
Reduced Motion clears impulses and keeps the existing immediate palette change.
Gesture ownership, spin momentum and preference persistence are unchanged.

Each existing GL scene captures its already resolved body, with the same
material, camera, pose, lighting, time, palette and state, into one fixed 64x64
RGBA target. The ambient plane is hidden during capture to prevent feedback;
the previous target and visibility are restored in a finally block. One diffuse
plane expands nine averaged RGBA samples into the existing canvas margin. It
unweights RGB for tone mapping, then retains the sampled source alpha in its
own coverage. Darkness caused by opacity is preserved as well as intrinsic
color. There is no separate white blend on paper. Dark source sectors therefore stay dim instead of becoming
summed bright lobes. Strength alone retains the existing elapsed-time easing.

This trades one small target/texture and one low-resolution body draw per
existing frame for faithful source coupling. The target uses ordinary RGBA8
for the existing basic GL compatibility path; very bright HDR values can clip
before final tone mapping, and the small spatial blur intentionally loses fine
detail. It is a diffuse backdrop, not an exact enlarged copy. No second full
resolution orb, CPU framebuffer read, extra GL view, scheduler, higher render
rate or per-frame React update is introduced. Existing visibility/focus/
AppState/context-loss ownership remains; target disposal is idempotent.

Static native orbs still diffuse the exact bundled pearl foreground PNG;
Queue diffuses the exact theme-specific PNG under the existing shared rotation.
Web stills diffuse their exact CSS gradient. These paths do not claim procedural
GL/palette parity or native blur proof. No-ExpoGL's page illustration is retained.

ADR-049's atlas/compositor/accessibility architecture is retained. Time is now
40 display pixels/points in idle, drag and fallback; fallback AM/PM matches the
45% atlas suffix. Refraction magnifies/displaces coverage-aware source shading;
limited alpha unweighting avoids turning nearly transparent source regions
into a white fill. Directional reflection adds surface depth instead of the
old 65% uniform white interior mix. Plain labels remain outside the glyph pass. Local GPU contrast and
filled-interior color probes are recorded in the OP2 acceptance report.

Software Chromium evidence establishes local rendering and lifecycle behavior.
Actual Android appearance, shader cost, GPU timing, power and gesture feel
remain separate owner device checks. Publication remains separate owner work.
