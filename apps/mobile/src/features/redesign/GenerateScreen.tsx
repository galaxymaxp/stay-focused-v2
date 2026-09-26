import type {
  CourseLearningWorkspace,
  CourseMaterials,
  GenerateCourseList,
  GenerateCourseSummary,
  LearningMaterial,
} from "@stay-focused/shared";
import { router, useLocalSearchParams } from "expo-router";
import { BookOpen, ChevronDown, ChevronRight, ClipboardList, CloudOff, Eye, EyeOff, Pin, PinOff } from "lucide-react-native";
import { useEffect, useMemo, useRef, useState } from "react";
import { Pressable, View } from "react-native";

import { useAuth } from "../../auth";
import { courseIdentity } from "../../design/courseIdentity";
import { CourseCard, CourseMark } from "../../design/CourseViews";
import { Action, Copy, Notice, Page, SearchField, Surface, ContentIcon, RowLink, SkeletonBlock } from "../../design/primitives";
import { SwipeRow, animateNextLayout, swipeAccessibility, type SwipeAction } from "../../design/SwipeRow";
import { spacing } from "../../design/tokens";
import { useTheme } from "../../design/theme";
import { readCourseIdParam } from "../../navigation/appRoutes";
import { experienceRequest } from "../../services/experienceApi";
import { createGenerationIntent } from "../../services/generationRecovery";
import { SyncStatus } from "../sync/SyncStatus";
import { useCanvasSync } from "../sync/CanvasSyncProvider";
import { available, capabilityNote, generateCourseDestination, generateCourseGroups, generateCourseStatus, matchesCourseQuery, materialTypes, moduleGroups } from "./presentation";
import { quizIntentInput } from "./quizRequest";
import { useExperience, useExperienceClient } from "./useExperience";
import { arrangeList } from "./listPreferences";
import { useListPreferences } from "./useListPreferences";

/**
 * The material row that was tapped, handed to the material screen so it can
 * render immediately (including materials from later "More materials" pages).
 * The screen still reloads the course workspace for fresh capabilities.
 */
const openedMaterials = new Map<string, LearningMaterial>();

function firstParam(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value)?.trim() ?? "";
}

function courseMatches(course: GenerateCourseSummary, query: string) {
  const identity = courseIdentity(course);
  return matchesCourseQuery([course.code, course.name, identity.title, identity.subtitle, identity.monogram], query);
}

