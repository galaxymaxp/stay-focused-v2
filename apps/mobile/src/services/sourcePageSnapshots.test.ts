import { describe, expect, it, vi } from 'vitest';
import { clampPagePan, clampPageZoom, readPageSnapshot } from './sourcePageSnapshots';
describe('snapshot bearer client and zoom bounds', () => {
  it.each(['rendering', 'unrendered'])('keeps the slide label while %s', async status => {
    const data = { available: true, status, page: 2, labelKind: 'slide' };
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ ok: true, data })));
    expect(await readPageSnapshot({ baseUrl: 'https://api.example.test', accessToken: 'jwt', fetchImpl }, 'artifact', 'section', false)).toEqual(data);
  });
  it('keeps the slide label for a ready image', async () => {
    const data = { available: true, page: 2, labelKind: 'slide', url: 'https://image.example.test/page.png', width: 1400, height: 800, sourceLabel: 'Deck' };
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ ok: true, data })));
    expect(await readPageSnapshot({ baseUrl: 'https://api.example.test', accessToken: 'jwt', fetchImpl }, 'artifact', 'section', false)).toEqual(data);
  });
  it('rejects an unsupported label kind', async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ ok: true, data: { available: true, status: 'unrendered', page: 2, labelKind: 'guessed' } })));
    await expect(readPageSnapshot({ baseUrl: 'https://api.example.test', accessToken: 'jwt', fetchImpl }, 'artifact', 'section', false)).rejects.toThrow('snapshot_invalid');
  });
  it('sends the bearer JWT and reads availability without admission', async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ ok: true, data: { available: true, status: 'unrendered', page: 2 } })));
    expect(await readPageSnapshot({ baseUrl: 'https://api.example.test', accessToken: 'jwt', fetchImpl }, 'artifact', 'section', false)).toEqual({ available: true, status: 'unrendered', page: 2 });
    expect(fetchImpl).toHaveBeenCalledWith('https://api.example.test/api/reviewers/artifact/sections/section/snapshot?render=0', expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'Bearer jwt' }) }));
  });
  it.each([{ available: true, page: 0 }, { available: true, page: 2, url: 'file:///private.pdf' }, { available: true, page: 2, status: 'unknown' }])('rejects malformed payload %j', async data => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ ok: true, data })));
    await expect(readPageSnapshot({ baseUrl: 'https://api.example.test', accessToken: 'jwt', fetchImpl }, 'artifact', 'section', true)).rejects.toThrow();
  });
  it('bounds pinch/double-tap zoom and pan so the page can always be recovered', () => {
    expect(clampPageZoom(0.5)).toBe(1); expect(clampPageZoom(9)).toBe(4);
    expect(clampPagePan(200, 300, 2)).toBe(150); expect(clampPagePan(-200, 300, 2)).toBe(-150);
    expect(clampPagePan(200, 300, 1)).toBe(0);
  });
  it('preserves a deleted source page number for unavailable copy', async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ ok: true,
      data: { available: false, reason: 'source_revision_unavailable', page: 9 } })));
    expect(await readPageSnapshot({ baseUrl: 'https://api.example.test', accessToken: 'jwt', fetchImpl }, 'artifact', 'section', false))
      .toEqual({ available: false, reason: 'source_revision_unavailable', page: 9 });
  });
  it.each([0, 101, 1.5, '2'])('rejects malformed unavailable page %s', async page => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ ok: true,
      data: { available: false, reason: 'source_revision_unavailable', page } })));
    await expect(readPageSnapshot({ baseUrl: 'https://api.example.test', accessToken: 'jwt', fetchImpl }, 'artifact', 'section', false)).rejects.toThrow();
  });
});
