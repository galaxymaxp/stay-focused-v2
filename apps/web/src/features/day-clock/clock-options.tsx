"use client";
import { FREE_TIME_ERROR, validFreeTime } from "@stay-focused/shared";
import { useEffect, useId, useRef, useState } from "react";
import { Icon } from "../../components/ui";
import { fromTimeInput, toTimeInput } from "./free-time-store";

export function ClockOptions({ start, end, locked, onToggleLock, onCommit, disabled }: {
  start: number; end: number; locked: boolean; onToggleLock: () => void;
  onCommit: (start: number, end: number) => void; disabled: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [from, setFrom] = useState(toTimeInput(start)), [to, setTo] = useState(toTimeInput(end));
  const [error, setError] = useState<string | null>(null);
  const root = useRef<HTMLDivElement>(null), trigger = useRef<HTMLButtonElement>(null), menu = useRef<HTMLDivElement>(null);
  const id = useId();
  const close = () => { setOpen(false); trigger.current?.focus(); };
  useEffect(() => {
    if (!open) return;
    menu.current?.querySelector<HTMLButtonElement>("button")?.focus();
    const outside = (event: Event) => { if (!root.current?.contains(event.target as Node)) setOpen(false); };
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") { event.preventDefault(); setOpen(false); trigger.current?.focus(); } };
    document.addEventListener("mousedown", outside); document.addEventListener("touchstart", outside); document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("mousedown", outside); document.removeEventListener("touchstart", outside); document.removeEventListener("keydown", escape); };
  }, [open]);
  return <div className="clock-options" ref={root} onBlur={event => {
    if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
  }}>
    <button ref={trigger} type="button" className="day-clock-lock" aria-label="Clock options" aria-haspopup="dialog"
      aria-expanded={open} aria-controls={open ? id : undefined} onClick={() => {
        if (open) { close(); return; }
        setFrom(toTimeInput(start)); setTo(toTimeInput(end)); setError(null); setOpen(true);
      }}><Icon name="ellipsis" /></button>
    {open && <div ref={menu} id={id} className="account-popover clock-options-menu" role="dialog" aria-label="Clock options">
      <button type="button" role="switch" aria-label="Lock clock" aria-checked={locked} onClick={onToggleLock}>
        Lock clock <span aria-hidden="true">{locked ? "On" : "Off"}</span>
      </button>

      <strong>Free time</strong>
      <label>Free time starts<input aria-label="Free time starts" type="time" value={from} onChange={event => { setFrom(event.target.value); setError(null); }} /></label>
      <label>Free time ends<input aria-label="Free time ends" type="time" value={to} onChange={event => { setTo(event.target.value); setError(null); }} /></label>
      {error && <p className="meta danger" role="alert">{error}</p>}
      <button type="button" disabled={disabled} onClick={() => {
        const nextStart = fromTimeInput(from), nextEnd = fromTimeInput(to);
        if (!validFreeTime({ start: nextStart, end: nextEnd })) { setError(FREE_TIME_ERROR); return; }
        onCommit(nextStart, nextEnd); close();
      }}>Save free time</button>
    </div>}
  </div>;
}
