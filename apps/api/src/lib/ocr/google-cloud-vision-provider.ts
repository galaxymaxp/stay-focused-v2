import {
  normalizeOcrResult,
  OcrProviderError,
  type NormalizeOcrResultInput,
  type OcrBlockKind,
  type OcrBoundingBox,
  type OcrDraftBlock,
  type OcrDraftLine,
  type OcrDraftPage,
  type OcrImageMimeType,
  type OcrInput,
  type OcrPdfMimeType,
  type OcrProvider,
  type OcrResult,
  type OcrWarning,
} from "@stay-focused/ocr";

export const GOOGLE_CLOUD_VISION_PROVIDER_ID = "google-cloud-vision";

export interface GoogleVisionDocumentTextRequest {
  readonly image: {
    readonly content: Uint8Array;
  };
  readonly mimeType: OcrImageMimeType;
}

export interface GoogleVisionPdfTextRequest {
  readonly inputConfig: {
    readonly content: Uint8Array;
    readonly mimeType: OcrPdfMimeType;
  };
  readonly pages: readonly number[];
}

export interface GoogleVisionDocumentTextClient {
  documentTextDetection(
    request: GoogleVisionDocumentTextRequest,
  ): Promise<GoogleVisionDocumentTextResponse>;
  batchAnnotateFiles(
    request: GoogleVisionPdfTextRequest,
  ): Promise<GoogleVisionBatchAnnotateFilesResponse>;
}

export interface GoogleVisionDocumentTextResponse {
  readonly fullTextAnnotation?: GoogleVisionFullTextAnnotation | null;
  readonly textAnnotations?: readonly GoogleVisionEntityAnnotation[] | null;
  readonly error?: GoogleVisionResponseError | null;
}

export interface GoogleVisionBatchAnnotateFilesResponse {
  readonly responses?: readonly GoogleVisionAnnotateFileResponse[] | null;
}

export interface GoogleVisionAnnotateFileResponse {
  readonly responses?: readonly GoogleVisionDocumentTextResponse[] | null;
  readonly error?: GoogleVisionResponseError | null;
}

interface GoogleVisionResponseError {
  readonly code?: number | null;
  readonly message?: string | null;
}

interface GoogleVisionEntityAnnotation {
  readonly description?: string | null;
}

interface GoogleVisionFullTextAnnotation {
  readonly text?: string | null;
  readonly pages?: readonly GoogleVisionPage[] | null;
}

interface GoogleVisionPage {
  readonly width?: number | null;
  readonly height?: number | null;
  readonly confidence?: number | null;
  readonly blocks?: readonly GoogleVisionBlock[] | null;
}

interface GoogleVisionBlock {
  readonly boundingBox?: GoogleVisionBoundingPoly | null;
  readonly confidence?: number | null;
  readonly paragraphs?: readonly GoogleVisionParagraph[] | null;
}

interface GoogleVisionParagraph {
  readonly boundingBox?: GoogleVisionBoundingPoly | null;
  readonly confidence?: number | null;
  readonly words?: readonly GoogleVisionWord[] | null;
}

interface GoogleVisionWord {
  readonly boundingBox?: GoogleVisionBoundingPoly | null;
  readonly confidence?: number | null;
  readonly symbols?: readonly GoogleVisionSymbol[] | null;
}

interface GoogleVisionSymbol {
  readonly text?: string | null;
  readonly boundingBox?: GoogleVisionBoundingPoly | null;
  readonly confidence?: number | null;
  readonly property?: {
    readonly detectedBreak?: {
      readonly type?: string | null;
    } | null;
  } | null;
}

interface GoogleVisionBoundingPoly {
  readonly vertices?: readonly GoogleVisionVertex[] | null;
  readonly normalizedVertices?: readonly GoogleVisionVertex[] | null;
}

interface GoogleVisionVertex {
  readonly x?: number | null;
  readonly y?: number | null;
}

interface LineAccumulator {
  readonly textParts: string[];
  readonly boxes: OcrBoundingBox[];
  readonly confidences: number[];
}

export class GoogleCloudVisionOcrProvider implements OcrProvider {
  public readonly id = GOOGLE_CLOUD_VISION_PROVIDER_ID;

  public constructor(private readonly client: GoogleVisionDocumentTextClient) {
    if (
      !client ||
      typeof client.documentTextDetection !== "function" ||
      typeof client.batchAnnotateFiles !== "function"
    ) {
      throw new OcrProviderError({
        code: "ocr_not_configured",
        message: "Google Cloud Vision OCR client is not configured.",
        provider: this.id,
      });
    }
  }

