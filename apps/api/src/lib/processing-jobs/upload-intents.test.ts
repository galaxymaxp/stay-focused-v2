import { describe, expect, it } from "vitest";

import {
  createProcessingUploadIntent,
  PROCESSING_TUS_CHUNK_BYTES,
} from "./upload-intents";

describe("processing upload intents", () => {
  it("uses the provider-required six MiB resumable chunk size", () => {
    expect(PROCESSING_TUS_CHUNK_BYTES).toBe(6 * 1_024 * 1_024);
  });

  it("rejects an oversized PDF before writing database state", async () => {
    await expect(
      createProcessingUploadIntent({} as never, {
        userId: "user-a",
        displayName: "Neutral.pdf",
        mimeType: "application/pdf",
        byteSize: 10 * 1_024 * 1_024 + 1,
      }),
    ).rejects.toMatchObject({
      code: "file_too_large",
      retryable: false,
    });
  });
});
