import { createElement, type ComponentProps, type ReactNode } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { SettingsScreen } from '../settings';
import { Shell } from '../../components/shell';
import appPackage from '../../../package.json';

const fake = vi.hoisted(() => ({ path: '/today', signOut: vi.fn() }));
vi.mock('next/link', () => ({ default: ({ children, prefetch, ...props }: ComponentProps<'a'> & { prefetch?: boolean }) => {
  void prefetch;
  return createElement('a', props, children);
} }));
vi.mock('next/navigation', () => ({ usePathname: () => fake.path, useRouter: () => ({ replace: vi.fn() }) }));
vi.mock('../../components/providers', () => ({ useAuth: () => ({ session: { user: { id: 'student', email: 'student@example.test' } }, signOut: fake.signOut, theme: 'light', setTheme: vi.fn() }) }));
vi.mock('../../components/profile-avatar', () => ({ useProfileAvatar: () => ({ initial: 'S', hasUpload: false }), ProfileAvatarProvider: ({ children }: { children: ReactNode }) => children }));
vi.mock('../../components/orb-preferences-sync', () => ({ OrbPreferencesSync: () => null }));
vi.mock('../../components/queue-button', () => ({ QueueButton: () => null }));
vi.mock('../queue-items', () => ({ QueueReadProvider: ({ children }: { children: ReactNode }) => children }));
vi.mock('../notification-settings', () => ({ NotificationSettings: () => null }));
vi.mock('../../lib/hooks', () => ({ useAction: () => ({ busy: false, message: null, run: vi.fn() }) }));
vi.mock('../../lib/crop-avatar', () => ({ cropAvatar: vi.fn() }));
let tree: ReactTestRenderer | undefined;
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
beforeEach(() => {
  fake.path = '/today';
  vi.stubGlobal('window', { addEventListener: vi.fn(), removeEventListener: vi.fn() });
  vi.stubGlobal('document', { addEventListener: vi.fn(), removeEventListener: vi.fn() });
  vi.stubGlobal('localStorage', { getItem: () => null });
});
afterEach(async () => { if (tree) await act(async () => tree!.unmount()); tree = undefined; vi.unstubAllGlobals(); });
function text(node: import('react-test-renderer').ReactTestInstance): string { return node.children.map(child => typeof child === 'string' ? child : text(child)).join(''); }

it('groups full legal rows and the app version at the bottom of Settings', async () => {
  await act(async () => { tree = create(createElement(SettingsScreen)); });
  const section = tree!.root.findByProps({ 'aria-labelledby': 'settings-about' });
  expect(section.findByType('h2').children).toEqual(['About']);
  expect(section.findAllByType('a').map(link => [text(link), link.props.href])).toEqual([
    ['Privacy Policy', '/privacy'], ['Terms of Use', '/terms'],
  ]);
  for (const row of section.findAllByType('a')) {
    expect(row.props.className).toBe('item-row');
    expect(row.findAll(node => node.props.name === 'chevron-right')).toHaveLength(1);
  }
  expect(text(section)).toContain(`Version ${appPackage.version}`);
  expect(tree!.root.findAllByProps({ 'aria-label': 'Legal' })).toHaveLength(0);
});

it.each([false, true])('exposes Privacy from Today in two taps through the account menu (compact=%s)', async compact => {
  await act(async () => { tree = create(createElement(Shell, null, 'Today')); });
  const root = tree!.root;
  const menu = root.findAll(node => node.type === 'div' && typeof node.props.className === 'string' && node.props.className.split(' ').includes('account-menu'))
    .find(node => node.props.className.includes('account-menu-compact') === compact)!;
  const button = menu.findByType('button');
  expect(button.props['aria-label']).toBe('Profile and settings');
  expect(button.props['aria-expanded']).toBe(false);
  await act(async () => button.props.onClick());
  const legal = menu.findAllByType('a').filter(node => text(node) === 'Privacy & Terms');
  expect(legal).toHaveLength(1);
  expect(legal[0]!.props.href).toBe('/privacy');
  expect(legal[0]!.props.role).toBe('menuitem');
  // Next Link owns navigation. A pathname update must close the real menu.
  fake.path = legal[0]!.props.href;
  await act(async () => tree!.update(createElement(Shell, null, 'Privacy')));
  expect(menu.findAllByProps({ role: 'menu' })).toHaveLength(0);
});
