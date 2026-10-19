# ADR-048: Shared decorative orb interaction

Status: Accepted for OR2's owner-authorized local code scope (2026-10-18).

Today, generation and Queue use the same pure interaction state and functions
in packages/shared/src/orb-interaction.ts. Platforms own input and persistence;
existing scenes own time, visibility, GPU resources and animation scheduling.
No native dependency, server state, account key, provider or API is involved.

A short small-motion release cycles the device idle palette and projects the
release point onto the front unit hemisphere. Any early movement beyond six
points permanently yields that gesture to scrolling; a hold of at least 250ms
allows two-axis dragging. Release retains bounded excess angular velocity,
with exponential damping back to the existing idle spin. Cancellation produces
neither a color change nor momentum. There are no model timers.

The palette uses existing theme tokens only: light.findActive (#F4C542) gold,
then dark.green, dark.violet and dark.orange. The current theme accent itself
is neutral, so its existing gold emphasis token supplies the requested first
gold. A 600ms smooth crossfade starts from the current interpolated color even
on repeated taps. Device key sf.orb.color uses mobile sessionStore and guarded
web localStorage. Invalid indices and unavailable storage fall back safely;
mounted surfaces receive local preference changes and web tabs receive storage
events. A late native read cannot overwrite a color chosen in the meantime.

Both body shaders have identical vertex/fragment text. Optional uBulgeDir and
uBulgeAmount displace vertices radially in a localized cosine-power lobe; the
normal follows its analytic slope. Zero amount preserves the existing surface
and shading. The 650ms bounded damped envelope creates an outward spring.
An optional per-frame idleColor overrides liquid/light tint; non-idle generation
states omit it and immediately recover their existing state appearance.

Each platform's small Three adapter composes the user's two-axis spin offset
with the scene's existing idle/state spin. A ref carries interaction state to
the existing render loop, without React rerenders per frame or a second loop.
Today uses its current 80ms idle cadence and temporarily draws at animation
cadence. Mobile's existing dayOrbTouch pause remains; only its own rotating
ball gesture may bypass that pause. Ring gestures still pause the scene.

Mobile's transparent responder covers only the ball bounds, rejects points
outside the sphere, permits responder termination until rotating, and forwards
the original ring PanResponder lifecycle for the overlapping inner band.
This preserves immediate handle priority and ring delta/history tracking.
Web uses a circular ball target with touch-action: pan-y, capture only after
rotation starts, and a nonpassive touchmove listener that blocks native panning
only after a hold. The original ring target stays above it with a cutout inside
the existing touchInner radius. Ring hit tests and handlers are unchanged.

Reduce Motion suppresses bulge and release inertia and switches color instantly.
Scenes draw on changes without ambient frames. The deferred web Today still
continues to avoid WebGL until needed: a deliberate rotation can request a
renderable still pose; this does not enable ambient frames. Hidden/unfocused
scenes stop according to their existing visibility policy. Targets remain
decorative, hidden from assistive technology and absent from keyboard focus.

Tradeoffs: sphere projection uses the circular front-hemisphere approximation
at the existing camera; it is not a depth readback. Input/compositing feel,
actual scroll arbitration, shader appearance and power require the owner's
separate phone/browser acceptance. OR2's unattended scope forbids those device
checks and rollout, so local tests do not claim physical acceptance.


## OR3b follow-up (2026-10-19)

Accepted for the owner-authorized unattended local code scope. This section
supersedes OR2's physics, bulge, palette persistence and Today glow decisions.
The original OR3 preflight STOP is resolved by OR3b's explicit owner answer:
keep the timing tests and use one named 0.4-second exponential time constant.

Velocity is a roughly 100ms exponential moving estimate, capped at +/-10 rad/s.
A stationary held ball keeps its pose while its stored velocity decays with the
same friction as release. Input and render samples share a timestamp so neither
can double-decay a pause. Cancellation, scene disposal, navigation/background
and Reduce Motion clear velocity. Excess velocity decays below 0.01 rad/s, then
leaves the scene's existing idle spin. Pure model functions own no timers.

Physical Today ring movement pushes Y-axis input through the same estimator,
using deltaMinutes / 1440 * 2pi * gain 3. Clockwise movement turns the front
right. Start/end/block paths all feed it; release snapping and accessible time
steps do not. Ring handlers keep priority. Native plain page touches may still
pause idle rendering, while ring dragging, momentum and ripple/color work may
render in the existing loop. Interaction cadence returns to the prior 80ms
Today cadence when settled; generation retains its prior state/visibility loop.

Both vertex shaders now use uRippleDir and uRippleTime (seconds, negative off).
A 900ms great-circle wave packet travels to the antipode with about two strong
visible crests. The 0.12 maximum amplitude is below the old 0.18 bulge height;
temporal damping and exact endpoint branches leave zero displacement. Normals
differentiate the same displacement function. Repeated taps restart one wave.
Zero/off/end pixels match the original undeformed shader in local WebGL.
Reduce Motion suppresses ripple and momentum and switches color instantly.

Palette keys are pearl/gold/green/violet/orange. Pearl uses the existing light
Knowledge Core body #E6EAF1 and is the default. Persistence writes only stable
keys under sf.orb.colorKey. Only when absent, sf.orb.color maps its old indices
0..3 to gold/green/violet/orange, then the key is written; later reads ignore the
legacy value. Unknown keys select pearl. Mobile serializes writes, waits for
queued choices before a new read and rejects late hydration by revision. Web
uses guarded local preferences and retains same-tab/cross-tab notifications.

Glow decision: remove the Today aura mesh on both platforms and the native SVG
halo, using the owner's approved fallback. Inspection of the installed
react-native-svg Stop shows setNativeProps ignores new color arguments and
calls parent.forceUpdate; changing its stops would require React updates at
animation cadence or a new native gradient encoding path. The body light is
world-space (uLight); only liquid uses inverse uSpin, so merely moving the aura
would not establish tracking. Both aura adapters can move each frame, but that
does not solve the native halo/color constraint. Removal preserves parity,
needs no new animation loop/dependency, and eliminates the disconnected glow.
Generation retains its centered aura: idle tint exactly matches the body fade;
non-idle states immediately restore the existing authoritative theme/state
tint, including when the theme did not change. The generation light is centered
so its forward-rotated position remains centered. No halo-center animation is
required for the removed Today glow.

These are local code and GPU checks, not physical acceptance. Owner rollout,
Realme/desktop appearance, actual gesture feel, power and installed/deployed
revisions remain separate, unverified owner work.
