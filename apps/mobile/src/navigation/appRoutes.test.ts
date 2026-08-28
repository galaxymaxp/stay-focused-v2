import { describe, expect, it } from "vitest";

import {
  APP_ROUTES,
  COURSE_GRADES_PATHNAME,
  COURSE_REVIEWER_PATHNAME,
  POST_SIGN_IN_ROUTE,
  PROCESSING_NOTIFICATION_ROUTE,
  courseRouteParams,
  readCourseIdParam,
  readCourseNameParam,
} from "./appRoutes";

describe("course route params", () => {
  it("carries the course identity and name a course screen needs", () => {
    expect(
      courseRouteParams({ courseId: "course-1", courseName: "Thesis Writing" }),
    ).toEqual({ courseId: "course-1", courseName: "Thesis Writing" });
  });

  it("omits a blank name instead of sending an empty param", () => {
    const params = courseRouteParams({ courseId: "course-1", courseName: "   " });

    expect(params).toEqual({ courseId: "course-1" });
    expect("courseName" in params).toBe(false);
  });

  it("trims values so a padded identifier does not reach the router", () => {
    expect(
      courseRouteParams({ courseId: "  course-1 ", courseName: " Ethics & Society #2 " }),
    ).toEqual({ courseId: "course-1", courseName: "Ethics & Society #2" });
  });

  it("leaves escaping to the router rather than pre-encoding", () => {
    // Characters that would need escaping in a hand-built href must survive
    // untouched here; the router owns URL encoding.
    const params = courseRouteParams({
      courseId: "course/1?x=2",
      courseName: "Ethics & Society #2",
    });

    expect(params.courseId).toBe("course/1?x=2");
    expect(params.courseName).toBe("Ethics & Society #2");
  });
});

describe("course route params read back", () => {
  it("reads the first value when a param repeats", () => {
    expect(readCourseNameParam(["Thesis Writing", "Other"])).toBe("Thesis Writing");
    expect(readCourseIdParam(["course-1", "course-2"])).toBe("course-1");
  });

  it("falls back rather than rendering a missing or blank name", () => {
    expect(readCourseNameParam(undefined)).toBe("Course");
    expect(readCourseNameParam("   ")).toBe("Course");
    expect(readCourseNameParam([])).toBe("Course");
    expect(readCourseNameParam(undefined, "Selected course")).toBe("Selected course");
  });

  it("round-trips a name that needs escaping", () => {
    const courseName = "Ethics & Society #2";
    const params = courseRouteParams({ courseId: "course-1", courseName });

    expect(readCourseNameParam(params.courseName)).toBe(courseName);
    expect(readCourseIdParam(params.courseId)).toBe("course-1");
  });

  it("reports an empty course id instead of a malformed one", () => {
    expect(readCourseIdParam(undefined)).toBe("");
    expect(readCourseIdParam("  ")).toBe("");
  });
});

describe("shell destinations", () => {
  it("routes a processing notification to the durable job list", () => {
    expect(PROCESSING_NOTIFICATION_ROUTE).toBe(APP_ROUTES.processing);
  });

  it("lands an authenticated session on a working surface", () => {
    // Today is the intended landing route but is still a placeholder; this
    // guard fails the moment it is made the default before it renders data.
    expect(POST_SIGN_IN_ROUTE).not.toBe(APP_ROUTES.today);
    expect(POST_SIGN_IN_ROUTE).toBe(APP_ROUTES.courses);
  });

  it("keeps every route absolute so pushes do not resolve relatively", () => {
    for (const route of Object.values(APP_ROUTES)) {
      expect(route.startsWith("/")).toBe(true);
    }
  });

  it("addresses course screens by their dynamic segment", () => {
    expect(COURSE_REVIEWER_PATHNAME).toBe("/courses/[courseId]/reviewer");
    expect(COURSE_GRADES_PATHNAME).toBe("/courses/[courseId]/grades");
    for (const pathname of [COURSE_REVIEWER_PATHNAME, COURSE_GRADES_PATHNAME]) {
      expect(pathname.startsWith(APP_ROUTES.courses)).toBe(true);
    }
  });
});
