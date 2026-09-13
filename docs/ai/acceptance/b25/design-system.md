# B25 design system

`apps/mobile/src/design/themeTokens.ts` owns semantic palettes, content colors, motion and icon sizing. `tokens.ts` owns spacing, typography, radii and the minimum 48-point target. `theme.tsx` resolves OS/System/Light/Dark, persists appearance through existing storage, observes accessibility reduced motion and application activity, and supplies compatibility colors to retained deep screens.

Dark canvas is #000000; graphite surfaces #1C1C1E / #2C2C2E / #3A3A3C. Light canvas is #F7F7F5 with translucent white cards and opaque white elevated sheets. Primary text is white / #111111. Secondary and tertiary colors were strengthened from directional reference values for readable contrast. Accent usage is localized. Light and dark are separate semantic palettes, not an inversion filter.

Typography: display 34, title 30, section 22, card 18, body 16, caption 12. Spacing: 4/8/12/16/20/24/32/40/48. Cards use 24-point corners and controls 12-point corners. Native text scaling remains enabled; wrapping and scrolling are preferred to truncation. The fixed 288-point clock still needs physical large-font validation.

Primitives: Copy, Surface, Action, IconAction, Page, Flow, Notice, RowLink, Sheet. Page owns safe areas, system bar contrast, header actions and flow entry; Sheet uses native Modal with a scrollable body and safe bottom inset. Whole-row targets keep task and artifact lists compact. Legacy Button/Card/Screen/TextField and deep screens now read semantic theme colors.

Motion: 220 ms small, 320 ms normal, 480 ms spatial token; spring damping 18/stiffness 180/mass .8; ambient half-cycle 3200 ms. Native Animated handles transform/opacity. Platform navigation handles routes and sheets. Shared-element morphs and richer state-to-state choreography remain B26.

No bespoke font, raster mockup, fake progress percentage, synthetic classes or global purple/blue canvas was introduced. Some deep-screen geometry and inline layout values remain local; B26 can consolidate these as those screens are redesigned.
