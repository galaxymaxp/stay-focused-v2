import { router } from "expo-router";
import { useCallback, useEffect } from "react";
import { AppState } from "react-native";

import { useAuth } from "../auth";
import { getApiBaseUrl } from "../config/apiBaseUrl";
import { readNotificationDestination } from "../navigation/notificationRoutes";
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

  return null;
}
