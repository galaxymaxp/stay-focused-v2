import type {
  NormalizedSourceKind,
  SourceNormalizationBlockInput,
} from "@stay-focused/engine";
import { sessionStore } from "../auth/sessionStore";

const DRAFT_STORAGE_KEY = "stay-focused-v2.processing-drafts.v1";
const MAX_DRAFT_STORAGE_CHARACTERS = 85_000;

interface ProcessingDraft {
  readonly localReference: string;
  readonly ownerUserId: string;
  readonly sourceText: string;
  readonly sourceTitle: string;
  readonly sourceKind?: NormalizedSourceKind;
  readonly sourceBlocks?: readonly SourceNormalizationBlockInput[];
  readonly createdAt: string;
}

export async function saveProcessingDraft(input: {
  readonly localReference: string;
  readonly ownerUserId: string;
  readonly sourceText: string;
  readonly sourceTitle?: string;
  readonly sourceKind?: NormalizedSourceKind;
  readonly sourceBlocks?: readonly SourceNormalizationBlockInput[];
}): Promise<boolean> {
  const draft: ProcessingDraft = {
    localReference: input.localReference,
    ownerUserId: input.ownerUserId,
    sourceText: input.sourceText,
    sourceTitle: input.sourceTitle?.trim() ?? "",
    ...(input.sourceKind ? { sourceKind: input.sourceKind } : {}),
    ...(input.sourceBlocks && input.sourceBlocks.length > 0
      ? { sourceBlocks: input.sourceBlocks }
      : {}),
    createdAt: new Date().toISOString(),
  };
  const all = await readAll();
  const next = [
    draft,
    ...all.filter(
      (item) =>
        !(
          item.ownerUserId === input.ownerUserId &&
          item.localReference === input.localReference
        ),
    ),
  ];
  while (JSON.stringify(next).length > MAX_DRAFT_STORAGE_CHARACTERS && next.length > 1) {
    next.pop();
  }
  if (JSON.stringify(next).length > MAX_DRAFT_STORAGE_CHARACTERS) return false;
  await sessionStore.setItem(DRAFT_STORAGE_KEY, JSON.stringify(next));
  return true;
}

export async function readProcessingDraft(
  ownerUserId: string,
  localReference: string,
): Promise<ProcessingDraft | null> {
  const all = await readAll();
  return (
    all.find(
      (item) =>
        item.ownerUserId === ownerUserId &&
        item.localReference === localReference,
    ) ?? null
  );
}

export async function removeProcessingDraft(
  ownerUserId: string,
  localReference: string,
): Promise<void> {
  const all = await readAll();
  await sessionStore.setItem(
    DRAFT_STORAGE_KEY,
    JSON.stringify(
      all.filter(
        (item) =>
          !(
            item.ownerUserId === ownerUserId &&
            item.localReference === localReference
          ),
      ),
    ),
  );
}

async function readAll(): Promise<readonly ProcessingDraft[]> {
  const raw = await sessionStore.getItem(DRAFT_STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.filter(isDraft) : [];
  } catch {
    return [];
  }
}

function isDraft(value: unknown): value is ProcessingDraft {
  return (
    typeof value === "object" &&
    value !== null &&
    "localReference" in value &&
    typeof value.localReference === "string" &&
    "ownerUserId" in value &&
    typeof value.ownerUserId === "string" &&
    "sourceText" in value &&
    typeof value.sourceText === "string" &&
    "sourceTitle" in value &&
    typeof value.sourceTitle === "string" &&
    "createdAt" in value &&
    typeof value.createdAt === "string"
  );
}
