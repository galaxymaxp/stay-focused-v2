import { createServer, type Server } from 'node:http';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { chromium, type Browser, type Page } from 'playwright';
import { build, type Plugin } from 'vite';
import { afterAll, beforeAll, expect, it } from 'vitest';


// Actual DayRingClock, orb, shared shader and CSS; all traffic is loopback only.
// Today, actual GenerationOrb and the retained KnowledgeCore render paths.
const stubs: Record<string, string> = {
  entry: `import { createRoot } from 'react-dom/client';
    import { createElement, useState } from 'react';
    import { DayRingClock } from '${resolve('src/features/day-clock/DayRingClock.tsx').replace(/\\/g, '/')}';
    import { DayOrb } from '${resolve('src/features/day-clock/DayOrb.tsx').replace(/\\/g, '/')}';
    import { GenerationOrb } from '${resolve('src/features/day-clock/GenerationOrb.tsx').replace(/\\/g, '/')}';
    import { KnowledgeCore } from '${resolve('src/features/knowledge-core/KnowledgeCore.tsx').replace(/\\/g, '/')}';
    function App() {
      const [state, setState] = useState('idle'); window.__setState = setState;
      const [range, setRange] = useState({ start: 720, end: 1080 });
      if (location.search.includes('generation')) return createElement(GenerationOrb, { state });
      if (location.search.includes('core')) return createElement(KnowledgeCore, { state });
      if (location.search.includes('orb')) return createElement(DayOrb, { minutes: 720, size: 315, state: 'generating',
        clock: location.search.includes('glass') ? { text: '12:00 PM', fontSize: 40 } : undefined });
      return createElement('main', { style: { width: 'min(400px, 100%)', margin: '40px auto' } },
        createElement(DayRingClock, { date: '2026-10-19', timeline: [], ...range,
          onCommit: (start, end) => setRange({ start, end }) }));
    }
    createRoot(document.getElementById('root')).render(createElement(App));`,
  // Instrument renderer submission time and info; do not claim GPU/device timing.
  three: `import { WebGLRenderer as Original } from '${resolve('../../node_modules/three/build/three.module.js').replace(/\\/g, '/')}';
    export * from '${resolve('../../node_modules/three/build/three.module.js').replace(/\\/g, '/')}';
    export class WebGLRenderer extends Original {
      constructor(options) {
        super({ ...options, preserveDrawingBuffer: true }); const original = this.render.bind(this);
        window.__renders = [];
        this.render = (scene, camera) => {
          for (const child of scene.children) {
            if (child.material?.uniforms?.uStrength && this.getRenderTarget()?.texture.name !== 'orb-ambient-source') {
              child.visible = window.__showSpill !== false;
              window.__redraw = () => this.render(scene, camera);
              window.__ambient = child.material.uniforms;
            }
          }
          if (this.getRenderTarget()?.texture.name === 'orb-ambient-source') {
            window.__refreshSource = () => {
              const previous = this.getRenderTarget(), ambient = scene.children.find(c => c.material?.uniforms?.uStrength);
              const visible = ambient.visible; ambient.visible = false;
              this.setRenderTarget(window.__sourceTarget); original(scene, camera);
              ambient.visible = visible; this.setRenderTarget(previous);
            };
            window.__sourceTarget = this.getRenderTarget();
          }
          const body = scene.children[0]?.children?.[0]?.material?.uniforms;
          if (body?.uSpin) window.__body = body;
          const start = performance.now(); original(scene, camera);
          const composite = !!scene.children[1]?.material?.uniforms?.uAtlas;
          window.__renders.push({ ms: performance.now() - start, at: performance.now(), calls: this.info.render.calls,
            geometries: this.info.memory.geometries, textures: this.info.memory.textures, composite });
          if (composite) window.__hideClock = () => { scene.children[1].visible = false; original(scene, camera); };
        };
        this.debug.onShaderError = () => { throw new Error('clock_shader_compile_failed'); };
      }
    }`,
};
const plugin: Plugin = {
  name: 'local-clock-harness', enforce: 'pre',
  resolveId(source) { return source === 'clock-browser-entry' ? '\0clock:entry' : source === 'three' ? '\0clock:three' : null; },
  load(id) { return id.startsWith('\0clock:') ? stubs[id.slice(7)] : null; },
};
let server: Server, browser: Browser, origin: string, out: string;
const evidence = resolve('../../tmp/overnight/OP2-after');
beforeAll(async () => {
  mkdirSync(evidence, { recursive: true });
  out = mkdtempSync(resolve('../../tmp/overnight/OA1-browser-'));
  await build({ configFile: false, logLevel: 'silent', root: resolve('.'), publicDir: false, plugins: [plugin],
    oxc: { jsx: { runtime: 'automatic', development: false } }, define: { 'process.env.NODE_ENV': '"production"' },
    build: { outDir: out, emptyOutDir: true, minify: false, modulePreload: false,
      rollupOptions: { input: 'clock-browser-entry', output: { format: 'es', entryFileNames: 'entry.js', chunkFileNames: '[name]-[hash].js' } } } });
  const css = readFileSync(resolve('app/globals.css'), 'utf8');
  server = createServer((request, response) => {
    const path = new URL(request.url ?? '/', 'http://localhost').pathname;
    if (path === '/') {
      response.writeHead(200, { 'Content-Type': 'text/html' });
      response.end(`<!doctype html><html><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}</style><body><div id="root"></div><script type="module" src="/entry.js"></script></body></html>`);
      return;
    }
    if (path.includes('..')) { response.writeHead(404).end(); return; }
    try {
      const file = path.startsWith('/clock/') || path.startsWith('/fonts/') ? join(resolve('public'), path) : join(out, path);
      const body = readFileSync(file);
      response.writeHead(200, { 'Content-Type': path.endsWith('.png') ? 'image/png' : path.endsWith('.ttf') ? 'font/ttf' : 'text/javascript' });
      response.end(body);
    } catch { response.writeHead(404).end(); }
  });
  await new Promise<void>(yes => server.listen(0, '127.0.0.1', yes));
  const address = server.address(); if (!address || typeof address === 'string') throw new Error('local_clock_server');
  origin = `http://127.0.0.1:${address.port}`;
  browser = await chromium.launch({ headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
}, 120_000);

it.each(['generation', 'core'])('renders real spatial spill without changing the body or clipping edges: %s', async surface => {
  const { page, errors } = await open(390, 'dark', 'reduce', undefined, `?${surface}`);
  try {
    await page.waitForFunction(() => Boolean((window as unknown as { __redraw?: unknown }).__redraw));
    const result = await page.evaluate(() => {
      const runtime = window as unknown as { __showSpill: boolean; __redraw: () => void };
      const source = document.querySelector('canvas')!;
      // QA-only snapshots of the actual GPU buffer avoid the 2D canvas's extra
      // unpremultiply/color-conversion round trip. Production never reads pixels.
      const canvas = source;
      const gl = source.getContext('webgl2')!;
      const read = () => { const pixels = new Uint8Array(canvas.width * canvas.height * 4);
        gl.readPixels(0, 0, canvas.width, canvas.height, gl.RGBA, gl.UNSIGNED_BYTE, pixels); return pixels; };
      runtime.__showSpill = false; runtime.__redraw(); const before = read();
      runtime.__showSpill = true; runtime.__redraw(); const after = read();
      let bodyDiff = 0, spillDiff = 0, edgeAlpha = 0;
      const sectors = [0, 0, 0, 0];
      for (let y = 0; y < canvas.height; y++) for (let x = 0; x < canvas.width; x++) {
        const p = (y * canvas.width + x) * 4;
        const r = Math.hypot(x / canvas.width - 0.5, y / canvas.height - 0.5);
        const diff = Math.abs(after[p + 3]! - before[p + 3]!);
        if (r < 0.30) for (let channel = 0; channel < 4; channel++) bodyDiff += Math.abs(after[p + channel]! - before[p + channel]!);
        if (r > 0.35 && r < 0.48) { spillDiff += diff; sectors[(x > canvas.width / 2 ? 1 : 0) + (y > canvas.height / 2 ? 2 : 0)]! += after[p]! + after[p + 1]! + after[p + 2]!; }
        if (x < 2 || y < 2 || x >= canvas.width - 2 || y >= canvas.height - 2) edgeAlpha += after[p + 3]!;
      }
      return { bodyDiff, spillDiff, edgeAlpha, sectors };
    });
    writeFileSync(join(evidence, `${surface}-pixels.json`), JSON.stringify(result, null, 2));
    expect(result.bodyDiff).toBe(0);
    expect(result.spillDiff).toBeGreaterThan(1000);
    expect(result.edgeAlpha).toBe(0);
    expect(new Set(result.sectors.map(v => Math.round(v / 1000))).size).toBeGreaterThan(1);
    expect(errors).toEqual([]);
  } finally { await page.close(); }
}, 30_000);

it.each(['', '?generation'])('captures colors, gestures, state transitions and timing: %s', async query => {
  const { page, errors } = await open(390, 'dark', 'no-preference', undefined, query);
  try {
    await page.waitForSelector('canvas');
    if (!query) await glass(page);
    const orb = page.locator(query ? '.generation-orb' : '[data-testid="day-ring"]');
    const rect = await orb.boundingBox(); if (!rect) throw new Error('orb_bounds');
    for (let i = 0; i < 4; i++) {
      await page.mouse.click(rect.x + rect.width / 2, rect.y + rect.height / 2);
      await page.waitForTimeout(750);
      await page.screenshot({ path: join(evidence, `${query ? 'generation' : 'today'}-palette-${i}.png`) });
    }
    // Deliberate held rotation leaves the shared ripple/inertia and ring paths intact.
    await page.mouse.move(rect.x + rect.width / 2, rect.y + rect.height / 2);
    await page.mouse.down(); await page.waitForTimeout(280);
    await page.mouse.move(rect.x + rect.width * 0.62, rect.y + rect.height * 0.46, { steps: 8 });
    await page.mouse.up(); await page.waitForTimeout(350);
    if (query) for (const state of ['reading', 'generating', 'finalizing', 'complete', 'error']) {
      await page.evaluate(state => (window as unknown as { __setState: (s: string) => void }).__setState(state), state);
      await page.waitForTimeout(400);
      await page.screenshot({ path: join(evidence, `state-${state}.png`) });
    }
    const observations = await page.evaluate(() => (window as unknown as { __renders: unknown[] }).__renders);
    writeFileSync(join(evidence, `${query ? 'generation' : 'today'}-timings.json`), JSON.stringify(observations, null, 2));
    expect(errors).toEqual([]);
  } finally { await page.close(); }
}, 30_000);

it.each(['?generation', '?core'])('keeps a source-derived still and stops drawing on context loss: %s', async query => {
  const { page, errors } = await open(390, 'dark', 'no-preference', undefined, query);
  try {
    await page.waitForSelector('canvas'); await page.waitForTimeout(100);
    await page.evaluate(() => {
      const gl = document.querySelector('canvas')!.getContext('webgl2')!;
      gl.getExtension('WEBGL_lose_context')!.loseContext();
    });
    await page.waitForSelector('.orb-static-source');
    expect(await page.locator('canvas').count()).toBe(0);
    const count = await page.evaluate(() => (window as unknown as { __renders: unknown[] }).__renders.length);
    await page.waitForTimeout(150);
    expect(await page.evaluate(() => (window as unknown as { __renders: unknown[] }).__renders.length)).toBe(count);
    const pseudo = await page.locator('.orb-static-source').evaluate(el => ({
      body: getComputedStyle(el).backgroundImage, spill: getComputedStyle(el, '::before').backgroundImage,
    }));
    expect(pseudo.body).toBe(pseudo.spill);
    await page.screenshot({ path: join(evidence, `${query.slice(1)}-context-loss.png`) });
    expect(errors).toEqual([]);
  } finally { await page.close(); }
}, 30_000);
afterAll(async () => {
  await browser?.close();
  await new Promise<void>(yes => server ? server.close(() => yes()) : yes());
  if (out) rmSync(out, { recursive: true, force: true });
});
async function open(width = 1440, theme = 'light', reducedMotion: 'reduce' | 'no-preference' = 'no-preference', fail?: string, query = '') {
  const page = await browser.newPage({ viewport: { width, height: 900 }, reducedMotion, recordVideo: { dir: join(evidence, 'video'), size: { width, height: 900 } } });
  await page.route('**/*', route => route.request().url().startsWith(origin) && !route.request().url().endsWith(fail ?? '/never-block') ? route.continue() : route.abort());
  await page.addInitScript(({ theme, fail }) => {
    const syncTheme = () => { document.documentElement.dataset.theme = theme; };
    if (document.documentElement) syncTheme();
    document.addEventListener('DOMContentLoaded', syncTheme, { once: true });
    localStorage.setItem('sf.orb.colorKey', 'pearl');
    // Fix noon without freezing performance.now/rAF.
    const Original = Date;
    Object.defineProperty(window, 'Date', { value: new Proxy(Original, { construct(target, args) { return args.length ? Reflect.construct(target, args) : new Original(2026, 9, 19, 12, 0); } }) });
    if (fail === 'webgl') HTMLCanvasElement.prototype.getContext = (() => null) as typeof HTMLCanvasElement.prototype.getContext;
  }, { theme, fail });
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto(`${origin}/${query}`);
  await page.evaluate(() => document.fonts.ready);
  return { page, errors };
}
async function glass(page: Page) {
  await page.waitForSelector('.day-readout.glass-ready', { timeout: 20_000 });
}

it.each([1440, 390])('captures both orb paths at %i', async width => {
  for (const theme of ['dark', 'light']) for (const reduced of ['no-preference', 'reduce'] as const) {
    for (const surface of ['today', 'generation']) {
      const { page, errors } = await open(width, theme, reduced, undefined, surface === 'generation' ? '?generation' : '');
      try {
        await page.waitForSelector('canvas');
        if (surface === 'today') await glass(page);
        await page.waitForTimeout(700);
        await page.screenshot({ path: join(evidence, `${width}-${theme}-${reduced}-${surface}.png`) });
        expect(errors).toEqual([]);
      } finally { await page.close(); }
    }
  }
}, 120_000);

// Actual body and low-resolution capture, sampled only by QA. No production readback.
it.each(['dark', 'light'])('tracks resolved dark/light sectors while the source rotates in %s', async theme => {
  const { page, errors } = await open(390, theme, 'reduce', undefined, '?core');
  try {
    await page.waitForFunction(() => Boolean((window as unknown as { __refreshSource?: unknown }).__refreshSource));
    await page.evaluate(theme => { document.body.style.background = theme === 'light' ? '#ffffff' : '#000000'; },theme);
    const results = [];
    for (const angle of [0, 1.6, 3.2]) {
      const result = await page.evaluate(({angle,theme}) => {
        const runtime = window as unknown as {
          __body: Record<string, { value: number | { set(...args: number[]): void } }>;
          __refreshSource(): void; __redraw(): void;
        };
        const u = runtime.__body;
        u.uTime!.value = 8.4; u.uLife!.value = 0.6; u.uGlow!.value = 1;
        (u.uBase!.value as { set(...args: unknown[]): void }).set('#f4c542');
        (u.uGlowColor!.value as { set(...args: unknown[]): void }).set('#f4c542');
        // A known dark studio source on either page background. Ordinary light
        // mode source/state captures above retain the platform's normal studio.
        (u.uEnvFloor!.value as { set(...args: unknown[]): void }).set('#010102');
        (u.uEnvSky!.value as { set(...args: unknown[]): void }).set('#1c2028');
        const c = Math.cos(angle), s = Math.sin(angle);
        (u.uSpin!.value as { set(...args: number[]): void }).set(c,-s,0,s,c,0,0,0,1);
        runtime.__refreshSource(); runtime.__redraw();
        const canvas = document.querySelector('canvas')!, gl = canvas.getContext('webgl2')!;
        const pixels = new Uint8Array(canvas.width * canvas.height * 4);
        gl.readPixels(0,0,canvas.width,canvas.height,gl.RGBA,gl.UNSIGNED_BYTE,pixels);
        const sample = (r: number, theta: number) => {
          const x = Math.round(canvas.width * (0.5 + Math.cos(theta) * r));
          const y = Math.round(canvas.height * (0.5 + Math.sin(theta) * r));
          const i = (y * canvas.width + x) * 4, alpha = pixels[i + 3]! / 255;
          const emitted = pixels[i]! * 0.2126 + pixels[i+1]! * 0.7152 + pixels[i+2]! * 0.0722;
          return { emitted, visible: emitted + (theme === 'light' ? 255 : 0) * (1-alpha) };
        };
        const body: number[] = [], spill: number[] = [], visibleBody: number[] = [], visibleSpill: number[] = [];
        // Orthographic-to-screen scale at this camera: body sample matches the
        // shader's radial expansion; multi-point averages allow diffuse blur.
        for(let i=0; i<16; i++) {
          const theta = i * Math.PI / 8;
          body.push([-0.06,0,0.06].reduce((v,d) => v + sample(0.207,theta+d).emitted,0)/3);
          spill.push([-0.06,0,0.06].reduce((v,d) => v + sample(0.389,theta+d).emitted,0)/3);
          visibleBody.push([-0.06,0,0.06].reduce((v,d) => v + sample(0.207,theta+d).visible,0)/3);
          visibleSpill.push([-0.06,0,0.06].reduce((v,d) => v + sample(0.389,theta+d).visible,0)/3);
        }
        const mean = (a: number[]) => a.reduce((x,y)=>x+y,0)/a.length;
        const correlate = (a: number[], b: number[]) => {
          const ma=mean(a), mb=mean(b);
          return a.reduce((v,x,i)=>v+(x-ma)*(b[i]!-mb),0)/Math.sqrt(a.reduce((v,x)=>v+(x-ma)**2,0)*b.reduce((v,x)=>v+(x-mb)**2,0));
        };
        return { angle, body, spill, visibleBody, visibleSpill, correlation: correlate(body,spill),
          visibleCorrelation: correlate(visibleBody,visibleSpill), dimSector: visibleSpill.indexOf(Math.min(...visibleSpill)) };
      }, {angle,theme});
      results.push(result);
      writeFileSync(join(evidence, 'structure-'+theme+'.json'), JSON.stringify(results,null,2));
      await page.screenshot({ path: join(evidence, 'structure-'+theme+'-'+angle+'.png') });
      expect(result.correlation).toBeGreaterThan(0.6);
      expect(result.visibleCorrelation).toBeGreaterThan(0.6);
      expect(Math.max(...result.visibleSpill)-Math.min(...result.visibleSpill)).toBeGreaterThan(2);
      expect(Math.min(...result.spill)).toBeLessThan(Math.max(...result.spill) * 0.7);
    }
    writeFileSync(join(evidence, 'structure-'+theme+'.json'), JSON.stringify(results,null,2));
    expect(new Set(results.map(r=>r.dimSector)).size).toBeGreaterThan(1);
    expect(errors).toEqual([]);
  } finally { await page.close(); }
}, 30_000);

it.each(['', '?generation'])('records one tap, five overlapping taps at 150ms, directional taps and decay: %s', async query => {
  const { page, errors } = await open(390, 'dark', 'no-preference', undefined, query);
  try {
    await page.waitForSelector('canvas'); if(!query) await glass(page);
    const box = await page.locator('[data-testid="orb-touch"]').boundingBox(); if(!box) throw Error('orb_bounds');
    const name = query ? 'generation' : 'today';
    const at = (x: number) => page.mouse.click(box.x+box.width*x,box.y+box.height*0.5);
    await at(0.5); await page.waitForTimeout(350);
    await page.screenshot({path: join(evidence, name+'-single-tap.png')});
    await page.waitForTimeout(1900);
    for(let i=0;i<5;i++) { await at(0.5); await page.waitForTimeout(150); }
    const activeSequence = await page.evaluate(() => {
      const u = (window as unknown as { __body: { uWaveCount:{value:number}; uWaves:{value:{w:number}[]} } }).__body;
      return u.uWaves.value.slice(0,u.uWaveCount.value).map(w=>w.w);
    });
    expect(activeSequence.length).toBe(5); expect(activeSequence[0]!).toBeGreaterThan(activeSequence[4]!);
    writeFileSync(join(evidence, name+'-impulse-ages.json'), JSON.stringify(activeSequence));
    await page.screenshot({path: join(evidence, name+'-five-taps.png')});
    await at(0.28); await page.waitForTimeout(150); await at(0.72);
    await page.waitForTimeout(200);
    await page.screenshot({path: join(evidence, name+'-distinct-directions.png')});
    await page.waitForTimeout(2000);
    await page.screenshot({path: join(evidence, name+'-settled.png')});
    const active = await page.evaluate(() => {
      const body = (window as unknown as { __body: {uWaveCount:{value:number}} }).__body;
      return body.uWaveCount.value;
    });
    expect(active).toBe(0); expect(errors).toEqual([]);
  } finally { const video = page.video(); await page.close(); await video?.saveAs(join(evidence, 'video', (query ? 'generation' : 'today')+'-wave-sequence.webm')); }
}, 30_000);
