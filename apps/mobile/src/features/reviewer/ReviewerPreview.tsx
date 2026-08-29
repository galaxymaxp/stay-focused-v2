import type { ReviewerOutput } from "@stay-focused/engine";
import { AlertCircle, Check } from "lucide-react-native";
import { StyleSheet, Text, View } from "react-native";

import { colors, radius, spacing, typography } from "../../design/tokens";
import {
  describeGroundingStatus,
  describeReviewerQualityNotice,
  describeReviewerScale,
  describeReviewerSource,
  presentReviewerSections,
  readerEmptyMessage,
  readerReviewerTitle,
  type ReviewerGroundingPresentation,
  type ReviewerReaderBlock,
  type ReviewerReaderContext,
  type ReviewerReaderSection,
} from "./reviewerReaderPresentation";

interface ReviewerPreviewProps {
  readonly reviewer: ReviewerOutput;
  /**
   * Optional context the surrounding screen already holds. Omitted fields are
   * simply not shown, so a saved reviewer reopened without job context reads
   * the same as a freshly generated one.
   */
  readonly context?: ReviewerReaderContext;
}

/**
 * The Reviewer Reader.
 *
 * This is the payoff surface of the reviewer journey, so it is laid out as a
 * study document rather than a stack of cards: one masthead, then sections
 * separated by whitespace and a hairline, with the generated material at full
 * reading size. It renders the accepted reviewer output faithfully and adds no
 * metadata the payload does not contain.
 */
export function ReviewerPreview({ reviewer, context }: ReviewerPreviewProps) {
  const sections = presentReviewerSections(reviewer);
  const sourceLine = describeReviewerSource(reviewer, context);
  const grounding = describeGroundingStatus(reviewer.metadata);
  const qualityNotice = describeReviewerQualityNotice(reviewer.metadata);

  return (
    <View style={styles.document} testID="reviewer-ready">
      <View style={styles.masthead}>
        <Text style={styles.kicker}>Reviewer</Text>
        <Text
          accessibilityRole="header"
          style={styles.title}
          testID="reviewer-title"
        >
          {readerReviewerTitle(reviewer)}
        </Text>
        {sourceLine ? (
          <Text style={styles.meta} testID="reviewer-source-line">
            {sourceLine}
          </Text>
        ) : null}
        <Text style={styles.meta}>{describeReviewerScale(reviewer, context)}</Text>
        {grounding && sections.length > 0 ? (
          <GroundingChip grounding={grounding} />
        ) : null}
      </View>

      {qualityNotice ? (
        <Text style={styles.notice} testID="reviewer-quality-notice">
          {qualityNotice}
        </Text>
      ) : null}

      {sections.length > 0 ? (
        <View>
          {sections.map((section, index) => (
            <ReaderSection
              key={section.id}
              isFirst={index === 0}
              section={section}
            />
          ))}
        </View>
      ) : (
        <Text style={styles.emptyText} testID="reviewer-empty">
          {readerEmptyMessage()}
        </Text>
      )}
    </View>
  );
}

function GroundingChip({
  grounding,
}: {
  readonly grounding: ReviewerGroundingPresentation;
}) {
  const isGrounded = grounding.tone === "grounded";

  return (
    <View
      style={[
        styles.groundingChip,
        isGrounded ? styles.groundingGrounded : styles.groundingLimited,
      ]}
      testID="reviewer-grounding-status"
    >
      {isGrounded ? (
        <Check color={colors.success} size={15} strokeWidth={2.4} />
      ) : (
        <AlertCircle color={colors.accentPressed} size={15} strokeWidth={2.2} />
      )}
      <View style={styles.groundingCopy}>
        <Text style={styles.groundingLabel}>{grounding.label}</Text>
        <Text style={styles.groundingDetail}>{grounding.detail}</Text>
      </View>
    </View>
  );
}

function ReaderSection({
  isFirst,
  section,
}: {
  readonly isFirst: boolean;
  readonly section: ReviewerReaderSection;
}) {
  return (
    <View
      style={[styles.section, isFirst ? styles.firstSection : null]}
      testID="reviewer-section"
    >
      <View style={styles.sectionHeading}>
        <Text style={styles.sectionNumber}>{section.number}</Text>
        <Text accessibilityRole="header" style={styles.sectionTitle}>
          {section.title}
        </Text>
      </View>

      {section.notice ? (
        <Text style={styles.sectionNotice}>{section.notice}</Text>
      ) : null}

      {section.emptyMessage ? (
        <Text style={styles.mutedText}>{section.emptyMessage}</Text>
      ) : null}

      {section.blocks.length > 0 ? (
        <View style={styles.blocks}>
          {section.blocks.map((block) => (
            <ReaderBlock block={block} key={block.id} />
          ))}
        </View>
      ) : null}
    </View>
  );
}

