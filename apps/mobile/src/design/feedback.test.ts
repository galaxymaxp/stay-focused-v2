import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ values: new Map<string, string>(), haptics: vi.fn() }));
vi.mock("../auth/sessionStore", () => ({ sessionStore: {
  getItem: async (key: string) => mocks.values.get(key) ?? null,
  setItem: async (key: string, value: string) => { mocks.values.set(key, value); },
} }));
vi.mock("./haptics", () => ({ setHapticsEnabled: mocks.haptics }));

beforeEach(() => { vi.resetModules(); mocks.haptics.mockClear(); mocks.values.clear(); });
describe("feedback preferences", () => {
  it("persists sound and haptic controls across a fresh module load", async () => {
    const feedback = await import("./feedback");
    await feedback.saveFeedbackPreferences({ sounds: false, haptics: false });
    expect(mocks.haptics).toHaveBeenLastCalledWith(false);
    vi.resetModules();
    const reopened = await import("./feedback");
    expect(await reopened.loadFeedbackPreferences()).toEqual({ sounds: false, haptics: false });
    expect(reopened.getFeedbackPreferences().sounds).toBe(false);
  });
});
