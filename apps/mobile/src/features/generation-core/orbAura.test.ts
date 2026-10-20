import { PerspectiveCamera, ShaderMaterial, Vector3 } from 'three';
import { expect, it, vi } from 'vitest';
import { createOrbAura, orbShimmerLevel, SHIMMER_SPEED } from './orbAura';
import { createOrbBody } from './orbBody';

it('keeps the existing irregular body shimmer bounded', () => {
  const levels = Array.from({ length: 400 }, (_, i) => orbShimmerLevel(i * 0.05));
  levels.forEach(level => expect(Math.abs(level)).toBeLessThanOrEqual(1));
  expect(Math.max(...levels) - Math.min(...levels)).toBeGreaterThan(1);
  const peaks = levels.filter((level, i) => i > 0 && level > levels[i - 1]! && level > (levels[i + 1] ?? Infinity));
  expect(new Set(peaks.map(peak => peak.toFixed(2))).size).toBeGreaterThan(3);
});

it('preserves the existing body shimmer clock independently of the ambient field', () => {
  const aura = createOrbAura();
  aura.stepShimmer(0.25, 1, 1, 0);
  expect(aura.shimmer.time).toBeCloseTo(0.25 * SHIMMER_SPEED);
  expect(aura.shimmer.level).toBe(orbShimmerLevel(aura.shimmer.time));
  const held = aura.shimmer.time;
  aura.stepShimmer(0.25, 0, 1, 1);
  expect(aura.shimmer.time).toBe(held); expect(aura.shimmer.level).toBeCloseTo(0);
  aura.dispose();
});
it('copies the body source and camera pose, snaps reduced-motion colors and disposes resources', () => {
  const aura = createOrbAura(), body = createOrbBody();
  const frame = { delta: 0, shimmer: 0, shimmerAmount: 0, glow: 1, error: 0,
    mode: 'dark' as const, camera: new PerspectiveCamera(), center: new Vector3(0, 0.02, 0),
    source: body.uniforms, reducedMotion: true };
  body.uniforms.uBase.value.set('#f4c542'); body.uniforms.uGlow.value = 1;
  aura.update(frame);
  const u = (aura.mesh.material as ShaderMaterial).uniforms;
  expect(u.uSource!.value.image).toMatchObject({ width: 64, height: 64 });
  expect(aura.mesh.position.equals(frame.center)).toBe(true);
  expect(aura.mesh.quaternion.equals(frame.camera.quaternion)).toBe(true);
  body.uniforms.uBase.value.set('#e6eaf1'); aura.update(frame);
  expect(u.uSource!.value.image).toMatchObject({ width: 64, height: 64 });
  body.uniforms.uError.value = 1; aura.update(frame);
  expect(u.uStrength!.value).toBe(0);
  const geo = vi.spyOn(aura.mesh.geometry, 'dispose');
  const mat = vi.spyOn(aura.mesh.material as ShaderMaterial, 'dispose');
  aura.dispose(); aura.dispose(); body.dispose();
  expect(geo).toHaveBeenCalledOnce(); expect(mat).toHaveBeenCalledOnce();
});
