import type { ActivitySummary } from "@stay-focused/shared";
import { CalendarDays, CheckCircle2, ChevronLeft, ChevronRight } from "lucide-react-native";
import { useMemo, useRef, useState } from "react";
import { PanResponder, Pressable, View } from "react-native";

import { courseAccent, courseIdentity } from "../../design/courseIdentity";
import { CourseMark } from "../../design/CourseViews";
import { haptic } from "../../design/haptics";
import { Copy, RowLink, Surface } from "../../design/primitives";
import { useTheme } from "../../design/theme";
import { hitTarget, radius, spacing } from "../../design/tokens";
import { addDays, groupByDueDay, monthWeeks, sameMonth, shiftMonth, startOfDay, weekDays, weekLabel, WEEKDAY_LETTERS } from "./calendarPresentation";
import { localDate, timeLabel } from "./presentation";

const MAX_DOTS = 3;
const DAY_MS = 86_400_000;

function finished(item: ActivitySummary) {
  return item.status === "submitted" || item.status === "completed";
}

/**
 * Today's calendar, in the spirit of Canvas's To Do: a week strip (or the
 * whole month) with a dot per item due, in its course's color, and the
 * selected day's work listed below. Swipe the strip or use the arrows to move
 * between weeks; tap a day to see what is due.
 */
export function TodayCalendar({ items, onOpen }: { items: readonly ActivitySummary[]; onOpen: (item: ActivitySummary) => void }) {
  const { colors, mode } = useTheme();
  const today = startOfDay(new Date());
  const [selected, setSelected] = useState(() => localDate(today));
  const [anchor, setAnchor] = useState(today);
  const [month, setMonth] = useState(false);
  const byDay = useMemo(() => groupByDueDay(items), [items]);

  const move = (direction: 1 | -1) => {
    haptic.select();
    setAnchor((value) => (month ? shiftMonth(value, direction) : addDays(value, direction * 7)));
  };
  const moveRef = useRef(move);
  moveRef.current = move;
  const swipe = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_event, gesture) => Math.abs(gesture.dx) > 18 && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.8,
        onPanResponderTerminationRequest: () => true,
        onPanResponderRelease: (_event, gesture) => {
          if (gesture.dx < -48 || gesture.vx < -0.5) moveRef.current(1);
          else if (gesture.dx > 48 || gesture.vx > 0.5) moveRef.current(-1);
        },
      }),
    [],
  );
  const pick = (day: Date) => {
    const key = localDate(day);
    if (key !== selected) haptic.select();
    setSelected(key);
    if (month && !sameMonth(day, anchor)) setAnchor(new Date(day.getFullYear(), day.getMonth(), 1));
  };
  const jumpToday = () => {
    haptic.tap();
    setAnchor(today);
    setSelected(localDate(today));
  };

  const rows = month ? monthWeeks(anchor) : [weekDays(anchor)];
  const title = month
    ? anchor.toLocaleDateString([], { month: "long", year: "numeric" })
    : weekLabel(anchor, today);
  const showingToday = month ? sameMonth(anchor, today) : weekDays(anchor).some((day) => day.getTime() === today.getTime());
  const selectedDate = new Date(`${selected}T00:00:00`);
  const due = byDay.get(selected) ?? [];
  const dayTitle = selected === localDate(today)
    ? "Today"
    : selected === localDate(addDays(today, 1))
      ? "Tomorrow"
      : selectedDate.toLocaleDateString([], { weekday: "long", month: "short", day: "numeric" });

  const cell = (day: Date) => {
    const key = localDate(day);
    const isSelected = key === selected;
    const isToday = day.getTime() === today.getTime();
    const outside = month && !sameMonth(day, anchor);
    const list = byDay.get(key) ?? [];
    const dots = list.slice(0, MAX_DOTS);
    const past = day.getTime() < today.getTime();
    return (
      <Pressable
        key={key}
        accessibilityRole="button"
        accessibilityState={{ selected: isSelected }}
        accessibilityLabel={`${day.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" })}${isToday ? ", today" : ""}, ${list.length ? `${list.length} due` : "nothing due"}`}
        onPress={() => pick(day)}
        style={({ pressed }) => ({ flex: 1, alignItems: "center", gap: 4, paddingVertical: 4, opacity: pressed ? 0.6 : outside ? 0.4 : 1 })}
      >
        <View style={{ width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center", backgroundColor: isSelected ? colors.accent : isToday ? colors.blueSoft : "transparent" }}>
          <Copy size="bodySmall" color={isSelected ? colors.onAccent : isToday ? colors.accent : past ? colors.textMuted : colors.textPrimary} style={{ fontWeight: isSelected || isToday ? "700" : "500" }}>
            {day.getDate()}
          </Copy>
        </View>
        <View style={{ flexDirection: "row", gap: 3, height: 5 }}>
          {dots.map((item) => {
            const tone = item.course ? courseAccent(courseIdentity(item.course), mode).fg : colors.textMuted;
            return <View key={item.id} style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: tone, opacity: finished(item) ? 0.35 : 1 }} />;
          })}
        </View>
      </Pressable>
    );
  };

  return (
    <View style={{ gap: 8 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: spacing[1] }}>
        <Copy size="h2" style={{ flex: 1 }}>Calendar</Copy>
        {!showingToday ? (
          <Pressable accessibilityRole="button" onPress={jumpToday} hitSlop={6} style={({ pressed }) => ({ minHeight: hitTarget.min, justifyContent: "center", paddingHorizontal: spacing[2], opacity: pressed ? 0.55 : 1 })}>
            <Copy size="bodySmall" color={colors.accent} style={{ fontWeight: "600" }}>Today</Copy>
          </Pressable>
        ) : null}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={month ? "Show week" : "Show month"}
          onPress={() => {
            haptic.select();
            setMonth((value) => !value);
            setAnchor(month ? selectedDate : new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1));
          }}
          style={({ pressed }) => ({ minHeight: hitTarget.min, minWidth: hitTarget.min, alignItems: "center", justifyContent: "center", opacity: pressed ? 0.55 : 1 })}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: radius.pill, backgroundColor: month ? colors.blueSoft : colors.surfaceSecondary }}>
            <CalendarDays size={14} color={month ? colors.accent : colors.textSecondary} strokeWidth={2} />
            <Copy size="caption" color={month ? colors.accent : colors.textSecondary} style={{ fontWeight: "600" }}>Month</Copy>
          </View>
        </Pressable>
      </View>
      <Surface style={{ gap: spacing[2], paddingHorizontal: spacing[2] }}>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <Pressable accessibilityRole="button" accessibilityLabel={month ? "Previous month" : "Previous week"} onPress={() => move(-1)} hitSlop={6} style={({ pressed }) => ({ width: 40, height: 36, alignItems: "center", justifyContent: "center", opacity: pressed ? 0.5 : 1 })}>
            <ChevronLeft size={18} color={colors.textSecondary} strokeWidth={2} />
          </Pressable>
          <Copy size="bodySmall" style={{ flex: 1, textAlign: "center", fontWeight: "600" }}>{title}</Copy>
          <Pressable accessibilityRole="button" accessibilityLabel={month ? "Next month" : "Next week"} onPress={() => move(1)} hitSlop={6} style={({ pressed }) => ({ width: 40, height: 36, alignItems: "center", justifyContent: "center", opacity: pressed ? 0.5 : 1 })}>
            <ChevronRight size={18} color={colors.textSecondary} strokeWidth={2} />
          </Pressable>
        </View>
        <View {...swipe.panHandlers} style={{ gap: 2 }}>
          <View style={{ flexDirection: "row" }}>
            {WEEKDAY_LETTERS.map((letter, index) => (
              <Copy key={index} size="caption" color={colors.textMuted} style={{ flex: 1, textAlign: "center", fontWeight: "600", fontSize: 11 }}>{letter}</Copy>
            ))}
          </View>
          {rows.map((week) => (
            <View key={localDate(week[0]!)} style={{ flexDirection: "row" }}>{week.map(cell)}</View>
          ))}
        </View>
        <View style={{ height: 1, backgroundColor: colors.separator, marginHorizontal: spacing[2] }} />
        <View style={{ paddingHorizontal: spacing[2], gap: 2 }}>
          <View style={{ flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", paddingTop: spacing[1] }}>
            <Copy size="h3">{dayTitle}</Copy>
            <Copy muted size="caption">{due.length ? `${due.length} due` : ""}</Copy>
          </View>
          {due.length === 0 ? (
            <Copy muted size="bodySmall" style={{ paddingVertical: spacing[2] }}>Nothing due.</Copy>
          ) : (
            due.map((item) => <AgendaRow key={item.id} item={item} onPress={() => onOpen(item)} />)
          )}
        </View>
      </Surface>
    </View>
  );
}

