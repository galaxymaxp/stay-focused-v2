import { OcrProviderError, type OcrProvider, type OcrResult } from "@stay-focused/ocr";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createServerOcrProvider: vi.fn(),
  verifyBearerToken: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  verifyBearerToken: mocks.verifyBearerToken,
}));

vi.mock("@/lib/ocr/create-server-ocr-provider", () => ({
  createServerOcrProvider: mocks.createServerOcrProvider,
}));

const { OCR_MAX_IMAGE_BYTES } = await import("@/lib/ocr/upload-policy");
const { OPTIONS, POST } = await import("./route");

const fakeResult: OcrResult = {
  text: "STUDY HABITS\nSet one clear goal before studying.",
  pages: [
    {
      pageNumber: 1,
      text: "STUDY HABITS\nSet one clear goal before studying.",
      blocks: [
        {
          id: "page-1-block-1",
          order: 0,
          kind: "paragraph",
          text: "STUDY HABITS",
          lines: [
            {
              id: "page-1-block-1-line-1",
              order: 0,
              text: "STUDY HABITS",
            },
          ],
        },
      ],
    },
  ],
  mimeType: "image/png",
  provider: "google-cloud-vision",
  warnings: [],
};

describe("POST /api/ocr/extract", () => {
  let fakeProvider: OcrProvider & { readonly extract: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.verifyBearerToken.mockResolvedValue({ id: "user-1" });
    fakeProvider = {
      id: "fake-ocr",
      extract: vi.fn().mockResolvedValue(fakeResult),
    };
    mocks.createServerOcrProvider.mockReturnValue(fakeProvider);
  });

  it("returns local web CORS headers for OCR preflight", () => {
    const response = OPTIONS(
      new Request("http://localhost/api/ocr/extract", {
        method: "OPTIONS",
        headers: {
          "access-control-request-headers": "authorization, content-type",
          "access-control-request-method": "POST",
          origin: "http://localhost:8081",
        },
      }),
    );

    expect(response.status).toBe(204);
    expect(response.headers.get("access-control-allow-origin")).toBe(
      "http://localhost:8081",
    );
    expect(response.headers.get("access-control-allow-methods")).toBe(
      "POST, OPTIONS",
    );
  });

  it("returns 401 when the Authorization header is missing", async () => {
    const response = await POST(createRequest({ auth: null }));

    expect(response.status).toBe(401);
    await expectError(response, "unauthorized");
    expect(mocks.verifyBearerToken).not.toHaveBeenCalled();
    expect(fakeProvider.extract).not.toHaveBeenCalled();
  });

  it("returns 401 when the Supabase token is rejected", async () => {
    mocks.verifyBearerToken.mockResolvedValue(null);

    const response = await POST(createRequest());

    expect(response.status).toBe(401);
    await expectError(response, "unauthorized");
    expect(fakeProvider.extract).not.toHaveBeenCalled();
  });

  it("returns 415 when the request is not multipart form data", async () => {
    const response = await POST(
      new Request("http://localhost/api/ocr/extract", {
        method: "POST",
        headers: {
          authorization: "Bearer valid-token",
          "content-type": "application/json",
        },
        body: "{}",
      }),
    );

    expect(response.status).toBe(415);
    await expectError(response, "unsupported_media_type");
    expect(fakeProvider.extract).not.toHaveBeenCalled();
  });

  it("returns 400 for valid auth with no file", async () => {
    const response = await POST(createRequest({ omitFile: true }));

    expect(response.status).toBe(400);
    await expectError(response, "invalid_image");
    expect(fakeProvider.extract).not.toHaveBeenCalled();
  });

  it("returns 415 for an unsupported image MIME type", async () => {
    const response = await POST(createRequest({ mimeType: "image/gif" }));

    expect(response.status).toBe(415);
    await expectError(response, "unsupported_media_type");
    expect(fakeProvider.extract).not.toHaveBeenCalled();
  });

  it("returns 413 for an oversized image", async () => {
    const response = await POST(
      createRequest({ bytes: new Uint8Array(OCR_MAX_IMAGE_BYTES + 1) }),
    );

    expect(response.status).toBe(413);
    await expectError(response, "image_too_large");
    expect(fakeProvider.extract).not.toHaveBeenCalled();
  });

  it("returns 400 for an empty image", async () => {
    const response = await POST(createRequest({ bytes: new Uint8Array() }));

    expect(response.status).toBe(400);
    await expectError(response, "empty_image");
    expect(fakeProvider.extract).not.toHaveBeenCalled();
  });

  it("returns a typed OCR result for a valid PNG", async () => {
    const response = await POST(createRequest({ mimeType: "image/png" }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ ok: true, data: fakeResult });
    expect(fakeProvider.extract).toHaveBeenCalledWith({
      kind: "image",
      mimeType: "image/png",
      bytes: new Uint8Array([1, 2, 3, 4]),
      fileName: "notes.png",
    });
  });

  it("returns a typed OCR result for a valid JPEG", async () => {
    const jpegResult: OcrResult = { ...fakeResult, mimeType: "image/jpeg" };
    fakeProvider.extract.mockResolvedValueOnce(jpegResult);

    const response = await POST(
      createRequest({ mimeType: "image/jpeg", fileName: "notes.jpg" }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.mimeType).toBe("image/jpeg");
    expect(body.data.provider).toBe("google-cloud-vision");
  });

  it("maps empty OCR results safely", async () => {
    fakeProvider.extract.mockResolvedValueOnce({
      ...fakeResult,
      text: "",
      pages: [],
    });

    const response = await POST(createRequest());

    expect(response.status).toBe(422);
    await expectError(response, "ocr_empty_result");
  });

  it("maps provider failures safely", async () => {
    fakeProvider.extract.mockRejectedValueOnce(
      new OcrProviderError({
        code: "ocr_provider_failed",
        message: "raw Google response with credential-json-secret",
        provider: "google-cloud-vision",
      }),
    );

    const response = await POST(createRequest());
    const body = await expectError(response, "ocr_provider_failed");

    expect(response.status).toBe(502);
    expect(JSON.stringify(body)).not.toContain("credential-json-secret");
    expect(JSON.stringify(body)).not.toContain("raw Google response");
  });

  it("maps missing provider configuration safely", async () => {
    mocks.createServerOcrProvider.mockImplementationOnce(() => {
      throw new OcrProviderError({
        code: "ocr_not_configured",
        message: "private_key raw-secret-value",
      });
    });

    const response = await POST(createRequest());
    const body = await expectError(response, "ocr_not_configured");

    expect(response.status).toBe(500);
    expect(JSON.stringify(body)).not.toContain("raw-secret-value");
    expect(fakeProvider.extract).not.toHaveBeenCalled();
  });

  it("keeps unexpected provider errors out of the response body", async () => {
    fakeProvider.extract.mockRejectedValueOnce(
      new Error("provider stack raw-provider-response"),
    );

    const response = await POST(createRequest());
    const body = await expectError(response, "internal_error");

    expect(response.status).toBe(500);
    expect(JSON.stringify(body)).not.toContain("raw-provider-response");
    expect(JSON.stringify(body).toLowerCase()).not.toContain("stack");
  });
});

