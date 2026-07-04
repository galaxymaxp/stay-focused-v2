import { OcrProviderError } from "@stay-focused/ocr";
import { describe, expect, it } from "vitest";

import {
  GoogleCloudVisionOcrProvider,
  type GoogleVisionDocumentTextClient,
  type GoogleVisionDocumentTextRequest,
  type GoogleVisionDocumentTextResponse,
} from "./google-cloud-vision-provider";

describe("GoogleCloudVisionOcrProvider", () => {
  it("returns document text when Google provides full text without layout", async () => {
    const provider = createProvider({
      fullTextAnnotation: { text: "STUDY HABITS\nSet one goal." },
    });

    const result = await provider.extract(createInput());

    expect(result.text).toBe("STUDY HABITS\nSet one goal.");
    expect(result.pages).toHaveLength(1);
    expect(result.warnings).toContainEqual({
      code: "missing_layout",
      message: "Google Cloud Vision returned text without page layout.",
    });
  });

  it("preserves page ordering from document text detection pages", async () => {
    const provider = createProvider({
      fullTextAnnotation: {
        text: "Page one\n\nPage two",
        pages: [
          page([paragraph("Page one", 10, 10)]),
          page([paragraph("Page two", 10, 10)]),
        ],
      },
    });

    const result = await provider.extract(createInput());

    expect(result.pages.map((entry) => entry.pageNumber)).toEqual([1, 2]);
    expect(result.text).toBe("Page one\n\nPage two");
  });

  it("sorts blocks and lines by coordinates", async () => {
    const provider = createProvider({
      fullTextAnnotation: {
        text: "Top left\nTop right\nBottom",
        pages: [
          page([
            paragraph("Bottom", 10, 200),
            paragraph("Top right", 200, 20),
            paragraph("Top left", 10, 20),
          ]),
        ],
      },
    });

    const result = await provider.extract(createInput());

    expect(result.pages[0]?.blocks.map((block) => block.text)).toEqual([
      "Top left",
      "Top right",
      "Bottom",
    ]);
  });

  it("preserves paragraph boundaries as separate OCR blocks", async () => {
    const provider = createProvider({
      fullTextAnnotation: {
        text: "Heading\n\nParagraph body",
        pages: [
          page([
            paragraph("Heading", 10, 10),
            paragraph("Paragraph body", 10, 60),
          ]),
        ],
      },
    });

    const result = await provider.extract(createInput());

    expect(result.pages[0]?.blocks).toHaveLength(2);
    expect(result.pages[0]?.blocks.map((block) => block.kind)).toEqual([
      "paragraph",
      "paragraph",
    ]);
    expect(result.text).toBe("Heading\n\nParagraph body");
  });

  it("maps provider confidence when supplied", async () => {
    const provider = createProvider({
      fullTextAnnotation: {
        text: "Confident text",
        pages: [
          {
            width: 100,
            height: 200,
            confidence: 0.91,
            blocks: [
              {
                confidence: 0.82,
                paragraphs: [paragraph("Confident text", 10, 10, 0.73)],
              },
            ],
          },
        ],
      },
    });

    const result = await provider.extract(createInput());

    expect(result.pages[0]?.confidence).toBe(0.91);
    expect(result.pages[0]?.blocks[0]?.confidence).toBe(0.73);
    expect(result.pages[0]?.blocks[0]?.lines[0]?.confidence).toBeCloseTo(0.73);
  });

  it("handles missing optional fields", async () => {
    const provider = createProvider({
      fullTextAnnotation: {
        text: "Minimal",
        pages: [
          {
            blocks: [
              {
                paragraphs: [
                  {
                    words: [
                      {
                        symbols: [{ text: "M" }, { text: "i" }, { text: "n" }],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    });

    const result = await provider.extract(createInput());

    expect(result.text).toBe("Min");
    expect(result.pages[0]?.width).toBeUndefined();
    expect(result.pages[0]?.blocks[0]?.confidence).toBeUndefined();
  });

  it("throws a typed empty-result error for empty provider output", async () => {
    const provider = createProvider({ fullTextAnnotation: { text: "" } });

    await expect(provider.extract(createInput())).rejects.toMatchObject({
      code: "ocr_empty_result",
      provider: "google-cloud-vision",
    });
  });

  it("wraps malformed provider results in a safe typed error", async () => {
    const provider = new GoogleCloudVisionOcrProvider(
      new FakeGoogleClient(undefined as unknown as GoogleVisionDocumentTextResponse),
    );

    await expect(provider.extract(createInput())).rejects.toMatchObject({
      code: "ocr_provider_failed",
      message: "Google Cloud Vision OCR failed.",
    });
  });

  it("wraps client exceptions without leaking exception text", async () => {
    const provider = new GoogleCloudVisionOcrProvider(
      new FakeGoogleClient(new Error("credential raw-secret-value")),
    );

    await expect(provider.extract(createInput())).rejects.toMatchObject({
      code: "ocr_provider_failed",
      message: "Google Cloud Vision OCR failed.",
    });

    await provider.extract(createInput()).catch((error: unknown) => {
      expect(error).toBeInstanceOf(OcrProviderError);
      expect(JSON.stringify(error)).not.toContain("raw-secret-value");
    });
  });

  it("does not return raw Google response objects", async () => {
    const provider = createProvider({
      fullTextAnnotation: {
        text: "Safe text",
        pages: [page([paragraph("Safe text", 10, 10)])],
      },
      textAnnotations: [{ description: "raw annotation duplicate" }],
    });

    const result = await provider.extract(createInput());
    const serialized = JSON.stringify(result);

    expect(serialized).not.toContain("fullTextAnnotation");
    expect(serialized).not.toContain("textAnnotations");
    expect(serialized).not.toContain("raw annotation duplicate");
  });
});

function createProvider(
  response: GoogleVisionDocumentTextResponse,
): GoogleCloudVisionOcrProvider {
  return new GoogleCloudVisionOcrProvider(new FakeGoogleClient(response));
}

function createInput() {
  return {
    kind: "image" as const,
    mimeType: "image/png" as const,
    bytes: new Uint8Array([137, 80, 78, 71]),
  };
}

function page(paragraphs: readonly ReturnType<typeof paragraph>[]) {
  return {
    width: 640,
    height: 480,
    blocks: [
      {
        boundingBox: box(0, 0),
        paragraphs,
      },
    ],
  };
}

function paragraph(
  text: string,
  x: number,
  y: number,
  confidence?: number,
) {
  const symbols = Array.from(text).map((character, index) => ({
    text: character,
    boundingBox: box(x + index * 8, y),
    ...(confidence !== undefined ? { confidence } : {}),
    ...(index === text.length - 1
      ? { property: { detectedBreak: { type: "LINE_BREAK" } } }
      : {}),
  }));

  return {
    boundingBox: box(x, y),
    ...(confidence !== undefined ? { confidence } : {}),
    words: [
      {
        boundingBox: box(x, y),
        ...(confidence !== undefined ? { confidence } : {}),
        symbols,
      },
    ],
  };
}

function box(x: number, y: number) {
  return {
    vertices: [
      { x, y },
      { x: x + 10, y },
      { x: x + 10, y: y + 10 },
      { x, y: y + 10 },
    ],
  };
}

class FakeGoogleClient implements GoogleVisionDocumentTextClient {
  public lastRequest?: GoogleVisionDocumentTextRequest;

  public constructor(
    private readonly response: GoogleVisionDocumentTextResponse | Error,
  ) {}

  public async documentTextDetection(
    request: GoogleVisionDocumentTextRequest,
  ): Promise<GoogleVisionDocumentTextResponse> {
    this.lastRequest = request;
    if (this.response instanceof Error) {
      throw this.response;
    }
    return this.response;
  }
}
