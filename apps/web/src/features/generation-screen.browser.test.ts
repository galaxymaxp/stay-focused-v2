import { createServer, type Server } from "node:http";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
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
    createRoot(document.getElementById("root")).render(createElement("div", { className: "app-shell detail-page" }, createElement("div", { className: "workspace" }, createElement("header", { className: "topbar" }, "Navigation"), createElement("main", { className: "main" }, createElement(GenerationScreen, { id: "job-1" })))));`,
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
  transform(code, id) {
    return id.replaceAll("\\", "/").endsWith("/day-clock/GenerationOrb.tsx")
      ? code.replace("const interaction = useOrbInteraction();", "const interaction = useOrbInteraction(); window.__interaction = interaction;") : null;
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
    if (request.url?.split("?")[0] === "/") {
      const scenario = new URL(request.url, "http://localhost").searchParams.get("state") ?? "generating";
      const current = structuredClone(fixture);
      current.data.state = scenario;
      current.job.status = ["queued", "stalled"].includes(scenario) ? "queued" : scenario === "failed" ? "failed" : scenario === "completed" ? "succeeded" : scenario === "cancelled" ? "cancelled" : "running";
      if (scenario === "stalled") { current.data.state = "queued"; current.data.updatedAt = current.job.updatedAt = "2020-01-01T00:00:00Z"; }
      if (scenario === "preparing") { current.job.jobType = "document_extraction"; current.job.stage = "extracting_text"; }
      if (scenario === "finalizing") current.job.stage = "storing_reviewer";
      if (scenario === "failed") { current.job.retryable = true; Object.assign(current.data, { error: { code: "insufficient_source", retryable: false, message: "A safe, complete explanation. ".repeat(80) + "END OF ERROR" } }); }
      if (scenario === "reconnect") Object.assign(current, { error: "Connection interrupted. ".repeat(80) + "END OF CONNECTION ERROR" });
      current.job.source.displayName = "A long synthetic material name ".repeat(20) + "END OF TITLE";
      const rendered = scenario === "connecting" ? { ...current, job: null, data: null, loading: true } : current;
      response.writeHead(200, { "Content-Type": "text/html" });
      response.end(`<!doctype html><html data-theme="light"><style>${css}</style><body><div id="root"></div><script>window.__fixture=${JSON.stringify(rendered)}</script><script type="module" src="/entry.js"></script></body></html>`);
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

async function open(width: number, height: number, reducedMotion: "reduce" | "no-preference" = "no-preference", state = "generating") {
  const page = await browser.newPage({ viewport: { width, height }, reducedMotion });
  await page.route("**/*", (route) => (route.request().url().startsWith(origin) ? route.continue() : route.abort()));
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(String(error)));
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  await page.goto(origin + "?state=" + state);
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
      if (width <= 760) await page.locator(".generation-details-trigger").click();
      // Progress eases toward the server value. Wait for that exact value,
      // rather than sampling a transitional integer on a busy software GPU.
      await page.waitForFunction(() => document.querySelector('ol.generation-steps')?.textContent?.includes('3 of 18 sections'));
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

const captures = resolve("../../tmp/overnight/GV1-web");
const measurements: unknown[] = [];
async function bounds(page: Page) {
  await page.waitForFunction(() => { const box = document.querySelector(".generation-orb")?.getBoundingClientRect(); return box && box.width > 0 && box.height > 0; });
  const result = await page.evaluate(() => {
    const main = document.querySelector("main")!;
    const box = (selector: string) => { const b = document.querySelector(selector)!.getBoundingClientRect(); return { x: b.x, y: b.y, width: b.width, height: b.height, bottom: b.bottom, right: b.right }; };
    return { viewport: { width: innerWidth, height: innerHeight }, pageHeight: document.documentElement.scrollHeight, pageWidth: document.documentElement.scrollWidth, mainHeight: main.clientHeight, contentHeight: main.scrollHeight, orb: box(".generation-orb"), status: box(".generation-status"), details: box(".generation-details-trigger"), canvas: box(".generation-orb canvas") };
  });
  expect(result.pageHeight).toBeLessThanOrEqual(result.viewport.height + 1);
  expect(result.pageWidth).toBeLessThanOrEqual(result.viewport.width + 1);
  expect(result.contentHeight).toBeLessThanOrEqual(result.mainHeight + 1);
  for (const b of [result.orb, result.status, result.details, result.canvas]) {
    expect(b.x).toBeGreaterThanOrEqual(0); expect(b.y).toBeGreaterThanOrEqual(0);
    expect(b.right).toBeLessThanOrEqual(result.viewport.width + 1); expect(b.bottom).toBeLessThanOrEqual(result.viewport.height + 1);
  }
  expect(result.orb.width).toBeCloseTo(result.orb.height, 0);
  expect(result.orb.width).toBeGreaterThan(48);
  await page.mouse.wheel(0, 500);
  expect(await page.evaluate(() => scrollY)).toBe(0);
  return result;
}

describe("GV1 measured generation viewport", () => {
  it.each([[360, 640], [390, 844], [412, 915], [640, 360]])("fits every state at %ix%i with intact canvas and reachable details", async (width, height) => {
    mkdirSync(captures, { recursive: true });
    for (const state of ["connecting", "queued", "preparing", "generating", "finalizing", "stalled", "failed", "completed", "cancelled", "reconnect"]) {
      const page = await open(width, height, "reduce", state);
      try {
        const measured = await bounds(page);
        measurements.push({ state, ...measured });
        writeFileSync(join(captures, "bounds.json"), JSON.stringify(measurements, null, 2));
        await page.screenshot({ path: join(captures, width + "x" + height + "-" + state + ".png") });
        await page.locator(".generation-details-trigger").click();
        await page.waitForSelector("dialog[open]");
        const dialog = page.locator(".generation-dialog-content");
        if (state !== "connecting") expect(await dialog.textContent()).toContain("END OF TITLE");
        if (state === "failed") expect(await dialog.textContent()).toContain("END OF ERROR");
        if (state === "reconnect") expect(await dialog.textContent()).toContain("END OF CONNECTION ERROR");
        // The last action remains reachable even when the complete explanation is long.
        const last = dialog.locator("a,button").last();
        await last.scrollIntoViewIfNeeded();
        const actionBounds = await last.boundingBox();
        expect(actionBounds!.y + actionBounds!.height).toBeLessThanOrEqual(height);
        expect(measured.details.height).toBeGreaterThanOrEqual(44);
        await page.getByRole("button", { name: "Done", exact: true }).click();
        expect(await page.locator("dialog[open]").count()).toBe(0);
        expect(await page.locator(".generation-details-trigger").evaluate(node => document.activeElement === node)).toBe(true);
        await bounds(page);
      } finally { await page.close(); }
    }
  }, 120_000);
  it.each([[360, 640], [640, 360]])("keeps doubled text and safe inset controls reachable at %ix%i", async (width, height) => {
    const page = await open(width, height, "reduce", "failed");
    try {
      await page.evaluate(() => {
        const nodes = [...document.querySelectorAll<HTMLElement>("h1,h2,p,span,button,a,strong")];
        const styles = nodes.map(node => ({ node, font: parseFloat(getComputedStyle(node).fontSize), line: parseFloat(getComputedStyle(node).lineHeight) }));
        styles.forEach(({ node, font, line }) => { node.style.fontSize = font * 2 + "px"; if (Number.isFinite(line)) node.style.lineHeight = line * 2 + "px"; });
        const main = document.querySelector<HTMLElement>("main")!;
        main.style.paddingTop = "32px"; main.style.paddingBottom = "24px";
      });
      await bounds(page);
      await page.locator(".generation-details-trigger").click();
      await page.getByRole("button", { name: "Try again", exact: true }).scrollIntoViewIfNeeded();
      await page.screenshot({ path: join(captures, width + "x" + height + "-text200-dialog.png") });
      await page.keyboard.press("Escape");
      expect(await page.locator("dialog[open]").count()).toBe(0);
    } finally { await page.close(); }
  }, 60_000);
  it("keeps tap waves, hold rotation and momentum working in the fitted viewport", async () => {
    const page = await open(390, 844);
    try {
      const box = await page.locator('[data-testid="orb-touch"]').boundingBox();
      const x = box!.x + box!.width / 2, y = box!.y + box!.height / 2;
      // Software GL contention must not turn five 150ms inputs into expired
      // waves. Drive gesture time while retaining real pointer events/timers.
      const now = await page.evaluate(() => Date.now());
      for (let i = 0; i < 5; i++) {
        await page.clock.setFixedTime(now + i * 150);
        await page.mouse.click(x, y);
      }
      const waves = await page.evaluate(() => (window as unknown as { __interaction: { state: { current: { impulses: unknown[] } } } }).__interaction.state.current.impulses.length);
      expect(waves).toBe(5);
      const palette = await page.evaluate(() => localStorage.getItem("sf.orb.colorKey"));
      await page.mouse.move(x, y); await page.mouse.down();
      await page.clock.setFixedTime(now + 600 + 450);
      await page.mouse.move(x + 26, y - 18, { steps: 4 }); await page.mouse.up();
      const spin = await page.evaluate(() => (window as unknown as { __interaction: { state: { current: { spin: { velocityX: number; velocityY: number } } } } }).__interaction.state.current.spin);
      expect(Math.abs(spin.velocityX) + Math.abs(spin.velocityY)).toBeGreaterThan(0);
      expect(await page.evaluate(() => localStorage.getItem("sf.orb.colorKey"))).toBe(palette);
      await bounds(page);
    } finally { await page.close(); }
  }, 60_000);
  it("remeasures orientation and dynamic viewport changes while preserving the desktop panes", async () => {
    const page = await open(390, 844, "reduce");
    try {
      for (const viewport of [{ width: 640, height: 360 }, { width: 390, height: 680 }, { width: 412, height: 915 }]) {
        await page.setViewportSize(viewport); await bounds(page);
      }
      await page.setViewportSize({ width: 1440, height: 900 });
      const desktop = await page.evaluate(() => ({
        columns: getComputedStyle(document.querySelector(".generation-layout")!).gridTemplateColumns.split(" ").length,
        details: getComputedStyle(document.querySelector(".generation-detail-pane")!).display,
        trigger: getComputedStyle(document.querySelector(".generation-details-trigger")!).display,
      }));
      expect(desktop).toEqual({ columns: 2, details: "flex", trigger: "none" });
      await page.getByRole("button", { name: "Cancel generation", exact: true }).waitFor();
    } finally { await page.close(); }
  }, 60_000);
});
