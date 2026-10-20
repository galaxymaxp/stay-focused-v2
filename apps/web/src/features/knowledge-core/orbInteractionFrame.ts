import { sampleOrbInteraction } from '@stay-focused/shared';
import * as THREE from 'three';
import type { OrbInteractionHandle } from './orbInteraction';
export function createOrbInteractionSampler(interaction: OrbInteractionHandle) {
  const rotation = new THREE.Matrix4(), matrix = new THREE.Matrix3(), euler = new THREE.Euler();
  return (now: number, dtMs: number, reducedMotion: boolean, spin: THREE.Matrix3) => {
    const frame = sampleOrbInteraction(interaction.state.current, now, dtMs, reducedMotion);
    interaction.state.current = frame.state;
    const pose = frame.state.spin;
    // uSpin maps world positions into liquid coordinates, so use the inverse drag pose.
    spin.multiply(matrix.setFromMatrix4(rotation.makeRotationFromEuler(euler.set(pose.x, pose.y, 0)).invert()));
    return frame;
  };
}
