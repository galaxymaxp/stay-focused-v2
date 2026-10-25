import { createHash } from 'node:crypto';
import * as THREE from 'three';
import { expect, it } from 'vitest';
import { createOrbBody } from './orb-body-renderer';
it('builds the exact orb sheet in a weightless slab and preserves the TP2b orb fragment bytes', () => {
  const orb = createOrbBody();
  const slab = createOrbBody(new THREE.BoxGeometry(), { halfSize: new THREE.Vector3(3, .5, .135), cornerRadius: .25 });
  const program = slab.mesh.material.fragmentShader;
  expect(program).toContain('float sheet = smoothstep(0.3, 0.9, liquid(uSpin * x)) * held;');
  expect(program).not.toMatch(/\b(surface|filled|uSlosh)\b/);
  expect(createHash('sha256').update(orb.mesh.material.fragmentShader).digest('hex')).toBe('995158629143190bbfc6914d79a8bf45a1005378eb361d7978ceea98bae977e7');
  expect(slab.mesh.material.vertexShader).not.toContain('rippleHeight');
  expect(program).toContain('x *= uHalfSize / uRadius;');
  orb.dispose(); slab.dispose();
});
