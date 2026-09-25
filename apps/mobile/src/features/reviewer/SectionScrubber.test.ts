import { createElement } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("react-native", () => ({
  View: "View",
  Text: "Text",
  TextInput: "TextInput",
  Pressable: "Pressable",
  Animated: {
    View: "AnimatedView",
    Value: class {
      setValue() {}
      stopAnimation() {}
      interpolate(config: unknown) { return config; }
    },
    timing: () => ({ start: (done?: () => void) => done?.() }),
    multiply: (a: unknown, b: unknown) => ({ a, b }),
  },
}));
vi.mock("lucide-react-native", () => ({ ChevronDown: "ChevronDown", ChevronUp: "ChevronUp", Search: "Search", X: "X" }));
vi.mock("../../design/primitives", () => ({ Copy: "Copy", IconAction: "IconAction", Notice: "Notice", Page: "Page" }));
vi.mock("../../design/theme", async () => {
  const tokens = await import("../../design/themeTokens");
  return { ...tokens, useTheme: () => ({ colors: tokens.palettes.light, mode: "light", reducedMotion: true }) };
});

const { SectionScrubber } = await import("./ReviewerReader");

const anchors = ["Introduction", "Models", "Normalization", "Transactions"];
let rendered: ReactTestRenderer | undefined;
let props: { onScrub: ReturnType<typeof vi.fn>; onSettle: ReturnType<typeof vi.fn>; onActiveChange: ReturnType<typeof vi.fn> };

beforeEach(() => {
  vi.useFakeTimers();
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  props = { onScrub: vi.fn(), onSettle: vi.fn(), onActiveChange: vi.fn() };
});
afterEach(async () => {
  if (rendered) await act(async () => rendered!.unmount());
  rendered = undefined;
  vi.useRealTimers();
});

async function mount() {
  await act(async () => {
    rendered = create(createElement(SectionScrubber, {
      handle: { current: { reveal: () => {} } },
      anchors,
      anchorOffset: (index: number) => index * 1000,
      metrics: { current: { y: 0, content: 4000, viewport: 800 } },
      ...props,
    }));
  });
  const strip = rendered!.root.find((node) => node.props.testID === "reviewer-scrubber");
  await act(async () => strip.props.onLayout({ nativeEvent: { layout: { height: 800 } } }));
  return rendered!.root.find((node) => node.props.testID === "reviewer-scrubber");
}
const at = (locationY: number, pageY = locationY) => ({ nativeEvent: { locationY, pageY } });
const bubbleText = () =>
  rendered!.root.findAll((node) => String(node.type) === "Copy").map((node) => [node.props.children].flat().join("")).join(" | ");

describe("Reviewer section scrubber", () => {
  it("activates only after a still hold, then scrubs topic by topic and settles on release", async () => {
    const strip = await mount();
    await act(async () => strip.props.onTouchStart(at(100)));
    expect(props.onActiveChange).not.toHaveBeenCalled();
    await act(async () => { vi.advanceTimersByTime(170); });
    expect(props.onActiveChange).toHaveBeenLastCalledWith(true);
    expect(props.onScrub).toHaveBeenLastCalledWith(0);
    expect(bubbleText()).toContain("1 / 4");

    await act(async () => strip.props.onTouchMove(at(100, 100 + 350)));
    expect(props.onScrub).toHaveBeenLastCalledWith(2000);
    expect(bubbleText()).toContain("Normalization");

    await act(async () => strip.props.onTouchEnd());
    expect(props.onSettle).toHaveBeenCalledWith(2000);
    expect(props.onActiveChange).toHaveBeenLastCalledWith(false);
  });

  it("never activates for a quick swipe that starts on the edge", async () => {
    const strip = await mount();
    await act(async () => strip.props.onTouchStart(at(600)));
    await act(async () => strip.props.onTouchMove(at(600, 540)));
    await act(async () => { vi.advanceTimersByTime(500); });
    await act(async () => strip.props.onTouchEnd());
    expect(props.onActiveChange).not.toHaveBeenCalled();
    expect(props.onScrub).not.toHaveBeenCalled();
    expect(props.onSettle).not.toHaveBeenCalled();
  });

  it("stands down when the native scroll view takes the gesture", async () => {
    const strip = await mount();
    await act(async () => strip.props.onTouchStart(at(300)));
    await act(async () => strip.props.onTouchCancel());
    await act(async () => { vi.advanceTimersByTime(500); });
    expect(props.onActiveChange).not.toHaveBeenCalled();
  });

  it("does not claim the touch, so native scrolling keeps working", async () => {
    const strip = await mount();
    expect(strip.props.onStartShouldSetResponder).toBeUndefined();
    expect(strip.props.onResponderGrant).toBeUndefined();
  });
});
