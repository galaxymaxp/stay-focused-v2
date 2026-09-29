import { createElement } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createLocalArtifactStore, type LocalArtifactStore } from "../../services/localLibrary/artifactStore";
import {
  OWNER_A,
  OWNER_B,
  openNodeSqlite,
  draftDetail,
  quizDetail,
  reviewerDetail,
} from "../../services/localLibrary/localLibrary.testSupport";
import { migrateLocalLibrary } from "../../services/localLibrary/schema";
import { useLocalArtifact, useLocalLibrary } from "./useLocalLibrary";

const mocks = vi.hoisted(() => ({
  owner: "",
  store: null as LocalArtifactStore | null,
  request: vi.fn(),
  // Production memoizes the client per access token.
  client: { baseUrl: "https://api.example", accessToken: "token" },
}));
vi.mock("../../auth", () => ({
  useAuth: () => ({ session: mocks.owner ? { user: { id: mocks.owner }, accessToken: "token" } : null }),
}));
vi.mock("../../design/theme", () => ({ useTheme: () => ({ active: true }) }));
vi.mock("@react-navigation/native", () => ({ useIsFocused: () => true }));
vi.mock("./useExperience", () => ({
  useExperienceClient: () => mocks.client,
}));
vi.mock("../../services/experienceApi", () => ({ experienceRequest: mocks.request }));
vi.mock("../../services/localLibrary/localArtifactDatabase", () => ({
  getLocalArtifactStore: async () => mocks.store,
}));

class RemoteError extends Error {
  constructor(readonly code: string) {
    super(code);
  }
}
const categories = { reviewer: { status: "available" }, quiz: { status: "available" }, activity_output: { status: "available" } };

let rendered: ReactTestRenderer | undefined;
let library: ReturnType<typeof useLocalLibrary>;
let artifact: ReturnType<typeof useLocalArtifact>;
function LibraryProbe() {
  library = useLocalLibrary();
  return null;
}
function ArtifactProbe({ id }: { id: string }) {
  artifact = useLocalArtifact(id);
  return null;
}
async function flush() {
  await act(async () => {
    for (let index = 0; index < 20; index += 1) await Promise.resolve();
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}

beforeEach(async () => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  const { db } = openNodeSqlite();
  await migrateLocalLibrary(db);
  mocks.store = createLocalArtifactStore(db);
  mocks.owner = OWNER_A;
  mocks.request.mockReset();
});
afterEach(async () => {
  if (rendered) await act(async () => rendered!.unmount());
  rendered = undefined;
});

describe("useLocalLibrary", () => {
  it("renders device-saved work before the cloud answers, then reconciles", async () => {
    await mocks.store!.upsertDetail(OWNER_A, "r", reviewerDetail());
    const page = deferred<unknown>();
    mocks.request.mockImplementation((_client: unknown, path: string) =>
      path.startsWith("/api/experience/library?") ? page.promise : Promise.resolve(quizDetail()),
    );
    await act(async () => {
      rendered = create(createElement(LibraryProbe));
    });
    await flush();
    expect(library.items.map((item) => item.id)).toEqual([reviewerDetail().artifact.id]);
    expect(library.refreshing).toBe(true);

    page.resolve({ items: [reviewerDetail().artifact, quizDetail().artifact], categories, nextOffset: null });
    await flush();
    expect(library.items.map((item) => item.id)).toEqual([quizDetail().artifact.id, reviewerDetail().artifact.id]);
    expect(library.refreshing).toBe(false);
    expect(library.error).toBeNull();
  });

  it("keeps device-saved work when the cloud refresh fails", async () => {
    await mocks.store!.upsertDetail(OWNER_A, "r", reviewerDetail());
    mocks.request.mockRejectedValue(new RemoteError("connection"));
    await act(async () => {
      rendered = create(createElement(LibraryProbe));
    });
    await flush();
    expect(library.items).toHaveLength(1);
    expect(library.error).toBe("connection");
    expect(library.refreshing).toBe(false);
  });

  it("never shows another account's device copies after an account switch", async () => {
    await mocks.store!.upsertDetail(OWNER_A, "r", reviewerDetail());
    mocks.request.mockRejectedValue(new RemoteError("connection"));
    mocks.owner = OWNER_B;
    await act(async () => {
      rendered = create(createElement(LibraryProbe));
    });
    await flush();
    expect(library.items).toEqual([]);
  });
});

describe("useLocalArtifact", () => {
  it("opens a saved artifact offline from the device copy", async () => {
    await mocks.store!.upsertDetail(OWNER_A, "q", quizDetail());
    mocks.request.mockRejectedValue(new RemoteError("connection"));
    await act(async () => {
      rendered = create(createElement(ArtifactProbe, { id: quizDetail().artifact.id }));
    });
    await flush();
    expect(artifact.data).toEqual(quizDetail());
    expect(artifact.deviceCopy).toBe(true);
    expect(artifact.error).toBeNull();
  });

  it("shows the device copy without waiting for the cloud", async () => {
    await mocks.store!.upsertDetail(OWNER_A, "r", reviewerDetail());
    mocks.request.mockReturnValue(new Promise(() => undefined));
    await act(async () => {
      rendered = create(createElement(ArtifactProbe, { id: reviewerDetail().artifact.id }));
    });
    await flush();
    expect(artifact.data).toEqual(reviewerDetail());
    expect(artifact.loading).toBe(false);
  });

  it("removes the device copy when the server confirms the artifact is gone", async () => {
    await mocks.store!.upsertDetail(OWNER_A, "r", reviewerDetail());
    mocks.request.mockRejectedValue(new RemoteError("not_found"));
    await act(async () => {
      rendered = create(createElement(ArtifactProbe, { id: reviewerDetail().artifact.id }));
    });
    await flush();
    expect(artifact.data).toBeNull();
    expect(artifact.error).toBe("not_found");
    await expect(mocks.store!.listSummaries(OWNER_A)).resolves.toEqual([]);
  });
});

describe("saved Draft revision", () => {
  it("updates the open Draft and export source immediately, then reopens that revision offline without a duplicate", async () => {
    const original = draftDetail();
    await mocks.store!.upsertDetail(OWNER_A, original.artifact.id, original);
    mocks.request.mockRejectedValue(new RemoteError("connection"));
    await act(async () => { rendered = create(createElement(ArtifactProbe, { id: original.artifact.id })); });
    await flush();
    const edited = draftDetail({ title: "Edited scenario", revision: 2, updatedAt: "2026-09-29T04:00:00Z", status: "edited" });
    await act(async () => artifact.storeConfirmed(edited));
    await flush();
    expect(artifact.data).toEqual(edited);
    expect(artifact.deviceCopy).toBe(false);
    await act(async () => rendered!.unmount());
    await act(async () => { rendered = create(createElement(ArtifactProbe, { id: original.artifact.id })); });
    await flush();
    expect(artifact.data).toEqual(edited);
    expect(artifact.deviceCopy).toBe(true);
    expect((await mocks.store!.listSummaries(OWNER_A)).map(item => item.id)).toEqual([original.artifact.id]);
  });
});