/** Level 1: synced courses grouped by term period, pinned courses first. */
export function GenerateScreen() {
  const courses = useExperience<GenerateCourseList>("/api/experience/courses");
  const { sync, unsyncCourse } = useCanvasSync();
  const { prefs, pin, hide } = useListPreferences();
  const { reducedMotion } = useTheme();
  const [showHidden, setShowHidden] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const searching = query.trim().length > 0;
  const allCourses = courses.data?.items ?? [];
  const matching = searching ? allCourses.filter((course) => courseMatches(course, query)) : allCourses;
  const arranged = arrangeList(matching, (course) => course.id, prefs.pinned.course, prefs.hidden.generate);
  const courseGroups = [
    ...(arranged.pinned.length ? [{ key: "pinned", title: "Pinned", items: arranged.pinned }] : []),
    ...generateCourseGroups(arranged.rest),
  ];

  function openCourse(course: GenerateCourseSummary) {
    // Unsynced courses never request materials; the Sync flow opens with that course in focus.
    if (generateCourseDestination(course) === "sync") {
      router.push({ pathname: "/canvas-settings", params: { courseId: course.id } });
      return;
    }
    router.push({ pathname: "/courses/[courseId]", params: { courseId: course.id, courseName: course.name, courseCode: course.code ?? "" } });
  }

  function change(update: () => void) {
    animateNextLayout(reducedMotion);
    update();
  }

  async function unsync(course: GenerateCourseSummary) {
    setNote(null);
    const done = await unsyncCourse(course.id);
    if (done) courses.refresh();
    else setNote(`Couldn’t stop syncing ${courseIdentity(course).title}. Check your connection and try again.`);
  }

  // Swipe right pins; swipe left hides (or stops syncing) — the same
  // directions as Today and Announcements.
  function actions(course: GenerateCourseSummary, hidden: boolean) {
    const pinned = prefs.pinned.course.includes(course.id);
    const leading: SwipeAction[] = hidden ? [] : [
      { key: "pin", label: pinned ? "Unpin" : "Pin", icon: pinned ? PinOff : Pin, tone: "accent", onPress: () => change(() => pin("course", course.id, !pinned)) },
    ];
    const trailing: SwipeAction[] = hidden
      ? [{ key: "show", label: "Show", icon: Eye, tone: "neutral", onPress: () => change(() => hide("generate", course.id, false)) }]
      : [
          { key: "hide", label: "Hide", icon: EyeOff, tone: "neutral", exits: true, onPress: () => change(() => hide("generate", course.id, true)) },
          ...(course.syncState !== "not_synced"
            ? [{ key: "unsync", label: "Unsync", icon: CloudOff, tone: "warning", onPress: () => void unsync(course) } satisfies SwipeAction]
            : []),
        ];
    return { leading, trailing, pinned };
  }

  return (
    <Page
      title="Generate"
      subtitle="Study tools from your synced courses."
      onRefresh={() => {
        courses.refresh();
        void sync();
      }}
      actions={[{ label: "Use text, camera or a local file", onPress: () => router.push("/generate") }]}
      headerBelow={
        allCourses.length > 0 ? (
          <View style={{ paddingHorizontal: spacing[5], paddingBottom: spacing[3] }}>
            <SearchField value={query} onChangeText={setQuery} placeholder="Search courses" label="Search courses" />
          </View>
        ) : null
      }
    >
      <SyncStatus />
      {courses.loading && !courses.data ? <GenerateSkeleton rows={3} /> : null}
      {courses.error && !courses.data ? (
        <Surface><Copy size="h3">Courses could not be loaded</Copy><Copy muted>{courses.error}</Copy><Action secondary onPress={courses.refresh}>Try again</Action></Surface>
      ) : null}
      {courses.data?.items.length === 0 ? (
        <Surface>
          <Copy size="h2">Sync Canvas to begin</Copy>
          <Copy muted>Connect Canvas, then sync a course to generate study tools from its materials.</Copy>
          <Action onPress={() => router.push("/canvas-settings")}>Open Canvas sync</Action>
        </Surface>
      ) : null}
      {note ? <Notice>{note}</Notice> : null}
      {searching && matching.length === 0 ? (
        <View accessibilityLiveRegion="polite" style={{ alignItems: "center", paddingVertical: spacing[8], gap: spacing[1] }}>
          <Copy size="h3">No matching courses</Copy>
          <Copy muted size="bodySmall" style={{ textAlign: "center" }}>Nothing matches “{query.trim()}”. Try a course code like CIT17 or part of the name.</Copy>
        </View>
      ) : null}
      {courseGroups.map((group) => (
        <View key={group.key} style={{ gap: spacing[2] }}>
          <Copy muted size="caption" style={{ fontWeight: "600", letterSpacing: 0.4, textTransform: "uppercase" }}>{group.title}</Copy>
          {group.items.map((course) => {
            const swipe = actions(course, false);
            return (
              <SwipeRow key={course.id} leading={swipe.leading} trailing={swipe.trailing}>
                <GenerateCourseCard course={course} pinned={swipe.pinned} swipeActions={[...swipe.leading, ...swipe.trailing]} onPress={() => openCourse(course)} />
              </SwipeRow>
            );
          })}
        </View>
      ))}
      {arranged.hidden.length > 0 ? (
        <View style={{ gap: spacing[2] }}>
          <Action secondary onPress={() => change(() => setShowHidden((value) => !value))}>
            {showHidden ? "Done" : `Show ${arranged.hidden.length} hidden`}
          </Action>
          {showHidden ? arranged.hidden.map((course) => {
            const swipe = actions(course, true);
            return (
              <SwipeRow key={course.id} trailing={swipe.trailing} style={{ opacity: 0.6 }}>
                <GenerateCourseCard course={course} swipeActions={swipe.trailing} onPress={() => openCourse(course)} />
              </SwipeRow>
            );
          }) : null}
        </View>
      ) : null}
    </Page>
  );
}

