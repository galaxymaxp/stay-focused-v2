import type { CourseMaterials, LearningMaterial, LibraryArtifactSummary } from '@stay-focused/shared';
import { experienceRequest, type ExperienceClient } from '../../services/experienceApi';
import { acceptGeneration, createGenerationIntent, readGenerationIntents } from '../../services/generationRecovery';

export function materialPreparation(material: LearningMaterial): import('@stay-focused/shared').MaterialPreparation {
  return material.preparation ?? { status: material.readiness === 'needs_preparation' ? 'preparing' : material.readiness, reasonCode: null };
}

export function reviewerTargets(materials: readonly LearningMaterial[], remakeIds?: ReadonlySet<string>): LearningMaterial[] {
  return [...new Map(materials.map(item => [item.id, item])).values()].filter(item =>
    materialPreparation(item).status === 'ready' && item.generation.reviewer.status === 'available' &&
    (remakeIds ? remakeIds.has(item.id) : !item.reviewerArtifactId));
}

/** Fetch the complete fresh inventory before choosing a batch, including later pages. */
export async function loadCourseMaterials(client: ExperienceClient, courseId: string): Promise<LearningMaterial[]> {
  const items: LearningMaterial[] = [];
  const seen = new Set<number>();
  let offset: number | null = 0;
  while (offset !== null) {
    if (seen.has(offset)) throw new Error('Could not load every material. Refresh and try again.');
    seen.add(offset);
    const page: CourseMaterials = await experienceRequest(client, `/api/experience/courses/${encodeURIComponent(courseId)}/materials?offset=${offset}`);
    items.push(...page.items);
    offset = page.nextOffset;
  }
  return [...new Map(items.map(item => [item.id, item])).values()];
}

/** Persist before admission; reuse uncertain submissions so retry cannot duplicate them. */
export async function submitCourseReviewers(owner: string, client: ExperienceClient, materials: readonly LearningMaterial[], progress: (accepted: number, total: number) => void): Promise<void> {
  const saved = await readGenerationIntents(owner);
  let accepted = 0;
  for (const material of materials) {
    const previous = [...saved].reverse().find(intent => intent.type === 'reviewer' && intent.body.courseId === material.courseId && intent.body.materialId === material.id);
    let intent = previous;
    if (intent?.generationId) {
      const view = await experienceRequest<{ state: string }>(client, `/api/experience/generations/${encodeURIComponent(intent.generationId)}`);
      if (['queued', 'preparing', 'generating', 'finalizing', 'cancelling'].includes(view.state)) {
        progress(++accepted, materials.length);
        continue;
      }
      intent = undefined;
    }
    intent ??= await createGenerationIntent(owner, {
      title: material.title, type: 'reviewer', path: '/api/experience/generations',
      body: { courseId: material.courseId, materialId: material.id },
    });
    await acceptGeneration(owner, client, intent);
    progress(++accepted, materials.length);
  }
}

export function libraryRemovalPath(item: LibraryArtifactSummary): string | null {
  if (item.type === 'activity_output' && item.id.startsWith('activity:')) return `/api/experience/activity-drafts/${encodeURIComponent(item.id.slice(9))}`;
  if (item.type === 'quiz' && item.quiz) return `/api/experience/quizzes/${encodeURIComponent(item.quiz.id)}`;
  return null;
}
