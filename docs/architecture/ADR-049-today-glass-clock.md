# ADR-049: Today glass clock and scoped Inter typography

Status: Accepted for GL1's owner-authorized local code scope, 2026-10-19.

Fely approved glass for Today's time, including the time shown during a free
time drag. This is a narrow exception to the navigation-only glass rule. The
weekday line is removed and idle time is centered. Labels and duration captions
remain plain text. No other content gains glass.

The Today readout alone uses bundled Inter (SIL Open Font License): Bold 700
for time, SemiBold 600 for labels, Medium 500 for captions. Digits use equal
advance cells and approximately -2% tracking; AM/PM uses 45% size on the same
baseline. Other typography retains the locked Aptos / Segoe UI / system stack.
Apple SF fonts are not included. The exception is also recorded in the design
readme and typography token documentation.

scripts/build-clock-glyph-atlas.mjs uses the committed Inter Bold TTF and
msdf-bmfont-xml to build one 512x256 MSDF PNG and JSON metrics for exactly
0-9, colon, A, M, P and space. Both apps commit identical copies. Font files
and OFL accompany each platform. Atlas generation runs only at build time.
Repeating the generator produces no asset diff.

layoutClockGlyphs is pure and exported from shared's normal barrel. The Three
compositor lives at the separate shared/clock-glass-renderer subpath so normal
shared imports do not pull Three into the website's initial bundle. Both apps
execute that one implementation and shader text.

The existing orb GL view covers the readout on both platforms. Mobile retains
RENDER_SCALE 0.6; font size uses display points independent of backing size.
The orb renders into one half-float target, preserving highlights until final
tone mapping. One composite render pass draws the orb and glyph quads. A small
preallocated position/UV buffer changes only with time, font size or canvas
size. The atlas texture remains unchanged throughout a drag.

The glyph pass samples the orb with 1.5-2.8% offsets along the MSDF gradient,
five blur taps, white tint, a directional fresnel edge using the existing day
light direction, and a dark inner edge. No separate shimmer or animated
highlight is added. The scrim moves below the digits inside the composite
while glass is ready; the CSS scrim remains for plain text. Its alpha must
also cover the page visible through the translucent orb. Bright-pearl local
screenshots drove stronger inner shading/tint and a soft scrim. This uses the
existing white/black readout treatment without global token changes.

Idle FRAME_MS remains 80 on both apps; interaction uses 16ms. A changed time
sets a dirty flag and renders on the next requested frame, bypassing the idle
throttle. No second animation loop or GL view is introduced. Off-screen and
background behavior is preserved. Reduce Motion loads a single renderable
glass pose, redraws on explicit input/time/theme changes, and has no ambient
loop. Website loading remains deferred until useful content is ready.

Web uses TextureLoader for the local PNG. Mobile uses existing expo-asset and
Expo GL's supported {localUri} upload with native PNG decoding. Existing
expo-font loads the bundled TTFs; no new native module or APK change is needed.
Unavailable GL, missing atlas, unsupported float targets, shader/draw failure
or web context loss retain/restore plain white Inter time. The orb keeps its
existing static fallback. GPU resources are disposed on unmount.

Real time text stays in the accessibility tree and reserves its row when
visual opacity is zero; GL digits are decorative. Captions never enter the
glass pass. Tests cover assets/layout, accessibility, failure/lifecycle
behavior and existing gesture controls on both apps.

Cost: one target and two extra draw calls per existing frame (1 -> 3 total),
without per-time texture uploads. Local Chromium/SwiftShader renderer.info,
submission timing, bright-tone contrast checks and 1440/390 light/dark idle/drag
screenshots are recorded in [acceptance](../ai/acceptance/gl1-glass-clock.md).
Submission timing does not measure GPU time or Realme performance. Physical
checks and publication remain separate owner work.
