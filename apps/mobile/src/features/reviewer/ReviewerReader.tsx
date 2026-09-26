import type { LibraryArtifactSummary, QuizDifficulty, ReviewerReaderModel } from "@stay-focused/shared";
import { router } from "expo-router";
import { ChevronDown, ChevronUp, FileQuestion } from "lucide-react-native";
import {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  Animated,
  Pressable,
  ScrollView as NativeScrollView,
  Text,
  Vibration,
  View,
  useWindowDimensions,
  type GestureResponderEvent,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type ScrollView,
} from "react-native";

import { useAuth } from "../../auth";
import { courseIdentity } from "../../design/courseIdentity";
import { Action, Copy, Notice, Page, SearchField, SegmentedControl, Sheet, Surface } from "../../design/primitives";
import { useTheme } from "../../design/theme";
import { hitTarget, radius, spacing } from "../../design/tokens";
import {
  anchorIndexForFraction,
  currentAnchorIndex,
  findReviewerMatches,
  highlightRuns,
  isDuplicateBlockTitle,
  MIN_QUERY_LENGTH,
  proportionalOffset,
  reviewerAnchors,
  reviewerSegments,
  segmentIds,
  type ReviewerMatch,
} from "./reviewerNavigation";
import { createGenerationIntent } from "../../services/generationRecovery";
import { QUIZ_DIFFICULTIES, QUIZ_QUESTION_COUNTS, quizIntentInput, reviewerArtifactIdFromLibraryId } from "../redesign/quizRequest";

type Measurable = View | Text;
/** Keeps a found line below the header/search bar with readable context above it. */
const JUMP_CONTEXT = 72;
const SCRUB_STRIP_WIDTH = 32;
/** Invisible grab area around the fast-scroll thumb. */
const THUMB_TOUCH_WIDTH = 44;
const THUMB_TOUCH_HEIGHT = 76;
const SCRUB_HOLD_MS = 160;
const SCRUB_SLOP = 8;

/**
 * The Reviewer reader. Search sits at the top and finds any rendered text,
 * listing the topics that match so a tap jumps straight there. A fast-scroll
 * thumb appears on the right while scrolling: drag it (or touch and hold the
 * right edge) to move through topics with a floating label. Both only read the
 * persisted Reviewer on the device. A saved Reviewer can lead into a Quiz.
 */
