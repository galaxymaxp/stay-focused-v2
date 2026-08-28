import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

import type { ProcessingNotificationPayload } from "../navigation/notificationRoutes";
import { canUseCompletionNotifications } from "./completionNotificationCapability";

const INSTALLATION_ID_KEY = "stay-focused-v2.notification-installation-id";
const NOTIFICATION_REQUEST_TIMEOUT_MS = 10_000;

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export type CompletionNotificationResult =
  | { readonly ok: true; readonly installationId: string }
  | { readonly ok: false; readonly message: string };

export function isCompletionNotificationAvailable(): boolean {
  const projectId = Constants.expoConfig?.extra?.eas?.projectId ??
    Constants.easConfig?.projectId;
  return canUseCompletionNotifications({
    executionEnvironment: Constants.executionEnvironment,
    isDevice: Device.isDevice,
    platform: Platform.OS,
    projectId,
  });
}

export async function enableCompletionNotifications(input: {
  readonly apiBaseUrl: string;
  readonly accessToken: string;
}): Promise<CompletionNotificationResult> {
  if (!isCompletionNotificationAvailable()) {
    return {
      ok: false,
      message: "Push notifications require a linked app-specific build on a physical device.",
    };
  }
  const projectId = Constants.expoConfig?.extra?.eas?.projectId ??
    Constants.easConfig?.projectId;
  if (typeof projectId !== "string" || !projectId.trim()) {
    return {
      ok: false,
      message: "This build is not linked to an EAS project yet.",
    };
  }
  const current = await Notifications.getPermissionsAsync();
  const permission = current.status === "granted"
    ? current
    : await Notifications.requestPermissionsAsync();
  if (permission.status !== "granted") {
    return {
      ok: false,
      message: "Notification permission was not granted in iOS Settings.",
    };
  }
  const token = await Notifications.getExpoPushTokenAsync({ projectId });
  const installationId = await getOrCreateInstallationId();
  const response = await requestJson({
    apiBaseUrl: input.apiBaseUrl,
    accessToken: input.accessToken,
    method: "PUT",
    path: "/api/notification-devices",
    body: {
      installationId,
      expoPushToken: token.data,
      platform: Platform.OS,
      projectId,
      permissionStatus: "granted",
    },
  });
  return response.ok
    ? { ok: true, installationId }
    : { ok: false, message: response.message };
}

export async function sendCompletionNotificationTest(input: {
  readonly apiBaseUrl: string;
  readonly accessToken: string;
}): Promise<CompletionNotificationResult> {
  const installationId = await SecureStore.getItemAsync(INSTALLATION_ID_KEY);
  if (!installationId) {
    return { ok: false, message: "Enable notifications on this device first." };
  }
  const response = await requestJson({
    apiBaseUrl: input.apiBaseUrl,
    accessToken: input.accessToken,
    method: "POST",
    path: "/api/notifications/test",
    idempotencyKey: `notification-test:${Date.now().toString(36)}`,
    body: { installationId },
  });
  return response.ok
    ? { ok: true, installationId }
    : { ok: false, message: response.message };
}

export async function disableCompletionNotifications(input: {
  readonly apiBaseUrl: string;
  readonly accessToken: string;
}): Promise<CompletionNotificationResult> {
  const installationId = await SecureStore.getItemAsync(INSTALLATION_ID_KEY);
  if (!installationId) {
    return { ok: true, installationId: "" };
  }
  const response = await requestJson({
    apiBaseUrl: input.apiBaseUrl,
    accessToken: input.accessToken,
    method: "DELETE",
    path: `/api/notification-devices/${encodeURIComponent(installationId)}`,
  });
  return response.ok
    ? { ok: true, installationId }
    : { ok: false, message: response.message };
}

/**
 * Delivers the notification's own payload to the caller instead of a bare
 * signal, so navigation can use the destination the server actually named
 * (`screen`, and `jobId` when the notification is about a specific job) rather
 * than assuming one.
 */
export function subscribeToProcessingNotificationResponses(
  onNotificationResponse: (data: ProcessingNotificationPayload) => void,
): { readonly remove: () => void } {
  void Notifications.getLastNotificationResponseAsync().then((response) => {
    const data = readResponsePayload(response);
    if (data) onNotificationResponse(data);
  }).catch(() => undefined);
  const subscription = Notifications.addNotificationResponseReceivedListener(
    (response) => {
      const data = readResponsePayload(response);
      if (data) onNotificationResponse(data);
    },
  );
  return { remove: () => subscription.remove() };
}

function readResponsePayload(
  response: Notifications.NotificationResponse | null,
): ProcessingNotificationPayload | null {
  const data = response?.notification.request.content.data;
  return data && typeof data === "object" ? (data as ProcessingNotificationPayload) : null;
}

async function getOrCreateInstallationId(): Promise<string> {
  const existing = await SecureStore.getItemAsync(INSTALLATION_ID_KEY);
  if (existing) return existing;
  const id = createUuid();
  await SecureStore.setItemAsync(INSTALLATION_ID_KEY, id);
  return id;
}

async function requestJson(input: {
  readonly apiBaseUrl: string;
  readonly accessToken: string;
  readonly method: "POST" | "PUT" | "DELETE";
  readonly path: string;
  readonly body?: unknown;
  readonly idempotencyKey?: string;
}): Promise<{ readonly ok: true } | { readonly ok: false; readonly message: string }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), NOTIFICATION_REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(
      `${input.apiBaseUrl.replace(/\/+$/, "")}${input.path}`,
      {
        method: input.method,
        headers: {
          Authorization: `Bearer ${input.accessToken}`,
          ...(input.body !== undefined ? { "Content-Type": "application/json" } : {}),
          ...(input.idempotencyKey
            ? { "Idempotency-Key": input.idempotencyKey }
            : {}),
        },
        ...(input.body !== undefined ? { body: JSON.stringify(input.body) } : {}),
        signal: controller.signal,
      },
    );
    const parsed = await response.json().catch(() => null) as unknown;
    if (response.ok) return { ok: true };
    return {
      ok: false,
      message: readErrorMessage(parsed) ?? "Notification request failed.",
    };
  } catch {
    console.warn("completion_notification.request_unavailable");
    return {
      ok: false,
      message: "The notification service is temporarily unreachable.",
    };
  } finally {
    clearTimeout(timer);
  }
}

function readErrorMessage(value: unknown): string | null {
  if (
    typeof value === "object" &&
    value !== null &&
    "error" in value &&
    typeof value.error === "object" &&
    value.error !== null &&
    "message" in value.error &&
    typeof value.error.message === "string"
  ) {
    return value.error.message;
  }
  return null;
}

function createUuid(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (character) => {
    const random = Math.floor(Math.random() * 16);
    const value = character === "x" ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}
