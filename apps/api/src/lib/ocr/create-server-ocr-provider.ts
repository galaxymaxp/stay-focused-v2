import { ImageAnnotatorClient } from "@google-cloud/vision";
import { OcrProviderError, type OcrProvider } from "@stay-focused/ocr";

import {
  GoogleCloudVisionOcrProvider,
  type GoogleVisionDocumentTextClient,
  type GoogleVisionDocumentTextRequest,
  type GoogleVisionDocumentTextResponse,
  type GoogleVisionBatchAnnotateFilesResponse,
  type GoogleVisionPdfTextRequest,
} from "./google-cloud-vision-provider";

export type ServerOcrProviderEnvironment = Readonly<
  Record<string, string | undefined>
>;

export type GoogleVisionClientFactory = (
  options: GoogleVisionSdkClientOptions,
) => GoogleVisionDocumentTextClient;

export interface CreateServerOcrProviderOptions {
  readonly environment?: ServerOcrProviderEnvironment;
  readonly clientFactory?: GoogleVisionClientFactory;
}

type GoogleCredentialScalar = string | number | boolean | null | undefined;

interface GoogleCredentialsJson
  extends Readonly<Record<string, GoogleCredentialScalar>> {
  readonly private_key?: string;
}

type GoogleVisionSdkClientOptionValue = string | number | object | undefined;

interface GoogleVisionSdkClientOptions
  extends Readonly<Record<string, GoogleVisionSdkClientOptionValue>> {
  readonly projectId?: string;
  readonly credentials?: GoogleCredentialsJson;
}

export function createServerOcrProvider(
  options: CreateServerOcrProviderOptions = {},
): OcrProvider {
  const environment = options.environment ?? process.env;
  const clientOptions = createGoogleVisionClientOptions(environment);
  const clientFactory = options.clientFactory ?? createGoogleVisionSdkClient;

  return new GoogleCloudVisionOcrProvider(clientFactory(clientOptions));
}

function createGoogleVisionClientOptions(
  environment: ServerOcrProviderEnvironment,
): GoogleVisionSdkClientOptions {
  const projectId =
    readNonEmptyString(environment.GOOGLE_CLOUD_PROJECT_ID) ??
    readNonEmptyString(environment.GOOGLE_CLOUD_PROJECT);
  const credentialsJson = readNonEmptyString(
    environment.GOOGLE_CLOUD_CREDENTIALS_JSON,
  );
  const credentialsPath = readNonEmptyString(
    environment.GOOGLE_APPLICATION_CREDENTIALS,
  );

  if (!credentialsJson && !credentialsPath && !projectId) {
    throw new OcrProviderError({
      code: "ocr_not_configured",
      message:
        "Google Cloud OCR is not configured. Set GOOGLE_CLOUD_CREDENTIALS_JSON with GOOGLE_CLOUD_PROJECT_ID, or configure Application Default Credentials.",
    });
  }

  return {
    ...(projectId ? { projectId } : {}),
    ...(credentialsJson ? { credentials: parseCredentials(credentialsJson) } : {}),
  };
}

function parseCredentials(credentialsJson: string): GoogleCredentialsJson {
  let parsed: unknown;
  try {
    parsed = JSON.parse(credentialsJson);
  } catch {
    throw new OcrProviderError({
      code: "ocr_not_configured",
      message: "GOOGLE_CLOUD_CREDENTIALS_JSON must contain valid JSON.",
    });
  }

  if (!isRecord(parsed)) {
    throw new OcrProviderError({
      code: "ocr_not_configured",
      message: "GOOGLE_CLOUD_CREDENTIALS_JSON must contain a JSON object.",
    });
  }

  const credentials: Record<string, GoogleCredentialScalar> = {};
  for (const [key, value] of Object.entries(parsed)) {
    if (isGoogleCredentialScalar(value)) {
      credentials[key] = value;
    }
  }

  const privateKey = readNonEmptyString(credentials.private_key);
  return {
    ...credentials,
    ...(privateKey ? { private_key: privateKey.replace(/\\n/g, "\n") } : {}),
  };
}

function createGoogleVisionSdkClient(
  options: GoogleVisionSdkClientOptions,
): GoogleVisionDocumentTextClient {
  const client = new ImageAnnotatorClient(options);

  return {
    batchAnnotateFiles: async (
      request: GoogleVisionPdfTextRequest,
    ): Promise<GoogleVisionBatchAnnotateFilesResponse> => {
      const [response] = await client.batchAnnotateFiles({
        requests: [
          {
            inputConfig: {
              content: Buffer.from(request.inputConfig.content),
              mimeType: request.inputConfig.mimeType,
            },
            features: [{ type: "DOCUMENT_TEXT_DETECTION" }],
            pages: [...request.pages],
          },
        ],
      });
      return response as unknown as GoogleVisionBatchAnnotateFilesResponse;
    },
    documentTextDetection: async (
      request: GoogleVisionDocumentTextRequest,
    ): Promise<GoogleVisionDocumentTextResponse> => {
      const [response] = await client.documentTextDetection({
        image: { content: Buffer.from(request.image.content) },
      });
      return response as unknown as GoogleVisionDocumentTextResponse;
    },
  };
}

function readNonEmptyString(value: unknown): string | undefined {
  const normalized = typeof value === "string" ? value.trim() : "";
  return normalized ? normalized : undefined;
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isGoogleCredentialScalar(value: unknown): value is GoogleCredentialScalar {
  return (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean" ||
    value === null
  );
}
