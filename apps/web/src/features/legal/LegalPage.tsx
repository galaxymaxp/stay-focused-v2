import Link from 'next/link';
import type { LegalDocument } from '@stay-focused/shared';
import { LegalLinks } from '../../components/legal-links';

/** Server-rendered bundled copy: no session, API or markdown parser required. */
export function LegalPage({ document }: { document: LegalDocument }) {
  return <main className="legal-page">
    <Link href="/sign-in">Stay Focused</Link>
    <h1>{document.title}</h1>
    <p className="meta">Updated <time dateTime={document.updated}>{document.updated}</time></p>
    {document.sections.map(section => <section key={section.heading}>
      <h2>{section.heading}</h2>
      {section.paragraphs.map(paragraph => <p key={paragraph}>{paragraph}</p>)}
      {section.bullets ? <ul>{section.bullets.map(bullet => <li key={bullet}>{bullet}</li>)}</ul> : null}
    </section>)}
    <LegalLinks />
  </main>;
}
