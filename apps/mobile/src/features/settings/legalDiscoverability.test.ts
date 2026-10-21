import { createElement } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, expect, it, vi } from 'vitest';
import { SettingsScreen } from './SettingsScreen';
import { LegalLinks } from '../legal/LegalLinks';

const fake = vi.hoisted(() => ({ push: vi.fn(), dark: false }));
vi.mock('expo-router', () => ({ router: { push: fake.push } }));
vi.mock('react-native', () => ({ Pressable: 'Pressable', Switch: 'Switch', View: 'View' }));
vi.mock('react-native-svg', () => ({ default: 'Svg', Path: 'Path', Rect: 'Rect' }));
vi.mock('lucide-react-native', () => ({ Check: 'Check', FileText: 'FileText', LogOut: 'LogOut', Vibrate: 'Vibrate', Volume2: 'Volume2' }));
vi.mock('../../auth', () => ({ useAuth: () => ({ session: { user: { email: 'student@example.test' } } }) }));
vi.mock('../../auth/providerAuth', () => ({ openProviderAuth: vi.fn() }));
vi.mock('../../design/feedback', () => ({ getFeedbackPreferences: () => ({ sounds: true, haptics: true }), loadFeedbackPreferences: async () => ({ sounds: true, haptics: true }), saveFeedbackPreferences: vi.fn() }));
vi.mock('../../design/haptics', () => ({ haptic: { tap: vi.fn(), select: vi.fn() } }));
vi.mock('../../design/primitives', () => ({ Copy: 'Copy', Notice: 'Notice', Page: 'Page', RowLink: 'RowLink', SegmentedControl: 'SegmentedControl', Surface: 'Surface' }));
vi.mock('../../design/theme', async () => {
  const { palettes } = await import('../../design/themeTokens');
  return { useTheme: () => ({ colors: palettes[fake.dark ? 'dark' : 'light'], preference: 'system', family: 'standard' }) };
});
vi.mock('../../design/Avatar', () => ({ Avatar: 'Avatar' }));
vi.mock('../../design/ProfileAvatarProvider', () => ({ useProfileAvatar: () => ({ initial: 'S' }) }));
vi.mock('./NotificationSettings', () => ({ NotificationSettings: () => null }));
vi.mock('./CompletionNotificationSettings', () => ({ CompletionNotificationSettings: () => null }));
vi.mock('./OfflineStorageSettings', () => ({ OfflineStorageSettings: () => null }));
vi.mock('./AutoReviewerSettings', () => ({ AutoReviewerSettings: () => null }));
vi.mock('./ProfilePhotoSettings', () => ({ ProfilePhotoSettings: () => null }));
vi.mock('./AppUpdateAbout', () => ({ AppUpdateAbout: 'AppUpdateAbout' }));
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
let tree: ReactTestRenderer | undefined;
afterEach(async () => { if (tree) await act(async () => tree!.unmount()); tree = undefined; vi.clearAllMocks(); });

it.each([false, true])('places standard legal navigation and existing version in About (dark=%s)', async dark => {
  fake.dark = dark;
  await act(async () => { tree = create(createElement(SettingsScreen)); });
  const about = tree!.root.findAll(node => node.props.title === 'About')[0]!;
  const rows = about.findAllByType('RowLink' as never);
  expect(rows.map(row => row.props.label)).toEqual(['Privacy Policy', 'Terms of Use']);
  for (const [index, route] of ['/privacy', '/terms'].entries()) {
    await act(async () => rows[index]!.props.onPress());
    expect(fake.push).toHaveBeenNthCalledWith(index + 1, route);
  }
  expect(about.findAllByType('AppUpdateAbout' as never)).toHaveLength(1);
  expect(tree!.root.findAllByType(LegalLinks)).toHaveLength(0);
  expect(tree!.root.findByType('Page' as never).props.back).toBe(true);
});
