import type * as ExpoImagePicker from "expo-image-picker";

import {
  inferOcrImageMimeType,
  isSupportedOcrImageMimeType,
  OCR_MAX_IMAGE_BYTES,
  type OcrImageMimeType,
} from "../../services/ocrApi";

const OCR_SMOKE_IMAGE_DATA_URI =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAFgwJ/lflwSAAAAABJRU5ErkJggg==";

export interface SelectedGalleryImage {
  readonly uri: string;
  readonly mimeType: OcrImageMimeType;
  readonly fileName: string;
  readonly fileSize?: number;
  readonly width?: number;
  readonly height?: number;
  readonly webFile?: Blob;
}

export type GallerySelectionResult =
  | {
      readonly status: "selected";
      readonly image: SelectedGalleryImage;
    }
  | {
      readonly status: "cancelled";
    }
  | {
      readonly status: "failed";
      readonly error: GallerySelectionError;
    };

export type GallerySelectionErrorCode =
  | "permission_denied"
  | "selection_failed"
  | "unsupported_media_type"
  | "image_too_large"
  | "empty_image";

export interface GallerySelectionError {
  readonly code: GallerySelectionErrorCode;
  readonly message: string;
}

export async function chooseImageFromGallery(): Promise<GallerySelectionResult> {
  const ImagePicker = await import("expo-image-picker");
  let permission: ExpoImagePicker.MediaLibraryPermissionResponse;
  try {
    permission = await ImagePicker.requestMediaLibraryPermissionsAsync(false);
  } catch {
    return failure(
      "permission_denied",
      "Photo library access could not be requested.",
    );
  }

  if (!hasMediaLibraryAccess(permission)) {
    return failure(
      "permission_denied",
      "Allow photo library access to choose an image.",
    );
  }

  let result: ExpoImagePicker.ImagePickerResult;
  try {
    result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: false,
      allowsMultipleSelection: false,
      base64: false,
      exif: false,
      mediaTypes: ["images"],
      quality: 1,
      selectionLimit: 1,
    });
  } catch {
    return failure("selection_failed", "Image selection could not be completed.");
  }

  if (result.canceled) {
    return { status: "cancelled" };
  }

  const asset = result.assets[0];
  if (!asset) {
    return failure("selection_failed", "No image was returned from the picker.");
  }

  return mapImagePickerAsset(asset);
}

export function mapImagePickerAsset(
  asset: ExpoImagePicker.ImagePickerAsset,
): GallerySelectionResult {
  if (asset.type && asset.type !== "image") {
    return failure("unsupported_media_type", "Choose a PNG or JPEG image.");
  }

  const mimeType =
    readSupportedMimeType(asset.mimeType) ??
    inferOcrImageMimeType(asset.fileName ?? "") ??
    inferOcrImageMimeType(asset.uri);

  if (!mimeType) {
    return failure("unsupported_media_type", "Choose a PNG or JPEG image.");
  }

  if (asset.fileSize !== undefined) {
    if (!Number.isFinite(asset.fileSize) || asset.fileSize < 0) {
      return failure("selection_failed", "The selected image is invalid.");
    }
    if (asset.fileSize === 0) {
      return failure("empty_image", "The selected image is empty.");
    }
    if (asset.fileSize > OCR_MAX_IMAGE_BYTES) {
      return failure(
        "image_too_large",
        "Choose an image that is at most 5 MiB.",
      );
    }
  }

  return {
    status: "selected",
    image: {
      uri: asset.uri,
      mimeType,
      fileName: sanitizeImageFileName(asset.fileName, mimeType),
      ...(asset.fileSize !== undefined ? { fileSize: asset.fileSize } : {}),
      ...(asset.width > 0 ? { width: asset.width } : {}),
      ...(asset.height > 0 ? { height: asset.height } : {}),
      ...(asset.file ? { webFile: asset.file } : {}),
    },
  };
}

export function createOcrSmokeFixtureImage(): SelectedGalleryImage {
  return {
    uri: OCR_SMOKE_IMAGE_DATA_URI,
    mimeType: "image/png",
    fileName: "study-habits-ocr-smoke.png",
    fileSize: 70,
    width: 1,
    height: 1,
  };
}

function hasMediaLibraryAccess(
  permission: ExpoImagePicker.MediaLibraryPermissionResponse,
): boolean {
  return (
    permission.status === "granted" ||
    permission.accessPrivileges === "all" ||
    permission.accessPrivileges === "limited"
  );
}

function readSupportedMimeType(value: string | undefined): OcrImageMimeType | null {
  if (!value) {
    return null;
  }

  const normalized = value.trim().toLowerCase();
  return isSupportedOcrImageMimeType(normalized) ? normalized : null;
}

function sanitizeImageFileName(
  value: string | null | undefined,
  mimeType: OcrImageMimeType,
): string {
  const sanitized = value?.trim().replace(/[\\/:*?"<>|]+/g, "-");
  if (sanitized) {
    return sanitized;
  }

  return mimeType === "image/png" ? "selected-image.png" : "selected-image.jpg";
}

function failure(
  code: GallerySelectionErrorCode,
  message: string,
): GallerySelectionResult {
  return {
    status: "failed",
    error: { code, message },
  };
}
