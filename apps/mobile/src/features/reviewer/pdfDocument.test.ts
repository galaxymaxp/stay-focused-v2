/* eslint-disable import/first */
import { beforeEach, describe, expect, it, vi } from "vitest";

const pickerMocks = vi.hoisted(() => ({
  getDocumentAsync: vi.fn(),
}));

vi.mock("expo-document-picker", () => pickerMocks);

import {
  choosePdfDocument,
  mapDocumentPickerAsset,
} from "./pdfDocument";

describe("choosePdfDocument", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns cancelled without an error when the picker is cancelled", async () => {
    pickerMocks.getDocumentAsync.mockResolvedValue({
      assets: null,
      canceled: true,
    });

    await expect(choosePdfDocument()).resolves.toEqual({
      status: "cancelled",
    });
  });

  it("restricts picker selection to one copied PDF", async () => {
    pickerMocks.getDocumentAsync.mockResolvedValue({
      assets: [
        {
          lastModified: 0,
          mimeType: "application/pdf",
          name: "notes.pdf",
          size: 123,
          uri: "file:///cache/notes.pdf",
        },
      ],
      canceled: false,
    });

    const result = await choosePdfDocument();

    expect(result).toMatchObject({
      status: "selected",
      pdf: {
        fileName: "notes.pdf",
        mimeType: "application/pdf",
        uri: "file:///cache/notes.pdf",
      },
    });
    expect(pickerMocks.getDocumentAsync).toHaveBeenCalledWith({
      base64: false,
      copyToCacheDirectory: true,
      multiple: false,
      type: "application/pdf",
    });
  });

  it("returns selection_failed when the picker throws", async () => {
    pickerMocks.getDocumentAsync.mockRejectedValue(new Error("native detail"));

    await expect(choosePdfDocument()).resolves.toMatchObject({
      status: "failed",
      error: { code: "selection_failed" },
    });
  });
});

describe("mapDocumentPickerAsset", () => {
  it("maps selected PDF metadata", () => {
    expect(
      mapDocumentPickerAsset({
        lastModified: 0,
        mimeType: "application/pdf",
        name: "study.pdf",
        size: 456,
        uri: "file:///study.pdf",
      }),
    ).toMatchObject({
      status: "selected",
      pdf: {
        fileName: "study.pdf",
        fileSize: 456,
        mimeType: "application/pdf",
      },
    });
  });

  it("rejects wrong file types", () => {
    expect(
      mapDocumentPickerAsset({
        lastModified: 0,
        mimeType: "text/plain",
        name: "study.txt",
        size: 456,
        uri: "file:///study.txt",
      }),
    ).toMatchObject({
      status: "failed",
      error: { code: "unsupported_file_type" },
    });
  });

  it("rejects empty PDFs", () => {
    expect(
      mapDocumentPickerAsset({
        lastModified: 0,
        mimeType: "application/pdf",
        name: "empty.pdf",
        size: 0,
        uri: "file:///empty.pdf",
      }),
    ).toMatchObject({
      status: "failed",
      error: { code: "empty_file" },
    });
  });

  it("rejects oversized PDFs", () => {
    expect(
      mapDocumentPickerAsset({
        lastModified: 0,
        mimeType: "application/pdf",
        name: "large.pdf",
        size: 10 * 1024 * 1024 + 1,
        uri: "file:///large.pdf",
      }),
    ).toMatchObject({
      status: "failed",
      error: { code: "file_too_large" },
    });
  });
});
