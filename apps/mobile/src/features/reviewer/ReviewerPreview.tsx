import type {
  CoverageStatus,
  GroundingReportStatus,
  ReviewerOutput,
  ReviewerSection,
  SectionOutput,
} from "@stay-focused/engine";
import { StyleSheet, Text, View } from "react-native";

import { Card } from "../../components/Card";
import { colors, radius, spacing, typography } from "../../design/tokens";

interface ReviewerPreviewProps {
  readonly reviewer: ReviewerOutput;
}

type ReviewStatus = CoverageStatus | GroundingReportStatus | "failed";

export function ReviewerPreview({ reviewer }: ReviewerPreviewProps) {
  const sectionCount = reviewer.sections.length;
  const sourceTitle = reviewer.metadata.sourceTitle.trim();

  return (
    <View style={styles.previewStack}>
      <Card elevated style={styles.headerCard}>
        <View style={styles.header}>
          <Text style={styles.kicker}>Reviewer Ready</Text>
          <Text style={styles.title}>
            {formatTitle(reviewer.title, "Untitled reviewer")}
          </Text>
          <View style={styles.metaStack}>
            <Text style={styles.meta}>{formatSectionCount(sectionCount)}</Text>
            {sourceTitle ? (
              <Text style={styles.meta}>Source: {sourceTitle}</Text>
            ) : null}
          </View>
        </View>

        <View style={styles.statusGrid}>
          <StatusPill
            label="Source-faithful"
            status={reviewer.metadata.groundingStatus}
          />
          <StatusPill
            label="Coverage"
            status={reviewer.metadata.coverageStatus}
          />
          <StatusPill
            label="Clean output"
            status={reviewer.metadata.leakageStatus}
          />
        </View>
      </Card>

      {sectionCount > 0 ? (
        <View style={styles.sectionList}>
          {reviewer.sections.map((section, index) => (
            <SectionPreview
              key={section.id}
              section={section}
              sectionNumber={index + 1}
            />
          ))}
        </View>
      ) : (
        <Card style={styles.emptyCard}>
          <Text style={styles.emptyText}>No sections were returned.</Text>
        </Card>
      )}
    </View>
  );
}

function StatusPill({
  label,
  status,
}: {
  readonly label: string;
  readonly status: ReviewStatus;
}) {
  return (
    <View style={[styles.statusPill, getStatusPillStyle(status)]}>
      <Text style={styles.statusLabel}>{label}</Text>
      <Text style={styles.statusValue}>{formatStatus(status)}</Text>
    </View>
  );
}

function SectionPreview({
  section,
  sectionNumber,
}: {
  readonly section: ReviewerSection;
  readonly sectionNumber: number;
}) {
  const itemCount = section.items.length;

  return (
    <Card style={styles.sectionCard}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionNumberBadge}>
          <Text style={styles.sectionNumber}>{sectionNumber}</Text>
        </View>

        <View style={styles.sectionHeading}>
          <Text style={styles.sectionTitle}>
            {formatTitle(section.title, "Untitled section")}
          </Text>
          <Text style={styles.sectionMeta}>{formatItemCount(itemCount)}</Text>
        </View>
      </View>

      <View style={styles.sectionStatusRow}>
        <CompactStatus label="Coverage" status={section.coverageStatus} />
        <CompactStatus label="Source" status={section.groundingStatus} />
        <CompactStatus label="Clean" status={section.leakageStatus} />
      </View>

      {itemCount > 0 ? (
        <View style={styles.itemList}>
          {section.items.map((item, index) => (
            <StudyCard
              key={`${section.id}-item-${item.id}`}
              item={item}
              itemNumber={index + 1}
            />
          ))}
        </View>
      ) : (
        <Text style={styles.mutedText}>
          No study cards were generated for this section.
        </Text>
      )}
    </Card>
  );
}

function CompactStatus({
  label,
  status,
}: {
  readonly label: string;
  readonly status: ReviewStatus;
}) {
  return (
    <View style={styles.compactStatus}>
      <Text style={styles.compactStatusLabel}>{label}</Text>
      <Text style={styles.compactStatusValue}>{formatStatus(status)}</Text>
    </View>
  );
}

