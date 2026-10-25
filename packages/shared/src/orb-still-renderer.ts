// GPU-only subpath. Queue never changes the live Today/Generation scene.
import * as THREE from 'three';
import { createOrbBody } from './orb-body-renderer';
import { configureOrbRenderer, createOrbStage, DAY_ORB_FILL } from './orb-scene';
import { orbStillKey, type OrbStillRequest } from './orb-still';

/** Today at noon, time 8.4 and identity spin, without digits or ambient spill.
 * The camera crops the exact clock body to its diameter; no highlight/exposure
 * adjustment, independent pearl shader or miniature light is introduced.
 */
export function createOrbStillScene(request: OrbStillRequest) {
  orbStillKey(request);
  const { scene, camera, root } = createOrbStage('clock');
  camera.zoom /= DAY_ORB_FILL;
  camera.updateProjectionMatrix();
  camera.lookAt(0, 0, 0); camera.updateMatrixWorld();
  const body = createOrbBody(); root.add(body.mesh);
  body.update({ idleColor: request.color, mode: request.mode, time: 8.4,
    life: 0.22, stir: 0, glow: 0.35 + 0.85 * 0.75, level: 0, error: 0,
    spin: new THREE.Matrix3(), light: { x: 0, y: 0.374, z: 0.28 } });
  return {
    render(renderer: THREE.WebGLRenderer) {
      configureOrbRenderer(renderer);
      renderer.render(scene, camera);
    },
    dispose() { body.dispose(); },
  };
}
