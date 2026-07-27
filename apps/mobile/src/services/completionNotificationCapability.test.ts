import { describe, expect, it } from "vitest";

import { canUseCompletionNotifications } from "./completionNotificationCapability";

const BUILD_INPUT = {
  executionEnvironment: "standalone",
  isDevice: true,
  platform: "ios",
  projectId: "project-id",
} as const;

describe("completion notification capability", () => {
  it("hides remote notification controls in Expo Go", () => {
    expect(
      canUseCompletionNotifications({
        ...BUILD_INPUT,
        executionEnvironment: "storeClient",
      }),
    ).toBe(false);
  });

  it("allows an app-specific native build on a physical mobile device", () => {
    expect(canUseCompletionNotifications(BUILD_INPUT)).toBe(true);
    expect(
      canUseCompletionNotifications({ ...BUILD_INPUT, platform: "android" }),
    ).toBe(true);
  });

  it("rejects simulators, web, and unlinked builds", () => {
    expect(
      canUseCompletionNotifications({ ...BUILD_INPUT, isDevice: false }),
    ).toBe(false);
    expect(
      canUseCompletionNotifications({ ...BUILD_INPUT, platform: "web" }),
    ).toBe(false);
    expect(
      canUseCompletionNotifications({ ...BUILD_INPUT, projectId: null }),
    ).toBe(false);
  });
});
