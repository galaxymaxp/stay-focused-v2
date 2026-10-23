import { createServer, type Server } from "node:http";
import { mkdirSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { build } from "esbuild";
import ts from "typescript";
import { chromium, type Browser } from "playwright";
import { afterAll, beforeAll, expect, it } from "vitest";

// Exercise the actual header and text/button functions in RNW. Only data and
// unrelated row content are synthetic; this is layout proof, not a native gate.
function functions(file: string, names: string[]) {
  const source = ts.createSourceFile(file, readFileSync(resolve(file), "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  return names.map(name => {
    const node = source.statements.find(statement => ts.isFunctionDeclaration(statement) && statement.name?.text === name);
    if (!node) throw new Error(`Missing layout fixture function: ${name}`);
    return node.getText(source).replace(/^export /, "");
  }).join("\n");
}
let browser: Browser, server: Server, origin: string, output: string;
beforeAll(async () => {
  const prefix = resolve("../../tmp/overnight/ux2-queue-layout-");
  mkdirSync(dirname(prefix), { recursive: true }); output = mkdtempSync(prefix);
  const imports = (file: string) => JSON.stringify(resolve(file).replaceAll("\\", "/"));
  const entry = `import React,{useRef,useEffect} from 'react';import {createRoot} from 'react-dom/client';
import {View,Text,Pressable,Animated} from 'react-native-web';
import {spacing,density,hitTarget,radius,typography} from ${imports("src/design/tokens.ts")};
import {palettes} from ${imports("src/design/themeTokens.ts")};
const useTheme=()=>({colors:palettes.light,mode:'light',reducedMotion:true}),motion={spring:{}},haptic={tap(){}};
${functions("src/design/primitives.tsx", ["Copy", "usePressMotion", "Action"])}
const queueIsIdle=()=>false,CourseBatchQueue=()=>null,QueueCard=()=>null;
const useQueueItems=()=>({data:{},loading:false});window.hiddenIDs=[];
const useQueueGroups=()=>({sections:[{key:'completed',title:'Completed',jobs:[{id:'synthetic-output'}]}],visiblePending:[],hide:(...args)=>window.hiddenIDs.push(args),jobs:[]});
${functions("src/features/queue/QueueContents.tsx", ["QueueContents"])}
const width=Number(new URLSearchParams(location.search).get('width'));
createRoot(document.getElementById('root')).render(<View testID="panel" style={{width:Math.min(width-32,400),padding:12,borderWidth:1,margin:16}}><QueueContents/></View>);`;
  await build({ stdin: { contents: entry, loader: "tsx", resolveDir: process.cwd() }, bundle: true,
    outfile: join(output, "entry.js"), platform: "browser", jsx: "automatic", define: { "process.env.NODE_ENV": '"production"' } });
  server = createServer((request, response) => {
    if (request.url?.startsWith("/entry.js")) response.writeHead(200, { "Content-Type": "text/javascript" }).end(readFileSync(join(output, "entry.js")));
    else response.writeHead(200, { "Content-Type": "text/html" }).end('<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0}</style><div id="root"></div><script src="/entry.js"></script>');
  });
  await new Promise<void>(done => server.listen(0, "127.0.0.1", done));
  const address = server.address(); if (!address || typeof address === "string") throw new Error("Missing loopback port");
  origin = `http://127.0.0.1:${address.port}`;
  browser = await chromium.launch({ headless: true, args: ["--disable-background-networking", "--disable-component-update", "--disable-sync"] });
}, 60000);
afterAll(async () => {
  await browser?.close(); if (server) await new Promise<void>(done => server.close(() => done()));
  if (output) rmSync(output, { recursive: true, force: true });
});
it("keeps the full completed heading and clear control inside every supported panel at normal and doubled text", async () => {
  for (const width of [320, 360, 390, 414, 768, 1280]) for (const textScale of [1, 2]) {
    const page = await browser.newPage({ viewport: { width, height: 844 }, reducedMotion: "reduce" });
    await page.route("**/*", route => route.request().url().startsWith(origin) ? route.continue() : route.abort());
    await page.goto(`${origin}/?width=${width}`);
    const clear = page.getByRole("button", { name: "Clear 1 completed Queue entries" }); await clear.waitFor();
    if (textScale === 2) await page.evaluate(() => {
      for (const element of document.querySelectorAll<HTMLElement>("*")) if ([...element.childNodes].some(node => node.nodeType === 3 && node.textContent?.trim())) {
        const { fontSize, lineHeight } = getComputedStyle(element);
        element.style.fontSize = `${parseFloat(fontSize) * 2}px`;
        if (lineHeight !== "normal") element.style.lineHeight = `${parseFloat(lineHeight) * 2}px`;
      }
    });
    const panel = (await page.getByTestId("panel").boundingBox())!, heading = (await page.getByText("Completed", { exact: true }).boundingBox())!, control = (await clear.boundingBox())!;
    for (const rect of [heading, control]) { expect(rect.x).toBeGreaterThanOrEqual(panel.x); expect(rect.x + rect.width).toBeLessThanOrEqual(panel.x + panel.width + 1); }
    const overlapX = Math.max(0, Math.min(heading.x + heading.width, control.x + control.width) - Math.max(heading.x, control.x));
    const overlapY = Math.max(0, Math.min(heading.y + heading.height, control.y + control.height) - Math.max(heading.y, control.y));
    expect(overlapX * overlapY).toBe(0);
    await clear.click(); expect(await page.evaluate(() => Reflect.get(window, "hiddenIDs"))).toEqual([["queue", "synthetic-output", true]]);
    await page.close();
  }
}, 30000);
