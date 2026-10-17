import { createElement, type ComponentProps } from 'react';
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { ReviewerHeader } from './ReviewerHeader';
import { reviewerDetail } from '../../services/localLibrary/localLibrary.testSupport';
import { hitTarget, spacing } from '../../design/tokens';
import type { ViewStyle } from 'react-native';

const state = vi.hoisted(() => ({ fontScale: 1, read: vi.fn(), mutate: vi.fn(), export: vi.fn(), quiz: vi.fn() }));
vi.mock('react-native', () => ({
  View: 'View', Text: 'Text', Pressable: 'Pressable', Share: { share: vi.fn() },
  useWindowDimensions: () => ({ width: 320, height: 640, scale: 1, fontScale: state.fontScale }),
  Animated: { View: 'AnimatedView', Value: class { stopAnimation() {} setValue() {} } },
}));
vi.mock('expo-router', () => ({ router: {} }));
vi.mock('expo-router/js-tabs', () => ({ BottomTabBarHeightContext: {} }));
vi.mock('lucide-react-native', () => ({
  ArrowLeft: 'Icon', ChevronRight: 'Icon', FileText: 'Icon', RefreshCw: 'Icon', Search: 'Icon', Settings: 'Icon', X: 'Icon',
  BookOpen: 'Icon', ClipboardList: 'Icon', Presentation: 'Icon', FileQuestion: 'Icon', Globe: 'Icon', Info: 'Icon',
}));
vi.mock('react-native-safe-area-context', () => ({ SafeAreaView: 'SafeAreaView', useSafeAreaInsets: () => ({ bottom: 0 }) }));
vi.mock('../../auth', () => ({ useAuth: () => ({ session: { user: { id: 'owner' } } }) }));
vi.mock('../../design/QueueButton', () => ({ QueueButton: 'QueueButton' }));
vi.mock('../../design/sheetDrag', () => ({ useSheetDrag: vi.fn() }));
vi.mock('../../design/haptics', () => ({ haptic: { tap: vi.fn() } }));
vi.mock('../../design/theme', async () => {
  const { palettes } = await import('../../design/themeTokens');
  return { useTheme: () => ({ colors: palettes.light, reducedMotion: true }) };
});
vi.mock('../../services/experienceApi', () => ({ experienceRequest: state.read }));
vi.mock('../../services/reviewerShares', () => ({ mutateReviewerShare: state.mutate, reviewerShareUrl: () => 'https://website.test/s/link' }));

const detail = reviewerDetail();
if (!('reviewer' in detail)) throw new Error('reviewer fixture required');
const props: ComponentProps<typeof ReviewerHeader> = {
  artifact: detail.artifact, reviewer: detail.reviewer, secondaryLine: '~7 min review', topicCount: 3,
  client: { baseUrl: 'https://api.test', accessToken: 'jwt' }, offline: false,
  onExport: state.export, onQuiz: state.quiz,
};
let tree: ReactTestRenderer | undefined;
beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  vi.clearAllMocks(); state.fontScale = 1;
});
afterEach(async () => { if (tree) await act(async () => tree!.unmount()); tree = undefined; });
async function mount(overrides: Partial<typeof props> = {}) {
  await act(async () => { tree = create(createElement(ReviewerHeader, { ...props, ...overrides })); });
}
const text = (value: string) => tree!.root.find(node => String(node.type) === 'Text' && node.props.children === value);
const button = (label: string) => text(label).parent!.parent!;
const row = () => tree!.root.find(node => String(node.type) === 'View' && node.props.style.flexDirection === 'row');
const wrapperStyle = (node: ReactTestInstance): ViewStyle => Object.assign({}, ...node.props.style);
function nativeParent(node: ReactTestInstance) {
  let parent = node.parent;
  while (parent && typeof parent.type !== 'string') parent = parent.parent;
  return parent;
}

it.each([1, 1.5, 1.9])('keeps Export then Share as equal siblings under the title at 320 dp / font scale %s', async fontScale => {
  state.fontScale = fontScale;
  await mount();
  const actions = row().findAll(node => String(node.type) === 'AnimatedView');
  expect(actions).toHaveLength(2);
  // Share returns a fragment, so its animated trigger is also a native row child.
  for (const action of actions) expect(nativeParent(action)).toBe(row());
  expect(actions.map(node => node.findByType('Text' as never).props.children)).toEqual(['Export', 'Share']);
  for (const action of actions) {
    expect(wrapperStyle(action)).toMatchObject({ flex: 1, alignSelf: 'stretch', minWidth: 0 });
    expect(action.findByType('Pressable' as never).props.style({ pressed: false }).minHeight).toBe(hitTarget.min);
    expect(action.findByType('Text' as never).props.numberOfLines).toBeUndefined();
  }
  expect(row().props.style).toMatchObject({ gap: spacing[2], flexWrap: 'nowrap' });
  const children = row().parent!.children;
  expect(children[0]).toBe(text(props.artifact.title).parent);
  expect(children.indexOf(row())).toBe(1);
  expect(children.indexOf(text('~7 min review').parent!)).toBe(2);
  const topic = tree!.root.find(node => String(node.type) === 'Text' && Array.isArray(node.props.children) && node.props.children[1] === ' topics');
  expect(children.indexOf(topic.parent!)).toBe(3);
  expect(children.indexOf(nativeParent(button('Generate Quiz').parent!)!)).toBe(4);
  expect(children[5]).toBe(text('Tap a key point to select it. Hold its group to select all.').parent);
  expect(button('Generate Quiz').props.style({ pressed: false }).minHeight).toBe(56);
  await act(async () => { button('Export').props.onPress(); button('Generate Quiz').props.onPress(); });
  expect(state.export).toHaveBeenCalledOnce(); expect(state.quiz).toHaveBeenCalledOnce();
  expect(state.read).not.toHaveBeenCalled(); expect(state.mutate).not.toHaveBeenCalled();
});

it('gives Export the full available row when Share is unavailable', async () => {
  await mount({ artifact: { ...props.artifact, id: 'local:reviewer' }, secondaryLine: null, topicCount: 1 });
  const actions = row().findAll(node => String(node.type) === 'AnimatedView');
  expect(actions).toHaveLength(1);
  expect(wrapperStyle(actions[0]!)).toMatchObject({ flex: 1, alignSelf: 'stretch' });
  expect(tree!.root.findAll(node => String(node.type) === 'Text' && node.props.children === 'Share')).toHaveLength(0);
});

it.each([2, 3])('stacks complete, flexible-height labels only at very large font scale %s', async fontScale => {
  state.fontScale = fontScale;
  await mount();
  expect(row().props.style.flexWrap).toBe('wrap');
  for (const action of row().findAll(node => String(node.type) === 'AnimatedView')) {
    expect(wrapperStyle(action)).toMatchObject({ flex: 1, minWidth: '100%' });
    const pressStyle = action.findByType('Pressable' as never).props.style({ pressed: false });
    expect(pressStyle.minHeight).toBe(hitTarget.min); expect(pressStyle.height).toBeUndefined();
    expect(action.findByType('Text' as never).props.numberOfLines).toBeUndefined();
  }
});

it('keeps offline Share disabled and both trigger accessibility defaults unchanged', async () => {
  await mount({ offline: true });
  expect(button('Share').props.disabled).toBe(true);
  expect(button('Export').props.disabled).toBe(false);
  for (const label of ['Export', 'Share']) {
    expect(button(label).props.accessibilityRole).toBe('button');
    expect(button(label).props.accessibilityLabel).toBeUndefined();
  }
});
