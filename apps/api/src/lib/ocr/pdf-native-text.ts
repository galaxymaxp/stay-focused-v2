import {
  OPS,
  getDocument,
} from "pdfjs-dist/legacy/build/pdf.mjs";
import type {
  TextContent,
  TextItem,
} from "pdfjs-dist/types/src/display/api";

import { normalizeOcrText } from "@stay-focused/ocr";

export type PdfPageInspection =
  | {
      readonly pageNumber: number;
      readonly kind: "native_text";
      readonly text: string;
    }
  | {
      readonly pageNumber: number;
      readonly kind: "blank" | "ocr";
      readonly text: "";
    };

const VISIBLE_OPERATOR_IDS = new Set<number>([
  OPS.showText,
  OPS.showSpacedText,
  OPS.nextLineShowText,
  OPS.nextLineSetSpacingShowText,
  OPS.shadingFill,
  OPS.paintXObject,
  OPS.paintImageMaskXObject,
  OPS.paintImageMaskXObjectGroup,
  OPS.paintImageXObject,
  OPS.paintInlineImageXObject,
  OPS.paintInlineImageXObjectGroup,
  OPS.paintImageXObjectRepeat,
  OPS.paintImageMaskXObjectRepeat,
  OPS.paintSolidColorImageMask,
  OPS.constructPath,
]);

export async function inspectPdfTextPages(
  bytes: Uint8Array,
  expectedPageCount: number,
): Promise<readonly PdfPageInspection[]> {
  const loadingTask = getDocument({
    data: bytes.slice(),
    isEvalSupported: false,
    useWorkerFetch: false,
  });

  try {
    const document = await loadingTask.promise;
    if (document.numPages !== expectedPageCount) {
      throw new Error("PDF page count changed during text inspection.");
    }

    const pages: PdfPageInspection[] = [];
    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
      const page = await document.getPage(pageNumber);
      try {
        const textContent = await page.getTextContent({
          disableNormalization: false,
          includeMarkedContent: false,
        });
        const text = assembleNativePageText(textContent);
        if (isUsableEmbeddedText(text)) {
          pages.push({ pageNumber, kind: "native_text", text });
          continue;
        }

        const operatorList = await page.getOperatorList();
        const hasVisibleContent = operatorList.fnArray.some((operatorId) =>
          VISIBLE_OPERATOR_IDS.has(operatorId),
        );
        pages.push({
          pageNumber,
          kind: hasVisibleContent ? "ocr" : "blank",
          text: "",
        });
      } finally {
        page.cleanup();
      }
    }

    return pages;
  } finally {
    await loadingTask.destroy();
  }
}

export function assembleNativePageText(textContent: TextContent): string {
  const lines: string[] = [];
  let currentLine = "";
  let previousItem: TextItem | undefined;
  let previousEndedLine = false;

  const pushLine = (): void => {
    const line = currentLine.trimEnd();
    if (line || lines.at(-1) !== "") {
      lines.push(line);
    }
    currentLine = "";
  };

  for (const value of textContent.items) {
    if (!("str" in value)) {
      continue;
    }

    const item = value;
    if (
      previousItem &&
      !previousEndedLine &&
      startsNewVisualLine(previousItem, item)
    ) {
      pushLine();
      if (hasParagraphGap(previousItem, item) && lines.at(-1) !== "") {
        lines.push("");
      }
    } else if (
      previousItem &&
      previousEndedLine &&
      hasParagraphGap(previousItem, item) &&
      lines.at(-1) !== ""
    ) {
      lines.push("");
    }

    if (item.str.trim().length === 0) {
      if (currentLine && !currentLine.endsWith(" ")) {
        currentLine += " ";
      }
    } else {
      if (currentLine && shouldInsertSpace(previousItem, item, currentLine)) {
        currentLine += " ";
      }
      currentLine += item.str;
    }

    if (item.hasEOL) {
      pushLine();
    }
    previousItem = item;
    previousEndedLine = item.hasEOL;
  }

  if (currentLine) {
    pushLine();
  }

  return normalizeOcrText(lines.join("\n"));
}

export function isUsableEmbeddedText(text: string): boolean {
  const normalized = normalizeOcrText(text);
  if (!normalized) {
    return false;
  }

  const meaningfulCharacters = normalized.match(/[\p{L}\p{N}\p{S}]/gu)?.length ?? 0;
  const replacementCharacters = normalized.match(/\uFFFD/g)?.length ?? 0;
  return meaningfulCharacters >= 2 && replacementCharacters <= meaningfulCharacters * 0.1;
}

function startsNewVisualLine(previous: TextItem, current: TextItem): boolean {
  if (previous.hasEOL) {
    return true;
  }

  const previousY = readCoordinate(previous.transform, 5);
  const currentY = readCoordinate(current.transform, 5);
  if (previousY === undefined || currentY === undefined) {
    return false;
  }

  const tolerance = Math.max(2, Math.min(previous.height, current.height) * 0.35);
  return Math.abs(previousY - currentY) > tolerance;
}

function hasParagraphGap(previous: TextItem, current: TextItem): boolean {
  const previousY = readCoordinate(previous.transform, 5);
  const currentY = readCoordinate(current.transform, 5);
  if (previousY === undefined || currentY === undefined) {
    return false;
  }

  const lineHeight = Math.max(previous.height, current.height, 1);
  return Math.abs(previousY - currentY) > lineHeight * 1.65;
}

function shouldInsertSpace(
  previous: TextItem | undefined,
  current: TextItem,
  currentLine: string,
): boolean {
  if (!previous || /\s$/u.test(currentLine) || /^[,.;:!?%)\]}]/u.test(current.str)) {
    return false;
  }

  const previousX = readCoordinate(previous.transform, 4);
  const currentX = readCoordinate(current.transform, 4);
  if (previousX === undefined || currentX === undefined) {
    return true;
  }

  return currentX - (previousX + previous.width) > 0.5;
}

function readCoordinate(
  transform: readonly unknown[],
  index: number,
): number | undefined {
  const value = transform[index];
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}
