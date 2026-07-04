import { describe, expect, it, vi } from "vitest";

import {
  extractOcrText,
  OCR_MAX_IMAGE_BYTES,
  sanitizeOcrDiagnosticText,
} from "./ocrApi";

const SUCCESS_BODY = {
  ok: true,
  data: {
    text: "STUDY HABITS\nSet one clear goal.",
    pages: [],
    mimeType: "image/png",
    provider: "google-cloud-vision",
    warnings: [],
  },
};

describe("extractOcrText", () => {
  it("sends a valid PNG multipart request", async () => {
    const fetchImpl = createApiFetch(SUCCESS_BODY);

    const result = await extractOcrText({
      accessToken: "token-value",
      apiBaseUrl: "http://localhost:3000",
      fetchImpl,
      image: createImage({ mimeType: "image/png", fileName: "notes.png" }),
      platformOS: "web",
    });

    expect(result.ok).toBe(true);
    const request = lastApiRequest(fetchImpl);
    expect(request.url).toBe("http://localhost:3000/api/ocr/extract");
    expect(request.init.headers).toEqual({ Authorization: "Bearer token-value" });
    expect(request.init.headers).not.toHaveProperty("Content-Type");
    expect(request.init.body).toBeInstanceOf(FormData);
    expect(readFormDataFile(request.init.body as FormData).type).toBe("image/png");
  });

  it("sends a valid JPEG multipart request", async () => {
    const fetchImpl = createApiFetch({
      ok: true,
      data: { ...SUCCESS_BODY.data, mimeType: "image/jpeg" },
    });

    const result = await extractOcrText({
      accessToken: "token-value",
      apiBaseUrl: "http://localhost:3000",
      fetchImpl,
      image: createImage({ mimeType: "image/jpeg", fileName: "notes.jpg" }),
      platformOS: "web",
    });

    expect(result.ok).toBe(true);
    expect(readFormDataFile(lastApiRequest(fetchImpl).init.body as FormData).type).toBe(
      "image/jpeg",
    );
  });

  it("normalizes the API base URL", async () => {
    const fetchImpl = createApiFetch(SUCCESS_BODY);

    await extractOcrText({
      accessToken: "token-value",
      apiBaseUrl: "http://localhost:3000///",
      fetchImpl,
      image: createImage(),
      platformOS: "web",
    });

    expect(lastApiRequest(fetchImpl).url).toBe(
      "http://localhost:3000/api/ocr/extract",
    );
  });

  it("parses a successful OCR response", async () => {
    const result = await extractOcrText({
      accessToken: "token-value",
      apiBaseUrl: "http://localhost:3000",
      fetchImpl: createApiFetch(SUCCESS_BODY),
      image: createImage(),
      platformOS: "web",
    });

    expect(result).toEqual({
      ok: true,
      data: SUCCESS_BODY.data,
    });
  });

  it("maps unauthorized responses safely", async () => {
    const result = await extractOcrText({
      accessToken: "token-value",
      apiBaseUrl: "http://localhost:3000",
      fetchImpl: createApiFetch(
        {
          ok: false,
          error: { code: "unauthorized", message: "Bearer raw-token" },
        },
        401,
      ),
      image: createImage(),
      platformOS: "web",
    });

    expect(result).toMatchObject({
      ok: false,
      error: {
        code: "unauthorized",
        message: "OCR extraction requires a valid session.",
        status: 401,
      },
    });
    expect(JSON.stringify(result)).not.toContain("raw-token");
  });

  it("rejects unsupported client MIME types before upload", async () => {
    const fetchImpl = vi.fn();

    const result = await extractOcrText({
      accessToken: "token-value",
      apiBaseUrl: "http://localhost:3000",
      fetchImpl,
      image: createImage({ mimeType: "image/gif", fileName: "notes.gif" }),
      platformOS: "web",
    });

    expect(result).toMatchObject({
      ok: false,
      error: { code: "unsupported_media_type" },
    });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("maps oversized image responses", async () => {
    const result = await extractOcrText({
      accessToken: "token-value",
      apiBaseUrl: "http://localhost:3000",
      fetchImpl: createApiFetch(
        {
          ok: false,
          error: { code: "image_too_large", message: "too large" },
        },
        413,
      ),
      image: createImage(),
      platformOS: "web",
    });

    expect(result).toMatchObject({
      ok: false,
      error: { code: "image_too_large", status: 413 },
    });
  });

  it("rejects oversized client images before upload when size is known", async () => {
    const fetchImpl = vi.fn();

    const result = await extractOcrText({
      accessToken: "token-value",
      apiBaseUrl: "http://localhost:3000",
      fetchImpl,
      image: createImage({ fileSize: OCR_MAX_IMAGE_BYTES + 1 }),
      platformOS: "web",
    });

    expect(result).toMatchObject({
      ok: false,
      error: { code: "image_too_large", status: 413 },
    });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("maps provider failure responses without leaking details", async () => {
    const result = await extractOcrText({
      accessToken: "token-value",
      apiBaseUrl: "http://localhost:3000",
      fetchImpl: createApiFetch(
        {
          ok: false,
          error: {
            code: "ocr_provider_failed",
            message: "private_key raw-secret-value",
          },
        },
        502,
      ),
      image: createImage(),
      platformOS: "web",
    });

    expect(result).toMatchObject({
      ok: false,
      error: {
        code: "ocr_provider_failed",
        message: "OCR extraction failed on the server.",
      },
    });
    expect(JSON.stringify(result)).not.toContain("raw-secret-value");
  });

  it("maps empty OCR results", async () => {
    const result = await extractOcrText({
      accessToken: "token-value",
      apiBaseUrl: "http://localhost:3000",
      fetchImpl: createApiFetch(
        {
          ok: false,
          error: { code: "ocr_empty_result", message: "empty" },
        },
        422,
      ),
      image: createImage(),
      platformOS: "web",
    });

    expect(result).toMatchObject({
      ok: false,
      error: { code: "ocr_empty_result", status: 422 },
    });
  });

  it("maps network failures", async () => {
    const result = await extractOcrText({
      accessToken: "token-value",
      apiBaseUrl: "http://localhost:3000",
      fetchImpl: vi.fn().mockRejectedValue(new Error("socket failed")),
      image: createImage(),
      platformOS: "web",
    });

    expect(result).toMatchObject({
      ok: false,
      error: { code: "network_error" },
    });
  });

  it("maps cancellation", async () => {
    const controller = new AbortController();
    controller.abort();

    const result = await extractOcrText({
      accessToken: "token-value",
      apiBaseUrl: "http://localhost:3000",
      fetchImpl: vi.fn().mockRejectedValue(new DOMException("Aborted", "AbortError")),
      image: createImage(),
      platformOS: "web",
      signal: controller.signal,
    });

    expect(result).toMatchObject({
      ok: false,
      error: { code: "request_cancelled" },
    });
  });

  it("redacts secret-like diagnostic text", () => {
    expect(
      sanitizeOcrDiagnosticText(
        "Authorization: Bearer secret-token private_key raw C:\\Users\\name\\key.json",
      ),
    ).not.toMatch(/secret-token|key\.json/);
  });
});

function createImage(
  overrides: {
    readonly fileName?: string;
    readonly fileSize?: number;
    readonly mimeType?: string;
  } = {},
) {
  const mimeType = overrides.mimeType ?? "image/png";
  return {
    uri: "memory://notes",
    mimeType,
    fileName: overrides.fileName ?? "notes.png",
    fileSize: overrides.fileSize ?? 4,
    webFile: new Blob([new Uint8Array([1, 2, 3, 4])], { type: mimeType }),
  };
}

function createApiFetch(body: unknown, status = 200) {
  return vi.fn(async (url: RequestInfo | URL, init?: RequestInit) => {
    return new Response(JSON.stringify(body), {
      status,
      headers: { "content-type": "application/json" },
    });
  });
}

function lastApiRequest(fetchImpl: ReturnType<typeof createApiFetch>) {
  const call = fetchImpl.mock.calls.at(-1);
  if (!call) {
    throw new Error("fetch was not called");
  }

  return {
    url: String(call[0]),
    init: call[1] as RequestInit,
  };
}

function readFormDataFile(formData: FormData): Blob {
  const file = formData.get("image");
  if (!(file instanceof Blob)) {
    throw new Error("FormData image field was not a Blob");
  }
  return file;
}
