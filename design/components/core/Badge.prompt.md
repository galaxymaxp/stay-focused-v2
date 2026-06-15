Tiny count or status indicator — overlay on nav icons, the FAB, or unread rows.

```jsx
<Badge count={3} />
<Badge dot tone="red" />
```

`dot` renders an 8px status dot; otherwise shows `count` (capped at `99+`). Tones: `accent | red | green | neutral`. Carries a 2px parchment ring so it reads on busy chrome.
