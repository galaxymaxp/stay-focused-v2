import { createElement, type ComponentProps } from 'react';
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { ReviewerHeader } from './ReviewerHeader';
import { reviewerDetail } from '../../services/localLibrary/localLibrary.testSupport';
import { hitTarget, spacing } from '../../design/tokens';

const state = vi.hoisted(() => ({ fontScale: 1, read: vi.fn(), mutate: vi.fn(), export: vi.fn(), quiz: vi.fn() }));
vi.mock('react-native', () => ({
  StyleSheet: { hairlineWidth: .5 }, ActivityIndicator: 'ActivityIndicator', View: 'View', Text: 'Text', Pressable: 'Pressable', Modal: 'Modal', ScrollView: 'ScrollView', Share: { share: vi.fn() },
  useWindowDimensions: () => ({ width: 320, height: 640, scale: 1, fontScale: state.fontScale }),
  Animated: { View: 'AnimatedView', Value: class { stopAnimation() {} setValue() {} } },
}));
vi.mock('expo-linear-gradient', () => ({ LinearGradient: 'LinearGradient' }));
vi.mock('expo-router', () => ({ router: {} }));
vi.mock('expo-router/js-tabs', () => ({ BottomTabBarHeightContext: {} }));
vi.mock('lucide-react-native', () => ({
  ArrowLeft: 'Icon', ChevronRight: 'Icon', FileText: 'Icon', RefreshCw: 'Icon', Search: 'Icon', Settings: 'Icon', X: 'Icon',
  BookOpen: 'Icon', ClipboardList: 'Icon', Presentation: 'Icon', FileQuestion: 'Icon', Globe: 'Icon', Info: 'Icon', Download: 'Icon', Ellipsis: 'Icon',
}));
vi.mock('react-native-safe-area-context', () => ({ SafeAreaView: 'SafeAreaView', useSafeAreaInsets: () => ({ top: 24, bottom: 0, left: 0, right: 0 }) }));
vi.mock('../../auth', () => ({ useAuth: () => ({ session: { user: { id: 'owner' } } }) }));
vi.mock('../../design/QueueButton', () => ({ QueueButton: 'QueueButton' }));
vi.mock('../../design/sheetDrag', () => ({ useSheetDrag: vi.fn() }));
vi.mock('../../design/haptics', () => ({ haptic: { tap: vi.fn() } }));
vi.mock('../../design/primitives', async importOriginal => ({ ...await importOriginal<object>(), Sheet: 'Sheet' }));
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
  vi.clearAllMocks(); state.fontScale = 1; state.read.mockResolvedValue(null);
});
afterEach(async () => { if (tree) await act(async () => tree!.unmount()); tree = undefined; });
async function mount(overrides: Partial<typeof props> = {}) {
  await act(async () => {
    tree = create(createElement(ReviewerHeader, { ...props, ...overrides }), {
      createNodeMock: element => element.type === 'View' ? { measureInWindow: (callback: (x: number, y: number, w: number, h: number) => void) => callback(260, 120, 48, 48) } : null,
    });
  });
}
const text = (value: string) => tree!.root.find(node => String(node.type) === 'Text' && node.props.children === value);
function button(label: string): ReactTestInstance {
  let node = text(label).parent;
  while (node && String(node.type) !== 'Pressable') node = node.parent;
  if (!node) throw new Error(`Missing button ${label}`);
  return node;
}
const trigger = () => tree!.root.find(node => String(node.type) === 'Pressable' && node.props.accessibilityLabel === 'Reviewer actions');
const open = async () => act(async () => trigger().props.onPress());
const modal = () => tree!.root.findAll(node => String(node.type) === 'Modal');

