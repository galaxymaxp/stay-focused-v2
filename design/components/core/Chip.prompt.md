Compact pill for status, counts, course names, and inline tags.

```jsx
<Chip tone="accent">MATH 211</Chip>
<Chip tone="green" iconLeft={<CheckIcon />}>Grounded</Chip>
<Chip tone="neutral" soft={false}>3 modules</Chip>
```

Tones map to the earthy semantic palette: `neutral | accent | red | amber | green | blue`. `soft={false}` drops the fill for an outline-only chip.
