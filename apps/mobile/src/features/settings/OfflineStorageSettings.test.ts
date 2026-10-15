import { createElement } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { OfflineStorageSettings, offlineStorageSize } from './OfflineStorageSettings';

const fake = vi.hoisted(() => ({
  platform: { OS: 'android' }, alert: vi.fn(), stats: vi.fn(), clear: vi.fn(), run: vi.fn(), stop: vi.fn(),
  client: { baseUrl: 'https://example.test', accessToken: 'token' },
}));
vi.mock('react-native', () => ({ View: 'View', Platform: fake.platform, Alert: { alert: fake.alert } }));
vi.mock('expo-router/react-navigation', () => ({ useIsFocused: () => true }));
vi.mock('../../auth', () => ({ useAuth: () => ({ session: { user: { id: 'owner' } } }) }));
vi.mock('../../design/theme', () => ({ useTheme: () => ({ active: true }) }));
vi.mock('../../design/primitives', () => ({ Action: 'Action', Copy: 'Copy', Notice: 'Notice', Surface: 'Surface' }));
vi.mock('../redesign/useExperience', () => ({ useExperienceClient: () => fake.client }));
vi.mock('../../services/localLibrary/localArtifactDatabase', () => ({
  getLocalArtifactStore: async () => ({ offlineStats: fake.stats, clearBodies: fake.clear }),
}));
vi.mock('../../services/localLibrary/offlineCatchUp', () => ({
  runOfflineCatchUp: fake.run, stopOfflineCatchUp: fake.stop, subscribeOfflineLibrary: () => () => {},
}));
let rendered: ReactTestRenderer | undefined;
beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  vi.clearAllMocks(); fake.platform.OS = 'android';
  fake.stats.mockResolvedValue({ total: 24, current: 22, approximateBytes: 1536 });
  fake.clear.mockResolvedValue(undefined); fake.stop.mockResolvedValue(undefined);
  fake.run.mockResolvedValue({ result: null, errorCode: null });
});
afterEach(async () => { if (rendered) await act(async () => rendered!.unmount()); rendered = undefined; });
async function render() { await act(async () => { rendered = create(createElement(OfflineStorageSettings)); }); }
function action(label: string) { return rendered!.root.findAllByType('Action' as never).find(node => node.props.children === label)!; }
function confirmButton(label: string) { return (fake.alert.mock.calls[0]![2] as { text: string; onPress: () => void }[]).find(button => button.text === label)!; }
describe('Offline storage settings', () => {
  it('renders counts and approximate KB/MB sizes', async () => {
    await render();
    expect(JSON.stringify(rendered!.toJSON())).toContain('items saved on this device');
    expect(JSON.stringify(rendered!.toJSON())).toContain('1.5 KB');
    expect(offlineStorageSize(1572864)).toBe('1.5 MB');
  });
  it('clears once only after confirmation and saves again only on explicit tap', async () => {
    await render();
    await act(async () => { action('Remove device copies').props.onPress(); });
    expect(fake.clear).not.toHaveBeenCalled();
    expect(fake.alert.mock.calls[0]![1]).toContain('Unsynced quiz answers are kept.');
    fake.stats.mockResolvedValue({ total: 24, current: 0, approximateBytes: 0 });
    await act(async () => { confirmButton('Remove device copies').onPress(); confirmButton('Remove device copies').onPress(); });
    expect(fake.clear).toHaveBeenCalledExactlyOnceWith('owner');
    expect(fake.stop).toHaveBeenCalledExactlyOnceWith('owner');
    expect(fake.run).not.toHaveBeenCalled();
    expect(action('Save again now')).toBeDefined();
    fake.stats.mockResolvedValue({ total: 24, current: 24, approximateBytes: 1572864 });
    await act(async () => { action('Save again now').props.onPress(); });
    expect(fake.run).toHaveBeenCalledWith('owner', fake.client, { force: true });
    expect(JSON.stringify(rendered!.toJSON())).toContain('1.5 MB');
  });
  it('cancel leaves copies untouched', async () => {
    await render();
    await act(async () => { action('Remove device copies').props.onPress(); confirmButton('Cancel').onPress(); });
    expect(fake.clear).not.toHaveBeenCalled(); expect(fake.stop).not.toHaveBeenCalled();
  });
  it('is hidden on web and never reads device storage', async () => {
    fake.platform.OS = 'web'; await render();
    expect(rendered!.toJSON()).toBeNull(); expect(fake.stats).not.toHaveBeenCalled();
  });
});
