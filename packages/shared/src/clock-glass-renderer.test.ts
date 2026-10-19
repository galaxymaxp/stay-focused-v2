import * as THREE from 'three';
import { expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createClockGlass } from './clock-glass-renderer';
import type { ClockGlyphMetrics } from './clock-glyphs';

const metrics: ClockGlyphMetrics = JSON.parse(readFileSync(new URL('../../../apps/mobile/assets/clock/clock-atlas.json', import.meta.url), 'utf8'));
it('uses one target and one composite pass; text updates buffers without replacing texture or geometry', () => {
  const render = vi.fn(), setRenderTarget = vi.fn();
  const renderer = { extensions: { has: () => true }, getDrawingBufferSize: (v: THREE.Vector2) => v.set(300, 300), render, setRenderTarget } as unknown as THREE.WebGLRenderer;
  const atlas = new THREE.Texture(), orb = new THREE.Scene(), camera = new THREE.Camera();
  const glass = createClockGlass(renderer, atlas, metrics);
  glass.render(orb, camera, { text: '1:00 AM', fontSize: 32 }, 300, [1, 1], false);
  expect(render).toHaveBeenCalledTimes(2);
  expect(render.mock.calls[0]).toEqual([orb, camera]);
  expect(setRenderTarget.mock.calls[0]![0]).toBeInstanceOf(THREE.WebGLRenderTarget);
  expect(setRenderTarget.mock.calls[1]![0]).toBeNull();
  const composite = render.mock.calls[1]![0] as THREE.Scene;
  expect(composite.children).toHaveLength(2);
  const glyph = composite.children[1] as THREE.Mesh<THREE.BufferGeometry, THREE.ShaderMaterial>;
  const position = glyph.geometry.getAttribute('position') as THREE.BufferAttribute;
  const positions = position.array.slice(), version = position.version, textureVersion = atlas.version;
  glass.render(orb, camera, { text: '1:00 AM', fontSize: 32 }, 300, [1, 1], false);
  expect(position.version).toBe(version);
  glass.render(orb, camera, { text: '2:30 PM', fontSize: 32 }, 300, [1, 1], true);
  expect(position.version).toBe(version + 1);
  expect(position.array).not.toEqual(positions);
  expect(glyph.geometry.getAttribute('position')).toBe(position);
  expect(glyph.material.uniforms.uAtlas!.value).toBe(atlas);
  expect(atlas.version).toBe(textureVersion);
  expect(glyph.geometry.drawRange.count).toBe(36);
  const disposed = vi.fn(); glyph.geometry.addEventListener('dispose', disposed);
  glass.dispose(); expect(disposed).toHaveBeenCalledOnce();
});
it('fails safely before allocating a target on devices without float rendering', () => {
  expect(() => createClockGlass({ extensions: { has: () => false } } as unknown as THREE.WebGLRenderer, new THREE.Texture(), metrics)).toThrow('clock_float_target_unavailable');
});