it.each([1, 2, 3])('keeps a wrapping title beside a top-aligned 48pt actions trigger at font scale %s', async fontScale => {
  state.fontScale = fontScale; await mount();
  expect(trigger().props.style({ pressed: false })).toMatchObject({ minWidth: hitTarget.min, minHeight: hitTarget.min });
  expect(text(props.artifact.title).props.style[1]).toMatchObject({ flex: 1, minWidth: 0 });
  expect(text(props.artifact.title).props.numberOfLines).toBeUndefined();
  expect(text(props.artifact.title).parent!.parent!.props.style.alignItems).toBe('flex-start');
  expect(modal()).toHaveLength(0); expect(state.read).not.toHaveBeenCalled();
});
it('opens Export/Share, exports and dismisses while keeping Generate quiz visible', async () => {
  await mount(); await open();
  expect(button('Export')).toBeDefined(); expect(button('Share')).toBeDefined();
  await act(async () => button('Export').props.onPress());
  expect(state.export).toHaveBeenCalledOnce(); expect(modal()).toHaveLength(0);
  await act(async () => button('Generate quiz').props.onPress()); expect(state.quiz).toHaveBeenCalledOnce();
  expect(state.read).not.toHaveBeenCalled(); expect(state.mutate).not.toHaveBeenCalled();
});
it('opens the existing share sheet from the menu without creating a link', async () => {
  await mount(); await open();
  await act(async () => button('Share').props.onPress());
  expect(modal()).toHaveLength(0);
  expect(tree!.root.findAll(node => String(node.type) === 'Sheet')).toHaveLength(1);
  expect(state.read).toHaveBeenCalledWith(props.client, `/api/experience/shares/${props.artifact.id.slice(9)}`);
  expect(state.mutate).not.toHaveBeenCalled();
});
it('omits Share for a non-artifact id', async () => {
  await mount({ artifact: { ...props.artifact, id: 'local:reviewer' } }); await open();
  expect(button('Export')).toBeDefined();
  expect(tree!.root.findAll(node => String(node.type) === 'Text' && node.props.children === 'Share')).toHaveLength(0);
});
it('keeps offline Share disabled with connection wording and Export working', async () => {
  await mount({ offline: true }); await open();
  expect(button('Share').props.disabled).toBe(true);
  expect(button('Share').props.accessibilityState).toEqual({ disabled: true });
  expect(text('Try again when connected.')).toBeDefined();
  // The handler also defends against a stale press while offline.
  await act(async () => button('Share').props.onPress()); expect(state.read).not.toHaveBeenCalled();
  await open(); await act(async () => button('Export').props.onPress()); expect(state.export).toHaveBeenCalledOnce();
});
it('dismisses on outside tap and Android back with no open animation', async () => {
  await mount(); await open(); expect(modal()[0]!.props.animationType).toBe('none');
  const outside = tree!.root.find(node => String(node.type) === 'Pressable' && node.props.accessibilityLabel === 'Close reviewer actions');
  await act(async () => outside.props.onPress()); expect(modal()).toHaveLength(0);
  await open(); await act(async () => modal()[0]!.props.onRequestClose()); expect(modal()).toHaveLength(0);
});
it.each([
  ['~7 min review', 1, ['~7 min review']],
  [null, 3, ['3 topics']],
  ['~7 min review', 3, ['~7 min review', '3 topics']],
  ['Automatic · ~7 min review', 3, ['Automatic · ~7 min review', '3 topics']],
] as const)('groups compact meta (%s, %s) in one column', async (secondaryLine, topicCount, expected) => {
  await mount({ secondaryLine, topicCount });
  const meta = tree!.root.find(node => String(node.type) === 'View' && node.props.testID === 'reviewer-meta');
  expect(meta.props.style).toEqual({ gap: spacing[1] });
  const rows = meta.findAll(node => String(node.type) === 'Text');
  expect(rows.map(node => node.props.children)).toEqual(expected);
  for (const row of rows) expect(row.props.style[1].lineHeight).toBeCloseTo(14.4);
});
it('omits an empty meta block', async () => {
  await mount({ secondaryLine: null, topicCount: 1 });
  expect(tree!.root.findAll(node => node.props.testID === 'reviewer-meta')).toHaveLength(0);
});
it('uses a small busy pill and hides it when a persisted Quiz exists', async () => {
  await mount({ quizBusy: true });
  expect(button('Generating quiz').props.accessibilityState).toMatchObject({ busy: true, disabled: true });
  expect(tree!.root.findByProps({ testID: 'glass-pill-shell' }).props.style.height).toBe(34);
  await act(async () => tree!.update(createElement(ReviewerHeader, { ...props, artifact: { ...props.artifact, relatedArtifactIds: ['quiz:saved'] } })));
  expect(tree!.root.findAllByProps({ testID: 'glass-pill-shell' })).toHaveLength(0);
  expect(state.read).not.toHaveBeenCalled(); expect(state.mutate).not.toHaveBeenCalled();
});
