"use client";
import { useEffect, useId, useRef, useState } from "react";
import { Icon } from "./ui";

type CourseOptionsProps = {
  title: string;
  labelled?: boolean;
  disabled?: boolean;
} & ({ past: boolean; onMove: () => void; pinned?: never; onPin?: never }
  | { pinned: boolean; onPin: () => void; past?: never; onMove?: never });

/** A disclosure keeps course actions out of the card's navigation target. */
export function CourseOptions({ title, labelled = false, past, disabled = false, onMove, pinned, onPin }: CourseOptionsProps) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const move = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    if (disabled) menu.current?.focus();
    else move.current?.focus();
    const outside = (event: Event) => {
      if (!root.current?.contains(event.target as Node)) {
        setOpen(false);
        if (event.type === "pointerdown") event.preventDefault();
        trigger.current?.focus();
      }
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
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
  }, [open, disabled]);
  return <div className={`course-options${labelled ? '' : ' course-options-icon'}`} ref={root}
    onKeyDown={event => {
      if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      if (!open) setOpen(true);
      else if (disabled) menu.current?.focus();
      else move.current?.focus();
    }}>
    <button type="button" className="subtle" ref={trigger}
      aria-label={`Course options for ${title}`}
      aria-haspopup="menu" aria-expanded={open} aria-controls={id} onClick={() => setOpen(value => !value)}>
      {labelled ? <>Course options <Icon name="chevron-down" /></> : <Icon name="ellipsis" />}
    </button>
    {open && <div className="course-options-popover" id={id} role="menu" tabIndex={-1} ref={menu} aria-label={`Course options for ${title}`}>
      <button type="button" role={onPin ? "menuitemcheckbox" : "menuitem"} aria-checked={onPin ? pinned : undefined} aria-label={onPin ? `${pinned ? "Unpin" : "Pin"} ${title}` : undefined} className="subtle" ref={move} disabled={disabled} onClick={() => {
        if (disabled) return;
        setOpen(false);
        trigger.current?.focus();
        if (onPin) onPin();
        else onMove?.();
      }}>{onPin ? pinned ? "Unpin" : "Pin" : past ? "Move to current" : "Move to past courses"}</button>
    </div>}
  </div>;
}