function ReaderBlock({ block }: { readonly block: ReviewerReaderBlock }) {
  return (
    <View style={styles.block}>
      {block.heading ? (
        <Text accessibilityRole="header" style={styles.blockHeading}>
          {block.heading}
        </Text>
      ) : null}

      {block.explanation ? (
        <Text
          selectable
          style={styles.bodyText}
          testID="reviewer-explanation"
        >
          {block.explanation}
        </Text>
      ) : null}

      {block.keyPoints.length > 0 ? (
        <View style={styles.keyPoints}>
          {block.showKeyPointsLabel ? (
            <Text style={styles.keyPointsLabel}>Key points</Text>
          ) : null}
          {block.keyPoints.map((point, index) => (
            <View key={`${block.id}-point-${index}`} style={styles.keyPointRow}>
              <Text style={styles.bullet}>{"•"}</Text>
              <Text
                selectable
                style={styles.keyPointText}
                testID="reviewer-key-point"
              >
                {point}
              </Text>
            </View>
          ))}
        </View>
      ) : null}

      {block.emptyMessage ? (
        <Text style={styles.mutedText}>{block.emptyMessage}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  document: {
    alignSelf: "stretch",
    gap: spacing[4],
    maxWidth: 680,
    width: "100%",
  },
  masthead: {
    gap: spacing[2],
  },
  kicker: {
    color: colors.textSecondary,
    fontFamily: typography.fontFamily,
    fontSize: typography.kicker,
    fontWeight: "700",
    letterSpacing: 1.1,
    textTransform: "uppercase",
  },
  title: {
    color: colors.textPrimary,
    fontFamily: typography.fontFamily,
    fontSize: typography.h1,
    fontWeight: "700",
    lineHeight: 31,
  },
  meta: {
    color: colors.textSecondary,
    fontFamily: typography.fontFamily,
    fontSize: typography.bodySmall,
    lineHeight: 19,
  },
  groundingChip: {
    alignItems: "flex-start",
    alignSelf: "flex-start",
    borderRadius: radius.tight,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing[2],
    marginTop: spacing[1],
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
  },
  groundingGrounded: {
    backgroundColor: colors.successSurface,
    borderColor: colors.success,
  },
  groundingLimited: {
    backgroundColor: "rgba(215, 170, 56, 0.14)",
    borderColor: colors.accent,
  },
  groundingCopy: {
    flex: 1,
    gap: spacing[1],
  },
  groundingLabel: {
    color: colors.textPrimary,
    fontFamily: typography.fontFamily,
    fontSize: typography.bodySmall,
    fontWeight: "700",
    lineHeight: 18,
  },
  groundingDetail: {
    color: colors.textPrimary,
    fontFamily: typography.fontFamily,
    fontSize: typography.caption,
    lineHeight: 17,
  },
  notice: {
    color: colors.textSecondary,
    fontFamily: typography.fontFamily,
    fontSize: typography.bodySmall,
    lineHeight: 20,
  },
  section: {
    borderTopColor: colors.border,
    borderTopWidth: 1,
    gap: spacing[3],
    paddingBottom: spacing[2],
    paddingTop: spacing[6],
  },
  firstSection: {
    borderTopWidth: 0,
    paddingTop: spacing[2],
  },
  sectionHeading: {
    alignItems: "baseline",
    flexDirection: "row",
    gap: spacing[3],
  },
  sectionNumber: {
    color: colors.accent,
    fontFamily: typography.fontFamily,
    fontSize: typography.h3,
    fontWeight: "700",
    minWidth: 18,
  },
  sectionTitle: {
    color: colors.textPrimary,
    flex: 1,
    fontFamily: typography.fontFamily,
    fontSize: typography.h2,
    fontWeight: "700",
    lineHeight: 26,
  },
  sectionNotice: {
    color: colors.textSecondary,
    fontFamily: typography.fontFamily,
    fontSize: typography.caption,
    lineHeight: 18,
  },
  blocks: {
    gap: spacing[5],
  },
  block: {
    gap: spacing[3],
  },
  blockHeading: {
    color: colors.textPrimary,
    fontFamily: typography.fontFamily,
    fontSize: typography.h3,
    fontWeight: "700",
    lineHeight: 22,
  },
  bodyText: {
    color: colors.textPrimary,
    fontFamily: typography.fontFamily,
    fontSize: typography.body,
    lineHeight: 24,
  },
  keyPoints: {
    gap: spacing[2],
  },
  keyPointsLabel: {
    color: colors.textSecondary,
    fontFamily: typography.fontFamily,
    fontSize: typography.caption,
    fontWeight: "700",
  },
  keyPointRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacing[3],
  },
  bullet: {
    color: colors.accent,
    fontFamily: typography.fontFamily,
    fontSize: typography.body,
    lineHeight: 24,
  },
  keyPointText: {
    color: colors.textPrimary,
    flex: 1,
    fontFamily: typography.fontFamily,
    fontSize: typography.body,
    lineHeight: 24,
  },
  mutedText: {
    color: colors.textSecondary,
    fontFamily: typography.fontFamily,
    fontSize: typography.bodySmall,
    lineHeight: 20,
  },
  emptyText: {
    color: colors.textSecondary,
    fontFamily: typography.fontFamily,
    fontSize: typography.body,
    lineHeight: 24,
  },
});
