import { normalizeOcrText } from "./normalize";
import type {
  DocumentExtractionDiagnostics,
  DocumentExtractionFailureCategory,
  DocumentExtractionVerification,
  OcrPage,
  PageExtractionFailureCategory,
  PageExtractionMethod,
  PageExtractionStatus,
} from "./types";

export function verifyDocumentExtraction({
  expectedPageCount,
  pages,
}: {
  readonly expectedPageCount: number;
  readonly pages: readonly unknown[];
}): DocumentExtractionVerification {
  if (!isPositiveInteger(expectedPageCount)) {
    return failedVerification({
      expectedPageCount,
      failureCategories: ["invalid_expected_page_count"],
    });
  }

  const validPages: OcrPage[] = [];
  const invalidPageNumbers: number[] = [];
  let hasMalformedPageResult = false;
  const occurrenceCounts = new Map<number, number>();
  const outOfRangePageNumbers: number[] = [];

  for (const value of pages) {
    const pageNumber = readIntegerPageNumber(value);
    if (pageNumber !== undefined) {
      occurrenceCounts.set(pageNumber, (occurrenceCounts.get(pageNumber) ?? 0) + 1);
      if (pageNumber < 1 || pageNumber > expectedPageCount) {
        outOfRangePageNumbers.push(pageNumber);
      }
    }

    if (!isValidTerminalPage(value)) {
      hasMalformedPageResult = true;
      if (pageNumber !== undefined && pageNumber >= 1 && pageNumber <= expectedPageCount) {
        invalidPageNumbers.push(pageNumber);
      }
      continue;
    }

    validPages.push(value);
  }

  const duplicatePageNumbers = sortedUnique(
    [...occurrenceCounts.entries()]
      .filter(([, count]) => count > 1)
      .map(([pageNumber]) => pageNumber),
  );
  const representedPageNumbers = new Set(
    [...occurrenceCounts.keys()].filter(
      (pageNumber) => pageNumber >= 1 && pageNumber <= expectedPageCount,
    ),
  );
  const missingPageNumbers = Array.from(
    { length: expectedPageCount },
    (_, index) => index + 1,
  ).filter((pageNumber) => !representedPageNumbers.has(pageNumber));
  const orderedPages = [...validPages].sort(
    (left, right) => left.pageNumber - right.pageNumber,
  );
  const inRangePages = orderedPages.filter(
    (page) => page.pageNumber >= 1 && page.pageNumber <= expectedPageCount,
  );
  const successfulPageCount = inRangePages.filter(
    (page) => page.status === "text_extracted",
  ).length;
  const blankPageCount = inRangePages.filter(
    (page) => page.status === "blank",
  ).length;
  const failedPages = inRangePages.filter((page) => page.status === "failed");
  const failedPageNumbers = failedPages.map((page) => page.pageNumber);
  const normalizedInvalidPageNumbers = sortedUnique(invalidPageNumbers);
  const normalizedOutOfRangePageNumbers = sortedUnique(outOfRangePageNumbers);

  const failureCategories: DocumentExtractionFailureCategory[] = [];
  if (missingPageNumbers.length > 0) {
    failureCategories.push("missing_page");
  }
  if (duplicatePageNumbers.length > 0) {
    failureCategories.push("duplicate_page");
  }
  if (normalizedOutOfRangePageNumbers.length > 0) {
    failureCategories.push("out_of_range_page");
  }
  if (hasMalformedPageResult) {
    failureCategories.push("malformed_page_result");
  }
  if (failedPages.length > 0) {
    failureCategories.push("failed_page");
  }

  const affectedPageNumbers = sortedUnique([
    ...missingPageNumbers,
    ...duplicatePageNumbers,
    ...normalizedOutOfRangePageNumbers,
    ...normalizedInvalidPageNumbers,
    ...failedPageNumbers,
  ]);
  const baseDiagnostics = {
    expectedPageCount,
    processedPageCount: inRangePages.length,
    successfulPageCount,
    blankPageCount,
    failedPageCount: failedPages.length,
    missingPageNumbers,
    duplicatePageNumbers,
    outOfRangePageNumbers: normalizedOutOfRangePageNumbers,
    invalidPageNumbers: normalizedInvalidPageNumbers,
    affectedPageNumbers,
  };

  if (failureCategories.length > 0) {
    return {
      status: "incomplete",
      sourceEligible: false,
      text: "",
      pages: orderedPages,
      diagnostics: {
        status: "incomplete",
        ...baseDiagnostics,
        failureCategories,
      },
    };
  }

  const text = normalizeOcrText(
    orderedPages
      .filter((page) => page.status === "text_extracted")
      .map((page) => page.text)
      .join("\n\n"),
  );
  if (!text) {
    return {
      status: "failed",
      sourceEligible: false,
      text: "",
      pages: orderedPages,
      diagnostics: {
        status: "failed",
        ...baseDiagnostics,
        failureCategories: ["empty_document"],
      },
    };
  }

  return {
    status: "complete",
    sourceEligible: true,
    text,
    pages: orderedPages,
    diagnostics: {
      status: "complete",
      ...baseDiagnostics,
      failureCategories: [],
    },
  };
}

