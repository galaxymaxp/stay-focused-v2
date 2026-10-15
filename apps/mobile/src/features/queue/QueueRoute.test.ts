import { createElement } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  show: vi.fn(),
  back: vi.fn(),
  replace: vi.fn(),
  canBack: true,
}));
vi.mock("expo-router", () => ({
  router: {
    canGoBack: () => mocks.canBack,
    back: mocks.back,
    replace: mocks.replace,
  },
}));
vi.mock("./useQueueItems", () => ({
  useQueueItems: () => ({ show: mocks.show }),
}));
const { default: QueueRoute } = await import(
  "../../../app/(app)/generation-queue"
);
let rendered: ReactTestRenderer | undefined;
beforeEach(() => {
  vi.clearAllMocks();
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
});
afterEach(async () => {
  if (rendered) await act(async () => rendered!.unmount());
  rendered = undefined;
});
it("returns legacy Queue links to the previous screen and opens the dropdown", async () => {
  mocks.canBack = true;
  await act(async () => {
    rendered = create(createElement(QueueRoute));
  });
  expect(mocks.back).toHaveBeenCalledOnce();
  expect(mocks.show).toHaveBeenCalledOnce();
  expect(mocks.replace).not.toHaveBeenCalled();
});
it("opens the dropdown over Today on a cold Queue link", async () => {
  mocks.canBack = false;
  await act(async () => {
    rendered = create(createElement(QueueRoute));
  });
  expect(mocks.replace).toHaveBeenCalledWith("/today");
  expect(mocks.show).toHaveBeenCalledOnce();
  expect(mocks.back).not.toHaveBeenCalled();
});
