/** The Stay Focused book mark from design/assets/logo-mark.svg, in the current text color. */
export function LogoMark({ size = 22 }: { size?: number }) {
  return (
    <svg
      className="logo-mark"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 7v14" />
      <path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z" />
      <path d="M5 11l1.8 1.8 3.2-3.6" />
      <path d="M15.4 9h4" />
      <path d="M15.4 11.6h3" />
    </svg>
  );
}

const leftPage = "M60 20C48 15 33 14 17 16V68C33 66 48 67 60 72Z";
const rightPage = "M60 20C72 15 87 14 103 16V68C87 66 72 67 60 72Z";
const leftLines = [26, 34, 42, 50].map(
  (y) => `M24 ${y}C35 ${y - 1.5} 45 ${y - 0.5} 53 ${y + 2.5}`,
);
const rightLines = [26, 34, 42, 50].map(
  (y) => `M67 ${y + 2.5}C75 ${y - 0.5} 85 ${y - 1.5} 96 ${y}`,
);

/**
 * Loading state: an open book whose pages fold over the spine one after
 * another. Pure 2D: each leaf flips by scaling across the spine, which reads
 * as a page turning without any 3D transform.
 */
export function BookLoader({ label = "Loading" }: { label?: string }) {
  return (
    <div className="book-loader" role="status" aria-label={label}>
      <svg viewBox="0 0 120 86" aria-hidden="true">
        <ellipse className="book-shadow" cx="60" cy="79" rx="42" ry="3.2" />
        <path className="book-cover" d="M60 24C46 18 28 17 11 19V73C28 71 46 72 60 78C74 72 92 71 109 73V19C92 17 74 18 60 24Z" />
        <path className="book-page" d={leftPage} />
        <path className="book-page" d={rightPage} />
        {leftLines.map((d) => (
          <path key={d} className="book-line" d={d} />
        ))}
        {rightLines.map((d) => (
          <path key={d} className="book-line" d={d} />
        ))}
        {[0, 1, 2].map((i) => (
          <g key={i} className={`book-leaf book-leaf-${i}`}>
            <path className="book-leaf-face" d={rightPage} />
            {rightLines.slice(0, 3).map((d) => (
              <path key={d} className="book-leaf-line" d={d} />
            ))}
          </g>
        ))}
        <path className="book-spine" d="M60 20V72" />
      </svg>
      <span className="book-loader-label">{label}…</span>
    </div>
  );
}
