import { createElement } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ change: vi.fn(), crop: vi.fn(), confirm: vi.fn() }));
vi.mock('../components/providers', () => ({ useAuth: () => ({ session: { user: { email: 'a@test' } }, signOut: vi.fn(), theme: 'light', setTheme: vi.fn() }) }));
vi.mock('../components/profile-avatar', () => ({ useProfileAvatar: () => ({ url: 'https://private.test/a', initial: 'A', hasUpload: true, change: mocks.change }) }));
vi.mock('../lib/crop-avatar', () => ({ cropAvatar: mocks.crop }));
vi.mock('../components/ui', () => ({ Heading: 'Heading', Notice: 'Notice', RowLink: 'RowLink' }));
vi.mock('./notification-settings', () => ({ NotificationSettings: () => null }));
import { SettingsScreen } from './settings';
let rendered: ReactTestRenderer | undefined;
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
afterEach(async () => { if (rendered) await act(async () => rendered!.unmount()); vi.resetAllMocks(); vi.unstubAllGlobals(); });
async function render() {
  vi.stubGlobal('window', { confirm: mocks.confirm });
  await act(async () => { rendered = create(createElement(SettingsScreen)); }); return rendered!.root;
}
it('crops a chosen file before upload and clears the file input for reselection', async () => {
  const cropped = new Blob(['cropped'], { type: 'image/png' }); mocks.crop.mockResolvedValue(cropped);
  const root = await render(), target = { files: [{ name: 'local.png' }], value: 'local.png' };
  await act(async () => root.findByType('input').props.onChange({ target }));
  expect(target.value).toBe(''); expect(mocks.crop).toHaveBeenCalledWith(target.files[0]); expect(mocks.change).toHaveBeenCalledWith(cropped);
});
it('only removes after confirmation and recovers from a failed upload', async () => {
  const root = await render();
  const button = () => root.findAllByType('button').find(node => node.children.includes('Remove photo'))!;
  mocks.confirm.mockReturnValue(false); await act(async () => button().props.onClick()); expect(mocks.change).not.toHaveBeenCalled();
  mocks.confirm.mockReturnValue(true); await act(async () => button().props.onClick()); expect(mocks.change).toHaveBeenCalledWith(undefined);
  mocks.crop.mockRejectedValue(new Error('Choose a photo under 2 MB.'));
  await act(async () => root.findByType('input').props.onChange({ target: { files: [{}], value: 'file' } }));
  expect(root.find(node => String(node.type) === 'Notice').props.children).toContain('2 MB');
  expect(button().props.disabled).toBe(false);
});
