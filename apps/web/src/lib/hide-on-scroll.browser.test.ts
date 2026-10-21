import { createServer, type Server } from "node:http";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { chromium, type Browser, type Page } from "playwright";
import { build } from "vite";
import { afterAll, beforeAll, expect, it } from "vitest";

// Real production hook/CSS in local Chromium. Synthetic content; no auth/API.
const web = process.cwd();
const output = mkdtempSync(join(tmpdir(), "rs1-browser-"));
const evidence = process.env.RS1_EVIDENCE_DIR;
let browser: Browser;
let server: Server;
let origin: string;
const entry = `import React,{useState} from 'react';import {createRoot} from 'react-dom/client';
import {useHideOnScroll} from '${resolve("src/lib/use-hide-on-scroll.ts").replaceAll("\\", "/")}';
function App(){const [focused,setFocused]=useState(false),[query,setQuery]=useState('');const header=useHideOnScroll({forceVisible:focused||query.length>0});
const reviewer=new URLSearchParams(location.search).has('reviewer');
const search=React.createElement('div',{className:'scroll-search-slot',style:header.slotStyle},React.createElement('label',{ref:header.measureRef,className:reviewer?'reviewer-search':'grow generate-course-search',style:header.style,inert:header.hidden,'aria-hidden':header.hidden||undefined},React.createElement('input',{type:'search','aria-label':'Find',value:query,onChange:e=>setQuery(e.target.value),onFocus:()=>setFocused(true),onBlur:()=>setFocused(false)})));
const content=React.createElement('article',{className:reviewer?'reviewer-article':'stack'},Array.from({length:100},(_,i)=>React.createElement('p',{key:i,'data-row':i},'Section '+i+' - local scroll evidence')));
return React.createElement('main',{style:{margin:'0 auto',padding:'24px 20px',maxWidth:1000}},React.createElement('h1',null,reviewer?'Reviewer':'Generate'),reviewer?React.createElement('div',{className:'reviewer-layout'},React.createElement('nav',{className:'reviewer-toc'},search),content):React.createElement('div',{className:'stack'},React.createElement('div',{className:'row wrap generate-tools'},search,React.createElement('button',null,'Connection and sync')),content));}
createRoot(document.getElementById('root')).render(React.createElement(App));`;
beforeAll(async () => {
  await build({ configFile: false, logLevel: "silent", root: web, publicDir: false,
    plugins: [{ name: "rs1-local", resolveId: id => id === "rs1-entry" ? "\0rs1-entry" : null, load: id => id === "\0rs1-entry" ? entry : null }],
    oxc: { jsx: { runtime: "automatic" } }, define: { "process.env.NODE_ENV": '"production"' },
    build: { outDir: output, emptyOutDir: true, rollupOptions: { input: "rs1-entry", output: { entryFileNames: "entry.js" } } } });
  const css = readFileSync(resolve("app/globals.css"), "utf8");
  server = createServer((req, res) => {
    if (req.url?.split('?')[0] === "/entry.js") res.writeHead(200, { "Content-Type": "text/javascript" }).end(readFileSync(join(output, "entry.js")));
    else res.writeHead(200, { "Content-Type": "text/html" }).end(`<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}</style><div id="root"></div><script type="module" src="/entry.js"></script>`);
  });
  await new Promise<void>(done => server.listen(0, "127.0.0.1", done));
  const address = server.address(); if (!address || typeof address === "string") throw Error("missing loopback port");
  origin = `http://127.0.0.1:${address.port}`;
  browser = await chromium.launch({ headless: true });
}, 60000);
afterAll(async () => { await browser?.close(); if (server) await new Promise<void>(done => server.close(() => done())); rmSync(output, { recursive: true, force: true }); });
async function open(reviewer = false, reducedMotion: "reduce" | "no-preference" = "no-preference", width = 390) {
  const page = await browser.newPage({ viewport: { width, height: 844 }, reducedMotion });
  await page.route('**/*', route => route.request().url().startsWith(origin) ? route.continue() : route.abort());
  await page.goto(origin + (reviewer ? '/?reviewer' : '/')); await page.locator('input').waitFor();
  await page.waitForTimeout(50); return page;
}
async function metrics(page: Page) {
  return page.evaluate(() => {
    const row = document.querySelector('[data-row="0"]')!, slot = document.querySelector('.scroll-search-slot')!, header = document.querySelector('label')!;
    return { rowY: row.getBoundingClientRect().top + scrollY, slotHeight: slot.getBoundingClientRect().height,
      headerHeight: header.getBoundingClientRect().height, hidden: header.hasAttribute('inert'), transform: getComputedStyle(header).transform,
      y: scrollY, transition: getComputedStyle(header).transitionDuration, position: getComputedStyle(header).position };
  });
}
async function capture(page: Page, name: string) {
  if (evidence) { mkdirSync(evidence, { recursive: true }); await page.screenshot({ path: join(evidence, name + '.png') }); }
}
it.each([false, true])("slow/fast phone scrolling preserves content coordinates and hysteresis (reviewer=%s)", async reviewer => {
  const page = await open(reviewer); const samples: Awaited<ReturnType<typeof metrics>>[] = []; const prefix = reviewer ? 'reviewer' : 'generate';
  const initial = await metrics(page); expect(initial.slotHeight).toBe(initial.headerHeight); expect(initial.position).toBe('absolute');
  await capture(page, prefix + '-shown');
  // Actual wheel input: 1px per event, then fast flings and a slow reversal.
  for (let i = 0; i < 36; i++) { await page.mouse.wheel(0, 1); await page.waitForTimeout(18); samples.push(await metrics(page)); }
  await page.waitForTimeout(240); expect((await metrics(page)).hidden).toBe(true); await capture(page, prefix + '-hidden');
  await page.mouse.wheel(0, 650); await page.waitForTimeout(140);
  for (let i = 0; i < 11; i++) { await page.mouse.wheel(0, -1); await page.waitForTimeout(18); expect((await metrics(page)).hidden).toBe(true); }
  await page.mouse.wheel(0, -1); await page.waitForTimeout(240); expect((await metrics(page)).hidden).toBe(false);
  await capture(page, prefix + '-reverse');
  for (const sample of samples) { expect(sample.rowY).toBe(initial.rowY); expect(sample.slotHeight).toBe(initial.slotHeight); }
  expect(samples.filter((sample, i) => i > 0 && sample.hidden !== samples[i - 1]!.hidden)).toHaveLength(1);
  await page.mouse.wheel(0, -2000); await page.waitForTimeout(240); expect((await metrics(page)).hidden).toBe(false);
  if (evidence) writeFileSync(join(evidence, prefix + '-samples.json'), JSON.stringify({ initial, samples }, null, 2));
  await page.close();
}, 30000);
it("focus/query pinning, font resize and desktop reset preserve the reserved slot", async () => {
  const page = await open(); await page.locator('input').focus(); await page.mouse.wheel(0, 200); await page.waitForTimeout(80);
  expect((await metrics(page)).hidden).toBe(false); await page.locator('input').fill('course'); await page.locator('input').blur();
  await page.mouse.wheel(0, 200); await page.waitForTimeout(80); expect((await metrics(page)).hidden).toBe(false);
  await page.locator('input').evaluate(node => { node.style.height = '92px'; }); await page.waitForTimeout(80);
  expect((await metrics(page)).slotHeight).toBe(92);
  await page.setViewportSize({ width: 1200, height: 844 }); await page.waitForTimeout(80);
  expect((await metrics(page)).position).not.toBe('absolute'); expect((await metrics(page)).hidden).toBe(false);
  await page.close();
});
it("Reduce Motion uses instant endpoints with a stable slot", async () => {
  const page = await open(true, 'reduce'); const initial = await metrics(page);
  await page.mouse.wheel(0, 200); await page.waitForTimeout(80); const hidden = await metrics(page);
  expect(hidden.hidden).toBe(true); expect(hidden.transition).toBe('0s'); expect(hidden.rowY).toBe(initial.rowY);
  await capture(page, 'reviewer-reduced-hidden'); await page.close();
});
