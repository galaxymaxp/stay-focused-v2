import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it, vi } from 'vitest';
import { PRIVACY_POLICY, TERMS_OF_SERVICE } from '@stay-focused/shared';
import PrivacyPage, { metadata as privacyMetadata } from '../../../app/privacy/page';
import TermsPage, { metadata as termsMetadata } from '../../../app/terms/page';

it.each([
  { Page: PrivacyPage, document: PRIVACY_POLICY, metadata: privacyMetadata },
  { Page: TermsPage, document: TERMS_OF_SERVICE, metadata: termsMetadata },
])('server renders $document.title from shared copy without fetching', ({ Page, document, metadata }) => {
  const fetch = vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('offline'));
  const html = renderToStaticMarkup(createElement(Page));
  expect(metadata.title).toBe(document.title);
  expect(html).toContain(`<h1>${document.title}</h1>`);
  expect(html).toContain(`dateTime="${document.updated}"`);
  for (const section of document.sections) expect(html).toContain(`<h2>${section.heading}</h2>`);
  expect(html).toContain('href="/privacy"'); expect(html).toContain('href="/terms"');
  expect(fetch).not.toHaveBeenCalled();
});
