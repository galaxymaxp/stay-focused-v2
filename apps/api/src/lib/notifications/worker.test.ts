import { describe, expect, it } from "vitest";

import {
  createNotificationMessage,
  notificationContent,
} from "./worker";

describe("completion notification content", () => {
  it("uses subject-neutral private-content-free copy", () => {
    expect(notificationContent("extraction_ready")).toBe(
      "Your text extraction is ready.",
    );
    expect(notificationContent("reviewer_ready")).toBe(
      "Your reviewer is ready.",
    );
    expect(notificationContent("processing_needs_attention")).toBe(
      "Processing needs attention.",
    );
  });

  it("routes notification taps to processing using safe identifiers only", () => {
    expect(
      createNotificationMessage("reviewer_ready", {
        token: "ExpoPushToken[test-token]",
        jobId: "job-1",
        jobType: "reviewer_generation",
      }),
    ).toEqual({
      to: "ExpoPushToken[test-token]",
      sound: "default",
      title: "Stay Focused",
      body: "Your reviewer is ready.",
      data: {
        screen: "processing",
        jobId: "job-1",
        jobType: "reviewer_generation",
      },
      collapseId: "job-1",
    });
  });
});
