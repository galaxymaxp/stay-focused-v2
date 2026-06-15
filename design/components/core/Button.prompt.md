Primary action control — flat, warm, gold accent on `primary`; use for the one main action per surface.

```jsx
<Button variant="primary" iconLeft={<PlayIcon />}>Start now</Button>
<Button variant="secondary" size="sm">Snooze</Button>
<Button variant="ghost">Skip</Button>
```

Variants: `primary` (gold fill), `secondary` (surface + border), `ghost` (text only), `danger` (muted clay-red). Sizes `sm | md | lg`. `full` stretches to container width. Pass icons via `iconLeft` / `iconRight` (Lucide nodes).
