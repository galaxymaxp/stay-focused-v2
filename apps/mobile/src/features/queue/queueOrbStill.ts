import { createOrbStillCache, orbStillKey, type OrbStillRequest } from '@stay-focused/shared/orb-still';
import { palettes } from '../../design/themeTokens';

let tail: Promise<unknown> = Promise.resolve();
/** Headless one-shot GL, serialized across all consumers. No mounted GLView. */
export const queueOrbStills = createOrbStillCache<string>(request => {
  const pending = tail.catch(() => {}).then(() => renderQueueOrbStill(request));
  tail = pending; return pending;
});
async function renderQueueOrbStill(request: OrbStillRequest): Promise<string> {
  const key = orbStillKey(request);
  const [fs, { GLView }, THREE, { createOrbStillScene }, { threeContext }] = await Promise.all([
    import('expo-file-system/legacy'), import('expo-gl'), import('three'),
    import('@stay-focused/shared/orb-still-renderer'), import('../generation-core/threeContext'),
  ]);
  const uri = fs.cacheDirectory ? `${fs.cacheDirectory}${key}.png` : null;
  if (uri && (await fs.getInfoAsync(uri)).exists) return uri;
  const gl = await GLView.createContextAsync();
  let renderer: InstanceType<typeof THREE.WebGLRenderer> | undefined;
  let scene: ReturnType<typeof createOrbStillScene> | undefined;
  let target: import('three').WebGLRenderTarget<import('three').Texture> | undefined;
  try {
    const canvas = { width: request.pixels, height: request.pixels, style: {},
      addEventListener() {}, removeEventListener() {}, getContext: () => threeContext(gl) };
    renderer = new THREE.WebGLRenderer({ canvas: canvas as unknown as HTMLCanvasElement,
      context: threeContext(gl), alpha: true, antialias: true });
    target = new THREE.WebGLRenderTarget(request.pixels, request.pixels, { samples: 4 });
    // The shared snapshot shader writes display-encoded bytes itself, in the
    // same order as Today's screen shader. Hardware sRGB would encode twice.
    target.texture.colorSpace = THREE.NoColorSpace;
    renderer.setRenderTarget(target);
    scene = createOrbStillScene(request); scene.render(renderer, palettes[request.mode].backgroundPrimary);
    // Resolve multisampling before the snapshot. Bind the resolved framebuffer
    // explicitly; a headless Expo context has no default presented framebuffer.
    renderer.setRenderTarget(null);
    const properties = renderer.properties.get(target) as { __webglFramebuffer?: WebGLFramebuffer };
    if (!properties.__webglFramebuffer) throw new Error('orb_still_unavailable');
    const snapshot = await GLView.takeSnapshotAsync(gl, { framebuffer: properties.__webglFramebuffer,
      // Expo's default false already converts GL's bottom-up rows to an
      // upright image (GLContext.java / EXGLContext.mm). True flips it again.
      rect: { x: 0, y: 0, width: request.pixels, height: request.pixels }, flip: false, format: 'png' });
    if (uri) { await fs.moveAsync({ from: snapshot.localUri, to: uri }); return uri; }
    return snapshot.localUri;
  } finally {
    scene?.dispose(); target?.dispose(); renderer?.dispose();
    await GLView.destroyContextAsync(gl);
  }
}
