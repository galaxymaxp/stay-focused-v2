import { createClient } from "@supabase/supabase-js";
import { config as loadEnv } from "dotenv";

loadEnv({ path: ".env.local", override: false });
loadEnv({ path: ".env.smoke.local", override: false });

const apiBaseUrl = required("EXPO_PUBLIC_API_BASE_URL").replace(/\/+$/, "");
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
if (!supabaseUrl || !supabaseAnonKey) throw new Error("Supabase client configuration is missing.");

const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const { data, error } = await supabase.auth.signInWithPassword({
  email: required("SMOKE_TEST_EMAIL"),
  password: required("SMOKE_TEST_PASSWORD"),
});
if (error || !data.session?.access_token) throw new Error("Protected validation sign-in failed.");
const token = data.session.access_token;

const courses = await requestJson("/api/canvas/courses", token);
const selectedCourseIds = array(courses.selectedCourseIds);
if (selectedCourseIds.length === 0) throw new Error("No selected Canvas course is available for protected validation.");

let selected;
for (const courseId of selectedCourseIds) {
  const listed = await requestJson(`/api/canvas/courses/${encodeURIComponent(courseId)}/sources`, token);
  const candidates = array(listed.sources)
    .filter((source) => source && source.availability === "available" && source.type !== "file" && typeof source.id === "string")
    .sort((left, right) => Number(right.estimatedCharacters ?? 0) - Number(left.estimatedCharacters ?? 0));
  const source = candidates.find((candidate) => Number(candidate.estimatedCharacters ?? 0) >= 120) ?? candidates[0];
  if (source) {
    selected = { courseId, source };
    break;
  }
}
if (!selected) throw new Error("No readable non-file Canvas source is available for protected validation.");

const structure = await requestJson(
  `/api/canvas/courses/${encodeURIComponent(selected.courseId)}/sources/structure`,
  token,
  { sourceIds: [selected.source.id] },
);
const blocks = array(structure.sources).flatMap((source) => array(source.blocks));
const maximumSelectedBlocks = Number(structure.limits?.maximumSelectedBlocks ?? 80);
const defaultBlocks = blocks.filter((block) => block?.selectable && block?.selectedByDefault);
const selectableBlocks = defaultBlocks.length > 0 ? defaultBlocks : blocks.filter((block) => block?.selectable);
const selectedBlockIds = selectableBlocks.slice(0, maximumSelectedBlocks).map((block) => block.id).filter((id) => typeof id === "string");
if (selectedBlockIds.length === 0) throw new Error("Canvas structure contained no selectable readable blocks.");

const preview = await requestJson(
  `/api/canvas/courses/${encodeURIComponent(selected.courseId)}/sources/selective-preview`,
  token,
  { structureSessionId: structure.structureSessionId, selectedBlockIds },
);
if (typeof preview.sourceText !== "string" || preview.sourceText.trim().length === 0) {
  throw new Error("Canvas preview did not contain readable text.");
}
if (
  typeof preview.resolutionFingerprint !== "string" ||
  !Array.isArray(preview.sources) ||
  preview.sources.some((source) => typeof source?.id !== "string")
) {
  throw new Error("Canvas preview did not contain a current resolution identity.");
}

if (process.env.R2_PREFLIGHT_ONLY === "1") {
  console.log(JSON.stringify(await fallbackPreflight(preview.sourceText, preview.suggestedTitle)));
  process.exit(0);
}

