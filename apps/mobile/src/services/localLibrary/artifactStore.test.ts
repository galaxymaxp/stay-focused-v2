import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import type { ActivityDetail, ActivitySummary, LibraryArtifactDetail, QuizAttempt } from "@stay-focused/shared";
import { afterEach, describe, expect, it } from "vitest";

import { createLocalArtifactStore, LOCAL_PAYLOAD_SCHEMA } from "./artifactStore";
import {
  OWNER_A,
  OWNER_B,
  REVIEWER_ROW_ID,
  draftDetail,
  openNodeSqlite,
  quizDetail,
  reviewerDetail,
} from "./localLibrary.testSupport";
import { LOCAL_LIBRARY_SCHEMA_VERSION, migrateLocalLibrary } from "./schema";

const cleanups: (() => void)[] = [];
afterEach(() => {
  while (cleanups.length) cleanups.pop()!();
});

async function freshStore(path?: string) {
  const handle = openNodeSqlite(path);
  cleanups.push(() => {
    try {
      handle.close();
    } catch {
      // Already closed by the test.
    }
  });
  await migrateLocalLibrary(handle.db);
  return { ...handle, store: createLocalArtifactStore(handle.db) };
}

describe("local Library schema", () => {
  it("initializes the versioned schema once and is idempotent on reopen", async () => {
    const { db, raw } = await freshStore();
    expect(raw.prepare("PRAGMA user_version").get()).toEqual({ user_version: LOCAL_LIBRARY_SCHEMA_VERSION });
    await expect(migrateLocalLibrary(db)).resolves.toBe(LOCAL_LIBRARY_SCHEMA_VERSION);
  });

  it("resets a database written by a newer app build instead of misreading it", async () => {
    const { db, raw } = openNodeSqlite();
    cleanups.push(() => raw.close());
    raw.exec("CREATE TABLE library_artifacts (future_column TEXT); PRAGMA user_version = 99;");
    await expect(migrateLocalLibrary(db)).resolves.toBe(LOCAL_LIBRARY_SCHEMA_VERSION);
    const store = createLocalArtifactStore(db);
    await store.upsertDetail(OWNER_A, "reviewer:x", reviewerDetail());
    await expect(store.listSummaries(OWNER_A)).resolves.toHaveLength(1);
  });
});

