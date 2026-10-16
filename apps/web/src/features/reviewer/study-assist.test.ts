import { createElement } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { selectAssistBlock, type ReviewerReaderModel, type AssistRequest, type StudyToolRequest } from '@stay-focused/shared';
import { renderToStaticMarkup } from 'react-dom/server';
import { StudyText } from './study-text';

const mocks = vi.hoisted(() => ({ api: vi.fn() }));
vi.mock('../../components/providers', () => ({ useAuth: () => ({ api: mocks.api, session: { user: { id: 'owner' } } }) }));
vi.mock('../../components/ui', () => ({ Icon: 'i' }));
const { StudyAssistPanel } = await import('./study-assist-panel');
let tree: ReactTestRenderer | undefined, frames: FrameRequestCallback[], reduced: boolean, win: EventTarget;
const nodes = new Map<string, { scrollIntoView: ReturnType<typeof vi.fn>; focus: ReturnType<typeof vi.fn> }>();
let serial = 0;
const reviewer: ReviewerReaderModel = { id: 'artifact:aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', title: 'Cells', course: null, source: { id: 's', title: 'Lesson' }, generatedAt: '2026-10-16T00:00:00Z', freshness: 'current',
  sections: [{ id: 's', title: 'Cells', blocks: [{ id: 'b', title: 'Nucleus', explanation: 'The nucleus contains DNA.', keyPoints: [], evidence: [] }] }] };
