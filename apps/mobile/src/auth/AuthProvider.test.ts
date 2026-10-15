import { createElement, useContext } from "react";
import { act, create } from "react-test-renderer";
import { expect, it, vi } from "vitest";
import { AuthContext, AuthProvider, type AuthContextValue } from "./AuthProvider";

const mocks = vi.hoisted(() => ({ purge: vi.fn(), signOut: vi.fn() }));
vi.mock("./authService", () => ({
  getCurrentSession: async () => ({ ok: true, data: { user: { id: "a" }, accessToken: "test" } }),
  onAuthStateChange: () => ({ ok: true, data: { unsubscribe() {} } }),
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
  mocks.signOut.mockResolvedValue({ ok: true, data: undefined }); mocks.purge.mockResolvedValue(undefined);
  let rendered!: ReturnType<typeof create>;
  await act(async () => { rendered = create(createElement(AuthProvider, null, createElement(Probe))); });
  expect(auth!.session?.user.id).toBe("a");
  await act(async () => { await auth!.signOut(); });
  expect(mocks.purge).toHaveBeenCalledWith("a");
  expect(auth!.session).toBeNull();
  await act(async () => rendered.unmount());
});
