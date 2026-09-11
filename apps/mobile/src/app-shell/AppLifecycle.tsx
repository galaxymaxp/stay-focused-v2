import { router, usePathname } from "expo-router";
import { useCallback, useEffect, useRef } from "react";
import { AppState } from "react-native";

import { useAuth } from "../auth";
import { getApiBaseUrl } from "../config/apiBaseUrl";
import { readNotificationDestination } from "../navigation/notificationRoutes";
import {
  COURSE_REVIEWER_PATHNAME,
  courseRouteParams,
} from "../navigation/appRoutes";
import { readCanvasReviewerRecovery } from "../services/canvasReviewerRecoveryStore";
import { subscribeToProcessingNotificationResponses } from "../services/completionNotifications";
import { reconcileReviewerProcessingOutbox } from "../services/processingOutboxReconciliation";

const OUTBOX_RECONCILIATION_INTERVAL_MS = 10_000;

/**
 * App-scoped lifecycle work that previously lived inside the `AuthenticatedApp`
 * switcher: durable processing outbox reconciliation and notification-response
 * navigation.
 *
 * It renders nothing and is mounted once by the root layout, so the listeners
 * exist exactly once for the session rather than being re-registered by
 * whichever screen happens to be showing. Both effects stay gated on an active
 * session, matching the previous behavior of only running behind the auth gate.
 */
export function AppLifecycle() {
  const { session } = useAuth();
  const accessToken = session?.accessToken;
  const ownerUserId = session?.user.id;
  const pathname = usePathname();
  const routedRecoveryKeyRef = useRef<string | null>(null);

  const reconcileOutbox = useCallback(async () => {
    const apiBaseUrl = getApiBaseUrl();
    const token = accessToken?.trim();
    if (!apiBaseUrl || !token || !ownerUserId) return;
    await reconcileReviewerProcessingOutbox({
      accessToken: token,
      apiBaseUrl,
      ownerUserId,
    });
  }, [accessToken, ownerUserId]);

  useEffect(() => {
    if (!ownerUserId) return;
    const triggerReconciliation = () => {
      void reconcileOutbox().catch(() => undefined);
    };
    triggerReconciliation();
    const interval = setInterval(() => {
      if (AppState.currentState === "active") triggerReconciliation();
    }, OUTBOX_RECONCILIATION_INTERVAL_MS);
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") triggerReconciliation();
    });
    return () => {
      clearInterval(interval);
      subscription.remove();
    };
  }, [ownerUserId, reconcileOutbox]);

  useEffect(() => {
    if (!ownerUserId) return;
    const subscription = subscribeToProcessingNotificationResponses((data) => {
      // Real navigation replaces the previous `setActiveView` call, so a
      // notification tap produces a route the user can back out of and that a
      // cold start can restore. A payload naming no known destination is
      // ignored rather than guessed at.
      const destination = readNotificationDestination(data);
      if (!destination) return;
      router.push({ pathname: destination.pathname, params: destination.params });
    });
    return () => subscription.remove();
  }, [ownerUserId]);

  useEffect(() => {
    if (!ownerUserId) {
      routedRecoveryKeyRef.current = null;
      return;
    }
    let cancelled = false;
    void (async () => {
      const recovery = await readCanvasReviewerRecovery(ownerUserId);
      if (!recovery || cancelled) return;
      const recoveryKey = `${recovery.ownerUserId}:${recovery.jobId ?? recovery.requestIdempotencyKey}`;
      if (routedRecoveryKeyRef.current === recoveryKey) return;
      routedRecoveryKeyRef.current = recoveryKey;
      const expectedPath = `/courses/${encodeURIComponent(recovery.courseId)}/reviewer`;
      if (pathname === expectedPath) return;
      router.replace({
        pathname: COURSE_REVIEWER_PATHNAME,
        params: courseRouteParams({
          courseId: recovery.courseId,
          courseName: recovery.courseName,
        }),
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [ownerUserId, pathname]);

  return null;
}
