/** Credential-only probe. Never prints OIDC or Google tokens. */
import { googleDispatcherClient } from "../src/lib/processing-jobs/google-cloud";

async function main() {
  try {
    const client = await googleDispatcherClient();
    const token = await client.getAccessToken();
    if (!token.token) throw new Error("missing_access_token");
    console.info("google_federation.credentials_ready");
  } catch (error) {
    const response = error && typeof error === "object" && "response" in error
      ? error.response as { status?: number; data?: { error?: string | { status?: string; code?: number; errors?: { reason?: string }[] } } }
      : undefined;
    const providerError = response?.data?.error;
    console.error("google_federation.failed", {
      httpStatus: response?.status ?? null,
      category: typeof providerError === "string" ? providerError : providerError?.status ?? null,
      reason: typeof providerError === "string" ? null : providerError?.errors?.[0]?.reason ?? null,
      errorName: error instanceof Error ? error.name : "UnknownError",
    });
    process.exitCode = 1;
  }
}
void main();
