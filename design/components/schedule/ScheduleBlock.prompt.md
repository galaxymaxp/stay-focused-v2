iOS grouped-list rows for the Today schedule. `ScheduleBlock` is a cell; wrap a run of them in `ScheduleGroup` to get the rounded inset container + hairline separators (set `last` on the final row).

```jsx
<ScheduleGroup header="Later today" right="3 blocks">
  <ScheduleBlock time="3:30" endTime="4:00" tone="blue" course="MATH 211" title="Review series & sequences" meta="quiz Thu" onClick={open} />
  <ScheduleBlock time="Now" tone="accent" state="now" course="CS 198" title="Draft thesis chapter 3" onClick={open} />
  <ScheduleBlock time="9:00" tone="green" state="done" title="Morning review" last />
</ScheduleGroup>
```

States: `default` (chevron), `now` (tinted cell + NOW pill), `done` (dimmed, struck, green check). `tone` sets the course color bar. Always flat — never glass.
