import { createElement } from 'react';
import { act, create } from 'react-test-renderer';
import { expect, it, vi } from 'vitest';
import type { DeterministicStudyPlan } from '@stay-focused/shared/task-planning';
import { localMinuteIso } from '@stay-focused/shared';
import { PlanPreview } from './PlanPreview';
vi.mock('react-native', () => ({ View: 'View' }));
vi.mock('../../design/primitives', () => ({ Action: 'Action', Copy: 'Copy', Surface: 'Surface' }));
vi.mock('../../design/theme', async () => { const { palettes } = await import('../../design/themeTokens'); return { useTheme: () => ({ colors: palettes.light }) }; });
vi.mock('./DayRingClock', () => ({ formatFreeTime: (minutes: number) => String(minutes) }));
it('places an after-midnight session inside the proportional preview with a positive width', async () => {
 Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
 const plan: DeterministicStudyPlan = { algorithmVersion: 'deterministic-v1', planningRange: { startsAt: localMinuteIso('2026-10-17', 0), endsAt: localMinuteIso('2026-10-18', 240) },
 availability: [], unscheduledWork: [], sessions: [{ proposalId: 's', taskId: 't', taskTitle: 'Study', startsAt: localMinuteIso('2026-10-18', 60), endsAt: localMinuteIso('2026-10-18', 120), durationMinutes: 60, scheduledAfterDeadline: false }] };
 let tree: ReturnType<typeof create>;
 await act(async () => { tree = create(createElement(PlanPreview, { plan, from: 1320, to: 240, busy: false, onApply: vi.fn(), onDiscard: vi.fn() })); });
 const block = tree!.root.find(node => node.props.style?.left === '50%' && typeof node.props.style?.width === 'string');
 expect(parseFloat(block.props.style.width)).toBeCloseTo(100 / 6);
 await act(async () => tree!.unmount());
});
