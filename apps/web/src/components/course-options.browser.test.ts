import { createServer, type Server } from 'node:http';
import { mkdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { build } from 'esbuild';
import { chromium, type Browser } from 'playwright';
import { afterAll, beforeAll, expect, it } from 'vitest';

// Real options component and production CSS; navigation, data and icon are synthetic.
const output = resolve('../../tmp/overnight/LM1/web-options', String(Date.now()));
let browser: Browser, server: Server, origin: string;
beforeAll(async () => {
  mkdirSync(output, { recursive: true });
  const component = JSON.stringify(resolve('src/components/course-options.tsx').replaceAll('\\', '/'));
  const contents = `import React from 'react';import {createRoot} from 'react-dom/client';import {CourseOptions} from ${component};
const title='Long synthetic course title '.repeat(8);window.actions=[];
createRoot(document.getElementById('root')).render(<div className="course-grid">{['library','generate'].map(kind=><div key={kind} className={kind==='library'?'library-course':'generate-course-tile'}>
<a href="#course" className="course-card" onClick={event=>{event.preventDefault();window.actions.push('navigate')}}><span className="grow"><strong>{title}</strong><span className="meta">Synthetic course details</span></span></a>
{kind==='library'?<span className="course-pinned" aria-label="Pinned">Pin</span>:null}
<CourseOptions title={kind} onPin={kind==='library'?()=>window.actions.push('pin'):undefined} onMove={()=>window.actions.push('move')}/></div>)}</div>);`;
  await build({ stdin: { contents, loader: 'tsx', resolveDir: process.cwd() }, bundle: true, outfile: join(output, 'entry.js'),
    jsx: 'automatic', platform: 'browser', plugins: [{ name: 'synthetic-icon', setup(builder) {
      builder.onResolve({ filter: /^\.\/ui$/ }, () => ({ path: 'icon', namespace: 'synthetic' }));
      builder.onLoad({ filter: /.*/, namespace: 'synthetic' }, () => ({ contents: 'export const Icon=()=>null;', loader: 'js' }));
    } }] });
  const css = readFileSync(resolve('app/globals.css'), 'utf8');
  server = createServer((request, response) => {
    if (request.url === '/entry.js') response.writeHead(200, { 'Content-Type': 'text/javascript' }).end(readFileSync(join(output, 'entry.js')));
    else response.writeHead(200, { 'Content-Type': 'text/html' }).end(`<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}</style><main style="padding:20px"><div id="root"></div></main><script src="/entry.js"></script>`);
  });
  await new Promise<void>(done => server.listen(0, '127.0.0.1', done));
  const address = server.address(); if (!address || typeof address === 'string') throw new Error('Missing loopback port');
  origin = `http://127.0.0.1:${address.port}`;
  browser = await chromium.launch({ headless: true, args: ['--disable-background-networking', '--disable-component-update', '--disable-sync'] });
}, 60000);
afterAll(async () => { await browser?.close(); if (server) await new Promise<void>(done => server.close(() => done())); });

for (const width of [320, 768, 1280]) it(`keeps both web triggers visible inside their cards at ${width}px without navigating`, async () => {
  const page = await browser.newPage({ viewport: { width, height: 900 } });
  try {
    await page.route('**/*', route => route.request().url().startsWith(origin) ? route.continue() : route.abort());
    await page.goto(origin);
    await page.getByRole('button', { name: 'Course options for library', exact: true }).waitFor();
    await page.evaluate(async () => { await Promise.all(document.getAnimations().map(animation => animation.finished)); });
    for (const kind of ['library', 'generate']) {
      const trigger = page.getByRole('button', { name: `Course options for ${kind}`, exact: true }); await trigger.waitFor();
      const geometry = await trigger.evaluate(element => {
        const parent = element.closest('.library-course,.generate-course-tile')!;
        const card = parent.querySelector('.course-card')!.getBoundingClientRect(), button = element.getBoundingClientRect();
        const title = parent.querySelector('strong')!.getBoundingClientRect(), pin = parent.querySelector('.course-pinned')?.getBoundingClientRect();
        return { contained: button.left >= card.left && button.top >= card.top && button.right <= card.right && button.bottom <= card.bottom,
          titleClear: title.right <= button.left, pinClear: !pin || pin.top >= button.bottom,
          visible: getComputedStyle(element.parentElement!).opacity !== '0', width: button.width, height: button.height };
      });
      expect(geometry).toMatchObject({ contained: true, titleClear: true, pinClear: true, visible: true });
      expect(geometry.width).toBeGreaterThanOrEqual(44); expect(geometry.height).toBeGreaterThanOrEqual(44);
      await trigger.click(); expect(await page.getByRole('menu').count()).toBe(1);
      expect(await page.evaluate(() => (window as unknown as { actions: string[] }).actions)).toEqual(kind === 'library' ? [] : ['pin']);
      await page.getByRole(kind === 'library' ? 'menuitemcheckbox' : 'menuitem').click();
      expect(await page.getByRole('menu').count()).toBe(0);
    }
    expect(await page.evaluate(() => (window as unknown as { actions: string[] }).actions)).toEqual(['pin', 'move']);
  } finally { await page.close(); }
});
