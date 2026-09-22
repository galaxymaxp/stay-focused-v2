import type {
  ActivityDraft,
  ActivityDraftContent,
  LibraryArtifactDetail,
  LibraryArtifactSummary,
  ReviewerReaderModel,
} from "@stay-focused/shared";
import { useNavigation, usePreventRemove } from "@react-navigation/native";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Alert, Animated, Platform, Pressable, ScrollView, TextInput, View, useWindowDimensions } from "react-native";

import {
  Action,
  Copy,
  Notice,
  Page,
  RowLink,
  Surface,
  ContentIcon,
} from "../../design/primitives";
import { radius, spacing } from "../../design/tokens";
import { useTheme } from "../../design/theme";
import { experienceRequest } from "../../services/experienceApi";
import { available } from "./presentation";
import { useExperienceClient } from "./useExperience";
import { useLocalArtifact, useLocalLibrary } from "./useLocalLibrary";

const LOCAL_PAGE_SIZE = 50;
const filters = [
  { value: "all", label: "All" },
  { value: "reviewer", label: "Reviewers" },
  { value: "quiz", label: "Quizzes" },
  { value: "activity_output", label: "Activity Outputs" },
] as const;
export function LibraryScreen() {
  const { colors } = useTheme();
  const { width: windowWidth } = useWindowDimensions();
  const pageWidth = Math.max(280, windowWidth - 40);
  const [filter, setFilter] = useState<(typeof filters)[number]["value"]>("all");
  const library = useLocalLibrary();
  const pager = useRef<ScrollView>(null);
  const tabs = useRef<ScrollView>(null);
  const scrollX = useRef(new Animated.Value(0)).current;
  const [visible, setVisible] = useState(LOCAL_PAGE_SIZE);

  useEffect(() => {
    const index = filters.findIndex((item) => item.value === filter);
    tabs.current?.scrollTo({ x: Math.max(0, index * 78 - 50), animated: true });
  }, [filter]);

  // Saved work renders from the device; the skeleton appears only when nothing
  // is stored yet and the cloud is still answering.
  const hasLocal = library.items.length > 0;
  const loading = !library.localReady || (!hasLocal && library.refreshing);
  const itemsFor = (value: (typeof filters)[number]["value"]) =>
    value === "all" ? library.items : library.items.filter((entry) => entry.type === value);
  const selectPage = (index: number) => {
    pager.current?.scrollTo({ x: index * pageWidth, animated: true });
    setFilter(filters[index]!.value);
  };
  return (
    <Page title="Library" subtitle="Your saved study tools, in one place." scroll={false} onRefresh={library.refresh} actions={[{ label: "Manage saved Reviewers", onPress: () => router.push("/saved-reviewers") }]}>
      <View style={{ flex: 1 }}>
        <ScrollView ref={tabs} horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={{ padding: 4 }}>
          <View style={{ width: 378, height: 44, flexDirection: "row", alignItems: "center" }}>
            <Animated.View style={{ position: "absolute", left: 0, height: 34, borderRadius: radius.pill, backgroundColor: colors.blueSoft, transform: [{ translateX: scrollX.interpolate({ inputRange: filters.map((_, index) => index * pageWidth), outputRange: [0, 56, 150, 226], extrapolate: "clamp" }) }], width: scrollX.interpolate({ inputRange: filters.map((_, index) => index * pageWidth), outputRange: [50, 88, 70, 144], extrapolate: "clamp" }) }} />
            {filters.map((item, index) => {
              const widths = [56, 94, 76, 152];
              return (
                <Pressable key={item.value} accessibilityRole="tab" accessibilityState={{ selected: filter === item.value }} onPress={() => selectPage(index)} style={({ pressed }) => ({ width: widths[index], height: 44, alignItems: "center", justifyContent: "center", opacity: pressed ? 0.65 : 1 })}>
                  <Copy size="caption" color={filter === item.value ? colors.blue : colors.textSecondary} style={{ fontWeight: filter === item.value ? "700" : "500" }}>{item.label}</Copy>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>
        <Animated.ScrollView
          ref={pager}
          horizontal
          pagingEnabled
          directionalLockEnabled
          nestedScrollEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], { useNativeDriver: false })}
          scrollEventThrottle={16}
          onMomentumScrollEnd={(event) => {
            const index = Math.round(event.nativeEvent.contentOffset.x / pageWidth);
            setFilter(filters[index]?.value ?? "all");
          }}
        >
          {filters.map((item) => (
            <LibraryPage
              key={item.value}
              width={pageWidth}
              filter={item.value}
              items={itemsFor(item.value).slice(0, visible)}
              total={itemsFor(item.value).length}
              loading={loading}
              error={hasLocal ? null : library.error}
              deviceCopy={hasLocal && !!library.error}
              refreshing={hasLocal && library.refreshing}
              unavailable={item.value !== "all" && library.categories ? !available(library.categories[item.value]) : false}
              onLoadMore={() => setVisible((count) => count + LOCAL_PAGE_SIZE)}
              onRetry={library.refresh}
            />
          ))}
        </Animated.ScrollView>
      </View>
    </Page>
  );
}

function LibraryPage({ width, filter, items, total, loading, error, deviceCopy, refreshing, unavailable, onLoadMore, onRetry }: {
  width: number;
  filter: (typeof filters)[number]["value"];
  items: readonly LibraryArtifactSummary[];
  total: number;
  loading: boolean;
  error: string | null;
  deviceCopy: boolean;
  refreshing: boolean;
  unavailable: boolean;
  onLoadMore: () => void;
  onRetry: () => void;
}) {
  const label = filter === "all" ? "study tools" : filters.find((item) => item.value === filter)!.label.toLowerCase();
  return (
    <ScrollView nestedScrollEnabled style={{ width }} contentContainerStyle={{ gap: spacing[3], paddingTop: spacing[3], paddingBottom: 36 }}>
      {loading ? <LibrarySkeleton /> : null}
      {error ? <Surface><Copy size="h3">Library could not be loaded</Copy><Copy muted>{error}</Copy><Action secondary onPress={onRetry}>Try again</Action></Surface> : null}
      {deviceCopy ? <Notice>Showing work saved on this device. Refresh when you are back online.</Notice> : null}
      {refreshing ? <Copy muted size="caption">Checking for updates…</Copy> : null}
      {unavailable ? <Notice>This category is temporarily unavailable.</Notice> : null}
      {!loading && !error && items.length === 0 ? (
        <Surface>
          <Copy size="h2">Nothing saved here yet</Copy>
          <Copy muted>No {label} yet. Generate from a synchronized course when you are ready.</Copy>
          <Action onPress={() => router.navigate("/courses")}>Browse synced courses</Action>
        </Surface>
      ) : null}
      {items.map((item) => <LibraryCard key={item.id} item={item} />)}
      {items.length < total ? <Action secondary onPress={onLoadMore}>More saved work</Action> : null}
      {total > 0 ? <Copy muted size="caption" style={{ textAlign: "center" }}>{total} {total === 1 ? "item" : "items"}</Copy> : null}
    </ScrollView>
  );
}

function LibraryCard({ item }: { item: LibraryArtifactSummary }) {
  const { colors } = useTheme();
  const typeLabel = item.type === "activity_output" ? "Activity output" : item.type === "quiz" ? "Quiz" : "Reviewer";
  const tone = item.type === "quiz" ? colors.violet : item.type === "activity_output" ? colors.green : colors.blue;
  const soft = item.type === "quiz" ? colors.violetSoft : item.type === "activity_output" ? colors.greenSoft : colors.blueSoft;
  return (
    <Surface style={{ padding: 0, overflow: "hidden" }}>
      <RowLink inset icon={<ContentIcon kind={item.type} />} label={`${typeLabel}: ${item.title}`} onPress={() => router.push({ pathname: "/artifact", params: { id: item.id } })}>
        <View style={{ flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: spacing[2] }}>
          <View style={{ backgroundColor: soft, borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 3 }}><Copy size="caption" color={tone} style={{ fontWeight: "700" }}>{typeLabel}</Copy></View>
          <Copy muted size="caption">{item.course?.code ?? item.course?.name ?? "Personal"}</Copy>
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
          {"reviewer" in detail && (
            <ReviewerContent reviewer={detail.reviewer} />
          )}
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
function ReviewerContent({ reviewer }: { reviewer: ReviewerReaderModel }) {
  const { colors } = useTheme();
  return (
    <View style={{ gap: spacing[8], paddingTop: spacing[3] }}>
      {reviewer.freshness === "changed" ? <Notice>The source has changed since this Reviewer was created.</Notice> : null}
      {reviewer.sections.map((section, sectionIndex) => (
        <View key={section.id} style={{ gap: spacing[4] }}>
          <View style={{ gap: spacing[1], borderBottomWidth: 1, borderColor: colors.separator, paddingBottom: spacing[3] }}>
            <Copy size="caption" color={colors.accent} style={{ fontWeight: "800", letterSpacing: 1.1 }}>TOPIC {sectionIndex + 1}</Copy>
            <Copy size="h2" style={{ fontSize: 22, lineHeight: 29 }}>{section.title}</Copy>
          </View>
          {section.blocks.map((block, blockIndex) => {
            const duplicateTitle = normalizedHeading(block.title) === normalizedHeading(section.title);
            return (
              <View key={block.id} style={{ gap: spacing[3], paddingBottom: spacing[5], borderBottomWidth: blockIndex === section.blocks.length - 1 ? 0 : 1, borderColor: colors.separator }}>
                {!duplicateTitle ? <Copy size="h3" style={{ fontSize: 18, lineHeight: 25 }}>{block.title}</Copy> : null}
                <Copy style={{ fontSize: 16, lineHeight: 26 }}>{block.explanation}</Copy>
                {block.keyPoints.length > 0 ? (
                  <View style={{ backgroundColor: colors.surfaceSecondary, borderRadius: radius.control, padding: spacing[4], gap: spacing[2] }}>
                    <Copy size="caption" color={colors.accent} style={{ fontWeight: "800", letterSpacing: 0.9 }}>KEY POINTS</Copy>
                    {block.keyPoints.map((point, index) => (
                      <View key={`${block.id}-point-${index}`} style={{ flexDirection: "row", alignItems: "flex-start", gap: spacing[2] }}>
                        <View style={{ width: 5, height: 5, borderRadius: 3, marginTop: 8, backgroundColor: colors.accent }} />
                        <Copy style={{ flex: 1, lineHeight: 24 }}>{point}</Copy>
                      </View>
                    ))}
                  </View>
                ) : null}
                {block.evidence.length > 0 ? (
                  <View style={{ borderLeftWidth: 2, borderColor: colors.separator, paddingLeft: spacing[3], gap: spacing[3] }}>
                    <Copy size="caption" muted style={{ fontWeight: "700", letterSpacing: 0.7 }}>DETAILS & EXAMPLES</Copy>
                    {block.evidence.map((evidence, index) => (
                      <View key={`${block.id}-evidence-${index}`} style={{ gap: spacing[1] }}>
                        <Copy size="caption" color={colors.textMuted} style={{ textTransform: "uppercase", fontWeight: "700" }}>{evidence.kind}</Copy>
                        <Copy muted style={{ lineHeight: 24 }}>{evidence.text}</Copy>
                      </View>
                    ))}
                  </View>
                ) : null}
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );
}

function normalizedHeading(value: string): string {
  return value.trim().toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
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
