import type { ReviewerOutput, ReviewerSection } from "@stay-focused/engine";
import { StyleSheet, Text, View } from "react-native";

import { Card } from "../../components/Card";
import { colors, radius, spacing, typography } from "../../design/tokens";

interface ReviewerPreviewProps {
  readonly reviewer: ReviewerOutput;
}

export function ReviewerPreview({ reviewer }: ReviewerPreviewProps) {
  const sectionCount = reviewer.sections.length;

  return (
    <Card elevated style={styles.previewCard}>
      <View style={styles.header}>
        <Text style={styles.kicker}>Generated reviewer</Text>
        <Text style={styles.title}>{reviewer.title || "Untitled reviewer"}</Text>
        <Text style={styles.meta}>
          {sectionCount} {sectionCount === 1 ? "section" : "sections"}
        </Text>
      </View>

      {sectionCount > 0 ? (
        <>
          <View style={styles.titleSummary}>
            <Text style={styles.subhead}>Section titles</Text>
            {reviewer.sections.map((section) => (
              <Text key={`${section.id}-summary`} style={styles.summaryItem}>
                {section.order + 1}. {section.title || "Untitled section"}
              </Text>
            ))}
          </View>

          <View style={styles.sectionList}>
            {reviewer.sections.map((section) => (
              <SectionPreview key={section.id} section={section} />
            ))}
          </View>
        </>
      ) : (
        <Text style={styles.emptyText}>No sections were returned.</Text>
      )}
    </Card>
  );
}

function SectionPreview({ section }: { readonly section: ReviewerSection }) {
  const keyPoints = getKeyPoints(section);
  const explanations = getExplanations(section);

  return (
    <View style={styles.sectionCard}>
      <Text style={styles.sectionTitle}>
        {section.title || "Untitled section"}
      </Text>

      <View style={styles.titleList}>
        <Text style={styles.subhead}>Section title</Text>
        <Text style={styles.bodyText}>{section.title || "Untitled section"}</Text>
      </View>

      <View style={styles.contentGroup}>
        <Text style={styles.subhead}>Key points</Text>
        {keyPoints.length > 0 ? (
          <View style={styles.bulletList}>
            {keyPoints.map((point, index) => (
              <View key={`${section.id}-point-${index}`} style={styles.bulletRow}>
                <Text style={styles.bullet}>-</Text>
                <Text style={styles.bodyText}>{point}</Text>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.mutedText}>No key points available.</Text>
        )}
      </View>

      <View style={styles.contentGroup}>
        <Text style={styles.subhead}>Explanation</Text>
        {explanations.length > 0 ? (
          explanations.map((explanation, index) => (
            <Text key={`${section.id}-explanation-${index}`} style={styles.bodyText}>
              {explanation}
            </Text>
          ))
        ) : (
          <Text style={styles.mutedText}>No explanation available.</Text>
        )}
      </View>
    </View>
  );
}

function getKeyPoints(section: ReviewerSection): readonly string[] {
  return section.items.flatMap((item) =>
    item.sourceCore.keyPoints
      .map((point) => point.trim())
      .filter((point) => point.length > 0),
  );
}

function getExplanations(section: ReviewerSection): readonly string[] {
  return section.items
    .map((item) => item.sourceCore.explanation.trim())
    .filter((explanation) => explanation.length > 0);
}

const styles = StyleSheet.create({
  previewCard: {
    gap: spacing[5],
  },
  header: {
    gap: spacing[2],
  },
  kicker: {
    color: colors.textMuted,
    fontFamily: typography.fontFamily,
    fontSize: typography.kicker,
    fontWeight: "800",
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  title: {
    color: colors.textPrimary,
    fontFamily: typography.fontFamily,
    fontSize: typography.h2,
    fontWeight: "800",
    lineHeight: 24,
  },
  meta: {
    color: colors.textSecondary,
    fontFamily: typography.fontFamily,
    fontSize: typography.bodySmall,
    lineHeight: 19,
  },
  sectionList: {
    gap: spacing[4],
  },
  titleSummary: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: radius.tight,
    borderWidth: 1,
    gap: spacing[2],
    padding: spacing[4],
  },
  summaryItem: {
    color: colors.textSecondary,
    fontFamily: typography.fontFamily,
    fontSize: typography.bodySmall,
    lineHeight: 20,
  },
  sectionCard: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: radius.tight,
    borderWidth: 1,
    gap: spacing[4],
    padding: spacing[4],
  },
  sectionTitle: {
    color: colors.textPrimary,
    fontFamily: typography.fontFamily,
    fontSize: typography.h3,
    fontWeight: "800",
    lineHeight: 22,
  },
  titleList: {
    gap: spacing[1],
  },
  contentGroup: {
    gap: spacing[2],
  },
  subhead: {
    color: colors.textMuted,
    fontFamily: typography.fontFamily,
    fontSize: typography.caption,
    fontWeight: "800",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  bulletList: {
    gap: spacing[2],
  },
  bulletRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacing[2],
  },
  bullet: {
    color: colors.accent,
    fontFamily: typography.fontFamily,
    fontSize: typography.body,
    lineHeight: 23,
  },
  bodyText: {
    color: colors.textSecondary,
    flex: 1,
    fontFamily: typography.fontFamily,
    fontSize: typography.bodySmall,
    lineHeight: 21,
  },
  mutedText: {
    color: colors.textMuted,
    fontFamily: typography.fontFamily,
    fontSize: typography.bodySmall,
    lineHeight: 20,
  },
  emptyText: {
    color: colors.textMuted,
    fontFamily: typography.fontFamily,
    fontSize: typography.body,
    lineHeight: 23,
  },
});
