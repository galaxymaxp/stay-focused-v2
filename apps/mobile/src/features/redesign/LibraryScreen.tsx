import type {
  ActivityDraft,
  ActivityDraftContent,
  LibraryArtifactDetail,
  LibraryArtifactSummary,
} from "@stay-focused/shared";
import { useNavigation, usePreventRemove } from "@react-navigation/native";
import { router, useLocalSearchParams } from "expo-router";
import { Pin, PinOff, RotateCw, Trash2 } from "lucide-react-native";
import { useEffect, useMemo, useRef, useState } from "react";
import { Alert, Platform, TextInput, View, useWindowDimensions } from "react-native";

import { Action, Copy, Notice, Page, RowLink, SegmentedControl, Surface, ContentIcon, SkeletonCards, SkeletonBlock } from "../../design/primitives";
import { useAuth } from "../../auth";
import { getApiBaseUrl } from "../../config/apiBaseUrl";
import { courseIdentity } from "../../design/courseIdentity";
import { haptic } from "../../design/haptics";
import { CourseMark, CourseTile } from "../../design/CourseViews";
import { SwipeRow, animateNextLayout, swipeAccessibility, type SwipeAction } from "../../design/SwipeRow";
import { radius, spacing } from "../../design/tokens";
import { useTheme } from "../../design/theme";
import { experienceRequest } from "../../services/experienceApi";
import { createGenerationIntent } from "../../services/generationRecovery";
import { removeLocalArtifact } from "../../services/localLibrary/deviceLibrary";
import { deleteReviewer } from "../../services/reviewerLibraryApi";
import { reviewerArtifactIdFromLibraryId } from "./quizRequest";
import { available } from "./presentation";
import { useExperienceClient } from "./useExperience";
import {
  PERSONAL_LIBRARY_KEY,
  describeLibraryCounts,
  filterCourseLibrary,
  groupLibraryByCourse,
  librarySegments,
  type LibraryCourseGroup,
  type LibraryFilter,
} from "./libraryPresentation";
import { useLocalArtifact, useLocalLibrary } from "./useLocalLibrary";
import { arrangeList } from "./listPreferences";
import { useListPreferences } from "./useListPreferences";
import { ReviewerReaderScreen } from "../reviewer/ReviewerReader";
import { ExportSheet } from '../export/ExportSheet';

const LOCAL_PAGE_SIZE = 50;
const GRID_GAP = 12;

function libraryIdentity(key: string, course: LibraryArtifactSummary["course"]) {
  return course
    ? courseIdentity(course)
    : courseIdentity({ id: PERSONAL_LIBRARY_KEY, name: "Personal & other", code: null });
}

/**
 * Generated study work is stable Library content: it is never hidden or
 * unsynced from here. The only gesture is swipe right to pin, the same
 * direction as everywhere else.
 */
function pinAction(pinned: boolean, onPress: () => void): SwipeAction[] {
  return [{ key: "pin", label: pinned ? "Unpin" : "Pin", icon: pinned ? PinOff : Pin, tone: "accent", onPress }];
}

/**
 * Deletes a saved Reviewer from the account and this device after confirmation.
 */
