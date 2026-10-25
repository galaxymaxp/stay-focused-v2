import { createServer, type Server } from 'node:http';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { build } from 'esbuild';
import ts from 'typescript';
import sharp from 'sharp';
import { chromium, type Browser } from 'playwright';
import { afterAll, beforeAll, expect, it } from 'vitest';

const root = resolve('../..'), output = join(root, 'tmp/overnight/QL1/visual');
const file = (path: string) => JSON.stringify(join(root, path).replaceAll('\\', '/'));
function component(path: string, name: string) {
  const source = ts.createSourceFile(path, readFileSync(path, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const statement = source.statements.find(node => (ts.isFunctionDeclaration(node) && node.name?.text === name)
    || (ts.isVariableStatement(node) && node.declarationList.declarations.some(d => d.name.getText(source) === name)));
  if (!statement) throw new Error(`Missing ${name}`);
  return statement.getText(source).replace(/^export /, '');
}
let browser: Browser, server: Server, origin: string;
beforeAll(async () => {
  mkdirSync(output, { recursive: true });
  const entry = `import React,{memo,useCallback,useEffect,useRef,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {Animated,Easing,Pressable,Text,View,useWindowDimensions} from 'react-native-web';
import * as THREE from 'three';
import {QueueOrb} from ${file('apps/web/src/components/queue-orb.tsx')};
import {QueueOrb as NativeOrb} from ${file('apps/mobile/src/features/queue/QueueOrb.tsx')};
import {createOrbInteraction,ORB_IDLE_PALETTE,queueFailureCards,queueIsIdle} from ${file('packages/shared/src/index.ts')};
import {createOrbBody} from ${file('packages/shared/src/orb-body-renderer.ts')};
import {createOrbStage,configureOrbRenderer,DAY_ORB_FILL} from ${file('packages/shared/src/orb-scene.ts')};
import {dayOrbTones} from ${file('apps/web/src/features/day-clock/dayClock.ts')};
import {palettes} from ${file('apps/mobile/src/design/themeTokens.ts')};
const params=new URLSearchParams(location.search),mode=params.get('mode')||'light',index=Number(params.get('color')||0);
document.documentElement.dataset.theme=mode;
const handle=()=>({state:{current:createOrbInteraction(index)},wake:{current:null}}),web=handle(),native=handle();
const useOrbInteraction=()=>web,useNativeOrbInteraction=()=>native;
const noop=()=>{},refresh=noop,queue={generating:0,queued:0,sections:[],loading:false,refreshing:false,data:{jobs:[]},refresh,show:noop};
const useQueueItems=()=>queue,usePathname=()=>'/today',useSearchParams=()=>new URLSearchParams(),useRouter=()=>({replace:noop});
const useListPreferences=()=>({prefs:{hidden:{queue:[]}},hide:noop}),Icon=()=>null,CourseBatchQueue=()=>null,QueueCard=()=>null;
const useIsFocused=()=>true,useAppActivity=()=>({active:false,generating:0,queued:0,syncing:false}),haptic={tap:noop};
const motion={spatial:600,spring:{}},shouldAnimate=()=>false,hitTarget={min:48},ORB_SIZE=26;
const useTheme=()=>({mode,colors:palettes[mode],active:true,reducedMotion:true});
${component(join(root, 'apps/web/src/components/queue-button.tsx'), 'QueueButton')}
${component(join(root, 'apps/mobile/src/design/QueueButton.tsx'), 'QueueButton').replace('const QueueButton =', 'const NativeButton =').replace('useOrbInteraction()', 'useNativeOrbInteraction()').replace('<QueueOrb ', '<NativeOrb ')}
function Today(){const ref=useRef(null);useEffect(()=>{const renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,preserveDrawingBuffer:true});renderer.setSize(384,384);configureOrbRenderer(renderer);
const {scene,camera,root}=createOrbStage('clock'),body=createOrbBody(),tones=dayOrbTones(720);root.add(body.mesh);camera.lookAt(0,0,0);camera.updateMatrixWorld();body.update({idleColor:ORB_IDLE_PALETTE[index].hex,time:8.4,life:.22,stir:0,glow:.35+tones.strength*.75,level:0,error:0,spin:new THREE.Matrix3(),mode,light:tones.position});renderer.render(scene,camera);
const c=ref.current;c.width=78;c.height=78;const d=384*DAY_ORB_FILL;c.getContext('2d').drawImage(renderer.domElement,(384-d)/2,(384-d)/2,d,d,0,0,78,78);body.dispose();renderer.dispose();renderer.forceContextLoss();},[]);return <canvas id="today-crop" ref={ref} style={{width:26,height:26}}/>;}
window.recolor=i=>{for(const h of [web,native]){h.state.current=createOrbInteraction(i);h.wake.current?.();}};
createRoot(document.getElementById('root')).render(<main><div className="topbar" id="web-header"><QueueButton/></div><div id="mobile-header"><NativeButton/></div><div id="reference">{!params.has('fallback')&&<Today/>}</div><p>Queue / mobile web proxy / Today body reference</p></main>);`;
  const bundle = await build({ stdin: { contents: entry, resolveDir: root, loader: 'tsx' }, bundle: true,
    write: false, jsx: 'automatic', format: 'iife', define: { 'process.env.NODE_ENV': '"production"' },
    plugins: [{ name: 'native-boundaries', setup(b) {
      b.onResolve({ filter: /^react-native$/ }, () => ({ path: require.resolve('react-native-web') }));
      b.onResolve({ filter: /^expo-gl$/ }, () => ({ path: 'expo-gl', namespace: 'native-boundary' }));
      b.onResolve({ filter: /^expo-file-system\/legacy$/ }, () => ({ path: 'file-system', namespace: 'native-boundary' }));
      b.onLoad({ filter: /.*/, namespace: 'native-boundary' }, args => ({ contents: args.path === 'file-system'
        ? `export const cacheDirectory=null;export const getInfoAsync=async()=>({exists:false});`
        : `export const GLView={
          createContextAsync:async()=>{const c=document.createElement('canvas');return c.getContext('webgl2',{alpha:true,preserveDrawingBuffer:true});},
          destroyContextAsync:async gl=>{gl.getExtension('WEBGL_lose_context')?.loseContext();return true;},
          takeSnapshotAsync:async(gl,options)=>{const {width,height}=options.rect;gl.bindFramebuffer(gl.FRAMEBUFFER,options.framebuffer);
            const bytes=new Uint8Array(width*height*4);gl.readPixels(0,0,width,height,gl.RGBA,gl.UNSIGNED_BYTE,bytes);
            const pixels=new Uint8ClampedArray(bytes.length);for(let y=0;y<height;y++){const row=options.flip?y:height-1-y;pixels.set(bytes.subarray(row*width*4,(row+1)*width*4),y*width*4);}
            const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;canvas.getContext('2d').putImageData(new ImageData(pixels,width,height),0,0);
            const localUri=canvas.toDataURL('image/png');window.__nativeSnapshotUri=localUri;return {localUri};}
        };`, loader: 'js' }));
      b.onLoad({ filter: /\.png$/ }, args => ({ contents: `export default {uri:${JSON.stringify('data:image/png;base64,' + readFileSync(args.path).toString('base64'))}}`, loader: 'js' }));
    } }],
  });
  const css = readFileSync(join(root, 'apps/web/app/globals.css'), 'utf8');
  server = createServer((req, res) => {
    const path = new URL(req.url ?? '/', 'http://localhost').pathname;
    if (path.startsWith('/queue/stills/') && /^\/queue\/stills\/[a-z0-9-]+\.png$/.test(path)) {
      res.setHeader('Content-Type', 'image/png'); res.end(readFileSync(join(root, 'apps/web/public', path))); return;
    }
    res.setHeader('Content-Type', 'text/html');
    res.end(`<meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}
    main{padding:20px}#web-header{position:relative}#mobile-header{margin:24px 0;display:flex;justify-content:flex-end}#reference{margin:24px}#root{background:var(--bg)}</style><div id="root"></div><script>${bundle.outputFiles[0]!.text}</script>`);
  });
  await new Promise<void>(done => server.listen(0, '127.0.0.1', done));
  origin = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
  browser = await chromium.launch({ headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-webgl'] });
}, 60_000);
afterAll(async () => { await browser?.close(); if (server) await new Promise<void>(done => server.close(() => done())); });

async function metrics(png: Buffer) {
  const { data, info } = await sharp(png).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const luminance: number[] = [], rgb = [0, 0, 0];
  const linear = (c: number) => { const v = c / 255; return v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; };
  for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) {
    if (Math.hypot((x + .5) / info.width - .5, (y + .5) / info.height - .5) > .46) continue;
    const i = (y * info.width + x) * 3;
    const r = data[i]!, g = data[i + 1]!, b = data[i + 2]!;
    luminance.push(.2126 * linear(r) + .7152 * linear(g) + .0722 * linear(b));
    rgb[0]! += r; rgb[1]! += g; rgb[2]! += b;
  }
  luminance.sort((a, b) => a - b);
  const [r, g, b] = rgb as [number, number, number], max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  const hue = d === 0 ? 0 : ((max === r ? (g - b) / d : max === g ? (b - r) / d + 2 : (r - g) / d + 4) * 60 + 360) % 360;
  return { mean: luminance.reduce((a, b) => a + b, 0) / luminance.length, p95: luminance[Math.floor(luminance.length * .95)]!, hue };
}
for (const width of [390, 1280]) for (const mode of ['light', 'dark']) for (const color of [0, 1, 2]) {
  it(`matches Today at ${width}/${mode}/palette-${color}, web + labelled mobile proxy`, async () => {
    const page = await browser.newPage({ viewport: { width, height: 640 }, deviceScaleFactor: 3, reducedMotion: 'reduce' });
    try {
    await page.route('**/*', route => new URL(route.request().url()).origin === origin || route.request().url().startsWith('data:') ? route.continue() : route.abort());
    await page.goto(`${origin}/?mode=${mode}&color=${color}`);
    await page.waitForFunction(() => document.querySelector<HTMLElement>('#web-header .queue-orb-still')?.style.backgroundImage.includes('data:image/png'));
    await page.waitForFunction(`window.__nativeSnapshotUri && document.querySelector('#mobile-header img')?.getAttribute('src') === window.__nativeSnapshotUri`);
    const capture = async (selector: string) => {
      const box = await page.locator(selector).boundingBox();
      if (!box) throw new Error('Missing orb capture');
      // Locator screenshot rounds fractional CSS bounds outwards (26px can
      // become 27px vertically). Crop exactly the same 78 physical pixels for
      // all bodies, rather than measuring a different-sized rectangular mask.
      return sharp(await page.screenshot()).extract({ left: Math.round(box.x * 3), top: Math.round(box.y * 3), width: 78, height: 78 }).png().toBuffer();
    };
    const today = await capture('#today-crop');
    const reference = await metrics(today), results = [];
    const key = ['pearl', 'gold', 'green'][color]!;
    writeFileSync(join(output, `${width}-${mode}-${key}-today.png`), today);
    const hex = ['e6eaf1', 'f4c542', '91d5b1'][color]!;
    const fallbackFile = `queue/stills/ql1-v1-${hex}-${mode}.png`;
    const webAsset = readFileSync(join(root, 'apps/web/public', fallbackFile));
    expect(readFileSync(join(root, 'apps/mobile/assets', fallbackFile)).equals(webAsset)).toBe(true);
    const fallback = await metrics(await sharp(webAsset).flatten({ background: mode === 'dark' ? '#000000' : '#f7f6f2' }).png().toBuffer());
    expect(Math.abs(fallback.mean / reference.mean - 1)).toBeLessThanOrEqual(.10);
    expect(Math.abs(fallback.p95 / reference.p95 - 1)).toBeLessThanOrEqual(.10);
    expect(Math.min(Math.abs(fallback.hue - reference.hue), 360 - Math.abs(fallback.hue - reference.hue))).toBeLessThanOrEqual(6);
    for (const [platform, selector] of [['web', '#web-header [data-testid="queue-orb-still"]'], ['mobile-proxy', '#mobile-header [data-testid="queue-orb-still"]']]) {
      const crop = await capture(selector!); const actual = await metrics(crop);
      const hueGap = Math.min(Math.abs(actual.hue - reference.hue), 360 - Math.abs(actual.hue - reference.hue));
      const meanError = Math.abs(actual.mean / reference.mean - 1), p95Error = Math.abs(actual.p95 / reference.p95 - 1);
      results.push({ platform, actual, reference, meanError, p95Error, hueGap });
      writeFileSync(join(output, `${width}-${mode}-${key}-${platform}.png`), crop);
      const oldPath = join(root, `tmp/overnight/QL1/${mode}-${key}-old-${platform === 'web' ? 'web' : 'mobile'}.png`);
      // Preserve the real baseline when present; a clean checkout can still run
      // assertions without historical local evidence files.
      if (existsSync(oldPath)) {
        const old = await sharp(oldPath).resize(78, 78).png().toBuffer();
        const strip = await sharp({ create: { width: 234, height: 78, channels: 3, background: mode === 'dark' ? '#000000' : '#f7f6f2' } })
          .composite([{ input: old, left: 0, top: 0 }, { input: crop, left: 78, top: 0 }, { input: today, left: 156, top: 0 }]).png().toBuffer();
        writeFileSync(join(output, `${width}-${mode}-${key}-${platform}-comparison.png`), strip);
      }
      expect(meanError, JSON.stringify(results)).toBeLessThanOrEqual(.10);
      expect(p95Error, JSON.stringify(results)).toBeLessThanOrEqual(.10);
      expect(hueGap, JSON.stringify(results)).toBeLessThanOrEqual(6);
      expect(await page.locator(selector!).boundingBox()).toMatchObject({ width: 26, height: 26 });
    }
    await page.getByRole('button', { name: 'Open Queue', exact: true }).first().click();
    await expect.poll(() => page.getByRole('dialog', { name: 'Queue', exact: true }).count()).toBe(1);
    await page.screenshot({ path: join(output, `${width}-${mode}-${key}-queue.png`) });
    writeFileSync(join(output, `${width}-${mode}-${key}.json`), JSON.stringify(results, null, 2));
    } finally { await page.close(); }
  }, 30_000);
}
it('keeps fallback pixels quiet without WebGL and stops rotation for Reduce Motion/hidden state', async () => {
  const page = await browser.newPage({ reducedMotion: 'reduce' });
  await page.addInitScript(() => { HTMLCanvasElement.prototype.getContext = (() => null) as typeof HTMLCanvasElement.prototype.getContext; });
  await page.goto(`${origin}/?mode=dark&color=1&fallback=1`);
  await page.waitForSelector('.queue-orb-still');
  const values = await page.locator('.queue-orb-still').first().evaluate(el => {
    const parent = el.closest('.queue-button')!; parent.classList.add('working');
    return { background: getComputedStyle(el).backgroundImage, spill: getComputedStyle(el, '::before').content,
      rotation: getComputedStyle(el.parentElement!).animationName };
  });
  expect(values.background).toContain('ql1-v1-f4c542-dark.png'); expect(values.spill).toBe('none'); expect(values.rotation).toBe('none');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  expect(await page.locator('.queue-orb').evaluate(el => getComputedStyle(el).animationName)).toBe('queue-turn');
  await page.locator('.queue-button').evaluate(el => el.setAttribute('data-hidden', 'true'));
  expect(await page.locator('.queue-orb').evaluate(el => getComputedStyle(el).animationPlayState)).toBe('paused');
  await page.close();
}, 30_000);
