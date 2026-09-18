import type { StudentAnnouncement, StudentAnnouncementList } from "@stay-focused/shared";
import { useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Linking, View } from "react-native";

import { Action, Copy, Notice, Page, RowLink, Sheet, Surface } from "../../design/primitives";
import { useExperience } from "../redesign/useExperience";
import { announcementCourseLabel, formatAnnouncementDate } from "./announcementPresentation";

export function AnnouncementsScreen() {
  const params = useLocalSearchParams<{ announcementId?: string | string[] }>();
  const requestedId = Array.isArray(params.announcementId)
    ? params.announcementId[0]
    : params.announcementId;
  const announcements = useExperience<StudentAnnouncementList>(
    "/api/experience/announcements?limit=100",
  );
  const [selected, setSelected] = useState<StudentAnnouncement | null>(null);

  useEffect(() => {
    if (!requestedId || !announcements.data || selected) return;
    setSelected(announcements.data.items.find(item => item.id === requestedId) ?? null);
  }, [announcements.data, requestedId, selected]);

  return (
    <Page
      back
      title="Announcements"
      subtitle="Updates from your Canvas courses"
      onRefresh={announcements.refresh}
    >
      {announcements.loading ? (
        <Notice>Loading announcements...</Notice>
      ) : announcements.error ? (
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
                onPress={() => setSelected(item)}
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
      {selected ? (
        <AnnouncementDetail announcement={selected} onClose={() => setSelected(null)} />
      ) : null}
    </Page>
  );
}

function AnnouncementDetail({
  announcement,
  onClose,
}: {
  readonly announcement: StudentAnnouncement;
  readonly onClose: () => void;
}) {
  const resources = [...announcement.attachments, ...announcement.links];
  return (
    <Sheet onClose={onClose}>
      <Copy muted size="caption">{announcement.course.name}</Copy>
      <Copy size="h1">{announcement.title}</Copy>
      <Copy muted size="caption">
        {formatAnnouncementDate(announcement.postedAt)}
        {announcement.authorName ? ` · ${announcement.authorName}` : ""}
      </Copy>
      {announcement.body ? (
        <View style={{ gap: 10 }}>
          {announcement.body.split(/\n{2,}/).map((paragraph, index) => (
            <Copy key={`${index}-${paragraph.slice(0, 20)}`}>{paragraph}</Copy>
          ))}
        </View>
      ) : (
        <Notice>Announcement body unavailable.</Notice>
      )}
      {resources.length ? (
        <View style={{ gap: 8 }}>
          <Copy size="h2">Links and attachments</Copy>
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
      {announcement.htmlUrl ? (
        <Action secondary onPress={() => void Linking.openURL(announcement.htmlUrl!)}>
          Open in Canvas
        </Action>
      ) : null}
    </Sheet>
  );
}
