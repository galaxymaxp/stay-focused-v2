import type { StudentAnnouncement, StudentAnnouncementList } from "@stay-focused/shared";
import { router, useLocalSearchParams } from "expo-router";
import { BookOpen, ExternalLink, Mail, MailOpen, Pin, PinOff, X } from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
import { Animated, BackHandler, Easing, Linking, Pressable, ScrollView, StatusBar, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Action, Copy, DoneButton, Notice, Page, RowLink, Sheet, Surface, SkeletonCards } from "../../design/primitives";
import { SwipeRow, animateNextLayout, swipeAccessibility, type SwipeAction } from "../../design/SwipeRow";
import { useSheetDrag } from "../../design/sheetDrag";
import { motion, useTheme } from "../../design/theme";
import { hitTarget, radius, spacing } from "../../design/tokens";
import { arrangeList } from "../redesign/listPreferences";
import { useExperience } from "../redesign/useExperience";
import { useListPreferences } from "../redesign/useListPreferences";
import { announcementCourseLabel, formatAnnouncementDate } from "./announcementPresentation";

export const ANNOUNCEMENT_LIST_PATH = "/api/experience/announcements?limit=100";

export function openAnnouncement(id: string) {
  router.push({ pathname: "/announcement", params: { id } });
}

/**
 * Announcements are read or unread, like mail; nothing is hidden. Read state
 * is a local reading preference (Canvas is never changed), pinned ones come
 * first, and ones hidden in an earlier version simply count as read.
 */
export function useArrangedAnnouncements(items: readonly StudentAnnouncement[]) {
  const { prefs, pin, markRead } = useListPreferences();
  const { reducedMotion } = useTheme();
  const read = new Set([...prefs.read.announcements, ...prefs.hidden.announcements]);
  const arranged = arrangeList(items, (item) => item.id, prefs.pinned.announcement, []);
  const ordered = [...arranged.pinned, ...arranged.rest];
  const change = (update: () => void) => {
    animateNextLayout(reducedMotion);
    update();
  };
  return {
    unread: ordered.filter((item) => !read.has(item.id)),
    read: ordered.filter((item) => read.has(item.id)),
    isRead: (id: string) => read.has(id),
    isPinned: (id: string) => prefs.pinned.announcement.includes(id),
    setPinned: (id: string, pinned: boolean) => {
      change(() => pin("announcement", id, pinned));
    },
    setRead: (id: string, value: boolean) => change(() => markRead(id, value)),
  };
}

/**
 * One announcement row with the app's gesture language: swipe right to pin,
 * swipe left to mark read (or unread), long press for every option including
 * Open in Canvas. Opening it marks it read. Screen readers get the same
 * options as custom actions.
 */
export function AnnouncementItem({
  item,
  pinned,
  read,
  onPin,
  onRead,
  preview = false,
  background,
  leaveWhenRead = false,
}: {
  item: StudentAnnouncement;
  pinned: boolean;
  read: boolean;
  onPin: (pinned: boolean) => void;
  onRead: (read: boolean) => void;
  preview?: boolean;
  background?: string;
  /** On lists that only show unread items, marking read slides the row away. */
  leaveWhenRead?: boolean;
}) {
  const { colors } = useTheme();
  const [options, setOptions] = useState(false);
  const leading: SwipeAction[] = [{ key: "pin", label: pinned ? "Unpin" : "Pin", icon: pinned ? PinOff : Pin, tone: "accent", onPress: () => onPin(!pinned) }];
  const trailing: SwipeAction[] = [
    read
      ? { key: "unread", label: "Unread", icon: Mail, tone: "neutral", onPress: () => onRead(false) }
      : { key: "read", label: "Read", icon: MailOpen, tone: "neutral", exits: leaveWhenRead, onPress: () => onRead(true) },
  ];
  const canvas = item.htmlUrl
    ? [{ key: "canvas", label: "Open in Canvas", icon: ExternalLink, tone: "neutral" as const, onPress: () => void Linking.openURL(item.htmlUrl!) }]
    : [];
  const open = () => {
    if (!read) onRead(true);
    openAnnouncement(item.id);
  };
  return (
    <>
      <SwipeRow fullSwipe leading={leading} trailing={trailing} background={background}>
        <RowLink
          label={`${read ? "" : "Unread: "}${item.title}${pinned ? ", pinned" : ""}`}
          onPress={open}
          onLongPress={() => {
            setOptions(true);
          }}
          {...swipeAccessibility([...leading, ...trailing, ...canvas])}
          icon={<View testID={read ? "announcement-read" : "announcement-unread"} style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: read ? "transparent" : colors.accent }} />}
          trailing={pinned ? <Pin size={14} color={colors.textMuted} strokeWidth={1.8} style={{ transform: [{ rotate: "35deg" }] }} /> : undefined}
        >
          <Copy muted size="caption">{announcementCourseLabel(item)} · {formatAnnouncementDate(item.postedAt)}</Copy>
          <Copy size="h3" color={read ? colors.textSecondary : colors.textPrimary} style={{ fontWeight: read ? "400" : "600" }}>{item.title}</Copy>
          {preview && item.preview ? <Copy muted size="bodySmall" numberOfLines={3}>{item.preview}</Copy> : null}
        </RowLink>
      </SwipeRow>
      {options ? (
        <Sheet title={item.title} onClose={() => setOptions(false)}>
          <OptionRow icon={BookOpen} label="Read announcement" onPress={() => { setOptions(false); open(); }} />
          {item.htmlUrl ? <OptionRow icon={ExternalLink} label="Open in Canvas" onPress={() => { setOptions(false); void Linking.openURL(item.htmlUrl!); }} /> : null}
          <OptionRow icon={pinned ? PinOff : Pin} label={pinned ? "Unpin" : "Pin to top"} onPress={() => { setOptions(false); onPin(!pinned); }} />
          <OptionRow icon={read ? Mail : MailOpen} label={read ? "Mark as unread" : "Mark as read"} onPress={() => { setOptions(false); onRead(!read); }} />
        </Sheet>
      ) : null}
    </>
  );
}

