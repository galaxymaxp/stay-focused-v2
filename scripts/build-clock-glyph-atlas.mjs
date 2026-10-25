// Offline, deterministic build input: the committed Inter Bold TTF (SIL OFL).
// Run from the repository root. Never imported by either app.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import generate from 'msdf-bmfont-xml';

const label = process.argv.includes('--label');
const charset = label ? 'Plan' : '0123456789:AMP ';
const name = label ? 'plan-atlas' : 'clock-atlas';
const font = await readFile('apps/mobile/assets/fonts/inter/Inter-Bold.ttf');
const { textures, data } = await new Promise((resolve, reject) => {
  generate(font, {
    filename: name, outputType: 'json', charset,
    fontSize: 64, textureSize: [512, 256], distanceRange: 8,
    fieldType: 'msdf', smartSize: false, rot: false, border: 4,
  }, (error, textures, result) => error ? reject(error) : resolve({ textures, data: JSON.parse(result.data) }));
});
if (textures.length !== 1) throw new Error('Clock atlas must fit in one texture');
const metrics = {
  version: 1, font: 'Inter Bold', fontSize: data.info.size, base: data.common.base,
  width: data.common.scaleW, height: data.common.scaleH, distanceRange: 8,
  glyphs: Object.fromEntries(data.chars.map(glyph => [String.fromCodePoint(glyph.id), {
    advance: glyph.xadvance, bearingX: glyph.xoffset, bearingY: data.common.base - glyph.yoffset,
    width: glyph.width, height: glyph.height,
    uv: [glyph.x / data.common.scaleW, glyph.y / data.common.scaleH,
      (glyph.x + glyph.width) / data.common.scaleW, (glyph.y + glyph.height) / data.common.scaleH],
  }])),
};
for (const char of charset) if (!metrics.glyphs[char]) throw new Error(`Missing glyph ${char}`);
for (const dir of ['apps/mobile/assets/clock', 'apps/web/public/clock']) {
  await mkdir(dir, { recursive: true });
  await writeFile(`${dir}/${name}.png`, textures[0].texture);
  await writeFile(`${dir}/${name}.json`, `${JSON.stringify(metrics, null, 2)}\n`);
}
console.log(`${name}: ${charset.length} glyphs, one 512x256 MSDF texture, both platforms`);
