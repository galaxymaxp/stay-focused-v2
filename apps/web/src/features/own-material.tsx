"use client";
import { MANUAL_UPLOAD_ACCEPT, MANUAL_UPLOAD_LIMITS, LEGACY_OFFICE_MESSAGE, manualUploadMime, type ProcessingJobStatusView } from "@stay-focused/shared";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, type DragEvent } from "react";
import { Upload } from "tus-js-client";
import { useAuth } from "../components/providers";
import { Heading, Icon, Notice } from "../components/ui";
import { requestKey } from "../lib/api";
import { generationEnabled } from "../lib/generation";

interface UploadIntent { uploadId: string; bucket: string; objectPath: string; tusEndpoint: string; chunkSize: number }
interface Pick { file: File; mime: string; key: string; intent?: UploadIntent; uploaded?: boolean }
export function OwnMaterialScreen() {
  const { api, session } = useAuth(), router = useRouter();
  const [mode, setMode] = useState<"paste" | "file">("paste");
  const [title, setTitle] = useState(""), [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false), [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null), [dragging, setDragging] = useState(false);
  const locked = useRef(false), pick = useRef<Pick | null>(null);
  const keys = useRef<{ source?: string; reviewer?: string }>({});

  async function readFile(selected: Pick) {
    if (locked.current || !session) return;
    locked.current = true; setBusy(true); setError(null); setProgress(0);
    try {
      if (!generationEnabled) throw new Error("Generation is unavailable in this environment.");
      selected.intent ??= await api<UploadIntent>("/api/job-uploads", { method: "POST",
        body: { displayName: selected.file.name, mimeType: selected.mime, byteSize: selected.file.size } });
      const intent = selected.intent;
      if (!selected.uploaded) await new Promise<void>((resolve, reject) => {
        const upload = new Upload(selected.file, { endpoint: intent.tusEndpoint,
          retryDelays: [0, 3000, 5000, 10000, 20000],
          headers: { authorization: `Bearer ${session.access_token}`, apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "" },
          uploadDataDuringCreation: true, removeFingerprintOnSuccess: true, chunkSize: intent.chunkSize,
          metadata: { bucketName: intent.bucket, objectName: intent.objectPath, contentType: selected.mime, cacheControl: "0", filename: selected.file.name },
          onProgress: (sent, total) => setProgress(total ? sent / total : 0), onError: reject, onSuccess: () => resolve() });
        void upload.findPreviousUploads().then(previous => {
          const resumable = previous.find(item => item.metadata.objectName === intent.objectPath);
          if (resumable) upload.resumeFromPreviousUpload(resumable);
          upload.start();
        }, reject);
      });
      selected.uploaded = true;
      const job = await api<ProcessingJobStatusView>(`/api/job-uploads/${encodeURIComponent(intent.uploadId)}/accept`, {
        method: "POST", key: selected.key, body: { jobType: "reviewer_generation" } });
      router.push(`/generation/${encodeURIComponent(job.id)}`);
    } catch (cause) {
      setError(cause instanceof Error && !cause.message.startsWith("tus:") ? cause.message : "The upload was interrupted. Keep this page open and try again.");
    } finally { locked.current = false; setBusy(false); setProgress(null); }
  }
  function choose(next: File | null) {
    if (!next || locked.current) return;
    setError(null);
    const mime = manualUploadMime(next.type, next.name);
    if (/\.(doc|ppt)$/i.test(next.name)) return setError(LEGACY_OFFICE_MESSAGE);
    if (!mime) return setError("Choose a PDF, PNG, JPEG, DOCX or PPTX file.");
    if (!next.size || next.size > MANUAL_UPLOAD_LIMITS[mime]) return setError(`Choose a non-empty file up to ${MANUAL_UPLOAD_LIMITS[mime] / 1024 / 1024} MiB.`);
    setFile(next);
    const selected = { file: next, mime, key: requestKey() };
    pick.current = selected;
    void readFile(selected);
  }
  async function createReviewer() {
    if (!text.trim() || !session || locked.current) return;
    locked.current = true; setBusy(true); setError(null);
    try {
      if (!generationEnabled) throw new Error("Generation is unavailable in this environment.");
      const displayName = title.trim() || "My notes";
      keys.current.source ??= requestKey();
      const source = await api<{ id: string }>("/api/sources", { method: "POST", key: keys.current.source,
        body: { sourceType: "text", displayName, sourceText: text.trim() } });
      keys.current.reviewer ??= requestKey();
      const job = await api<ProcessingJobStatusView>("/api/jobs", { method: "POST", key: keys.current.reviewer,
        body: { jobType: "reviewer_generation", sourceVersionId: source.id, sourceTitle: displayName, language: "auto", outputMode: "standard", reuseMode: "fresh" } });
      router.push(`/generation/${encodeURIComponent(job.id)}`);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not start your Reviewer."); }
    finally { locked.current = false; setBusy(false); }
  }
  const onDrop = (event: DragEvent) => { event.preventDefault(); setDragging(false); choose(event.dataTransfer.files[0] ?? null); };
  return <>
    <Heading title="Your own material" subtitle="Paste notes, or choose a PDF, photo, DOCX or PPTX to create a Reviewer." back="/generate" crumb="Your own material" />
    <div className="own-material"><section className="surface stack">
      <div className="segments" role="group" aria-label="Source">
        <button disabled={busy} aria-pressed={mode === "paste"} onClick={() => setMode("paste")}><Icon name="text-align-start" />Paste text</button>
        <button disabled={busy} aria-pressed={mode === "file"} onClick={() => setMode("file")}><Icon name="file-text" />Upload a file</button>
      </div>
      {mode === "paste" ? <label>Your notes or reading
        <textarea className="source-text" aria-label="Your notes or reading" placeholder="Paste instructional material: lecture notes, a chapter, slides as text?"
          value={text} onChange={e => { setText(e.target.value); keys.current = {}; }} />
        <span className="meta count-up">{text.trim().length.toLocaleString()} characters</span>
      </label> : <div className="stack">
        <label className={`drop-zone${dragging ? " dragging" : ""}`} onDragOver={e => { e.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={onDrop}>
          <Icon name="file-text" /><strong>{file?.name ?? "Drop a PDF, photo, DOCX or PPTX here"}</strong>
          <span className="meta">or click to choose ? Documents up to 10 MiB, photos up to 5 MiB</span>
          <input type="file" accept={MANUAL_UPLOAD_ACCEPT} disabled={busy || !generationEnabled} className="sr-only" aria-label="Choose a PDF, photo, DOCX or PPTX"
            onChange={e => choose(e.target.files?.[0] ?? null)} />
        </label>
        <p className="meta">{LEGACY_OFFICE_MESSAGE}</p>
        <p className="meta">Picking a file starts reading and creates your Reviewer automatically. Once accepted, follow its progress in Queue.</p>
        {progress !== null && <div className="stack" role="status">
          <span>Uploading source? {Math.round(progress * 100)}%</span><progress max={1} value={progress} aria-label="Upload progress" />
          <span className="meta">Keep this page open until the server accepts the job.</span>
        </div>}
        {error && pick.current && <button className="button retry-button" disabled={busy} onClick={() => void readFile(pick.current!)}>Try again</button>}
      </div>}
      {error && <Notice error>{error}</Notice>}
    </section><aside className="surface stack own-material-side">
      <h2>Create a Reviewer</h2>
      {mode === "paste" ? <>
        <label>Title<input value={title} placeholder="My notes" onChange={e => { setTitle(e.target.value); keys.current = {}; }} /></label>
        <ul className="own-steps"><li className={text.trim() ? "done" : ""}>Paste your material</li><li>Check the text</li><li>Create your Reviewer; it?s saved to your Library</li></ul>
        <button className="primary" disabled={!text.trim() || busy || !generationEnabled} onClick={() => void createReviewer()}>{busy ? "Starting?" : "Create Reviewer"}</button>
      </> : <p>Your file is read and turned into a Reviewer in one process. It?s saved to your Library.</p>}
      {!generationEnabled && <p className="meta">Generation is unavailable in this environment. Your saved materials are in Library.</p>}
      <p className="meta">Prefer course files? <Link href="/generate">Choose from your Canvas courses</Link>.</p>
    </aside></div>
  </>;
}
