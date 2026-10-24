import { useEffect } from 'react';
import { useAuth } from '../../auth';
import { experienceRequest } from '../../services/experienceApi';
import { useExperienceClient } from './useExperience';

/** Explicit reading only; background downloads never count as opens. */
export function useReviewerOpened(artifactId: string | null) {
  const { session } = useAuth();
  const client = useExperienceClient();
  const owner = session?.user.id;
  const offline = session?.offline;
  useEffect(() => {
    if (!owner || offline || !artifactId?.startsWith('artifact:')) return;
    void experienceRequest(client, `/api/experience/library/${encodeURIComponent(artifactId)}/opened`,
      { method: 'POST', body: {} }).catch(() => {});
  }, [artifactId, owner, offline, client]);
}
