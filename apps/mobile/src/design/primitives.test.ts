import { createElement } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Action, Page, ProfileButton, RowLink, SearchField, Sheet, SkeletonBlock } from "./primitives";
import { hitTarget, spacing } from "./tokens";

const skeletonMotion = vi.hoisted(() => ({ reduced: true, timings: [] as { duration: number }[], loopStart: vi.fn(), loopStop: vi.fn() }));
const navigation = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("expo-router", () => ({ router: { ...navigation, canGoBack: () => true, back: vi.fn() } }));
vi.mock("expo-router/js-tabs", async () => ({ BottomTabBarHeightContext: (await import("react")).createContext(undefined) }));
vi.mock("../auth", () => ({ useAuth: () => ({ session: { user: { email: 'student@example.test' } } }) }));
vi.mock("./QueueButton", () => ({ QueueButton: "QueueButton" }));
vi.mock("./sheetDrag", () => ({ useSheetDrag: () => ({ drag: { interpolate: () => 1 }, touchHandlers: { onTouchMove: vi.fn() }, onScroll: vi.fn() }) }));
vi.mock("./haptics", () => ({ haptic: { tap: vi.fn() } }));
vi.mock("react-native-safe-area-context", () => ({ SafeAreaView: "SafeAreaView", useSafeAreaInsets: () => ({ top: 0, bottom: 0 }) }));
vi.mock("lucide-react-native", () => Object.fromEntries(["ArrowLeft", "ChevronRight", "FileText", "RefreshCw", "Search", "Settings", "X", "BookOpen", "ClipboardList", "Presentation", "FileQuestion", "Globe", "Info"].map(name => [name, name])));
vi.mock("./theme", async () => {
  const tokens = await import("./themeTokens");
  return { ...tokens, useTheme: () => ({ colors: tokens.palettes.light, mode: "light", reducedMotion: skeletonMotion.reduced }) };
});
vi.mock("react-native", () => ({
  View: "View", Text: "Text", TextInput: "TextInput", ScrollView: "ScrollView", RefreshControl: "RefreshControl",
  Pressable: "Pressable", Modal: "Modal", StatusBar: "StatusBar",
  useWindowDimensions: () => ({ width: 360, height: 800 }),
  Easing: { inOut: (value: unknown) => value, out: (value: unknown) => value, in: (value: unknown) => value, quad: "quad" },
  Animated: {
    timing: (_value: unknown, config: { duration: number }) => { skeletonMotion.timings.push(config); return { start: (done?: () => void) => done?.() }; },
    sequence: (steps: unknown) => steps,
    loop: () => ({ start: skeletonMotion.loopStart, stop: skeletonMotion.loopStop }),
    parallel: () => ({ start: (done?: () => void) => done?.() }),
    multiply: () => 1,
    add: () => 0,
    View: "AnimatedView",
    Value: class {
      constructor(public value: number) {}
      setValue(value: number) { this.value = value; }
      stopAnimation() {}
      interpolate(config: { outputRange: number[] }) { return { __getValue: () => this.value * config.outputRange[1]!, outputRange: config.outputRange }; }
    },
  },
}));

let rendered: ReactTestRenderer | undefined;
beforeEach(() => { skeletonMotion.reduced = true; skeletonMotion.timings.length = 0; skeletonMotion.loopStart.mockClear(); skeletonMotion.loopStop.mockClear(); Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true }); vi.useFakeTimers(); });
afterEach(async () => {
  if (rendered) await act(async () => rendered!.unmount());
  rendered = undefined;
  vi.useRealTimers();
});
async function mount(props: Partial<React.ComponentProps<typeof Page>> = {}) {
  const pageProps = { title: "Title", children: "Body", headerBelow: createElement("Status"), ...props };
  await act(async () => { rendered = create(createElement(Page, pageProps)); });
  return rendered!.root;
}
const event = (y: number) => ({ nativeEvent: { contentOffset: { y }, contentSize: { height: 2000 }, layoutMeasurement: { height: 700 } } });

it('opens bundled Privacy from the signed-in profile in two taps and dismisses the sheet', async () => {
  await act(async () => { rendered = create(createElement(ProfileButton)); });
  const root = rendered!.root;
  expect(root.findAllByType('Modal' as never)).toHaveLength(0);
  await act(async () => root.findByProps({ testID: 'profile-button' }).props.onPress());
  expect(root.findAllByType('Modal' as never)).toHaveLength(1);
  expect(JSON.stringify(rendered!.toJSON())).toContain('student@example.test');
  const rows = root.findAllByType(RowLink);
  expect(rows.map(row => row.props.label)).toEqual(['Sync', 'Settings', 'Privacy & Terms']);
  const legal = root.findAllByType('Pressable' as never).find(node => node.props.accessibilityLabel === 'Privacy & Terms')!;
  expect(legal.props.style({ pressed: false }).minHeight).toBeGreaterThanOrEqual(44);
  expect(legal.findAllByType('ChevronRight' as never)).toHaveLength(1);
  await act(async () => legal.props.onPress());
  expect(navigation.push).toHaveBeenCalledExactlyOnceWith('/privacy');
  expect(root.findAllByType('Modal' as never)).toHaveLength(0);
});

