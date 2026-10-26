"use client";

export interface GlassPillProps {
  label: string;
  sub?: string;
  size: 'lg' | 'md' | 'sm';
  busy?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  ariaExpanded?: boolean;
  ariaLabel?: string;
}

/** Native-resolution navigation glass: CSS geometry only, with no raster layer. */
export function GlassPill({ label, sub, size, busy = false, disabled = false, onClick, ariaExpanded, ariaLabel }: GlassPillProps) {
  return <button type="button" className={`glass-pill glass-pill-${size}`}
    disabled={disabled || busy} aria-busy={busy} aria-expanded={ariaExpanded}
    aria-label={ariaLabel ?? [label, sub].filter(Boolean).join(', ')} onClick={onClick}>
    {busy && <svg className="glass-pill-spinner" width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="8" cy="8" r="6" stroke="currentColor" strokeOpacity=".25" strokeWidth="2" />
      <path d="M14 8a6 6 0 0 0-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>}
    {label}
    {sub !== undefined && <><span className="glass-pill-dot" aria-hidden="true" /><span className="glass-pill-sub">{sub}</span></>}
  </button>;
}
