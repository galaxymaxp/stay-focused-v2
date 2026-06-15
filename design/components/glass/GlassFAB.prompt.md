Floating iOS 26 Liquid Glass action button — the single "create / generate" affordance, gold-tinted glass with a specular edge.

```jsx
<GlassFAB icon={<Plus />} aria-label="New block" />
<GlassFAB icon={<Sparkles />} label="Generate" />
```

Pass a `label` to get the extended pill form; omit it for a circular FAB (set `aria-label`). Positioned `absolute` — place inside a relative phone frame; it floats clear of the tab bar.
