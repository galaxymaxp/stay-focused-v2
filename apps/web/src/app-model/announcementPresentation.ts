// Mirrors apps/mobile/src/features/announcements/announcementPresentation.ts so web and app present data identically.
import type { StudentAnnouncement } from "@stay-focused/shared";

export function formatAnnouncementDate(
  value: string | null,
  now = Date.now(),
): string {
  if (!value) return "Posted date unavailable";
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return "Posted date unavailable";
  const date = new Date(timestamp);
  const current = new Date(now);
  const day = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const today = new Date(current.getFullYear(), current.getMonth(), current.getDate()).getTime();
  const days = Math.round((today - day) / 86_400_000);
  const time = date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  if (days === 0) return `Today, ${time}`;
  if (days === 1) return `Yesterday, ${time}`;
  return date.toLocaleDateString([], {
    day: "numeric",
    month: "short",
    ...(date.getFullYear() !== current.getFullYear() ? { year: "numeric" } : {}),
  });
}

export function announcementCourseLabel(
  announcement: StudentAnnouncement,
): string {
  return announcement.course.code?.trim() || announcement.course.name;
}