function OptionRow({ icon: Icon, label, onPress }: { icon: typeof Pin; label: string; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <RowLink label={label} onPress={onPress} trailing={null} icon={<Icon size={18} color={colors.accent} strokeWidth={1.8} />}>
      <Copy>{label}</Copy>
    </RowLink>
  );
}

export function AnnouncementsScreen() {
  const announcements = useExperience<StudentAnnouncementList>(ANNOUNCEMENT_LIST_PATH);
  const arranged = useArrangedAnnouncements(announcements.data?.items ?? []);
  const { colors, mode } = useTheme();
  const card = mode === "dark" ? colors.surfacePrimary : colors.surfaceElevated;
  const section = (title: string, items: readonly StudentAnnouncement[]) =>
    items.length ? (
      <View style={{ gap: 12 }}>
        <Copy muted size="caption" style={{ fontWeight: "600", letterSpacing: 0.4, textTransform: "uppercase" }}>{title}</Copy>
        {items.map((item) => (
          <Surface key={item.id} style={{ padding: 0, overflow: "hidden" }}>
            <View style={{ padding: 12 }}>
              <AnnouncementItem
                item={item}
                preview
                background={card}
                read={arranged.isRead(item.id)}
                pinned={arranged.isPinned(item.id)}
                onPin={(pinned) => arranged.setPinned(item.id, pinned)}
                onRead={(read) => arranged.setRead(item.id, read)}
              />
            </View>
          </Surface>
        ))}
      </View>
    ) : null;

  return (
    <Page
      back
      title="Announcements"
      subtitle={arranged.unread.length ? `${arranged.unread.length} unread` : "Updates from your Canvas courses"}
      onRefresh={announcements.refresh}
    >
      {announcements.loading && !announcements.data ? (
        <SkeletonCards rows={4} label="Loading announcements" />
      ) : announcements.error && !announcements.data ? (
        <Surface>
          <Copy size="h2">Announcements unavailable</Copy>
          <Copy muted>We could not load Canvas announcements right now.</Copy>
          <Action secondary onPress={announcements.refresh}>Try again</Action>
        </Surface>
      ) : announcements.data?.items.length ? (
        <View style={{ gap: 20 }}>
          {section("Unread", arranged.unread)}
          {section("Read", arranged.read)}
        </View>
      ) : (
        <Surface>
          <Copy size="h2">No announcements</Copy>
          <Copy muted>New Canvas course updates will appear here after your next sync.</Copy>
        </Surface>
      )}
    </Page>
  );
}

/**
 * Announcement detail is a sheet over whatever opened it. It can always be
 * dismissed without leaving the app: the close button, Done, tapping the dimmed
 * backdrop, Android back and the modal gesture all close it. Opening Canvas is
 * a separate, secondary action.
 */
