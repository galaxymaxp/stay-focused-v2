import { describe, expect, it } from 'vitest';
import { effectiveCanvasFileEligibility, isPageAccessibleCanvasFile, type CanvasFilePolicyInput } from './canvas-file-policy';
import { canvasSourceAccessReference } from './canvas-file-access';

const now = new Date('2026-10-19T03:00:00Z');
const file: CanvasFilePolicyInput = { contentType: 'application/pdf', displayName: 'Lesson.pdf', filename: 'lesson.pdf',
  size: 1024, locked: false, hidden: false, hiddenForUser: false, lockAt: null, unlockAt: null, mediaClass: null, mediaEntryId: null };
const visible = [{ current: true, published: true, visible: true }];

describe('effective Canvas file policy', () => {
  it.each([
    { name: 'hidden Page link', change: { hidden: true }, references: visible, expected: 'eligible_document' },
    { name: 'hidden_for_user Page PDF', change: { hiddenForUser: true }, references: visible, expected: 'eligible_document' },
    { name: 'hidden without reference', change: { hidden: true }, references: [], expected: 'blocked_unavailable' },
    { name: 'locked Page link', change: { hidden: true, locked: true }, references: visible, expected: 'blocked_locked' },
    { name: 'date lock', change: { hidden: true, lockAt: '2026-10-18T03:00:00Z' }, references: visible, expected: 'blocked_locked' },
    { name: 'future unlock', change: { hidden: true, unlockAt: '2026-10-20T03:00:00Z' }, references: visible, expected: 'blocked_locked' },
    { name: 'unpublished Page', change: { hidden: true }, references: [{ ...visible[0]!, published: false }], expected: 'blocked_unavailable' },
    { name: 'unknown publication', change: { hidden: true }, references: [{ ...visible[0]!, published: null }], expected: 'blocked_unavailable' },
    { name: 'invisible source', change: { hidden: true }, references: [{ ...visible[0]!, visible: false }], expected: 'blocked_unavailable' },
    { name: 'stale reference', change: { hidden: true }, references: [{ ...visible[0]!, current: false }], expected: 'blocked_unavailable' },
    { name: 'deleted file', change: { hidden: true, deleted: true }, references: visible, expected: 'blocked_unavailable' },
    { name: 'security mismatch', change: { hidden: true, filename: 'lesson.exe' }, references: visible, expected: 'blocked_security' },
    { name: 'oversized file', change: { hidden: true, size: 100_000_000 }, references: visible, expected: 'blocked_size' },
  ])('$name', ({ change, references, expected }) => {
    expect(effectiveCanvasFileEligibility({ ...file, ...change }, references, now)).toBe(expected);
  });
  it('requires hidden metadata and accepts one visible source among denied references', () => {
    expect(isPageAccessibleCanvasFile(file, visible, now)).toBe(false);
    expect(isPageAccessibleCanvasFile({ ...file, hidden: true }, [
      { current: true, published: false, visible: false }, ...visible,
    ], now)).toBe(true);
  });
  it('uses the supplied clock for both file and source locks', () => {
    expect(effectiveCanvasFileEligibility({ ...file, hidden: true, unlockAt: '2026-10-19T02:00:00Z' }, visible, now)).toBe('eligible_document');
    expect(canvasSourceAccessReference({ published: true, unlockAt: '2026-10-19T04:00:00Z' }, now).visible).toBe(false);
    expect(canvasSourceAccessReference({ published: true, lockInfo: { locked_for_user: true } }, now).visible).toBe(false);
  });
});
