import { createElement } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, expect, it, vi } from "vitest";
import { Providers, useAuth } from "./providers";

const mocks = vi.hoisted(() => ({ pathname: '/today', create: vi.fn(), signOut: vi.fn(), purge: vi.fn(), changed: null as ((event: string, session: { user: { id: string } } | null) => void) | null }));
vi.mock('next/navigation', () => ({ usePathname: () => mocks.pathname }));
vi.mock("@supabase/supabase-js", () => ({ createClient: () => { mocks.create(); return ({ auth: {
  getSession: async () => ({ data: { session: { user: { id: "a" } } } }),
  onAuthStateChange: (callback: typeof mocks.changed) => { mocks.changed = callback; return { data: { subscription: { unsubscribe() {} } } }; },
  signOut: mocks.signOut,
} }); } }));
vi.mock("../lib/screen-snapshots", () => ({ purgeScreenSnapshots: mocks.purge }));
let auth!: ReturnType<typeof useAuth>, rendered: ReactTestRenderer | undefined;
function Probe() { auth = useAuth(); return null; }
afterEach(async () => { if (rendered) await act(async () => rendered!.unmount()); vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
it("sign-out awaits owner cleanup and account switch clears the departing owner's snapshots", async () => {
  mocks.pathname = '/today';
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://unused.invalid"); vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "test");
  vi.stubGlobal("window", { matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }) });
  vi.stubGlobal("document", { documentElement: { dataset: {} } });
  vi.stubGlobal("localStorage", { getItem: () => null });
  mocks.purge.mockResolvedValue(undefined); mocks.signOut.mockResolvedValue({ error: null });
  await act(async () => { rendered = create(createElement(Providers, null, createElement(Probe))); });
  expect(auth.session?.user.id).toBe("a");
  await act(async () => auth.signOut());
  expect(mocks.signOut).toHaveBeenCalledWith({ scope: "local" });
  expect(mocks.purge).toHaveBeenCalledWith("a");
  await act(async () => mocks.changed?.("SIGNED_IN", { user: { id: "b" } }));
  expect(auth.session?.user.id).toBe("b");
  expect(mocks.purge).toHaveBeenCalledWith("a");
});
it.each([`/s/${'a'.repeat(64)}`, '/download', '/release'])('public route %s never initializes auth or private caches even when auth is configured', async pathname => {
  mocks.pathname = pathname; mocks.create.mockClear(); mocks.purge.mockClear();
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://unused.invalid'); vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'test');
  vi.stubGlobal('window', { matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }) });
  vi.stubGlobal('document', { documentElement: { dataset: {} } }); vi.stubGlobal('localStorage', { getItem: () => null });
  await act(async () => { rendered = create(createElement(Providers, null, createElement('p', null, 'Public'))); });
  expect(mocks.create).not.toHaveBeenCalled(); expect(mocks.purge).not.toHaveBeenCalled();
  expect(JSON.stringify(rendered!.toJSON())).toContain('Public');
});