export function ReviewerReaderScreen({
  artifact,
  reviewer,
  deviceCopy,
}: {
  artifact: LibraryArtifactSummary;
  reviewer: ReviewerReaderModel;
  deviceCopy: boolean;
}) {
  const { colors, reducedMotion } = useTheme();
  const scrollRef = useRef<ScrollView>(null);
  const rootRef = useRef<View>(null);
  const rootY = useRef(0);
  const segmentRefs = useRef(new Map<string, Measurable>());
  const sectionY = useRef<number[]>([]);
  const blockY = useRef(new Map<string, number>());
  const metrics = useRef({ y: 0, content: 0, viewport: 0 });
  const [scrollEnabled, setScrollEnabled] = useState(true);
  const [current, setCurrent] = useState(-1);
  const scrubber = useRef<ScrubberHandle>({ reveal: () => {}, touch: null });

  const segments = useMemo(() => reviewerSegments(reviewer), [reviewer]);
  const anchors = useMemo(() => reviewerAnchors(reviewer), [reviewer]);

  const [query, setQuery] = useState("");
  const [quizOpen, setQuizOpen] = useState(false);
  const deferredQuery = useDeferredValue(query);
  const matches = useMemo(() => findReviewerMatches(segments, deferredQuery), [deferredQuery, segments]);
  const [activeMatch, setActiveMatch] = useState(0);
  const bySegment = useMemo(() => {
    const map = new Map<string, { first: number; items: ReviewerMatch[] }>();
    matches.forEach((match, index) => {
      const entry = map.get(match.segmentId) ?? { first: index, items: [] };
      entry.items.push(match);
      map.set(match.segmentId, entry);
    });
    return map;
  }, [matches]);

  const anchorOffset = useCallback(
    (index: number) => {
      const anchor = anchors[index];
      if (!anchor) return 0;
      const section = sectionY.current[anchor.sectionIndex] ?? 0;
      const within = anchor.id === reviewer.sections[anchor.sectionIndex]?.id ? 0 : blockY.current.get(anchor.id) ?? 0;
      return rootY.current + section + within;
    },
    [anchors, reviewer.sections],
  );

  const scrollTo = useCallback(
    (y: number, animated: boolean) => {
      scrollRef.current?.scrollTo({ y: Math.max(0, y), animated: animated && !reducedMotion });
    },
    [reducedMotion],
  );

  const jumpToSegment = useCallback(
    (segmentId: string) => {
      const target = segmentRefs.current.get(segmentId);
      const root = rootRef.current;
      if (!target || !root) return;
      target.measureLayout(
        root,
        (_x, y) => scrollTo(rootY.current + y - JUMP_CONTEXT, true),
        () => undefined,
      );
    },
    [scrollTo],
  );

  // A new query selects its first match; moving between matches jumps to it.
  useEffect(() => setActiveMatch(0), [deferredQuery]);
  useEffect(() => {
    const match = matches[activeMatch];
    if (match) jumpToSegment(match.segmentId);
  }, [activeMatch, jumpToSegment, matches]);

  const onScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    metrics.current = { y: contentOffset.y, content: contentSize.height, viewport: layoutMeasurement.height };
    const offsets = anchors.map((_, index) => anchorOffset(index));
    const next = currentAnchorIndex(offsets, contentOffset.y);
    setCurrent((value) => (value === next ? value : next));
    scrubber.current.reveal(contentOffset.y, contentSize.height, layoutMeasurement.height);
  };

  const register = (id: string) => (node: Measurable | null) => {
    if (node) segmentRefs.current.set(id, node);
    else segmentRefs.current.delete(id);
  };
  const render = (id: string, text: string) => {
    const entry = bySegment.get(id);
    if (!entry) return text;
    const active = matches[activeMatch]?.segmentId === id ? activeMatch - entry.first : null;
    return highlightRuns(text, entry.items, active).map((run, index) =>
      run.kind === "plain" ? (
        run.text
      ) : (
        <Text key={index} style={{ backgroundColor: run.kind === "active" ? colors.findActive : colors.findMatch, color: colors.textPrimary }}>
          {run.text}
        </Text>
      ),
    );
  };

  const currentTitle = current >= 0 ? anchors[current]?.title : null;
  const courseTitle = artifact.course ? courseIdentity(artifact.course).title : null;
  const subtitle = currentTitle
    ? `${current + 1} of ${anchors.length} · ${currentTitle}`
    : courseTitle ?? "Reviewer";

  return (
    <Page
      back
      title="Reviewer"
      subtitle={subtitle}
      scrollRef={scrollRef}
      onScroll={onScroll}
      scrollEnabled={scrollEnabled}
      scrollTouch={{
        onTouchStart: (event) => scrubber.current.touch?.onTouchStart(event),
        onTouchMove: (event) => scrubber.current.touch?.onTouchMove(event),
        onTouchEnd: () => scrubber.current.touch?.onTouchEnd(),
        onTouchCancel: () => scrubber.current.touch?.onTouchCancel(),
      }}
      headerBelow={
        <ReviewerSearchBar
          query={query}
          onChangeQuery={setQuery}
          matches={matches}
          topicTitle={(index) => reviewer.sections[index]?.title ?? `Topic ${index + 1}`}
          active={activeMatch}
          onSelect={setActiveMatch}
          onPrevious={() => setActiveMatch((index) => (matches.length ? (index - 1 + matches.length) % matches.length : 0))}
          onNext={() => setActiveMatch((index) => (matches.length ? (index + 1) % matches.length : 0))}
        />
      }
      overlay={
        <SectionScrubber
          handle={scrubber}
          anchors={anchors.map((anchor) => anchor.title)}
          anchorOffset={anchorOffset}
          metrics={metrics}
          onScrub={(y) => scrollTo(y, false)}
          onSettle={(y) => scrollTo(y, true)}
          onActiveChange={(active) => setScrollEnabled(!active)}
        />
      }
    >
      {deviceCopy ? <Notice>Showing the copy saved on this device. Saving changes and practice need a connection.</Notice> : null}
      <View style={{ gap: spacing[1], paddingRight: spacing[2] }}>
        <Copy muted size="caption">
          {courseTitle ?? "Your study tools"}
          {artifact.sourceTitle ? ` · ${artifact.sourceTitle}` : ""}
        </Copy>
        <Copy size="h1" style={{ fontSize: 26, lineHeight: 33 }}>{artifact.title}</Copy>
        <Copy muted size="caption">
          Generated {new Date(artifact.createdAt).toLocaleDateString([], { month: "long", day: "numeric", year: "numeric" })}
          {anchors.length > 1 ? ` · ${anchors.length} topics` : ""}
        </Copy>
        <View style={{ flexDirection: "row", paddingTop: spacing[2] }}>
          <QuizPill onPress={() => setQuizOpen(true)} />
        </View>
      </View>
      <View
        ref={rootRef}
        collapsable={false}
        onLayout={(event: LayoutChangeEvent) => {
          rootY.current = event.nativeEvent.layout.y;
        }}
        style={{ gap: spacing[8], paddingTop: spacing[3], paddingRight: spacing[3] }}
      >
        {reviewer.freshness === "changed" ? <Notice>The source has changed since this Reviewer was created.</Notice> : null}
        {reviewer.sections.map((section, sectionIndex) => (
          <View
            key={section.id}
            collapsable={false}
            onLayout={(event) => {
              sectionY.current[sectionIndex] = event.nativeEvent.layout.y;
            }}
            style={{ gap: spacing[4] }}
          >
            <View style={{ gap: spacing[1], borderBottomWidth: 1, borderColor: colors.separator, paddingBottom: spacing[3] }}>
              <Copy size="caption" color={colors.accent} style={{ fontWeight: "800", letterSpacing: 1.1 }}>TOPIC {sectionIndex + 1}</Copy>
              <Text ref={register(segmentIds.sectionTitle(section.id))} style={{ color: colors.textPrimary, fontSize: 22, lineHeight: 29, fontWeight: "600" }}>
                {render(segmentIds.sectionTitle(section.id), section.title)}
              </Text>
            </View>
            {section.blocks.map((block, blockIndex) => (
              <View
                key={block.id}
                collapsable={false}
                onLayout={(event) => {
                  blockY.current.set(block.id, event.nativeEvent.layout.y);
                }}
                style={{ gap: spacing[3], paddingBottom: spacing[5], borderBottomWidth: blockIndex === section.blocks.length - 1 ? 0 : 1, borderColor: colors.separator }}
              >
                {!isDuplicateBlockTitle(section.title, block.title) ? (
                  <Text ref={register(segmentIds.blockTitle(block.id))} style={{ color: colors.textPrimary, fontSize: 18, lineHeight: 25, fontWeight: "600" }}>
                    {render(segmentIds.blockTitle(block.id), block.title)}
                  </Text>
                ) : null}
                <Text ref={register(segmentIds.explanation(block.id))} style={{ color: colors.textPrimary, fontSize: 16, lineHeight: 26 }}>
                  {render(segmentIds.explanation(block.id), block.explanation)}
                </Text>
                {block.keyPoints.length > 0 ? (
                  <View style={{ backgroundColor: colors.surfaceSecondary, borderRadius: radius.control, padding: spacing[4], gap: spacing[2] }}>
                    <Copy size="caption" color={colors.accent} style={{ fontWeight: "800", letterSpacing: 0.9 }}>KEY POINTS</Copy>
                    {block.keyPoints.map((point, index) => (
                      <View key={`${block.id}-point-${index}`} style={{ flexDirection: "row", alignItems: "flex-start", gap: spacing[2] }}>
                        <View style={{ width: 5, height: 5, borderRadius: 3, marginTop: 9, backgroundColor: colors.accent }} />
                        <Text ref={register(segmentIds.keyPoint(block.id, index))} style={{ flex: 1, color: colors.textPrimary, fontSize: 15, lineHeight: 24 }}>
                          {render(segmentIds.keyPoint(block.id, index), point)}
                        </Text>
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
                        <Text ref={register(segmentIds.evidence(block.id, index))} style={{ color: colors.textSecondary, fontSize: 15, lineHeight: 24 }}>
                          {render(segmentIds.evidence(block.id, index), evidence.text)}
                        </Text>
                      </View>
                    ))}
                  </View>
                ) : null}
              </View>
            ))}
          </View>
        ))}
      </View>
      <Surface style={{ gap: spacing[2], marginTop: spacing[4] }}>
        <Copy size="h3">Test yourself on this Reviewer</Copy>
        <Copy muted size="bodySmall">Build a quiz from these topics. You choose the settings and confirm before anything is generated.</Copy>
        <Action onPress={() => setQuizOpen(true)}>Generate Quiz</Action>
      </Surface>
      {quizOpen ? <QuizFromReviewerSheet artifact={artifact} deviceCopy={deviceCopy} onClose={() => setQuizOpen(false)} /> : null}
    </Page>
  );
}

