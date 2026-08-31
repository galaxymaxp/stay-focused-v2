import { OcrProviderError } from "@stay-focused/ocr";
import { describe, expect, it, vi } from "vitest";

import {
  createServerOcrProvider,
  type GoogleVisionClientFactory,
  type GoogleVisionSdkClientOptions,
} from "./create-server-ocr-provider";
import type {
  GoogleVisionBatchAnnotateFilesResponse,
  GoogleVisionDocumentTextClient,
  GoogleVisionDocumentTextRequest,
  GoogleVisionDocumentTextResponse,
  GoogleVisionPdfTextRequest,
} from "./google-cloud-vision-provider";

const PRIVATE_KEY_SENTINEL = "TEST_PRIVATE_KEY_SENTINEL";
const CLIENT_EMAIL_SENTINEL = "TEST_CLIENT_EMAIL_SENTINEL";

describe("createServerOcrProvider", () => {
  it("passes parsed raw JSON credentials directly to the Google client", () => {
    const captured: GoogleVisionSdkClientOptions[] = [];

    createServerOcrProvider({
      environment: {
        GOOGLE_CLOUD_CREDENTIALS_JSON: credentialJson(),
        GOOGLE_CLOUD_PROJECT_ID: "test-project",
      },
      clientFactory: capturingClientFactory(captured),
    });

    expect(captured).toHaveLength(1);
    expect(captured[0]).toMatchObject({
      projectId: "test-project",
      credentials: {
        client_email: CLIENT_EMAIL_SENTINEL,
        private_key: `${PRIVATE_KEY_SENTINEL}\nsecond-line`,
      },
    });
    expect(captured[0]?.keyFilename).toBeUndefined();
  });

  it("passes GOOGLE_APPLICATION_CREDENTIALS as an explicit file path", () => {
    const captured: GoogleVisionSdkClientOptions[] = [];
    const credentialPath = "C:\\secure\\google-ocr-service-account.json";

    createServerOcrProvider({
      environment: {
        GOOGLE_APPLICATION_CREDENTIALS: credentialPath,
        GOOGLE_CLOUD_PROJECT: "test-project",
      },
      clientFactory: capturingClientFactory(captured),
    });

    expect(captured).toEqual([
      {
        projectId: "test-project",
        keyFilename: credentialPath,
      },
    ]);
  });

  it("rejects raw JSON in the path variable before client construction", () => {
    const clientFactory = vi.fn(() => new FakeGoogleClient());
    const rawCredential = credentialJson();

    const error = captureError(() =>
      createServerOcrProvider({
        environment: { GOOGLE_APPLICATION_CREDENTIALS: rawCredential },
        clientFactory,
      }),
    );

    expect(error).toMatchObject({
      code: "ocr_not_configured",
      message:
        "Google OCR credential configuration is invalid: GOOGLE_APPLICATION_CREDENTIALS must contain a file path, not raw JSON.",
    });
    expect(clientFactory).not.toHaveBeenCalled();
    expect(serializedError(error)).not.toContain(PRIVATE_KEY_SENTINEL);
    expect(serializedError(error)).not.toContain(CLIENT_EMAIL_SENTINEL);
  });

  it.each([
    "GOOGLE_APPLICATION_CREDENTIALS",
    "GOOGLE_CLOUD_CREDENTIALS_JSON",
  ])("rejects a %s assignment wrapped around the path payload safely", (name) => {
    const rawCredential = `${name}=${credentialJson()}`;

    const error = captureError(() =>
      createServerOcrProvider({
        environment: { GOOGLE_APPLICATION_CREDENTIALS: rawCredential },
        clientFactory: () => new FakeGoogleClient(),
      }),
    );

    expect(error).toMatchObject({ code: "ocr_not_configured" });
    expect(serializedError(error)).not.toContain(PRIVATE_KEY_SENTINEL);
    expect(serializedError(error)).not.toContain(CLIENT_EMAIL_SENTINEL);
  });

  it("rejects invalid raw credential JSON without echoing its contents", () => {
    const invalidCredential = `{"private_key":"${PRIVATE_KEY_SENTINEL}","client_email":"${CLIENT_EMAIL_SENTINEL}"`;

    const error = captureError(() =>
      createServerOcrProvider({
        environment: {
          GOOGLE_CLOUD_CREDENTIALS_JSON: invalidCredential,
          GOOGLE_CLOUD_PROJECT_ID: "test-project",
        },
        clientFactory: () => new FakeGoogleClient(),
      }),
    );

    expect(error).toMatchObject({
      code: "ocr_not_configured",
      message: "GOOGLE_CLOUD_CREDENTIALS_JSON must contain valid JSON.",
    });
    expect(serializedError(error)).not.toContain(PRIVATE_KEY_SENTINEL);
    expect(serializedError(error)).not.toContain(CLIENT_EMAIL_SENTINEL);
  });

  it("uses project-scoped Application Default Credentials when configured", () => {
    const captured: GoogleVisionSdkClientOptions[] = [];

    createServerOcrProvider({
      environment: { GOOGLE_CLOUD_PROJECT: "test-project" },
      clientFactory: capturingClientFactory(captured),
    });

    expect(captured).toEqual([{ projectId: "test-project" }]);
  });

  it("returns a sanitized missing-configuration error when ADC is not configured", () => {
    const error = captureError(() =>
      createServerOcrProvider({
        environment: {},
        clientFactory: () => new FakeGoogleClient(),
      }),
    );

    expect(error).toMatchObject({
      code: "ocr_not_configured",
      message:
        "Google Cloud OCR is not configured. Set GOOGLE_CLOUD_CREDENTIALS_JSON with GOOGLE_CLOUD_PROJECT_ID, or configure Application Default Credentials.",
    });
  });

  it("uses raw JSON credentials deterministically when both mechanisms are valid", () => {
    const captured: GoogleVisionSdkClientOptions[] = [];

    createServerOcrProvider({
      environment: {
        GOOGLE_CLOUD_CREDENTIALS_JSON: credentialJson(),
        GOOGLE_APPLICATION_CREDENTIALS:
          "C:\\secure\\google-ocr-service-account.json",
        GOOGLE_CLOUD_PROJECT_ID: "test-project",
      },
      clientFactory: capturingClientFactory(captured),
    });

    expect(captured[0]?.credentials).toBeDefined();
    expect(captured[0]?.keyFilename).toBeUndefined();
  });

  it("redacts client-initialization exceptions", () => {
    const error = captureError(() =>
      createServerOcrProvider({
        environment: { GOOGLE_CLOUD_PROJECT: "test-project" },
        clientFactory: () => {
          throw new Error(
            `credential ${PRIVATE_KEY_SENTINEL} ${CLIENT_EMAIL_SENTINEL}`,
          );
        },
      }),
    );

    expect(error).toMatchObject({
      code: "ocr_not_configured",
      message: "Google Cloud Vision OCR client initialization failed.",
    });
    expect(serializedError(error)).not.toContain(PRIVATE_KEY_SENTINEL);
    expect(serializedError(error)).not.toContain(CLIENT_EMAIL_SENTINEL);
  });
});

