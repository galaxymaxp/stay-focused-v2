import { router } from "expo-router";
import { useRef, useState } from "react";
import { Platform, Text, View } from "react-native";
import { manualUploadKind, LEGACY_OFFICE_MESSAGE } from "@stay-focused/shared";
import { useAuth } from "../../auth";
import { useLegacyTheme } from "../../design/theme";
import { Button } from "../../components/Button";
import { TextField } from "../../components/TextField";
import { SegmentedControl, Sheet } from "../../design/primitives";
import { getApiBaseUrl } from "../../config/apiBaseUrl";
import { API_CONFIGURATION_MESSAGE } from "../../config/apiBaseUrlResolution";
import { persistCanonicalSource, type CanonicalSource } from "../../services/canonicalSourcesApi";
import { upsertActiveProcessingJob } from "../../services/activeProcessingJobStore";
import { createManualReviewerJob, createReviewerJob, createProcessingJobIdempotencyKey,
  type ManualReviewerUpload, type CreateExtractionJobInput } from "../../services/processingJobsApi";
import { chooseImageFromGallery, captureImageWithCamera } from "./galleryImage";
import { chooseManualDocument } from "./manualDocument";
import { manualSourceNeedsEdit, type ReviewerSourceMode } from "./reviewerSourceFlow";