const startedAt = Date.now();
const reviewerResponse = await fetch(`${apiBaseUrl}/api/reviewer/generate`, {
  method: "POST",
  headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
  body: JSON.stringify({
    sourceText: preview.sourceText,
    sourceTitle: preview.suggestedTitle,
    canvasPreviewSessionId: preview.previewSessionId,
    canvasCourseId: selected.courseId,
    canvasItemIds: preview.sources.map((source) => source.id),
    canvasResolutionFingerprint: preview.resolutionFingerprint,
  }),
});
const durationMs = Date.now() - startedAt;
const body = await reviewerResponse.json();
if (!reviewerResponse.ok || body?.ok !== true || !body.reviewer) {
  const diagnostic = body?.error?.diagnostic ?? {};
  console.error(JSON.stringify({
    label: "canvas-live-1",
    sourceCount: Number(preview.sourceCount ?? 1),
    characterCount: preview.sourceText.length,
    blockCount: selectedBlockIds.length,
    httpResult: reviewerResponse.status,
    failingStage: String(diagnostic.failingStage ?? "unknown"),
    validationReason: String(diagnostic.validationReason ?? "unknown"),
    validationCategory: String(diagnostic.validationCategory ?? "unknown"),
    failedField: String(diagnostic.failedField ?? "unknown"),
    retryCount: Number(diagnostic.retryCount ?? 0),
  }));
  throw new Error(`Protected Canvas reviewer validation returned HTTP ${reviewerResponse.status}.`);
}
const reviewer = body.reviewer;
const metadata = reviewer.metadata ?? {};
const result = {
  label: "canvas-live-1",
  sourceCount: Number(preview.sourceCount ?? 1),
  characterCount: preview.sourceText.length,
  blockCount: selectedBlockIds.length,
  plannedSectionCount: Number(metadata.sectionCount ?? 0),
  generatedSectionCount: Number(metadata.originalGeneratedSectionCount ?? metadata.generatedSectionCount ?? 0),
  repairedSectionCount: Number(metadata.repairedSectionCount ?? 0),
  fallbackSectionCount: Number(metadata.fallbackSectionCount ?? 0),
  finalSectionCount: array(reviewer.sections).length,
  coverageResult: String(metadata.coverageStatus ?? "unknown"),
  groundingResult: String(metadata.groundingStatus ?? "unknown"),
  leakageResult: String(metadata.leakageStatus ?? "unknown"),
  httpResult: reviewerResponse.status,
  reviewerQualityStatus: String(metadata.reviewerQualityStatus ?? "unknown"),
  durationMs,
};
console.log(JSON.stringify(result));

async function requestJson(path, accessToken, body) {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    method: body === undefined ? "GET" : "POST",
    headers: { Authorization: `Bearer ${accessToken}`, ...(body === undefined ? {} : { "Content-Type": "application/json" }) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const parsed = await response.json();
  if (!response.ok || parsed?.ok !== true) throw new Error(`Protected Canvas step returned HTTP ${response.status}.`);
  return parsed;
}

function array(value) {
  return Array.isArray(value) ? value : [];
}

function required(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Required protected validation setting ${name} is missing.`);
  return value;
}

async function fallbackPreflight(sourceText, sourceTitle) {
  const [{ normalizeSource }, { detectOutline }, { buildGenerationPlan }, recovery, coverageModule, groundingModule, leakageModule, fidelityModule] = await Promise.all([
    import("../packages/engine/dist/src/stage0-normalize.js"),
    import("../packages/engine/dist/src/stage1-outline.js"),
    import("../packages/engine/dist/src/stage2-plan.js"),
    import("../packages/engine/dist/src/stage5-retry.js"),
    import("../packages/engine/dist/src/stage4-verify.js"),
    import("../packages/engine/dist/src/stage5a-grounding.js"),
    import("../packages/engine/dist/src/leakage-guard.js"),
    import("../packages/engine/dist/src/source-token-fidelity.js"),
  ]);
  const source = await normalizeSource({ text: sourceText, title: sourceTitle });
  const outline = await detectOutline(source);
  const plan = buildGenerationPlan(outline, source);
  const sectionResults = [];
  for (const section of plan.sections) {
    const outlineSection = outline.sections.find((candidate) => candidate.id === section.sourceSectionId);
    const sourceTextOverride = outlineSection ? groundingModule.extractGroundingSourceSectionText(source, outlineSection) : undefined;
    const modes = [];
    for (const mode of ["items", "blocks", "lines", "span"]) {
      const output = recovery.createExtractiveSectionFallback({ section, source, sourceTextOverride, mode });
      const outputs = output ? [output] : [];
      const coverage = coverageModule.verifyCoverage({ outputs, plan, source, outline }).sections.find((item) => item.plannedSectionId === section.id);
      const grounding = groundingModule.validateGrounding({ outputs, plan, source, outline }).sections.find((item) => item.plannedSectionId === section.id);
      const leakage = leakageModule.validateLeakage({ outputs, plan, source }).sections.find((item) => item.plannedSectionId === section.id);
      modes.push({
        mode,
        coverage: coverage?.status ?? "missing",
        grounding: grounding?.status ?? "missing",
        leakage: leakage?.status ?? "missing",
        groundingIssueTypes: [...new Set((grounding?.issues ?? []).map((issue) => issue.type))],
        sourceItemCount: grounding?.sourceItemCount ?? 0,
        representedSourceItemCount: grounding?.representedSourceItemCount ?? 0,
        fidelityViolationCounts: output?.sourceCore?.keyPoints?.map((point) => fidelityModule.findSourceTokenFidelityViolations(sourceTextOverride ?? "", point).length) ?? [],
      });
    }
    sectionResults.push({ order: section.order, modes });
  }
  return { label: "canvas-live-1-preflight", plannedSectionCount: plan.sections.length, sectionResults };
}
