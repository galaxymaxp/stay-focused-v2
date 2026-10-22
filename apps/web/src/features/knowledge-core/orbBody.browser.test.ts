import { createServer, type Server } from 'node:http';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { chromium, type Browser } from 'playwright';
import { build } from 'vite';
import { afterAll, beforeAll, expect, it } from 'vitest';
import { ORB_IDLE_PALETTE } from '@stay-focused/shared';

// Execute both actual adapters in software WebGL. This proves local shader
// compatibility/parity, never native GPU presentation or physical performance.
let server: Server, browser: Browser, origin: string, out: string;
beforeAll(async () => {
  const file = (path: string) => resolve(path).replaceAll('\\', '/');
  const entry = `import * as THREE from 'three';
    import {createOrbBody as web} from '${file('src/features/knowledge-core/orbBody.ts')}';
    import {createOrbBody as mobile} from '${file('../mobile/src/features/generation-core/orbBody.ts')}';
    const renderer = new THREE.WebGLRenderer({alpha:true,antialias:false});
    renderer.setSize(256,256); renderer.setClearColor(0,0);
    renderer.outputColorSpace=THREE.SRGBColorSpace;
    renderer.toneMapping=THREE.ACESFilmicToneMapping; renderer.toneMappingExposure=1.02;
    const camera=new THREE.PerspectiveCamera(36,1,0.1,100);camera.position.set(0,0.02,4.55);camera.lookAt(0,0,0);
    window.probe=(platform,mode,color,time)=>{
      const body=(platform==='web'?web:mobile)(),scene=new THREE.Scene();scene.add(body.mesh);
      body.update({mode,idleColor:color,time,life:0.22,stir:0,glow:0.8,level:0,error:0,
        spin:new THREE.Matrix3(),light:{x:0.2,y:0.45,z:0.1}});
      renderer.render(scene,camera);const gl=renderer.getContext(),data=new Uint8Array(256*256*4);
      gl.readPixels(0,0,256,256,gl.RGBA,gl.UNSIGNED_BYTE,data);body.dispose();return Array.from(data);
    };`;
  out = mkdtempSync(resolve('../../tmp/overnight/OX2P-shader-'));
  await build({ configFile: false, logLevel: 'silent', root: resolve('.'), publicDir: false,
    plugins: [{ name: 'light-glass-probe', resolveId: id => id === 'probe' ? '\0probe' : null,
      load: id => id === '\0probe' ? entry : null }],
    build: { outDir: out, emptyOutDir: true, rollupOptions: { input: 'probe', output: { entryFileNames: 'entry.js' } } } });
  server = createServer((req, res) => {
    if (req.url === '/') { res.setHeader('Content-Type', 'text/html'); res.end('<script type="module" src="/entry.js"></script>'); }
    else if (req.url === '/entry.js') { res.setHeader('Content-Type', 'text/javascript'); res.end(readFileSync(join(out, 'entry.js'))); }
    else res.writeHead(404).end();
  });
  await new Promise<void>(done => server.listen(0, '127.0.0.1', done));
  const address = server.address(); if (!address || typeof address === 'string') throw new Error('local_probe_server');
  origin = `http://127.0.0.1:${address.port}`;
  browser = await chromium.launch({ headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
}, 60_000);
afterAll(async () => {
  await browser?.close();
  await new Promise<void>(done => server ? server.close(() => done()) : done());
  if (out) rmSync(out, { recursive: true, force: true });
});

it.each(ORB_IDLE_PALETTE)('renders matching $key clear glass and moving liquid with transparent corners', async color => {
  const page = await browser.newPage();
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.route('**/*', route => route.request().url().startsWith(origin) ? route.continue() : route.abort());
  try {
    await page.goto(origin);
    await page.waitForFunction(() => 'probe' in window);
    const result = await page.evaluate(hex => {
      const probe = (window as unknown as { probe(platform: string, mode: string, color: string, time: number): number[] }).probe;
      const light = probe('web', 'light', hex, 8.4), dark = probe('web', 'dark', hex, 8.4);
      const native = probe('mobile', 'light', hex, 8.4), moved = probe('web', 'light', hex, 9.8);
      let parity = 0, outside = 0, motion = 0, translucent = 0, covered = 0;
      let lightRim = 0, darkRim = 0, rimPixels = 0;
      for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++) {
        const i = (y * 256 + x) * 4, r = Math.hypot(x + 0.5 - 128, y + 0.5 - 128);
        for (let c = 0; c < 4; c++) parity = Math.max(parity, Math.abs(light[i + c]! - native[i + c]!));
        if (r > 105) for (let c = 0; c < 4; c++) outside = Math.max(outside, light[i + c]!);
        if (r < 75 && light[i + 3]! > 0) {
          covered++; if (light[i + 3]! < 180) translucent++;
          motion += Math.abs(light[i]! - moved[i]!) + Math.abs(light[i + 1]! - moved[i + 1]!) + Math.abs(light[i + 2]! - moved[i + 2]!);
        }
        if (r > 81 && r < 85 && light[i + 3]! > 0) { lightRim += light[i + 3]!; darkRim += dark[i + 3]!; rimPixels++; }
      }
      return { parity, outside, motion, translucent, covered, lightRim, darkRim, rimPixels };
    }, color.hex);
    expect(errors).toEqual([]);
    expect(result.parity).toBe(0);
    expect(result.outside).toBe(0);
    expect(result.covered).toBeGreaterThan(10_000);
    expect(result.translucent / result.covered).toBeGreaterThan(0.95);
    expect(result.motion).toBeGreaterThan(1000);
    expect(result.rimPixels).toBeGreaterThan(100);
    expect(result.lightRim).toBeLessThan(result.darkRim);
  } finally { await page.close(); }
}, 30_000);
