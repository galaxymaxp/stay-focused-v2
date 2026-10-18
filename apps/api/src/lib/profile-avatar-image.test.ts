import { createCanvas, loadImage } from '@napi-rs/canvas';
import { expect, it } from 'vitest';
import { normalizeAvatar, readAvatarBytes } from './profile-avatar-image';

it.each(['png', 'jpeg', 'webp'] as const)('normalizes real %s bytes to a square at most 512px', async format => {
  const canvas = createCanvas(1000, 600);
  const ctx = canvas.getContext('2d'); ctx.fillStyle = 'red'; ctx.fillRect(0, 0, 1000, 600);
  const bytes = format === 'png' ? await canvas.encode('png') : await canvas.encode(format);
  const normalized = await normalizeAvatar(bytes, `image/${format}`);
  const image = await loadImage(normalized);
  expect([image.width, image.height]).toEqual([512, 512]);
});
it('does not upscale small images', async () => {
  const normalized = await normalizeAvatar(await createCanvas(40, 20).encode('png'), 'image/png');
  expect((await loadImage(normalized)).width).toBe(20);
});
it('center crops rather than distorting or retaining the outer edges', async () => {
  const source = createCanvas(6, 2), context = source.getContext('2d');
  context.fillStyle = 'red'; context.fillRect(0, 0, 6, 2);
  context.fillStyle = 'blue'; context.fillRect(2, 0, 2, 2);
  const image = await loadImage(await normalizeAvatar(await source.encode('png'), 'image/png'));
  const output = createCanvas(2, 2), rendered = output.getContext('2d'); rendered.drawImage(image, 0, 0);
  expect(Array.from(rendered.getImageData(0, 0, 1, 1).data)).toEqual([0, 0, 255, 255]);
});
it('rejects MIME spoofing, corrupt files and oversized dimensions before decoding', async () => {
  await expect(normalizeAvatar(Buffer.from('<svg></svg>'), 'image/png')).rejects.toMatchObject({ status: 415 });
  const bytes = await createCanvas(2, 2).encode('png');
  await expect(normalizeAvatar(bytes, 'image/jpeg')).rejects.toMatchObject({ status: 415 });
  bytes.writeUInt32BE(99999, 16);
  await expect(normalizeAvatar(bytes, 'image/png')).rejects.toMatchObject({ status: 400 });
});
it('bounds declared and chunked wire bytes', async () => {
  await expect(readAvatarBytes(new Request('https://local.test', { method: 'PUT', body: 'x', headers: { 'content-length': '2097153' } }))).rejects.toMatchObject({ status: 413 });
  await expect(readAvatarBytes(new Request('https://local.test', { method: 'PUT', body: new Uint8Array(2097153) }))).rejects.toMatchObject({ status: 413 });
});