describe("local artifact store", () => {
  it("persists Task attachment metadata across restart and keeps snapshots owner scoped", async () => {
    const dir = mkdtempSync(join(tmpdir(), "sf-task-cache-"));
    cleanups.push(() => rmSync(dir, { recursive: true, force: true }));
    const path = join(dir, "library.db");
    const summary: ActivitySummary = {
      id: "canvas:assignment-1", taskId: null, course: { id: "course-1", code: "BIO 101", name: "Biology" },
      title: "Lab report", dueAt: "2026-10-04T00:00:00Z", status: "unknown", priority: "medium",
      estimatedMinutes: null, submissionTypes: ["online_upload"], source: "canvas", isOverdue: false,
      urgency: "next", hasGeneratedDraft: false,
    };
    const detail = {
      ...summary, instructions: "Submit the report.", resources: [],
      attachments: [{ key: "file-1", filename: "Lab Template.docx", contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", extension: "DOCX", size: 2345 }],
      courseMaterials: null,
      generation: { reviewer: { status: "unavailable" }, quiz: { status: "unavailable" }, activityAssistance: { status: "unavailable" } },
      outputs: [],
    } as ActivityDetail;

    const first = await freshStore(path);
    await first.store.saveActivitySummaries(OWNER_A, [summary]);
    await first.store.saveActivityDetail(OWNER_A, detail);
    first.close();

    const reopened = await freshStore(path);
    await expect(reopened.store.readActivitySummaries(OWNER_A)).resolves.toEqual([summary]);
    await expect(reopened.store.readActivityDetail(OWNER_A, summary.id)).resolves.toMatchObject({
      attachments: [{ filename: "Lab Template.docx", contentType: detail.attachments[0]!.contentType }],
    });
    await expect(reopened.store.readActivitySummaries(OWNER_B)).resolves.toBeNull();
    await expect(reopened.store.readActivityDetail(OWNER_B, summary.id)).resolves.toBeNull();
    await reopened.store.saveActivitySummaries(OWNER_A, [summary]);
    await expect(reopened.store.readActivityDetail(OWNER_A, summary.id)).resolves.toMatchObject({ attachments: detail.attachments });
    await reopened.store.purgeOwner(OWNER_A);
    await expect(reopened.store.readActivitySummaries(OWNER_A)).resolves.toBeNull();
    await expect(reopened.store.readActivityDetail(OWNER_A, summary.id)).resolves.toBeNull();
  });

  it("keeps an unfinished Quiz attempt and draft owner scoped through restart", async () => {
    const dir = mkdtempSync(join(tmpdir(), "sf-quiz-"));
    cleanups.push(() => rmSync(dir, { recursive: true, force: true }));
    const path = join(dir, "library.db");
    const attempt = { id: 'local:one', quizId: 'quiz-one', status: 'in_progress', currentQuestion: 3,
      answers: [
        { questionId: 'q1', selectedOptionIds: ['a'], finalizedAt: '2026-09-28T00:00:00Z' },
        { questionId: 'q2', selectedOptionIds: ['left:right'], finalizedAt: null },
        { questionId: 'q3', selectedOptionIds: [], finalizedAt: null },
      ], feedback: [], skippedQuestionIds: ['legacy-skip'], revealedQuestionIds: ['q1'], assistedQuestionIds: [] } as unknown as QuizAttempt;
    const snapshot = { attempt, result: null, selected: ['b'], dirty: true };
    const first = await freshStore(path);
    await first.store.saveQuizPractice(OWNER_A, 'quiz-one', snapshot);
    first.close();
    const second = await freshStore(path);
    await expect(second.store.readQuizPractice(OWNER_A, 'quiz-one')).resolves.toEqual(snapshot);
    await expect(second.store.readQuizPractice(OWNER_B, 'quiz-one')).resolves.toBeNull();
    await second.store.purgeOwner(OWNER_A);
    await expect(second.store.readQuizPractice(OWNER_A, 'quiz-one')).resolves.toBeNull();
  });
  it.each([
    ["Reviewer", reviewerDetail()],
    ["Quiz", quizDetail()],
    ["Activity output", draftDetail()],
  ])("stores a completed %s with its full structured body", async (_label, detail) => {
    const { store } = await freshStore();
    await expect(store.upsertDetail(OWNER_A, detail.artifact.id, detail)).resolves.toBe("inserted");
    await expect(store.readDetail(OWNER_A, detail.artifact.id)).resolves.toEqual({
      detail,
      bodyBehindCloud: false,
    });
  });

  it("survives a process restart by reopening the same database file", async () => {
    const dir = mkdtempSync(join(tmpdir(), "sf-library-"));
    cleanups.push(() => rmSync(dir, { recursive: true, force: true }));
    const path = join(dir, "library.db");
    const first = await freshStore(path);
    await first.store.upsertDetail(OWNER_A, "reviewer:x", reviewerDetail());
    first.close();

    const second = await freshStore(path);
    await expect(second.store.listSummaries(OWNER_A)).resolves.toEqual([reviewerDetail().artifact]);
    await expect(second.store.readDetail(OWNER_A, reviewerDetail().artifact.id)).resolves.toMatchObject({
      detail: reviewerDetail(),
    });
  });

  it("does not duplicate an artifact received twice", async () => {
    const { store, raw } = await freshStore();
    const detail = quizDetail();
    await store.upsertDetail(OWNER_A, detail.artifact.id, detail);
    await expect(store.upsertDetail(OWNER_A, detail.artifact.id, detail)).resolves.toBe("unchanged");
    await expect(store.upsertSummaries(OWNER_A, [detail.artifact, detail.artifact])).resolves.toEqual([
      "unchanged",
      "unchanged",
    ]);
    expect(raw.prepare("SELECT COUNT(*) AS n FROM library_artifacts").get()).toEqual({ n: 1 });
  });

  it("updates the existing row when the cloud copy is newer", async () => {
    const { store } = await freshStore();
    await store.upsertDetail(OWNER_A, "activity:x", draftDetail());
    const newer = draftDetail({ title: "Lab reflection v2", revision: 2, updatedAt: "2026-09-21T11:00:00.000Z" });
    await expect(store.upsertDetail(OWNER_A, newer.artifact.id, newer)).resolves.toBe("updated");
    const stored = await store.readDetail(OWNER_A, newer.artifact.id);
    expect(stored?.detail).toEqual(newer);
    await expect(store.listSummaries(OWNER_A)).resolves.toEqual([newer.artifact]);
  });

  it("never lets an older or equal cloud copy overwrite newer local state", async () => {
    const { store } = await freshStore();
    const newer = draftDetail({ revision: 3, updatedAt: "2026-09-22T11:00:00.000Z" });
    await store.upsertDetail(OWNER_A, newer.artifact.id, newer);
    const older = draftDetail({ revision: 2, title: "Stale", updatedAt: "2026-09-21T11:00:00.000Z" });
    await expect(store.upsertDetail(OWNER_A, older.artifact.id, older)).resolves.toBe("ignored_older");
    await expect(store.upsertSummaries(OWNER_A, [older.artifact])).resolves.toEqual(["ignored_older"]);
    await expect(store.upsertSummaries(OWNER_A, [newer.artifact])).resolves.toEqual(["unchanged"]);
    expect((await store.readDetail(OWNER_A, newer.artifact.id))?.detail).toEqual(newer);
  });

  it("keeps the body but marks it behind when only a newer summary arrives", async () => {
    const { store } = await freshStore();
    const detail = reviewerDetail();
    await store.upsertDetail(OWNER_A, detail.artifact.id, detail);
    const renamed = { ...detail.artifact, title: "Cells (renamed)", updatedAt: "2026-09-21T09:00:00.000Z" };
    await expect(store.upsertSummaries(OWNER_A, [renamed])).resolves.toEqual(["updated"]);
    const stored = await store.readDetail(OWNER_A, detail.artifact.id);
    expect(stored?.bodyBehindCloud).toBe(true);
    expect(stored?.detail.artifact.title).toBe("Cells (renamed)");
    await expect(store.idsNeedingBody(OWNER_A, 10)).resolves.toEqual([detail.artifact.id]);
  });

  it("reads saved artifacts with no network dependency and lists summaries newest first", async () => {
    const { store } = await freshStore();
    await store.upsertDetail(OWNER_A, "a", reviewerDetail());
    await store.upsertDetail(OWNER_A, "b", quizDetail());
    await store.upsertDetail(OWNER_A, "c", draftDetail());
    const list = await store.listSummaries(OWNER_A);
    expect(list.map((item) => item.type)).toEqual(["activity_output", "quiz", "reviewer"]);
    for (const item of list) {
      await expect(store.readDetail(OWNER_A, item.id)).resolves.not.toBeNull();
    }
  });

  it("isolates owners: one account can never read another account's copies", async () => {
    const { store } = await freshStore();
    const detail = reviewerDetail();
    await store.upsertDetail(OWNER_A, detail.artifact.id, detail);
    await expect(store.listSummaries(OWNER_B)).resolves.toEqual([]);
    await expect(store.readDetail(OWNER_B, detail.artifact.id)).resolves.toBeNull();
    await expect(store.idsNeedingBody(OWNER_B, 10)).resolves.toEqual([]);
    // The same server id under another owner is a separate row.
    await store.upsertDetail(OWNER_B, detail.artifact.id, reviewerDetail({ title: "B's cells" }));
    expect((await store.readDetail(OWNER_A, detail.artifact.id))?.detail.artifact.title).toBe("Cells");
    expect((await store.readDetail(OWNER_B, detail.artifact.id))?.detail.artifact.title).toBe("B's cells");
    await expect(store.listSummaries("")).rejects.toThrow("owner_required");
  });

  it("purges only the signed-out owner on sign-out", async () => {
    const { store } = await freshStore();
    await store.upsertDetail(OWNER_A, "a", reviewerDetail());
    await store.upsertDetail(OWNER_B, "b", quizDetail());
    await store.purgeOwner(OWNER_A);
    await expect(store.listSummaries(OWNER_A)).resolves.toEqual([]);
    await expect(store.listSummaries(OWNER_B)).resolves.toHaveLength(1);
  });

  it("rejects incomplete artifacts and mismatched bodies", async () => {
    const { store } = await freshStore();
    const pending = reviewerDetail({ status: "generating" });
    await expect(store.upsertDetail(OWNER_A, pending.artifact.id, pending)).rejects.toThrow("invalid_artifact_detail");
    await expect(store.upsertSummaries(OWNER_A, [pending.artifact])).resolves.toEqual([]);
    const reviewerBody = reviewerDetail();
    if (!("reviewer" in reviewerBody)) throw new Error("fixture");
    const mismatched: LibraryArtifactDetail = { artifact: quizDetail().artifact, reviewer: reviewerBody.reviewer };
    await expect(store.upsertDetail(OWNER_A, "quiz:x", mismatched)).rejects.toThrow("invalid_artifact_detail");
    await expect(store.listSummaries(OWNER_A)).resolves.toEqual([]);
  });

  it("keeps the Quiz's exact persisted Reviewer relationship", async () => {
    const { store } = await freshStore();
    await store.upsertDetail(OWNER_A, "reviewer", reviewerDetail());
    const quiz = quizDetail({ title: "Cells" }); // Same title as the Reviewer on purpose.
    await store.upsertDetail(OWNER_A, quiz.artifact.id, quiz);
    const stored = await store.readDetail(OWNER_A, quiz.artifact.id);
    expect(stored && "quiz" in stored.detail ? stored.detail.quiz.reviewerArtifactId : null).toBe(REVIEWER_ROW_ID);
    expect(stored?.detail.artifact.relatedArtifactIds).toEqual([`artifact:${REVIEWER_ROW_ID}`]);
    const list = await store.listSummaries(OWNER_A);
    expect(new Set(list.map((item) => item.id)).size).toBe(2);
  });

  it("follows a server identity change without duplicating the artifact", async () => {
    const { store } = await freshStore();
    const generationId = "generation:ffffffff-ffff-4fff-8fff-ffffffffffff";
    await store.upsertSummaries(OWNER_A, [{ ...reviewerDetail().artifact, id: generationId }]);
    // The server resolves the finished generation to its saved Reviewer.
    await store.upsertDetail(OWNER_A, generationId, reviewerDetail());
    await expect(store.listSummaries(OWNER_A)).resolves.toEqual([reviewerDetail().artifact]);
    expect((await store.readDetail(OWNER_A, generationId))?.detail.artifact.id).toBe(`artifact:${REVIEWER_ROW_ID}`);
  });

  it("treats a body with an unknown payload schema as missing", async () => {
    const { store, raw } = await freshStore();
    const detail = reviewerDetail();
    await store.upsertDetail(OWNER_A, detail.artifact.id, detail);
    raw.prepare("UPDATE library_artifacts SET payload_schema = ?").run(LOCAL_PAYLOAD_SCHEMA + 1);
    await expect(store.readDetail(OWNER_A, detail.artifact.id)).resolves.toBeNull();
    await expect(store.idsNeedingBody(OWNER_A, 10)).resolves.toEqual([detail.artifact.id]);
  });

  it("removes an explicitly deleted artifact and its aliases", async () => {
    const { store, raw } = await freshStore();
    await store.upsertDetail(OWNER_A, "generation:old", reviewerDetail());
    await store.removeArtifact(OWNER_A, "generation:old");
    await expect(store.listSummaries(OWNER_A)).resolves.toEqual([]);
    expect(raw.prepare("SELECT COUNT(*) AS n FROM library_artifact_aliases").get()).toEqual({ n: 0 });
  });
  it('autosaved Activity responses survive a database reopen and remain separate from the generated draft', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'sf-activity-'));
    cleanups.push(() => rmSync(directory, { recursive: true, force: true }));
    const path = join(directory, 'library.db');
    const first = await freshStore(path);
    const detail = draftDetail();
    await first.store.upsertDetail(OWNER_A, detail.artifact.id, detail);
    await first.store.saveActivityResponse(OWNER_A, detail.artifact.id, { section1: 'My own explanation' }, true);
    first.close();
    const reopened = await freshStore(path);
    expect(await reopened.store.readActivityResponse(OWNER_A, detail.artifact.id)).toMatchObject({ responses: { section1: 'My own explanation' }, completed: true });
    expect((await reopened.store.readDetail(OWNER_A, detail.artifact.id))?.detail).toEqual(detail);
    expect((await reopened.store.listSummaries(OWNER_A))[0]?.activityStudyStatus).toBe('completed');
    expect(await reopened.store.readActivityResponse(OWNER_B, detail.artifact.id)).toBeNull();
  });
});
