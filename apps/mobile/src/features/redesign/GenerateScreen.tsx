import type {
  CourseLearningWorkspace,
  CourseMaterials,
  CourseSummary,
  LearningMaterial,
} from "@stay-focused/shared";
import { router } from "expo-router";
import { ChevronDown, ChevronRight } from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
import { Pressable, View } from "react-native";

import { useAuth } from "../../auth";
import {
  Action,
  Copy,
  Notice,
  Page,
  Sheet,
  Surface,
  ContentIcon,
} from "../../design/primitives";
import { useTheme } from "../../design/theme";
import { experienceRequest } from "../../services/experienceApi";
import { createGenerationIntent } from "../../services/generationRecovery";
import {
  available,
  capabilityNote,
  materialTypes,
  moduleGroups,
} from "./presentation";
import { useExperience, useExperienceClient } from "./useExperience";

export function GenerateScreen() {
  const courses = useExperience<{ items: CourseSummary[] }>(
    "/api/experience/courses",
  );
  const [courseId, setCourseId] = useState<string | null>(null),
    [choosing, setChoosing] = useState(false);
  const selectedCourse = courseId ?? courses.data?.items[0]?.id ?? null;
  const workspace = useExperience<CourseLearningWorkspace>(
    selectedCourse
      ? `/api/experience/courses/${encodeURIComponent(selectedCourse)}`
      : null,
  );
  const [extra, setExtra] = useState<LearningMaterial[]>([]),
    [nextOffset, setNextOffset] = useState<number | null>(null);
  const [selected, setSelected] = useState<LearningMaterial | null>(null),
    [error, setError] = useState<string | null>(null),
    [busy, setBusy] = useState(false);
  const submitting = useRef(false);
  const { session } = useAuth(),
    { colors } = useTheme();
  const client = useExperienceClient();
  const groups = moduleGroups([...(workspace.data?.materials.items ?? []), ...extra]);
  const moduleCount = groups.filter(group => group.title !== null).length;
  useEffect(() => {
    setExtra([]);
    setSelected(null);
    setNextOffset(workspace.data?.materials.nextOffset ?? null);
  }, [workspace.data]);
  async function loadMore() {
    if (nextOffset === null || !selectedCourse || busy) return;
    setBusy(true);
    setError(null);
    try {
      const page = await experienceRequest<CourseMaterials>(
        client,
        `/api/experience/courses/${encodeURIComponent(selectedCourse)}/materials?offset=${nextOffset}`,
      );
      setExtra((old) => [...old, ...page.items]);
      setNextOffset(page.nextOffset);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Could not load more materials.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function prepare() {
    if (!selected || busy) return;
    setBusy(true);
    setError(null);
    try {
      const result = await experienceRequest<{ items: LearningMaterial[] }>(
        client,
        "/api/experience/materials/prepare",
        {
          method: "POST",
          body: { courseId: selected.courseId, materialId: selected.id },
        },
      );
      setSelected(result.items.find((item) => item.id === selected.id) ?? null);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Could not prepare this material.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function generate(type: "reviewer" | "quiz") {
    if (
      !selected ||
      !session ||
      submitting.current ||
      !available(selected.generation[type]) ||
      !available(
        type === "quiz"
          ? workspace.data?.capabilities.quizGeneration
          : workspace.data?.capabilities.reviewerGeneration,
      )
    )
      return;
    submitting.current = true;
    setBusy(true);
    setError(null);
    try {
      const intent = await createGenerationIntent(session.user.id, {
        title: selected.title,
        type,
        path:
          type === "reviewer"
            ? "/api/experience/generations"
            : "/api/experience/quizzes",
        body:
          type === "reviewer"
            ? { courseId: selected.courseId, materialId: selected.id }
            : {
                sourceType: "material",
                sourceIds: [selected.id],
                questionCount: 5,
                difficulty: "mixed",
                questionTypes: ["single_select", "true_false"],
              },
      });
      router.push({ pathname: "/generation", params: { intent: intent.key } });
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Could not save your generation request.",
      );
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }
  return (
    <Page
      title="Generate"
      subtitle="Turn course materials into study tools."
      onRefresh={workspace.data ? workspace.refresh : courses.refresh}
      actions={[
        { label: "Canvas connection & sync", onPress: () => router.push("/canvas-settings") },
        { label: "Use text, camera or a local file", onPress: () => router.push("/generate") },
      ]}
    >
      <Surface>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Choose course"
          onPress={() => setChoosing(!choosing)}
          style={{
            minHeight: 48,
            flexDirection: "row",
            gap: 12,
            alignItems: "center",
          }}
        >
          <ContentIcon kind="document" />
          <View style={{ flex: 1 }}>
            <Copy muted size="caption">
              {workspace.data?.course.code ?? "Canvas course"}
            </Copy>
            <Copy size="h3">
              {workspace.data?.course.name ?? "Choose a course"}
            </Copy>
          </View>
          <View style={{ backgroundColor: colors.blueSoft, borderRadius: 12, paddingHorizontal: 9, paddingVertical: 5 }}><Copy size="caption" color={colors.blue}>Change</Copy></View>
        </Pressable>
        {choosing &&
          courses.data?.items.map((course) => (
            <Action
              secondary
              key={course.id}
              onPress={() => {
                setSelected(null);
                setCourseId(course.id);
                setChoosing(false);
              }}
            >
              {course.name}
            </Action>
          ))}
        {workspace.data && (
          <Copy muted size="caption">
            {moduleCount > 0 ? `${moduleCount} ${nextOffset !== null ? "loaded " : ""}${moduleCount === 1 ? "module" : "modules"} · ` : ""}
            {workspace.data.materials.totalKnown} {workspace.data.materials.totalKnown === 1 ? "material" : "materials"}
          </Copy>
        )}
      </Surface>
      {courses.error && <Notice>{courses.error}</Notice>}
      {workspace.error && <Notice>{workspace.error}</Notice>}
      {(courses.loading || (selectedCourse && workspace.loading)) && (
        <Notice>Loading your Canvas materials…</Notice>
      )}
      {courses.data?.items.length === 0 && (
        <Notice>Connect Canvas and sync your courses to get started.</Notice>
      )}
      {workspace.data &&
        groups.map(
          (group) => (
            <ModuleGroup
              key={group.key}
              title={group.title}
              items={group.items}
              selected={selected?.id ?? null}
              onSelect={setSelected}
            />
          ),
        )}
      {nextOffset !== null && (
        <Action secondary disabled={busy} onPress={() => void loadMore()}>
          More materials
        </Action>
      )}
      {workspace.data?.materials.totalKnown === 0 && (
        <Notice>No materials are available yet. Check your Canvas sync.</Notice>
      )}
      {selected && (
        <Sheet onClose={() => setSelected(null)}>
          <Copy size="h2">{selected.title}</Copy>
          <Copy muted>
            {materialTypes[selected.kind]} ·{" "}
            {selected.readiness.replaceAll("_", " ")}
          </Copy>
          {selected.readiness === "needs_preparation" && (
            <Action disabled={busy} onPress={() => void prepare()}>
              Prepare material
            </Action>
          )}
          <Action
            disabled={
              busy ||
              !available(selected.generation.reviewer) ||
              !available(workspace.data?.capabilities.reviewerGeneration)
            }
            onPress={() => void generate("reviewer")}
          >
            Generate Reviewer
          </Action>
          {!available(selected.generation.reviewer) && (
            <Copy muted size="caption">
              Reviewer: {capabilityNote(selected.generation.reviewer)}
            </Copy>
          )}
          <Action
            secondary
            disabled={
              busy ||
              !available(selected.generation.quiz) ||
              !available(workspace.data?.capabilities.quizGeneration)
            }
            onPress={() => void generate("quiz")}
          >
            Generate Quiz
          </Action>
          <Copy muted size="caption">
            {available(selected.generation.quiz)
              ? "5 questions · mixed difficulty"
              : `Quiz: ${capabilityNote(selected.generation.quiz)}`}
          </Copy>
          <Action
            secondary
            onPress={() => {
              setSelected(null);
              router.push({
                pathname: "/courses/[courseId]/reviewer",
                params: {
                  courseId: selected.courseId,
                  courseName: workspace.data?.course.name ?? "Course",
                },
              });
            }}
          >
            Choose source sections
          </Action>
          {error && <Notice>{error}</Notice>}
        </Sheet>
      )}
      {error && <Notice>{error}</Notice>}
    </Page>
  );
}
function ModuleGroup({
  title,
  items,
  selected,
  onSelect,
}: {
  title: string | null;
  items: readonly LearningMaterial[];
  selected: string | null;
  onSelect: (item: LearningMaterial) => void;
}) {
  const [open, setOpen] = useState(true);
  const { colors } = useTheme();
  return (
    <Surface style={{ padding: 0, overflow: "hidden" }}>
      {title && (
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded: open }}
          onPress={() => setOpen(!open)}
          style={{
            minHeight: 48,
            paddingHorizontal: 12,
            paddingVertical: 8,
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
          }}
        >
          <View style={{ flex: 1 }}>
            <Copy size="body" style={{ fontWeight: "600" }}>{title}</Copy>
          </View>
          <Copy size="caption" color={colors.accent}>{items.length}</Copy>
          {open ? (
            <ChevronDown color={colors.textSecondary} size={16} />
          ) : (
            <ChevronRight color={colors.textSecondary} size={16} />
          )}
        </Pressable>
      )}
      {open &&
        items.map((item) => (
          <Pressable
            key={item.id}
            accessibilityRole="button"
            accessibilityState={{ selected: selected === item.id }}
            onPress={() => onSelect(item)}
            style={{
              paddingHorizontal: 12,
              paddingVertical: 10,
              minHeight: 56,
              flexDirection: "row",
              alignItems: "center",
              gap: 10,
              backgroundColor:
                selected === item.id ? colors.surfaceSecondary : undefined,
              borderTopWidth: 1,
              borderColor: colors.separator,
            }}
          >
            <ContentIcon kind={item.kind} small />
            <View style={{ flex: 1 }}>
              <Copy size="bodySmall" style={{ fontWeight: "500" }}>{item.title}</Copy>
              <Copy muted size="caption">
                {materialTypes[item.kind]}
                {item.count !== null
                  ? ` · ${item.count} ${item.kind === "slides" ? "slides" : "pages"}`
                  : ""}{" "}
                · {item.readiness.replaceAll("_", " ")}
              </Copy>
            </View>
            <ChevronRight color={colors.textMuted} size={18} />
          </Pressable>
        ))}
    </Surface>
  );
}
