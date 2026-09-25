import type { LibraryArtifactSummary, ReviewerReaderModel } from "@stay-focused/shared";
import { ChevronDown, ChevronUp, Search, X } from "lucide-react-native";
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
  Text,
  TextInput,
  View,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type ScrollView,
} from "react-native";

import { courseIdentity } from "../../design/courseIdentity";
import { Copy, IconAction, Notice, Page } from "../../design/primitives";
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

type Measurable = View | Text;
/** Keeps a found line below the header/search bar with readable context above it. */
const JUMP_CONTEXT = 72;
const SCRUB_STRIP_WIDTH = 30;
const SCRUB_HOLD_MS = 160;
const SCRUB_SLOP = 8;

/**
 * The Reviewer reader. The page stays calm: content first, with controls
 * revealed only when asked for. Search (header icon) finds any rendered text;
 * the right-edge scrubber (touch and hold) moves between the Reviewer's own
 * topics. Both only read the persisted Reviewer on the device.
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
  const scrubber = useRef({ reveal: (_y: number, _content: number, _viewport: number) => {} });

  const segments = useMemo(() => reviewerSegments(reviewer), [reviewer]);
  const anchors = useMemo(() => reviewerAnchors(reviewer), [reviewer]);

  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const matches = useMemo(() => (searchOpen ? findReviewerMatches(segments, deferredQuery) : []), [deferredQuery, searchOpen, segments]);
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
      headerAction={
        searchOpen ? null : (
          <IconAction label="Search this Reviewer" onPress={() => setSearchOpen(true)}>
            <Search size={18} color={colors.textSecondary} />
          </IconAction>
        )
      }
      headerBelow={
        searchOpen ? (
          <ReviewerSearchBar
            query={query}
            onChangeQuery={setQuery}
            count={matches.length}
            active={activeMatch}
            onPrevious={() => setActiveMatch((index) => (matches.length ? (index - 1 + matches.length) % matches.length : 0))}
            onNext={() => setActiveMatch((index) => (matches.length ? (index + 1) % matches.length : 0))}
            onClose={() => {
              setSearchOpen(false);
              setQuery("");
            }}
          />
        ) : null
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
    </Page>
  );
}

function ReviewerSearchBar({
  query,
  onChangeQuery,
  count,
  active,
  onPrevious,
  onNext,
  onClose,
}: {
  query: string;
  onChangeQuery: (value: string) => void;
  count: number;
  active: number;
  onPrevious: () => void;
  onNext: () => void;
  onClose: () => void;
}) {
  const { colors, reducedMotion } = useTheme();
  const reveal = useRef(new Animated.Value(reducedMotion ? 1 : 0)).current;
  useEffect(() => {
    if (reducedMotion) return;
    Animated.timing(reveal, { toValue: 1, duration: 180, useNativeDriver: true }).start();
  }, [reducedMotion, reveal]);
  const searching = query.trim().length >= MIN_QUERY_LENGTH;
  return (
    <Animated.View
      testID="reviewer-search"
      style={{
        paddingHorizontal: spacing[5],
        paddingBottom: spacing[2],
        gap: spacing[1],
        opacity: reveal,
        transform: [{ translateY: reveal.interpolate({ inputRange: [0, 1], outputRange: [-8, 0] }) }],
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: spacing[2] }}>
        <View style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: spacing[2], minHeight: 40, borderRadius: 10, paddingHorizontal: spacing[3], backgroundColor: colors.surfaceSecondary }}>
          <Search size={16} color={colors.textMuted} />
          <TextInput
            autoFocus
            value={query}
            onChangeText={onChangeQuery}
            placeholder="Find in Reviewer"
            placeholderTextColor={colors.textMuted}
            returnKeyType="search"
            submitBehavior="submit"
            onSubmitEditing={onNext}
            accessibilityLabel="Find in Reviewer"
            autoCorrect={false}
            autoCapitalize="none"
            style={{ flex: 1, minHeight: 40, color: colors.textPrimary, fontSize: 15, paddingVertical: 0 }}
          />
          {query ? (
            <Pressable accessibilityRole="button" accessibilityLabel="Clear search" onPress={() => onChangeQuery("")} hitSlop={10}>
              <X size={16} color={colors.textMuted} />
            </Pressable>
          ) : null}
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="Close search" onPress={onClose} style={({ pressed }) => ({ minHeight: hitTarget.min, justifyContent: "center", paddingHorizontal: spacing[1], opacity: pressed ? 0.55 : 1 })}>
          <Copy color={colors.accent} style={{ fontWeight: "600" }}>Done</Copy>
        </Pressable>
      </View>
      {searching ? (
        <View style={{ flexDirection: "row", alignItems: "center", minHeight: 36 }}>
          <Copy muted size="caption" style={{ flex: 1 }} >
            {count === 0 ? `No matches for “${query.trim()}”` : `${active + 1} of ${count}`}
          </Copy>
          <SearchStep label="Previous match" disabled={count === 0} onPress={onPrevious}>
            <ChevronUp size={20} color={count === 0 ? colors.textMuted : colors.accent} />
          </SearchStep>
          <SearchStep label="Next match" disabled={count === 0} onPress={onNext}>
            <ChevronDown size={20} color={count === 0 ? colors.textMuted : colors.accent} />
          </SearchStep>
        </View>
      ) : null}
    </Animated.View>
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

/**
 * Right-edge fast navigation. While reading, a slim position thumb appears
 * briefly after scrolling and fades away. Touching and holding the right edge
 * (or the thumb) activates the scrubber: scrolling locks, a preview names the
 * destination topic, and the page follows the finger topic by topic. A quick
 * swipe on the edge never activates it and still scrolls the page natively.
 * Without at least two topics it scrubs by proportional position instead.
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
  handle: { current: { reveal: (y: number, content: number, viewport: number) => void } };
  anchors: readonly string[];
  anchorOffset: (index: number) => number;
  metrics: { current: { y: number; content: number; viewport: number } };
  onScrub: (y: number) => void;
  onSettle: (y: number) => void;
  onActiveChange: (active: boolean) => void;
}) {
  const { colors, mode, reducedMotion } = useTheme();
  const [height, setHeight] = useState(0);
  const [active, setActive] = useState(false);
  const [preview, setPreview] = useState<{ index: number; fraction: number }>({ index: -1, fraction: 0 });
  const thumbOpacity = useRef(new Animated.Value(0)).current;
  const thumbTop = useRef(new Animated.Value(0)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const hideTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const holdTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const state = useRef({ active: false, startY: 0, startPageY: 0, lastIndex: -1, lastOffset: 0 });
  const latest = useRef({ anchors, anchorOffset, onScrub, onSettle, onActiveChange, height, reducedMotion });
  latest.current = { anchors, anchorOffset, onScrub, onSettle, onActiveChange, height, reducedMotion };
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
      clearTimeout(hideTimer.current);
      hideTimer.current = setTimeout(() => {
        if (latest.current.reducedMotion) thumbOpacity.setValue(0);
        else Animated.timing(thumbOpacity, { toValue: 0, duration: 400, useNativeDriver: true }).start();
      }, 900);
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
      setPreview({ index: target.index, fraction: Math.min(Math.max(target.fraction, 0), 1) });
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
      thumbOpacity.setValue(0);
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
      if (latest.current.reducedMotion) {
        overlayOpacity.setValue(0);
        done();
      } else {
        Animated.timing(overlayOpacity, { toValue: 0, duration: 220, delay: 250, useNativeDriver: true }).start(done);
      }
    };
    // Raw touch handlers observe without claiming the gesture, so a normal
    // swipe that starts on the edge still scrolls natively. Only a still hold
    // activates the scrubber, which then locks scrolling and follows the finger.
    type Touch = { nativeEvent: { locationY: number; pageY: number } };
    return {
      onTouchStart: (event: Touch) => {
        state.current.startY = event.nativeEvent.locationY;
        state.current.startPageY = event.nativeEvent.pageY;
        clearTimeout(holdTimer.current);
        holdTimer.current = setTimeout(activate, SCRUB_HOLD_MS);
      },
      onTouchMove: (event: Touch) => {
        const dy = event.nativeEvent.pageY - state.current.startPageY;
        if (!state.current.active) {
          if (Math.abs(dy) > SCRUB_SLOP) clearTimeout(holdTimer.current);
          return;
        }
        update(state.current.startY + dy);
      },
      onTouchEnd: () => deactivate(true),
      // The native scroll view took the gesture (a swipe): never activate.
      onTouchCancel: () => deactivate(false),
    };
  }, [metrics, overlayOpacity, thumbOpacity]);

  const hasAnchors = anchors.length >= 2;
  const bubbleTop = Math.min(Math.max(preview.fraction * height - 34, 8), Math.max(8, height - 84));
  return (
    <View pointerEvents="box-none" style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0 }}>
      <View
        onTouchStart={touch.onTouchStart}
        onTouchMove={touch.onTouchMove}
        onTouchEnd={touch.onTouchEnd}
        onTouchCancel={touch.onTouchCancel}
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
        onLayout={(event) => setHeight(event.nativeEvent.layout.height)}
        style={{ position: "absolute", top: 0, right: 0, bottom: 0, width: SCRUB_STRIP_WIDTH }}
      >
        <Animated.View
          pointerEvents="none"
          style={{ position: "absolute", right: 4, width: 4, height: THUMB, borderRadius: 2, backgroundColor: colors.textMuted, opacity: Animated.multiply(thumbOpacity, 0.55), transform: [{ translateY: thumbTop }] }}
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
