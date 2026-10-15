import { describe, expect, it } from 'vitest';
import { courseState, isPastCourse, type CourseStateEvidence } from './course-state';
import { mergeSavedData } from './saved-snapshot';

const now = Date.parse('2026-10-15T12:00:00Z');
describe('current and past courses', () => {
  it('replaces saved course state and removes omitted activities after a successful refresh', () => {
    const saved = { items: [{ id: 'course', ...courseState({}, now) }] };
    const next = { items: [{ id: 'course', ...courseState({ override: 'past' }, now) }] };
    expect(mergeSavedData(saved, next).items[0]?.courseState).toBe('past');
    expect(mergeSavedData({ items: [{ id: 'assignment' }] }, { items: [] }).items).toEqual([]);
  });
  it.each<CourseStateEvidence>([
    { concluded: true }, { workflowState: ' completed ' }, { workflowState: 'concluded' },
    { enrollmentStates: ['active', 'completed'] }, { enrollmentStates: ['concluded'] },
    { endAt: '2026-10-14T12:00:00Z' }, { termEndAt: '2026-10-14T12:00:00Z' },
  ])('uses explicit completion or an elapsed end: %j', evidence => {
    expect(isPastCourse(evidence, now)).toBe(true);
  });
  it.each<CourseStateEvidence>([
    {}, { concluded: false }, { workflowState: 'available', enrollmentStates: ['active'] },
    { endAt: 'invalid', termEndAt: null }, { endAt: '2027-01-01T00:00:00Z' },
    { endAt: '2026-10-15T12:00:00Z' },
  ])('keeps Default Term, missing or unproven evidence current: %j', evidence => {
    expect(isPastCourse(evidence, now)).toBe(false);
  });
  it('lets the override win in both directions and clear to automatic', () => {
    expect(courseState({ concluded: true, override: 'current' }, now)).toEqual({ courseState: 'current', courseStateOverridden: true });
    expect(courseState({ override: 'past' }, now)).toEqual({ courseState: 'past', courseStateOverridden: true });
    expect(courseState({ concluded: true, override: null }, now)).toEqual({ courseState: 'past', courseStateOverridden: false });
  });
});
