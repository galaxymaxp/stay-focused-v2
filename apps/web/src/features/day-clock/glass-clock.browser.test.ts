import { createServer, type Server } from 'node:http';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { chromium, type Browser, type Page } from 'playwright';
import { build, type Plugin } from 'vite';
import { afterAll, beforeAll, expect, it } from 'vitest';
import { layoutClockGlyphs } from '@stay-focused/shared';
import metrics from '../../../public/clock/clock-atlas.json';

// Actual DayRingClock, orb, shared shader and CSS; all traffic is loopback only.
// The standalone orb query measures the existing no-clock rendering path.
const stubs: Record<string, string> = {
  entry: `import { createRoot } from 'react-dom/client';
    import { createElement, useState } from 'react';
    import { DayRingClock } from '${resolve('src/features/day-clock/DayRingClock.tsx').replace(/\\/g, '/')}';
    import { DayOrb } from '${resolve('src/features/day-clock/DayOrb.tsx').replace(/\\/g, '/')}';
    function App() {
      const [range, setRange] = useState({ start: 720, end: 1080 });
      if (location.search.includes('orb')) return createElement(DayOrb, { minutes: 720, size: 315,
        clock: location.search.includes('glass') ? { text: '12:00 PM', fontSize: 30 } : undefined });
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
        super(options); const original = this.render.bind(this);
        window.__renders = [];
        this.render = (scene, camera) => {
          const start = performance.now(); original(scene, camera);
          const composite = !!scene.children[1]?.material?.uniforms?.uAtlas;
          window.__renders.push({ ms: performance.now() - start, at: performance.now(), calls: this.info.render.calls, composite });
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
const evidence = resolve('../../tmp/overnight/GL1-screens');
beforeAll(async () => {
  mkdirSync(evidence, { recursive: true });
  out = mkdtempSync(resolve('../../tmp/overnight/GL1-browser-'));
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
afterAll(async () => {
  await browser?.close();
  await new Promise<void>(yes => server ? server.close(() => yes()) : yes());
  if (out) rmSync(out, { recursive: true, force: true });
});
async function open(width = 1440, theme = 'light', reducedMotion: 'reduce' | 'no-preference' = 'no-preference', fail?: string, query = '') {
  const page = await browser.newPage({ viewport: { width, height: 900 }, reducedMotion });
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
it.each([[1440, 'light'], [1440, 'dark'], [390, 'light'], [390, 'dark']] as const)('shows idle and dragged glass time at %i in %s', async (width, theme) => {
  const { page, errors } = await open(width, theme);
  try {
    await glass(page);
    await page.waitForFunction(() => document.querySelector('.readout-time')?.textContent === '12:00 PM');
    await page.waitForTimeout(1000); // Let the existing initial dial spring finish before visual comparison.
    expect(await page.locator('.readout-time').textContent()).toBe('12:00 PM');
    expect(await page.locator('.readout-sub').count()).toBe(0);
    expect(await page.locator('.day-readout').ariaSnapshot()).toContain('12:00 PM');
    expect(await page.locator('.readout-time').evaluate(el => getComputedStyle(el).opacity)).toBe('0');
    await page.screenshot({ path: join(evidence, `${width}-${theme}-idle.png`) });
    const rect = await page.locator('[data-testid="day-ring"]').boundingBox(); if (!rect) throw new Error('clock_box');
    // Start handle at 12 PM (bottom), drag toward 3:30 PM (lower-left).
    const point = (minute: number) => ({ x: rect.x + rect.width * (0.5 + Math.sin(minute / 1440 * Math.PI * 2) * 136 / 340),
      y: rect.y + rect.height * (0.5 - Math.cos(minute / 1440 * Math.PI * 2) * 136 / 340) });
    const from = point(720), to = point(930);
    await page.mouse.move(from.x, from.y); await page.mouse.down(); await page.mouse.move(to.x, to.y, { steps: 8 });
    await page.waitForFunction(() => document.querySelector('.readout-time')?.textContent === '3:30 PM');
    expect(await page.locator('.readout-label').textContent()).toBe('Free from');
    expect(await page.locator('.readout-sub').textContent()).toBe('2 h 30 min');
    await page.screenshot({ path: join(evidence, `${width}-${theme}-drag.png`) });
    expect(errors).toEqual([]);
    await page.mouse.up();
  } finally { await page.close(); }
}, 60_000);
it.each(['webgl', 'clock-atlas.png'])('retains readable Inter text on %s failure', async fail => {
  const { page } = await open(390, 'light', 'no-preference', fail);
  try {
    await page.waitForSelector('.day-orb');
    await page.waitForTimeout(700);
    expect(await page.locator('.glass-ready').count()).toBe(0);
    const time = page.locator('.readout-time');
    expect(await time.textContent()).toBe('12:00 PM');
    expect(await time.evaluate(el => ({ opacity: getComputedStyle(el).opacity, font: getComputedStyle(el).fontFamily }))).toMatchObject({ opacity: '1', font: '"Inter Clock", sans-serif' });
  } finally { await page.close(); }
}, 30_000);
it('keeps glass under Reduce Motion, draws only on changes and restores text after context loss', async () => {
  const { page, errors } = await open(390, 'dark', 'reduce');
  try {
    await glass(page);
    const count = () => page.evaluate(() => (window as unknown as { __renders: unknown[] }).__renders.length);
    const before = await count(); await page.waitForTimeout(350); expect(await count()).toBe(before);
    await page.evaluate(() => document.querySelector('canvas')!.dispatchEvent(new Event('webglcontextlost', { cancelable: true })));
    expect(await page.locator('.glass-ready').count()).toBe(0);
    expect(await page.locator('.readout-time').evaluate(el => getComputedStyle(el).opacity)).toBe('1');
    expect(errors).toEqual([]);
  } finally { await page.close(); }
}, 30_000);
it('records renderer.info and submission time before/after without changing cadence', async () => {
  const result: Record<string, unknown> = {};
  for (const mode of ['orb', 'orb&glass']) {
    const { page, errors } = await open(1440, 'light', 'no-preference', undefined, `?${mode}`);
    try {
      await page.waitForFunction(count => ((window as unknown as { __renders?: unknown[] }).__renders?.length ?? 0) >= count, mode.includes('glass') ? 64 : 32, { timeout: 20_000 });
      result[mode] = await page.evaluate(isGlass => {
        const samples = (window as unknown as { __renders: { at: number; ms: number; calls: number; composite: boolean }[] }).__renders;
        const frames: { at: number; ms: number; calls: number }[] = [];
        for (let i = 0; i < samples.length; i++) {
          const sample = samples[i]!;
          if (isGlass && !sample.composite) continue;
          frames.push({ at: sample.at, ms: sample.ms + (isGlass ? samples[i - 1]?.ms ?? 0 : 0),
            calls: sample.calls + (isGlass ? samples[i - 1]?.calls ?? 0 : 0) });
        }
        const warmed = frames.slice(8), times = warmed.map(s => s.ms).sort((a, b) => a - b);
        const intervals = warmed.slice(1).map((s, i) => s.at - warmed[i]!.at).sort((a, b) => a - b);
        return { drawCallsPerFrame: [...new Set(warmed.map(s => s.calls))], frames: warmed.length,
          medianIntervalMs: intervals[Math.floor(intervals.length / 2)],
          medianSubmissionMs: times[Math.floor(times.length / 2)], p95SubmissionMs: times[Math.floor(times.length * 0.95)] };
      }, mode.includes('glass'));
      expect(errors).toEqual([]);
    } finally { await page.close(); }
  }
  writeFileSync(join(evidence, 'renderer-cost.json'), `${JSON.stringify(result, null, 2)}\n`);
}, 60_000);

it.each(['light', 'dark'])('checks stroke contrast against the actual brightest-pearl backdrop in %s', async theme => {
  const { page } = await open(390, theme, 'reduce');
  try {
    await glass(page);
    const box = await page.locator('[data-testid="day-ring"]').boundingBox(); if (!box) throw new Error('clock_box');
    const normal = await page.screenshot();
    await page.evaluate(() => (window as unknown as { __hideClock(): void }).__hideClock());
    const background = await page.screenshot();
    const layout = layoutClockGlyphs('12:00 PM', metrics);
    const contrast = await page.evaluate(async ({ normal, background, layout, box }) => {
      const pixels = async (src: string) => {
        const img = new Image(); img.src = src; await img.decode();
        const canvas = document.createElement('canvas'); canvas.width = img.width; canvas.height = img.height;
        const ctx = canvas.getContext('2d')!; ctx.drawImage(img, 0, 0);
        return { width: img.width, height: img.height, data: ctx.getImageData(0, 0, img.width, img.height).data };
      };
      const [a, b, atlas] = await Promise.all([pixels(normal), pixels(background), pixels('/clock/clock-atlas.png')]);
      const luminance = (data: Uint8ClampedArray, i: number) => {
        const channels = [data[i]!, data[i + 1]!, data[i + 2]!].map(n => n / 255).map(n => n <= 0.04045 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4);
        return channels[0]! * 0.2126 + channels[1]! * 0.7152 + channels[2]! * 0.0722;
      };
      return layout.quads.map(q => {
        const x0 = box.x + box.width / 2 + (q.x - layout.width / 2) * 30;
        const y0 = box.y + box.height / 2 + (q.y - (layout.minY + layout.maxY) / 2) * 30;
        const values: number[] = [];
        for (let y = Math.ceil(y0); y < y0 + q.height * 30; y++) for (let x = Math.ceil(x0); x < x0 + q.width * 30; x++) {
          const u = q.uv[0]! + (x + 0.5 - x0) / (q.width * 30) * (q.uv[2]! - q.uv[0]!);
          const v = q.uv[1]! + (y + 0.5 - y0) / (q.height * 30) * (q.uv[3]! - q.uv[1]!);
          const ai = (Math.floor(v * atlas.height) * atlas.width + Math.floor(u * atlas.width)) * 4;
          const median = [atlas.data[ai]!, atlas.data[ai + 1]!, atlas.data[ai + 2]!].sort((a, b) => a - b)[1]! / 255;
          if (median < 0.6) continue; // Exclude antialias fringe and empty quad padding.
          const i = (y * a.width + x) * 4, la = luminance(a.data, i), lb = luminance(b.data, i);
          values.push((Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05));
        }
        values.sort((a, b) => a - b);
        return { char: q.char, solidStrokeContrast: values[Math.floor(values.length * 0.75)] ?? 0, samples: values.length };
      });
    }, { normal: `data:image/png;base64,${normal.toString('base64')}`, background: `data:image/png;base64,${background.toString('base64')}`, layout, box });
    writeFileSync(join(evidence, `contrast-${theme}.json`), `${JSON.stringify(contrast, null, 2)}\n`);
    for (const glyph of contrast) expect(glyph.solidStrokeContrast, glyph.char).toBeGreaterThanOrEqual(/[AMP]/.test(glyph.char) ? 4.5 : 3);
  } finally { await page.close(); }
}, 30_000);
