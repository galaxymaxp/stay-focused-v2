import { createElement } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("react-native", () => ({ TextInput: "TextInput" }));
const { DraftInput } = await import("./DraftInput");
let rendered: ReactTestRenderer | undefined;
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
afterEach(async () => { if (rendered) await act(async () => rendered!.unmount()); rendered = undefined; });

describe("DraftInput", () => {
  it("grows for loaded/wrapped content and shrinks after deletion while leaving scrolling to the page", async () => {
    const onChangeText = vi.fn();
    await act(async () => { rendered = create(createElement(DraftInput, { value: "A long section", onChangeText })); });
    const field = () => rendered!.root.find((node) => String(node.type) === "TextInput");
    expect(field().props.scrollEnabled).toBe(false);
    const resize = async (height: number) => { await act(async () => field().props.onContentSizeChange({ nativeEvent: { contentSize: { height, width: 300 } } })); };
    await resize(600.3);
    expect(field().props.style.at(-1).height).toBe(617);
    await resize(25);
    expect(field().props.style.at(-1).height).toBe(96);
    expect(field().props.scrollEnabled).toBe(false);
    field().props.onChangeText("Edited text");
    expect(onChangeText).toHaveBeenCalledWith("Edited text");
  });
});