function createRequest(
  options: {
    readonly auth?: string | null;
    readonly bytes?: Uint8Array;
    readonly fileName?: string;
    readonly mimeType?: string;
    readonly omitFile?: boolean;
  } = {},
): Request {
  const formData = new FormData();
  const mimeType = options.mimeType ?? "image/png";
  if (!options.omitFile) {
    formData.append(
      "image",
      new Blob([toBlobPart(options.bytes ?? new Uint8Array([1, 2, 3, 4]))], {
        type: mimeType,
      }),
      options.fileName ?? "notes.png",
    );
  }

  const headers = new Headers();
  if (options.auth !== null) {
    headers.set("authorization", options.auth ?? "Bearer valid-token");
  }

  return new Request("http://localhost/api/ocr/extract", {
    method: "POST",
    headers,
    body: formData,
  });
}

function toBlobPart(bytes: Uint8Array): BlobPart {
  return bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  ) as ArrayBuffer;
}

async function expectError(
  response: Response,
  code: string,
): Promise<unknown> {
  const body = await response.json();
  expect(body).toMatchObject({
    ok: false,
    error: { code },
  });
  expect(JSON.stringify(body)).not.toContain("Error:");
  expect(JSON.stringify(body).toLowerCase()).not.toContain("stack");
  expect(body).not.toHaveProperty("stack");
  return body;
}