function credentialJson(): string {
  return JSON.stringify({
    type: "service_account",
    private_key: `${PRIVATE_KEY_SENTINEL}\\nsecond-line`,
    client_email: CLIENT_EMAIL_SENTINEL,
  });
}

function capturingClientFactory(
  captured: GoogleVisionSdkClientOptions[],
): GoogleVisionClientFactory {
  return (options) => {
    captured.push(options);
    return new FakeGoogleClient();
  };
}

function captureError(operation: () => unknown): OcrProviderError {
  try {
    operation();
  } catch (error) {
    expect(error).toBeInstanceOf(OcrProviderError);
    return error as OcrProviderError;
  }
  throw new Error("Expected operation to throw.");
}

function serializedError(error: Error): string {
  return `${error.name}: ${error.message}\n${JSON.stringify(error)}`;
}

class FakeGoogleClient implements GoogleVisionDocumentTextClient {
  public async documentTextDetection(
    _request: GoogleVisionDocumentTextRequest,
  ): Promise<GoogleVisionDocumentTextResponse> {
    return { fullTextAnnotation: { text: "test" } };
  }

  public async batchAnnotateFiles(
    _request: GoogleVisionPdfTextRequest,
  ): Promise<GoogleVisionBatchAnnotateFilesResponse> {
    return { responses: [{ responses: [] }] };
  }
}
