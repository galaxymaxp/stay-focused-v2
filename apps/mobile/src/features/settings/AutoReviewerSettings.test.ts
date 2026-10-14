import { createElement } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AutoReviewerSettings } from './AutoReviewerSettings';
const fake = vi.hoisted(() => ({ get: vi.fn(), set: vi.fn(), session: { user: { id: 'owner' }, accessToken: 'token' } }));
vi.mock('../../auth', () => ({ useAuth: () => ({ session: fake.session }) }));
vi.mock('../../config/apiBaseUrl', () => ({ getApiBaseUrl: () => 'https://app.example' }));
vi.mock('../../services/autoReviewerPreferencesApi', () => ({ getAutoReviewerPreference: fake.get, setAutoReviewerPreference: fake.set }));
vi.mock('../../design/theme', async () => {
  const { palettes } = await import('../../design/themeTokens');
  return { useTheme: () => ({ colors: palettes.light }) };
});
vi.mock('../../design/primitives', () => ({ Copy: 'Copy', Notice: 'Notice', Surface: 'Surface' }));
vi.mock('react-native', () => ({ View: 'View', Pressable: 'Pressable', Switch: 'Switch' }));
let rendered: ReactTestRenderer | undefined;
beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  vi.clearAllMocks();
  fake.session = { user: { id: 'owner' }, accessToken: 'token' };
  fake.get.mockResolvedValue(true); fake.set.mockResolvedValue(false);
});
afterEach(async () => { if (rendered) await act(async () => rendered!.unmount()); rendered = undefined; });
async function render() { await act(async () => { rendered = create(createElement(AutoReviewerSettings)); }); }
const toggle = () => rendered!.root.findByType('Switch' as never);
const retry = () => rendered!.root.findByType('Pressable' as never);
describe('automatic reviewer Settings switch', () => {
  it('loads the saved switch and optimistically reverts a failed save, then retries', async () => {
    await render(); expect(toggle().props.value).toBe(true);
    let reject: (error: Error) => void = () => {};
    fake.set.mockImplementationOnce(() => new Promise<boolean>((_resolve, fail) => { reject = fail; }));
    await act(async () => { toggle().props.onValueChange(false); });
    expect(toggle().props.value).toBe(false); expect(toggle().props.disabled).toBe(true);
    await act(async () => { reject(new Error('offline')); });
    expect(toggle().props.value).toBe(true); expect(toggle().props.disabled).toBe(false);
    expect(rendered!.root.findByType('Notice' as never).props.children).toBe("Couldn't update this setting. Try again.");
    await act(async () => { retry().props.onPress(); });
    expect(toggle().props.value).toBe(false); expect(fake.set).toHaveBeenCalledTimes(2);
  });
  it('disables the unloaded switch after an offline load and allows retry', async () => {
    fake.get.mockRejectedValueOnce(new Error('offline'));
    await render(); expect(toggle().props.disabled).toBe(true); expect(fake.set).not.toHaveBeenCalled();
    await act(async () => { retry().props.onPress(); });
    expect(toggle().props.value).toBe(true); expect(toggle().props.disabled).toBe(false);
  });
  it('ignores a late save result when the signed-in user changes', async () => {
    await render();
    let resolve: (value: boolean) => void = () => {};
    fake.set.mockImplementationOnce(() => new Promise<boolean>(done => { resolve = done; }));
    await act(async () => { toggle().props.onValueChange(false); });
    fake.session = { user: { id: 'other-owner' }, accessToken: 'other-token' };
    await act(async () => { rendered!.update(createElement(AutoReviewerSettings)); });
    expect(toggle().props.value).toBe(true);
    await act(async () => { resolve(false); });
    expect(toggle().props.value).toBe(true); expect(toggle().props.disabled).toBe(false);
  });
});
