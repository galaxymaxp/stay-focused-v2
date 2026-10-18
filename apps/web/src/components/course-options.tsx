"use client";
import { useEffect, useId, useRef, useState } from "react";
import { Icon } from "./ui";

/** A disclosure keeps course actions out of the card's navigation target. */
export function CourseOptions({ title, labelled = false, past, disabled, onMove }: {
  title: string;
  labelled?: boolean;
  past: boolean;
  disabled: boolean;
  onMove: () => void;
}) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const move = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    move.current?.focus();
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
  return <div className={`course-options${labelled ? '' : ' course-options-icon'}`} ref={root}
    onKeyDown={event => {
      if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      if (!open) setOpen(true);
      else move.current?.focus();
    }}>
    <button type="button" className="subtle" ref={trigger}
      aria-label={labelled ? undefined : `Course options for ${title}`}
      aria-haspopup="menu" aria-expanded={open} aria-controls={id} onClick={() => setOpen(value => !value)}>
      {labelled ? <>Course options <Icon name="chevron-down" /></> : <Icon name="ellipsis" />}
    </button>
    {open && <div className="course-options-popover" id={id} role="menu" aria-label={`Course options for ${title}`}>
      <button type="button" role="menuitem" className="subtle" ref={move} disabled={disabled} onClick={() => {
        setOpen(false);
        trigger.current?.focus();
        onMove();
      }}>{past ? "Move to current" : "Move to past courses"}</button>
    </div>}
  </div>;
}
