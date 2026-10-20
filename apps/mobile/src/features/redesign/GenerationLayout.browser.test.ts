import { createServer, type Server } from "node:http";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { chromium, type Browser } from "playwright";
import { build, type Plugin } from "vite";
import { afterAll, beforeAll, expect, it } from "vitest";

// Actual native Page, Action, Copy, Sheet and GenerationLayout through RN Web.
// Insets and OS text scaling are synthetic. This is layout/component proof,
// explicitly not ExpoGL, Android rendering or physical interaction acceptance.
const root = resolve("src").replaceAll("\\", "/");
const stubs: Record<string, string> = {
  "react-native": `import React from "react"; import * as Web from "react-native-web";
    export * from "react-native-web";
    export function useWindowDimensions() { return { ...Web.useWindowDimensions(), fontScale: window.__scale }; }
    export const Text = React.forwardRef(({ style, ...props }, ref) => {
      const flat = Web.StyleSheet.flatten(style) ?? {};
      return React.createElement(Web.Text, { ...props, ref, style: [style, { fontSize: (flat.fontSize ?? 14) * window.__scale, lineHeight: flat.lineHeight ? flat.lineHeight * window.__scale : undefined }] });
    });`,
  "react-native-safe-area-context": `import React from "react"; import { View } from "react-native";
    export const useSafeAreaInsets = () => ({ top: 24, bottom: 24, left: 0, right: 0 });
    export function SafeAreaView({ style, edges, ...props }) { return React.createElement(View, { ...props, style: [style, { paddingTop: edges.includes("top") ? 24 : 0, paddingBottom: edges.includes("bottom") ? 24 : 0 }] }); }`,
  "expo-router": `export const router = { canGoBack: () => true, back() {}, replace() {} };`,
  "expo-router/js-tabs": `import { createContext } from "react"; export const BottomTabBarHeightContext = createContext(undefined);`,
  "lucide-react-native": `export const ArrowLeft=()=>null, ChevronRight=()=>null,FileText=()=>null,RefreshCw=()=>null,Search=()=>null,Settings=()=>null,X=()=>null,BookOpen=()=>null,ClipboardList=()=>null,Presentation=()=>null,FileQuestion=()=>null,Globe=()=>null,Info=()=>null;`,
  auth: `export const useAuth = () => ({ session: null });`,
  theme: `import { palettes } from "${root}/design/themeTokens.ts"; export const motion = {}; export const useTheme = () => ({ colors: palettes.light, mode: "light", reducedMotion: true });`,
  haptics: `export const haptic = { tap() {}, select() {} };`,
  QueueButton: `export const QueueButton = () => null;`,
  Avatar: `export const Avatar = () => null;`,
  ProfileAvatarProvider: `export const useProfileAvatar = () => ({ initial: "Q" });`,
  sheetDrag: `import { useRef } from "react"; import { Animated } from "react-native"; export const useSheetDrag = () => ({ drag: useRef(new Animated.Value(0)).current, touchHandlers: {}, onScroll() {} });`,
  useHideOnScroll: `export const useHideOnScroll = () => ({});`,
  GenerationCore: `import React from "react"; import { View } from "react-native";
    export const GenerationCore = ({ size }) => React.createElement(View, { testID: "sized-core", style: { width: size, height: size, borderRadius: size / 2, backgroundColor: "#c4b6d9" } });`,
  entry: `import React, { useState } from "react"; import { createRoot } from "react-dom/client";
    import { View } from "react-native";
    import { generationMessages } from "${root}/features/redesign/presentation.ts";
    import { Page, Copy, Action, Notice, Sheet } from "${root}/design/primitives.tsx";
    import { GenerationLayout } from "${root}/features/redesign/GenerationLayout.tsx";
    const state = new URLSearchParams(location.search).get("state") || "generating";
    function App() { const [queue, setQueue] = useState(false), [count, setCount] = useState(0);
      return React.createElement(React.Fragment, null,
        React.createElement(Page, { title: "", back: true, scroll: false },
          React.createElement(GenerationLayout, { title: "Long material title ".repeat(80) + "END TITLE", state: "generating",
            status: React.createElement(View, { style: { minHeight: 60, width: "100%", alignItems: "center", justifyContent: "center" } }, React.createElement(Copy, { size: "h2", style: { textAlign: "center", fontSize: 24, lineHeight: 30 } }, generationMessages[state] ?? (state === "connecting" ? "Connecting to your generation..." : state === "stalled" ? "Still waiting to start" : state === "confirmation" ? "Ready to start" : state === "submitting" ? "Submitting generation..." : "Connecting to your generation..."))),
            compactStatus: React.createElement(View, { style: { minHeight: 60, width: "100%", alignItems: "center", justifyContent: "center" } }, React.createElement(Copy, { size: "h2", style: { textAlign: "center", fontSize: 24, lineHeight: 30 } }, state === "failed" ? "Could not finish" : state === "stalled" ? "Still waiting" : state === "confirmation" ? "Ready to start" : state === "submitting" ? "Submitting..." : state)),
            progress: ["queued", "preparing", "generating", "finalizing"].includes(state) ? React.createElement(View, { style: { width: "100%", maxWidth: 320, alignItems: "center", gap: 8, marginBottom: 8 } }, React.createElement(View, { style: { width: "100%", height: 3, backgroundColor: "#888" } }), React.createElement(Copy, { size: "caption" }, "3 of 18 sections")) : null,
            note: state === "submitting" ? "Saving your request. The server will take over once it accepts the job." : "You can leave this screen. We will keep working.",
            attention: state === "failed", notices: React.createElement(Notice, null, "Safe complete message ".repeat(100) + "END ERROR"),
            actions: close => React.createElement(React.Fragment, null,
              React.createElement(Action, { pill: true, onPress: () => setCount(n => n + 1) }, "Primary action " + count),
              React.createElement(Action, { secondary: true, pill: true, onPress: () => { close(); setQueue(true); } }, "View Queue")) })),
        queue ? React.createElement(Sheet, { title: "Queue", onClose: () => setQueue(false) }, React.createElement(Copy, null, "Queue entry ".repeat(100))) : null);
    }
    createRoot(document.getElementById("root")).render(React.createElement(App));`,
};
const plugin: Plugin = {
  name: "native-generation-layout-local",
  enforce: "pre",
  resolveId(source) {
    const name =
      source === "native-generation-entry"
        ? "entry"
        : source in stubs
          ? source
          : source.split("/").at(-1)!;
    return name in stubs ? `\0gv1:${name}` : null;
  },
  load(id) {
    return id.startsWith("\0gv1:") ? stubs[id.slice(5)] : null;
  },
};
let browser: Browser, server: Server, origin: string, out: string;
const captures = resolve("../../tmp/overnight/GV1-native");
const measurements: unknown[] = [];
beforeAll(async () => {
  out = mkdtempSync(join(tmpdir(), "gv1-native-"));
  mkdirSync(captures, { recursive: true });
  await build({
    configFile: false,
    root: resolve("."),
    logLevel: "silent",
    plugins: [plugin],
    oxc: { jsx: { runtime: "automatic", development: false } },
    define: { "process.env.NODE_ENV": '"production"', global: "globalThis" },
    build: {
      outDir: out,
      emptyOutDir: true,
      minify: false,
      modulePreload: false,
      rollupOptions: {
        input: "native-generation-entry",
        output: { format: "es", entryFileNames: "entry.js" },
      },
    },
  });
  server = createServer((request, response) => {
    if (request.url?.split("?")[0] === "/") {
      const scale =
        new URL(request.url, "http://localhost").searchParams.get("scale") ===
        "2"
          ? 2
          : 1;
      response.writeHead(200, { "Content-Type": "text/html" });
      response.end(
        `<!doctype html><html><meta name="viewport" content="width=device-width,initial-scale=1"><style>html,body,#root{margin:0;height:100%;}#root{display:flex;flex-direction:column;}</style><body><div id="root"></div><script>window.__scale=${scale}</script><script type="module" src="/entry.js"></script></body></html>`,
      );
      return;
    }
    try {
      response.writeHead(200, { "Content-Type": "text/javascript" });
      response.end(
        readFileSync(
          join(
            out,
            (request.url ?? "").replace(/^\/+/, "").replace(/\.\./g, ""),
          ),
        ),
      );
    } catch {
      response.end();
    }
  });
  await new Promise<void>((yes) => server.listen(0, "127.0.0.1", yes));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("local_server");
  origin = `http://127.0.0.1:${address.port}`;
  browser = await chromium.launch({ headless: true });
}, 120_000);
afterAll(async () => {
  await browser?.close();
  await new Promise<void>((yes) =>
    server ? server.close(() => yes()) : yes(),
  );
  if (out) rmSync(out, { recursive: true, force: true });
});

