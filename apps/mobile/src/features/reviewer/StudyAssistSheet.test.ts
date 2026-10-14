import { createElement } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ASSIST_TYPES, assistRequest, selectAssistBlock } from '@stay-focused/shared';
import { reviewerDetail } from '../../services/localLibrary/localLibrary.testSupport';
import { createGenerationIntent } from '../../services/generationRecovery';

vi.mock('./SourcePageSnapshot', () => ({ SourcePageSnapshot: 'SourcePageSnapshot' }));
const figures=vi.hoisted(()=>({available:new Set<string>(),online:false}));
vi.mock('./SourceFigures',()=>({
  SourceFigures:(props:{hasFigures:boolean;offline:boolean})=>props.hasFigures&&!props.offline?createElement('SourceFigures',props):null,
  useFigureAvailability:(_client:unknown,_id:unknown,offline:boolean)=>Object.assign(offline?new Set():figures.available,{online:!offline&&figures.online}),
}));
vi.mock('react-native', () => ({ View: 'View', Text: 'Text', TextInput: 'TextInput', Pressable: 'Pressable', ScrollView: 'ScrollView', ActivityIndicator: 'ActivityIndicator',
  Easing: { inOut: () => undefined, quad: undefined },
  Vibration: { vibrate: vi.fn() }, useWindowDimensions: () => ({ width: 360, height: 800 }),
  Animated: { View: 'AnimatedView', Value: class { setValue() {} stopAnimation() {} interpolate() { return 1; } },
    timing: () => ({ start: (done?: () => void) => done?.() }), multiply: () => 1, spring: () => ({ start: () => {} }),
    loop: () => ({ start: () => {}, stop: () => {} }), sequence: () => ({}) },
}));
vi.mock('lucide-react-native', () => Object.fromEntries(['ChevronDown', 'ChevronUp', 'FileQuestion', 'CheckCircle2', 'Circle', 'Sparkles', 'X', 'AlertCircle',
  'AlignLeft', 'ArrowLeftRight', 'Check', 'FlaskConical', 'Lightbulb', 'RotateCcw'].map(name => [name, name])));
