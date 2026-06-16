export const APP_NAME = "Stay Focused V2";
export const APP_VERSION = "2.0.0";
export const COVERAGE_THRESHOLD = 0.8;
export const GROUNDING_THRESHOLD = 0.8;

export const STUDENT_CONTENT_LEAKAGE_DENYLIST = [
  "Stay Focused",
  "Stay Focused V2",
  "@stay-focused/engine",
  "the engine",
  "Stay Focused V2 engine",
  "reviewer pipeline",
  "generation pipeline",
  "internal pipeline",
  "pipeline stage",
  "source outline",
  "coverage report",
  "plannedSectionId",
  "sourceSectionId",
  "sourceCore",
  "source core",
  "repository",
  "monorepo",
  "provider adapter",
] as const;

export type Identifier = string;