function useDeleteReviewer(onDeleted: (item: LibraryArtifactSummary) => void) {
  const { session } = useAuth();
  const [removed, setRemoved] = useState<ReadonlySet<string>>(new Set());
  const [note, setNote] = useState<string | null>(null);
  async function remove(item: LibraryArtifactSummary) {
    const id = reviewerArtifactIdFromLibraryId(item.id);
    const apiBaseUrl = getApiBaseUrl();
    const accessToken = session?.accessToken?.trim();
    if (!id || !apiBaseUrl || !accessToken || !session) {
      setNote("Sign in again to delete this Reviewer.");
      return;
    }
    setNote(null);
    setRemoved((value) => new Set(value).add(item.id));
    const result = await deleteReviewer({ apiBaseUrl, accessToken, reviewerArtifactId: id });
    if (result.ok || result.error.code === "reviewer_not_found") {
      await removeLocalArtifact(session.user.id, item.id);
      haptic.success();
      onDeleted(item);
      return;
    }
    setRemoved((value) => {
      const next = new Set(value);
      next.delete(item.id);
      return next;
    });
    haptic.error();
    setNote(result.error.code === "unauthorized" ? "Your session expired. Sign in again to delete this Reviewer." : `“${item.title}” couldn’t be deleted. Check your connection and try again.`);
  }
  const confirm = (item: LibraryArtifactSummary) => {
    haptic.warning();
    Alert.alert("Delete Reviewer?", `“${item.title}” will be removed from your Library on every device. This can’t be undone.`, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => void remove(item) },
    ]);
  };
  return { removed, note, confirm };
}
function useRemoveQuiz(onRemoved: (item: LibraryArtifactSummary) => void) {
  const { session } = useAuth();
  const client = useExperienceClient();
  const [removed, setRemoved] = useState<ReadonlySet<string>>(new Set());
  const [note, setNote] = useState<string | null>(null);
  const remove = async (item: LibraryArtifactSummary) => {
    if (!session || !item.quiz) return;
    setNote(null);
    try {
      await experienceRequest(client, `/api/experience/quizzes/${encodeURIComponent(item.quiz.id)}`, { method: "DELETE" });
      await removeLocalArtifact(session.user.id, item.id);
      setRemoved(current => new Set(current).add(item.id));
      haptic.success();
      onRemoved(item);
    } catch {
      haptic.error();
      setNote(`Could not remove “${item.title}”. Check your connection and try again.`);
    }
  };
  const confirm = (item: LibraryArtifactSummary) => Alert.alert("Remove Quiz?", `“${item.title}” and its practice history will be removed from your Library.`, [
    { text: "Cancel", style: "cancel" },
    { text: "Remove", style: "destructive", onPress: () => void remove(item) },
  ]);
  return { removed, note, confirm };
}
function useRemakeReviewer() {
  const { session } = useAuth();
  const submitting = useRef(false);
  const [note, setNote] = useState<string | null>(null);
  const remake = async (item: LibraryArtifactSummary) => {
    if (!session || !item.course || !item.sourceMaterialId || submitting.current) return;
    submitting.current = true;
    setNote(null);
    try {
      const intent = await createGenerationIntent(session.user.id, {
        title: item.title,
        type: "reviewer",
        path: "/api/experience/generations",
        body: { courseId: item.course.id, materialId: item.sourceMaterialId },
      });
      router.push({ pathname: "/generation", params: { intent: intent.key, start: "1" } });
    } catch {
      haptic.error();
      setNote(`Could not remake “${item.title}”. Try again.`);
    } finally {
      submitting.current = false;
    }
  };
  const confirm = (item: LibraryArtifactSummary) => {
    if (!item.course || !item.sourceMaterialId) {
      if (item.course) router.push({ pathname: "/courses/[courseId]/reviewer", params: { courseId: item.course.id, courseName: item.course.name } });
      else setNote("This Reviewer has no original course material available to remake.");
      return;
    }
    Alert.alert("Remake Reviewer?", `Create a fresh Reviewer from the original material for “${item.title}”? The latest version will appear in Library.`, [
      { text: "Cancel", style: "cancel" },
      { text: "Remake", onPress: () => void remake(item) },
    ]);
  };
  return { note, confirm };
}

