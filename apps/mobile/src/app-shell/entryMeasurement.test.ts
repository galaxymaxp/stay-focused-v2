import { createElement } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { expect, it, vi } from 'vitest';
import { localMeasurements, type LocalMeasurement } from '@stay-focused/shared';
import { Redirect } from 'expo-router';
import { RestoringState } from './RestoringState';
import IndexRoute from '../../app/index';

const fake = vi.hoisted(() => ({ restoring: true, signedIn: true }));
vi.mock('expo-router', () => ({ Redirect: 'Redirect' }));
vi.mock('../auth', () => ({ useAuth: () => ({ isRestoring: fake.restoring, session: fake.signedIn ? { user: { id: 'private-owner' } } : null }) }));
vi.mock('./RestoringState', () => ({ RestoringState: 'RestoringState' }));

it('preserves restoring/signed-in/signed-out entry decisions with deterministic private-free timing', async () => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  const events: LocalMeasurement[] = []; let tick = 10;
  const remove = localMeasurements.observe({ now: () => tick += 3, sink: event => { events.push(event); } });
  let rendered: ReactTestRenderer | undefined;
  try {
    await act(async () => { rendered = create(createElement(IndexRoute)); });
    expect(rendered!.root.findByType(RestoringState).type).toBe(RestoringState);
    fake.restoring = false; await act(async () => rendered!.update(createElement(IndexRoute)));
    expect(rendered!.root.findByType(Redirect).props.href).toBe('/today');
    fake.signedIn = false; await act(async () => rendered!.update(createElement(IndexRoute)));
    expect(rendered!.root.findByType(Redirect).props.href).toBe('/sign-in');
    expect(events).toEqual(['empty', 'success', 'success'].map(outcome => ({ name: 'startup.entry_decision', outcome, durationMs: 3 })));
    expect(JSON.stringify(events)).not.toMatch(/private|today|sign-in/);
  } finally { await act(async () => rendered?.unmount()); remove(); }
});