  public async extract(input: OcrInput): Promise<OcrResult> {
    return input.kind === "image"
      ? await this.extractImage(input)
      : await this.extractPdf(input);
  }

  private async extractImage(input: Extract<OcrInput, { readonly kind: "image" }>): Promise<OcrResult> {
    let response: unknown;
    try {
      response = await this.client.documentTextDetection({
        image: { content: input.bytes },
        mimeType: input.mimeType,
      });
    } catch (error) {
      throw providerFailure(error);
    }

    const result = normalizeOcrResult(
      mapGoogleVisionResponse(response, input.mimeType),
    );
    if (result.text.length === 0) {
      throw new OcrProviderError({
        code: "ocr_empty_result",
        message: "Google Cloud Vision OCR returned no extracted text.",
        provider: this.id,
      });
    }

    return result;
  }

  private async extractPdf(input: Extract<OcrInput, { readonly kind: "pdf" }>): Promise<OcrResult> {
    if (input.requestedPages.length === 0) {
      throw providerFailure(new Error("PDF OCR requires at least one page."));
    }

    let response: unknown;
    try {
      response = await this.client.batchAnnotateFiles({
        inputConfig: {
          content: input.bytes,
          mimeType: input.mimeType,
        },
        pages: input.requestedPages,
      });
    } catch (error) {
      throw providerFailure(error);
    }

    const result = normalizeOcrResult(
      mapGoogleVisionPdfResponse(response, input.mimeType, input.requestedPages),
    );
    return result;
  }
}

function mapGoogleVisionResponse(
  response: unknown,
  mimeType: OcrImageMimeType,
): NormalizeOcrResultInput {
  if (!isGoogleVisionDocumentTextResponse(response)) {
    throw providerFailure(new Error("Malformed Google Vision response."));
  }

  const providerError = readNonEmptyString(response.error?.message);
  if (providerError) {
    throw providerFailure(new Error("Google Vision returned an error."));
  }

  const annotation = response.fullTextAnnotation;
  const fullText = readNonEmptyString(annotation?.text);
  const warnings: OcrWarning[] = [];
  const pages = Array.isArray(annotation?.pages)
    ? annotation.pages.map((page, index) => mapPage(page, index + 1))
    : [];

  if (pages.length > 0) {
    const pagesHaveText = pages.some((page) => {
      const pageText = page.text ?? "";
      const blockText = page.blocks
        ?.map((block) => block.text ?? "")
        .join("\n") ?? "";
      return pageText.trim().length > 0 || blockText.trim().length > 0;
    });

    return {
      mimeType,
      provider: GOOGLE_CLOUD_VISION_PROVIDER_ID,
      pages: pagesHaveText ? pages : [{ pageNumber: 1, text: fullText ?? "" }],
      warnings,
    };
  }

  const fallbackText =
    fullText ??
    readNonEmptyString(response.textAnnotations?.[0]?.description) ??
    "";
  if (fallbackText) {
    warnings.push({
      code: "missing_layout",
      message: "Google Cloud Vision returned text without page layout.",
    });
  }

  return {
    mimeType,
    provider: GOOGLE_CLOUD_VISION_PROVIDER_ID,
    pages: fallbackText ? [{ pageNumber: 1, text: fallbackText }] : [],
    warnings,
  };
}

function mapGoogleVisionPdfResponse(
  response: unknown,
  mimeType: OcrPdfMimeType,
  requestedPages: readonly number[],
): NormalizeOcrResultInput {
  if (!isGoogleVisionBatchAnnotateFilesResponse(response)) {
    throw providerFailure(new Error("Malformed Google Vision PDF response."));
  }

  const fileResponse = (response.responses ?? [])[0];
  if (!fileResponse) {
    throw providerFailure(new Error("Google Vision returned no file response."));
  }

  const fileError = readNonEmptyString(fileResponse.error?.message);
  if (fileError) {
    throw providerFailure(new Error("Google Vision returned a file error."));
  }

  const pageResponses = Array.isArray(fileResponse.responses)
    ? fileResponse.responses
    : [];

  const warnings: OcrWarning[] = [];
  const lastRequestedPage = requestedPages.at(-1) ?? 0;
  const pages = pageResponses.map((pageResponse, index) =>
    mapPdfPageResponse(
      pageResponse,
      requestedPages[index] ?? lastRequestedPage + index - requestedPages.length + 1,
      warnings,
    ),
  );

  return {
    mimeType,
    provider: GOOGLE_CLOUD_VISION_PROVIDER_ID,
    pages,
    warnings,
  };
}