it.each([
  [360, 640, 1],
  [390, 844, 1],
  [412, 915, 1],
  [640, 360, 1],
  [360, 640, 2],
  [640, 360, 2],
])(
  "bounds native components via RN Web at %ix%i, fontScale %i and 24/24 safe insets",
  async (width, height, scale) => {
    for (const state of [
      "connecting",
      "queued",
      "preparing",
      "generating",
      "finalizing",
      "stalled",
      "failed",
      "completed",
      "confirmation",
      "reconnect",
      "submitting",
    ]) {
      const page = await browser.newPage({ viewport: { width, height } });
      await page.route("**/*", (route) =>
        route.request().url().startsWith(origin)
          ? route.continue()
          : route.abort(),
      );
      try {
        const errors: string[] = [];
        page.on("pageerror", (error) => errors.push(error.message));
        page.on("console", (message) => {
          if (message.type() === "error") errors.push(message.text());
        });
        await page.goto(`${origin}?state=${state}&scale=${scale}`);
        await page
          .waitForSelector('[data-testid="sized-core"]', { timeout: 10_000 })
          .catch((error) => {
            throw new Error(String(error) + " | " + errors.join(" | "));
          });
        const measured = await page.evaluate(() => {
          const viewport = document.querySelector(
            '[data-testid="generation-viewport"]',
          )!;
          const items = [
            ...viewport.querySelectorAll(
              '[role="button"], [data-testid="sized-core"], [dir="auto"]',
            ),
          ];
          return {
            scrollHeight: document.documentElement.scrollHeight,
            scrollWidth: document.documentElement.scrollWidth,
            items: items.map((item) => {
              const box = item.getBoundingClientRect();
              return {
                x: box.x,
                y: box.y,
                right: box.right,
                bottom: box.bottom,
                width: box.width,
                height: box.height,
              };
            }),
          };
        });
        const coreSize = await page
          .locator('[data-testid="sized-core"]')
          .boundingBox();
        expect(coreSize!.width).toBeGreaterThan(48);
        expect(measured.scrollHeight).toBeLessThanOrEqual(height + 1);
        expect(measured.scrollWidth).toBeLessThanOrEqual(width + 1);
        measurements.push({ width, height, scale, state, ...measured });
        writeFileSync(
          join(captures, "bounds.json"),
          JSON.stringify(measurements, null, 2),
        );
        for (const b of measured.items) {
          expect(b.x).toBeGreaterThanOrEqual(0);
          expect(b.y).toBeGreaterThanOrEqual(24);
          expect(b.right).toBeLessThanOrEqual(width);
          expect(b.bottom).toBeLessThanOrEqual(height - 24 + 1);
        }
        await page.mouse.wheel(0, 500);
        expect(await page.evaluate(() => scrollY)).toBe(0);
        if (state === "generating")
          await page.screenshot({
            path: join(captures, `${width}x${height}-scale${scale}.png`),
          });
        await page
          .getByRole("button", { name: /Generation details|Details and/ })
          .click();
        expect(await page.getByText(/END TITLE/).textContent()).toContain(
          "END TITLE",
        );
        expect(await page.getByText(/END ERROR/).textContent()).toContain(
          "END ERROR",
        );
        if (scale === 2 || height === 360) {
          const primary = page.getByRole("button", {
            name: "Primary action 0",
            exact: true,
          });
          await primary.click();
          expect(
            await page
              .getByRole("button", { name: "Primary action 1", exact: true })
              .count(),
          ).toBe(1);
          await page
            .getByRole("button", { name: "View Queue", exact: true })
            .click();
          await page.screenshot({
            path: join(captures, `${width}x${height}-scale${scale}-queue.png`),
          });
          await page
            .getByText("Queue", { exact: true })
            .waitFor({ timeout: 5000 })
            .catch((error) => {
              throw new Error(String(error) + " | " + errors.join(" | "));
            });
          expect(await page.getByText("Queue", { exact: true }).count()).toBe(
            1,
          );
        }
        await page.getByRole("button", { name: "Done", exact: true }).click();
        expect(errors).toEqual([]);
      } finally {
        await page.close();
      }
    }
  },
  120_000,
);