function QuizPill({ onPress }: { onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Generate Quiz from this Reviewer"
      onPress={onPress}
      style={({ pressed }) => ({ minHeight: hitTarget.min, justifyContent: "center", opacity: pressed ? 0.6 : 1 })}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 7, borderRadius: radius.pill, backgroundColor: colors.violetSoft }}>
        <FileQuestion size={15} color={colors.violet} strokeWidth={1.8} />
        <Copy size="caption" color={colors.violet} style={{ fontWeight: "600" }}>Generate Quiz</Copy>
      </View>
    </Pressable>
  );
}

const QUESTION_SEGMENTS = QUIZ_QUESTION_COUNTS.map((count) => ({ value: String(count), label: String(count) }));

/**
 * Quiz settings for a saved Reviewer. The Reviewer is the source, so nothing
 * has to be selected again; the request goes to the same confirmation screen
 * as every other generation, and nothing starts until the student confirms.
 */
function QuizFromReviewerSheet({ artifact, deviceCopy, onClose }: { artifact: LibraryArtifactSummary; deviceCopy: boolean; onClose: () => void }) {
  const { session } = useAuth();
  const reviewerArtifactId = reviewerArtifactIdFromLibraryId(artifact.id);
  const [count, setCount] = useState<string>("5");
  const [difficulty, setDifficulty] = useState<QuizDifficulty | "mixed">("mixed");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function next() {
    if (!session || !reviewerArtifactId || busy) return;
    setBusy(true);
    setError(null);
    try {
      const intent = await createGenerationIntent(
        session.user.id,
        quizIntentInput({ title: artifact.title, reviewerArtifactId, questionCount: Number(count), difficulty }),
      );
      onClose();
      router.push({ pathname: "/generation", params: { intent: intent.key } });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not prepare this Quiz request.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <Sheet
      title="New Quiz"
      onClose={onClose}
      footer={<Action disabled={busy || !reviewerArtifactId || !session} onPress={() => void next()}>{busy ? "Preparing…" : "Continue"}</Action>}
    >
      <View style={{ gap: spacing[1] }}>
        <Copy muted size="caption">Source</Copy>
        <Copy size="h3" numberOfLines={2}>{artifact.title}</Copy>
        {artifact.course ? <Copy muted size="caption">{courseIdentity(artifact.course).title}</Copy> : null}
      </View>
      <View style={{ gap: spacing[2] }}>
        <Copy muted size="caption">Questions</Copy>
        <SegmentedControl segments={QUESTION_SEGMENTS} value={count} onChange={setCount} />
      </View>
      <View style={{ gap: spacing[2] }}>
        <Copy muted size="caption">Difficulty</Copy>
        <SegmentedControl segments={QUIZ_DIFFICULTIES} value={difficulty} onChange={setDifficulty} />
      </View>
      {!reviewerArtifactId ? <Notice>This Reviewer isn&apos;t saved to your account yet, so it can&apos;t be used for a Quiz.</Notice> : null}
      {deviceCopy ? <Notice>Quiz generation needs a connection.</Notice> : null}
      <Copy muted size="caption">Next you&apos;ll review the request. Nothing is generated until you confirm.</Copy>
      {error ? <Notice>{error}</Notice> : null}
    </Sheet>
  );
}

function ReviewerSearchBar({
  query,
  onChangeQuery,
  matches,
  topicTitle,
  active,
  onSelect,
  onPrevious,
  onNext,
}: {
  query: string;
  onChangeQuery: (value: string) => void;
  matches: readonly ReviewerMatch[];
  topicTitle: (sectionIndex: number) => string;
  active: number;
  onSelect: (matchIndex: number) => void;
  onPrevious: () => void;
  onNext: () => void;
}) {
  const { colors } = useTheme();
  const searching = query.trim().length >= MIN_QUERY_LENGTH;
  const count = matches.length;
  // One result per matching topic, in reading order, jumping to its first match.
  const topics = useMemo(() => {
    const seen = new Map<number, { first: number; count: number }>();
    matches.forEach((match, index) => {
      const entry = seen.get(match.sectionIndex);
      if (entry) entry.count += 1;
      else seen.set(match.sectionIndex, { first: index, count: 1 });
    });
    return [...seen.entries()].map(([sectionIndex, entry]) => ({ sectionIndex, ...entry }));
  }, [matches]);
  const activeSection = matches[active]?.sectionIndex;
  return (
    <View testID="reviewer-search" style={{ paddingHorizontal: spacing[5], paddingBottom: spacing[2], gap: spacing[1] }}>
      <SearchField value={query} onChangeText={onChangeQuery} placeholder="Search topics, terms, definitions" label="Search this Reviewer" onSubmitEditing={onNext} />
      {searching ? (
        <>
          <View style={{ flexDirection: "row", alignItems: "center", minHeight: 36 }}>
            <Copy muted size="caption" style={{ flex: 1 }}>
              {count === 0 ? `No matches for \u201C${query.trim()}\u201D` : `${active + 1} of ${count}${activeSection !== undefined ? ` \u00B7 Topic ${activeSection + 1}` : ""}`}
            </Copy>
            <SearchStep label="Previous match" disabled={count === 0} onPress={onPrevious}>
              <ChevronUp size={20} color={count === 0 ? colors.textMuted : colors.accent} />
            </SearchStep>
            <SearchStep label="Next match" disabled={count === 0} onPress={onNext}>
              <ChevronDown size={20} color={count === 0 ? colors.textMuted : colors.accent} />
            </SearchStep>
          </View>
          {topics.length > 0 ? (
            <NativeScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: spacing[2], paddingBottom: spacing[1] }}>
              {topics.map((topic) => {
                const selected = topic.sectionIndex === activeSection;
                return (
                  <Pressable
                    key={topic.sectionIndex}
                    accessibilityRole="button"
                    accessibilityLabel={`Jump to topic ${topic.sectionIndex + 1}, ${topicTitle(topic.sectionIndex)}, ${topic.count} ${topic.count === 1 ? "match" : "matches"}`}
                    accessibilityState={{ selected }}
                    onPress={() => onSelect(topic.first)}
                    style={({ pressed }) => ({ minHeight: 36, justifyContent: "center", opacity: pressed ? 0.6 : 1 })}
                  >
                    <View style={{ maxWidth: 240, flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: radius.pill, backgroundColor: selected ? colors.blueSoft : colors.surfaceSecondary }}>
                      <Copy size="caption" numberOfLines={1} color={selected ? colors.blue : colors.textPrimary} style={{ flexShrink: 1, fontWeight: selected ? "600" : "500" }}>
                        {topicTitle(topic.sectionIndex)}
                      </Copy>
                      <Copy size="caption" color={selected ? colors.blue : colors.textMuted} style={{ fontVariant: ["tabular-nums"] }}>{topic.count}</Copy>
                    </View>
                  </Pressable>
                );
              })}
            </NativeScrollView>
          ) : null}
        </>
      ) : null}
    </View>
  );
}

