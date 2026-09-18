import { describe, expect, it } from "vitest";
import type { StudentAnnouncement } from "@stay-focused/shared";
import { announcementCourseLabel, formatAnnouncementDate } from "./announcementPresentation";

const announcement = {
  course: { id: "course", code: "BIO", name: "Biology" },
} as StudentAnnouncement;

describe("announcement presentation", () => {
  it("formats recent dates and missing metadata intentionally", () => {
    const now = Date.parse("2026-09-18T10:00:00+08:00");
    expect(formatAnnouncementDate("2026-09-18T08:00:00+08:00", now)).toContain("Today");
    expect(formatAnnouncementDate("2026-09-17T08:00:00+08:00", now)).toContain("Yesterday");
    expect(formatAnnouncementDate(null, now)).toBe("Posted date unavailable");
    expect(formatAnnouncementDate("invalid", now)).toBe("Posted date unavailable");
  });

  it("uses a course code when present and falls back to the readable name", () => {
    expect(announcementCourseLabel(announcement)).toBe("BIO");
    expect(announcementCourseLabel({ ...announcement, course: { ...announcement.course, code: null } })).toBe("Biology");
  });
});
