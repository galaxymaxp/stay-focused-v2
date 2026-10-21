import { createElement } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from "vitest";
import type { LibraryArtifactSummary, ReviewerReaderModel } from '@stay-focused/shared';
vi.mock('expo-constants',()=>({default:{expoConfig:{version:'2.2.0'}}}));

vi.mock('../../auth/sessionStore', () => ({ sessionStore: { getItem: vi.fn(async () => null), setItem: vi.fn(async () => undefined) } }));

vi.mock('./SourcePageSnapshot', () => ({ SourcePageSnapshot: 'SourcePageSnapshot' }));
vi.mock('../../services/reviewerImages',()=>({useReviewerImages:()=>({data:null,refreshOnce:async()=>false})}));
vi.mock('react-native-safe-area-context', () => ({ SafeAreaView: 'SafeAreaView' }));
vi.mock('./ShareReviewerMenu', () => ({ ShareReviewerMenu: 'ShareReviewerMenu' }));
vi.mock("react-native", () => ({
  View: "View",
  Text: "Text",
  TextInput: "TextInput",
  Pressable: "Pressable",
  ScrollView: "ScrollView",
  Vibration: { vibrate: vi.fn() },
  useWindowDimensions: () => ({ width: 360, height: 800, scale: 3, fontScale: 1 }),
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
vi.mock("lucide-react-native", () => Object.fromEntries(["ChevronDown", "ChevronUp", "FileQuestion", "CheckCircle2", "Circle", "Sparkles", "X", "AlertCircle",
  "AlignLeft", "ArrowLeftRight", "Check", "FlaskConical", "Lightbulb", "RotateCcw"].map((name) => [name, name])));
vi.mock("../../design/primitives", () => ({
  Action: "Action", Copy: "Copy", Notice: "Notice",
  Page: (props: { children?: import("react").ReactNode; headerBelow?: import("react").ReactNode }) => createElement("Page", props, props.headerBelow, props.children),
  SearchField: "SearchField", SegmentedControl: "SegmentedControl", Sheet: "Sheet", Surface: "Surface", SkeletonBlock: "SkeletonBlock",
}));
vi.mock("../../design/haptics", () => ({ haptic: { tap: vi.fn(), select: vi.fn(), press: vi.fn(), success: vi.fn(), warning: vi.fn(), error: vi.fn() } }));
vi.mock("expo-router", () => ({ router: { push: vi.fn() } }));
vi.mock("../../auth", () => ({ useAuth: () => ({ session: null }) }));
vi.mock("../../services/generationRecovery", () => ({ createGenerationIntent: vi.fn() }));
vi.mock("../../config/apiBaseUrl", () => ({ getApiBaseUrl: () => 'https://example.test' }));
vi.mock("../../design/theme", async () => {
  const tokens = await import("../../design/themeTokens");
  return { ...tokens, useTheme: () => ({ colors: tokens.palettes.light, mode: "light", reducedMotion: true }) };
});

const { SectionScrubber, ReviewerReaderScreen } = await import("./ReviewerReader");
type Handle = import("./ReviewerReader").ScrubberHandle;
const STRIP_TOP = 100;

const anchors = ["Introduction", "Models", "Normalization", "Transactions"];
let rendered: ReactTestRenderer | undefined;
let handle: { current: Handle };
let props: { onScrub: Mock<(y: number) => void>; onSettle: Mock<(y: number) => void>; onActiveChange: Mock<(active: boolean) => void> };

beforeEach(() => {
  vi.useFakeTimers();
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  props = { onScrub: vi.fn<(y: number) => void>(), onSettle: vi.fn<(y: number) => void>(), onActiveChange: vi.fn<(active: boolean) => void>() };
  handle = { current: { reveal: () => {}, touch: null } };
});
afterEach(async () => {
  if (rendered) await act(async () => rendered!.unmount());
  rendered = undefined;
  vi.useRealTimers();
});

async function mount() {
  await act(async () => {
    rendered = create(createElement(SectionScrubber, {
      handle,
      anchors,
      anchorOffset: (index: number) => index * 1000,
      metrics: { current: { y: 0, content: 4000, viewport: 800 } },
      ...props,
    }), { createNodeMock: () => ({ measureInWindow: (callback: (x: number, y: number) => void) => callback(330, STRIP_TOP) }) });
  });
  const strip = rendered!.root.find((node) => node.props.testID === "reviewer-scrubber");
  await act(async () => strip.props.onLayout({ nativeEvent: { layout: { height: 800 } } }));
  return handle.current.touch!;
}
/** A touch at a track position (relative to the strip), at the right edge unless given. */
const at = (trackY: number, pageX = 350) => ({ nativeEvent: { pageX, pageY: STRIP_TOP + trackY } }) as never;
const bubbleText = () =>
  rendered!.root.findAll((node) => String(node.type) === "Copy").map((node) => [node.props.children].flat().join("")).join(" | ");

describe('Reviewer review-time header', () => {
  it('pins search while focused or with any active query, including a downward match jump', async () => {
    const artifact: LibraryArtifactSummary = { id: 'artifact:saved', type: 'reviewer', title: 'Cells', course: null,
      sourceId: null, sourceTitle: 'Cells.pdf', activityId: null, createdAt: '2026-10-13', updatedAt: '2026-10-13',
      lastOpenedAt: null, status: 'completed', relatedArtifactIds: [] };
    const reviewer: ReviewerReaderModel = { id: artifact.id, title: artifact.title, course: null,
      source: { id: null, title: 'Cells.pdf' }, generatedAt: artifact.createdAt, freshness: 'unknown',
      sections: [{ id: 's1', title: 'Cells', blocks: [] }, { id: 's2', title: 'Cells again', blocks: [] }] };
    const scrollTo = vi.fn();
    await act(async () => { rendered = create(createElement(ReviewerReaderScreen, { artifact, reviewer, deviceCopy: false }), {
      createNodeMock: () => ({ measureLayout: (_root: unknown, callback: (x: number, y: number) => void) => callback(0, 1200) }),
    }); });
    const page = () => rendered!.root.findByType('Page' as never);
    const search = () => rendered!.root.findByType('SearchField' as never);
    page().props.scrollRef.current = { scrollTo };
    expect(page().props.hideHeaderBelowOnScroll).toBe(true);
    expect(page().props.headerBelowAlwaysVisible).toBe(false);
    await act(async () => search().props.onFocus());
    expect(page().props.headerBelowAlwaysVisible).toBe(true);
    await act(async () => search().props.onChangeText('C'));
    await act(async () => search().props.onBlur());
    expect(page().props.headerBelowAlwaysVisible).toBe(true);
    await act(async () => search().props.onChangeText('Cells'));
    expect(scrollTo).toHaveBeenCalledWith({ y: 1128, animated: false });
    // Content includes the constant inset; jumps keep their context BELOW the
    // pinned search, including a larger-font header (120pt) and content chrome.
    await act(async () => rendered!.root.findByProps({ testID: 'reviewer-search-overlay-content' }).props.onLayout({ nativeEvent: { layout: { height: 120 } } }));
    const content = rendered!.root.findAllByType('View' as never).find(node => node.props.collapsable === false && node.props.onLayout);
    await act(async () => content!.props.onLayout({ nativeEvent: { layout: { y: 320 } } }));
    expect(page().props.overlay.props.children[0].props.anchorOffset(0)).toBe(200);
    await act(async () => search().props.onSubmitEditing());
    expect(scrollTo).toHaveBeenLastCalledWith({ y: 1328, animated: false });
    await act(async () => page().props.onScroll({ nativeEvent: { contentOffset: { y: 1128 }, contentSize: { height: 3000 }, layoutMeasurement: { height: 700 } } }));
    expect(page().props.headerBelowAlwaysVisible).toBe(true);
    expect(rendered!.root.findByProps({ testID: 'reviewer-search' })).toBeDefined();
    await act(async () => search().props.onChangeText(''));
    expect(page().props.headerBelowAlwaysVisible).toBe(false);
  });
  it.each([
    { reviewMinutes: 10, origin: 'manual' as const, expected: '~10 min review' },
    { reviewMinutes: null, origin: 'manual' as const, expected: null },
    { reviewMinutes: undefined, origin: 'manual' as const, expected: null },
    { reviewMinutes: 10, origin: 'automatic' as const, expected: 'Made automatically from Cells.pdf · ~10 min review' },
    { reviewMinutes: null, origin: 'automatic' as const, expected: 'Made automatically from Cells.pdf' },
  ])('renders the existing secondary slot: %j', async ({ reviewMinutes, origin, expected }) => {
    const artifact: LibraryArtifactSummary = { id: 'artifact:saved', type: 'reviewer', title: 'Cells', course: null,
      sourceId: null, sourceTitle: 'Cells.pdf', activityId: null, createdAt: '2026-10-13', updatedAt: '2026-10-13',
      lastOpenedAt: null, status: 'completed', relatedArtifactIds: [], origin, reviewMinutes: 90 };
    const reviewer: ReviewerReaderModel = { id: artifact.id, title: artifact.title, course: null,
      source: { id: null, title: 'Cells.pdf' }, generatedAt: artifact.createdAt, freshness: 'unknown', sections: [], reviewMinutes };
    await act(async () => { rendered = create(createElement(ReviewerReaderScreen, { artifact, reviewer, deviceCopy: false })); });
    if (expected) {
      const line = rendered!.root.findAll(node => String(node.type) === 'Copy').find(node => node.props.children === expected);
      expect(line?.props).toMatchObject({ muted: true, size: 'caption' });
    } else expect(bubbleText()).not.toContain('min review');
  });
});

describe("Reviewer section scrubber", () => {
  it("activates only after a still hold, then scrubs topic by topic and settles on release", async () => {
    const strip = await mount();
    await act(async () => strip.onTouchStart(at(100)));
    expect(props.onActiveChange).not.toHaveBeenCalled();
    await act(async () => { vi.advanceTimersByTime(170); });
    expect(props.onActiveChange).toHaveBeenLastCalledWith(true);
    expect(props.onScrub).toHaveBeenLastCalledWith(0);
    expect(bubbleText()).toContain("1 / 4");

    await act(async () => strip.onTouchMove(at(450)));
    expect(props.onScrub).toHaveBeenLastCalledWith(2000);
    expect(bubbleText()).toContain("Normalization");

    await act(async () => strip.onTouchEnd());
    expect(props.onSettle).toHaveBeenCalledWith(2000);
    expect(props.onActiveChange).toHaveBeenLastCalledWith(false);
  });

  it("never activates for a quick swipe that starts on the edge", async () => {
    const strip = await mount();
    await act(async () => strip.onTouchStart(at(600)));
    await act(async () => strip.onTouchMove(at(540)));
    await act(async () => { vi.advanceTimersByTime(500); });
    await act(async () => strip.onTouchEnd());
    expect(props.onActiveChange).not.toHaveBeenCalled();
    expect(props.onScrub).not.toHaveBeenCalled();
    expect(props.onSettle).not.toHaveBeenCalled();
  });

  it("stands down when the native scroll view takes the gesture", async () => {
    const strip = await mount();
    await act(async () => strip.onTouchStart(at(300)));
    await act(async () => strip.onTouchCancel());
    await act(async () => { vi.advanceTimersByTime(500); });
    expect(props.onActiveChange).not.toHaveBeenCalled();
  });

  it("ignores holds that do not start at the right edge", async () => {
    const strip = await mount();
    await act(async () => strip.onTouchStart(at(300, 200)));
    await act(async () => { vi.advanceTimersByTime(500); });
    await act(async () => strip.onTouchEnd());
    expect(props.onActiveChange).not.toHaveBeenCalled();
  });

  it("lets the visible thumb be dragged at once, with a floating topic label", async () => {
    await mount();
    const thumb = () => rendered!.root.find((node) => node.props.testID === "reviewer-scrubber-thumb");
    // Hidden thumb: touches pass straight through to the reader.
    expect(thumb().props.pointerEvents).toBe("none");
    await act(async () => handle.current.reveal(0, 4000, 800));
    expect(thumb().props.pointerEvents).toBe("auto");
    await act(async () => thumb().props.onResponderGrant(at(20)));
    // No hold: the drag owns the touch immediately.
    expect(props.onActiveChange).toHaveBeenLastCalledWith(true);
    await act(async () => thumb().props.onResponderMove(at(450)));
    expect(props.onScrub).toHaveBeenLastCalledWith(2000);
    expect(bubbleText()).toContain("Normalization");
    await act(async () => thumb().props.onResponderMove(at(700)));
    expect(bubbleText()).toContain("Transactions");
    await act(async () => thumb().props.onResponderRelease());
    expect(props.onSettle).toHaveBeenLastCalledWith(3000);
    expect(props.onActiveChange).toHaveBeenLastCalledWith(false);
    // The label disappears once the interaction ends and the thumb fades.
    await act(async () => { vi.advanceTimersByTime(1600); });
    expect(thumb().props.pointerEvents).toBe("none");
  });

  it("is purely visual, so it can never block the scroll view underneath", async () => {
    await mount();
    const strip = rendered!.root.find((node) => node.props.testID === "reviewer-scrubber");
    expect(strip.props.pointerEvents).toBe("none");
    expect(strip.props.onTouchStart).toBeUndefined();
  });
});
