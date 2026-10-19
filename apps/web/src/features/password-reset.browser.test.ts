import { createServer, type Server } from "node:http";
import { mkdirSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";
import { chromium, type Browser, type Page } from "playwright";
import { build, type Plugin } from "vite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

// Real screens and provider, entirely stubbed SDK. No external request is allowed.
const root = resolve("../.."), evidence = join(root, "tmp/overnight/WA1-browser");
const stubs: Record<string, string> = {
  "next/link": `import { createElement } from "react";
    export default function Link({ href, children, prefetch, ...rest }) { return createElement("a", { href, ...rest }, children); }`,
  "next/navigation": `const router = { replace(path) { window.__redirects.push(path); }, push(path) { window.__redirects.push(path); } };
    export const useRouter = () => router; export const usePathname = () => location.pathname;`,
  "@supabase/supabase-js": `export function createClient(url, key, options) {
    window.__authOptions = options.auth;
    let listener = () => {}, session = window.__fixture.session ?? null, consumed = false;
    return { auth: {
      onAuthStateChange(fn) { listener = fn; return { data: { subscription: { unsubscribe() {} } } }; },
      async getSession() {
        const code = new URLSearchParams(location.search).get("code");
        if (code === "valid" && !consumed) {
          consumed = true; session = { user: { id: "recovery-owner" } };
          history.replaceState(null, "", location.pathname);
          listener("PASSWORD_RECOVERY", session);
        }
        return { data: { session }, error: null };
      },
      async setSession(tokens) {
        window.__calls.push({ method: "setSession" });
        session = tokens.access_token === "valid" ? { user: { id: "recovery-owner" } } : null;
        if (session) listener("SIGNED_IN", session);
        return { data: { session }, error: session ? null : { message: "private provider error" } };
      },
      async resetPasswordForEmail(email, options) {
        window.__calls.push({ method: "resetPasswordForEmail", email, options });
        await new Promise(yes => setTimeout(yes, 100));
        if (window.__fixture.connectionError) throw new Error("private provider error");
        return { error: window.__fixture.providerError ? { message: "private provider error" } : null };
      },
      async updateUser(value) {
        window.__calls.push({ method: "updateUser", value });
        if (window.__fixture.connectionError) throw new Error("private provider error");
        if (!window.__fixture.providerError) listener("USER_UPDATED", session);
        return { error: window.__fixture.providerError ? { message: "private provider error" } : null };
      },
    } };
  }`,
  entry: `import { createRoot } from "react-dom/client"; import { createElement, StrictMode } from "react";
    import { Providers } from "${resolve("src/components/providers.tsx").replace(/\\/g, "/")}";
    import { AuthScreen } from "${resolve("src/features/auth.tsx").replace(/\\/g, "/")}";
    import ResetPage from "${resolve("app/auth/reset/page.tsx").replace(/\\/g, "/")}";
    import CallbackPage from "${resolve("app/auth/callback/page.tsx").replace(/\\/g, "/")}";
    const screen = location.pathname === "/auth/reset" ? createElement(ResetPage) : location.pathname === "/auth/callback" ? createElement(CallbackPage) : createElement(AuthScreen, { signUp: location.pathname === "/sign-up" });
    createRoot(document.getElementById("root")).render(createElement(StrictMode, null, createElement(Providers, null, screen)));`,
};
const localStubs: Plugin = {
  name: "wa1-local-auth-stubs", enforce: "pre",
  resolveId(source) { return source === "wa1-entry" ? "\0stub:entry" : source in stubs ? `\0stub:${source}` : null; },
  load(id) { return id.startsWith("\0stub:") ? stubs[id.slice(6)] : null; },
};
let browser: Browser, server: Server, origin: string, out: string;
beforeAll(async () => {
  mkdirSync(evidence, { recursive: true });
  out = mkdtempSync(join(evidence, "bundle-"));
  await build({
    configFile: false, envDir: out, logLevel: "silent", root: resolve("."), plugins: [localStubs],
    oxc: { jsx: { runtime: "automatic", development: false } },
    define: { "process.env.NODE_ENV": '"production"', "process.env.NEXT_PUBLIC_SUPABASE_URL": '"https://unused.invalid"', "process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY": '"test-stub"' },
    build: { outDir: out, emptyOutDir: true, minify: false, modulePreload: false, rollupOptions: { input: "wa1-entry", output: { format: "es", entryFileNames: "entry.js" } } },
  });
  const css = readFileSync(resolve("app/globals.css"), "utf8");
  server = createServer((request, response) => {
    if (request.url?.startsWith("/entry.js")) {
      response.writeHead(200, { "Content-Type": "text/javascript" }); response.end(readFileSync(join(out, "entry.js"))); return;
    }
    response.writeHead(200, { "Content-Type": "text/html" });
    response.end(`<!doctype html><html data-theme="light"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}</style><body><div id="root"></div><script type="module" src="/entry.js"></script></body></html>`);
  });
  await new Promise<void>(yes => server.listen(0, "127.0.0.1", yes));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("local_test_server");
  origin = `http://127.0.0.1:${address.port}`;
  browser = await chromium.launch({ headless: true });
}, 120_000);
afterAll(async () => {
  await browser?.close();
  await new Promise<void>(yes => server ? server.close(() => yes()) : yes());
  // This harness only removes its unique generated directory inside the repo.
  if (out && resolve(out).startsWith(resolve(evidence) + "\\")) rmSync(out, { recursive: true, force: true });
});

async function open(path: string, width = 390, fixture: Record<string, unknown> = {}) {
  const page = await browser.newPage({ viewport: { width, height: 900 }, reducedMotion: "reduce" });
  await page.route("**/*", route => route.request().url().startsWith(origin + "/") ? route.continue() : route.abort());
  await page.addInitScript(value => {
    Object.assign(window, { __fixture: value, __calls: [], __redirects: [] });
  }, fixture);
  await page.goto(origin + path);
  await page.waitForSelector(".auth-page");
  return page;
}
const calls = (page: Page) => page.evaluate(() => (window as unknown as { __calls: unknown[] }).__calls);
const redirects = (page: Page) => page.evaluate(() => (window as unknown as { __redirects: string[] }).__redirects);

describe("WA1 local browser recovery", () => {
  it.each([1440, 390])("shows sign-in request and signed-out expired reset with legal footer at %ipx", async width => {
    const page = await open("/sign-in", width);
    try {
      expect(await page.getByRole("button", { name: "Forgot password?" }).count()).toBe(1);
      await page.screenshot({ path: join(evidence, `sign-in-${width}.png`), fullPage: true });
      await page.goto(origin + "/auth/reset");
      await page.getByText("This reset link has expired. Request a new one from Sign in.", { exact: true }).waitFor();
      expect(await page.getByRole("link", { name: "Sign in", exact: true }).getAttribute("href")).toBe("/sign-in");
      expect(await page.getByRole("navigation", { name: "Legal" }).count()).toBe(1);
      expect(await page.getByLabel("New password", { exact: true }).count()).toBe(0);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      expect(await calls(page)).toEqual([]);
      await page.screenshot({ path: join(evidence, `expired-${width}.png`), fullPage: true });
    } finally { await page.close(); }
  });
  it("validates before requesting, normalizes email, uses neutral notice and locks while busy", async () => {
    const page = await open("/sign-in");
    try {
      const reset = page.getByRole("button", { name: "Forgot password?" });
      await reset.click();
      await page.getByText("Enter your email address first.", { exact: true }).waitFor();
      expect(await calls(page)).toEqual([]);
      await page.getByLabel("Email", { exact: true }).fill("Student@School.Test");
      await reset.click(); expect(await reset.isDisabled()).toBe(true);
      await page.getByText("If this account exists, a reset link will arrive by email.", { exact: true }).waitFor();
      expect(await calls(page)).toEqual([{ method: "resetPasswordForEmail", email: "student@school.test", options: { redirectTo: `${origin}/auth/reset` } }]);
      await page.goto(origin + "/sign-up");
      expect(await page.getByRole("button", { name: "Forgot password?" }).count()).toBe(0);
    } finally { await page.close(); }
  });
  it.each([false, true])("shows safe request errors (connection=%s)", async connectionError => {
    const page = await open("/sign-in", 390, { providerError: !connectionError, connectionError });
    try {
      await page.getByLabel("Email", { exact: true }).fill("a@school.test");
      await page.getByRole("button", { name: "Forgot password?" }).click();
      await page.getByText(connectionError ? "A reset email could not be requested. Check your connection." : "A reset email could not be requested. Try again later.", { exact: true }).waitFor();
      expect(await page.locator("body").innerText()).not.toContain("private provider");
    } finally { await page.close(); }
  });
  it.each(["?code=valid", "#type=recovery&access_token=valid&refresh_token=refresh"])("accepts %s and requires matching new passwords before update", async suffix => {
    const page = await open("/auth/reset" + suffix);
    try {
      await page.getByLabel("New password", { exact: true }).waitFor();
      expect(await redirects(page)).not.toContain("/today");
      await page.getByLabel("New password", { exact: true }).fill("short");
      await page.getByLabel("Confirm password", { exact: true }).fill("short");
      await page.getByRole("button", { name: "Save password" }).click();
      await page.getByText("Use at least 8 characters for your password.", { exact: true }).waitFor();
      await page.getByLabel("New password", { exact: true }).fill("password8");
      await page.getByLabel("Confirm password", { exact: true }).fill("different");
      await page.getByRole("button", { name: "Save password" }).click();
      await page.getByText("Passwords do not match.", { exact: true }).waitFor();
      expect((await calls(page)).filter(call => (call as { method: string }).method === "updateUser")).toHaveLength(0);
      await page.getByLabel("Confirm password", { exact: true }).fill("password8");
      await page.getByRole("button", { name: "Save password" }).click();
      await page.getByText("Password updated.", { exact: true }).waitFor();
      expect(await redirects(page)).toContain("/today");
      expect(await page.evaluate(() => sessionStorage.getItem("stay-focused-web-recovery-owner"))).toBeNull();
      expect(await calls(page)).toContainEqual({ method: "updateUser", value: { password: "password8" } });
      if (suffix.startsWith("#")) {
        expect(await page.evaluate(() => location.hash)).toBe("");
        expect((await calls(page)).filter(call => (call as { method: string }).method === "setSession")).toHaveLength(1);
      }
    } finally { await page.close(); }
  });
  it.each([false, true])("shows safe update errors and keeps recovery required (connection=%s)", async connectionError => {
    const page = await open("/auth/reset?code=valid", 390, { providerError: !connectionError, connectionError });
    try {
      await page.getByLabel("New password", { exact: true }).fill("password8");
      await page.getByLabel("Confirm password", { exact: true }).fill("password8");
      await page.getByRole("button", { name: "Save password" }).click();
      await page.getByText(connectionError ? "The password could not be updated. Check your connection." : "The password could not be updated. Please request another reset link.", { exact: true }).waitFor();
      expect(await redirects(page)).not.toContain("/today");
      expect(await page.locator("body").innerText()).not.toContain("private provider");
    } finally { await page.close(); }
  });
  it.each(["?code=used", "#type=recovery&access_token=invalid&refresh_token=refresh", "#error_code=otp_expired"])("expires %s even with a pre-existing normal session", async suffix => {
    const page = await open("/auth/reset" + suffix, 390, { session: { user: { id: "normal-owner" } } });
    try {
      await page.getByText("This reset link has expired. Request a new one from Sign in.", { exact: true }).waitFor();
      expect(await page.getByLabel("New password", { exact: true }).count()).toBe(0);
      expect(await redirects(page)).not.toContain("/today");
    } finally { await page.close(); }
  });
  it.each([
    ["/sign-in?next=/library", "/today"],
    ["/auth/callback?next=/library", "/today"],
    [`/auth/callback?next=/s/${"a".repeat(64)}`, `/s/${"a".repeat(64)}`],
  ])("preserves ordinary signed-in redirect at %s", async (path, expected) => {
    const page = await open(path, 390, { session: { user: { id: "normal-owner" } } });
    try {
      await page.waitForFunction(value => (window as unknown as { __redirects: string[] }).__redirects.includes(value), expected);
      expect(await redirects(page)).not.toContain("/auth/reset");
    } finally { await page.close(); }
  });
  it("routes callback recovery to reset instead of into the app", async () => {
    const page = await open("/auth/callback?code=valid&next=/library");
    try {
      await page.waitForFunction(() => (window as unknown as { __redirects: string[] }).__redirects.some(path => path.startsWith("/auth/reset")));
      expect(await redirects(page)).not.toContain("/library");
    } finally { await page.close(); }
  });
  it.each(["?type=recovery", "#type=recovery&access_token=valid&refresh_token=refresh", "?type=recovery&error_code=otp_expired", "#type=recovery"])("routes callback recovery evidence %s to reset", async suffix => {
    const page = await open("/auth/callback" + suffix, 390, { session: { user: { id: "normal-owner" } } });
    try {
      await page.waitForFunction(() => (window as unknown as { __redirects: string[] }).__redirects.some(path => path.startsWith("/auth/reset")));
      expect(await redirects(page)).not.toContain("/today");
    } finally { await page.close(); }
  });
});
