"use client";
import { useEffect, useId, useRef, useState } from "react";
import { Icon } from "./ui";

/** A disclosure keeps course actions out of the card's navigation target. */
export function CourseOptions({ past, disabled, onMove }: {
  past: boolean;
  disabled: boolean;
  onMove: () => void;
}) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    const outside = (event: Event) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      trigger.current?.focus();
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("focusin", outside);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("focusin", outside);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);
  return <div className="course-options" ref={root}>
    <button type="button" className="subtle" ref={trigger}
      aria-expanded={open} aria-controls={id} onClick={() => setOpen(value => !value)}>
      Course options <Icon name="chevron-down" />
    </button>
    {open && <div className="course-options-popover" id={id} role="group" aria-label="Course options">
      <button type="button" className="subtle" disabled={disabled} onClick={() => {
        setOpen(false);
        trigger.current?.focus();
        onMove();
      }}>{past ? "Move to current" : "Move to past courses"}</button>
    </div>}
  </div>;
}
