import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ auth: vi.fn(), ingest: vi.fn() }));
vi.mock("@/lib/auth", () => ({ verifyBearerToken: mocks.auth }));
vi.mock("@/lib/canvas-db", () => ({ createCanvasServiceClient: () => ({}) }));
vi.mock("@/lib/canvas-preparation/manual", () => ({ admitCanvasFilePreparations: mocks.ingest }));
import { POST } from "./route";

beforeEach(() => { vi.clearAllMocks(); mocks.auth.mockResolvedValue({ id: "owner" }); });
it.each([undefined, "1"])("stream-caps ingestion bytes with Content-Length %s", async contentLength => {
  const response = await POST(new Request("https://example.test", {
    method: "POST", headers: { "content-type": "application/json", ...(contentLength ? { "content-length": contentLength } : {}) },
    body: " ".repeat(4097),
  }));
  expect(response.status).toBe(413);
  expect(await response.json()).toEqual({ ok: false, error: { code: "payload_too_large", message: "Request body must be at most 4096 bytes." } });
  expect(mocks.ingest).not.toHaveBeenCalled();
});
it.each([['preparation_pending',202],['preparation_unavailable',200],['prepared',200]] as const)('returns %s with status %i according to background acceptance',async(code,status)=>{
  mocks.ingest.mockResolvedValue({ok:true,response:{results:[{code}]}});
  const response=await POST(new Request('https://example.test',{method:'POST',headers:{'content-type':'application/json',authorization:'Bearer synthetic-token'},body:JSON.stringify({fileIds:['11111111-1111-4111-8111-111111111111']})}));
  expect(response.status).toBe(status);
});