export function ReviewerGenerateScreen(_props: { readonly onOpenLibrary?: () => void }) {
  const { session } = useAuth();
  const colors = useLegacyTheme();
  const [mode, setMode] = useState<ReviewerSourceMode | null>(null);
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [canonical, setCanonical] = useState<CanonicalSource | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const locked = useRef(false);
  const selecting = useRef(false);
  const sourceKey = useRef<string | null>(null);
  const reviewerKey = useRef<string | null>(null);
  const pending = useRef<{ source: CreateExtractionJobInput["source"]; key: string;
    uploadSession: NonNullable<CreateExtractionJobInput["uploadSession"]> } | null>(null);

  function connection() {
    const apiBaseUrl = getApiBaseUrl(), accessToken = session?.accessToken.trim(), owner = session?.user.id;
    if (!apiBaseUrl) throw new Error(API_CONFIGURATION_MESSAGE);
    if (!accessToken || !owner) throw new Error("Sign in again to use this source.");
    return { apiBaseUrl, accessToken, owner };
  }
  function edit(value: string) {
    setText(value); setCanonical(null); sourceKey.current = null; reviewerKey.current = null; setError(null);
  }
  function changeMode(next: ReviewerSourceMode) {
    if (locked.current) return;
    setMode(next); setCanonical(null); setError(null);
  }
  async function uploadPickedSource() {
    if (locked.current || !pending.current) return;
    locked.current = true; setBusy(true); setError(null); setProgress(0);
    try {
      const auth = connection(), pick = pending.current;
      const result = await createManualReviewerJob({ ...auth, source: pick.source, idempotencyKey: pick.key,
        uploadSession: pick.uploadSession, platformOS: Platform.OS,
        onUploadProgress: (sent, total) => setProgress(total ? sent / total : 0) });
      if (!result.ok) throw new Error(result.error.message);
      await upsertActiveProcessingJob(auth.owner, result.data);
      pending.current = null;
      router.push({ pathname: "/generation", params: { id: result.data.id } });
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not start your Reviewer."); }
    finally { locked.current = false; setBusy(false); setProgress(null); }
  }
  async function pick(kind: "file" | "camera" | "gallery") {
    if (locked.current || selecting.current) return;
    selecting.current = true;
    setError(null);
    try {
      let selected: ManualReviewerUpload | null;
      if (kind === "file") selected = await chooseManualDocument();
      else {
        const result = kind === "camera" ? await captureImageWithCamera() : await chooseImageFromGallery();
        if (result.status === "cancelled") return;
        if (result.status === "failed") throw new Error(result.error.message);
        selected = result.image;
      }
      if (!selected) return;
      const selectedKind = manualUploadKind(selected.mimeType);
      const source: CreateExtractionJobInput["source"] = selectedKind === "image"
        ? { kind: "image", value: { ...selected, mimeType: selected.mimeType as "image/png" | "image/jpeg" } }
        : selectedKind === "pdf" ? { kind: "pdf", value: { ...selected, mimeType: "application/pdf" } }
        : { kind: selectedKind, value: selected };
      setMode(selectedKind); setCanonical(null);
      pending.current = { source, key: createProcessingJobIdempotencyKey("reviewer_generation"), uploadSession: {} };
      await uploadPickedSource();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Choose the file again."); }
    finally { selecting.current = false; }
  }
  async function continueText() {
    if (locked.current || !text.trim()) return;
    locked.current = true; setBusy(true); setError(null);
    try {
      const auth = connection(); sourceKey.current ??= createProcessingJobIdempotencyKey("source_import");
      const result = await persistCanonicalSource({ ...auth, idempotencyKey: sourceKey.current,
        sourceType: "text", displayName: title.trim() || "My notes", sourceText: text.trim() });
      if (!result.ok) throw new Error(result.error.message);
      setCanonical(result.data);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not save this source."); }
    finally { locked.current = false; setBusy(false); }
  }
  async function generate(quizAfter = false) {
    if (locked.current || !canonical) return;
    locked.current = true; setBusy(true); setError(null);
    try {
      const auth = connection(); reviewerKey.current ??= createProcessingJobIdempotencyKey("reviewer_generation");
      const result = await createReviewerJob({ ...auth, idempotencyKey: reviewerKey.current,
        sourceVersionId: canonical.id, sourceTitle: title.trim() || canonical.displayName });
      if (!result.ok) throw new Error(result.error.message);
      await upsertActiveProcessingJob(auth.owner, result.data);
      router.push({ pathname: "/generation", params: { id: result.data.id, ...(quizAfter ? { quiz: "1" } : {}) } });
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not start your Reviewer."); }
    finally { locked.current = false; setBusy(false); }
  }
  const editing = mode !== null && manualSourceNeedsEdit(mode);
  return <Sheet title="Other source" onClose={() => router.back()} footer={editing ? canonical ?
    <View style={{ gap: 10 }}>
      <Button disabled={busy} loading={busy} fullWidth onPress={() => void generate()} testID="reviewer-generate-button">Generate Reviewer</Button>
      <Button disabled={busy} fullWidth variant="secondary" onPress={() => void generate(true)} testID="source-quiz-button">Create Quiz</Button>
    </View> : <Button disabled={!text.trim() || busy} loading={busy} fullWidth onPress={() => void continueText()} testID="source-continue-button">Continue</Button> : null}>
    <View style={{ gap: 16 }} testID="reviewer-generate-screen">
      {mode === null ? <View style={{ gap: 12 }} testID="source-choice-sheet">
        <Button fullWidth variant="secondary" onPress={() => changeMode("paste")} testID="source-choice-text">Text</Button>
        <Button fullWidth disabled={busy} variant="secondary" onPress={() => void pick("camera")} testID="source-choice-camera">Camera</Button>
        <Button fullWidth disabled={busy} variant="secondary" onPress={() => void pick("file")} testID="source-choice-file">Local File (PDF, DOCX, PPTX)</Button>
      </View> : <>
        <SegmentedControl segments={[{ value: "paste", label: "Text" }, { value: "image", label: "Camera" }, { value: "pdf", label: "Local File" }]}
          value={mode === "docx" || mode === "pptx" ? "pdf" : mode} onChange={changeMode} />
        {editing ? <>
          <TextField label="Source title" value={title} onChangeText={value => { setTitle(value); setCanonical(null); sourceKey.current = null; reviewerKey.current = null; }} placeholder="Optional title" testID="reviewer-title-input" />
          <TextField label="Source text" multiline textAlignVertical="top" value={text} onChangeText={edit}
            placeholder="Paste notes, readings, or lecture text here." testID="reviewer-source-input" />
          <Text style={{ color: colors.textPrimary }} testID="reviewer-source-character-count">{text.length} characters</Text>
          {canonical && <Text style={{ color: colors.textPrimary }} testID="canonical-source-ready">{canonical.displayName} is ready. Choose Reviewer or Quiz.</Text>}
        </> : <>
          <Text style={{ color: colors.textPrimary }}>Choose a file or photo to read and create your Reviewer automatically.</Text>
          {mode === "image" ? <>
            <Button disabled={busy} onPress={() => void pick("camera")}>Take photo</Button>
            <Button disabled={busy} onPress={() => void pick("gallery")}>Choose photo</Button>
          </> : <Button disabled={busy} onPress={() => void pick("file")}>Choose PDF, DOCX or PPTX</Button>}
          <Text style={{ color: colors.textPrimary }}>{LEGACY_OFFICE_MESSAGE}</Text>
        </>}
      </>}
      {progress !== null && <Text style={{ color: colors.textPrimary }} accessibilityLiveRegion="polite">Uploading source? {Math.round(progress * 100)}%. Keep Stay Focused open until the server accepts the job.</Text>}
      {error && <View testID="reviewer-generation-error"><Text style={{ color: colors.textPrimary }} accessibilityRole="alert">{error}</Text>
        {pending.current && <Button disabled={busy} onPress={() => void uploadPickedSource()}>Try again</Button>}
      </View>}
    </View>
  </Sheet>;
}
