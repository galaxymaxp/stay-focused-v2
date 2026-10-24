import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import { compareResumeCaptures } from './verify-resume-text-captures.mjs';

async function fixture(t) {
  const root = await mkdtemp(path.join(tmpdir(), 'resume-capture-'));
  t.after(async () => {
    assert(path.resolve(root).startsWith(path.resolve(tmpdir()) + path.sep));
    await rm(root, { recursive: true, force: true });
  });
  async function image(name, bright, width = 80, corner = 20) {
    const file = path.join(root, name);
    const data = Buffer.alloc(width * 60 * 4, 255);
    for (let y = 0; y < 60; y++) for (let x = 0; x < width; x++) {
      const value = x < 5 && y < 5 ? corner : bright && x >= 20 && x < 40 && y >= 10 && y < 30 ? 240 : 20;
      const i = (y * width + x) * 4; data[i] = value; data[i + 1] = value; data[i + 2] = value;
    }
    await sharp(data, { raw: { width, height: 60, channels: 4 } }).png().toFile(file);
    return file;
  }
  return { image, regions: [{ name: 'known text region', bounds: [15, 5, 45, 35], minLightPixels: 100 }] };
}

test('unchanged visible regions pass while whole frames can differ elsewhere', async t => {
  const f = await fixture(t), before = await f.image('before.png', true), after = await f.image('after.png', true, 80, 100);
  const result = await compareResumeCaptures(before, after, f.regions);
  assert.equal(result.allRegionsUnchangedAndVisible, true);
  assert.notEqual(result.beforeSha256, result.afterSha256);
  assert.equal(result.regions[0].after.lightPixels, 400);
});
test('lost text fails even if an external tree still declares the region', async t => {
  const f = await fixture(t), before = await f.image('before.png', true), after = await f.image('after.png', false);
  const result = await compareResumeCaptures(before, after, f.regions);
  assert.equal(result.allRegionsUnchangedAndVisible, false);
  assert.equal(result.regions[0].visibleInBoth, false);
});
test('two identical empty patches cannot certify visible text', async t => {
  const f = await fixture(t), before = await f.image('before.png', false), after = await f.image('after.png', false);
  const result = await compareResumeCaptures(before, after, f.regions);
  assert.equal(result.regions[0].unchanged, true);
  assert.equal(result.allRegionsUnchangedAndVisible, false);
});
test('dimension mismatch fails closed', async t => {
  const f = await fixture(t), before = await f.image('before.png', true), after = await f.image('after.png', true, 90);
  await assert.rejects(compareResumeCaptures(before, after, f.regions), /dimensions differ/);
});
test('clipped, empty and unthresholded regions cannot pass', async t => {
  const f = await fixture(t), before = await f.image('before.png', true);
  for (const bounds of [[-1, 0, 20, 20], [0, 0, 100, 10], [0, 0, 0, 10]])
    await assert.rejects(compareResumeCaptures(before, before, [{ ...f.regions[0], bounds }]), /bounds/);
  await assert.rejects(compareResumeCaptures(before, before, []), /regions are required/);
  await assert.rejects(compareResumeCaptures(before, before, [{ ...f.regions[0], minLightPixels: 0 }]), /threshold/);
});