function SearchStep({ label, disabled, onPress, children }: { label: string; disabled: boolean; onPress: () => void; children: ReactNode }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({ width: hitTarget.min, height: 36, alignItems: "center", justifyContent: "center", opacity: pressed ? 0.5 : 1 })}
    >
      {children}
    </Pressable>
  );
}

type ScrubberTouch = {
  onTouchStart: (event: GestureResponderEvent) => void;
  onTouchMove: (event: GestureResponderEvent) => void;
  onTouchEnd: () => void;
  onTouchCancel: () => void;
};
export type ScrubberHandle = {
  reveal: (y: number, content: number, viewport: number) => void;
  touch: ScrubberTouch | null;
};

/**
 * Right-edge fast navigation. While reading, a position thumb appears after
 * scrolling and fades away. Dragging the thumb (a generous invisible grab
 * area) starts scrubbing at once; touching and holding anywhere on the right
 * edge does too. While scrubbing, a floating label names the current topic,
 * updates continuously, and the page follows the finger topic by topic; it
 * hides when the finger lifts. A quick swipe on the edge while the thumb is
 * hidden still scrolls natively. Without at least two topics it scrubs by
 * proportional position instead.
 */
export function SectionScrubber({
  handle,
  anchors,
  anchorOffset,
  metrics,
  onScrub,
  onSettle,
  onActiveChange,
}: {
  handle: { current: ScrubberHandle };
  anchors: readonly string[];
  anchorOffset: (index: number) => number;
  metrics: { current: { y: number; content: number; viewport: number } };
  onScrub: (y: number) => void;
  onSettle: (y: number) => void;
  onActiveChange: (active: boolean) => void;
}) {
  const { colors, mode, reducedMotion } = useTheme();
  const { width: windowWidth } = useWindowDimensions();
  const stripRef = useRef<View>(null);
  const stripTop = useRef(0);
  const [height, setHeight] = useState(0);
  const [active, setActive] = useState(false);
  const [grabbable, setGrabbable] = useState(false);
  const [preview, setPreview] = useState<{ index: number; fraction: number }>({ index: -1, fraction: 0 });
  const thumbOpacity = useRef(new Animated.Value(0)).current;
  const thumbTop = useRef(new Animated.Value(0)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const hideTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const holdTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const state = useRef({ tracking: false, active: false, grabbable: false, startY: 0, startPageY: 0, lastIndex: -1, lastOffset: 0 });
  const latest = useRef({ anchors, anchorOffset, onScrub, onSettle, onActiveChange, height, reducedMotion, windowWidth });
  latest.current = { anchors, anchorOffset, onScrub, onSettle, onActiveChange, height, reducedMotion, windowWidth };
  const THUMB = 40;

  useEffect(() => () => {
    clearTimeout(hideTimer.current);
    clearTimeout(holdTimer.current);
  }, []);

  // The reader reports scroll positions here so a slim position thumb can
  // appear while scrolling and fade once reading resumes.
  useEffect(() => {
    handle.current.reveal = (y, content, viewport) => {
      if (state.current.active || height <= 0) return;
      const scrollable = content - viewport;
      if (scrollable <= viewport * 0.5) return;
      thumbTop.setValue((height - THUMB) * Math.min(Math.max(y / scrollable, 0), 1));
      thumbOpacity.setValue(1);
      if (!state.current.grabbable) {
        state.current.grabbable = true;
        setGrabbable(true);
      }
      clearTimeout(hideTimer.current);
      hideTimer.current = setTimeout(() => {
        state.current.grabbable = false;
        setGrabbable(false);
        if (latest.current.reducedMotion) thumbOpacity.setValue(0);
        else Animated.timing(thumbOpacity, { toValue: 0, duration: 400, useNativeDriver: true }).start();
      }, 1600);
    };
  }, [handle, height, thumbOpacity, thumbTop]);

  const touch = useMemo(() => {
    const targetFor = (locationY: number) => {
      const { anchors: list, anchorOffset: offsetOf, height: trackHeight } = latest.current;
      const fraction = trackHeight > 0 ? locationY / trackHeight : 0;
      if (list.length >= 2) {
        const index = anchorIndexForFraction(fraction, list.length);
        return { index, fraction, offset: offsetOf(index) };
      }
      const { content, viewport } = metrics.current;
      return { index: -1, fraction, offset: proportionalOffset(fraction, content, viewport) };
    };
    const update = (locationY: number) => {
      const target = targetFor(locationY);
      const fraction = Math.min(Math.max(target.fraction, 0), 1);
      setPreview({ index: target.index, fraction });
      thumbTop.setValue(Math.max(0, latest.current.height - THUMB) * fraction);
      const moved = target.index >= 0 ? target.index !== state.current.lastIndex : Math.abs(target.offset - state.current.lastOffset) > 4;
      if (moved) {
        state.current.lastIndex = target.index;
        state.current.lastOffset = target.offset;
        latest.current.onScrub(target.offset);
      }
    };
    const activate = () => {
      state.current.active = true;
      state.current.lastIndex = -2;
      setActive(true);
      latest.current.onActiveChange(true);
      clearTimeout(hideTimer.current);
      Vibration.vibrate(8);
      thumbOpacity.setValue(1);
      if (latest.current.reducedMotion) overlayOpacity.setValue(1);
      else Animated.timing(overlayOpacity, { toValue: 1, duration: 120, useNativeDriver: true }).start();
      update(state.current.startY);
    };
    const deactivate = (settle: boolean) => {
      clearTimeout(holdTimer.current);
      if (!state.current.active) return;
      state.current.active = false;
      latest.current.onActiveChange(false);
      if (settle) latest.current.onSettle(state.current.lastOffset);
      const done = () => setActive(false);
      clearTimeout(hideTimer.current);
      hideTimer.current = setTimeout(() => {
        state.current.grabbable = false;
        setGrabbable(false);
        if (latest.current.reducedMotion) thumbOpacity.setValue(0);
        else Animated.timing(thumbOpacity, { toValue: 0, duration: 400, useNativeDriver: true }).start();
      }, 1200);
      if (latest.current.reducedMotion) {
        overlayOpacity.setValue(0);
        done();
      } else {
        Animated.timing(overlayOpacity, { toValue: 0, duration: 220, delay: 250, useNativeDriver: true }).start(done);
      }
    };
    // The reader's scroll view reports raw touches here. Nothing is claimed,
    // so a swipe anywhere, including on the edge, scrolls natively. A touch
    // that starts at the right edge and holds still activates the scrubber,
    // which then disables scrolling and follows the finger.
    // Dragging the visible thumb claims the touch immediately: no hold.
    const thumb = {
      onGrab: (event: GestureResponderEvent) => {
        clearTimeout(holdTimer.current);
        const { pageY } = event.nativeEvent;
        stripRef.current?.measureInWindow((_x, y) => {
          stripTop.current = y;
        });
        state.current.tracking = true;
        state.current.startPageY = pageY;
        state.current.startY = pageY - stripTop.current;
        activate();
      },
      onDrag: (event: GestureResponderEvent) => {
        if (!state.current.active) return;
        update(state.current.startY + (event.nativeEvent.pageY - state.current.startPageY));
      },
      onRelease: () => {
        state.current.tracking = false;
        deactivate(true);
      },
    };
    return {
      thumb,
      onTouchStart: (event: GestureResponderEvent) => {
        if (state.current.active) return;
        clearTimeout(holdTimer.current);
        const { pageX, pageY } = event.nativeEvent;
        state.current.tracking = pageX >= latest.current.windowWidth - SCRUB_STRIP_WIDTH;
        if (!state.current.tracking) return;
        stripRef.current?.measureInWindow((_x, y) => {
          stripTop.current = y;
        });
        state.current.startPageY = pageY;
        state.current.startY = pageY - stripTop.current;
        holdTimer.current = setTimeout(() => {
          state.current.startY = state.current.startPageY - stripTop.current;
          activate();
        }, SCRUB_HOLD_MS);
      },
      onTouchMove: (event: GestureResponderEvent) => {
        if (!state.current.tracking) return;
        const dy = event.nativeEvent.pageY - state.current.startPageY;
        if (!state.current.active) {
          if (Math.abs(dy) > SCRUB_SLOP) {
            clearTimeout(holdTimer.current);
            state.current.tracking = false;
          }
          return;
        }
        update(state.current.startY + dy);
      },
      onTouchEnd: () => {
        state.current.tracking = false;
        deactivate(true);
      },
      // The native scroll view took the gesture (a swipe): never activate.
      onTouchCancel: () => {
        state.current.tracking = false;
        deactivate(false);
      },
    };
  }, [metrics, overlayOpacity, thumbOpacity, thumbTop]);

  useEffect(() => {
    const current = handle.current;
    current.touch = touch;
    return () => {
      current.touch = null;
    };
  }, [handle, touch]);

  const hasAnchors = anchors.length >= 2;
  const bubbleTop = Math.min(Math.max(preview.fraction * height - 34, 8), Math.max(8, height - 84));
  return (
    <View pointerEvents="box-none" style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0 }}>
      <View
        ref={stripRef}
        pointerEvents="none"
        testID="reviewer-scrubber"
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel="Topic scrubber"
        accessibilityHint="Touch and hold, then slide to move between topics."
        accessibilityValue={hasAnchors && preview.index >= 0 ? { text: anchors[preview.index] } : undefined}
        accessibilityActions={[{ name: "increment" }, { name: "decrement" }]}
        onAccessibilityAction={(event) => {
          if (!hasAnchors) return;
          const offsets = anchors.map((_, index) => anchorOffset(index));
          const now = currentAnchorIndex(offsets, metrics.current.y);
          const next = Math.min(Math.max(now + (event.nativeEvent.actionName === "increment" ? 1 : -1), 0), anchors.length - 1);
          setPreview({ index: next, fraction: next / anchors.length });
          onSettle(anchorOffset(next));
        }}
        onLayout={(event) => {
          setHeight(event.nativeEvent.layout.height);
          stripRef.current?.measureInWindow((_x, y) => {
            stripTop.current = y;
          });
        }}
        style={{ position: "absolute", top: 0, right: 0, bottom: 0, width: SCRUB_STRIP_WIDTH }}
      >
        <Animated.View
          pointerEvents="none"
          style={{ position: "absolute", right: 4, width: active ? 6 : 5, height: THUMB, borderRadius: 3, backgroundColor: active ? colors.accent : colors.textMuted, opacity: Animated.multiply(thumbOpacity, active ? 0.9 : 0.6), transform: [{ translateY: thumbTop }] }}
        />
        {active ? (
          <Animated.View
            pointerEvents="none"
            style={{ position: "absolute", top: 6, bottom: 6, right: 6, width: 6, borderRadius: 3, backgroundColor: colors.separator, opacity: overlayOpacity }}
          >
            {hasAnchors && anchors.length <= 60
              ? anchors.map((_, index) => (
                  <View
                    key={index}
                    style={{ position: "absolute", left: 1, width: 4, height: 2, borderRadius: 1, top: `${((index + 0.5) / anchors.length) * 100}%`, backgroundColor: index === preview.index ? colors.accent : colors.textMuted, opacity: index === preview.index ? 1 : 0.5 }}
                  />
                ))
              : null}
          </Animated.View>
        ) : null}
      </View>
      <Animated.View
        pointerEvents={grabbable || active ? "auto" : "none"}
        testID="reviewer-scrubber-thumb"
        importantForAccessibility="no-hide-descendants"
        accessibilityElementsHidden
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderTerminationRequest={() => false}
        onResponderGrant={touch.thumb.onGrab}
        onResponderMove={touch.thumb.onDrag}
        onResponderRelease={touch.thumb.onRelease}
        onResponderTerminate={touch.thumb.onRelease}
        style={{
          position: "absolute",
          right: 0,
          top: -(THUMB_TOUCH_HEIGHT - THUMB) / 2,
          width: THUMB_TOUCH_WIDTH,
          height: THUMB_TOUCH_HEIGHT,
          transform: [{ translateY: thumbTop }],
        }}
      />
      {active ? (
        <Animated.View
          pointerEvents="none"
          accessibilityLiveRegion="polite"
          style={{
            position: "absolute",
            right: SCRUB_STRIP_WIDTH + 6,
            top: bubbleTop,
            maxWidth: 240,
            minWidth: 120,
            paddingHorizontal: spacing[3],
            paddingVertical: spacing[2],
            borderRadius: 14,
            backgroundColor: colors.surfaceElevated,
            borderWidth: 1,
            borderColor: colors.separator,
            shadowColor: "#000",
            shadowOpacity: mode === "dark" ? 0.5 : 0.14,
            shadowRadius: 12,
            shadowOffset: { width: 0, height: 4 },
            elevation: 6,
            opacity: overlayOpacity,
            transform: [{ scale: overlayOpacity.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1] }) }],
          }}
        >
          {hasAnchors && preview.index >= 0 ? (
            <>
              <Copy size="caption" muted style={{ fontVariant: ["tabular-nums"] }}>{preview.index + 1} / {anchors.length}</Copy>
              <Copy size="bodySmall" style={{ fontWeight: "600" }}>{anchors[preview.index]}</Copy>
            </>
          ) : (
            <Copy size="bodySmall" style={{ fontWeight: "600", fontVariant: ["tabular-nums"] }}>{Math.round(preview.fraction * 100)}%</Copy>
          )}
        </Animated.View>
      ) : null}
    </View>
  );
}
