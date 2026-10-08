"use client";
import type { ProcessingJobStatusView } from "@stay-focused/shared";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type DragEvent } from "react";
import { Upload } from "tus-js-client";
import { useAuth } from "../components/providers";
import { Heading, Icon, Notice } from "../components/ui";
import { requestKey } from "../lib/api";
import { generationEnabled } from "../lib/generation";

// Web counterpart of the app's "Use text, camera or a local file" flow
// (apps/mobile/src/features/reviewer/ReviewerGenerateScreen.tsx with
// services/processingJobsApi.ts and canonicalSourcesApi.ts): paste text or
// upload a PDF or photo, check the text that was read, then create a Reviewer.

const LIMITS = { "application/pdf": 10 * 1024 * 1024, "image/png": 5 * 1024 * 1024, "image/jpeg": 5 * 1024 * 1024 } as const;
type UploadMime = keyof typeof LIMITS;
type SourceBlock = Record<string, unknown>;
interface UploadIntent {
  uploadId: string;
  bucket: string;
  objectPath: string;
  tusEndpoint: string;
  chunkSize: number;
}
interface ExtractionResult {
  text: string;
  sourceBlocks?: SourceBlock[];
  pageCount?: number;
  processedPageCount?: number;
  sourceVersionId?: string;
}
type Stage =
  | { kind: "idle" }
  | { kind: "uploading"; progress: number }
  | { kind: "reading"; job: ProcessingJobStatusView | null }
  | { kind: "read"; result: ExtractionResult }
  | { kind: "failed"; message: string };

const formatBytes = (bytes: number) =>
  bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;

