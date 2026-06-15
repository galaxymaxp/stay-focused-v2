# Stay Focused — Design System

A design system for **Stay Focused V2**, an AI-powered, Canvas-integrated study
productivity app. V2 is a **schedule-first, mobile-native rebuild** (Expo / React
Native) with an outline-aware generation engine. CS thesis project by Fely Max
Dilinila.

The product exists to answer one question for a student: **"What should I do
right now?"** Every surface is in service of that — the schedule is the command
center; Canvas sync and AI generation support execution, never distraction.

## Sources

This system was reverse-engineered from the author's repositories. You may not
have access, but they are the source of truth — explore them to build with higher
fidelity:

- **V2 (target):** https://github.com/galaxymaxp/stay-focused-v2 — engine-first
  monorepo (`apps/mobile` Expo, `apps/api` Next.js, `packages/engine|db|canvas|shared`).
  Mostly scaffolding today; the product UI is being designed (this system).
- **V1 (visual source of truth):** https://github.com/galaxymaxp/stay-focused — a
  400+-commit Next.js 16 / React 19 / Tailwind 4 prototype. The visual language,
  tokens, and component vocabulary here are lifted from its `app/globals.css`,
  `components/AppShell.tsx`, `components/DoNowPanel.tsx`, and
  `components/StayFocusedIcon.tsx`.

> Explore these repositories to design new surfaces accurately — especially V1's
> `app/globals.css` (the full token set) and the schedule/Do-Now components.

---

## CONTENT FUNDAMENTALS