export function AnnouncementDetailScreen() {
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const announcements = useExperience<StudentAnnouncementList>(ANNOUNCEMENT_LIST_PATH);
  const announcement = announcements.data?.items.find(item => item.id === id) ?? null;
  const { colors, reducedMotion } = useTheme();
  const { markRead } = useListPreferences();
  // Opening an announcement, from anywhere, reads it.
  useEffect(() => {
    if (id) markRead(id, true);
  }, [id, markRead]);
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const rise = useRef(new Animated.Value(reducedMotion ? 0 : 1)).current;
  const closing = useRef(false);
  const tint = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(tint, { toValue: 1, duration: 260, easing: Easing.out(Easing.quad), useNativeDriver: true }).start();
    if (reducedMotion) return;
    Animated.spring(rise, { toValue: 0, ...motion.sheet, useNativeDriver: true }).start();
  }, [reducedMotion, rise, tint]);
  const close = (from = 0) => {
    if (closing.current) return;
    closing.current = true;
    if (from > 0) rise.setValue(Math.min(1, from / (height * 0.6)));
    const leave = () => (router.canGoBack() ? router.back() : router.replace("/today"));
    Animated.parallel([
      Animated.timing(tint, { toValue: 0, duration: 200, easing: Easing.in(Easing.quad), useNativeDriver: true }),
      Animated.timing(rise, { toValue: reducedMotion ? 0 : 1, duration: 220, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
    ]).start(leave);
  };
  const pull = useSheetDrag(close);

  // Android back plays the same exit as the close button.
  useEffect(() => {
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      close();
      return true;
    });
    return () => subscription.remove();
  });
  return (
    <View style={{ flex: 1, justifyContent: "flex-end" }}>
      <StatusBar barStyle="light-content" />
      <Animated.View style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0, backgroundColor: "rgba(0,0,0,0.42)", opacity: tint }}>
        <Pressable accessibilityRole="button" accessibilityLabel="Close announcement" testID="announcement-backdrop" onPress={() => close()} style={{ flex: 1 }} />
      </Animated.View>
      <Animated.View
        accessibilityViewIsModal
        {...pull.panHandlers}
        style={{
          maxHeight: height - insets.top - spacing[6],
          minHeight: Math.min(360, height * 0.5),
          backgroundColor: colors.surfaceElevated,
          borderTopLeftRadius: radius.page,
          borderTopRightRadius: radius.page,
          paddingBottom: insets.bottom,
          transform: [{ translateY: Animated.add(rise.interpolate({ inputRange: [0, 1], outputRange: [0, height * 0.6] }), pull.drag) }],
        }}
      >
        <View style={{ alignItems: "center", paddingTop: spacing[2] }}>
          <View style={{ width: 36, height: 5, borderRadius: 3, backgroundColor: colors.separator }} />
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", paddingLeft: spacing[2], paddingRight: spacing[2], minHeight: hitTarget.min, borderBottomWidth: 1, borderColor: colors.separator }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close"
            testID="announcement-close"
            onPress={() => close()}
            hitSlop={6}
            style={({ pressed }) => ({ width: hitTarget.min, height: hitTarget.min, alignItems: "center", justifyContent: "center", opacity: pressed ? 0.55 : 1 })}
          >
            <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: colors.surfaceSecondary, alignItems: "center", justifyContent: "center" }}>
              <X size={16} color={colors.textSecondary} strokeWidth={2.2} />
            </View>
          </Pressable>
          <Copy muted size="caption" numberOfLines={1} style={{ flex: 1, textAlign: "center" }}>{announcement ? announcementCourseLabel(announcement) : "Announcement"}</Copy>
          <DoneButton onPress={() => close()} />
        </View>
        <ScrollView style={{ flexShrink: 1 }} onScroll={pull.onScroll} scrollEventThrottle={16} alwaysBounceVertical={false} contentContainerStyle={{ padding: spacing[5], gap: spacing[3], paddingBottom: spacing[6] }}>
          {announcement ? (
            <AnnouncementBody announcement={announcement} />
          ) : announcements.loading ? (
            <SkeletonCards rows={1} label="Loading announcement" />
          ) : (
            <Surface>
              <Copy size="h3">This announcement is unavailable</Copy>
              <Copy muted>It may have been removed from Canvas since your last sync.</Copy>
            </Surface>
          )}
        </ScrollView>
        {announcement?.htmlUrl ? (
          <View style={{ paddingHorizontal: spacing[5], paddingTop: spacing[2], paddingBottom: spacing[2], borderTopWidth: 1, borderColor: colors.separator }}>
            <Pressable
              accessibilityRole="link"
              accessibilityLabel="Open in Canvas"
              onPress={() => void Linking.openURL(announcement.htmlUrl!)}
              style={({ pressed }) => ({ minHeight: hitTarget.min, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing[2], borderRadius: 12, backgroundColor: pressed ? colors.surfaceSecondary : "transparent" })}
            >
              <ExternalLink size={16} color={colors.accent} />
              <Copy color={colors.accent} style={{ fontWeight: "600" }}>Open in Canvas</Copy>
            </Pressable>
          </View>
        ) : null}
      </Animated.View>
    </View>
  );
}

function AnnouncementBody({ announcement }: { readonly announcement: StudentAnnouncement }) {
  const resources = [...announcement.attachments, ...announcement.links];
  return (
    <>
      <Copy size="h1" style={{ fontSize: 24, lineHeight: 31 }}>{announcement.title}</Copy>
      <Copy muted size="caption">
        {formatAnnouncementDate(announcement.postedAt)}
        {announcement.authorName ? ` · ${announcement.authorName}` : ""}
      </Copy>
      {announcement.body ? (
        <View style={{ gap: 10, marginTop: spacing[2] }}>
          {announcement.body.split(/\n{2,}/).map((paragraph, index) => (
            <Copy key={`${index}-${paragraph.slice(0, 20)}`} style={{ fontSize: 16, lineHeight: 25 }}>{paragraph}</Copy>
          ))}
        </View>
      ) : (
        <Notice>Announcement body unavailable.</Notice>
      )}
      {resources.length ? (
        <View style={{ gap: 8, marginTop: spacing[3] }}>
          <Copy size="h3">Links and attachments</Copy>
          {resources.map(resource => (
            <RowLink
              key={resource.url}
              label={`Open ${resource.label}`}
              onPress={() => void Linking.openURL(resource.url)}
            >
              <Copy>{resource.label}</Copy>
            </RowLink>
          ))}
        </View>
      ) : null}
    </>
  );
}
