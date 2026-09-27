import { selectAssistBlock } from "@stay-focused/shared";
import { afterEach, describe, expect, it, vi } from "vitest";

import { reviewerDetail } from "../../services/localLibrary/localLibrary.testSupport";

vi.mock("../../design/haptics", () => ({ haptic: { tap: vi.fn(), select: vi.fn(), press: vi.fn(), success: vi.fn(), warning: vi.fn(), error: vi.fn() } }));
vi.mock("../../services/studyAssist", async (importOriginal) => {
  const original = await importOriginal<typeof import("../../services/studyAssist")>();
  return { ...original, studyAssist: { request: vi.fn(), peek: vi.fn(async () => null) } };
});
const { assistMark, assistStore, keyOf } = await import("./assistStore");
const { studyAssist } = await import("../../services/studyAssist");

const detail = reviewerDetail();
const reviewer = ("reviewer" in detail ? detail.reviewer : null)!;
const selection = selectAssistBlock(reviewer, reviewer.sections[0]!.id, reviewer.sections[0]!.blocks[0]!.id)!;
const client = { baseUrl: "https://example.test", accessToken: "t" };
afterEach(() => {
  assistStore.reset();
  vi.clearAllMocks();
});

describe("Study Assist passage state", () => {
  it("shows a passage as working, then green until opened", async () => {
    let finish!: (value: { text: string }) => void;
    vi.mocked(studyAssist.request).mockReturnValue(new Promise((resolve) => { finish = resolve as never; }) as never);
    const target = { selection, pointIndex: 0 };
    const events: string[] = [];
    const stop = assistStore.onSettled((event) => events.push(`${event.type}:${event.ok}`));
    assistStore.run("owner", client, target, "analogy");
    expect(assistMark(assistStore.get(keyOf(target)))).toBe("pending");
    expect(studyAssist.request).toHaveBeenCalledWith("owner", client, selection, "analogy", undefined, 0);
    finish({ text: "Like a library." });
    await vi.waitFor(() => expect(assistMark(assistStore.get(keyOf(target)))).toBe("fresh"));
    expect(events).toEqual(["analogy:true"]);
    assistStore.setOpen(keyOf(target));
    expect(assistMark(assistStore.get(keyOf(target)))).toBeNull();
    stop();
  });
  it("counts a result as seen when its sheet is open, and never runs a request twice", async () => {
    vi.mocked(studyAssist.request).mockResolvedValue({ text: "Short." } as never);
    const target = { selection };
    assistStore.setOpen(keyOf(target));
    assistStore.run("owner", client, target, "summarize");
    assistStore.run("owner", client, target, "summarize");
    await vi.waitFor(() => expect(assistStore.get(keyOf(target)).summarize?.status).toBe("ready"));
    expect(assistMark(assistStore.get(keyOf(target)))).toBeNull();
    assistStore.run("owner", client, target, "summarize");
    expect(studyAssist.request).toHaveBeenCalledTimes(1);
  });
  it("keeps block and key point results apart", () => {
    expect(keyOf({ selection })).not.toBe(keyOf({ selection, pointIndex: 0 }));
    expect(keyOf({ selection, pointIndex: 0 })).not.toBe(keyOf({ selection, pointIndex: 1 }));
  });
});