function mapPdfPageResponse(
  response: unknown,
  pageNumber: number,
  warnings: OcrWarning[],
): OcrDraftPage {
  if (!isGoogleVisionDocumentTextResponse(response)) {
    return failedPdfPage(pageNumber, "malformed_page_result");
  }

  const pageError = readNonEmptyString(response.error?.message);
  if (pageError) {
    return failedPdfPage(pageNumber, "provider_page_error");
  }

  const annotation = response.fullTextAnnotation;
  const fullText = readNonEmptyString(annotation?.text);
  const annotationPages = Array.isArray(annotation?.pages) ? annotation.pages : [];
  const annotationPage = annotationPages[0];
  if (annotationPage) {
    const mappedPage = mapPage(annotationPage, pageNumber);
    const hasMappedText = (mappedPage.blocks ?? []).some(
      (block) => (block.text ?? "").trim().length > 0,
    );
    if (hasMappedText || !fullText) {
      return mappedPage;
    }

    warnings.push({
      code: "missing_layout",
      message: "Google Cloud Vision returned text without page layout.",
      pageNumber,
    });
    return {
      ...mappedPage,
      status: "text_extracted",
      method: "ocr",
      text: fullText,
    };
  }

  const fallbackText =
    fullText ??
    readNonEmptyString(response.textAnnotations?.[0]?.description) ??
    "";
  if (fallbackText) {
    warnings.push({
      code: "missing_layout",
      message: "Google Cloud Vision returned text without page layout.",
      pageNumber,
    });
  }

  return {
    pageNumber,
    status: fallbackText ? "text_extracted" : "blank",
    method: fallbackText ? "ocr" : "blank",
    text: fallbackText,
  };
}

function failedPdfPage(
  pageNumber: number,
  failureCategory: "malformed_page_result" | "provider_page_error",
): OcrDraftPage {
  return {
    pageNumber,
    status: "failed",
    method: "ocr",
    failureCategory,
    text: "",
    blocks: [],
  };
}

function mapPage(page: GoogleVisionPage, pageNumber: number): OcrDraftPage {
  return {
    pageNumber,
    blocks: mapBlocks(page.blocks ?? []),
    ...(readPositiveNumber(page.width) !== undefined
      ? { width: readPositiveNumber(page.width) }
      : {}),
    ...(readPositiveNumber(page.height) !== undefined
      ? { height: readPositiveNumber(page.height) }
      : {}),
    ...(readFiniteNumber(page.confidence) !== undefined
      ? { confidence: readFiniteNumber(page.confidence) }
      : {}),
  };
}

function mapBlocks(blocks: readonly GoogleVisionBlock[]): readonly OcrDraftBlock[] {
  const mappedBlocks: OcrDraftBlock[] = [];

  for (const block of blocks) {
    const paragraphs = block.paragraphs ?? [];
    if (paragraphs.length === 0) {
      mappedBlocks.push(mapLayoutBlock("block", block.boundingBox, block.confidence));
      continue;
    }

    for (const paragraph of paragraphs) {
      const lines = paragraphToLines(paragraph);
      mappedBlocks.push({
        kind: "paragraph",
        text: lines.map((line) => line.text ?? "").join("\n"),
        lines,
        ...(readBoundingBox(paragraph.boundingBox) !== undefined
          ? { boundingBox: readBoundingBox(paragraph.boundingBox) }
          : {}),
        ...(readFiniteNumber(paragraph.confidence) !== undefined
          ? { confidence: readFiniteNumber(paragraph.confidence) }
          : {}),
      });
    }
  }

  return mappedBlocks;
}

function mapLayoutBlock(
  kind: OcrBlockKind,
  boundingBox: GoogleVisionBoundingPoly | null | undefined,
  confidence: number | null | undefined,
): OcrDraftBlock {
  return {
    kind,
    ...(readBoundingBox(boundingBox) !== undefined
      ? { boundingBox: readBoundingBox(boundingBox) }
      : {}),
    ...(readFiniteNumber(confidence) !== undefined
      ? { confidence: readFiniteNumber(confidence) }
      : {}),
  };
}

