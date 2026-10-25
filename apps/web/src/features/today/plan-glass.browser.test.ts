import { createServer, type Server } from 'node:http';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { chromium, type Browser, type Page } from 'playwright';
import sharp from 'sharp';
import { build, type Plugin } from 'vite';
import { afterAll, beforeAll, expect, it } from 'vitest';
import { layoutClockGlyphs } from '@stay-focused/shared';
import metrics from '../../../public/clock/plan-atlas.json';

const file = (name: string) => resolve(name).replace(/\\/g, '/');
const sources: Record<string, string> = {
  entry: `import {createRoot} from 'react-dom/client';import {createElement} from 'react';
    import {DeferredDayOrb} from '${file('src/features/day-clock/DeferredDayOrb.tsx')}';
    import {PlanButton} from '${file('src/features/today/plan-button.tsx')}';
    createRoot(document.getElementById('root')).render(createElement('main',{style:{width:'min(360px,calc(100% - 32px))',margin:'24px auto'}},
      createElement(DeferredDayOrb,{minutes:720,size:300,ready:true,clock:{text:'12:00 PM',fontSize:40}}),
      createElement(PlanButton,{onPress:()=>{window.__presses=(window.__presses??0)+1}})));`,
  three: `import * as T from '${file('../../node_modules/three/build/three.module.js')}';
    export * from '${file('../../node_modules/three/build/three.module.js')}';
    export class WebGLRenderer extends T.WebGLRenderer {
      constructor(options){super(options); const original=this.render.bind(this);
        let body, camera, target, composite, compositeCamera;
        const frames=[]; (window.__renderers??=[]).push({canvas:this.domElement,frames});
        this.render=(scene,cam)=>{
          const mesh=scene.children[0]?.children?.[0];
          if(mesh?.geometry.type==='ExtrudeGeometry' && this.getRenderTarget()?.texture.name!=='orb-ambient-source'){
            body=scene;camera=cam;target=this.getRenderTarget();
          }
          const start=performance.now();original(scene,cam);
          if(this.getRenderTarget()===null)frames.push({at:performance.now(),ms:performance.now()-start});
          if(body && scene.children[1]?.material?.uniforms?.uAtlas && this.getRenderTarget()===null){
            composite=scene;compositeCamera=cam;
            window.__planLive=()=>({slosh:body.children[0].children[0].material.uniforms.uSlosh.value,time:body.children[0].children[0].material.uniforms.uTime.value,radius:body.children[0].children[0].material.uniforms.uCornerRadius.value});
            window.__planProbe=(time,slosh,mask=false,hide=false)=>{
              const mesh=body.children[0].children[0];mesh.material.uniforms.uTime.value=time;mesh.material.uniforms.uSlosh.value=slosh;
              if(mask){const material=new T.MeshBasicMaterial({color:'white'});body.overrideMaterial=material;const visible=body.children[1].visible;body.children[1].visible=false;
                this.setRenderTarget(null);original(body,camera);body.overrideMaterial=null;body.children[1].visible=visible;material.dispose();
              }else{this.setRenderTarget(target);original(body,camera);this.setRenderTarget(null);const visible=composite.children[1].visible;composite.children[1].visible=!hide;original(composite,compositeCamera);composite.children[1].visible=visible;}
              const size=this.getDrawingBufferSize(new T.Vector2());const pixels=new Uint8Array(size.x*size.y*4);
              this.getContext().readPixels(0,0,size.x,size.y,this.getContext().RGBA,this.getContext().UNSIGNED_BYTE,pixels);
              return {width:size.x,height:size.y,pixels:Array.from(pixels),slosh:mesh.material.uniforms.uSlosh.value};
            };
          }
        };
      }
    }`,
};
const plugin: Plugin = { name: 'plan-gl-probe', enforce: 'pre',
  resolveId: id => id === 'plan-probe' ? '\0plan:entry' : id === 'three' ? '\0plan:three' : null,
  load: id => id.startsWith('\0plan:') ? sources[id.slice(6)] : null };
