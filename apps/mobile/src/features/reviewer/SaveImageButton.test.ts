import { createElement } from 'react';
import { act, create } from 'react-test-renderer';
import { expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ save: vi.fn(), alert: vi.fn(), settings: vi.fn() }));
vi.mock('react-native', () => ({ Pressable: 'Pressable', Text: 'Text', Alert: { alert: mocks.alert } }));
vi.mock('lucide-react-native', () => ({ Download: 'Download' }));
vi.mock('../../design/theme', () => ({ useTheme: () => ({ colors: { accent: 'blue' } }) }));
vi.mock('./saveImage', () => ({ saveImage: mocks.save }));
const { SaveImageButton } = await import('./SaveImageButton');
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
