import { createServer, type Server } from 'node:http';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve, sep } from 'node:path';
import { chromium, type Browser, type Page } from 'playwright';
import { build } from 'vite';
import { afterAll, beforeAll, expect, it } from 'vitest';

// Production route components, CSS and shaders, with fictional state and loopback traffic only.
let server: Server, browser: Browser, origin: string, out: string;
const evidence = resolve('../../tmp/overnight/OL1-regressions');
const requests: { path: string; at: number }[] = [];
const file = (path: string) => resolve(path).replaceAll('\\', '/');
const entry = `import {createRoot} from 'react-dom/client';import {createElement,useState} from 'react';
  import {DayRingClock} from '${file('src/features/day-clock/DayRingClock.tsx')}';
  import {GenerationOrb} from '${file('src/features/day-clock/GenerationOrb.tsx')}';
  function App(){const [surface,setSurface]=useState(new URLSearchParams(location.search).get('surface'));
    const [range,setRange]=useState({start:720,end:1080});window.__switch=()=>setSurface(s=>s==='today'?'generation':'today');
    return createElement('main',{style:{width:390,margin:'40px auto'}},surface==='today'?createElement(DayRingClock,{date:'2026-10-21',timeline:[],...range,onCommit:(start,end)=>setRange({start,end})}):createElement(GenerationOrb,{state:'idle'}));}
  createRoot(document.getElementById('root')).render(createElement(App));`;
const threePath = file('../../node_modules/three/build/three.module.js');
const three = `export * from '${threePath}';import {WebGLRenderer as Base} from '${threePath}';
  export class WebGLRenderer extends Base {constructor(options){super(options);const render=this.render.bind(this);
    this.render=(scene,camera)=>{render(scene,camera);if(this.getRenderTarget()===null){window.__finals=(window.__finals??0)+1;window.__complete=!!scene.children[1]?.material?.uniforms?.uAtlas;}};}}`;
type Sample = { at: number; status?: string; live: number; poster: number; complete: boolean; clock: boolean; duration: string };
type ProbeWindow = Window & { __switch: () => void; __samples: Sample[]; __complete: boolean; __finals: number };

