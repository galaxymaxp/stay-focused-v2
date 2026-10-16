import type { DocumentPickerAsset } from "expo-document-picker";
import { MANUAL_UPLOAD_LIMITS, OFFICE_MIME, manualUploadMime, LEGACY_OFFICE_MESSAGE } from "@stay-focused/shared";
import type { ManualReviewerUpload } from "../../services/processingJobsApi";

export function mapManualDocument(asset: DocumentPickerAsset): ManualReviewerUpload {
  const mimeType = manualUploadMime(asset.mimeType, asset.name);
  if (/\.(doc|ppt)$/i.test(asset.name)) throw new Error(LEGACY_OFFICE_MESSAGE);
  if (!mimeType || mimeType.startsWith("image/")) throw new Error("Choose a PDF, DOCX or PPTX file.");
  if (asset.size !== undefined && (!Number.isFinite(asset.size) || asset.size <= 0 || asset.size > MANUAL_UPLOAD_LIMITS[mimeType])) {
    throw new Error("Choose a non-empty file up to 10 MiB.");
  }
  return { uri: asset.uri, mimeType, fileName: asset.name, fileSize: asset.size, ...(asset.file ? { webFile: asset.file } : {}) };
}

export async function chooseManualDocument(): Promise<ManualReviewerUpload | null> {
  const picker = await import("expo-document-picker");
  const result = await picker.getDocumentAsync({ base64: false, copyToCacheDirectory: true, multiple: false,
    type: ["application/pdf", OFFICE_MIME.docx, OFFICE_MIME.pptx] });
  if (result.canceled) return null;
  if (!result.assets[0]) throw new Error("No file was returned. Choose the file again.");
  return mapManualDocument(result.assets[0]);
}