**Voice — calm, direct, second person.** The app talks *to the student* ("your
only free block today", "what should I do next"). It is a focused coach, not a
cheerleader. No hype, no exclamation marks, no streak-shaming.

**Casing.** Sentence case everywhere for sentences and titles ("Draft Chapter 3 —
Methodology"). UPPERCASE only for the small eyebrow kickers ("RIGHT NOW", "LATER
TODAY", "GENERATE OUTPUT"), tracked at `0.08–0.1em`.

**Action-first labels.** Buttons are verbs and time: "Start now", "Snooze 15m",
"Generate output", "Open saved output". Numbers are concrete: "1h 12m left",
"3 blocks", "Grounded · 4 modules", "Due Friday".

**Honest about AI.** Copy never oversells generation. The real product says it
plainly: *"If readable source text is weak, Stay Focused will generate a scaffold
instead of inventing missing content."* Grounding state is always shown
("Grounded" / "Limited grounding").

**No emoji.** The brand does not use emoji in UI. Status is carried by the earthy
semantic colors and Lucide icons, not emoji.

**Vibe.** Warm, studious, unhurried. Parchment and gold; a library reading-room
calm rather than a productivity-app neon dashboard.

---

## VISUAL FOUNDATIONS

**Color.** A single gold accent — `#d7aa38` — carries the entire product (it is
also the Liquid Glass tint). The canvas is **warm parchment `#f6f4ef`**. Surfaces
are translucent warm whites stacked by elevation (`--surface-base` … `-elevated`
… `-selected`). Semantic colors are **earthy and muted, never neon**: clay red
`#be5a46`, amber `#b9863c`, sage green `#54795f`, slate blue `#5e7da5`, each with a
soft tint background. Text is warm near-black `#1f1913` down through muted clay
`#74695d`.

**Dark mode.** Opt-in via `data-theme="dark"` on `<html>` (the default/unset state
is light; `data-theme="light"` force-pins light). Lifted from the V2 codebase and
aligned with Apple's dark mode: a **warm charcoal canvas `#1b1814`** (never pure
black), surfaces that build elevation by **lightening** (`#282320` → `#4a3d2d`),
cream text `#f4eee5`, and lifted earthy semantics (clay red `#f29b86`, amber
`#e0b468`, sage `#8bb49a`, slate blue `#9cb6d5`) over washed-dark tint backgrounds.
The gold accent is unchanged across themes; shadows deepen to neutral black and the
glass veil flips to a dark translucent layer with a faint light top edge.

**Type.** Brand font is **Aptos** (the app is built in a Windows + VS Code
environment; fallbacks Segoe UI, SF Pro Text). Aptos is not on Google Fonts, so
this system **substitutes Hanken Grotesk** — a clean humanist grotesque (see the
caveat below). Mono is Aptos Mono → **JetBrains Mono**. Big text (display, titles)
is heavy (700–800) with tight negative tracking (`-0.02 … -0.05em`); body is 15px
at relaxed `1.65` leading; kickers are 11px, 800, uppercase, positive tracking.

**Spacing.** 4px base rhythm (`--space-1` = 4px … `--space-12` = 48px). Generous
padding inside cards (16px), tight gaps between schedule blocks (9px). Minimum tap
target 44px.

**Backgrounds.** Flat parchment with a *very* faint ambient wash — soft radial
gold + blue glows at the corners, no hard gradients, no patterns, no photography.
Calm and matte. Never full-bleed imagery.

**Corners.** Soft but not pill-everywhere: page `18px`, panel/card `14px`, control
`12px`, tight `10px`, and true pills (`999px`) for chips, the FAB, and the tab
capsule.

**Shadows.** Whisper-soft and **warm-brown tinted** (`rgba(36,29,18,…)`), very low
opacity. Content barely lifts (`--shadow-low`); only glass chrome and the active
"now" block carry medium elevation. No black drop shadows, no glows.

**Borders.** Low-contrast warm hairlines (`rgba(82,67,42,0.1)`), 1px. Borders do
most of the separation work; shadows are a whisper on top.

**The glass / flat split (the V2 signature).**
- **iOS 26 Liquid Glass** — chrome only: the floating inset tab-bar capsule, the
  nav bar, the FAB, and nav icon buttons. Gold-tinted, `blur(22px) saturate(165%)`,
  a bright specular top edge, a warm rim hairline, and a soft floating shadow.
- **Flat** — everything else: schedule blocks, the NowHero, cards, sheets. Warm
  surface + hairline + whisper shadow. **Content never blurs.**
- Falls back to an opaque surface under `prefers-reduced-transparency`.

**Animation.** Restrained. Sheets slide up on `cubic-bezier(0.22,1,0.36,1)` (~280ms);
scrims fade (~220ms). Tabs/buttons transition `140–180ms ease`. No bounces, no
infinite loops, no parallax.

**Hover / press.** Hover (pointer devices only) lifts `translateY(-1px)` and
warms the surface a touch. Press settles back with a tiny `scale(0.995)`. The
focus ring is a soft double gold halo (`--focus-ring`).

**Card anatomy.** A card = translucent warm-white surface, 1px warm hairline,
`14px` radius, `--shadow-low`. Selected/active = gold-tinted surface
(`--surface-selected`) + accent border + one step more shadow.

---

## ICONOGRAPHY

- **Lucide** is the icon system. V1 imports `lucide-react` (e.g. `Printer`,
  `Download`); icons are **outline, ~1.7–1.8 stroke, round caps/joins**, sized
  17–22px in chrome. Use Lucide from CDN (`https://unpkg.com/lucide@latest`) or
  `lucide-react` in app code. The inline SVGs in `TodayScreen.jsx` follow the same
  stroke spec where a dependency-free icon was needed.
- **Brand mark:** `assets/logo-mark.svg` — a gold line-art open book with a
  checkmark (from V1's `StayFocusedIcon`). Stroke 11 on a 256 grid, round joins.
  Renders on parchment or ink. `assets/app-icon.svg` and `assets/favicon.svg` are
  the older filled book-with-bookmark icon (amber on dark) kept for store/tab use.
- **No emoji. No unicode-glyph icons.** Status is color + Lucide, never an emoji.

---

## INDEX

**Foundations**
- `styles.css` — root entry point (consumers link this); `@import`s the tokens.
- `tokens/colors.css` · `typography.css` · `spacing.css` · `radii-shadows.css` ·
  `glass.css` — CSS custom properties + the `.sf-glass` / `.sf-flat` utilities.
- `guidelines/*.html` — foundation specimen cards (Type, Colors, Spacing, Glass,
  Brand) shown in the Design System tab.
- `assets/` — `logo-mark.svg`, `app-icon.svg`, `favicon.svg`, `badge-96.svg`.

**Components** (`window.StayFocusedDesignSystem_d2c06c.*`)
- `components/core/` — `Button`, `Chip`, `Card`, `Badge`.
- `components/glass/` — `GlassNavBar`, `GlassTabBar`, `GlassFAB` (the iOS 26 chrome).
- `components/schedule/` — `ScheduleBlock`, `NowHero` (the flat schedule content).
- Each has a `.d.ts` (props) and `.prompt.md` (what / when + usage).

**UI kit**
- `ui_kits/mobile/` — the **Today Schedule** screen (`index.html` +
  `TodayScreen.jsx`), the primary product surface, in an iOS device frame.

**Meta**
- `SKILL.md` — makes this folder usable as a downloadable Claude Agent Skill.

---

## CAVEATS

- **Font substitution:** the brand font **Aptos** is not freely available, so the
  system ships **Hanken Grotesk** (sans) and **JetBrains Mono** (mono) from Google
  Fonts. Swap in licensed Aptos webfonts for production fidelity. *(This is why
  `check_design_system` reports 0 `@font-face` fonts — the webfonts load via a
  Google Fonts `@import`, not bundled binaries.)*
- V2's repo is engine-first scaffolding; the actual product visuals here are
  derived from the V1 prototype plus the V2 spec (mobile-native + iOS 26 glass).
