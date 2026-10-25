import { createOrbStillCache, orbStillKey, type OrbStillRequest } from '@stay-focused/shared/orb-still';

let tail: Promise<unknown> = Promise.resolve();
/** One short-lived offscreen renderer on a miss; nothing runs on a cache hit. */
export const queueOrbStills = createOrbStillCache<string>(request => {
  const pending = tail.catch(() => {}).then(async () => {
    const key = orbStillKey(request);
    const url = `${location.origin}/queue/still-cache/${key}.png`;
    let disk: Cache | undefined;
    try {
      disk = await window.caches?.open('sf-orb-stills-ql1-v1');
      const saved = await disk?.match(url);
      if (saved) return await saved.text();
    } catch { /* Private browsing/quota: the bounded memory cache still works. */ }
    const image = await renderQueueOrbStill(request);
    try { await disk?.put(url, new Response(image)); } catch { /* Optional asset cache. */ }
    return image;
  });
  tail = pending;
  return pending;
});

export async function renderQueueOrbStill(request: OrbStillRequest): Promise<string> {
  const [{ WebGLRenderer }, { createOrbStillScene }] = await Promise.all([
    import('three'), import('@stay-focused/shared/orb-still-renderer'),
  ]);
  const canvas = document.createElement('canvas');
  const renderer = new WebGLRenderer({ canvas, alpha: true, antialias: true, preserveDrawingBuffer: true });
  let scene: ReturnType<typeof createOrbStillScene> | undefined;
  try {
    renderer.setSize(request.pixels, request.pixels, false);
    scene = createOrbStillScene(request); scene.render(renderer);
    return canvas.toDataURL('image/png');
  } finally { scene?.dispose(); renderer.dispose(); renderer.forceContextLoss(); }
}
