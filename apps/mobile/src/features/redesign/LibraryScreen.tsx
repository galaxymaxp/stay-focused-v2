import type {
  ActivityDraft,
  ActivityDraftContent,
  LibraryArtifactSummary,
  LibraryOverview,
  Quiz,
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
import { useExperience, useExperienceClient } from "./useExperience";

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
  const library = useExperience<LibraryOverview>("/api/experience/library?limit=50");
  const client = useExperienceClient();
  const pager = useRef<ScrollView>(null);
  const tabs = useRef<ScrollView>(null);
  const scrollX = useRef(new Animated.Value(0)).current;
  const [extra, setExtra] = useState<LibraryArtifactSummary[]>([]);
  const [next, setNext] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setExtra([]);
    setNext(library.data?.nextOffset ?? null);
  }, [library.data]);
  useEffect(() => {
    const index = filters.findIndex((item) => item.value === filter);
    tabs.current?.scrollTo({ x: Math.max(0, index * 78 - 50), animated: true });
  }, [filter]);

  async function more() {
    if (next === null || busy) return;
    setBusy(true);
    setError(null);
    try {
      const page = await experienceRequest<LibraryOverview>(client, `/api/experience/library?limit=50&offset=${next}`);
      setExtra((old) => [...old, ...page.items]);
      setNext(page.nextOffset);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not load more saved work.");
    } finally {
      setBusy(false);
    }
  }

  const items = [...(library.data?.items ?? []), ...extra];
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
              items={item.value === "all" ? items : items.filter((entry) => entry.type === item.value)}
              loading={library.loading}
              error={library.error ?? error}
              unavailable={item.value !== "all" && library.data ? !available(library.data.categories[item.value]) : false}
              canLoadMore={next !== null}
              busy={busy}
              onLoadMore={() => void more()}
              onRetry={library.refresh}
            />
          ))}
        </Animated.ScrollView>
      </View>
    </Page>
  );
}

function LibraryPage({ width, filter, items, loading, error, unavailable, canLoadMore, busy, onLoadMore, onRetry }: {
  width: number;
  filter: (typeof filters)[number]["value"];
  items: readonly LibraryArtifactSummary[];
  loading: boolean;
  error: string | null;
  unavailable: boolean;
  canLoadMore: boolean;
  busy: boolean;
  onLoadMore: () => void;
  onRetry: () => void;
}) {
  const label = filter === "all" ? "study tools" : filters.find((item) => item.value === filter)!.label.toLowerCase();
  return (
    <ScrollView nestedScrollEnabled style={{ width }} contentContainerStyle={{ gap: spacing[3], paddingTop: spacing[3], paddingBottom: 36 }}>
      {loading ? <LibrarySkeleton /> : null}
      {error ? <Surface><Copy size="h3">Library could not be loaded</Copy><Copy muted>{error}</Copy><Action secondary onPress={onRetry}>Try again</Action></Surface> : null}
      {unavailable ? <Notice>This category is temporarily unavailable.</Notice> : null}
      {!loading && !error && items.length === 0 ? (
        <Surface>
          <Copy size="h2">Nothing saved here yet</Copy>
          <Copy muted>No {label} yet. Generate from a synchronized course when you are ready.</Copy>
          <Action onPress={() => router.navigate("/courses")}>Browse synced courses</Action>
        </Surface>
      ) : null}
      {items.map((item) => <LibraryCard key={item.id} item={item} />)}
      {canLoadMore ? <Action secondary disabled={busy} onPress={onLoadMore}>More saved work</Action> : null}
      {items.length > 0 ? <Copy muted size="caption" style={{ textAlign: "center" }}>{items.length} {items.length === 1 ? "item" : "items"}</Copy> : null}
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

type ArtifactDetail = {
  artifact: LibraryArtifactSummary;
  reviewer?: ReviewerReaderModel;
  quiz?: Quiz;
  draft?: ActivityDraft;
};
export function ArtifactScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const result = useExperience<ArtifactDetail>(
    id ? `/api/experience/library/${encodeURIComponent(id)}` : null,
  );
  return (
    <Page title="Library" back>
      {result.error && (
        <>
          <Notice>{result.error}</Notice>
          <Action secondary onPress={result.refresh}>
            Try again
          </Action>
        </>
      )}
      {result.loading && <Notice>Opening saved work…</Notice>}
      {result.data && (
        <>
          <Copy muted size="caption">
            {result.data.artifact.course?.name ?? "Your study tools"}
            {result.data.artifact.sourceTitle ? ` · ${result.data.artifact.sourceTitle}` : ""}
          </Copy>
          <Copy size="h1">{result.data.artifact.title}</Copy>
          <Copy muted size="caption">
            Generated {new Date(result.data.artifact.createdAt).toLocaleDateString([], { month: "long", day: "numeric", year: "numeric" })}
          </Copy>
          {result.data.reviewer && (
            <ReviewerContent reviewer={result.data.reviewer} />
          )}
          {result.data.quiz && (
            <Surface>
              <Copy>
                {result.data.quiz.questionCount} questions ·{" "}
                {result.data.quiz.difficulty} difficulty
              </Copy>
              <Action
                onPress={() =>
                  router.push({
                    pathname: "/quiz",
                    params: { id: result.data!.quiz!.id },
                  })
                }
              >
                Practice quiz
              </Action>
            </Surface>
          )}
          {result.data.draft && (
            <DraftEditor
              key={`${result.data.draft.id}-${result.data.draft.revision}`}
              draft={result.data.draft}
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
function DraftEditor({ draft }: { draft: ActivityDraft }) {
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
