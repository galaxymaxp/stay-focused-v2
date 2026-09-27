import type { ProcessingJobApiResult } from "./processingJobsApi";

export interface CanonicalSource {
  readonly id: string;
  readonly sourceType: "text" | "camera" | "local_file";
  readonly displayName: string;
}

export async function persistCanonicalSource(input: {
  readonly apiBaseUrl: string;
  readonly accessToken: string;
  readonly idempotencyKey: string;
  readonly sourceType: CanonicalSource["sourceType"];
  readonly displayName: string;
  readonly sourceText?: string;
  readonly sourceVersionId?: string;
}): Promise<ProcessingJobApiResult<CanonicalSource>> {
  try {
    const response = await fetch(`${input.apiBaseUrl.replace(/\/$/, "")}/api/sources`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${input.accessToken}`,
        "Content-Type": "application/json",
        "idempotency-key": input.idempotencyKey,
      },
      body: JSON.stringify({
        sourceType: input.sourceType,
        displayName: input.displayName,
        ...(input.sourceText !== undefined ? { sourceText: input.sourceText } : {}),
        ...(input.sourceVersionId ? { sourceVersionId: input.sourceVersionId } : {}),
      }),
    });
    const body: unknown = await response.json();
    if (response.ok && body && typeof body === "object" && "data" in body) {
      const data = body.data as CanonicalSource;
      if (typeof data.id === "string" && typeof data.displayName === "string") return { ok: true, data };
    }
    const error = body && typeof body === "object" && "error" in body ? body.error as { code?: string; message?: string } : {};
    return { ok: false, error: { code: error.code ?? "source_unavailable", message: error.message ?? "Source could not be saved.", retryable: response.status >= 500, status: response.status } };
  } catch {
    return { ok: false, error: { code: "network_error", message: "Check your connection and try again.", retryable: true } };
  }
}
