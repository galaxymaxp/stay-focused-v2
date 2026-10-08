import type { CSSProperties } from "react";
import {
  courseAccents,
  courseIdentity,
  type CourseIdentity,
  type CourseInput,
} from "../app-model/courseIdentity";

/**
 * A course's stable accent as CSS variables for both themes, so the same
 * course keeps the same color everywhere (the app's courseAccent).
 */
export function courseToneStyle(identity: Pick<CourseIdentity, "hue">) {
  const light = courseAccents.light[identity.hue % courseAccents.light.length]!;
  const dark = courseAccents.dark[identity.hue % courseAccents.dark.length]!;
  return {
    "--course-fg-light": light.fg,
    "--course-soft-light": light.soft,
    "--course-fg-dark": dark.fg,
    "--course-soft-dark": dark.soft,
  } as CSSProperties;
}

/** The colored course-code badge from the app (CourseViews.CourseMark). */
export function CourseMark({
  course,
  identity = courseIdentity(course),
  size = 40,
}: {
  course: CourseInput;
  identity?: CourseIdentity;
  size?: number;
}) {
  const long = identity.monogram.length > 3;
  return (
    <span
      className="course-mark course-tone"
      aria-hidden="true"
      style={{
        ...courseToneStyle(identity),
        width: size,
        height: size,
        borderRadius: size * 0.28,
        fontSize: long ? size * 0.24 : size * 0.3,
      }}
    >
      {identity.monogram}
    </span>
  );
}

/** A small dot in a course's color, for calendars and schedules. */
export function CourseDot({ course, faded = false }: { course: CourseInput | null; faded?: boolean }) {
  return (
    <span
      className={`course-dot${course ? " course-tone" : ""}`}
      aria-hidden="true"
      style={{
        ...(course ? courseToneStyle(courseIdentity(course)) : {}),
        opacity: faded ? 0.35 : 1,
      }}
    />
  );
}
