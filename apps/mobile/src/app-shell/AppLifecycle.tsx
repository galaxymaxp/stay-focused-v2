import { router, usePathname, useRootNavigationState } from "expo-router";
import { localMeasurements } from '@stay-focused/shared';
import { useCallback, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";

import { useAuth } from "../auth";
import { useTheme } from "../design/theme";
import { runOfflineCatchUp, stopOfflineCatchUp, setOfflineCatchUpActive } from "../services/localLibrary/offlineCatchUp";
import { syncPendingDraftEdits, stopPendingDraftSync } from '../services/localLibrary/pendingDraftSync';
import { getApiBaseUrl } from "../config/apiBaseUrl";
import { readNotificationDestination, type NotificationDestination } from "../navigation/notificationRoutes";
import {
  COURSE_REVIEWER_PATHNAME,
  courseRouteParams,
} from "../navigation/appRoutes";
import { readCanvasReviewerRecovery } from "../services/canvasReviewerRecoveryStore";
import { subscribeToProcessingNotificationResponses } from "../services/completionNotifications";
import { reconcileReviewerProcessingOutbox } from "../services/processingOutboxReconciliation";
import { resumeAutomaticGenerations } from "../services/generationRecovery";
import { appUpdateStore, useAppUpdate } from '../services/useAppUpdate';
import { AppUpdateRequired } from '../features/redesign/AppUpdateNotice';

const OUTBOX_RECONCILIATION_INTERVAL_MS = 10_000;

/**
 * App-scoped lifecycle work that previously lived inside the `AuthenticatedApp`
 * switcher: durable processing outbox reconciliation and notification-response
 * navigation.
 *
 * Mounted once by the root layout so listeners are independent of the current
 * screen. Owner work stays session-gated; public release checks share the
 * foreground listener and render at most one required-update sheet.
 */
export function AppLifecycle() {
  const { session, isRestoring } = useAuth();
  const appUpdate = useAppUpdate();
  const offline = session?.offline === true;
  useEffect(() => {
    if (!appUpdate.unsupported) return;
    // Release a required sheet promptly after connectivity is lost, without
    // fetching release metadata again or adding a native network module.
    const interval = setInterval(() => { void appUpdateStore.refreshOnline(); }, 10_000);
    return () => clearInterval(interval);
  }, [appUpdate.unsupported]);
  const accessToken = session?.accessToken;
  const ownerUserId = session?.user.id;
  const pathname = usePathname();
  const navigation = useRootNavigationState();
  const [pendingNotification,setPendingNotification]=useState<{owner:string;destination:NotificationDestination}|null>(null);
  const { active } = useTheme();
  useEffect(() => {
    const baseUrl = getApiBaseUrl();
    if (ownerUserId) setOfflineCatchUpActive(ownerUserId, active && !offline);
    if (ownerUserId && accessToken && baseUrl && active && !offline) {
      void runOfflineCatchUp(ownerUserId, { baseUrl, accessToken });
      void syncPendingDraftEdits(ownerUserId, { baseUrl, accessToken });
    }
    return () => { if (ownerUserId) setOfflineCatchUpActive(ownerUserId, false); };
  }, [ownerUserId, accessToken, active, offline]);
  useEffect(() => () => {
    if (ownerUserId) { void stopOfflineCatchUp(ownerUserId); void stopPendingDraftSync(ownerUserId); }
  }, [ownerUserId]);
  const routedRecoveryKeyRef = useRef<string | null>(null);

  const admissionOwner = useRef<string | null>(null);
  admissionOwner.current = session?.offline ? null : ownerUserId ?? null;
  const reconcileOutbox = useCallback(async () => {
    const apiBaseUrl = getApiBaseUrl();
    const token = accessToken?.trim();
    if (!apiBaseUrl || !token || !ownerUserId) return;
    const automatic = admissionOwner.current === ownerUserId
      ? resumeAutomaticGenerations(ownerUserId, { baseUrl: apiBaseUrl, accessToken: token }, () => admissionOwner.current === ownerUserId)
      : Promise.resolve();
    await Promise.all([automatic, reconcileReviewerProcessingOutbox({
      accessToken: token,
      apiBaseUrl,
      ownerUserId,
    })]);
  }, [accessToken, ownerUserId]);

  useEffect(() => () => { admissionOwner.current = null; }, []);

  useEffect(() => {
    const triggerReconciliation = () => {
      if (ownerUserId) void reconcileOutbox().catch(() => undefined);
    };
    const foreground = (state: string) => {
      if (state === 'active') {
        void appUpdateStore.check({ offline });
        triggerReconciliation();
      } else appUpdateStore.suspend();
    };
    foreground(AppState.currentState);
    const interval = setInterval(() => {
      if (AppState.currentState === "active") triggerReconciliation();
    }, OUTBOX_RECONCILIATION_INTERVAL_MS);
    const subscription = AppState.addEventListener("change", foreground);
    return () => {
      clearInterval(interval);
      subscription.remove();
      appUpdateStore.suspend();
    };
  }, [ownerUserId, reconcileOutbox, offline]);

  useEffect(() => {
    setPendingNotification(null);
    if (!ownerUserId) return;
    const subscription = subscribeToProcessingNotificationResponses((data) => {
      // Real navigation replaces the previous `setActiveView` call, so a
      // notification tap produces a route the user can back out of and that a
      // cold start can restore. A payload naming no known destination is
      // ignored rather than guessed at.
      const destination = readNotificationDestination(data);
      if (!destination) return;
      setPendingNotification({owner:ownerUserId,destination});
    });
    return () => subscription.remove();
  }, [ownerUserId]);

  useEffect(()=>{
    // The entry Redirect must settle before a cold notification can push above it.
    if(!pendingNotification || pendingNotification.owner!==ownerUserId || isRestoring || !navigation?.key ||
      pathname==='/' || pathname==='/sign-in' || pathname==='/sign-up' || pathname.startsWith('/auth'))return;
    setPendingNotification(null);
    const finish = localMeasurements.start('navigation.notification_dispatch');
    try {
      router.push({pathname:pendingNotification.destination.pathname,params:pendingNotification.destination.params});
      finish('success');
    } catch (error) { finish('error'); throw error; }
  },[ownerUserId,isRestoring,navigation?.key,pathname,pendingNotification]);

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

  return <AppUpdateRequired />;
}
