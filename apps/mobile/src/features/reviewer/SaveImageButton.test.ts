import { createElement } from 'react';
import { act, create } from 'react-test-renderer';
import { beforeEach, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ save: vi.fn(), alert: vi.fn(), settings: vi.fn() }));
vi.mock('react-native', () => ({ Pressable: 'Pressable', Text: 'Text', Alert: { alert: mocks.alert } }));
vi.mock('lucide-react-native', () => ({ Download: 'Download' }));
vi.mock('../../design/theme', () => ({ useTheme: () => ({ colors: { accent: 'blue' } }) }));
vi.mock('./saveImage', () => ({ saveImage: mocks.save }));
const { SaveImageButton } = await import('./SaveImageButton');
beforeEach(() => { vi.resetAllMocks(); Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true }); });
it('denial displays the actionable Open settings button and offline disables saving', async () => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  mocks.save.mockResolvedValue({ status: 'denied', message: 'Allow photo access.', openSettings: mocks.settings }); mocks.settings.mockResolvedValue(undefined);
  const props = { image: { uri: 'https://image.test/a.png', reviewerTitle: 'Bio', sectionTitle: 'Cells', kind: 'figure' as const }, offline: false, refreshUri:vi.fn(async()=>'https://image.test/fresh.png') };
  let tree!: ReturnType<typeof create>;
  await act(async () => { tree = create(createElement(SaveImageButton, props)); });
  try {
    await act(async () => tree.root.findByType('Pressable' as never).props.onPress());
    expect(mocks.save).toHaveBeenCalledWith(props.image,props.refreshUri);
    const actions = mocks.alert.mock.calls[0]![2] as { text: string; onPress?: () => void }[];
    actions.find(a => a.text === 'Open settings')!.onPress!(); expect(mocks.settings).toHaveBeenCalledOnce();
    await act(async () => tree.update(createElement(SaveImageButton, { ...props, offline: true })));
    expect(tree.root.findByType('Pressable' as never).props.disabled).toBe(true);
  } finally { await act(async () => tree.unmount()); }
});

it.each([
  ['download_http_403', "Couldn't download the image"],
  ['media_write', "Couldn't write to your gallery"],
  ['module_missing', 'Update the app to save images'],
  ['permission', 'Allow photo access in settings to save study images.'],
] as const)('displays the plain-language %s failure notice and leaves Save available', async (stage, message) => {
  mocks.save.mockResolvedValue({ status: 'failed', stage, message });
  let tree!: ReturnType<typeof create>;
  await act(async () => { tree = create(createElement(SaveImageButton, {
    image: { uri: 'https://image.test/a.png?private=token', reviewerTitle: 'Bio', sectionTitle: 'Cells', kind: 'figure' }, offline: false,
  })); });
  try {
    await act(async () => tree.root.findByType('Pressable' as never).props.onPress());
    expect(mocks.alert).toHaveBeenCalledExactlyOnceWith('Save image', message, [{ text: 'OK' }]);
    expect(tree.root.findByType('Pressable' as never).props.disabled).toBe(false);
    expect(tree.root.findByType('Pressable' as never).props.accessibilityState.busy).toBe(false);
  } finally { await act(async () => tree.unmount()); }
});
