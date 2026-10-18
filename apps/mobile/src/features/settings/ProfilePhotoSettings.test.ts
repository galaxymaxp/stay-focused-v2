import { createElement } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, expect, it, vi } from 'vitest';
import { ProfilePhotoSettings } from './ProfilePhotoSettings';
const mocks = vi.hoisted(() => ({ permission: vi.fn(), picker: vi.fn(), change: vi.fn(), alert: vi.fn() }));
vi.mock('expo-image-picker', () => ({ requestMediaLibraryPermissionsAsync: mocks.permission, launchImageLibraryAsync: mocks.picker }));
vi.mock('react-native', () => ({ View: 'View', Alert: { alert: mocks.alert }, Platform: { OS: 'android' } }));
vi.mock('../../design/primitives', () => ({ Action: 'Action', Notice: 'Notice' }));
vi.mock('../../design/ProfileAvatarProvider', () => ({ useProfileAvatar: () => ({ hasUpload: true, change: mocks.change }) }));
let rendered: ReactTestRenderer | undefined;
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
afterEach(async () => { if (rendered) await act(async () => rendered!.unmount()); vi.resetAllMocks(); });
async function render() { await act(async () => { rendered = create(createElement(ProfilePhotoSettings)); }); return rendered!.root; }
it('uses the existing picker square editing and uploads accepted local bytes', async () => {
  mocks.permission.mockResolvedValue({ granted: true }); mocks.picker.mockResolvedValue({ canceled: false, assets: [{ uri: 'file:///local.png', mimeType: 'image/png', fileSize: 100 }] });
  const root = await render();
  await act(async () => root.findAll(node => String(node.type) === 'Action')[0]!.props.onPress());
  expect(mocks.picker).toHaveBeenCalledWith(expect.objectContaining({ allowsEditing: true, aspect: [1, 1] }));
  expect(mocks.change).toHaveBeenCalledWith({ uri: 'file:///local.png', mimeType: 'image/png' });
});
it('requires removal confirmation before mutating', async () => {
  const root = await render();
  await act(async () => root.findAll(node => String(node.type) === 'Action')[1]!.props.onPress());
  expect(mocks.change).not.toHaveBeenCalled();
  const actions = mocks.alert.mock.calls[0]![2];
  await act(async () => actions[1].onPress()); expect(mocks.change).toHaveBeenCalledWith();
});
it('shows permission failure and allows retry without a stuck busy state', async () => {
  mocks.permission.mockResolvedValue({ granted: false }); const root = await render();
  await act(async () => root.findAll(node => String(node.type) === 'Action')[0]!.props.onPress());
  expect(root.find(node => String(node.type) === 'Notice').props.children).toContain('Allow photo access');
  expect(root.findAll(node => String(node.type) === 'Action')[0]!.props.disabled).toBe(false); expect(mocks.change).not.toHaveBeenCalled();
});
