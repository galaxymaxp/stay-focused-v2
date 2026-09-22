import { DatabaseSync, type SQLInputValue } from "node:sqlite";

import type {
  ActivityDraft,
  LibraryArtifactDetail,
  LibraryArtifactSummary,
  Quiz,
  ReviewerReaderModel,
} from "@stay-focused/shared";

import type { LocalSqlDatabase, LocalSqlExecutor } from "./sqlDatabase";

/**
 * Test-only adapter that runs the production SQL on Node's built-in SQLite.
 * A file path lets a test close and reopen the database like an app restart.
 */
export function openNodeSqlite(path = ":memory:") {
  const raw = new DatabaseSync(path);
  const bind = (params: unknown[]) => params as SQLInputValue[];
  const executor: LocalSqlExecutor = {
    async execAsync(source) {
      raw.exec(source);
    },
    async runAsync(source, params) {
      return raw.prepare(source).run(...bind(params));
    },
    async getAllAsync<T>(source: string, params: unknown[]) {
      return raw.prepare(source).all(...bind(params)) as T[];
    },
    async getFirstAsync<T>(source: string, params: unknown[]) {
      return (raw.prepare(source).get(...bind(params)) ?? null) as T | null;
    },
  };
  let queue: Promise<void> = Promise.resolve();
  const db: LocalSqlDatabase = {
    ...executor,
    withExclusiveTransactionAsync(task) {
      const run = queue.then(async () => {
        raw.exec("BEGIN IMMEDIATE");
        try {
          await task(executor);
          raw.exec("COMMIT");
        } catch (error) {
          raw.exec("ROLLBACK");
          throw error;
        }
      });
      queue = run.catch(() => undefined);
      return run;
    },
  };
  return { db, raw, close: () => raw.close() };
}

export const OWNER_A = "11111111-1111-4111-8111-111111111111";
export const OWNER_B = "22222222-2222-4222-8222-222222222222";
export const REVIEWER_ROW_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const QUIZ_ROW_ID = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const DRAFT_ROW_ID = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const course = { id: "dddddddd-dddd-4ddd-8ddd-dddddddddddd", code: "BIO 101", name: "Biology" };

export function reviewerDetail(overrides: Partial<LibraryArtifactSummary> = {}): LibraryArtifactDetail {
  const artifact: LibraryArtifactSummary = {
    id: `reviewer:${REVIEWER_ROW_ID}`,
    type: "reviewer",
    title: "Cells",
    course,
    sourceId: "snapshot-1",
    sourceTitle: "Cells.pdf",
    activityId: null,
    createdAt: "2026-09-20T09:00:00.000Z",
    updatedAt: "2026-09-20T09:00:00.000Z",
    lastOpenedAt: null,
    status: "completed",
    relatedArtifactIds: [],
    ...overrides,
  };
  const reviewer: ReviewerReaderModel = {
    id: artifact.id,
    title: artifact.title,
    course,
    source: { id: "snapshot-1", title: "Cells.pdf" },
    generatedAt: artifact.createdAt,
    freshness: "current",
    sections: [
      {
        id: "section-1",
        title: "Cell structure",
        blocks: [
          {
            id: "block-1",
            title: "Membranes",
            explanation: "The membrane controls what enters and leaves the cell.",
            keyPoints: ["Selective permeability"],
            evidence: [{ kind: "example", text: "Oxygen diffuses across the membrane." }],
          },
        ],
      },
    ],
  };
  return { artifact, reviewer };
}

export function quizDetail(overrides: Partial<Quiz> = {}): LibraryArtifactDetail {
  const quiz: Quiz = {
    id: QUIZ_ROW_ID,
    title: "Cells quiz",
    courseId: course.id,
    reviewerId: REVIEWER_ROW_ID,
    sourceId: "material-1",
    sourceMaterialIds: ["material-1"],
    questionCount: 1,
    difficulty: "medium",
    createdAt: "2026-09-20T10:00:00.000Z",
    updatedAt: "2026-09-20T10:00:00.000Z",
    attemptCount: 0,
    latestScore: null,
    bestScore: null,
    questions: [
      {
        id: "q1",
        type: "single_select",
        prompt: "What controls entry into the cell?",
        options: [
          { id: "a", text: "Membrane" },
          { id: "b", text: "Ribosome" },
        ],
        selectionInstruction: "Choose one answer.",
        difficulty: "medium",
      },
    ],
    ...overrides,
  };
  // Mirrors ExperienceService.quizRecords.
  const { questions: _questions, ...summary } = quiz;
  const artifact: LibraryArtifactSummary = {
    id: `quiz:${quiz.id}`,
    type: "quiz",
    title: quiz.title,
    course,
    sourceId: quiz.sourceId,
    sourceTitle: null,
    activityId: null,
    createdAt: quiz.createdAt,
    updatedAt: quiz.updatedAt,
    lastOpenedAt: null,
    status: "completed",
    relatedArtifactIds: quiz.reviewerId ? [`reviewer:${quiz.reviewerId}`] : [],
    quiz: summary,
  };
  return { artifact, quiz };
}

export function draftDetail(overrides: Partial<ActivityDraft> = {}): LibraryArtifactDetail {
  const draft: ActivityDraft = {
    id: DRAFT_ROW_ID,
    activityId: "canvas:assignment-1",
    courseId: course.id,
    type: "reflection",
    title: "Lab reflection",
    sections: [
      { id: "s1", heading: "What I observed", level: 1, content: "Cells swelled in water.", order: 0, sourceRefs: [] },
    ],
    slides: [],
    sources: [{ id: "src-1", title: "Instructions", role: "instructions" }],
    warnings: [],
    generationId: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
    createdAt: "2026-09-20T11:00:00.000Z",
    updatedAt: "2026-09-20T11:00:00.000Z",
    editable: true,
    revision: 1,
    status: "draft",
    ...overrides,
  };
  const artifact: LibraryArtifactSummary = {
    id: `activity:${draft.id}`,
    type: "activity_output",
    title: draft.title,
    course,
    sourceId: draft.activityId,
    sourceTitle: draft.title,
    activityId: draft.activityId,
    createdAt: draft.createdAt,
    updatedAt: draft.updatedAt,
    lastOpenedAt: null,
    status: "completed",
    relatedArtifactIds: [],
  };
  return { artifact, draft };
}
