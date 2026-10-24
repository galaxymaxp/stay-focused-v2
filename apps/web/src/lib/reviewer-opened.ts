"use client";
import { useEffect } from "react";
import { useAuth } from "../components/providers";

/**
 * Tells the Today planner the owner opened this saved reviewer, so it is not
 * planned again within 24 hours. Fire-and-forget: reading never waits on it.
 */
export function useReviewerOpened(artifactId: string | null) {
  const { api, session } = useAuth();
  const owner = session?.user.id;
  useEffect(() => {
    if (!owner || !artifactId?.startsWith("artifact:")) return;
    void api(`/api/experience/library/${encodeURIComponent(artifactId)}/opened`, { method: "POST", body: {} }).catch(() => {});
  }, [api, owner, artifactId]);
}
