import { beforeEach, describe, expect, it, vi } from "vitest";
import type { GenerationRequest } from "@stay-focused/engine";
const mocks = vi.hoisted(() => ({ generate: vi.fn(), readState: vi.fn(), checkpoints: new Map<string, unknown>() }));
vi.mock("@/providers", () => ({ createServerOpenAIProvider: () => ({ generate: mocks.generate }) }));
vi.mock("./worker-repository", () => ({ readProcessingJobState: mocks.readState }));
vi.mock("./workflow-repository", () => ({
  readProcessingJobCheckpoint: async (_client: unknown, _job: string, key: string) => mocks.checkpoints.has(key) ? { payload: mocks.checkpoints.get(key) } : null,
  writeProcessingJobCheckpoint: async (_client: unknown, { checkpointKey, payload }: { checkpointKey: string; payload: unknown }) => { mocks.checkpoints.set(checkpointKey, payload); },
}));
import { durableGenerationProvider } from "./ai-generation";
const request = { model: "test", prompt: "instructional source", schema: { name: "reviewer" } } as GenerationRequest<unknown>;
beforeEach(() => {
  mocks.checkpoints.clear(); vi.clearAllMocks();
  mocks.readState.mockResolvedValue({ status: "running", lease_owner: "worker", execution_backend: "google_cloud" });
});
describe("Google provider call fencing", () => {
  it("reuses the validated result across redelivery without another paid call", async () => {
    mocks.generate.mockResolvedValue({ result: "accepted" });
    const provider = durableGenerationProvider({} as never, "job", "worker");
    expect(await provider.generate(request)).toEqual({ result: "accepted" });
    expect(await provider.generate(request)).toEqual({ result: "accepted" });
    expect(mocks.generate).toHaveBeenCalledTimes(1);
  });
  it("does not repeat a call with an uncertain outcome", async () => {
    mocks.generate.mockRejectedValue(new Error("private provider response"));
    const provider = durableGenerationProvider({} as never, "job", "worker");
    await expect(provider.generate(request)).rejects.toThrow();
    await expect(provider.generate(request)).rejects.toThrow();
    expect(mocks.generate).toHaveBeenCalledTimes(1);
  });
  it("checks cancellation before both a new call and cached reuse", async () => {
    mocks.generate.mockResolvedValue({ result: "accepted" });
    const provider = durableGenerationProvider({} as never, "job", "worker");
    await provider.generate(request);
    mocks.readState.mockResolvedValue({ status: "cancellation_requested", lease_owner: "worker", execution_backend: "google_cloud" });
    await expect(provider.generate(request)).rejects.toThrow();
    expect(mocks.generate).toHaveBeenCalledTimes(1);
  });
});
