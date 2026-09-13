import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  acceptGeneration,
  createGenerationIntent,
  readGenerationIntents,
} from "./generationRecovery";
const values = vi.hoisted(() => new Map<string, string>());
vi.mock("../auth/sessionStore", () => ({
  sessionStore: {
    getItem: async (key: string) => values.get(key) ?? null,
    setItem: async (key: string, value: string) => {
      values.set(key, value);
    },
  },
}));
const input = {
  title: "Course material",
  type: "reviewer" as const,
  path: "/api/experience/generations",
  body: { courseId: "course", materialId: "file:1" },
};
beforeEach(() => values.clear());
describe("durable generation admission", () => {
  it("persists admission identity before contacting the server and scopes it to the owner", async () => {
    const intent = await createGenerationIntent("owner-a", input);
    expect(await readGenerationIntents("owner-a")).toEqual([intent]);
    expect(await readGenerationIntents("owner-b")).toEqual([]);
  });
  it("serializes concurrent saves without losing requests", async () => {
    await Promise.all([
      createGenerationIntent("owner", input),
      createGenerationIntent("owner", { ...input, title: "Second" }),
    ]);
    expect(await readGenerationIntents("owner")).toHaveLength(2);
  });
  it("reconnects duplicate in-flight admission once even if the screen leaves", async () => {
    const intent = await createGenerationIntent("owner", input);
    let finish!: (response: Response) => void;
    const fetchImpl = vi.fn(
      () =>
        new Promise<Response>((resolve) => {
          finish = resolve;
        }),
    );
    const client = {
      baseUrl: "https://api.example",
      accessToken: "token",
      fetchImpl,
    };
    const first = acceptGeneration("owner", client, intent),
      second = acceptGeneration("owner", client, intent);
    expect(first).toBe(second);
    finish(
      Response.json(
        { ok: true, data: { id: "saved-job", state: "queued" } },
        { status: 202 },
      ),
    );
    await first;
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect((await readGenerationIntents("owner"))[0]?.generationId).toBe(
      "saved-job",
    );
  });
  it("keeps the same key after an uncertain response, then avoids resubmitting accepted work", async () => {
    const intent = await createGenerationIntent("owner", input);
    const fetchImpl = vi
      .fn(async (_input: unknown, _init?: RequestInit) =>
        Response.json({ ok: true, data: { id: "saved-job", state: "queued" } }),
      )
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce(
        Response.json(
          { ok: true, data: { id: "saved-job", state: "queued" } },
          { status: 202 },
        ),
      );
    const client = {
      baseUrl: "https://api.example",
      accessToken: "token",
      fetchImpl,
    };
    await expect(acceptGeneration("owner", client, intent)).rejects.toThrow();
    const restored = (await readGenerationIntents("owner"))[0]!;
    expect(restored.key).toBe(intent.key);
    const accepted = await acceptGeneration("owner", client, restored);
    await acceptGeneration("owner", client, accepted);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    for (const call of fetchImpl.mock.calls)
      expect(call[1]?.headers).toMatchObject({ "Idempotency-Key": intent.key });
  });
});
