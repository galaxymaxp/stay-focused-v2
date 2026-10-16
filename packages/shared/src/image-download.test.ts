import { expect, it } from 'vitest';
import { studyImageFilename } from './image-download';

it('uses portable title/section/kind names, strips path/control characters and query secrets', () => {
  expect(studyImageFilename({ uri: 'https://image.test/page.png?token=private', reviewerTitle: 'Biology: 1/2', sectionTitle: '../Cell\nparts?', kind: 'page_snapshot' }))
    .toBe('Biology- 1-2-Cell-parts-page_snapshot.png');
});
it('includes the Wikimedia source title and prefers the actual content type', () => {
  expect(studyImageFilename({ uri: 'https://image.test/thumb', reviewerTitle: 'Bio', sectionTitle: 'Cells', kind: 'external_visual', sourceTitle: 'File:Cell.jpeg' }, 'image/jpeg'))
    .toBe('Bio-Cells-File-Cell-jpeg-external_visual.jpg');
});
it('bounds long names and supplies safe empty-title defaults', () => {
  expect(studyImageFilename({ uri: 'file:///image.webp', reviewerTitle: 'a'.repeat(1000), sectionTitle: '...', kind: 'figure' })).toBe(`${'a'.repeat(60)}-study-figure.webp`);
});