/** Level 1: a compact grid of courses that have saved study work. */
export function LibraryScreen() {
  const { width: windowWidth } = useWindowDimensions();
  const library = useLocalLibrary();
  const groups = useMemo(() => groupLibraryByCourse(library.items), [library.items]);
  const { prefs, pin } = useListPreferences();
  const { reducedMotion } = useTheme();
  const arranged = arrangeList(groups, (group) => group.key, prefs.pinned.course, []);
  const contentWidth = Math.max(280, windowWidth - spacing[5] * 2);
  const columns = contentWidth >= 560 ? 3 : 2;
  const tileWidth = Math.floor((contentWidth - GRID_GAP * (columns - 1)) / columns);
  const change = (update: () => void) => {
    animateNextLayout(reducedMotion);
    update();
  };
  function renderTile(group: LibraryCourseGroup) {
    const identity = libraryIdentity(group.key, group.course);
    const footnote = describeLibraryCounts(group.counts);
    const pinned = prefs.pinned.course.includes(group.key);
    const leading = pinAction(pinned, () => change(() => pin("course", group.key, !pinned)));
    return (
      <SwipeRow key={group.key} compact leading={leading} style={{ width: tileWidth }}>
        <CourseTile
          identity={identity}
          width={tileWidth}
          footnote={footnote}
          pinned={pinned}
          {...swipeAccessibility(leading)}
          accessibilityLabel={`${identity.title}, ${footnote}`}
          onPress={() => router.push({ pathname: "/library/[courseKey]", params: { courseKey: group.key } })}
        />
      </SwipeRow>
    );
  }
  // Saved work renders from the device; the skeleton appears only when nothing
  // is stored yet and the cloud is still answering.
  const hasLocal = library.items.length > 0;
  const loading = !library.localReady || (!hasLocal && library.refreshing);
  return (
    <Page title="Library" subtitle="Your saved study tools, by course." onRefresh={library.refresh}>
      {loading ? <LibrarySkeleton /> : null}
      {!hasLocal && library.error ? <Surface><Copy size="h3">Library could not be loaded</Copy><Copy muted>{library.error}</Copy><Action secondary onPress={library.refresh}>Try again</Action></Surface> : null}
      {hasLocal && library.error ? <Notice>Showing work saved on this device. Refresh when you are back online.</Notice> : null}
      {hasLocal && library.refreshing ? <Copy muted size="caption">Checking for updates…</Copy> : null}
      {!loading && !library.error && groups.length === 0 ? (
        <Surface>
          <Copy size="h2">No generated study materials yet</Copy>
          <Copy muted>Reviewers, quizzes and drafts you generate will be kept here, grouped by course.</Copy>
          <Action onPress={() => router.navigate("/courses")}>Browse synced courses</Action>
        </Surface>
      ) : null}
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: GRID_GAP }}>
        {[...arranged.pinned, ...arranged.rest].map((group) => renderTile(group))}
      </View>
    </Page>
  );
}

