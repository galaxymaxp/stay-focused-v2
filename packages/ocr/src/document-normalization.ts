import type { OcrPage } from "./types";

export interface RemovedBoilerplateEvidence {
  readonly fingerprint: string;
  readonly position: "top" | "bottom";
  readonly exactText: string;
  readonly pageNumbers: readonly number[];
}

export interface DocumentTextNormalizationDiagnostics {
  readonly version: "document-text-normalization-v1";
  readonly rawCharacterCount: number;
  readonly normalizedCharacterCount: number;
  readonly removedLineCount: number;
  readonly removedCandidates: readonly RemovedBoilerplateEvidence[];
  readonly warnings: readonly string[];
}

export interface NormalizedDocumentText {
  readonly text: string;
  readonly pages: readonly NormalizedDocumentPageText[];
  readonly diagnostics: DocumentTextNormalizationDiagnostics;
}

export interface NormalizedDocumentPageText {
  readonly pageNumber: number;
  readonly text: string;
}

const MIN_PAGE_LINES_FOR_BOILERPLATE = 5;
const MIN_BOILERPLATE_OCCURRENCES = 3;
const MAX_BOILERPLATE_LINE_CHARS = 160;

export function normalizeDocumentTextWithEvidence(
  pages: readonly OcrPage[],
): NormalizedDocumentText {
  const readablePages = pages
    .filter((page) => page.status === "text_extracted")
    .sort((left, right) => left.pageNumber - right.pageNumber);
  const pageLines = readablePages.map((page) => ({
    pageNumber: page.pageNumber,
    lines: normalizeLines(page.text),
  }));
  const rawText = joinPages(pageLines.map((page) => page.lines));
  const candidateThreshold = Math.max(
    MIN_BOILERPLATE_OCCURRENCES,
    Math.ceil(readablePages.length * 0.6),
  );
  const candidates = collectStableRegionCandidates(pageLines, candidateThreshold);
  const candidateKeys = new Set(
    candidates.map((candidate) => `${candidate.position}:${candidate.exactText}`),
  );
  let removedLineCount = 0;
  const normalizedPages = pageLines.map(({ pageNumber, lines }) => {
    if (lines.filter((line) => line.trim()).length < MIN_PAGE_LINES_FOR_BOILERPLATE) {
      return { pageNumber, lines };
    }

    const first = firstNonBlankIndex(lines);
    const last = lastNonBlankIndex(lines);
    return {
      pageNumber,
      lines: lines.filter((line, index) => {
        const position = index === first ? "top" : index === last ? "bottom" : null;
        if (!position || !candidateKeys.has(`${position}:${line.trim()}`)) {
          return true;
        }
        removedLineCount += 1;
        return false;
      }),
    };
  });
  const normalizedPageText = normalizedPages.map(({ pageNumber, lines }) => ({
    pageNumber,
    text: lines.join("\n").trim(),
  }));
  const text = joinPages(normalizedPages.map((page) => page.lines));

  return {
    text,
    pages: normalizedPageText,
    diagnostics: {
      version: "document-text-normalization-v1",
      rawCharacterCount: rawText.length,
      normalizedCharacterCount: text.length,
      removedLineCount,
      removedCandidates: candidates,
      warnings:
        removedLineCount > 0
          ? [
              "Repeated page-region boilerplate was removed; raw page text remains available for audit.",
            ]
          : [],
    },
  };
}

function collectStableRegionCandidates(
  pages: readonly { readonly pageNumber: number; readonly lines: readonly string[] }[],
  threshold: number,
): readonly RemovedBoilerplateEvidence[] {
  const occurrences = new Map<
    string,
    { position: "top" | "bottom"; text: string; pages: number[] }
  >();

  for (const page of pages) {
    const nonBlank = page.lines.filter((line) => line.trim());
    if (nonBlank.length < MIN_PAGE_LINES_FOR_BOILERPLATE) continue;
    const regions = [
      { position: "top" as const, text: nonBlank[0]?.trim() ?? "" },
      { position: "bottom" as const, text: nonBlank.at(-1)?.trim() ?? "" },
    ];
    for (const region of regions) {
      if (!isEligibleCandidate(region.text)) continue;
      const key = `${region.position}:${region.text}`;
      const existing = occurrences.get(key) ?? {
        position: region.position,
        text: region.text,
        pages: [],
      };
      existing.pages.push(page.pageNumber);
      occurrences.set(key, existing);
    }
  }

  return [...occurrences.values()]
    .filter((candidate) => candidate.pages.length >= threshold)
    .map((candidate) => ({
      fingerprint: stableTextFingerprint(
        `${candidate.position}\0${candidate.text}`,
      ),
      position: candidate.position,
      exactText: candidate.text,
      pageNumbers: candidate.pages,
    }));
}

function stableTextFingerprint(value: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return `fnv1a32-${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

function isEligibleCandidate(value: string): boolean {
  return (
    value.length >= 2 &&
    value.length <= MAX_BOILERPLATE_LINE_CHARS &&
    !/^[-–—•*]+$/.test(value)
  );
}

function normalizeLines(text: string): readonly string[] {
  const lines = text
    .replace(/\0/g, "")
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) => line.replace(/[\t ]+$/g, ""));
  while (lines[0]?.trim() === "") lines.shift();
  while (lines.at(-1)?.trim() === "") lines.pop();
  return lines;
}

function joinPages(pages: readonly (readonly string[])[]): string {
  return pages
    .map((lines) => lines.join("\n").trim())
    .filter(Boolean)
    .join("\n\n")
    .trim();
}

function firstNonBlankIndex(lines: readonly string[]): number {
  return lines.findIndex((line) => line.trim().length > 0);
}

function lastNonBlankIndex(lines: readonly string[]): number {
  for (let index = lines.length - 1; index >= 0; index -= 1) {
    if (lines[index]?.trim()) return index;
  }
  return -1;
}
