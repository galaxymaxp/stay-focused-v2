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