/** Level 2: one course's saved work, filtered by kind. */
export function LibraryCourseScreen() {
  const { courseKey: rawKey } = useLocalSearchParams<{ courseKey?: string }>();
  const courseKey = (Array.isArray(rawKey) ? rawKey[0] : rawKey) ?? "";
  const library = useLocalLibrary();
  const [filter, setFilter] = useState<LibraryFilter>("all");
  const [visible, setVisible] = useState(LOCAL_PAGE_SIZE);
  const courseItems = useMemo(() => filterCourseLibrary(library.items, courseKey, "all"), [courseKey, library.items]);
  const filtered = useMemo(() => filterCourseLibrary(library.items, courseKey, filter), [courseKey, filter, library.items]);
  const { prefs, pin } = useListPreferences();
  const { reducedMotion } = useTheme();
  const change = (update: () => void) => {
    animateNextLayout(reducedMotion);
    update();
  };
  const deletion = useDeleteReviewer((item) => {
    if (prefs.pinned.artifact.includes(item.id)) pin("artifact", item.id, false);
    library.refresh();
  });
  const remake = useRemakeReviewer();
  const quizRemoval = useRemoveQuiz((item) => {
    if (prefs.pinned.artifact.includes(item.id)) pin("artifact", item.id, false);
    library.refresh();
  });
  const arranged = arrangeList(filtered.filter((item) => !deletion.removed.has(item.id) && !quizRemoval.removed.has(item.id)), (item) => item.id, prefs.pinned.artifact, []);
  const items = [...arranged.pinned, ...arranged.rest];
  const identity = courseKey ? libraryIdentity(courseKey, courseItems[0]?.course ?? null) : null;
  const label = librarySegments.find((segment) => segment.value === filter)!.label.toLowerCase();
  const unavailable = filter !== "all" && library.categories ? !available(library.categories[filter]) : false;
  return (
    <Page
      back
      title={identity?.title ?? "Library"}
      subtitle={identity?.subtitle ?? undefined}
      onRefresh={library.refresh}
      headerLeading={identity ? <CourseMark identity={identity} size={34} /> : undefined}
      headerBelow={
        <View style={{ paddingHorizontal: spacing[5], paddingBottom: spacing[3] }}>
          <SegmentedControl segments={librarySegments} value={filter} onChange={(value) => { setFilter(value); setVisible(LOCAL_PAGE_SIZE); }} />
        </View>
      }
    >
      {!library.localReady ? <LibrarySkeleton /> : null}
      {unavailable ? <Notice>This category is temporarily unavailable.</Notice> : null}
      {deletion.note ? <Notice>{deletion.note}</Notice> : null}
      {remake.note ? <Notice>{remake.note}</Notice> : null}
      {quizRemoval.note ? <Notice>{quizRemoval.note}</Notice> : null}
      {library.localReady && courseKey && items.length === 0 ? (
        <Surface>
          <Copy size="h3">{filter === "all" ? "Nothing saved for this course" : `No ${label} yet`}</Copy>
          <Copy muted>Generate from this course&apos;s materials when you are ready.</Copy>
        </Surface>
      ) : null}
      {items.slice(0, visible).map((item) => {
        const pinned = prefs.pinned.artifact.includes(item.id);
        const leading = pinAction(pinned, () => change(() => pin("artifact", item.id, !pinned)));
        // Remake uses the original source; completed replacements collapse to one Library card.
        const trailing: SwipeAction[] = item.type === "reviewer" && reviewerArtifactIdFromLibraryId(item.id)
          ? [
              { key: "remake", label: "Remake", icon: RotateCw, tone: "accent", onPress: () => remake.confirm(item) },
              { key: "delete", label: "Delete", icon: Trash2, tone: "danger", onPress: () => deletion.confirm(item) },
            ]
          : item.type === "quiz" && item.quiz
            ? [{ key: "remove", label: "Remove", icon: Trash2, tone: "danger", onPress: () => quizRemoval.confirm(item) }]
            : [];
        return (
          <SwipeRow key={item.id} leading={leading} trailing={trailing}>
            <LibraryCard item={item} pinned={pinned} swipeActions={[...leading, ...trailing]} />
          </SwipeRow>
        );
      })}
      {items.length > visible ? <Action secondary onPress={() => setVisible((count) => count + LOCAL_PAGE_SIZE)}>More saved work</Action> : null}
      {items.length > 0 ? <Copy muted size="caption" style={{ textAlign: "center" }}>{items.length} {items.length === 1 ? "item" : "items"}</Copy> : null}
    </Page>
  );
}

function LibraryCard({ item, pinned = false, swipeActions }: { item: LibraryArtifactSummary; pinned?: boolean; swipeActions: readonly SwipeAction[] }) {
  const { colors } = useTheme();
  const typeLabel = item.type === "activity_output" ? "Draft" : item.type === "quiz" ? "Quiz" : "Reviewer";
  const tone = item.type === "quiz" ? colors.violet : item.type === "activity_output" ? colors.green : colors.blue;
  const soft = item.type === "quiz" ? colors.violetSoft : item.type === "activity_output" ? colors.greenSoft : colors.blueSoft;
  return (
    <Surface style={{ overflow: "hidden" }}>
      <RowLink
        inset
        icon={<ContentIcon kind={item.type} />}
        label={`${typeLabel}: ${item.title}${pinned ? ", pinned" : ""}`}
        {...swipeAccessibility(swipeActions)}
        trailing={pinned ? <Pin size={14} color={colors.textMuted} strokeWidth={1.8} style={{ transform: [{ rotate: "35deg" }] }} /> : undefined}
        onPress={() => router.push({ pathname: "/artifact", params: { id: item.id } })}>
        <View style={{ flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: spacing[2] }}>
          <View style={{ backgroundColor: soft, borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 3 }}><Copy size="caption" color={tone} style={{ fontWeight: "700" }}>{typeLabel}</Copy></View>
        </View>
        <Copy size="h3" style={{ lineHeight: 23 }}>{item.title}</Copy>
        {!item.course && item.sourceType ? <Copy muted size="caption">{sourceTypeLabel(item.sourceType)}{item.sourceTitle ? ` · ${item.sourceTitle}` : ""}</Copy> : null}
        <Copy muted size="caption">
          Updated {new Date(item.updatedAt).toLocaleDateString([], { month: "short", day: "numeric" })}
          {item.quiz ? ` · ${item.quiz.questionCount} questions${item.quiz.bestScore !== null ? ` · Best ${item.quiz.bestScore}%` : ""}` : ""}
        </Copy>
        {item.quiz ? <Copy muted size="caption">{item.quiz.activeAttempt
          ? `In progress · ${item.quiz.activeAttempt.answeredCount} / ${item.quiz.questionCount} answered · Question ${item.quiz.activeAttempt.currentQuestion + 1}`
          : item.quiz.latestScore !== null ? `Completed · Latest ${item.quiz.latestScore}% · ${item.quiz.attemptCount} attempt${item.quiz.attemptCount === 1 ? '' : 's'}`
          : 'Not started'}</Copy> : null}
      </RowLink>
    </Surface>
  );
}

