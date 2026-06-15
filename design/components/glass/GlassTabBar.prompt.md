Floating iOS 26 Liquid Glass tab bar — an inset capsule docked above the home indicator. Use for the app's primary mobile navigation (3–5 tabs). The active tab expands into a gold pill with its label; inactive tabs show icon only.

```jsx
<GlassTabBar
  activeId="today"
  onSelect={setTab}
  items={[
    { id: "today", label: "Today", icon: <CalendarCheck /> },
    { id: "courses", label: "Courses", icon: <BookOpen /> },
    { id: "library", label: "Library", icon: <Library /> },
  ]}
/>
```

Position is `absolute` — place it inside a `position: relative` phone frame. Glass only; pair with flat content beneath.