it.each([false, true])("pill actions retain comfortable padding and touch height (secondary=%s)", async secondary => {
  const props = { pill: true, secondary, onPress: vi.fn(), children: "View Queue" };
  await act(async () => { rendered = create(createElement(Action, props)); });
  const target = rendered!.root.findByType("Pressable" as never);
  for (const pressed of [false, true]) {
    const style = target.props.style({ pressed });
    expect(style.paddingHorizontal).toBeGreaterThanOrEqual(spacing[5]);
    expect(style.minHeight).toBeGreaterThanOrEqual(hitTarget.min);
  }
});

describe('required sheet dismissal', () => {
  it('disables back, backdrop, Done and drag dismissal while preserving scroll content', async () => {
    const onClose=vi.fn();
    const props={onClose,dismissible:false,children:'Download update'};
    await act(async () => { rendered=create(createElement(Sheet,props)); });
    const root=rendered!.root;
    await act(async () => root.findByType('Modal' as never).props.onRequestClose());
    const backdrop=root.findByProps({accessibilityLabel:'Dismiss'});
    expect(backdrop.props.disabled).toBe(true);
    await act(async () => backdrop.props.onPress());
    expect(onClose).not.toHaveBeenCalled();
    expect(root.findAllByProps({testID:'sheet-done'})).toHaveLength(0);
    expect(root.findAll(node => node.props.onTouchMove)).toHaveLength(0);
    expect(root.findByType('ScrollView' as never).props.onScroll).toBeUndefined();
  });
  it('retains the default Done and Android back behavior for existing sheets', async () => {
    const onClose=vi.fn();
    const props={onClose,children:'Content'};
    await act(async () => { rendered=create(createElement(Sheet,props)); });
    expect(rendered!.root.findAllByProps({testID:'sheet-done'}).length).toBeGreaterThan(0);
    await act(async () => rendered!.root.findByType('Modal' as never).props.onRequestClose());
    expect(onClose).toHaveBeenCalledOnce();
  });
});

