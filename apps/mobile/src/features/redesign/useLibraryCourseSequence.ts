import { useEffect, useState } from "react";
import { useAuth } from "../../auth";
import { readScreenSnapshot, screenSnapshotEpoch, writeScreenSnapshot } from "../../services/screenSnapshots";
import { loadCourseMaterials } from "./courseReviewerActions";
import { courseSequence, type LibraryCourseSequence } from "./librarySorting";
import { useExperienceClient } from "./useExperience";

export function useLibraryCourseSequence(courseId: string, enabled: boolean) {
  const owner = useAuth().session?.user.id ?? "", client = useExperienceClient();
  const identity = `${owner}:${courseId}`;
  const [state, setState] = useState<{ identity: string; data: LibraryCourseSequence | null; loading: boolean; error: boolean }>({ identity, data: null, loading: false, error: false });
  useEffect(() => {
    if (!enabled || !owner || !courseId) return;
    let live = true;
    const key = `library-course-order:v1:${courseId}`, epoch = screenSnapshotEpoch(owner);
    void (async () => {
      const saved = await readScreenSnapshot<LibraryCourseSequence>(owner, key);
      if (!live) return;
      setState({ identity, data: saved?.data ?? null, loading: true, error: false });
      try {
        const data = courseSequence(await loadCourseMaterials(client, courseId));
        if (!live || screenSnapshotEpoch(owner) !== epoch) return;
        await writeScreenSnapshot(owner, key, data, epoch);
        if (live) setState({ identity, data, loading: false, error: false });
      } catch { if (live) setState(old => ({ ...old, loading: false, error: true })); }
    })();
    return () => { live = false; };
  }, [owner, courseId, enabled, client, identity]);
  return state.identity === identity ? state : { identity, data: null, loading: false, error: false };
}