const selection = selectAssistBlock(reviewer, 's', 'b')!;
beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  frames = []; reduced = false; nodes.clear(); mocks.api.mockReset(); win = new EventTarget();
  Object.assign(win, { matchMedia: () => ({ matches: reduced }) });
  vi.stubGlobal('window', win); vi.stubGlobal('HTMLElement', class {});
  vi.stubGlobal('requestAnimationFrame', (work: FrameRequestCallback) => { frames.push(work); return frames.length; });
});
afterEach(async () => { await act(async () => tree?.unmount()); tree = undefined; vi.unstubAllGlobals(); });
async function mount(initialAction?: 'explain' | 'ask' | 'test') {
  const unique = { ...selection, blockId: `b-${++serial}` };
  await act(async () => { tree = create(createElement(StudyAssistPanel, { target: { selection: unique }, passageLabel: 'Nucleus', onClose: vi.fn(), ...(initialAction ? { initialAction, initialText: 'nucleus' } : {}) }), {
    createNodeMock: element => {
      const id = (element.props as Record<string, unknown>)['data-study-answer'] as string | undefined;
      if (!id) return {};
      const node = nodes.get(id) ?? { scrollIntoView: vi.fn(), focus: vi.fn() }; nodes.set(id, node); return node;
    },
  }); });
}
function flush() { frames.splice(0).forEach(work => work(0)); }
function button(label: string) { return tree!.root.findAllByType('button').find(n => n.props.children === label && (label !== 'Ask' || n.props.className === 'primary'))!; }
function deferred() {
  let resolve!: (value: unknown) => void;
  const promise = new Promise<unknown>(done => { resolve = done; });
  mocks.api.mockReturnValue(promise);
  return async () => { const request = mocks.api.mock.calls.at(-1)![1].body as StudyToolRequest | AssistRequest;
    await act(async () => resolve({ ...('assistType' in request ? request : { action: request.action, ...(request.modifier ? { modifier: request.modifier } : {}), outcome: request.action === 'test' && (!request.modifier || request.modifier === 'choices') ? 'question' : request.modifier === 'check' ? 'checked' : 'answer', ...(request.action === 'test' ? { question: 'What does it contain?' } : {}), ...(request.modifier === 'choices' ? { choices: ['DNA', 'Water', 'Air'] } : {}), ...(request.modifier === 'check' ? { verdict: 'correct' } : {}), grounding: 'source' }), text: 'Lead\n- **DNA** is inside.', createdAt: '2026-10-16T00:00:00Z' })); };
}
it('image Ask shows thumbnail and ordered chips, sends references only, supports typed follow-ups and caches repeats',async()=>{
  const image={reference:{kind:'figure' as const,id:'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'},thumbnail:'https://private.test/image',label:'Cell diagram'};
  mocks.api.mockImplementation(async(_path:string,options:{body:StudyToolRequest})=>({action:options.body.action,outcome:'answer',grounding:'source',text:'A cell.\n- **Nucleus** holds DNA.',createdAt:'2026-10-16T00:00:00Z'}));
  await act(async()=>{tree=create(createElement(StudyAssistPanel,{target:{selection},image,passageLabel:'Cell',onClose:vi.fn()}));});
  expect(tree!.root.findByType('img').props.src).toBe(image.thumbnail);
  expect(tree!.root.findAllByType('button').filter(n=>n.props.className==='chip').map(n=>n.props.children)).toEqual(['What is this?','What does it mean?','Explain the parts','Why is it in this lesson?']);
  await act(async()=>button('What is this?').props.onClick());
  expect(mocks.api.mock.calls[0]![1].body.image).toEqual(image.reference);expect(JSON.stringify(mocks.api.mock.calls[0]![1].body)).not.toContain(image.thumbnail);
  for(const question of ['Why?', 'Which part?']) {
    await act(async()=>tree!.root.findByType('textarea').props.onChange({target:{value:question}}));
    await act(async()=>button('Ask').props.onClick());
  }
  expect(mocks.api.mock.calls[2]![1].body.followUps).toHaveLength(2);expect(tree!.root.findAllByType('textarea')).toHaveLength(0);
  await act(async()=>button('New question').props.onClick());await act(async()=>button('What is this?').props.onClick());expect(mocks.api).toHaveBeenCalledTimes(3);
});
it.each([false, true])('reveals a quick assist loading area and completion, Reduce Motion=%s', async motion => {
  reduced = motion; const finish = deferred(); await mount();
  await act(async () => tree!.root.findAllByType('button').find(n => String(n.props['aria-label']).startsWith('Summarize,'))!.props.onClick());
  expect(JSON.stringify(tree!.toJSON())).toContain('Creating your'); flush();
  expect(nodes.get('quick')!.scrollIntoView).toHaveBeenLastCalledWith({ block: 'nearest', behavior: motion ? 'instant' : 'smooth' });
  const request = mocks.api.mock.calls[0]![1].body;
  expect(request.promptVersion).toBe('study-assist-v2'); expect(nodes.get('quick')!.focus).toHaveBeenCalledWith({ preventScroll: true });
  await finish(); flush(); expect(nodes.get('quick')!.scrollIntoView).toHaveBeenCalledTimes(2);
});
it.each([false, true])('scrolls Smart Selection on press and completion unless manually scrolled: %s', async manual => {
  const finish = deferred(); await mount('explain'); flush();
  expect(nodes.get('answer')!.scrollIntoView).toHaveBeenCalledOnce();
  if (manual) win.dispatchEvent(new Event('wheel'));
  await finish(); flush();
  expect(nodes.get('answer')!.scrollIntoView).toHaveBeenCalledTimes(manual ? 1 : 2);
  expect(tree!.root.findAllByType('li')).toHaveLength(1); expect(tree!.root.findAllByType('strong').some(n => n.props.children === 'DNA')).toBe(true);
});
it('Ask exposes What is this? first and reveals suggestion and follow-up answers', async () => {
  await mount('ask'); flush();
  expect(tree!.root.findAllByType('button').filter(n => n.props.className === 'chip').map(n => n.props.children)[0]).toBe('What is this?');
  const finish = deferred(); await act(async () => button('What is this?').props.onClick()); flush();
  expect(mocks.api.mock.calls.at(-1)![1].body.question).toBe('What is this?');
  expect(nodes.get('ask-0')!.scrollIntoView).toHaveBeenCalledOnce(); await finish(); flush();
  expect(nodes.get('ask-0')!.scrollIntoView).toHaveBeenCalledTimes(2);
  const next = deferred();
  await act(async () => tree!.root.findByType('textarea').props.onChange({ target: { value: 'Why?' } }));
  await act(async () => button('Ask').props.onClick()); flush(); await next(); flush();
  expect(nodes.get('ask-1')!.scrollIntoView).toHaveBeenCalledTimes(2);
});
it('refinements reveal their new result and reduced motion jumps', async () => {
  const finish = deferred(); await mount('explain'); flush(); await finish(); flush();
  reduced = true; const next = deferred(); await act(async () => button('Simpler').props.onClick()); flush(); await next(); flush();
  expect(nodes.get('answer')!.scrollIntoView).toHaveBeenLastCalledWith({ block: 'nearest', behavior: 'instant' });
  expect(mocks.api.mock.calls.at(-1)![1].body.modifier).toBe('simpler');
});
it('Test Me reveals question, choices, checked feedback and answer explanation separately', async () => {
  const question = deferred(); await mount('test'); flush(); await question(); flush();
  expect(nodes.get('test-question')!.scrollIntoView).toHaveBeenCalledTimes(2);
  const choices = deferred(); await act(async () => button('Need choices?').props.onClick()); flush(); await choices(); flush();
  expect(nodes.get('test-choices')!.scrollIntoView).toHaveBeenCalledTimes(2);
  await act(async () => button('DNA').props.onClick());
  const checked = deferred(); await act(async () => button('Check Answer').props.onClick()); flush(); await checked(); flush();
  expect(nodes.get('test-check')!.scrollIntoView).toHaveBeenCalledTimes(2);
  const explanation = deferred(); await act(async () => button('Explain answer').props.onClick()); flush(); await explanation(); flush();
  expect(nodes.get('test-explain_answer')!.scrollIntoView).toHaveBeenCalledTimes(2);
});
it('quick-assist completion leaves a manually scrolled view alone', async () => {
  const finish = deferred(); await mount();
  await act(async () => tree!.root.findAllByType('button').find(n => String(n.props['aria-label']).startsWith('Analogy,'))!.props.onClick()); flush();
  win.dispatchEvent(new Event('touchmove')); await finish(); flush();
  expect(nodes.get('quick')!.scrollIntoView).toHaveBeenCalledOnce();
});
it('renders old paragraphs, semantic lists/bold and escapes hostile or unsupported content', () => {
  const html = renderToStaticMarkup(createElement(StudyText, { text: 'Old answer\n\nLead\n- **Term**\n1. Step\n<img src=x onerror=alert(1)>\n[link](x)' }));
  expect(html).toContain('<p>Old answer</p>'); expect(html).toContain('<ul>'); expect(html).toContain('<ol>'); expect(html).toContain('<strong>Term</strong>');
  expect(html).toContain('&lt;img'); expect(html).not.toContain('<img'); expect(html).not.toContain('<a '); expect(html).toContain('[link](x)');
});
