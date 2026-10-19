import { createServer, type Server } from "node:http";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { chromium, type Browser, type Page } from "playwright";
import { build, type Plugin } from "vite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

// The real GenerationScreen, globals.css and three.js renderer in local
// Chromium (software WebGL). Auth, routing and the job read are fictional
// local stand-ins; every non-local request is aborted.
const stubs: Record<string, string> = {
  "next/dynamic": `import { createElement, useEffect, useState } from "react";
    export default function dynamic(load, options = {}) {
      return function Dynamic(props) {
        const [C, setC] = useState(null);
        useEffect(() => { let live = true; load().then(m => { if (live) setC(() => m); }); return () => { live = false; }; }, []);
        return C ? createElement(C, props) : options.loading ? options.loading() : null;
      };
    }`,
  "next/link": `import { createElement } from "react";
    export default function Link({ href, children, ...rest }) { return createElement("a", { href, ...rest }, children); }`,
  "next/navigation": `export const useRouter = () => ({ replace() {}, push() {} });
    export const usePathname = () => "/generation/job-1";`,
  providers: `export const useAuth = () => ({ api: async () => ({}), session: { user: { id: "owner" } } });`,
  generation: `export const generationEnabled = true; export const generationKey = () => ({ key: "k", accepted() {} });`,
  "queue-items": `export function useJobRead() { return { ...window.__fixture, refresh() {} }; }`,
  entry: `import { createRoot } from "react-dom/client";
    import { createElement } from "react";
    import { GenerationScreen } from "${resolve("src/features/queue.tsx").replace(/\\/g, "/")}";
    createRoot(document.getElementById("root")).render(createElement("main", { className: "main" }, createElement(GenerationScreen, { id: "job-1" })));`,
};
const stubFor = (source: string) =>
  source === "generation-browser-entry" ? "entry"
    : source in stubs ? source
    : source.endsWith("/components/providers") ? "providers"
      : source.endsWith("/lib/generation") ? "generation"
        : source === "./queue-items" ? "queue-items" : null;
const localStubs: Plugin = {
  name: "local-generation-stubs",
  enforce: "pre",
  resolveId(source) {
    const name = stubFor(source);
    return name ? `\0stub:${name}` : null;
  },
  load(id) {
    return id.startsWith("\0stub:") ? stubs[id.slice(6)] : null;
  },
};
const fixture = {
  job: {
    id: "job-1", jobType: "reviewer_generation", status: "running", stage: "generating_sections", retryable: false,
    source: { displayName: "Synthetic.pdf", sourceKind: "pdf", mimeType: "application/pdf", pageCount: 7 },
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  },
  data: { id: "job-1", state: "generating", updatedAt: new Date().toISOString(), artifactId: null, progress: { completed: 3, total: 18, unit: "sections" }, error: null },
  loading: false,
  error: null,
};

let browser: Browser, server: Server, origin: string, out: string;
beforeAll(async () => {
  out = mkdtempSync(join(tmpdir(), "generation-browser-"));
  await build({
    configFile: false, logLevel: "silent", root: resolve("."), plugins: [localStubs],
    oxc: { jsx: { runtime: "automatic", development: false } },
    define: { "process.env.NODE_ENV": '"production"' },
    build: {
      outDir: out, emptyOutDir: true, minify: false, modulePreload: false,
      rollupOptions: { input: "generation-browser-entry", output: { format: "es", entryFileNames: "entry.js", chunkFileNames: "[name]-[hash].js" } },
    },
  });
  const css = readFileSync(resolve("app/globals.css"), "utf8");
  server = createServer((request, response) => {
    if (request.url === "/") {
      response.writeHead(200, { "Content-Type": "text/html" });
      response.end(`<!doctype html><html data-theme="light"><style>${css}</style><body><div id="root"></div><script>window.__fixture=${JSON.stringify(fixture)}</script><script type="module" src="/entry.js"></script></body></html>`);
      return;
    }
    try {
      const body = readFileSync(join(out, (request.url ?? "").replace(/^\/+/, "").replace(/\.\./g, "")));
      response.writeHead(200, { "Content-Type": "text/javascript" });
      response.end(body);
    } catch {
      response.writeHead(404);
      response.end();
    }
  });
  await new Promise<void>((yes) => server.listen(0, "127.0.0.1", yes));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("local_test_server");
  origin = `http://127.0.0.1:${address.port}`;
  browser = await chromium.launch({ headless: true, args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
}, 120_000);
afterAll(async () => {
  await browser?.close();
  await new Promise<void>((yes) => (server ? server.close(() => yes()) : yes()));
  if (out) rmSync(out, { recursive: true, force: true });
});

async function open(width: number, height: number, reducedMotion: "reduce" | "no-preference" = "no-preference") {
  const page = await browser.newPage({ viewport: { width, height }, reducedMotion });
  await page.route("**/*", (route) => (route.request().url().startsWith(origin) ? route.continue() : route.abort()));
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(String(error)));
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  await page.goto(origin);
  await page.waitForSelector(".generation-orb canvas", { timeout: 15_000 }).catch((cause: unknown) => {
    throw new Error([String(cause), ...errors].join(" | "));
  });
  return page;
}
const segmentAnimation = (page: Page) =>
  page.evaluate(() => {
    const current = document.querySelector('.generation-steps [aria-current="step"] .generation-step-segment')!;
    return { className: current.className, animation: getComputedStyle(current, "::after").animationName };
  });

describe("generation page in a real browser (local only)", () => {
  it.each([[1440, 900], [390, 844]])("renders the interactive Today orb and the vertical step bar at %ipx", async (width, height) => {
    const page = await open(width, height);
    try {
      const orb = await page.evaluate(() => {
        const frame = document.querySelector(".generation-orb")!.getBoundingClientRect();
        const x = frame.left + frame.width / 2, y = frame.top + frame.height / 2;
        return { x, y, canvas: !!document.querySelector(".generation-orb .day-orb canvas"), hit: document.elementFromPoint(x, y)?.getAttribute("data-testid"), color: localStorage.getItem("sf.orb.colorKey") };
      });
      expect(orb).toMatchObject({ canvas: true, hit: "orb-touch", color: "pearl" });
      await page.mouse.click(orb.x, orb.y);
      expect(await page.evaluate(() => localStorage.getItem("sf.orb.colorKey"))).toBe("gold");
      const list = await page.evaluate(() => {
        const ol = document.querySelector("ol.generation-steps")!;
        return { style: getComputedStyle(ol).listStyleType, text: (ol as HTMLElement).innerText };
      });
      expect(list.style).toBe("none");
      expect(list.text).not.toMatch(/\d\.|Done|Pending|In progress/);
      expect(list.text).toContain("3 of 18 sections");
      expect(await segmentAnimation(page)).toEqual({ className: "generation-step-segment animated", animation: "step-sweep" });
    } finally {
      await page.close();
    }
  }, 60_000);
  it("keeps the current segment still under Reduce Motion", async () => {
    const page = await open(1440, 900, "reduce");
    try {
      expect(await segmentAnimation(page)).toEqual({ className: "generation-step-segment animated", animation: "none" });
    } finally {
      await page.close();
    }
  }, 60_000);
});
