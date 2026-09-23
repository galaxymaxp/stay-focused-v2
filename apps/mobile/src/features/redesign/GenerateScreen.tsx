import type {
  CourseLearningWorkspace,
  CourseMaterials,
  CourseSummary,
  GenerateCourseList,
  GenerateCourseSummary,
  LearningMaterial,
} from "@stay-focused/shared";
import { router } from "expo-router";
import { BookOpen, ChevronDown, ChevronRight, ClipboardList } from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
import { Pressable, View } from "react-native";

import { useAuth } from "../../auth";
import { Action, Copy, Notice, Page, Sheet, Surface, ContentIcon, RowLink } from "../../design/primitives";
import { spacing } from "../../design/tokens";
import { useTheme } from "../../design/theme";
import { experienceRequest } from "../../services/experienceApi";
import { createGenerationIntent } from "../../services/generationRecovery";
import { available, capabilityNote, generateCourseDestination, generateCourseGroups, generateCourseStatus, materialTypes, moduleGroups } from "./presentation";
import { useExperience, useExperienceClient } from "./useExperience";

export function GenerateScreen() {
  const courses = useExperience<GenerateCourseList>("/api/experience/courses");
  const [courseId, setCourseId] = useState<string | null>(null);
  const selectedCourse = courses.data?.items.find((course) => course.id === courseId) ?? null;
  const workspace = useExperience<CourseLearningWorkspace>(
    courseId ? `/api/experience/courses/${encodeURIComponent(courseId)}` : null,
  );
  const [extra, setExtra] = useState<LearningMaterial[]>([]);
  const [nextOffset, setNextOffset] = useState<number | null>(null);
  const [selected, setSelected] = useState<LearningMaterial | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const submitting = useRef(false);
  const { session } = useAuth();
  const { colors } = useTheme();
  const client = useExperienceClient();
  const groups = moduleGroups([...(workspace.data?.materials.items ?? []), ...extra]);
  const courseGroups = generateCourseGroups(courses.data?.items ?? []);

  function openCourse(course: GenerateCourseSummary) {
    // Unsynced courses never request materials; the Sync flow opens with that course in focus.
    if (generateCourseDestination(course) === "sync") {
      router.push({ pathname: "/canvas-settings", params: { courseId: course.id } });
      return;
    }
    setCourseId(course.id);
  }

  useEffect(() => {
    setExtra([]);
    setSelected(null);
    setNextOffset(workspace.data?.materials.nextOffset ?? null);
  }, [workspace.data]);

  async function loadMore() {
    if (nextOffset === null || !courseId || busy) return;
    setBusy(true);
    setError(null);
    try {
      const page = await experienceRequest<CourseMaterials>(client, `/api/experience/courses/${encodeURIComponent(courseId)}/materials?offset=${nextOffset}`);
      setExtra((old) => [...old, ...page.items]);
      setNextOffset(page.nextOffset);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not load more materials.");
    } finally {
      setBusy(false);
    }
  }

  async function prepare() {
    if (!selected || busy) return;
    setBusy(true);
    setError(null);
    try {
      const result = await experienceRequest<{ items: LearningMaterial[] }>(client, "/api/experience/materials/prepare", {
        method: "POST",
        body: { courseId: selected.courseId, materialId: selected.id },
      });
      setSelected(result.items.find((item) => item.id === selected.id) ?? null);
      workspace.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not prepare this material.");
    } finally {
      setBusy(false);
    }
  }

  async function generate(type: "reviewer" | "quiz") {
    if (!selected || !session || submitting.current || !available(selected.generation[type]) ||
      !available(type === "quiz" ? workspace.data?.capabilities.quizGeneration : workspace.data?.capabilities.reviewerGeneration)) return;
    if (type === "quiz" && !selected.reviewerArtifactId) return;

    submitting.current = true;
    setBusy(true);
    setError(null);
    try {
      const intent = await createGenerationIntent(session.user.id, {
        title: selected.title,
        type,
        path: type === "reviewer" ? "/api/experience/generations" : "/api/experience/quizzes",
        body: type === "reviewer"
          ? { courseId: selected.courseId, materialId: selected.id }
          : {
              sourceType: "reviewer",
              sourceIds: [selected.reviewerArtifactId],
              reviewerArtifactId: selected.reviewerArtifactId,
              questionCount: 5,
              difficulty: "mixed",
              questionTypes: ["single_select", "true_false"],
            },
      });
      router.push({ pathname: "/generation", params: { intent: intent.key } });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save your generation request.");
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }

  function closeCourse() {
    setCourseId(null);
    setSelected(null);
    setError(null);
  }

  return (
    <Page
      title="Generate"
      subtitle={selectedCourse ? selectedCourse.name : "Study tools from your synced courses."}
      onRefresh={courseId ? workspace.refresh : courses.refresh}
      actions={[
        { label: "Canvas connection & sync", onPress: () => router.push("/canvas-settings") },
        { label: "Use text, camera or a local file", onPress: () => router.push("/generate") },
      ]}
    >
      {courseId ? <CourseWorkspaceHeader course={selectedCourse} onBack={closeCourse} /> : (
        <Copy muted>Synced courses open their study materials. Courses that are not synced open Canvas sync.</Copy>
      )}
      {!courseId && courses.loading ? <GenerateSkeleton rows={3} /> : null}
      {!courseId && courses.error ? (
        <Surface><Copy size="h3">Courses could not be loaded</Copy><Copy muted>{courses.error}</Copy><Action secondary onPress={courses.refresh}>Try again</Action></Surface>
      ) : null}
      {!courseId && courses.data?.items.length === 0 ? (
        <Surface>
          <Copy size="h2">Sync Canvas to begin</Copy>
          <Copy muted>Connect Canvas, then sync a course to generate study tools from its materials.</Copy>
          <Action onPress={() => router.push("/canvas-settings")}>Open Canvas sync</Action>
        </Surface>
      ) : null}
      {!courseId ? courseGroups.map((group) => (
        <View key={group.key} style={{ gap: spacing[3] }}>
          <Copy size="h3">{group.title}</Copy>
          {group.items.map((course) => (
            <CourseCard key={course.id} course={course} onPress={() => openCourse(course)} />
          ))}
        </View>
      )) : null}

      {courseId && workspace.loading ? <GenerateSkeleton rows={4} /> : null}
      {courseId && workspace.error && workspace.errorCode === "course_not_synced" ? (
        <Surface>
          <Copy size="h3">This course is not synced</Copy>
          <Copy muted>Synchronize it with Stay Focused to browse its study materials.</Copy>
          <Action onPress={() => router.push({ pathname: "/canvas-settings", params: { courseId } })}>Open Canvas sync</Action>
        </Surface>
      ) : courseId && workspace.error ? (
        <Surface><Copy size="h3">Materials could not be loaded</Copy><Copy muted>{workspace.error}</Copy><Action secondary onPress={workspace.refresh}>Try again</Action></Surface>
      ) : null}
      {workspace.data ? (
        <Surface style={{ gap: spacing[3] }}>
          <RowLink label="Open course activities in Tasks" onPress={() => router.navigate("/work")} icon={<ClipboardList color={colors.green} size={22} strokeWidth={1.7} />}>
            <Copy size="h3">Activities and tasks</Copy>
            <Copy muted size="bodySmall">Deadline-bearing Canvas work stays in Tasks.</Copy>
          </RowLink>
        </Surface>
      ) : null}
      {workspace.data && groups.map((group) => (
        <ModuleGroup key={group.key} title={group.title} items={group.items} selected={selected?.id ?? null} onSelect={setSelected} />
      ))}
      {nextOffset !== null ? <Action secondary disabled={busy} onPress={() => void loadMore()}>More materials</Action> : null}
      {workspace.data && groups.length === 0 && nextOffset === null ? (
        <Surface>
          <Copy size="h3">No study materials found</Copy>
          <Copy muted>This synchronized course has no eligible instructional Pages, PDFs, documents, slides, or images.</Copy>
          <Action secondary onPress={() => router.push("/canvas-settings")}>Check Canvas sync</Action>
        </Surface>
      ) : null}
      {error ? <Notice>{error}</Notice> : null}

      {selected ? (
        <Sheet onClose={() => setSelected(null)}>
          <Copy muted size="caption">{materialTypes[selected.kind]} · {selected.readiness.replaceAll("_", " ")}</Copy>
          <Copy size="h2">{selected.title}</Copy>
          {selected.readiness === "needs_preparation" ? <Action disabled={busy} onPress={() => void prepare()}>Prepare material</Action> : null}
          <Action disabled={busy || !available(selected.generation.reviewer) || !available(workspace.data?.capabilities.reviewerGeneration)} onPress={() => void generate("reviewer")}>
            Generate Reviewer
          </Action>
          {!available(selected.generation.reviewer) ? <Copy muted size="caption">Reviewer: {capabilityNote(selected.generation.reviewer)}</Copy> : null}
          <View style={{ borderTopWidth: 1, borderColor: colors.separator, paddingTop: spacing[3], gap: spacing[2] }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: spacing[2] }}><BookOpen color={colors.violet} size={18} /><Copy size="h3">Quiz</Copy></View>
            <Copy muted size="bodySmall">
              {selected.reviewerArtifactId ? "Build a 5-question quiz from the persisted Reviewer for this material." : "Generate and save a Reviewer first. Quizzes use that Reviewer as their study source."}
            </Copy>
            <Action secondary disabled={busy || !selected.reviewerArtifactId || !available(selected.generation.quiz) || !available(workspace.data?.capabilities.quizGeneration)} onPress={() => void generate("quiz")}>
              Generate Quiz
            </Action>
          </View>
          <Action secondary onPress={() => {
            setSelected(null);
            router.push({ pathname: "/courses/[courseId]/reviewer", params: { courseId: selected.courseId, courseName: workspace.data?.course.name ?? "Course" } });
          }}>
            Choose source sections
          </Action>
        </Sheet>
      ) : null}
    </Page>
  );
}