describe("Page secondary headers", () => {
  it("keeps default Page unwrapped and forwards the caller's exact handler", async () => {
    const onScroll = vi.fn();
    const root = await mount({ onScroll });
    expect(root.findAllByProps({ testID: "page-collapsible-header" })).toHaveLength(0);
    expect(root.findByType("ScrollView" as never).props.onScroll).toBe(onScroll);
    expect(root.findAllByType("Status" as never)).toHaveLength(1);
  });
  it("leaves scroll throttling unset when the default Page has no observer", async () => {
    const root = await mount();
    expect(root.findByType("ScrollView" as never).props.scrollEventThrottle).toBeUndefined();
  });
  it("composes the collapse handler and caller, hides accessibility descendants and preserves the measured inset", async () => {
    const onScroll = vi.fn();
    const root = await mount({ hideHeaderBelowOnScroll: true, onScroll, back: true, headerAction: createElement("HeaderAction"), headerBelowFixed: createElement("FixedControls") });
    const region = () => root.findByProps({ testID: "page-collapsible-header" });
    const measured = region().findByType("View" as never);
    await act(async () => measured.props.onLayout({ nativeEvent: { layout: { height: 50 } } }));
    const down = event(100);
    await act(async () => root.findByType("ScrollView" as never).props.onScroll(down));
    expect(onScroll).toHaveBeenCalledExactlyOnceWith({ nativeEvent: down.nativeEvent });
    expect(root.findByType("ScrollView" as never).props.scrollEventThrottle).toBe(16);
    expect(region().props.animatedProps).toMatchObject({ accessibilityElementsHidden: true, importantForAccessibility: "no-hide-descendants", pointerEvents: "none" });
    expect(region().props.style[0]).toMatchObject({ position: "absolute", top: 0 });
    const mask = root.findByProps({ testID: "page-header-mask" });
    expect(mask.props.style).toMatchObject({ height: 50, overflow: "hidden" });
    expect(mask.props.pointerEvents).toBe("box-none");
    expect(mask.parent?.props.style.overflow).toBeUndefined();
    expect(root.findByType("ScrollView" as never).props.contentContainerStyle.paddingTop).toBe(50);
    expect(region().findAllByType("HeaderAction" as never)).toHaveLength(0);
    expect(region().findAllByType("FixedControls" as never)).toHaveLength(0);
    expect(root.findAllByType("HeaderAction" as never)).toHaveLength(1);
    expect(root.findAllByProps({ label: "Back" })).toHaveLength(1);
    await act(async () => root.findByType("ScrollView" as never).props.onScroll(event(-10)));
    expect(region().props.animatedProps.accessibilityElementsHidden).toBe(false);
    expect(region().props.animatedProps.importantForAccessibility).toBe("auto");
    expect(root.findByType("ScrollView" as never).props.contentContainerStyle.paddingTop).toBe(50);
  });
  it("preserves native RefreshControl and refreshEnabled on an opted-in Page", async () => {
    const onRefresh = vi.fn();
    const root = await mount({ hideHeaderBelowOnScroll: true, onRefresh, refreshEnabled: false });
    const control = () => root.findByType("ScrollView" as never).props.refreshControl;
    expect(control().type).toBe("RefreshControl");
    expect(control().props.enabled).toBe(false);
    await act(async () => control().props.onRefresh());
    expect(onRefresh).toHaveBeenCalledOnce();
    expect(control().props.refreshing).toBe(true);
    await act(async () => { vi.advanceTimersByTime(700); });
    expect(control().props.refreshing).toBe(false);
  });
  it("keeps a forced header visible on down scroll and forwards layout metrics", async () => {
    const root = await mount({ hideHeaderBelowOnScroll: true, headerBelowAlwaysVisible: true });
    const scroll = root.findByType("ScrollView" as never);
    expect(scroll.props.onLayout).toBeTypeOf("function");
    expect(scroll.props.onContentSizeChange).toBeTypeOf("function");
    await act(async () => scroll.props.onScroll(event(1000)));
    expect(root.findByProps({ testID: "page-collapsible-header" }).props.animatedProps.accessibilityElementsHidden).toBe(false);
  });
  it("does not collapse a non-scrolling Page", async () => {
    const root = await mount({ hideHeaderBelowOnScroll: true, scroll: false });
    expect(root.findAllByProps({ testID: "page-collapsible-header" })).toHaveLength(0);
  });
});

it("SearchField forwards focus and blur to the actual input", async () => {
  const onFocus = vi.fn();
  const onBlur = vi.fn();
  await act(async () => { rendered = create(createElement(SearchField, { value: "", onChangeText: vi.fn(), label: "Find", placeholder: "Find", onFocus, onBlur })); });
  const input = rendered!.root.findByType("TextInput" as never);
  expect(input.props.onFocus).toBe(onFocus);
  expect(input.props.onBlur).toBe(onBlur);
});

it.each([false, true])("RowLink retains its accessible 48pt unfilled press target (disabled=%s)", async disabled => {
  const onPress = vi.fn();
  const rowProps = { label: "Text", testID: "source-choice-text", disabled, onPress, icon: createElement("SourceIcon"), children: "Text" };
  await act(async () => { rendered = create(createElement(RowLink, rowProps)); });
  const target = rendered!.root.findByType("Pressable" as never);
  expect(target.props).toMatchObject({ testID: "source-choice-text", accessibilityRole: "button", accessibilityLabel: "Text", disabled, accessibilityState: { disabled } });
  for (const pressed of [false, true]) {
    const style = target.props.style({ pressed });
    expect(style.minHeight).toBeGreaterThanOrEqual(48);
    expect(style.backgroundColor).toBeUndefined();
    expect(style.opacity).toBe(pressed ? 0.7 : 1);
  }
  expect(target.children[0]).toBe(target.findByType("SourceIcon" as never));
  expect(target.props.onPress).toBe(onPress);
  if (!disabled) {
    await act(async () => target.props.onPress());
    expect(onPress).toHaveBeenCalledOnce();
  }
});

it.each([false, true])('planner skeleton uses shared 1.6 second .55–1 loop, static under Reduce Motion (%s)', async reduced => {
  skeletonMotion.reduced = reduced;
  await act(async () => { rendered = create(createElement(SkeletonBlock, { width: 100, height: 12, opacityRange: [0.55, 1] })); });
  const opacity = rendered!.root.findByType('AnimatedView' as never).props.style[0].opacity;
  if (reduced) { expect(opacity).toBe(0.55); expect(skeletonMotion.loopStart).not.toHaveBeenCalled(); }
  else { expect(opacity.outputRange).toEqual([0.55, 1]); expect(skeletonMotion.timings.map(config => config.duration)).toEqual([800, 800]); expect(skeletonMotion.loopStart).toHaveBeenCalledTimes(1); }
});
