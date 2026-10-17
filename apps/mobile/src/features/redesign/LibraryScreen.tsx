import { SnapshotStatus } from "./SnapshotStatus";
import { useStableSnapshotGroups } from "./useStableSnapshotGroups";
import type {
  ActivityDraft,
  ActivityDraftContent,
  LibraryArtifactDetail,
  LibraryArtifactSummary,
} from "@stay-focused/shared";
import { useNavigation, usePreventRemove } from "expo-router/react-navigation";
import { router, useLocalSearchParams } from "expo-router";
import { Check, Pin, PinOff, RotateCw, Trash2 } from "lucide-react-native";
import { useMemo, useRef, useState } from "react";
import { Alert, Animated, KeyboardAvoidingView, Platform, View, useWindowDimensions, type AccessibilityActionInfo } from "react-native";

import { Action, Copy, Notice, Page, RowLink, SegmentedControl, Surface, ContentIcon, SkeletonCards, SkeletonBlock } from "../../design/primitives";
import { useAuth } from "../../auth";
import { courseIdentity } from "../../design/courseIdentity";
import { haptic } from "../../design/haptics";
import { CourseMark, CourseTile } from "../../design/CourseViews";
import { SwipeRow, animateNextLayout, swipeAccessibility, type SwipeAction } from "../../design/SwipeRow";
import { radius, spacing } from "../../design/tokens";
import { useTheme } from "../../design/theme";
import { ExperienceApiError, experienceRequest } from "../../services/experienceApi";
import { acceptGeneration, createGenerationIntent } from "../../services/generationRecovery";
import { useQueueItems } from "../queue/useQueueItems";
import { removeLocalArtifact } from "../../services/localLibrary/deviceLibrary";
import { deleteReviewer } from "../../services/reviewerLibraryApi";
import { reviewerArtifactIdFromLibraryId } from "./quizRequest";
import { available } from "./presentation";
import { useExperienceClient } from "./useExperience";
import {
  OFFLINE_LIBRARY_NOTICE,
  OFFLINE_MISSING_NOTICE,
  offlineLibraryCaption,
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
import { DraftInput } from "./DraftInput";
import { useOfflineDraftEditor, DRAFT_ATTENTION_NOTICE } from './useOfflineDraftEditor';
import { useDraftVersions, DraftVersionsNotice, DraftVersionsSheet } from './DraftVersions';
import { automaticLibraryLabel } from "./automationPresentation";
import { reviewerSecondaryLine } from '../reviewer/reviewerEstimatePresentation';

import { libraryRemovalPath } from './courseReviewerActions';
import { useCourseReviewerBatch } from './useCourseReviewerBatch';
import { orderedLibrary } from './libraryOrder';
import { useLibraryOrganizer } from './useLibraryOrganizer';
import { LibrarySelectionToolbar } from './LibrarySelectionToolbar';
import { LibrarySortControl } from './LibrarySortControl';
import { LIBRARY_GRID_SORT_KEY, sortLibraryGroups, sortLibraryItems } from './librarySorting';
import { useLibraryCourseSequence } from './useLibraryCourseSequence';

const LOCAL_PAGE_SIZE = 50;
const GRID_GAP = 12;

function libraryIdentity(key: string, course: LibraryArtifactSummary["course"]) {
  return course
    ? courseIdentity(course)
    : courseIdentity({ id: PERSONAL_LIBRARY_KEY, name: "Personal & other", code: null });
}

/**
 * Saved work can be pinned or explicitly removed after confirmation.
 */
function pinAction(pinned: boolean, onPress: () => void): SwipeAction[] {
  return [{ key: "pin", label: pinned ? "Unpin" : "Pin", icon: pinned ? PinOff : Pin, tone: "accent", onPress }];
}

/** Account removal, followed by removal of the confirmed device copy. */
function useRemoveLibraryItems(onRemoved: (item: LibraryArtifactSummary) => void) {
  const { session } = useAuth();
  const client = useExperienceClient();
  const inFlight = useRef(false);
  const [busy, setBusy] = useState(false);
  const [removed, setRemoved] = useState<ReadonlySet<string>>(new Set());
  const [note, setNote] = useState<string | null>(null);
  const remove = async (items: readonly LibraryArtifactSummary[]) => {
    if (!session || inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setNote(null);
    let count = 0;
    let failed = 0;
    let linkedQuizzes = false;
    // Remove quizzes before the Reviewers they reference.
    const ordered = [...items].sort((a, b) => Number(a.type === 'reviewer') - Number(b.type === 'reviewer'));
    try {
      for (const item of ordered) {
        try {
          if (item.type === 'reviewer') {
            const id = reviewerArtifactIdFromLibraryId(item.id);
            if (!id) throw new Error('unavailable');
            const result = await deleteReviewer({ apiBaseUrl: client.baseUrl, accessToken: client.accessToken, reviewerArtifactId: id });
            if (!result.ok && result.error.code !== 'reviewer_not_found') {
              linkedQuizzes ||= result.error.code === 'reviewer_has_quizzes';
              throw new Error('remove_failed');
            }
          } else {
            const path = libraryRemovalPath(item);
            if (!path) throw new Error('unavailable');
            try {
              await experienceRequest(client, path, { method: 'DELETE' });
            } catch (cause) {
              if (!(cause instanceof ExperienceApiError) || !['not_found', 'activity_draft_not_found', 'quiz_not_found'].includes(cause.code)) throw cause;
            }
          }
          await removeLocalArtifact(session.user.id, item.id);
          setRemoved(current => new Set(current).add(item.id));
          onRemoved(item);
          count++;
        } catch { failed++; }
      }
      setNote(count + ' items removed.' + (failed ? ' ' + failed + ' could not be removed. ' + (linkedQuizzes ? 'Remove linked quizzes first, then try again.' : 'Check your connection and try again.') : ''));
      if (failed) haptic.error(); else haptic.success();
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  };
  const confirm = (items: readonly LibraryArtifactSummary[], all = false) => {
    if (busy || !items.length) return;
    haptic.warning();
    Alert.alert(all ? 'Remove all saved work?' : 'Remove saved work?', all
      ? 'Remove all ' + items.length + ' items in this course Library, including Reviewers, quizzes and drafts, on every device? This cannot be undone.'
      : items.length > 1 ? 'Remove these ' + items.length + ' selected items from your Library on every device? This cannot be undone.'
      : 'Remove ' + items[0].title + ' from your Library on every device? This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: all ? 'Remove all' : 'Remove', style: 'destructive', onPress: () => void remove(items) },
    ]);
  };
  return { removed, note, busy, confirm };
}
function useRemakeReviewer() {
  const { session } = useAuth();
  const client = useExperienceClient();
  const queue = useQueueItems();
  const submitting = useRef(false);
  const [note, setNote] = useState<string | null>(null);
  const remake = async (item: LibraryArtifactSummary) => {
    if (!session || !item.course || !item.sourceMaterialId || submitting.current) return;
    submitting.current = true;
    setNote(null);
    try {
      const intent = await createGenerationIntent(session.user.id, {
        autoSubmit: true,
        courseId: item.course.id,
        title: item.title,
        type: "reviewer",
        path: "/api/experience/generations",
        body: { courseId: item.course.id, materialId: item.sourceMaterialId },
      });
      setNote("Request saved. Follow progress in Queue; you can leave this page.");
      queue.refresh();
      void acceptGeneration(session.user.id, client, intent).then(queue.refresh, queue.refresh);
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
  const offline = library.offlineStats != null && library.errorCode === "connection";
  const offlineCaption = offlineLibraryCaption(library.offlineStats, library.refreshing && !offline);
  const groups = useStableSnapshotGroups(groupLibraryByCourse(library.items));
  const { prefs, pin, sortLibrary } = useListPreferences();
  const sort = prefs.librarySort?.[LIBRARY_GRID_SORT_KEY] ?? "updated_desc";
  const { reducedMotion } = useTheme();
  const arranged = arrangeList(sortLibraryGroups(groups, sort), (group) => group.key, prefs.pinned.course, []);
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
  const loading = !library.localReady || (!hasLocal && !library.savedAt && library.refreshing);
  return (
    <Page title="Library" subtitle="Your saved study tools, by course." onRefresh={library.refresh}
      headerBelow={<View style={{ flexDirection: "row", alignItems: "center", gap: spacing[3], paddingHorizontal: spacing[5] }}>
        <View style={{ flex: 1, minWidth: 0 }}><SnapshotStatus {...library} inset={false} /></View>
        <LibrarySortControl value={sort} grid onChange={value => sortLibrary(LIBRARY_GRID_SORT_KEY, value)} />
      </View>}>
      {offline ? <Notice>{OFFLINE_LIBRARY_NOTICE}</Notice> : null}
      {offlineCaption ? <Copy muted size="caption">{offlineCaption}</Copy> : null}
      {loading ? <LibrarySkeleton /> : null}
      {!hasLocal && library.error && !offline ? <Surface><Copy size="h3">{library.error.startsWith("App configuration error") ? "App configuration error" : "Library could not be loaded"}</Copy><Copy muted>{library.error.startsWith("App configuration error") ? library.error.split("\n").slice(1).join("\n") : library.error}</Copy><Action secondary onPress={library.refresh}>Try again</Action></Surface> : null}
      {hasLocal && library.error && !offline ? <Notice>{library.error.startsWith("App configuration error") ? library.error : "Showing work saved on this device. Refresh when you are back online."}</Notice> : null}
      {hasLocal && library.refreshing ? <Copy muted size="caption">Checking for updates…</Copy> : null}
      {!loading && (!library.error || library.savedAt !== null) && groups.length === 0 ? (
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
  const offline = library.offlineStats != null && library.errorCode === "connection";
  const offlineCaption = offlineLibraryCaption(library.offlineStats, library.refreshing && !offline);
  const [filter, setFilter] = useState<LibraryFilter>("all");
  const [visible, setVisible] = useState(LOCAL_PAGE_SIZE);
  const courseItems = useMemo(() => filterCourseLibrary(library.items, courseKey, "all"), [courseKey, library.items]);
  const filtered = useMemo(() => filterCourseLibrary(library.items, courseKey, filter), [courseKey, filter, library.items]);
  const { prefs, pin, reorderLibrary, sortLibrary } = useListPreferences();
  const sort = prefs.librarySort?.[courseKey] ?? "custom";
  const sequence = useLibraryCourseSequence(courseKey, sort === "course" && courseKey !== PERSONAL_LIBRARY_KEY);
  const { reducedMotion, colors } = useTheme();
  const change = (update: () => void) => {
    animateNextLayout(reducedMotion);
    update();
  };
  const removal = useRemoveLibraryItems((item) => {
    if (prefs.pinned.artifact.includes(item.id)) pin("artifact", item.id, false);
    library.refresh();
  });
  const remake = useRemakeReviewer();
  const batch = useCourseReviewerBatch(library.refresh);
  const remaining = courseItems.filter(item => !removal.removed.has(item.id));
  const arranged = arrangeList(remaining, (item) => item.id, prefs.pinned.artifact, []);
  const allItems = sortLibraryItems(orderedLibrary([...arranged.pinned, ...arranged.rest], prefs.libraryOrder?.[courseKey]), sort, sequence.data);
  const filteredIds = new Set(filtered.map(item => item.id));
  const items = allItems.filter(item => filteredIds.has(item.id));
  const organizer = useLibraryOrganizer(`${courseKey}:${filter}:${sort}`, allItems.map(item => item.id), items.map(item => item.id), ids => reorderLibrary(courseKey, ids));
  const selectedItems = allItems.filter(item => organizer.selectedIds.includes(item.id));
  const remakeIds = new Set(selectedItems.filter(item => item.type === 'reviewer' && item.sourceMaterialId).map(item => item.sourceMaterialId!));
  const allInCourse = remaining.length > 0 && remaining.every(item => organizer.selected.has(item.id));
  const confirmRemake = () => Alert.alert(allInCourse ? 'Remake all Reviewers?' : 'Remake selected Reviewers?',
    'Create fresh versions from ' + remakeIds.size + ' selected Reviewer ' + (remakeIds.size === 1 ? 'source' : 'sources') + '? Ready original materials will be queued; current versions stay available until replacements finish.'
    + (selectedItems.some(item => item.type === 'reviewer' && !item.sourceMaterialId) ? ' Reviewers without original course materials will be skipped.' : ''), [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remake', onPress: () => void batch.run(courseKey, remakeIds) },
    ]);
  const identity = courseKey ? libraryIdentity(courseKey, courseItems[0]?.course ?? null) : null;
  const label = librarySegments.find((segment) => segment.value === filter)!.label.toLowerCase();
  const unavailable = filter !== "all" && library.categories ? !available(library.categories[filter]) : false;
  return (
    <Page
      back
      title={identity?.title ?? "Library"}
      subtitle={organizer.editing ? `${selectedItems.length} selected` : identity?.subtitle ?? (items.length ? `${items.length} saved items` : undefined)}
      onRefresh={library.refresh}
      scrollRef={organizer.scrollRef}
      onScroll={organizer.onScroll}
      scrollEnabled={!organizer.dragging}
      refreshEnabled={!organizer.editing}
      headerLeading={identity ? <CourseMark identity={identity} size={34} /> : undefined}
      headerBelow={
        <View style={{ paddingHorizontal: spacing[5], paddingBottom: spacing[3] }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: spacing[3] }}>
            <View style={{ flex: 1, minWidth: 0 }}><SnapshotStatus {...library} inset={false} /></View>
            <LibrarySortControl value={sort} course={courseKey !== PERSONAL_LIBRARY_KEY} disabled={organizer.editing}
              onChange={value => { sortLibrary(courseKey, value); setVisible(LOCAL_PAGE_SIZE); }} />
          </View>
          <View style={{ height: 48, justifyContent: 'center' }}>
            {organizer.editing ? <LibrarySelectionToolbar
              allSelected={organizer.allSelected} allInCourse={allInCourse}
              canRemake={!batch.busy && !removal.busy && remakeIds.size > 0 && !offline}
              canRemove={selectedItems.length > 0 && !removal.busy && !batch.busy && !offline}
              dragging={!!organizer.dragging}
              onRemake={confirmRemake} onRemove={() => removal.confirm(selectedItems, allInCourse)}
              onToggleAll={organizer.toggleAll} onCancel={organizer.done}
            /> : <SegmentedControl segments={librarySegments} value={filter} onChange={(value) => { setFilter(value); setVisible(LOCAL_PAGE_SIZE); }} />}
          </View>
          {offlineCaption ? <Copy muted size="caption" style={{ marginTop: spacing[2] }}>{offlineCaption}</Copy> : null}
        </View>
      }
    >
      {offline ? <Notice>{OFFLINE_LIBRARY_NOTICE}</Notice> : null}
      {sort === "course" && sequence.loading && !sequence.data ? <Copy muted size="caption">Loading course order…</Copy> : null}
      {sort === "course" && sequence.error ? <Notice>{sequence.data ? "Using the saved course order. Connect to refresh it." : "Course order is not saved yet. Connect once to load it."}</Notice> : null}
      {!library.localReady ? <LibrarySkeleton /> : null}
      {unavailable ? <Notice>This category is temporarily unavailable.</Notice> : null}
      {batch.note ? <Notice>{batch.note}</Notice> : null}
      {removal.note ? <Notice>{removal.note}</Notice> : null}
      {remake.note ? <Notice>{remake.note}</Notice> : null}
      {library.localReady && courseKey && items.length === 0 ? (
        <Surface>
          <Copy size="h3">{filter === "all" ? "Nothing saved for this course" : `No ${label} yet`}</Copy>
          <Copy muted>Generate from this course&apos;s materials when you are ready.</Copy>
        </Surface>
      ) : null}
      <View ref={organizer.listRef} collapsable={false} style={{ gap: 14 }} {...organizer.panHandlers} onTouchStart={organizer.touchStart} onTouchEnd={organizer.touchEnd} onTouchCancel={organizer.touchCancel}>
      {items.slice(0, visible).map((item) => {
        const pinned = prefs.pinned.artifact.includes(item.id);
        const leading = pinAction(pinned, () => change(() => pin("artifact", item.id, !pinned)));
        // Remake uses the original source; completed replacements collapse to one Library card.
        const trailing: SwipeAction[] = item.type === "reviewer" && reviewerArtifactIdFromLibraryId(item.id)
          ? [
              { key: "remake", label: "Remake", icon: RotateCw, tone: "accent", onPress: () => remake.confirm(item) },
              { key: "delete", label: "Remove", icon: Trash2, tone: "danger", onPress: () => removal.confirm([item]) },
            ]
          : libraryRemovalPath(item)
            ? [{ key: "remove", label: "Remove", icon: Trash2, tone: "danger", onPress: () => removal.confirm([item]) }]
            : [];
        return (
          <Animated.View key={item.id} onLayout={event => organizer.layouts.current.set(item.id, event.nativeEvent.layout)} style={{
            zIndex: organizer.dragging === item.id ? 10 : 0,
            transform: [{ translateY: organizer.dragging === item.id ? organizer.translate : 0 }],
            opacity: organizer.dragging && organizer.selected.has(item.id) && organizer.dragging !== item.id ? 0.45 : 1,
          }}>
            {organizer.drop?.id === item.id ? <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, height: 3, borderRadius: 2, backgroundColor: colors.accent, ...(organizer.drop.after ? { bottom: -8 } : { top: -8 }) }} /> : null}
            <SwipeRow leading={organizer.editing ? [] : leading} trailing={organizer.editing ? [] : trailing}>
              <LibraryCard item={item} pinned={pinned} swipeActions={organizer.editing ? [] : [...leading, ...trailing]}
                organizing={organizer.editing} selected={organizer.selected.has(item.id)}
                onPress={() => organizer.tap(item.id, () => router.push({ pathname: '/artifact', params: { id: item.id } }))}
                onLongPress={() => organizer.hold(item.id)}
                organize={() => organizer.begin(item.id)} />
            </SwipeRow>
          </Animated.View>
        );
      })}
      </View>
      {items.length > visible ? <Action secondary onPress={() => setVisible((count) => count + LOCAL_PAGE_SIZE)}>More saved work</Action> : null}
      {items.length > 0 ? <Copy muted size="caption" style={{ textAlign: "center" }}>{items.length} {items.length === 1 ? "item" : "items"}</Copy> : null}
    </Page>
  );
}

function LibraryCard({ item, pinned = false, swipeActions, organizing, selected, onPress, onLongPress, organize }: {
  item: LibraryArtifactSummary & { readonly offlineReady?: boolean }; pinned?: boolean; swipeActions: readonly SwipeAction[];
  organizing: boolean; selected: boolean; onPress: () => void; onLongPress: () => void; organize: () => void;
}) {
  const { colors } = useTheme();
  const secondaryLine = reviewerSecondaryLine(automaticLibraryLabel(item), item.type === 'reviewer' ? item.reviewMinutes : null);
  const typeLabel = item.type === "activity_output" ? "Draft" : item.type === "quiz" ? "Quiz" : "Reviewer";
  const tone = item.type === "quiz" ? colors.violet : item.type === "activity_output" ? colors.green : colors.blue;
  const soft = item.type === "quiz" ? colors.violetSoft : item.type === "activity_output" ? colors.greenSoft : colors.blueSoft;
  return (
    <Surface style={{ overflow: "hidden", ...(selected ? { borderColor: colors.accent, borderWidth: 2 } : {}) }}>
      <RowLink
        inset
        icon={<ContentIcon kind={item.type} />}
        label={`${typeLabel}: ${item.title}${pinned ? ", pinned" : ""}${item.offlineReady ? ", Saved offline" : ""}`}
        {...swipeAccessibility(swipeActions)}
        accessibilityActions={[...swipeAccessibility(swipeActions).accessibilityActions, { name: 'organize', label: 'Organize saved items' }] as AccessibilityActionInfo[]}
        onAccessibilityAction={event => event.nativeEvent.actionName === 'organize' ? organize() : swipeAccessibility(swipeActions).onAccessibilityAction(event)}
        selected={organizing ? selected : undefined}
        trailing={organizing ? <View style={{ width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: selected ? colors.accent : colors.textMuted, backgroundColor: selected ? colors.accent : 'transparent', alignItems: 'center', justifyContent: 'center' }}>{selected ? <Check size={16} color={colors.onAccent} /> : null}</View> : pinned ? <Pin size={14} color={colors.textMuted} strokeWidth={1.8} style={{ transform: [{ rotate: "35deg" }] }} /> : undefined}
        onLongPress={onLongPress}
        onPress={onPress}>
        <View style={{ flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: spacing[2] }}>
          <View style={{ backgroundColor: soft, borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 3 }}><Copy size="caption" color={tone} style={{ fontWeight: "700" }}>{typeLabel}</Copy></View>
        </View>
        <Copy size="h3" style={{ lineHeight: 23 }}>{item.title}</Copy>
        {secondaryLine ? <Copy muted size="caption">{secondaryLine}</Copy> : null}
        {item.offlineReady ? <Copy muted size="caption">Saved offline</Copy> : null}
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
  const saveConfirmedDraft = (draft: ActivityDraft) => {
    if (detail && 'draft' in detail) result.storeConfirmed({
      artifact: { ...detail.artifact, title: draft.title, updatedAt: draft.updatedAt }, draft,
    });
  };
  const versions = useDraftVersions(detail && 'draft' in detail ? detail.draft : null, saveConfirmedDraft);
  if (detail && "reviewer" in detail) {
    return <ReviewerReaderScreen artifact={detail.artifact} reviewer={detail.reviewer} deviceCopy={result.deviceCopy} openQuizInitially={quiz === "1"} snapshotStatus={<SnapshotStatus {...result} error={result.refreshError ?? result.error} />} />;
  }
  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      enabled={!!detail && "draft" in detail}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
    <Page
      title={detail && "draft" in detail ? "Draft" : detail && "quiz" in detail ? "Quiz" : "Library"}
      back
      headerAction={detail && "draft" in detail ? <View style={{ gap: spacing[1] }}>
        {versions.copies.length ? <Action secondary onPress={versions.show}>Online versions ({versions.copies.length})</Action> : null}
        <Action secondary onPress={() => setExportOpen(true)}>Export</Action>
      </View> : undefined}
    >
      {result.deviceCopy && (
        <Notice>{detail && "draft" in detail ? "Showing the draft saved on this device. You can edit it here." : "Showing the copy saved on this device. Saving changes and practice need a connection."}</Notice>
      )}
      {result.offlineMissing ? (
        <Surface><Copy>{OFFLINE_MISSING_NOTICE}</Copy><Action secondary onPress={() => router.back()}>Back</Action></Surface>
      ) : null}
      {result.error && !result.offlineMissing && (
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
          {'draft' in detail ? <DraftVersionsNotice versions={versions} /> : null}
          {'draft' in detail ? <DraftVersionsSheet versions={versions} /> : null}
          {"draft" in detail && (
            <DraftEditor
              key={detail.draft.id}
              draft={detail.draft}
              deviceCopy={result.deviceCopy}
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
    </KeyboardAvoidingView>
  );
}
export function DraftEditor({ draft, onSaved, deviceCopy = false }: { draft: ActivityDraft; onSaved: (draft: ActivityDraft) => void; deviceCopy?: boolean }) {
  const navigation = useNavigation(), { colors } = useTheme();
  const editor = useOfflineDraftEditor(draft, onSaved, deviceCopy);
  const { content, dirty, busy, note, save } = editor;
  const setContent = (update: (old: ActivityDraftContent) => ActivityDraftContent) => editor.change(update(content));
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
  return (
    <View style={{ gap: 16 }}>
      <DraftInput
        accessibilityLabel="Draft title"
        minHeight={52}
        value={content.title}
        editable={!busy}
        style={[inputStyle, { fontSize: 26, lineHeight: 33, textAlignVertical: "top" }]}
        onChangeText={(title) => {
          setContent((old) => ({ ...old, title }));
        }}
      />
      <Copy muted size="caption">{editor.caption}</Copy>
      {content.sections.map((section, index) => (
        <View key={section.id} style={{ gap: 8 }}>
          <Copy size="h3">{section.heading}</Copy>
          <DraftInput
            accessibilityLabel={section.heading ?? `Section ${index + 1}`}
            multiline
            editable={!busy}
            value={section.content}
            style={inputStyle}
            onChangeText={(text) => {
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
          <DraftInput
            accessibilityLabel={`Slide ${slide.number}`}
            multiline
            editable={!busy}
            value={slide.body}
            style={inputStyle}
            onChangeText={(text) => {
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
      {editor.attention ? <View style={{ gap: spacing[2] }}><Notice>{DRAFT_ATTENTION_NOTICE}</Notice><Action secondary disabled={busy} onPress={() => void save(true)}>Try again</Action></View> : null}
      {note && <Notice>{note}</Notice>}
    </View>
  );
}
