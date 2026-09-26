import type { StudentAnnouncement, StudentAnnouncementList } from "@stay-focused/shared";
import { router, useLocalSearchParams } from "expo-router";
import { BookOpen, ExternalLink, Eye, EyeOff, Pin, PinOff, X } from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
import { Animated, Easing, Linking, Pressable, ScrollView, StatusBar, Vibration, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Action, Copy, DoneButton, Notice, Page, RowLink, Sheet, Surface, SkeletonCards } from "../../design/primitives";
import { SwipeRow, animateNextLayout, swipeAccessibility, type SwipeAction } from "../../design/SwipeRow";
import { useTheme } from "../../design/theme";
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
 * Pinned announcements first, hidden ones set aside (recoverable). Hiding is a
 * local reading preference; Canvas is never changed.
 */
export function useArrangedAnnouncements(items: readonly StudentAnnouncement[]) {
  const { prefs, pin, hide } = useListPreferences();
  const { reducedMotion } = useTheme();
  const arranged = arrangeList(items, (item) => item.id, prefs.pinned.announcement, prefs.hidden.announcements);
  const change = (update: () => void) => {
    animateNextLayout(reducedMotion);
    update();
  };
  return {
    ...arranged,
    isPinned: (id: string) => prefs.pinned.announcement.includes(id),
    setPinned: (id: string, pinned: boolean) => {
      if (pinned) Vibration.vibrate(8);
      change(() => pin("announcement", id, pinned));
    },
    setHidden: (id: string, hidden: boolean) => change(() => hide("announcements", id, hidden)),
  };
}

/**
 * One announcement row with the app's gesture language: swipe right to pin,
 * swipe left to hide, long press for every option (including Open in Canvas).
 * Screen readers get the same options as custom actions.
 */