export function OwnMaterialScreen() {
  const { api, session } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const [mode, setMode] = useState<"paste" | "file">(params.get("extraction") ? "file" : "paste");
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [stage, setStage] = useState<Stage>({ kind: "idle" });
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const keys = useRef<{ accept?: string; source?: string; reviewer?: string }>({});
  const extraction = stage.kind === "read" ? stage.result : null;

  function choose(next: File | null) {
    setFileError(null);
    setStage({ kind: "idle" });
    keys.current = {};
    if (!next) return setFile(null);
    const mime = next.type as UploadMime;
    if (!(mime in LIMITS)) {
      setFile(null);
      return setFileError("Choose a PDF, PNG or JPEG file.");
    }
    if (next.size > LIMITS[mime]) {
      setFile(null);
      return setFileError(`Choose a ${mime === "application/pdf" ? "PDF" : "photo"} that is at most ${formatBytes(LIMITS[mime])}.`);
    }
    setFile(next);
    if (!title) setTitle(next.name.replace(/\.[^.]+$/, ""));
  }

  const watch = useCallback(
    async (jobId: string) => {
      setStage({ kind: "reading", job: null });
      for (;;) {
        const job = await api<ProcessingJobStatusView>(`/api/jobs/${encodeURIComponent(jobId)}`);
        if (job.status === "succeeded") {
          const result = await api<ExtractionResult>(`/api/jobs/${encodeURIComponent(jobId)}/result`);
          setText(result.text);
          setStage({ kind: "read", result });
          return;
        }
        if (["failed", "expired", "cancelled"].includes(job.status)) {
          setStage({ kind: "failed", message: job.safeErrorMessage ?? "This file could not be read. Try a clearer or shorter file." });
          return;
        }
        setStage({ kind: "reading", job });
        await new Promise((resolve) => setTimeout(resolve, 3000));
      }
    },
    [api],
  );

  // Coming back from Queue to a file that finished reading.
  useEffect(() => {
    const jobId = params.get("extraction");
    if (jobId) void watch(jobId).catch(() => setStage({ kind: "failed", message: "This file’s text could not be loaded. Try reading it again." }));
  }, [params, watch]);

  async function readFile() {
    if (!file || !session) return;
    setError(null);
    try {
      if (!generationEnabled) throw new Error("Reading files is unavailable in this environment.");
      setStage({ kind: "uploading", progress: 0 });
      const intent = await api<UploadIntent>("/api/job-uploads", {
        method: "POST",
        body: { displayName: file.name, mimeType: file.type, byteSize: file.size },
      });
      await new Promise<void>((resolve, reject) => {
        const upload = new Upload(file, {
          endpoint: intent.tusEndpoint,
          retryDelays: [0, 3000, 5000, 10000, 20000],
          headers: {
            authorization: `Bearer ${session.access_token}`,
            apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
          },
          uploadDataDuringCreation: true,
          removeFingerprintOnSuccess: true,
          chunkSize: intent.chunkSize,
          metadata: {
            bucketName: intent.bucket,
            objectName: intent.objectPath,
            contentType: file.type,
            cacheControl: "0",
            filename: file.name,
          },
          onProgress: (sent, total) => setStage({ kind: "uploading", progress: total ? sent / total : 0 }),
          onError: reject,
          onSuccess: () => resolve(),
        });
        void upload.findPreviousUploads().then((previous) => {
          const resumable = previous.find((item) => item.metadata.objectName === intent.objectPath);
          if (resumable) upload.resumeFromPreviousUpload(resumable);
          upload.start();
        }, reject);
      });
      keys.current.accept ??= requestKey();
      const job = await api<ProcessingJobStatusView>(`/api/job-uploads/${encodeURIComponent(intent.uploadId)}/accept`, {
        method: "POST",
        key: keys.current.accept,
      });
      await watch(job.id);
    } catch (cause) {
      setStage({
        kind: "failed",
        message:
          cause instanceof Error && !cause.message.startsWith("tus:")
            ? cause.message
            : "The upload was interrupted. Keep this page open and try again.",
      });
    }
  }

  async function createReviewer() {
    const sourceText = text.trim();
    if (!sourceText || !session || busy) return;
    setBusy(true);
    setError(null);
    try {
      if (!generationEnabled) throw new Error("Generation is unavailable in this environment.");
      const displayName = title.trim() || file?.name || "My notes";
      keys.current.source ??= requestKey();
      const source = await api<{ id: string; displayName: string }>("/api/sources", {
        method: "POST",
        key: keys.current.source,
        body: {
          sourceType: mode === "paste" ? "text" : file?.type === "application/pdf" ? "local_file" : "camera",
          displayName,
          sourceText,
          ...(extraction?.sourceVersionId ? { sourceVersionId: extraction.sourceVersionId } : {}),
        },
      });
      keys.current.reviewer ??= requestKey();
      const blocks = mode === "file" ? (extraction?.sourceBlocks ?? []) : [];
      const job = await api<ProcessingJobStatusView>("/api/jobs", {
        method: "POST",
        key: keys.current.reviewer,
        body: {
          jobType: "reviewer_generation",
          sourceVersionId: source.id,
          sourceTitle: displayName,
          ...(blocks.length
            ? { sourceBlocks: blocks, sourceKind: file?.type === "application/pdf" ? "presentation" : "document" }
            : {}),
          language: "auto",
          outputMode: "standard",
          reuseMode: "fresh",
        },
      });
      keys.current = {};
      router.push(`/generation/${encodeURIComponent(job.id)}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not start your Reviewer.");
    } finally {
      setBusy(false);
    }
  }

  const onDrop = (event: DragEvent) => {
    event.preventDefault();
    setDragging(false);
    choose(event.dataTransfer.files[0] ?? null);
  };
  const ready = !!text.trim() && (mode === "paste" || stage.kind === "read");
  return (
    <>
      <Heading
        title="Your own material"
        subtitle="Paste notes, or upload a PDF or photo, and turn it into a Reviewer."
        back="/generate"
        crumb="Your own material"
      />
      <div className="own-material">
        <section className="surface stack">
          <div className="segments" role="group" aria-label="Source">
            <button aria-pressed={mode === "paste"} onClick={() => setMode("paste")}>
              Paste text
            </button>
            <button aria-pressed={mode === "file"} onClick={() => setMode("file")}>
              Upload a file
            </button>
          </div>
          {mode === "paste" ? (
            <label>
              Your notes or reading
              <textarea
                className="source-text"
                aria-label="Your notes or reading"
                placeholder="Paste instructional material: lecture notes, a chapter, slides as text…"
                value={text}
                onChange={(e) => setText(e.target.value)}
              />
              <span className="meta count-up">{text.trim().length.toLocaleString()} characters</span>
            </label>
          ) : (
            <div className="stack">
              <label
                className={`drop-zone${dragging ? " dragging" : ""}`}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={onDrop}
              >
                <Icon name="file-text" />
                <strong>{file ? file.name : "Drop a PDF or photo here"}</strong>
                <span className="meta">
                  {file ? `${file.type === "application/pdf" ? "PDF" : "Photo"} · ${formatBytes(file.size)}` : "or click to choose · PDF up to 10 MB, PNG or JPEG up to 5 MB"}
                </span>
                <input
                  type="file"
                  accept="application/pdf,image/png,image/jpeg"
                  className="sr-only"
                  aria-label="Choose a PDF or photo"
                  onChange={(e) => choose(e.target.files?.[0] ?? null)}
                />
              </label>
              {fileError && <Notice error>{fileError}</Notice>}
              {file && stage.kind !== "uploading" && stage.kind !== "reading" && stage.kind !== "read" && (
                <button className="primary" disabled={!generationEnabled} onClick={() => void readFile()}>
                  Read this file
                </button>
              )}
              {stage.kind === "uploading" && (
                <div className="stack" role="status">
                  <span className="meta">Uploading… {Math.round(stage.progress * 100)}%</span>
                  <progress max={1} value={stage.progress} aria-label="Upload progress" />
                  <span className="meta">Keep this page open until the upload finishes.</span>
                </div>
              )}
              {stage.kind === "reading" && (
                <div className="stack" role="status">
                  <span className="meta">
                    Reading your {file?.type === "application/pdf" ? "PDF" : "file"}…
                    {stage.job?.progress.completedUnits != null && stage.job.progress.totalUnits != null
                      ? ` ${stage.job.progress.completedUnits} of ${stage.job.progress.totalUnits} ${stage.job.progress.unitLabel ?? "pages"}`
                      : ""}
                  </span>
                  <span className="shimmer-line" />
                  <span className="meta">You can leave; this keeps going and appears in Queue.</span>
                </div>
              )}
              {stage.kind === "failed" && (
                <div className="stack">
                  <Notice error>{stage.message}</Notice>
                  {file && <button onClick={() => void readFile()}>Try again</button>}
                </div>
              )}
              {stage.kind === "read" && (
                <label>
                  Check the text we read
                  <textarea
                    className="source-text"
                    aria-label="Check the text we read"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                  />
                  <span className="meta">
                    {stage.result.processedPageCount && stage.result.pageCount
                      ? `Read ${stage.result.processedPageCount} of ${stage.result.pageCount} pages · `
                      : ""}
                    Fix anything that was read wrong before creating your Reviewer.
                  </span>
                </label>
              )}
            </div>
          )}
        </section>
        <aside className="surface stack own-material-side">
          <h2>Create a Reviewer</h2>
          <label>
            Title
            <input value={title} placeholder="My notes" onChange={(e) => setTitle(e.target.value)} />
          </label>
          <ul className="own-steps">
            <li className={text.trim() ? "done" : ""}>{mode === "paste" ? "Paste your material" : "Upload and read a file"}</li>
            <li className={ready ? "done" : ""}>Check the text</li>
            <li>Create your Reviewer; it’s saved to your Library</li>
          </ul>
          <button className="primary" disabled={!ready || busy || !generationEnabled} onClick={() => void createReviewer()}>
            {busy ? "Starting…" : "Create Reviewer"}
          </button>
          {!generationEnabled && (
            <p className="meta">Generation is unavailable in this environment. Your saved materials are in Library.</p>
          )}
          {error && <Notice error>{error}</Notice>}
          <p className="meta">
            Prefer course files? <Link href="/generate">Choose from your Canvas courses</Link>.
          </p>
        </aside>
      </div>
    </>
  );
}
