import { describe, expect, it, vi } from "vitest";
import type { ActivityAttachment } from "@stay-focused/shared";
import { openCanvasTaskAttachment } from "./canvasTaskAttachments";

const client = { baseUrl: "https://api.example.test", accessToken: "stay-focused-session" };
const attachment: ActivityAttachment = { key: "a0", filename: "Lab Template.docx", contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", extension: "DOCX", size: 12 };

describe("Canvas Task attachment open", () => {
  it("does an authenticated, on-demand file request and preserves the file name and MIME type", async () => {
    const request = { url: "", init: undefined as RequestInit | undefined };
    const fetchImpl: typeof fetch = async (input, init) => {
      request.url = String(input);
      request.init = init;
      return new Response(new Uint8Array([1, 2, 3]), { status: 200 });
    };
    const save = vi.fn(async (_bytes: Uint8Array, _filename: string) => "file:///cache/Lab Template.docx");
    const open = vi.fn(async () => undefined);
    await openCanvasTaskAttachment(client, "canvas:assignment-row", attachment, { fetchImpl, save, open });
    expect(request.url).toBe("https://api.example.test/api/experience/activities/canvas%3Aassignment-row/attachments/a0");
    expect(request.init).toEqual({ headers: { Authorization: "Bearer stay-focused-session" } });
    expect(save).toHaveBeenCalledWith(new Uint8Array([1, 2, 3]), "Lab Template.docx", "canvas:assignment-row-a0");
    expect(open).toHaveBeenCalledWith("file:///cache/Lab Template.docx", "Lab Template.docx", attachment.contentType);
    expect(request.url).not.toMatch(/sync|generation|reviewer/i);
  });
  it("reports unavailable connectivity truthfully and does not open a file", async () => {
    const save = vi.fn(async () => "file:///cache/file");
    await expect(openCanvasTaskAttachment(client, "canvas:assignment-row", attachment, {
      fetchImpl: vi.fn(async () => { throw new TypeError("Network request failed"); }), save, open: vi.fn(async () => undefined),
    })).rejects.toThrow(TypeError);
    expect(save).not.toHaveBeenCalled();
  });
  it("does not open or cache files rejected by the authenticated resolver", async () => {
    const save = vi.fn(async () => "file:///cache/file");
    const open = vi.fn(async () => undefined);
    await expect(openCanvasTaskAttachment(client, "canvas:assignment-row", attachment, {
      fetchImpl: vi.fn(async () => new Response("", { status: 409 })), save, open,
    })).rejects.toThrow("Check your Canvas connection");
    expect(save).not.toHaveBeenCalled();
    expect(open).not.toHaveBeenCalled();
  });
});
