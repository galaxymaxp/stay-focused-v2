import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import sharp from 'sharp';

const digest = bytes => createHash('sha256').update(bytes).digest('hex');

/** Compare declared, visually identified UI regions, never UI-tree presence alone.
 * Reports contain hashes/counts only. Exact matches prove unchanged sampled pixels,
 * not continuous rendering, arbitrary text recognition, or the physical display.
 */
export async function compareResumeCaptures(beforePath, afterPath, regions) {
  if (!Array.isArray(regions) || regions.length === 0) throw new Error('Explicit text regions are required');
  const [beforeBytes, afterBytes] = await Promise.all([readFile(beforePath), readFile(afterPath)]);
  const [before, after] = await Promise.all([beforeBytes, afterBytes].map(bytes => sharp(bytes).ensureAlpha().raw().toBuffer({ resolveWithObject: true })));
  if (before.info.width !== after.info.width || before.info.height !== after.info.height) throw new Error('Capture dimensions differ');
  const names = new Set();
  const rows = regions.map(({ name, bounds, minLightPixels }) => {
    if (typeof name !== 'string' || !name || names.has(name)) throw new Error('Region names must be unique');
    names.add(name);
    if (!Array.isArray(bounds) || bounds.length !== 4 || !bounds.every(Number.isInteger)) throw new Error('Invalid region bounds');
    const [left, top, right, bottom] = bounds;
    if (left < 0 || top < 0 || right <= left || bottom <= top || right > before.info.width || bottom > before.info.height) throw new Error('Region exceeds capture bounds');
    if (!Number.isInteger(minLightPixels) || minLightPixels < 1) throw new Error('A positive visible-pixel threshold is required');
    function patch(frame) {
      const bytes = Buffer.alloc((right - left) * (bottom - top) * 4);
      let offset = 0, lightPixels = 0;
      for (let y = top; y < bottom; y++) for (let x = left; x < right; x++) {
        const i = (y * frame.info.width + x) * 4;
        frame.data.copy(bytes, offset, i, i + 4); offset += 4;
        const channels = [...frame.data.subarray(i, i + 3)];
        if (Math.min(...channels) > 110 && Math.max(...channels) - Math.min(...channels) < 40 && frame.data[i + 3] === 255) lightPixels++;
      }
      return { sha256: digest(bytes), lightPixels };
    }
    const original = patch(before), followup = patch(after);
    return { name, bounds, minLightPixels, before: original, after: followup,
      unchanged: original.sha256 === followup.sha256,
      visibleInBoth: original.lightPixels >= minLightPixels && followup.lightPixels >= minLightPixels };
  });
  return { beforeSha256: digest(beforeBytes), afterSha256: digest(afterBytes),
    width: before.info.width, height: before.info.height, regions: rows,
    allRegionsUnchangedAndVisible: rows.every(row => row.unchanged && row.visibleInBoth),
    limitation: 'Declared sampled regions only; no OCR, continuous-rendering, physical-display or active-update identity claim.' };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const args = process.argv.slice(2);
    if (args.length !== 4) throw new Error('Usage: node verify-resume-text-captures.mjs BEFORE.png AFTER.png REGIONS.json OUTPUT.json');
    const result = await compareResumeCaptures(args[0], args[1], JSON.parse(await readFile(args[2], 'utf8')));
    await writeFile(args[3], JSON.stringify(result, null, 2) + '\n');
    console.log(JSON.stringify({ allRegionsUnchangedAndVisible: result.allRegionsUnchangedAndVisible, regions: result.regions.length }));
    process.exitCode = result.allRegionsUnchangedAndVisible ? 0 : 1;
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
