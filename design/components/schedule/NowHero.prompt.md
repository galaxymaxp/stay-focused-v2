The Today screen's focus card — the iOS-style answer to "what should I do right now?". Clean elevated surface (no gradient), category dot + status, headline, a slim progress track, and a filled + tinted iOS button pair. One per screen, pinned at top.

```jsx
<NowHero
  title="Draft Chapter 3 — Methodology"
  course="CS 198 · Thesis"
  timeLabel="2:00 – 3:30 PM"
  timeLeft="1h 12m left"
  progress={0.32}
  reason="Due Friday and your only free 90-min block today."
  startIcon={<Play />}
  onPrimary={openDoNow}
/>
```

`progress` (0–1) fills the track in the course tone. Pass `secondaryLabel={null}` to drop the snooze button.
