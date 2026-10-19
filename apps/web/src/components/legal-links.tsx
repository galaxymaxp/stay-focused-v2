import Link from 'next/link';

export function LegalLinks() {
  return <nav aria-label="Legal" className="legal-links">
    <Link href="/privacy" prefetch={false}>Privacy</Link>
    <span aria-hidden="true">·</span>
    <Link href="/terms" prefetch={false}>Terms</Link>
  </nav>;
}
