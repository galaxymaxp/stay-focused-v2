import { createElement } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { MANUAL_UPLOAD_ACCEPT, OFFICE_MIME } from "@stay-focused/shared";
const mocks = vi.hoisted(() => ({ api: vi.fn(), push: vi.fn(), key: 0, uploaded: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: mocks.push }) }));
vi.mock("next/link", () => ({ default: "a" }));
vi.mock("../components/providers", () => ({ useAuth: () => ({ api: mocks.api, session: { access_token: "test" } }) }));
vi.mock("../components/ui", () => ({ Heading: "Heading", Icon: "Icon", Notice: "Notice" }));
vi.mock("../lib/api", () => ({ requestKey: () => `key-${++mocks.key}` }));
vi.mock("../lib/generation", () => ({ generationEnabled: true }));
vi.mock("tus-js-client", () => ({ Upload: class {
  constructor(_file: File, private options: { onSuccess: () => void }) {}
  findPreviousUploads() { return Promise.resolve([]); }
  start() { mocks.uploaded(); this.options.onSuccess(); }
} }));
const { OwnMaterialScreen } = await import("./own-material");
let rendered: ReactTestRenderer;
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
beforeEach(async () => {
  vi.clearAllMocks(); mocks.key = 0;
  mocks.api.mockImplementation(async (path: string) => path === "/api/job-uploads" ? { uploadId: "upload", tusEndpoint: "https://unused.invalid" } : path === "/api/sources" ? { id: "source" } : { id: "job" });
  await act(async () => { rendered = create(createElement(OwnMaterialScreen)); });
});
afterEach(async () => { await act(async () => rendered.unmount()); });
async function fileMode() { await act(async () => rendered.root.findAllByType("button").find(node => node.props.children === "Upload a file")!.props.onClick()); }
it.each([OFFICE_MIME.docx, OFFICE_MIME.pptx, "application/pdf", "image/png"])("picking %s uploads and accepts one chain with no editor", async mime => {
  await fileMode(); const picker = rendered.root.findByProps({ type: "file" }); expect(picker.props.accept).toBe(MANUAL_UPLOAD_ACCEPT);
  await act(async () => picker.props.onChange({ target: { files: [{ name: "notes", type: mime, size: 50 }] } }));
  expect(mocks.api).toHaveBeenCalledTimes(2);
  expect(mocks.api).toHaveBeenLastCalledWith("/api/job-uploads/upload/accept", expect.objectContaining({ body: { jobType: "reviewer_generation" }, key: "key-1" }));
  expect(mocks.push).toHaveBeenCalledWith("/generation/job"); expect(rendered.root.findAllByType("textarea")).toHaveLength(0);
});
it("paste keeps its editable source and explicit Create Reviewer action", async () => {
  await act(async () => rendered.root.findByType("textarea").props.onChange({ target: { value: "Synthetic teaching notes." } }));
  expect(mocks.api).not.toHaveBeenCalled();
  await act(async () => rendered.root.findAllByType("button").find(node => node.props.children === "Create Reviewer")!.props.onClick());
  expect(mocks.api).toHaveBeenCalledWith("/api/sources", expect.objectContaining({ body: expect.objectContaining({ sourceType: "text" }) }));
  expect(mocks.api).toHaveBeenCalledWith("/api/jobs", expect.objectContaining({ body: expect.objectContaining({ sourceVersionId: "source" }) }));
});
it.each(["doc", "ppt"])("explains legacy %s without uploading", async extension => {
  await fileMode(); await act(async () => rendered.root.findByProps({ type: "file" }).props.onChange({ target: { files: [{ name: `notes.${extension}`, type: "application/msword", size: 50 }] } }));
  expect(JSON.stringify(rendered.toJSON())).toContain("Save as .docx or .pptx"); expect(mocks.api).not.toHaveBeenCalled();
});
it("acceptance retry reuses the uploaded intent and key", async () => {
  await fileMode();
  let acceptCount = 0;
  mocks.api.mockImplementation(async (path: string) => {
    if (path === "/api/job-uploads") return { uploadId: "upload", tusEndpoint: "https://unused.invalid" };
    if (++acceptCount === 1) throw new Error("interrupted");
    return { id: "job" };
  });
  await act(async () => rendered.root.findByProps({ type: "file" }).props.onChange({ target: { files: [{ name: "notes.pdf", type: "application/pdf", size: 50 }] } }));
  await act(async () => rendered.root.findAllByType("button").find(node => node.props.children === "Try again")!.props.onClick());
  expect(mocks.api).toHaveBeenLastCalledWith("/api/job-uploads/upload/accept", expect.objectContaining({ key: "key-1" }));
  expect(mocks.uploaded).toHaveBeenCalledOnce();
  expect(mocks.api).toHaveBeenCalledTimes(3);
});
