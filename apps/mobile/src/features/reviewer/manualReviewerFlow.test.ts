import { createElement } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ pick: vi.fn(), photo: vi.fn(), gallery: vi.fn(), upload: vi.fn(), source: vi.fn(), generate: vi.fn(), push: vi.fn(), save: vi.fn(), busy: false }));
vi.mock("react", async importOriginal => {
  const actual = await importOriginal<typeof import("react")>();
  return { ...actual, useState: <S,>(initial: S | (() => S)) => actual.useState(initial === false && mocks.busy ? true as S : initial) };
});
vi.mock("lucide-react-native", () => ({ Camera: "CameraIcon", FileUp: "FileUpIcon", Image: "ImageIcon", Type: "TypeIcon" }));
vi.mock("../../design/theme", () => ({ useLegacyTheme: () => ({ textPrimary: "#111" }) }));
vi.mock("react-native", () => ({ View: "View", Text: "Text", Platform: { OS: "android" } }));
vi.mock("expo-router", () => ({ router: { push: mocks.push, back: vi.fn() } }));
vi.mock("../../auth", () => ({ useAuth: () => ({ session: { user: { id: "owner" }, accessToken: "test" } }) }));
vi.mock("../../components/Button", () => ({ Button: "Button" }));
vi.mock("../../components/TextField", () => ({ TextField: "TextField" }));
vi.mock("../../design/primitives", () => ({ Copy: "Copy", RowLink: ({ children, icon, ...props }: { children: import("react").ReactNode; icon: import("react").ReactNode }) => createElement("RowLink", props, icon, children), SegmentedControl: "SegmentedControl", Sheet: ({ children, footer }: { children: import("react").ReactNode; footer: import("react").ReactNode }) => createElement("Sheet", null, children, footer) }));
vi.mock("../../config/apiBaseUrl", () => ({ getApiBaseUrl: () => "https://unused.invalid" }));
vi.mock("../../services/canonicalSourcesApi", () => ({ persistCanonicalSource: mocks.source }));
vi.mock("../../services/activeProcessingJobStore", () => ({ upsertActiveProcessingJob: mocks.save }));
vi.mock("../../services/processingJobsApi", () => ({ createManualReviewerJob: mocks.upload, createReviewerJob: mocks.generate, createProcessingJobIdempotencyKey: () => "one-pick-key" }));
vi.mock("./manualDocument", () => ({ chooseManualDocument: mocks.pick }));
vi.mock("./galleryImage", () => ({ captureImageWithCamera: mocks.photo, chooseImageFromGallery: mocks.gallery }));
const { ReviewerGenerateScreen } = await import("./ReviewerGenerateScreen");
let rendered: ReactTestRenderer;
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
beforeEach(async () => {
  vi.clearAllMocks(); mocks.busy = false; mocks.upload.mockResolvedValue({ ok: true, data: { id: "job" } });
  mocks.source.mockResolvedValue({ ok: true, data: { id: "source", displayName: "Notes" } });
  mocks.generate.mockResolvedValue({ ok: true, data: { id: "paste-job" } });
  await act(async () => { rendered = create(createElement(ReviewerGenerateScreen)); });
});
afterEach(async () => { await act(async () => rendered.unmount()); });
const button = (id: string) => rendered.root.findByProps({ testID: id });
it("renders the three source options as icon rows with their original labels and testIDs", () => {
  const rows = rendered.root.findAllByType("RowLink" as never);
  expect(rows).toHaveLength(3);
  for (const [index, [id, label, icon]] of [
    ["source-choice-text", "Text", "TypeIcon"],
    ["source-choice-camera", "Camera", "CameraIcon"],
    ["source-choice-file", "Local File (PDF, DOCX, PPTX)", "FileUpIcon"],
  ].entries()) {
    const row = rows[index]!;
    expect(row.props).toMatchObject({ testID: id, label });
    expect(row.children[0]).toBe(row.findByType(icon as never));
    expect(row.findByType("Copy" as never).props.children).toBe(label);
  }
  expect(rendered.root.findAllByType("Button" as never)).toHaveLength(0);
});
it("passes busy disabling to chooser Camera and File rows", async () => {
  // Upload moves to its mode before becoming busy; seed busy to exercise the chooser contract.
  await act(async () => rendered.unmount());
  mocks.busy = true;
  await act(async () => { rendered = create(createElement(ReviewerGenerateScreen)); });
  expect(button("source-choice-camera").props.disabled).toBe(true);
  expect(button("source-choice-file").props.disabled).toBe(true);
});
it.each(["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/vnd.openxmlformats-officedocument.presentationml.presentation"])("picking %s starts one chain and opens generation with no edit step", async mimeType => {
  mocks.pick.mockResolvedValue({ uri: "file:source", mimeType, fileName: "notes", fileSize: 50 });
  await act(async () => button("source-choice-file").props.onPress());
  expect(mocks.upload).toHaveBeenCalledOnce(); expect(mocks.source).not.toHaveBeenCalled(); expect(mocks.generate).not.toHaveBeenCalled();
  expect(mocks.push).toHaveBeenCalledWith({ pathname: "/generation", params: { id: "job" } });
  expect(rendered.root.findAllByProps({ testID: "reviewer-source-input" })).toHaveLength(0);
  expect(rendered.root.findAllByProps({ testID: "source-continue-button" })).toHaveLength(0);
});
it("capturing a photo starts the same chain", async () => {
  mocks.photo.mockResolvedValue({ status: "selected", image: { uri: "file:photo", mimeType: "image/png", fileName: "photo.png" } });
  await act(async () => button("source-choice-camera").props.onPress());
  expect(mocks.upload).toHaveBeenCalledWith(expect.objectContaining({ source: expect.objectContaining({ kind: "image" }) }));
  expect(mocks.push).toHaveBeenCalledOnce();
});
it("paste still edits text, continues to canonical source, then explicitly generates", async () => {
  await act(async () => button("source-choice-text").props.onPress());
  await act(async () => button("reviewer-source-input").props.onChangeText("Synthetic notes about cells."));
  expect(mocks.upload).not.toHaveBeenCalled(); expect(mocks.generate).not.toHaveBeenCalled();
  await act(async () => button("source-continue-button").props.onPress());
  expect(mocks.source).toHaveBeenCalledWith(expect.objectContaining({ sourceType: "text", sourceText: "Synthetic notes about cells." }));
  await act(async () => button("reviewer-generate-button").props.onPress());
  expect(mocks.generate).toHaveBeenCalledOnce();
});
it("upload retry retains one pick key and upload session", async () => {
  mocks.pick.mockResolvedValue({ uri: "file:source", mimeType: "application/pdf", fileName: "notes.pdf" });
  mocks.upload.mockResolvedValueOnce({ ok: false, error: { message: "Interrupted" } });
  await act(async () => button("source-choice-file").props.onPress());
  const first = mocks.upload.mock.calls[0]![0];
  await act(async () => rendered.root.findAll(node => String(node.type) === "Button").find(node => node.props.children === "Try again")!.props.onPress());
  expect(mocks.upload.mock.calls[1]![0].idempotencyKey).toBe(first.idempotencyKey);
  expect(mocks.upload.mock.calls[1]![0].uploadSession).toBe(first.uploadSession);
});
it.each([
  ["image", "Take photo", "CameraIcon", "photo"],
  ["image", "Choose photo", "ImageIcon", "gallery"],
  ["pdf", "Choose PDF, DOCX or PPTX", "FileUpIcon", "pick"],
] as const)("%s mode keeps %s as a busy-disabled icon row with its original picker", async (mode, label, icon, picker) => {
  await act(async () => button("source-choice-text").props.onPress());
  await act(async () => rendered.root.findByType("SegmentedControl" as never).props.onChange(mode));
  const target = () => rendered.root.findAllByType("RowLink" as never).find(node => node.props.label === label)!;
  expect(target().findByType(icon as never)).toBeDefined();
  expect(target().findByType("Copy" as never).props.children).toBe(label);
  expect(rendered.root.findAllByType("Button" as never)).toHaveLength(0);
  mocks.pick.mockResolvedValue({ uri: "file:source", mimeType: "application/pdf", fileName: "notes.pdf" });
  mocks.photo.mockResolvedValue({ status: "selected", image: { uri: "file:photo", mimeType: "image/png", fileName: "photo.png" } });
  mocks.gallery.mockResolvedValue({ status: "selected", image: { uri: "file:gallery", mimeType: "image/png", fileName: "gallery.png" } });
  let finish!: (value: { ok: true; data: { id: string } }) => void;
  mocks.upload.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
  await act(async () => { void target().props.onPress(); });
  expect(mocks[picker]).toHaveBeenCalledOnce();
  for (const item of rendered.root.findAllByType("RowLink" as never)) expect(item.props.disabled).toBe(true);
  await act(async () => finish({ ok: true, data: { id: "job" } }));
  expect(mocks.push).toHaveBeenCalledWith({ pathname: "/generation", params: { id: "job" } });
});
