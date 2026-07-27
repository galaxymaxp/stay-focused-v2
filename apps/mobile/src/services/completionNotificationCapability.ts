export interface CompletionNotificationCapabilityInput {
  readonly executionEnvironment: string | null | undefined;
  readonly isDevice: boolean;
  readonly platform: string;
  readonly projectId: string | null | undefined;
}

/**
 * Remote completion notifications require an app-specific native build.
 * Expo Go is intentionally excluded even when a physical device and EAS
 * project ID are present.
 */
export function canUseCompletionNotifications(
  input: CompletionNotificationCapabilityInput,
): boolean {
  return (
    input.isDevice &&
    (input.platform === "ios" || input.platform === "android") &&
    input.executionEnvironment !== "storeClient" &&
    typeof input.projectId === "string" &&
    input.projectId.trim().length > 0
  );
}
