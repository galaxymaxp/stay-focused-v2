import { APP_ROUTES } from "./appRoutes";

/**
 * The push payload the API actually sends.
 *
 * `apps/api/src/lib/notifications/worker.ts` builds every message as
 * `{ screen: "processing", jobId?, jobType? }`. `jobId` and `jobType` are
 * omitted for the connectivity test notification and present for real job
 * completions, so neither may be assumed.
 */
export interface ProcessingNotificationPayload {
  readonly screen?: unknown;
  readonly jobId?: unknown;
  readonly jobType?: unknown;
}

export interface NotificationDestination {
  readonly pathname: typeof APP_ROUTES.processing;
  readonly params: { readonly jobId?: string };
}

/**
 * Resolves a notification payload to a route, or null when the payload names
 * nothing this app can navigate to.
 *
 * `screen` is the only destination discriminator the backend sends, and
 * "processing" is its only value today. Unknown values return null rather than
 * guessing a route, so a future server-side destination cannot silently land
 * users on the wrong screen.
 */
export function readNotificationDestination(
  data: ProcessingNotificationPayload | null | undefined,
): NotificationDestination | null {
  if (!data || data.screen !== "processing") return null;
  const jobId = typeof data.jobId === "string" ? data.jobId.trim() : "";
  return {
    pathname: APP_ROUTES.processing,
    params: jobId ? { jobId } : {},
  };
}
