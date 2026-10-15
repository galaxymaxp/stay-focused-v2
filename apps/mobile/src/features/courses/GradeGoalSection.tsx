import { useEffect, useMemo, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import type { GradeEstimate } from "@stay-focused/shared/grade-estimator";
import { sessionStore } from "../../auth/sessionStore";
import { Button } from "../../components/Button";
import { Card } from "../../components/Card";
import { TextField } from "../../components/TextField";
import { getApiBaseUrl } from "../../config/apiBaseUrl";
import { API_CONFIGURATION_MESSAGE } from "../../config/apiBaseUrlResolution";
import { useLegacyTheme, type LegacyColors } from "../../design/theme";
import { spacing, typography } from "../../design/tokens";
import { getCanvasCourseGradeEstimate } from "../../services/canvasApi";
import { formatDate, formatDateTime } from "./canvasGradePresentation";

interface Props {
  readonly courseId: string;
  readonly userId: string | null;
  readonly accessToken: string | null;
  readonly lastSyncedAt: string | null;
}

/** A labeled planning estimate; the official Canvas grade remains authoritative. */
export function GradeGoalSection({ courseId, userId, accessToken, lastSyncedAt }: Props) {
  const colors = useLegacyTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [target, setTarget] = useState("");
  const [result, setResult] = useState<GradeEstimate | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const edited = useRef(false);
  const request = useRef<AbortController | null>(null);
  const storageKey = userId ? `sf.grade-goal.v1.${userId}.${courseId}` : null;
  useEffect(() => {
    let active = true;
    if (storageKey) void Promise.resolve(sessionStore.getItem(storageKey)).then(saved => {
      if (active && !edited.current && saved !== null && /^\d+(?:\.\d)?$/.test(saved) && Number(saved) >= 1 && Number(saved) <= 100) setTarget(saved);
    }).catch(() => undefined);
    return () => { active = false; request.current?.abort(); request.current = null; };
  }, [storageKey]);

  const calculate = async () => {
    const value = target.trim();
    const targetPercent = Number(value);
    if (!/^\d+(?:\.\d)?$/.test(value) || targetPercent < 1 || targetPercent > 100) {
      setError("Enter a target between 1 and 100."); return;
    }
    const apiBaseUrl = getApiBaseUrl();
    if (!apiBaseUrl || !accessToken || !userId) {
      setError(!apiBaseUrl ? `App configuration error\n${API_CONFIGURATION_MESSAGE}` : "Sign in again to estimate this grade."); return;
    }
    request.current?.abort();
    const controller = new AbortController(); request.current = controller;
    setLoading(true); setError(null); setResult(null);
    try {
      if (storageKey) await Promise.resolve(sessionStore.setItem(storageKey, value)).catch(() => undefined);
      if (request.current !== controller) return;
      const response = await getCanvasCourseGradeEstimate({ apiBaseUrl, accessToken, courseId, targetPercent, signal: controller.signal });
      if (request.current !== controller) return;
      if (response.ok) setResult(response.data.estimate);
      else setError(response.error.message);
    } catch {
      if (request.current === controller) setError("Grade estimate could not be loaded. Try again.");
    } finally {
      if (request.current === controller) { request.current = null; setLoading(false); }
    }
  };

  return <Card style={styles.card} testID="grade-goal">
    <Text style={styles.title}>Grade goal</Text>
    <Text style={styles.secondary}>Planning estimate · Canvas&apos;s official grade remains authoritative.</Text>
    <TextField label="Target grade (%)" keyboardType="decimal-pad" value={target} testID="grade-goal-target" onChangeText={value => {
      edited.current = true; request.current?.abort(); request.current = null;
      setTarget(value); setResult(null); setError(null); setLoading(false);
    }} />
    <Button loading={loading} disabled={loading} onPress={() => void calculate()} testID="grade-goal-calculate">Calculate</Button>
    {loading ? <Text style={styles.secondary} accessibilityLiveRegion="polite">Calculating grade goal...</Text> : null}
    {error ? <View style={styles.needs} testID="grade-goal-error">
      <Text style={styles.secondary} accessibilityRole="alert">{error}</Text>
      <Button variant="secondary" onPress={() => void calculate()} testID="grade-goal-retry">Retry</Button>
    </View> : null}
    {result ? <View style={styles.needs} testID="grade-goal-result" accessibilityLiveRegion="polite">
      <Text style={styles.body}>{gradeGoalMessage(result)}</Text>
      {result.needs.map(need => <View key={need.assignmentId} style={styles.need}>
        <Text style={styles.body}>{need.title}</Text>
        {need.dueAt ? <Text style={styles.secondary}>Due {formatDate(need.dueAt)}</Text> : null}
        <Text style={styles.body}>{need.neededPoints} / {need.pointsPossible}</Text>
      </View>)}
      {result.warnings.dropRuleMessages?.map((message, index) => <Text key={index} style={styles.secondary}>{message}</Text>)}
      {result.warnings.hasDropRules && !result.warnings.dropRuleMessages ? <Text style={styles.secondary}>This estimate could not apply the course&apos;s drop rules.</Text> : null}
      {result.warnings.hiddenGradeCount > 0 ? <Text style={styles.secondary}>{result.warnings.hiddenGradeCount === 1
        ? "1 grade is hidden by your instructor and is treated as not yet graded."
        : `${result.warnings.hiddenGradeCount} grades are hidden by your instructor and are treated as not yet graded.`}</Text> : null}
      {result.warnings.differsFromCanvas ? <Text style={styles.secondary}>Canvas calculates this course a little differently. Treat this as a rough guide.</Text> : null}
    </View> : null}
    <Text style={styles.secondary}>Based on your synced Canvas grades.{lastSyncedAt ? ` Last synced ${formatDateTime(lastSyncedAt)}.` : ""}</Text>
  </Card>;
}

function gradeGoalMessage(result: GradeEstimate): string {
  switch (result.status) {
    case "secured": return `You'll reach ${result.targetPercent}% even if you score zero on the rest.`;
    case "reachable": return `Aim for about ${result.requiredPercent}% on each remaining activity.`;
    case "out_of_reach": return `Even with perfect scores, the highest you can reach is ${result.maximumFinalPercent}%.`;
    case "complete": return `Everything in this course is graded. Your grade is ${result.currentPercent}%.`;
    case "no_gradable_work": return "There's no graded work to estimate from yet.";
  }
}

const createStyles = (colors: LegacyColors) => StyleSheet.create({
  card: { gap: spacing[3] },
  title: { fontFamily: typography.fontFamily, fontSize: typography.h3, fontWeight: "700", color: colors.textPrimary },
  body: { fontFamily: typography.fontFamily, fontSize: typography.body, color: colors.textPrimary },
  secondary: { fontFamily: typography.fontFamily, fontSize: typography.bodySmall, lineHeight: 20, color: colors.textMuted },
  needs: { gap: spacing[2] },
  need: { gap: spacing[1] },
});
