import { describe, expect, it } from 'vitest';
import { LEGAL_CONTACT_EMAIL, PRIVACY_POLICY, TERMS_OF_SERVICE } from './legal';

describe('bundled legal content', () => {
  it.each([PRIVACY_POLICY, TERMS_OF_SERVICE])('$title has complete dated sections and the contact', document => {
    expect(document.updated).toBe('2026-10-19');
    expect(document.sections.length).toBeGreaterThan(0);
    expect(new Set(document.sections.map(section => section.heading)).size).toBe(document.sections.length);
    for (const section of document.sections) {
      expect(section.heading.trim()).not.toBe('');
      expect(section.paragraphs.length).toBeGreaterThan(0);
      for (const text of [...section.paragraphs, ...(section.bullets ?? [])]) expect(text.trim()).not.toBe('');
    }
    expect(document.sections.find(section => section.heading === 'Contact')?.paragraphs.join(' ')).toContain(LEGAL_CONTACT_EMAIL);
  });
  it('exports the owner contact once for both policies', () => {
    expect(LEGAL_CONTACT_EMAIL).toBe('omgraythekid@gmail.com');
  });
});
