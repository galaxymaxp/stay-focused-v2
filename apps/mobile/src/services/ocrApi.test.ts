import { describe, expect, it, vi } from "vitest";

import {
  extractPdfOcrText,
  extractOcrText,
  OCR_MAX_IMAGE_BYTES,
  OCR_MAX_PDF_BYTES,
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
    extraction: completeExtraction(1),
  },
};

const SUCCESS_PDF_BODY = {
  ok: true,
  data: {
    text: "STUDY HABITS\n\nREVIEW METHODS",
    pages: [],
    mimeType: "application/pdf",
    pageCount: 2,
    processedPageCount: 2,
    provider: "google-cloud-vision",
    warnings: [],
    extraction: completeExtraction(2),
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
    expect(readFormDataFile(request.init.body as FormData, "image").type).toBe(
      "image/png",
    );
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
    expect(
      readFormDataFile(lastApiRequest(fetchImpl).init.body as FormData, "image").type,
    ).toBe("image/jpeg");
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
        message: "Text extraction is temporarily unavailable. Try again in a moment.",
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

describe("extractPdfOcrText", () => {
  it("sends a valid PDF multipart request", async () => {
    const fetchImpl = createApiFetch(SUCCESS_PDF_BODY);

    const result = await extractPdfOcrText({
      accessToken: "token-value",
      apiBaseUrl: "http://localhost:3000",
      fetchImpl,
      pdf: createPdf(),
      platformOS: "web",
    });

    expect(result).toEqual({
      ok: true,
      data: SUCCESS_PDF_BODY.data,
    });
    const request = lastApiRequest(fetchImpl);
    expect(request.url).toBe("http://localhost:3000/api/ocr/extract-pdf");
    expect(request.init.headers).toEqual({ Authorization: "Bearer token-value" });
    expect(request.init.headers).not.toHaveProperty("Content-Type");
    expect(request.init.body).toBeInstanceOf(FormData);
    const file = readFormDataFile(request.init.body as FormData, "pdf");
    expect(file.type).toBe("application/pdf");
  });

  it("rejects unsupported PDF MIME types before upload", async () => {
    const fetchImpl = vi.fn();

    const result = await extractPdfOcrText({
      accessToken: "token-value",
      apiBaseUrl: "http://localhost:3000",
      fetchImpl,
      pdf: createPdf({ mimeType: "text/plain", fileName: "notes.txt" }),
      platformOS: "web",
    });

    expect(result).toMatchObject({
      ok: false,
      error: { code: "unsupported_file_type" },
    });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("rejects oversized PDFs before upload when size is known", async () => {
    const fetchImpl = vi.fn();

    const result = await extractPdfOcrText({
      accessToken: "token-value",
      apiBaseUrl: "http://localhost:3000",
      fetchImpl,
      pdf: createPdf({ fileSize: OCR_MAX_PDF_BYTES + 1 }),
      platformOS: "web",
    });

    expect(result).toMatchObject({
      ok: false,
      error: { code: "file_too_large", status: 413 },
    });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("maps PDF page-limit responses", async () => {
    const result = await extractPdfOcrText({
      accessToken: "token-value",
      apiBaseUrl: "http://localhost:3000",
      fetchImpl: createApiFetch(
        {
          ok: false,
          error: {
            code: "pdf_page_limit_exceeded",
            message: "PDF OCR supports up to 5 pages per request.",
          },
        },
        422,
      ),
      pdf: createPdf(),
      platformOS: "web",
    });

    expect(result).toMatchObject({
      ok: false,
      error: { code: "pdf_page_limit_exceeded", status: 422 },
    });
  });

  it("maps password-protected PDF responses", async () => {
    const result = await extractPdfOcrText({
      accessToken: "token-value",
      apiBaseUrl: "http://localhost:3000",
      fetchImpl: createApiFetch(
        {
          ok: false,
          error: {
            code: "pdf_encrypted",
            message: "Password-protected PDFs cannot be read.",
          },
        },
        422,
      ),
      pdf: createPdf(),
      platformOS: "web",
    });

    expect(result).toMatchObject({
      ok: false,
      error: { code: "pdf_encrypted", status: 422 },
    });
  });

  it("maps incomplete document metadata without exposing OCR content", async () => {
    const extraction = {
      ...completeExtraction(3),
      status: "incomplete",
      processedPageCount: 2,
      successfulPageCount: 2,
      missingPageNumbers: [3],
      outOfRangePageNumbers: [0],
      affectedPageNumbers: [0, 3],
      failureCategories: ["missing_page", "out_of_range_page"],
    };
    const result = await extractPdfOcrText({
      accessToken: "token-value",
      apiBaseUrl: "http://localhost:3000",
      fetchImpl: createApiFetch(
        {
          ok: false,
          error: {
            code: "document_extraction_incomplete",
            message: "Not every page could be read.",
            extraction,
          },
        },
        422,
      ),
      pdf: createPdf(),
      platformOS: "web",
    });

    expect(result).toMatchObject({
      ok: false,
      error: {
        code: "document_extraction_incomplete",
        extraction: {
          status: "incomplete",
          expectedPageCount: 3,
          affectedPageNumbers: [0, 3],
        },
      },
    });
    expect(JSON.stringify(result)).not.toContain("source sentence");
  });

  it("rejects a PDF success response without a complete extraction proof", async () => {
    const result = await extractPdfOcrText({
      accessToken: "token-value",
      apiBaseUrl: "http://localhost:3000",
      fetchImpl: createApiFetch({
        ...SUCCESS_PDF_BODY,
        data: {
          ...SUCCESS_PDF_BODY.data,
          extraction: {
            ...completeExtraction(2),
            status: "incomplete",
            failureCategories: ["failed_page"],
          },
        },
      }),
      pdf: createPdf(),
      platformOS: "web",
    });

    expect(result).toMatchObject({
      ok: false,
      error: { code: "document_extraction_incomplete" },
    });
  });

  it("maps PDF network failures", async () => {
    const result = await extractPdfOcrText({
      accessToken: "token-value",
      apiBaseUrl: "http://localhost:3000",
      fetchImpl: vi.fn().mockRejectedValue(new Error("socket failed")),
      pdf: createPdf(),
      platformOS: "web",
    });

    expect(result).toMatchObject({
      ok: false,
      error: { code: "network_error" },
    });
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

function createPdf(
  overrides: {
    readonly fileName?: string;
    readonly fileSize?: number;
    readonly mimeType?: string;
  } = {},
) {
  const mimeType = overrides.mimeType ?? "application/pdf";
  return {
    uri: "memory://notes.pdf",
    mimeType,
    fileName: overrides.fileName ?? "notes.pdf",
    fileSize: overrides.fileSize ?? 4,
    webFile: new Blob([new Uint8Array([37, 80, 68, 70])], { type: mimeType }),
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

function readFormDataFile(formData: FormData, fieldName: string): Blob {
  const file = formData.get(fieldName);
  if (!(file instanceof Blob)) {
    throw new Error(`FormData ${fieldName} field was not a Blob`);
  }
  return file;
}

function completeExtraction(expectedPageCount: number) {
  return {
    status: "complete",
    expectedPageCount,
    processedPageCount: expectedPageCount,
    successfulPageCount: expectedPageCount,
    blankPageCount: 0,
    failedPageCount: 0,
    missingPageNumbers: [],
    duplicatePageNumbers: [],
    outOfRangePageNumbers: [],
    invalidPageNumbers: [],
    affectedPageNumbers: [],
    failureCategories: [],
  };
}
