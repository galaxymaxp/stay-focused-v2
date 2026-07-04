import { beforeEach, describe, expect, it, vi } from "vitest";

const pickerMocks = vi.hoisted(() => ({
  launchImageLibraryAsync: vi.fn(),
  requestMediaLibraryPermissionsAsync: vi.fn(),
}));

vi.mock("expo-image-picker", () => pickerMocks);

import {
  chooseImageFromGallery,
  mapImagePickerAsset,
} from "./galleryImage";

describe("chooseImageFromGallery", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    pickerMocks.requestMediaLibraryPermissionsAsync.mockResolvedValue({
      status: "granted",
    });
  });

  it("returns cancelled without an error when the picker is cancelled", async () => {
    pickerMocks.launchImageLibraryAsync.mockResolvedValue({
      assets: null,
      canceled: true,
    });

    await expect(chooseImageFromGallery()).resolves.toEqual({
      status: "cancelled",
    });
  });

  it("returns permission_denied when media-library access is denied", async () => {
    pickerMocks.requestMediaLibraryPermissionsAsync.mockResolvedValue({
      accessPrivileges: "none",
      status: "denied",
    });

    await expect(chooseImageFromGallery()).resolves.toMatchObject({
      status: "failed",
      error: { code: "permission_denied" },
    });
    expect(pickerMocks.launchImageLibraryAsync).not.toHaveBeenCalled();
  });

  it("restricts picker selection to one image", async () => {
    pickerMocks.launchImageLibraryAsync.mockResolvedValue({
      assets: [
        {
          fileName: "notes.png",
          fileSize: 123,
          height: 80,
          mimeType: "image/png",
          type: "image",
          uri: "file:///notes.png",
          width: 120,
        },
      ],
      canceled: false,
    });

    const result = await chooseImageFromGallery();

    expect(result).toMatchObject({
      status: "selected",
      image: {
        fileName: "notes.png",
        mimeType: "image/png",
        uri: "file:///notes.png",
      },
    });
    expect(pickerMocks.launchImageLibraryAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        allowsMultipleSelection: false,
        base64: false,
        mediaTypes: ["images"],
        selectionLimit: 1,
      }),
    );
  });
});

describe("mapImagePickerAsset", () => {
  it("maps a selected image", () => {
    expect(
      mapImagePickerAsset({
        fileName: "notes.jpg",
        fileSize: 123,
        height: 80,
        mimeType: "image/jpeg",
        type: "image",
        uri: "file:///notes.jpg",
        width: 120,
      }),
    ).toMatchObject({
      status: "selected",
      image: {
        fileName: "notes.jpg",
        mimeType: "image/jpeg",
      },
    });
  });

  it("rejects unsupported MIME types", () => {
    expect(
      mapImagePickerAsset({
        fileName: "notes.gif",
        fileSize: 123,
        height: 80,
        mimeType: "image/gif",
        type: "image",
        uri: "file:///notes.gif",
        width: 120,
      }),
    ).toMatchObject({
      status: "failed",
      error: { code: "unsupported_media_type" },
    });
  });

  it("rejects oversized images", () => {
    expect(
      mapImagePickerAsset({
        fileName: "notes.png",
        fileSize: 5 * 1024 * 1024 + 1,
        height: 80,
        mimeType: "image/png",
        type: "image",
        uri: "file:///notes.png",
        width: 120,
      }),
    ).toMatchObject({
      status: "failed",
      error: { code: "image_too_large" },
    });
  });
});