function GenerateCourseCard({ course, onPress, pinned = false, swipeActions }: { course: GenerateCourseSummary; onPress: () => void; pinned?: boolean; swipeActions: readonly SwipeAction[] }) {
  const { colors } = useTheme();
  const identity = useMemo(() => courseIdentity(course), [course]);
  const status = generateCourseStatus(course);
  const synced = course.syncState === "synced";
  return (
    <CourseCard identity={identity} onPress={onPress} pinned={pinned} {...swipeAccessibility(swipeActions)} accessibilityLabel={`${synced ? "Open" : "Sync"} ${identity.title}, ${status}`}>
      <Copy size="caption" color={synced ? colors.textMuted : colors.accent}>{status}</Copy>
    </CourseCard>
  );
}

/** Level 2: one course's instructional materials, grouped by Canvas module. */
export function GenerateCourseScreen() {
  const params = useLocalSearchParams<{ courseId?: string; courseName?: string; courseCode?: string }>();
  const courseId = readCourseIdParam(params.courseId);
  const workspace = useExperience<CourseLearningWorkspace>(
    courseId ? `/api/experience/courses/${encodeURIComponent(courseId)}` : null,
  );
  const client = useExperienceClient();
  const [extra, setExtra] = useState<LearningMaterial[]>([]);
  const [nextOffset, setNextOffset] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { colors } = useTheme();
  const course = workspace.data?.course;
  const identity = useMemo(
    () => courseIdentity({ id: courseId, name: course?.name ?? (firstParam(params.courseName) || "Course"), code: course?.code ?? (firstParam(params.courseCode) || null) }),
    [course?.code, course?.name, courseId, params.courseCode, params.courseName],
  );
  const groups = moduleGroups([...(workspace.data?.materials.items ?? []), ...extra]);

  useEffect(() => {
    setExtra([]);
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

  function openMaterial(item: LearningMaterial) {
    openedMaterials.set(item.id, item);
    router.push({ pathname: "/courses/[courseId]/material", params: { courseId, materialId: item.id } });
  }

  return (
    <Page back title={identity.title} subtitle={identity.subtitle ?? undefined} onRefresh={workspace.refresh} headerLeading={<CourseMark identity={identity} size={34} />}>
      {workspace.loading && !workspace.data ? <GenerateSkeleton rows={4} /> : null}
      {workspace.error && workspace.errorCode === "course_not_synced" ? (
        <Surface>
          <Copy size="h3">This course is not synced</Copy>
          <Copy muted>Synchronize it with Stay Focused to browse its study materials.</Copy>
          <Action onPress={() => router.push({ pathname: "/canvas-settings", params: { courseId } })}>Open Canvas sync</Action>
        </Surface>
      ) : workspace.error && !workspace.data ? (
        <Surface><Copy size="h3">Materials could not be loaded</Copy><Copy muted>{workspace.error}</Copy><Action secondary onPress={workspace.refresh}>Try again</Action></Surface>
      ) : null}
      {workspace.data ? (
        <Surface style={{ overflow: "hidden" }}>
          <RowLink inset label="Open this course in Tasks" onPress={() => router.navigate({ pathname: "/work/[courseKey]", params: { courseKey: courseId } })} icon={<ClipboardList color={colors.green} size={20} strokeWidth={1.7} />}>
            <Copy size="bodySmall" style={{ fontWeight: "600" }}>Activities and tasks</Copy>
            <Copy muted size="caption">Deadline-bearing Canvas work stays in Tasks.</Copy>
          </RowLink>
        </Surface>
      ) : null}
      {workspace.data && groups.map((group) => (
        <ModuleGroup key={group.key} title={group.title} items={group.items} onSelect={openMaterial} />
      ))}
      {nextOffset !== null ? <Action secondary disabled={busy} onPress={() => void loadMore()}>More materials</Action> : null}
      {workspace.data && groups.length === 0 && nextOffset === null ? (
        <Surface>
          <Copy size="h3">No eligible materials found</Copy>
          <Copy muted>This synchronized course has no instructional Pages, PDFs, documents, slides, or images to study from.</Copy>
          <Action secondary onPress={() => router.push("/canvas-settings")}>Check Canvas sync</Action>
        </Surface>
      ) : null}
      {error ? <Notice>{error}</Notice> : null}
    </Page>
  );
}

/** Level 3: a single material and the study tools it can produce. */
export function GenerateMaterialScreen() {
  const params = useLocalSearchParams<{ courseId?: string; materialId?: string }>();
  const courseId = readCourseIdParam(params.courseId);
  const materialId = firstParam(params.materialId);
  const workspace = useExperience<CourseLearningWorkspace>(
    courseId ? `/api/experience/courses/${encodeURIComponent(courseId)}` : null,
  );
  const client = useExperienceClient();
  const { session } = useAuth();
  const { colors } = useTheme();
  const [prepared, setPrepared] = useState<LearningMaterial | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submitting = useRef(false);
  const material =
    prepared ??
    workspace.data?.materials.items.find((item) => item.id === materialId) ??
    openedMaterials.get(materialId) ??
    null;
  const identity = useMemo(
    () => courseIdentity({ id: courseId, name: workspace.data?.course.name ?? "Course", code: workspace.data?.course.code ?? null }),
    [courseId, workspace.data?.course.code, workspace.data?.course.name],
  );

  async function prepare() {
    if (!material || busy) return;
    setBusy(true);
    setError(null);
    try {
      const result = await experienceRequest<{ items: LearningMaterial[] }>(client, "/api/experience/materials/prepare", {
        method: "POST",
        body: { courseId: material.courseId, materialId: material.id },
      });
      const next = result.items.find((item) => item.id === material.id) ?? null;
      if (next) {
        openedMaterials.set(next.id, next);
        setPrepared(next);
      }
      workspace.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not prepare this material.");
    } finally {
      setBusy(false);
    }
  }

  async function generate(type: "reviewer" | "quiz") {
    if (!material || !session || submitting.current || !available(material.generation[type]) ||
      !available(type === "quiz" ? workspace.data?.capabilities.quizGeneration : workspace.data?.capabilities.reviewerGeneration)) return;
    if (type === "quiz" && !material.reviewerArtifactId) return;

    submitting.current = true;
    setBusy(true);
    setError(null);
    try {
      const intent = await createGenerationIntent(
        session.user.id,
        type === "reviewer"
          ? { title: material.title, type, path: "/api/experience/generations", body: { courseId: material.courseId, materialId: material.id } }
          : quizIntentInput({ title: material.title, reviewerArtifactId: material.reviewerArtifactId! }),
      );
      router.push({ pathname: "/generation", params: { intent: intent.key, start: "1" } });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save your generation request.");
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }

  return (
    <Page back title={material?.title ?? "Material"} subtitle={identity.title}>
      {!material && workspace.loading ? <GenerateSkeleton rows={2} /> : null}
      {!material && !workspace.loading ? (
        <Surface>
          <Copy size="h3">This material is no longer available</Copy>
          <Copy muted>It may have been removed from Canvas since your last sync.</Copy>
          <Action secondary onPress={() => router.back()}>Back to course</Action>
        </Surface>
      ) : null}
      {material ? (
        <>
          <View style={{ flexDirection: "row", alignItems: "center", gap: spacing[3] }}>
            <ContentIcon kind={material.kind} />
            <View style={{ flex: 1 }}>
              <Copy muted size="caption">{materialTypes[material.kind]} · {material.readiness.replaceAll("_", " ")}</Copy>
              {material.moduleTitle ? <Copy muted size="caption">{material.moduleTitle}</Copy> : null}
            </View>
          </View>
          <Surface style={{ gap: spacing[3] }}>
            <Copy size="h3">Reviewer</Copy>
            <Copy muted size="bodySmall">A structured study guide written from this material.</Copy>
            {material.readiness === "needs_preparation" ? <Action disabled={busy} onPress={() => void prepare()}>Prepare material</Action> : null}
            <Action disabled={busy || !available(material.generation.reviewer) || !available(workspace.data?.capabilities.reviewerGeneration)} onPress={() => void generate("reviewer")}>
              Generate Reviewer
            </Action>
            {!available(material.generation.reviewer) ? <Copy muted size="caption">{capabilityNote(material.generation.reviewer)}</Copy> : null}
          </Surface>
          <Surface style={{ gap: spacing[3] }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: spacing[2] }}><BookOpen color={colors.violet} size={18} /><Copy size="h3">Quiz</Copy></View>
            <Copy muted size="bodySmall">
              {material.reviewerArtifactId ? "Build a 5-question quiz from the saved Reviewer for this material." : "Generate and save a Reviewer first. Quizzes use that Reviewer as their study source."}
            </Copy>
            <Action secondary disabled={busy || !material.reviewerArtifactId || !available(material.generation.quiz) || !available(workspace.data?.capabilities.quizGeneration)} onPress={() => void generate("quiz")}>
              Generate Quiz
            </Action>
          </Surface>
          <Action secondary onPress={() => router.push({ pathname: "/courses/[courseId]/reviewer", params: { courseId: material.courseId, courseName: workspace.data?.course.name ?? "Course" } })}>
            Choose source sections
          </Action>
        </>
      ) : null}
      {error ? <Notice>{error}</Notice> : null}
    </Page>
  );
}

function GenerateSkeleton({ rows }: { rows: number }) {
  return (
    <View accessibilityLabel="Loading synced course content" style={{ gap: spacing[3] }}>
      {Array.from({ length: rows }, (_, index) => (
        <Surface key={index} style={{ minHeight: 78, justifyContent: "center", gap: spacing[2] }}>
          <SkeletonBlock width={"34%"} height={10} radius={6} />
          <SkeletonBlock width={index % 2 ? "76%" : "62%"} height={16} radius={8} />
        </Surface>
      ))}
    </View>
  );
}

function ModuleGroup({ title, items, onSelect }: {
  title: string | null;
  items: readonly LearningMaterial[];
  onSelect: (item: LearningMaterial) => void;
}) {
  const [open, setOpen] = useState(true);
  const { colors } = useTheme();
  return (
    <Surface style={{ padding: 0, overflow: "hidden" }}>
      {title ? (
        <Pressable accessibilityRole="button" accessibilityState={{ expanded: open }} onPress={() => setOpen((value) => !value)} style={({ pressed }) => ({ minHeight: 48, paddingHorizontal: 12, paddingVertical: 8, flexDirection: "row", alignItems: "center", gap: 8, opacity: pressed ? 0.7 : 1 })}>
          <View style={{ flex: 1 }}><Copy size="body" style={{ fontWeight: "600" }}>{title}</Copy></View>
          <Copy size="caption" color={colors.textSecondary}>{items.length}</Copy>
          {open ? <ChevronDown color={colors.textSecondary} size={16} /> : <ChevronRight color={colors.textSecondary} size={16} />}
        </Pressable>
      ) : null}
      {open ? items.map((item) => (
        <Pressable key={item.id} accessibilityRole="button" accessibilityLabel={`Open material: ${item.title}`} onPress={() => onSelect(item)} style={({ pressed }) => ({ paddingHorizontal: 12, paddingVertical: 10, minHeight: 60, flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: pressed ? colors.surfaceSecondary : undefined, borderTopWidth: 1, borderColor: colors.separator })}>
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
