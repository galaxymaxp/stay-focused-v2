import type {
  ActivityDraft,
  ActivityDraftContent,
  LibraryArtifactSummary,
  LibraryOverview,
  Quiz,
  QuizLearningState,
  ReviewerReaderModel,
} from "@stay-focused/shared";
import { useNavigation, usePreventRemove } from "@react-navigation/native";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, Platform, ScrollView, TextInput, View } from "react-native";

import {
  Action,
  Copy,
  Notice,
  Page,
  RowLink,
  Surface,
  ContentIcon,
  FilterChip,
} from "../../design/primitives";
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
const quizLearningLabels: Record<QuizLearningState, string> = {
  not_started: "Not started",
  in_progress: "In progress",
  completed: "Completed",
  abandoned: "Abandoned",
};
export function LibraryScreen() {
  const { colors } = useTheme();
  const [filter, setFilter] =
    useState<(typeof filters)[number]["value"]>("all");
  const library = useExperience<LibraryOverview>(
    `/api/experience/library?type=${filter}&limit=50`,
  );
  const client = useExperienceClient();
  const [extra, setExtra] = useState<LibraryArtifactSummary[]>([]),
    [next, setNext] = useState<number | null>(null),
    [error, setError] = useState<string | null>(null),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    setExtra([]);
    setNext(library.data?.nextOffset ?? null);
  }, [library.data]);
  async function more() {
    if (next === null || busy) return;
    setBusy(true);
    try {
      const page = await experienceRequest<LibraryOverview>(
        client,
        `/api/experience/library?type=${filter}&limit=50&offset=${next}`,
      );
      setExtra((old) => [...old, ...page.items]);
      setNext(page.nextOffset);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Could not load more saved work.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <Page
      title="Library"
      onRefresh={library.refresh}
      actions={[{ label: "Manage saved Reviewers", onPress: () => router.push("/saved-reviewers") }]}
    >
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ alignItems: "center", gap: 0 }} style={{ flexGrow: 0 }}>
        {filters.map((item) => (
          <FilterChip
            selected={filter === item.value}
            label={item.label}
            key={item.value}
            onPress={() => setFilter(item.value)}
          />
        ))}
      </ScrollView>
      {library.error && <Notice>{library.error}</Notice>}
      {error && <Notice>{error}</Notice>}
      {library.loading && <Notice>Loading your Library…</Notice>}
      {filter !== "all" &&
        library.data &&
        !available(library.data.categories[filter]) && (
          <Notice>This category is not available right now.</Notice>
        )}
      {library.data?.items.length === 0 && (
        <Surface>
          <Copy size="h2">Your next idea starts here</Copy>
          <Copy muted>
            No saved{" "}
            {filter === "all"
              ? "study tools"
              : filters
                  .find((item) => item.value === filter)
                  ?.label.toLowerCase()}{" "}
            yet.
          </Copy>
          <Action onPress={() => router.navigate("/courses")}>
            Browse materials
          </Action>
        </Surface>
      )}
      {[...(library.data?.items ?? []), ...extra].map((item) => (
        <Surface key={item.id}>
          <RowLink
            inset
            icon={<ContentIcon kind={item.type} />}
            label={`${item.type === "reviewer" ? "Read & study" : item.type === "quiz" ? "Practice" : "Resume draft"}: ${item.title}`}
            onPress={() =>
              router.push({ pathname: "/artifact", params: { id: item.id } })
            }
          >
            <Copy size="caption" color={item.type === "quiz" ? colors.violet : item.type === "activity_output" ? colors.green : colors.blue}>
              {item.course?.code ?? item.course?.name ?? "Your study tools"} ·{" "}
              {item.type === "activity_output"
                ? "Activity Output"
                : item.type === "quiz"
                  ? "Quiz"
                  : "Reviewer"}
            </Copy>
            <Copy size="h3">{item.title}</Copy>
            <Copy muted size="caption">
              Updated{" "}
              {new Date(item.updatedAt).toLocaleDateString([], {
                month: "short",
                day: "numeric",
              })}
            </Copy>
            {item.quiz && (
              <Copy muted size="caption">
                {quizLearningLabels[item.quiz.learningState]} ·{" "}
                {item.quiz.questionCount} questions
                {item.quiz.learningState === "in_progress"
                  ? ` · ${item.quiz.answeredCount} of ${item.quiz.questionCount} answered`
                  : ""}
                {item.quiz.completedAttemptCount > 0
                  ? ` · ${item.quiz.completedAttemptCount} completed attempts`
                  : ""}
                {item.quiz.bestScore !== null
                  ? ` · Best ${item.quiz.bestScore}%`
                  : ""}
              </Copy>
            )}
          </RowLink>
        </Surface>
      ))}
      {next !== null && (
        <Action secondary disabled={busy} onPress={() => void more()}>
          More saved work
        </Action>
      )}
    </Page>
  );
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
          <Copy muted>
            {result.data.artifact.course?.name ?? "Your study tools"}
          </Copy>
          <Copy size="h1">{result.data.artifact.title}</Copy>
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
  return (
    <>
      {reviewer.freshness === "changed" && (
        <Notice>The source has changed since this Reviewer was created.</Notice>
      )}
      {reviewer.sections.map((section) => (
        <View key={section.id} style={{ gap: 16 }}>
          <Copy size="h2">{section.title}</Copy>
          {section.blocks.map((block) => (
            <Surface key={block.id}>
              <Copy size="h3">{block.title}</Copy>
              <Copy>{block.explanation}</Copy>
              {block.keyPoints.map((point, index) => (
                <Copy key={index}>• {point}</Copy>
              ))}
              {block.evidence.map((evidence, index) => (
                <Copy key={index} muted>
                  {evidence.text}
                </Copy>
              ))}
            </Surface>
          ))}
        </View>
      ))}
    </>
  );
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