vi.mock('../../design/primitives', () => ({ Action: 'Action', Copy: 'Copy', Notice: 'Notice', Page: 'Page', SearchField: 'SearchField', SegmentedControl: 'SegmentedControl', Sheet: 'Sheet', Surface: 'Surface', SkeletonBlock: 'SkeletonBlock' }));
vi.mock('../../design/haptics', () => ({ haptic: { tap: vi.fn(), select: vi.fn(), press: vi.fn(), success: vi.fn(), warning: vi.fn(), error: vi.fn() } }));
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
  return { ...original, studyAssist: { request: vi.fn(), peek: vi.fn(async () => null) } };
});
const { ReviewerReaderScreen } = await import('./ReviewerReader');
const { StudyAssistSheet } = await import('./StudyAssistSheet');
const { studyAssist, StudyAssistError } = await import('../../services/studyAssist');
const { assistStore } = await import('./assistStore');
let rendered: ReactTestRenderer | undefined;
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
afterEach(async () => { if (rendered) await act(async () => rendered!.unmount()); rendered = undefined; vi.clearAllMocks(); assistStore.reset(); figures.available.clear(); figures.online=false; });
const detail = reviewerDetail();
const reviewer = ('reviewer' in detail ? detail.reviewer : null)!;
const selection = selectAssistBlock(reviewer, reviewer.sections[0]!.id, reviewer.sections[0]!.blocks[0]!.id)!;
const target = { selection };
describe('snapshot discovery for persisted reviewer headers', () => {
  it('offers external search only after online source discovery and hides it for source visuals/offline',async()=>{
    figures.online=true;
    const props={artifact:detail.artifact,reviewer,deviceCopy:false};
    const externalButtons=()=>rendered!.root.findAll(node=>node.props.accessibilityLabel==='Find a visual');
    await act(async()=>{rendered=create(createElement(ReviewerReaderScreen,props));});
    expect(externalButtons()).toHaveLength(0);
    const snapshot=rendered!.root.findAll(node=>String(node.type)==='SourcePageSnapshot')[0]!;
    await act(async()=>snapshot.props.onAvailability(false));expect(externalButtons()).toHaveLength(1);
    await act(async()=>snapshot.props.onAvailability(true));expect(externalButtons()).toHaveLength(0);
    await act(async()=>snapshot.props.onAvailability(false));expect(externalButtons()).toHaveLength(1);
    figures.available.add(reviewer.sections[0]!.id);
    await act(async()=>rendered!.update(createElement(ReviewerReaderScreen,props)));expect(externalButtons()).toHaveLength(0);
    figures.available.clear();figures.online=false;
    await act(async()=>rendered!.update(createElement(ReviewerReaderScreen,props)));expect(externalButtons()).toHaveLength(0);
    figures.online=true;await act(async()=>rendered!.update(createElement(ReviewerReaderScreen,{...props,deviceCopy:true})));expect(externalButtons()).toHaveLength(0);
  });
  it('uses batched figure availability per header and keeps the page fallback for other sections',async()=>{
    figures.available.add(reviewer.sections[0]!.id);
    await act(async()=>{rendered=create(createElement(ReviewerReaderScreen,{artifact:detail.artifact,reviewer,deviceCopy:false}));});
    const icons=rendered!.root.findAll(node=>String(node.type)==='SourceFigures');
    expect(icons).toHaveLength(1);expect(icons[0]!.props.sectionId).toBe(reviewer.sections[0]!.id);
    expect(rendered!.root.findAll(node=>String(node.type)==='SourcePageSnapshot')).toHaveLength(reviewer.sections.length-1);
    await act(async()=>rendered!.update(createElement(ReviewerReaderScreen,{artifact:detail.artifact,reviewer,deviceCopy:true})));
    expect(rendered!.root.findAll(node=>String(node.type)==='SourceFigures')).toHaveLength(0);
  });
  it.each([['canvas_file', true], [null, true], ['local_file', true], ['canvas_page', false]] as const)
    ('uses server classification for source type %s', async (sourceType, discover) => {
      await act(async () => { rendered = create(createElement(ReviewerReaderScreen, {
        artifact: { ...detail.artifact, sourceType }, reviewer, deviceCopy: false,
      })); });
      expect(rendered!.root.findAll(node => String(node.type) === 'SourcePageSnapshot').length > 0).toBe(discover);
    });
});
function nodes(type: string) { return rendered!.root.findAll(node => String(node.type) === type); }
/** The four option tiles, in ASSIST_TYPES order. */
function tiles() { return nodes('Pressable').filter(node => node.props.accessibilityState && 'busy' in node.props.accessibilityState); }
describe('Reviewer Quiz Matching capacity', () => {
  const source = { ...reviewer, sections: Array.from({ length: 2 }, (_, sectionIndex) => ({
    id: `section-${sectionIndex + 1}`, title: `Topic ${sectionIndex + 1}`,
    blocks: [{ id: `block-${sectionIndex + 1}`, title: 'Overview', explanation: 'Explicit technical definitions.', evidence: [],
      keyPoints: Array.from({ length: 9 }, (_, index) => `Protocol ${sectionIndex * 9 + index + 1}: A distinct source definition.`) }],
  })) };
  async function open() {
    await act(async () => { rendered = create(createElement(ReviewerReaderScreen, { artifact: detail.artifact, reviewer: source, deviceCopy: false, openQuizInitially: true })); });
  }
  async function format(label: string) {
    const radio = nodes('Pressable').find(node => node.props.accessibilityRole === 'radio' && node.findAll(child => String(child.type) === 'Copy').some(child => child.props.children === label))!;
    await act(async () => radio.props.onPress());
  }
  const countControl = () => nodes('SegmentedControl')[0]!;
  const copy = () => nodes('Copy').map(node => String(node.props.children)).join('\n');
  const footer = () => nodes('Sheet').find(node => node.props.title === 'New Quiz')!.props.footer;
  it('caps the count choices and outgoing Matching-only request at six', async () => {
    await open();
    expect(countControl().props.value).toBe('10');
    await format('Matching');
    expect(copy()).toContain('This reviewer supports up to 6 Matching questions.');
    expect(countControl().props.value).toBe('6');
    expect(countControl().props.segments).toEqual([{ value: '6', label: '6 max' }, { value: 'custom', label: 'Custom' }]);
    vi.mocked(createGenerationIntent).mockResolvedValue({ key: 'test-intent' } as Awaited<ReturnType<typeof createGenerationIntent>>);
    await act(async () => footer().props.onPress());
    expect(createGenerationIntent).toHaveBeenCalledWith('owner', expect.objectContaining({ body: expect.objectContaining({ questionCount: 6, questionTypes: ['matching'] }) }));
  });
  it('caps a custom count when Matching is selected', async () => {
    await open();
    await act(async () => countControl().props.onChange('custom'));
    expect(nodes('TextInput').find(node => node.props.keyboardType === 'number-pad')!.props.value).toBe('25');
    await format('Matching');
    expect(nodes('TextInput').find(node => node.props.keyboardType === 'number-pad')!.props).toMatchObject({ value: '6', accessibilityLabel: 'Custom question count, 5 to 6' });
  });
  it('blocks Matching when the selected topic supports fewer than five items', async () => {
    await open(); await format('Matching');
    const toggle = nodes('Action').find(node => String(node.props.children).startsWith('Select Topics'))!;
    await act(async () => toggle.props.onPress());
    const topic = nodes('Pressable').find(node => node.props.accessibilityRole === 'checkbox' && node.props.accessibilityLabel === 'Topic 2')!;
    await act(async () => topic.props.onPress());
    expect(copy()).toContain('This reviewer supports up to 3 Matching questions.');
    expect(footer().props.disabled).toBe(true);
    await act(async () => footer().props.onPress());
    expect(createGenerationIntent).not.toHaveBeenCalled();
  });
  it('preserves the original Mixed capacity and restores it after changing format', async () => {
    await open();
    const original = countControl().props.segments;
    expect(original).toContainEqual({ value: '36', label: '36 max' });
    await format('Matching'); await format('Mixed');
    expect(countControl().props.segments).toEqual(original);
    expect(countControl().props.value).toBe('10');
    expect(copy()).not.toContain('Matching questions.');
  });
});