function sourceTypeLabel(kind: NonNullable<LibraryArtifactSummary['sourceType']>): string {
  return kind === 'local_file' ? 'Local File' : kind === 'camera' ? 'Camera' : kind === 'text' ? 'Text' : kind === 'canvas_page' ? 'Canvas Page' : kind === 'canvas_file' ? 'Canvas File' : 'Canvas';
}

function LibrarySkeleton() {
  return <View accessibilityLabel="Loading Library" style={{ gap: spacing[3] }}>{[0, 1, 2].map((index) => <Surface key={index} style={{ minHeight: 104, justifyContent: "center", gap: spacing[2] }}><SkeletonBlock width={"28%"} height={10} radius={5} /><SkeletonBlock width={index === 1 ? "88%" : "68%"} height={18} radius={8} /><SkeletonBlock width={"44%"} height={10} radius={5} /></Surface>)}</View>;
}

export function ArtifactScreen() {
  const { id, quiz } = useLocalSearchParams<{ id: string; quiz?: string }>();
  const result = useLocalArtifact(id ?? null);
  const detail = result.data;
  const [exportOpen, setExportOpen] = useState(false);
  if (detail && "reviewer" in detail) {
    return <ReviewerReaderScreen artifact={detail.artifact} reviewer={detail.reviewer} deviceCopy={result.deviceCopy} openQuizInitially={quiz === "1"} />;
  }
  return (
    <Page
      title={detail && "draft" in detail ? "Draft" : detail && "quiz" in detail ? "Quiz" : "Library"}
      back
      headerAction={detail && "draft" in detail ? <Action secondary onPress={() => setExportOpen(true)}>Export</Action> : undefined}
    >
      {result.deviceCopy && (
        <Notice>{detail && "draft" in detail ? "Showing the copy saved on this device. Saving changes needs a connection." : "Showing the copy saved on this device. Saving changes and practice need a connection."}</Notice>
      )}
      {result.error && (
        <>
          <Notice>{result.error}</Notice>
          <Action secondary onPress={result.refresh}>
            Try again
          </Action>
        </>
      )}
      {result.loading && !detail && <SkeletonCards rows={2} label="Opening saved work" />}
      {detail && (
        <>
          {"draft" in detail ? null : <Copy size="h1" style={{ fontSize: 26, lineHeight: 33 }}>{detail.artifact.title}</Copy>}
          {"quiz" in detail && (
            <Surface>
              <Copy>
                {detail.quiz.questionCount} questions ·{" "}
                {detail.quiz.difficulty} difficulty
              </Copy>
              <Action
                onPress={() =>
                  router.push({
                    pathname: "/quiz",
                    params: { id: detail.quiz.id },
                  })
                }
              >
                Practice quiz
              </Action>
            </Surface>
          )}
          {exportOpen && 'draft' in detail ? <ExportSheet detail={detail} onClose={() => setExportOpen(false)} /> : null}
          {"draft" in detail && (
            <DraftEditor
              key={`${detail.draft.id}-${detail.draft.revision}`}
              draft={detail.draft}
              onSaved={(draft) =>
                result.storeConfirmed({
                  artifact: { ...detail.artifact, title: draft.title, updatedAt: draft.updatedAt },
                  draft,
                } satisfies LibraryArtifactDetail)
              }
            />
          )}
        </>
      )}
    </Page>
  );
}
function DraftEditor({ draft, onSaved }: { draft: ActivityDraft; onSaved: (draft: ActivityDraft) => void }) {
  const navigation = useNavigation();
  const client = useExperienceClient(),
    { colors } = useTheme();
  const [content, setContent] = useState<ActivityDraftContent>({
    title: draft.title,
    sections: draft.sections,
    slides: draft.slides,
  });
  const [revision, setRevision] = useState(draft.revision),
    [note, setNote] = useState<string | null>(null),
    [busy, setBusy] = useState(false),
    [dirty, setDirty] = useState(false);
  usePreventRemove(dirty, ({ data }) => {
    if (Platform.OS === "web") {
      if (window.confirm("Discard your unsaved draft edits?"))
        navigation.dispatch(data.action);
    } else
      Alert.alert(
        "Unsaved draft",
        "Save your draft before leaving, or discard these edits.",
        [
          { text: "Keep editing", style: "cancel" },
          {
            text: "Discard edits",
            style: "destructive",
            onPress: () => navigation.dispatch(data.action),
          },
        ],
      );
  });
  const inputStyle = {
    color: colors.textPrimary,
    backgroundColor: colors.surfacePrimary,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.separator,
    padding: 16,
    fontSize: 16,
    lineHeight: 25,
    minHeight: 52,
  };
  async function save() {
    if (busy) return;
    setBusy(true);
    setNote(null);
    try {
      const updated = await experienceRequest<ActivityDraft>(
        client,
        `/api/experience/activity-drafts/${encodeURIComponent(draft.id)}`,
        { method: "PATCH", body: { revision, content } },
      );
      setRevision(updated.revision);
      setDirty(false);
      onSaved(updated);
      setNote("Draft saved.");
    } catch (cause) {
      setNote(
        cause instanceof Error
          ? cause.message
          : "Could not save. Your edits remain here.",
      );
    } finally {
      setBusy(false);
    }
  }
  // Keep the existing editable generated draft, now saved after a short pause.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (!dirty || busy) return; const timer = setTimeout(() => void save(), 700); return () => clearTimeout(timer); }, [content, dirty, busy]);
  return (
    <View style={{ gap: 16 }}>
      <TextInput
        accessibilityLabel="Draft title"
        multiline
        value={content.title}
        editable={!busy}
        style={[inputStyle, { fontSize: 26, lineHeight: 33, textAlignVertical: "top" }]}
        onChangeText={(title) => {
          setDirty(true);
          setContent((old) => ({ ...old, title }));
        }}
      />
      <Copy muted size="caption">{dirty ? "Unsaved changes" : "Saved draft"}</Copy>
      {content.sections.map((section, index) => (
        <View key={section.id} style={{ gap: 8 }}>
          <Copy size="h3">{section.heading}</Copy>
          <TextInput
            accessibilityLabel={section.heading ?? `Section ${index + 1}`}
            multiline
            editable={!busy}
            value={section.content}
            style={[inputStyle, { minHeight: 160, textAlignVertical: "top" }]}
            onChangeText={(text) => {
              setDirty(true);
              setContent((old) => ({
                ...old,
                sections: old.sections.map((item, i) =>
                  i === index ? { ...item, content: text } : item,
                ),
              }));
            }}
          />
        </View>
      ))}
      {content.slides.map((slide, index) => (
        <View key={slide.number} style={{ gap: 8 }}>
          <Copy size="h3">{slide.title}</Copy>
          <TextInput
            accessibilityLabel={`Slide ${slide.number}`}
            multiline
            editable={!busy}
            value={slide.body}
            style={inputStyle}
            onChangeText={(text) => {
              setDirty(true);
              setContent((old) => ({
                ...old,
                slides: old.slides.map((item, i) =>
                  i === index ? { ...item, body: text } : item,
                ),
              }));
            }}
          />
        </View>
      ))}
      {draft.warnings.length > 0 && (
        <Notice>
          Some sections need information from you. Review the draft against your
          assignment before using it.
        </Notice>
      )}
      <Action disabled={busy || !dirty} onPress={() => void save()}>
        Save draft
      </Action>
      {note && <Notice>{note}</Notice>}
    </View>
  );
}