function paragraphToLines(
  paragraph: GoogleVisionParagraph,
): readonly OcrDraftLine[] {
  const lines: OcrDraftLine[] = [];
  let accumulator = createLineAccumulator();

  for (const word of paragraph.words ?? []) {
    for (const symbol of word.symbols ?? []) {
      appendSymbol(accumulator, symbol, word.confidence);
      const breakType = symbol.property?.detectedBreak?.type ?? "";
      if (breakType === "SPACE" || breakType === "SURE_SPACE") {
        accumulator.textParts.push(" ");
      }
      if (breakType === "EOL_SURE_SPACE") {
        accumulator.textParts.push(" ");
        pushLine(lines, accumulator);
        accumulator = createLineAccumulator();
      }
      if (breakType === "LINE_BREAK") {
        pushLine(lines, accumulator);
        accumulator = createLineAccumulator();
      }
    }
  }

  pushLine(lines, accumulator);
  return lines;
}

function appendSymbol(
  accumulator: LineAccumulator,
  symbol: GoogleVisionSymbol,
  wordConfidence: number | null | undefined,
): void {
  const text = symbol.text ?? "";
  if (text) {
    accumulator.textParts.push(text);
  }

  const symbolBox = readBoundingBox(symbol.boundingBox);
  if (symbolBox) {
    accumulator.boxes.push(symbolBox);
  }

  const confidence =
    readFiniteNumber(symbol.confidence) ?? readFiniteNumber(wordConfidence);
  if (confidence !== undefined) {
    accumulator.confidences.push(confidence);
  }
}

function pushLine(
  lines: OcrDraftLine[],
  accumulator: LineAccumulator,
): void {
  const text = accumulator.textParts.join("").trimEnd();
  if (!text && accumulator.boxes.length === 0) {
    return;
  }

  lines.push({
    text,
    ...(combineBoxes(accumulator.boxes) !== undefined
      ? { boundingBox: combineBoxes(accumulator.boxes) }
      : {}),
    ...(average(accumulator.confidences) !== undefined
      ? { confidence: average(accumulator.confidences) }
      : {}),
  });
}

function createLineAccumulator(): LineAccumulator {
  return {
    textParts: [],
    boxes: [],
    confidences: [],
  };
}

function readBoundingBox(
  boundingPoly: GoogleVisionBoundingPoly | null | undefined,
): OcrBoundingBox | undefined {
  const vertices = boundingPoly?.vertices ?? boundingPoly?.normalizedVertices;
  if (!vertices || vertices.length === 0) {
    return undefined;
  }

  const points = vertices
    .map((vertex) => ({
      x: readFiniteNumber(vertex.x),
      y: readFiniteNumber(vertex.y),
    }))
    .filter(
      (point): point is { readonly x: number; readonly y: number } =>
        point.x !== undefined && point.y !== undefined,
    );

  return points.length > 0 ? { vertices: points } : undefined;
}

function combineBoxes(
  boxes: readonly OcrBoundingBox[],
): OcrBoundingBox | undefined {
  const points = boxes.flatMap((box) => box.vertices);
  if (points.length === 0) {
    return undefined;
  }

  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  const left = Math.min(...xs);
  const right = Math.max(...xs);
  const top = Math.min(...ys);
  const bottom = Math.max(...ys);

  return {
    vertices: [
      { x: left, y: top },
      { x: right, y: top },
      { x: right, y: bottom },
      { x: left, y: bottom },
    ],
  };
}

function average(values: readonly number[]): number | undefined {
  if (values.length === 0) {
    return undefined;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function readPositiveNumber(value: unknown): number | undefined {
  const number = readFiniteNumber(value);
  return number !== undefined && number > 0 ? number : undefined;
}

function readFiniteNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function readNonEmptyString(value: unknown): string | undefined {
  const normalized = typeof value === "string" ? value.trim() : "";
  return normalized ? normalized : undefined;
}

function providerFailure(error: unknown): OcrProviderError {
  void error;
  return new OcrProviderError({
    code: "ocr_provider_failed",
    message: "Google Cloud Vision OCR failed.",
    provider: GOOGLE_CLOUD_VISION_PROVIDER_ID,
  });
}

function isGoogleVisionBatchAnnotateFilesResponse(
  value: unknown,
): value is GoogleVisionBatchAnnotateFilesResponse {
  return isRecord(value) && Array.isArray(value.responses);
}

function isGoogleVisionDocumentTextResponse(
  value: unknown,
): value is GoogleVisionDocumentTextResponse {
  return isRecord(value);
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