export function createFailedDocumentExtractionDiagnostics({
  expectedPageCount,
  failureCategory,
}: {
  readonly expectedPageCount: number;
  readonly failureCategory: "provider_failure" | "internal_failure";
}): DocumentExtractionDiagnostics {
  const safeExpectedPageCount = isPositiveInteger(expectedPageCount)
    ? expectedPageCount
    : 0;
  const missingPageNumbers = Array.from(
    { length: safeExpectedPageCount },
    (_, index) => index + 1,
  );

  return {
    status: "failed",
    expectedPageCount: safeExpectedPageCount,
    processedPageCount: 0,
    successfulPageCount: 0,
    blankPageCount: 0,
    failedPageCount: 0,
    missingPageNumbers,
    duplicatePageNumbers: [],
    outOfRangePageNumbers: [],
    invalidPageNumbers: [],
    affectedPageNumbers: missingPageNumbers,
    failureCategories: [failureCategory],
  };
}

function failedVerification({
  expectedPageCount,
  failureCategories,
}: {
  readonly expectedPageCount: number;
  readonly failureCategories: readonly DocumentExtractionFailureCategory[];
}): DocumentExtractionVerification {
  return {
    status: "failed",
    sourceEligible: false,
    text: "",
    pages: [],
    diagnostics: {
      status: "failed",
      expectedPageCount: isPositiveInteger(expectedPageCount)
        ? expectedPageCount
        : 0,
      processedPageCount: 0,
      successfulPageCount: 0,
      blankPageCount: 0,
      failedPageCount: 0,
      missingPageNumbers: [],
      duplicatePageNumbers: [],
      outOfRangePageNumbers: [],
      invalidPageNumbers: [],
      affectedPageNumbers: [],
      failureCategories,
    },
  };
}

function isValidTerminalPage(value: unknown): value is OcrPage {
  if (!isRecord(value)) {
    return false;
  }

  const pageNumber = value.pageNumber;
  const status = value.status;
  const method = value.method;
  const text = value.text;
  const blocks = value.blocks;
  const failureCategory = value.failureCategory;

  if (
    !isInteger(pageNumber) ||
    !isPageExtractionStatus(status) ||
    !isPageExtractionMethod(method) ||
    typeof text !== "string" ||
    !Array.isArray(blocks)
  ) {
    return false;
  }

  if (status === "text_extracted") {
    return (
      normalizeOcrText(text).length > 0 &&
      (method === "ocr" || method === "native_text") &&
      failureCategory === undefined
    );
  }

  if (status === "blank") {
    return (
      normalizeOcrText(text).length === 0 &&
      blocks.length === 0 &&
      method === "blank" &&
      failureCategory === undefined
    );
  }

  return (
    normalizeOcrText(text).length === 0 &&
    blocks.length === 0 &&
    method !== "blank" &&
    isPageExtractionFailureCategory(failureCategory)
  );
}

function readIntegerPageNumber(value: unknown): number | undefined {
  if (!isRecord(value) || !isInteger(value.pageNumber)) {
    return undefined;
  }
  return value.pageNumber;
}

function isPageExtractionStatus(value: unknown): value is PageExtractionStatus {
  return value === "text_extracted" || value === "blank" || value === "failed";
}

function isPageExtractionMethod(value: unknown): value is PageExtractionMethod {
  return value === "native_text" || value === "ocr" || value === "blank";
}

function isPageExtractionFailureCategory(
  value: unknown,
): value is PageExtractionFailureCategory {
  return (
    value === "provider_page_error" ||
    value === "malformed_page_result" ||
    value === "unresolved_page"
  );
}

function sortedUnique(values: readonly number[]): readonly number[] {
  return [...new Set(values)].sort((left, right) => left - right);
}

function isPositiveInteger(value: unknown): value is number {
  return isInteger(value) && value > 0;
}

function isInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && Number.isInteger(value);
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