function CourseWorkspaceHeader({ course, onBack }: { course: CourseSummary | null; onBack: () => void }) {
  return (
    <Surface style={{ overflow: "hidden" }}>
      <RowLink inset label="Back to courses" onPress={onBack}>
        <Copy muted size="caption">{course?.code ?? "Synced course"}</Copy>
        <Copy size="h3">{course?.name ?? "Course materials"}</Copy>
        <Copy muted size="caption">Back to all courses</Copy>
      </RowLink>
    </Surface>
  );
}

function CourseCard({ course, onPress }: { course: GenerateCourseSummary; onPress: () => void }) {
  const { colors } = useTheme();
  const status = generateCourseStatus(course);
  const synced = course.syncState === "synced";
  return (
    <Surface style={{ overflow: "hidden" }}>
      <RowLink inset label={`${synced ? "Open" : "Sync"} ${course.name}, ${status}`} onPress={onPress} icon={<ContentIcon kind="module" />}>
        <Copy muted size="caption">{course.code ?? "Canvas course"}</Copy>
        <Copy size="h3">{course.name}</Copy>
        <Copy muted={synced} color={synced ? undefined : colors.accent} size="caption">{status}</Copy>
      </RowLink>
    </Surface>
  );
}

function GenerateSkeleton({ rows }: { rows: number }) {
  const { colors } = useTheme();
  return (
    <View accessibilityLabel="Loading synced course content" style={{ gap: spacing[3] }}>
      {Array.from({ length: rows }, (_, index) => (
        <Surface key={index} style={{ minHeight: 78, justifyContent: "center", gap: spacing[2] }}>
          <View style={{ width: "34%", height: 10, borderRadius: 6, backgroundColor: colors.surfaceSecondary }} />
          <View style={{ width: index % 2 ? "76%" : "62%", height: 16, borderRadius: 8, backgroundColor: colors.surfaceSecondary }} />
        </Surface>
      ))}
    </View>
  );
}

