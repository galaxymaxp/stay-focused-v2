import { createCanvasServiceClient } from '@/lib/canvas-db';
import { loadCanvasCourseInventory } from '@/lib/canvas-course-selection';
import { ExperienceService } from './service';
import { trustedExperienceReadRepository } from './repository';
import { experienceReadRoute } from './read-http';
export { experienceJson, experienceOptions, readBoundedExperienceJson, readInteger, requireId } from './read-http';

export function createExperienceService(authenticatedUserId: string) {
  // This client is created only after experienceRoute verifies the bearer token.
  // Every read dependency is then bound to that verified identity.
  const client = createCanvasServiceClient();
  return new ExperienceService({ repository: trustedExperienceReadRepository(client, authenticatedUserId),
    materials: async (_userId, courseId, offset) => (await import('@/lib/canvas-reviewer-sources')).listCanvasReviewerSources({ client, userId: authenticatedUserId, courseId, offset, limit: 100, includeClientPreparationStatus: true }),
    courseInventory: () => loadCanvasCourseInventory({ client, userId: authenticatedUserId, allowStoredFallback: true, preferStored: true }),
    freshness: async (_userId, reviewerArtifactId) => {
      const { readReviewerSourceStatus } = await import('@/lib/reviewer-source-status');
      const status = await readReviewerSourceStatus({ client, userId: authenticatedUserId, reviewerArtifactId });
      return status.ok ? status.value.overallStatus : 'unknown';
    },
  });
}

export async function experienceRoute(request: Request, action: (service: ExperienceService, userId: string) => Promise<Response>) {
  return experienceReadRoute(request, action, createExperienceService);
}
