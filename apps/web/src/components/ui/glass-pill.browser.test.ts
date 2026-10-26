import { createServer, type Server } from 'node:http';
import { mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { chromium, type Browser } from 'playwright';
import { build, type Plugin } from 'vite';
import { afterAll, beforeAll, expect, it } from 'vitest';

const evidence = resolve('../../tmp/overnight/PL4/browser');
let server: Server, browser: Browser, origin: string, out: string;
const plugin: Plugin = { name: 'local-glass-pill', resolveId: id => id === 'pill-fixture' ? '\0pill-fixture' : null,
  load: id => id === '\0pill-fixture' ? `import {createElement,useState} from 'react';import {createRoot} from 'react-dom/client';
    import {GlassPill} from '${resolve('src/components/ui/glass-pill.tsx').replaceAll('\\', '/')}';
    function Fixture(){const[open,setOpen]=useState(false);return createElement('main',{style:{display:'grid',gap:24,padding:24}},
      createElement(GlassPill,{label:'Plan',sub:'3 blocks ready',size:'lg',ariaLabel:'Plan your free time',ariaExpanded:open,onClick:()=>setOpen(!open)}),
      ...['Generate reviewer','Generating reviewer','Generate quiz','Generating quiz','Create draft','Creating draft'].map(label=>createElement(GlassPill,{key:label,label,size:'md',busy:/^(Generating|Creating)/.test(label)})),
      createElement(GlassPill,{label:'Generate quiz',size:'sm'}),createElement(GlassPill,{label:'Unavailable',size:'md',disabled:true}));}
    createRoot(document.getElementById('root')).render(createElement(Fixture));` : null };
beforeAll(async () => {
  mkdirSync(evidence, { recursive: true }); out = mkdtempSync(join(evidence, 'build-'));
  await build({ configFile: false, logLevel: 'silent', publicDir: false, plugins: [plugin],
    oxc: { jsx: { runtime: 'automatic', development: false } }, define: { 'process.env.NODE_ENV': '"production"' },
    build: { outDir: out, emptyOutDir: true, rollupOptions: { input: 'pill-fixture', output: { entryFileNames: 'entry.js' } } } });
  const css = readFileSync(resolve('app/globals.css'), 'utf8');
  server = createServer((request, response) => {
    if (request.url === '/entry.js') { response.writeHead(200, { 'Content-Type': 'text/javascript' }).end(readFileSync(join(out, 'entry.js'))); return; }
    if (request.url !== '/') { response.writeHead(404).end(); return; }
    response.writeHead(200, { 'Content-Type': 'text/html' }).end(`<!doctype html><html><style>${css}</style><body><div id="root"></div><script type="module" src="/entry.js"></script></body></html>`);
  });
  await new Promise<void>(yes => server.listen(0, '127.0.0.1', yes));
  const address = server.address(); if (!address || typeof address === 'string') throw Error('local_pill_server');
  origin = `http://127.0.0.1:${address.port}`;
  browser = await chromium.launch({ headless: true });
}, 120_000);
afterAll(async () => { await browser?.close(); await new Promise<void>(yes => server ? server.close(() => yes()) : yes()); if (out) rmSync(out, { recursive: true, force: true }); });

it.each(['light', 'dark'] as const)('vector geometry, busy states, focus and 300 percent clipped edges: %s', async theme => {
  const page = await browser.newPage({ viewport: { width: 1400, height: 1900 }, deviceScaleFactor: 3, reducedMotion: 'reduce' });
  await page.route('**/*', route => route.request().url().startsWith(origin) ? route.continue() : route.abort());
  try {
    page.on('pageerror', error => console.error(error.message)); await page.goto(origin); await page.evaluate(theme => { document.documentElement.dataset.theme = theme; }, theme);
    const plan = page.getByRole('button', { name: 'Plan your free time' }); await plan.waitFor();
    expect(await page.locator('.glass-pill canvas,.glass-pill img,.glass-pill image,.glass-pill video').count()).toBe(0);
    expect(await plan.getAttribute('aria-expanded')).toBe('false'); await plan.click();
    expect(await plan.getAttribute('aria-expanded')).toBe('true');
    for (const [size, height, font] of [['lg', 52, 16], ['md', 46, 15], ['sm', 34, 13]] as const) {
      const style = await page.locator(`.glass-pill-${size}`).first().evaluate(el => {
        const s = getComputedStyle(el); return { height: parseFloat(s.height), font: parseFloat(s.fontSize), overflow: s.overflow, filter: s.backdropFilter };
      });
      expect(style).toEqual({ height, font, overflow: 'hidden', filter: 'none' });
    }
    expect(await plan.evaluate(el => getComputedStyle(el).color)).toBe(theme === 'dark' ? 'rgb(242, 239, 232)' : 'rgb(20, 20, 21)');
    expect(await plan.locator('.glass-pill-dot').evaluate(el => getComputedStyle(el).width)).toBe('4px');
    for (const label of ['Generating reviewer', 'Generating quiz', 'Creating draft']) {
      const pill = page.getByRole('button', { name: label, exact: true });
      expect(await pill.isDisabled()).toBe(true); expect(await pill.getAttribute('aria-busy')).toBe('true');
      expect(await pill.evaluate(el => getComputedStyle(el).opacity)).toBe('0.75');
      expect(await pill.locator('svg').evaluate(el => getComputedStyle(el).animationName)).toBe('none');
    }
    await plan.focus(); await page.keyboard.press('Tab'); await page.keyboard.press('Shift+Tab');
    expect(await plan.evaluate(el => getComputedStyle(el).outlineWidth)).toBe('2px');
    await page.keyboard.press('Enter'); expect(await plan.getAttribute('aria-expanded')).toBe('false');
    await page.evaluate(() => { document.body.style.zoom = '3'; });
    await page.screenshot({ path: join(evidence, `pills-300pct-${theme}.png`), fullPage: true });
  } finally { await page.close(); }
});
it('animates only the vector spinner when motion is allowed', async () => {
  const page = await browser.newPage({ reducedMotion: 'no-preference' });
  await page.route('**/*', route => route.request().url().startsWith(origin) ? route.continue() : route.abort());
  try { page.on('pageerror', error => console.error(error.message)); await page.goto(origin); const spinner = page.locator('.glass-pill-spinner').first(); await spinner.waitFor();
    expect(await spinner.evaluate(el => getComputedStyle(el).animationName)).toBe('glass-pill-spin');
  } finally { await page.close(); }
});
