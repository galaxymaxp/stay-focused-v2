import type { StudentAnnouncement, StudentAnnouncementList } from "@stay-focused/shared";
import { router, useLocalSearchParams } from "expo-router";
import { ExternalLink } from "lucide-react-native";
import { Linking, Pressable, ScrollView, StatusBar, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Action, Copy, DoneButton, Notice, Page, RowLink, Surface } from "../../design/primitives";
import { useTheme } from "../../design/theme";
import { hitTarget, spacing } from "../../design/tokens";
import { useExperience } from "../redesign/useExperience";
import { announcementCourseLabel, formatAnnouncementDate } from "./announcementPresentation";

export const ANNOUNCEMENT_LIST_PATH = "/api/experience/announcements?limit=100";

export function openAnnouncement(id: string) {
  router.push({ pathname: "/announcement", params: { id } });
}

export function AnnouncementsScreen() {
  const announcements = useExperience<StudentAnnouncementList>(ANNOUNCEMENT_LIST_PATH);

  return (
    <Page
      back
      title="Announcements"
      subtitle="Updates from your Canvas courses"
      onRefresh={announcements.refresh}
    >
      {announcements.loading && !announcements.data ? (
        <Notice>Loading announcements...</Notice>
      ) : announcements.error && !announcements.data ? (
        <Surface>
          <Copy size="h2">Announcements unavailable</Copy>
          <Copy muted>We could not load Canvas announcements right now.</Copy>
          <Action secondary onPress={announcements.refresh}>Try again</Action>
        </Surface>
      ) : announcements.data?.items.length ? (
        <View style={{ gap: 12 }}>
          {announcements.data.items.map(item => (
            <Surface key={item.id}>
              <RowLink
                inset
                label={`Read announcement: ${item.title}`}
                onPress={() => openAnnouncement(item.id)}
              >
                <Copy muted size="caption">{announcementCourseLabel(item)} · {formatAnnouncementDate(item.postedAt)}</Copy>
                <Copy size="h3">{item.title}</Copy>
                {item.preview ? <Copy muted size="bodySmall">{item.preview}</Copy> : null}
              </RowLink>
            </Surface>
          ))}
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
 * Announcement detail is contextual, so it is presented modally. Dismissal is
 * always local and always visible: Done in the top bar, Android back, and the
 * modal gesture all close it. Opening Canvas is a separate, secondary action.
 */
export function AnnouncementDetailScreen() {
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const announcements = useExperience<StudentAnnouncementList>(ANNOUNCEMENT_LIST_PATH);
  const announcement = announcements.data?.items.find(item => item.id === id) ?? null;
  const { colors, mode } = useTheme();
  const close = () => (router.canGoBack() ? router.back() : router.replace("/today"));

  return (
    <SafeAreaView edges={["top", "left", "right", "bottom"]} style={{ flex: 1, backgroundColor: colors.surfaceElevated }}>
      <StatusBar barStyle={mode === "dark" ? "light-content" : "dark-content"} />
      <View style={{ flexDirection: "row", alignItems: "center", paddingLeft: spacing[5], paddingRight: spacing[2], minHeight: hitTarget.min + 8, borderBottomWidth: 1, borderColor: colors.separator }}>
        <Copy muted size="caption" style={{ flex: 1 }}>{announcement ? announcementCourseLabel(announcement) : "Announcement"}</Copy>
        <DoneButton onPress={close} />
      </View>
      <ScrollView contentContainerStyle={{ padding: spacing[5], gap: spacing[3], paddingBottom: spacing[8] }}>
        {announcement ? (
          <AnnouncementBody announcement={announcement} />
        ) : announcements.loading ? (
          <Notice>Loading announcement…</Notice>
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
    </SafeAreaView>
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
