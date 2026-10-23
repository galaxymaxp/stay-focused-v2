import { createElement } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { CourseOptions } from './course-options';

let tree: ReactTestRenderer;
beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  vi.stubGlobal('document', new EventTarget());
});
afterEach(async () => { await act(async () => tree?.unmount()); vi.unstubAllGlobals(); });
async function mount(past = false, disabled = false) {
  const move = vi.fn();
  await act(async () => { tree = create(createElement(CourseOptions, { title: 'Test course', past, disabled, onMove: move })); });
  return move;
}
const trigger = () => tree.root.findAllByType('button')[0]!;
it('toggles its controlled disclosure and closes after the existing move action', async () => {
  const move = await mount();
  expect(trigger().props['aria-expanded']).toBe(false);
  await act(async () => trigger().props.onClick());
  expect(trigger().props['aria-expanded']).toBe(true);
  expect(trigger().props).toMatchObject({ 'aria-label': 'Course options for Test course', 'aria-haspopup': 'menu' });
  expect(tree.root.findByProps({ role: 'menu' }).props.id).toBe(trigger().props['aria-controls']);
  const action = tree.root.findAllByType('button')[1]!;
  expect(action.props.children).toBe('Move to past courses');
  await act(async () => action.props.onClick());
  expect(move).toHaveBeenCalledOnce();
  expect(trigger().props['aria-expanded']).toBe(false);
});
it('preserves past-course action and the action busy guard', async () => {
  await mount(true, true);
  await act(async () => trigger().props.onClick());
  expect(tree.root.findAllByType('button')[1]!.props).toMatchObject({ disabled: true, children: 'Move to current' });
});
it('closes on Escape, outside pointer press, and focus leaving the disclosure', async () => {
  await mount();
  for (const type of ['keydown', 'pointerdown', 'focusin']) {
    await act(async () => trigger().props.onClick());
    const event = new Event(type);
    if (type === 'keydown') Object.defineProperty(event, 'key', { value: 'Escape' });
    await act(async () => { document.dispatchEvent(event); });
    expect(trigger().props['aria-expanded']).toBe(false);
  }
});
it('exposes only Library Pin/Unpin with selected state and guards disabled activation', async () => {
  const pin = vi.fn();
  await act(async () => { tree = create(createElement(CourseOptions, { title: 'Personal & other', pinned: true, onPin: pin })); });
  await act(async () => trigger().props.onClick());
  const item = tree.root.findByProps({ role: 'menuitemcheckbox' });
  expect(item.props).toMatchObject({ 'aria-checked': true, 'aria-label': 'Unpin Personal & other', children: 'Unpin' });
  expect(pin).not.toHaveBeenCalled();
  await act(async () => item.props.onClick()); expect(pin).toHaveBeenCalledOnce();
  await act(async () => tree.update(createElement(CourseOptions, { title: 'Personal & other', pinned: false, onPin: pin, disabled: true })));
  await act(async () => trigger().props.onClick());
  await act(async () => tree.root.findByProps({ role: 'menuitemcheckbox' }).props.onClick());
  expect(pin).toHaveBeenCalledOnce(); expect(trigger().props['aria-expanded']).toBe(true);
});
