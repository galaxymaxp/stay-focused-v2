# Mobile UI Kit — Stay Focused V2

High-fidelity recreation of the **Today Schedule** screen, the primary surface of
the Expo / React Native rebuild. It answers one question: **"What should I do
right now?"**

## Files
- `index.html` — interactive screen, mounted in an iOS 26 device frame.
- `TodayScreen.jsx` — the screen: glass nav bar, NowHero, schedule rail, glass FAB,
  glass tab bar, and a "Do Now" bottom sheet.
- `ios-frame.jsx` — device bezel starter (status bar, dynamic island, home indicator).

## The composition rule
- **Liquid Glass** (gold-tinted, blurred, floating): nav bar, tab bar capsule, FAB,
  nav icon buttons.
- **Flat** (warm parchment, hairline border, whisper shadow): the NowHero, every
  schedule block, the bottom sheet — all content.

## Interactions
- Tap **Start now**, any schedule block, or the **Generate** FAB → the Do Now sheet
  slides up (preset + output type, mirroring V1's generation panel).
- Tab bar switches Today / Courses / Library (Today is the live demo surface).

Built from the V1 codebase `galaxymaxp/stay-focused` (`components/AppShell.tsx`,
`DoNowPanel.tsx`, `app/globals.css`). Composes the design-system primitives —
it does not re-implement them.