function StudyCard({
  item,
  itemNumber,
}: {
  readonly item: SectionOutput;
  readonly itemNumber: number;
}) {
  const title = formatTitle(item.title, `Study card ${itemNumber}`);
  const explanation = item.sourceCore.explanation.trim();
  const keyPoints = item.sourceCore.keyPoints
    .map((point) => point.trim())
    .filter((point) => point.length > 0);
  const showExplanation = shouldShowExplanation(title, explanation, keyPoints);

  return (
    <View style={styles.studyCard}>
      <View style={styles.studyCardHeader}>
        <Text style={styles.kicker}>Study card {itemNumber}</Text>
        <Text style={styles.itemTitle}>{title}</Text>
      </View>

      {showExplanation ? (
        <Text style={styles.explanationText}>{explanation}</Text>
      ) : null}

      <View style={styles.keyPointGroup}>
        {keyPoints.length > 0 ? (
          <View style={styles.bulletList}>
            {keyPoints.map((point, index) => (
              <View key={`${item.id}-point-${index}`} style={styles.bulletRow}>
                <Text style={styles.bullet}>-</Text>
                <Text style={styles.bodyText}>{point}</Text>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.mutedText}>
            No key points generated for this card.
          </Text>
        )}
      </View>
    </View>
  );
}

function formatTitle(value: string, fallback: string): string {
  const title = value.trim();
  return title.length > 0 ? title : fallback;
}

function formatSectionCount(sectionCount: number): string {
  return `${sectionCount} ${sectionCount === 1 ? "section" : "sections"}`;
}

function formatItemCount(itemCount: number): string {
  return `${itemCount} ${itemCount === 1 ? "card" : "cards"}`;
}

function formatStatus(status: ReviewStatus): string {
  switch (status) {
    case "passed":
      return "Passed";
    case "weak":
      return "Needs review";
    case "failed":
      return "Failed";
  }
}

function getStatusPillStyle(status: ReviewStatus) {
  switch (status) {
    case "passed":
      return styles.statusPassed;
    case "weak":
      return styles.statusWeak;
    case "failed":
      return styles.statusFailed;
  }
}

function shouldShowExplanation(
  title: string,
  explanation: string,
  keyPoints: readonly string[],
): boolean {
  if (explanation.length === 0) {
    return false;
  }

  const normalizedExplanation = normalizeForComparison(explanation);
  const duplicatesTitle = normalizedExplanation === normalizeForComparison(title);
  const duplicatesOnlyKeyPoint =
    keyPoints.length === 1 &&
    normalizedExplanation === normalizeForComparison(keyPoints[0] ?? "");

  return !(duplicatesTitle && duplicatesOnlyKeyPoint);
}

function normalizeForComparison(value: string): string {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

const styles = StyleSheet.create({
  previewStack: {
    gap: spacing[5],
  },
  headerCard: {
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
  metaStack: {
    gap: spacing[1],
  },
  statusGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing[2],
  },
  statusPill: {
    borderRadius: radius.control,
    borderWidth: 1,
    flexGrow: 1,
    gap: spacing[1],
    minWidth: 128,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
  },
  statusPassed: {
    backgroundColor: colors.successSurface,
    borderColor: colors.success,
  },
  statusWeak: {
    backgroundColor: "rgba(245, 166, 35, 0.13)",
    borderColor: colors.accent,
  },
  statusFailed: {
    backgroundColor: colors.errorSurface,
    borderColor: colors.error,
  },
  statusLabel: {
    color: colors.textMuted,
    fontFamily: typography.fontFamily,
    fontSize: typography.kicker,
    fontWeight: "800",
  },
  statusValue: {
    color: colors.textPrimary,
    fontFamily: typography.fontFamily,
    fontSize: typography.bodySmall,
    fontWeight: "800",
  },
  sectionList: {
    gap: spacing[4],
  },
  sectionCard: {
    gap: spacing[4],
  },
  sectionHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacing[3],
  },
  sectionNumberBadge: {
    alignItems: "center",
    backgroundColor: colors.accent,
    borderRadius: radius.pill,
    height: 30,
    justifyContent: "center",
    width: 30,
  },
  sectionNumber: {
    color: colors.accentText,
    fontFamily: typography.fontFamily,
    fontSize: typography.bodySmall,
    fontWeight: "900",
  },
  sectionHeading: {
    flex: 1,
    gap: spacing[1],
  },
  sectionTitle: {
    color: colors.textPrimary,
    fontFamily: typography.fontFamily,
    fontSize: typography.h3,
    fontWeight: "800",
    lineHeight: 22,
  },
  sectionMeta: {
    color: colors.textMuted,
    fontFamily: typography.fontFamily,
    fontSize: typography.bodySmall,
    lineHeight: 19,
  },
  sectionStatusRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing[2],
  },
  compactStatus: {
    backgroundColor: colors.cardElevated,
    borderColor: colors.border,
    borderRadius: radius.tight,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing[2],
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
  },
  compactStatusLabel: {
    color: colors.textMuted,
    fontFamily: typography.fontFamily,
    fontSize: typography.kicker,
    fontWeight: "800",
  },
  compactStatusValue: {
    color: colors.textSecondary,
    fontFamily: typography.fontFamily,
    fontSize: typography.kicker,
    fontWeight: "800",
  },
  itemList: {
    borderTopColor: colors.border,
    borderTopWidth: 1,
  },
  studyCard: {
    gap: spacing[3],
    paddingVertical: spacing[4],
  },
  studyCardHeader: {
    gap: spacing[1],
  },
  itemTitle: {
    color: colors.textPrimary,
    fontFamily: typography.fontFamily,
    fontSize: typography.body,
    fontWeight: "800",
    lineHeight: 22,
  },
  explanationText: {
    color: colors.textSecondary,
    fontFamily: typography.fontFamily,
    fontSize: typography.bodySmall,
    lineHeight: 21,
  },
  keyPointGroup: {
    gap: spacing[2],
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
  emptyCard: {
    gap: spacing[2],
  },
});