function AgendaRow({ item, onPress }: { item: ActivitySummary; onPress: () => void }) {
  const { colors } = useTheme();
  const identity = item.course ? courseIdentity(item.course) : null;
  const done = finished(item);
  const overdue = !done && !!item.dueAt && Date.parse(item.dueAt) < Date.now();
  const soon = !done && !!item.dueAt && Date.parse(item.dueAt) - Date.now() < DAY_MS;
  return (
    <RowLink label={`${item.title}, ${identity?.title ?? "Personal"}, due ${timeLabel(item.dueAt)}${done ? ", submitted" : ""}`} onPress={onPress}
      icon={identity ? <CourseMark identity={identity} size={32} /> : undefined}
      trailing={done ? <CheckCircle2 size={18} color={colors.success} strokeWidth={2} /> : undefined}
    >
      <Copy size="bodySmall" numberOfLines={2} style={{ fontWeight: "600", ...(done ? { color: colors.textMuted, textDecorationLine: "line-through" } : {}) }}>{item.title}</Copy>
      <Copy size="caption" numberOfLines={1} color={overdue || soon ? colors.danger : colors.textSecondary}>
        {[overdue ? "Past due" : done ? (item.status === "submitted" ? "Submitted" : "Done") : `Due ${timeLabel(item.dueAt)}`, identity?.title ?? "Personal"].join(" · ")}
      </Copy>
    </RowLink>
  );
}
