import sharp from 'sharp';
import { resolve } from 'node:path';

const sourcePath = resolve('apps/mobile/assets/branding/orb-source.png');
const outputPath = resolve('apps/mobile/assets/branding/app-icon.png');
const adaptivePath = resolve('apps/mobile/assets/branding/orb-adaptive-foreground.png');
const monochromePath = resolve('apps/mobile/assets/branding/orb-monochrome.png');
const size = 1024;
const orbSize = 800;

const { data, info } = await sharp(sourcePath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
let left = info.width, top = info.height, right = -1, bottom = -1;
for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) {
  if (data[(y * info.width + x) * info.channels + 3] < 24) continue;
  left = Math.min(left, x);
  top = Math.min(top, y);
  right = Math.max(right, x);
  bottom = Math.max(bottom, y);
}
if (right < left || bottom < top) throw new Error('Orb source has no visible pixels');
const cropWidth = right - left + 1;
const cropHeight = bottom - top + 1;
const orb = await sharp(sourcePath)
  .extract({ left, top, width: cropWidth, height: cropHeight })
  .resize(orbSize, orbSize, { fit: 'contain' })
  .png().toBuffer();
const background = Buffer.from(`<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg"><defs><radialGradient id="g"><stop offset="0" stop-color="#252525"/><stop offset="0.58" stop-color="#0d0d0e"/><stop offset="1" stop-color="#020203"/></radialGradient></defs><rect width="100%" height="100%" fill="url(#g)"/></svg>`);
await sharp(background).composite([{ input: orb, left: (size - orbSize) / 2, top: (size - orbSize) / 2 }]).png().toFile(outputPath);
const { data: paddedOrb, info: paddedInfo } = await sharp(adaptivePath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const monochrome = Buffer.alloc(paddedOrb.length);
for (let i = 0; i < paddedOrb.length; i += 4) {
  const luminance = 0.2126 * paddedOrb[i] + 0.7152 * paddedOrb[i + 1] + 0.0722 * paddedOrb[i + 2];
  monochrome[i] = monochrome[i + 1] = monochrome[i + 2] = 255;
  monochrome[i + 3] = Math.round(paddedOrb[i + 3] * (0.25 + 0.75 * luminance / 255));
}
await sharp(monochrome, { raw: { width: paddedInfo.width, height: paddedInfo.height, channels: 4 } }).png().toFile(monochromePath);
console.log(JSON.stringify({ outputPath, monochromePath, sourceBounds: { left, top, right, bottom }, orbSize }));