describe('Reviewer Study Assist interaction', () => {
  it('renders a Reviewer section with zero emphasis as readable plain text', async () => {
    const plain = { ...reviewer, sections: reviewer.sections.map(section => ({ ...section,
      blocks: section.blocks.map(block => ({ ...block, emphasis: [] })) })) };
    await act(async () => { rendered = create(createElement(ReviewerReaderScreen, { artifact: detail.artifact, reviewer: plain, deviceCopy: true })); });
    expect(nodes('Text').some(node => node.props.children === plain.sections[0]!.blocks[0]!.explanation)).toBe(true);
    expect(nodes('Text').some(node => node.props.children === plain.sections[0]!.blocks[0]!.keyPoints[0])).toBe(true);
  });
  it('opens from meaningful content, shows four actions, dismisses, and leaves canonical text unchanged', async () => {
    const before = JSON.stringify(reviewer);
    await act(async () => { rendered = create(createElement(ReviewerReaderScreen, { artifact: detail.artifact, reviewer, deviceCopy: true })); });
    expect(studyAssist.request).not.toHaveBeenCalled();
    const text = nodes('Text').find(node => node.props.children === selection.block.explanation)!;
    expect(text.props.accessibilityRole).toBe('button');
    await act(async () => text.props.onPress());
    const sheet = nodes('Sheet').find(node => node.props.title === 'Study Assist')!;
    expect(sheet).toBeDefined();
    expect(tiles().map(node => String(node.props.accessibilityLabel).split(',')[0])).toEqual(['Summarize', 'Explain simply', 'Analogy', 'Example']);
    expect(studyAssist.request).not.toHaveBeenCalled();
    await act(async () => sheet.props.onClose());
    expect(nodes('Sheet')).toHaveLength(0);
    expect(JSON.stringify(reviewer)).toBe(before);
    const title = nodes('Text').find(node => node.props.children === reviewer.sections[0]!.title);
    expect(title?.props.onPress).toBeUndefined();
  });
  it.each(ASSIST_TYPES)('requests %s explicitly and labels the result as AI assistance', async type => {
    vi.mocked(studyAssist.request).mockResolvedValue({ ...assistRequest(selection, type), text: 'A helpful explanation.', createdAt: '2026-09-27T00:00:00Z' });
    await act(async () => { rendered = create(createElement(StudyAssistSheet, { target, onClose: vi.fn() })); });
    expect(studyAssist.request).not.toHaveBeenCalled();
    await act(async () => tiles()[ASSIST_TYPES.indexOf(type)]!.props.onPress());
    expect(studyAssist.request).toHaveBeenCalledWith('owner', expect.anything(), selection, type, undefined, undefined);
    expect(JSON.stringify(rendered!.toJSON())).toContain('AI ');
    expect(JSON.stringify(rendered!.toJSON())).toContain('A helpful explanation.');
  });
  it('keeps the sheet dismissible while generation is running and ignores completion after dismissal', async () => {
    let finish!: (value: Awaited<ReturnType<typeof studyAssist.request>>) => void;
    vi.mocked(studyAssist.request).mockReturnValue(new Promise(resolve => { finish = resolve; }));
    const onClose = vi.fn();
    await act(async () => { rendered = create(createElement(StudyAssistSheet, { target, onClose })); });
    await act(async () => tiles()[0]!.props.onPress());
    expect(JSON.stringify(rendered!.toJSON())).toContain('You can close this');
    await act(async () => nodes('Sheet')[0]!.props.onClose());
    expect(onClose).toHaveBeenCalledOnce();
    await act(async () => rendered!.unmount()); rendered = undefined;
    await act(async () => finish({ ...assistRequest(selection, 'summarize'), text: 'Done', createdAt: '2026-09-27T00:00:00Z' }));
  });
  it('shows a calm error without changing the selected content', async () => {
    vi.mocked(studyAssist.request).mockRejectedValue(new StudyAssistError('Connect to the internet once to generate this explanation.'));
    await act(async () => { rendered = create(createElement(StudyAssistSheet, { target, onClose: vi.fn() })); });
    await act(async () => tiles()[0]!.props.onPress());
    expect(nodes('Notice')[0]!.props.children).toContain('Connect to the internet once');
    expect(JSON.stringify(rendered!.toJSON())).toContain(selection.block.explanation);
  });
  it('handles a removed block without a generation call', async () => {
    await act(async () => { rendered = create(createElement(StudyAssistSheet, { target: null, onClose: vi.fn() })); });
    expect(nodes('Notice')[0]!.props.children).toContain('no longer available');
    expect(studyAssist.request).not.toHaveBeenCalled();
  });
});
