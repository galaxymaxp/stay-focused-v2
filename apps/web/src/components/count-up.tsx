"use client";
import { useSpringNumber } from "../lib/motion";

/** A whole number that springs up (or down) to its value, like the mobile app. */
export function CountUp({
  value,
  suffix = "",
}: {
  value: number;
  suffix?: string;
}) {
  // One text node: the spring settles in ~0.5s, so anything that reads the
  // page (screen readers, copy, tests) finds the final value.
  const shown = Math.round(useSpringNumber(value));
  return (
    <span className="count-up">
      {shown}
      {suffix}
    </span>
  );
}

/** A native progress bar whose fill springs to its value. */
export function SpringProgress({
  value,
  max,
  label,
}: {
  value: number;
  max: number;
  label: string;
}) {
  const shown = useSpringNumber(value);
  return (
    <progress aria-label={label} max={max} value={Math.max(0, shown)}>
      {value} of {max}
    </progress>
  );
}
