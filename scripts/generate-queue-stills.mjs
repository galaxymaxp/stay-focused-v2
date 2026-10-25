// Local-only, reproducible compatibility assets from the authoritative shared scene.
import { createServer } from 'node:http';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import { chromium } from 'playwright';

const root = fileURLToPath(new URL('../', import.meta.url));
const bundle = await build({ stdin: { contents: `
import {renderQueueOrbStill} from './apps/web/src/features/queue-orb-still';
import {ORB_IDLE_PALETTE} from './packages/shared/src/orb-interaction';
window.generate=async()=>{const images={};for(const mode of ['light','dark'])for(const {hex} of ORB_IDLE_PALETTE){
 images[hex.slice(1).toLowerCase()+'-'+mode]=await renderQueueOrbStill({color:hex,mode,pixels:78});}return images;};`,
  resolveDir: root, loader: 'ts' }, bundle: true, format: 'iife', write: false });
const server = createServer((_req, res) => { res.setHeader('Content-Type', 'text/html'); res.end(`<script>${bundle.outputFiles[0].text}</script>`); });
await new Promise(done => server.listen(0, '127.0.0.1', done));
let browser;
try {
  browser = await chromium.launch({ headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-webgl'] });
  const page = await browser.newPage();
  await page.route('**/*', route => new URL(route.request().url()).hostname === '127.0.0.1' ? route.continue() : route.abort());
  await page.goto(`http://127.0.0.1:${server.address().port}`);
  const images = await page.evaluate(() => window.generate());
  for (const folder of ['apps/web/public/queue/stills', 'apps/mobile/assets/queue/stills']) {
    await mkdir(resolve(root, folder), { recursive: true });
    for (const [key, data] of Object.entries(images)) await writeFile(resolve(root, folder, `ql1-v1-${key}.png`), Buffer.from(data.split(',')[1], 'base64'));
  }
  console.log(`Generated ${Object.keys(images).length} shared-scene stills for each platform, 78px.`);
} finally { await browser?.close(); await new Promise(done => server.close(done)); }
