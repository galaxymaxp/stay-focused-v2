import type {
  ActivityDraft,
  ActivityDraftContent,
  LibraryArtifactDetail,
  LibraryArtifactSummary,
} from "@stay-focused/shared";
import { useNavigation, usePreventRemove } from "@react-navigation/native";
import { router, useLocalSearchParams } from "expo-router";
import { Pin, PinOff } from "lucide-react-native";
import { useMemo, useState } from "react";
import { Alert, Platform, TextInput, View, useWindowDimensions } from "react-native";

import {
  Action,
  Copy,
  Notice,
  Page,
  RowLink,
  SegmentedControl,
  Surface,
  ContentIcon,
} from "../../design/primitives";
import { courseIdentity } from "../../design/courseIdentity";
import { CourseMark, CourseTile } from "../../design/CourseViews";
import { SwipeRow, animateNextLayout, swipeAccessibility, type SwipeAction } from "../../design/SwipeRow";
import { radius, spacing } from "../../design/tokens";
import { useTheme } from "../../design/theme";
import { experienceRequest } from "../../services/experienceApi";
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
    <Page title="Library" subtitle="Your saved study tools, by course." onRefresh={library.refresh} actions={[{ label: "Manage saved Reviewers", onPress: () => router.push("/saved-reviewers") }]}>
      {loading ? <LibrarySkeleton /> : null}
      {!hasLocal && library.error ? <Surface><Copy size="h3">Library could not be loaded</Copy><Copy muted>{library.error}</Copy><Action secondary onPress={library.refresh}>Try again</Action></Surface> : null}
      {hasLocal && library.error ? <Notice>Showing work saved on this device. Refresh when you are back online.</Notice> : null}
      {hasLocal && library.refreshing ? <Copy muted size="caption">Checking for updates…</Copy> : null}
      {!loading && !library.error && groups.length === 0 ? (
        <Surface>
          <Copy size="h2">No generated study materials yet</Copy>
          <Copy muted>Reviewers, quizzes and activity drafts you generate will be kept here, grouped by course.</Copy>
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
  const courseKey = (Array.isArray(rawKey) ? rawKey[0] : rawKey) ?? PERSONAL_LIBRARY_KEY;
  const library = useLocalLibrary();
  const [filter, setFilter] = useState<LibraryFilter>("all");
  const [visible, setVisible] = useState(LOCAL_PAGE_SIZE);
  const courseItems = useMemo(() => filterCourseLibrary(library.items, courseKey, "all"), [courseKey, library.items]);
  const filtered = useMemo(() => filterCourseLibrary(library.items, courseKey, filter), [courseKey, filter, library.items]);
  const { prefs, pin } = useListPreferences();
  const { reducedMotion } = useTheme();
  const arranged = arrangeList(filtered, (item) => item.id, prefs.pinned.artifact, []);
  const items = [...arranged.pinned, ...arranged.rest];
  const change = (update: () => void) => {
    animateNextLayout(reducedMotion);
    update();
  };
  const identity = libraryIdentity(courseKey, courseItems[0]?.course ?? null);
  const label = librarySegments.find((segment) => segment.value === filter)!.label.toLowerCase();
  const unavailable = filter !== "all" && library.categories ? !available(library.categories[filter]) : false;
  return (
    <Page
      back
      title={identity.title}
      subtitle={identity.subtitle ?? undefined}
      onRefresh={library.refresh}
      headerLeading={<CourseMark identity={identity} size={34} />}
      headerBelow={
        <View style={{ paddingHorizontal: spacing[5], paddingBottom: spacing[3] }}>
          <SegmentedControl segments={librarySegments} value={filter} onChange={(value) => { setFilter(value); setVisible(LOCAL_PAGE_SIZE); }} />
        </View>
      }
    >
      {!library.localReady ? <LibrarySkeleton /> : null}
      {unavailable ? <Notice>This category is temporarily unavailable.</Notice> : null}
      {library.localReady && items.length === 0 ? (
        <Surface>
          <Copy size="h3">{filter === "all" ? "Nothing saved for this course" : `No ${label} yet`}</Copy>
          <Copy muted>Generate from this course&apos;s materials when you are ready.</Copy>
        </Surface>
      ) : null}
      {items.slice(0, visible).map((item) => {
        const pinned = prefs.pinned.artifact.includes(item.id);
        const leading = pinAction(pinned, () => change(() => pin("artifact", item.id, !pinned)));
        return (
          <SwipeRow key={item.id} leading={leading}>
            <LibraryCard item={item} pinned={pinned} swipeActions={leading} />
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
  const typeLabel = item.type === "activity_output" ? "Activity output" : item.type === "quiz" ? "Quiz" : "Reviewer";
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
        <Copy muted size="caption">
          Updated {new Date(item.updatedAt).toLocaleDateString([], { month: "short", day: "numeric" })}
          {item.quiz ? ` · ${item.quiz.questionCount} questions${item.quiz.bestScore !== null ? ` · Best ${item.quiz.bestScore}%` : ""}` : ""}
        </Copy>
      </RowLink>
    </Surface>
  );
}

function LibrarySkeleton() {
  const { colors } = useTheme();
  return <View accessibilityLabel="Loading Library" style={{ gap: spacing[3] }}>{[0, 1, 2].map((index) => <Surface key={index} style={{ minHeight: 104, justifyContent: "center", gap: spacing[2] }}><View style={{ width: "28%", height: 10, borderRadius: 5, backgroundColor: colors.surfaceSecondary }} /><View style={{ width: index === 1 ? "88%" : "68%", height: 18, borderRadius: 8, backgroundColor: colors.surfaceSecondary }} /><View style={{ width: "44%", height: 10, borderRadius: 5, backgroundColor: colors.surfaceSecondary }} /></Surface>)}</View>;
}

export function ArtifactScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const result = useLocalArtifact(id ?? null);
  const detail = result.data;
  if (detail && "reviewer" in detail) {
    return <ReviewerReaderScreen artifact={detail.artifact} reviewer={detail.reviewer} deviceCopy={result.deviceCopy} />;
  }
  return (
    <Page title="Library" back>
      {result.deviceCopy && (
        <Notice>Showing the copy saved on this device. Saving changes and practice need a connection.</Notice>
      )}
      {result.error && (
        <>
          <Notice>{result.error}</Notice>
          <Action secondary onPress={result.refresh}>
            Try again
          </Action>
        </>
      )}
      {result.loading && !detail && <Notice>Opening saved work…</Notice>}
      {detail && (
        <>
          <Copy muted size="caption">
            {detail.artifact.course?.name ?? "Your study tools"}
            {detail.artifact.sourceTitle ? ` · ${detail.artifact.sourceTitle}` : ""}
          </Copy>
          <Copy size="h1">{detail.artifact.title}</Copy>
          <Copy muted size="caption">
            Generated {new Date(detail.artifact.createdAt).toLocaleDateString([], { month: "long", day: "numeric", year: "numeric" })}
          </Copy>
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
  return (
    <View style={{ gap: 16 }}>
      <Copy muted>{dirty ? "Unsaved changes" : "Saved draft"}</Copy>
      <TextInput
        accessibilityLabel="Draft title"
        value={content.title}
        editable={!busy}
        style={inputStyle}
        onChangeText={(title) => {
          setDirty(true);
          setContent((old) => ({ ...old, title }));
        }}
      />
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
