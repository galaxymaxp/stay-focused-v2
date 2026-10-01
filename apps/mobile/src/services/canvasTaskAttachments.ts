import type { ActivityAttachment } from "@stay-focused/shared";
import type { ExperienceClient } from "./experienceApi";
import { requireApiBaseUrl } from "../config/apiBaseUrlResolution";

export interface CanvasTaskAttachmentAdapters {
  readonly fetchImpl: typeof fetch;
  readonly save: (bytes: Uint8Array, filename: string, cacheScope: string) => Promise<string>;
  readonly open: (uri: string, filename: string, contentType: string | null) => Promise<void>;
}

const nativeAdapters: CanvasTaskAttachmentAdapters = {
  fetchImpl: fetch,
  async save(bytes, filename, cacheScope) {
    const { Directory, File, Paths } = await import("expo-file-system");
    const directory = new Directory(Paths.cache, `canvas-task-${safeLocalFilename(cacheScope)}`);
    if (!directory.exists) directory.create({ intermediates: true });
    const file = new File(directory, filename);
    if (file.exists) file.delete();
    file.create();
    file.write(bytes);
    return file.uri;
  },
  async open(uri, filename, contentType) {
    const Sharing = await import("expo-sharing");
    if (!(await Sharing.isAvailableAsync())) throw new Error("This device does not have an app available to open the attachment.");
    await Sharing.shareAsync(uri, { dialogTitle: filename, mimeType: contentType ?? "application/octet-stream" });
  },
};

/** Fetches only the explicitly tapped task file; credentials and Canvas URLs stay server-side. */
export async function openCanvasTaskAttachment(
  client: ExperienceClient,
  activityId: string,
  attachment: ActivityAttachment,
  adapters: CanvasTaskAttachmentAdapters = nativeAdapters,
): Promise<void> {
  if (!client.accessToken) throw new Error("Your Stay Focused session has expired. Sign in again to open this attachment.");
  const baseUrl = requireApiBaseUrl(client.baseUrl);
  const response = await adapters.fetchImpl(
    `${baseUrl}/api/experience/activities/${encodeURIComponent(activityId)}/attachments/${encodeURIComponent(attachment.key)}`,
    { headers: { Authorization: `Bearer ${client.accessToken}` } },
  );
  if (!response.ok) {
    if (response.status === 401) throw new Error("Your Stay Focused session has expired. Sign in again to open this attachment.");
    if (response.status === 409) throw new Error("Canvas could not open this attachment. Check your Canvas connection and try again.");
    if (response.status >= 500) throw new Error("The attachment could not be opened right now. Try again when you are online.");
    throw new Error("This attachment is no longer available.");
  }
  const bytes = new Uint8Array(await response.arrayBuffer());
  const filename = safeLocalFilename(attachment.filename);
  const uri = await adapters.save(bytes, filename, `${activityId}-${attachment.key}`);
  await adapters.open(uri, filename, attachment.contentType);
}

function safeLocalFilename(value: string) {
  return value.replace(/[\\/:*?"<>|\u0000-\u001f]/g, "_").trim().slice(0, 180) || "Canvas attachment";
}