function ModuleGroup({ title, items, selected, onSelect }: {
  title: string | null;
  items: readonly LearningMaterial[];
  selected: string | null;
  onSelect: (item: LearningMaterial) => void;
}) {
  const [open, setOpen] = useState(true);
  const { colors } = useTheme();
  return (
    <Surface style={{ padding: 0, overflow: "hidden" }}>
      {title ? (
        <Pressable accessibilityRole="button" accessibilityState={{ expanded: open }} onPress={() => setOpen((value) => !value)} style={({ pressed }) => ({ minHeight: 48, paddingHorizontal: 12, paddingVertical: 8, flexDirection: "row", alignItems: "center", gap: 8, opacity: pressed ? 0.7 : 1 })}>
          <View style={{ flex: 1 }}><Copy size="body" style={{ fontWeight: "600" }}>{title}</Copy></View>
          <Copy size="caption" color={colors.accent}>{items.length}</Copy>
          {open ? <ChevronDown color={colors.textSecondary} size={16} /> : <ChevronRight color={colors.textSecondary} size={16} />}
        </Pressable>
      ) : null}
      {open ? items.map((item) => (
        <Pressable key={item.id} accessibilityRole="button" accessibilityState={{ selected: selected === item.id }} onPress={() => onSelect(item)} style={({ pressed }) => ({ paddingHorizontal: 12, paddingVertical: 10, minHeight: 60, flexDirection: "row", alignItems: "center", gap: 10, opacity: pressed ? 0.72 : 1, backgroundColor: selected === item.id ? colors.surfaceSecondary : undefined, borderTopWidth: 1, borderColor: colors.separator })}>
          <ContentIcon kind={item.kind} small />
          <View style={{ flex: 1 }}>
            <Copy size="bodySmall" style={{ fontWeight: "600" }}>{item.title}</Copy>
            <Copy muted size="caption">{materialTypes[item.kind]} · {item.readiness.replaceAll("_", " ")}{item.reviewerArtifactId ? " · Reviewer ready" : ""}</Copy>
          </View>
          <ChevronRight color={colors.textMuted} size={18} />
        </Pressable>
      )) : null}
    </Surface>
  );
}
