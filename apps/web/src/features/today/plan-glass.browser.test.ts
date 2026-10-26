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
    import {useOrbInteraction,rememberOrbColor,applySyncedOrbColor,OrbPointerLayer} from '${file('src/features/knowledge-core/orbInteraction.tsx')}';
    function Orb(){const interaction=useOrbInteraction();window.__choose=rememberOrbColor;window.__sync=applySyncedOrbColor;return createElement('div',{style:{position:'relative',width:300,height:300}},
      createElement(DeferredDayOrb,{minutes:720,size:300,ready:true,interaction,clock:{text:'12:00 PM',fontSize:40}}),createElement(OrbPointerLayer,{interaction,fill:.65}));}
    createRoot(document.getElementById('root')).render(createElement('main',{style:{width:'min(360px,calc(100% - 32px))',margin:'24px auto'}},
      createElement(Orb),
      createElement(PlanButton,{onPress:()=>{window.__presses=(window.__presses??0)+1}})));`,
  three: `import * as T from '${file('../../node_modules/three/build/three.module.js')}';
    export * from '${file('../../node_modules/three/build/three.module.js')}';
    export class WebGLRenderer extends T.WebGLRenderer {
      constructor(options){super(options); const original=this.render.bind(this);
        let body, camera, target, composite, compositeCamera;
        const frames=[]; (window.__renderers??=[]).push({canvas:this.domElement,frames});
        this.render=(scene,cam)=>{
          const mesh=scene.children[0]?.children?.[0];
          if(mesh?.geometry.type==='SphereGeometry' && this.getRenderTarget()?.texture.name!=='orb-ambient-source'){
            window.__orbUniforms=mesh.material.uniforms;
            window.__orbProbe=()=>{const target=this.getRenderTarget();this.setRenderTarget(null);original(scene,cam);const size=this.getDrawingBufferSize(new T.Vector2()), pixels=new Uint8Array(size.x*size.y*4);this.getContext().readPixels(0,0,size.x,size.y,this.getContext().RGBA,this.getContext().UNSIGNED_BYTE,pixels);this.setRenderTarget(target);return {width:size.x,height:size.y,pixels:Array.from(pixels),wave:0};};
          }
          if(mesh?.geometry.type==='ExtrudeGeometry' && this.getRenderTarget()?.texture.name!=='orb-ambient-source'){
            body=scene;camera=cam;target=this.getRenderTarget();
          }
          const start=performance.now();original(scene,cam);
          if(this.getRenderTarget()===null)frames.push({at:performance.now(),ms:performance.now()-start});
          if(body && scene.children[1]?.material?.uniforms?.uAtlas && this.getRenderTarget()===null){
            composite=scene;compositeCamera=cam;
            window.__planLive=()=>({wave:body.children[0].children[0].material.uniforms.uWaveCount.value, color:body.children[0].children[0].material.uniforms.uBase.value.getHexString(), orbColor:window.__orbUniforms?.uBase.value.getHexString(),time:body.children[0].children[0].material.uniforms.uTime.value,radius:body.children[0].children[0].material.uniforms.uCornerRadius.value});
            window.__planProbe=(time,wave,mask=false,hide=false)=>{
              const mesh=body.children[0].children[0];mesh.material.uniforms.uTime.value=time;mesh.material.uniforms.uWaveCount.value=wave>0?1:0;mesh.material.uniforms.uWaves.value[0].set(-.6,0,.8,wave);
              if(mask){const material=new T.MeshBasicMaterial({color:'white'});body.overrideMaterial=material;const visible=body.children[1].visible;body.children[1].visible=false;
                this.setRenderTarget(null);original(body,camera);body.overrideMaterial=null;body.children[1].visible=visible;material.dispose();
              }else{this.setRenderTarget(target);original(body,camera);this.setRenderTarget(null);const visible=composite.children[1].visible;composite.children[1].visible=!hide;original(composite,compositeCamera);composite.children[1].visible=visible;}
              const size=this.getDrawingBufferSize(new T.Vector2());const pixels=new Uint8Array(size.x*size.y*4);
              this.getContext().readPixels(0,0,size.x,size.y,this.getContext().RGBA,this.getContext().UNSIGNED_BYTE,pixels);
              return {width:size.x,height:size.y,pixels:Array.from(pixels),wave:mesh.material.uniforms.uWaveCount.value};
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
const evidence = resolve('../../tmp/overnight/TP2d');
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

interface Pixels { width: number; height: number; pixels: number[]; wave: number }
interface ProbeWindow {
  __planProbe(time: number, wave: number, mask?: boolean, hide?: boolean): Pixels;
  __renderers: { canvas: HTMLCanvasElement; frames: { at: number; ms: number }[] }[];
  __presses: number;
  __planLive(): { wave: number; time: number; radius: number; color: string; orbColor: string };
  __orbProbe(): Pixels;
  __choose(index: number): void;
  __sync(key: string): void;
}
async function open(width = 390, theme = 'light', reducedMotion: 'reduce' | 'no-preference' = 'reduce', fail?: string) {
  const page = await browser.newPage({ viewport: { width, height: 700 }, reducedMotion });
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.route('**/*', route => route.request().url().startsWith(origin) && !route.request().url().endsWith(fail ?? '/never') ? route.continue() : route.abort());
  await page.addInitScript(({ theme, fail }) => {
    document.addEventListener('DOMContentLoaded', () => { document.documentElement.dataset.theme = theme; });
    localStorage.setItem('sf.orb.colorKey', 'pearl'); Date.prototype.getHours=()=>12; Date.prototype.getMinutes=()=>0;
    if (fail === 'webgl') HTMLCanvasElement.prototype.getContext = (() => null) as typeof HTMLCanvasElement.prototype.getContext;
  }, { theme, fail });
  await page.goto(origin);
  return { page, errors };
}
async function ready(page: Page) { await page.waitForSelector('[data-plan-gl="ready"]', { timeout: 20_000 }); }
async function probe(page: Page, time = 8.4, wave = 0, mask = false, hide = false) {
  return page.evaluate(args => (window as unknown as ProbeWindow).__planProbe(...args), [time, wave, mask, hide] as const);
}
function summary(image: Pixels, orb = false) {
  let hx = 0, hy = 0, samples = 0;
  const rows: number[][] = [];
  for (let y = Math.ceil(image.height * (orb ? .25 : .12)); y < image.height * (orb ? .75 : .88); y++) {
    const row: number[] = [];
    for (let x = Math.ceil(image.width * .12); x < image.width * .88; x++) {
      if (orb && Math.hypot(x - image.width / 2, y - image.height / 2) > image.width * .25) continue;
      const i = (y * image.width + x) * 4;
      const [r,g,b] = image.pixels.slice(i,i+3).map(v=>v/255) as [number,number,number];
      row.push(.2126*r+.7152*g+.0722*b);
      const max=Math.max(r,g,b), min=Math.min(r,g,b), d=max-min;
      if(d >= 1/255 && max > .08 && image.pixels[i+3]! > 32) {
        const hue = (max===r ? (g-b)/d : max===g ? (b-r)/d+2 : (r-g)/d+4)*Math.PI/3;
        hx+=Math.cos(hue)*d;hy+=Math.sin(hue)*d;samples++;
      }
    }
    rows.push(row);
  }
  let maxStepFraction=0;
  for(let y=1;y<rows.length;y++) {
    const row=rows[y]!,before=rows[y-1]!;
    const fraction=row.filter((v,x)=>Math.abs(v-before[x]!)>.15).length/row.length;
    maxStepFraction=Math.max(maxStepFraction,fraction);
  }
  const rowMeans=rows.map(row=>row.reduce((a,b)=>a+b,0)/row.length);
  return {hue:(Math.atan2(hy,hx)*180/Math.PI+360)%360,hueSamples:samples,maxStepFraction,
    minRowLuminance:Math.min(...rowMeans),maxRowLuminance:Math.max(...rowMeans)};
}
const pairs = [390,768,1280].flatMap(width=>['light','dark'].flatMap(theme=>['pearl','gold','green'].map((color,index)=>({width,theme,color,index}))));
it.each(pairs)('captures paired gravity-free GL at $width / $theme / $color', async ({width,theme,color,index}) => {
  const {page,errors}=await open(width,theme);
  try {
    await ready(page);await page.waitForSelector('[data-orb-load="ready"]');
    await page.evaluate(index=>(window as unknown as ProbeWindow).__choose(index),index);
    await page.waitForTimeout(120);
    const button=page.getByRole('button',{name:'Plan your free time'});
    expect(await button.locator('svg').isVisible()).toBe(false);
    const measurements=[];
    for (const wave of [0,.6]) {
      const slab=await probe(page,8.4,wave,false,true);
      const orb=await page.evaluate(()=>(window as unknown as ProbeWindow).__orbProbe());
      const sm=summary(slab),om=summary(orb,true);
      const hueDistance=Math.abs(((sm.hue-om.hue+540)%360)-180);
      measurements.push({wave,slab:sm,orb:om,hueDistance});
      writeFileSync(join(evidence,width+'-'+theme+'-'+color+'-metrics.json'),JSON.stringify(measurements,null,2));
      await probe(page,8.4,wave);
      const stem=width+'-'+theme+'-'+color+'-'+(wave?'wave':'rest');
      await page.screenshot({path:join(evidence,stem+'.png')});
      if(width===390 && theme==='dark' && !wave) {
        const orbCrop=await page.locator('.day-orb').screenshot(),slabCrop=await button.screenshot();
        await sharp({create:{width:660,height:320,channels:4,background:'#141516'}})
          .composite([{input:orbCrop,left:0,top:0},{input:slabCrop,left:300,top:140}]).png().toFile(join(evidence,color+'-comparison.png'));
      }
      expect(sm.maxStepFraction).toBeLessThanOrEqual(.6);
      expect(sm.minRowLuminance).toBeGreaterThan(.01);
      expect(sm.hueSamples).toBeGreaterThan(20); expect(om.hueSamples).toBeGreaterThan(20);
      expect(hueDistance).toBeLessThanOrEqual(6);
    }
    writeFileSync(join(evidence,width+'-'+theme+'-'+color+'-metrics.json'),JSON.stringify(measurements,null,2));
    expect(errors).toEqual([]);
  } finally {await page.close();}
},60_000);

it('keeps the rendered silhouette identical across 30 wave frames and shades glyph interiors', async () => {
  const { page, errors } = await open(390, 'dark');
  try {
    await ready(page);
    const baseline = await probe(page, 8.4, 0, true);
    const mask = (image: Pixels) => image.pixels.filter((_v, i) => i % 4 === 3).map(v => v > 127 ? 1 : 0);
    const expected = mask(baseline);
    expect(expected.reduce<number>((a, b) => a + b, 0)).toBeGreaterThan(baseline.width * baseline.height * 0.8);
    for (let i = 0; i < 30; i++) expect(mask(await probe(page, 8.4 + i / 30, i / 29 * 1.79, true))).toEqual(expected);
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

it('pauses off focus and under Reduce Motion; presses affect liquid only and settle by 1800ms', async () => {
  const { page, errors } = await open(390, 'light', 'no-preference');
  try {
    await ready(page);
    const button = page.getByRole('button', { name: 'Plan your free time' });
    const bounds = await button.boundingBox();
    await button.click({ position: { x: 20, y: 24 } });
    await page.waitForFunction(() => (window as unknown as ProbeWindow).__planLive().wave > 0);
    await page.screenshot({ path: join(evidence, 'actual-press-mid-wave.png') });
    expect(await button.boundingBox()).toEqual(bounds);
    expect(await page.evaluate(() => (window as unknown as ProbeWindow).__presses)).toBe(1);
    await page.waitForTimeout(1900);
    expect(await page.evaluate(() => (window as unknown as ProbeWindow).__planLive().wave)).toBe(0);
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

it('follows palette, tap fade and synced colours while Plan presses change neither colour', async () => {
  const {page,errors}=await open(390,'light','no-preference');
  try {
    await ready(page);await page.waitForSelector('[data-orb-load="ready"]');
    await page.evaluate(()=>(window as unknown as ProbeWindow).__choose(1));
    const fadeFrames = await page.evaluate(async () => {
      const rows = [];
      for (let i=0;i<40;i++) {
        await new Promise<void>(resolve=>requestAnimationFrame(()=>resolve()));
        rows.push((window as unknown as ProbeWindow).__planLive());
      }
      return rows;
    });
    expect(fadeFrames.length).toBe(40);
    writeFileSync(join(evidence,'fade-frames.json'),JSON.stringify(fadeFrames,null,2));
    for(const frame of fadeFrames) expect(frame.color).toBe(frame.orbColor);
    await page.waitForTimeout(100);
    let state=await page.evaluate(()=>(window as unknown as ProbeWindow).__planLive());
    expect(state.color).toBe('f4c542');expect(state.orbColor).toBe(state.color);
    await page.getByRole('button',{name:'Plan your free time'}).click();
    state=await page.evaluate(()=>(window as unknown as ProbeWindow).__planLive());
    expect(state.color).toBe('f4c542');expect(state.orbColor).toBe(state.color);
    await page.locator('[data-testid="orb-touch"]').click();
    const tapFrames = await page.evaluate(async () => {
      const rows = [];
      for (let i=0;i<40;i++) { await new Promise<void>(resolve=>requestAnimationFrame(()=>resolve())); rows.push((window as unknown as ProbeWindow).__planLive()); }
      return rows;
    });
    writeFileSync(join(evidence,'tap-fade-frames.json'),JSON.stringify(tapFrames,null,2));
    for(const frame of tapFrames) expect(frame.color).toBe(frame.orbColor);
    await page.waitForTimeout(100);
    state=await page.evaluate(()=>(window as unknown as ProbeWindow).__planLive());
    expect(state.color).toBe('91d5b1');expect(state.orbColor).toBe(state.color);
    await page.evaluate(()=>(window as unknown as ProbeWindow).__sync('violet'));
    const syncFrames = await page.evaluate(async () => {
      const rows = [];
      for (let i=0;i<40;i++) { await new Promise<void>(resolve=>requestAnimationFrame(()=>resolve())); rows.push((window as unknown as ProbeWindow).__planLive()); }
      return rows;
    });
    writeFileSync(join(evidence,'sync-fade-frames.json'),JSON.stringify(syncFrames,null,2));
    for(const frame of syncFrames) expect(frame.color).toBe(frame.orbColor);
    await page.waitForTimeout(100);
    state=await page.evaluate(()=>(window as unknown as ProbeWindow).__planLive());
    expect(state.color).toBe('cfbaf2');expect(state.orbColor).toBe(state.color);
    expect(errors).toEqual([]);
  } finally {await page.close();}
},30_000);

it.each(['webgl', 'plan-atlas.png'])('uses TP2 fallback only after %s failure', async fail => {
  const { page } = await open(390, 'light', 'reduce', fail);
  try { await page.waitForSelector('[data-plan-gl="failed"]', { timeout: 20_000 });
    expect(await page.locator('.plan-action svg').count()).toBe(1);
    expect(await page.locator('.plan-glass-label').textContent()).toBe('Plan');
    expect(await page.locator('.plan-action').evaluate(el=>getComputedStyle(el).color)).toBe('rgb(230, 234, 241)');
    await page.evaluate(()=>(window as unknown as ProbeWindow).__sync('green'));
    await page.waitForFunction(()=>getComputedStyle(document.querySelector('.plan-action')!).color==='rgb(145, 213, 177)');
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

it('keeps the pill radius (half its height) at every width, without resizing', async () => {
  const { page, errors } = await open(1280);
  try {
    await ready(page);
    expect(await page.locator('.plan-action').evaluate(el => getComputedStyle(el).borderRadius)).toBe('24px');
    expect(await page.evaluate(() => (window as unknown as ProbeWindow).__planLive().radius)).toBeCloseTo(24 / 48);
    const width = await page.locator('.plan-action').evaluate(el => el.clientWidth);
    await page.setViewportSize({ width: 760, height: 700 });
    await page.waitForFunction(() => (window as unknown as ProbeWindow).__planLive().radius === 24 / 48);
    expect(await page.locator('.plan-action').evaluate(el => el.clientWidth)).toBe(width);
    expect(errors).toEqual([]);
  } finally { await page.close(); }
}, 30_000);