let server: Server, browser: Browser, origin: string, out: string;
const evidence = resolve('../../tmp/overnight/TP2b');
beforeAll(async () => {
  mkdirSync(evidence, { recursive: true }); out = mkdtempSync(join(evidence, 'web-build-'));
  await build({ configFile: false, logLevel: 'silent', root: resolve('.'), publicDir: false, plugins: [plugin],
    oxc: { jsx: { runtime: 'automatic', development: false } }, define: { 'process.env.NODE_ENV': '"production"' },
    build: { outDir: out, emptyOutDir: true, minify: false, modulePreload: false,
      rollupOptions: { input: 'plan-probe', output: { format: 'es', entryFileNames: 'entry.js', chunkFileNames: '[name]-[hash].js' } } } });
  const entry = readFileSync(join(out, 'entry.js'), 'utf8');
  expect(entry).not.toContain('class WebGLRenderer'); expect(entry).not.toContain('class ShaderMaterial');
  writeFileSync(join(evidence, 'lazy-chunk.json'), JSON.stringify({ entryBytes: Buffer.byteLength(entry), threeInInitialEntry: false }));
  const css = readFileSync(resolve('app/globals.css'), 'utf8');
  server = createServer((request, response) => {
    const path = new URL(request.url ?? '/', 'http://localhost').pathname;
    if (path === '/') { response.setHeader('Content-Type', 'text/html'); response.end(`<!doctype html><html><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}</style><body><div id="root"></div><script type="module" src="/entry.js"></script></body></html>`); return; }
    if (path.includes('..')) { response.writeHead(404).end(); return; }
    try { const body = readFileSync(join(path.startsWith('/clock/') || path.startsWith('/fonts/') ? resolve('public') : out, path));
      response.setHeader('Content-Type', path.endsWith('.png') ? 'image/png' : path.endsWith('.ttf') ? 'font/ttf' : 'text/javascript'); response.end(body);
    } catch { response.writeHead(404).end(); }
  });
  await new Promise<void>(yes => server.listen(0, '127.0.0.1', yes));
  const address = server.address(); if (!address || typeof address === 'string') throw new Error('local_plan_server');
  origin = `http://127.0.0.1:${address.port}`;
  browser = await chromium.launch({ headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
}, 120_000);
afterAll(async () => { await browser?.close(); await new Promise<void>(yes => server ? server.close(() => yes()) : yes()); if (out) rmSync(out, { recursive: true, force: true }); });

interface Pixels { width: number; height: number; pixels: number[]; slosh: number }
interface ProbeWindow {
  __planProbe(time: number, slosh: number, mask?: boolean, hide?: boolean): Pixels;
  __renderers: { canvas: HTMLCanvasElement; frames: { at: number; ms: number }[] }[];
  __presses: number;
  __planLive(): { slosh: number; time: number; radius: number };
}
async function open(width = 390, theme = 'light', reducedMotion: 'reduce' | 'no-preference' = 'reduce', fail?: string) {
  const page = await browser.newPage({ viewport: { width, height: 700 }, reducedMotion });
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.route('**/*', route => route.request().url().startsWith(origin) && !route.request().url().endsWith(fail ?? '/never') ? route.continue() : route.abort());
  await page.addInitScript(({ theme, fail }) => {
    document.addEventListener('DOMContentLoaded', () => { document.documentElement.dataset.theme = theme; });
    localStorage.setItem('sf.orb.colorKey', 'pearl');
    if (fail === 'webgl') HTMLCanvasElement.prototype.getContext = (() => null) as typeof HTMLCanvasElement.prototype.getContext;
  }, { theme, fail });
  await page.goto(origin);
  return { page, errors };
}
async function ready(page: Page) { await page.waitForSelector('[data-plan-gl="ready"]', { timeout: 20_000 }); }
async function probe(page: Page, time = 8.4, slosh = 0, mask = false, hide = false) {
  return page.evaluate(args => (window as unknown as ProbeWindow).__planProbe(...args), [time, slosh, mask, hide] as const);
}
function summary(image: Pixels) {
  const luma: number[] = [], hues: number[] = [];
  for (let y = 4; y < image.height - 4; y++) for (let x = 8; x < image.width - 8; x++) {
    if (Math.abs(x - image.width / 2) < 35) continue; // exclude the label
    const i = (y * image.width + x) * 4;
    const [r, g, b] = image.pixels.slice(i, i + 3).map(v => v / 255) as [number, number, number];
    luma.push(r * 0.2126 + g * 0.7152 + b * 0.0722);
    const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
    if (y < image.height * 0.45 && d > 0.12 && max > 0.15 && r === max) hues.push(((g - b) / d * 60 + 360) % 360);
  }
  luma.sort((a, b) => a - b); hues.sort((a, b) => a - b);
  return { p10: luma[Math.floor(luma.length * 0.1)]!, p90: luma[Math.floor(luma.length * 0.9)]!, max: luma.at(-1)!,
    hue: hues[Math.floor(hues.length / 2)] ?? 0, hueSamples: hues.length };
}
it.each([[390, 'light'], [390, 'dark'], [768, 'light'], [768, 'dark'], [1280, 'light'], [1280, 'dark']] as const)('captures true GL at %i in %s, with shaded glass and fixed accent', async (width, theme) => {
  const { page, errors } = await open(width, theme);
  try {
    await ready(page); await page.waitForSelector('[data-orb-load="ready"]');
    const button = page.getByRole('button', { name: 'Plan your free time' });
    expect(await button.locator('svg').isVisible()).toBe(false); expect(await button.locator('.plan-glass-label').isVisible()).toBe(false);
    const rest = await probe(page);
    await page.screenshot({ path: join(evidence, `${width}-${theme}-rest.png`) });
    await probe(page, 8.4, 0.17);
    await page.screenshot({ path: join(evidence, `${width}-${theme}-slosh.png`) });
    const metric = summary(rest);
    writeFileSync(join(evidence, `${width}-${theme}-shading.json`), JSON.stringify(metric, null, 2));
    expect(metric.p90 - metric.p10).toBeGreaterThan(0.06);
    expect(metric.max - metric.p90).toBeGreaterThan(0.04);
    expect(metric.hueSamples).toBeGreaterThan(20);
    expect(Math.abs(metric.hue - 43.77)).toBeLessThanOrEqual(6);
    expect(errors).toEqual([]);
    if (width === 390 && theme === 'dark') {
      await probe(page);
      const orb = await page.locator('.day-orb').screenshot(), slab = await button.screenshot();
      await sharp({ create: { width: 660, height: 320, channels: 4, background: '#141516' } })
        .composite([{ input: orb, left: 0, top: 0 }, { input: slab, left: 300, top: 140 }]).png().toFile(join(evidence, 'orb-button-comparison.png'));
      // The same shared scene at phone width is the labelled native-GL proxy.
      await button.evaluate(el => { el.style.height = '52px'; });
      await page.waitForTimeout(100);
      await probe(page);
      await page.evaluate(() => { const caption = document.createElement('p'); caption.textContent = 'Native shared-scene proxy: web GL, 52px (not native GL)'; document.querySelector('main')!.append(caption); });
      await page.screenshot({ path: join(evidence, 'native-shared-scene-web-proxy-390.png') });
    }
  } finally { await page.close(); }
}, 60_000);

it('keeps the rendered silhouette identical across 30 slosh frames and shades glyph interiors', async () => {
  const { page, errors } = await open(390, 'dark');
  try {
    await ready(page);
    const baseline = await probe(page, 8.4, 0, true);
    const mask = (image: Pixels) => image.pixels.filter((_v, i) => i % 4 === 3).map(v => v > 127 ? 1 : 0);
    const expected = mask(baseline);
    expect(expected.reduce<number>((a, b) => a + b, 0)).toBeGreaterThan(baseline.width * baseline.height * 0.8);
    for (let i = 0; i < 30; i++) expect(mask(await probe(page, 8.4 + i / 30, Math.sin(i / 29 * Math.PI * 3) * 0.2, true))).toEqual(expected);
    const filled = await probe(page), clear = await probe(page, 8.4, 0, false, true);
    const layout = layoutClockGlyphs('Plan', metrics, true);
    const buttonWidth = await page.locator('.plan-action').evaluate(el => el.clientWidth);
    const atlas = await sharp(resolve('public/clock/plan-atlas.png')).removeAlpha().raw().toBuffer();
    const shades = new Set<string>(); let shaded = 0;
    for (const q of layout.quads) {
      const scale = filled.width / buttonWidth;
      const x0 = filled.width / 2 + (q.x - layout.width / 2) * 24 * scale;
      const top = filled.height / 2 + (q.y - (layout.minY + layout.maxY) / 2) * 24 * scale;
      for (let y = Math.ceil(top); y < top + q.height * 24 * scale; y++) for (let x = Math.ceil(x0); x < x0 + q.width * 24 * scale; x++) {
        const u = q.uv[0]! + (x + 0.5 - x0) / (q.width * 24 * scale) * (q.uv[2]! - q.uv[0]!);
        const v = q.uv[1]! + (y + 0.5 - top) / (q.height * 24 * scale) * (q.uv[3]! - q.uv[1]!);
        const ai = (Math.floor(v * metrics.height) * metrics.width + Math.floor(u * metrics.width)) * 3;
        if ([atlas[ai]!, atlas[ai + 1]!, atlas[ai + 2]!].sort((a, b) => a - b)[1]! < 160) continue;
        const i = ((filled.height - 1 - y) * filled.width + x) * 4;
        if (filled.pixels.slice(i, i + 3).some((c, k) => Math.abs(c - clear.pixels[i + k]!) > 3)) shaded++;
        shades.add(filled.pixels.slice(i, i + 3).join(','));
      }
    }
    writeFileSync(join(evidence, 'shape-label.json'), JSON.stringify({ identicalSilhouetteFrames: 30, shadedInteriorPixels: shaded, distinctInteriorShades: shades.size }, null, 2));
    expect(shaded).toBeGreaterThan(40); expect(shades.size).toBeGreaterThan(20); expect(errors).toEqual([]);
  } finally { await page.close(); }
}, 60_000);

it('pauses off focus and under Reduce Motion; presses affect liquid only and settle by 600ms', async () => {
  const { page, errors } = await open(390, 'light', 'no-preference');
  try {
    await ready(page);
    const button = page.getByRole('button', { name: 'Plan your free time' });
    const bounds = await button.boundingBox();
    await button.click({ position: { x: 20, y: 24 } });
    await page.waitForFunction(() => Math.abs((window as unknown as ProbeWindow).__planLive().slosh) > 0.005);
    await page.screenshot({ path: join(evidence, 'actual-press-mid-slosh.png') });
    expect(await button.boundingBox()).toEqual(bounds);
    expect(await page.evaluate(() => (window as unknown as ProbeWindow).__presses)).toBe(1);
    await page.waitForTimeout(700);
    expect(await page.evaluate(() => (window as unknown as ProbeWindow).__planLive().slosh)).toBe(0);
    const count = () => page.evaluate(() => (window as unknown as ProbeWindow).__renderers.find(r => r.canvas.closest('.plan-action'))!.frames.length);
    await page.evaluate(() => { document.hasFocus = () => false; window.dispatchEvent(new Event('blur')); });
    const paused = await count(); await page.waitForTimeout(200); expect(await count()).toBe(paused);
    await page.evaluate(() => { document.hasFocus = () => true; window.dispatchEvent(new Event('focus')); });
    await page.emulateMedia({ reducedMotion: 'reduce' }); await page.waitForTimeout(150);
    const still = await count(); await page.waitForTimeout(200); expect(await count()).toBe(still);
    await button.click();
    expect(await button.evaluate(el => el.getAnimations().some(a => a.effect instanceof KeyframeEffect && a.effect.getKeyframes().some(f => Number(f.opacity) === 0.85)))).toBe(true);
    expect(errors).toEqual([]);
  } finally { await page.close(); }
}, 30_000);

it('records orb cadence before and after enabling the second live GL surface', async () => {
  const result: Record<string, unknown> = {};
  for (const liveButton of [false, true]) {
    const { page, errors } = await open(390, 'dark', 'no-preference', liveButton ? undefined : 'plan-atlas.png');
    try {
      await page.waitForSelector(liveButton ? '[data-plan-gl="ready"]' : '[data-plan-gl="failed"]');
      await page.waitForSelector('[data-orb-load="ready"]');
      await page.waitForFunction(() => ((window as unknown as ProbeWindow).__renderers.find(r => r.canvas.closest('.day-orb'))?.frames.length ?? 0) >= 32);
      result[liveButton ? 'orbAndGLButton' : 'orbAndTP2Fallback'] = await page.evaluate(() => {
        const rows = (window as unknown as ProbeWindow).__renderers.find(r => r.canvas.closest('.day-orb'))!.frames.slice(8, 32);
        const intervals = rows.slice(1).map((row, i) => row.at - rows[i]!.at).sort((a, b) => a - b);
        const submissions = rows.map(row => row.ms).sort((a, b) => a - b);
        return { frames: rows.length, medianIntervalMs: intervals[Math.floor(intervals.length / 2)],
          medianFinalSubmissionMs: submissions[Math.floor(submissions.length / 2)], p95FinalSubmissionMs: submissions[Math.floor(submissions.length * 0.95)] };
      });
      expect(errors).toEqual([]);
    } finally { await page.close(); }
  }
  writeFileSync(join(evidence, 'orb-cadence.json'), JSON.stringify(result, null, 2));
}, 60_000);

it('keeps accent hue stable across presses, theme changes and orb palette choices', async () => {
  const { page, errors } = await open(390, 'light');
  try {
    await ready(page); await page.waitForSelector('[data-orb-load="ready"]');
    const before = await page.locator('.day-orb').screenshot();
    const rows: { theme: string; side: number; hue: number }[] = [];
    for (const theme of ['light', 'dark']) {
      await page.evaluate(theme => { document.documentElement.dataset.theme = theme; }, theme);
      for (const side of [-1, 1]) {
        await page.getByRole('button', { name: 'Plan your free time' }).click({ position: { x: side < 0 ? 20 : 330, y: 24 } });
        const metric = summary(await probe(page, 8.4, side * 0.17));
        rows.push({ theme, side, hue: metric.hue });
        expect(Math.abs(metric.hue - 43.77)).toBeLessThanOrEqual(6);
      }
    }
    await page.evaluate(() => { document.documentElement.dataset.theme = 'light'; localStorage.setItem('sf.orb.colorKey', 'green');
      window.dispatchEvent(new StorageEvent('storage', { key: 'sf.orb.colorKey', newValue: 'green' })); });
    await page.waitForTimeout(150);
    const after = await page.locator('.day-orb').screenshot(); expect(after.equals(before)).toBe(false);
    const afterPalette = summary(await probe(page)); expect(Math.abs(afterPalette.hue - 43.77)).toBeLessThanOrEqual(6);
    writeFileSync(join(evidence, 'color-stability.json'), JSON.stringify({ pressesAndThemes: rows, orbPaletteChanged: true, hueAfterOrbPalette: afterPalette.hue }, null, 2));
    expect(errors).toEqual([]);
  } finally { await page.close(); }
}, 30_000);

it.each(['webgl', 'plan-atlas.png'])('uses TP2 fallback only after %s failure', async fail => {
  const { page } = await open(390, 'light', 'reduce', fail);
  try { await page.waitForSelector('[data-plan-gl="failed"]', { timeout: 20_000 });
    expect(await page.locator('.plan-action svg').count()).toBe(1);
    expect(await page.locator('.plan-glass-label').textContent()).toBe('Plan');
    await page.getByRole('button', { name: 'Plan your free time' }).click();
    expect(await page.evaluate(() => (window as unknown as ProbeWindow).__presses)).toBe(1);
  } finally { await page.close(); }
}, 30_000);

it('withdraws GL pixels immediately on context loss and restores the original TP2 fallback', async () => {
  const { page, errors } = await open();
  try {
    await ready(page);
    await page.locator('.plan-action-canvas').evaluate(el => el.dispatchEvent(new Event('webglcontextlost', { cancelable: true })));
    await page.waitForSelector('[data-plan-gl="failed"]');
    expect(await page.locator('.plan-action-canvas').count()).toBe(0);
    expect(await page.locator('.plan-action svg').isVisible()).toBe(true);
    expect(await page.locator('.plan-glass-label').isVisible()).toBe(true);
    expect(errors).toEqual([]);
  } finally { await page.close(); }
}, 30_000);

it('follows the responsive radius token even when the column width stays unchanged', async () => {
  const { page, errors } = await open(1280);
  try {
    await ready(page);
    expect(await page.locator('.plan-action').evaluate(el => getComputedStyle(el).borderRadius)).toBe('8px');
    expect(await page.evaluate(() => (window as unknown as ProbeWindow).__planLive().radius)).toBeCloseTo(8 / 48);
    const width = await page.locator('.plan-action').evaluate(el => el.clientWidth);
    await page.setViewportSize({ width: 760, height: 700 });
    await page.waitForFunction(() => (window as unknown as ProbeWindow).__planLive().radius === 12 / 48);
    expect(await page.locator('.plan-action').evaluate(el => el.clientWidth)).toBe(width);
    expect(errors).toEqual([]);
  } finally { await page.close(); }
}, 30_000);
