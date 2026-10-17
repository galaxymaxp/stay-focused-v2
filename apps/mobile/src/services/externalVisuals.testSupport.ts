import type { ExternalReferenceVisual, ReviewerVisuals } from './externalVisuals';

// Full found DTO copied from apps/api/src/lib/external-visuals/batch.ts
// readReviewerVisuals (also emitted by service.ts response). Synthetic public
// metadata only; every field is part of that serializer's real response shape.
export const apiFoundVisual = {
  status: 'found', id: 'a'.repeat(64),
  image: 'https://upload.wikimedia.org/reference.png', title: 'Reference',
  credit: 'Author', license: 'CC BY',
  licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
  sourceUrl: 'https://commons.wikimedia.org/wiki/File:Reference.png',
  label: 'External reference — not from your course material.',
  width: 1200, height: 800, attemptCount: 1,
} satisfies ExternalReferenceVisual;

export const apiReviewerVisuals = {
  sections: { 'section-1': apiFoundVisual }, checked: 1, total: 2, running: true,
} satisfies ReviewerVisuals;
