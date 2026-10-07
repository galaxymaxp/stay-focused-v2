import { describe, expect, it } from 'vitest';
import * as fixtures from './experience.fixtures';
describe('student experience contract fixtures', () => {
  it('covers Today urgency and a scheduled session', () => {
    expect(fixtures.fixtureToday.urgent[0]?.kind).toBe('canvas_activity');
    expect(fixtures.fixtureToday.timeline[0]?.kind).toBe('study_session');
  });
  it('covers course/material readiness and unsupported files', () => {
    expect(fixtures.fixtureCourses).toHaveLength(2);
    expect(fixtures.fixtureWorkspace.materials.items.map(m => m.readiness)).toEqual(['ready', 'unsupported']);
  });
  it('covers due-today/overdue activities', () => {
    expect(fixtures.fixtureActivity.isOverdue).toBe(false);
    expect(fixtures.fixtureOverdueActivity.isOverdue).toBe(true);
  });
  it('covers lifecycle, persisted reader and empty Library', () => {
    expect(fixtures.fixtureGenerating.artifactId).toBeNull();
    expect(fixtures.fixtureCompleted.artifactId).toBe(fixtures.fixtureReader.id);
    expect(fixtures.fixtureLibrary.items[0]?.id).toBe(fixtures.fixtureReader.id);
    expect(fixtures.fixtureEmptyLibrary.items).toEqual([]);
  });
  it('advertises implemented generators', () => {
    expect(fixtures.fixtureCapabilities.quizGeneration.status).toBe('available');
    expect(fixtures.fixtureLibrary.categories.quiz.status).toBe('available');
    expect(fixtures.fixtureWorkspace.materials.items[0]?.generation.quiz.status).toBe('available');
    expect(fixtures.fixtureWorkspace.materials.items[1]?.generation.quiz).toEqual({ status: 'unavailable', reasonCode: 'unsupported_material' });
    expect(fixtures.fixtureCapabilities.activityMaker.status).toBe('available');
  });
  it('serializes Quiz learning progress separately from generation completion', () => {
    const artifact = JSON.parse(JSON.stringify(fixtures.fixtureQuizArtifact));
    expect(artifact.status).toBe('completed');
    expect(artifact.quiz).toMatchObject({ learningState: 'not_started', answeredCount: 0, questionCount: 2, bestScore: null });
    expect(fixtures.fixtureArtifact.quiz).toBeUndefined();
  });
  it('contains no diagnostic or secret fields', () => {
    expect(JSON.stringify(fixtures)).not.toMatch(/sourceCore|encrypted_token|provider_id|prompt|fingerprint|storage_object_path|ocrDiagnostics/);
  });
});
