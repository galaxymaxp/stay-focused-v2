import { describe, expect, it } from "vitest";

import { APP_ROUTES } from "./appRoutes";
import { readNotificationDestination } from "./notificationRoutes";

describe("readNotificationDestination", () => {
  it("routes a completed job to processing and keeps its job id", () => {
    // Matches the payload built by the API notification worker.
    expect(
      readNotificationDestination({
        screen: "processing",
        jobId: "job-1",
        jobType: "reviewer_generation",
      }),
    ).toEqual({ pathname: APP_ROUTES.processing, params: { jobId: "job-1" } });
  });

  it("routes the connectivity test notification, which carries no job", () => {
    expect(readNotificationDestination({ screen: "processing" })).toEqual({
      pathname: APP_ROUTES.processing,
      params: {},
    });
  });

  it("ignores a payload that names no destination", () => {
    expect(readNotificationDestination(null)).toBeNull();
    expect(readNotificationDestination(undefined)).toBeNull();
    expect(readNotificationDestination({})).toBeNull();
  });

  it("refuses to guess a route for an unknown screen", () => {
    // A destination the backend adds later must not resolve to processing.
    expect(readNotificationDestination({ screen: "reviewer", jobId: "job-1" })).toBeNull();
    expect(readNotificationDestination({ screen: 42 })).toBeNull();
  });

  it("drops a job id that is not a usable string", () => {
    for (const jobId of [42, null, "", "   ", { id: "job-1" }]) {
      expect(readNotificationDestination({ screen: "processing", jobId })).toEqual({
        pathname: APP_ROUTES.processing,
        params: {},
      });
    }
  });

  it("does not encode jobType, which addresses no distinct route", () => {
    const destination = readNotificationDestination({
      screen: "processing",
      jobId: "job-1",
      jobType: "document_extraction",
    });

    expect(destination?.params).toEqual({ jobId: "job-1" });
  });
});
