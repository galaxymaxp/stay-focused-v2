import { createElement, useContext } from "react";
import { act, create } from "react-test-renderer";
import { expect, it, vi } from "vitest";
import { AuthContext, AuthProvider, type AuthContextValue } from "./AuthProvider";
import type { MobileAuthSession } from "./authTypes";

vi.mock('react-native', () => ({ AppState: { currentState: 'active', addEventListener: (_event: string, callback: (state: string) => void) => { mocks.foreground = callback; return { remove() {} }; } } }));
const mocks = vi.hoisted(() => ({ purge: vi.fn(), signOut: vi.fn(), saved: vi.fn(), current: vi.fn(), callback: null as null | import('./authTypes').AuthStateChangeCallback, foreground: null as null | ((state: string) => void) }));
vi.mock("./authService", () => ({
  getSavedSession: mocks.saved,
  getCurrentSession: mocks.current,
  onAuthStateChange: (callback: import('./authTypes').AuthStateChangeCallback) => { mocks.callback = callback; return { ok: true, data: { unsubscribe() {} } }; },
  signOut: mocks.signOut, signInWithEmailPassword: vi.fn(), signUpWithEmailPassword: vi.fn(),
}));
vi.mock("../services/processingOutboxStore", () => ({ pauseOfflineProcessingIntents: vi.fn(), resumeOfflineProcessingIntents: vi.fn() }));
vi.mock("../services/activeProcessingJobStore", () => ({ clearProcessingJobReferencesForOwner: vi.fn() }));
vi.mock("../services/canvasReviewerRecoveryStore", () => ({ clearCanvasReviewerRecoveryForOwner: vi.fn() }));
vi.mock("../services/localLibrary/localArtifactDatabase", () => ({ purgeLocalLibraryForOwner: vi.fn() }));
vi.mock("../services/screenSnapshots", () => ({ purgeScreenSnapshotsForOwner: mocks.purge }));
vi.mock("../config/apiBaseUrl", () => ({ getApiBaseUrl: () => null }));
vi.mock("../services/completionNotifications", () => ({ disableCompletionNotifications: vi.fn() }));
it("successful sign-out awaits the snapshot cleanup in the existing allSettled list", async () => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  let auth: AuthContextValue | null = null;
  function Probe() { auth = useContext(AuthContext); return null; }
  mocks.saved.mockResolvedValue(null);
  mocks.current.mockResolvedValue({ ok: true, data: { user: { id: 'a' }, accessToken: 'test' } });
  mocks.signOut.mockResolvedValue({ ok: true, data: undefined }); mocks.purge.mockResolvedValue(undefined);
  let rendered!: ReturnType<typeof create>;
  await act(async () => { rendered = create(createElement(AuthProvider, null, createElement(Probe))); });
  expect(auth!.session?.user.id).toBe("a");
  await act(async () => { await auth!.signOut(); });
  expect(mocks.purge).toHaveBeenCalledWith("a");
  expect(auth!.session).toBeNull();
  await act(async () => rendered.unmount());
});

const offline = { user: { id: "saved-owner" }, accessToken: "expired-test-token", offline: true } as MobileAuthSession;
async function mountAuth() {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  let auth: AuthContextValue | null = null;
  function Probe() { auth = useContext(AuthContext); return null; }
  let tree!: ReturnType<typeof create>;
  await act(async () => { tree = create(createElement(AuthProvider, null, createElement(Probe))); });
  return { get auth() { return auth!; }, tree };
}
it("opens the saved account while an expired-token refresh is still waiting for internet", async () => {
  mocks.saved.mockResolvedValue(offline);
  mocks.current.mockReturnValue(new Promise(() => {}));
  const view = await mountAuth();
  expect(view.auth.status).toBe("offline");
  expect(view.auth.isRestoring).toBe(false);
  expect(view.auth.session?.user.id).toBe("saved-owner");
  await act(async () => { mocks.callback?.("INITIAL_SESSION", null); });
  expect(view.auth.session?.user.id).toBe("saved-owner");
  await act(async () => view.tree.unmount());
});
it("refreshes in the foreground and replaces offline state without switching owners", async () => {
  mocks.saved.mockResolvedValue(offline);
  mocks.current.mockResolvedValue({ ok: true, data: offline });
  const view = await mountAuth();
  mocks.current.mockResolvedValue({ ok: true, data: { ...offline, offline: false, accessToken: "fresh-test-token" } });
  await act(async () => { mocks.foreground?.("active"); });
  expect(view.auth.status).toBe("signedIn");
  expect(view.auth.session?.accessToken).toBe("fresh-test-token");
  await act(async () => view.tree.unmount());
});
it("does not resurrect a saved owner after an explicit sign-out overtakes refresh", async () => {
  mocks.saved.mockResolvedValue(offline);
  let resolve!: (result: { ok: true; data: MobileAuthSession }) => void;
  mocks.current.mockReturnValue(new Promise(done => { resolve = done; }));
  mocks.signOut.mockResolvedValue({ ok: true, data: undefined });
  const view = await mountAuth();
  await act(async () => { await view.auth.signOut(); });
  await act(async () => { resolve({ ok: true, data: offline }); });
  expect(view.auth.status).toBe("signedOut");
  expect(view.auth.session).toBeNull();
  await act(async () => view.tree.unmount());
});
it("honors revoked credentials and never retains the offline account after SIGNED_OUT", async () => {
  mocks.saved.mockResolvedValue(offline);
  mocks.current.mockResolvedValue({ ok: true, data: offline });
  const view = await mountAuth();
  await act(async () => { mocks.callback?.("SIGNED_OUT", null); });
  expect(view.auth.session).toBeNull();
  expect(view.auth.status).toBe("signedOut");
  await act(async () => view.tree.unmount());
});
