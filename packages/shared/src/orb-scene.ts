// GPU-only subpath: never export through the normal shared barrel.
import * as THREE from 'three';
import { ORB_AMBIENT_PROFILES, type OrbVariant } from './orb-ambient';

export const ORB_CAMERA_DISTANCE = 4.55;
export const ORB_CAMERA_FOV = 36;
export const DAY_ORB_FILL = (0.95 * 2) / (2 * ORB_CAMERA_DISTANCE * Math.tan((ORB_CAMERA_FOV / 2) * (Math.PI / 180)));

/** The same output transform for every live glass surface. */
export function configureOrbRenderer(renderer: THREE.WebGLRenderer) {
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.02;
  if (renderer.debug) renderer.debug.onShaderError = () => { throw new Error('orb_shader_unavailable'); };
}

/** Geometry is attached to root by the caller; the orb camera is unchanged. */
export function createOrbStage(variant: OrbVariant = 'clock') {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(ORB_CAMERA_FOV, 1, 0.1, 100);
  camera.zoom = 1 / ORB_AMBIENT_PROFILES[variant].canvasScale;
  camera.updateProjectionMatrix();
  camera.position.set(0, 0.02, ORB_CAMERA_DISTANCE);
  const root = new THREE.Group();
  scene.add(root);
  return { scene, camera, root };
}
