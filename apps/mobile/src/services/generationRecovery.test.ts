import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  acceptGeneration,
  attributeGenerationIntent,
  createGenerationIntent,
  readGenerationIntents,
  resumeAutomaticGenerations,
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

describe("silent reviewer admission after restart", () => {
  it("replays only explicitly automatic requests for the current account with their saved key", async () => {
    await createGenerationIntent("owner", input);
    const intent = await createGenerationIntent("owner", { ...input, autoSubmit: true });
    await createGenerationIntent("other", { ...input, autoSubmit: true });
    const fetchImpl = vi.fn(async () => Response.json({ ok: true, data: { id: "accepted", state: "queued" } }, { status: 202 }));
    const client = { baseUrl: "https://api.example", accessToken: "token", fetchImpl };
    await resumeAutomaticGenerations("owner", client, () => true);
    expect(fetchImpl).toHaveBeenCalledExactlyOnceWith(expect.anything(), expect.objectContaining({ headers: expect.objectContaining({ "Idempotency-Key": intent.key }) }));
    await resumeAutomaticGenerations("owner", client, () => true);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect((await readGenerationIntents("other"))[0]?.generationId).toBeUndefined();
  });
  it("reuses the pending material request when the student returns and taps again", async () => {
    const [first, second] = await Promise.all([createGenerationIntent("owner", { ...input, autoSubmit: true }),
      createGenerationIntent("owner", { ...input, autoSubmit: true })]);
    expect(second.key).toBe(first.key);
    expect(await readGenerationIntents("owner")).toHaveLength(1);
  });
  it("retains offline admission for the next launch and honors an account change before submission", async () => {
    const intent = await createGenerationIntent("owner", { ...input, autoSubmit: true });
    const fetchImpl = vi.fn(async () => { throw new TypeError("network unavailable"); });
    const client = { baseUrl: "https://api.example", accessToken: "token", fetchImpl };
    await resumeAutomaticGenerations("owner", client, () => true);
    expect((await readGenerationIntents("owner"))[0]).toMatchObject({ key: intent.key, autoSubmit: true });
    await resumeAutomaticGenerations("owner", client, () => false);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });
  it("stops automatic retries after permanent rejection and leaves the request in Queue", async () => {
    await createGenerationIntent("owner", { ...input, autoSubmit: true });
    const fetchImpl = vi.fn(async () => Response.json({ ok: false, error: { code: "permission_denied" } }, { status: 403 }));
    const client = { baseUrl: "https://api.example", accessToken: "token", fetchImpl };
    await resumeAutomaticGenerations("owner", client, () => true);
    await resumeAutomaticGenerations("owner", client, () => true);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect((await readGenerationIntents("owner"))[0]).toMatchObject({ autoSubmit: false });
  });
});
describe("durable generation admission", () => {
  it.each(['quiz', 'activity_output'] as const)('attributes an older %s request without starting generation or changing its key', async type => {
    const intent = await createGenerationIntent('owner', { title: 'Saved request', type,
      path: type === 'quiz' ? '/api/experience/quizzes' : '/api/experience/activities/canvas%3Aassignment/generate',
      body: type === 'quiz' ? { reviewerArtifactId: 'reviewer' } : { mode: 'draft' },
    });
    const fetchImpl = vi.fn(async () => Response.json({ ok: true, data: type === 'quiz' ? { artifact: { course: { id: 'past-course' } } } : { course: { id: 'past-course' } } }));
    const result = await attributeGenerationIntent('owner', { baseUrl: 'https://api.example', accessToken: 'token', fetchImpl }, intent);
    expect(result).toMatchObject({ key: intent.key, courseId: 'past-course' });
    expect(fetchImpl.mock.calls).toHaveLength(1);
    expect((await readGenerationIntents('owner'))[0]?.courseId).toBe('past-course');
    expect(await readGenerationIntents('other')).toEqual([]);
  });
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
  it("replaces an unreadable local admission cache without duplicating server work", async () => {
    values.set("sf.generation.v1.owner", "corrupt-local-value");
    const intent = await createGenerationIntent("owner", input);
    expect(await readGenerationIntents("owner")).toEqual([intent]);
    const fetchImpl = vi.fn(async () =>
      Response.json(
        { ok: true, data: { id: "saved-job", state: "queued" } },
        { status: 202 },
      ),
    );
    await acceptGeneration(
      "owner",
      { baseUrl: "https://api.example", accessToken: "token", fetchImpl },
      intent,
    );
    expect(fetchImpl).toHaveBeenCalledTimes(1);
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
