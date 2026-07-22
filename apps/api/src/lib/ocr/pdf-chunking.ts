import { PDFDocument } from "pdf-lib";

export interface PdfOcrChunk {
  readonly bytes: Uint8Array;
  readonly originalPageNumbers: readonly number[];
  readonly requestedPages: readonly number[];
}

export async function createPdfOcrChunks({
  bytes,
  pageNumbers,
  pagesPerChunk,
}: {
  readonly bytes: Uint8Array;
  readonly pageNumbers: readonly number[];
  readonly pagesPerChunk: number;
}): Promise<readonly PdfOcrChunk[]> {
  if (!Number.isInteger(pagesPerChunk) || pagesPerChunk < 1) {
    throw new Error("PDF OCR chunk size must be a positive integer.");
  }
  if (new Set(pageNumbers).size !== pageNumbers.length) {
    throw new Error("PDF OCR page numbers must be unique.");
  }

  const source = await PDFDocument.load(bytes, { updateMetadata: false });
  const sourcePageCount = source.getPageCount();
  const sortedPageNumbers = [...pageNumbers].sort((left, right) => left - right);
  if (
    sortedPageNumbers.some(
      (pageNumber) =>
        !Number.isInteger(pageNumber) ||
        pageNumber < 1 ||
        pageNumber > sourcePageCount,
    )
  ) {
    throw new Error("PDF OCR page number is outside the source document.");
  }

  const chunks: PdfOcrChunk[] = [];
  for (let offset = 0; offset < sortedPageNumbers.length; offset += pagesPerChunk) {
    const originalPageNumbers = sortedPageNumbers.slice(offset, offset + pagesPerChunk);
    const document = await PDFDocument.create();
    const copiedPages = await document.copyPages(
      source,
      originalPageNumbers.map((pageNumber) => pageNumber - 1),
    );
    for (const page of copiedPages) {
      document.addPage(page);
    }

    const chunkBytes = await document.save({ useObjectStreams: false });
    chunks.push({
      bytes: chunkBytes,
      originalPageNumbers,
      requestedPages: originalPageNumbers.map((_, index) => index + 1),
    });
  }

  return chunks;
}

export async function mapWithConcurrency<TInput, TOutput>(
  values: readonly TInput[],
  concurrency: number,
  mapper: (value: TInput, index: number) => Promise<TOutput>,
): Promise<readonly TOutput[]> {
  if (!Number.isInteger(concurrency) || concurrency < 1) {
    throw new Error("Concurrency must be a positive integer.");
  }

  const results = new Array<TOutput>(values.length);
  let nextIndex = 0;

  const worker = async (): Promise<void> => {
    while (true) {
      const index = nextIndex;
      nextIndex += 1;
      if (index >= values.length) {
        return;
      }
      const value = values[index];
      if (value === undefined) {
        return;
      }
      results[index] = await mapper(value, index);
    }
  };

  await Promise.all(
    Array.from(
      { length: Math.min(concurrency, values.length) },
      async () => await worker(),
    ),
  );
  return results;
}
