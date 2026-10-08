/** Fixed audience prevents a token minted for another service from authorizing Canvas credentials. */
export const CANVAS_WORKER_TOKEN_ENDPOINT =
  "https://stay-focused-v2-prototype.vercel.app/api/internal/canvas/sync-token";

export interface CanvasWorkerTokenRequest {
  readonly jobId: string;
  readonly dispatchId: string;
  readonly workerId: string;
}

export function parseCanvasWorkerTokenRequest(value: unknown): CanvasWorkerTokenRequest | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (Object.keys(record).sort().join(",") !== "dispatchId,jobId,workerId" ||
      typeof record.jobId !== "string" || !uuid.test(record.jobId) ||
      typeof record.dispatchId !== "string" || !uuid.test(record.dispatchId) ||
      typeof record.workerId !== "string" || !/^google-canvas:[0-9a-f-]{36}$/i.test(record.workerId)) return null;
  return { jobId: record.jobId, dispatchId: record.dispatchId, workerId: record.workerId };
}
