import { describe, expect, it, vi } from "vitest";
import { readBoundedText } from "./bounded-body";

function request(body?: BodyInit, contentLength?: string): Request {
  return new Request("https://example.test", {
    method: "POST", body,
    headers: contentLength ? { "content-length": contentLength } : {},
    ...(body instanceof ReadableStream ? { duplex: "half" as const } : {}),
  });
}

describe("readBoundedText", () => {
  it("reads valid UTF-8 under the cap", async () => {
    expect(await readBoundedText(request('"é"'), 8)).toEqual({ ok: true, text: '"é"' });
  });
  it("accepts exactly the byte cap", async () => {
    expect(await readBoundedText(request("éé"), 4)).toEqual({ ok: true, text: "éé" });
  });
  it.each([undefined, "1"])("rejects excess bytes with Content-Length %s", async length => {
    expect(await readBoundedText(request("12345", length), 4)).toEqual({ ok: false, reason: "too_large" });
  });
  it("rejects an oversized declared length without reading", async () => {
    const input = request("small", "100");
    const getReader = vi.spyOn(input.body!, "getReader");
    expect(await readBoundedText(input, 8)).toEqual({ ok: false, reason: "too_large" });
    expect(getReader).not.toHaveBeenCalled();
  });
  it("cancels at the crossing chunk without pulling later chunks", async () => {
    const cancel = vi.fn();
    const chunks = ["12", "345", "later"];
    let pulls = 0;
    const stream = new ReadableStream<Uint8Array>({
      pull(controller) { controller.enqueue(new TextEncoder().encode(chunks[pulls++]!)); },
      cancel,
    }, { highWaterMark: 0 });
    expect(await readBoundedText(request(stream), 4)).toEqual({ ok: false, reason: "too_large" });
    expect(cancel).toHaveBeenCalledOnce();
    expect(pulls).toBe(2);
    expect(stream.locked).toBe(false);
  });
  it("decodes a UTF-8 sequence split between chunks", async () => {
    const stream = new ReadableStream<Uint8Array>({ start(controller) {
      controller.enqueue(new Uint8Array([0xc3])); controller.enqueue(new Uint8Array([0xa9])); controller.close();
    } });
    expect(await readBoundedText(request(stream), 2)).toEqual({ ok: true, text: "é" });
  });
  it("rejects invalid UTF-8", async () => {
    expect(await readBoundedText(request(new Uint8Array([0xff])), 4)).toEqual({ ok: false, reason: "invalid_encoding" });
  });
  it("preserves the empty string for a null body", async () => {
    expect(await readBoundedText(request(), 4)).toEqual({ ok: true, text: "" });
  });
});
