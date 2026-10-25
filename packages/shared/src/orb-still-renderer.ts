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
  const fragment = body.mesh.material.fragmentShader;
  body.update({ idleColor: request.color, mode: request.mode, time: 8.4,
    life: 0.22, stir: 0, glow: 0.35 + 0.85 * 0.75, level: 0, error: 0,
    spin: new THREE.Matrix3(), light: { x: 0, y: 0.374, z: 0.28 } });
  return {
    render(renderer: THREE.WebGLRenderer, paper?: string) {
      configureOrbRenderer(renderer);
      const material = body.mesh.material;
      // Three r166 omits tone mapping and selects linear output for ordinary
      // render targets. Snapshot bytes need the exact screen ACES/sRGB sequence,
      // before premultiplication, rather than framebuffer sRGB conversion after
      // blending. Reuse Three's output functions and the unchanged body shader.
      if (paper) {
        const backing = new THREE.Color(paper).convertLinearToSRGB();
        material.toneMapped = false;
        material.uniforms.toneMappingExposure = { value: renderer.toneMappingExposure };
        material.uniforms.uStillPaper = { value: backing };
        material.fragmentShader = '#include <tonemapping_pars_fragment>\nuniform vec3 uStillPaper;\n' + fragment
          .replace('#include <tonemapping_fragment>', 'gl_FragColor.rgb = ACESFilmicToneMapping(gl_FragColor.rgb);')
          .replace('#include <colorspace_fragment>', 'gl_FragColor = sRGBTransferOETF(gl_FragColor);')
          .replace('gl_FragColor.rgb *= gl_FragColor.a;', `gl_FragColor.rgb *= gl_FragColor.a;
            gl_FragColor.rgb += uStillPaper * (1.0 - gl_FragColor.a);
            gl_FragColor.a = 1.0;`);
        // Opaque paper also avoids PNG encoders interpreting premultiplied
        // pixels differently. Consumers retain the circular body footprint.
        renderer.setClearColor(backing, 1);
      } else { material.toneMapped = true; material.fragmentShader = fragment; }
      material.needsUpdate = true;
      renderer.render(scene, camera);
    },
    dispose() { body.dispose(); },
  };
}
