import { createServer, type Server } from 'node:http';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { chromium, type Browser, type Page } from 'playwright';
import { build, type Plugin } from 'vite';
import { afterAll, beforeAll, expect, it } from 'vitest';

// Actual DayRingClock, orb, shared shader and CSS; all traffic is loopback only.
// The standalone orb query measures the existing no-clock rendering path.
const stubs: Record<string, string> = {
  entry: `import { createRoot } from 'react-dom/client';
    import { createElement, useState } from 'react';
    import { DayRingClock } from '${resolve('src/features/day-clock/DayRingClock.tsx').replace(/\\/g, '/')}';
    import { PlanningControl } from '${resolve('src/features/today/planning-sheet.tsx').replace(/\\/g, '/')}';
    import { PlanPreview } from '${resolve('src/features/today/plan-preview.tsx').replace(/\\/g, '/')}';
    import { planningDraftSummary } from '@stay-focused/shared';
    const id = n => '00000000-0000-4000-8000-'+String(n).padStart(12,'0');
    const at=time=>new Date('2026-10-25T'+time+':00').toISOString(); const range={startsAt:at('00:00'),endsAt:new Date(new Date('2026-10-25T00:00:00').getTime()+86400000).toISOString()};
    const free=[{startsAt:at('09:00'),endsAt:at('11:00')}];
    const data={planningRange:range,availability:free,freeWindowMinutes:120,personalItems:[],courses:[1,2].map(n=>({id:id(n),name:n===1?'Biology':'Chemistry',items:[
      {kind:'task',id:id(n+10),title:n===1?'Cell diagram practice':'Chemistry lab report',courseId:id(n),estimateMinutes:n===1?80:70,openedWithin24h:false,dueAt:null,priority:'medium',createdAt:'2026-10-01T00:00:00.000Z'},
      {kind:'reviewer',id:id(n+20),title:n===1?'Cell biology reviewer.pdf':'Opened chemistry reviewer.pdf',courseId:id(n),estimateMinutes:20,openedWithin24h:n===2,dueAt:null,priority:'medium',createdAt:'2026-10-01T00:00:00.000Z',smartRank:n}
    ]}))};
    function App(){const [choice,setChoice]=useState(null);const [range,setRange]=useState({start:540,end:660});
      window.__choice=choice;window.__reads??=0;
      return createElement('main',{style:{width:'min(360px,calc(100% - 32px))',margin:'16px auto'}},
        createElement(DayRingClock,{date:'2026-10-25',timeline:[],...range,onCommit:(start,end)=>setRange({start,end}),onToggleLock:()=>{}}),
        createElement(PlanningControl,{request:{planningRange:data.planningRange,availability:data.availability},active:choice,
          load:async()=>{window.__reads++;return data},onBuild:value=>{setChoice(value)}}),
        choice?createElement(PlanPreview,{plan:planningDraftSummary(data,choice.draft).plan,from:540,to:660,busy:false,onApply:()=>{},onDiscard:()=>{}}):null);
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
          const body = scene.children[0]?.children?.[0]?.material?.uniforms;
          if (body?.uSpin && this.getRenderTarget()?.texture.name !== 'orb-ambient-source') {
            const target = this.getRenderTarget();
            window.__probeClock = color => {
              body.uTime.value = 8.4; body.uLife.value = 0.6; body.uGlow.value = 1;
              body.uBase.value.set(color); body.uGlowColor.value.set(color); body.uLight.value.set(0,0,0);
              this.setRenderTarget(target); original(scene,camera); this.setRenderTarget(null);
            };
          }
          const start = performance.now(); original(scene, camera);
          const composite = !!scene.children[1]?.material?.uniforms?.uAtlas;
          window.__renders.push({ ms: performance.now() - start, at: performance.now(), calls: this.info.render.calls, composite, final: this.getRenderTarget() === null,
            geometries: this.info.memory.geometries, textures: this.info.memory.textures });
          if (composite) { window.__hideClock = () => { scene.children[1].visible = false; original(scene, camera); };
            window.__showClock = () => { scene.children[1].visible = true; original(scene,camera); }; }
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
const evidence = resolve('../../tmp/overnight/TP2/browser');
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
      const file = path.startsWith('/clock/') || path.startsWith('/fonts/') || path.startsWith('/icons/') ? join(resolve('public'), path) : join(out, path);
      const body = readFileSync(file);
      response.writeHead(200, { 'Content-Type': path.endsWith('.png') ? 'image/png' : path.endsWith('.ttf') ? 'font/ttf' : path.endsWith('.svg') ? 'image/svg+xml' : 'text/javascript' });
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
    Object.defineProperty(window, 'Date', { value: new Proxy(Original, { construct(target, args) { return args.length ? Reflect.construct(target, args) : new Original(2026, 9, 19, location.search.includes('late') ? 23 : 12, location.search.includes('late') ? 59 : 0); } }) });
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

it.each([[390,'light'],[390,'dark'],[768,'light'],[1280,'light'],[1280,'dark']] as const)('planning sheet visual and two-tap default at %i %s', async (width, theme) => {
 const {page,errors}=await open(width,theme,'reduce');
 try {
  await glass(page);
  const button=page.getByRole('button',{name:'Plan your free time',exact:true});
  expect(await button.evaluate(el=>el.getBoundingClientRect().height)).toBe(48);
  await button.click();
  const panel=page.getByRole('dialog',{name:'Plan your free time',exact:true});
  await panel.getByRole('button',{name:'Build plan',exact:true}).waitFor();
  expect(await panel.evaluate(el=>getComputedStyle(el).backgroundColor)).not.toContain('rgba');
  expect(await panel.evaluate(el=>getComputedStyle(el).position)).toBe(width<768?'fixed':'absolute');
  expect(await panel.getByRole('button',{name:'Both',exact:true}).getAttribute('aria-pressed')).toBe('true');
  expect(await panel.getByRole('button',{name:/3 items/}).textContent()).toContain("~50 min won't fit");
  await page.screenshot({path:join(evidence,`${width}-${theme}-default.png`)});
  await panel.getByRole('button',{name:'Build plan',exact:true}).click();
  expect(await page.getByRole('dialog').count()).toBe(0);
  const choice=await page.evaluate(()=>(window as unknown as {__choice:{mode:string;selection:{order:string;items:unknown[]}}}).__choice);
  expect(choice.mode).toBe('reviewers_tasks');expect(choice.selection.order).toBe('smart');expect(choice.selection.items).toHaveLength(3);
  // Kind marks appear after PlanPreview's ResizeObserver measures the bar.
  await page.locator('.plan-block .icon').first().waitFor({state:'attached'});
  expect(await page.locator('.plan-block .icon').count()).toBeGreaterThan(0);
  await page.screenshot({path:join(evidence,`${width}-${theme}-built.png`)});
  const countBefore=await page.locator('.plan-block .icon').count();
  await page.locator('.plan-bar').evaluate(el=>(el as HTMLElement).style.width='10px');
  await page.waitForFunction(()=>document.querySelectorAll('.plan-block .icon').length===0);
  await page.locator('.plan-bar').evaluate(el=>(el as HTMLElement).style.width='');
  await page.waitForFunction(count=>document.querySelectorAll('.plan-block .icon').length===count,countBefore);
  await button.click();await panel.getByRole('button',{name:'Build plan',exact:true}).waitFor();
  await panel.getByRole('button',{name:/3 items/}).click();
  expect(await panel.getByRole('checkbox',{name:'Opened chemistry reviewer.pdf',exact:true}).isChecked()).toBe(false);
  await panel.getByRole('checkbox',{name:'Opened chemistry reviewer.pdf',exact:true}).check();
  await panel.getByRole('button',{name:'Move Chemistry up',exact:true}).click();
  expect(await panel.getByRole('button',{name:'Reset to smart order',exact:true}).count()).toBe(1);
  await panel.getByRole('button',{name:'Reset to smart order',exact:true}).click();
  await page.screenshot({path:join(evidence,`${width}-${theme}-expanded.png`)});
  expect(await page.evaluate(()=>(window as unknown as {__reads:number}).__reads)).toBe(2);
  expect(errors).toEqual([]);
 }finally{await page.close()}
},60_000);
it('Select courses, Include, keyboard focus and close preserve the built choice; reload resets',async()=>{
 const {page,errors}=await open(1280,'light','reduce');
 try{
  await page.getByRole('button',{name:'Plan your free time',exact:true}).click();
  const panel=page.getByRole('dialog',{name:'Plan your free time',exact:true});
  await panel.getByRole('button',{name:'Select',exact:true}).click();
  for(const name of ['Biology','Chemistry']) await panel.getByRole('button',{name,exact:true}).click();
  expect(await panel.getByRole('button',{name:'Build plan',exact:true}).isDisabled()).toBe(true);
  expect(await panel.getByText('Pick at least one course', {exact:true}).count()).toBe(1);
  await panel.getByRole('button',{name:'Biology',exact:true}).click();
  for(const name of ['Reviewers','Tasks','Both']){await panel.getByRole('button',{name,exact:true}).click();expect(await panel.getByRole('button',{name,exact:true}).getAttribute('aria-pressed')).toBe('true')}
  await panel.getByRole('button',{name:'Build plan',exact:true}).click();
  const saved=await page.evaluate(()=>(window as unknown as {__choice:unknown}).__choice);
  await page.getByRole('button',{name:'Plan your free time',exact:true}).click();
  await panel.getByRole('button',{name:'Reset to all',exact:true}).click();
  const last=panel.getByRole('button',{name:'Build plan',exact:true});await last.focus();await page.keyboard.press('Tab');
  expect(await page.evaluate(()=>document.activeElement?.getAttribute('aria-label'))).toBe('Close planning');
  await page.keyboard.press('Escape');expect(await page.getByRole('dialog').count()).toBe(0);
  expect(await page.evaluate(()=>(window as unknown as {__choice:unknown}).__choice)).toEqual(saved);
  expect(await page.evaluate(()=>document.activeElement?.getAttribute('aria-label'))).toBe('Plan your free time');
  await page.reload();expect(await page.evaluate(()=>(window as unknown as {__choice:unknown}).__choice)).toBeNull();
  expect(errors).toEqual([]);
 }finally{await page.close()}
},60_000);
it('keeps the glass shell fixed on press, pauses when unfocused, and statically fills Reduce Motion',async()=>{
 const {page,errors}=await open(1280,'light','no-preference');
 try{
  const button=page.getByRole('button',{name:'Plan your free time',exact:true});
  const shell=()=>button.evaluate(el=>{const s=getComputedStyle(el),r=el.getBoundingClientRect();return {width:r.width,height:r.height,radius:s.borderRadius,border:s.borderColor,background:s.backgroundImage,color:s.color}});
  const before=await shell();await button.click();expect(await shell()).toEqual(before);
  expect(await page.locator('.plan-action-liquid').evaluate(el=>el.getAnimations().length)).toBe(0);
  await page.keyboard.press('Escape');
  await page.evaluate(()=>{document.hasFocus=()=>false;window.dispatchEvent(new Event('blur'))});
  expect(await button.getAttribute('data-live')).toBe('false');
  expect(await page.locator('.plan-liquid-flow').evaluate(el=>getComputedStyle(el).animationPlayState)).toBe('paused');
  await page.evaluate(()=>{document.hasFocus=()=>true;window.dispatchEvent(new Event('focus'))});
  await page.emulateMedia({reducedMotion:'reduce'});
  expect(await page.locator('.plan-liquid-flow').evaluate(el=>getComputedStyle(el).animationName)).toBe('none');
  await button.click();expect(await button.evaluate(el=>{const effect=el.getAnimations()[0]?.effect;return effect instanceof KeyframeEffect && effect.getKeyframes().some(frame=>Number(frame.opacity)===0.85)})).toBe(true);
  expect(await shell()).toEqual(before);expect(errors).toEqual([]);
 }finally{await page.close()}
},60_000);
it('measures existing clock cadence with the button liquid paused and flowing',async()=>{
 const {page,errors}=await open(1280,'light','no-preference');
 const samples:Record<string,unknown>={};
 try{
  await glass(page);
  for(const flowing of [false,true]){
   await page.locator('.plan-liquid-flow').evaluate((el,flowing)=>{(el as HTMLElement).style.animationPlayState=flowing?'running':'paused'},flowing);
   await page.evaluate(()=>(window as unknown as {__renders:unknown[]}).__renders=[]);
   await page.waitForFunction(()=>((window as unknown as {__renders:{final:boolean}[]}).__renders?.filter(row=>row.final).length??0)>=32,null,{timeout:20_000});
   samples[flowing?'flowing':'paused']=await page.evaluate(()=>{
    const rows=(window as unknown as {__renders:{at:number;ms:number;final:boolean}[]}).__renders.filter(row=>row.final).slice(8);
    const intervals=rows.slice(1).map((row,index)=>row.at-rows[index]!.at).sort((a,b)=>a-b);
    return {frames:rows.length,medianIntervalMs:intervals[Math.floor(intervals.length/2)]};
   });
  }
  writeFileSync(join(evidence,'button-clock-cadence.json'),JSON.stringify(samples,null,2));
  expect(errors).toEqual([]);
 }finally{await page.close()}
},60_000);
