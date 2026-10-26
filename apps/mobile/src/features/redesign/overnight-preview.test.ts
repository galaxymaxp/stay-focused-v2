import { createElement } from 'react';
import { act, create } from 'react-test-renderer';
import { expect, it, vi } from 'vitest';
import type { DeterministicStudyPlan } from '@stay-focused/shared/task-planning';
import { localMinuteIso } from '@stay-focused/shared';
import { PlanPreview } from './PlanPreview';
vi.mock('lucide-react-native', () => ({ EyeOff: 'EyeOff', X: 'X' }));
vi.mock('react-native', () => ({ View: 'View', Pressable: 'Pressable' }));
vi.mock('../../design/primitives', () => ({ Action: 'Action', ContentIcon: 'ContentIcon', Copy: 'Copy', Surface: 'Surface' }));
vi.mock('../../design/theme', async () => { const { palettes } = await import('../../design/themeTokens'); return { useTheme: () => ({ colors: palettes.light }) }; });
vi.mock('./DayRingClock', () => ({ formatFreeTime: (minutes: number) => String(minutes) }));
it('keeps an after-midnight session in the timeline and scales its fit segment to the overnight window', async () => {
 Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
 const plan: DeterministicStudyPlan = { algorithmVersion: 'deterministic-v1', planningRange: { startsAt: localMinuteIso('2026-10-17', 0), endsAt: localMinuteIso('2026-10-18', 240) },
 availability: [], unscheduledWork: [], sessions: [{ proposalId: 's', taskId: 't', taskTitle: 'Study', startsAt: localMinuteIso('2026-10-18', 60), endsAt: localMinuteIso('2026-10-18', 120), durationMinutes: 60, scheduledAfterDeadline: false }] };
 let tree: ReturnType<typeof create>;
 await act(async () => { tree = create(createElement(PlanPreview, { plan, from: 1320, to: 240, busy: false, onApply: vi.fn(), onDiscard: vi.fn() })); });
 const block = tree!.root.find(node => node.props['data-testid'] === 'fit-segment' || node.props.testID === 'fit-segment');
 expect(parseFloat(block.props.style.width)).toBeCloseTo(100 / 6);
 expect(JSON.stringify(tree!.toJSON())).toContain('1:00');
 expect(JSON.stringify(tree!.toJSON())).toContain('Free time ends');
 await act(async () => tree!.unmount());
});