beforeAll(async () => {
  mkdirSync(evidence, { recursive: true });
  out = mkdtempSync(resolve('../../tmp/overnight/OL1-test-'));
  await build({ configFile: false, logLevel: 'silent', root: resolve('.'), publicDir: false,
    plugins: [{ name: 'orb-load-local', enforce: 'pre',
      resolveId: id => id === 'ol1-entry' ? '\0ol1-entry' : id === 'three' ? '\0ol1-three' : null,
      load: id => id === '\0ol1-entry' ? entry : id === '\0ol1-three' ? three : null }],
    oxc: { jsx: { runtime: 'automatic', development: false } }, define: { 'process.env.NODE_ENV': '"production"' },
    build: { outDir: out, emptyOutDir: true, minify: true, modulePreload: false,
      rollupOptions: { input: 'ol1-entry', output: { entryFileNames: 'entry.js', chunkFileNames: '[name]-[hash].js' } } } });
  // A dynamic import remains in the entry; renderer construction is in the separate chunk.
  expect(readFileSync(join(out, 'entry.js'), 'utf8')).toMatch(/import\([`"']\.\/DayOrb-/);
  expect(readFileSync(join(out, 'entry.js'), 'utf8')).not.toContain('class WebGLRenderer');
  const css = readFileSync(resolve('app/globals.css'), 'utf8');
  server = createServer((req, res) => {
    const path = new URL(req.url ?? '/', 'http://localhost').pathname;
    requests.push({ path, at: Date.now() });
    if (path === '/') { res.writeHead(200, { 'Content-Type': 'text/html', 'Cache-Control': 'no-store' }).end(`<!doctype html><html><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}</style><div id="root"></div><script type="module" src="/entry.js"></script></html>`); return; }
    if (path.includes('..')) { res.writeHead(404).end(); return; }
    try {
      const body = readFileSync(path.startsWith('/clock/') || path.startsWith('/fonts/') ? join(resolve('public'), path) : join(out, path));
      const send = () => res.writeHead(200, { 'Content-Type': path.endsWith('.png') ? 'image/png' : path.endsWith('.ttf') ? 'font/ttf' : 'text/javascript', 'Cache-Control': 'no-store' }).end(body);
      // Deterministic atlas race, in addition to actual CDP network/CPU throttling.
      if (path === '/clock/clock-atlas.png') setTimeout(send, 800); else send();
    } catch { res.writeHead(404).end(); }
  });
  await new Promise<void>(yes => server.listen(0, '127.0.0.1', yes));
  const address = server.address(); if (!address || typeof address === 'string') throw new Error('local_orb_server');
  origin = `http://127.0.0.1:${address.port}`;
  browser = await chromium.launch({ headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
}, 120_000);
afterAll(async () => {
  await browser?.close(); await new Promise<void>(yes => server ? server.close(() => yes()) : yes());
  if (out) { if (!out.startsWith(resolve('../../tmp/overnight') + sep)) throw new Error('unsafe_temp'); rmSync(out, { recursive: true, force: true }); }
});

async function open(surface: string, theme = 'light', reducedMotion: 'reduce' | 'no-preference' = 'no-preference', failure = '') {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, reducedMotion });
  const warnings: string[] = [], errors: string[] = [];
  page.on('console', message => { if (message.type() === 'warning' && message.text().includes('keeping static poster')) warnings.push(message.text()); });
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/*', async route => {
    const url = route.request().url();
    if (!url.startsWith(origin) || (failure === 'chunk' && /\/DayOrb-[^/]+\.js/.test(url)) || (failure === 'atlas' && url.endsWith('/clock/clock-atlas.png'))) return route.abort();
    if (failure === 'timeout' && url.endsWith('/clock/clock-atlas.png')) return; // Held until page closure.
    return route.continue();
  });
  await page.addInitScript(({ theme, failure }) => {
    localStorage.setItem('sf.orb.colorKey', 'gold');
    document.addEventListener('DOMContentLoaded', () => { document.documentElement.dataset.theme = theme; }, { once: true });
    if (failure === 'webgl') HTMLCanvasElement.prototype.getContext = (() => null) as typeof HTMLCanvasElement.prototype.getContext;
    const probe = window as unknown as ProbeWindow; probe.__samples = [];
    const sample = () => {
      const host = document.querySelector<HTMLElement>('[data-orb-load]'), live = host?.querySelector('.orb-live'), poster = host?.querySelector('.orb-poster-layer');
      probe.__samples.push({ at: performance.now(), status: host?.dataset.orbLoad, live: live ? Number(getComputedStyle(live).opacity) : 0,
        poster: poster ? Number(getComputedStyle(poster).opacity) : 0, complete: probe.__complete, clock: !!document.querySelector('.day-readout'),
        duration: live ? getComputedStyle(live).transitionDuration : '' });
      requestAnimationFrame(sample);
    }; requestAnimationFrame(sample);
  }, { theme, failure });
  return { page, errors, warnings, surface };
}
async function settle(page: Page, name: string) {
  await page.waitForSelector('[data-orb-load="ready"]', { timeout: 30_000 });
  await page.waitForTimeout(350);
  const samples = await page.evaluate(() => (window as unknown as ProbeWindow).__samples);
  // No fill paints ahead of the scene: loading is empty, and the complete frame fades in alone.
  expect(samples.some(s => s.status === 'loading' && s.live === 0)).toBe(true);
  expect(samples.filter(s => s.poster > 0)).toEqual([]);
  expect(samples.filter(s => s.clock && s.live > 0 && !s.complete)).toEqual([]);
  expect(samples.some(s => s.live > 0 && s.live < 1)).toBe(true);
  expect(samples.at(-1)).toMatchObject({ status: 'ready', live: 1, poster: 0, duration: '0.25s' });
  writeFileSync(join(evidence, `${name}.json`), JSON.stringify(samples, null, 2));
  await page.screenshot({ path: join(evidence, `${name}.png`) });
}
it.each(['light', 'dark'])('gates cold/reload/route frames in %s on Slow 4G without merging the chunk', async theme => {
  const { page, errors } = await open('today', theme);
  try {
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Network.enable'); await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
    await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: 200000, uploadThroughput: 93750, connectionType: 'cellular4g' });
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    const start = requests.length; await page.goto(`${origin}/?surface=today`, { waitUntil: 'domcontentloaded' }); await settle(page, `${theme}-today-cold`);
    const loaded = requests.slice(start), atlas = loaded.findIndex(r => r.path === '/clock/clock-atlas.png'), chunk = loaded.findIndex(r => /\/DayOrb-/.test(r.path));
    expect(atlas).toBeGreaterThanOrEqual(0); expect(chunk).toBeGreaterThanOrEqual(0);
    expect(atlas).toBeLessThan(chunk); // Atlas begins before the split renderer evaluates.
    await page.reload({ waitUntil: 'domcontentloaded' }); await settle(page, `${theme}-today-reload`);
    await page.evaluate(() => { const p = window as unknown as ProbeWindow; p.__samples = []; p.__switch(); });
    await settle(page, `${theme}-generation-route`);
    await page.goto(`${origin}/?surface=generation`, { waitUntil: 'domcontentloaded' });
    await settle(page, `${theme}-generation-cold`);
    await page.reload({ waitUntil: 'domcontentloaded' }); await settle(page, `${theme}-generation-reload`);
    await page.evaluate(() => { const p = window as unknown as ProbeWindow; p.__samples = []; p.__switch(); });
    await settle(page, `${theme}-today-route`);
    expect(errors).toEqual([]);
  } finally { await page.close(); }
}, 120_000);
it.each(['webgl', 'atlas', 'chunk', 'timeout'])('keeps a final theme/palette poster on %s failure and logs once', async failure => {
  const { page, errors, warnings } = await open('today', 'dark', 'no-preference', failure);
  try {
    await page.goto(`${origin}/?surface=today`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('[data-orb-load="failed"]', { timeout: 20_000 });
    const live = page.locator('.orb-live');
    expect(await live.count() === 0 || await live.evaluate(el => getComputedStyle(el).display === 'none')).toBe(true);
    expect(await page.locator('.orb-static-source').evaluate(el => getComputedStyle(el).backgroundImage)).toContain('244, 197, 66');
    expect(await page.locator('.readout-time').evaluate(el => getComputedStyle(el).opacity)).toBe('1');
    const dark = await page.locator('.orb-static-source').evaluate(el => getComputedStyle(el).backgroundImage);
    await page.evaluate(() => { document.documentElement.dataset.theme = 'light'; });
    expect(await page.locator('.orb-static-source').evaluate(el => getComputedStyle(el).backgroundImage)).not.toBe(dark);
    await page.waitForTimeout(100); expect(warnings).toEqual(['Orb unavailable; keeping static poster.']); expect(errors).toEqual([]);
    await page.screenshot({ path: join(evidence, `fallback-${failure}.png`) });
  } finally { await page.close(); }
}, 40_000);
it('reveals instantly under Reduce Motion and keeps the existing change-only render loop', async () => {
  const { page, errors } = await open('today', 'light', 'reduce');
  try {
    await page.goto(`${origin}/?surface=today`, { waitUntil: 'domcontentloaded' }); await page.waitForSelector('[data-orb-load="ready"]');
    expect(await page.locator('.orb-live').evaluate(el => getComputedStyle(el).transitionDuration)).toBe('0s');
    const before = await page.evaluate(() => (window as unknown as ProbeWindow).__finals);
    await page.waitForTimeout(400);
    expect(await page.evaluate(() => (window as unknown as ProbeWindow).__finals)).toBe(before); expect(errors).toEqual([]);
  } finally { await page.close(); }
}, 30_000);
