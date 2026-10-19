import { createElement } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, expect, it, vi } from 'vitest';
import { CircleHelp, Download } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';
import { ImageActions } from './ImageActions';
import { STUDY_OFFLINE } from '@stay-focused/shared';

vi.mock('lucide-react-native', () => ({ CircleHelp: 'CircleHelp', Download: 'Download' }));
vi.mock('react-native', () => ({ Pressable: 'Pressable', Text: 'Text', View: 'View' }));
vi.mock('../../design/theme', () => ({ useTheme: () => ({ colors: { accent: 'blue', textMuted: 'gray' } }) }));
vi.mock('./saveImage', () => ({ saveImage: vi.fn() }));
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
let tree: ReactTestRenderer | undefined;
afterEach(async () => { if (tree) await act(async () => tree!.unmount()); tree = undefined; });

it.each([false, true])('stacks equal full-width Ask/Save rows with matching vector icons; offline=%s', async offline => {
  await act(async () => { tree = create(createElement(ImageActions, { offline, onAsk: vi.fn(),
    image: { reference: { kind: 'figure', id: 'figure' }, thumbnail: 'file:///fixture', label: 'Cell' },
    download: { uri: 'file:///fixture', kind: 'figure', reviewerTitle: 'Reviewer', sectionTitle: 'Cell' } })); });
  const buttons = tree!.root.findAllByType(Pressable);
  expect(buttons.map(node => node.props.accessibilityLabel)).toEqual(['Ask about this image', 'Save image']);
  expect(buttons[0]!.props.style).toEqual(buttons[1]!.props.style);
  expect(buttons[0]!.props.style.width).toBe('100%');
  expect(buttons.map(node => node.findByType(Text).props.style)).toEqual([
    { color: 'blue', fontSize: 15, fontWeight: '400' }, { color: 'blue', fontSize: 15, fontWeight: '400' },
  ]);
  expect(tree!.root.findByType(CircleHelp).props).toEqual(tree!.root.findByType(Download).props);
  expect(tree!.root.findAllByType(View).some(node => node.props.style.flexDirection === 'column' && node.props.style.gap === 8)).toBe(true);
  const notes = tree!.root.findAllByType(Text).filter(node => node.props.children === STUDY_OFFLINE);
  expect(notes).toHaveLength(offline ? 1 : 0);
  if (offline) expect(tree!.root.findByType(View).children.at(-1)).toBe(notes[0]);
});