export function AnnouncementItem({
  item,
  pinned,
  hidden = false,
  onPin,
  onHide,
  preview = false,
  background,
}: {
  item: StudentAnnouncement;
  pinned: boolean;
  hidden?: boolean;
  onPin: (pinned: boolean) => void;
  onHide: (hidden: boolean) => void;
  preview?: boolean;
  background?: string;
}) {
  const { colors } = useTheme();
  const [options, setOptions] = useState(false);
  const leading: SwipeAction[] = hidden ? [] : [{ key: "pin", label: pinned ? "Unpin" : "Pin", icon: pinned ? PinOff : Pin, tone: "accent", onPress: () => onPin(!pinned) }];
  const trailing: SwipeAction[] = hidden
    ? [{ key: "show", label: "Show", icon: Eye, tone: "neutral", onPress: () => onHide(false) }]
    : [{ key: "hide", label: "Hide", icon: EyeOff, tone: "neutral", exits: true, onPress: () => onHide(true) }];
  const canvas = item.htmlUrl
    ? [{ key: "canvas", label: "Open in Canvas", icon: ExternalLink, tone: "neutral" as const, onPress: () => void Linking.openURL(item.htmlUrl!) }]
    : [];
  return (
    <>
      <SwipeRow fullSwipe leading={leading} trailing={trailing} background={background}>
        <RowLink
          label={`Read announcement: ${item.title}${pinned ? ", pinned" : ""}`}
          onPress={() => openAnnouncement(item.id)}
          onLongPress={() => {
            Vibration.vibrate(10);
            setOptions(true);
          }}
          {...swipeAccessibility([...leading, ...trailing, ...canvas])}
          trailing={pinned ? <Pin size={14} color={colors.textMuted} strokeWidth={1.8} style={{ transform: [{ rotate: "35deg" }] }} /> : undefined}
        >
          <Copy muted size="caption">{announcementCourseLabel(item)} · {formatAnnouncementDate(item.postedAt)}</Copy>
          <Copy size="h3">{item.title}</Copy>
          {preview && item.preview ? <Copy muted size="bodySmall" numberOfLines={3}>{item.preview}</Copy> : null}
        </RowLink>
      </SwipeRow>
      {options ? (
        <Sheet title={item.title} onClose={() => setOptions(false)}>
          <OptionRow icon={BookOpen} label="Read announcement" onPress={() => { setOptions(false); openAnnouncement(item.id); }} />
          {item.htmlUrl ? <OptionRow icon={ExternalLink} label="Open in Canvas" onPress={() => { setOptions(false); void Linking.openURL(item.htmlUrl!); }} /> : null}
          {!hidden ? <OptionRow icon={pinned ? PinOff : Pin} label={pinned ? "Unpin" : "Pin to top"} onPress={() => { setOptions(false); onPin(!pinned); }} /> : null}
          <OptionRow icon={hidden ? Eye : EyeOff} label={hidden ? "Show again" : "Hide"} onPress={() => { setOptions(false); onHide(!hidden); }} />
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
  const [showHidden, setShowHidden] = useState(false);
  const { colors, mode } = useTheme();
  const card = mode === "dark" ? colors.surfacePrimary : colors.surfaceElevated;
  const visible = [...arranged.pinned, ...arranged.rest];

  return (
    <Page
      back
      title="Announcements"
      subtitle="Updates from your Canvas courses"
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
        <View style={{ gap: 12 }}>
          {visible.map(item => (
            <Surface key={item.id} style={{ padding: 0, overflow: "hidden" }}>
              <View style={{ padding: 12 }}>
                <AnnouncementItem
                  item={item}
                  preview
                  background={card}
                  pinned={arranged.isPinned(item.id)}
                  onPin={(pinned) => arranged.setPinned(item.id, pinned)}
                  onHide={(hidden) => arranged.setHidden(item.id, hidden)}
                />
              </View>
            </Surface>
          ))}
          {visible.length === 0 ? <Copy muted size="bodySmall">All announcements are hidden.</Copy> : null}
          {arranged.hidden.length > 0 ? (
            <Action secondary onPress={() => setShowHidden((value) => !value)}>
              {showHidden ? "Done" : `Show ${arranged.hidden.length} hidden`}
            </Action>
          ) : null}
          {showHidden
            ? arranged.hidden.map((item) => (
                <Surface key={item.id} style={{ opacity: 0.65 }}>
                  <AnnouncementItem item={item} hidden pinned={false} background={card} onPin={() => {}} onHide={(hidden) => arranged.setHidden(item.id, hidden)} />
                </Surface>
              ))
            : null}
          <Copy muted size="caption" style={{ textAlign: "center" }}>Swipe right to pin, left to hide. Touch and hold for more.</Copy>
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
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const rise = useRef(new Animated.Value(reducedMotion ? 0 : 1)).current;
  const closing = useRef(false);
  useEffect(() => {
    if (reducedMotion) return;
    Animated.timing(rise, { toValue: 0, duration: 280, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [reducedMotion, rise]);
  const close = () => {
    if (closing.current) return;
    closing.current = true;
    if (router.canGoBack()) router.back();
    else router.replace("/today");
  };

  return (
    <View style={{ flex: 1, justifyContent: "flex-end" }}>
      <StatusBar barStyle="light-content" />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Close announcement"
        testID="announcement-backdrop"
        onPress={close}
        style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0, backgroundColor: "rgba(0,0,0,0.42)" }}
      />
      <Animated.View
        accessibilityViewIsModal
        style={{
          maxHeight: height - insets.top - spacing[6],
          minHeight: Math.min(360, height * 0.5),
          backgroundColor: colors.surfaceElevated,
          borderTopLeftRadius: radius.page,
          borderTopRightRadius: radius.page,
          paddingBottom: insets.bottom,
          transform: [{ translateY: rise.interpolate({ inputRange: [0, 1], outputRange: [0, height * 0.6] }) }],
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
            onPress={close}
            hitSlop={6}
            style={({ pressed }) => ({ width: hitTarget.min, height: hitTarget.min, alignItems: "center", justifyContent: "center", opacity: pressed ? 0.55 : 1 })}
          >
            <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: colors.surfaceSecondary, alignItems: "center", justifyContent: "center" }}>
              <X size={16} color={colors.textSecondary} strokeWidth={2.2} />
            </View>
          </Pressable>
          <Copy muted size="caption" numberOfLines={1} style={{ flex: 1, textAlign: "center" }}>{announcement ? announcementCourseLabel(announcement) : "Announcement"}</Copy>
          <DoneButton onPress={close} />
        </View>
        <ScrollView style={{ flexShrink: 1 }} contentContainerStyle={{ padding: spacing[5], gap: spacing[3], paddingBottom: spacing[6] }}>
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
