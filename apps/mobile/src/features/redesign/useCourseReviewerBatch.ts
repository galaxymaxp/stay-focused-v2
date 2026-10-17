import { useRef, useState } from 'react';
import { useAuth } from '../../auth';
import { ExperienceApiError } from '../../services/experienceApi';
import { useExperienceClient } from './useExperience';
import { loadCourseMaterials, reviewerTargets, submitCourseReviewers } from './courseReviewerActions';

export function useCourseReviewerBatch(onAccepted: () => void) {
  const { session } = useAuth();
  const client = useExperienceClient();
  const inFlight = useRef(false);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const run = async (courseId: string, remakeIds?: ReadonlySet<string>) => {
    if (!session || inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setNote('Checking all course materials…');
    let accepted = 0;
    try {
      const materials = await loadCourseMaterials(client, courseId);
      const targets = reviewerTargets(materials, remakeIds);
      if (!targets.length) {
        setNote(remakeIds ? 'No saved Reviewers have ready original materials to remake.' : 'No new ready materials. Saved Reviewers are skipped; preparing materials will be available when ready.');
        return;
      }
      await submitCourseReviewers(session.user.id, client, targets, (count, total, waiting) => {
        accepted = count;
        setNote(waiting
          ? `Queued ${count} of ${total} Reviewers. Waiting for queue capacity; submission will continue. Keep the app open.`
          : `Queued ${count} of ${total} Reviewers. Keep the app open until submission finishes.`);
      });
      setNote(`${accepted} Reviewers queued. Follow their progress in Queue.${remakeIds ? ` ${remakeIds.size - targets.length} saved sources unavailable or still preparing.` : ' Already generated materials were skipped.'}`);
    } catch (cause) {
      setNote(cause instanceof ExperienceApiError && cause.code === 'rate_limited'
        ? `${accepted} Reviewers queued. The queue or generation limit was reached. Let current work finish, then try again. Saved Reviewers will be skipped.`
        : `${accepted} Reviewers queued. Submission stopped. Check Queue for a saved request, then try again when connected.`);
    } finally {
      inFlight.current = false;
      setBusy(false);
      onAccepted();
    }
  };
  return { busy, note, run };
}
