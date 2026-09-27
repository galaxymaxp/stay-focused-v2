import { createElement } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ASSIST_TYPES, assistRequest, selectAssistBlock } from '@stay-focused/shared';
import { reviewerDetail } from '../../services/localLibrary/localLibrary.testSupport';

vi.mock('react-native', () => ({ View: 'View', Text: 'Text', TextInput: 'TextInput', Pressable: 'Pressable', ScrollView: 'ScrollView',
  Vibration: { vibrate: vi.fn() }, useWindowDimensions: () => ({ width: 360, height: 800 }),
  Animated: { View: 'AnimatedView', Value: class { setValue() {} stopAnimation() {} interpolate() { return 1; } },
    timing: () => ({ start: (done?: () => void) => done?.() }), multiply: () => 1 },
}));
vi.mock('lucide-react-native', () => ({ ChevronDown: 'ChevronDown', ChevronUp: 'ChevronUp', FileQuestion: 'FileQuestion' }));
vi.mock('../../design/primitives', () => ({ Action: 'Action', Copy: 'Copy', Notice: 'Notice', Page: 'Page', SearchField: 'SearchField', SegmentedControl: 'SegmentedControl', Sheet: 'Sheet', Surface: 'Surface' }));
vi.mock('expo-router', () => ({ router: { push: vi.fn() } }));
vi.mock('../../auth', () => ({ useAuth: () => ({ session: { user: { id: 'owner' }, accessToken: 'test' } }) }));
vi.mock('../../config/apiBaseUrl', () => ({ getApiBaseUrl: () => 'https://example.test' }));
vi.mock('../../services/generationRecovery', () => ({ createGenerationIntent: vi.fn() }));
vi.mock('../../design/theme', async () => {
  const tokens = await import('../../design/themeTokens');
  return { ...tokens, useTheme: () => ({ colors: tokens.palettes.light, mode: 'light', reducedMotion: true }) };
});
vi.mock('../../services/studyAssist', async importOriginal => {
  const original = await importOriginal<typeof import('../../services/studyAssist')>();
  return { ...original, studyAssist: { request: vi.fn() } };
});
const { ReviewerReaderScreen } = await import('./ReviewerReader');
const { StudyAssistSheet } = await import('./StudyAssistSheet');
const { studyAssist, StudyAssistError } = await import('../../services/studyAssist');
let rendered: ReactTestRenderer | undefined;
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
afterEach(async () => { if (rendered) await act(async () => rendered!.unmount()); rendered = undefined; vi.clearAllMocks(); });
const detail = reviewerDetail();
const reviewer = ('reviewer' in detail ? detail.reviewer : null)!;
const selection = selectAssistBlock(reviewer, reviewer.sections[0]!.id, reviewer.sections[0]!.blocks[0]!.id)!;
function nodes(type: string) { return rendered!.root.findAll(node => String(node.type) === type); }
describe('Reviewer Study Assist interaction', () => {
  it('opens from meaningful content, shows four actions, dismisses, and leaves canonical text unchanged', async () => {
    const before = JSON.stringify(reviewer);
    await act(async () => { rendered = create(createElement(ReviewerReaderScreen, { artifact: detail.artifact, reviewer, deviceCopy: true })); });
    expect(studyAssist.request).not.toHaveBeenCalled();
    const text = nodes('Text').find(node => node.props.children === selection.block.explanation)!;
    expect(text.props.accessibilityRole).toBe('button');
    await act(async () => text.props.onPress());
    const sheet = nodes('Sheet').find(node => node.props.title === 'Study Assist')!;
    expect(sheet).toBeDefined();
    expect(nodes('Action').map(node => node.props.children)).toEqual(expect.arrayContaining(['Summarize', 'Explain simply', 'Analogy', 'Example']));
    expect(studyAssist.request).not.toHaveBeenCalled();
    await act(async () => sheet.props.onClose());
    expect(nodes('Sheet')).toHaveLength(0);
    expect(JSON.stringify(reviewer)).toBe(before);
    const title = nodes('Text').find(node => node.props.children === reviewer.sections[0]!.title);
    expect(title?.props.onPress).toBeUndefined();
  });
  it.each(ASSIST_TYPES)('requests %s explicitly and labels the result as AI assistance', async type => {
    vi.mocked(studyAssist.request).mockResolvedValue({ ...assistRequest(selection, type), text: 'A helpful explanation.', createdAt: '2026-09-27T00:00:00Z' });
    await act(async () => { rendered = create(createElement(StudyAssistSheet, { selection, onClose: vi.fn() })); });
    expect(studyAssist.request).not.toHaveBeenCalled();
    await act(async () => nodes('Action')[ASSIST_TYPES.indexOf(type)]!.props.onPress());
    expect(studyAssist.request).toHaveBeenCalledWith('owner', expect.anything(), selection, type);
    expect(JSON.stringify(rendered!.toJSON())).toContain('AI ');
    expect(JSON.stringify(rendered!.toJSON())).toContain('A helpful explanation.');
  });
  it('keeps the sheet dismissible while generation is running and ignores completion after dismissal', async () => {
    let finish!: (value: Awaited<ReturnType<typeof studyAssist.request>>) => void;
    vi.mocked(studyAssist.request).mockReturnValue(new Promise(resolve => { finish = resolve; }));
    const onClose = vi.fn();
    await act(async () => { rendered = create(createElement(StudyAssistSheet, { selection, onClose })); });
    await act(async () => nodes('Action')[0]!.props.onPress());
    expect(JSON.stringify(rendered!.toJSON())).toContain('You can close this sheet');
    await act(async () => nodes('Sheet')[0]!.props.onClose());
    expect(onClose).toHaveBeenCalledOnce();
    await act(async () => rendered!.unmount()); rendered = undefined;
    await act(async () => finish({ ...assistRequest(selection, 'summarize'), text: 'Done', createdAt: '2026-09-27T00:00:00Z' }));
  });
  it('shows a calm error without changing the selected content', async () => {
    vi.mocked(studyAssist.request).mockRejectedValue(new StudyAssistError('Connect to the internet once to generate this explanation.'));
    await act(async () => { rendered = create(createElement(StudyAssistSheet, { selection, onClose: vi.fn() })); });
    await act(async () => nodes('Action')[0]!.props.onPress());
    expect(nodes('Notice')[0]!.props.children).toContain('Connect to the internet once');
    expect(JSON.stringify(rendered!.toJSON())).toContain(selection.block.explanation);
  });
  it('handles a removed block without a generation call', async () => {
    await act(async () => { rendered = create(createElement(StudyAssistSheet, { selection: null, onClose: vi.fn() })); });
    expect(nodes('Notice')[0]!.props.children).toContain('no longer available');
    expect(studyAssist.request).not.toHaveBeenCalled();
  });
});
