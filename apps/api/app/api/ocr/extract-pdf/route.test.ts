import { OcrProviderError, type OcrProvider, type OcrResult } from "@stay-focused/ocr";
import { PDFDocument } from "pdf-lib";
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

const {
  OCR_MAX_PDF_BYTES,
  OCR_MAX_PDF_PAGES,
  OCR_PDF_FORM_FIELD,
} = await import("@/lib/ocr/upload-policy");
const { OPTIONS, POST } = await import("./route");

const fakePdfResult: OcrResult = {
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
  mimeType: "application/pdf",
  provider: "google-cloud-vision",
  warnings: [],
};

describe("POST /api/ocr/extract-pdf", () => {
  let fakeProvider: OcrProvider & { readonly extract: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.verifyBearerToken.mockResolvedValue({ id: "user-1" });
    fakeProvider = {
      id: "fake-ocr",
      extract: vi.fn().mockResolvedValue(fakePdfResult),
    };
    mocks.createServerOcrProvider.mockReturnValue(fakeProvider);
  });

  it("returns local web CORS headers for PDF OCR preflight", () => {
    const response = OPTIONS(
      new Request("http://localhost/api/ocr/extract-pdf", {
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
    const response = await POST(await createRequest({ auth: null }));

    expect(response.status).toBe(401);
    await expectError(response, "unauthorized");
    expect(mocks.verifyBearerToken).not.toHaveBeenCalled();
    expect(fakeProvider.extract).not.toHaveBeenCalled();
  });

  it("returns 401 when the Supabase token is rejected", async () => {
    mocks.verifyBearerToken.mockResolvedValue(null);

    const response = await POST(await createRequest());

    expect(response.status).toBe(401);
    await expectError(response, "unauthorized");
    expect(fakeProvider.extract).not.toHaveBeenCalled();
  });

  it("returns 415 when the request is not multipart form data", async () => {
    const response = await POST(
      new Request("http://localhost/api/ocr/extract-pdf", {
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

  it("returns 400 for valid auth with no PDF file", async () => {
    const response = await POST(await createRequest({ omitFile: true }));

    expect(response.status).toBe(400);
    await expectError(response, "invalid_pdf");
    expect(fakeProvider.extract).not.toHaveBeenCalled();
  });

  it("returns 400 when more than one PDF is uploaded", async () => {
    const bytes = await createPdfBytes(1);
    const response = await POST(
      await createRequest({
        files: [
          { bytes, fileName: "first.pdf", mimeType: "application/pdf" },
          { bytes, fileName: "second.pdf", mimeType: "application/pdf" },
        ],
      }),
    );

    expect(response.status).toBe(400);
    await expectError(response, "invalid_pdf");
    expect(fakeProvider.extract).not.toHaveBeenCalled();
  });

  it("returns 415 for a non-PDF MIME type", async () => {
    const response = await POST(
      await createRequest({ mimeType: "image/png", fileName: "notes.png" }),
    );

    expect(response.status).toBe(415);
    await expectError(response, "unsupported_file_type");
    expect(fakeProvider.extract).not.toHaveBeenCalled();
  });

  it("returns 400 for a fake .pdf filename with non-PDF bytes", async () => {
    const response = await POST(
      await createRequest({ bytes: new Uint8Array([1, 2, 3, 4]) }),
    );

    expect(response.status).toBe(400);
    await expectError(response, "invalid_pdf");
    expect(fakeProvider.extract).not.toHaveBeenCalled();
  });

  it("returns 400 for an empty PDF", async () => {
    const response = await POST(await createRequest({ bytes: new Uint8Array() }));

    expect(response.status).toBe(400);
    await expectError(response, "empty_file");
    expect(fakeProvider.extract).not.toHaveBeenCalled();
  });

  it("returns 400 for a malformed PDF", async () => {
    const response = await POST(
      await createRequest({ bytes: encode("%PDF-1.7\nnot a real body\n%%EOF") }),
    );

    expect(response.status).toBe(400);
    await expectError(response, "invalid_pdf");
    expect(fakeProvider.extract).not.toHaveBeenCalled();
  });

  it("returns 422 for an encrypted PDF marker", async () => {
    const response = await POST(
      await createRequest({
        bytes: encode("%PDF-1.7\ntrailer\n<< /Encrypt 1 0 R >>\n%%EOF"),
      }),
    );

    expect(response.status).toBe(422);
    await expectError(response, "pdf_encrypted");
    expect(fakeProvider.extract).not.toHaveBeenCalled();
  });

  it("returns 422 when the PDF is above the page limit", async () => {
    const response = await POST(
      await createRequest({ bytes: await createPdfBytes(OCR_MAX_PDF_PAGES + 1) }),
    );

    expect(response.status).toBe(422);
    await expectError(response, "pdf_page_limit_exceeded");
    expect(fakeProvider.extract).not.toHaveBeenCalled();
  });

  it("returns 413 when the PDF is above the size limit", async () => {
    const response = await POST(
      await createRequest({ bytes: new Uint8Array(OCR_MAX_PDF_BYTES + 1) }),
    );

    expect(response.status).toBe(413);
    await expectError(response, "file_too_large");
    expect(fakeProvider.extract).not.toHaveBeenCalled();
  });

  it("returns 500 when OCR is not configured", async () => {
    mocks.createServerOcrProvider.mockImplementationOnce(() => {
      throw new OcrProviderError({
        code: "ocr_not_configured",
        message: "private_key raw-secret-value",
      });
    });

    const response = await POST(await createRequest());
    const body = await expectError(response, "ocr_not_configured");

    expect(response.status).toBe(500);
    expect(JSON.stringify(body)).not.toContain("raw-secret-value");
    expect(fakeProvider.extract).not.toHaveBeenCalled();
  });

  it("returns 502 when the OCR provider fails", async () => {
    fakeProvider.extract.mockRejectedValueOnce(
      new OcrProviderError({
        code: "ocr_provider_failed",
        message: "raw Google response",
        provider: "google-cloud-vision",
      }),
    );

    const response = await POST(await createRequest());
    const body = await expectError(response, "ocr_provider_failed");

    expect(response.status).toBe(502);
    expect(JSON.stringify(body)).not.toContain("raw Google response");
  });

  it("returns 422 when no text is detected", async () => {
    fakeProvider.extract.mockRejectedValueOnce(
      new OcrProviderError({
        code: "ocr_empty_result",
        message: "empty",
        provider: "google-cloud-vision",
      }),
    );

    const response = await POST(await createRequest());

    expect(response.status).toBe(422);
    await expectError(response, "no_text_detected");
  });

  it("returns a typed OCR result for a valid one-page PDF", async () => {
    const response = await POST(await createRequest({ bytes: await createPdfBytes(1) }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      ok: true,
      data: {
        ...fakePdfResult,
        pageCount: 1,
        processedPageCount: 1,
      },
    });
    expect(fakeProvider.extract).toHaveBeenCalledWith({
      kind: "pdf",
      mimeType: "application/pdf",
      bytes: expect.any(Uint8Array),
      requestedPages: [1],
      fileName: "notes.pdf",
    });
  });

  it("returns a typed OCR result for a valid multi-page PDF", async () => {
    const multiPageResult: OcrResult = {
      ...fakePdfResult,
      text: "Page one\n\nPage two",
      pages: [
        { pageNumber: 1, text: "Page one", blocks: [] },
        { pageNumber: 2, text: "Page two", blocks: [] },
      ],
    };
    fakeProvider.extract.mockResolvedValueOnce(multiPageResult);

    const response = await POST(await createRequest({ bytes: await createPdfBytes(2) }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.pageCount).toBe(2);
    expect(body.data.processedPageCount).toBe(2);
    expect(body.data.text).toBe("Page one\n\nPage two");
    expect(fakeProvider.extract).toHaveBeenCalledWith(
      expect.objectContaining({ requestedPages: [1, 2] }),
    );
  });

  it("preserves provider page order in the response", async () => {
    fakeProvider.extract.mockResolvedValueOnce({
      ...fakePdfResult,
      text: "First\n\nSecond",
      pages: [
        { pageNumber: 1, text: "First", blocks: [] },
        { pageNumber: 2, text: "Second", blocks: [] },
      ],
    });

    const response = await POST(await createRequest({ bytes: await createPdfBytes(2) }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.pages.map((page: { pageNumber: number }) => page.pageNumber)).toEqual([
      1,
      2,
    ]);
  });
});

async function createRequest(
  options: {
    readonly auth?: string | null;
    readonly bytes?: Uint8Array;
    readonly fileName?: string;
    readonly files?: readonly {
      readonly bytes: Uint8Array;
      readonly fileName: string;
      readonly mimeType: string;
    }[];
    readonly mimeType?: string;
    readonly omitFile?: boolean;
  } = {},
): Promise<Request> {
  const formData = new FormData();
  if (!options.omitFile) {
    const files =
      options.files ??
      [
        {
          bytes: options.bytes ?? (await createPdfBytes(1)),
          fileName: options.fileName ?? "notes.pdf",
          mimeType: options.mimeType ?? "application/pdf",
        },
      ];

    for (const file of files) {
      formData.append(
        OCR_PDF_FORM_FIELD,
        new Blob([toBlobPart(file.bytes)], {
          type: file.mimeType,
        }),
        file.fileName,
      );
    }
  }

  const headers = new Headers();
  if (options.auth !== null) {
    headers.set("authorization", options.auth ?? "Bearer valid-token");
  }

  return new Request("http://localhost/api/ocr/extract-pdf", {
    method: "POST",
    headers,
    body: formData,
  });
}

async function createPdfBytes(pageCount: number): Promise<Uint8Array> {
  const document = await PDFDocument.create();
  for (let index = 0; index < pageCount; index += 1) {
    document.addPage();
  }
  return await document.save({ useObjectStreams: false });
}

function encode(value: string): Uint8Array {
  return new TextEncoder().encode(value);
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
